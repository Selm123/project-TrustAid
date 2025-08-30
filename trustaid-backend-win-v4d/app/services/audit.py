import time, uuid
class AuditService:
    def __init__(self):
        self.store = {}
    def start(self, query: str) -> str:
        aid = uuid.uuid4().hex[:12]
        self.store[aid] = {"query": query, "events": [{"t": time.time(), "ev": "start"}]}
        return aid
    def log(self, aid: str, ev: str, **kv):
        if aid in self.store:
            self.store[aid]["events"].append({"t": time.time(), "ev": ev, **kv})
    def finish(self, aid: str, payload: dict, latency_ms: int = 0):
        if aid in self.store:
            self.store[aid]["events"].append({"t": time.time(), "ev": "finish", "latency_ms": latency_ms})
            self.store[aid]["result"] = payload