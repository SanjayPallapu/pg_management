import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Loader2, Volume2, Languages, Send, History, Undo2, ShieldCheck, X, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";

type Msg = { role: "user" | "assistant"; content: string; whatsappUrl?: string };
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
  actionResult?: any;
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

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = error && typeof error === "object" && "context" in error
    ? (error as { context?: Response }).context
    : undefined;
  if (context) {
    try {
      const payload = await context.json() as { error?: string; message?: string };
      if (payload.error || payload.message) return payload.error || payload.message || fallback;
    } catch {
      // Fall through to the SDK error when the response is not JSON.
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export default function VoiceAgent() {
  const navigate = useNavigate();
  const { currentPG } = usePG();
  const [phase, setPhase] = useState<Phase>("idle");
  const [partial, setPartial] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("va_lang") as Lang) || "en-IN");
  // Listening is deliberately push-to-talk. A microphone must never remain active
  // after navigating away or because of a value saved by an older app version.
  const autoListen = false;
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
  useEffect(() => { localStorage.setItem("va_auto_listen", "false"); }, []);
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
      u.rate = langRef.current === "te-IN" ? 0.98 : 1.04;
      u.pitch = 1; u.volume = 1;
      u.lang = langRef.current;
      const voices = window.speechSynthesis.getVoices();
      const isTe = langRef.current === "te-IN";
      const naturalVoice = (pattern: RegExp) => voices.find(v => pattern.test(v.name));
      const preferred = isTe
        ? (naturalVoice(/Google.*Telugu|Microsoft.*Telugu|Telugu/i) ||
           voices.find(v => /te[-_]IN/i.test(v.lang)) ||
           voices.find(v => /^te/i.test(v.lang)) ||
           voices.find(v => /hi[-_]IN/i.test(v.lang)) ||
           voices.find(v => /en-IN/i.test(v.lang)))
        : (naturalVoice(/Google.*English.*India|Microsoft.*(Heera|Neerja|Prabhat)|Samantha/i) ||
           voices.find(v => /en-IN/i.test(v.lang)) ||
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
      toast.error(await functionErrorMessage(e, "Action failed"));
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
    try { window.speechSynthesis.cancel(); } catch {}
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
      const whatsappUrl = response?.actionResult?.whatsapp_url;
      setMessages(prev => [...prev, { role: "assistant", content: reply, whatsappUrl }]);
      speak(reply);
    } catch (e: unknown) {
      console.error(e);
      toast.error(await functionErrorMessage(e, "Voice agent error"));
      if (requestId !== requestIdRef.current) return;
      transitionPhase("idle");
      maybeAutoListen();
    }
  }, [currentPG?.id, lastCompletedAction?.id, maybeAutoListen, runActionOperation, speak, transitionPhase]);

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    const value = typedText.trim();
    if (!value || phase === "thinking") return;
    try { window.speechSynthesis.cancel(); } catch {}
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
        <Button variant="ghost" size="icon" onClick={() => { stopAll(); navigate("/", { replace: true }); }} aria-label="Back to home">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
            <h1 className="text-base font-semibold truncate">PG Hub AI</h1>
          </div>
          {currentPG?.name ? (
            <p className="text-xs text-muted-foreground truncate">
              {currentPG.name}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="gap-1 px-2"
          onClick={() => { stopAll(); setLang(l => l === "en-IN" ? "te-IN" : "en-IN"); }}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{lang === "te-IN" ? "తె" : "EN"}</span>
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
          <div className="text-center text-sm text-muted-foreground mt-6 space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shadow-inner">
              <Mic className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-base">
                {autoListen ? (lang === "te-IN" ? "మాట్లాడండి, నేను వింటున్నాను..." : "Just speak, I'm listening...")
                  : (lang === "te-IN" ? "ఇలా అడగండి:" : "Ask anything naturally:")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "te-IN"
                  ? "పీజీ మేనేజ్‌మెంట్ లేదా సాధారణ ప్రశ్నలు ఏదైనా మాట్లాడవచ్చు"
                  : "PG management, calculations, writing, or everyday questions"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
              {(lang === "te-IN"
                ? [
                    "ఈ నెల ఎంత అద్దె వసూలైంది?",
                    "ఎవరు ఇంకా చెల్లించలేదు?",
                    "ఈ నెల లాభం ఎంత వచ్చింది?",
                    "ఖాళీ బెడ్‌లు ఎన్ని ఉన్నాయి?",
                    "టెనెంట్లకు నోటీస్ రాయండి",
                    "EBITDA అంటే ఏమిటి?",
                  ]
                : [
                    "How much rent collected this month?",
                    "Who hasn't paid yet?",
                    "What's our profit this month?",
                    "How many vacant beds?",
                    "Help me write a notice for tenants",
                    "What is EBITDA?",
                  ]
              ).map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendToAgent(q)}
                  className="rounded-full bg-muted/70 px-3.5 py-1.5 text-xs hover:bg-muted text-foreground/90 transition-colors border border-border/30"
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
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm break-words overflow-hidden ${
                m.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-sm"
                  : "bg-muted/80 text-foreground rounded-bl-sm border border-border/30"
              }`}>
                <div className="break-words">{m.content}</div>
                {m.whatsappUrl && (
                  <div className="mt-2.5 pt-2 border-t border-border/20">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                      onClick={() => window.open(m.whatsappUrl, "_blank")}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Send via WhatsApp
                    </Button>
                  </div>
                )}
              </div>
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
          placeholder={lang === "te-IN" ? "ఏదైనా అడగండి లేదా మాట్లాడండి…" : "Ask anything or give a command…"}
          aria-label="Ask assistant a question or give a command"
          disabled={!currentPG?.id || phase === "thinking"}
        />
        <Button type="submit" size="icon" disabled={!typedText.trim() || phase === "thinking"} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Orb + status */}
      <div className="flex flex-col items-center gap-3 pb-8 pt-4">
        <div className="relative h-36 w-36 flex items-center justify-center">
          <button
            type="button"
            className={`relative h-28 w-28 rounded-full bg-gradient-to-br ${phaseColor} shadow-2xl ${phaseGlow} flex items-center justify-center text-white`}
            disabled={!supported || !currentPG?.id}
            onClick={onOrbClick}
            aria-label={phase === "listening" ? "Stop listening" : "Start voice command"}
          >
            {phase === "thinking" ? (
              <Loader2 className="h-9 w-9 animate-spin" />
            ) : (
              <Mic className="h-9 w-9" />
            )}
          </button>
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
