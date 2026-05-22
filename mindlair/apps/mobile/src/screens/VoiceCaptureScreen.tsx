import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { CaptureConfirmationSheet } from "../components/CaptureConfirmationSheet";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceCapture">;

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

// expo-av is loaded dynamically so the screen still imports cleanly when the
// dependency hasn't been added (e.g. running the JS bundle in a smoke test).
type ExpoAVAudioModule = {
  Audio: {
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    setAudioModeAsync: (config: Record<string, unknown>) => Promise<void>;
    Recording: {
      createAsync: (
        options: Record<string, unknown>
      ) => Promise<{ recording: ExpoAVRecording }>;
    };
    RecordingOptionsPresets: {
      HIGH_QUALITY: Record<string, unknown>;
    };
    InterruptionModeIOS?: {
      DoNotMix: number;
    };
    InterruptionModeAndroid?: {
      DoNotMix: number;
    };
  };
};

interface ExpoAVRecording {
  stopAndUnloadAsync: () => Promise<void>;
  getURI: () => string | null;
  getStatusAsync: () => Promise<{ durationMillis?: number }>;
}

async function loadExpoAV(): Promise<ExpoAVAudioModule | null> {
  try {
    // @ts-expect-error - dynamic import; expo-av is optional at type level.
    const mod = await import("expo-av");
    return mod as ExpoAVAudioModule;
  } catch {
    return null;
  }
}

export function VoiceCaptureScreen({ route, navigation }: Props) {
  const autoStart = route.params?.autoStart ?? true;
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<CandidateClaim[]>([]);

  const recordingRef = useRef<ExpoAVRecording | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (autoStart) {
      startRecording();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setState("requesting_permission");
    setErrorMessage(null);

    const expoAV = await loadExpoAV();
    if (!expoAV) {
      setState("error");
      setErrorMessage(
        "Voice capture requires expo-av. Run `npx expo install expo-av` and rebuild."
      );
      return;
    }

    try {
      const permission = await expoAV.Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setState("error");
        setErrorMessage("Microphone permission denied.");
        return;
      }

      await expoAV.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { recording } = await expoAV.Audio.Recording.createAsync(
        expoAV.Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to start recording"
      );
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState("uploading");

    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const durationMs = status.durationMillis ?? duration * 1000;

      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI");
      }

      const fileExt = uri.split(".").pop() || "m4a";
      const mimeType =
        fileExt === "m4a"
          ? "audio/mp4"
          : fileExt === "wav"
          ? "audio/wav"
          : "audio/webm";

      // RN FormData wants { uri, name, type } for file fields
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `voice-capture.${fileExt}`,
        type: mimeType,
      } as unknown as Blob);
      formData.append("purpose", "voice_capture");

      const apiBase =
        (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api").replace(
          /\/$/,
          ""
        );
      const uploadResponse = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errBody = await uploadResponse.text();
        throw new Error(errBody || "Upload failed");
      }

      const uploadData = await uploadResponse.json();

      setState("processing");

      const captureResponse = await api.createCapture({
        modality: "voice",
        rawAudioUrl: uploadData.url,
        rawAudioMs: uploadData.durationMs ?? durationMs,
      });

      setCaptureId(captureResponse.captureId);
      pollForClaims(captureResponse.captureId);
    } catch (err) {
      console.error("Stop/upload error:", err);
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload"
      );
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    navigation.goBack();
  };

  const pollForClaims = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const data = await api.getCapture(id);

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
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    };

    poll();
  };

  const handleConfirmationComplete = () => {
    setState("success");
    setTimeout(() => navigation.goBack(), 1500);
  };

  const handleConfirmationDismiss = async () => {
    if (captureId) {
      try {
        await api.dismissCapture(captureId);
      } catch (err) {
        console.error("Dismiss error:", err);
      }
    }
    navigation.goBack();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (state === "confirming" && captureId) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <CaptureConfirmationSheet
          captureId={captureId}
          candidateClaims={candidateClaims}
          modality="voice"
          onComplete={handleConfirmationComplete}
          onDismiss={handleConfirmationDismiss}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.body}>
        {state === "requesting_permission" && (
          <>
            <ActivityIndicator size="large" color="#d4915a" />
            <Text style={styles.statusText}>Requesting microphone access...</Text>
          </>
        )}

        {state === "recording" && (
          <>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
            </View>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            <Text style={styles.statusText}>Recording...</Text>
          </>
        )}

        {(state === "uploading" || state === "processing") && (
          <>
            <ActivityIndicator size="large" color="#d4915a" />
            <Text style={styles.statusText}>
              {state === "uploading"
                ? "Uploading audio..."
                : "Transcribing & extracting claims..."}
            </Text>
          </>
        )}

        {state === "success" && (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Added to your map!</Text>
          </>
        )}

        {state === "error" && (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={startRecording}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        {state === "recording" && (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Text style={styles.stopButtonText}>Stop & Save</Text>
          </TouchableOpacity>
        )}
        {(state === "idle" ||
          state === "recording" ||
          state === "error") && (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0e0c",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  recordingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
  },
  durationText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#e8e4dc",
    fontVariant: ["tabular-nums"],
  },
  statusText: {
    fontSize: 14,
    color: "#7a7469",
    marginTop: 16,
    textAlign: "center",
  },
  successIcon: {
    fontSize: 80,
    color: "#22c55e",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e8e4dc",
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e8e4dc",
  },
  errorBody: {
    fontSize: 14,
    color: "#7a7469",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#d4915a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    gap: 8,
  },
  stopButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  cancelButtonText: {
    color: "#e8e4dc",
    fontSize: 15,
    fontWeight: "500",
  },
});
