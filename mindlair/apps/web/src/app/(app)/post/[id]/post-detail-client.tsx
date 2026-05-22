"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/comment-section";
import { AnnotatedContent } from "@/components/annotated-content";
import { AnnotationData } from "@/components/annotation-composer";
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
  Highlighter,
  BarChart2,
  ExternalLink,
  FileText,
  Video,
  Mic,
  BookOpen,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPublicName } from "@/lib/display-name-policy";
import { useMediaQuery } from "@/hooks/use-media-query";
import { RevisionHistory } from "@/components/revision-history";

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
  title: string;
  headlineClaim: string;
  body: string;
  authorStance: string;
  status?: string;
  visibility?: string;
  currentVersion?: number;
  publishedAt?: string | null;
  topicTags: string[];
  thumbnailUrl?: string | null;
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  referencedPost: {
    id: string;
    title?: string;
    headlineClaim: string;
    publishedAt: string | null;
    author: { id: string; name: string | null; avatarUrl: string | null };
  } | null;
  citations?: Array<{
    id: string;
    url: string;
    title: string | null;
    author: string | null;
    outlet: string | null;
    excerpt: string | null;
    contentType: string;
    position: number;
  }>;
  totalReactions: number;
  userReaction: string | null;
  reactionCounts: Record<string, number> | null;
  commentsEnabled?: boolean;
  isAuthor?: boolean;
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

interface PostDetailClientProps {
  postId: string;
  initialPost?: PostDetail | null;
  initialError?: string | null;
}

export function PostDetailClient({ postId, initialPost, initialError }: PostDetailClientProps) {
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(initialPost || null);
  const [isLoading, setIsLoading] = useState(!initialPost && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isReacting, setIsReacting] = useState(false);
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [highlightsHidden, setHighlightsHidden] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('mindlair:highlights-hidden');
    if (stored === 'true') {
      setHighlightsHidden(true);
    }
  }, []);

  const toggleHighlights = () => {
    const newValue = !highlightsHidden;
    setHighlightsHidden(newValue);
    localStorage.setItem('mindlair:highlights-hidden', String(newValue));
  };

  const fetchAnnotations = useCallback(async () => {
    if (!post?.id) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/annotations`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data.annotations || []);
      }
    } catch (err) {
      console.error('Failed to fetch annotations:', err);
    }
  }, [post?.id]);

  useEffect(() => {
    if (post?.id && (post.status === 'published' || post.publishedAt)) {
      fetchAnnotations();
    }
  }, [post?.id, post?.status, post?.publishedAt, fetchAnnotations]);

  useEffect(() => {
    if (initialPost || initialError) return;
    
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
  }, [postId, initialPost, initialError]);

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
              {post.referencedPost.title || post.referencedPost.headlineClaim}
            </Link>
            <div style={{ color: C.textSoft, fontSize: 13, marginTop: 6 }}>
              {formatPublicName(post.referencedPost.author?.name)}
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
          {/* Title */}
          <h1 style={{
            color: C.text,
            fontSize: isNarrow ? 22 : 28,
            fontWeight: 600,
            lineHeight: 1.3,
            marginBottom: isNarrow ? 8 : 12,
          }}>
            {post.title}
          </h1>
          
          {/* Headline Claim */}
          <p style={{
            color: C.textSoft,
            fontSize: isNarrow ? 14 : 16,
            lineHeight: 1.5,
            marginBottom: isNarrow ? 16 : 24,
            fontStyle: "italic",
          }}>
            This post argues: {post.headlineClaim}
          </p>

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
                  {formatPublicName(post.author.name)}
                </div>
                {post.publishedAt && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  color: C.muted,
                  fontSize: isNarrow ? 12 : 13,
                  flexWrap: "wrap",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Calendar size={12} />
                    {new Date(post.publishedAt).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {(post.currentVersion ?? 1) > 1 && (
                    <>
                      <span style={{ color: C.border }}>·</span>
                      <button
                        onClick={() => setShowRevisionHistory(true)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: C.accent,
                          fontSize: "inherit",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 2,
                        }}
                      >
                        Edited — view changes
                      </button>
                    </>
                  )}
                </div>
                )}
              </div>
            </Link>
            
            {/* Author-only insights link */}
            {post.isAuthor && post.status === "published" && (
              <Link
                href={`/post/${post.id}/insights`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: "auto",
                  padding: "8px 12px",
                  background: `${C.accent}15`,
                  border: `1px solid ${C.accent}30`,
                  borderRadius: 8,
                  color: C.accent,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                <BarChart2 size={16} />
                Insights
              </Link>
            )}
          </div>

          {/* Body */}
          <AnnotatedContent
            postId={post.id}
            html={post.body}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
            hasReacted={!!post.userReaction && post.userReaction !== "skip"}
            highlightsHidden={highlightsHidden}
            className="post-body-prose"
            style={{
              color: C.text,
              fontSize: isNarrow ? 15 : 17,
              lineHeight: 1.8,
            }}
          />
          
          {/* Annotation controls */}
          {(Boolean(post.publishedAt) || post.status === "published") && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 16,
                padding: "10px 14px",
                background: post.userReaction && post.userReaction !== "skip"
                  ? `${C.accent}10`
                  : `${C.surface}`,
                border: `1px solid ${post.userReaction && post.userReaction !== "skip" ? `${C.accent}25` : C.border}`,
                borderRadius: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textSoft, fontSize: 13 }}>
                <Highlighter size={16} style={{ color: post.userReaction && post.userReaction !== "skip" ? C.accent : C.muted }} />
                {post.userReaction && post.userReaction !== "skip"
                  ? <span>Select text to annotate or write a response</span>
                  : <span style={{ color: C.muted }}>React to this post to leave annotations</span>
                }
              </div>
              {annotations.length > 0 && post.userReaction && post.userReaction !== "skip" && (
                <button
                  onClick={toggleHighlights}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    background: highlightsHidden ? C.accent : "transparent",
                    border: `1px solid ${highlightsHidden ? C.accent : C.border}`,
                    borderRadius: 6,
                    color: highlightsHidden ? "#fff" : C.textSoft,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Eye size={14} />
                  {highlightsHidden ? "Show highlights" : "Hide highlights"}
                </button>
              )}
            </div>
          )}
          <style jsx global>{`
            .post-body-prose {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .post-body-prose p {
              margin: 0 0 1em 0;
            }
            .post-body-prose p:last-child {
              margin-bottom: 0;
            }
            .post-body-prose h2 {
              font-size: 1.4em;
              font-weight: 600;
              margin: 1.5em 0 0.5em 0;
              color: ${C.text};
              line-height: 1.3;
            }
            .post-body-prose h3 {
              font-size: 1.2em;
              font-weight: 600;
              margin: 1.25em 0 0.5em 0;
              color: ${C.text};
              line-height: 1.3;
            }
            .post-body-prose ul, .post-body-prose ol {
              padding-left: 1.5em;
              margin: 0.75em 0;
            }
            .post-body-prose li {
              margin: 0.25em 0;
            }
            .post-body-prose ul {
              list-style-type: disc;
            }
            .post-body-prose ol {
              list-style-type: decimal;
            }
            .post-body-prose blockquote {
              border-left: 3px solid ${C.accent};
              padding-left: 1em;
              margin: 1em 0;
              color: ${C.textSoft};
              font-style: italic;
            }
            .post-body-prose pre {
              background: ${C.bg};
              border: 1px solid ${C.border};
              border-radius: 8px;
              padding: 1em;
              margin: 1em 0;
              overflow-x: auto;
            }
            .post-body-prose code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              font-size: 0.9em;
              background: ${C.bg};
              padding: 0.15em 0.4em;
              border-radius: 4px;
            }
            .post-body-prose pre code {
              background: none;
              padding: 0;
            }
            .post-body-prose a {
              color: ${C.accent};
              text-decoration: underline;
              text-underline-offset: 2px;
            }
            .post-body-prose a:hover {
              opacity: 0.8;
            }
            .post-body-prose strong, .post-body-prose b {
              font-weight: 600;
            }
            .post-body-prose em, .post-body-prose i {
              font-style: italic;
            }
          `}</style>

          {/* Citations & Sources */}
          {post.citations && post.citations.length > 0 && (
            <div style={{
              marginTop: isNarrow ? 20 : 32,
              paddingTop: isNarrow ? 16 : 24,
              borderTop: `1px solid ${C.border}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}>
                <LinkIcon size={14} style={{ color: C.muted }} />
                <h3 style={{
                  color: C.textSoft,
                  fontSize: isNarrow ? 13 : 14,
                  fontWeight: 600,
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Sources
                </h3>
              </div>
              <ol style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                {post.citations.map((c, i) => (
                  <CitationItem
                    key={c.id}
                    citation={c}
                    index={i + 1}
                    isNarrow={isNarrow}
                  />
                ))}
              </ol>
            </div>
          )}

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

      {/* Revision History Modal/Sheet */}
      <RevisionHistory
        postId={post.id}
        open={showRevisionHistory}
        onClose={() => setShowRevisionHistory(false)}
        variant={isNarrow ? "bottom" : "side"}
      />
    </div>
  );
}

