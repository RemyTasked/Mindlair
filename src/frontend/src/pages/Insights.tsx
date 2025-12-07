/**
 * Mind Garden - Insights Page
 * 
 * Real analytics and patterns including:
 * - Garden health score (calculated from activity)
 * - Weekly flow activity
 * - Flow types breakdown
 * - Meeting patterns
 * - Achievements
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
  RefreshCw,
  TrendingUp,
  Music,
  Volume2,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import api from '../lib/axios';

// Chart components
interface ChartData {
  label: string;
  value: number;
  color?: string;
}

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
  insights: string[];
  recommendations: string[];
  visualState: string;
}

interface MeetingPatterns {
  busiestDay: string;
  busiestTime: string;
  avgMeetingsPerDay: number;
  avgBackToBack: number;
  highStakesMeetingsPerWeek: number;
}

interface AudioPreferences {
  spotifyConnected: boolean;
  preferredSoundscape: string;
  volumeRatio: string;
  totalListeningMinutes: number;
}

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [meetingPatterns, setMeetingPatterns] = useState<MeetingPatterns | null>(null);
  const [audioPrefs, setAudioPrefs] = useState<AudioPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch garden insights, meeting patterns, and spotify/audio status in parallel
      const [gardenResponse, patternsResponse, spotifyResponse] = await Promise.all([
        api.get('/api/garden/insights').catch(() => null),
        api.get('/api/analysis/patterns').catch(() => null),
        api.get('/api/spotify/status').catch(() => null),
      ]);
      
      // Set audio preferences from Spotify status or defaults
      if (spotifyResponse?.data) {
        const volumeRatio = localStorage.getItem('mg_volume_ratio') || '30/70';
        const preferredSoundscape = localStorage.getItem('mg_preferred_sound') || 'calm';
        
        setAudioPrefs({
          spotifyConnected: spotifyResponse.data.connected || false,
          preferredSoundscape,
          volumeRatio,
          totalListeningMinutes: spotifyResponse.data.totalMinutes || 0,
        });
      } else {
        // Check local storage for preferences even without Spotify
        const volumeRatio = localStorage.getItem('mg_volume_ratio') || '30/70';
        const preferredSoundscape = localStorage.getItem('mg_preferred_sound') || 'calm';
        
        setAudioPrefs({
          spotifyConnected: false,
          preferredSoundscape,
          volumeRatio,
          totalListeningMinutes: 0,
        });
      }
      
      if (gardenResponse?.data) {
        setInsights({
          gardenHealth: gardenResponse.data.gardenHealth ?? 50,
          weeklyFlows: gardenResponse.data.weeklyFlows ?? 0,
          totalFlows: gardenResponse.data.totalFlows ?? 0,
          currentStreak: gardenResponse.data.currentStreak ?? 0,
          longestStreak: gardenResponse.data.longestStreak ?? 0,
          plantsGrown: gardenResponse.data.plantsGrown ?? 0,
          favoriteFlow: gardenResponse.data.favoriteFlow ?? 'None yet',
          totalMinutes: gardenResponse.data.totalMinutes ?? 0,
          flowsByDay: gardenResponse.data.flowsByDay ?? [
            { day: 'Mon', count: 0 }, { day: 'Tue', count: 0 }, { day: 'Wed', count: 0 },
            { day: 'Thu', count: 0 }, { day: 'Fri', count: 0 }, { day: 'Sat', count: 0 }, { day: 'Sun', count: 0 },
          ],
          flowsByType: gardenResponse.data.flowsByType ?? [],
          recentAchievements: gardenResponse.data.recentAchievements ?? [],
          insights: gardenResponse.data.insights ?? [],
          recommendations: gardenResponse.data.recommendations ?? [],
          visualState: gardenResponse.data.visualState ?? 'stable',
        });
      }
      
      if (patternsResponse?.data?.patterns) {
        setMeetingPatterns(patternsResponse.data.patterns);
      }
      
    } catch (err) {
      console.error('Error loading insights:', err);
      setError('Unable to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  // Get health status styling
  const getHealthStatus = (health: number) => {
    if (health >= 80) return { label: 'Thriving', color: 'text-emerald-400', bg: 'bg-emerald-500/20', emoji: '🌻' };
    if (health >= 60) return { label: 'Growing', color: 'text-green-400', bg: 'bg-green-500/20', emoji: '🌿' };
    if (health >= 40) return { label: 'Stable', color: 'text-sky-400', bg: 'bg-sky-500/20', emoji: '🌱' };
    if (health >= 20) return { label: 'Idle', color: 'text-amber-400', bg: 'bg-amber-500/20', emoji: '🍂' };
    return { label: 'Needs Care', color: 'text-gray-400', bg: 'bg-gray-500/20', emoji: '💤' };
  };

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

  if (error || !insights) {
    return (
      <DashboardLayout activeSection="insights">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-[var(--mg-text-muted)] mb-4">{error || 'No data available'}</p>
            <button
              onClick={loadInsights}
              className="px-4 py-2 bg-[var(--mg-accent)] text-white rounded-lg hover:bg-[var(--mg-accent-light)]"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const healthStatus = getHealthStatus(insights.gardenHealth);

  return (
    <DashboardLayout activeSection="insights">
      <div className="p-4 md:p-8 pb-32 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
              Insights
            </h1>
            <p className="text-[var(--mg-text-secondary)]">
              Track your progress and discover patterns in your wellness practice
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg bg-[var(--mg-bg-card)] hover:bg-[var(--mg-accent)]/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-[var(--mg-text-muted)] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                {healthStatus.emoji} {healthStatus.label}
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
                color: d.count >= 2 ? 'var(--mg-accent)' : 'var(--mg-accent-dark)',
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
            {insights.flowsByType.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-[100px] text-[var(--mg-text-muted)]">
                Complete flows to see your breakdown
              </div>
            )}
          </motion.div>
        </div>

        {/* Meeting Patterns (if available) */}
        {meetingPatterns && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mg-card mb-8"
          >
            <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Meeting Patterns
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Busiest Day</div>
                <div className="font-semibold text-[var(--mg-text-primary)]">{meetingPatterns.busiestDay}</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Busiest Time</div>
                <div className="font-semibold text-[var(--mg-text-primary)] capitalize">{meetingPatterns.busiestTime}</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Avg/Day</div>
                <div className="font-semibold text-[var(--mg-text-primary)]">{meetingPatterns.avgMeetingsPerDay} meetings</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Back-to-Back</div>
                <div className="font-semibold text-[var(--mg-text-primary)]">{meetingPatterns.avgBackToBack}/day</div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">High-Stakes/Week</div>
                <div className="font-semibold text-[var(--mg-text-primary)]">{meetingPatterns.highStakesMeetingsPerWeek}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Audio & Music Preferences */}
        {audioPrefs && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mg-card mb-8"
          >
            <h3 className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-purple-400" />
              Audio & Soundscape
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Spotify</div>
                <div className="font-semibold text-[var(--mg-text-primary)] flex items-center gap-2">
                  {audioPrefs.spotifyConnected ? (
                    <>
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      Connected
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      Not Connected
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Preferred Sound</div>
                <div className="font-semibold text-[var(--mg-text-primary)] capitalize">
                  {audioPrefs.preferredSoundscape === 'calm' && '🌊 Calm'}
                  {audioPrefs.preferredSoundscape === 'focus' && '🎯 Focus'}
                  {audioPrefs.preferredSoundscape === 'energize' && '⚡ Energize'}
                  {audioPrefs.preferredSoundscape === 'nature' && '🌿 Nature'}
                  {!['calm', 'focus', 'energize', 'nature'].includes(audioPrefs.preferredSoundscape) && '🎵 Default'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Volume Ratio
                </div>
                <div className="font-semibold text-[var(--mg-text-primary)]">
                  {audioPrefs.volumeRatio === '50/50' && 'Balanced'}
                  {audioPrefs.volumeRatio === '30/70' && 'Guidance Focus'}
                  {audioPrefs.volumeRatio === '70/30' && 'Music Focus'}
                  {!['50/50', '30/70', '70/30'].includes(audioPrefs.volumeRatio) && audioPrefs.volumeRatio}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--mg-bg-primary)]">
                <div className="text-xs text-[var(--mg-text-muted)] mb-1">Listening Time</div>
                <div className="font-semibold text-[var(--mg-text-primary)]">
                  {audioPrefs.totalListeningMinutes > 60 
                    ? `${Math.floor(audioPrefs.totalListeningMinutes / 60)}h ${audioPrefs.totalListeningMinutes % 60}m`
                    : `${audioPrefs.totalListeningMinutes}m`}
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
            {insights.recentAchievements.length > 0 ? (
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
            ) : (
              <div className="flex flex-col items-center justify-center h-[150px] text-[var(--mg-text-muted)]">
                <span className="text-3xl mb-2">🏆</span>
                <p>Complete flows to earn achievements</p>
              </div>
            )}
            <button className="mt-4 w-full py-2 text-sm text-[var(--mg-accent)] hover:underline flex items-center justify-center gap-1">
              View All Achievements
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* AI Insights & Recommendations */}
        {(insights.insights.length > 0 || insights.recommendations.length > 0) && (
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
                  {insights.insights.map((insight, i) => (
                    <p key={i} className="mb-2">{insight}</p>
                  ))}
                  
                  {insights.recommendations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-emerald-500/20">
                      <p className="font-medium text-[var(--mg-text-primary)] mb-2">💡 Recommendations:</p>
                      <ul className="space-y-1 text-sm">
                        {insights.recommendations.map((rec, i) => (
                          <li key={i}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
