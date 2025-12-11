import React from "react";
import { X, Moon, Sun, MessageSquareCode } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  toggleTheme,
  customInstruction,
  setCustomInstruction,
  history,
  sessionId,
  allSessions = [],
  allHistories = {},
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ${
          theme === "dark"
            ? "bg-slate-900 text-white border border-slate-700"
            : "bg-white text-slate-800"
        }`}
      >
        {/* Header */}
        <div
          className={`flex justify-between items-center p-6 border-b ${
            theme === "dark" ? "border-slate-800" : "border-slate-100"
          }`}
        >
          <h2 className="text-xl font-bold flex items-center gap-2">
            Setări Voice AI
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition ${
              theme === "dark"
                ? "hover:bg-slate-800 text-slate-400"
                : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* 0. History Toate Conversațiile */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-3 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Istoric complet conversații
            </label>
            <div
              className="max-h-48 overflow-y-auto rounded-xl border p-3 text-xs space-y-4"
              style={{
                background: theme === "dark" ? "#1e293b" : "#f8fafc",
                borderColor: theme === "dark" ? "#334155" : "#e2e8f0",
              }}
            >
              {allSessions.length === 0 ? (
                <div className="text-slate-400">
                  Nu există conversații salvate.
                </div>
              ) : (
                allSessions.map((session) => (
                  <div key={session.session_id}>
                    <div className="font-semibold text-indigo-500 mb-1">
                      {session.title}{" "}
                      <span className="text-slate-400">
                        ({session.session_id.slice(0, 8)})
                      </span>
                    </div>
                    <div className="space-y-1 ml-2">
                      {allHistories[session.session_id] &&
                      allHistories[session.session_id].length > 0 ? (
                        allHistories[session.session_id].map((msg, idx) => (
                          <div key={idx} className="truncate">
                            <span
                              className={
                                msg.role === "user"
                                  ? "text-indigo-600"
                                  : "text-pink-500"
                              }
                            >
                              {msg.role === "user" ? "Tu: " : "AI: "}
                            </span>
                            {msg.parts ? msg.parts[0] : msg.content}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400">(Fără mesaje)</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* 1. Secțiunea Temă (Dark/Light) */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-3 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Aspect
            </label>
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon size={20} className="text-indigo-400" />
                ) : (
                  <Sun size={20} className="text-orange-500" />
                )}
                <span className="font-medium">Mod Întunecat (Dark Mode)</span>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  theme === "dark" ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Secțiunea Personalitate Custom */}
          <div>
            <label
              className={`block text-xs font-bold uppercase tracking-wider mb-3 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Personalitate
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 opacity-50">
                <MessageSquareCode size={18} />
              </div>
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Ex: Ești un programator senior sarcastic. Sau: Vorbește ca Yoda."
                rows={4}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                }`}
              />
            </div>
            <p
              className={`text-xs mt-2 ${
                theme === "dark" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              *Dacă scrii aici, stilul selectat în meniul principal va fi
              ignorat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-6 border-t ${
            theme === "dark"
              ? "border-slate-800 bg-slate-900"
              : "border-slate-100 bg-slate-50"
          } flex justify-end`}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/30 transition transform active:scale-95"
          >
            Salvează și Închide
          </button>
        </div>
      </div>
    </div>
  );
}
