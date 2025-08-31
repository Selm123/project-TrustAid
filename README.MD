# TrustAid
**Evidence-first assistant to navigate services, interrogate data, and explain AI—built for government users.**

> One line: **TrustAid turns opaque AI into verifiable, actionable guidance** with citations, read-only analytics, and full auditability—built for life-event scenarios and cross-agency journeys.

---

## ✨ Why TrustAid (at a glance)
- **Life-event guidance, not chit-chat.** Detects scenarios (bereavement, becoming a carer, new baby, disaster recovery) and returns **clear, step-by-step actions** with official links.
- **Analytics you can trust.** Natural-language → **whitelisted NL→SQL** over **read-only** government datasets; returns **the exact SQL** and dataset metadata.
- **Transparent by default.** Citations & timestamps, **confidence scores**, `audit_id`, and model mode (`openai` or fallback `tfidf`). **Refuses** when evidence is thin.
- **Agentic completion (opt-in).** Book assessments, generate checklists, schedule reminders—designed for low digital literacy and mobile users.
- **Inclusive & safe.** Topic guardrails (e.g., bereavement), multilingual-ready, printable outputs, rate-limited APIs, no PII joins.

---

## 🧠 What makes it different
- **Evidence > opinion.** Answers must be grounded in authoritative sources (links + last updated). No source → no answer.
- **Two pipelines, one assistant.**
  - **Navigator (RAG):** policy/process/eligibility → vector retrieval over curated gov pages → LLM synthesises steps **using only evidence**.
  - **TrustBot (SQL):** analytics/metrics → schema-aware, allow-listed NL→SQL → read-only DB → tables/charts + **exact SQL**.
- **Guardrails that matter.** Topic filters (e.g., *bereavement* suppresses irrelevant home-care suggestions), similarity thresholds, SQL allow-lists, refusal logic.
- **Auditable & reproducible.** Each reply includes `audit_id`, confidence `{level,score}`, provenance (citations/SQL) and model mode, enabling replay and oversight.

---

## ⚙️ How it works (end-to-end)
1. **User asks** a question in the frontend (mobile-first, accessible patterns).
2. **Router** detects intent and applies **topic guardrails** (e.g., bereavement).
3. **Navigator (RAG)** retrieves top-k snippets from **Chroma** (OpenAI embeddings; auto-fallback **TF-IDF**) and the LLM composes a JSON answer constrained to the evidence.
4. **TrustBot (SQL)** turns plain English into **safe SQL** (schema allow-list + column deny-list + no PII joins) and queries a **read-only** store (SQLite/DuckDB/Postgres).
5. **Response Mux** merges results (if both ran), attaches `audit_id`, confidence, and returns structured JSON for the UI to render.

### ASCII Architecture
Frontend (React/Vite) ── POST /chat/query ─▶ FastAPI Backend
┌──▶ Router & Topic Guardrails
┌──────── Navigator (RAG) ──┤
│ └──▶ TrustBot (SQL)
│ retrieve ┌───────────────┐ ┌─ NL→SQL + Allow-list
└──────────▶│ Chroma (Vec) │──▶ DB (read-only: SQLite/DuckDB/Postgres)
└───────────────┘
▲ ▲
│ OpenAI Embeddings │ rows/agg
▼ │
OpenAI Chat ◀──────────────┘

Response Mux → { kind, answer, steps/citations | table/chart/sql, confidence, audit_id, mode }
Logging/Audit → per-request trace

yaml
Copy code

---

## 📚 Government data (demo-ready seeds)
- **Services Australia** curated snippets (e.g., *When someone dies*, *Carer support*).
- **NHSD** (National Health Services Directory; API key), **ACSL** (Aged Care Service List).  
- **ABS** geographies (ASGS) & SEIFA for regional mapping and inclusivity logic.
- **ACNC** charity register (community & grief support).  
- **AusTender** procurement statistics; Portfolio Budget Statements; APS Employee Census.  
- **State/Territory portals**: BDM registration info, service-centre and health-facility locations (CSV/GeoJSON).

> Demo includes small sample tables (`procurement_payments`, `hr_leave`) and curated documents; production can ingest the real sources above.

---

## 🔒 Ethics, safety, compliance
- **Read-only analytics**; no side-effects; no PII joins; schema allow-lists & column deny-lists.
- **Transparent provenance**: citations/SQL, confidence, `audit_id`, model mode, refusal on uncertainty.
- **Topic guardrails**: e.g., bereavement answers focus on death registration/ADNS/Services Australia notifications—**never** on home-care packages.
- **Minimal retention**: optional agentic actions (reminders/exports) only with explicit consent.
- **Aligned with public-sector AI principles**: transparency, accountability, safety, human oversight.

---

## 🧪 Evaluation plan
- **Golden-QA** across common tasks (bereavement, carer, aged care, tax, procurement outliers).  
- **Metrics**: EM/F1, citation correctness, refusal correctness, SQL accuracy, task completion.  
- **Progressive answering**: multi-pass consistency; **fallback** from OpenAI to TF-IDF with provenance intact.  
- **Audit replay**: use `audit_id` to reproduce sources, SQL, and outputs.

---

## 🚀 Quick start

### Backend
```bash
# .env (minimum)
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
RAG_BACKEND=openai
ANONYMIZED_TELEMETRY=false

# run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
Health & mode:
```

bash
Copy code
curl http://localhost:8000/health
curl http://localhost:8000/debug/rag   # {"mode":"openai"} or {"mode":"tfidf"}
Ask:

bash
Copy code
curl -X POST http://localhost:8000/chat/query \
  -H "Content-Type: application/json" \
  -d '{"query":"Am I eligible for Carer Allowance?","force_kind":"navigator"}'
Frontend
Configure API Base URL = your backend (e.g., http://localhost:8000).

UI renders answer, steps, citations or table/chart/sql directly from backend JSON (no canned strings).

🔌 API (contract)
POST /chat/query

json
Copy code
{
  "query": "How do I register a death in NSW?",
  "force_kind": "navigator" // optional: "navigator" | "trustbot"
}
Response (Navigator)

json
Copy code
{
  "kind": "navigator",
  "answer": "Here are the steps...",
  "steps": [{"title":"Notify Services Australia","link":"..."}, ...],
  "citations": [{"title":"When someone dies","url":"..."}],
  "confidence": {"level":"high","score":0.87},
  "audit_id": "e5mv5g...",
  "mode": "openai"
}
Response (TrustBot)

json
Copy code
{
  "kind": "trustbot",
  "answer": "Top vendor payments last quarter...",
  "table": {"columns":["vendor","amount","date"],"rows":[...]},
  "chart": {"type":"bar","x":"vendor","y":"amount"},
  "sql": "SELECT ...",
  "dataset": {"name":"AusTender","period":"2023-07-01..2024-06-30"},
  "confidence": {"level":"exact","score":1.0},
  "audit_id": "a91bd..."
}
🛠️ Roadmap
Automated ingest pipelines for state/territory portals; geo-enrichment at ingest.

Multilingual & voice flows; SMS hand-offs; accessibility polish.

Local council plugins (custom policies/datasets) without core changes.

Caching, quotas, and observability dashboards for production.