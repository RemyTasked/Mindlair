"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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
  ExternalLink,
  BookOpen,
  Headphones,
  Video,
  Sparkles,
  Cpu,
  Brain,
  DollarSign,
  Heart,
  Lightbulb as Philosophy,
  Globe,
  Zap,
  Trophy,
  ChevronRight,
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

interface FeedSource {
  url: string;
  title: string | null;
  outlet: string | null;
  author: string | null;
  contentType: string;
}

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
  referencedPost?: {
    id: string;
    headlineClaim: string;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null;
  source: FeedSource | null;
  isSubscribed: boolean;
  isEditorial: boolean;
  totalReactions: number;
  userReaction: string | null;
  reactionCounts: Record<string, number> | null;
}

const CATEGORIES = [
  { id: 'technology', label: 'Tech', icon: Cpu, color: '#4a9eff' },
  { id: 'psychology', label: 'Psychology', icon: Brain, color: '#e57373' },
  { id: 'economics', label: 'Money', icon: DollarSign, color: '#a3c47a' },
  { id: 'health', label: 'Health', icon: Heart, color: '#f472b6' },
  { id: 'philosophy', label: 'Philosophy', icon: Philosophy, color: '#c084fc' },
  { id: 'culture', label: 'Culture', icon: Globe, color: '#fbbf24' },
  { id: 'productivity', label: 'Productivity', icon: Zap, color: '#34d399' },
  { id: 'sports', label: 'Sports', icon: Trophy, color: '#f97316' },
] as const;

type CategoryType = typeof CATEGORIES[number]['id'] | null;

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

const FEED_RESTORE_KEY = "mindlayer_feed_restore";

function isFilterType(v: unknown): v is FilterType {
  return v === "all" || v === "following" || v === "discover";
}

