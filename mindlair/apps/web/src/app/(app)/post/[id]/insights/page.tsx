"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart2,
  Loader2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Highlighter,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  SkipForward,
} from "lucide-react";

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

interface Insights {
  stanceDistribution: Record<string, number>;
  commentStanceDistribution: Record<string, number>;
  totalReactions: number;
  totalComments: number;
  totalAnnotations: number;
  dissentRatio: number;
  annotationHotspots: Array<{
    id: string;
    selectedText: string;
    commentCount: number;
  }>;
  reactionVelocity: Array<{
    date: string;
    count: number;
  }>;
}

interface InsightsData {
  postId: string;
  title: string;
  headlineClaim: string;
  publishedAt: string | null;
  topicTags: string[];
  insights: Insights;
}

const stanceIcons: Record<string, { icon: typeof ThumbsUp; color: string }> = {
  agree: { icon: ThumbsUp, color: C.green },
  disagree: { icon: ThumbsDown, color: C.rose },
  complicated: { icon: HelpCircle, color: C.accent },
  skip: { icon: SkipForward, color: C.muted },
};

export default function InsightsPage() {
  const { id: postId } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/insights`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.message || "Failed to load insights");
          return;
        }

        setData(json);
      } catch {
        setError("Failed to load insights");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [postId]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          padding: "48px 16px",
          textAlign: "center",
        }}
      >
        <AlertTriangle size={48} style={{ color: C.rose, margin: "0 auto 16px" }} />
        <h2 style={{ color: C.text, fontSize: 20, marginBottom: 8 }}>{error}</h2>
        <button
          onClick={() => router.back()}
          style={{
            background: C.accent,
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
            marginTop: 16,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { insights } = data;
  const maxVelocity = Math.max(...insights.reactionVelocity.map((d) => d.count), 1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 80px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
          Back to Post
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <BarChart2 size={28} style={{ color: C.accent }} />
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 600, margin: 0 }}>
              Insights
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: "4px 0 0" }}>
              {data.title}
            </p>
          </div>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, textTransform: "uppercase" }}>
              Total Reactions
            </div>
            <div style={{ color: C.text, fontSize: 32, fontWeight: 600, marginTop: 8 }}>
              {insights.totalReactions}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, textTransform: "uppercase" }}>
              Comments
            </div>
            <div style={{ color: C.text, fontSize: 32, fontWeight: 600, marginTop: 8 }}>
              {insights.totalComments}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, textTransform: "uppercase" }}>
              Annotations
            </div>
            <div style={{ color: C.text, fontSize: 32, fontWeight: 600, marginTop: 8 }}>
              {insights.totalAnnotations}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ color: C.muted, fontSize: 12, textTransform: "uppercase" }}>
              Dissent Ratio
            </div>
            <div
              style={{
                color: insights.dissentRatio > 30 ? C.rose : C.green,
                fontSize: 32,
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              {insights.dissentRatio}%
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
              {insights.dissentRatio > 30
                ? "High — strong debate"
                : insights.dissentRatio > 10
                  ? "Moderate — healthy engagement"
                  : "Low — mostly agreement"}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              color: C.text,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            <ThumbsUp size={18} style={{ color: C.accent }} />
            Stance Distribution
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(stanceIcons).map(([stance, { icon: Icon, color }]) => {
              const count = insights.stanceDistribution[stance] || 0;
              const percent =
                insights.totalReactions > 0
                  ? Math.round((count / insights.totalReactions) * 100)
                  : 0;

              return (
                <div key={stance}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={16} style={{ color }} />
                      <span style={{ color: C.textSoft, fontSize: 13, textTransform: "capitalize" }}>
                        {stance}
                      </span>
                    </div>
                    <span style={{ color: C.muted, fontSize: 13 }}>
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      background: C.bg,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      style={{
                        height: "100%",
                        background: color,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {insights.reactionVelocity.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                color: C.text,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              <TrendingUp size={18} style={{ color: C.accent }} />
              Reaction Velocity
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 100,
              }}
            >
              {insights.reactionVelocity.slice(-14).map((d) => {
                const heightPercent = (d.count / maxVelocity) * 100;
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.count} reactions`}
                    style={{
                      flex: 1,
                      maxWidth: 32,
                      height: `${Math.max(heightPercent, 4)}%`,
                      background: C.accent,
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.7";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  />
                );
              })}
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 8, textAlign: "center" }}>
              Last {Math.min(insights.reactionVelocity.length, 14)} days
            </div>
          </motion.div>
        )}

        {insights.annotationHotspots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                color: C.text,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              <Highlighter size={18} style={{ color: C.accent }} />
              Annotation Hot-Spots
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {insights.annotationHotspots.map((hotspot, i) => (
                <div
                  key={hotspot.id}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        color: C.accent,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: C.muted,
                        fontSize: 12,
                      }}
                    >
                      <MessageSquare size={12} />
                      {hotspot.commentCount} comments
                    </span>
                  </div>
                  <p
                    style={{
                      color: C.textSoft,
                      fontSize: 14,
                      fontStyle: "italic",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    "{hotspot.selectedText}"
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Link
            href={`/post/${postId}`}
            style={{
              color: C.accent,
              fontSize: 14,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            View Post
          </Link>
        </div>
      </div>
    </div>
  );
}
