/**
 * Mind Garden - Garden Dashboard
 * 
 * The main dashboard featuring the full garden visualization,
 * quick actions, and today's summary.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  Zap,
  Target,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import GardenCanvas, { GardenData, Plant } from '../components/Garden/GardenCanvas';
import PWAInstallBanner from '../components/PWAInstallBanner';
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';
import { pushNotificationService } from '../services/pushNotificationService';

// Get time of day
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Get greeting based on time
function getGreeting(name?: string): string {
  const time = getTimeOfDay();
  const nameStr = name ? `, ${name}` : '';
  
  switch (time) {
    case 'morning': return `Good morning${nameStr}`;
    case 'afternoon': return `Good afternoon${nameStr}`;
    case 'evening': return `Good evening${nameStr}`;
    case 'night': return `Good night${nameStr}`;
  }
}

// Get time icon
function TimeIcon() {
  const time = getTimeOfDay();
  switch (time) {
    case 'morning': return <Sunrise className="w-5 h-5 text-amber-400" />;
    case 'afternoon': return <Sun className="w-5 h-5 text-yellow-400" />;
    case 'evening': return <Sunset className="w-5 h-5 text-orange-400" />;
    case 'night': return <Moon className="w-5 h-5 text-slate-400" />;
  }
}

// Once-per-day flows
const ONCE_PER_DAY_FLOWS = ['evening-wind-down', 'end-of-day-transition', 'morning-intention'];

// Check if a flow was completed today
function isFlowCompletedToday(flowId: string): boolean {
  if (!ONCE_PER_DAY_FLOWS.includes(flowId)) return false;
  try {
    const completedFlows = JSON.parse(localStorage.getItem('mindgarden_daily_flows') || '{}');
    const completedDate = completedFlows[flowId];
    if (!completedDate) return false;
    return completedDate === new Date().toDateString();
  } catch {
    return false;
  }
}

// Flow suggestions based on time of day
const SUGGESTED_FLOWS = {
  morning: [
    { id: 'pre-meeting-focus', name: 'Morning Focus', icon: '🎯', duration: '2 min' },
    { id: 'breathing', name: 'Wake Up Breath', icon: '🌬️', duration: '1 min' },
  ],
  afternoon: [
    { id: 'quick-reset', name: 'Quick Reset', icon: '🔄', duration: '90 sec' },
    { id: 'pre-meeting-focus', name: 'Pre-Meeting Focus', icon: '🎯', duration: '2 min' },
  ],
  evening: [
    { id: 'post-meeting-decompress', name: 'Decompress', icon: '🌊', duration: '2 min' },
    { id: 'end-of-day-transition', name: 'End of Day', icon: '🌅', duration: '3 min' },
  ],
  night: [
    { id: 'breathing', name: 'Sleep Prep', icon: '😴', duration: '2 min' },
    { id: 'end-of-day-transition', name: 'Wind Down', icon: '🌙', duration: '3 min' },
  ],
};

interface DashboardStats {
  flowsToday: number;
  flowsThisWeek: number;
  currentStreak: number;
  totalFlows: number;
  gardenHealth: number;
  plantsGrown: number;
  pendingPoints: number;
}

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface GardenInsights {
  stateTitle: string;
  stateMessage: string;
  recommendations: string[];
  nextUnlocks: Array<{ type: string; name: string; requirement: string }>;
}

// Check if notifications are enabled
function areNotificationsEnabled(): boolean {
  return localStorage.getItem('mindgarden_notifications_enabled') === 'true' || 
         (typeof Notification !== 'undefined' && Notification.permission === 'granted');
}

// Time-based reminder messages
const TIME_REMINDERS = {
  morning: {
    title: 'Start your day with intention',
    message: 'A Morning Intention Flow can set you up for a focused, productive day.',
    action: 'morning-intention',
    actionLabel: 'Start Morning Flow',
  },
  afternoon: {
    title: 'Need a quick reset?',
    message: 'Between meetings is a perfect time for a 90-second reset.',
    action: 'quick-reset',
    actionLabel: 'Quick Reset',
  },
  evening: {
    title: 'Time to transition',
    message: 'Create a boundary between work and personal time with an evening flow.',
    action: 'end-of-day-transition',
    actionLabel: 'End of Day Flow',
  },
  night: {
    title: 'Unwind with an evening flow',
    message: 'Prepare for restful sleep with our Evening Wind-Down.',
    action: 'evening-wind-down',
    actionLabel: 'Wind Down',
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    flowsToday: 0,
    flowsThisWeek: 0,
    currentStreak: 0,
    totalFlows: 0,
    gardenHealth: 50,
    plantsGrown: 0,
    pendingPoints: 0,
  });
  const [gardenData, setGardenData] = useState<GardenData>({
    plants: [],
    gridSize: 5,
    visualState: 'stable',
    weather: 'sunny',
    season: getCurrentSeason(),
    health: 50,
    decorations: [],
    theme: 'cottage',
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());
  const [insights, setInsights] = useState<GardenInsights>({
    stateTitle: 'Your garden is growing',
    stateMessage: 'Keep nurturing your practice.',
    recommendations: [],
    nextUnlocks: [],
  });
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(!areNotificationsEnabled());
  const [isWatering, setIsWatering] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const timeReminder = TIME_REMINDERS[timeOfDay];

  // Load data
  useEffect(() => {
    loadDashboard();
    
    // Update time of day every minute
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-resubscribe to push notifications if permission is granted but no subscription exists
  useEffect(() => {
    const checkAndResubscribe = async () => {
      // Only check if notifications are supposedly enabled
      if (!areNotificationsEnabled()) return;
      
      // Check if permission is actually granted
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      
      // Check if we have an active subscription
      const isSubscribed = await pushNotificationService.isSubscribed();
      
      if (!isSubscribed) {
        console.log('🔔 Notifications enabled but no subscription found, resubscribing...');
        const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
        if (token) {
          const success = await pushNotificationService.subscribe(token);
          if (success) {
            console.log('✅ Successfully resubscribed to push notifications');
          } else {
            console.warn('⚠️ Failed to resubscribe to push notifications');
          }
        }
      }
    };
    
    // Run after a short delay to not block initial load
    const timeout = setTimeout(checkAndResubscribe, 2000);
    return () => clearTimeout(timeout);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Check auth
      let token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
      if (!token) {
        token = await getToken();
      }
      
      if (!token) {
        navigate('/');
        return;
      }
      
      // Load user profile
      const userResponse = await api.get('/api/user/profile');
      setUser(userResponse.data.user);
      
      // Load garden state
      try {
        const gardenResponse = await api.get('/api/garden/state');
        const gardenState = gardenResponse.data;
        
        setStats(prev => ({
          ...prev,
          flowsToday: gardenState.flowsToday || 0,
          currentStreak: gardenState.streak || 0,
          totalFlows: gardenState.totalFlows || 0,
          gardenHealth: gardenState.health || 50,
          plantsGrown: gardenState.plants?.length || 0,
          pendingPoints: gardenState.pendingPoints || 0,
        }));
        
        // Map garden state to GardenData format
        const visualState = gardenState.visualState || getVisualStateFromActivity(
          gardenState.activitiesThisWeek || 0,
          gardenState.daysSinceActive || 0
        );
        
        // Ensure plants array exists and has content
        let plants = gardenState.plants;
        if (!plants || !Array.isArray(plants) || plants.length === 0) {
          // Generate starter plants if user has done any flows
          if (gardenState.totalFlows > 0 || gardenState.flowsToday > 0) {
            plants = generateStarterPlants(gardenState.totalFlows || 1);
          } else {
            plants = generateDemoPlants();
          }
        }
        
        setGardenData({
          plants,
          gridSize: gardenState.gridSize || calculateGridSize(gardenState.totalFlows || 0),
          visualState,
          weather: gardenState.weather || getWeatherFromState(visualState),
          season: gardenState.season || getCurrentSeason(),
          health: gardenState.health || 50,
          decorations: gardenState.decorations || [],
          theme: gardenState.theme || 'cottage',
          streak: gardenState.streak,
          totalPoints: gardenState.totalPoints,
          activitiesThisWeek: gardenState.activitiesThisWeek,
          stateTitle: gardenState.stateTitle,
          stateMessage: gardenState.stateMessage,
        });
      } catch (gardenError) {
        console.warn('Garden state not available, using defaults');
        setGardenData({
          plants: generateDemoPlants(),
          gridSize: 5,
          visualState: 'stable',
          weather: 'sunny',
          season: getCurrentSeason(),
          health: 50,
          decorations: [],
          theme: 'cottage',
        });
      }
      
      // Load upcoming meetings
      // Use user's local timezone for accurate date boundaries
      try {
        const now = new Date();
        // Get end of tomorrow in user's local time
        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
        endOfTomorrow.setHours(0, 0, 0, 0);
        
        const meetingsResponse = await api.get('/api/meetings', {
          params: {
            startDate: now.toISOString(),
            endDate: endOfTomorrow.toISOString(),
          },
        });
        
        // Filter to only show meetings that are actually today in user's local time
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setDate(todayEnd.getDate() + 1);
        todayEnd.setHours(0, 0, 0, 0);
        
        const todaysMeetings = (meetingsResponse.data.meetings || []).filter((meeting: any) => {
          const meetingStart = new Date(meeting.startTime);
          return meetingStart >= todayStart && meetingStart < todayEnd;
        });
        
        setUpcomingMeetings(todaysMeetings.slice(0, 3));
      } catch (meetingError) {
        console.warn('Meetings not available');
      }
      
      // Load garden insights
      try {
        const insightsResponse = await api.get('/api/garden/insights');
        setInsights({
          stateTitle: insightsResponse.data.stateInfo?.title || 'Your garden is growing',
          stateMessage: insightsResponse.data.stateInfo?.message || 'Keep nurturing your practice.',
          recommendations: insightsResponse.data.recommendations || [],
          nextUnlocks: insightsResponse.data.nextUnlocks || [],
        });
      } catch (insightsError) {
        console.warn('Insights not available');
      }
      
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('mindgarden_token');
        localStorage.removeItem('meetcute_token');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mindgarden_token');
    localStorage.removeItem('meetcute_token');
    localStorage.removeItem('meetcute_profile_cache');
    localStorage.removeItem('meetcute_session_active');
    navigate('/');
  };

  const handleWaterGarden = async () => {
    setIsWatering(true);
    // Trigger watering animation for 3 seconds
    setTimeout(() => setIsWatering(false), 3000);
    
    // Call backend to record watering (optional, for garden health)
    try {
      await api.post('/api/garden/water');
    } catch (error) {
      console.warn('Could not record watering:', error);
    }
  };

  const handlePruneGarden = async () => {
    setIsPruning(true);
    // Trigger pruning animation for 2 seconds
    setTimeout(() => setIsPruning(false), 2000);
    
    // Call backend to record pruning (optional)
    try {
      await api.post('/api/garden/prune');
    } catch (error) {
      console.warn('Could not record pruning:', error);
    }
  };

  const handlePlantClick = (plant: Plant) => {
    console.log('Plant clicked:', plant);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#022c22] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="text-6xl mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            🌱
          </motion.div>
          <p className="text-emerald-300/70">Growing your garden...</p>
        </div>
      </div>
    );
  }

  // Filter out completed once-per-day flows
  const suggestedFlows = SUGGESTED_FLOWS[timeOfDay].filter(
    flow => !isFlowCompletedToday(flow.id)
  );
  
  // Check if the time reminder flow is completed
  const isTimeReminderCompleted = isFlowCompletedToday(timeReminder.action);

  return (
    <>
      <DashboardLayout
        activeSection="home"
        gardenState={{
          health: stats.gardenHealth,
          visualState: getVisualState(stats.gardenHealth, stats.currentStreak),
          flowsToday: stats.flowsToday,
          streak: stats.currentStreak,
        }}
        user={user}
        onLogout={handleLogout}
      >
        {/* PWA Install Banner - at top of content area */}
        <PWAInstallBanner variant="banner" />
        
        <div className="p-4 md:p-8 pb-32">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <TimeIcon />
            <span className="text-sm text-[var(--mg-text-muted)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)]">
            {getGreeting(user?.name?.split(' ')[0])}
          </h1>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mg-card flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.flowsToday}</div>
              <div className="text-xs text-[var(--mg-text-muted)]">Flows Today</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mg-card flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.currentStreak}</div>
              <div className="text-xs text-[var(--mg-text-muted)]">Day Streak</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mg-card flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-rose-500/20">
              <Target className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalFlows}</div>
              <div className="text-xs text-[var(--mg-text-muted)]">Total Flows</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mg-card flex items-center gap-3"
          >
            <div className="p-2 rounded-xl bg-violet-500/20">
              <TrendingUp className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.plantsGrown}</div>
              <div className="text-xs text-[var(--mg-text-muted)]">Plants Grown</div>
            </div>
          </motion.div>
        </div>

        {/* Pending Points Banner */}
        {stats.pendingPoints > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-700/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-amber-200 font-medium">
                  🌱 {stats.pendingPoints} points ready for tomorrow's growth!
                </p>
                <p className="text-amber-300/60 text-xs mt-0.5">
                  Points earned today will be applied to your garden when you return tomorrow.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Garden State Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mg-card bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-700/30"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-300 mb-1">{insights.stateTitle}</h3>
              <p className="text-emerald-100/70 text-sm">{insights.stateMessage}</p>
            </div>
            {isTimeReminderCompleted ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2">
                <span>✓</span> Done
              </div>
            ) : (
              <button
                onClick={() => navigate(`/flow/${timeReminder.action}`)}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-medium transition-colors"
              >
                {timeReminder.actionLabel}
              </button>
            )}
          </div>
        </motion.div>

        {/* Notification Permission Prompt */}
        {showNotificationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mg-card bg-gradient-to-r from-sky-900/30 to-slate-900/30 border border-sky-700/30"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-sky-500/20">
                <Calendar className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sky-300 mb-1">Get meeting prep reminders</h3>
                <p className="text-sky-100/70 text-sm mb-3">
                  Enable notifications to receive mindfulness prompts before stressful meetings. 
                  Never enter a meeting unprepared.
                </p>
                
                {/* Check if notifications are blocked */}
                {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
                  <div className="mb-3 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <p className="text-red-300 text-sm">
                      <strong>Notifications are blocked.</strong> Please enable them in your browser/device settings for this site, then refresh the page.
                    </p>
                  </div>
                )}
                
                {/* Error message */}
                {notificationError && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                    <p className="text-amber-300 text-sm">{notificationError}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={isEnablingNotifications || (typeof Notification !== 'undefined' && Notification.permission === 'denied')}
                    onClick={async () => {
                      setIsEnablingNotifications(true);
                      setNotificationError(null);
                      
                      try {
                        // Check if notifications are supported
                        if (!pushNotificationService.isSupported()) {
                          // Check if it's iOS and not a PWA
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                              (window.navigator as any).standalone === true;
                          
                          if (isIOS && !isStandalone) {
                            setNotificationError('On iOS, please install Mind Garden as an app first: tap Share → "Add to Home Screen", then try again.');
                            setIsEnablingNotifications(false);
                            return;
                          }
                          
                          setNotificationError('Push notifications are not supported on this device/browser.');
                          setIsEnablingNotifications(false);
                          return;
                        }
                        
                        // Use pushNotificationService for proper PWA/iOS support
                        const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
                        if (token) {
                          const subscribed = await pushNotificationService.subscribe(token);
                          if (subscribed) {
                            localStorage.setItem('mindgarden_notifications_enabled', 'true');
                            setShowNotificationPrompt(false);
                          } else {
                            // Check if permission was denied
                            if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
                              setNotificationError('Permission denied. Please enable notifications in your browser settings.');
                            } else {
                              // Fallback: just request permission
                              if (typeof Notification !== 'undefined') {
                                const permission = await Notification.requestPermission();
                                if (permission === 'granted') {
                                  localStorage.setItem('mindgarden_notifications_enabled', 'true');
                                  setShowNotificationPrompt(false);
                                } else if (permission === 'denied') {
                                  setNotificationError('Permission denied. Please enable notifications in your browser settings.');
                                }
                              }
                            }
                          }
                        } else {
                          setNotificationError('Please log in again to enable notifications.');
                        }
                      } catch (error) {
                        console.warn('Failed to enable notifications:', error);
                        setNotificationError('Failed to enable notifications. Please try again.');
                      } finally {
                        setIsEnablingNotifications(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
                  >
                    {isEnablingNotifications ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>🔔 Enable Notifications</>
                    )}
                  </button>
                  <button
                    onClick={() => setShowNotificationPrompt(false)}
                    className="px-4 py-2 text-sky-400/70 hover:text-sky-300 text-sm transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Time-Based Recommendation */}
        {!showNotificationPrompt && insights.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mg-card"
          >
            <h3 className="mg-card-title flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-400" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {insights.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--mg-text-secondary)]">
                  <span className="text-amber-400">💡</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Garden Canvas (takes 2 columns on large screens) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <GardenCanvas
              data={gardenData}
              timeOfDay={timeOfDay}
              onPlantClick={handlePlantClick}
              onWater={handleWaterGarden}
              onPrune={handlePruneGarden}
              isWatering={isWatering}
              isPruning={isPruning}
              pendingPoints={stats.pendingPoints}
              recentActivity={stats.flowsThisWeek > 0}
            />
          </motion.div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            {/* Suggested Flows */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mg-card"
            >
              <h3 className="mg-card-title flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--mg-accent)]" />
                Suggested for You
              </h3>
              
              <div className="space-y-2">
                {suggestedFlows.map((flow) => (
                  <button
                    key={flow.id}
                    onClick={() => navigate(`/flow/${flow.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--mg-bg-primary)] hover:bg-[var(--mg-accent)]/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{flow.icon}</span>
                      <div className="text-left">
                        <div className="font-medium text-[var(--mg-text-primary)]">{flow.name}</div>
                        <div className="text-xs text-[var(--mg-text-muted)]">{flow.duration}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--mg-text-muted)] group-hover:text-[var(--mg-accent)] transition-colors" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/flows')}
                className="mt-4 w-full py-2 text-sm font-medium text-[var(--mg-accent)] hover:underline"
              >
                Browse All Flows →
              </button>
            </motion.div>

            {/* Upcoming Meetings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mg-card"
            >
              <h3 className="mg-card-title flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--mg-accent)]" />
                Upcoming
              </h3>
              
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-2">
                  {upcomingMeetings.map((meeting) => {
                    const startTime = new Date(meeting.startTime);
                    const now = new Date();
                    const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
                    const hoursUntil = Math.round(minutesUntil / 60);
                    
                    // Check if meeting is today
                    const isToday = startTime.toDateString() === now.toDateString();
                    const isTomorrow = startTime.toDateString() === new Date(now.getTime() + 86400000).toDateString();
                    
                    return (
                      <div
                        key={meeting.id}
                        className="p-3 rounded-xl bg-[var(--mg-bg-primary)] border border-[var(--mg-border)]"
                      >
                        <div className="font-medium text-[var(--mg-text-primary)] truncate">
                          {meeting.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--mg-text-muted)]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                            at {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {isToday && minutesUntil > 0 && minutesUntil <= 60 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              in {minutesUntil}m
                            </span>
                          )}
                          {isToday && minutesUntil > 60 && hoursUntil <= 4 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                              in {hoursUntil}h
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-[var(--mg-text-muted)]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming meetings</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
    </>
  );
}

// Helper functions

function getVisualState(health: number, streak: number): 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant' {
  if (health >= 80 && streak >= 3) return 'thriving';
  if (health >= 60 || streak >= 1) return 'growing';
  if (health >= 40) return 'stable';
  if (health >= 20) return 'idle';
  return 'dormant';
}

function calculateGridSize(totalFlows: number): number {
  if (totalFlows >= 200) return 15;
  if (totalFlows >= 100) return 12;
  if (totalFlows >= 50) return 10;
  if (totalFlows >= 20) return 7;
  return 5;
}

// Get weather type based on garden state (all weather is beautiful)
function getWeatherFromState(visualState?: string): 'sunny' | 'partly-cloudy' | 'cloudy' | 'golden-hour' | 'mist' | 'gentle-rain' | 'soft-snow' {
  switch (visualState) {
    case 'thriving':
      return 'sunny';
    case 'growing':
      return 'partly-cloudy';
    case 'stable':
      return 'cloudy';
    case 'idle':
      return 'golden-hour'; // Beautiful sunset
    case 'dormant':
      return getCurrentSeason() === 'winter' ? 'soft-snow' : 'mist';
    default:
      return 'sunny';
  }
}

// Get current season based on date
function getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// Get visual state from activity (non-punitive)
function getVisualStateFromActivity(activitiesThisWeek: number, daysSinceActive: number): 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant' {
  if (daysSinceActive >= 14) return 'dormant';
  if (activitiesThisWeek === 0) return 'idle';
  if (activitiesThisWeek >= 5) return 'thriving';
  if (activitiesThisWeek >= 3) return 'growing';
  return 'stable';
}

function generateDemoPlants(): Plant[] {
  // Generate some demo plants for new users who haven't done any flows
  const plantTypes: Array<Plant['type']> = ['lavender', 'daisy', 'chamomile'];
  const plants: Plant[] = [];
  
  // Start with just a few plants to show the concept
  const positions = [
    { x: 2, y: 2 },
  ];
  
  positions.forEach((pos, i) => {
    plants.push({
      id: `demo-${i}`,
      type: plantTypes[i % plantTypes.length],
      x: pos.x,
      y: pos.y,
      growthStage: 'sprout',
      plantedAt: new Date().toISOString(),
      bloomCount: 0,
      associatedWith: 'Welcome Plant',
    });
  });
  
  return plants;
}

function generateStarterPlants(flowCount: number): Plant[] {
  // Generate plants based on how many flows user has completed
  const plantTypes: Array<Plant['type']> = ['daisy', 'lavender', 'chamomile', 'fern', 'succulent', 'marigold'];
  const plants: Plant[] = [];
  
  // Calculate how many plants to show (at least 1, scale with flows)
  const plantCount = Math.max(1, Math.min(Math.floor(flowCount / 2) + 1, 8));
  
  // Generate positions in a nice pattern
  const gridSize = 5;
  const usedPositions = new Set<string>();
  
  for (let i = 0; i < plantCount; i++) {
    // Try to find a position
    let x = 1 + (i % 3);
    let y = 1 + Math.floor(i / 3);
    
    // Ensure within grid
    x = Math.min(x, gridSize - 1);
    y = Math.min(y, gridSize - 1);
    
    // Skip if position used
    const posKey = `${x},${y}`;
    if (usedPositions.has(posKey)) {
      // Find next available
      for (let px = 0; px < gridSize; px++) {
        for (let py = 0; py < gridSize; py++) {
          const key = `${px},${py}`;
          if (!usedPositions.has(key)) {
            x = px;
            y = py;
            break;
          }
        }
      }
    }
    usedPositions.add(`${x},${y}`);
    
    plants.push({
      id: `starter-${i}`,
      type: plantTypes[i % plantTypes.length],
      x,
      y,
      growthStage: i === 0 ? 'blooming' : i < 3 ? 'growing' : 'sprout',
      plantedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
      bloomCount: Math.max(0, 3 - i),
      associatedWith: 'Your practice',
    });
  }
  
  return plants;
}

