import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Clock, Target, Heart, Calendar, Sparkles, Bell, Download, Check } from 'lucide-react';
import api from '../lib/axios';
import { pushNotificationService } from '../services/pushNotificationService';

interface OnboardingData {
  timezone: string;
  workStart: string;
  workEnd: string;
  focusGoals: string[];
  customGoal: string;
  meetingComfort: number;
  meetingsPerDay: string;
  directorsNote: string;
  presleyFlowTime: string;
  notificationsEnabled: boolean;
  pwaInstalled: boolean;
  calendarConnected: boolean;
}

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    workStart: '08:00',
    workEnd: '17:30',
    focusGoals: [],
    customGoal: '',
    meetingComfort: 3,
    meetingsPerDay: '3-5',
    directorsNote: '',
    presleyFlowTime: '20:00',
    notificationsEnabled: false,
    pwaInstalled: false,
    calendarConnected: false,
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const totalScenes = 9; // Increased to include notification + install + calendar scenes

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setData(prev => ({ ...prev, notificationsEnabled: Notification.permission === 'granted' }));
    }

    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode || isIOSStandalone);
    setData(prev => ({ ...prev, pwaInstalled: isInStandaloneMode || isIOSStandalone }));

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const nextScene = () => {
    if (currentScene < totalScenes - 1) {
      setCurrentScene(currentScene + 1);
    } else {
      handleComplete();
    }
  };

  const prevScene = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Get token from localStorage
        const token = localStorage.getItem('mindgarden_token') || localStorage.getItem('meetcute_token');
        if (token) {
          await pushNotificationService.subscribe(token);
        }
        setData(prev => ({ ...prev, notificationsEnabled: true }));
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setData(prev => ({ ...prev, pwaInstalled: true }));
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'microsoft') => {
    try {
      const response = await api.get(`/api/calendar/${provider}/auth-url`);
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error getting calendar auth URL:', error);
    }
  };

  const handleComplete = async () => {
    try {
      console.log('🌱 Onboarding: Saving preferences...');
      
      await api.put(`/api/user/preferences`, {
        morningFlowTime: data.workStart,
        eveningFlowTime: data.presleyFlowTime,
        tone: data.meetingComfort <= 2 ? 'calm' : data.meetingComfort >= 4 ? 'executive' : 'balanced',
      });

      await api.post(`/api/user/onboarding`, {
        workStart: data.workStart,
        workEnd: data.workEnd,
        focusGoals: data.focusGoals,
        customGoal: data.customGoal,
        meetingComfort: data.meetingComfort,
        meetingsPerDay: data.meetingsPerDay,
        directorsNote: data.directorsNote,
        notificationsEnabled: data.notificationsEnabled,
        pwaInstalled: data.pwaInstalled,
        calendarConnected: data.calendarConnected,
        completedAt: new Date().toISOString(),
      });

      localStorage.setItem('mindgarden_onboarding_v2_completed', 'true');
      localStorage.removeItem('meetcute_profile_cache');
      
      onComplete();
    } catch (error: any) {
      console.error('❌ Failed to save onboarding data:', error);
      const skipOnboarding = confirm(
        `Failed to save onboarding data. Would you like to skip for now?`
      );
      if (skipOnboarding) {
        localStorage.setItem('mindgarden_onboarding_v2_completed', 'true');
        onComplete();
      }
    }
  };

  const toggleGoal = (goal: string) => {
    setData(prev => ({
      ...prev,
      focusGoals: prev.focusGoals.includes(goal)
        ? prev.focusGoals.filter(g => g !== goal)
        : [...prev.focusGoals, goal],
    }));
  };

  const scenes = [
    // Scene 1: Welcome
    <motion.div
      key="scene1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-teal-500/20 blur-3xl rounded-full"></div>
        <div className="text-8xl relative z-10">🌱</div>
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
          Welcome to Mind Garden
        </h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
          Transform stress into growth with guided flows and your personal wellness garden.
        </p>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Let's set up your garden in just a few minutes.
        </p>
      </motion.div>
    </motion.div>,

    // Scene 2: Enable Notifications
    <motion.div
      key="scene2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Bell className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Stay on Track</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Get gentle reminders before your meetings to help you prepare mentally. 
          We'll notify you 10 minutes before stressful meetings.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {notificationPermission === 'granted' ? (
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <Check className="w-6 h-6 text-teal-600" />
            <span className="text-teal-800 font-medium">Notifications enabled!</span>
          </div>
        ) : notificationPermission === 'denied' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 text-sm">
              Notifications are blocked. You can enable them in your browser settings.
            </p>
          </div>
        ) : (
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Enabling...' : '🔔 Allow Notifications'}
          </button>
        )}

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">You'll receive:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Pre-meeting prep reminders (10 min before)</li>
            <li>• Morning and evening flow suggestions</li>
            <li>• Wellness check-ins throughout the day</li>
          </ul>
        </div>

        <button
          onClick={nextScene}
          className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
        >
          Skip for now
        </button>
      </div>
    </motion.div>,

    // Scene 3: Install PWA
    <motion.div
      key="scene3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Download className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Install Mind Garden</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Add Mind Garden to your home screen for instant access. 
          It works like a native app and opens in full screen.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {isStandalone ? (
          <div className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
            <Check className="w-6 h-6 text-teal-600" />
            <span className="text-teal-800 font-medium">Already installed!</span>
          </div>
        ) : isIOS ? (
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <p className="font-medium text-gray-900">To install on iPhone/iPad:</p>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Tap the <strong>Share</strong> button (□↑) at the bottom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Tap <strong>"Add"</strong> in the top right</span>
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallPWA}
            className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-teal-700 transition-all shadow-lg"
          >
            📱 Install Mind Garden
          </button>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-gray-600 text-sm text-center">
              Your browser will prompt you to install when ready
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-xs text-gray-600">Instant Access</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">📴</div>
            <div className="text-xs text-gray-600">Works Offline</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">🔔</div>
            <div className="text-xs text-gray-600">Push Alerts</div>
          </div>
        </div>

        <button
          onClick={nextScene}
          className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
        >
          Skip for now
        </button>
      </div>
    </motion.div>,

    // Scene 4: Connect Calendar
    <motion.div
      key="scene4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Calendar className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Connect Your Calendar</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Link your calendar so we can send you timely prep reminders before important meetings.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => handleConnectCalendar('google')}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-200 rounded-xl font-semibold hover:border-teal-300 hover:bg-teal-50 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google Calendar
        </button>

        <button
          onClick={() => handleConnectCalendar('microsoft')}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white border-2 border-gray-200 rounded-xl font-semibold hover:border-teal-300 hover:bg-teal-50 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 23 23">
            <path fill="#f25022" d="M1 1h10v10H1z"/>
            <path fill="#00a4ef" d="M1 12h10v10H1z"/>
            <path fill="#7fba00" d="M12 1h10v10H12z"/>
            <path fill="#ffb900" d="M12 12h10v10H12z"/>
          </svg>
          Connect Outlook Calendar
        </button>

        <p className="text-xs text-gray-500 text-center">
          We only read meeting titles and times. Your calendar data stays private.
        </p>

        <button
          onClick={nextScene}
          className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
        >
          Skip for now
        </button>
      </div>
    </motion.div>,

    // Scene 5: Work Schedule
    <motion.div
      key="scene5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Clock className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Your Schedule</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          When does your workday typically begin and end?
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Day Starts
          </label>
          <input
            type="time"
            value={data.workStart}
            onChange={(e) => setData({ ...data, workStart: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Day Ends
          </label>
          <input
            type="time"
            value={data.workEnd}
            onChange={(e) => setData({ ...data, workEnd: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <input
            type="text"
            value={data.timezone}
            disabled
            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">Detected automatically</p>
        </div>
      </div>
    </motion.div>,

    // Scene 6: Focus Goals
    <motion.div
      key="scene6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Target className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Your Focus Goals</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          What do you most want to improve during meetings?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {['Confidence', 'Calm', 'Clarity', 'Focus', 'Energy'].map((goal) => (
          <button
            key={goal}
            onClick={() => toggleGoal(goal)}
            className={`p-4 rounded-xl border-2 transition-all ${
              data.focusGoals.includes(goal)
                ? 'border-teal-600 bg-teal-50 text-teal-700'
                : 'border-gray-200 hover:border-teal-300'
            }`}
          >
            <span className="font-semibold">{goal}</span>
          </button>
        ))}
      </div>
    </motion.div>,

    // Scene 7: Meeting Comfort
    <motion.div
      key="scene7"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Heart className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">How Do Meetings Feel?</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          This helps us personalize the tone of your flows.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between text-4xl">
          {['😰', '😟', '😐', '🙂', '😊'].map((emoji, index) => (
            <button
              key={index}
              onClick={() => setData({ ...data, meetingComfort: index + 1 })}
              className={`transition-all ${
                data.meetingComfort === index + 1
                  ? 'scale-125 opacity-100'
                  : 'scale-100 opacity-40 hover:opacity-70'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>Often anxious</span>
          <span>Usually confident</span>
        </div>

        <p className="text-center text-sm text-gray-600 mt-4">
          {data.meetingComfort <= 2 && "We'll provide extra calming cues and supportive language."}
          {data.meetingComfort === 3 && "We'll balance calm with confidence in your flows."}
          {data.meetingComfort >= 4 && "We'll focus on amplifying your natural confidence."}
        </p>
      </div>
    </motion.div>,

    // Scene 8: Evening Flow Time
    <motion.div
      key="scene8"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-8"
    >
      <div className="text-center space-y-4">
        <Sparkles className="w-16 h-16 mx-auto text-teal-600" />
        <h2 className="text-3xl font-bold text-gray-900">Evening Wind-Down</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          When would you like your evening flow reminder?
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evening Flow Time
          </label>
          <input
            type="time"
            value={data.presleyFlowTime}
            onChange={(e) => setData({ ...data, presleyFlowTime: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">
            A gentle reminder to transition from work mode
          </p>
        </div>
      </div>
    </motion.div>,

    // Scene 9: Ready
    <motion.div
      key="scene9"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center space-y-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="text-8xl"
      >
        🌱
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-3xl font-bold text-gray-900">Your Garden is Ready!</h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          You're all set. Your garden will grow as you complete flows and build healthy habits.
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="p-4 bg-teal-50 rounded-xl">
          <div className="text-2xl mb-2">🔔</div>
          <div className="text-xs text-gray-600">
            {data.notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
          </div>
        </div>
        <div className="p-4 bg-teal-50 rounded-xl">
          <div className="text-2xl mb-2">📱</div>
          <div className="text-xs text-gray-600">
            {data.pwaInstalled ? 'App Installed' : 'Web App'}
          </div>
        </div>
        <div className="p-4 bg-teal-50 rounded-xl">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-xs text-gray-600">
            {data.calendarConnected ? 'Calendar Synced' : 'No Calendar'}
          </div>
        </div>
      </div>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-teal-50/30 to-teal-50/30 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentScene + 1} of {totalScenes}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentScene + 1) / totalScenes) * 100)}% Complete
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-600 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentScene + 1) / totalScenes) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Scene Content */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 min-h-[500px] flex flex-col">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                {scenes[currentScene]}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={prevScene}
                disabled={currentScene === 0}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <button
                onClick={nextScene}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl"
              >
                {currentScene === totalScenes - 1 ? 'Start Growing 🌱' : 'Continue'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
