"use client";

import { useState, useEffect, useCallback } from "react";
import { TimelineScrubber } from "@/components/timeline-scrubber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

export default function TimelinePage() {
  const [timelineData, setTimelineData] = useState<{
    snapshots: Array<{
      date: string;
      conceptStates: Array<{
        conceptId: string;
        label: string;
        direction: string;
        positionCount: number;
      }>;
    }>;
    interval: "day" | "week" | "month";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"day" | "week" | "month">("week");

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/map/timeline?interval=${interval}`);
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch timeline");
      }
      const data = await response.json();
      setTimelineData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [interval]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Timeline
          </h1>
          <p className="text-zinc-500">
            Watch your thinking evolve. Drag to travel through time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {(["day", "week", "month"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  interval === i
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {i.charAt(0).toUpperCase() + i.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchTimeline} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchTimeline}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : timelineData ? (
        <TimelineScrubber
          snapshots={timelineData.snapshots}
          interval={timelineData.interval}
        />
      ) : null}
    </div>
  );
}
