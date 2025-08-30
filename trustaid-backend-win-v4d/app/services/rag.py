# app/services/rag.py
import os, re, math
from typing import List, Dict, Any

# 可用则导入 chroma；离线模式不会用到
try:
    import chromadb
    from chromadb.utils import embedding_functions
except Exception:
    chromadb = None
    embedding_functions = None

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
    # 极简 tokenizer：英文小写 + 数字，去掉其它符号
    return re.findall(r"[a-z0-9]+", s.lower())

class RAGService:
    """
    两种后端：
    - openai：用 OpenAI 嵌入 + Chroma（有配额时用）
    - tfidf ：本地 TF-IDF（无配额/离线时自动降级）
    自动选择：优先 openai；若失败（如 429/无配额）则切换 tfidf，不再报错退出。
    也可通过 .env 指定 RAG_BACKEND=tfidf 强制离线。
    """
    def __init__(self):
        self.mode = os.getenv("RAG_BACKEND", "openai").lower()
        self.path = os.getenv("CHROMA_PATH", "./.chroma_v4d")
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

        # 为 tfidf 模式准备内存索引容器
        self._tfidf_vocab: Dict[str, int] = {}
        self._tfidf_idf: List[float] = []
        self._tfidf_mat: List[List[float]] = []   # 文档向量
        self._tfidf_docs: List[Dict[str, Any]] = []  # 与向量同序的文档元数据

        # openai + chroma 相关
        self.client = None
        self.embed_fn = None
        self.docs = None
        self.gqa = None

        # 若用户强制 tfidf 或没有 key，直接进入 tfidf
        if self.mode == "tfidf" or not self.api_key:
            self.mode = "tfidf"
        else:
            # 先准备 openai+chroma，失败再降级
            try:
                if chromadb is None or embedding_functions is None:
                    raise RuntimeError("chromadb not available")
                self.client = chromadb.PersistentClient(path=self.path)
                self.embed_fn = embedding_functions.OpenAIEmbeddingFunction(
                    api_key=self.api_key, model_name=self.embed_model
                )
                # 不给 collection 绑定 embedding function，避免历史脏库冲突
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
                # 任意初始化失败都回落到 tfidf
                self.mode = "tfidf"

    async def ensure_ready(self):
        if self.mode == "openai":
            try:
                # 写入样例文档（手动计算 embeddings，避免集合绑定）
                if self.docs.count() == 0:
                    ids = [d["id"] for d in SAMPLE_DOCS]
                    texts = [d["text"] for d in SAMPLE_DOCS]
                    metas = [d["metadata"] for d in SAMPLE_DOCS]
                    embs = self.embed_fn(texts)  # 这里若触发 429，将被捕获并降级
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
                # 任何异常（包括 429/配额不足）——> 降级 tfidf
                self.mode = "tfidf"

        # === tfidf 索引构建（完全离线） ===
        texts = [d["text"] for d in SAMPLE_DOCS]
        metas = [d["metadata"] for d in SAMPLE_DOCS]
        # 构建词表与 df
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
            idf[idx] = math.log((N + 1) / (df[w] + 1)) + 1.0  # 平滑 IDF

        # 计算文档向量
        mat = []
        for toks in docs_tokens:
            tf = [0.0] * len(vocab)
            if toks:
                inv_len = 1.0 / len(toks)
                for w in toks:
                    tf[vocab[w]] += inv_len
            vec = [tf[i] * idf[i] for i in range(len(vocab))]
            # 归一化
            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
            vec = [v / norm for v in vec]
            mat.append(vec)

        self._tfidf_vocab = vocab
        self._tfidf_idf = idf
        self._tfidf_mat = mat
        self._tfidf_docs = metas  # 与 mat 一一对应

    def _retrieve_openai(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        qemb = self.embed_fn([query])
        res = self.docs.query(query_embeddings=qemb, n_results=k)
        items = []
        if not res or not res.get("ids"):
            return items
        for i in range(len(res["ids"][0])):
            md = res["metadatas"][0][i]
            items.append({
                "title": md.get("title","Doc"),
                "url": md.get("url"),
                "updated_at": md.get("updated_at"),
                "similarity": float(res.get("distances", [[None]])[0][i] or 0.0),
            })
        return items

    def _retrieve_tfidf(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        if not self._tfidf_mat:
            return []
        # 向量化 query
        q_tf = [0.0] * len(self._tfidf_vocab)
        toks = _tok(query)
        L = len(toks) or 1
        inv_len = 1.0 / L
        for w in toks:
            if w in self._tfidf_vocab:
                q_tf[self._tfidf_vocab[w]] += inv_len
        q_vec = [q_tf[i] * self._tfidf_idf[i] for i in range(len(q_tf))]
        q_norm = math.sqrt(sum(v * v for v in q_vec)) or 1.0
        q_vec = [v / q_norm for v in q_vec]

        # 余弦相似
        sims = []
        for idx, dvec in enumerate(self._tfidf_mat):
            sim = sum(q_vec[i] * dvec[i] for i in range(len(q_vec)))
            sims.append((sim, idx))
        sims.sort(reverse=True)
        out = []
        for sim, idx in sims[:k]:
            md = self._tfidf_docs[idx]
            out.append({
                "title": md.get("title", "Doc"),
                "url": md.get("url"),
                "updated_at": md.get("updated_at"),
                "similarity": float(sim),
            })
        return out

    def _retrieve(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        if self.mode == "openai":
            try:
                return self._retrieve_openai(query, k)
            except Exception:
                # 查询阶段若再触发限额等异常，动态降级
                self.mode = "tfidf"
        return self._retrieve_tfidf(query, k)

    async def answer(self, query: str, audit_id: str, locale: str | None = None, jurisdiction: str | None = None, demo: bool = False) -> Dict[str, Any]:
        items = self._retrieve(query, k=5)
        if not items:
            return {"kind":"navigator","answer":"I couldn't find solid evidence in the current document set.","confidence":{"level":"low","score":0.2}}
        steps = [{"title": f"Check: {it['title']}", "link": it.get("url")} for it in items[:3]]
        return {
            "kind":"navigator",
            "answer": "Here are recommended steps based on official sources:",
            "steps": steps,
            "evidence": items,
            "confidence": {"level":"high","score": 0.82 if self.mode=='openai' else 0.7},
            "mode": self.mode
        }
