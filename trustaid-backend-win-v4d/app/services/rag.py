# app/services/rag.py
import os, re, math
from typing import List, Dict, Any

# Chroma (optional; we auto-fallback if unavailable or quota issues)
try:
    import chromadb
    from chromadb.utils import embedding_functions
except Exception:
    chromadb = None
    embedding_functions = None

from app.services.llm import chat_json  # <-- use OpenAI chat to synthesize the final answer

DOC_COLLECTION = "gov_docs"
GQA_COLLECTION = "golden_qa"

SAMPLE_DOCS = [
  {
    "id": "doc_myagedcare_hcp",
    "text": "Home Care Packages help older people to receive care at home. Step: contact My Aged Care to arrange an assessment. Hotline: 1800200422.",
    "metadata": {"title":"Home Care Packages Overview","url":"https://www.myagedcare.gov.au/","updated_at":"2025-06-01","jurisdiction":"AU"}
  },
  {
    "id": "doc_servicesaustralia_carer_allowance",
    "text": "Carer Allowance is a fortnightly supplement for people who give daily care. Check eligibility on Services Australia and prepare identity documents.",
    "metadata": {"title":"Carer Allowance","url":"https://www.servicesaustralia.gov.au/","updated_at":"2025-05-10","jurisdiction":"AU"}
  }
]

