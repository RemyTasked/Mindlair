import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { useShareIntent } from "../context/ShareIntentContext";
import { api } from "../api/client";
import { CaptureConfirmationSheet } from "../components/CaptureConfirmationSheet";

type Props = NativeStackScreenProps<RootStackParamList, "ShareReceive">;

interface CandidateClaim {
  text: string;
  type: string;
  confidence: number;
  concepts: string[];
  aiStance?: string;
  matchedClaimId?: string;
  matchedClaimText?: string;
}

type ShareState =
  | "ready"
  | "submitting"
  | "polling"
  | "confirming"
  | "success"
  | "error";

export function ShareReceiveScreen({ route, navigation }: Props) {
  const { url: initialUrl, text: initialText, title: initialTitle } =
    route.params || {};
  const { clearSharedContent } = useShareIntent();

  const [url, setUrl] = useState(initialUrl || "");
  const [reaction, setReaction] = useState("");
  const [title] = useState(initialTitle || "");
  const [state, setState] = useState<ShareState>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<CandidateClaim[]>([]);

  useEffect(() => {
    if (initialText && !url) {
      const urlMatch = initialText.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        setUrl(urlMatch[0]);
      } else {
        setReaction(initialText);
      }
    }
  }, [initialText, url]);

  const handleDone = () => {
    clearSharedContent();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const submitCapture = async (includeReaction: boolean) => {
    setState("submitting");
    setErrorMessage(null);

    try {
      const response = await api.createCapture({
        modality: "share_sheet",
        rawText: includeReaction ? reaction.trim() : undefined,
        source: url
          ? {
              url,
              title: title || undefined,
              contentType: "article",
            }
          : undefined,
      });

      setCaptureId(response.captureId);

      if (!includeReaction) {
        setState("success");
        return;
      }

      setState("polling");
      pollForClaims(response.captureId);
    } catch (err) {
      console.error("Submit error:", err);
      setState("error");
      setErrorMessage("Failed to save. Please try again.");
    }
  };

  const pollForClaims = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 30;

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
          setTimeout(poll, 750);
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

  const handleSaveReference = () => submitCapture(false);

  const handleSaveWithReaction = () => {
    if (!reaction.trim()) {
      Alert.alert("Add a reaction", "Type your thoughts before saving.");
      return;
    }
    submitCapture(true);
  };

  const handleConfirmationComplete = () => {
    setState("success");
  };

  const handleConfirmationDismiss = async () => {
    if (captureId) {
      try {
        await api.dismissCapture(captureId);
      } catch (err) {
        console.error("Dismiss error:", err);
      }
    }
    handleDone();
  };

  if (state === "confirming" && captureId) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <CaptureConfirmationSheet
          captureId={captureId}
          candidateClaims={candidateClaims}
          modality="share_sheet"
          onComplete={handleConfirmationComplete}
          onDismiss={handleConfirmationDismiss}
        />
      </SafeAreaView>
    );
  }

  if (state === "success") {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Saved to Mindlair</Text>
          <Text style={styles.successSubtitle}>
            {reaction
              ? "Claims extracted and added to your map"
              : "Reference saved — react later from your inbox"}
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === "polling" || state === "submitting") {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#d4915a" />
          <Text style={styles.loadingText}>
            {state === "submitting"
              ? "Saving capture..."
              : "Extracting claims..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {url ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>SHARED LINK</Text>
            {title ? <Text style={styles.previewTitle}>{title}</Text> : null}
            <Text style={styles.previewUrl} numberOfLines={1}>
              {url}
            </Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>What do you think?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add your reaction, opinion, or insight..."
            placeholderTextColor="#7a7469"
            value={reaction}
            onChangeText={setReaction}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSaveWithReaction}
          disabled={!reaction.trim()}
        >
          <Text style={styles.primaryButtonText}>Save with reaction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleSaveReference}
        >
          <Text style={styles.secondaryButtonText}>
            Save reference (react later)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleDone}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0e0c",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  previewCard: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#d4915a",
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e8e4dc",
    marginBottom: 4,
  },
  previewUrl: {
    fontSize: 13,
    color: "#7a7469",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#c4bfb4",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#e8e4dc",
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2825",
  },
  primaryButton: {
    backgroundColor: "#d4915a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  secondaryButtonText: {
    color: "#e8e4dc",
    fontSize: 15,
    fontWeight: "500",
  },
  skipButton: {
    padding: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#7a7469",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: "#c4bfb4",
    marginTop: 16,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successIcon: {
    fontSize: 64,
    color: "#22c55e",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e8e4dc",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#7a7469",
    marginTop: 8,
    textAlign: "center",
  },
  doneButton: {
    backgroundColor: "#d4915a",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 32,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
