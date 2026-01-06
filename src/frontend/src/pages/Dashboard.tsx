/**
 * Mind Garden - One Plant Dashboard
 * 
 * The main dashboard featuring the one-plant garden system:
 * - Shows PlantSelector when user needs to choose a seed
 * - Shows OneGardenDisplay with the growing plant
 * - Quick actions and flow suggestions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Gift,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import PlantSelector from '../components/Garden/PlantSelector';
import OneGardenDisplay from '../components/Garden/OneGardenDisplay';
import MaturityCelebration from '../components/Garden/MaturityCelebration';
import MilestoneToast, { MilestoneNotification, useMilestoneToast } from '../components/Garden/MilestoneToast';
import GardenOnboarding from '../components/Garden/GardenOnboarding';
import PWAInstallBanner from '../components/PWAInstallBanner';
import Logo from '../components/Logo';
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';
import { pushNotificationService } from '../services/pushNotificationService';
import { PlantType } from '../components/Garden/OnePlantSVG';

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

// One Plant interface matching backend
interface OnePlant {
  id: string;
  type: PlantType;
  actionsCount: number;
  leavesCount: number;
  flowersCount: number;
  flowerBudsCount: number;
  growthStage: string;
  plantedAt: string;
  maturedAt?: string;
  position: number;
}

interface GardenState {
  plants: OnePlant[];              // ALL plants in the garden
  activePlantId: string | null;    // ID of plant being grown
  activePlant: OnePlant | null;    // The active plant object
  needsSeedSelection: boolean;
  canAddNewPlant: boolean;         // Can add a new plant (when active is mature)
  premiumUnlocked: boolean;        // Premium plants available
  progressToMature: number;
  nextMilestone: { action: number; description: string } | null;
  streak: number;
  longestStreak: number;
  totalActions: number;
  totalActiveDays: number;
  totalPlants: number;
  maturePlantsCount: number;
  growingPlantsCount: number;
  stateTitle: string;
  stateMessage: string;
}

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
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

// Check if notifications are enabled
function areNotificationsEnabled(): boolean {
  return localStorage.getItem('mindgarden_notifications_enabled') === 'true' || 
         (typeof Notification !== 'undefined' && Notification.permission === 'granted');
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectingPlant, setSelectingPlant] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [gardenState, setGardenState] = useState<GardenState>({
    plants: [],
    activePlantId: null,
    activePlant: null,
    needsSeedSelection: true,
    canAddNewPlant: true,
    premiumUnlocked: false,
    progressToMature: 0,
    nextMilestone: null,
    streak: 0,
    longestStreak: 0,
    totalActions: 0,
    totalActiveDays: 0,
    totalPlants: 0,
    maturePlantsCount: 0,
    growingPlantsCount: 0,
    stateTitle: 'Welcome to Mind Garden',
    stateMessage: 'Plant a seed to begin.',
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(!areNotificationsEnabled());
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [showExpansionModal, setShowExpansionModal] = useState(false);
  const [showMaturityCelebration, setShowMaturityCelebration] = useState(false);
  const [previousActionsCount, setPreviousActionsCount] = useState(0);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  
  // Milestone toast hook
  const { milestones, showMilestones, dismissAll } = useMilestoneToast();
  
  const timeReminder = TIME_REMINDERS[timeOfDay];

  // Check for plant maturity to trigger celebration
  useEffect(() => {
    const activePlant = gardenState.activePlant;
    if (activePlant) {
      const currentActions = activePlant.actionsCount;
      // Check if we just crossed the maturity threshold (30 actions)
      if (previousActionsCount < 30 && currentActions >= 30) {
        setShowMaturityCelebration(true);
      }
      setPreviousActionsCount(currentActions);
    }
  }, [gardenState.activePlant?.actionsCount, previousActionsCount]);

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
      
      // Load garden state (new one-plant system)
      try {
        const gardenResponse = await api.get('/api/garden/state');
        setGardenState(gardenResponse.data);
        
        // If needsSeedSelection is true, show the plant selector
        if (gardenResponse.data.needsSeedSelection) {
          setSelectingPlant(true);
        }
      } catch (gardenError) {
        console.warn('Garden state not available, showing seed selection');
        setSelectingPlant(true);
      }
      
      // Load upcoming meetings
      try {
        const now = new Date();
        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
        endOfTomorrow.setHours(0, 0, 0, 0);
        
        const meetingsResponse = await api.get('/api/meetings', {
          params: {
            startDate: now.toISOString(),
            endDate: endOfTomorrow.toISOString(),
          },
        });
        
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

  const handleSelectSeed = async (plantType: PlantType) => {
    try {
      const response = await api.post('/api/garden/select-seed', { plantType });
      if (response.data.success) {
        // Reload full garden state to get updated plants array
        const gardenResponse = await api.get('/api/garden/state');
        setGardenState(gardenResponse.data);
        setSelectingPlant(false);
        setShowExpansionModal(false);
      }
    } catch (error) {
      console.error('Failed to select seed:', error);
    }
  };

  const handleWaterGarden = async () => {
    try {
      await api.post('/api/garden/water');
    } catch (error) {
      console.warn('Could not water garden:', error);
    }
  };

  // Check for pending milestones from flow completion (stored in sessionStorage)
  useEffect(() => {
    const pendingMilestones = sessionStorage.getItem('mindgarden_pending_milestones');
    if (pendingMilestones) {
      try {
        const milestoneData = JSON.parse(pendingMilestones) as MilestoneNotification[];
        if (milestoneData.length > 0) {
          showMilestones(milestoneData);
        }
      } catch (e) {
        console.warn('Failed to parse pending milestones:', e);
      }
      sessionStorage.removeItem('mindgarden_pending_milestones');
    }
  }, [showMilestones]);

  const handleAddPlant = () => {
    setShowExpansionModal(true);
  };

  const handleConfirmAddPlant = async (plantType: PlantType) => {
    // Use the same logic as selecting first seed
    await handleSelectSeed(plantType);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Logo size="lg" />
          </motion.div>
          <p className="text-emerald-700">Growing your garden...</p>
        </div>
      </div>
    );
  }

  // Show full onboarding for ALL users who haven't completed the new v2 onboarding
  // Using versioned key so existing users also see the new onboarding flow
  const ONBOARDING_VERSION = 'mindgarden_onboarding_v2_completed';
  const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_VERSION) === 'true';
  
  // Check if user already has a garden (existing user)
  const hasExistingGarden = gardenState.plants && gardenState.plants.length > 0;
  const existingPlantType = hasExistingGarden && gardenState.activePlant 
    ? gardenState.activePlant.type as PlantType 
    : undefined;
  
  // Force onboarding for everyone who hasn't completed v2, regardless of plant status
  if (!hasCompletedOnboarding) {
    return (
      <GardenOnboarding
        onComplete={(plantType: PlantType | null) => {
          localStorage.setItem(ONBOARDING_VERSION, 'true');
          // Only select seed if user doesn't already have a garden
          if (plantType && !hasExistingGarden) {
            handleSelectSeed(plantType);
          } else {
            // Existing user, just reload to show their garden
            window.location.reload();
          }
        }}
        onSkip={() => {
          // Skip to dashboard (they may already have a plant)
          localStorage.setItem(ONBOARDING_VERSION, 'true');
          // Reload to show dashboard with existing garden
          window.location.reload();
        }}
        hasExistingGarden={hasExistingGarden}
        existingPlantType={existingPlantType}
      />
    );
  }
  
  // Show simple plant selector if user skipped onboarding or is adding a new plant
  if (selectingPlant) {
    return (
      <DashboardLayout
        activeSection="home"
        gardenState={{
          health: 50,
          visualState: 'stable',
          flowsToday: 0,
          streak: 0,
        }}
        user={user}
        onLogout={handleLogout}
      >
        <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-emerald-950 to-[#022c22]">
          <PlantSelector
            onSelect={handleSelectSeed}
            mode="initial"
          />
        </div>
      </DashboardLayout>
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
          health: gardenState.progressToMature,
          visualState: gardenState.streak >= 3 ? 'thriving' : gardenState.activePlant ? 'growing' : 'stable',
          flowsToday: gardenState.activePlant?.actionsCount || 0,
          streak: gardenState.streak,
        }}
        user={user}
        onLogout={handleLogout}
      >
        {/* PWA Install Banner */}
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
                <div className="text-2xl font-bold">{gardenState.activePlant?.actionsCount || 0}/30</div>
                <div className="text-xs text-[var(--mg-text-muted)]">Active Plant</div>
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
                <div className="text-2xl font-bold">{gardenState.streak}</div>
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
                <div className="text-2xl font-bold">{gardenState.totalActions}</div>
                <div className="text-xs text-[var(--mg-text-muted)]">Total Actions</div>
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
                <div className="text-2xl font-bold">{gardenState.plants.length}</div>
                <div className="text-xs text-[var(--mg-text-muted)]">{gardenState.maturePlantsCount} Mature</div>
              </div>
            </motion.div>
          </div>

          {/* Garden State Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mg-card bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-700/30 mb-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-300 mb-1">{gardenState.stateTitle}</h3>
                <p className="text-emerald-100/70 text-sm">{gardenState.stateMessage}</p>
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
              className="mg-card bg-gradient-to-r from-sky-900/30 to-slate-900/30 border border-sky-700/30 mb-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-sky-500/20">
                  <Calendar className="w-6 h-6 text-sky-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sky-300 mb-1">Get reminders to grow your plant</h3>
                  <p className="text-sky-100/70 text-sm mb-3">
                    Enable notifications to receive mindfulness prompts that help your plant grow.
                  </p>
                  
                  {notificationError && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                      <p className="text-amber-300 text-sm">{notificationError}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={isEnablingNotifications}
                      onClick={async () => {
                        setIsEnablingNotifications(true);
                        setNotificationError(null);
                        
                        try {
                          if (!pushNotificationService.isSupported()) {
                            setNotificationError('Push notifications are not supported on this device/browser.');
                            setIsEnablingNotifications(false);
                            return;
                          }
                          
                          const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
                          if (token) {
                            const subscribed = await pushNotificationService.subscribe(token);
                            if (subscribed) {
                              localStorage.setItem('mindgarden_notifications_enabled', 'true');
                              setShowNotificationPrompt(false);
                            }
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

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Garden Canvas (takes 2 columns on large screens) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <OneGardenDisplay
                plants={gardenState.plants}
                activePlantId={gardenState.activePlantId}
                streak={gardenState.streak}
                totalActions={gardenState.totalActions}
                progressToMature={gardenState.progressToMature}
                nextMilestone={gardenState.nextMilestone}
                timeOfDay={timeOfDay}
                canAddNewPlant={gardenState.canAddNewPlant}
                premiumUnlocked={gardenState.premiumUnlocked}
                onWater={handleWaterGarden}
                onAddPlant={handleAddPlant}
                className="min-h-[500px] bg-gradient-to-b from-emerald-900/20 to-teal-900/20 border border-emerald-800/30"
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
                  Grow Your Plant
                </h3>
                
                <p className="text-xs text-emerald-400/60 mb-4">
                  Each activity = +1 growth for your plant
                </p>
                
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
                      const isToday = startTime.toDateString() === now.toDateString();
                      
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
                              {isToday ? 'Today' : startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
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

              {/* Share a Seedling */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="mg-card bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-700/30"
              >
                <h3 className="mg-card-title flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400" />
                  Share a Seedling
                </h3>
                
                <p className="text-sm text-amber-100/70 mb-4">
                  Invite a friend to Mind Garden! They get +2 bonus leaves on their first flow, and you get +1 leaf plus game level unlocks.
                </p>
                
                <div className="space-y-2">
                  <button
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/?ref=${user?.id}`;
                      const shareText = "I'm gifting you a Seedling in Mind Garden! 🌱 Plant it and complete your first flow to start with 3 leaves instead of 1.";
                      
                      // Try native share API first
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'Mind Garden Seedling Gift',
                            text: shareText,
                            url: shareUrl,
                          });
                          return;
                        } catch (err) {
                          // User cancelled or share failed, fall back to copy
                        }
                      }
                      
                      // Fallback: copy to clipboard
                      try {
                        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
                        setShareUrlCopied(true);
                        setTimeout(() => setShareUrlCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors"
                  >
                    {shareUrlCopied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Share Seedling Link
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={async () => {
                      const shareUrl = `${window.location.origin}/?ref=${user?.id}`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setShareUrlCopied(true);
                        setTimeout(() => setShareUrlCopied(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-amber-400/70 hover:text-amber-300 text-sm transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link Only
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Add Plant Modal */}
      <AnimatePresence>
        {showExpansionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowExpansionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-emerald-950 to-[#022c22] rounded-3xl border border-emerald-800/50"
              onClick={e => e.stopPropagation()}
            >
              <PlantSelector
                onSelect={handleConfirmAddPlant}
                mode="expand"
                premiumUnlocked={gardenState.premiumUnlocked}
                totalPlants={gardenState.plants.length}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maturity Celebration */}
      {gardenState.activePlant && (
        <MaturityCelebration
          isVisible={showMaturityCelebration}
          plantType={gardenState.activePlant.type}
          totalActions={gardenState.totalActions}
          totalPlantsGrown={gardenState.maturePlantsCount}
          streak={gardenState.streak}
          onClose={() => setShowMaturityCelebration(false)}
          onExpand={() => {
            setShowMaturityCelebration(false);
            setShowExpansionModal(true);
          }}
        />
      )}

      {/* Milestone Toast Notifications */}
      <MilestoneToast
        milestones={milestones}
        onDismissAll={dismissAll}
        autoHideDuration={6000}
      />
    </>
  );
}
