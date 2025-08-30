import os, re, sqlite3, datetime as dt
from typing import Dict, Any
try:
    import sqlglot
    HAVE_SQLGLOT = True
except Exception:
    HAVE_SQLGLOT = False
from app.services.llm import chat_json

DB_PATH = os.getenv("DB_PATH", "./data/demo.db")

SAMPLE_ROWS = [
    ("Acme Pty Ltd", 830000, "2024-02-13", "IT", "2023-24 Q2"),
    ("Koala Tech", 790000, "2024-03-29", "Services", "2023-24 Q2"),
    ("Wattle Solutions", 670000, "2024-01-19", "Consulting", "2023-24 Q2"),
]

class SQLService:
    def __init__(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS procurement_payments(vendor TEXT, amount REAL, paid_at TEXT, category TEXT, quarter TEXT)")
        c = cur.execute("SELECT COUNT(*) FROM procurement_payments").fetchone()[0]
        if c == 0:
            cur.executemany("INSERT INTO procurement_payments VALUES (?,?,?,?,?)", SAMPLE_ROWS)
            self.conn.commit()

    async def ensure_ready(self):
        return

    def _validate_sql(self, sql: str) -> str:
        s = sql.strip()
        sl = s.lower()
        if not sl.startswith("select"):
            raise ValueError("Only read-only SELECT is allowed.")
        banned = ["insert","update","delete","drop","alter","attach","pragma","create ","replace ","vacuum"]
        if any(b in sl for b in banned):
            raise ValueError("Write or DDL operations are not allowed.")
        if HAVE_SQLGLOT:
            parsed = sqlglot.parse_one(s, read="sqlite")
            if parsed is None or parsed.key != "Select":
                raise ValueError("Only SELECT AST is allowed.")
            allowed_tables = {"procurement_payments"}
            allowed_cols = {"vendor","amount","paid_at","date","category","quarter"}
            for t in parsed.find_all("Table"):
                if t.name not in allowed_tables:
                    raise ValueError(f"Table not allowed: {t.name}")
            for c in parsed.find_all("Column"):
                if c.name not in allowed_cols:
                    raise ValueError(f"Column not allowed: {c.name}")
        return s

    def _gen_sql(self, q: str, use_llm: bool) -> str:
        if use_llm:
            schema = "TABLE procurement_payments(vendor TEXT, amount REAL, paid_at TEXT, category TEXT, quarter TEXT) -- SQLite SELECT-only"
            prompt = f"Question: {q}\nSchema:\n{schema}\nRules: SELECT-only; limit 50. Return JSON: {{\"sql\":\"...\"}}"
            try:
                j = chat_json("You translate questions to safe SQLite SELECT queries only.", prompt)
                sql = j.get("sql") or j.get("SQL") or ""
                if not sql.strip().lower().startswith("select"):
                    raise ValueError("Non-select generated")
                return sql
            except Exception:
                pass
        if re.search(r"\b(q2|quarter 2|2023\s*[-/]?24\s*q2)\b", q.lower()):
            return "SELECT vendor, amount, paid_at as date, category FROM procurement_payments WHERE quarter='2023-24 Q2' AND amount >= 500000 ORDER BY amount DESC LIMIT 10;"
        return "SELECT vendor, amount, paid_at as date, category FROM procurement_payments ORDER BY amount DESC LIMIT 10;"

    async def answer(self, q: str, audit_id: str, demo: bool = False) -> Dict[str, Any]:
        use_llm = (not demo)
        sql = self._gen_sql(q, use_llm=use_llm)
        try:
            sql = self._validate_sql(sql)
        except Exception:
            return {"kind":"trustbot","answer":"Query validation failed.","confidence":{"level":"none","score":0.0}}
        cur = self.conn.cursor()
        rows = cur.execute(sql).fetchall()
        cols = rows[0].keys() if rows else ["vendor","amount","date","category"]
        out_rows = [[r[c] for c in cols] for r in rows]
        return {
            "kind":"trustbot",
            "answer":"Here are the results.",
            "table": {"columns": list(cols), "rows": out_rows},
            "chart": {"type":"bar","x": cols[0], "y": cols[1] if len(cols)>1 else cols[0]},
            "sql": sql,
            "dataset": {"name":"AusTender Demo","period":"2023-07-01..2024-06-30","last_updated": dt.datetime.now().isoformat()},
            "confidence": {"level":"exact","score": 1.0},
        }