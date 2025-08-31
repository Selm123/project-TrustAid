# TrustAid
**The simple way to find the support you need — accurate, transparent, and easy to navigate.**

> TrustAid is an evidence-first assistant that guides people through government services with step-by-step actions, official links, and verifiable analytics. The UI you see in the mockups is included below as the product experience we ship.

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

Frontend (React/Vite) – Chat widget + quick chips + “summary of steps”
│
POST /chat/query
▼
Backend (FastAPI, Python)
• Intent & topic guardrails (life-event aware)
• Retrieval over curated gov pages (Chroma; fallback TF-IDF)
• Evidence-only synthesis → JSON (steps, links, citations, confidence, audit_id)
• Optional read-only analytics (tables/charts + exact SQL)
│
▼
UI renders structured JSON (no canned strings) with source links & “Learn more”

yaml
Copy code

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
Health & mode:

bash
Copy code
curl http://localhost:8000/health
curl http://localhost:8000/debug/rag   # {"mode":"openai"} or {"mode":"tfidf"}
Frontend
Set API Base URL to your backend, then run the web client.

The chat widget renders: welcome → category chips → user input → summary prompt → numbered steps with Learn more and source links.

🧪 Evaluation (what we’ll demo)
Real flows that match the mockups (e.g., Death and bereavement).

Citations visible in every answer; summary-then-details pattern.

If evidence is thin, TrustAid refuses gracefully and links the best official source.

For analytics prompts, we show exact SQL and dataset metadata with the chart/table.

📄 License
MIT © 2025 TrustAid Team

Design note: the yellow accent, rounded chips, and the “summary of steps” pattern are intentional to keep the experience friendly, fast, and verifiable.