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
}

interface Stats {
  totalMeetings: number;
  totalFocusSessions: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

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

      console.log('✅ API calls successful', {
        userEmail: userResponse.data.user?.email,
        meetingsCount: meetingsResponse.data.meetings?.length,
        totalMeetings: statsResponse.data.stats?.totalMeetings,
      });

      setUser(userResponse.data.user);
      setMeetings(meetingsResponse.data.meetings);
      setStats(statsResponse.data.stats);
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Error loading user data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      console.log('🔄 Removing token and redirecting to landing page');
      localStorage.removeItem('meetcute_token');
      navigate('/');
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

        {/* Upcoming Meetings */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            Upcoming Meetings (Next 2 Days)
          </h2>

          {meetings.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg">No upcoming meetings in the next 2 days</p>
              <p className="text-sm mt-2">Meetings will appear here when they're scheduled</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupMeetingsByDay(meetings).map(({ date, meetings: dayMeetings }) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {date}
                  </h3>
                  <div className="space-y-3">
                    {dayMeetings.map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function groupMeetingsByDay(meetings: Meeting[]): { date: string; meetings: Meeting[] }[] {
  const groups: { [key: string]: Meeting[] } = {};
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  meetings.forEach((meeting) => {
    const meetingDate = new Date(meeting.startTime);
    meetingDate.setHours(0, 0, 0, 0);
    
    let dateLabel: string;
    if (meetingDate.getTime() === today.getTime()) {
      dateLabel = 'Today';
    } else if (meetingDate.getTime() === tomorrow.getTime()) {
      dateLabel = 'Tomorrow';
    } else {
      dateLabel = meetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(meeting);
  });

  return Object.entries(groups).map(([date, meetings]) => ({ date, meetings }));
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
  const canStartFocusSession = minutesUntilMeeting > 0 && minutesUntilMeeting <= 10; // Within 10 minutes

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
          <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm whitespace-nowrap">
            Cue Sent
          </span>
        )}
        {meeting.focusSceneOpened && (
          <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm whitespace-nowrap">
            ✓ Completed
          </span>
        )}
      </div>
    </div>
  );
}

