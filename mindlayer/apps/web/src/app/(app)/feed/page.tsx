"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle,
  SkipForward,
  RefreshCw,
  Loader2,
  PenSquare,
  User,
  MessageSquare,
  Eye,
  Lightbulb,
  Filter,
  Users,
  Compass,
} from "lucide-react";
import Link from "next/link";

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

interface FeedPost {
  id: string;
  headlineClaim: string;
  body: string;
  authorStance: string;
  publishedAt: string;
  topicTags: string[];
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  isFollowing: boolean;
  totalReactions: number;
  userReaction: string | null;
  reactionCounts: Record<string, number> | null;
}

const stanceColors = {
  arguing: C.green,
  exploring: C.accent,
  steelmanning: C.blue,
};

const stanceLabels = {
  arguing: "Arguing",
  exploring: "Exploring",
  steelmanning: "Steelmanning",
};

const stanceIcons = {
  arguing: MessageSquare,
  exploring: Eye,
  steelmanning: Lightbulb,
};

type FilterType = "all" | "following" | "discover";

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (cursor?: string, isRefresh = false) => {
    if (!isRefresh && !cursor) {
      setIsLoading(true);
    } else if (cursor) {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (filter !== "all") params.set("filter", filter);

      const response = await fetch(`/api/feed?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch feed");
      }

      const data = await response.json();

      if (cursor) {
        setPosts((prev) => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && nextCursor) {
          fetchPosts(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoadingMore, nextCursor, fetchPosts]);

  const handleReaction = async (postId: string, stance: string) => {
    setReactingPostId(postId);
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

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                userReaction: data.reaction.stance,
                reactionCounts: data.reactionCounts,
              }
            : post
        )
      );
    } catch (err) {
      console.error("Reaction error:", err);
    } finally {
      setReactingPostId(null);
    }
  };

  const ReactionButton = ({
    postId,
    stance,
    icon: Icon,
    label,
    color,
    isSelected,
    disabled,
  }: {
    postId: string;
    stance: string;
    icon: typeof ThumbsUp;
    label: string;
    color: string;
    isSelected: boolean;
    disabled: boolean;
  }) => (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={() => !disabled && handleReaction(postId, stance)}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        background: isSelected ? `${color}20` : "transparent",
        border: `1px solid ${isSelected ? color : C.border}`,
        borderRadius: 8,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
      }}
    >
      <Icon size={16} style={{ color: isSelected ? color : C.muted }} />
      <span style={{ color: isSelected ? color : C.textSoft, fontSize: 13 }}>
        {label}
      </span>
    </motion.button>
  );

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: C.bg, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={32} style={{ color: C.accent }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 24,
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: C.text }}>Feed</h1>
          <Link href="/publish">
            <Button
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
              }}
            >
              <PenSquare size={16} />
              <span style={{ marginLeft: 8 }}>Write</span>
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div style={{ 
          display: "flex", 
          gap: 8, 
          marginBottom: 24,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 12,
        }}>
          {[
            { id: "all" as FilterType, label: "For You", icon: Filter },
            { id: "following" as FilterType, label: "Following", icon: Users },
            { id: "discover" as FilterType, label: "Discover", icon: Compass },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: filter === tab.id ? `${C.accent}20` : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: filter === tab.id ? C.accent : C.textSoft,
                fontSize: 14,
                fontWeight: filter === tab.id ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => fetchPosts(undefined, true)}
            style={{
              marginLeft: "auto",
              padding: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.muted,
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            padding: 16,
            background: `${C.rose}15`,
            border: `1px solid ${C.rose}40`,
            borderRadius: 12,
            marginBottom: 24,
          }}>
            <p style={{ color: C.rose, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {posts.length === 0 && !error && (
          <div style={{
            padding: 48,
            textAlign: "center",
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: C.surface,
              borderRadius: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <MessageSquare size={28} style={{ color: C.muted }} />
            </div>
            <h3 style={{ color: C.text, fontSize: 18, marginBottom: 8 }}>
              {filter === "following" ? "No posts from people you follow" : "No posts yet"}
            </h3>
            <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 24 }}>
              {filter === "following" 
                ? "Follow people to see their posts here" 
                : "Be the first to publish something"}
            </p>
            <Link href="/publish">
              <Button style={{ background: C.accent, color: "#fff", border: "none" }}>
                <PenSquare size={16} />
                <span style={{ marginLeft: 8 }}>Write a post</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Post Cards */}
        <AnimatePresence>
          {posts.map((post, index) => {
            const StanceIcon = stanceIcons[post.authorStance as keyof typeof stanceIcons] || MessageSquare;
            const stanceColor = stanceColors[post.authorStance as keyof typeof stanceColors] || C.muted;
            const isReacting = reactingPostId === post.id;

            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                {/* Author & Stance */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}>
                  <Link 
                    href={`/profile/${post.author.id}`}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 10,
                      textDecoration: "none",
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: C.border,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {post.author.avatarUrl ? (
                        <img 
                          src={post.author.avatarUrl} 
                          alt="" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <User size={18} style={{ color: C.muted }} />
                      )}
                    </div>
                    <div>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>
                        {post.author.name || "Anonymous"}
                        {post.isFollowing && (
                          <span style={{ 
                            color: C.accent, 
                            fontSize: 11, 
                            marginLeft: 6,
                            fontWeight: 400,
                          }}>
                            Following
                          </span>
                        )}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                  
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    background: `${stanceColor}15`,
                    borderRadius: 6,
                  }}>
                    <StanceIcon size={14} style={{ color: stanceColor }} />
                    <span style={{ color: stanceColor, fontSize: 12, fontWeight: 500 }}>
                      {stanceLabels[post.authorStance as keyof typeof stanceLabels] || post.authorStance}
                    </span>
                  </div>
                </div>

                {/* Headline Claim */}
                <Link href={`/post/${post.id}`} style={{ textDecoration: "none" }}>
                  <h2 style={{
                    color: C.text,
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    marginBottom: 12,
                  }}>
                    {post.headlineClaim}
                  </h2>
                </Link>

                {/* Body Preview */}
                <p style={{
                  color: C.textSoft,
                  fontSize: 14,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}>
                  {post.body}
                </p>

                {/* Topic Tags */}
                {post.topicTags.length > 0 && (
                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    gap: 6, 
                    marginBottom: 16 
                  }}>
                    {post.topicTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 10px",
                          background: C.bg,
                          borderRadius: 6,
                          color: C.muted,
                          fontSize: 12,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reaction UI */}
                <div style={{ 
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 16,
                }}>
                  {/* Show reaction counts after user has reacted */}
                  {post.userReaction && post.reactionCounts && (
                    <div style={{ 
                      display: "flex", 
                      gap: 16, 
                      marginBottom: 12,
                      color: C.muted,
                      fontSize: 13,
                    }}>
                      <span style={{ color: C.green }}>
                        {post.reactionCounts.agree || 0} agree
                      </span>
                      <span style={{ color: C.rose }}>
                        {post.reactionCounts.disagree || 0} disagree
                      </span>
                      <span style={{ color: C.accent }}>
                        {post.reactionCounts.complicated || 0} complicated
                      </span>
                    </div>
                  )}

                  {/* Reaction prompt */}
                  {!post.userReaction && (
                    <p style={{ 
                      color: C.muted, 
                      fontSize: 13, 
                      marginBottom: 12,
                      fontStyle: "italic",
                    }}>
                      What do you think? Your reaction updates your belief map.
                    </p>
                  )}

                  {/* Reaction buttons */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ReactionButton
                      postId={post.id}
                      stance="agree"
                      icon={ThumbsUp}
                      label="Agree"
                      color={C.green}
                      isSelected={post.userReaction === "agree"}
                      disabled={isReacting}
                    />
                    <ReactionButton
                      postId={post.id}
                      stance="disagree"
                      icon={ThumbsDown}
                      label="Disagree"
                      color={C.rose}
                      isSelected={post.userReaction === "disagree"}
                      disabled={isReacting}
                    />
                    <ReactionButton
                      postId={post.id}
                      stance="complicated"
                      icon={HelpCircle}
                      label="It's Complicated"
                      color={C.accent}
                      isSelected={post.userReaction === "complicated"}
                      disabled={isReacting}
                    />
                    <ReactionButton
                      postId={post.id}
                      stance="skip"
                      icon={SkipForward}
                      label="Skip"
                      color={C.muted}
                      isSelected={post.userReaction === "skip"}
                      disabled={isReacting}
                    />
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {/* Load More Trigger */}
        {hasMore && (
          <div 
            ref={loadMoreRef}
            style={{ 
              padding: 32, 
              display: "flex", 
              justifyContent: "center" 
            }}
          >
            {isLoadingMore && (
              <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
