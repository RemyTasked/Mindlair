"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Check,
  Edit2,
  RefreshCcw,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";

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

interface CaptureConfirmationProps {
  captureId: string;
  candidateClaims: CandidateClaim[];
  modality: "share_sheet" | "voice" | "typed" | "extension";
  onComplete: () => void;
  onDismiss: () => void;
}

const STANCE_CYCLE: Stance[] = ["agree", "complicated", "disagree"];

const STANCE_COLORS: Record<Stance, { bg: string; text: string; border: string }> = {
  agree: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  disagree: {
    bg: "bg-rose-50 dark:bg-rose-900/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
  complicated: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
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

export function CaptureConfirmation({
  captureId,
  candidateClaims,
  modality,
  onComplete,
  onDismiss,
}: CaptureConfirmationProps) {
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
  const autoCommitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoCommitCountdown, setAutoCommitCountdown] = useState<number | null>(null);

  const shouldAutoCommit = modality === "share_sheet";
  const MAX_VISIBLE_CLAIMS = modality === "voice" ? 5 : 10;
  const activeClaims = decisions.filter((d) => !d.dropped);
  const visibleClaims = showOverflow
    ? activeClaims
    : activeClaims.slice(0, MAX_VISIBLE_CLAIMS);
  const overflowCount = activeClaims.length - MAX_VISIBLE_CLAIMS;

  const sendFeedback = useCallback(
    async (
      claimText: string,
      action: "kept" | "dropped" | "edited" | "stance_flipped",
      stanceBefore?: string,
      stanceAfter?: string,
      finalText?: string
    ) => {
      try {
        await fetch(`/api/captures/${captureId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimText,
            action,
            stanceBefore,
            stanceAfter,
            finalText,
          }),
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
      const response = await fetch(`/api/captures/${captureId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claims: decisions.map((d) => ({
            text: d.text,
            originalText: d.originalText,
            stance: d.stance,
            dropped: d.dropped,
            edited: d.edited,
            matchedClaimId: d.matchedClaimId,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save");
      }

      onComplete();
    } catch (err) {
      console.error("Commit error:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
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
        setAutoCommitCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null));
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
    const nextStance = STANCE_CYCLE[(currentStanceIndex + 1) % STANCE_CYCLE.length];
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden p-8 text-center"
      >
        <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">
          No claims extracted. Save anyway?
        </p>
        <div className="mt-6 space-y-2">
          <Button onClick={onComplete} className="w-full">
            Save Reference
          </Button>
          <Button onClick={onDismiss} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
    >
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Confirm claims
          </h2>
          <p className="text-sm text-zinc-500">
            {activeClaims.length} claim{activeClaims.length !== 1 ? "s" : ""} extracted
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
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
                <motion.div
                  key={claim.originalText}
                  layout
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEdit}>
                      Save
                    </Button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={claim.originalText}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                className={`group p-3 rounded-xl border ${colors.border} ${colors.bg} transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-50">
                      {claim.text}
                    </p>
                    {isReinforce && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <RefreshCcw className="w-3 h-3" />
                        You've said this before — keep to reinforce
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <button
                    onClick={() => handleFlipStance(actualIndex)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                  >
                    {STANCE_LABELS[claim.stance]}
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(actualIndex)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-700/50"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDrop(actualIndex)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-700/50"
                      title="Drop"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {overflowCount > 0 && !showOverflow && (
          <button
            onClick={() => setShowOverflow(true)}
            className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center justify-center gap-1"
          >
            Show {overflowCount} more
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
        {autoCommitCountdown !== null && (
          <p className="text-xs text-zinc-500 text-center mb-3">
            Auto-saving in {autoCommitCountdown}s...{" "}
            <button
              onClick={cancelAutoCommit}
              className="text-rose-500 hover:underline"
            >
              Cancel
            </button>
          </p>
        )}

        <Button
          onClick={handleCommit}
          disabled={isSubmitting || activeClaims.length === 0}
          className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Add to map
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
