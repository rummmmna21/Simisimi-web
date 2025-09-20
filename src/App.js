Perfect! I understand exactly:

Teach buttons (Single & Multiple) should have a press effect when clicked (like animate-scale or ring).

Multiple Teach: after success, show a popup “Done” with animation.

Single Teach input box position issue fixed (should not move).


Here’s the fixed, ready-to-copy App.js with all requested changes:

/* App.js - BabyAI 3-Page Dashboard with Effects */

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
  const [buttonPressed, setButtonPressed] = useState(""); // track which button is pressed

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

  // Button press effect
  function handleButtonPress(name) {
    setButtonPressed(name);
    setTimeout(() => setButtonPressed(""), 200);
  }

  // Multi-teach
  async function handleMultiTeach(e) {
    e.preventDefault();
    handleButtonPress("multiTeach");
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
      } catch (err) {
        localResults.push({ text: `${ask} → ${ans}`, ok: false, msg: err.message });
        pushLog(`Error teaching: ${ask} — ${err.message}`);
      }
    }

    setResults(localResults);
    setLoading(false);
    showToast("✅ Multiple Teach Done", "success");
    setTeachInput(""); // clear input after success
  }

  // Single teach
  async function handleSingleTeach() {
    handleButtonPress("singleTeach");
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
      showToast("✅ Single Teach Done", "success");
      setAskInput(""); setAnswerInput("");
    } catch (err) {
      setResults([{ text: `${askInput} → ${answerInput}`, ok: false, msg: err.message }]);
      pushLog(`Error teaching: ${askInput} — ${err.message}`);
      showToast("❌ Single Teach Failed", "error");
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
              <button
                disabled={loading}
                onClick={handleMultiTeach}
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
                <button
                  onClick={handleAsk}
                  disabled={loading}
                  className="px-3 py-2 rounded bg-yellow-600 text-white text-sm"
                >
                  Ask
                </button>
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
      const messagesEndRef = useRef(null);

      useEffect(() => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }, [messages]);

      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-4 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto space-y-2 p-2">
            {messages.map((m, i) => (
              <div key={i} className="flex items-end gap-2">
                {m.bot && (
                  <div className="flex items-end gap-2">
                    <img src="https://i.imgur.com/HPWnQI1.jpeg" alt="Bot" className="w-8 h-8 rounded-full" />
                    <div className="bg-gray-200 p-2 rounded-xl max-w-[70%] break-words">{m.bot}</div>
                  </div>
                )}
                {m.user && (
                  <div className="flex items-end gap-2 ml-auto">
                    <div className="bg-blue-500 text-white p-2 rounded-xl max-w-[70%] break-words">{m.user}</div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 border rounded p-2 text-sm"
              placeholder="Type message"
              value={askInput}
              onChange={e => setAskInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAsk(); }}
            />
            <button
              onClick={handleAsk}
              disabled={loading}
              className="px-3 py-2 rounded bg-yellow-600 text-white text-sm"
            >
              Send
            </button>
          </div>
        </section>
      );
    } else if (currentPage === "api") {
      return (
        <section className="md:col-span-2 bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">🔧 API Info</h2>
          <div className="text-sm space-y-2">
            <div>📝 Taught Questions: {status.taughtQuestions}</div>
            <div>📦 Stored Replies: {status.storedReplies}</div>
            <div>🌐 API Base: {apiBase}</div>
            <div>👤 Developer: {status.developer}</div>
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

        <div className="flex gap-2 mb-4">
          {pageButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setCurrentPage(btn.key)}
              className={`px-3 py-2 rounded ${currentPage===btn.key?"bg-indigo-600 text-white ring-2 ring-indigo-400":"bg-white border text-gray-700"} transition`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderPage()}

          <aside className="space-y-6">
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
          <div className={`fixed bottom-5 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow text-white ${toast.type==="success"?"bg-green-500":"bg-red-500"} animate-bounce`}>
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
