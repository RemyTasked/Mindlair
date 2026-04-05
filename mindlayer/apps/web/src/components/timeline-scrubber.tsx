"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles } from "lucide-react";

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

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  muted: "#7a7469",
  accent: "#d4915a",
  positive: { bg: "#d4915a", text: "#0f0e0c" },
  negative: { bg: "#e57373", text: "#0f0e0c" },
  mixed: { bg: "#a3c47a", text: "#0f0e0c" },
  neutral: { bg: "#4a4640", text: "#e8e4dc" },
};

export function TimelineScrubber({ snapshots, interval }: TimelineScrubberProps) {
  const [currentIndex, setCurrentIndex] = useState(snapshots.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const currentSnapshot = snapshots[currentIndex];
  const previousSnapshot = currentIndex > 0 ? snapshots[currentIndex - 1] : null;

  // Calculate max count for sizing
  const maxCount = useMemo(() => {
    let max = 1;
    snapshots.forEach(s => {
      s.conceptStates.forEach(c => {
        if (c.positionCount > max) max = c.positionCount;
      });
    });
    return max;
  }, [snapshots]);

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(snapshots.length - 1, index)));
  };

  const handlePrevious = () => goToIndex(currentIndex - 1);
  const handleNext = () => goToIndex(currentIndex + 1);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    } else {
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, snapshots.length]);

  const handleSliderInteraction = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    goToIndex(Math.round(percent * (snapshots.length - 1)));
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
      <div 
        className="text-center py-16 rounded-2xl"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: C.muted }} />
        <p style={{ color: C.muted }}>
          Not enough data yet. Keep reading and reacting to see your thinking evolve.
        </p>
      </div>
    );
  }

  // Sort concepts by count for better visual flow
  const sortedConcepts = currentSnapshot?.conceptStates
    .slice()
    .sort((a, b) => b.positionCount - a.positionCount) || [];

  return (
    <div className="space-y-6">
      {/* Flowing Concept River */}
      <div 
        className="relative overflow-hidden rounded-2xl"
        style={{ 
          background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bg} 100%)`,
          border: `1px solid ${C.border}`,
          minHeight: 320,
        }}
      >
        {/* Ambient background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full opacity-10"
              style={{
                background: C.accent,
                width: 100 + i * 50,
                height: 100 + i * 50,
              }}
              animate={{
                x: [0, 30, 0],
                y: [0, -20, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
              initial={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
              }}
            />
          ))}
        </div>

        {/* Date header */}
        <div className="relative z-10 p-6 pb-2">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h2 className="text-2xl font-bold" style={{ color: C.text }}>
                {currentSnapshot && formatDate(currentSnapshot.date)}
              </h2>
              <p className="text-sm" style={{ color: C.muted }}>
                {sortedConcepts.length} concepts in your mind
              </p>
            </div>
            {isPlaying && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1 rounded-full"
                style={{ background: `${C.accent}30`, color: C.accent }}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="text-xs font-medium">Flowing</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Concept Flow Area */}
        <div className="relative z-10 px-6 pb-6 min-h-[200px]">
          <LayoutGroup>
            <motion.div 
              className="flex flex-wrap gap-3 justify-center items-center"
              layout
            >
              <AnimatePresence mode="popLayout">
                {sortedConcepts.map((concept, index) => (
                  <FlowingConcept
                    key={concept.conceptId}
                    concept={concept}
                    maxCount={maxCount}
                    index={index}
                    previousConcept={previousSnapshot?.conceptStates.find(
                      c => c.conceptId === concept.conceptId
                    )}
                    isNew={!previousSnapshot?.conceptStates.find(
                      c => c.conceptId === concept.conceptId
                    )}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          {sortedConcepts.length === 0 && (
            <div className="flex items-center justify-center h-[200px]">
              <p style={{ color: C.muted }}>No concepts at this point in time</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div 
        className="rounded-xl p-4"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="shrink-0"
            style={{ color: currentIndex === 0 ? C.muted : C.text }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePlay}
            className="shrink-0"
            style={{ color: C.text }}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            {/* Scrubber track */}
            <div
              ref={sliderRef}
              className="relative h-3 rounded-full cursor-pointer"
              style={{ background: C.border }}
              onClick={(e) => handleSliderInteraction(e.clientX)}
              onMouseDown={(e) => {
                setIsDragging(true);
                handleSliderInteraction(e.clientX);
              }}
              onMouseMove={(e) => {
                if (isDragging) handleSliderInteraction(e.clientX);
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onTouchStart={(e) => {
                setIsDragging(true);
                handleSliderInteraction(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                if (isDragging) handleSliderInteraction(e.touches[0].clientX);
              }}
              onTouchEnd={() => setIsDragging(false)}
            >
              {/* Timeline markers */}
              {snapshots.map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
                  style={{ 
                    left: `${(i / (snapshots.length - 1)) * 100}%`,
                    background: i <= currentIndex ? C.accent : C.muted,
                    opacity: 0.5,
                  }}
                />
              ))}
              
              {/* Progress fill */}
              <motion.div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, ${C.accent}, #e8a87c)`,
                }}
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              
              {/* Scrubber handle */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
                style={{ 
                  background: C.text,
                  border: `3px solid ${C.accent}`,
                }}
                initial={false}
                animate={{ left: `calc(${progress}% - 10px)` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
              />
            </div>

            {/* Date labels */}
            <div className="flex justify-between text-xs" style={{ color: C.muted }}>
              <span>{formatDate(snapshots[0].date)}</span>
              <span>{formatDate(snapshots[snapshots.length - 1].date)}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === snapshots.length - 1}
            className="shrink-0"
            style={{ color: currentIndex === snapshots.length - 1 ? C.muted : C.text }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Evolution insights */}
      <EvolutionInsights snapshots={snapshots} currentIndex={currentIndex} />
    </div>
  );
}

