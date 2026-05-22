import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { api } from "../api/client";

interface CandidateClaim {
  text: string;
  type: string;
  confidence: number;
  concepts: string[];
  aiStance?: string;
  matchedClaimId?: string;
  matchedClaimText?: string;
}

type Stance = "agree" | "disagree" | "complicated";

interface ClaimDecision {
  text: string;
  originalText: string;
  stance: Stance;
  dropped: boolean;
  edited: boolean;
  matchedClaimId?: string;
}

interface CaptureConfirmationSheetProps {
  captureId: string;
  candidateClaims: CandidateClaim[];
  modality: "share_sheet" | "voice" | "typed" | "extension";
  onComplete: () => void;
  onDismiss: () => void;
}

const STANCE_CYCLE: Stance[] = ["agree", "complicated", "disagree"];

const STANCE_COLORS: Record<Stance, { bg: string; text: string }> = {
  agree: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
  disagree: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
  complicated: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
};

const STANCE_LABELS: Record<Stance, string> = {
  agree: "Agree",
  disagree: "Disagree",
  complicated: "Complicated",
};

function aiStanceToUserStance(aiStance?: string): Stance {
  switch (aiStance) {
    case "endorse":
      return "agree";
    case "dispute":
      return "disagree";
    case "complicated":
      return "complicated";
    case "changed_my_mind":
      return "agree";
    default:
      return "agree";
  }
}

