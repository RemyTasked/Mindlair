"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactionCard } from "./reaction-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Clock, Sparkles } from "lucide-react";

type Stance = "agree" | "disagree" | "complicated" | "skip";

interface DigestItem {
  claimId: string;
  claimText: string;
  claimType: "factual" | "opinion" | "prediction" | "policy";
  sourceUrl: string;
  sourceTitle: string;
  sourceOutlet?: string;
  concepts: string[];
  hasCounterAngle: boolean;
  priority: number;
}

interface DigestSessionProps {
  digestId: string;
  items: DigestItem[];
  onComplete: (reactions: Array<{ claimId: string; stance: Stance }>, durationMs: number) => void;
}

export function DigestSession({ digestId, items, onComplete }: DigestSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reactions, setReactions] = useState<Array<{ claimId: string; stance: Stance }>>([]);
  const [startTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;
  const hasCounterAngle = items.some((item) => item.hasCounterAngle);

  const handleReact = (claimId: string, stance: Stance) => {
    setReactions((prev) => [...prev, { claimId, stance }]);
    
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleSkip = (claimId: string) => {
    handleReact(claimId, "skip");
  };

  useEffect(() => {
    if (isComplete) {
      const duration = Date.now() - startTime;
      onComplete(reactions, duration);
    }
  }, [isComplete, reactions, startTime, onComplete]);

  if (isComplete) {
    return <DigestComplete reactions={reactions} duration={Date.now() - startTime} />;
  }

  if (!currentItem) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {currentIndex + 1} of {items.length}
            </Badge>
            {hasCounterAngle && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                <Sparkles className="w-3 h-3 mr-1" />
                Includes counter view
              </Badge>
            )}
          </div>
        </div>
        
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <ReactionCard
            key={currentItem.claimId}
            claimId={currentItem.claimId}
            claimText={currentItem.claimText}
            claimType={currentItem.claimType}
            sourceTitle={currentItem.sourceTitle}
            sourceUrl={currentItem.sourceUrl}
            outlet={currentItem.sourceOutlet}
            concepts={currentItem.concepts}
            hasCounterAngle={currentItem.hasCounterAngle}
            onReact={handleReact}
            onSkip={handleSkip}
          />
        </AnimatePresence>
        
        {items.slice(currentIndex + 1, currentIndex + 3).map((item, idx) => (
          <div
            key={item.claimId}
            className="absolute inset-0 -z-10"
            style={{
              transform: `translateY(${(idx + 1) * 8}px) scale(${1 - (idx + 1) * 0.02})`,
              opacity: 1 - (idx + 1) * 0.2,
            }}
          >
            <Card className="h-full bg-zinc-50 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DigestComplete({
  reactions,
  duration,
}: {
  reactions: Array<{ claimId: string; stance: Stance }>;
  duration: number;
}) {
  const reacted = reactions.filter((r) => r.stance !== "skip").length;
  const skipped = reactions.filter((r) => r.stance === "skip").length;
  const durationSec = Math.round(duration / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <Card className="p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Check className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Digest complete
        </h2>
        <p className="text-zinc-500 mb-6">
          Your belief map has been updated
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Stat label="Reacted" value={reacted} />
          <Stat label="Skipped" value={skipped} />
          <Stat label="Time" value={`${durationSec}s`} />
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild>
            <a href="/map">View your map</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="/inbox">Back to inbox</a>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
