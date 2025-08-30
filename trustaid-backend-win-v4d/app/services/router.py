import re

# Heuristics for data/analytics questions (SQL path)
DATA_TERMS = r"\b(budget|spend|spending|procurement|vendor|invoice|payment|salary|hr|headcount|leave|trend|average|median|mean|percent|%|sum|count|compare|q[1-4]|quarter|fy|table|chart|top|outlier|anomaly)\b"

# Heuristics for navigation / services questions (RAG path)
NAV_TERMS = r"\b(how|apply|steps|process|eligibility|documents|where|when|deadline|requirements|contact|support|benefit|allowance|rebate|service|appointment)\b"

# Strong government-service hints
GOV_TERMS = r"\b(centrelink|services australia|my aged care|ato|ndis|medicare|mygov|state revenue|family tax|carer|home care|visa|aged care|concession|pension)\b"

def route_query(q: str) -> str:
    ql = q.lower()
    if re.search(DATA_TERMS, ql):  # only send obviously-analytic queries to TrustBot
        return "trustbot"
    if re.search(NAV_TERMS, ql) or re.search(GOV_TERMS, ql):
        return "navigator"
    return "navigator"  # default

def looks_like_data_query(q: str) -> bool:
    return re.search(DATA_TERMS, q.lower()) is not None
