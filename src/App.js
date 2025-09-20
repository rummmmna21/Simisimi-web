/* App.js - Fixed BabyAI Dashboard with Messenger + Effects */

import React, { useState, useEffect, useRef } from "react";

const DEFAULT_API = "https://rx-simisimi-api-tllc.onrender.com";

export default function App() {
  const [currentPage, setCurrentPage] = useState("teach");
  const [apiBase, setApiBase] = useState(localStorage.getItem("babyai_api_base") || DEFAULT_API);
  const [status, setStatus] = useState({ taughtQuestions: 0, storedReplies: 0, developer: "rX Abdullah" });
  const [polling, setPolling] = useState(true);
  const [teachInput, setTeachInput] = useState("");
  const [askInput, setAskInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState(null);
  const [buttonPressed, setButtonPressed] = useState("");

  const pollingRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => localStorage.setItem("babyai_api_base", apiBase), [apiBase]);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${apiBase}/status`);
        if (!res.ok) throw new Error("Status fetch failed");
        const data = await res.json();
        setStatus(prev => ({
          taughtQuestions: data.taughtQuestions ?? prev.taughtQuestions,
          storedReplies: data.storedReplies ?? prev.storedReplies,
          developer: data.developer ?? prev.developer,
        }));
      } catch {}
    }
    fetchStatus();
    if (polling) pollingRef.current = setInterval(fetchStatus, 1000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [apiBase, polling]);

  function pushLog(line) {
    const ts = new Date().toLocaleTimeString();
    setActivityLog(prev => [`${ts} — ${line}`, ...prev].slice(0, 200));
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleButtonPress(name) {
    setButtonPressed(name);
    setTimeout(() => setButtonPressed(""), 200);
  }

  async function handleMultiTeach(e) {
    e.preventDefault();
    handleButtonPress("multiTeach");
    if (!teachInput.trim()) return showToast("Provide teach pairs!", "error");
    setLoading(true);

    const teaches = teachInput.split(",").map(t => t.trim()).filter(Boolean);
    const localResults = [];

    for (let t of teaches) {
      const parts = t.split("-").map(x => x.trim());
      if (parts.length < 2) { localResults.push({ text: t, ok: false, msg: "Invalid format" }); continue; }
      const ask = parts[0];
      const ans = parts.slice(1).join(" - ");
      try {
        const q = new URL(`${apiBase}/teach`);
        q.searchParams.set("ask", ask);
        q.searchParams.set("ans", ans);
        q.searchParams.set("senderName", "web-dashboard");
        const res = await fetch(q.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        localResults.push({ text: `${ask} → ${ans}`, ok: true, msg: data.message || "OK" });
        pushLog(`Taught: ${ask} → ${ans}`);
      } catch (err) {
        localResults.push({ text: `${ask} → ${ans}`, ok: false, msg: err.message });
        pushLog(`Error teaching: ${ask} — ${err.message}`);
      }
    }

    setResults(localResults);
    setLoading(false);
    setTeachInput("");
    showToast("✅ Multiple Teach Done", "success");
  }

  async function handleSingleTeach() {
    handleButtonPress("singleTeach");
    if (!askInput.trim() || !answerInput.trim()) return showToast("Ask and Ans required!", "error");
    setLoading(true);
    try {
      const q = new URL(`${apiBase}/teach`);
      q.searchParams.set("ask", askInput.trim());
      q.searchParams.set("ans", answerInput.trim());
      q.searchParams.set("senderName", "web-dashboard");
      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults([{ text: `${askInput} → ${answerInput}`, ok: true, msg: data.message || "OK" }]);
      pushLog(`Taught: ${askInput} → ${answerInput}`);
      showToast("✅ Single Teach Done", "success");
      setAskInput(""); setAnswerInput("");
    } catch (err) {
      setResults([{ text: `${askInput} → ${answerInput}`, ok: false, msg: err.message }]);
      pushLog(`Error teaching: ${askInput} — ${err.message}`);
      showToast("❌ Single Teach Failed", "error");
    }
    setLoading(false);
  }

  async function handleAsk() {
    if (!askInput.trim()) return showToast("Message empty!", "error");
    setLoading(true);
    try {
      const q = new URL(`${apiBase}/simsimi`);
      q.searchParams.set("text", askInput.trim());
      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.response || JSON.stringify(data);
      pushLog(`Ask: ${askInput} → Reply: ${reply}`);
      setMessages(prev => [...prev, { user: askInput, bot: reply }]);
      setAskInput("");
    } catch (err) {
      pushLog(`Ask error: ${err.message}`);
      showToast("Ask error", "error");
    }
    setLoading(false);
  }

  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const pageButtons = [
    { key: "teach", label: "Teach System" },
    { key: "chat", label: "Messenger" },
    { key: "api", label: "API Info" },
  ];

  const renderPage = () => {
    if (currentPage === "teach") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">🧠 Teach System</h2>
          <form onSubmit={handleMultiTeach} className="space-y-4">
            <textarea
              placeholder="hello - Hi there, bye - Goodbye!"
              value={teachInput}
              onChange={e => setTeachInput(e.target.value)}
              className="w-full border rounded p-3 text-sm h-28"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded bg-indigo-600 text-white text-sm transition transform ${buttonPressed==="multiTeach"?"scale-95 ring-2 ring-indigo-400":""}`}
              >
                Teach Multiple
              </button>
              <button
                type="button"
                onClick={() => { setTeachInput(""); setResults([]); handleButtonPress("clear"); }}
                className={`px-3 py-2 rounded border text-sm transition transform ${buttonPressed==="clear"?"scale-95 ring-2 ring-gray-400":""}`}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <div className="flex gap-2 flex-1">
              <input placeholder="Ask" value={askInput} onChange={e => setAskInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <input placeholder="Ans" value={answerInput} onChange={e => setAnswerInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <button
                onClick={handleSingleTeach}
                disabled={loading}
                className={`px-3 py-2 rounded bg-green-600 text-white text-sm transition transform ${buttonPressed==="singleTeach"?"scale-95 ring-2 ring-green-400":""}`}
              >
                Teach
              </button>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <input placeholder="Ask to test" value={askInput} onChange={e => setAskInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <button onClick={handleAsk} disabled={loading} className="px-3 py-2 rounded bg-yellow-600 text-white text-sm">Ask</button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Results</h3>
            <div className="space-y-2">
              {results.length===0 ? <div className="text-xs text-gray-500">No results yet.</div> :
                results.map((r,i)=>(
                  <div key={i} className={`p-3 rounded ${r.ok?'bg-green-50':'bg-red-50'} text-sm`}>
                    <div className="font-medium">{r.text}</div>
                    {r.msg && <div className="text-xs text-gray-600">{r.msg}</div>}
                  </div>
                ))
              }
            </div>
          </div>
        </section>
      );
    }

    // Chat page
    if (currentPage === "chat") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-4 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
            {messages.map((m,i)=>(
              <div key={i} className="flex items-end gap-2">
                {m.bot && (
                  <div className="flex items-end gap-2">
                    <img src="https://i.imgur.com/HPWnQI1.jpeg" alt="Bot" className="w-8 h-8 rounded-full" />
                    <div className="bg-gray-200 rounded-2xl p-2 text-sm max-w-[70%]">{m.bot}</div>
                  </div>
                )}
                {m.user && (
                  <div className="ml-auto flex items-end gap-2">
                    <div className="bg-blue-500 text-white rounded-2xl p-2 text-sm max-w-[70%]">{m.user}</div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={askInput}
              onChange={e=>setAskInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter' && handleAsk()}
              placeholder="Type a message..."
              className="flex-1 border rounded-full p-2 text-sm"
            />
            <button onClick={handleAsk} className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm">Send</button>
          </div>
        </section>
      );
    }

    if (currentPage === "api") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">🔗 API Info</h2>
          <div className="text-sm space-y-2">
            <div>API Base: <span className="font-mono">{apiBase}</span></div>
            <div>Teached Questions: <span className="font-mono">{status.taughtQuestions}</span></div>
            <div>Stored Replies: <span className="font-mono">{status.storedReplies}</span></div>
            <div>Developer: <span className="font-mono">{status.developer}</span></div>
          </div>
        </section>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">🌟 Baby AI Dashboard</h1>
          <div className="flex gap-2">
            {pageButtons.map(b=>(
              <button
                key={b.key}
                onClick={()=>setCurrentPage(b.key)}
                className={`px-3 py-1 rounded ${currentPage===b.key?'bg-indigo-600 text-white':'bg-gray-200 text-gray-700'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderPage()}

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-4 text-sm space-y-1">
              <div>📝 Teached Questions: {status.taughtQuestions}</div>
              <div>📦 Stored Replies: {status.storedReplies}</div>
              <div>👤 Developer: {status.developer}</div>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-semibold mb-1">Activity Log</h3>
              <div className="h-48 overflow-y-auto text-xs text-gray-600 space-y-1 border rounded p-2">
                {activityLog.length===0?'No activity yet.':activityLog.map((l,i)=><div key={i}>{l}</div>)}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-semibold mb-1">API Settings</h3>
              <input
                value={apiBase}
                onChange={e=>setApiBase(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                placeholder="API Base URL"
              />
            </div>
          </aside>
        </main>

        {toast && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg text-white ${toast.type==='success'?'bg-green-500':'bg-red-500'} animate-pulse`}>
            {toast.msg}
          </div>
        )}

        <footer className="mt-6 text-center text-xs text-gray-500">
          Made with ❤️ by rX Abdullah
        </footer>
      </div>
    </div>
  );
}
