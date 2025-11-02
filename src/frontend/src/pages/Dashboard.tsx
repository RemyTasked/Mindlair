import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

      if (!token) {
        navigate('/');
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const [userResponse, meetingsResponse, statsResponse] = await Promise.all([
        axios.get('/api/user/profile'),
        axios.get('/api/meetings', {
          params: {
            startDate: new Date().toISOString(),
          },
        }),
        axios.get('/api/user/stats', {
          params: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      ]);

      setUser(userResponse.data.user);
      setMeetings(meetingsResponse.data.meetings);
      setStats(statsResponse.data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
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
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Upcoming Meetings</h2>

          {meetings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No upcoming meetings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.slice(0, 10).map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
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
  const dateString = startTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const now = new Date();
  const minutesUntilMeeting = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60));
  const canStartFocusSession = minutesUntilMeeting > 0 && minutesUntilMeeting <= 60; // Within 1 hour

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
      <div className="flex-1">
        <h3 className="font-semibold text-lg mb-1">{meeting.title}</h3>
        <div className="text-gray-600 space-y-1">
          <div>{dateString} at {timeString}</div>
          {minutesUntilMeeting > 0 && minutesUntilMeeting <= 60 && (
            <div className="text-sm text-indigo-600 font-medium">
              Starting in {minutesUntilMeeting} minute{minutesUntilMeeting !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canStartFocusSession && meeting.focusSceneUrl && (
          <a
            href={meeting.focusSceneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            🎬 Start Focus Session
          </a>
        )}
        {meeting.cueDelivered && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            Cue Sent
          </span>
        )}
        {meeting.focusSceneOpened && (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            ✓ Completed
          </span>
        )}
      </div>
    </div>
  );
}

