"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mic,
  Type,
  Square,
  Loader2,
  Check,
  Edit2,
  Trash2,
  Repeat,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { useVoiceCapture } from "@/hooks/use-voice-capture";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  surfaceAlt: "#22201c",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  accentSoft: "#d4915a30",
  danger: "#c05252",
  success: "#7ab07a",
  blue: "#6b9fc4",
};

type Stance = "agree" | "disagree" | "complicated";

interface CandidateClaim {
  text: string;
  type: string;
  confidence: number;
  concepts: string[];
  aiStance?: string;
  matchedClaimId?: string;
}

interface ClaimDecision {
  text: string;
  originalText: string;
  stance: Stance;
  dropped: boolean;
  edited: boolean;
  flipped: boolean;
  matchedClaimId?: string;
}

type Step =
  | "select_mode"
  | "text_input"
  | "recording"
  | "uploading"
  | "transcribing"
  | "transcript_preview"
  | "extracting"
  | "review"
  | "need_more_thought"
  | "success"
  | "error";

interface QuickThoughtModalProps {
  open: boolean;
  onClose: () => void;
}

const STANCE_LABELS: Record<Stance, string> = {
  agree: "Agree",
  complicated: "It's complicated",
  disagree: "Disagree",
};

const STANCE_COLORS: Record<Stance, string> = {
  agree: C.success,
  complicated: C.accent,
  disagree: C.danger,
};

