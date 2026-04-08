"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Lock, Loader2 } from "lucide-react";
import { CommentComposer } from "./comment-composer";
import { CommentList } from "./comment-list";

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

export interface CommentData {
  id: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  stance: string;
  body: string;
  isHiddenByAuthor: boolean;
  isOwnComment: boolean;
  canHide: boolean;
  createdAt: string;
  reactionCounts: {
    agree: number;
    disagree: number;
    complicated: number;
  };
  userReaction: string | null;
  pending?: boolean;
}

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
  hasReacted: boolean;
  commentsEnabled?: boolean;
  onReactionRequired?: () => void;
}

export function CommentSection({
  postId,
  postAuthorId,
  hasReacted,
  commentsEnabled = true,
  onReactionRequired,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [isPostAuthor, setIsPostAuthor] = useState(false);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }
      
      const data = await response.json();
      
      setCommentCount(data.commentCount || 0);
      setIsPostAuthor(data.isPostAuthor || false);
      
      if (data.gated) {
        setComments([]);
      } else {
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments, hasReacted]);

  const handleCommentCreated = (newComment: CommentData) => {
    setComments((prev) => [newComment, ...prev]);
    setCommentCount((prev) => prev + 1);
  };

  const handleCommentReaction = async (commentId: string, stance: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stance }),
      });

      if (!response.ok) {
        throw new Error("Failed to react");
      }

      const data = await response.json();
      
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, reactionCounts: data.reactionCounts, userReaction: data.userReaction }
            : c
        )
      );
    } catch (err) {
      console.error("Error reacting to comment:", err);
    }
  };

  const handleHideComment = async (commentId: string, hide: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: hide ? "hide" : "unhide" }),
      });

      if (!response.ok) {
        throw new Error("Failed to moderate");
      }

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, isHiddenByAuthor: hide } : c
        )
      );
    } catch (err) {
      console.error("Error hiding comment:", err);
    }
  };

  const filteredComments = filter === "all"
    ? comments
    : comments.filter((c) => c.stance === filter);

  if (!commentsEnabled) {
    return (
      <div
        style={{
          padding: 20,
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <MessageSquare size={24} style={{ color: C.muted, margin: "0 auto 8px" }} />
        <p style={{ color: C.muted, fontSize: 14 }}>
          Comments are closed on this post
        </p>
      </div>
    );
  }

  if (!hasReacted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: 24,
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <Lock size={28} style={{ color: C.accent, margin: "0 auto 12px" }} />
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          React to unlock comments
        </h3>
        <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Share your position on this post to see what others think.
          {commentCount > 0 && (
            <span style={{ color: C.accent }}> {commentCount} comments waiting.</span>
          )}
        </p>
        {onReactionRequired && (
          <button
            onClick={onReactionRequired}
            style={{
              padding: "10px 20px",
              background: C.accent,
              color: C.bg,
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            React first
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h3
          style={{
            color: C.text,
            fontSize: 16,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <MessageSquare size={18} />
          {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
        </h3>

        <div style={{ display: "flex", gap: 6 }}>
          {["all", "agree", "disagree", "complicated"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                background: filter === f ? C.accent : C.bg,
                color: filter === f ? C.bg : C.textSoft,
                transition: "all 0.15s ease",
              }}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <CommentComposer
        postId={postId}
        onCommentCreated={handleCommentCreated}
      />

      {isLoading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
            color: C.muted,
          }}
        >
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : error ? (
        <div
          style={{
            padding: 20,
            background: C.surface,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            textAlign: "center",
            color: C.rose,
          }}
        >
          {error}
        </div>
      ) : (
        <CommentList
          comments={filteredComments}
          isPostAuthor={isPostAuthor}
          onReaction={handleCommentReaction}
          onHide={handleHideComment}
        />
      )}
    </motion.div>
  );
}
