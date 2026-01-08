/**
 * Milestone Toast Component
 * 
 * Shows animated toast notifications for milestones achieved.
 * Supports stacking multiple milestones.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

// Milestone notification type (matching backend)
export interface MilestoneNotification {
  type: string;
  title: string;
  message: string;
  emoji: string;
  points?: number;
}

interface MilestoneToastProps {
  milestones: MilestoneNotification[];
  onDismiss?: (type: string) => void;
  onDismissAll?: () => void;
  autoHideDuration?: number; // ms, default 5000
}

export default function MilestoneToast({
  milestones,
  onDismiss,
  onDismissAll,
  autoHideDuration = 5000,
}: MilestoneToastProps) {
  const [visibleMilestones, setVisibleMilestones] = useState<MilestoneNotification[]>([]);
  
  // Update visible milestones when prop changes
  useEffect(() => {
    if (milestones.length > 0) {
      setVisibleMilestones(milestones);
    }
  }, [milestones]);
  
  // Auto-dismiss after duration
  useEffect(() => {
    if (visibleMilestones.length > 0 && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setVisibleMilestones([]);
        onDismissAll?.();
      }, autoHideDuration + (visibleMilestones.length - 1) * 500);
      
      return () => clearTimeout(timer);
    }
  }, [visibleMilestones, autoHideDuration, onDismissAll]);
  
  const handleDismiss = (type: string) => {
    setVisibleMilestones(prev => prev.filter(m => m.type !== type));
    onDismiss?.(type);
  };
  
  if (visibleMilestones.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {visibleMilestones.map((milestone, index) => (
          <motion.div
            key={milestone.type}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 25,
              delay: index * 0.1,
            }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 to-teal-900 border border-teal-700/50 shadow-xl shadow-teal-500/20"
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.5, delay: index * 0.1 }}
            />
            
            {/* Content */}
            <div className="relative p-4 flex items-start gap-3">
              {/* Emoji */}
              <motion.div
                className="text-3xl"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.2 + index * 0.1 }}
              >
                {milestone.emoji}
              </motion.div>
              
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm">
                  {milestone.title}
                </h4>
                <p className="text-teal-200/80 text-xs mt-0.5">
                  {milestone.message}
                </p>
                {milestone.points && milestone.points > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-1 mt-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 text-xs font-medium">
                      +{milestone.points} bonus growth!
                    </span>
                  </motion.div>
                )}
              </div>
              
              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(milestone.type)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-teal-300/60 hover:text-teal-200" />
              </button>
            </div>
            
            {/* Progress bar */}
            <motion.div
              className="h-0.5 bg-teal-400/50"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDuration / 1000, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook to manage milestone display
export function useMilestoneToast() {
  const [milestones, setMilestones] = useState<MilestoneNotification[]>([]);
  
  const showMilestones = (newMilestones: MilestoneNotification[]) => {
    setMilestones(newMilestones);
  };
  
  const showMilestone = (milestone: MilestoneNotification) => {
    setMilestones(prev => [...prev, milestone]);
  };
  
  const dismissMilestone = (type: string) => {
    setMilestones(prev => prev.filter(m => m.type !== type));
  };
  
  const dismissAll = () => {
    setMilestones([]);
  };
  
  return {
    milestones,
    showMilestones,
    showMilestone,
    dismissMilestone,
    dismissAll,
  };
}

