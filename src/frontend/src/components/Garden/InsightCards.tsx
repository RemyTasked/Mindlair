/**
 * Mind Garden - Insight Cards Component
 * 
 * Collapsible AI-powered insight cards that rotate daily.
 * Shows meeting patterns, stress insights, and mental health tips.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  Brain,
  Heart,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  Moon,
  Sun,
  AlertTriangle,
} from 'lucide-react';

interface InsightCardsProps {
  hasData: boolean;
  userData?: {
    streak: number;
    totalFlows: number;
    weeklyFlows: number;
    gardenHealth: number;
    plantsGrown: number;
  };
  meetingData?: {
    busiestDay?: string;
    avgMeetingsPerDay?: number;
    highStakesMeetingsPerWeek?: number;
    backToBackCount?: number;
  };
  stressForecast?: {
    level: 'light' | 'moderate' | 'heavy';
    score: number;
    indicators: {
      totalMeetings: number;
      backToBack: number;
      highStakes: number;
    };
  };
}

interface InsightCard {
  id: string;
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
  title: string;
  stat: string;
  label: string;
  description: string;
  tip: string;
  category: 'meeting' | 'wellness' | 'progress' | 'stress';
}

// Get day of year for consistent daily rotation
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function InsightCards({ hasData, userData, meetingData, stressForecast }: InsightCardsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Generate insight cards based on available data
  const allInsights = useMemo((): InsightCard[] => {
    const cards: InsightCard[] = [];
    
    // Meeting-related insights (if meeting data available)
    if (meetingData) {
      if (meetingData.busiestDay) {
        cards.push({
          id: 'busiest-day',
          icon: <Calendar className="w-5 h-5" />,
          gradient: 'from-blue-500 to-cyan-500',
          bgGradient: 'from-blue-500/10 to-cyan-500/10',
          title: 'Your Busiest Day',
          stat: meetingData.busiestDay,
          label: 'most meetings',
          description: `${meetingData.busiestDay}s tend to be your heaviest meeting days.`,
          tip: `Consider blocking focus time on ${meetingData.busiestDay} mornings.`,
          category: 'meeting',
        });
      }
      
      if (meetingData.avgMeetingsPerDay && meetingData.avgMeetingsPerDay > 3) {
        cards.push({
          id: 'meeting-density',
          icon: <AlertTriangle className="w-5 h-5" />,
          gradient: 'from-amber-500 to-orange-500',
          bgGradient: 'from-amber-500/10 to-orange-500/10',
          title: 'Meeting Density',
          stat: `${meetingData.avgMeetingsPerDay.toFixed(1)}`,
          label: 'meetings/day',
          description: 'Your calendar is quite packed.',
          tip: 'Use Quick Reset flows between meetings to maintain focus.',
          category: 'meeting',
        });
      }
      
      if (meetingData.highStakesMeetingsPerWeek && meetingData.highStakesMeetingsPerWeek >= 2) {
        cards.push({
          id: 'high-stakes',
          icon: <Target className="w-5 h-5" />,
          gradient: 'from-rose-500 to-pink-500',
          bgGradient: 'from-rose-500/10 to-pink-500/10',
          title: 'High-Stakes Meetings',
          stat: `${meetingData.highStakesMeetingsPerWeek.toFixed(0)}`,
          label: 'per week',
          description: 'You have several important meetings weekly.',
          tip: 'Pre-Presentation Power flows can help you prepare.',
          category: 'meeting',
        });
      }
      
      if (meetingData.backToBackCount && meetingData.backToBackCount > 0) {
        cards.push({
          id: 'back-to-back',
          icon: <Zap className="w-5 h-5" />,
          gradient: 'from-purple-500 to-violet-500',
          bgGradient: 'from-purple-500/10 to-violet-500/10',
          title: 'Back-to-Back',
          stat: `${meetingData.backToBackCount}`,
          label: 'consecutive meetings',
          description: 'Consecutive meetings can be draining.',
          tip: 'Try to add 5-minute buffers for mental reset.',
          category: 'meeting',
        });
      }
    }
    
    // Stress forecast insights
    if (stressForecast) {
      const stressColors = {
        light: { gradient: 'from-green-500 to-emerald-500', bg: 'from-green-500/10 to-emerald-500/10' },
        moderate: { gradient: 'from-amber-500 to-yellow-500', bg: 'from-amber-500/10 to-yellow-500/10' },
        heavy: { gradient: 'from-orange-500 to-red-500', bg: 'from-orange-500/10 to-red-500/10' },
      };
      
      cards.push({
        id: 'stress-forecast',
        icon: stressForecast.level === 'light' ? <Sun className="w-5 h-5" /> : 
              stressForecast.level === 'moderate' ? <Moon className="w-5 h-5" /> : 
              <AlertTriangle className="w-5 h-5" />,
        gradient: stressColors[stressForecast.level].gradient,
        bgGradient: stressColors[stressForecast.level].bg,
        title: 'Today\'s Forecast',
        stat: stressForecast.level.charAt(0).toUpperCase() + stressForecast.level.slice(1),
        label: 'meeting load',
        description: stressForecast.level === 'light' ? 'A manageable day ahead!' :
                     stressForecast.level === 'moderate' ? 'A busy day - plan your breaks.' :
                     'Heavy day - self-care is essential!',
        tip: stressForecast.level === 'heavy' ? 'Use flows before and after intense meetings.' :
             stressForecast.level === 'moderate' ? 'Quick Reset flows can help between meetings.' :
             'Great time for focused work!',
        category: 'stress',
      });
    }
    
    // User progress insights
    if (userData) {
      if (userData.streak > 0) {
        cards.push({
          id: 'streak',
          icon: <Zap className="w-5 h-5" />,
          gradient: 'from-amber-500 to-yellow-500',
          bgGradient: 'from-amber-500/10 to-yellow-500/10',
          title: 'Current Streak',
          stat: `${userData.streak}`,
          label: userData.streak === 1 ? 'day' : 'days',
          description: userData.streak >= 7 ? 'Amazing consistency! Keep it up!' :
                       userData.streak >= 3 ? "You're building a habit!" :
                       'Great start on your streak!',
          tip: 'Consistency builds lasting transformation.',
          category: 'progress',
        });
      }
      
      if (userData.totalFlows > 0) {
        cards.push({
          id: 'total-flows',
          icon: <Sparkles className="w-5 h-5" />,
          gradient: 'from-indigo-500 to-purple-500',
          bgGradient: 'from-indigo-500/10 to-purple-500/10',
          title: 'Total Practice',
          stat: `${userData.totalFlows}`,
          label: 'flows completed',
          description: userData.totalFlows >= 50 ? 'You\'re a dedicated practitioner!' :
                       userData.totalFlows >= 20 ? 'Your practice is growing!' :
                       'Every flow counts!',
          tip: 'Regular practice compounds over time.',
          category: 'progress',
        });
      }
      
      if (userData.gardenHealth >= 70) {
        cards.push({
          id: 'garden-thriving',
          icon: <Heart className="w-5 h-5" />,
          gradient: 'from-emerald-500 to-teal-500',
          bgGradient: 'from-emerald-500/10 to-teal-500/10',
          title: 'Garden Health',
          stat: `${userData.gardenHealth}%`,
          label: 'thriving',
          description: 'Your garden reflects your dedication!',
          tip: 'Keep nurturing your practice.',
          category: 'wellness',
        });
      }
    }
    
    // Default insights for new users
    if (cards.length === 0 || !hasData) {
      return [
        {
          id: 'meeting-stat',
          icon: <Calendar className="w-5 h-5" />,
          gradient: 'from-blue-500 to-cyan-500',
          bgGradient: 'from-blue-500/10 to-cyan-500/10',
          title: 'Did You Know?',
          stat: '32%',
          label: 'of work time',
          description: 'Most professionals spend this much time in meetings.',
          tip: 'Make each one count with intentional preparation.',
          category: 'meeting',
        },
        {
          id: 'prep-benefit',
          icon: <Brain className="w-5 h-5" />,
          gradient: 'from-teal-500 to-emerald-500',
          bgGradient: 'from-teal-500/10 to-emerald-500/10',
          title: 'Science Says',
          stat: '2 min',
          label: 'of prep',
          description: 'Can transform your meeting performance.',
          tip: 'Mental rehearsal activates the same brain regions as experience.',
          category: 'wellness',
        },
        {
          id: 'anxiety-reduction',
          icon: <Heart className="w-5 h-5" />,
          gradient: 'from-rose-500 to-orange-500',
          bgGradient: 'from-rose-500/10 to-orange-500/10',
          title: 'The Research',
          stat: '60%',
          label: 'reduction',
          description: 'In meeting anxiety with mindful preparation.',
          tip: 'Calm presence starts before you join the call.',
          category: 'wellness',
        },
      ];
    }
    
    return cards;
  }, [hasData, userData, meetingData, stressForecast]);
  
  // Rotate cards daily - show 3 at a time
  const displayedInsights = useMemo(() => {
    const dayOfYear = getDayOfYear();
    const startIndex = dayOfYear % allInsights.length;
    
    // Get 3 cards, wrapping around if needed
    const cards: InsightCard[] = [];
    for (let i = 0; i < Math.min(3, allInsights.length); i++) {
      const index = (startIndex + i) % allInsights.length;
      cards.push(allInsights[index]);
    }
    
    return cards;
  }, [allInsights]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mg-card mb-6"
    >
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--mg-accent)]" />
          <h3 className="font-semibold text-[var(--mg-text-primary)]">
            {hasData ? 'Your Insights' : 'Did You Know?'}
          </h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--mg-text-muted)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--mg-text-muted)]" />
          )}
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid md:grid-cols-3 gap-4">
              {displayedInsights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-gradient-to-br ${insight.bgGradient} rounded-xl p-5 border border-[var(--mg-border)] hover:border-[var(--mg-accent)]/30 transition-all`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${insight.gradient} text-white shadow-md`}>
                      {insight.icon}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[var(--mg-text-primary)]">
                        {insight.stat}
                      </div>
                      <div className="text-xs font-medium text-[var(--mg-text-muted)] uppercase tracking-wide">
                        {insight.label}
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium text-[var(--mg-text-primary)] mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-[var(--mg-text-secondary)] mb-3">
                    {insight.description}
                  </p>

                  <div className="pt-3 border-t border-[var(--mg-border)]">
                    <p className="text-xs text-[var(--mg-text-muted)] flex items-start gap-2">
                      <span className="text-[var(--mg-accent)]">💡</span>
                      <span>{insight.tip}</span>
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Daily rotation indicator */}
            <div className="flex items-center justify-center gap-1 mt-4">
              {displayedInsights.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[var(--mg-accent)]"
                />
              ))}
              {allInsights.length > 3 && (
                <span className="text-xs text-[var(--mg-text-muted)] ml-2">
                  +{allInsights.length - 3} more · rotates daily
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

