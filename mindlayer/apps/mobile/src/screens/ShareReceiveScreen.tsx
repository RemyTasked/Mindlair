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

type Props = NativeStackScreenProps<RootStackParamList, "ShareReceive">;

export function ShareReceiveScreen({ route, navigation }: Props) {
  const { url: initialUrl, text: initialText, title: initialTitle } = route.params || {};
  const { clearSharedContent } = useShareIntent();

  const [url, setUrl] = useState(initialUrl || "");
  const [text, setText] = useState(initialText || "");
  const [title, setTitle] = useState(initialTitle || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedClaims, setSavedClaims] = useState<any[] | null>(null);

  const handleSave = async () => {
    if (!url && !text) {
      Alert.alert("Error", "Please enter a URL or some text to save");
      return;
    }

    setIsSaving(true);

    try {
      const result = await api.ingestContent({
        url: url || undefined,
        text: text || undefined,
        title: title || undefined,
        surface: "mobile_share",
        contentType: url ? "article" : "text",
      });

      if (result.success) {
        setSavedClaims(result.claims || []);
      } else {
        Alert.alert("Error", "Failed to save content. Please try again.");
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = () => {
    clearSharedContent();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  if (savedClaims !== null) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.successHeader}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Saved to Mindlair</Text>
            <Text style={styles.successSubtitle}>
              {savedClaims.length} claim{savedClaims.length !== 1 ? "s" : ""} extracted
            </Text>
          </View>

          {savedClaims.length > 0 && (
            <View style={styles.claimsSection}>
              <Text style={styles.claimsSectionTitle}>Extracted Claims</Text>
              {savedClaims.map((claim, index) => (
                <View key={index} style={styles.claimCard}>
                  <Text style={styles.claimText}>{claim.text}</Text>
                  {claim.concepts && claim.concepts.length > 0 && (
                    <View style={styles.conceptsRow}>
                      {claim.concepts.slice(0, 3).map((concept: string, i: number) => (
                        <Text key={i} style={styles.conceptTag}>
                          {concept}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.reviewHint}>
            Review and react to these claims in your next digest session.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor="#71717a"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Text Content</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Paste text content to analyze..."
            placeholderTextColor="#71717a"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a title for reference"
            placeholderTextColor="#71717a"
            value={title}
            onChangeText={setTitle}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton]}
          onPress={handleDone}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save & Analyze</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#a1a1aa",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fafafa",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerText: {
    color: "#71717a",
    fontSize: 14,
    marginHorizontal: 12,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fafafa",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  successHeader: {
    alignItems: "center",
    paddingVertical: 32,
  },
  successIcon: {
    fontSize: 48,
    color: "#10b981",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fafafa",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#a1a1aa",
    marginTop: 4,
  },
  claimsSection: {
    marginTop: 16,
  },
  claimsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#a1a1aa",
    marginBottom: 12,
  },
  claimCard: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  claimText: {
    fontSize: 15,
    color: "#fafafa",
    lineHeight: 22,
  },
  conceptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  conceptTag: {
    fontSize: 12,
    color: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewHint: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 20,
  },
  doneButton: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
