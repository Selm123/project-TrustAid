import os, json
from typing import Optional, Dict, Any
from openai import OpenAI

def _api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "")

def _chat_model() -> str:
    return os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

_client: Optional[OpenAI] = None
def client() -> Optional[OpenAI]:
    global _client
    key = _api_key()
    if not key:
        return None
    if _client is None:
        _client = OpenAI(api_key=key)
    return _client

def chat_json(system: str, user: str) -> Dict[str, Any]:
    c = client()
    if not c:
        raise RuntimeError("OPENAI_API_KEY not set. Add it to .env and restart.")
    resp = c.chat.completions.create(
        model=_chat_model(),
        messages=[{"role":"system","content":system},{"role":"user","content":user}],
        temperature=0.2,
        response_format={"type":"json_object"}
    )
    txt = resp.choices[0].message.content or "{}"
    try:
        import json as _json
        return _json.loads(txt)
    except Exception:
        return {"answer": txt}