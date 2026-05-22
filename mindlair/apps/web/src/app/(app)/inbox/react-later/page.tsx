"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Loader2,
  Link as LinkIcon,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Check,
} from "lucide-react";
import { CaptureConfirmation } from "@/components/capture-confirmation";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
};

interface CaptureItem {
  id: string;
  modality: string;
  status: string;
  rawText: string | null;
  source: {
    id: string;
    url: string;
    title?: string;
    outlet?: string;
    contentType?: string;
  } | null;
  createdAt: string;
}

interface CandidateClaim {
  text: string;
  type: string;
  confidence: number;
  concepts: string[];
  aiStance?: string;
  matchedClaimId?: string;
  matchedClaimText?: string;
}

export default function ReactLaterPage() {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reactionText, setReactionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingCapture, setConfirmingCapture] = useState<{
    id: string;
    claims: CandidateClaim[];
  } | null>(null);

  const fetchCaptures = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/captures?status=awaiting_reaction");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch captures");
      }
      const data = await response.json();
      setCaptures(data.captures || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setReactionText("");
    } else {
      setExpandedId(id);
      setReactionText("");
    }
  };

  const handleSubmitReaction = async (captureId: string) => {
    if (!reactionText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/captures/${captureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: reactionText.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit reaction");
      }

      pollForClaims(captureId);
    } catch (err) {
      console.error("Submit error:", err);
      setIsSubmitting(false);
    }
  };

  const pollForClaims = async (captureId: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      try {
        const response = await fetch(`/api/captures/${captureId}`);
        if (!response.ok) throw new Error("Failed to fetch capture");

        const data = await response.json();

        if (data.status === "awaiting_confirmation") {
          setIsSubmitting(false);
          setConfirmingCapture({
            id: captureId,
            claims: data.candidateClaims || [],
          });
          return;
        }

        if (data.status === "failed") {
          throw new Error(data.errorReason || "Processing failed");
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 500);
        } else {
          throw new Error("Processing timed out");
        }
      } catch (err) {
        console.error("Poll error:", err);
        setIsSubmitting(false);
      }
    };

    poll();
  };

  const handleConfirmationComplete = () => {
    setConfirmingCapture(null);
    setExpandedId(null);
    setReactionText("");
    fetchCaptures();
  };

  const handleConfirmationDismiss = async () => {
    if (confirmingCapture) {
      try {
        await fetch(`/api/captures/${confirmingCapture.id}/dismiss`, {
          method: "POST",
        });
      } catch (err) {
        console.error("Dismiss error:", err);
      }
    }
    setConfirmingCapture(null);
    fetchCaptures();
  };

  const getHostname = (url?: string) => {
    if (!url) return "";
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  };

  if (confirmingCapture) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
        <CaptureConfirmation
          captureId={confirmingCapture.id}
          candidateClaims={confirmingCapture.claims}
          modality="share_sheet"
          onComplete={handleConfirmationComplete}
          onDismiss={handleConfirmationDismiss}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: C.bg }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <Inbox className="w-5 h-5" style={{ color: C.accent }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: C.text }}>
                React Later
              </h1>
              <p className="text-sm" style={{ color: C.muted }}>
                {captures.length} saved reference{captures.length !== 1 ? "s" : ""} awaiting your reaction
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCaptures}
            disabled={isLoading}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && captures.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
          </div>
        )}

        {error && (
          <div
            className="p-4 rounded-xl text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <p style={{ color: C.textSoft }}>{error}</p>
            <Button onClick={fetchCaptures} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !error && captures.length === 0 && (
          <div
            className="p-8 rounded-xl text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <Check className="w-12 h-12 mx-auto mb-4" style={{ color: C.accent }} />
            <p className="text-lg font-medium" style={{ color: C.text }}>
              All caught up!
            </p>
            <p className="mt-2" style={{ color: C.muted }}>
              No saved references waiting for your reaction.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {captures.map((capture) => (
              <motion.div
                key={capture.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl overflow-hidden"
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
              >
                <button
                  onClick={() => handleExpand(capture.id)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ background: C.bg }}
                  >
                    <LinkIcon className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: C.text }}
                    >
                      {capture.source?.title || "Saved reference"}
                    </p>
                    <p className="text-sm truncate" style={{ color: C.muted }}>
                      {getHostname(capture.source?.url)} • Saved{" "}
                      {new Date(capture.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 transition-transform ${
                      expandedId === capture.id ? "rotate-90" : ""
                    }`}
                    style={{ color: C.muted }}
                  />
                </button>

                <AnimatePresence>
                  {expandedId === capture.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="p-4 pt-0"
                        style={{ borderTop: `1px solid ${C.border}` }}
                      >
                        {capture.source?.url && (
                          <a
                            href={capture.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline block mb-4"
                            style={{ color: C.accent }}
                          >
                            View original source →
                          </a>
                        )}

                        <textarea
                          value={reactionText}
                          onChange={(e) => setReactionText(e.target.value)}
                          placeholder="What do you think about this?"
                          className="w-full h-24 px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          style={{
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            color: C.text,
                          }}
                          disabled={isSubmitting}
                        />

                        <div className="flex justify-end mt-3">
                          <Button
                            onClick={() => handleSubmitReaction(capture.id)}
                            disabled={!reactionText.trim() || isSubmitting}
                            className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Add reaction
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
