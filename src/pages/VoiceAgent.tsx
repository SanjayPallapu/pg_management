import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, MicOff, Loader2, Volume2, Languages, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

type Phase = "idle" | "listening" | "thinking" | "speaking";
type Lang = "en-IN" | "te-IN";

// Browser STT typings shim
const SpeechRecognitionImpl: any =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

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
  const [continuous, setContinuous] = useState<boolean>(() => localStorage.getItem("va_cont") !== "0");

  const recogRef = useRef<any>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const langRef = useRef(lang); langRef.current = lang;
  const continuousRef = useRef(continuous); continuousRef.current = continuous;
  const mutedRef = useRef(muted); mutedRef.current = muted;

  useEffect(() => { localStorage.setItem("va_lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("va_cont", continuous ? "1" : "0"); }, [continuous]);

  useEffect(() => {
    if (!SpeechRecognitionImpl || typeof window.speechSynthesis === "undefined") {
      setSupported(false);
    }
    return () => {
      try { recogRef.current?.stop(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (mutedRef.current || !text) { setPhase("idle"); maybeAutoListen(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = langRef.current === "te-IN" ? 0.95 : 1.05;
      u.pitch = 1; u.volume = 1;
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
      u.onstart = () => setPhase("speaking");
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
    }
  }, [currentPG?.id, speak]);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionImpl) { toast.error("Voice not supported on this browser. Try Chrome."); return; }
    try { window.speechSynthesis?.cancel(); } catch {}
    const recog = new SpeechRecognitionImpl();
    recog.lang = langRef.current;
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => { setPhase("listening"); setPartial(""); };
    recog.onresult = (e: any) => {
      let interim = "", finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      if (interim) setPartial(interim);
      if (finalText) {
        setPartial("");
        setTranscript(finalText);
        recog.stop();
        sendToAgent(finalText.trim());
      }
    };
    recog.onerror = (e: any) => {
      console.warn("speech err", e?.error);
      if (e?.error === "no-speech") toast.message("Didn't catch that — tap and try again.");
      else if (e?.error === "not-allowed") toast.error("Microphone permission denied.");
      setPhase("idle");
    };
    recog.onend = () => { setPhase(p => (p === "listening" ? "idle" : p)); };
    recogRef.current = recog;
    try { recog.start(); } catch {}
  }, [sendToAgent]);

  const maybeAutoListen = useCallback(() => {
    if (!continuousRef.current) return;
    setTimeout(() => {
      if (phaseRef.current === "idle") startListening();
    }, 350);
  }, [startListening]);

  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const stopAll = useCallback(() => {
    try { recogRef.current?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    setPhase("idle");
  }, []);

  const onOrbClick = () => {
    if (phase === "listening") { stopAll(); return; }
    if (phase === "speaking") { try { window.speechSynthesis.cancel(); } catch {} setPhase("idle"); return; }
    if (phase === "thinking") return;
    startListening();
  };

  const orbState =
    phase === "listening" ? "scale-110" :
    phase === "speaking" ? "scale-105" :
    phase === "thinking" ? "scale-100" : "scale-100";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Voice Assistant</h1>
          <p className="text-xs text-muted-foreground truncate">
            {currentPG?.name || "Select a PG"} · {lang === "te-IN" ? "తెలుగులో మాట్లాడండి" : "Ask anything about your PG"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 px-2"
          onClick={() => { stopAll(); setLang(l => l === "en-IN" ? "te-IN" : "en-IN"); }}
          title="Toggle language"
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{lang === "te-IN" ? "తె" : "EN"}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setContinuous(c => !c)}
          title="Continuous conversation"
          className={continuous ? "text-primary" : ""}
        >
          <Repeat className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setMuted(m => !m)}>
          <Volume2 className={`h-5 w-5 ${muted ? "opacity-30" : ""}`} />
        </Button>
      </header>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8 space-y-2">
            <p className="font-medium text-foreground">
              {lang === "te-IN" ? "ఇలా అడగండి:" : "Try asking:"}
            </p>
            {lang === "te-IN" ? (
              <>
                <p>"ఈ నెల ఎంత అద్దె వసూలైంది?"</p>
                <p>"ఎవరు ఇంకా చెల్లించలేదు?"</p>
                <p>"ఖాళీ బెడ్‌లు ఎన్ని ఉన్నాయి?"</p>
                <p>"రూమ్ 101 గురించి చెప్పు."</p>
              </>
            ) : (
              <>
                <p>"How much rent did we collect this month?"</p>
                <p>"Who hasn't paid yet?"</p>
                <p>"How many vacant beds do we have?"</p>
                <p>"Tell me about room 101."</p>
              </>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>{m.content}</div>
          </div>
        ))}
        {partial && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-primary/40 text-primary-foreground italic rounded-br-sm">
              {partial}…
            </div>
          </div>
        )}
      </div>

      {/* Orb + status */}
      <div className="flex flex-col items-center gap-4 pb-10 pt-4">
        <div className="relative h-40 w-40 flex items-center justify-center" onClick={onOrbClick}>
          {/* Animated rings */}
          <div className={`absolute inset-0 rounded-full bg-primary/20 blur-2xl transition-all duration-500 ${
            phase !== "idle" ? "animate-pulse" : ""
          }`} />
          {phase === "listening" && (
            <>
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-primary/20 animate-ping [animation-delay:200ms]" />
            </>
          )}
          {phase === "speaking" && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-pulse" />
          )}
          <button
            type="button"
            className={`relative h-32 w-32 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-2xl shadow-primary/50 flex items-center justify-center text-primary-foreground transition-transform duration-300 active:scale-95 ${orbState}`}
            disabled={!supported || !currentPG?.id}
          >
            {phase === "thinking" ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : phase === "listening" ? (
              <MicOff className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>
        </div>
        <p className="text-sm text-muted-foreground h-5">
          {!supported ? "Voice not supported — use Chrome."
            : phase === "listening" ? (lang === "te-IN" ? "వింటున్నాను…" : "Listening…")
            : phase === "thinking" ? (lang === "te-IN" ? "ఆలోచిస్తున్నాను…" : "Thinking…")
            : phase === "speaking" ? (lang === "te-IN" ? "మాట్లాడుతున్నాను… (ఆపడానికి తాకండి)" : "Speaking… (tap to stop)")
            : (lang === "te-IN" ? "మాట్లాడటానికి తాకండి" : "Tap the orb to speak")}
        </p>
      </div>
    </div>
  );
}