def _tok(s: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", s.lower())

class RAGService:
    """
    Modes:
      - openai: OpenAI embeddings + Chroma retrieval + OpenAI chat for synthesis
      - tfidf : local TF-IDF retrieval + OpenAI chat for synthesis (no embeddings needed)
    Selection:
      - If .env RAG_BACKEND=tfidf -> tfidf
      - Else try openai; if any error (e.g., 429 quota) -> tfidf
    """
    def __init__(self):
        self.mode = os.getenv("RAG_BACKEND", "openai").lower()
        self.path = os.getenv("CHROMA_PATH", "./.chroma_v4d")
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

        # TF-IDF structures
        self._tfidf_vocab: Dict[str, int] = {}
        self._tfidf_idf: List[float] = []
        self._tfidf_mat: List[List[float]] = []
        self._tfidf_docs: List[Dict[str, Any]] = []  # {"title","url","updated_at","text"}

        # Chroma clients/collections
        self.client = None
        self.embed_fn = None
        self.docs = None
        self.gqa = None

        if self.mode == "tfidf" or not self.api_key:
            self.mode = "tfidf"
        else:
            try:
                if chromadb is None or embedding_functions is None:
                    raise RuntimeError("chromadb not available")
                self.client = chromadb.PersistentClient(path=self.path)
                self.embed_fn = embedding_functions.OpenAIEmbeddingFunction(
                    api_key=self.api_key, model_name=self.embed_model
                )
                # Use collections without binding EF to avoid legacy store issues
                try:
                    self.docs = self.client.get_collection(name=DOC_COLLECTION)
                except Exception:
                    self.docs = self.client.create_collection(name=DOC_COLLECTION)
                try:
                    self.gqa = self.client.get_collection(name=GQA_COLLECTION)
                except Exception:
                    self.gqa = self.client.create_collection(name=GQA_COLLECTION)
                self.mode = "openai"
            except Exception:
                self.mode = "tfidf"

    async def ensure_ready(self):
        if self.mode == "openai":
            try:
                # Seed docs with manual embeddings
                if self.docs.count() == 0:
                    ids = [d["id"] for d in SAMPLE_DOCS]
                    texts = [d["text"] for d in SAMPLE_DOCS]
                    metas = [d["metadata"] for d in SAMPLE_DOCS]
                    embs = self.embed_fn(texts)
                    self.docs.add(ids=ids, documents=texts, metadatas=metas, embeddings=embs)
                if self.gqa.count() == 0:
                    gqa_texts = ["Q: apply for home care after discharge? A: Book My Aged Care assessment; prepare medical summary; explore interim services."]
                    gqa_embs = self.embed_fn(gqa_texts)
                    self.gqa.add(
                        ids=["gqa_hcp_1"],
                        documents=gqa_texts,
                        metadatas=[{"kind":"navigator","jurisdiction":"AU"}],
                        embeddings=gqa_embs,
                    )
                return
            except Exception:
                # Any failure (429 quota, network, etc.) -> fallback
                self.mode = "tfidf"

        # Build local TF-IDF index (always available)
        texts = [d["text"] for d in SAMPLE_DOCS]
        metas = [dict(d["metadata"], text=d["text"]) for d in SAMPLE_DOCS]
        vocab: Dict[str, int] = {}
        df: Dict[str, int] = {}
        docs_tokens = []
        for t in texts:
            toks = _tok(t)
            docs_tokens.append(toks)
            seen = set()
            for w in toks:
                if w not in vocab:
                    vocab[w] = len(vocab)
                if w not in seen:
                    df[w] = df.get(w, 0) + 1
                    seen.add(w)
        N = len(texts)
        idf = [0.0] * len(vocab)
        for w, idx in vocab.items():
            idf[idx] = math.log((N + 1) / (df[w] + 1)) + 1.0
        mat = []
        for toks in docs_tokens:
            tf = [0.0] * len(vocab)
            if toks:
                inv_len = 1.0 / len(toks)
                for w in toks:
                    tf[vocab[w]] += inv_len
            vec = [tf[i] * idf[i] for i in range(len(vocab))]
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            vec = [v / norm for v in vec]
            mat.append(vec)
        self._tfidf_vocab, self._tfidf_idf, self._tfidf_mat, self._tfidf_docs = vocab, idf, mat, metas

    def _retrieve_openai(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        qemb = self.embed_fn([query])
        res = self.docs.query(query_embeddings=qemb, n_results=k, include=["metadatas","documents","distances"])
        items = []
        if not res or not res.get("ids"):
            return items
        for i in range(len(res["ids"][0])):
            md = res["metadatas"][0][i] or {}
            doc = (res.get("documents") or [[None]])[0][i]
            items.append({
                "title": md.get("title","Doc"),
                "url": md.get("url"),
                "updated_at": md.get("updated_at"),
                "similarity": float(res.get("distances", [[0]])[0][i] or 0.0),
                "snippet": (doc or "")[:600]
            })
        return items

    def _retrieve_tfidf(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        if not self._tfidf_mat:
            return []
        q_tf = [0.0] * len(self._tfidf_vocab)
        toks = _tok(query); L = len(toks) or 1
        inv_len = 1.0 / L
        for w in toks:
            if w in self._tfidf_vocab:
                q_tf[self._tfidf_vocab[w]] += inv_len
        q_vec = [q_tf[i] * self._tfidf_idf[i] for i in range(len(q_tf))]
        q_norm = math.sqrt(sum(v * v for v in q_vec)) or 1.0
        q_vec = [v / q_norm for v in q_vec]
        sims = []
        for idx, dvec in enumerate(self._tfidf_mat):
            sim = sum(q_vec[i] * dvec[i] for i in range(len(q_vec)))
            sims.append((sim, idx))
        sims.sort(reverse=True)
        out = []
        for sim, idx in sims[:k]:
            md = self._tfidf_docs[idx]
            out.append({
                "title": md.get("title","Doc"),
                "url": md.get("url"),
                "updated_at": md.get("updated_at"),
                "similarity": float(sim),
                "snippet": md.get("text","")[:600],
            })
        return out

    def _retrieve(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        if self.mode == "openai":
            try:
                return self._retrieve_openai(query, k)
            except Exception:
                self.mode = "tfidf"
        return self._retrieve_tfidf(query, k)

    def _synthesize_with_llm(self, query: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Prepare compact evidence for the LLM
        ev_lines = []
        for it in items[:3]:
            ev_lines.append(f"- {it.get('title','Doc')} — {it.get('url','')} :: {it.get('snippet','')}")
        evidence = "\n".join(ev_lines) if ev_lines else "(no evidence)"

        system = (
            "You are TrustAid Navigator for Australia. Answer using ONLY the given evidence. "
            "Be clear and actionable. If info is insufficient, say what is missing and suggest the best official next step. "
            "Return strict JSON with keys: answer (string), steps (array of {title,link}), "
            "citations (array of {title,url}), confidence (object {level,score}). "
            "Confidence level ∈ {none,low,high,exact}. Score 0..1."
        )
        user = f"Question: {query}\n\nEvidence:\n{evidence}"

        j = chat_json(system, user)  # throws if key missing; we already validated on startup
        # Normalize minimal shape
        answer = j.get("answer") or ""
        steps = j.get("steps") or []
        cits = j.get("citations") or []
        conf = j.get("confidence") or {"level":"high","score":0.8}
        # If LLM returns nothing useful, fallback to template
        if not answer.strip():
            steps = [{"title": f"Check: {it['title']}", "link": it.get("url")} for it in items[:3]]
            answer = "Here are recommended steps based on official sources:"
        return {"answer": answer, "steps": steps, "citations": cits, "confidence": conf}

    async def answer(self, query: str, audit_id: str, locale: str | None = None, jurisdiction: str | None = None, demo: bool = False) -> Dict[str, Any]:
        items = self._retrieve(query, k=5)
        if not items:
            return {
                "kind":"navigator",
                "answer":"I couldn't find solid evidence in the current document set.",
                "confidence":{"level":"low","score":0.2},
                "mode": self.mode
            }
        try:
            syn = self._synthesize_with_llm(query, items)
        except Exception:
            # If chat fails (quota/outage), degrade to template but keep going
            syn = {
                "answer":"Here are recommended steps based on official sources:",
                "steps":[{"title": f"Check: {it['title']}", "link": it.get("url")} for it in items[:3]],
                "citations":[{"title": it["title"], "url": it.get("url")} for it in items[:3]],
                "confidence":{"level":"high","score":0.7}
            }
        return {
            "kind":"navigator",
            **syn,
            "evidence": items,  # keep raw evidence for UI
            "mode": self.mode
        }
