"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
} from "lucide-react";

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
  surfaceAlt: "#211f1c",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  textMuted: "#7a7469",
  accent: "#d4915a",
  accentSoft: "rgba(212, 145, 90, 0.15)",
  positive: "#a3c47a",
  positiveSoft: "rgba(163, 196, 122, 0.15)",
  negative: "#e57373",
  negativeSoft: "rgba(229, 115, 115, 0.15)",
  mixed: "#b89cd6",
  mixedSoft: "rgba(184, 156, 214, 0.15)",
  blue: "#4a9eff",
  blueSoft: "rgba(74, 158, 255, 0.15)",
};

export function TimelineScrubber({ snapshots, interval }: TimelineScrubberProps) {
  const [currentIndex, setCurrentIndex] = useState(snapshots.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);
  // 1 = Slow, 2 = Normal, 3 = Fast. Labels show as ms-per-snapshot for transparency.
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 3>(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const playingRef = useRef(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startIndex: number; activated: boolean } | null>(null);

  // ms per snapshot - longer = more time to read each step
  const SPEED_MS: Record<1 | 2 | 3, number> = { 1: 3200, 2: 2000, 3: 1100 };
  const SPEED_LABEL: Record<1 | 2 | 3, string> = { 1: "Slow", 2: "Normal", 3: "Fast" };

  const currentSnapshot = snapshots[currentIndex];
  const previousSnapshot = currentIndex > 0 ? snapshots[currentIndex - 1] : null;
  const firstSnapshot = snapshots[0];

  const maxCount = useMemo(() => {
    let max = 1;
    snapshots.forEach(s => {
      s.conceptStates.forEach(c => {
        if (c.positionCount > max) max = c.positionCount;
      });
    });
    return max;
  }, [snapshots]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(snapshots.length - 1, index)));
  }, [snapshots.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);
  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(snapshots.length - 1, prev + 1));
  }, [snapshots.length]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      const next = !prev;
      if (next) {
        setCurrentIndex(idx => (idx >= snapshots.length - 1 ? 0 : idx));
      }
      return next;
    });
  }, [snapshots.length]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  // rAF-driven playback. Holds 60% of each interval, advances on the back 40% -
  // gives the eye room to breathe between snapshots while keeping motion present.
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = 0;
      return;
    }
    const tick = (ts: number) => {
      if (!playingRef.current) return;
      if (!lastTickRef.current) lastTickRef.current = ts;
      const dt = ts - lastTickRef.current;
      if (dt >= SPEED_MS[playbackSpeed]) {
        lastTickRef.current = ts;
        setCurrentIndex(prev => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, snapshots.length, playbackSpeed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext, togglePlay]);

  const DRAG_THRESHOLD = 4; // px before a press becomes a drag

  const handleSliderClick = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    goToIndex(Math.round(percent * (snapshots.length - 1)));
  };

  const handlePressStart = (clientX: number) => {
    if (!sliderRef.current) return;
    dragStartRef.current = { startX: clientX, startIndex: currentIndex, activated: false };
  };

  const handlePressMove = (clientX: number) => {
    if (!sliderRef.current || !dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.startX;
    if (!dragStartRef.current.activated) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
      dragStartRef.current.activated = true;
      setIsDragging(true);
    }
    const rect = sliderRef.current.getBoundingClientRect();
    const pixelsPerSnapshot = rect.width / Math.max(1, snapshots.length - 1);
    const snapshotDelta = Math.round(deltaX / pixelsPerSnapshot);
    const newIndex = Math.max(
      0,
      Math.min(snapshots.length - 1, dragStartRef.current.startIndex + snapshotDelta)
    );
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const handlePressEnd = (clientX?: number) => {
    if (dragStartRef.current && !dragStartRef.current.activated && clientX !== undefined) {
      // press without enough movement = click
      handleSliderClick(clientX);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: interval === "month" ? "numeric" : undefined,
    });
  };

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const progress = snapshots.length > 1 
    ? (currentIndex / (snapshots.length - 1)) * 100 
    : 100;

  // Categorize concepts by their trajectory
  const categorizedConcepts = useMemo(() => {
    if (!currentSnapshot) return { active: [], rising: [], steady: [], fading: [] };

    const previousMap = new Map(
      previousSnapshot?.conceptStates.map(c => [c.conceptId, c]) || []
    );
    const firstMap = new Map(
      firstSnapshot?.conceptStates.map(c => [c.conceptId, c]) || []
    );

    const active: (ConceptState & { trend: string; delta: number })[] = [];
    const rising: (ConceptState & { trend: string; delta: number })[] = [];
    const steady: (ConceptState & { trend: string; delta: number })[] = [];
    const fading: (ConceptState & { trend: string; delta: number })[] = [];

    for (const concept of currentSnapshot.conceptStates) {
      const prev = previousMap.get(concept.conceptId);
      const first = firstMap.get(concept.conceptId);
      const isNew = !prev;
      const delta = prev ? concept.positionCount - prev.positionCount : concept.positionCount;
      const totalGrowth = first ? concept.positionCount - first.positionCount : concept.positionCount;

      const enrichedConcept = { ...concept, trend: "steady", delta };

      if (isNew) {
        enrichedConcept.trend = "new";
        rising.push(enrichedConcept);
      } else if (delta > 0) {
        enrichedConcept.trend = "rising";
        rising.push(enrichedConcept);
      } else if (totalGrowth > 2 && concept.positionCount >= 3) {
        enrichedConcept.trend = "active";
        active.push(enrichedConcept);
      } else if (concept.positionCount >= 2) {
        enrichedConcept.trend = "steady";
        steady.push(enrichedConcept);
      } else {
        enrichedConcept.trend = "fading";
        fading.push(enrichedConcept);
      }
    }

    // Sort each category by position count
    const sortByCount = (a: ConceptState, b: ConceptState) => b.positionCount - a.positionCount;
    active.sort(sortByCount);
    rising.sort(sortByCount);
    steady.sort(sortByCount);
    fading.sort(sortByCount);

    return { active, rising, steady, fading };
  }, [currentSnapshot, previousSnapshot, firstSnapshot]);

  // Get concept history across all snapshots for tooltip
  const getConceptHistory = useCallback((conceptId: string) => {
    const history: { date: string; count: number; direction: string }[] = [];
    for (const snap of snapshots) {
      const concept = snap.conceptStates.find(c => c.conceptId === conceptId);
      if (concept) {
        history.push({
          date: snap.date,
          count: concept.positionCount,
          direction: concept.direction,
        });
      }
    }
    return history;
  }, [snapshots]);

  if (snapshots.length === 0) {
    return (
      <div 
        className="text-center py-16 rounded-2xl"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: C.textMuted }} />
        <p style={{ color: C.textMuted }}>
          Not enough data yet. Keep reading and reacting to see your thinking evolve.
        </p>
      </div>
    );
  }

  const totalConcepts = currentSnapshot?.conceptStates.length || 0;
  const totalPositions = currentSnapshot?.conceptStates.reduce((sum, c) => sum + c.positionCount, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Main Timeline View */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        {/* Header with date and stats */}
        <div className="p-5 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-start justify-between">
            <div>
              <motion.h2
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-xl font-semibold"
                style={{ color: C.text }}
              >
                {formatDateFull(currentSnapshot?.date || "")}
              </motion.h2>
              <p className="text-sm mt-1" style={{ color: C.textMuted }}>
                {totalConcepts} topics · {totalPositions} positions taken
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: C.accentSoft, color: C.accent }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-current"
                  />
                  Playing
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Concept River - organized in lanes */}
        <div className="p-5 space-y-5">
          {/* Rising / New concepts */}
          {categorizedConcepts.rising.length > 0 && (
            <ConceptLane
              title="Rising"
              icon={<TrendingUp size={14} />}
              concepts={categorizedConcepts.rising}
              maxCount={maxCount}
              accentColor={C.positive}
              accentSoft={C.positiveSoft}
              hoveredConcept={hoveredConcept}
              setHoveredConcept={setHoveredConcept}
              getConceptHistory={getConceptHistory}
              currentIndex={currentIndex}
              snapshots={snapshots}
            />
          )}

          {/* Active / Engaged concepts */}
          {categorizedConcepts.active.length > 0 && (
            <ConceptLane
              title="Active"
              icon={<Sparkles size={14} />}
              concepts={categorizedConcepts.active}
              maxCount={maxCount}
              accentColor={C.accent}
              accentSoft={C.accentSoft}
              hoveredConcept={hoveredConcept}
              setHoveredConcept={setHoveredConcept}
              getConceptHistory={getConceptHistory}
              currentIndex={currentIndex}
              snapshots={snapshots}
            />
          )}

          {/* Steady concepts */}
          {categorizedConcepts.steady.length > 0 && (
            <ConceptLane
              title="Steady"
              icon={<Minus size={14} />}
              concepts={categorizedConcepts.steady}
              maxCount={maxCount}
              accentColor={C.textSoft}
              accentSoft={C.surfaceAlt}
              hoveredConcept={hoveredConcept}
              setHoveredConcept={setHoveredConcept}
              getConceptHistory={getConceptHistory}
              currentIndex={currentIndex}
              snapshots={snapshots}
              dimmed
            />
          )}

          {/* Fading concepts */}
          {categorizedConcepts.fading.length > 0 && (
            <ConceptLane
              title="Fading"
              icon={<TrendingDown size={14} />}
              concepts={categorizedConcepts.fading}
              maxCount={maxCount}
              accentColor={C.textMuted}
              accentSoft={C.surfaceAlt}
              hoveredConcept={hoveredConcept}
              setHoveredConcept={setHoveredConcept}
              getConceptHistory={getConceptHistory}
              currentIndex={currentIndex}
              snapshots={snapshots}
              dimmed
            />
          )}

          {totalConcepts === 0 && (
            <div className="text-center py-12" style={{ color: C.textMuted }}>
              <Clock size={32} className="mx-auto mb-3 opacity-50" />
              <p>No concepts at this point in time</p>
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
            className="shrink-0 h-9 w-9"
            style={{ color: currentIndex === 0 ? C.textMuted : C.text }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="shrink-0 h-9 w-9"
            style={{ color: C.text }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>

          {/* Speed control */}
          <button
            onClick={() => setPlaybackSpeed(prev => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)))}
            className="shrink-0 h-9 px-3 rounded-md text-xs font-medium transition-colors"
            style={{
              background: C.surfaceAlt,
              color: C.textSoft,
              border: `1px solid ${C.border}`,
            }}
            title={`Playback speed: ${SPEED_LABEL[playbackSpeed]} (${(SPEED_MS[playbackSpeed] / 1000).toFixed(1)}s per step)`}
          >
            {SPEED_LABEL[playbackSpeed]}
          </button>

          <div className="flex-1 space-y-2">
            {/* Scrubber track */}
            <div
              ref={sliderRef}
              className="relative h-2 rounded-full cursor-pointer group"
              style={{ background: C.border, touchAction: "none" }}
              onMouseDown={(e) => {
                e.preventDefault();
                handlePressStart(e.clientX);
              }}
              onMouseMove={(e) => {
                handlePressMove(e.clientX);
              }}
              onMouseUp={(e) => handlePressEnd(e.clientX)}
              onMouseLeave={() => handlePressEnd()}
              onTouchStart={(e) => {
                handlePressStart(e.touches[0].clientX);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                handlePressMove(e.touches[0].clientX);
              }}
              onTouchEnd={(e) => {
                const t = e.changedTouches[0];
                handlePressEnd(t?.clientX);
              }}
            >
              {/* Activity indicator dots */}
              {snapshots.map((snap, i) => {
                const activity = snap.conceptStates.length;
                const maxActivity = Math.max(...snapshots.map(s => s.conceptStates.length));
                const opacity = 0.2 + (activity / maxActivity) * 0.6;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 rounded-full transition-all pointer-events-none"
                    style={{
                      left: `${(i / Math.max(1, snapshots.length - 1)) * 100}%`,
                      width: i === currentIndex ? 6 : 3,
                      height: i === currentIndex ? 6 : 3,
                      background: i <= currentIndex ? C.accent : C.textMuted,
                      opacity: i === currentIndex ? 1 : opacity,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                );
              })}

              {/* Progress fill - no animation when dragging or playing, gentle ease otherwise */}
              <div
                className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
                style={{
                  background: C.accent,
                  width: `${progress}%`,
                  transition: isDragging || isPlaying ? "none" : "width 0.2s ease-out",
                }}
              />

              {/* Scrubber handle */}
              <div
                className="absolute top-1/2 w-4 h-4 rounded-full shadow-lg pointer-events-none"
                style={{
                  background: C.text,
                  border: `2px solid ${C.accent}`,
                  left: `calc(${progress}% - 8px)`,
                  transform: "translateY(-50%)",
                  transition: isDragging || isPlaying ? "none" : "left 0.2s ease-out",
                }}
              />
            </div>

            {/* Date labels */}
            <div className="flex justify-between text-xs" style={{ color: C.textMuted }}>
              <span>{formatDate(snapshots[0].date)}</span>
              <span className="font-medium" style={{ color: C.textSoft }}>
                {currentIndex + 1} of {snapshots.length}
              </span>
              <span>{formatDate(snapshots[snapshots.length - 1].date)}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === snapshots.length - 1}
            className="shrink-0 h-9 w-9"
            style={{ color: currentIndex === snapshots.length - 1 ? C.textMuted : C.text }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs mt-3" style={{ color: C.textMuted }}>
          ← → step · Space play / pause · Click or drag to scrub
        </p>
      </div>

      {/* Summary Card */}
      <SummaryCard 
        snapshots={snapshots} 
        currentIndex={currentIndex}
        categorizedConcepts={categorizedConcepts}
      />
    </div>
  );
}

function ConceptLane({
  title,
  icon,
  concepts,
  maxCount,
  accentColor,
  accentSoft,
  hoveredConcept,
  setHoveredConcept,
  getConceptHistory,
  currentIndex,
  snapshots,
  dimmed = false,
  maxVisible = 12,
}: {
  title: string;
  icon: React.ReactNode;
  concepts: (ConceptState & { trend: string; delta: number })[];
  maxCount: number;
  accentColor: string;
  accentSoft: string;
  hoveredConcept: string | null;
  setHoveredConcept: (id: string | null) => void;
  getConceptHistory: (id: string) => { date: string; count: number; direction: string }[];
  currentIndex: number;
  snapshots: Snapshot[];
  dimmed?: boolean;
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleConcepts = expanded ? concepts : concepts.slice(0, maxVisible);
  const hasMore = concepts.length > maxVisible;

  return (
    <div className={dimmed ? "opacity-60" : ""}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: accentColor }}>
          {title}
        </span>
        <span className="text-xs" style={{ color: C.textMuted }}>
          ({concepts.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {visibleConcepts.map((concept) => (
            <ConceptChip
              key={concept.conceptId}
              concept={concept}
              maxCount={maxCount}
              accentColor={accentColor}
              accentSoft={accentSoft}
              isHovered={hoveredConcept === concept.conceptId}
              onHover={() => setHoveredConcept(concept.conceptId)}
              onLeave={() => setHoveredConcept(null)}
              history={getConceptHistory(concept.conceptId)}
              currentIndex={currentIndex}
              totalSnapshots={snapshots.length}
            />
          ))}
        </AnimatePresence>
        {hasMore && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{ 
              background: C.surfaceAlt, 
              color: C.textSoft,
              border: `1px solid ${C.border}`,
            }}
          >
            {expanded ? "Show less" : `+${concepts.length - maxVisible} more`}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function ConceptChip({
  concept,
  maxCount,
  accentColor,
  accentSoft,
  isHovered,
  onHover,
  onLeave,
  history,
  currentIndex,
  totalSnapshots,
}: {
  concept: ConceptState & { trend: string; delta: number };
  maxCount: number;
  accentColor: string;
  accentSoft: string;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  history: { date: string; count: number; direction: string }[];
  currentIndex: number;
  totalSnapshots: number;
}) {
  const sizeScale = 0.85 + (concept.positionCount / maxCount) * 0.3;
  
  const directionIcon = {
    positive: "↑",
    negative: "↓",
    mixed: "↕",
  }[concept.direction] || "";

  const directionColor = {
    positive: C.positive,
    negative: C.negative,
    mixed: C.mixed,
  }[concept.direction] || C.textMuted;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <motion.div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-default select-none"
        style={{
          background: isHovered ? accentSoft : C.surfaceAlt,
          border: `1px solid ${isHovered ? accentColor : C.border}`,
          fontSize: 12 + sizeScale * 2,
        }}
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <span style={{ color: C.text }}>{concept.label}</span>
        <span 
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{ 
            background: `${directionColor}20`,
            color: directionColor,
          }}
        >
          {concept.positionCount}
          {directionIcon && <span className="ml-0.5">{directionIcon}</span>}
        </span>
        {concept.delta > 0 && concept.trend !== "new" && (
          <span className="text-xs" style={{ color: C.positive }}>
            +{concept.delta}
          </span>
        )}
        {concept.trend === "new" && (
          <span 
            className="text-xs px-1 rounded"
            style={{ background: `${C.positive}20`, color: C.positive }}
          >
            new
          </span>
        )}
      </motion.div>

      {/* Tooltip with history sparkline */}
      <AnimatePresence>
        {isHovered && history.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 left-0 top-full mt-2 p-3 rounded-lg shadow-xl min-w-[200px]"
            style={{ 
              background: C.surface, 
              border: `1px solid ${C.border}`,
            }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: C.text }}>
              {concept.label}
            </p>
            <div className="flex items-end gap-0.5 h-8 mb-2">
              {history.map((h, i) => {
                const maxH = Math.max(...history.map(x => x.count));
                const height = (h.count / maxH) * 100;
                const isCurrent = i === history.length - 1;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${height}%`,
                      background: isCurrent ? accentColor : C.border,
                      minHeight: 2,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-xs" style={{ color: C.textMuted }}>
              {history.length} snapshots · Started with {history[0]?.count || 0} positions
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryCard({
  snapshots,
  currentIndex,
  categorizedConcepts,
}: {
  snapshots: Snapshot[];
  currentIndex: number;
  categorizedConcepts: {
    active: (ConceptState & { trend: string; delta: number })[];
    rising: (ConceptState & { trend: string; delta: number })[];
    steady: (ConceptState & { trend: string; delta: number })[];
    fading: (ConceptState & { trend: string; delta: number })[];
  };
}) {
  const current = snapshots[currentIndex];
  const first = snapshots[0];
  
  if (!current || !first) return null;

  const currentTotal = current.conceptStates.length;
  const firstTotal = first.conceptStates.length;
  const growth = currentTotal - firstTotal;

  const totalPositionsNow = current.conceptStates.reduce((sum, c) => sum + c.positionCount, 0);
  const totalPositionsThen = first.conceptStates.reduce((sum, c) => sum + c.positionCount, 0);
  const positionsGrowth = totalPositionsNow - totalPositionsThen;

  // Find most engaged concept
  const topConcept = current.conceptStates.reduce(
    (best, c) => c.positionCount > (best?.positionCount || 0) ? c : best,
    null as ConceptState | null
  );

  return (
    <div 
      className="rounded-xl p-4"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <h3 className="text-sm font-medium mb-3" style={{ color: C.textSoft }}>
        Your Thinking at a Glance
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox
          label="Topics"
          value={currentTotal}
          delta={currentIndex > 0 ? growth : undefined}
        />
        <StatBox
          label="Positions"
          value={totalPositionsNow}
          delta={currentIndex > 0 ? positionsGrowth : undefined}
        />
        <StatBox
          label="Rising Now"
          value={categorizedConcepts.rising.length}
          color={C.positive}
        />
        <StatBox
          label="Top Topic"
          value={topConcept?.label || "—"}
          isText
        />
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  delta,
  color,
  isText,
}: {
  label: string;
  value: number | string;
  delta?: number;
  color?: string;
  isText?: boolean;
}) {
  return (
    <div 
      className="p-3 rounded-lg"
      style={{ background: C.surfaceAlt }}
    >
      <p className="text-xs mb-1" style={{ color: C.textMuted }}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span 
          className={isText ? "text-sm font-medium truncate" : "text-lg font-semibold"}
          style={{ color: color || C.text }}
        >
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span 
            className="text-xs"
            style={{ color: delta > 0 ? C.positive : C.negative }}
          >
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
    </div>
  );
}
