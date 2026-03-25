"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ExternalLink, 
  Lightbulb, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles 
} from "lucide-react";
import { formatRelativeTime, getDomainFromUrl } from "@/lib/utils";
import type { Nudge } from "@/types/api";

export default function NudgesPage() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNudges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/nudges");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch nudges");
      }
      const data = await response.json();
      setNudges(data.nudges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const handleNudgeAction = async (
    nudgeId: string,
    action: "clicked" | "dismissed" | "helpful" | "not_helpful"
  ) => {
    try {
      await fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nudgeId, action }),
      });

      if (action === "clicked" || action === "dismissed") {
        setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
      }
    } catch (err) {
      console.error("Failed to update nudge:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Nudges
          </h1>
          <p className="text-zinc-500">
            Perspectives you haven&apos;t encountered yet. Framed as curiosity, never
            correction.
          </p>
        </div>
        <Button variant="outline" onClick={fetchNudges}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchNudges}>Try again</Button>
          </CardContent>
        </Card>
      ) : nudges.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              No nudges right now
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Nudges surface when you&apos;ve engaged deeply with a topic from one
              angle. Keep reading and they&apos;ll appear naturally.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {nudges.map((nudge) => (
            <NudgeCard
              key={nudge.id}
              nudge={nudge}
              onAction={(action) => handleNudgeAction(nudge.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NudgeCard({
  nudge,
  onAction,
}: {
  nudge: Nudge;
  onAction: (action: "clicked" | "dismissed" | "helpful" | "not_helpful") => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={nudge.type === "echo_chamber" ? "warning" : "secondary"}>
                {nudge.type === "echo_chamber" ? "Counter view" : "Blind spot"}
              </Badge>
              <span className="text-xs text-zinc-500">
                on <strong>{nudge.conceptLabel}</strong>
              </span>
            </div>

            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
              {nudge.framing}
            </p>

            <a
              href={nudge.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
              onClick={() => onAction("clicked")}
            >
              <span className="truncate">{nudge.sourceTitle}</span>
              <span className="text-zinc-400">·</span>
              <span className="flex-shrink-0">
                {nudge.sourceOutlet || getDomainFromUrl(nudge.sourceUrl)}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  window.open(nudge.sourceUrl, "_blank");
                  onAction("clicked");
                  setShowFeedback(true);
                }}
              >
                Read it
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAction("dismissed")}
              >
                Not now
              </Button>

              {showFeedback && (
                <div className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
                  <span>Was this helpful?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAction("helpful")}
                    className="h-7 w-7 p-0"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAction("not_helpful")}
                    className="h-7 w-7 p-0"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
