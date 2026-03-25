"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  Loader2, 
  Link as LinkIcon, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Map
} from "lucide-react";

interface SharedContent {
  title: string;
  text: string;
  url: string;
}

type ProcessingState = "idle" | "processing" | "success" | "error";

function ShareTargetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [content, setContent] = useState<SharedContent>({
    title: "",
    text: "",
    url: "",
  });
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractedClaims, setExtractedClaims] = useState<string[]>([]);

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text = searchParams.get("text") || "";
    const url = searchParams.get("url") || "";

    const extractedUrl = url || extractUrlFromText(text);

    setContent({
      title: title.trim(),
      text: text.trim(),
      url: extractedUrl,
    });

    if (extractedUrl) {
      processContent(title, text, extractedUrl);
    }
  }, [searchParams]);

  const extractUrlFromText = (text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : "";
  };

  const processContent = async (title: string, text: string, url: string) => {
    setState("processing");
    setError(null);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: title || undefined,
          text: text || undefined,
          source: "share-target",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process content");
      }

      const data = await response.json();
      setExtractedClaims(data.claims || []);
      setState("success");

      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.ready;
      }
    } catch (err) {
      console.error("Process error:", err);
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleRetry = () => {
    if (content.url) {
      processContent(content.title, content.text, content.url);
    }
  };

  const handleViewMap = () => {
    router.push("/map");
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Add to Mindlayer
            </h1>
            <button
              onClick={handleClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-4">
          {content.url && (
            <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg shrink-0">
                <LinkIcon className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                {content.title && (
                  <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {content.title}
                  </p>
                )}
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-500 hover:text-rose-500 flex items-center gap-1 truncate"
                >
                  {new URL(content.url).hostname}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          )}

          {content.text && !content.url && (
            <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3">
                {content.text}
              </p>
            </div>
          )}

          {/* Processing State */}
          <div className="py-4">
            {state === "processing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-3"
              >
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Analyzing content and extracting claims...
                </p>
              </motion.div>
            )}

            {state === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                    <Check className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Added to your map!</span>
                </div>

                {extractedClaims.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Extracted {extractedClaims.length} claim{extractedClaims.length !== 1 ? "s" : ""}:
                    </p>
                    <ul className="space-y-2">
                      {extractedClaims.slice(0, 3).map((claim, i) => (
                        <li
                          key={i}
                          className="text-sm text-zinc-600 dark:text-zinc-400 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                        >
                          &quot;{claim}&quot;
                        </li>
                      ))}
                      {extractedClaims.length > 3 && (
                        <li className="text-sm text-zinc-500 italic">
                          +{extractedClaims.length - 3} more claims
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {state === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-3"
              >
                <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full w-fit mx-auto">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    Couldn&apos;t process content
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">{error}</p>
                </div>
              </motion.div>
            )}

            {state === "idle" && !content.url && !content.text && (
              <div className="text-center py-8">
                <p className="text-zinc-500">No content shared</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          {state === "success" && (
            <Button
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
              onClick={handleViewMap}
            >
              <Map className="w-4 h-4 mr-2" />
              View in Belief Map
            </Button>
          )}

          {state === "error" && (
            <Button className="w-full" onClick={handleRetry}>
              Try Again
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
          >
            {state === "success" ? "Done" : "Cancel"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    }>
      <ShareTargetContent />
    </Suspense>
  );
}