const CITATION_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  article: FileText,
  paper: FileText,
  video: Video,
  podcast: Mic,
  book: BookOpen,
  other: LinkIcon,
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function CitationItem({
  citation,
  index,
  isNarrow,
}: {
  citation: NonNullable<PostDetail["citations"]>[number];
  index: number;
  isNarrow: boolean;
}) {
  const Icon = CITATION_ICONS[citation.contentType] || LinkIcon;
  const displayTitle = citation.title || getDomain(citation.url);

  return (
    <li
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: isNarrow ? "12px 14px" : "14px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `${C.accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} style={{ color: C.accent }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <a
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: C.text,
            fontSize: isNarrow ? 14 : 15,
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
            [{index}]
          </span>
          {displayTitle}
          <ExternalLink size={12} style={{ color: C.muted, flexShrink: 0 }} />
        </a>

        <div
          style={{
            color: C.muted,
            fontSize: 12,
            marginTop: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {citation.outlet && <span>{citation.outlet}</span>}
          {citation.author && (
            <>
              {citation.outlet && <span>·</span>}
              <span>{citation.author}</span>
            </>
          )}
          {!citation.outlet && !citation.author && (
            <span>{getDomain(citation.url)}</span>
          )}
        </div>

        {citation.excerpt && (
          <blockquote
            style={{
              margin: "8px 0 0 0",
              padding: "8px 12px",
              borderLeft: `2px solid ${C.accent}`,
              color: C.textSoft,
              fontSize: 13,
              lineHeight: 1.5,
              fontStyle: "italic",
              background: `${C.accent}08`,
              borderRadius: "0 6px 6px 0",
            }}
          >
            &ldquo;{citation.excerpt}&rdquo;
          </blockquote>
        )}
      </div>
    </li>
  );
}
