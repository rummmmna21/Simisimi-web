/* App.js - BabyAI Dashboard with Tap System, Messenger & Bot Status */

import React, { useState, useEffect, useRef } from "react";

const DEFAULT_API = "https://rx-simisimi-api-tllc.onrender.com";

export default function App() {
  const [currentPage, setCurrentPage] = useState("teach"); // teach | chat | api | manage
  const [apiBase, setApiBase] = useState(localStorage.getItem("babyai_api_base") || DEFAULT_API);
  const [status, setStatus] = useState({ taughtQuestions: 0, storedReplies: 0, developer: "rX Abdullah", active: true, lastActiveMinutes: 0 });
  const [teachInput, setTeachInput] = useState("");
  const [askInput, setAskInput] = useState(""); // Teach input
  const [answerInput, setAnswerInput] = useState("");
  const [chatInput, setChatInput] = useState(""); // Messenger input
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState(null);
  const [buttonPressed, setButtonPressed] = useState("");
  const messagesEndRef = useRef(null);

  // Manage tab states
  const [manageData, setManageData] = useState([]);
  const [searchAsk, setSearchAsk] = useState("");

  // Save API Base
  useEffect(() => localStorage.setItem("babyai_api_base", apiBase), [apiBase]);

  // Poll API status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${apiBase}/status`);
        if (!res.ok) throw new Error("Status fetch failed");
        const data = await res.json();
        setStatus(prev => ({
          taughtQuestions: data.taughtQuestions ?? prev.taughtQuestions,
          storedReplies: data.storedReplies ?? prev.storedReplies,
          developer: data.developer ?? prev.developer,
          active: data.active ?? true,
          lastActiveMinutes: data.lastActiveMinutes ?? prev.lastActiveMinutes,
        }));
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Activity log
const pushLog = line => {
  const ts = new Date().toLocaleTimeString();
  const logLine = `${ts} — ${line}`;
  console.log(logLine); // <-- live console-এ দেখাবে
  setActivityLog(prev => [logLine, ...prev].slice(0, 200)); // <-- UI তেও live update
};

  // Toast popup
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Button press effect
  const handleButtonPress = name => {
    setButtonPressed(name);
    setTimeout(() => setButtonPressed(""), 200);
  };

  // Multi-teach
  const handleMultiTeach = async e => {
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
  };

  // Single teach
  const handleSingleTeach = async () => {
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
  };

  const handleAsk = async () => {
  if (!chatInput.trim()) return showToast("Message empty!", "error");
  setLoading(true);
  try {
    const q = new URL(`${apiBase}/simsimi`);
    q.searchParams.set("text", chatInput.trim());
    const res = await fetch(q.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply = data.response || JSON.stringify(data);

    // Live log
    pushLog(`🟢 User: ${chatInput}`);
    pushLog(`🤖 Bot: ${reply}`);

    // যদি teach হয়ে থাকে (Backend message থেকে detect করা যায়)
    // উদাহরণ: যদি response message "✅ reply added!" থাকে
    if (data.message?.includes("✅ reply added!")) {
      pushLog(`📝 Teach/Auto-Teach detected: ${data.message}`);
    }

    setMessages(prev => [...prev, { user: chatInput, bot: reply }]);
    setChatInput("");
  } catch (err) {
    pushLog(`Ask error: ${err.message}`);
    showToast("Ask error", "error");
  }
  setLoading(false);
};

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Manage tab functions
  const fetchManageData = async () => {
    try {
      if (!searchAsk.trim()) {
        setManageData([]);
        return;
      }
      const q = new URL(`${apiBase}/simsimi-list`);
      q.searchParams.set("ask", searchAsk.trim());
      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setManageData(data.replies || []);
    } catch (err) {
      showToast("Failed to fetch replies", "error");
    }
  };

  const handleDeleteAnswer = async (ask, ans) => {
    try {
      const q = new URL(`${apiBase}/delete`);
      q.searchParams.set("ask", ask);
      q.searchParams.set("ans", ans);
      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Deleted reply", "success");
      fetchManageData();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleDeleteAsk = async (ask) => {
    const confirmDelete = window.confirm(`Delete all replies for "${ask}"?`);
    if (!confirmDelete) return;
    try {
      const q = new URL(`${apiBase}/delete`);
      q.searchParams.set("ask", ask);
      q.searchParams.set("ans", ""); // সব ans মুছে ফেলবে
      const res = await fetch(q.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Deleted ask", "success");
      setManageData([]);
    } catch {
      showToast("Delete failed", "error");
    }
  };

  useEffect(() => {
    if (currentPage === "manage") fetchManageData();
  }, [currentPage, searchAsk]);

  // Page buttons
  const pageButtons = [
    { key: "teach", label: "Teach System" },
    { key: "chat", label: "Messenger" },
    { key: "api", label: "API Info" },
    { key: "manage", label: "Manage Ask/Answer" },
  ];

  // Render pages
  const renderPage = () => {
    if (currentPage === "teach") return (
      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold mb-2">🧠 Teach System</h2>
        {/* Multi Teach */}
        <form onSubmit={handleMultiTeach} className="flex flex-col gap-2">
          <textarea
            placeholder="hello - Hi there, bye - Goodbye!"
            value={teachInput}
            onChange={e => setTeachInput(e.target.value)}
            className="w-full border rounded p-3 text-sm h-28"
          />
          <div className="flex gap-2">
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
        </form>
        {/* Single Teach */}
        <div className="flex gap-2 flex-wrap mt-2">
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
        {/* Results */}
        <div className="mt-4 space-y-2">
          {results.map((r,i)=>
            <div key={i} className={`p-2 rounded ${r.ok?'bg-green-50':'bg-red-50'} text-sm`}>
              <div className="font-medium">{r.text}</div>
              {r.msg && <div className="text-xs text-gray-600">{r.msg}</div>}
            </div>
          )}
        </div>
        {/* Activity Log */}
        <div className="mt-4 h-48 overflow-y-auto text-xs text-gray-600 space-y-1 border rounded p-2">
          {activityLog.length===0 ? <div>No activity yet.</div> :
            activityLog.map((line,i)=><div key={i}>{line}</div>)
          }
        </div>
      </section>
    );

    if (currentPage === "chat") return (
      <section className="bg-white rounded-2xl shadow p-2 flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2">
          {messages.map((m,i)=>(
            <div key={i} className="flex flex-col gap-1">
              {m.user && (
                <div className="self-end bg-blue-500 text-white p-2 rounded max-w-[80%] break-words">
                  {m.user}
                </div>
              )}
              {m.bot && (
                <div className="self-start bg-gray-200 p-2 rounded max-w-[80%] break-words flex items-start gap-2">
                  <img src="https://i.imgur.com/HPWnQI1.jpeg" alt="Bot" className="w-6 h-6 rounded-full"/>
                  <span>{m.bot}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef}/>
        </div>
        <div className="flex gap-2 mt-2">
          <input
            placeholder="Type a message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            className="flex-1 border rounded p-2 text-sm"
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
          >
            Send
          </button>
        </div>
      </section>
    );

    if (currentPage === "api") return (
      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4 items-center">
        <h2 className="text-lg font-semibold mb-2">🤖 Bot Status</h2>
        <img
          src="https://i.imgur.com/HPWnQI1.jpeg"
          alt="Bot"
          className="w-20 h-20 rounded-full mb-2"
        />
        <div className="text-sm mb-1">
          {status.active
            ? "🟢 Active now"
            : `⚪ Active ${status.lastActiveMinutes} minute(s) ago`}
        </div>
        <div className="text-sm mb-1">📝 Teached Questions: {status.taughtQuestions}</div>
        <div className="text-sm mb-1">📦 Stored Replies: {status.storedReplies}</div>
        <div className="text-sm mb-1">👤 Developer: {status.developer}</div>
      </section>
    );

    if (currentPage === "manage") return (
      <section className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold mb-2">📝 Manage Ask/Answer</h2>
        <input
          placeholder="Search ask..."
          value={searchAsk}
          onChange={e => setSearchAsk(e.target.value)}
          className="w-full border rounded p-2 text-sm mb-2"
        />
        {manageData.length === 0 ? (
          <div className="text-sm text-gray-600">No replies found.</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {manageData.map((r, i) => (
              <div key={i} className="p-2 border rounded flex justify-between items-center text-sm">
                <span>{r}</span>
                <button
                  onClick={() => handleDeleteAnswer(searchAsk, r)}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() => handleDeleteAsk(searchAsk)}
              className="px-3 py-1 bg-red-700 text-white rounded text-sm mt-2"
            >
              Delete All
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col">
      <header className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">🌟 Baby AI Dashboard</h1>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left corner */}
        <div className="flex flex-col gap-4">
          {renderPage()}
        </div>

        {/* Bottom Tap Buttons */}
        <div className="md:col-span-3 fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-full shadow p-1 z-50">
          {pageButtons.map(b => (
            <button
              key={b.key}
              onClick={() => setCurrentPage(b.key)}
              className={`px-4 py-2 rounded-full ${
                currentPage === b.key ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'
              } text-sm`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