function FlowingConcept({
  concept,
  maxCount,
  index,
  previousConcept,
  isNew,
}: {
  concept: ConceptState;
  maxCount: number;
  index: number;
  previousConcept?: ConceptState;
  isNew: boolean;
}) {
  // Size based on engagement (positionCount)
  const sizeScale = 0.7 + (concept.positionCount / maxCount) * 0.6;
  const basePadding = 12;
  const padding = basePadding * sizeScale;
  
  // Color based on direction
  const colors = {
    positive: { bg: C.positive.bg, text: C.positive.text, glow: C.accent },
    negative: { bg: C.negative.bg, text: C.negative.text, glow: "#e57373" },
    mixed: { bg: C.mixed.bg, text: C.mixed.text, glow: "#a3c47a" },
  }[concept.direction] || { bg: C.neutral.bg, text: C.neutral.text, glow: C.muted };

  // Detect if direction changed
  const directionChanged = previousConcept && previousConcept.direction !== concept.direction;
  const countIncreased = previousConcept && concept.positionCount > previousConcept.positionCount;

  return (
    <motion.div
      layout
      layoutId={concept.conceptId}
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 25 },
        scale: { type: "spring", stiffness: 400, damping: 25 },
        opacity: { duration: 0.2 },
      }}
      whileHover={{ scale: sizeScale * 1.1, zIndex: 10 }}
      className="relative cursor-pointer"
      style={{ zIndex: 5 - index }}
    >
      {/* Glow effect for new or changed concepts */}
      {(isNew || directionChanged) && (
        <motion.div
          className="absolute inset-0 rounded-full blur-md"
          style={{ background: colors.glow }}
          initial={{ opacity: 0.8, scale: 1.5 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      )}
      
      {/* Pulse effect for growing concepts */}
      {countIncreased && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${colors.glow}` }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}

      <motion.div
        className="relative rounded-full font-medium flex items-center gap-2"
        style={{
          background: colors.bg,
          color: colors.text,
          padding: `${padding * 0.6}px ${padding * 1.2}px`,
          fontSize: 12 + sizeScale * 4,
          boxShadow: `0 4px 20px ${colors.glow}30`,
        }}
      >
        <span>{concept.label}</span>
        <motion.span 
          className="opacity-70 text-xs"
          key={concept.positionCount}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
        >
          {concept.positionCount}
        </motion.span>
        
        {/* Direction indicator */}
        {concept.direction === "positive" && (
          <span className="opacity-60">↑</span>
        )}
        {concept.direction === "negative" && (
          <span className="opacity-60">↓</span>
        )}
        {concept.direction === "mixed" && (
          <span className="opacity-60">↕</span>
        )}
      </motion.div>
    </motion.div>
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
      type: "new" | "changed" | "strengthened" | "faded";
      label: string;
      detail: string;
      icon: string;
    }> = [];

    // Find new concepts
    currentConcepts.forEach((concept, id) => {
      if (!previousConcepts.has(id)) {
        results.push({
          type: "new",
          label: concept.label,
          detail: `Emerged with ${concept.direction} stance`,
          icon: "✦",
        });
      } else {
        const prev = previousConcepts.get(id)!;
        if (prev.direction !== concept.direction) {
          results.push({
            type: "changed",
            label: concept.label,
            detail: `Shifted from ${prev.direction} to ${concept.direction}`,
            icon: "↺",
          });
        } else if (concept.positionCount > prev.positionCount + 2) {
          results.push({
            type: "strengthened",
            label: concept.label,
            detail: `Deepened (${prev.positionCount} → ${concept.positionCount})`,
            icon: "↑",
          });
        }
      }
    });

    // Find concepts that faded
    previousConcepts.forEach((prev, id) => {
      if (!currentConcepts.has(id)) {
        results.push({
          type: "faded",
          label: prev.label,
          detail: "Faded from active thinking",
          icon: "↓",
        });
      }
    });

    return results.slice(0, 4);
  }, [snapshots, currentIndex]);

  if (insights.length === 0) return null;

  const typeColors = {
    new: { bg: `${C.accent}20`, border: C.accent, text: C.accent },
    changed: { bg: "#a3c47a20", border: "#a3c47a", text: "#a3c47a" },
    strengthened: { bg: "#4a9eff20", border: "#4a9eff", text: "#4a9eff" },
    faded: { bg: `${C.muted}20`, border: C.muted, text: C.muted },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <h3 className="text-sm font-medium mb-3" style={{ color: C.muted }}>
        What shifted
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, i) => {
            const colors = typeColors[insight.type];
            return (
              <motion.div
                key={`${insight.label}-${insight.type}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ 
                  background: colors.bg,
                  border: `1px solid ${colors.border}30`,
                }}
              >
                <span 
                  className="text-lg"
                  style={{ color: colors.text }}
                >
                  {insight.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate" style={{ color: C.text }}>
                    {insight.label}
                  </p>
                  <p className="text-xs truncate" style={{ color: C.muted }}>
                    {insight.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
