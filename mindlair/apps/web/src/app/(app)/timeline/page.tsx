"use client";

import { useState, useEffect, useCallback } from "react";
import { TimelineScrubber } from "@/components/timeline-scrubber";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, Loader2 } from "lucide-react";

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  border: "#262626",
  text: "#f5f5f5",
  textSoft: "#a3a3a3",
  textMuted: "#737373",
  accent: "#d4915a",
};

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
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 
              className="text-2xl sm:text-3xl font-bold mb-2"
              style={{ color: C.text }}
            >
              Your Thinking Over Time
            </h1>
            <p style={{ color: C.textMuted }}>
              Watch how your interests and stances have evolved
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Interval selector */}
            <div 
              className="flex rounded-lg overflow-hidden"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              {(["day", "week", "month"] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className="px-3 py-1.5 text-sm font-medium transition-all"
                  style={{ 
                    background: interval === i ? C.accent : "transparent",
                    color: interval === i ? C.bg : C.textSoft,
                  }}
                >
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fetchTimeline()} 
              disabled={isLoading}
              className="h-9 w-9"
              style={{ 
                background: C.surface, 
                borderColor: C.border,
                color: C.textSoft,
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div 
            className="text-center py-16 rounded-2xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              onClick={() => fetchTimeline()}
              style={{ background: C.accent, color: C.bg }}
            >
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div 
            className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <Loader2 
              className="w-8 h-8 animate-spin mb-4" 
              style={{ color: C.accent }} 
            />
            <p style={{ color: C.textMuted }}>Loading your timeline...</p>
          </div>
        ) : timelineData && timelineData.snapshots.length > 0 ? (
          <TimelineScrubber
            snapshots={timelineData.snapshots}
            interval={timelineData.interval}
          />
        ) : (
          <div 
            className="text-center py-16 rounded-2xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <Calendar 
              className="w-12 h-12 mx-auto mb-4" 
              style={{ color: C.textMuted }} 
            />
            <p className="text-lg font-medium mb-2" style={{ color: C.text }}>
              No timeline data yet
            </p>
            <p style={{ color: C.textMuted }}>
              Start reading and reacting to content to build your timeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
