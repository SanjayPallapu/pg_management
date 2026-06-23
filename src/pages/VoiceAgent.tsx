import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, MicOff, Loader2, Volume2, Languages, Repeat, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "idle" | "listening" | "thinking" | "speaking";
type Lang = "en-IN" | "te-IN";

const SpeechRecognitionImpl: any =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

/* ───── Animated Waveform Bars ───── */
const WaveformBars = ({ active, color = "bg-white" }: { active: boolean; color?: string }) => (
  <div className="flex items-center gap-[3px] h-8">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className={`w-[3px] rounded-full ${color}`}
        animate={active ? {
          height: [8, 24 + Math.random() * 12, 8],
        } : { height: 8 }}
        transition={{
          duration: 0.4 + Math.random() * 0.3,
          repeat: active ? Infinity : 0,
          delay: i * 0.08,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export default function VoiceAgent() {
  const navigate = useNavigate();
  const { currentPG } = usePG();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("va_lang") as Lang) || "en-IN");
  const [autoListen, setAutoListen] = useState(true); // Always-active by default

  const recogRef = useRef<any>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const langRef = useRef(lang); langRef.current = lang;
  const autoListenRef = useRef(autoListen); autoListenRef.current = autoListen;
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const phaseRef = useRef<Phase>("idle");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("va_lang", lang); }, [lang]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partial]);

  useEffect(() => {
    if (!SpeechRecognitionImpl || typeof window.speechSynthesis === "undefined") {
      setSupported(false);
    }
    return () => {
      try { recogRef.current?.stop(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  // Auto-start listening when page loads (always-active mode)
  useEffect(() => {
    if (supported && currentPG?.id && autoListen) {
      const timer = setTimeout(() => {
        if (phaseRef.current === "idle") startListening();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [supported, currentPG?.id]);

  const speak = useCallback((text: string) => {
    if (mutedRef.current || !text) { setPhase("idle"); maybeAutoListen(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // Faster speaking rate like ChatGPT
      u.rate = langRef.current === "te-IN" ? 1.1 : 1.25;
      u.pitch = 1.05; u.volume = 1;
      u.lang = langRef.current;
      const voices = window.speechSynthesis.getVoices();
      const isTe = langRef.current === "te-IN";
      const preferred = isTe
        ? (voices.find(v => /te[-_]IN/i.test(v.lang)) ||
           voices.find(v => /^te/i.test(v.lang)) ||
           voices.find(v => /hi[-_]IN/i.test(v.lang)) ||
           voices.find(v => /en-IN/i.test(v.lang)))
        : (voices.find(v => /en-IN/i.test(v.lang)) ||
           voices.find(v => /en-US/i.test(v.lang)) ||
           voices.find(v => /^en/i.test(v.lang)));
      if (preferred) u.voice = preferred;
      u.onstart = () => { setPhase("speaking"); startBargeInListener(); };
      u.onend = () => { setPhase("idle"); maybeAutoListen(); };
      u.onerror = () => { setPhase("idle"); maybeAutoListen(); };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {
      setPhase("idle");
      maybeAutoListen();
    }
  }, []);

  const sendToAgent = useCallback(async (userText: string) => {
    if (!currentPG?.id) { toast.error("No PG selected"); return; }
    setPhase("thinking");
    const next: Msg[] = [...messagesRef.current, { role: "user", content: userText }];
    setMessages(next);
    try {
      const { data, error } = await supabase.functions.invoke("pg-voice-agent", {
        body: { messages: next, pgId: currentPG.id, lang: langRef.current },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const reply = (data as any)?.reply || "Sorry, no response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Voice agent error");
      setPhase("idle");
      maybeAutoListen();
    }
  }, [currentPG?.id, speak]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionImpl) { toast.error("Voice not supported on this browser. Try Chrome."); return; }
    try { window.speechSynthesis?.cancel(); } catch {}
    const recog = new SpeechRecognitionImpl();
    recog.lang = langRef.current;
    recog.interimResults = true;
    recog.continuous = true; // Keep listening continuously
    recog.maxAlternatives = langRef.current === "te-IN" ? 5 : 3;
    recog.onstart = () => { setPhase("listening"); setPartial(""); };
    recog.onresult = (e: any) => {
      let interim = "", finalText = "";
      let alternates: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript;
        if (r.isFinal) {
          finalText += t;
          for (let k = 1; k < r.length && k < 5; k++) {
            const alt = r[k]?.transcript;
            if (alt && alt !== t) alternates.push(alt);
          }
        } else interim += t;
      }
      if (interim) setPartial(interim);
      if (finalText) {
        setPartial("");
        setTranscript(finalText);
        recog.stop();
        const combined = alternates.length
          ? `${finalText.trim()} | ${alternates.slice(0, 3).join(" | ")}`
          : finalText.trim();
        sendToAgent(combined);
      }
    };
    recog.onerror = (e: any) => {
      console.warn("speech err", e?.error);
      if (e?.error === "no-speech") {
        // Silently restart if in auto-listen mode
        if (autoListenRef.current) {
          setTimeout(() => {
            if (phaseRef.current === "idle") startListening();
          }, 300);
        }
      } else if (e?.error === "not-allowed") {
        toast.error("Microphone permission denied.");
      }
      setPhase("idle");
    };
    recog.onend = () => {
      setPhase(p => (p === "listening" ? "idle" : p));
      // Auto-restart in always-active mode
      if (autoListenRef.current && phaseRef.current === "idle") {
        setTimeout(() => {
          if (phaseRef.current === "idle") startListening();
        }, 300);
      }
    };
    recogRef.current = recog;
    try { recog.start(); } catch {}
  }, [sendToAgent]);

  // Barge-in: while assistant is speaking, detect user talking & cancel TTS
  const bargeRef = useRef<any>(null);
  const startBargeInListener = useCallback(() => {
    if (!SpeechRecognitionImpl) return;
    try { bargeRef.current?.stop(); } catch {}
    const recog = new SpeechRecognitionImpl();
    recog.lang = langRef.current;
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = langRef.current === "te-IN" ? 5 : 3;
    let interrupted = false;
    recog.onresult = (e: any) => {
      const txt = e.results?.[0]?.[0]?.transcript?.trim();
      if (!txt) return;
      if (!interrupted) {
        interrupted = true;
        try { window.speechSynthesis.cancel(); } catch {}
      }
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) {
        const alts: string[] = [];
        for (let k = 1; k < last.length && k < 5; k++) if (last[k]?.transcript) alts.push(last[k].transcript);
        try { recog.stop(); } catch {}
        const combined = alts.length ? `${txt} | ${alts.slice(0, 3).join(" | ")}` : txt;
        sendToAgent(combined);
      } else {
        setPartial(txt);
      }
    };
    recog.onerror = () => {};
    recog.onend = () => {};
    bargeRef.current = recog;
    try { recog.start(); } catch {}
  }, [sendToAgent]);

  const maybeAutoListen = useCallback(() => {
    if (!autoListenRef.current) return;
    setTimeout(() => {
      if (phaseRef.current === "idle") startListening();
    }, 250);
  }, [startListening]);

  const stopAll = useCallback(() => {
    try { recogRef.current?.stop(); } catch {}
    try { bargeRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    setPhase("idle");
  }, []);

  const onOrbClick = () => {
    if (phase === "listening") { stopAll(); return; }
    if (phase === "speaking") { try { window.speechSynthesis.cancel(); } catch {} setPhase("idle"); return; }
    if (phase === "thinking") return;
    startListening();
  };

  const phaseColor = phase === "listening" ? "from-emerald-500 to-green-500"
    : phase === "thinking" ? "from-amber-500 to-orange-500"
    : phase === "speaking" ? "from-blue-500 to-cyan-500"
    : "from-violet-500 to-indigo-600";

  const phaseGlow = phase === "listening" ? "shadow-emerald-500/40"
    : phase === "thinking" ? "shadow-amber-500/40"
    : phase === "speaking" ? "shadow-blue-500/40"
    : "shadow-violet-500/40";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => { stopAll(); navigate(-1); }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">Voice Assistant</h1>
            {autoListen && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {currentPG?.name || "Select a PG"}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 px-2"
          onClick={() => { stopAll(); setLang(l => l === "en-IN" ? "te-IN" : "en-IN"); }}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{lang === "te-IN" ? "తె" : "EN"}</span>
        </Button>
        <Button variant="ghost" size="icon"
          onClick={() => { setAutoListen(a => !a); if (autoListen) stopAll(); }}
          className={autoListen ? "text-emerald-500" : "text-muted-foreground"}
          title="Always active mode"
        >
          <Wand2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setMuted(m => !m)}>
          <Volume2 className={`h-5 w-5 ${muted ? "opacity-30" : ""}`} />
        </Button>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8 space-y-3">
            <motion.div
              className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Mic className="h-7 w-7 text-primary" />
            </motion.div>
            <p className="font-semibold text-foreground text-base">
              {autoListen ? (lang === "te-IN" ? "మాట్లాడండి, నేను వింటున్నాను..." : "Just speak, I'm listening...")
                : (lang === "te-IN" ? "ఇలా అడగండి:" : "Try asking:")}
            </p>
            <div className="space-y-1.5">
              {(lang === "te-IN"
                ? ["ఈ నెల ఎంత అద్దె వసూలైంది?", "ఎవరు ఇంకా చెల్లించలేదు?", "ఖాళీ బెడ్‌లు ఎన్ని ఉన్నాయి?"]
                : ["How much rent collected this month?", "Who hasn't paid yet?", "How many vacant beds?"]
              ).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendToAgent(q)}
                  className="block mx-auto rounded-full bg-muted/60 px-4 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-sm"
                  : "bg-muted/80 text-foreground rounded-bl-sm border border-border/30"
              }`}>{m.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {partial && (
          <motion.div className="flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-primary/20 text-foreground italic rounded-br-sm border border-primary/20">
              {partial}…
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Orb + status */}
      <div className="flex flex-col items-center gap-3 pb-8 pt-4">
        <div className="relative h-36 w-36 flex items-center justify-center" onClick={onOrbClick}>
          {/* Ambient glow */}
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${phaseColor} blur-2xl opacity-30`}
            animate={phase !== "idle" ? { scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {/* Pulse rings */}
          {phase === "listening" && (
            <>
              <motion.span className="absolute inset-0 rounded-full bg-emerald-500/20"
                animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <motion.span className="absolute inset-2 rounded-full bg-emerald-500/15"
                animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
              />
            </>
          )}
          {phase === "speaking" && (
            <motion.span className="absolute inset-0 rounded-full bg-blue-500/30"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
          <motion.button
            type="button"
            className={`relative h-28 w-28 rounded-full bg-gradient-to-br ${phaseColor} shadow-2xl ${phaseGlow} flex items-center justify-center text-white`}
            disabled={!supported || !currentPG?.id}
            whileTap={{ scale: 0.92 }}
            animate={phase === "thinking" ? { rotate: [0, 360] } : {}}
            transition={phase === "thinking" ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
          >
            {phase === "thinking" ? (
              <Loader2 className="h-9 w-9 animate-spin" />
            ) : phase === "listening" ? (
              <WaveformBars active color="bg-white" />
            ) : phase === "speaking" ? (
              <WaveformBars active color="bg-white/80" />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground h-4 text-center">
          {!supported ? "Voice not supported — use Chrome."
            : phase === "listening" ? (lang === "te-IN" ? "🎙️ వింటున్నాను…" : "🎙️ Listening…")
            : phase === "thinking" ? (lang === "te-IN" ? "💭 ఆలోచిస్తున్నాను…" : "💭 Thinking…")
            : phase === "speaking" ? (lang === "te-IN" ? "🔊 మాట్లాడుతున్నాను…" : "🔊 Speaking…")
            : autoListen ? (lang === "te-IN" ? "🟢 ఎల్లప్పుడూ వినడం" : "🟢 Always listening — just speak") : (lang === "te-IN" ? "🎤 మాట్లాడటానికి తాకండి" : "🎤 Tap the orb to speak")}
        </p>
      </div>

      <BottomNav />
    </div>
  );
}