"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { CommentItem } from "./comment-item";
import type { CommentData } from "./comment-section";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
};

interface CommentListProps {
  comments: CommentData[];
  isPostAuthor: boolean;
  onReaction: (commentId: string, stance: string) => void;
  onHide: (commentId: string, hide: boolean) => void;
}

export function CommentList({
  comments,
  isPostAuthor,
  onReaction,
  onHide,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: 40,
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <MessageSquare
          size={32}
          style={{ color: C.muted, margin: "0 auto 12px" }}
        />
        <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 4 }}>
          No comments yet
        </p>
        <p style={{ color: C.muted, fontSize: 13 }}>
          Be the first to share your take
        </p>
      </motion.div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <AnimatePresence initial={false}>
        {comments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.03 }}
          >
            <CommentItem
              comment={comment}
              isPostAuthor={isPostAuthor}
              onReaction={onReaction}
              onHide={onHide}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
