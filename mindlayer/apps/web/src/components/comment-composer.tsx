"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, HelpCircle, Send, Loader2, AlertCircle, Smile, X } from "lucide-react";
import type { CommentData } from "./comment-section";

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "🙄", "😬"],
  "Gestures": ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪", "👈", "👉", "👆", "👇", "☝️", "✌️", "🤞", "🤟", "🤘", "🤙", "👀"],
  "Symbols": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "✨", "⚡", "🔥", "💥", "💫", "💯", "✅", "❌", "❓", "❗", "⚠️"],
};

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
  defaultStance?: string | null;
  onCommentCreated: (comment: CommentData) => void;
}

const stanceOptions = [
  { value: "agree", label: "Agrees", icon: ThumbsUp, color: C.green },
  { value: "disagree", label: "Disagrees", icon: ThumbsDown, color: C.rose },
  { value: "complicated", label: "Complicated", icon: HelpCircle, color: C.blue },
];

export function CommentComposer({ postId, defaultStance, onCommentCreated }: CommentComposerProps) {
  const [stance, setStance] = useState<string | null>(defaultStance || null);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = cursorPositionRef.current;
    const newBody = body.slice(0, start) + emoji + body.slice(start);
    setBody(newBody);
    
    setTimeout(() => {
      const newPosition = start + emoji.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
      cursorPositionRef.current = newPosition;
    }, 0);
    
    setShowEmojiPicker(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    cursorPositionRef.current = e.target.selectionStart;
  };

  const handleTextSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    cursorPositionRef.current = (e.target as HTMLTextAreaElement).selectionStart;
  };

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

      <div style={{ padding: 16, position: "relative" }}>
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleTextChange}
            onSelect={handleTextSelect}
            onClick={handleTextSelect}
            placeholder="Add your take — 150 words max... Use emojis! 😊"
            disabled={!stance || isSubmitting}
            style={{
              width: "100%",
              minHeight: 100,
              padding: 12,
              paddingRight: 48,
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

          {/* Emoji Picker Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!stance || isSubmitting}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              padding: 6,
              background: showEmojiPicker ? `${C.accent}20` : "transparent",
              border: "none",
              borderRadius: 4,
              cursor: stance && !isSubmitting ? "pointer" : "not-allowed",
              opacity: stance ? 1 : 0.5,
            }}
          >
            <Smile size={18} style={{ color: showEmojiPicker ? C.accent : C.muted }} />
          </button>
        </div>

        {/* Emoji Picker Dropdown */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: "absolute",
                right: 16,
                top: 56,
                zIndex: 50,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                width: 280,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: C.textSoft, fontSize: 12, fontWeight: 500 }}>Pick an emoji</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                >
                  <X size={14} style={{ color: C.muted }} />
                </button>
              </div>
              
              {/* Category Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEmojiCategory(cat)}
                    style={{
                      background: emojiCategory === cat ? `${C.accent}20` : "transparent",
                      border: `1px solid ${emojiCategory === cat ? C.accent : C.border}`,
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontSize: 10,
                      color: emojiCategory === cat ? C.accent : C.muted,
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Emoji Grid */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(8, 1fr)", 
                gap: 2,
                maxHeight: 140,
                overflowY: "auto",
              }}>
                {EMOJI_CATEGORIES[emojiCategory].map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => insertEmoji(emoji)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 18,
                      padding: 4,
                      cursor: "pointer",
                      borderRadius: 4,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.border)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
