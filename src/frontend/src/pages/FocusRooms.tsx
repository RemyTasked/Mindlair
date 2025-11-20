import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Music, Headphones, Sparkles, Heart, Zap, Moon, SkipForward } from 'lucide-react';
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
    meetCuteSoundType: 'lofi-focus', // Uses existing lofi-focus sound
  },
  {
    id: 'soft-composure',
    name: 'Soft Composure Room',
    description: 'Calm nervous system',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-600 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    spotifyPlaylistId: 'soft-composure-lofi',
    meetCuteSoundType: 'rain', // Soothing rain for composure
  },
  {
    id: 'warm-connection',
    name: 'Warm Connection Room',
    description: 'Empathy for 1:1s',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-pink-600 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
    spotifyPlaylistId: 'warm-connection-lofi',
    meetCuteSoundType: 'lofi-chill', // Warm, chill vibes
  },
  {
    id: 'pitch-pulse',
    name: 'Pitch Pulse Room',
    description: 'Confidence boost',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-yellow-600 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    spotifyPlaylistId: 'pitch-pulse-lofi',
    meetCuteSoundType: 'lofi-morning', // Energizing morning beats
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    description: 'Decompress after tough scenes',
    icon: <Moon className="w-8 h-8" />,
    gradient: 'from-purple-600 to-indigo-600',
    bgGradient: 'from-purple-50 to-indigo-50',
    spotifyPlaylistId: 'recovery-lounge-lofi',
    meetCuteSoundType: 'calm-ocean', // Calming ocean waves for recovery
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState(0);

  // Check if Spotify is connected and load credits
  useEffect(() => {
    const loadData = async () => {
      try {
        const [spotifyResponse, statsResponse] = await Promise.all([
          api.get('/api/spotify/status').catch(() => ({ data: { connected: false } })),
          api.get('/api/focus-rooms/stats').catch(() => ({ data: { totalCredits: 0 } })),
        ]);
        setHasSpotify(spotifyResponse.data.connected || false);
        setTotalCredits(statsResponse.data.totalCredits || 0);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    // Check if returning from Spotify OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify_connected') === 'true') {
      // Reload Spotify status
      loadData();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
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

  const handleTimerEnd = async () => {
    setIsPlaying(false);
    
    // Fade out audio gradually, then stop
    if (hasSpotify) {
      try {
        // Fade out Spotify volume over 3 seconds
        const fadeSteps = 10;
        const fadeInterval = 3000 / fadeSteps;
        let currentVolume = volume * 100;
        
        for (let i = 0; i < fadeSteps; i++) {
          await new Promise(resolve => setTimeout(resolve, fadeInterval));
          currentVolume = currentVolume * 0.9; // Reduce by 10% each step
          try {
            await api.post('/api/spotify/volume', {
              volumePercent: Math.max(0, Math.round(currentVolume)),
            });
          } catch (error) {
            // Ignore volume errors during fade
          }
        }
        
        // Pause after fade
        await api.post('/api/spotify/pause');
      } catch (error) {
        console.error('Error fading out Spotify:', error);
        // Try to pause anyway
        try {
          await api.post('/api/spotify/pause');
        } catch (pauseError) {
          console.error('Error pausing Spotify:', pauseError);
        }
      }
    } else {
      // Fade out Meet-Cute audio
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-rooms', fadeOut: true }
      }));
    }
    
    // Complete session
    if (currentSessionId && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      try {
        const response = await api.post('/api/focus-rooms/sessions/complete', {
          sessionId: currentSessionId,
          duration,
          completed: true,
        });
        setTotalCredits(response.data.totalCredits);
      } catch (error) {
        console.error('Error completing session:', error);
      }
    }
    
    setActiveRoom(null);
    setTimeRemaining(null);
    setCurrentSessionId(null);
    setSessionStartTime(null);
  };

  const handleRoomSelect = async (room: FocusRoom) => {
    if (activeRoom === room.id) {
      // Toggle off - pause Spotify and complete current session
      if (currentSessionId && sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        try {
          const response = await api.post('/api/focus-rooms/sessions/complete', {
            sessionId: currentSessionId,
            duration,
            completed: false, // User manually stopped
          });
          setTotalCredits(response.data.totalCredits);
        } catch (error) {
          console.error('Error completing session:', error);
        }
      }

      // Stop audio (Spotify or Meet-Cute)
      if (hasSpotify) {
        try {
          await api.post('/api/spotify/pause');
        } catch (error) {
          console.error('Error pausing Spotify:', error);
        }
      } else {
        // Stop Meet-Cute audio
        window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
          detail: { source: 'focus-rooms' }
        }));
      }
      
      setIsPlaying(false);
      setActiveRoom(null);
      setTimeRemaining(null);
      setCurrentSessionId(null);
      setSessionStartTime(null);
    } else {
      // Start new session
      try {
        const sessionResponse = await api.post('/api/focus-rooms/sessions/start', {
          roomId: room.id,
          roomName: room.name,
          timerOption: timer.toString(),
          audioSource: hasSpotify ? 'spotify' : 'meetcute',
        });
        
        setCurrentSessionId(sessionResponse.data.sessionId);
        setSessionStartTime(Date.now());
      } catch (error) {
        console.error('Error starting session:', error);
      }
      
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
      if (hasSpotify) {
        // Start Spotify playback for this room
        try {
          await api.post('/api/spotify/play', {
            roomId: room.id,
          });
        } catch (error: any) {
          console.error('Error starting Spotify:', error);
          // Fallback to Meet-Cute audio
          startMeetCuteAudio(room);
        }
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
              </nav>
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
          </nav>
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
          {totalCredits > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-block px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold"
            >
              🎯 {totalCredits} Credits Earned
            </motion.div>
          )}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto"
          >
            Audio is the "stage lighting" for performance. Calm + clarity become a ritual, not a struggle.
          </motion.p>
        </div>

        {/* Spotify Connection Prompt - Optional enhancement */}
        {!hasSpotify && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl shadow-lg p-6 sm:p-8 border-2 border-green-200"
          >
            <div className="text-center">
              <Music className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enhance with Spotify</h3>
              <p className="text-gray-700 mb-6 max-w-md mx-auto">
                Connect your Spotify to use your own curated playlists. Rooms work great with our built-in soundscapes too!
              </p>
              <button
                onClick={handleConnectSpotify}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
              >
                <Music className="w-5 h-5" />
                Connect Spotify (Optional)
              </button>
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
                {!hasSpotify && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    Meet-Cute Audio
                  </div>
                )}
                {hasSpotify && (
                  <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Spotify
                  </div>
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
                    {timeRemaining === null && (
                      <span className="font-semibold text-gray-900">∞</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Controls Panel - Show when room is active */}
        {activeRoom && selectedRoom && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 border-2 border-teal-200"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Play/Pause and Skip Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (isPlaying) {
                      // Pause audio
                      if (hasSpotify) {
                        try {
                          await api.post('/api/spotify/pause');
                        } catch (error) {
                          console.error('Error pausing Spotify:', error);
                        }
                      } else {
                        window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                          detail: { source: 'focus-rooms' }
                        }));
                      }
                      setIsPlaying(false);
                    } else {
                      // Resume audio
                      if (hasSpotify) {
                        try {
                          await api.post('/api/spotify/play', {
                            roomId: selectedRoom.id,
                          });
                        } catch (error) {
                          console.error('Error resuming Spotify:', error);
                        }
                      } else {
                        startMeetCuteAudio(selectedRoom);
                      }
                      setIsPlaying(true);
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-600 to-indigo-600 text-white flex items-center justify-center hover:from-teal-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                {hasSpotify && (
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/api/spotify/next');
                      } catch (error) {
                        console.error('Error skipping track:', error);
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-all"
                    title="Skip to next track"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                )}
              </div>

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
                      onClick={async () => {
                        const oldTimer = timer;
                        setTimer(option);
                        
                        if (isPlaying) {
                          if (option === '∞') {
                            setTimeRemaining(null);
                          } else {
                            setTimeRemaining(option * 60);
                          }
                          
                          // If switching from finite to infinite or vice versa, restart session
                          if ((oldTimer !== '∞' && option === '∞') || (oldTimer === '∞' && option !== '∞')) {
                            // Restart session with new timer
                            if (selectedRoom && currentSessionId) {
                              // Complete old session
                              if (sessionStartTime) {
                                const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
                                try {
                                  await api.post('/api/focus-rooms/sessions/complete', {
                                    sessionId: currentSessionId,
                                    duration,
                                    completed: false,
                                  });
                                } catch (error) {
                                  console.error('Error completing session:', error);
                                }
                              }
                              
                              // Start new session
                              try {
                                const sessionResponse = await api.post('/api/focus-rooms/sessions/start', {
                                  roomId: selectedRoom.id,
                                  roomName: selectedRoom.name,
                                  timerOption: option.toString(),
                                  audioSource: 'spotify',
                                });
                                setCurrentSessionId(sessionResponse.data.sessionId);
                                setSessionStartTime(Date.now());
                              } catch (error) {
                                console.error('Error restarting session:', error);
                              }
                            }
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
                    onClick={async () => {
                      const newMuted = !isMuted;
                      setIsMuted(newMuted);
                      
                      // Update audio volume
                      if (hasSpotify && isPlaying) {
                        try {
                          await api.post('/api/spotify/volume', {
                            volumePercent: newMuted ? 0 : Math.round(volume * 100),
                          });
                        } catch (error) {
                          console.error('Error muting Spotify:', error);
                        }
                      } else if (!hasSpotify) {
                        // Meet-Cute audio volume is controlled by AmbientSound component
                        // The volume state here is for UI consistency
                        window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                          detail: { volume: newMuted ? 0 : volume }
                        }));
                      }
                    }}
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
                    onChange={async (e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      setIsMuted(newVolume === 0);
                      
                      // Update audio volume
                      if (hasSpotify && isPlaying) {
                        try {
                          await api.post('/api/spotify/volume', {
                            volumePercent: Math.round(newVolume * 100),
                          });
                        } catch (error) {
                          console.error('Error setting Spotify volume:', error);
                        }
                      } else if (!hasSpotify) {
                        // Meet-Cute audio volume is controlled by AmbientSound component
                        window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                          detail: { volume: newVolume }
                        }));
                      }
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

