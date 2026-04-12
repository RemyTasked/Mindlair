"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Lightbulb, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  Share2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Zap,
  Clock,
  Settings,
  X,
  Check,
} from "lucide-react";
import { getDomainFromUrl } from "@/lib/utils";
import type { Nudge } from "@/types/api";
import Link from "next/link";

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
  blue: "#4a9eff",
};

const DAILY_NUDGE_LIMIT = 5;

export default function NudgesPage() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagedToday, setEngagedToday] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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
      setNudges(data.nudges || []);
      
      // Get today's engagement count from localStorage
      const today = new Date().toDateString();
      const stored = localStorage.getItem("nudge_engaged");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          setEngagedToday(parsed.count);
        }
      }
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

      if (action === "clicked") {
        // Update engagement count
        const today = new Date().toDateString();
        const newCount = engagedToday + 1;
        setEngagedToday(newCount);
        localStorage.setItem("nudge_engaged", JSON.stringify({ date: today, count: newCount }));
      }

      if (action === "clicked" || action === "dismissed") {
        setDismissedIds(prev => new Set([...prev, nudgeId]));
        setTimeout(() => {
          setNudges((prev) => prev.filter((n) => n.id !== nudgeId));
        }, 300);
      }
    } catch (err) {
      console.error("Failed to update nudge:", err);
    }
  };

  const shareNudge = async (nudge: Nudge) => {
    const shareData = {
      title: `Check out this perspective on ${nudge.conceptLabel}`,
      text: nudge.framing,
      url: nudge.sourceUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${nudge.framing}\n\n${nudge.sourceUrl}`);
      alert("Link copied to clipboard!");
    }
  };

  // Group nudges by concept
  const groupedNudges = useMemo(() => {
    const groups: Record<string, Nudge[]> = {};
    nudges.forEach(nudge => {
      const key = nudge.conceptLabel || "General";
      if (!groups[key]) groups[key] = [];
      groups[key].push(nudge);
    });
    return groups;
  }, [nudges]);

  const categoryKeys = Object.keys(groupedNudges);
  const remainingToday = Math.max(0, DAILY_NUDGE_LIMIT - engagedToday);

  // Toggle category expansion
  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Expand all by default
  useEffect(() => {
    setExpandedCategories(new Set(categoryKeys));
  }, [nudges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-6 h-6" style={{ color: C.muted }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: C.text }}>
            Nudges
          </h1>
          <p style={{ color: C.muted }}>
            Perspectives you haven&apos;t encountered yet. Swipe to explore.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchNudges}
          style={{ borderColor: C.border, color: C.textSoft }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Progress & Daily Limit */}
      {nudges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${C.accent}20` }}
              >
                <Zap className="w-5 h-5" style={{ color: C.accent }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: C.text }}>
                  Today&apos;s Progress
                </p>
                <p className="text-xs" style={{ color: C.muted }}>
                  {engagedToday} of {DAILY_NUDGE_LIMIT} nudges explored
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: C.accent }}>
                {remainingToday}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>remaining</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.green})` }}
              initial={{ width: 0 }}
              animate={{ width: `${(engagedToday / DAILY_NUDGE_LIMIT) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {remainingToday === 0 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-sm text-center"
              style={{ color: C.green }}
            >
              ✨ Great job! You&apos;ve hit your daily nudge goal. More tomorrow!
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Scheduling hint */}
      {nudges.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 p-3 rounded-lg flex items-center gap-3"
          style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}30` }}
        >
          <Clock className="w-4 h-4 shrink-0" style={{ color: C.blue }} />
          <p className="text-sm flex-1" style={{ color: C.textSoft }}>
            Nudges are delivered with your digest.{" "}
            <Link href="/settings" className="underline" style={{ color: C.blue }}>
              Adjust schedule →
            </Link>
          </p>
        </motion.div>
      )}

      {error ? (
        <div 
          className="text-center py-12 rounded-xl"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
        >
          <p className="mb-4" style={{ color: C.rose }}>{error}</p>
          <Button onClick={fetchNudges}>Try again</Button>
        </div>
      ) : nudges.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {categoryKeys.map((category, catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 rounded-lg mb-3 transition-colors"
                style={{ background: C.surface }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: `${C.accent}20` }}
                  >
                    <Target className="w-4 h-4" style={{ color: C.accent }} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium" style={{ color: C.text }}>{category}</p>
                    <p className="text-xs" style={{ color: C.muted }}>
                      {groupedNudges[category].length} nudge{groupedNudges[category].length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronUp className="w-5 h-5" style={{ color: C.muted }} />
                ) : (
                  <ChevronDown className="w-5 h-5" style={{ color: C.muted }} />
                )}
              </button>

              {/* Nudge cards */}
              <AnimatePresence>
                {expandedCategories.has(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {groupedNudges[category].map((nudge, index) => (
                      <SwipeableNudgeCard
                        key={nudge.id}
                        nudge={nudge}
                        index={index}
                        isDismissed={dismissedIds.has(nudge.id)}
                        onAction={(action) => handleNudgeAction(nudge.id, action)}
                        onShare={() => shareNudge(nudge)}
                        disabled={remainingToday === 0 && !dismissedIds.has(nudge.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SwipeableNudgeCard({
  nudge,
  index,
  isDismissed,
  onAction,
  onShare,
  disabled,
}: {
  nudge: Nudge;
  index: number;
  isDismissed: boolean;
  onAction: (action: "clicked" | "dismissed" | "helpful" | "not_helpful") => void;
  onShare: () => void;
  disabled: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Transform values for swipe indicators
  const leftOpacity = useTransform(x, [-100, 0], [1, 0]);
  const rightOpacity = useTransform(x, [0, 100], [0, 1]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swipe right = Read
      window.open(nudge.sourceUrl, "_blank");
      onAction("clicked");
      setShowFeedback(true);
    } else if (info.offset.x < -threshold) {
      // Swipe left = Dismiss
      onAction("dismissed");
    }
  };

  const typeColors = {
    echo_chamber: { bg: `${C.accent}20`, border: C.accent, text: C.accent, label: "Counter view" },
    blind_spot: { bg: `${C.blue}20`, border: C.blue, text: C.blue, label: "Blind spot" },
  };
  const typeStyle = typeColors[nudge.type] || typeColors.blind_spot;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isDismissed ? 0 : 1, 
        x: isDismissed ? -100 : 0,
        scale: isDismissed ? 0.8 : 1,
      }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="relative"
    >
      {/* Swipe indicators */}
      <motion.div
        className="absolute inset-0 rounded-xl flex items-center justify-start pl-6 pointer-events-none"
        style={{ background: C.rose, opacity: leftOpacity }}
      >
        <X className="w-8 h-8 text-white" />
        <span className="ml-2 font-medium text-white">Dismiss</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-xl flex items-center justify-end pr-6 pointer-events-none"
        style={{ background: C.green, opacity: rightOpacity }}
      >
        <span className="mr-2 font-medium text-white">Read</span>
        <Check className="w-8 h-8 text-white" />
      </motion.div>

      {/* Card */}
      <motion.div
        ref={cardRef}
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, scale, rotate }}
        className="relative rounded-xl p-5 cursor-grab active:cursor-grabbing"
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        initial={{ background: C.surface }}
        animate={{ background: C.surface }}
      >
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, background: C.surface }}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <motion.div 
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.accent}30, ${C.accent}10)` }}
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <Sparkles className="w-6 h-6" style={{ color: C.accent }} />
            </motion.div>

            <div className="flex-1 min-w-0">
              {/* Type badge */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span 
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}30` }}
                >
                  {typeStyle.label}
                </span>
                <span className="text-xs" style={{ color: C.muted }}>
                  on <strong style={{ color: C.textSoft }}>{nudge.conceptLabel}</strong>
                </span>
              </div>

              {/* Framing text */}
              <p className="text-base font-medium mb-3" style={{ color: C.text, lineHeight: 1.5 }}>
                {nudge.framing}
              </p>

              {/* Source link */}
              {nudge.sourceUrl && (
                <a
                  href={nudge.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm mb-4 hover:underline"
                  style={{ color: C.muted }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction("clicked");
                    setShowFeedback(true);
                  }}
                >
                  <BookOpen className="w-3 h-3" />
                  <span className="truncate">{nudge.sourceTitle || "Read more"}</span>
                  <span style={{ color: C.border }}>·</span>
                  <span className="flex-shrink-0">
                    {nudge.sourceOutlet || getDomainFromUrl(nudge.sourceUrl)}
                  </span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    window.open(nudge.sourceUrl, "_blank");
                    onAction("clicked");
                    setShowFeedback(true);
                  }}
                  style={{ 
                    background: disabled ? C.border : C.accent, 
                    color: disabled ? C.muted : C.bg,
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  Read it
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction("dismissed")}
                  style={{ color: C.muted }}
                >
                  Not now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onShare}
                  style={{ color: C.muted }}
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                {/* Feedback */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="ml-auto flex items-center gap-1 text-xs"
                      style={{ color: C.muted }}
                    >
                      <span>Helpful?</span>
                      <button
                        onClick={() => onAction("helpful")}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAction("not_helpful")}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Swipe hint on mobile */}
              <p className="mt-3 text-xs sm:hidden" style={{ color: C.muted }}>
                ← Swipe left to dismiss · Swipe right to read →
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyState() {
  const tips = [
    { icon: BookOpen, title: "Read articles", desc: "Import content from Readwise, Instapaper, or Google Takeout" },
    { icon: Target, title: "React to claims", desc: "Tell us what you agree or disagree with in your digest" },
    { icon: Sparkles, title: "Stay curious", desc: "Nudges appear when we spot one-sided patterns" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-8 text-center"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {/* Animated illustration */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `${C.accent}10` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full"
          style={{ background: `${C.accent}20` }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.div
          className="absolute inset-8 rounded-full flex items-center justify-center"
          style={{ background: `${C.accent}30` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        >
          <Lightbulb className="w-10 h-10" style={{ color: C.accent }} />
        </motion.div>
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: C.text }}>
        No nudges yet
      </h2>
      <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: C.muted }}>
        Nudges surface when you&apos;ve engaged deeply with a topic from one angle. 
        Here&apos;s how to get started:
      </p>

      {/* Tips */}
      <div className="grid gap-4 sm:grid-cols-3 text-left mb-8">
        {tips.map((tip, i) => (
          <motion.div
            key={tip.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-4 rounded-xl"
            style={{ background: C.bg, border: `1px solid ${C.border}` }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{ background: `${C.accent}20` }}
            >
              <tip.icon className="w-5 h-5" style={{ color: C.accent }} />
            </div>
            <p className="font-medium text-sm mb-1" style={{ color: C.text }}>
              {tip.title}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              {tip.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/settings">
          <Button style={{ background: C.accent, color: C.bg }}>
            <Settings className="w-4 h-4 mr-2" />
            Connect sources
          </Button>
        </Link>
        <Link href="/inbox">
          <Button variant="outline" style={{ borderColor: C.border, color: C.textSoft }}>
            <BookOpen className="w-4 h-4 mr-2" />
            Review inbox
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
