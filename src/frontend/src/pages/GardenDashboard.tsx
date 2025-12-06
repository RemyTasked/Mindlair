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
    case 'night': return <Moon className="w-5 h-5 text-indigo-400" />;
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
    weather: 'sunny',
    health: 50,
    decorations: [],
    theme: 'cottage',
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());

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
        setGardenData({
          plants: gardenState.plants || generateDemoPlants(),
          gridSize: calculateGridSize(gardenState.totalFlows || 0),
          weather: getWeatherFromHealth(gardenState.health || 50),
          health: gardenState.health || 50,
          decorations: [],
          theme: 'cottage',
        });
      } catch (gardenError) {
        console.warn('Garden state not available, using defaults');
        setGardenData({
          plants: generateDemoPlants(),
          gridSize: 5,
          weather: 'sunny',
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

function getWeatherFromHealth(health: number): 'sunny' | 'cloudy' | 'rain' {
  if (health >= 70) return 'sunny';
  if (health >= 40) return 'cloudy';
  return 'rain';
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

