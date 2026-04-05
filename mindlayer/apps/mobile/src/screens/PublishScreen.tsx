import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { api } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Publish">;

type AuthorStance = "arguing" | "exploring" | "steelmanning";

const STANCE_CONFIG = {
  arguing: {
    label: "Arguing",
    description: "I believe this and am making the case for it",
    color: "#a3c47a",
  },
  exploring: {
    label: "Exploring",
    description: "I'm genuinely uncertain about this",
    color: "#d4915a",
  },
  steelmanning: {
    label: "Steelmanning",
    description: "Presenting a position I may not hold",
    color: "#4a9eff",
  },
};

export function PublishScreen({ navigation }: Props) {
  const [headlineClaim, setHeadlineClaim] = useState("");
  const [body, setBody] = useState("");
  const [authorStance, setAuthorStance] = useState<AuthorStance>("arguing");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = headlineClaim.length;
  const isValidClaim = charCount >= 10 && charCount <= 280;
  const isValidBody = wordCount >= 100 && wordCount <= 2000;
  const canPublish = isValidClaim && isValidBody && !isSubmitting && !isSaving;

  const saveDraft = async () => {
    if (!headlineClaim.trim()) return;
    
    setIsSaving(true);
    try {
      if (draftId) {
        await api.updatePost(draftId, {
          headlineClaim,
          postBody: body,
          authorStance,
        });
      } else {
        const result = await api.createPost({
          headlineClaim,
          postBody: body,
          authorStance,
        });
        setDraftId(result.post.id);
      }
      Alert.alert("Saved", "Draft saved successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!canPublish) return;
    
    setIsSubmitting(true);
    try {
      let postId = draftId;
      
      if (!postId) {
        const createResult = await api.createPost({
          headlineClaim,
          postBody: body,
          authorStance,
        });
        postId = createResult.post.id;
      }
      
      await api.publishPost(postId);
      Alert.alert("Published!", "Your post is now live", [
        { text: "View Feed", onPress: () => navigation.replace("Feed") },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to publish post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Publish</Text>
            <Text style={styles.subtitle}>
              Share your thinking. Every post shapes your belief map.
            </Text>
          </View>

          <View style={styles.stanceSection}>
            <Text style={styles.label}>Your Stance</Text>
            <View style={styles.stanceButtons}>
              {(Object.keys(STANCE_CONFIG) as AuthorStance[]).map((stance) => {
                const config = STANCE_CONFIG[stance];
                const isSelected = authorStance === stance;
                return (
                  <TouchableOpacity
                    key={stance}
                    style={[
                      styles.stanceButton,
                      isSelected && { 
                        backgroundColor: `${config.color}20`,
                        borderColor: config.color,
                      },
                    ]}
                    onPress={() => setAuthorStance(stance)}
                  >
                    <View style={[styles.stanceDot, { backgroundColor: isSelected ? config.color : "#7a7469" }]} />
                    <Text style={[styles.stanceLabel, isSelected && { color: "#e8e4dc" }]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.stanceDescription}>
              {STANCE_CONFIG[authorStance].description}
            </Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Headline Claim</Text>
              <Text style={[styles.counter, !isValidClaim && charCount > 0 && styles.counterError]}>
                {charCount}/280
              </Text>
            </View>
            <TextInput
              style={styles.headlineInput}
              placeholder="State a specific, falsifiable position"
              placeholderTextColor="#7a7469"
              value={headlineClaim}
              onChangeText={setHeadlineClaim}
              multiline
              maxLength={280}
            />
            <Text style={styles.hint}>
              Example: "Remote work permanently reduced urban commercial real estate value"
            </Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Your Argument</Text>
              <Text style={[
                styles.counter,
                wordCount > 0 && (wordCount < 100 || wordCount > 2000) && styles.counterError,
              ]}>
                {wordCount} / 100-2000 words
              </Text>
            </View>
            <TextInput
              style={styles.bodyInput}
              placeholder="Make your case. Focus on the argument, not formatting. Use emojis to express yourself! 😊"
              placeholderTextColor="#7a7469"
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens when you publish:</Text>
            <Text style={styles.infoText}>
              Your post goes through AI screening, then claim extraction. The claims become part of your belief map — publishing is the strongest signal of what you actually think.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.saveDraftButton}
            onPress={saveDraft}
            disabled={isSaving || !headlineClaim.trim()}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#c4bfb4" />
            ) : (
              <Text style={styles.saveDraftText}>Save Draft</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.publishButton, !canPublish && styles.publishButtonDisabled]}
            onPress={publish}
            disabled={!canPublish}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishButtonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0e0c",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#e8e4dc",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#c4bfb4",
  },
  stanceSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#c4bfb4",
    marginBottom: 8,
  },
  stanceButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  stanceButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2825",
    backgroundColor: "#1a1916",
  },
  stanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stanceLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7a7469",
  },
  stanceDescription: {
    fontSize: 13,
    color: "#7a7469",
    fontStyle: "italic",
  },
  inputSection: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    color: "#7a7469",
  },
  counterError: {
    color: "#e57373",
  },
  headlineInput: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2825",
    padding: 16,
    color: "#e8e4dc",
    fontSize: 18,
    fontWeight: "500",
    minHeight: 80,
  },
  hint: {
    fontSize: 12,
    color: "#7a7469",
    marginTop: 8,
  },
  bodyInput: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2825",
    padding: 16,
    color: "#e8e4dc",
    fontSize: 15,
    lineHeight: 22,
    minHeight: 200,
  },
  infoBox: {
    backgroundColor: "#d4915a15",
    borderWidth: 1,
    borderColor: "#d4915a30",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#d4915a",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#c4bfb4",
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2825",
    backgroundColor: "#0f0e0c",
  },
  saveDraftButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2825",
    alignItems: "center",
    justifyContent: "center",
  },
  saveDraftText: {
    color: "#c4bfb4",
    fontSize: 16,
    fontWeight: "500",
  },
  publishButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#d4915a",
    alignItems: "center",
    justifyContent: "center",
  },
  publishButtonDisabled: {
    backgroundColor: "#2a2825",
  },
  publishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
