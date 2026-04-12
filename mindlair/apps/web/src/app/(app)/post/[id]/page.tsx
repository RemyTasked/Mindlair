"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/comment-section";
import { 
  User,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  SkipForward,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Eye,
  Lightbulb,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

interface PostDetail {
  id: string;
  headlineClaim: string;
  body: string;
  authorStance: string;
  status?: string;
  publishedAt?: string | null;
  topicTags: string[];
  thumbnailUrl?: string | null;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  referencedPost: {
    id: string;
    headlineClaim: string;
    publishedAt: string | null;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null;
  totalReactions: number;
  userReaction: string | null;
  reactionCounts: Record<string, number> | null;
  commentsEnabled?: boolean;
}

const stanceInfo = {
  arguing: {
    label: "Arguing",
    description: "The author believes this claim",
    icon: MessageSquare,
    color: C.green,
  },
  exploring: {
    label: "Exploring",
    description: "The author is genuinely uncertain",
    icon: Eye,
    color: C.accent,
  },
  steelmanning: {
    label: "Steelmanning",
    description: "The author may not hold this position",
    icon: Lightbulb,
    color: C.blue,
  },
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    setPost(null);
    setIsLoading(true);
    setError(null);

    fetch(`/api/posts/${postId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            setError("Post not found");
            return;
          }
          if (response.status === 403) {
            setError("You cannot view this post");
            return;
          }
          throw new Error("Failed to load post");
        }
        const data = await response.json();
        setPost(data.post);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : "An error occurred");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [postId]);

  const handleReaction = async (stance: string) => {
    if (!post) return;
    setIsReacting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stance }),
      });

      if (!response.ok) {
        throw new Error("Failed to react");
      }

      const data = await response.json();
      setPost({
        ...post,
        userReaction: data.reaction.stance,
        reactionCounts: data.reactionCounts,
      });
    } catch (err) {
      console.error("Reaction error:", err);
    } finally {
      setIsReacting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: C.bg, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: C.bg, 
        padding: "48px 16px",
        textAlign: "center",
      }}>
        <AlertTriangle size={48} style={{ color: C.rose, margin: "0 auto 16px" }} />
        <h2 style={{ color: C.text, fontSize: 20, marginBottom: 8 }}>{error}</h2>
        <Link href="/feed">
          <Button style={{ background: C.accent, color: "#fff", border: "none", marginTop: 16 }}>
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  if (!post) return null;

  const stanceData = stanceInfo[post.authorStance as keyof typeof stanceInfo];
  const StanceIcon = stanceData?.icon || MessageSquare;
  const stanceColor = stanceData?.color || C.muted;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: isNarrow ? "16px 12px 100px" : "24px 16px 100px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: C.textSoft,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 24,
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {post.referencedPost && (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>In response to</div>
            <Link
              href={`/post/${post.referencedPost.id}`}
              style={{
                color: C.accent,
                fontSize: 16,
                fontWeight: 500,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {post.referencedPost.headlineClaim}
            </Link>
            <div style={{ color: C.textSoft, fontSize: 13, marginTop: 6 }}>
              {post.referencedPost.author?.name || "Anonymous"}
            </div>
          </div>
        )}

        {/* Author Stance Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: `${stanceColor}15`,
            border: `1px solid ${stanceColor}30`,
            borderRadius: isNarrow ? 10 : 12,
            padding: isNarrow ? 12 : 16,
            marginBottom: isNarrow ? 16 : 24,
            display: "flex",
            alignItems: "center",
            gap: isNarrow ? 10 : 12,
          }}
        >
          <StanceIcon size={isNarrow ? 20 : 24} style={{ color: stanceColor, flexShrink: 0 }} />
          <div>
            <div style={{ color: stanceColor, fontWeight: 600, marginBottom: 2, fontSize: isNarrow ? 14 : 16 }}>
              {stanceData?.label || post.authorStance}
            </div>
            <div style={{ color: C.textSoft, fontSize: isNarrow ? 12 : 13 }}>
              {stanceData?.description}
            </div>
          </div>
        </motion.div>

        {/* Post Content */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: isNarrow ? 12 : 16,
            padding: isNarrow ? "20px 16px" : 32,
            marginBottom: isNarrow ? 16 : 24,
          }}
        >
          {/* Headline Claim */}
          <h1 style={{
            color: C.text,
            fontSize: isNarrow ? 22 : 28,
            fontWeight: 600,
            lineHeight: 1.3,
            marginBottom: isNarrow ? 16 : 24,
          }}>
            {post.headlineClaim}
          </h1>

          {/* Thumbnail */}
          {post.thumbnailUrl && (
            <div
              style={{
                width: "100%",
                borderRadius: isNarrow ? 8 : 12,
                overflow: "hidden",
                marginBottom: isNarrow ? 16 : 24,
              }}
            >
              <img
                src={post.thumbnailUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* Author Info */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: isNarrow ? 10 : 12,
            marginBottom: isNarrow ? 16 : 24,
            paddingBottom: isNarrow ? 16 : 24,
            borderBottom: `1px solid ${C.border}`,
          }}>
            <Link 
              href={`/profile/${post.author.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isNarrow ? 10 : 12,
                textDecoration: "none",
              }}
            >
              <div style={{
                width: isNarrow ? 40 : 48,
                height: isNarrow ? 40 : 48,
                borderRadius: isNarrow ? 20 : 24,
                background: C.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                {post.author.avatarUrl ? (
                  <img 
                    src={post.author.avatarUrl} 
                    alt="" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <User size={isNarrow ? 20 : 24} style={{ color: C.muted }} />
                )}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 500, fontSize: isNarrow ? 14 : 16 }}>
                  {post.author.name || "Anonymous"}
                </div>
                {post.publishedAt && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  color: C.muted,
                  fontSize: isNarrow ? 12 : 13,
                }}>
                  <Calendar size={12} />
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                )}
              </div>
            </Link>
          </div>

          {/* Body */}
          <div style={{
            color: C.text,
            fontSize: isNarrow ? 15 : 17,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}>
            {post.body}
          </div>

          {/* Topic Tags */}
          {post.topicTags.length > 0 && (
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap", 
              gap: isNarrow ? 6 : 8, 
              marginTop: isNarrow ? 20 : 32,
              paddingTop: isNarrow ? 16 : 24,
              borderTop: `1px solid ${C.border}`,
            }}>
              {post.topicTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: isNarrow ? "5px 10px" : "6px 12px",
                    background: C.bg,
                    borderRadius: 8,
                    color: C.muted,
                    fontSize: isNarrow ? 12 : 13,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.article>

        {/* Reactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: isNarrow ? 12 : 16,
            padding: isNarrow ? 16 : 24,
          }}
        >
          <h3 style={{ 
            color: C.text, 
            fontSize: isNarrow ? 15 : 16, 
            fontWeight: 600,
            marginBottom: 6,
          }}>
            What do you think?
          </h3>
          <p style={{ color: C.muted, fontSize: isNarrow ? 13 : 14, marginBottom: isNarrow ? 16 : 20 }}>
            Your reaction will update your belief map.
          </p>

          {/* Reaction Counts (after reacting) */}
          <AnimatePresence>
            {post.userReaction && post.reactionCounts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: "flex",
                  gap: isNarrow ? 16 : 24,
                  marginBottom: isNarrow ? 16 : 20,
                  padding: isNarrow ? 12 : 16,
                  background: C.bg,
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ color: C.green, fontSize: isNarrow ? 20 : 24, fontWeight: 600 }}>
                    {post.reactionCounts.agree || 0}
                  </div>
                  <div style={{ color: C.muted, fontSize: isNarrow ? 11 : 12 }}>agree</div>
                </div>
                <div>
                  <div style={{ color: C.rose, fontSize: isNarrow ? 20 : 24, fontWeight: 600 }}>
                    {post.reactionCounts.disagree || 0}
                  </div>
                  <div style={{ color: C.muted, fontSize: isNarrow ? 11 : 12 }}>disagree</div>
                </div>
                <div>
                  <div style={{ color: C.accent, fontSize: isNarrow ? 20 : 24, fontWeight: 600 }}>
                    {post.reactionCounts.complicated || 0}
                  </div>
                  <div style={{ color: C.muted, fontSize: isNarrow ? 11 : 12 }}>complicated</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reaction Buttons */}
          <div style={{ display: "flex", gap: isNarrow ? 8 : 12, flexWrap: "wrap" }}>
            {[
              { stance: "agree", icon: ThumbsUp, label: "Agree", color: C.green },
              { stance: "disagree", icon: ThumbsDown, label: "Disagree", color: C.rose },
              { stance: "complicated", icon: HelpCircle, label: isNarrow ? "Complicated" : "It's Complicated", color: C.accent },
              { stance: "skip", icon: SkipForward, label: "Skip", color: C.muted },
            ].map(({ stance, icon: Icon, label, color }) => {
              const isSelected = post.userReaction === stance;
              
              return (
                <motion.button
                  key={stance}
                  whileHover={{ scale: isReacting ? 1 : 1.03 }}
                  whileTap={{ scale: isReacting ? 1 : 0.97 }}
                  onClick={() => !isReacting && handleReaction(stance)}
                  disabled={isReacting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isNarrow ? 6 : 8,
                    padding: isNarrow ? "10px 14px" : "12px 20px",
                    background: isSelected ? `${color}20` : "transparent",
                    border: `1px solid ${isSelected ? color : C.border}`,
                    borderRadius: 10,
                    cursor: isReacting ? "default" : "pointer",
                    opacity: isReacting ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon size={isNarrow ? 16 : 18} style={{ color: isSelected ? color : C.muted }} />
                  <span style={{ 
                    color: isSelected ? color : C.textSoft, 
                    fontSize: isNarrow ? 13 : 14,
                    fontWeight: isSelected ? 500 : 400,
                  }}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Comments Section */}
        {(Boolean(post.publishedAt) || post.status === "published") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 24 }}
          >
            <CommentSection
              postId={post.id}
              postAuthorId={post.author.id}
              hasReacted={!!post.userReaction && post.userReaction !== "skip"}
              userReactionStance={post.userReaction || null}
              commentsEnabled={post.commentsEnabled !== false}
            />
          </motion.div>
        )}

        {(Boolean(post.publishedAt) || post.status === "published") && (
          <div style={{ marginTop: 24 }}>
            <Link
              href={`/publish?ref=${post.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: C.accent,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Write a response
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
