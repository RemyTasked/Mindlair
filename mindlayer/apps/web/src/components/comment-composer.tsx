"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, HelpCircle, Send, Loader2, AlertCircle } from "lucide-react";
import type { CommentData } from "./comment-section";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  green: "#a3c47a",
  rose: "#e57373",
  blue: "#4a9eff",
};

const MAX_WORDS = 150;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

interface CommentComposerProps {
  postId: string;
  onCommentCreated: (comment: CommentData) => void;
}

const stanceOptions = [
  { value: "agree", label: "Agrees", icon: ThumbsUp, color: C.green },
  { value: "disagree", label: "Disagrees", icon: ThumbsDown, color: C.rose },
  { value: "complicated", label: "Complicated", icon: HelpCircle, color: C.blue },
];

export function CommentComposer({ postId, onCommentCreated }: CommentComposerProps) {
  const [stance, setStance] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = countWords(body);
  const isOverLimit = wordCount > MAX_WORDS;
  const canSubmit = stance && body.trim().length > 0 && !isOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stance, body: body.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create comment");
      }

      onCommentCreated(data.comment);
      setStance(null);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        background: C.surface,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: C.muted, fontSize: 13 }}>Your position:</span>
        {stanceOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = stance === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setStance(option.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: isSelected ? `${option.color}20` : C.bg,
                color: isSelected ? option.color : C.textSoft,
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={14} />
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            stance
              ? "Add your take — 150 words max..."
              : "Select your position above to start writing..."
          }
          disabled={!stance || isSubmitting}
          style={{
            width: "100%",
            minHeight: 100,
            padding: 12,
            background: C.bg,
            border: `1px solid ${isOverLimit ? C.rose : C.border}`,
            borderRadius: 6,
            color: C.text,
            fontSize: 14,
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
            opacity: stance ? 1 : 0.5,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: isOverLimit ? C.rose : C.muted,
            }}
          >
            {wordCount}/{MAX_WORDS} words
          </span>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 6,
              cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? C.accent : C.border,
              color: canSubmit ? C.bg : C.muted,
              transition: "all 0.15s ease",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send size={14} />
                Post comment
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                padding: "10px 12px",
                background: `${C.rose}15`,
                borderRadius: 6,
                color: C.rose,
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
