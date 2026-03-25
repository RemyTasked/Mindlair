"use client";

import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Stance = "agree" | "disagree" | "complicated" | "skip";

interface ReactionCardProps {
  claimId: string;
  claimText: string;
  claimType: "factual" | "opinion" | "prediction" | "policy";
  sourceTitle: string;
  sourceUrl: string;
  outlet?: string;
  concepts?: string[];
  hasCounterAngle?: boolean;
  onReact: (claimId: string, stance: Stance) => void;
  onSkip: (claimId: string) => void;
}

const stanceConfig: Record<
  Exclude<Stance, "skip">,
  { label: string; color: string }
> = {
  agree: { label: "Agree", color: "bg-emerald-500 hover:bg-emerald-600" },
  disagree: { label: "Disagree", color: "bg-rose-500 hover:bg-rose-600" },
  complicated: { label: "It's complicated", color: "bg-amber-500 hover:bg-amber-600" },
};

const claimTypeColors: Record<string, string> = {
  factual: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
  opinion: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
  prediction: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200",
  policy: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
};

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function ReactionCard({
  claimId,
  claimText,
  claimType,
  sourceTitle,
  sourceUrl,
  outlet,
  concepts,
  hasCounterAngle,
  onReact,
  onSkip,
}: ReactionCardProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right">("right");

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      setExitDirection(info.offset.x > 0 ? "right" : "left");
      setIsExiting(true);
      if (info.offset.x > 0) {
        onReact(claimId, "agree");
      } else {
        onReact(claimId, "disagree");
      }
    }
  };

  const handleReact = (stance: Stance) => {
    setIsExiting(true);
    setExitDirection(stance === "agree" ? "right" : "left");
    if (stance === "skip") {
      onSkip(claimId);
    } else {
      onReact(claimId, stance);
    }
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{
            opacity: 0,
            x: exitDirection === "right" ? 300 : -300,
            rotate: exitDirection === "right" ? 15 : -15,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="cursor-grab active:cursor-grabbing"
        >
          <Card className="p-6 shadow-xl border-2 border-zinc-100 dark:border-zinc-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {outlet || getDomainFromUrl(sourceUrl)}
                  </p>
                  <Badge className={cn("text-xs", claimTypeColors[claimType] || claimTypeColors.opinion)}>
                    {claimType}
                  </Badge>
                </div>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 line-clamp-1"
                >
                  {sourceTitle}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              {hasCounterAngle && (
                <Badge className="flex items-center gap-1 flex-shrink-0 ml-2 bg-amber-100 text-amber-800">
                  <Sparkles className="w-3 h-3" />
                  Counter
                </Badge>
              )}
            </div>

            <blockquote className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-4 leading-relaxed">
              &ldquo;{claimText}&rdquo;
            </blockquote>

            {concepts && concepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {concepts.slice(0, 4).map((concept) => (
                  <Badge key={concept} variant="secondary" className="text-xs">
                    {concept}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(Object.keys(stanceConfig) as Array<Exclude<Stance, "skip">>).map(
                (stance) => (
                  <Button
                    key={stance}
                    onClick={() => handleReact(stance)}
                    className={cn(
                      "flex-1 min-w-[80px] text-white",
                      stanceConfig[stance].color
                    )}
                  >
                    {stanceConfig[stance].label}
                  </Button>
                )
              )}
              <Button
                variant="ghost"
                onClick={() => handleReact("skip")}
                className="w-full mt-2 text-zinc-500"
              >
                Skip for now
              </Button>
            </div>

            <p className="text-xs text-zinc-400 text-center mt-4">
              Swipe right to agree · Swipe left to disagree
            </p>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
