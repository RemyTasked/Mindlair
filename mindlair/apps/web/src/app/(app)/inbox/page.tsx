"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { DigestSession } from "@/components/digest-session";
import { Inbox, Clock, Sparkles, RefreshCw, Loader2 } from "lucide-react";

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
};

interface DigestClaim {
  id: string;
  text: string;
  claimType: string;
  confidenceScore: number;
  source: {
    id: string;
    url: string;
    title?: string;
    outlet?: string;
  };
  claimConcepts: Array<{
    concept: {
      id: string;
      label: string;
    };
  }>;
  positions: Array<{
    stance: string;
    createdAt: string;
  }>;
}

interface DigestData {
  digest: {
    id: string;
    window: string;
    status: string;
    generatedAt: string;
    expiresAt: string;
    claimCount?: number;
  };
  claims?: DigestClaim[];
}

type Stance = "agree" | "disagree" | "complicated" | "skip";

export default function InboxPage() {
  const [digestData, setDigestData] = useState<DigestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const fetchDigest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/digest");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch digest");
      }
      const data = await response.json();
      setDigestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const handleStartSession = async () => {
    if (!digestData?.digest?.id) return;

    try {
      await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digestId: digestData.digest.id,
          action: "open",
        }),
      });
      setIsSessionActive(true);
    } catch (err) {
      console.error("Failed to open digest:", err);
    }
  };

  const handleCompleteSession = async (
    reactions: Array<{ claimId: string; stance: Stance }>,
    durationMs: number
  ) => {
    if (!digestData?.digest?.id) return;

    try {
      for (const reaction of reactions) {
        await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId: reaction.claimId,
            stance: reaction.stance,
            context: "digest",
          }),
        });
      }

      await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digestId: digestData.digest.id,
          action: "complete",
        }),
      });

      setIsSessionActive(false);
      fetchDigest();
    } catch (err) {
      console.error("Failed to complete digest:", err);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <Loader2 size={28} className="animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "48px auto", padding: "0 16px" }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: C.rose, marginBottom: 16, fontSize: 14 }}>{error}</p>
          <button
            onClick={fetchDigest}
            style={{
              padding: "10px 18px",
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const claims = digestData?.claims || [];
  const unreactedClaims = claims.filter(c => c.positions.length === 0);
  const digestItems = unreactedClaims.map(claim => ({
    claimId: claim.id,
    claimText: claim.text,
    claimType: claim.claimType as "factual" | "opinion" | "prediction" | "policy",
    sourceUrl: claim.source.url,
    sourceTitle: claim.source.title || claim.source.url,
    sourceOutlet: claim.source.outlet,
    concepts: claim.claimConcepts.map(cc => cc.concept.label),
    hasCounterAngle: false,
    priority: claim.confidenceScore,
  }));

  if (isSessionActive && digestItems.length > 0) {
    return (
      <DigestSession
        digestId={digestData?.digest?.id || ""}
        items={digestItems}
        onComplete={handleCompleteSession}
      />
    );
  }

  const hasItems = digestItems.length > 0;

  return (
    <div style={{ padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 32 }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Inbox
        </h1>
        <p style={{ color: C.muted, fontSize: 15 }}>
          React to content you&apos;ve consumed to build your belief map.
        </p>
      </motion.div>

      {hasItems ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: `${C.accent}15`,
                border: `1px solid ${C.accent}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Inbox size={28} style={{ color: C.accent }} />
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: C.text,
                margin: 0,
              }}
            >
              {digestItems.length} {digestItems.length === 1 ? "claim" : "claims"} to react to
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  color: C.textSoft,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <Clock size={12} />~{Math.ceil(digestItems.length * 0.4)} min
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 999,
                  color: C.textSoft,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <Sparkles size={12} />
                From {claims.length} {claims.length === 1 ? "source" : "sources"}
              </div>
            </div>

            <p
              style={{
                fontSize: 13,
                color: C.muted,
                textAlign: "center",
                margin: 0,
              }}
            >
              Swipe or tap to react. Your map updates in real time.
            </p>

            <button
              onClick={handleStartSession}
              style={{
                width: "100%",
                padding: "12px 20px",
                background: C.accent,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start session
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: C.bg,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Inbox size={28} style={{ color: C.muted }} />
          </div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: C.text,
              marginBottom: 8,
            }}
          >
            All caught up
          </h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
            No new claims to react to. Keep reading and your next digest will be
            ready soon.
          </p>
          <button
            onClick={fetchDigest}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.textSoft,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Check again
          </button>
        </motion.div>
      )}
    </div>
  );
}
