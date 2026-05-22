"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  Loader2,
  Link as LinkIcon,
  Bookmark,
  MessageSquare,
  Check,
  AlertCircle,
} from "lucide-react";
import { CaptureConfirmation } from "@/components/capture-confirmation";

interface OGPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
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

type ShareState =
  | "loading"
  | "ready"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

function ShareTargetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [ogPreview, setOgPreview] = useState<OGPreview | null>(null);
  const [reaction, setReaction] = useState("");
  const [state, setState] = useState<ShareState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [candidateClaims, setCandidateClaims] = useState<CandidateClaim[]>([]);

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text = searchParams.get("text") || "";
    const sharedUrl = searchParams.get("url") || "";

    const extractedUrl = sharedUrl || extractUrlFromText(text);
    setUrl(extractedUrl);

    if (extractedUrl) {
      fetchOGPreview(extractedUrl);
    } else {
      setState("ready");
    }
  }, [searchParams]);

  const extractUrlFromText = (text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : "";
  };

  const fetchOGPreview = async (targetUrl: string) => {
    try {
      const response = await fetch(
        `/api/og-preview?url=${encodeURIComponent(targetUrl)}`
      );
      if (response.ok) {
        const preview = await response.json();
        setOgPreview(preview);
      }
    } catch (err) {
      console.error("OG preview error:", err);
    }
    setState("ready");
  };

  const handleSaveReference = async () => {
    await submitCapture(false);
  };

  const handleSaveWithReaction = async () => {
    if (!reaction.trim()) return;
    await submitCapture(true);
  };

  const submitCapture = async (includeReaction: boolean) => {
    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modality: "share_sheet",
          rawText: includeReaction ? reaction.trim() : undefined,
          source: url
            ? {
                url,
                title: ogPreview?.title,
                outlet: ogPreview?.siteName,
                contentType: "article",
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save");
      }

      const data = await response.json();
      setCaptureId(data.captureId);

      if (!includeReaction) {
        setState("success");
        return;
      }

      pollForClaims(data.captureId);
    } catch (err) {
      console.error("Submit error:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const pollForClaims = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      try {
        const response = await fetch(`/api/captures/${id}`);
        if (!response.ok) throw new Error("Failed to fetch capture");

        const data = await response.json();

        if (data.status === "awaiting_confirmation") {
          setCandidateClaims(data.candidateClaims || []);
          setState("confirming");
          return;
        }

        if (data.status === "failed") {
          throw new Error(data.errorReason || "Processing failed");
        }

        if (data.status === "awaiting_reaction") {
          setState("success");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 500);
        } else {
          throw new Error("Processing timed out");
        }
      } catch (err) {
        console.error("Poll error:", err);
        setState("error");
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    };

    poll();
  };

  const handleConfirmationComplete = () => {
    setState("success");
  };

  const handleConfirmationDismiss = async () => {
    if (captureId) {
      try {
        await fetch(`/api/captures/${captureId}/dismiss`, { method: "POST" });
      } catch (err) {
        console.error("Dismiss error:", err);
      }
    }
    handleClose();
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      window.close();
    }
  };

  const hostname = url
    ? (() => {
        try {
          return new URL(url).hostname.replace("www.", "");
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {state === "confirming" && captureId ? (
          <CaptureConfirmation
            key="confirmation"
            captureId={captureId}
            candidateClaims={candidateClaims}
            modality="share_sheet"
            onComplete={handleConfirmationComplete}
            onDismiss={handleConfirmationDismiss}
          />
        ) : (
          <motion.div
            key="share-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Capture to Mindlair
              </h1>
              <button
                onClick={handleClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {state === "loading" && (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            )}

            {state === "ready" && (
              <>
                {url && (
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex gap-3">
                      {ogPreview?.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                          <img
                            src={ogPreview.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50 line-clamp-2 text-sm">
                          {ogPreview?.title || searchParams.get("title") || "Shared link"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          {hostname}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    What do you think?
                  </label>
                  <textarea
                    value={reaction}
                    onChange={(e) => setReaction(e.target.value)}
                    placeholder="Add your reaction, opinion, or insight..."
                    className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <Button
                    onClick={handleSaveWithReaction}
                    disabled={!reaction.trim()}
                    className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Save with reaction
                  </Button>
                  <Button
                    onClick={handleSaveReference}
                    variant="outline"
                    className="w-full"
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save reference (react later)
                  </Button>
                  <button
                    onClick={handleClose}
                    className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}

            {state === "submitting" && (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Processing your capture...
                </p>
              </div>
            )}

            {state === "success" && (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Saved to your map!
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    {reaction ? "Claims extracted and added" : "Reference saved — react later in your inbox"}
                  </p>
                </div>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Done
                </Button>
              </div>
            )}

            {state === "error" && (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Something went wrong
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">{error}</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => setState("ready")}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}
