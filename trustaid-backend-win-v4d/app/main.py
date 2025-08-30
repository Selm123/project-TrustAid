import os, time
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.audit import AuditService
from app.services.router import route_query
from app.services.rag import RAGService
from app.services.sqlbot import SQLService

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

app = FastAPI(title="TrustAid Backend", version="0.4.3")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000)
    locale: str | None = None
    jurisdiction: str | None = None
    force_kind: str | None = Field(None, description="navigator|trustbot (dev override)")

@app.get("/health")
def health():
    return {"ok": True, "demo": DEMO_MODE}

@app.get("/debug/env")
def debug_env():
    return {
        "OPENAI": bool(os.getenv("OPENAI_API_KEY")),
        "OPENAI_MODEL": os.getenv("OPENAI_CHAT_MODEL"),
        "OPENAI_EMBED_MODEL": os.getenv("OPENAI_EMBED_MODEL"),
        "CHROMA_PATH": os.getenv("CHROMA_PATH", "./.chroma_v4d"),
        "DB_PATH": os.getenv("DB_PATH", "./data/demo.db"),
        "DEMO_MODE": DEMO_MODE
    }

@app.on_event("startup")
async def startup():
    app.state.audit = AuditService()
    app.state.rag = RAGService()
    app.state.sqls = SQLService()
    await app.state.rag.ensure_ready()
    await app.state.sqls.ensure_ready()

@app.post("/chat/query")
async def chat(req: ChatRequest):
    t0 = time.time()
    audit = app.state.audit
    rag = app.state.rag
    sqls = app.state.sqls

    audit_id = audit.start(req.query)
    kind = req.force_kind if req.force_kind in {"navigator","trustbot"} else route_query(req.query)

    if kind == "trustbot":
        result = await sqls.answer(req.query, audit_id=audit_id, demo=DEMO_MODE)
    else:
        result = await rag.answer(req.query, audit_id=audit_id, locale=req.locale, jurisdiction=req.jurisdiction, demo=DEMO_MODE)
        if result.get("confidence",{}).get("level") in {"low","none"}:
            tb = await sqls.answer(req.query, audit_id=audit_id, demo=DEMO_MODE)
            if tb.get("confidence",{}).get("level") not in {"low","none"}:
                result = tb

    result.setdefault("audit_id", audit_id)
    audit.finish(audit_id, result, latency_ms=int((time.time()-t0)*1000))
    return result
    
@app.get("/debug/rag")
def debug_rag():
    rag = getattr(app.state, "rag", None)
    return {"mode": getattr(rag, "mode", None)}