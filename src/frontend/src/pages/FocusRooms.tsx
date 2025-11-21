import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Music, Headphones, Sparkles, Heart, Zap, Moon, SkipForward, ChevronDown, ChevronUp, Settings as SettingsIcon } from 'lucide-react';
import Logo from '../components/Logo';
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
    gradient: 'from-indigo-600 to-blue-600',
    bgGradient: 'from-indigo-50 to-blue-50',
    spotifyPlaylistId: 'deep-focus-lofi', // Will be replaced with actual playlist ID
    meetCuteSoundType: 'lofi-deep-focus', // Custom lo-fi for deep focus
  },
  {
    id: 'soft-composure',
    name: 'Soft Composure Room',
    description: 'Calm nervous system',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-600 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    spotifyPlaylistId: 'soft-composure-lofi',
    meetCuteSoundType: 'lofi-soft-composure', // Custom lo-fi for composure
  },
  {
    id: 'warm-connection',
    name: 'Warm Connection Room',
    description: 'Empathy for 1:1s',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-pink-600 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
    spotifyPlaylistId: 'warm-connection-lofi',
    meetCuteSoundType: 'lofi-warm-connection', // Custom lo-fi for connection
  },
  {
    id: 'pitch-pulse',
    name: 'Pitch Pulse Room',
    description: 'Confidence boost',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-yellow-600 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    spotifyPlaylistId: 'pitch-pulse-lofi',
    meetCuteSoundType: 'lofi-pitch-pulse', // Custom lo-fi for confidence
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    description: 'Decompress after tough scenes',
    icon: <Moon className="w-8 h-8" />,
    gradient: 'from-purple-600 to-indigo-600',
    bgGradient: 'from-purple-50 to-indigo-50',
    spotifyPlaylistId: 'recovery-lounge-lofi',
    meetCuteSoundType: 'lofi-recovery-lounge', // Custom lo-fi for recovery
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
  const [showSceneLibrary, setShowSceneLibrary] = useState(false);

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
        
        // Set default audio provider - default to Meet-Cute even if Spotify/Apple Music connected
        // User can toggle to Spotify/Apple Music if they want
        setAudioProvider('meetcute');
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    // Check if returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('spotify_connected') === 'true' || urlParams.get('apple_music_connected') === 'true') {
      loadData();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || !isPlaying) return;
    
    // Don't start countdown if timeRemaining is already 0 or negative
    if (timeRemaining <= 0) {
      handleTimerEnd();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Will trigger handleTimerEnd on next render
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPlaying]);
  
  // Separate effect to handle timer end
  useEffect(() => {
    if (timeRemaining === 0 && isPlaying) {
      handleTimerEnd();
    }
  }, [timeRemaining]);

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

      // Stop audio (Spotify, Apple Music, or Meet-Cute)
      if (audioProvider === 'spotify') {
        try {
          await api.post('/api/spotify/pause');
        } catch (error) {
          console.error('Error pausing Spotify:', error);
        }
      } else if (audioProvider === 'apple-music') {
        if (typeof window !== 'undefined' && (window as any).MusicKit) {
          try {
            const musicKit = (window as any).MusicKit.getInstance();
            await musicKit.stop();
          } catch (error) {
            console.error('Error stopping Apple Music:', error);
          }
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
      if (audioProvider === 'spotify') {
        // Start Spotify playback for this room
        try {
          const response = await api.post('/api/spotify/play', {
            roomId: room.id,
          });
          console.log('✅ Spotify playback started:', response.data);
          setIsPlaying(true);
        } catch (error: any) {
          console.error('❌ Error starting Spotify:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Failed to start Spotify playback';
          
          // Show user-friendly error message
          alert(`Spotify playback failed: ${errorMessage}\n\nFalling back to Meet-Cute audio.`);
          
          // Fallback to Meet-Cute audio
          startMeetCuteAudio(room);
          setAudioProvider('meetcute');
        }
      } else if (audioProvider === 'apple-music') {
        // Start Apple Music playback for this room
        try {
          const response = await api.post('/api/apple-music/play', {
            roomId: room.id,
          });
          
          // Use MusicKit JS to play the playlist
          if (typeof window !== 'undefined' && (window as any).MusicKit) {
            const musicKit = (window as any).MusicKit.getInstance();
            await musicKit.setQueue({ playlist: response.data.playlistId });
            await musicKit.play();
          }
        } catch (error: any) {
          console.error('Error starting Apple Music:', error);
          // Fallback to Meet-Cute audio
          startMeetCuteAudio(room);
          setAudioProvider('meetcute');
        }
      } else {
        // Use Meet-Cute audio
        startMeetCuteAudio(room);
      }
    }
  };

  const startMeetCuteAudio = (room: FocusRoom) => {
    if (room.meetCuteSoundType) {
      console.log('🎵 Starting Meet-Cute audio for room:', { roomId: room.id, soundType: room.meetCuteSoundType });
      // Stop any existing audio first (Spotify, Apple Music, or other Meet-Cute)
      if (audioProvider === 'spotify') {
        api.post('/api/spotify/pause').catch(() => {});
      } else if (audioProvider === 'apple-music') {
        if (typeof window !== 'undefined' && (window as any).MusicKit) {
          (window as any).MusicKit.getInstance().stop().catch(() => {});
        }
      }
      
      // Always stop ambient sound first
      window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
        detail: { source: 'focus-rooms' }
      }));
      
      // Wait a moment for stop to complete, then start new audio
      setTimeout(() => {
        console.log('🎵 Dispatching ambient-sound-play event with soundType:', room.meetCuteSoundType);
        localStorage.setItem('meetcute_autoplay_sound', 'true');
        window.dispatchEvent(new CustomEvent('ambient-sound-play', {
          detail: { 
            source: 'focus-rooms', 
            roomId: room.id,
            soundType: room.meetCuteSoundType 
          }
        }));
        console.log('✅ Dispatched ambient-sound-play event:', { soundType: room.meetCuteSoundType });
      }, 600); // Increased delay to ensure all stops complete
    } else {
      console.warn('⚠️ No meetCuteSoundType for room:', room.id);
    }
  };


  const handleConnectSpotify = async () => {
    try {
      const response = await api.get('/api/auth/spotify/url');
      // Open in same window to avoid popup blockers and ensure proper redirect
      window.location.href = response.data.authUrl;
    } catch (error: any) {
      console.error('Error connecting Spotify:', error);
      alert(`Failed to connect Spotify: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const handleConnectAppleMusic = async () => {
    // Apple Music uses MusicKit JS on the frontend
    // Check if MusicKit is available
    if (typeof window !== 'undefined' && (window as any).MusicKit) {
      try {
        const musicKit = (window as any).MusicKit.getInstance();
        const userToken = await musicKit.authorize();
        const userInfo = await musicKit.api.music('/v1/me');
        
        // Send token to backend
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
            
            {/* Settings and Sign Out */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('meetcute_token');
                  localStorage.removeItem('meetcute_profile_cache');
                  localStorage.removeItem('meetcute_session_active');
                  navigate('/');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
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

        {/* Music Service Connection Status */}
        {(hasSpotify || hasAppleMusic) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-gradient-to-r from-teal-50 to-green-50 rounded-xl shadow-lg p-6 sm:p-8 border-2 border-teal-200"
          >
            <div className="text-center">
              <Music className="w-12 h-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Music Services Connected</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {hasSpotify && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-100 rounded-lg">
                    <span className="text-green-800 font-semibold">Spotify Connected</span>
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
                          alert('Spotify disconnected successfully');
                        } catch (error: any) {
                          console.error('Error disconnecting Spotify:', error);
                          alert('Failed to disconnect Spotify. Please try again.');
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
                {hasAppleMusic && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-pink-100 rounded-lg">
                    <span className="text-pink-800 font-semibold">Apple Music Connected</span>
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
                          alert('Apple Music disconnected successfully');
                        } catch (error: any) {
                          console.error('Error disconnecting Apple Music:', error);
                          alert('Failed to disconnect Apple Music. Please try again.');
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Music Service Connection Prompt - Optional enhancement */}
        {!hasSpotify && !hasAppleMusic && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl shadow-lg p-6 sm:p-8 border-2 border-green-200"
          >
            <div className="text-center">
              <Music className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enhance with Music</h3>
              <p className="text-gray-700 mb-4 max-w-md mx-auto">
                Connect Spotify or Apple Music for curated playlists. Rooms work great with our built-in soundscapes too!
              </p>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Spotify Premium Required:</span> Spotify playback requires a Premium subscription. Meet-Cute audio works for everyone!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleConnectSpotify}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Music className="w-5 h-5" />
                  Connect Spotify
                </button>
                <button
                  onClick={handleConnectAppleMusic}
                  className="px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Music className="w-5 h-5" />
                  Connect Apple Music
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ambient Sound Library Section - Moved to top for better visibility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white rounded-xl shadow-lg border-2 border-teal-200 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4 cursor-pointer"
              onClick={() => setShowSceneLibrary(!showSceneLibrary)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Headphones className="w-6 h-6 text-white" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Ambient Sound Library</h2>
                    <p className="text-sm text-teal-100">Natural soundscapes for focus and relaxation</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSceneLibrary(!showSceneLibrary);
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                >
                  {showSceneLibrary ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
            
            <AnimatePresence>
              {showSceneLibrary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 bg-gray-50">
                    <SceneLibrary
                      timeOfDay={new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
                      onSoundTypeChange={() => {
                        // Stop any Focus Room audio when using Scene Library
                        if (activeRoom) {
                          if (audioProvider === 'spotify') {
                            api.post('/api/spotify/pause').catch(() => {});
                          } else if (audioProvider === 'apple-music') {
                            if (typeof window !== 'undefined' && (window as any).MusicKit) {
                              (window as any).MusicKit.getInstance().stop().catch(() => {});
                            }
                          } else {
                            window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                              detail: { source: 'focus-rooms' }
                            }));
                          }
                          setActiveRoom(null);
                          setIsPlaying(false);
                        }
                        // SceneLibrary component will dispatch the ambient-sound-play event itself
                        // This callback is just for stopping Focus Room audio
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

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
                {audioProvider === 'meetcute' && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                    Meet-Cute Audio
                  </div>
                )}
                {audioProvider === 'spotify' && (
                  <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Spotify
                  </div>
                )}
                {audioProvider === 'apple-music' && (
                  <div className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-semibold rounded-full">
                    Apple Music
                  </div>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                {room.name}
              </h3>
              <p className="text-gray-700 text-sm sm:text-base mb-4">
                {room.description}
              </p>
              
              {/* Audio Provider Toggle - Show when room is active and Spotify/Apple Music connected */}
              {activeRoom === room.id && (hasSpotify || hasAppleMusic) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-300"
                >
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Audio Source</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (audioProvider !== 'meetcute') {
                            // Stop current audio
                            if (audioProvider === 'spotify') {
                              api.post('/api/spotify/pause').catch(() => {});
                            } else if (audioProvider === 'apple-music') {
                              if (typeof window !== 'undefined' && (window as any).MusicKit) {
                                (window as any).MusicKit.getInstance().stop().catch(() => {});
                              }
                            }
                            setAudioProvider('meetcute');
                            // Start Meet-Cute audio
                            if (isPlaying) {
                              startMeetCuteAudio(room);
                            }
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          audioProvider === 'meetcute'
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Meet-Cute Audio
                      </button>
                      {hasSpotify && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (audioProvider !== 'spotify') {
                              // Stop Meet-Cute audio
                              window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                                detail: { source: 'focus-rooms' }
                              }));
                              setAudioProvider('spotify');
                              // Start Spotify if playing
                              if (isPlaying) {
                                api.post('/api/spotify/play', { roomId: room.id }).catch((error) => {
                                  console.error('Error starting Spotify:', error);
                                  alert('Spotify playback failed. Make sure you have Premium and Spotify is open on one of your devices.');
                                  // Fallback to Meet-Cute
                                  setAudioProvider('meetcute');
                                  startMeetCuteAudio(room);
                                });
                              }
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            audioProvider === 'spotify'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Spotify <span className="text-xs">(Premium)</span>
                        </button>
                      )}
                      {hasAppleMusic && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (audioProvider !== 'apple-music') {
                              // Stop Meet-Cute audio
                              window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                                detail: { source: 'focus-rooms' }
                              }));
                              setAudioProvider('apple-music');
                              // Start Apple Music if playing
                              if (isPlaying) {
                                api.post('/api/apple-music/play', { roomId: room.id })
                                  .then(async (response) => {
                                    if (typeof window !== 'undefined' && (window as any).MusicKit) {
                                      const musicKit = (window as any).MusicKit.getInstance();
                                      await musicKit.setQueue({ playlist: response.data.playlistId });
                                      await musicKit.play();
                                    }
                                  })
                                  .catch((error) => {
                                    console.error('Error starting Apple Music:', error);
                                    // Fallback to Meet-Cute
                                    setAudioProvider('meetcute');
                                    startMeetCuteAudio(room);
                                  });
                              }
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            audioProvider === 'apple-music'
                              ? 'bg-pink-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Apple Music
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Timer and Volume Controls - Show when this room is active */}
              {activeRoom === room.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-gray-300 space-y-4"
                >
                  {/* Timer Display and Controls */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-semibold text-gray-700">Timer</span>
                      </div>
                      {timeRemaining !== null && (
                        <span className="text-lg font-bold text-teal-600">
                          {formatTime(timeRemaining)}
                        </span>
                      )}
                      {timeRemaining === null && (
                        <span className="text-lg font-bold text-teal-600">∞</span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {([5, 10, 20, '∞'] as TimerOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevent room selection
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
                                if (selectedRoom && currentSessionId) {
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
                                  
                                  try {
                                    const sessionResponse = await api.post('/api/focus-rooms/sessions/start', {
                                      roomId: selectedRoom.id,
                                      roomName: selectedRoom.name,
                                      timerOption: option.toString(),
                                      audioSource: audioProvider,
                                    });
                                    setCurrentSessionId(sessionResponse.data.sessionId);
                                    setSessionStartTime(Date.now());
                                  } catch (error) {
                                    console.error('Error restarting session:', error);
                                  }
                                }
                              }
                            } else {
                              if (option === '∞') {
                                setTimeRemaining(null);
                              } else {
                                setTimeRemaining(option * 60);
                              }
                            }
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg font-semibold transition-all text-xs
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
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-teal-600" />
                      <span className="text-sm font-semibold text-gray-700">Volume</span>
                      <span className="text-sm font-semibold text-teal-600 ml-auto">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const newMuted = !isMuted;
                          setIsMuted(newMuted);
                          setVolume(newMuted ? 0 : volume || 0.7);
                          
                          if (audioProvider === 'spotify' && isPlaying) {
                            try {
                              await api.post('/api/spotify/volume', {
                                volumePercent: newMuted ? 0 : Math.round(volume * 100),
                              });
                            } catch (error) {
                              console.error('Error muting Spotify:', error);
                            }
                          } else if (audioProvider === 'apple-music' && isPlaying) {
                            if (typeof window !== 'undefined' && (window as any).MusicKit) {
                              try {
                                const musicKit = (window as any).MusicKit.getInstance();
                                musicKit.volume = newMuted ? 0 : volume;
                              } catch (error) {
                                console.error('Error setting Apple Music volume:', error);
                              }
                            }
                          } else if (audioProvider === 'meetcute') {
                            window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                              detail: { volume: newMuted ? 0 : volume }
                            }));
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-all flex-shrink-0"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={async (e) => {
                          e.stopPropagation();
                          const newVolume = parseFloat(e.target.value);
                          setVolume(newVolume);
                          setIsMuted(newVolume === 0);
                          
                          if (audioProvider === 'spotify' && isPlaying) {
                            try {
                              await api.post('/api/spotify/volume', {
                                volumePercent: Math.round(newVolume * 100),
                              });
                            } catch (error) {
                              console.error('Error setting Spotify volume:', error);
                            }
                          } else if (audioProvider === 'apple-music' && isPlaying) {
                            if (typeof window !== 'undefined' && (window as any).MusicKit) {
                              try {
                                const musicKit = (window as any).MusicKit.getInstance();
                                musicKit.volume = newVolume;
                              } catch (error) {
                                console.error('Error setting Apple Music volume:', error);
                              }
                            }
                          } else if (audioProvider === 'meetcute') {
                            window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                              detail: { volume: newVolume }
                            }));
                          }
                        }}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                    </div>
                  </div>
                </motion.div>
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
                {(audioProvider === 'spotify' || audioProvider === 'apple-music') && (
                  <button
                    onClick={async () => {
                      if (audioProvider === 'spotify') {
                        try {
                          await api.post('/api/spotify/next');
                        } catch (error) {
                          console.error('Error skipping track:', error);
                        }
                      } else if (audioProvider === 'apple-music') {
                        if (typeof window !== 'undefined' && (window as any).MusicKit) {
                          try {
                            const musicKit = (window as any).MusicKit.getInstance();
                            await musicKit.skipToNextItem();
                          } catch (error) {
                            console.error('Error skipping Apple Music track:', error);
                          }
                        }
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-all"
                    title="Skip to next track"
                  >
                    <SkipForward className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>
      
      {/* Global Ambient Sound - For Meet-Cute audio */}
      <AmbientSound
        soundType="none"
        enabled={true}
        stopOnNavigation={false}
      />
    </div>
  );
}