function isCategoryType(v: unknown): v is NonNullable<CategoryType> {
  return typeof v === "string" && CATEGORIES.some((c) => c.id === v);
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [category, setCategory] = useState<CategoryType>(null);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pendingScrollY = useRef<number | null>(null);
  const restoreReadRef = useRef(false);

  const persistFeedContextForPost = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        FEED_RESTORE_KEY,
        JSON.stringify({
          scrollY: window.scrollY,
          filter,
          category,
        })
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [filter, category]);

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
      if (category) params.set("category", category);

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
  }, [filter, category]);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || restoreReadRef.current) return;
    restoreReadRef.current = true;
    try {
      const raw = sessionStorage.getItem(FEED_RESTORE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        scrollY?: number;
        filter?: unknown;
        category?: unknown;
      };
      sessionStorage.removeItem(FEED_RESTORE_KEY);
      if (typeof data.scrollY === "number" && data.scrollY >= 0) {
        pendingScrollY.current = data.scrollY;
      }
      if (isFilterType(data.filter)) setFilter(data.filter);
      if (data.category === null || data.category === undefined) {
        setCategory(null);
      } else if (isCategoryType(data.category)) {
        setCategory(data.category);
      }
    } catch {
      sessionStorage.removeItem(FEED_RESTORE_KEY);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useLayoutEffect(() => {
    if (isLoading || pendingScrollY.current === null) return;
    const y = pendingScrollY.current;
    pendingScrollY.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
      });
    });
  }, [isLoading, posts.length]);

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

      await response.json();

      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
        minHeight: "100dvh", 
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

  const previewClamp = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden" as const,
    wordBreak: "break-word" as const,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: C.bg,
        overflowX: "hidden",
        boxSizing: "border-box",
        paddingTop: 16,
        paddingBottom: 100,
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
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
            { id: "subscriptions" as FilterType, label: "Subscriptions", icon: Users },
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

        {/* Category Filter Pills — wrap so narrow viewports need not scroll sideways */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setCategory(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: category === null ? `${C.accent}20` : C.surface,
              border: `1px solid ${category === null ? C.accent : C.border}`,
              borderRadius: 20,
              cursor: "pointer",
              color: category === null ? C.accent : C.textSoft,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            <Sparkles size={14} />
            All
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: isActive ? `${cat.color}20` : C.surface,
                  border: `1px solid ${isActive ? cat.color : C.border}`,
                  borderRadius: 20,
                  cursor: "pointer",
                  color: isActive ? cat.color : C.textSoft,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
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
              {filter === "subscriptions" ? "No posts from your subscriptions" : "No posts yet"}
            </h3>
            <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 24 }}>
              {filter === "subscriptions" 
                ? "Subscribe to people to see their posts here" 
                : "Be the first to post something"}
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
        <AnimatePresence mode="popLayout">
          {posts.map((post) => {
            const StanceIcon = stanceIcons[post.authorStance as keyof typeof stanceIcons] || MessageSquare;
            const stanceColor = stanceColors[post.authorStance as keyof typeof stanceColors] || C.muted;
            const isReacting = reactingPostId === post.id;

            return (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  width: "100%",
                  boxSizing: "border-box",
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
                        {post.isSubscribed && (
                          <span style={{ 
                            color: C.accent, 
                            fontSize: 11, 
                            marginLeft: 6,
                            fontWeight: 400,
                          }}>
                            Subscribed
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

                {post.referencedPost && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: C.muted, fontSize: 12, marginRight: 6 }}>In response to</span>
                    <Link
                      href={`/post/${post.referencedPost.id}`}
                      onClick={persistFeedContextForPost}
                      style={{ color: C.accent, fontSize: 12, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}
                    >
                      {post.referencedPost.headlineClaim.length > 72
                        ? `${post.referencedPost.headlineClaim.slice(0, 72)}…`
                        : post.referencedPost.headlineClaim}
                    </Link>
                  </div>
                )}

                {/* Headline + excerpt — tap through to full post */}
                <Link
                  href={`/post/${post.id}`}
                  onClick={persistFeedContextForPost}
                  style={{ textDecoration: "none", display: "block", color: "inherit", marginBottom: 16 }}
                >
                  <h2
                    style={{
                      color: C.text,
                      fontSize: 18,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      marginBottom: 8,
                      textDecoration: "underline",
                      textDecorationColor: `${C.accent}55`,
                      textUnderlineOffset: 4,
                      WebkitLineClamp: 2,
                      ...previewClamp,
                    }}
                  >
                    {post.headlineClaim}
                  </h2>
                  <p
                    style={{
                      color: C.textSoft,
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginBottom: 10,
                      WebkitLineClamp: 3,
                      ...previewClamp,
                    }}
                  >
                    {post.body}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: C.accent,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    <span>Read full post</span>
                    <ChevronRight size={14} style={{ flexShrink: 0 }} />
                  </div>
                </Link>

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

                {/* Source Link — external; not the in-app full post */}
                {post.source && (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Original source (external)
                      </span>
                    </div>
                    <a
                      href={post.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 16px",
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        marginBottom: 16,
                        textDecoration: "none",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = C.accent;
                        e.currentTarget.style.background = `${C.accent}08`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.background = C.bg;
                      }}
                    >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: `${C.accent}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {post.source.contentType === 'podcast' ? (
                        <Headphones size={18} style={{ color: C.accent }} />
                      ) : post.source.contentType === 'video' ? (
                        <Video size={18} style={{ color: C.accent }} />
                      ) : (
                        <BookOpen size={18} style={{ color: C.accent }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        color: C.text, 
                        fontSize: 13, 
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {post.source.title || "View Source"}
                      </div>
                      <div style={{ 
                        color: C.muted, 
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        {post.source.outlet && <span>{post.source.outlet}</span>}
                        {post.source.outlet && post.source.author && <span>·</span>}
                        {post.source.author && <span>{post.source.author}</span>}
                      </div>
                    </div>
                    <ExternalLink size={16} style={{ color: C.muted, flexShrink: 0 }} />
                    </a>
                  </>
                )}

                {/* Editorial Badge */}
                {post.isEditorial && !post.source && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    background: `${C.accent}10`,
                    borderRadius: 8,
                    marginBottom: 16,
                  }}>
                    <Sparkles size={14} style={{ color: C.accent }} />
                    <span style={{ color: C.accent, fontSize: 12, fontWeight: 500 }}>
                      Featured Claim
                    </span>
                  </div>
                )}

                {/* Reaction UI */}
                <div style={{ 
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 16,
                }}>
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