export function CaptureConfirmationSheet({
  captureId,
  candidateClaims,
  modality,
  onComplete,
  onDismiss,
}: CaptureConfirmationSheetProps) {
  const [decisions, setDecisions] = useState<ClaimDecision[]>(() =>
    candidateClaims.map((claim) => ({
      text: claim.text,
      originalText: claim.text,
      stance: aiStanceToUserStance(claim.aiStance),
      dropped: false,
      edited: false,
      matchedClaimId: claim.matchedClaimId,
    }))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [autoCommitCountdown, setAutoCommitCountdown] = useState<number | null>(
    null
  );
  const autoCommitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const shouldAutoCommit = modality === "share_sheet";
  const MAX_VISIBLE_CLAIMS = modality === "voice" ? 5 : 10;
  const activeClaims = decisions.filter((d) => !d.dropped);
  const visibleClaims = showOverflow
    ? activeClaims
    : activeClaims.slice(0, MAX_VISIBLE_CLAIMS);
  const overflowCount = activeClaims.length - MAX_VISIBLE_CLAIMS;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const sendFeedback = useCallback(
    async (
      claimText: string,
      action: "kept" | "dropped" | "edited" | "stance_flipped",
      stanceBefore?: string,
      stanceAfter?: string,
      finalText?: string
    ) => {
      try {
        await api.recordCaptureFeedback(captureId, {
          claimText,
          action,
          stanceBefore,
          stanceAfter,
          finalText,
        });
      } catch (err) {
        console.error("Feedback error:", err);
      }
    },
    [captureId]
  );

  const handleCommit = useCallback(async () => {
    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
      autoCommitTimerRef.current = null;
    }
    setAutoCommitCountdown(null);
    setIsSubmitting(true);
    setError(null);

    try {
      await api.commitCapture(captureId, {
        claims: decisions.map((d) => ({
          text: d.text,
          originalText: d.originalText,
          stance: d.stance,
          dropped: d.dropped,
          edited: d.edited,
          matchedClaimId: d.matchedClaimId,
        })),
      });
      onComplete();
    } catch (err) {
      console.error("Commit error:", err);
      setError("Failed to save. Please try again.");
      setIsSubmitting(false);
    }
  }, [captureId, decisions, onComplete]);

  useEffect(() => {
    if (shouldAutoCommit && activeClaims.length > 0) {
      setAutoCommitCountdown(4);
      autoCommitTimerRef.current = setTimeout(() => {
        handleCommit();
      }, 4000);

      const countdownInterval = setInterval(() => {
        setAutoCommitCountdown((prev) =>
          prev !== null && prev > 1 ? prev - 1 : null
        );
      }, 1000);

      return () => {
        if (autoCommitTimerRef.current) {
          clearTimeout(autoCommitTimerRef.current);
        }
        clearInterval(countdownInterval);
      };
    }
  }, [shouldAutoCommit, activeClaims.length, handleCommit]);

  const cancelAutoCommit = () => {
    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
      autoCommitTimerRef.current = null;
    }
    setAutoCommitCountdown(null);
  };

  const handleDrop = (index: number) => {
    cancelAutoCommit();
    const claim = decisions[index];
    sendFeedback(claim.originalText, "dropped", claim.stance);
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, dropped: true } : d))
    );
  };

  const handleFlipStance = (index: number) => {
    cancelAutoCommit();
    const claim = decisions[index];
    const currentStanceIndex = STANCE_CYCLE.indexOf(claim.stance);
    const nextStance =
      STANCE_CYCLE[(currentStanceIndex + 1) % STANCE_CYCLE.length];
    sendFeedback(claim.originalText, "stance_flipped", claim.stance, nextStance);
    setDecisions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, stance: nextStance } : d))
    );
  };

  const startEdit = (index: number) => {
    cancelAutoCommit();
    setEditingIndex(index);
    setEditText(decisions[index].text);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const claim = decisions[editingIndex];
    const newText = editText.trim();
    if (newText && newText !== claim.text) {
      sendFeedback(claim.originalText, "edited", undefined, undefined, newText);
      setDecisions((prev) =>
        prev.map((d, i) =>
          i === editingIndex ? { ...d, text: newText, edited: true } : d
        )
      );
    }
    setEditingIndex(null);
    setEditText("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
  };

  if (activeClaims.length === 0) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>No claims extracted</Text>
          <Text style={styles.emptySubtext}>Save anyway?</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onComplete}>
              <Text style={styles.primaryButtonText}>Save Reference</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Confirm claims</Text>
          <Text style={styles.headerSubtitle}>
            {activeClaims.length} claim{activeClaims.length !== 1 ? "s" : ""}{" "}
            extracted
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.claimsList}>
        {visibleClaims.map((claim, visibleIndex) => {
          const actualIndex = decisions.findIndex(
            (d) => d.originalText === claim.originalText && !d.dropped
          );
          const originalClaim = candidateClaims.find(
            (c) => c.text === claim.originalText
          );
          const isReinforce = Boolean(originalClaim?.matchedClaimId);
          const colors = STANCE_COLORS[claim.stance];

          if (editingIndex === actualIndex) {
            return (
              <View key={claim.originalText} style={styles.editingCard}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancelButton}
                    onPress={cancelEdit}
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editSaveButton}
                    onPress={saveEdit}
                  >
                    <Text style={styles.editSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View
              key={claim.originalText}
              style={[styles.claimCard, { backgroundColor: colors.bg }]}
            >
              <Text style={styles.claimText}>{claim.text}</Text>
              {isReinforce && (
                <Text style={styles.reinforceBadge}>
                  🔄 You've said this before — keep to reinforce
                </Text>
              )}

              <View style={styles.claimActions}>
                <TouchableOpacity
                  onPress={() => handleFlipStance(actualIndex)}
                  style={[
                    styles.stanceButton,
                    { backgroundColor: colors.bg },
                  ]}
                >
                  <Text style={[styles.stanceText, { color: colors.text }]}>
                    {STANCE_LABELS[claim.stance]}
                  </Text>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => startEdit(actualIndex)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDrop(actualIndex)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {overflowCount > 0 && !showOverflow && (
          <TouchableOpacity
            style={styles.overflowButton}
            onPress={() => setShowOverflow(true)}
          >
            <Text style={styles.overflowText}>
              Show {overflowCount} more ▼
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footer}>
        {autoCommitCountdown !== null && (
          <Text style={styles.autoCommitText}>
            Auto-saving in {autoCommitCountdown}s...{" "}
            <Text style={styles.autoCommitCancel} onPress={cancelAutoCommit}>
              Cancel
            </Text>
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.commitButton,
            (isSubmitting || activeClaims.length === 0) &&
              styles.commitButtonDisabled,
          ]}
          onPress={handleCommit}
          disabled={isSubmitting || activeClaims.length === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.commitButtonText}>Add to map</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0e0c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2825",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e8e4dc",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#7a7469",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#7a7469",
  },
  claimsList: {
    flex: 1,
    padding: 16,
  },
  claimCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  claimText: {
    fontSize: 15,
    color: "#e8e4dc",
    lineHeight: 22,
  },
  reinforceBadge: {
    fontSize: 12,
    color: "#f59e0b",
    marginTop: 8,
  },
  claimActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  stanceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stanceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  editingCard: {
    backgroundColor: "#1a1916",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2825",
  },
  editInput: {
    backgroundColor: "#0f0e0c",
    borderRadius: 8,
    padding: 12,
    color: "#e8e4dc",
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  editCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2a2825",
  },
  editCancelText: {
    color: "#e8e4dc",
    fontSize: 14,
    fontWeight: "500",
  },
  editSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#d4915a",
  },
  editSaveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  overflowButton: {
    padding: 12,
    alignItems: "center",
  },
  overflowText: {
    color: "#7a7469",
    fontSize: 14,
  },
  errorBar: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2825",
  },
  autoCommitText: {
    fontSize: 12,
    color: "#7a7469",
    textAlign: "center",
    marginBottom: 12,
  },
  autoCommitCancel: {
    color: "#d4915a",
  },
  commitButton: {
    backgroundColor: "#d4915a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  commitButtonDisabled: {
    opacity: 0.5,
  },
  commitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e8e4dc",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#7a7469",
    marginTop: 4,
  },
  emptyActions: {
    marginTop: 24,
    gap: 12,
    width: "100%",
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
    backgroundColor: "#2a2825",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#e8e4dc",
    fontSize: 16,
    fontWeight: "500",
  },
});
