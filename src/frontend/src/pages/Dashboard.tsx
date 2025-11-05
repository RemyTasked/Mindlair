import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { Calendar, Settings as SettingsIcon, TrendingUp } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  cueDelivered: boolean;
  focusSceneOpened: boolean;
  focusSceneUrl?: string;
  focusSession?: {
    completedAt: string | null;
  };
}

interface Stats {
  totalMeetings: number;
  totalFocusSessions: number;
}

interface PresleyFlow {
  available: boolean;
  meetingCount?: number;
  presleyFlowUrl?: string;
  date?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [presleyFlow, setPresleyFlow] = useState<PresleyFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [eveningFlowTime, setEveningFlowTime] = useState<string>('18:00'); // Default 6 PM

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');

      console.log('🔍 Dashboard - Loading user data', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token?.substring(0, 20) + '...',
      });

      if (!token) {
        console.error('❌ No token found in localStorage');
        navigate('/');
        return;
      }

      console.log('📡 Making API calls to load user data...');

      // Fetch meetings for next 2 days
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const [userResponse, meetingsResponse, statsResponse] = await Promise.all([
        api.get('/api/user/profile'),
        api.get('/api/meetings', {
          params: {
            startDate: now.toISOString(),
            endDate: twoDaysFromNow.toISOString(),
          },
        }),
        api.get('/api/user/stats', {
          params: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      ]);

      // Check for Presley Flow (non-critical - don't fail if it errors)
      let presleyData = { available: false };
      try {
        const presleyResponse = await api.get(`/api/presley-flow/check/${userResponse.data.user.id}`);
        presleyData = presleyResponse.data;
      } catch (presleyError: any) {
        console.warn('⚠️ Presley Flow check failed (non-critical):', presleyError.message);
        // Don't fail the whole dashboard load if Presley Flow check fails
      }

      console.log('✅ API calls successful', {
        userEmail: userResponse.data.user?.email,
        meetingsCount: meetingsResponse.data.meetings?.length,
        totalMeetings: statsResponse.data.stats?.totalMeetings,
        presleyFlowAvailable: presleyData.available,
      });

      setUser(userResponse.data.user);
      setMeetings(meetingsResponse.data.meetings);
      setStats(statsResponse.data.stats);
      setPresleyFlow(presleyData);
      
      // Extract evening flow time from user preferences
      const userEveningFlowTime = userResponse.data.user?.preferences?.eveningFlowTime || '18:00';
      setEveningFlowTime(userEveningFlowTime);
      
      setLoading(false);
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
    localStorage.removeItem('meetcute_token');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <div className="text-2xl" role="img" aria-label="Film camera emoji">🎬</div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Meet Cute
              </h1>
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <StatCard
            icon={<Calendar className="w-8 h-8 text-indigo-600" />}
            label="Upcoming Meetings"
            value={meetings.length}
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8 text-purple-600" />}
            label="Total Meetings (30d)"
            value={stats?.totalMeetings || 0}
          />
          <StatCard
            icon={<div className="text-3xl">✨</div>}
            label="Focus Sessions (30d)"
            value={stats?.totalFocusSessions || 0}
          />
        </div>

        {/* Presley Flow Card */}
        {presleyFlow?.available && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 mb-8 border-2 border-purple-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-4xl">🌙</div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Today's Mental Rehearsal
                    </h3>
                    <p className="text-sm text-purple-600 font-medium">Presley Flow Available</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Prepare for today's {presleyFlow.meetingCount} meeting{presleyFlow.meetingCount !== 1 ? 's' : ''} with a cinematic mental rehearsal. 
                  Visualize success before your day begins.
                </p>
                <a
                  href={presleyFlow.presleyFlowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  🎬 Start Mental Rehearsal
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">
              Upcoming Meetings (Next 2 Days)
            </h2>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Trigger calendar sync on backend
                  const token = localStorage.getItem('meetcute_token');
                  if (!token) return;
                  
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
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
              <p className="text-base sm:text-lg">No upcoming meetings in the next 2 days</p>
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
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        🔒 Unlocks at evening flow
                      </span>
                    )}
                  </h3>
                  {isLocked ? (
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200 text-center">
                      <div className="text-4xl mb-3">🌙</div>
                      <p className="text-gray-700 font-medium mb-2">
                        Tomorrow's meetings are hidden until evening flow
                      </p>
                      <p className="text-sm text-gray-600">
                        Focus on today! Tomorrow's schedule unlocks at {formatEveningTime(eveningFlowTime)} for your mental rehearsal.
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

  meetings.forEach((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    
    let dateLabel: string;
    let isLocked = false;
    
    if (meetingDate.getTime() === today.getTime()) {
      dateLabel = 'Today';
      isLocked = false; // Today's meetings are ALWAYS visible, even after evening flow
    } else if (meetingDate.getTime() === tomorrow.getTime()) {
      dateLabel = 'Tomorrow';
      isLocked = !isEveningFlowTime; // Lock tomorrow's meetings until evening flow time
    } else {
      // Skip meetings beyond tomorrow
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-4">
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-gray-600">{label}</div>
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
  const canStartFocusSession = minutesUntilMeeting > 0 && minutesUntilMeeting <= 10 && !isCompleted; // Within 10 minutes and not completed

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base sm:text-lg mb-1 truncate">{meeting.title}</h3>
        <div className="text-gray-600 text-sm sm:text-base space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{timeString}</span>
            <span className="text-xs sm:text-sm text-gray-500">• {timeUntilText}</span>
          </div>
          {canStartFocusSession && (
            <div className="text-xs sm:text-sm text-indigo-600 font-medium animate-pulse">
              🎬 Focus Session Available Now!
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {isCompleted ? (
          <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm whitespace-nowrap font-medium">
            ✓ Session Completed
          </span>
        ) : (
          <>
            {canStartFocusSession && meeting.focusSceneUrl && (
              <a
                href={meeting.focusSceneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-center whitespace-nowrap"
              >
                🎬 Start Focus Session
              </a>
            )}
            {!canStartFocusSession && minutesUntilMeeting > 10 && (
              <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm whitespace-nowrap">
                Available in {minutesUntilMeeting - 10} min
              </span>
            )}
            {meeting.cueDelivered && (
              <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm whitespace-nowrap">
                Cue Sent
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

