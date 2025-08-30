import re
def route_query(q: str) -> str:
    ql = q.lower()
    if re.search(r"\b(top|average|median|mean|percent|%|sum|count|compare|trend|q[1-4]|quarter|year|fy|table|chart)\b", ql):
        return "trustbot"
    if re.search(r"\b(how|apply|steps|process|eligibility|documents|where|when|deadline|requirements)\b", ql):
        return "navigator"
    return "navigator"