# TrustAid

**TrustAid — Because government services should be accurate, transparent, and easy to navigate.**

---

## 🌟 What is TrustAid?

TrustAid is an **AI-powered assistant** designed to:
- **Guide** citizens through complex government services (e.g., aged care, carers, funeral support).
- **Answer** data-driven questions with verifiable results (e.g., procurement payments, HR statistics).
- **Assist** with next steps such as form preparation, appointment reminders, or local service connections.

Unlike a typical chatbot, **TrustAid always shows its evidence**. Every response comes with:
- **Official sources & timestamps**  
- **Exact SQL queries or document citations**  
- **Confidence scores**  
- **Full audit logs**  

If the system cannot find reliable evidence, it **refuses to guess** and instead provides alternatives or clarification questions.

---

## 🔑 Why TrustAid?

- **Accuracy First**: Answers are either grounded in government datasets or refused — no hallucinations.  
- **Transparency**: Every step is auditable, with citations, SQL queries, and dataset details.  
- **Agentic AI**: Beyond answering, TrustAid can help book appointments, draft forms, or set reminders.  
- **Inclusive Design**: Multi-language support, voice input, and clear step-by-step outputs make it accessible to everyone.  

---

## ⚙️ How it Works

### Two Pipelines, One Assistant
1. **Navigator (RAG pipeline)**  
   - Uses a **vector database (Chroma)** to find the most relevant passages from government documents.  
   - Produces a **step-by-step guide** with citations and links.  
   - Refuses to answer without strong evidence.  

2. **TrustBot (SQL pipeline)**  
   - Translates natural language into **safe, whitelisted SQL queries**.  
   - Executes queries against structured government datasets (Postgres).  
   - Returns tables and charts with the exact SQL query used.  

A **Router** detects which pipeline(s) to use. For mixed queries (e.g., *“How do I apply for aged care, and what’s the average wait time?”*), TrustAid runs **both pipelines** and merges the results.

---

## 🏗️ System Architecture

    Frontend (Next.js / React)
       |
       |--> /chat/query
       |
    Backend (FastAPI, Python)
       ├─ RouterService → decides pipeline
       ├─ Navigator (RAG: Chroma + reranker + evidence check)
       ├─ TrustBot (SQL: whitelist + validate + execute)
       ├─ ScoringService (confidence, consistency)
       ├─ AuditService (full logs for traceability)
       └─ TaskAgent (reminders, bookings, exports)
       |
    Data Layer
       ├─ Postgres (structured datasets, audit logs)
       ├─ Chroma   (government docs & golden QA)
       └─ Redis    (task queue, caching)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Docker & Docker Compose
- OpenAI / LLM API key (or alternative LLM)

### Setup

    # Clone repo
    git clone https://github.com/yourusername/trustaid.git
    cd trustaid

    # Copy environment variables
    cp .env.example .env

    # Start services
    docker-compose up -d

### Run API

    uvicorn app.main:app --reload --port 8000

### Example Request

    curl -X POST http://localhost:8000/chat/query \
      -H "Content-Type: application/json" \
      -d '{"query":"How do I apply for home care after hospital discharge?"}'

---

## 📊 Datasets

TrustAid integrates with government open data, such as:
- [data.gov.au](https://data.gov.au) – Government Data Portal  
- AusTender Procurement Statistics  
- ABS Education and Health Statistics  
- My Aged Care service directory  
- ACNC Charity Data  

For the hackathon demo, sample tables (`procurement_payments`, `hr_leave`) and documents are preloaded.

---

## 🧪 Evaluation

- **Golden QA dataset**: curated benchmark for both Navigator and TrustBot.  
- **Progressive answering**: multiple attempts with consistency checks to maximize accuracy.  
- **Metrics tracked**: EM/F1, citation correctness, refusal correctness, SQL accuracy.  

---

## 🔒 Ethics & Compliance

- Only uses **read-only database access**.  
- Refuses to answer if evidence is insufficient.  
- No personal data stored unless explicitly needed for reminders or tasks.  
- Fully auditable: every answer linked to `audit_id`.

---

## 📌 Roadmap

- [ ] Expand dataset connectors  
- [ ] Add multilingual support (Mandarin, Arabic, etc.)  
- [ ] Improve speech-to-text & accessibility  
- [ ] Deploy pilot with real government service datasets  

---

## 📜 License

MIT License © 2025

---

