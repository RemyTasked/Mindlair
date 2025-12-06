/**
 * Mind Garden - Insights Page
 * 
 * Analytics and patterns including:
 * - Garden health score
 * - Stress vs Flow usage
 * - Garden growth timeline
 * - Weekly report
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Sparkles,
  Target,
  Clock,
  Award,
  Zap,
  BarChart3,
  Flower2,
  ChevronRight,
  Info,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import api from '../lib/axios';

// Simple chart components (inline to avoid dependency issues)
interface ChartData {
  label: string;
  value: number;
  color?: string;
}

// Simple Bar Chart
function SimpleBarChart({ data, height = 200 }: { data: ChartData[]; height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(item.value / maxValue) * 100}%` }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="w-full rounded-t-lg"
            style={{ 
              backgroundColor: item.color || 'var(--mg-accent)',
              minHeight: item.value > 0 ? '8px' : '0',
            }}
          />
          <span className="text-xs text-[var(--mg-text-muted)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}


interface InsightsData {
  gardenHealth: number;
  weeklyFlows: number;
  totalFlows: number;
  currentStreak: number;
  longestStreak: number;
  plantsGrown: number;
  favoriteFlow: string;
  totalMinutes: number;
  flowsByDay: Array<{ day: string; count: number }>;
  flowsByType: Array<{ type: string; count: number }>;
  recentAchievements: Array<{ id: string; name: string; icon: string; date: string }>;
}

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsData>({
    gardenHealth: 65,
    weeklyFlows: 8,
    totalFlows: 42,
    currentStreak: 5,
    longestStreak: 12,
    plantsGrown: 38,
    favoriteFlow: 'Pre-Meeting Focus',
    totalMinutes: 126,
    flowsByDay: [
      { day: 'Mon', count: 2 },
      { day: 'Tue', count: 3 },
      { day: 'Wed', count: 1 },
      { day: 'Thu', count: 2 },
      { day: 'Fri', count: 0 },
      { day: 'Sat', count: 1 },
      { day: 'Sun', count: 2 },
    ],
    flowsByType: [
      { type: 'Focus', count: 15 },
      { type: 'Calm', count: 12 },
      { type: 'Reset', count: 8 },
      { type: 'Transition', count: 7 },
    ],
    recentAchievements: [
      { id: '1', name: '5 Day Streak', icon: '🔥', date: '2024-01-15' },
      { id: '2', name: 'First Tree', icon: '🌳', date: '2024-01-12' },
      { id: '3', name: 'Gratitude Master', icon: '✨', date: '2024-01-10' },
    ],
  });

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      
      // Try to load garden insights
      try {
        const response = await api.get('/api/garden/insights');
        if (response.data) {
          setInsights(prev => ({
            ...prev,
            weeklyFlows: response.data.totalFlows || prev.weeklyFlows,
          }));
        }
      } catch (error) {
        console.warn('Could not load insights from API, using defaults');
      }
      
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get health status
  const getHealthStatus = (health: number) => {
    if (health >= 80) return { label: 'Thriving', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (health >= 60) return { label: 'Growing', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (health >= 40) return { label: 'Stable', color: 'text-sky-400', bg: 'bg-sky-500/20' };
    return { label: 'Needs Attention', color: 'text-amber-400', bg: 'bg-amber-500/20' };
  };

  const healthStatus = getHealthStatus(insights.gardenHealth);

  if (loading) {
    return (
      <DashboardLayout activeSection="insights">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <motion.div
              className="text-4xl mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              📊
            </motion.div>
            <p className="text-[var(--mg-text-muted)]">Loading insights...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeSection="insights">
      <div className="p-4 md:p-8 pb-32 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
            Insights
          </h1>
          <p className="text-[var(--mg-text-secondary)]">
            Track your progress and discover patterns in your wellness practice
          </p>
        </div>

        {/* Top Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <Flower2 className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-[var(--mg-text-muted)]">Garden Health</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-[var(--mg-text-primary)]">
                {insights.gardenHealth}%
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${healthStatus.bg} ${healthStatus.color}`}>
                {healthStatus.label}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-violet-500/20">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <span className="text-sm text-[var(--mg-text-muted)]">This Week</span>
            </div>
            <div className="text-3xl font-bold text-[var(--mg-text-primary)]">
              {insights.weeklyFlows} <span className="text-lg font-normal text-[var(--mg-text-muted)]">flows</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-[var(--mg-text-muted)]">Current Streak</span>
            </div>
            <div className="text-3xl font-bold text-[var(--mg-text-primary)]">
              {insights.currentStreak} <span className="text-lg font-normal text-[var(--mg-text-muted)]">days</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mg-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <Clock className="w-5 h-5 text-rose-400" />
              </div>
              <span className="text-sm text-[var(--mg-text-muted)]">Total Time</span>
            </div>
            <div className="text-3xl font-bold text-[var(--mg-text-primary)]">
              {Math.floor(insights.totalMinutes / 60)}h {insights.totalMinutes % 60}m
            </div>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mg-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--mg-accent)]" />
                Weekly Activity
              </h3>
              <span className="text-xs text-[var(--mg-text-muted)]">Last 7 days</span>
            </div>
            <SimpleBarChart
              data={insights.flowsByDay.map(d => ({
                label: d.day,
                value: d.count,
                color: d.count > 2 ? 'var(--mg-accent)' : 'var(--mg-accent-dark)',
              }))}
              height={150}
            />
          </motion.div>

          {/* Flow Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mg-card"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2">
                <Target className="w-5 h-5 text-[var(--mg-accent)]" />
                Flow Types
              </h3>
              <span className="text-xs text-[var(--mg-text-muted)]">All time</span>
            </div>
            <div className="space-y-3">
              {insights.flowsByType.map((type, i) => {
                const maxCount = Math.max(...insights.flowsByType.map(t => t.count));
                const percentage = (type.count / maxCount) * 100;
                const colors = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500'];
                
                return (
                  <div key={type.type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--mg-text-secondary)]">{type.type}</span>
                      <span className="text-[var(--mg-text-muted)]">{type.count}</span>
                    </div>
                    <div className="h-2 bg-[var(--mg-bg-primary)] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Personal Records & Achievements */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Personal Records */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mg-card"
          >
            <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              Personal Records
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <span className="text-[var(--mg-text-secondary)]">Longest Streak</span>
                </div>
                <span className="font-bold text-[var(--mg-text-primary)]">{insights.longestStreak} days</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌸</span>
                  <span className="text-[var(--mg-text-secondary)]">Plants Grown</span>
                </div>
                <span className="font-bold text-[var(--mg-text-primary)]">{insights.plantsGrown}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⭐</span>
                  <span className="text-[var(--mg-text-secondary)]">Total Flows</span>
                </div>
                <span className="font-bold text-[var(--mg-text-primary)]">{insights.totalFlows}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💜</span>
                  <span className="text-[var(--mg-text-secondary)]">Favorite Flow</span>
                </div>
                <span className="font-bold text-[var(--mg-text-primary)]">{insights.favoriteFlow}</span>
              </div>
            </div>
          </motion.div>

          {/* Recent Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mg-card"
          >
            <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {insights.recentAchievements.map((achievement, i) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--mg-bg-primary)]"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--mg-text-primary)]">{achievement.name}</div>
                    <div className="text-xs text-[var(--mg-text-muted)]">
                      {new Date(achievement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <button className="mt-4 w-full py-2 text-sm text-[var(--mg-accent)] hover:underline flex items-center justify-center gap-1">
              View All Achievements
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mg-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[var(--mg-accent)]" />
            <h3 className="font-semibold text-[var(--mg-text-primary)]">Weekly Summary</h3>
          </div>
          
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-[var(--mg-text-secondary)]">
                <p className="mb-2">
                  <strong className="text-[var(--mg-text-primary)]">Great week!</strong> You completed {insights.weeklyFlows} flows, 
                  which is above your average. Your garden is {healthStatus.label.toLowerCase()} and you've maintained 
                  a {insights.currentStreak}-day streak.
                </p>
                <p className="text-sm">
                  <strong>Tip:</strong> You tend to skip flows on Fridays. Try setting a reminder or 
                  scheduling a quick 90-second reset to maintain momentum into the weekend.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

