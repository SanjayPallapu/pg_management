import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Loader2, Volume2, Languages, Wand2, Send, History, Undo2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "idle" | "listening" | "thinking" | "speaking";
type Lang = "en-IN" | "te-IN";
type InputSource = "voice" | "typed";
type PendingAction = { id: string; action_name: string; summary: string; expires_at: string };
type AuditItem = {
  id: string;
  action_name: string;
  status: string;
  source: InputSource;
  summary: string;
  created_at: string;
};
type AgentResponse = {
  error?: string;
  reply?: string;
  pendingAction?: PendingAction | null;
  completedAction?: { id: string; summary: string };
  undoneAction?: { id: string };
  audit?: AuditItem[];
};

type SpeechAlternativeLike = { transcript: string; confidence?: number };
type SpeechResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
};
type SpeechResultEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResultLike };
};
type SpeechErrorEventLike = { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const speechWindow = typeof window !== "undefined"
  ? window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
  : undefined;

const SpeechRecognitionImpl: SpeechRecognitionConstructor | null =
  (typeof window !== "undefined" &&
    (speechWindow?.SpeechRecognition || speechWindow?.webkitSpeechRecognition)) ||
  null;
const isNativePlatform = Capacitor.isNativePlatform();

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
  const [partial, setPartial] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("va_lang") as Lang) || "en-IN");
  const [autoListen, setAutoListen] = useState(true); // Always-active by default
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [lastCompletedAction, setLastCompletedAction] = useState<{ id: string; summary: string } | null>(null);
  const [typedText, setTypedText] = useState("");
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const langRef = useRef(lang); langRef.current = lang;
  const autoListenRef = useRef(autoListen); autoListenRef.current = autoListen;
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const phaseRef = useRef<Phase>("idle");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const startingRef = useRef(false);
  const finalSentRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const startListeningRef = useRef<() => void>(() => undefined);
  const nativeHandlesRef = useRef<Array<{ remove: () => Promise<void> }>>([]);
  const nativeSilenceTimerRef = useRef<number | null>(null);
  const nativeLatestRef = useRef<string[]>([]);
  const pendingActionRef = useRef<PendingAction | null>(null);
  pendingActionRef.current = pendingAction;

  const transitionPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const maybeAutoListen = useCallback(() => {
    if (!autoListenRef.current) return;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (phaseRef.current === "idle") startListeningRef.current();
    }, 180);
  }, []);

  useEffect(() => { localStorage.setItem("va_lang", lang); }, [lang]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partial]);

  const clearNativeSession = useCallback(() => {
    if (nativeSilenceTimerRef.current !== null) window.clearTimeout(nativeSilenceTimerRef.current);
    nativeSilenceTimerRef.current = null;
    const handles = nativeHandlesRef.current.splice(0);
    handles.forEach(handle => void handle.remove().catch(() => undefined));
  }, []);

  useEffect(() => {
    let active = true;
    if (isNativePlatform) {
      void NativeSpeechRecognition.available().then(({ available }) => {
        if (active) setSupported(available && typeof window.speechSynthesis !== "undefined");
      }).catch(() => { if (active) setSupported(false); });
    } else if (!SpeechRecognitionImpl || typeof window.speechSynthesis === "undefined") {
      setSupported(false);
    }
    return () => {
      active = false;
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      try { recogRef.current?.stop(); } catch { /* already stopped */ }
      if (isNativePlatform) void NativeSpeechRecognition.stop().catch(() => undefined);
      clearNativeSession();
      try { window.speechSynthesis?.cancel(); } catch { /* unavailable during teardown */ }
    };
  }, [clearNativeSession]);

  // Auto-start listening when page loads (always-active mode)
  useEffect(() => {
    if (supported && currentPG?.id && autoListen) {
      const timer = setTimeout(() => {
        if (phaseRef.current === "idle") startListeningRef.current();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [supported, currentPG?.id, autoListen]);

  const speak = useCallback((text: string) => {
    if (mutedRef.current || !text) { transitionPhase("idle"); maybeAutoListen(); return; }
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
      u.onstart = () => transitionPhase("speaking");
      u.onend = () => { transitionPhase("idle"); maybeAutoListen(); };
      u.onerror = () => { transitionPhase("idle"); maybeAutoListen(); };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
    } catch {
      transitionPhase("idle");
      maybeAutoListen();
    }
  }, [maybeAutoListen, transitionPhase]);

  const runActionOperation = useCallback(async (
    operation: "confirm" | "cancel" | "undo" | "history",
    actionId?: string,
    spokenUserText?: string,
  ) => {
    if (!currentPG?.id) return;
    const requestId = ++requestIdRef.current;
    transitionPhase("thinking");
    if (spokenUserText) setMessages(prev => [...prev, { role: "user", content: spokenUserText }]);
    try {
      const { data, error } = await supabase.functions.invoke("pg-voice-agent", {
        body: { operation, actionId, pgId: currentPG.id, lang: langRef.current },
      });
      if (error) throw error;
      const response = data as AgentResponse | null;
      if (response?.error) throw new Error(response.error);
      if (requestId !== requestIdRef.current) return;
      if (operation === "history") {
        setAudit(response?.audit || []);
        setShowHistory(true);
        transitionPhase("idle");
        return;
      }
      const reply = response?.reply || "Done.";
      if (operation === "confirm" || operation === "cancel") setPendingAction(null);
      if (response?.completedAction) setLastCompletedAction(response.completedAction);
      if (response?.undoneAction) setLastCompletedAction(null);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
      transitionPhase("idle");
      maybeAutoListen();
    }
  }, [currentPG?.id, maybeAutoListen, speak, transitionPhase]);

  const sendToAgent = useCallback(async (userText: string, source: InputSource = "voice") => {
    if (!currentPG?.id) { toast.error("No PG selected"); return; }
    const cleanText = userText.split(" | ")[0].trim();
    const normalized = cleanText.toLocaleLowerCase();
    const isConfirm = /^(yes|yeah|yep|confirm|confirmed|ok|okay|sure|do it|అవును|సరే|ఓకే)$/.test(normalized);
    const isCancel = /^(no|nope|cancel|stop|don't|do not|వద్దు|కాదు|రద్దు)$/.test(normalized);
    const isUndo = /^(undo|undo that|reverse it|revert|వెనక్కి తీసుకో|రద్దు చేయి)$/.test(normalized);
    if (pendingActionRef.current && isConfirm) {
      await runActionOperation("confirm", pendingActionRef.current.id, cleanText);
      return;
    }
    if (pendingActionRef.current && isCancel) {
      await runActionOperation("cancel", pendingActionRef.current.id, cleanText);
      return;
    }
    if (isUndo) {
      await runActionOperation("undo", lastCompletedAction?.id, cleanText);
      return;
    }
    const requestId = ++requestIdRef.current;
    transitionPhase("thinking");
    const next: Msg[] = [...messagesRef.current, { role: "user", content: userText }];
    setMessages(next);
    try {
      const { data, error } = await supabase.functions.invoke("pg-voice-agent", {
        body: { messages: next, pgId: currentPG.id, lang: langRef.current, source },
      });
      if (error) throw error;
      const response = data as AgentResponse | null;
      if (response?.error) throw new Error(response.error);
      if (requestId !== requestIdRef.current) return;
      const reply = response?.reply || "Sorry, no response.";
      if (response?.pendingAction) setPendingAction(response.pendingAction);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Voice agent error");
      if (requestId !== requestIdRef.current) return;
      transitionPhase("idle");
      maybeAutoListen();
    }
  }, [currentPG?.id, lastCompletedAction?.id, maybeAutoListen, runActionOperation, speak, transitionPhase]);

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const value = typedText.trim();
    if (!value || phase === "thinking") return;
    setTypedText("");
    stopAll();
    void sendToAgent(value, "typed");
  };

  const startListening = useCallback(() => {
    if (!isNativePlatform && !SpeechRecognitionImpl) { toast.error("Voice not supported on this browser. Try Chrome."); return; }
    if (startingRef.current || phaseRef.current === "listening" || phaseRef.current === "thinking") return;
    startingRef.current = true;
    finalSentRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    try { window.speechSynthesis?.cancel(); } catch { /* speech may be unavailable */ }
    if (isNativePlatform) {
      void (async () => {
        try {
          clearNativeSession();
          nativeLatestRef.current = [];
          const permission = await NativeSpeechRecognition.checkPermissions();
          if (permission.speechRecognition !== "granted") {
            const requested = await NativeSpeechRecognition.requestPermissions();
            if (requested.speechRecognition !== "granted") throw new Error("Microphone permission denied.");
          }

          const finish = () => {
            if (finalSentRef.current) return;
            const matches = nativeLatestRef.current.filter(Boolean);
            if (!matches.length) {
              startingRef.current = false;
              transitionPhase("idle");
              clearNativeSession();
              maybeAutoListen();
              return;
            }
            finalSentRef.current = true;
            setPartial("");
            startingRef.current = false;
            clearNativeSession();
            void NativeSpeechRecognition.stop().catch(() => undefined);
            const combined = matches.length > 1
              ? `${matches[0].trim()} | ${matches.slice(1, 4).join(" | ")}`
              : matches[0].trim();
            void sendToAgent(combined, "voice");
          };

          nativeHandlesRef.current.push(await NativeSpeechRecognition.addListener("partialResults", ({ matches }) => {
            if (!matches?.length) return;
            nativeLatestRef.current = matches;
            setPartial(matches[0]);
            if (nativeSilenceTimerRef.current !== null) window.clearTimeout(nativeSilenceTimerRef.current);
            nativeSilenceTimerRef.current = window.setTimeout(finish, 1100);
          }));
          nativeHandlesRef.current.push(await NativeSpeechRecognition.addListener("listeningState", ({ status }) => {
            if (status === "started") {
              startingRef.current = false;
              transitionPhase("listening");
            } else finish();
          }));
          await NativeSpeechRecognition.start({
            language: langRef.current,
            maxResults: 5,
            partialResults: true,
            popup: false,
          });
        } catch (error) {
          clearNativeSession();
          startingRef.current = false;
          transitionPhase("idle");
          toast.error(error instanceof Error ? error.message : "Could not start voice recognition.");
        }
      })();
      return;
    }
    const recog = new SpeechRecognitionImpl();
    recog.lang = langRef.current;
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 5;
    recog.onstart = () => { startingRef.current = false; transitionPhase("listening"); setPartial(""); };
    recog.onresult = (e: SpeechResultEventLike) => {
      let interim = "", finalText = "";
      const alternates: string[] = [];
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
      if (finalText && !finalSentRef.current) {
        finalSentRef.current = true;
        setPartial("");
        recog.stop();
        const combined = alternates.length
          ? `${finalText.trim()} | ${alternates.slice(0, 3).join(" | ")}`
          : finalText.trim();
        sendToAgent(combined);
      }
    };
    recog.onerror = (e: SpeechErrorEventLike) => {
      console.warn("speech err", e?.error);
      if (e?.error === "no-speech") {
        // Silence is normal in hands-free mode; restart without showing an error.
      } else if (e?.error === "not-allowed") {
        toast.error("Microphone permission denied.");
        autoListenRef.current = false;
      }
      startingRef.current = false;
      if (phaseRef.current === "listening") transitionPhase("idle");
      if (e?.error === "no-speech") maybeAutoListen();
    };
    recog.onend = () => {
      startingRef.current = false;
      if (phaseRef.current === "listening") {
        transitionPhase("idle");
        if (!finalSentRef.current) maybeAutoListen();
      }
    };
    recogRef.current = recog;
    try { recog.start(); } catch {
      startingRef.current = false;
      transitionPhase("idle");
    }
  }, [clearNativeSession, maybeAutoListen, sendToAgent, transitionPhase]);
  startListeningRef.current = startListening;

  const stopAll = useCallback(() => {
    try { recogRef.current?.stop(); } catch { /* already stopped */ }
    if (isNativePlatform) void NativeSpeechRecognition.stop().catch(() => undefined);
    clearNativeSession();
    try { window.speechSynthesis?.cancel(); } catch { /* speech may be unavailable */ }
    requestIdRef.current += 1;
    startingRef.current = false;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    transitionPhase("idle");
  }, [clearNativeSession, transitionPhase]);

  const onOrbClick = () => {
    if (phase === "listening") { stopAll(); return; }
    if (phase === "speaking") {
      try { window.speechSynthesis.cancel(); } catch { /* speech may be unavailable */ }
      transitionPhase("idle");
      window.setTimeout(startListening, 50);
      return;
    }
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
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
        <Button variant="ghost" size="icon" onClick={() => void runActionOperation("history")} title="Action history">
          <History className="h-5 w-5" />
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
        {pendingAction && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Confirm before saving</p>
                <p className="text-sm text-muted-foreground">{pendingAction.summary}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void runActionOperation("confirm", pendingAction.id, "Confirm")}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => void runActionOperation("cancel", pendingAction.id, "Cancel")}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </motion.div>
        )}
        {lastCompletedAction && !pendingAction && (
          <div className="flex justify-center">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void runActionOperation("undo", lastCompletedAction.id, "Undo that")}>
              <Undo2 className="h-4 w-4 mr-1" /> Undo last action
            </Button>
          </div>
        )}
        {showHistory && (
          <div className="rounded-2xl border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Assistant action history</p>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowHistory(false)}><X className="h-4 w-4" /></Button>
            </div>
            {audit.length === 0 ? <p className="text-xs text-muted-foreground">No write actions yet.</p> : audit.map(item => (
              <div key={item.id} className="rounded-xl bg-muted/60 p-2.5">
                <p className="text-xs font-medium">{item.summary}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {item.status} · {item.source} · {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
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

      {/* Typed input is always available when speech recognition is unavailable or noisy. */}
      <form onSubmit={submitTyped} className="px-4 py-2 flex gap-2 border-t border-border/40 bg-background/80 backdrop-blur">
        <Input
          value={typedText}
          onChange={(event) => setTypedText(event.target.value)}
          placeholder={lang === "te-IN" ? "కమాండ్ టైప్ చేయండి…" : "Type a command…"}
          aria-label="Type an assistant command"
          disabled={!currentPG?.id || phase === "thinking"}
        />
        <Button type="submit" size="icon" disabled={!typedText.trim() || phase === "thinking"} aria-label="Send command">
          <Send className="h-4 w-4" />
        </Button>
      </form>

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
    </div>
  );
}
