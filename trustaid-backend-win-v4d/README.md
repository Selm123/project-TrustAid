# TrustAid Backend v4d (Chroma manual embeddings incl. GQA + httpx pin)

**Fixes**
- Manual embeddings for **both** `docs` and `gqa` collections (no collection-bound EF required).
- Default `CHROMA_PATH=.\.chroma_v4d` (fresh store).
- `httpx==0.27.2` pinned to avoid OpenAI/httpx proxies kwarg issue.

## Start
```
copy .env.example .env
# add OPENAI_API_KEY
run_with_py313.bat
```
Open http://localhost:8000/health
Generated: 2025-08-30T11:32:11.774120