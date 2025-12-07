import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Music, Headphones, Sparkles, Heart, Zap, Moon, SkipForward } from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import AmbientSound from '../components/AmbientSound';
import SceneLibrary from '../components/SceneLibrary';
import api from '../lib/axios';

interface FocusRoom {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  bgGradient: string;
  spotifyPlaylistId?: string;
  meetCuteSoundType?: 'lofi-deep-focus' | 'lofi-soft-composure' | 'lofi-warm-connection' | 'lofi-pitch-pulse' | 'lofi-recovery-lounge' | 'lofi-focus' | 'lofi-chill' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise';
}

const FOCUS_ROOMS: FocusRoom[] = [
  {
    id: 'deep-focus',
    name: 'Deep Focus Room',
    description: 'Clarity & momentum',
    icon: <Headphones className="w-8 h-8" />,
    gradient: 'from-sky-600 to-cyan-600',
    bgGradient: 'from-sky-50 to-cyan-50',
    spotifyPlaylistId: 'deep-focus-lofi',
    meetCuteSoundType: 'lofi-deep-focus',
  },
  {
    id: 'soft-composure',
    name: 'Soft Composure Room',
    description: 'Calm nervous system',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-600 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    spotifyPlaylistId: 'soft-composure-lofi',
    meetCuteSoundType: 'lofi-soft-composure',
  },
  {
    id: 'warm-connection',
    name: 'Warm Connection Room',
    description: 'Empathy for 1:1s',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-pink-600 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
    spotifyPlaylistId: 'warm-connection-lofi',
    meetCuteSoundType: 'lofi-warm-connection',
  },
  {
    id: 'pitch-pulse',
    name: 'Pitch Pulse Room',
    description: 'Confidence boost',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-yellow-600 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    spotifyPlaylistId: 'pitch-pulse-lofi',
    meetCuteSoundType: 'lofi-pitch-pulse',
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    description: 'Decompress after tough scenes',
    icon: <Moon className="w-8 h-8" />,
    gradient: 'from-slate-600 to-slate-700',
    bgGradient: 'from-slate-50 to-gray-50',
    spotifyPlaylistId: 'recovery-lounge-lofi',
    meetCuteSoundType: 'lofi-recovery-lounge',
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
  const [hasAppleMusic, setHasAppleMusic] = useState(false);
  const [audioProvider, setAudioProvider] = useState<'spotify' | 'apple-music' | 'meetcute'>('meetcute');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState(0);
  const [activeTab, setActiveTab] = useState<'focus-rooms' | 'ambient-library'>('focus-rooms');

  // Check if Spotify/Apple Music is connected and load credits
  useEffect(() => {
    const loadData = async () => {
      try {
        const [spotifyResponse, appleMusicResponse, statsResponse] = await Promise.all([
          api.get('/api/spotify/status').catch(() => ({ data: { connected: false } })),
          api.get('/api/apple-music/status').catch(() => ({ data: { connected: false } })),
          api.get('/api/focus-rooms/stats').catch(() => ({ data: { totalCredits: 0 } })),
        ]);
        setHasSpotify(spotifyResponse.data.connected || false);
        setHasAppleMusic(appleMusicResponse.data.connected || false);
        setTotalCredits(statsResponse.data.totalCredits || 0);
        setAudioProvider('meetcute');
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify_connected') === 'true' || urlParams.get('apple_music_connected') === 'true') {
      loadData();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || !isPlaying) return;
    
    if (timeRemaining <= 0) {
      handleTimerEnd();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPlaying]);
  
  useEffect(() => {
    if (timeRemaining === 0 && isPlaying) {
      handleTimerEnd();
    }
  }, [timeRemaining]);

  const handleTimerEnd = async () => {
    setIsPlaying(false);
    
    if (hasSpotify) {
      try {
        const fadeSteps = 10;
        const fadeInterval = 3000 / fadeSteps;
        let currentVolume = volume * 100;
        
        for (let i = 0; i < fadeSteps; i++) {
          await new Promise(resolve => setTimeout(resolve, fadeInterval));
          currentVolume = currentVolume * 0.9;
          try {
            await api.post('/api/spotify/volume', {
              volumePercent: Math.max(0, Math.round(currentVolume)),
            });
          } catch (error) {
            // Ignore volume errors during fade
          }
        }
        
        await api.post('/api/spotify/pause');
      } catch (error) {
        console.error('Error fading out Spotify:', error);
        try {
          await api.post('/api/spotify/pause');
        } catch (pauseError) {
          console.error('Error pausing Spotify:', pauseError);
        }
      }
    } else {
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-rooms', fadeOut: true }
      }));
    }
    
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
    // Stop all audio first
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'focus-rooms-select', fadeOut: false }
    }));
    
    if (audioProvider === 'spotify') {
      try {
        await api.post('/api/spotify/pause').catch(() => {});
      } catch (error) {
        console.error('Error pausing Spotify:', error);
      }
    } else if (audioProvider === 'apple-music') {
      if (typeof window !== 'undefined' && (window as any).MusicKit) {
        try {
          (window as any).MusicKit.getInstance().stop().catch(() => {});
        } catch (error) {
          console.error('Error stopping Apple Music:', error);
        }
      }
    }
    
    if (activeRoom === room.id) {
      if (currentSessionId && sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
        try {
          const response = await api.post('/api/focus-rooms/sessions/complete', {
            sessionId: currentSessionId,
            duration,
            completed: false,
          });
          setTotalCredits(response.data.totalCredits);
        } catch (error) {
          console.error('Error completing session:', error);
        }
      }
      
      setIsPlaying(false);
      setActiveRoom(null);
      setTimeRemaining(null);
      setCurrentSessionId(null);
      setSessionStartTime(null);
      return;
    } else {
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
      
      setActiveRoom(room.id);
      setIsPlaying(false);
      
      if (timer === '∞') {
        setTimeRemaining(null);
      } else {
        setTimeRemaining(timer * 60);
      }
    }
  };

  const startMeetCuteAudio = (room: FocusRoom) => {
    if (room.meetCuteSoundType) {
      console.log('🎵 Starting Mind Garden audio for room:', { roomId: room.id, soundType: room.meetCuteSoundType });
      
      // First stop any currently playing audio to prevent overlap
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-rooms-before-start', fadeOut: false }
      }));
      
      // Small delay then start the new sound
      setTimeout(() => {
        localStorage.setItem('meetcute_autoplay_sound', 'true');
        window.dispatchEvent(new CustomEvent('ambient-sound-play', {
          detail: { 
            source: 'focus-rooms-mindgarden', 
            soundType: room.meetCuteSoundType
          }
        }));
      }, 150);
    }
  };


  const handleConnectSpotify = async () => {
    try {
      const token = localStorage.getItem('meetcute_token');
      if (!token) {
        alert('Please log in first to connect Spotify.');
        navigate('/');
        return;
      }

      const response = await api.get('/api/auth/spotify/url');
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error('Error connecting Spotify:', error);
      
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Authentication required';
        alert(`Authentication error: ${errorMessage}\n\nPlease log in again.`);
        localStorage.removeItem('meetcute_token');
        localStorage.removeItem('meetcute_profile_cache');
        navigate('/');
      } else {
        alert(`Failed to connect Spotify: ${error.response?.data?.message || error.message || 'Unknown error'}\n\nPlease try again or contact support.`);
      }
    }
  };

  const handleConnectAppleMusic = async () => {
    if (typeof window !== 'undefined' && (window as any).MusicKit) {
      try {
        const musicKit = (window as any).MusicKit.getInstance();
        const userToken = await musicKit.authorize();
        const userInfo = await musicKit.api.music('/v1/me');
        
        await api.post('/api/auth/apple-music/connect', {
          userToken,
          appleMusicId: userInfo.data[0].id,
          displayName: userInfo.data[0].attributes?.name || undefined,
        });
        
        setHasAppleMusic(true);
        setAudioProvider('apple-music');
      } catch (error) {
        console.error('Error connecting Apple Music:', error);
        alert('Failed to connect Apple Music. Please make sure you have an Apple Music subscription.');
      }
    } else {
      alert('Apple Music requires MusicKit JS. Please ensure you have an Apple Music subscription and are using a supported browser.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout activeSection="spotify">
      <div className="p-4 md:p-8 pb-32 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
            Focus Rooms
          </h1>
          <p className="text-[var(--mg-text-secondary)]">
            Audio is the "stage lighting" for performance. Calm + clarity become a ritual, not a struggle.
          </p>
          {totalCredits > 0 && (
            <div className="inline-block mt-2 px-3 py-1 bg-[var(--mg-accent)]/20 text-[var(--mg-accent-light)] rounded-full text-sm font-semibold">
              🎯 {totalCredits} Credits Earned
            </div>
          )}
        </div>

        {/* Music Service Connection Status */}
        {(hasSpotify || hasAppleMusic) && (
          <div className="mb-6 mg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Music className="w-5 h-5 text-[var(--mg-accent)]" />
              <span className="text-[var(--mg-text-primary)] font-medium">Music Services:</span>
              {hasSpotify && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-lg">
                  <span className="text-green-400 text-sm font-medium">Spotify Connected</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/api/spotify/disconnect');
                        setHasSpotify(false);
                        if (audioProvider === 'spotify') {
                          setAudioProvider('meetcute');
                          if (isPlaying) {
                            window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                              detail: { source: 'focus-rooms' }
                            }));
                            setIsPlaying(false);
                          }
                        }
                      } catch (error: any) {
                        console.error('Error disconnecting Spotify:', error);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              )}
              {hasAppleMusic && (
                <div className="flex items-center gap-2 px-3 py-1 bg-pink-500/20 rounded-lg">
                  <span className="text-pink-400 text-sm font-medium">Apple Music Connected</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/api/apple-music/disconnect');
                        setHasAppleMusic(false);
                        if (audioProvider === 'apple-music') {
                          setAudioProvider('meetcute');
                          if (isPlaying) {
                            window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                              detail: { source: 'focus-rooms' }
                            }));
                            setIsPlaying(false);
                          }
                        }
                      } catch (error: any) {
                        console.error('Error disconnecting Apple Music:', error);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Music Service Connection Prompt */}
        {!hasSpotify && !hasAppleMusic && (
          <div className="mb-6 mg-card p-5">
            <div className="text-center">
              <Music className="w-10 h-10 text-[var(--mg-accent)] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-2">Enhance with Music</h3>
              <p className="text-[var(--mg-text-muted)] mb-4 text-sm max-w-md mx-auto">
                Connect Spotify or Apple Music for curated playlists. Rooms work great with our built-in soundscapes too!
              </p>
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-400">
                  <span className="font-semibold">⚠️ Spotify Premium Required:</span> Spotify playback requires a Premium subscription.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleConnectSpotify}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2 justify-center"
                >
                  <Music className="w-4 h-4" />
                  Connect Spotify
                </button>
                <button
                  onClick={handleConnectAppleMusic}
                  className="px-5 py-2.5 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-all flex items-center gap-2 justify-center"
                >
                  <Music className="w-4 h-4" />
                  Connect Apple Music
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mg-card overflow-hidden mb-6">
          <div className="flex border-b border-[var(--mg-border)]">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                  detail: { source: 'focus-rooms-tab-switch', fadeOut: true }
                }));
                
                if (activeRoom) {
                  if (audioProvider === 'spotify') {
                    api.post('/api/spotify/pause').catch(() => {});
                  } else if (audioProvider === 'apple-music') {
                    if (typeof window !== 'undefined' && (window as any).MusicKit) {
                      (window as any).MusicKit.getInstance().stop().catch(() => {});
                    }
                  }
                  setActiveRoom(null);
                  setIsPlaying(false);
                }
                
                setActiveTab('focus-rooms');
              }}
              className={`flex-1 px-4 py-3 text-center font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'focus-rooms'
                  ? 'bg-[var(--mg-accent)] text-white'
                  : 'text-[var(--mg-text-muted)] hover:bg-[var(--mg-bg-primary)]'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>Focus Rooms</span>
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                  detail: { source: 'ambient-library-tab-switch', fadeOut: true }
                }));
                
                if (activeRoom) {
                  if (audioProvider === 'spotify') {
                    api.post('/api/spotify/pause').catch(() => {});
                  } else if (audioProvider === 'apple-music') {
                    if (typeof window !== 'undefined' && (window as any).MusicKit) {
                      (window as any).MusicKit.getInstance().stop().catch(() => {});
                    }
                  }
                  setActiveRoom(null);
                  setIsPlaying(false);
                }
                
                setActiveTab('ambient-library');
              }}
              className={`flex-1 px-4 py-3 text-center font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ambient-library'
                  ? 'bg-[var(--mg-accent)] text-white'
                  : 'text-[var(--mg-text-muted)] hover:bg-[var(--mg-bg-primary)]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Ambient Library</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6 min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'focus-rooms' && (
                <motion.div
                  key="focus-rooms"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FOCUS_ROOMS.map((room, index) => (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        onClick={() => handleRoomSelect(room)}
                        className={`
                          relative bg-gradient-to-br ${room.bgGradient} rounded-xl p-5 cursor-pointer
                          transition-all hover:shadow-lg hover:scale-[1.02]
                          ${activeRoom === room.id ? 'ring-2 ring-[var(--mg-accent)] ring-offset-2 ring-offset-[var(--mg-bg-primary)]' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`text-${room.gradient.split(' ')[0].split('-')[1]}-600`}>
                            {room.icon}
                          </div>
                          {activeRoom === room.id && isPlaying && (
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {room.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          {room.description}
                        </p>
                        
                        {/* Audio Provider Badge */}
                        <div className="flex items-center gap-2">
                          {audioProvider === 'meetcute' && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                              Mind Garden Audio
                            </span>
                          )}
                          {audioProvider === 'spotify' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Spotify
                            </span>
                          )}
                          {audioProvider === 'apple-music' && (
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
                              Apple Music
                            </span>
                          )}
                        </div>

                        {/* Controls when active */}
                        {activeRoom === room.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-gray-300 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Audio Source Toggle */}
                            {(hasSpotify || hasAppleMusic) && (
                              <div className="mb-3">
                                <label className="text-xs font-medium text-gray-600 mb-2 block">Audio Source</label>
                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (audioProvider !== 'meetcute') {
                                        if (audioProvider === 'spotify') {
                                          api.post('/api/spotify/pause').catch(() => {});
                                        }
                                        setAudioProvider('meetcute');
                                        if (isPlaying) {
                                          startMeetCuteAudio(room);
                                        }
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                      audioProvider === 'meetcute'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    Mind Garden
                                  </button>
                                  {hasSpotify && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (audioProvider !== 'spotify') {
                                          window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                                            detail: { source: 'focus-rooms' }
                                          }));
                                          setAudioProvider('spotify');
                                          if (isPlaying) {
                                            try {
                                              await api.post('/api/spotify/play', { roomId: room.id });
                                            } catch (error: any) {
                                              const status = error.response?.status;
                                              if (status === 403) {
                                                alert('Spotify Premium is required for playback.');
                                              } else if (status === 404) {
                                                alert('No active Spotify device. Please open Spotify first.');
                                              }
                                              setAudioProvider('meetcute');
                                              startMeetCuteAudio(room);
                                            }
                                          }
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        audioProvider === 'spotify'
                                          ? 'bg-green-600 text-white'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      Spotify
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Timer */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-600">Timer</span>
                                </div>
                                {timeRemaining !== null && (
                                  <span className="text-sm font-bold text-gray-900">
                                    {formatTime(timeRemaining)}
                                  </span>
                                )}
                                {timeRemaining === null && (
                                  <span className="text-sm font-bold text-gray-900">∞</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {([5, 10, 20, '∞'] as TimerOption[]).map((option) => (
                                  <button
                                    key={option}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTimer(option);
                                      if (option === '∞') {
                                        setTimeRemaining(null);
                                      } else {
                                        setTimeRemaining(option * 60);
                                      }
                                    }}
                                    className={`
                                      px-3 py-1.5 rounded-lg font-medium transition-all text-xs
                                      ${timer === option
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }
                                    `}
                                  >
                                    {option === '∞' ? '∞' : `${option}m`}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Play/Pause and Volume */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-600">Volume</span>
                                  <span className="text-xs font-medium text-gray-900">
                                    {Math.round((isMuted ? 0 : volume) * 100)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      
                                      if (isPlaying) {
                                        // Pause
                                        window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                                          detail: { source: 'focus-rooms-play-pause', fadeOut: false }
                                        }));
                                        
                                        if (audioProvider === 'spotify') {
                                          try {
                                            await api.post('/api/spotify/pause');
                                          } catch (error) {
                                            console.error('Error pausing Spotify:', error);
                                          }
                                        }
                                        
                                        setIsPlaying(false);
                                      } else {
                                        // Play
                                        if (audioProvider === 'spotify') {
                                          try {
                                            // Try to play via Spotify API
                                            const response = await api.post('/api/spotify/play', { roomId: room.id });
                                            if (response.data?.success === false) {
                                              throw new Error(response.data?.error || 'Playback failed');
                                            }
                                            setIsPlaying(true);
                                          } catch (error: any) {
                                            console.error('Error starting Spotify:', error);
                                            const status = error.response?.status;
                                            const errorMessage = error.response?.data?.error || error.message || '';
                                            
                                            // Handle specific error types
                                            if (status === 404 || errorMessage.includes('no active device')) {
                                              if (confirm('No active Spotify device found. Use Mind Garden audio instead?')) {
                                                setAudioProvider('meetcute');
                                                startMeetCuteAudio(room);
                                                setIsPlaying(true);
                                              }
                                            } else if (status === 403 || errorMessage.includes('PREMIUM_REQUIRED')) {
                                              alert('Spotify Premium is required for playback. Switching to Mind Garden audio.');
                                              setAudioProvider('meetcute');
                                              startMeetCuteAudio(room);
                                              setIsPlaying(true);
                                            } else {
                                              // Generic fallback
                                              console.log('Spotify playback failed, falling back to Mind Garden audio');
                                              setAudioProvider('meetcute');
                                              startMeetCuteAudio(room);
                                              setIsPlaying(true);
                                            }
                                          }
                                        } else {
                                          startMeetCuteAudio(room);
                                          setIsPlaying(true);
                                        }
                                      }
                                    }}
                                    className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-center hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md"
                                  >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                  </button>
                                  
                                  {(audioProvider === 'spotify' || audioProvider === 'apple-music') && isPlaying && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (audioProvider === 'spotify') {
                                          try {
                                            await api.post('/api/spotify/next');
                                          } catch (error) {
                                            console.error('Error skipping track:', error);
                                          }
                                        }
                                      }}
                                      className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all shadow-md flex items-center justify-center"
                                    >
                                      <SkipForward className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newMuted = !isMuted;
                                    setIsMuted(newMuted);
                                    
                                    if (audioProvider === 'meetcute') {
                                      window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                                        detail: { volume: newMuted ? 0 : volume }
                                      }));
                                    } else if (audioProvider === 'spotify' && isPlaying) {
                                      api.post('/api/spotify/volume', {
                                        volumePercent: newMuted ? 0 : Math.round(volume * 100),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-all"
                                >
                                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={isMuted ? 0 : volume}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newVolume = parseFloat(e.target.value);
                                    setVolume(newVolume);
                                    setIsMuted(newVolume === 0);
                                    
                                    if (audioProvider === 'meetcute') {
                                      window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                                        detail: { volume: newVolume }
                                      }));
                                    } else if (audioProvider === 'spotify' && isPlaying) {
                                      api.post('/api/spotify/volume', {
                                        volumePercent: Math.round(newVolume * 100),
                                      }).catch(() => {});
                                    }
                                  }}
                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ambient-library' && (
                <motion.div
                  key="ambient-library"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SceneLibrary
                    timeOfDay={new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
                    onSoundTypeChange={() => {
                      if (activeRoom) {
                        if (audioProvider === 'spotify') {
                          api.post('/api/spotify/pause').catch(() => {});
                        }
                        setActiveRoom(null);
                        setIsPlaying(false);
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Global Ambient Sound */}
      <AmbientSound
        soundType="none"
        enabled={true}
        stopOnNavigation={false}
      />
    </DashboardLayout>
  );
}
