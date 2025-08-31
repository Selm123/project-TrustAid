// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Bot, Send, Settings, Lock, Database, FileText, CheckCircle2,
  ChevronDown, ChevronUp, Copy, Loader2, Languages, MapPin, ShieldCheck
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from "recharts";

/* ---------------- Types ---------------- */
type ChatItem = {
  role: "user" | "assistant" | "system";
  content: string;
  payload?: any;
};
type PipelinePref = "auto" | "navigator" | "trustbot";

/* ---------------- Config ---------------- */
const STORAGE_KEYS = {
  apiBase: "trustaid.apiBase",
  demoMode: "trustaid.demoMode",
  pipelinePref: "trustaid.pipelinePref",
};
const DEFAULT_API =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

/* ---------------- Utilities ---------------- */
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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* ---------------- Quick categories ---------------- */
const QUICK_CATEGORIES: Array<{ label: string; query: string }> = [
  { label: "Benefits & support", query: "What payments or benefits can I get?" },
  { label: "Business", query: "What licenses or registrations do I need to start a small business?" },
  { label: "Births, deaths, marriages", query: "What to do when someone dies" },
  { label: "Community & events", query: "Find community support services near me" },
  { label: "Travel & transport", query: "How to apply for a concession travel card" },
  { label: "Home & land", query: "What help is available for renting or buying a home?" },
];

/* ---------------- App ---------------- */
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <TopNav />
      <Hero />
      <FeaturesGrid />
      <AssistantWidget />
      <Footer />
    </div>
  );
}

