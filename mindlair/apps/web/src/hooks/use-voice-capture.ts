"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  createLiveSpeechSession,
  isBrowserSpeechAvailable,
} from "@/lib/browser-speech";

export type RecordingState = "idle" | "requesting_permission" | "recording" | "stopped";

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  /** Final browser speech transcript at stop time. */
  transcript: string;
}

export interface UseVoiceCaptureResult {
  state: RecordingState;
  duration: number;
  error: string | null;
  /** Live transcript while recording (browser speech API; no OpenAI required). */
  liveTranscript: string;
  browserSpeechAvailable: boolean;
  startRecording: () => Promise<void>;
  /** Stops recording. Resolves with the finalized recording once MediaRecorder.onstop fires. */
  stopRecording: () => Promise<Recording | null>;
  cancelRecording: () => void;
  reset: () => void;
}

export function useVoiceCapture(): UseVoiceCaptureResult {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechSessionRef = useRef<ReturnType<typeof createLiveSpeechSession> | null>(
    null
  );
  const speechPollRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finalDurationRef = useRef(0);
  const stopResolveRef = useRef<((rec: Recording | null) => void) | null>(null);
  const finalTranscriptRef = useRef("");

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setState("requesting_permission");
    audioChunksRef.current = [];
    setDuration(0);
    finalDurationRef.current = 0;
    setLiveTranscript("");

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
        setState("stopped");
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        if (audioChunksRef.current.length === 0) {
          resolve?.(null);
          return;
        }
        const finalMime = audioChunksRef.current[0].type || mimeType;
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        resolve?.({
          blob,
          mimeType: finalMime,
          durationMs: finalDurationRef.current * 1000,
          transcript: finalTranscriptRef.current,
        });
      };

      mediaRecorder.start(1000);
      setState("recording");

      speechSessionRef.current = createLiveSpeechSession();
      if (speechSessionRef.current) {
        speechSessionRef.current.start();
        speechPollRef.current = setInterval(() => {
          setLiveTranscript(speechSessionRef.current?.getTranscript() ?? "");
        }, 300);
      }

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          finalDurationRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setError("Could not access microphone. Please check permissions.");
      setState("idle");
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopRecording = useCallback((): Promise<Recording | null> => {
    return new Promise((resolve) => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state !== "recording"
      ) {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      speechSessionRef.current?.stop();
      if (speechPollRef.current) {
        clearInterval(speechPollRef.current);
        speechPollRef.current = null;
      }
      finalTranscriptRef.current =
        speechSessionRef.current?.getTranscript() ?? "";
      setLiveTranscript(finalTranscriptRef.current);
      mediaRecorderRef.current.stop();
      cleanupStream();
    });
  }, [cleanupStream]);

  const cancelRecording = useCallback(() => {
    stopResolveRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    audioChunksRef.current = [];
    setDuration(0);
    finalDurationRef.current = 0;
    setState("idle");
  }, [cleanupStream]);

  const reset = useCallback(() => {
    cancelRecording();
    setError(null);
  }, [cancelRecording]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    state,
    duration,
    error,
    liveTranscript,
    browserSpeechAvailable: isBrowserSpeechAvailable(),
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
