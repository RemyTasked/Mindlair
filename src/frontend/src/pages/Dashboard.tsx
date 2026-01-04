import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/axios';
import { getToken } from '../utils/persistentStorage';
import { Calendar, Settings as SettingsIcon, TrendingUp, Headphones, Gamepad2, Flower2, Download } from 'lucide-react';
import AmbientSound from '../components/AmbientSound';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import Logo from '../components/Logo';
import { getUserTimezone } from '../utils/timezone';
import Onboarding from '../components/Onboarding';
import OnboardingWelcome from '../components/OnboardingWelcome';
import { getActiveMeeting, setActiveMeetingId } from '../utils/meetingDetection';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  meetingType?: string | null;
  status?: string; // "scheduled", "active", "ended", "cancelled"
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  cueDelivered: boolean;
  focusSceneOpened: boolean;
  focusSceneUrl?: string;
  calendarLabel?: string;
  calendarColor?: string | null;
  calendarAccountId?: string | null;
  focusSession?: {
    completedAt: string | null;
  };
}

const DEFAULT_CALENDAR_COLOR = '#6366f1';

function getContrastColor(hex?: string | null) {
  if (!hex) return '#ffffff';
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 6) return '#ffffff';

  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1f2937' : '#ffffff';
}

interface Stats {
  totalMeetings: number;
  totalFocusSessions: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [eveningFlowTime, setEveningFlowTime] = useState<string>('18:00'); // Default 6 PM
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingWelcome, setShowOnboardingWelcome] = useState(false);
  
  // Compute active meetings (currently in progress) from meetings list
  const activeMeetings = meetings.filter(meeting => {
    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    return now >= startTime && now <= endTime;
  });
  
  const ensureAuthToken = async (): Promise<string | null> => {
    let token = localStorage.getItem('meetcute_token');
    if (token) {
      return token;
    }

    try {
      const restored = await getToken();
      if (restored) {
        console.log('✅ Restored auth token from persistent storage');
        return restored;
      }
    } catch (error) {
      console.error('⚠️ Failed to restore auth token from persistent storage:', error);
    }

    return null;
  };

  // Scene Library moved to Focus Rooms tab

  useEffect(() => {
    loadUserData();

    // Auto-refresh meetings every 5 minutes to catch new calendar events
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing meetings...');
      refreshMeetings();
    }, 5 * 60 * 1000); // 5 minutes

    // Cleanup intervals on unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // Refresh data when navigating back to dashboard
  useEffect(() => {
    // Only refresh if we have user data loaded and we're on the dashboard route
    if (location.pathname === '/dashboard' && user?.id && !loading) {
      console.log('🔄 Dashboard focused - refreshing meetings...');
      refreshMeetings();
    }
  }, [location.pathname, user?.id, loading]);

  const loadUserData = async () => {
    try {
      let token = localStorage.getItem('meetcute_token');
      const hadLocalToken = !!token;

      if (!token) {
        console.warn('❌ No token found in localStorage - attempting restore from persistent storage');
        token = await ensureAuthToken();
      }

      if (!token) {
        console.error('❌ Unable to locate auth token in any storage, redirecting to landing');
        navigate('/');
        return;
      }

      if (!hadLocalToken) {
        localStorage.setItem('meetcute_session_active', 'true');
      }

      console.log('🔍 Dashboard - Loading user data', {
        hasToken: true,
        tokenSource: hadLocalToken ? 'localStorage' : 'persistent',
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
      });

      // Check for cached user profile (session-based cache)
      // Cache persists from sign-in until user logs out or closes browser
      const cachedProfile = localStorage.getItem('meetcute_profile_cache');
      const sessionActive = localStorage.getItem('meetcute_session_active');

      if (cachedProfile && sessionActive === 'true') {
        console.log('✅ Using cached profile data (session cache)');
        const cached = JSON.parse(cachedProfile);
        setUser(cached);
        setEveningFlowTime(cached.preferences?.eveningFlowTime || '18:00');
        
        // Still refresh in background to catch any updates
        api.get('/api/user/profile').then(response => {
          const freshProfile = response.data.user;
          localStorage.setItem('meetcute_profile_cache', JSON.stringify(freshProfile));
          setUser(freshProfile);
          setEveningFlowTime(freshProfile.preferences?.eveningFlowTime || '18:00');
          console.log('🔄 Profile refreshed in background');
        }).catch(err => {
          console.warn('⚠️ Background profile refresh failed:', err);
        });
      }

      console.log('📡 Making API calls to load user data...');

      // Fetch meetings for next 2 days
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      // Load user + meetings in parallel
      const [userResponse, meetingsResponse] = await Promise.all([
        api.get('/api/user/profile'),
        api.get('/api/meetings', {
          params: {
            startDate: new Date().toISOString(),
            endDate: twoDaysFromNow.toISOString(),
          },
        }),
      ]);

      console.log('✅ Critical data loaded', {
        userEmail: userResponse.data.user?.email,
        meetingsCount: meetingsResponse.data.meetings?.length,
      });

      // Detect and update user's timezone if it has changed
      const detectedTimezone = getUserTimezone();
      const savedTimezone = userResponse.data.user.timezone;
      
      if (detectedTimezone !== savedTimezone) {
        console.log('🌍 Timezone changed, updating:', {
          old: savedTimezone,
          new: detectedTimezone,
        });
        // Update timezone in background (don't block UI)
        api.patch('/api/user/timezone', { timezone: detectedTimezone })
          .then(() => console.log('✅ Timezone updated'))
          .catch(err => console.warn('⚠️ Failed to update timezone:', err));
      }

      // Cache user profile for entire session
      localStorage.setItem('meetcute_profile_cache', JSON.stringify(userResponse.data.user));
      localStorage.setItem('meetcute_session_active', 'true');

      // Set critical data immediately (fast render)
      setUser(userResponse.data.user);
      setMeetings(meetingsResponse.data.meetings);
      
      // Detect active meetings
      const activeMeeting = getActiveMeeting(meetingsResponse.data.meetings);
      if (activeMeeting) {
        console.log('🎯 Active meeting detected:', {
          meetingId: activeMeeting.meetingId,
          title: activeMeeting.title,
          isActive: activeMeeting.isActive,
          minutesUntilEnd: activeMeeting.minutesUntilEnd,
        });
        setActiveMeetingId(activeMeeting.meetingId);
      } else {
        console.log('📭 No active meeting at this time');
        setActiveMeetingId(null);
      }
      
      const hasLocalCompletion = localStorage.getItem('meetcute_onboarding_completed') === 'true';
      if (!userResponse.data.user.onboardingCompleted && !hasLocalCompletion) {
        setShowOnboarding(true);
        setShowOnboardingWelcome(true);
      }
      
      // Extract evening flow time from user preferences
      const userEveningFlowTime = userResponse.data.user?.preferences?.eveningFlowTime || '18:00';
      setEveningFlowTime(userEveningFlowTime);
      
      
      // Show UI now - load non-critical data in background
      setLoading(false);

      // DEFERRED: Load stats in background (non-blocking)
      api.get('/api/user/stats', {
        params: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }).then(statsResponse => {
        console.log('✅ Background stats loaded');
        setStats(statsResponse.data.stats);
      }).catch(err => {
        console.warn('⚠️ Background stats load failed (non-critical):', err);
      });
    } catch (error: any) {
      console.error('❌ Error loading user data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      
      // Only redirect to landing page if it's an authentication error (401)
      // For other errors (network issues, etc.), keep user on dashboard
      if (error.response?.status === 401) {
        console.log('🔄 Authentication error - removing token and redirecting');
        localStorage.removeItem('meetcute_token');
        navigate('/');
      } else {
        console.log('⚠️ Non-auth error - staying on dashboard, user can retry');
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    // Clear all session data on logout
    localStorage.removeItem('meetcute_token');
    localStorage.removeItem('meetcute_profile_cache');
    localStorage.removeItem('meetcute_session_active');
    navigate('/');
  };

  // Refresh meetings in background (for auto-polling)
  const refreshMeetings = async () => {
    try {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      
      const meetingsResponse = await api.get('/api/meetings', {
        params: {
          startDate: new Date().toISOString(),
          endDate: twoDaysFromNow.toISOString(),
        },
      });

      const newMeetings = meetingsResponse.data.meetings;
      
      // Only update if meetings have changed
      if (JSON.stringify(newMeetings) !== JSON.stringify(meetings)) {
        console.log('✅ New meetings detected, updating...', {
          oldCount: meetings.length,
          newCount: newMeetings.length,
        });
        setMeetings(newMeetings);
      } else {
        console.log('✅ No meeting changes detected');
      }
    } catch (error: any) {
      console.warn('⚠️ Background meeting refresh failed:', error.message);
      // Don't show error to user - this is a background operation
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (showOnboarding && showOnboardingWelcome) {
    return <OnboardingWelcome onContinue={() => setShowOnboardingWelcome(false)} />;
  }

  if (showOnboarding && user) {
    return (
      <Onboarding
        userId={user.id}
        onComplete={() => {
          localStorage.setItem('meetcute_onboarding_completed', 'true');
          setShowOnboarding(false);
          setShowOnboardingWelcome(false);
          localStorage.removeItem('meetcute_profile_cache');
          loadUserData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Navigation Section */}
            <div className="flex items-center gap-6">
              <Logo size="md" />
              <nav className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    window.location.pathname === '/dashboard'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/focus-rooms')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    window.location.pathname === '/focus-rooms'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Headphones className="w-4 h-4" />
                  Focus Rooms
                </button>
                <button
                  onClick={() => navigate('/games')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    window.location.pathname === '/games'
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4" />
                  Games
                </button>
              </nav>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Settings"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <nav className="sm:hidden flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                window.location.pathname === '/dashboard'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/focus-rooms')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                window.location.pathname === '/focus-rooms'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Headphones className="w-4 h-4" />
              Focus Rooms
            </button>
            <button
              onClick={() => navigate('/games')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                window.location.pathname === '/games'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Games
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Compact Stats Row - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={<Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-teal-600" />}
            label="Upcoming"
            value={meetings.length}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-teal-600" />}
            label="Total (30d)"
            value={stats?.totalMeetings || 0}
          />
          <StatCard
            icon={<div className="text-xl sm:text-3xl">✨</div>}
            label="Sessions"
            value={stats?.totalFocusSessions || 0}
          />
        </div>

        {/* Quick Links to Mind Garden Features */}
        <div className="mb-6 sm:mb-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 sm:p-6 border border-emerald-200">
          <div className="flex items-center gap-3 mb-3">
            <Flower2 className="w-6 h-6 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-900">Your Mind Garden</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Nurture your mental wellness with flows, games, and activities.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/garden" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              🌱 View Garden
            </a>
            <a href="/flows" className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
              🧘 Browse Flows
            </a>
            <a href="/insights" className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
              📊 Insights
            </a>
            <a 
              href="https://chrome.google.com/webstore/detail/mind-garden" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install App
            </a>
          </div>
        </div>

        {/* Ongoing Meetings */}
        {activeMeetings.length > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border-2 border-red-200 mb-6">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl sm:text-2xl font-bold text-red-900">
                  Live Now
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {activeMeetings.map((meeting: any) => {
                return (
                  <div key={meeting.id} className="bg-white rounded-xl p-4 border-2 border-red-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(meeting.startTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric',
                            minute: '2-digit'
                          })} - {new Date(meeting.endTime).toLocaleTimeString('en-US', { 
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                        LIVE
                      </span>
                    </div>
                    
                    {/* Level 1 cues removed - only real-time cues (Cue Companion) are used now */}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">
              Upcoming Meetings
            </h2>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Trigger calendar sync on backend
                  const token = await ensureAuthToken();
                  if (!token) {
                    alert('Please sign in again to refresh your meetings.');
                    return;
                  }
                  
                  const syncResponse = await api.post('/api/meetings/sync', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  
                  console.log('🔄 Calendar sync result:', syncResponse.data);
                  
                  // Reload dashboard data to show new meetings
                  await loadUserData();
                } catch (error: any) {
                  console.error('Error refreshing meetings:', error);
                  alert('Failed to sync calendar: ' + (error.response?.data?.error || error.message));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh meetings from calendar"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {meetings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg">No upcoming meetings</p>
              <p className="text-sm mt-2">Meetings will appear here when they're scheduled</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupMeetingsByDay(meetings, eveningFlowTime).map(({ date, meetings: dayMeetings, isLocked }) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {date}
                    {isLocked && (
                      <span className="ml-2 px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                        🔒 Unlocks at evening flow
                      </span>
                    )}
                  </h3>
                  {isLocked ? (
                    <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border-2 border-teal-200 text-center">
                      <div className="text-4xl mb-3">🌙</div>
                      <p className="text-gray-700 font-medium mb-2">
                        Tomorrow's meetings are hidden until evening
                      </p>
                      <p className="text-sm text-gray-600">
                        Focus on today! Tomorrow's schedule unlocks at {formatEveningTime(eveningFlowTime)}.
                      </p>
                    </div>
                  ) : (
                    <div 
                      className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e0 #f7fafc'
                      }}
                    >
                      {dayMeetings.map((meeting) => (
                        <MeetingCard key={meeting.id} meeting={meeting} />
                      ))}
                      {dayMeetings.length > 5 && (
                        <div className="text-center text-sm text-gray-500 pt-2 border-t mt-2">
                          📅 {dayMeetings.length} meetings total
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="mt-8 text-center">
          <a 
            href="/privacy" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors border border-gray-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Your calendar data is encrypted and secure
          </a>
        </div>
      </main>

      {/* Global Ambient Sound - Disabled on dashboard to prevent interference */}
      <AmbientSound
        soundType="none"
        enabled={false}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

function groupMeetingsByDay(meetings: Meeting[], eveningFlowTime: string): { date: string; meetings: Meeting[]; isLocked: boolean }[] {
  const groups: { [key: string]: { meetings: Meeting[]; isLocked: boolean } } = {};
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Parse evening flow time (format: "HH:mm")
  const [eveningHour, eveningMinute] = eveningFlowTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const eveningTimeInMinutes = eveningHour * 60 + eveningMinute;
  
  // Check if we're in the evening flow window (after evening flow time)
  const isEveningFlowTime = currentTimeInMinutes >= eveningTimeInMinutes;
  
  console.log('🕐 Meeting grouping debug:', {
    currentTime: `${currentHour}:${currentMinute.toString().padStart(2, '0')}`,
    eveningFlowTime,
    currentTimeInMinutes,
    eveningTimeInMinutes,
    isEveningFlowTime,
    todayTimestamp: today.getTime(),
    tomorrowTimestamp: tomorrow.getTime()
  });

  meetings.forEach((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    const originalMeetingDate = meetingDate.toISOString();
    meetingDate.setHours(0, 0, 0, 0);
    
    let dateLabel: string;
    let isLocked = false;
    
    const meetingTimestamp = meetingDate.getTime();
    
    if (meetingTimestamp === today.getTime()) {
      dateLabel = 'Today';
      isLocked = false; // Today's meetings are ALWAYS visible
    } else if (meetingTimestamp === tomorrow.getTime()) {
      dateLabel = 'Tomorrow';
      isLocked = !isEveningFlowTime; // Lock tomorrow's meetings until evening flow time
      console.log(`📅 Tomorrow meeting "${meeting.title}": isLocked=${isLocked}, originalDate=${originalMeetingDate}`);
    } else if (meetingTimestamp > tomorrow.getTime()) {
      // Skip meetings beyond tomorrow
      console.log(`⏭️ Skipping future meeting "${meeting.title}": ${originalMeetingDate}`);
      return;
    } else {
      // Skip past meetings
      console.log(`⏮️ Skipping past meeting "${meeting.title}": ${originalMeetingDate}`);
      return;
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = { meetings: [], isLocked };
    }
    groups[dateLabel].meetings.push(meeting);
  });

  return Object.entries(groups).map(([date, { meetings, isLocked }]) => ({ 
    date, 
    meetings,
    isLocked 
  }));
}

function formatEveningTime(timeString: string): string {
  const [hour, minute] = timeString.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6">
      <div className="flex items-center sm:items-start justify-between mb-2 sm:mb-4">
        {icon}
      </div>
      <div className="text-xl sm:text-3xl font-bold mb-0.5 sm:mb-1">{value}</div>
      <div className="text-xs sm:text-base text-gray-600 leading-tight">{label}</div>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const startTime = new Date(meeting.startTime);
  const timeString = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const now = new Date();
  const minutesUntilMeeting = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
  const hoursUntilMeeting = Math.floor(minutesUntilMeeting / 60);
  const isCompleted = meeting.focusSession?.completedAt != null;
  // Allow prep 15 minutes before meeting (avoids conflicts with back-to-back 30min meetings)
  const canStartFocusSession = minutesUntilMeeting > 0 && minutesUntilMeeting <= 15 && !isCompleted;

  // Format time until meeting
  let timeUntilText = '';
  if (minutesUntilMeeting <= 0) {
    timeUntilText = 'In progress or passed';
  } else if (minutesUntilMeeting <= 10) {
    timeUntilText = `Starting in ${minutesUntilMeeting} min`;
  } else if (minutesUntilMeeting < 60) {
    timeUntilText = `In ${minutesUntilMeeting} minutes`;
  } else if (hoursUntilMeeting < 24) {
    const remainingMinutes = minutesUntilMeeting % 60;
    timeUntilText = `In ${hoursUntilMeeting}h ${remainingMinutes}m`;
  } else {
    const days = Math.floor(hoursUntilMeeting / 24);
    const remainingHours = hoursUntilMeeting % 24;
    timeUntilText = `In ${days}d ${remainingHours}h`;
  }

  const badgeColor = meeting.calendarColor || DEFAULT_CALENDAR_COLOR;
  const badgeStyle = meeting.calendarColor
    ? { backgroundColor: badgeColor, color: getContrastColor(badgeColor) }
    : undefined;
  const badgeClass = meeting.calendarColor
    ? 'px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm'
    : 'px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        {meeting.calendarLabel && (
          <div className="mb-1">
            <span className={badgeClass} style={badgeStyle}>
              {meeting.calendarLabel}
            </span>
          </div>
        )}
        <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">{meeting.title}</h3>
        <div className="text-gray-600 text-sm sm:text-base space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{timeString}</span>
            <span className="text-xs sm:text-sm text-gray-500">• {timeUntilText}</span>
          </div>
          {canStartFocusSession && (
            <div className="text-xs sm:text-sm text-teal-600 font-medium animate-pulse">
              🎬 Focus Session Available Now!
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {isCompleted ? (
          <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium">
            ✓ Prep Complete
          </span>
        ) : (
          <>
            {canStartFocusSession && meeting.focusSceneUrl ? (
              <a
                href={meeting.focusSceneUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  localStorage.setItem('meetcute_autoplay_sound', 'true');
                  window.dispatchEvent(new CustomEvent('ambient-sound-play', {
                    detail: { source: 'dashboard', flow: 'focus-session', meetingId: meeting.id }
                  }));
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg text-center whitespace-nowrap"
              >
                🎬 Start Focus Session
              </a>
            ) : null}
            {!canStartFocusSession && minutesUntilMeeting > 15 && (
              <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm whitespace-nowrap">
                Available in {minutesUntilMeeting - 15} min
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

