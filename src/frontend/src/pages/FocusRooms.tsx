import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Music, Headphones, Sparkles, Heart, Zap, Moon } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../lib/axios';

interface FocusRoom {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
  spotifyPlaylistId?: string;
  meetCuteSoundType?: 'lofi-focus' | 'lofi-chill' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise';
}

const FOCUS_ROOMS: FocusRoom[] = [
  {
    id: 'deep-focus',
    name: 'Deep Focus Room',
    description: 'Clarity & momentum',
    icon: <Headphones className="w-8 h-8" />,
    gradient: 'from-indigo-600 to-blue-600',
    bgGradient: 'from-indigo-50 to-blue-50',
    spotifyPlaylistId: 'deep-focus-lofi', // Will be replaced with actual playlist ID
    meetCuteSoundType: 'lofi-focus',
  },
  {
    id: 'soft-composure',
    name: 'Soft Composure Room',
    description: 'Calm nervous system',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-600 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    spotifyPlaylistId: 'soft-composure-lofi',
    meetCuteSoundType: 'lofi-calm',
  },
  {
    id: 'warm-connection',
    name: 'Warm Connection Room',
    description: 'Empathy for 1:1s',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-pink-600 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
    spotifyPlaylistId: 'warm-connection-lofi',
    meetCuteSoundType: 'lofi-chill',
  },
  {
    id: 'pitch-pulse',
    name: 'Pitch Pulse Room',
    description: 'Confidence boost',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-yellow-600 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    spotifyPlaylistId: 'pitch-pulse-lofi',
    meetCuteSoundType: 'lofi-morning',
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    description: 'Decompress after tough scenes',
    icon: <Moon className="w-8 h-8" />,
    gradient: 'from-purple-600 to-indigo-600',
    bgGradient: 'from-purple-50 to-indigo-50',
    spotifyPlaylistId: 'recovery-lounge-lofi',
    meetCuteSoundType: 'rain',
  },
];

type TimerOption = 5 | 10 | 20 | '∞';

export default function FocusRooms() {
  const navigate = useNavigate();
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState<TimerOption>(20);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [hasSpotify, setHasSpotify] = useState(false);
  const [audioSource, setAudioSource] = useState<'spotify' | 'meetcute'>('meetcute');

  // Check if Spotify is connected
  useEffect(() => {
    const checkSpotify = async () => {
      try {
        const response = await api.get('/api/user/metadata');
        setHasSpotify(response.data.spotifyConnected || false);
      } catch (error) {
        console.error('Error checking Spotify:', error);
      }
    };
    checkSpotify();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || !isPlaying) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          handleTimerEnd();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPlaying]);

  const handleTimerEnd = () => {
    setIsPlaying(false);
    setActiveRoom(null);
    setTimeRemaining(null);
    // Fade out audio
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'focus-rooms', fadeOut: true }
    }));
  };

  const handleRoomSelect = (room: FocusRoom) => {
    if (activeRoom === room.id) {
      // Toggle off
      setIsPlaying(false);
      setActiveRoom(null);
      setTimeRemaining(null);
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-rooms' }
      }));
    } else {
      // Select new room
      setActiveRoom(room.id);
      setIsPlaying(true);
      
      // Set timer
      if (timer === '∞') {
        setTimeRemaining(null);
      } else {
        setTimeRemaining(timer * 60);
      }

      // Start audio based on source
      if (audioSource === 'spotify' && hasSpotify) {
        // Start Spotify playback
        api.post('/api/spotify/play', {
          playlistId: room.spotifyPlaylistId,
        }).catch(error => {
          console.error('Error starting Spotify:', error);
          // Fallback to Meet-Cute audio
          startMeetCuteAudio(room);
        });
      } else {
        // Use Meet-Cute audio
        startMeetCuteAudio(room);
      }
    }
  };

  const startMeetCuteAudio = (room: FocusRoom) => {
    if (room.meetCuteSoundType) {
      window.dispatchEvent(new CustomEvent('ambient-sound-play', {
        detail: { 
          source: 'focus-rooms', 
          roomId: room.id,
          soundType: room.meetCuteSoundType 
        }
      }));
    }
  };

  const handleConnectSpotify = async () => {
    try {
      const response = await api.get('/api/auth/spotify/url');
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error connecting Spotify:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedRoom = FOCUS_ROOMS.find(r => r.id === activeRoom);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to Dashboard"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Logo size="md" />
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-teal-600 to-pink-600 bg-clip-text text-transparent"
          >
            Focus Rooms
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto"
          >
            Audio is the "stage lighting" for performance. Calm + clarity become a ritual, not a struggle.
          </motion.p>
        </div>

        {/* Audio Source Selector */}
        {!hasSpotify && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 bg-white rounded-xl shadow-lg p-6 border-2 border-teal-200"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Choose Your Audio Source</h3>
                <p className="text-gray-600 text-sm">
                  Connect Spotify to use your own playlists, or use Meet-Cute's built-in soundscapes.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConnectSpotify}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Music className="w-5 h-5" />
                  Connect Spotify
                </button>
                <button
                  onClick={() => {
                    setAudioSource('meetcute');
                  }}
                  className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <Headphones className="w-5 h-5" />
                  Use Meet-Cute Audio
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Focus Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {FOCUS_ROOMS.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => handleRoomSelect(room)}
              className={`
                relative bg-gradient-to-br ${room.bgGradient} rounded-xl sm:rounded-2xl shadow-lg p-6 cursor-pointer
                transition-all hover:shadow-xl hover:scale-105
                ${activeRoom === room.id ? 'ring-4 ring-teal-400 ring-offset-2' : ''}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`text-${room.gradient.split(' ')[0].split('-')[1]}-600`}>
                  {room.icon}
                </div>
                {activeRoom === room.id && isPlaying && (
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {room.name}
              </h3>
              <p className="text-gray-700 text-sm sm:text-base mb-4">
                {room.description}
              </p>
              {activeRoom === room.id && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Playing</span>
                    {timeRemaining !== null && (
                      <span className="font-semibold text-gray-900">
                        {formatTime(timeRemaining)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Controls Panel */}
        {activeRoom && selectedRoom && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 border-2 border-teal-200"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Play/Pause */}
              <button
                onClick={() => {
                  setIsPlaying(!isPlaying);
                  if (!isPlaying) {
                    startMeetCuteAudio(selectedRoom);
                  } else {
                    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                      detail: { source: 'focus-rooms' }
                    }));
                  }
                }}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-600 to-indigo-600 text-white flex items-center justify-center hover:from-teal-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>

              {/* Timer Selector */}
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Timer
                </label>
                <div className="flex gap-2">
                  {([5, 10, 20, '∞'] as TimerOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setTimer(option);
                        if (isPlaying) {
                          if (option === '∞') {
                            setTimeRemaining(null);
                          } else {
                            setTimeRemaining(option * 60);
                          }
                        }
                      }}
                      className={`
                        flex-1 px-4 py-2 rounded-lg font-semibold transition-all
                        ${timer === option
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {option === '∞' ? '∞' : `${option}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Volume2 className="w-4 h-4 inline mr-1" />
                  Volume
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-gray-600" /> : <Volume2 className="w-5 h-5 text-gray-600" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(parseFloat(e.target.value) === 0);
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

