import { useEffect, useRef, useState } from "react";
import { AppState, NativeModules, Platform } from "react-native";
import { api } from "../api/client";

interface PendingCapture {
  modality: "share_sheet" | "voice" | "typed" | "extension";
  rawText?: string;
  rawAudioUrl?: string;
  rawAudioMs?: number;
  source?: {
    url?: string;
    title?: string;
    outlet?: string;
    contentType?: string;
  };
  createdAt?: string;
  timestamp?: number;
}

export interface DrainedCapture {
  captureId: string;
  status: string;
  payload: PendingCapture;
}

/**
 * Reads the iOS App Group's `pendingCaptures` array (written by the share
 * extension) and POSTs each entry to /api/captures, then clears the queue.
 * Returns a list of newly-created captures so the host app can stack
 * confirmation sheets.
 *
 * Android does not need this hook because share intents are delivered live
 * via `Linking` -> `ShareIntentContext` -> ShareReceiveScreen.
 */
export function useCaptureDrain(options: {
  enabled: boolean;
  onCapturesDrained?: (drained: DrainedCapture[]) => void;
}) {
  const { enabled, onCapturesDrained } = options;
  const [isDraining, setIsDraining] = useState(false);
  const drainedRef = useRef(false);

  const drain = async (): Promise<DrainedCapture[]> => {
    if (Platform.OS !== "ios") return [];
    if (isDraining) return [];

    setIsDraining(true);

    try {
      const SharedDefaultsModule =
        (NativeModules.MindlairSharedDefaults as
          | { getPendingCaptures?: () => Promise<PendingCapture[]>; clearPendingCaptures?: () => Promise<void> }
          | undefined) ?? undefined;

      let pending: PendingCapture[] = [];

      if (SharedDefaultsModule?.getPendingCaptures) {
        try {
          pending = await SharedDefaultsModule.getPendingCaptures();
        } catch (err) {
          console.warn("Failed to read pendingCaptures from native module:", err);
        }
      }

      if (pending.length === 0) {
        return [];
      }

      const results: DrainedCapture[] = [];
      for (const payload of pending) {
        try {
          const response = await api.createCapture({
            modality: payload.modality || "share_sheet",
            rawText: payload.rawText,
            rawAudioUrl: payload.rawAudioUrl,
            rawAudioMs: payload.rawAudioMs,
            source: payload.source,
          });
          results.push({
            captureId: response.captureId,
            status: response.status,
            payload,
          });
        } catch (err) {
          console.error("Failed to create capture from drained payload:", err);
        }
      }

      if (SharedDefaultsModule?.clearPendingCaptures) {
        try {
          await SharedDefaultsModule.clearPendingCaptures();
        } catch (err) {
          console.warn("Failed to clear pendingCaptures:", err);
        }
      }

      if (onCapturesDrained && results.length > 0) {
        onCapturesDrained(results);
      }

      return results;
    } finally {
      setIsDraining(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== "ios") return;

    if (!drainedRef.current) {
      drainedRef.current = true;
      drain();
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        drain();
      }
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { drain, isDraining };
}
