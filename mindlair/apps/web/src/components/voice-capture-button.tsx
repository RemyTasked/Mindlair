"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Loader2, X, Check, AlertCircle } from "lucide-react";
import { CaptureConfirmation } from "@/components/capture-confirmation";

interface CandidateClaim {
  text: string;
  type: string;
  confidence: number;
  concepts: string[];
  aiStance?: string;
  matchedClaimId?: string;
  matchedClaimText?: string;
}

type RecordingState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "uploading"
  | "processing"
  | "confirming"
  | "success"
  | "error";

export function VoiceCaptureButton() {
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<CandidateClaim[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    setState("requesting_permission");
    setError(null);
    audioChunksRef.current = [];
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        handleRecordingComplete();
      };

      mediaRecorder.start(1000);
      setState("recording");
      setIsExpanded(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setState("error");
      setError("Could not access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioChunksRef.current = [];
    setState("idle");
    setIsExpanded(false);
    setDuration(0);
  }, [state]);

  const handleRecordingComplete = async () => {
    if (audioChunksRef.current.length === 0) {
      setState("idle");
      setIsExpanded(false);
      return;
    }

    setState("uploading");

    try {
      const mimeType = audioChunksRef.current[0].type || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      const formData = new FormData();
      formData.append("file", audioBlob, `voice-capture.${mimeType.split("/")[1]}`);
      formData.append("purpose", "voice_capture");

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.message || "Upload failed");
      }

      const uploadData = await uploadResponse.json();

      setState("processing");

      const captureResponse = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: "voice",
          rawAudioUrl: uploadData.url,
          rawAudioMs: uploadData.durationMs || duration * 1000,
        }),
      });

      if (!captureResponse.ok) {
        const data = await captureResponse.json();
        throw new Error(data.message || "Failed to create capture");
      }

      const captureData = await captureResponse.json();
      setCaptureId(captureData.captureId);

      pollForClaims(captureData.captureId);
    } catch (err) {
      console.error("Voice capture error:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const pollForClaims = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const response = await fetch(`/api/captures/${id}`);
        if (!response.ok) throw new Error("Failed to fetch capture");

        const data = await response.json();

        if (data.status === "awaiting_confirmation") {
          setCandidateClaims(data.candidateClaims || []);
          setState("confirming");
          return;
        }

        if (data.status === "failed") {
          throw new Error(data.errorReason || "Processing failed");
        }

        if (data.status === "awaiting_reaction") {
          setState("success");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          throw new Error("Processing timed out");
        }
      } catch (err) {
        console.error("Poll error:", err);
        setState("error");
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    poll();
  };

  const handleConfirmationComplete = () => {
    setState("success");
    setTimeout(() => {
      setState("idle");
      setIsExpanded(false);
      setCaptureId(null);
      setCandidateClaims([]);
    }, 2000);
  };

  const handleConfirmationDismiss = async () => {
    if (captureId) {
      try {
        await fetch(`/api/captures/${captureId}/dismiss`, { method: "POST" });
      } catch (err) {
        console.error("Dismiss error:", err);
      }
    }
    setState("idle");
    setIsExpanded(false);
    setCaptureId(null);
    setCandidateClaims([]);
  };

  const handleClose = () => {
    setState("idle");
    setIsExpanded(false);
    setError(null);
    setCaptureId(null);
    setCandidateClaims([]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (state === "confirming" && captureId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <CaptureConfirmation
          captureId={captureId}
          candidateClaims={candidateClaims}
          modality="voice"
          onComplete={handleConfirmationComplete}
          onDismiss={handleConfirmationDismiss}
        />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-40 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 w-72"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Voice Capture
              </h3>
              <button
                onClick={state === "recording" ? cancelRecording : handleClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {state === "recording" && (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                  <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse" />
                </div>
                <p className="text-2xl font-mono font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {formatDuration(duration)}
                </p>
                <p className="text-sm text-zinc-500">Recording...</p>
                <Button
                  onClick={stopRecording}
                  className="mt-4 bg-rose-500 hover:bg-rose-600 text-white"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              </div>
            )}

            {(state === "uploading" || state === "processing") && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto mb-4" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {state === "uploading" ? "Uploading audio..." : "Transcribing & extracting claims..."}
                </p>
              </div>
            )}

            {state === "success" && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Added to your map!
                </p>
              </div>
            )}

            {state === "error" && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                  Something went wrong
                </p>
                <p className="text-sm text-zinc-500">{error}</p>
                <Button onClick={handleClose} variant="outline" className="mt-4">
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={state === "idle" ? startRecording : undefined}
        disabled={state !== "idle" && state !== "recording"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          state === "recording"
            ? "bg-rose-500 hover:bg-rose-600"
            : "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600"
        } ${state !== "idle" && state !== "recording" ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {state === "recording" ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : state === "requesting_permission" ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>
    </>
  );
}
