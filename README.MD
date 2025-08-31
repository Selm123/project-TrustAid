# TrustAid
**The simple way to find the support you need — accurate, transparent, and easy to navigate.**

> TrustAid is an evidence-first assistant that guides people through government services with step-by-step actions, official links, and verifiable analytics. The UI you see in the mockups is included below as the product experience we ship.

![Alt text](image-url "TrustAid.png")

---

## 💡 What TrustAid does (as shown in the mockups)

**Personalised guidance**
- The assistant opens with **plain-English prompts** and quick-reply chips (e.g., *Benefits & support*, *Births, deaths, marriages*, *Community & events*, *Travel & transport*, *Home & land*, *Business*).
- It recognises **life events** and offers a **summary of steps** before deep diving.

**Life-event support (example: bereavement)**
- User: *“What to do when someone dies”*  
- Assistant replies with:
  - An empathetic opener.
  - **Official links** (e.g., Services Australia; Service NSW).
  - A follow-up prompt: *“Would you like me to summarise the steps?”*
- On *“Yes, tell me the steps”* ➜ The assistant shows a **numbered list** with expandable “**Learn more**” items:
  1. Register the death  
  2. Organise the funeral  
  3. Notify people and organisations  
  *(…and more as available in the evidence)*

**Local connections**
- For eligible topics, TrustAid can suggest **nearby services** (e.g., registries, centres, clinics) and provide contact links.

**Plain-English explanations**
- Every answer is short, scannable, and **linked to sources** so users can verify quickly.

**Accurate results**
- TrustAid cites what it uses. When it can’t verify something, it **says so** and proposes the safest next step instead of guessing.

**Secure and in your control**
- Read-only analytics, no PII joins, and transparent provenance (citations, timestamps, confidence, `audit_id`).

---

## 🖼️ UX components (from the mockups)

- **Hero page**  
  - Title: *Access government services made easy*  
  - Secondary tagline: *The simple way to find the support you need*  
  - Feature cards:  
    - Personalised guidance  
    - Life event support  
    - Local connections  
    - Plain English explanations  
    - Accurate results  
    - Secure and control

- **Assistant widget (floating panel)**  
  - Greeting bubble + **quick category chips**.  
  - User message area with **send** button.  
  - **Summary prompt** pattern (*“Would you like a quick summary of the steps?”* ➜ *“Yes, tell me the steps”*).  
  - **Numbered list** + “**Learn more**” toggles for each step.  
  - **Source links** appear as blue text with an external icon.

- **Action bar icons**  
  - Small, rounded controls for cancel / confirm / open assistant (as in mockups).

---

## 🔍 How it stays trustworthy
- **Evidence-only generation**: answers are composed from retrieved official snippets; UI always shows **citations** and **timestamps**.  
- **Guardrails**: life-event filters (e.g., bereavement) keep the advice on-topic (e.g., *register death*, *funeral arrangements*, *notify agencies*), **never** irrelevant suggestions.  
- **Read-only analytics**: when analytics are shown, TrustAid returns **tables/charts with the exact SQL** and dataset metadata.  
- **Confidence & audit**: each reply contains a **confidence score** and an **`audit_id`** to reproduce the result.

---

## 🧩 Data we include (curated from Australian public sources)

- **Government Data Portal (data.gov.au)** — master index for discovery and refresh; TrustAid links back to each dataset’s page.  
- **Australian Government Transparency Portal** — entity financial/performance reports; used to add program context and cite accountability.  
- **myGov Digital Services Performance** — availability and usage; TrustAid can signal degraded services and suggest alternatives.  
- **Digital Service Standard Compliance** — badges compliant services and explains routing choices.  
- **AusTender Procurement Statistics** — supports read-only analytics (outliers, vendor trends) with exact SQL shown.  
- **AI Technical Standards Design Statements (All)** — underpins explainability text, refusal templates, and UI transparency badges.

> Optional local enrichments: state/territory BDM pages, NHSD/ACSL service directories, ACNC charities, ABS geographies/SEIFA for equitable suggestions.

---

## 🛠️ Architecture (high level)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                     TrustAid — Architecture                              │
└──────────────────────────────────────────────────────────────────────────────────────────┘

SECTION A — Progressive Web App (device)
────────────────────────────────────────────────────────────────────────────────────────────
[ Service Worker ]
    ├─ Offline caches (for low-connectivity zones)
    │   • steps_cache  (summary of steps + links)
    │   • services_cache (local offices/centres directories)
    │   • ui_assets_cache
    └─ Sync queue (retries POSTs when back online)

