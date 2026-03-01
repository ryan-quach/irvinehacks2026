import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

interface VoiceOverlayProps {
  isActive: boolean;
}

const WS_URL = "ws://localhost:8000/ws/transcribe";
const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.2";
const SAMPLE_RATE = 16000;
const MAX_ROUNDS = 2; // how many follow-up questions Ollama asks

const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isActive }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [round, setRound] = useState(0); // 0 = initial, 1 & 2 = follow-up rounds
  const [status, setStatus] = useState<"idle" | "connecting" | "recording" | "thinking" | "error">("idle");

  // Refs so we can clean up without stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef(""); // always up-to-date transcript for async callbacks

  // Keep ref in sync with state
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // ── Audio / WebSocket helpers ──────────────────────────────────────────────

  const teardownAudio = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  };

  // ── Ollama ──────────────────────────────────────────────────────────────────

  const askOllama = async (currentTranscript: string): Promise<string> => {
    const prompt =
      `You are a compassionate mental health assistant conducting a short intake interview. ` +
      `The user has shared the following so far:\n\n"${currentTranscript}"\n\n` +
      `Ask ONE concise, open-ended follow-up question to help them elaborate further. ` +
      `Reply with only the question, no preamble.`;

    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return (data.response as string).trim();
  };

  // ── Stop recording → maybe ask Ollama ──────────────────────────────────────

  const stopRecording = async () => {
    teardownAudio();
    setIsListening(false);

    const currentTranscript = transcriptRef.current;
    const currentRound = round;

    if (currentRound < MAX_ROUNDS && currentTranscript.trim()) {
      setStatus("thinking");
      try {
        const question = await askOllama(currentTranscript);
        const nextRound = currentRound + 1;
        setFollowUp(question);
        setRound(nextRound);
        setStatus("idle");

        // After the last follow-up question is delivered, log the full transcript
        if (nextRound >= MAX_ROUNDS) {
          // Wait for user's final response before printing — happens on next stop
        }
      } catch (err) {
        console.error("Ollama error:", err);
        setStatus("error");
      }
    } else {
      // All rounds done — process the full transcript
      if (currentRound >= MAX_ROUNDS && currentTranscript.trim()) {
        setStatus("saving" as any);
        try {
          const res = await fetch("http://localhost:8000/process-transcript", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: currentTranscript }),
          });
          const row = await res.json();
          console.log("=== JOURNAL ROW ===");
          console.log(JSON.stringify(row, null, 2));
          console.log("==================");
          setStatus("saved" as any);
        } catch (err) {
          console.error("process-transcript error:", err);
          setStatus("error");
        }
      } else {
        setStatus("idle");
      }
    }
  };

  // ── Start recording ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    setFollowUp(null); // hide the question while speaking
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("recording");
        setIsListening(true);

        const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          ws.send(float32.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            setTranscript((prev) => (prev ? prev + " " + data.transcript : data.transcript));
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        setStatus("error");
        teardownAudio();
        setIsListening(false);
      };

      ws.onclose = () => {
        // handled by stopRecording; ignore stray close events
      };
    } catch (err) {
      console.error("Microphone / WebSocket error:", err);
      setStatus("error");
      teardownAudio();
      setIsListening(false);
    }
  };

  // ── Mic button click ────────────────────────────────────────────────────────

  const handleMicClick = () => {
    if (status === "thinking" || status === "connecting") return; // debounce
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Clean up when overlay closes ────────────────────────────────────────────

  useEffect(() => {
    if (!isActive) {
      teardownAudio();
      setIsListening(false);
      setStatus("idle");
      // NOTE: transcript & round are kept in case the overlay reopens mid-session
    }
  }, [isActive]);

  // ── Labels ──────────────────────────────────────────────────────────────────

  const statusLabel =
    status === "connecting"
      ? "CONNECTING..."
      : status === "thinking"
        ? "THINKING..."
        : (status as string) === "saving"
          ? "SAVING..."
          : (status as string) === "saved"
            ? "SAVED ✓"
            : status === "error"
              ? "ERROR – CHECK CONSOLE"
              : isListening
                ? "RECORDING... (PRESS MIC TO PAUSE)"
                : round >= MAX_ROUNDS
                  ? "SESSION COMPLETE"
                  : followUp
                    ? "PRESS MIC TO RESPOND"
                    : "CLICK MIC TO START";

  const micColor = isListening
    ? "#ff4b4b"
    : status === "error"
      ? "#ff8800"
      : status === "thinking"
        ? "#888"
        : "#ffffff";

  return (
    <motion.div
      className="voice-overlay"
      initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
      animate={{
        clipPath: isActive ? "circle(150% at 50% 50%)" : "circle(0% at 50% 50%)",
        opacity: isActive ? 1 : 0,
      }}
      style={{
        pointerEvents: isActive ? "all" : "none",
        visibility: "visible",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "#050505",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      transition={{
        duration: 0.8,
        ease: [0.76, 0, 0.24, 1],
      }}
    >
      <div
        className="voice-content"
        style={{ textAlign: "center", maxWidth: "520px", padding: "0 32px" }}
      >
        {/* Mic / MicOff button */}
        <motion.button
          className={`mic-circle ${isListening ? "active-mic" : ""}`}
          onClick={handleMicClick}
          disabled={status === "thinking" || status === "connecting"}
          animate={isListening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ repeat: isListening ? Infinity : 0, duration: 1.5 }}
          style={{
            background: "none",
            border: "none",
            cursor: status === "thinking" || status === "connecting" ? "default" : "pointer",
            outline: "none",
            opacity: status === "thinking" ? 0.4 : 1,
          }}
        >
          {isListening ? (
            <Mic size={48} color={micColor} />
          ) : (
            <MicOff size={48} color={micColor} />
          )}
        </motion.button>

        {/* Status label */}
        <p
          style={{
            marginTop: "24px",
            color: status === "error" ? "#ff8800" : "#666",
            letterSpacing: "2px",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {statusLabel}
        </p>

        {/* Ollama follow-up question */}
        <AnimatePresence>
          {followUp && !isListening && (
            <motion.p
              key={round}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                marginTop: "36px",
                color: "#ddd",
                fontSize: "1.05rem",
                lineHeight: 1.7,
                fontStyle: "italic",
              }}
            >
              {followUp}
            </motion.p>
          )}
        </AnimatePresence>



        {/* Round indicator dots */}
        <div style={{ marginTop: "48px", display: "flex", gap: "8px", justifyContent: "center" }}>
          {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i < round ? "#ff4b4b" : "#2a2a2a",
                display: "inline-block",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <p
          style={{
            marginTop: "36px",
            fontSize: "0.65rem",
            color: "#333",
            letterSpacing: "1px",
          }}
        >
          PRESS SPACE TO EXIT
        </p>
      </div>
    </motion.div>
  );
};

export default VoiceOverlay;