/* ---------------- Nav / Hero / Features ---------------- */
function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-5 h-5 text-slate-900" />
          <span className="text-lg tracking-tight">
            Trust<span className="text-sky-600">Aid</span>
            <span className="text-amber-500"> +</span>
          </span>
        </div>
        <nav className="text-sm text-slate-700 flex items-center gap-4">
          <a className="font-semibold border-b-2 border-slate-900" href="#">
            Home
          </a>
          <a className="hover:text-slate-900" href="#">
            Government activities
          </a>
          <a className="hover:text-slate-900" href="#">
            About
          </a>
        </nav>
        <div className="ml-auto text-xs text-slate-500 hidden md:flex items-center gap-3">
          <Database className="w-4 h-4" /> <span>Read-only</span>
          <FileText className="w-4 h-4" /> <span>With citations</span>
          <Lock className="w-4 h-4" /> <span>Audit-first</span>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600" />
      <div className="relative">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 text-white">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Access government <br className="hidden md:block" />
            services made easy
          </h1>
          <p className="mt-4 text-white/90 max-w-2xl">
            The simple way to find the support you need — clear steps, official
            links, and verifiable results.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const items = [
    {
      title: "Personalised guidance",
      desc: "Smart recommendations, personalised to your needs.",
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      title: "Life event support",
      desc: "Help when life changes, like bereavement or becoming a carer.",
      icon: <HeartIcon />,
    },
    {
      title: "Local connections",
      desc: "Connect with community services and nearby centres.",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      title: "Plain English explanations",
      desc: "Short, scannable answers you can trust.",
      icon: <Languages className="w-5 h-5" />,
    },
    {
      title: "Accurate results",
      desc: "Citations, timestamps, confidence and the exact SQL for analytics.",
      icon: <Database className="w-5 h-5" />,
    },
    {
      title: "Secure and control",
      desc: "Read-only data, no PII joins, full audit trail.",
      icon: <Lock className="w-5 h-5" />,
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 -mt-10 md:-mt-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <div key={i} className="bg-white rounded-2xl shadow p-5 flex items-start gap-3">
            <div className="text-sky-700">{it.icon}</div>
            <div>
              <div className="font-semibold">{it.title}</div>
              <div className="text-sm text-slate-600">{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Simple heart icon as a React component */
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 21s-6.716-4.063-9.238-7.207C.485 10.934 1.46 7.5 4.5 6.5c2.09-.69 3.78.25 4.5 1.5.72-1.25 2.41-2.19 4.5-1.5 3.04 1 4.02 4.434 1.738 7.293C18.716 16.937 12 21 12 21z" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="py-8 text-center text-xs text-slate-500">
      <div className="max-w-6xl mx-auto px-4">
        <p>© 2025 TrustAid • Evidence-first assistance for public services</p>
      </div>
    </footer>
  );
}

/* ---------------- Assistant Widget ---------------- */
function AssistantWidget() {
  const [apiBase, setApiBase] = useLocalStorage(STORAGE_KEYS.apiBase, DEFAULT_API);
  const [demoMode, setDemoMode] = useLocalStorage(STORAGE_KEYS.demoMode, false);
  const [pipelinePref, setPipelinePref] = useLocalStorage<PipelinePref>(STORAGE_KEYS.pipelinePref, "auto");

  const [openSettings, setOpenSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      role: "assistant",
      content:
        "Hello, I’m your virtual assistant.\n\nThink of me as your guide to government services—from payments and health support to local events and everyday needs.\n\nHow can I help you today?",
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(payloadQuery?: string) {
    const text = (payloadQuery ?? query).trim();
    if (!text || busy) return;
    setError(null);
    setQuery("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);

    try {
      const payload: any = { query: text };
      if (pipelinePref !== "auto") payload.force_kind = pipelinePref;

      let data: any;
      if (demoMode) {
        data = mockResponse(text);
        await new Promise((r) => setTimeout(r, 600));
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

      setMessages((m) => [
        ...m,
        { role: "assistant", content: formatAssistantText(data), payload: data },
        ...(data?.kind === "navigator"
          ? [
              {
                role: "assistant",
                content: "Would you like a quick summary of the steps?",
                payload: { kind: "summary_prompt" },
              } as ChatItem,
            ]
          : []),
      ]);
    } catch (e: any) {
      setError(e.message || "Request failed");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          payload: { kind: "error" },
        },
      ]);
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
    <div className="fixed right-4 md:right-8 bottom-4 md:bottom-8 z-40 w-[360px] max-w-[92vw]">
      <div className="rounded-2xl shadow-2xl overflow-hidden border bg-white">
        {/* Yellow header */}
        <div className="bg-amber-400 text-slate-900 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/70 rounded-full p-1">
              <Bot className="w-4 h-4" />
            </div>
            <div className="text-sm font-semibold">TrustAid Assistant</div>
          </div>
          <button
            onClick={() => setOpenSettings((s) => !s)}
            className="inline-flex items-center gap-1 text-xs bg-amber-500/40 hover:bg-amber-500/60 px-2 py-1 rounded"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>

        {/* Settings */}
        {openSettings && (
          <div className="px-3 py-2 border-b bg-amber-50 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-700">API Base</label>
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="flex-1 border rounded px-2 py-1"
                placeholder="http://localhost:8000"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-700">Mode</label>
              <select
                value={pipelinePref}
                onChange={(e) => setPipelinePref(e.target.value as PipelinePref)}
                className="border rounded px-2 py-1"
              >
                <option value="auto">auto</option>
                <option value="navigator">navigator</option>
                <option value="trustbot">trustbot</option>
              </select>
              <label className="ml-auto flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={() => setDemoMode(!demoMode)}
                />
                <span>Demo</span>
              </label>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div className="px-3 pt-3 pb-1">
          <div ref={listRef} className="h-[360px] overflow-y-auto space-y-3 pr-1">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {QUICK_CATEGORIES.map((c, i) => (
                  <Chip key={i} text={c.label} onClick={() => send(c.query)} />
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble
                key={i}
                item={m}
                onSummarise={() => send("Yes, tell me the steps")}
              />
            ))}
          </div>

          {error && <div className="mt-1 text-xs text-red-600">{error}</div>}

          {/* Input */}
          <div className="mt-2 mb-2 flex items-center gap-2">
            <input
              className="flex-1 border rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Type your message..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              disabled={busy}
            />
            <button
              onClick={() => send()}
              disabled={busy}
              className={cx(
                "inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm text-white",
                busy ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800"
              )}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI Pieces ---------------- */
function Chip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full border text-sm bg-white hover:bg-slate-50 shadow-sm"
    >
      {text}
    </button>
  );
}

function MessageBubble({
  item,
  onSummarise,
}: {
  item: ChatItem;
  onSummarise: () => void;
}) {
  const isUser = item.role === "user";
  const isAssistant = item.role === "assistant";
  const summaryPrompt = item.payload?.kind === "summary_prompt";

  return (
    <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[90%] rounded-2xl px-4 py-3 shadow",
          isUser ? "bg-sky-600 text-white" : "bg-slate-50"
        )}
      >
        {isAssistant && item.payload && !summaryPrompt ? (
          <AssistantCard payload={item.payload} fallback={item.content} />
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{item.content}</p>
        )}

        {summaryPrompt && (
          <div className="mt-2">
            <button
              onClick={onSummarise}
              className="px-3 py-1.5 rounded-xl text-sm bg-sky-600 text-white hover:bg-sky-700"
            >
              Yes, tell me the steps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantCard({ payload, fallback }: { payload: any; fallback: string }) {
  if (!payload || payload.kind === "error") {
    return <p className="text-slate-800">{fallback}</p>;
  }
  if (payload.kind === "navigator") return <NavigatorAnswer data={payload} />;
  if (payload.kind === "trustbot") return <TrustbotAnswer data={payload} />;
  return (
    <div>
      <p className="text-slate-800 whitespace-pre-wrap">{fallback}</p>
      <pre className="mt-2 bg-white text-xs p-3 rounded-xl overflow-auto border">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 border rounded-xl bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-3 pb-3 text-sm text-slate-700 space-y-2">{children}</div>}
    </div>
  );
}

function NavigatorAnswer({ data }: { data: any }) {
  const conf = data.confidence?.level
    ? `${data.confidence.level} (${Math.round((data.confidence.score || 0) * 100)}%)`
    : "";

  return (
    <div>
      {data.answer && (
        <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{data.answer}</p>
      )}

      {Array.isArray(data.steps) && data.steps.length > 0 && (
        <Section title="Summary of steps" defaultOpen>
          <ol className="list-decimal ml-5 space-y-1">
            {data.steps.map((s: any, i: number) => (
              <li key={i}>
                <span className="font-medium">{s.title}</span>
                {s.link && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      className="text-slate-900 underline"
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Learn more
                    </a>
                  </>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {Array.isArray(data.evidence) && data.evidence.length > 0 && (
        <Section title="Sources">
          <ul className="space-y-1">
            {data.evidence.map((e: any, i: number) => (
              <li key={i} className="text-sm">
                <a
                  className="underline"
                  href={e.url || e.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  {e.title || e.url || e.source}
                </a>
                {e.updated_at && (
                  <span className="text-slate-500">
                    {" "}
                    · updated {new Date(e.updated_at).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
        {data.audit_id && (
          <span>
            audit: <code className="bg-slate-100 px-1 rounded">{data.audit_id}</code>
          </span>
        )}
        {conf && <span>confidence: {conf}</span>}
      </div>
    </div>
  );
}

function TrustbotAnswer({ data }: { data: any }) {
  const conf = data.confidence?.level
    ? `${data.confidence.level} (${Math.round((data.confidence.score || 0) * 100)}%)`
    : data.confidence?.level || "";
  const table = data.table;
  const chart = data.chart;

  return (
    <div className="space-y-3">
      {data.answer && (
        <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">{data.answer}</p>
      )}

      {table?.columns && (
        <div className="overflow-x-auto border rounded-xl bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {table.columns.map((c: string) => (
                  <th key={c} className="text-left px-3 py-2 font-semibold text-slate-700">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows?.map((r: any[], idx: number) => (
                <tr key={idx} className="odd:bg-white even:bg-slate-50/50">
                  {r.map((cell: any, i: number) => (
                    <td key={i} className="px-3 py-2 whitespace-nowrap">
                      {formatCell(cell)}
                    </td>
                  ))}
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
          {data.dataset.last_updated && (
            <> · updated {new Date(data.dataset.last_updated).toLocaleDateString()}</>
          )}
        </div>
      )}

      <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
        {data.audit_id && (
          <span>
            audit: <code className="bg-slate-100 px-1 rounded">{data.audit_id}</code>
          </span>
        )}
        {conf && <span>confidence: {conf}</span>}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
  };
  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute right-2 top-2 text-xs inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
      >
        <Copy className="w-3.5 h-3.5" /> Copy
      </button>
      <textarea
        readOnly
        value={code}
        className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-mono leading-relaxed min-h-[120px]"
      />
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function formatAssistantText(data: any) {
  if (data?.kind === "navigator") {
    const title = data.answer || "Here are the recommended steps:";
    const steps = (data.steps || [])
      .map((s: any, i: number) => `${i + 1}. ${s.title}`)
      .join("\n");
    return `${title}\n${steps}`;
  }
  if (data?.kind === "trustbot") {
    return data.answer || "Here are the results with SQL shown.";
  }
  return "";
}
function formatCell(val: any) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") return new Intl.NumberFormat().format(val as number);
  return String(val);
}
function rowsToObjects(table: any) {
  if (!table?.columns || !table?.rows) return [];
  return table.rows.map((r: any[]) => {
    const o: any = {};
    table.columns.forEach((c: string, i: number) => (o[c] = r[i]));
    return o;
  });
}

/* Demo mock (toggle via Settings → Demo) */
function mockResponse(q: string) {
  const isBereavement = /die|passed away|bereave|death/i.test(q);
  if (isBereavement) {
    return {
      kind: "navigator",
      answer: "I’m sorry for your loss. Here is a simple plan after a death:",
      steps: [
        {
          title: "Register the death",
          link: "https://www.servicesaustralia.gov.au/when-someone-dies",
        },
        {
          title: "Organise the funeral",
          link: "https://www.service.nsw.gov.au/death-and-bereavement",
        },
        { title: "Notify people and organisations" },
      ],
      evidence: [
        {
          title: "When someone dies — Services Australia",
          url: "https://www.servicesaustralia.gov.au/when-someone-dies",
          updated_at: "2025-06-01",
        },
        {
          title: "Death and bereavement — Service NSW",
          url: "https://www.service.nsw.gov.au/",
          updated_at: "2025-05-12",
        },
      ],
      confidence: { level: "high", score: 0.86 },
      audit_id: genId(),
    };
  }
  return {
    kind: "navigator",
    answer: "Here’s what to do:",
    steps: [
      { title: "Check eligibility" },
      { title: "Prepare documents" },
      { title: "Apply online" },
    ],
    evidence: [],
    confidence: { level: "medium", score: 0.6 },
    audit_id: genId(),
  };
}
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