function aiStanceToUser(aiStance?: string): Stance {
  switch (aiStance) {
    case "endorse":
    case "changed_my_mind":
      return "agree";
    case "dispute":
      return "disagree";
    case "complicated":
      return "complicated";
    default:
      return "agree";
  }
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function QuickThoughtModal({ open, onClose }: QuickThoughtModalProps) {
  const [step, setStep] = useState<Step>("select_mode");
  const [error, setError] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [thoughtText, setThoughtText] = useState("");
  const [decisions, setDecisions] = useState<ClaimDecision[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [flippingIndex, setFlippingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualClaim, setManualClaim] = useState("");
  const [manualStance, setManualStance] = useState<Stance>("agree");

  const voice = useVoiceCapture();
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const resetAll = useCallback(() => {
    setStep("select_mode");
    setError(null);
    setCaptureId(null);
    setTranscript("");
    setThoughtText("");
    setDecisions([]);
    setEditingIndex(null);
    setEditText("");
    setFlippingIndex(null);
    setIsSubmitting(false);
    setManualMode(false);
    setManualClaim("");
    setManualStance("agree");
    voice.reset();
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, [voice]);

  const handleClose = useCallback(() => {
    if (voice.state === "recording") voice.cancelRecording();
    resetAll();
    onClose();
  }, [voice, resetAll, onClose]);

  useEffect(() => {
    if (!open) {
      resetAll();
    }
  }, [open, resetAll]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const pollCapture = useCallback(
    async (id: string, opts: { wantTranscript?: boolean } = {}) => {
      let attempts = 0;
      const maxAttempts = 90;

      const tick = async () => {
        try {
          const res = await fetch(`/api/captures/${id}`);
          if (!res.ok) throw new Error("Failed to fetch capture");
          const data = await res.json();

          if (data.rawText && opts.wantTranscript && !transcript) {
            setTranscript(data.rawText);
            setStep("transcript_preview");
            opts.wantTranscript = false;
          }

          if (data.status === "awaiting_confirmation") {
            const claims = (data.candidateClaims as CandidateClaim[]) || [];
            setDecisions(
              claims.map((c) => ({
                text: c.text,
                originalText: c.text,
                stance: aiStanceToUser(c.aiStance),
                dropped: false,
                edited: false,
                flipped: false,
                matchedClaimId: c.matchedClaimId,
              }))
            );
            setStep("review");
            return;
          }

          if (data.status === "awaiting_reaction") {
            if (data.rawText && !transcript) setTranscript(data.rawText);
            setStep("need_more_thought");
            return;
          }

          if (data.status === "failed") {
            throw new Error(data.errorReason || "Processing failed");
          }

          attempts++;
          if (attempts < maxAttempts) {
            pollRef.current = setTimeout(tick, 1000);
          } else {
            throw new Error("Processing timed out");
          }
        } catch (err) {
          console.error("Poll error:", err);
          setError(err instanceof Error ? err.message : "Something went wrong");
          setStep("error");
        }
      };

      tick();
    },
    [transcript]
  );

  const handleSubmitText = async () => {
    const trimmed = thoughtText.trim();
    if (!trimmed) return;
    setError(null);
    setStep("extracting");
    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: "typed",
          rawText: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit");
      }
      const data = await res.json();
      setCaptureId(data.captureId);
      pollCapture(data.captureId);
    } catch (err) {
      console.error("Submit text error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const handleStartRecording = async () => {
    setError(null);
    setStep("recording");
    await voice.startRecording();
  };

  const handleStopRecording = async () => {
    setStep("uploading");
    const recording = await voice.stopRecording();
    if (!recording) {
      setStep("select_mode");
      return;
    }

    try {
      const ext = recording.mimeType.split("/")[1] || "webm";
      const fd = new FormData();
      fd.append("file", recording.blob, `quick-thought.${ext}`);
      fd.append("purpose", "voice_capture");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.message || "Upload failed");
      }
      const upload = await uploadRes.json();

      setStep("transcribing");
      const captureRes = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: "voice",
          rawAudioUrl: upload.url,
          rawAudioMs: upload.durationMs || recording.durationMs,
        }),
      });
      if (!captureRes.ok) {
        const data = await captureRes.json();
        throw new Error(data.message || "Failed to create capture");
      }
      const capture = await captureRes.json();
      setCaptureId(capture.captureId);
      pollCapture(capture.captureId, { wantTranscript: true });
    } catch (err) {
      console.error("Voice upload error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  };

  const handleCommit = async () => {
    if (!captureId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/captures/${captureId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claims: decisions.map((d) => ({
            text: d.text,
            originalText: d.originalText,
            stance: d.stance,
            dropped: d.dropped,
            edited: d.edited || d.flipped,
            matchedClaimId: d.matchedClaimId,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }
      setStep("success");
      setTimeout(() => handleClose(), 1600);
    } catch (err) {
      console.error("Commit error:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSubmitting(false);
    }
  };

  const handlePark = async () => {
    if (!captureId) {
      handleClose();
      return;
    }
    try {
      await fetch(`/api/captures/${captureId}/dismiss`, { method: "POST" });
    } catch (err) {
      console.error("Park error:", err);
    }
    setStep("success");
    setTimeout(() => handleClose(), 1400);
  };

  const startManualClaim = () => {
    setManualClaim(transcript.trim());
    setManualStance("agree");
    setManualMode(true);
  };

  const handleSubmitManualClaim = async () => {
    if (!captureId) return;
    const trimmed = manualClaim.trim();
    if (trimmed.length < 3) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/captures/${captureId}/manual-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          stance: manualStance,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save claim");
      }
      setStep("success");
      setTimeout(() => handleClose(), 1600);
    } catch (err) {
      console.error("Manual claim error:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSubmitting(false);
    }
  };

  const cycleStance = (index: number) => {
    setDecisions((prev) =>
      prev.map((d, i) => {
        if (i !== index) return d;
        const order: Stance[] = ["agree", "complicated", "disagree"];
        const next = order[(order.indexOf(d.stance) + 1) % order.length];
        return { ...d, stance: next };
      })
    );
  };

  const handleDrop = (index: number) => {
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, dropped: true } : d))
    );
  };

  const handleKeep = (index: number) => {
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, dropped: false } : d))
    );
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(decisions[index].text);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const t = editText.trim();
    if (!t) return;
    setDecisions((prev) =>
      prev.map((d, i) =>
        i === editingIndex ? { ...d, text: t, edited: true } : d
      )
    );
    setEditingIndex(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const handleFlip = async (index: number) => {
    if (!captureId) return;
    setFlippingIndex(index);
    try {
      const res = await fetch(`/api/captures/${captureId}/flip-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimText: decisions[index].text }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Flip failed");
      }
      const { flippedText } = await res.json();
      setDecisions((prev) =>
        prev.map((d, i) =>
          i === index
            ? { ...d, text: flippedText, edited: true, flipped: true }
            : d
        )
      );
    } catch (err) {
      console.error("Flip error:", err);
    } finally {
      setFlippingIndex(null);
    }
  };

  const activeClaims = decisions.filter((d) => !d.dropped);
  const allDropped = decisions.length > 0 && activeClaims.length === 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && step !== "recording" && step !== "uploading") {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="w-full sm:max-w-lg overflow-hidden"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            color: C.text,
            fontFamily: "'Inter', system-ui, sans-serif",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {step !== "select_mode" && step !== "success" && (
                <button
                  onClick={() => {
                    if (step === "recording") voice.cancelRecording();
                    resetAll();
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.muted,
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <Sparkles size={16} color={C.accent} />
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                Quick thought
              </h2>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                padding: 4,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {step === "select_mode" && (
              <div style={{ padding: "28px 20px" }}>
                <p
                  style={{
                    color: C.textSoft,
                    fontSize: 14,
                    marginTop: 0,
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Capture a fleeting thought. How would you like to share it?
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <ModeCard
                    icon={<Type size={26} />}
                    label="Type it"
                    description="Write a quick note"
                    onClick={() => setStep("text_input")}
                  />
                  <ModeCard
                    icon={<Mic size={26} />}
                    label="Speak it"
                    description="Record a voice note"
                    onClick={handleStartRecording}
                  />
                </div>
              </div>
            )}

            {step === "text_input" && (
              <div style={{ padding: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.textSoft,
                    marginBottom: 8,
                  }}
                >
                  What&apos;s on your mind?
                </label>
                <textarea
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="A passing thought, an observation, a half-formed idea..."
                  autoFocus
                  rows={6}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: C.text,
                    fontSize: 15,
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    minHeight: 140,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <PrimaryButton
                    onClick={handleSubmitText}
                    disabled={!thoughtText.trim()}
                  >
                    Extract claim
                  </PrimaryButton>
                </div>
              </div>
            )}

            {step === "recording" && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: `${C.danger}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                    border: `1px solid ${C.danger}50`,
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: C.danger,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {formatDuration(voice.duration)}
                </div>
                <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
                  Recording...
                </p>
                <button
                  onClick={handleStopRecording}
                  style={{
                    background: C.danger,
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 22px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Square size={14} fill="#fff" />
                  Stop recording
                </button>
                {voice.error && (
                  <p style={{ color: C.danger, fontSize: 13, marginTop: 16 }}>
                    {voice.error}
                  </p>
                )}
              </div>
            )}

            {(step === "uploading" || step === "transcribing" || step === "extracting") && (
              <ProcessingState
                label={
                  step === "uploading"
                    ? "Uploading audio..."
                    : step === "transcribing"
                    ? "Transcribing what you said..."
                    : "Extracting your claim..."
                }
              />
            )}

            {step === "transcript_preview" && (
              <div style={{ padding: "20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  Here&apos;s what we heard
                </div>
                <div
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: C.text,
                    marginBottom: 16,
                  }}
                >
                  {transcript || (
                    <span style={{ color: C.muted, fontStyle: "italic" }}>
                      (no transcript yet)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: C.muted,
                    fontSize: 13,
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Extracting your claim...
                </div>
              </div>
            )}

            {step === "review" && (
              <div style={{ padding: "20px" }}>
                {transcript && (
                  <details
                    style={{
                      marginBottom: 16,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 12,
                        color: C.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Original transcript
                    </summary>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        color: C.textSoft,
                        lineHeight: 1.55,
                      }}
                    >
                      {transcript}
                    </div>
                  </details>
                )}

                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 12,
                  }}
                >
                  {activeClaims.length === 1
                    ? "1 claim found"
                    : `${activeClaims.length} claims found`}
                </div>

                {decisions.map((d, i) => {
                  if (d.dropped) {
                    return (
                      <div
                        key={i}
                        style={{
                          background: C.bg,
                          border: `1px dashed ${C.border}`,
                          borderRadius: 10,
                          padding: "12px 14px",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            color: C.muted,
                            fontSize: 13,
                            textDecoration: "line-through",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {d.text}
                        </span>
                        <button
                          onClick={() => handleKeep(i)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            color: C.textSoft,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        background: C.bg,
                        border: `1px solid ${
                          d.flipped ? `${C.blue}80` : C.border
                        }`,
                        borderRadius: 10,
                        padding: "14px 16px",
                        marginBottom: 12,
                        position: "relative",
                      }}
                    >
                      {d.flipped && (
                        <div
                          style={{
                            position: "absolute",
                            top: -8,
                            left: 14,
                            background: C.surface,
                            color: C.blue,
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 4,
                            border: `1px solid ${C.blue}80`,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}
                        >
                          FLIPPED
                        </div>
                      )}

                      {editingIndex === i ? (
                        <div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                            rows={3}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              borderRadius: 8,
                              padding: "10px 12px",
                              color: C.text,
                              fontSize: 15,
                              fontFamily: "inherit",
                              resize: "vertical",
                              outline: "none",
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              justifyContent: "flex-end",
                              marginTop: 8,
                            }}
                          >
                            <SecondaryButton onClick={cancelEdit} small>
                              Cancel
                            </SecondaryButton>
                            <PrimaryButton onClick={saveEdit} small>
                              Save
                            </PrimaryButton>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              fontSize: 15,
                              lineHeight: 1.5,
                              marginBottom: 12,
                              color: C.text,
                            }}
                          >
                            {d.text}
                          </div>

                          <button
                            onClick={() => cycleStance(i)}
                            style={{
                              background: `${STANCE_COLORS[d.stance]}20`,
                              border: `1px solid ${STANCE_COLORS[d.stance]}60`,
                              color: STANCE_COLORS[d.stance],
                              borderRadius: 6,
                              padding: "4px 10px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              marginBottom: 12,
                            }}
                          >
                            {STANCE_LABELS[d.stance]}
                          </button>

                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <ClaimActionButton
                              icon={<Check size={13} />}
                              label="Keep"
                              onClick={() => {}}
                              active
                            />
                            <ClaimActionButton
                              icon={<Edit2 size={13} />}
                              label="Edit"
                              onClick={() => startEditing(i)}
                            />
                            <ClaimActionButton
                              icon={
                                flippingIndex === i ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Repeat size={13} />
                                )
                              }
                              label="Flip"
                              onClick={() => handleFlip(i)}
                              disabled={flippingIndex !== null}
                            />
                            <ClaimActionButton
                              icon={<Trash2 size={13} />}
                              label="Drop"
                              onClick={() => handleDrop(i)}
                              danger
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {allDropped && (
                  <div
                    style={{
                      background: `${C.accent}12`,
                      border: `1px solid ${C.accent}40`,
                      borderRadius: 10,
                      padding: "14px 16px",
                      marginBottom: 12,
                      color: C.textSoft,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    All claims dropped. Save this thought for later reflection
                    instead?
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  {allDropped ? (
                    <SecondaryButton onClick={handlePark}>
                      Save for later
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
                  )}
                  <PrimaryButton
                    onClick={handleCommit}
                    disabled={activeClaims.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>Add to map</>
                    )}
                  </PrimaryButton>
                </div>

                {error && (
                  <div
                    style={{
                      marginTop: 12,
                      color: C.danger,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === "need_more_thought" && !manualMode && (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: `${C.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Sparkles size={22} color={C.accent} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>
                  Couldn&apos;t pull a clear claim
                </h3>
                <p
                  style={{
                    color: C.textSoft,
                    fontSize: 14,
                    lineHeight: 1.55,
                    marginTop: 0,
                    marginBottom: 20,
                    maxWidth: 380,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  Want to write the claim yourself? Or save it for later if the
                  idea still needs to sharpen.
                </p>
                {transcript && (
                  <div
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 13,
                      color: C.textSoft,
                      textAlign: "left",
                      marginBottom: 20,
                      lineHeight: 1.5,
                    }}
                  >
                    {transcript}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <SecondaryButton onClick={handleClose}>
                    Discard
                  </SecondaryButton>
                  <SecondaryButton onClick={handlePark}>
                    Save for later
                  </SecondaryButton>
                  <PrimaryButton onClick={startManualClaim}>
                    Write the claim
                  </PrimaryButton>
                </div>
              </div>
            )}

            {step === "need_more_thought" && manualMode && (
              <div style={{ padding: "20px" }}>
                <div
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  Your words
                </div>
                {transcript && (
                  <div
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 13,
                      color: C.textSoft,
                      marginBottom: 16,
                      lineHeight: 1.5,
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {transcript}
                  </div>
                )}

                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: C.textSoft,
                    marginBottom: 8,
                  }}
                >
                  Write the claim in your own words
                </label>
                <textarea
                  value={manualClaim}
                  onChange={(e) => setManualClaim(e.target.value)}
                  placeholder="A clear, standalone statement of what you believe..."
                  autoFocus
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: C.text,
                    fontSize: 15,
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    minHeight: 80,
                    marginBottom: 16,
                  }}
                />

                <div
                  style={{
                    fontSize: 13,
                    color: C.textSoft,
                    marginBottom: 8,
                  }}
                >
                  Your stance
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 20,
                    flexWrap: "wrap",
                  }}
                >
                  {(["agree", "complicated", "disagree"] as Stance[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setManualStance(s)}
                      style={{
                        background:
                          manualStance === s
                            ? `${STANCE_COLORS[s]}25`
                            : "transparent",
                        border: `1px solid ${
                          manualStance === s
                            ? `${STANCE_COLORS[s]}80`
                            : C.border
                        }`,
                        color:
                          manualStance === s ? STANCE_COLORS[s] : C.textSoft,
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {STANCE_LABELS[s]}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <SecondaryButton onClick={() => setManualMode(false)}>
                    Back
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={handleSubmitManualClaim}
                    disabled={manualClaim.trim().length < 3 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>Add to map</>
                    )}
                  </PrimaryButton>
                </div>

                {error && (
                  <div
                    style={{
                      marginTop: 12,
                      color: C.danger,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === "success" && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: `${C.success}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Check size={26} color={C.success} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 6px" }}>
                  Saved
                </h3>
                <p style={{ color: C.textSoft, fontSize: 13, margin: 0 }}>
                  Your thought is on the map.
                </p>
              </div>
            )}

            {step === "error" && (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: `${C.danger}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <AlertCircle size={26} color={C.danger} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>
                  Something went wrong
                </h3>
                <p
                  style={{
                    color: C.textSoft,
                    fontSize: 13,
                    marginTop: 0,
                    marginBottom: 20,
                  }}
                >
                  {error || "Please try again."}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                  }}
                >
                  <SecondaryButton onClick={handleClose}>Close</SecondaryButton>
                  <PrimaryButton onClick={() => resetAll()}>Try again</PrimaryButton>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ModeCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.surfaceAlt,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "20px 14px",
        color: C.text,
        cursor: "pointer",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.background = C.bg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.background = C.surfaceAlt;
      }}
    >
      <div style={{ color: C.accent }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
        {description}
      </div>
    </button>
  );
}

function ProcessingState({ label }: { label: string }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <Loader2
        size={32}
        color={C.accent}
        className="animate-spin"
        style={{ margin: "0 auto 16px" }}
      />
      <p style={{ color: C.textSoft, fontSize: 14, margin: 0 }}>{label}</p>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
  small,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.border : C.accent,
        color: disabled ? C.muted : "#fff",
        border: "none",
        borderRadius: 8,
        padding: small ? "6px 14px" : "10px 20px",
        fontSize: small ? 13 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
  small,
}: {
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: C.textSoft,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: small ? "6px 14px" : "10px 20px",
        fontSize: small ? 13 : 14,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ClaimActionButton({
  icon,
  label,
  onClick,
  active,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? C.danger : active ? C.success : C.textSoft;
  const borderColor = active ? `${C.success}60` : C.border;
  const bg = active ? `${C.success}15` : "transparent";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
