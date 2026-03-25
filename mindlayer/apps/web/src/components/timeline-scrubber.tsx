"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConceptState {
  conceptId: string;
  label: string;
  direction: string;
  positionCount: number;
}

interface Snapshot {
  date: string;
  conceptStates: ConceptState[];
}

interface TimelineScrubberProps {
  snapshots: Snapshot[];
  interval: "day" | "week" | "month";
}

export function TimelineScrubber({ snapshots, interval }: TimelineScrubberProps) {
  const [currentIndex, setCurrentIndex] = useState(snapshots.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSnapshot = snapshots[currentIndex];

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(snapshots.length - 1, index)));
  };

  const handlePrevious = () => goToIndex(currentIndex - 1);
  const handleNext = () => goToIndex(currentIndex + 1);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Auto-advance through snapshots
      const advanceInterval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            clearInterval(advanceInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const progress = snapshots.length > 1 
    ? (currentIndex / (snapshots.length - 1)) * 100 
    : 100;

  if (snapshots.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-zinc-500">
            Not enough data yet. Keep reading and reacting to see your thinking
            evolve over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            <div className="flex-1 space-y-2">
              {/* Progress bar */}
              <div
                className="relative h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  goToIndex(Math.round(percent * (snapshots.length - 1)));
                }}
              >
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-full"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-zinc-900 border-2 border-rose-500 rounded-full shadow"
                  initial={false}
                  animate={{ left: `calc(${progress}% - 8px)` }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              {/* Date labels */}
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{formatDate(snapshots[0].date)}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {currentSnapshot && formatDate(currentSnapshot.date)}
                </span>
                <span>{formatDate(snapshots[snapshots.length - 1].date)}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === snapshots.length - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot view */}
      {currentSnapshot && (
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{formatDate(currentSnapshot.date)}</span>
                <Badge variant="secondary">
                  {currentSnapshot.conceptStates.length} concepts
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {currentSnapshot.conceptStates.map((concept) => (
                  <ConceptBadge
                    key={concept.conceptId}
                    label={concept.label}
                    direction={concept.direction}
                    count={concept.positionCount}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Evolution insights */}
      <EvolutionInsights snapshots={snapshots} currentIndex={currentIndex} />
    </div>
  );
}

function ConceptBadge({
  label,
  direction,
  count,
}: {
  label: string;
  direction: string;
  count: number;
}) {
  const bgColor = {
    positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    negative: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200",
    mixed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  }[direction] || "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";

  return (
    <motion.span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
        bgColor
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {label}
      <span className="text-xs opacity-60">({count})</span>
    </motion.span>
  );
}

function EvolutionInsights({
  snapshots,
  currentIndex,
}: {
  snapshots: Snapshot[];
  currentIndex: number;
}) {
  const insights = useMemo(() => {
    if (currentIndex === 0 || snapshots.length < 2) return [];

    const current = snapshots[currentIndex];
    const previous = snapshots[currentIndex - 1];

    const currentConcepts = new Map(
      current.conceptStates.map((c) => [c.conceptId, c])
    );
    const previousConcepts = new Map(
      previous.conceptStates.map((c) => [c.conceptId, c])
    );

    const results: Array<{
      type: "new" | "changed" | "strengthened";
      label: string;
      detail: string;
    }> = [];

    // Find new concepts
    currentConcepts.forEach((concept, id) => {
      if (!previousConcepts.has(id)) {
        results.push({
          type: "new",
          label: concept.label,
          detail: `New concept emerged with ${concept.direction} stance`,
        });
      } else {
        const prev = previousConcepts.get(id)!;
        if (prev.direction !== concept.direction) {
          results.push({
            type: "changed",
            label: concept.label,
            detail: `Changed from ${prev.direction} to ${concept.direction}`,
          });
        } else if (concept.positionCount > prev.positionCount + 2) {
          results.push({
            type: "strengthened",
            label: concept.label,
            detail: `Deepened engagement (${prev.positionCount} → ${concept.positionCount})`,
          });
        }
      }
    });

    return results.slice(0, 3);
  }, [snapshots, currentIndex]);

  if (insights.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          What Changed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900"
          >
            <Badge
              variant={
                insight.type === "new"
                  ? "success"
                  : insight.type === "changed"
                  ? "warning"
                  : "secondary"
              }
              className="flex-shrink-0"
            >
              {insight.type}
            </Badge>
            <div>
              <p className="font-medium text-sm">{insight.label}</p>
              <p className="text-xs text-zinc-500">{insight.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
