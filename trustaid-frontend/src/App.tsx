import React, { useEffect, useRef, useState } from "react";
import { Copy, Loader2, Send, Settings, ShieldCheck, Database, FileText, ChevronDown, ChevronUp, RefreshCcw, Plug, Lock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

type ChatItem = {
  role: "user" | "assistant" | "system";
  content: string;
  payload?: any;
};

type PipelinePref = "auto" | "navigator" | "trustbot";

const STORAGE_KEYS = {
  apiBase: "trustaid.apiBase",
  demoMode: "trustaid.demoMode",
  pipelinePref: "trustaid.pipelinePref",
};

const DEFAULT_API = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [apiBase, setApiBase] = useLocalStorage(STORAGE_KEYS.apiBase, DEFAULT_API);
  const [demoMode, setDemoMode] = useLocalStorage(STORAGE_KEYS.demoMode, true);
  const [pipelinePref, setPipelinePref] = useLocalStorage<PipelinePref>(STORAGE_KEYS.pipelinePref, "auto");

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatItem[]>([{
    role: "system",
    content: "Welcome to TrustAid. Ask about government services or data. We show citations, SQL and audit trails."
  }]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!query.trim() || busy) return;
    setError(null);
    const userQ = query.trim();
    setQuery("");
    setMessages((m) => [...m, { role: "user", content: userQ }]);
    setBusy(true);

    try {
      const payload: any = { query: userQ };
      if (pipelinePref !== "auto") payload.force_kind = pipelinePref; // optional backend hook

      let data: any;
      if (demoMode) {
        data = mockResponse(userQ, pipelinePref);
        await new Promise((r) => setTimeout(r, 700));
      } else {
        const res = await fetch(`${apiBase}/chat/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

      setMessages((m) => [...m, { role: "assistant", content: formatAssistantText(data), payload: data }]);
    } catch (e: any) {
      setError(e.message || "Request failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong. Please try again.", payload: { kind: "error" } }]);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto w-full px-4 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sidebar Settings */}
        <aside className="md:col-span-1 bg-white rounded-2xl shadow p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>

          <label className="text-sm font-medium text-slate-600">API Base URL</label>
          <div className="flex gap-2 items-center">
            <input value={apiBase} onChange={(e)=>setApiBase(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="http://localhost:8000" />
            <button onClick={()=>setApiBase(DEFAULT_API)} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs">Reset</button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Plug className="w-4 h-4"/> Demo Mode</label>
            <button onClick={()=>setDemoMode(!demoMode)} className={`px-3 py-1.5 rounded-xl text-xs ${demoMode?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-700"}`}>{demoMode?"ON":"OFF"}</button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">Pipeline Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {(["auto","navigator","trustbot"] as PipelinePref[]).map((p)=> (
                <button key={p} onClick={()=>setPipelinePref(p)} className={`px-2.5 py-1.5 rounded-xl text-xs border ${pipelinePref===p?"bg-slate-900 text-white border-slate-900":"bg-white text-slate-700 hover:bg-slate-50"}`}>{p}</button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Auto lets the backend route queries. Use Navigator for policy/process, TrustBot for numbers/data.</p>
          </div>

          <div className="text-xs text-slate-500 border-t pt-3">
            <div className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5"/>Evidence-first, read-only data, auditable answers.</div>
          </div>
        </aside>

        {/* Main Chat */}
        <main className="md:col-span-3 bg-white rounded-2xl shadow flex flex-col">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Lock className="w-4 h-4"/> Evidence & Audit Mode</span>
            <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><RefreshCcw className={`w-3.5 h-3.5 ${busy?"animate-spin":""}`} /> {busy?"Running..":"Idle"}</span>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} item={m} />
            ))}
          </div>

          {error && <div className="mx-4 mb-2 text-sm text-red-600">{error}</div>}

          <div className="p-4 border-t flex items-center gap-2">
            <input
              className="flex-1 border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Ask about government services or data..."
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              onKeyDown={onKey}
              disabled={busy}
            />
            <button onClick={send} disabled={busy} className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-50">
              {busy? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
              <span>Send</span>
            </button>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white/80 backdrop-blur sticky top-0 z-10 border-b">
      <div className="max-w-6xl mx-auto w-full px-4 py-3 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-slate-900"/>
        <h1 className="text-lg font-bold tracking-tight">TrustAid</h1>
        <span className="text-sm text-slate-600">Because services should be accurate, transparent, and easy to navigate.</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Database className="w-4 h-4"/><span>Read-only</span>
          <FileText className="w-4 h-4"/><span>With citations</span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-6 text-center text-xs text-slate-500">
      <div className="max-w-6xl mx-auto px-4">
        <p>© 2025 TrustAid • Audit-first AI for public services</p>
      </div>
    </footer>
  );
}

function MessageBubble({ item }: { item: ChatItem }) {
  const isUser = item.role === "user";
  const isAssistant = item.role === "assistant";
  return (
    <div className={`flex ${isUser?"justify-end":"justify-start"}`}>
      <div className={`max-w-[92%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow ${isUser?"bg-slate-900 text-white":"bg-slate-50"}`}>
        {isAssistant && item.payload ? <AssistantCard payload={item.payload} fallback={item.content}/> : <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>}
      </div>
    </div>
  );
}

function AssistantCard({ payload, fallback }: { payload: any; fallback: string }) {
  if (!payload || payload.kind === "error") {
    return <p className="text-slate-800">{fallback}</p>;
  }

  if (payload.kind === "navigator") {
    return <NavigatorAnswer data={payload} />;
  }
  if (payload.kind === "trustbot") {
    return <TrustbotAnswer data={payload} />;
  }
  // unknown: show raw
  return (
    <div>
      <p className="text-slate-800 whitespace-pre-wrap">{fallback}</p>
      <pre className="mt-2 bg-white text-xs p-3 rounded-xl overflow-auto border">{JSON.stringify(payload, null, 2)}</pre>
    </div>
  );
}

function Section({ title, children, defaultOpen=false }:{title:string; children:React.ReactNode; defaultOpen?:boolean}){
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 border rounded-xl bg-white">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium">
        <span>{title}</span>
        {open? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
      </button>
      {open && <div className="px-3 pb-3 text-sm text-slate-700 space-y-2">{children}</div>}
    </div>
  );
}

function NavigatorAnswer({ data }: { data: any }) {
  const conf = data.confidence?.level ? `${data.confidence.level} (${Math.round((data.confidence.score||0)*100)}%)` : "";
  return (
    <div>
      {data.answer && <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{data.answer}</p>}

      {Array.isArray(data.steps) && data.steps.length>0 && (
        <Section title="Recommended steps" defaultOpen>
          <ol className="list-decimal ml-5 space-y-1">
            {data.steps.map((s: any, i: number)=> (
              <li key={i}>
                <span className="font-medium">{s.title}</span>
                {s.link && <> · <a className="text-slate-900 underline" href={s.link} target="_blank" rel="noreferrer">link</a></>}
                {s.deadline && <span className="text-slate-500"> · due {new Date(s.deadline).toLocaleDateString()}</span>}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {Array.isArray(data.evidence) && data.evidence.length>0 && (
        <Section title="Why this is recommended (citations)">
          <ul className="space-y-1">
            {data.evidence.map((e:any, i:number)=> (
              <li key={i} className="text-sm">
                <span className="font-medium">{e.title}</span>
                {e.url || e.source ? (
                  <> – <a className="underline" href={(e.url||e.source)} target="_blank" rel="noreferrer">{e.url||e.source}</a></>
                ) : null}
                {e.updated_at && <span className="text-slate-500"> · updated {new Date(e.updated_at).toLocaleDateString()}</span>}
                {typeof e.similarity === "number" && <span className="text-slate-500"> · match {Math.round(e.similarity*100)}%</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
        {data.audit_id && <span>audit: <code className="bg-slate-100 px-1 rounded">{data.audit_id}</code></span>}
        {conf && <span>confidence: {conf}</span>}
      </div>
    </div>
  );
}

function TrustbotAnswer({ data }: { data: any }) {
  const conf = data.confidence?.level ? `${data.confidence.level} (${Math.round((data.confidence.score||0)*100)}%)` : data.confidence?.level || "";
  const table = data.table;
  const chart = data.chart;

  return (
    <div className="space-y-3">
      {data.answer && <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{data.answer}</p>}

      {table?.columns && (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {table.columns.map((c:string)=> <th key={c} className="text-left px-3 py-2 font-semibold text-slate-700">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {table.rows?.map((r:any[], idx:number)=> (
                <tr key={idx} className="odd:bg-white even:bg-slate-50/50">
                  {r.map((cell:any, i:number)=> <td key={i} className="px-3 py-2 whitespace-nowrap">{formatCell(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chart && (
        <div className="h-56 w-full border rounded-xl bg-white p-2">
          <ResponsiveContainer width="100%" height="100%">
            {chart.type === "bar" ? (
              <BarChart data={rowsToObjects(table)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.x} />
                <YAxis />
                <Tooltip />
                <Bar dataKey={chart.y} />
              </BarChart>
            ) : (
              <LineChart data={rowsToObjects(table)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.x} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey={chart.y} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {data.sql && (
        <Section title="SQL (read-only)">
          <CodeBlock code={data.sql} />
        </Section>
      )}

      {data.dataset && (
        <div className="text-xs text-slate-500">
          <span className="font-medium">Dataset:</span> {data.dataset.name || "(unknown)"}
          {data.dataset.period && <> · period {data.dataset.period}</>}
          {data.dataset.last_updated && <> · updated {new Date(data.dataset.last_updated).toLocaleDateString()}</>}
        </div>
      )}

      <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
        {data.audit_id && <span>audit: <code className="bg-slate-100 px-1 rounded">{data.audit_id}</code></span>}
        {conf && <span>confidence: {conf}</span>}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }){
  function copy() {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
  }
  return (
    <div className="relative">
      <button onClick={copy} className="absolute right-2 top-2 text-xs inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">
        <Copy className="w-3.5 h-3.5"/> Copy
      </button>
      <textarea readOnly value={code} className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-mono leading-relaxed min-h-[120px]" />
    </div>
  );
}

function formatAssistantText(data: any) {
  if (data.kind === "navigator") {
    const title = data.answer || "Here are the recommended steps based on official sources:";
    const steps = (data.steps||[]).map((s:any, i:number)=> `${i+1}. ${s.title}`).join("\n");
    return `${title}\n${steps}`;
  }
  if (data.kind === "trustbot") {
    return data.answer || "Here are the results with SQL shown.";
  }
  return "";
}

function formatCell(val:any){
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return new Intl.NumberFormat().format(val as number);
  return String(val);
}

function rowsToObjects(table:any){
  if (!table?.columns || !table?.rows) return [];
  return table.rows.map((r:any[]) => {
    const o:any = {};
    table.columns.forEach((c:string, i:number)=> o[c] = r[i]);
    return o;
  })
}

// Demo mocks (for Demo Mode)
function mockResponse(q:string, pref: PipelinePref){
  const wantTrust = pref === "trustbot" || /top|average|median|quarter|q\d|amount|sum|\d+%|how many|show/i.test(q);
  if (wantTrust) {
    return {
      kind: "trustbot",
      answer: "Top vendor payments in 2023–24 Q2 (≥ $500k).",
      table: {
        columns: ["vendor","amount","date","category"],
        rows: [["Acme Pty Ltd", 830000, "2024-02-13","IT"],["Koala Tech", 790000, "2024-03-29","Services"],["Wattle Solutions", 670000, "2024-01-19","Consulting"]]
      },
      chart: { type: "bar", x: "vendor", y: "amount" },
      sql: "SELECT vendor, amount, paid_at as date, category FROM procurement_payments WHERE amount >= 500000 AND quarter='2023-24 Q2' ORDER BY amount DESC LIMIT 10;",
      dataset: { name: "AusTender Demo", period: "2023-07-01..2024-06-30", last_updated: new Date().toISOString() },
      confidence: { level: "exact", score: 1.0 },
      audit_id: genId(),
    }
  }
  return {
    kind: "navigator",
    answer: "Based on official sources, here is a simple plan to arrange home care after hospital discharge:",
    steps: [
      { title: "Book a My Aged Care assessment", link: "https://www.myagedcare.gov.au/" },
      { title: "Prepare medical summary & ID documents", link: "https://www.healthdirect.gov.au/" },
      { title: "Explore interim respite services in your LGA" },
    ],
    evidence: [
      { title: "Home Care Packages (My Aged Care)", url: "https://www.myagedcare.gov.au/home-care-package", updated_at: "2025-06-01", similarity: 0.82 },
      { title: "Carer Allowance (Services Australia)", url: "https://www.servicesaustralia.gov.au/carer-allowance", updated_at: "2025-05-12", similarity: 0.76 },
    ],
    confidence: { level: "high", score: 0.84 },
    audit_id: genId(),
  }
}

function genId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}