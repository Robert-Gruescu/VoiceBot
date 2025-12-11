import React, { useState, useEffect, useRef } from "react";
import SettingsModal from "./Settings";
import {
  Mic,
  User,
  MessageSquare,
  Cpu,
  ChevronDown,
  RotateCcw,
  Activity,
  Folder,
  Trash2,
} from "lucide-react";

export default function PaginaPrincipala() {
  // --- STATE MANAGEMENT ---
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState(
    "Apasă pe microfon pentru a începe."
  );
  const [selectedModel, setSelectedModel] = useState("gemini");

  // GESTIUNE SESIUNI (FOLDERE/TOPICURI)
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState([]); // Lista conversațiilor
  const [history, setHistory] = useState([{ id: 1, text: "Sesiune nouă..." }]); // Istoric vizual curent
  const [allSessions, setAllSessions] = useState([]); // Toate sesiunile din DB
  const [allHistories, setAllHistories] = useState({}); // Istoric pe sesiuni

  // SETARI
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState("light");
  const [customInstruction, setCustomInstruction] = useState("");
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // Ref pentru recunoaștere vocală și audio
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // --- FUNCTIE: procesare intentie (Data/Ora local) ---
  function preprocessTranscript(raw) {
    const text = raw.toLowerCase();

    if (
      text.includes("data") ||
      text.includes("dată") ||
      text.includes("ce dată") ||
      text.includes("care e data")
    ) {
      const options = { day: "numeric", month: "long", year: "numeric" };
      return {
        intent: "date",
        value: new Date().toLocaleDateString("ro-RO", options),
      };
    }

    if (text.includes("ora") || text.includes("ceasul")) {
      const options = { hour: "2-digit", minute: "2-digit" };
      return {
        intent: "time",
        value: new Date().toLocaleTimeString("ro-RO", options),
      };
    }

    return { intent: "chat", value: raw };
  }

  // --- FUNCTIE: speak (sinteza locală) ---
  function speak(text) {
    // Oprim audio-ul de la server dacă merge
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ro-RO";
    u.rate = 1.5;
    u.onstart = () => setIsPlaying(true);
    u.onend = () => setIsPlaying(false);
    speechSynthesis.speak(u);
  }

  // --- INITIALIZARE ---
  useEffect(() => {
    // 1. GESTIUNE SESIUNI (Foldere)
    const savedSessions = JSON.parse(
      localStorage.getItem("voicebot_sessions_list") || "[]"
    );
    let currentId = localStorage.getItem("voicebot_current_id");

    // Dacă nu există sesiuni, creăm una default
    if (savedSessions.length === 0 || !currentId) {
      const newId = generateUUID();
      const newSession = {
        id: newId,
        title: "Conversație Nouă",
        date: new Date().toLocaleTimeString(),
      };
      savedSessions.unshift(newSession);
      currentId = newId;

      localStorage.setItem(
        "voicebot_sessions_list",
        JSON.stringify(savedSessions)
      );
      localStorage.setItem("voicebot_current_id", currentId);
    }

    setSessions(savedSessions);
    setSessionId(currentId);

    // 2. CONFIGURARE SPEECH
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "ro-RO";
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setStatusText("Te ascult...");
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const processed = preprocessTranscript(transcript);

        // Dacă e dată/oră, răspunde local
        if (processed.intent === "date" || processed.intent === "time") {
          setStatusText(processed.value);
          speak(processed.value);
          return;
        }

        // Altfel trimite la backend
        setStatusText(`"${transcript}"`);
        handleSendMessage(processed.value);
      };
    } else {
      setStatusText("Browserul nu suportă Speech API (Folosește Chrome).");
    }
  }, []); // eslint-disable-line

  // --- LOGICĂ ---

  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      recognitionRef.current.start();
    }
  };

  // --- GESTIUNE SESIUNI (FUNCTII NOI) ---
  const createNewSession = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const newId = generateUUID();
    const newSession = {
      id: newId,
      title: "Conversație Nouă",
      date: new Date().toLocaleTimeString(),
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setSessionId(newId);
    setHistory([{ id: Date.now(), text: "Sesiune nouă..." }]);

    localStorage.setItem(
      "voicebot_sessions_list",
      JSON.stringify(updatedSessions)
    );
    localStorage.setItem("voicebot_current_id", newId);

    setStatusText("Sesiune nouă creată. Despre ce vorbim?");
  };

  const switchSession = (id) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setSessionId(id);
    localStorage.setItem("voicebot_current_id", id);
    setHistory([{ id: Date.now(), text: "Conversație încărcată..." }]);
    setStatusText("Am schimbat conversația.");
  };

  const deleteSession = (e, idToDelete) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter((s) => s.id !== idToDelete);
    setSessions(updatedSessions);
    localStorage.setItem(
      "voicebot_sessions_list",
      JSON.stringify(updatedSessions)
    );

    if (idToDelete === sessionId) {
      if (updatedSessions.length > 0) {
        switchSession(updatedSessions[0].id);
      } else {
        const newId = generateUUID();
        const newSession = {
          id: newId,
          title: "Conversație Nouă",
          date: new Date().toLocaleTimeString(),
        };
        setSessions([newSession]);
        setSessionId(newId);
        localStorage.setItem(
          "voicebot_sessions_list",
          JSON.stringify([newSession])
        );
        localStorage.setItem("voicebot_current_id", newId);
      }
    }
  };

  // --- FUNCȚIE: preia primul mesaj din Supabase pentru sesiunea curentă ---
  async function fetchFirstUserMessage(sessionId) {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      // Caută primul mesaj de la user
      const firstUserMsg = data.find((msg) => msg.role === "user");
      return firstUserMsg ? firstUserMsg.parts[0] : null;
    } catch (e) {
      return null;
    }
  }

  const handleSendMessage = async (text) => {
    setIsThinking(true);
    setStatusText("Gândesc...");

    const currentSessionIndex = sessions.findIndex((s) => s.id === sessionId);
    if (
      currentSessionIndex !== -1 &&
      sessions[currentSessionIndex].title === "Conversație Nouă" &&
      history.length === 1
    ) {
      // Ia primul mesaj din Supabase
      const firstMsg = await fetchFirstUserMessage(sessionId);
      const words = (firstMsg || text).trim().split(/\s+/);
      let title = "";
      if (words.length <= 3) {
        title = words.join(" ");
      } else {
        title = words.slice(0, 3).join(" ") + "...";
      }
      const updatedSessions = [...sessions];
      updatedSessions[currentSessionIndex].title = title;
      setSessions(updatedSessions);
      localStorage.setItem(
        "voicebot_sessions_list",
        JSON.stringify(updatedSessions)
      );
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          brain: selectedModel,
          custom_instruction: customInstruction,
        }),
      });

      const data = await response.json();
      setIsThinking(false);

      if (data.error) {
        setStatusText(`Eroare: ${data.error}`);
      } else {
        setHistory((prev) => [
          { id: Date.now(), text: text.substring(0, 20) + "..." },
          ...prev,
        ]);
        // setStatusText(data.response); // Nu mai afișăm textul citit de AI

        if (data.audio) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio("data:audio/mp3;base64," + data.audio);

          audioRef.current.onplay = () => setIsPlaying(true);
          audioRef.current.onended = () => setIsPlaying(false);

          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error(error);
      setIsThinking(false);
      setStatusText("Eroare conexiune backend.");
    }
  };

  const getOrbClass = () => {
    if (isThinking) return "animate-spin-slow hue-rotate-90";
    if (isRecording)
      return "mt-5 scale-110 shadow-[0_0_0_20px_rgba(129,140,248,0.2)]";
    if (isPlaying) return "mt-5 animate-pulse scale-105";
    return "";
  };

  // Preia toate sesiunile la deschiderea setărilor
  useEffect(() => {
    if (showSettings) {
      fetch("http://127.0.0.1:5000/api/sessions")
        .then((res) => res.json())
        .then((data) => {
          setAllSessions(data);
          // Pentru fiecare sesiune, preia istoricul
          data.forEach((session) => {
            fetch("http://127.0.0.1:5000/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: session.session_id }),
            })
              .then((res) => res.json())
              .then((msgs) => {
                setAllHistories((prev) => ({
                  ...prev,
                  [session.session_id]: msgs,
                }));
              });
          });
        });
    }
  }, [showSettings]);

  return (
    <div
      className={`bg-indigo-50 h-screen w-full flex items-center justify-center font-sans ${
        theme === "dark" ? "bg-slate-900 text-white" : "text-slate-800"
      } p-4`}
    >
      <style>{`
				.gradient-orb {
					background: conic-gradient(from 180deg at 50% 50%, #818cf8, #c084fc, #f472b6, #fbbf24, #34d399, #818cf8);
				}
				.animate-spin-slow {
					animation: spin 3s linear infinite;
				}
				@keyframes spin {
					from { transform: rotate(0deg); }
					to { transform: rotate(360deg); }
				}
			`}</style>

      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[40px] shadow-2xl flex overflow-hidden relative">
        {/* --- SIDEBAR (LISTA DE FOLDERE/CONVERSATII) --- */}
        <div className="w-80 bg-slate-50 border-r border-slate-100 hidden md:flex flex-col p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Profil</h3>
              <p className="text-xs text-slate-400">Profil 1</p>
            </div>
          </div>

          <button
            onClick={createNewSession}
            className="flex items-center gap-3 w-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 font-semibold py-3 px-4 rounded-xl transition shadow-sm mb-6 group"
          >
            <RotateCcw
              size={18}
              className="text-indigo-400 group-hover:text-indigo-600"
            />
            Conversație Nouă
          </button>

          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
            Conversațiile Tale
            <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px]">
              {sessions.length}
            </span>
          </h4>

          {/* Lista de Sesiuni (Foldere) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`
										p-3 rounded-lg text-sm cursor-pointer border flex justify-between items-center group
										${
                      sessionId === session.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-white text-slate-600 border-transparent hover:border-indigo-200 hover:bg-indigo-50"
                    }
								`}
              >
                <div className="flex items-center gap-2 truncate max-w-[80%]">
                  {sessionId === session.id ? (
                    <MessageSquare size={14} />
                  ) : (
                    <Folder size={14} />
                  )}
                  <span className="truncate">{session.title}</span>
                </div>

                {/* Buton ștergere (apare la hover) */}
                <button
                  onClick={(e) => deleteSession(e, session.id)}
                  className={`p-1 rounded hover:bg-red-500 hover:text-white transition opacity-0 group-hover:opacity-100
												${
                          sessionId === session.id
                            ? "text-indigo-200 hover:bg-indigo-500"
                            : "text-slate-400"
                        }
										`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Buton Setări */}
          <div className="mt-auto flex flex-col items-start">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 mb-2 text-xs bg-slate-200 hover:bg-indigo-100 rounded-lg text-slate-600"
            >
              <span role="img" aria-label="setari">
                ⚙️
              </span>{" "}
              Setări
            </button>
          </div>
        </div>

        {/* --- ZONA PRINCIPALĂ --- */}
        <div className="flex-1 flex flex-col items-center justify-between p-6 md:p-10 relative">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mt-4">
            Voice AI
          </h1>

          <div className="relative flex flex-col items-center justify-center flex-1 w-full">
            <div
              className={`gradient-orb w-48 h-48 md:w-64 md:h-64 rounded-full relative flex items-center justify-center transition-all duration-500 ease-in-out shadow-[0_10px_40px_-10px_rgba(129,140,248,0.5)] ${getOrbClass()}`}
            >
              <div className="absolute inset-6 bg-white rounded-full z-10"></div>
              <div className="absolute z-20 text-indigo-500 opacity-20">
                <Activity size={64} />
              </div>
            </div>

            <div className="mt-8 text-center h-24 px-4 md:px-10 flex items-center justify-center w-full max-w-lg">
              <p
                className={`text-lg font-medium transition-all duration-300 
									${isRecording ? "text-indigo-600 font-bold scale-105" : ""}
									${isThinking ? "text-indigo-400 animate-pulse" : ""}
									${!isRecording && !isThinking ? "text-slate-500" : ""}
									max-h-24 overflow-y-auto
								`}
              >
                {statusText}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 w-full max-w-sm mb-4 z-30">
            <button
              onClick={toggleRecording}
              className={`
								w-16 h-16 rounded-full text-white text-2xl shadow-lg transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center
								${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 shadow-red-200 animate-pulse"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                }
							`}
            >
              <Mic size={28} />
            </button>
          </div>
        </div>
      </div>
      {/* Modal Setări */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        toggleTheme={toggleTheme}
        customInstruction={customInstruction}
        setCustomInstruction={setCustomInstruction}
        history={history}
        sessionId={sessionId}
        allSessions={allSessions}
        allHistories={allHistories}
      />
    </div>
  );
}
