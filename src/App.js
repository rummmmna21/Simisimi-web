/* App.js - BabyAI 3-Page Dashboard */

import React, { useState, useEffect, useRef } from "react";

const DEFAULT_API = "https://rx-simisimi-api-tllc.onrender.com";

export default function App() {
  const [currentPage, setCurrentPage] = useState("teach"); // teach | chat | api
  const [apiBase, setApiBase] = useState(localStorage.getItem("babyai_api_base") || DEFAULT_API);
  const [status, setStatus] = useState({ taughtQuestions: 0, storedReplies: 0, developer: "rX Abdullah" });
  const [polling, setPolling] = useState(true);
  const [teachInput, setTeachInput] = useState("");
  const [askInput, setAskInput] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activityLog, setActivityLog] = useState([]);
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState(null);

  const pollingRef = useRef(null);

  // Save API Base
  useEffect(() => localStorage.setItem("babyai_api_base", apiBase), [apiBase]);

  // Poll API status
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

  // Activity log
  function pushLog(line) {
    const ts = new Date().toLocaleTimeString();
    setActivityLog(prev => [`${ts} — ${line}`, ...prev].slice(0, 200));
  }

  // Toast popup
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Multi-teach
  async function handleMultiTeach(e) {
    e.preventDefault();
    setError("");
    if (!teachInput.trim()) return setError("Provide teach pairs (ask - ans), separated by commas.");
    setLoading(true);
    const teaches = teachInput.split(",").map(t => t.trim()).filter(Boolean);
    const localResults = [];

    for (let t of teaches) {
      const parts = t.split("-").map(x => x.trim());
      if (parts.length < 2) {
        localResults.push({ text: t, ok: false, msg: "Invalid format" });
        continue;
      }
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
        showToast(`Taught: ${ask}`, "success");
      } catch (err) {
        localResults.push({ text: `${ask} → ${ans}`, ok: false, msg: err.message });
        pushLog(`Error teaching: ${ask} — ${err.message}`);
        showToast(`Error: ${ask}`, "error");
      }
    }

    setResults(localResults);
    setLoading(false);
  }

  // Single teach
  async function handleSingleTeach() {
    setError("");
    if (!askInput.trim() || !answerInput.trim()) return setError("Ask and Ans required.");
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
      showToast(`Taught: ${askInput}`, "success");
      setAskInput(""); setAnswerInput("");
    } catch (err) {
      setResults([{ text: `${askInput} → ${answerInput}`, ok: false, msg: err.message }]);
      pushLog(`Error teaching: ${askInput} — ${err.message}`);
      showToast(`Error: ${askInput}`, "error");
    }
    setLoading(false);
  }

  // Ask API
  async function handleAsk() {
    setError("");
    if (!askInput.trim()) return setError("Ask cannot be empty.");
    setLoading(true);

    try {
      const q = new URL(`${apiBase}/simsimi`);
      q.searchParams.set("text", askInput.trim());

      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.response || JSON.stringify(data);
      setResults([{ text: `Reply: ${reply}`, ok: true }]);
      pushLog(`Ask: ${askInput} → Reply: ${reply}`);
      setMessages(prev => [...prev, { user: askInput, bot: reply }]);
      setAskInput("");
    } catch (err) {
      setResults([{ text: `Ask failed: ${err.message}`, ok: false }]);
      pushLog(`Ask error: ${err.message}`);
      showToast(`Ask error`, "error");
    }
    setLoading(false);
  }

  // Page buttons
  const pageButtons = [
    { key: "teach", label: "Teach System" },
    { key: "chat", label: "Messenger" },
    { key: "api", label: "API Info" },
  ];

  // Render pages
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
              <button disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm">Teach Multiple</button>
              <button type="button" onClick={() => { setTeachInput(""); setResults([]); }} className="px-3 py-2 rounded border text-sm">Clear</button>
            </div>
          </form>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <input placeholder="Ask" value={askInput} onChange={e => setAskInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <input placeholder="Ans" value={answerInput} onChange={e => setAnswerInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <button onClick={handleSingleTeach} disabled={loading} className="px-3 py-2 rounded bg-green-600 text-white text-sm">Teach</button>
            </div>
            <div className="flex gap-2">
              <input placeholder="Ask to test" value={askInput} onChange={e => setAskInput(e.target.value)} className="flex-1 border rounded p-2 text-sm" />
              <button onClick={handleAsk} disabled={loading} className="px-3 py-2 rounded bg-yellow-600 text-white text-sm">Ask</button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Results</h3>
            <div className="space-y-2">
              {results.length === 0 ? <div className="text-xs text-gray-500">No results yet.</div> :
                results.map((r, i) => (
                  <div key={i} className={`p-3 rounded ${r.ok ? 'bg-green-50' : 'bg-red-50'} text-sm`}>
                    <div className="font-medium">{r.text}</div>
                    {r.msg && <div className="text-xs text-gray-600">{r.msg}</div>}
                  </div>
                ))}
            </div>
          </div>
        </section>
      );
    } else if (currentPage === "chat") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-6 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 flex flex-col">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col">
                <div className="self-end bg-blue-100 p-2 rounded-md max-w-xs">{m.user}</div>
                <div className="self-start bg-gray-200 p-2 rounded-md max-w-xs mt-1">{m.bot}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border rounded p-2 text-sm" placeholder="Type message" value={askInput} onChange={e => setAskInput(e.target.value)} />
            <button onClick={handleAsk} disabled={loading} className="px-3 py-2 rounded bg-yellow-600 text-white text-sm">Send</button>
          </div>
        </section>
      );
    } else if (currentPage === "api") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">📊 API Info</h2>
          <div className="space-y-3 text-sm">
            <div>📝 Teached Questions: {status.taughtQuestions}</div>
            <div>📦 Stored Replies: {status.storedReplies}</div>
            <div>👤 Developer: {status.developer}</div>
            <div>🌐 API Base: {apiBase}</div>
          </div>
        </section>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">🌟 Baby AI Dashboard</h1>
          <div className="text-sm text-gray-600">Developer: {status.developer}</div>
        </header>

        {/* Page Buttons */}
        <div className="flex gap-3 mb-6">
          {pageButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setCurrentPage(btn.key)}
              className={`px-4 py-2 rounded ${currentPage===btn.key?'bg-indigo-600 text-white shadow-lg animate-pulse':'bg-gray-200 text-gray-700'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderPage()}

          {/* Right Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow p-5 flex flex-col items-center">
              <img src="https://i.imgur.com/HPWnQI1.jpeg" className="w-20 h-20 rounded-full mb-3" alt="Bot"/>
              <div className={`text-sm font-medium ${polling?'text-green-600':'text-red-600'}`}>{polling?'Active':'Inactive'}</div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="text-lg font-semibold mb-2">Activity Log</h3>
              <div className="h-48 overflow-y-auto text-xs text-gray-600 space-y-1 border rounded p-2">
                {activityLog.length === 0 ? <div>No activity yet.</div> :
                  activityLog.map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="text-lg font-semibold mb-2">API Settings</h3>
              <input
                value={apiBase}
                onChange={e => setApiBase(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                placeholder="API Base URL"
              />
            </div>
          </aside>
        </main>

        {toast && (
          <div className={`fixed top-5 right-5 p-3 rounded ${toast.type==='success'?'bg-green-500':'bg-red-500'} text-white`}>
            {toast.msg}
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-gray-500">
          Made with ❤️ by rX Abdullah — Dashboard connects to the API you configure.
        </footer>
      </div>
    </div>
  );
}