[ Assistant Widget (UI) ]
    ├─ Quick category chips: Benefits & support | Births, deaths, marriages | …
    ├─ Conversation bubbles (plain English)
    └─ “Would you like a quick summary of the steps?” → “Yes, tell me the steps”
        ↓
        POST /chat/query  (JSON: {query, locale, location?, consent_flags?})

SECTION B — Backend API (FastAPI)
────────────────────────────────────────────────────────────────────────────────────────────
[ Intent & Topic Guardrails ]
    ├─ Life-event detection (e.g., bereavement)
    ├─ Safety filters (deny PII asks, out-of-scope topics)
    └─ Routing hints (guidance vs analytics are handled inside one engine)

[ Guidance & Analytics Engine (single pipeline) ]
    ├─ Evidence Retriever
    │     → Chroma (vector)  ⟵ embeddings (OpenAI; fallback TF-IDF)
    │     → Dataset Registry (provenance: title/url/updated_at/jurisdiction)
    ├─ Data Query Unit (read-only)
    │     → SQL builder with allow-lists / column deny-lists (no PII joins)
    │     → Read-only Warehouse (SQLite/DuckDB/Postgres)
    ├─ Synthesiser (evidence-only generation)
    │     • Produces JSON: steps + “Learn more” links OR tables/charts + exact SQL
    │     • Adds confidence {level,score} and mode {openai|tfidf}
    └─ Response Composer
          • Merges evidence, analytics (if any), adds audit_id

[ Audit & Telemetry ]
    ├─ Per-request audit_id, sources/SQL, confidence, timings
    └─ (Optional) event stream for product analytics (no PII)

SECTION C — Data Layer (server)
────────────────────────────────────────────────────────────────────────────────────────────
[ Chroma (Vector DB) ]
    • Curated snippets from official pages (title, url, updated_at, text)
[ Read-only Warehouse ]
    • Normalised public tables (CSV/API ingested)
[ Dataset Registry / Metadata ]
    • Provenance, refresh cadence, schema info
[ Server Cache ]
    • Hot answers, embeddings, SQL results (TTL)

SECTION D — Ingestion & Refresh (ETL)
────────────────────────────────────────────────────────────────────────────────────────────
[ Fetchers / Schedulers ]
    ├─ data.gov.au index
    ├─ Transparency Portal
    ├─ myGov Digital Services Performance
    ├─ Digital Service Standard Compliance
    ├─ AusTender Procurement Statistics
    └─ AI Technical Standards Design Statements
      ↓
[ Clean/Normalise ]
      ↓
[ Upsert ]
    ├─ Chroma (documents/snippets with metadata)
    └─ Warehouse (tables/views)

END-TO-END FLOW (example shown in mockups)
────────────────────────────────────────────────────────────────────────────────────────────
User types: “What to do when someone dies”
  → UI posts /chat/query
  → Backend applies life-event guardrail (bereavement)
  → Evidence Retriever pulls gov pages (Services Australia, state BDM, etc.)
  → Synthesiser creates numbered steps with “Learn more” links + confidence + audit_id
  → Response Composer returns JSON
  → UI renders empathy message → “Would you like a quick summary of the steps?” → numbered list
  → Service Worker caches steps + links for offline reuse

NOTES
────────────────────────────────────────────────────────────────────────────────────────────
• Single pipeline inside the backend: it handles both guidance and analytics, but always
  returns structured JSON with citations/SQL, confidence, and audit_id.
• All analytics are read-only; no PII joins; strict allow-lists.
• PWA caches are designed to keep essential guidance usable in low-connectivity areas.

```

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

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Health & mode:
```bash
Copy code
curl http://localhost:8000/health
curl http://localhost:8000/debug/rag   # {"mode":"openai"} or {"mode":"tfidf"}
```

### Frontend
Set API Base URL to your backend, then run the web client.

The chat widget renders: welcome → category chips → user input → summary prompt → numbered steps with Learn more and source links.

### 🧪 Evaluation 
Real flows that match the mockups (e.g., Death and bereavement).

Citations visible in every answer; summary-then-details pattern.

If evidence is thin, TrustAid refuses gracefully and links the best official source.

For analytics prompts, we show exact SQL and dataset metadata with the chart/table.

📄 License
MIT © 2025 TrustAid Team

Design note: the yellow accent, rounded chips, and the “summary of steps” pattern are intentional to keep the experience friendly, fast, and verifiable.