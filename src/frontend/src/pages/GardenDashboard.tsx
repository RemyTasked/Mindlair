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
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';

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

// Check if calendar plugin is installed (via localStorage flag)
function isCalendarPluginInstalled(): boolean {
  return localStorage.getItem('mindgarden_plugin_installed') === 'true';
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

export default function GardenDashboard() {
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
  const [showPluginPrompt, setShowPluginPrompt] = useState(!isCalendarPluginInstalled());
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
        }));
        
        // Map garden state to GardenData format
        const visualState = gardenState.visualState || getVisualStateFromActivity(
          gardenState.activitiesThisWeek || 0,
          gardenState.daysSinceActive || 0
        );
        
        setGardenData({
          plants: gardenState.plants || generateDemoPlants(),
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
      try {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const meetingsResponse = await api.get('/api/meetings', {
          params: {
            startDate: new Date().toISOString(),
            endDate: tomorrow.toISOString(),
          },
        });
        setUpcomingMeetings(meetingsResponse.data.meetings?.slice(0, 3) || []);
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
    // Cosmetic effect - could trigger sparkle animation
    console.log('Watering garden...');
  };

  const handlePruneGarden = async () => {
    // Cosmetic effect - could clean up wilted leaves
    console.log('Pruning garden...');
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

  const suggestedFlows = SUGGESTED_FLOWS[timeOfDay];

  return (
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
            <button
              onClick={() => navigate(`/flow/${timeReminder.action}`)}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-medium transition-colors"
            >
              {timeReminder.actionLabel}
            </button>
          </div>
        </motion.div>

        {/* Calendar Plugin Prompt (Onboarding) */}
        {showPluginPrompt && (
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
                  Install our calendar plugin to get mindfulness prompts before stressful meetings. 
                  Never enter a meeting unprepared.
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://chrome.google.com/webstore"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.952 6.848a12.014 12.014 0 0 0 9.296-9.701H15.27z"/>
                    </svg>
                    Install for Chrome
                  </a>
                  <button
                    onClick={() => setShowPluginPrompt(false)}
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
        {!showPluginPrompt && insights.recommendations.length > 0 && (
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
                            {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          {minutesUntil > 0 && minutesUntil <= 60 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              in {minutesUntil}m
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
  // Generate some demo plants for new users
  const plantTypes: Array<Plant['type']> = ['lavender', 'daisy', 'chamomile', 'fern', 'succulent'];
  const plants: Plant[] = [];
  
  // Scatter a few plants
  const positions = [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
  ];
  
  positions.forEach((pos, i) => {
    plants.push({
      id: `demo-${i}`,
      type: plantTypes[i % plantTypes.length],
      x: pos.x,
      y: pos.y,
      growthStage: 'blooming',
      plantedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      bloomCount: Math.floor(Math.random() * 5) + 1,
      associatedWith: 'Demo Plant',
    });
  });
  
  return plants;
}

