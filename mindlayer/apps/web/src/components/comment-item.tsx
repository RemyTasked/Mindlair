"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  User,
  EyeOff,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";
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

const stanceStyles: Record<string, { color: string; icon: typeof ThumbsUp; label: string }> = {
  agree: { color: C.green, icon: ThumbsUp, label: "Agrees" },
  disagree: { color: C.rose, icon: ThumbsDown, label: "Disagrees" },
  complicated: { color: C.blue, icon: HelpCircle, label: "Complicated" },
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface CommentItemProps {
  comment: CommentData;
  isPostAuthor: boolean;
  onReaction: (commentId: string, stance: string) => void;
  onHide: (commentId: string, hide: boolean) => void;
}

export function CommentItem({
  comment,
  isPostAuthor,
  onReaction,
  onHide,
}: CommentItemProps) {
  const [isHiding, setIsHiding] = useState(false);
  const stanceStyle = stanceStyles[comment.stance] || stanceStyles.complicated;
  const StanceIcon = stanceStyle.icon;

  const handleHide = async () => {
    setIsHiding(true);
    await onHide(comment.id, !comment.isHiddenByAuthor);
    setIsHiding(false);
  };

  if (comment.isHiddenByAuthor && !comment.isOwnComment && !isPostAuthor) {
    return null;
  }

  return (
    <motion.div
      style={{
        background: C.surface,
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${stanceStyle.color}`,
        padding: 16,
        opacity: comment.isHiddenByAuthor ? 0.6 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/profile/${comment.author.id}`}>
            {comment.author.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: C.border,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={16} style={{ color: C.muted }} />
              </div>
            )}
          </Link>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href={`/profile/${comment.author.id}`}
                style={{
                  color: C.text,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {comment.author.name || "Anonymous"}
              </Link>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 4,
                  background: `${stanceStyle.color}20`,
                  color: stanceStyle.color,
                }}
              >
                <StanceIcon size={10} />
                {stanceStyle.label}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: C.muted,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              <Clock size={10} />
              {formatRelativeTime(comment.createdAt)}
              {comment.pending && (
                <span style={{ color: C.accent }}>· Pending review</span>
              )}
              {comment.isHiddenByAuthor && (
                <span style={{ color: C.rose }}>· Hidden by author</span>
              )}
            </div>
          </div>
        </div>

        {comment.canHide && isPostAuthor && (
          <button
            onClick={handleHide}
            disabled={isHiding}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              fontSize: 11,
              border: "none",
              borderRadius: 4,
              background: C.bg,
              color: comment.isHiddenByAuthor ? C.green : C.muted,
              cursor: "pointer",
              opacity: isHiding ? 0.5 : 1,
            }}
          >
            {comment.isHiddenByAuthor ? (
              <>
                <Eye size={12} />
                Unhide
              </>
            ) : (
              <>
                <EyeOff size={12} />
                Hide
              </>
            )}
          </button>
        )}
      </div>

      <p
        style={{
          color: C.text,
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {comment.body}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <ReactionButton
          icon={ThumbsUp}
          count={comment.reactionCounts.agree}
          color={C.green}
          isActive={comment.userReaction === "agree"}
          onClick={() => onReaction(comment.id, "agree")}
          label="Agree"
        />
        <ReactionButton
          icon={ThumbsDown}
          count={comment.reactionCounts.disagree}
          color={C.rose}
          isActive={comment.userReaction === "disagree"}
          onClick={() => onReaction(comment.id, "disagree")}
          label="Disagree"
        />
        <ReactionButton
          icon={HelpCircle}
          count={comment.reactionCounts.complicated}
          color={C.blue}
          isActive={comment.userReaction === "complicated"}
          onClick={() => onReaction(comment.id, "complicated")}
          label="Complicated"
        />
      </div>
    </motion.div>
  );
}

interface ReactionButtonProps {
  icon: typeof ThumbsUp;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
  label: string;
}

function ReactionButton({
  icon: Icon,
  count,
  color,
  isActive,
  onClick,
  label,
}: ReactionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        fontSize: 12,
        border: "none",
        borderRadius: 4,
        background: isActive ? `${color}20` : "transparent",
        color: isActive ? color : C.muted,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={14} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
