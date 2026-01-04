import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Headphones, Sparkles, Heart, Zap, Moon } from 'lucide-react';
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
  soundType: 'lofi-deep-focus' | 'lofi-soft-composure' | 'lofi-warm-connection' | 'lofi-pitch-pulse' | 'lofi-recovery-lounge' | 'lofi-focus' | 'lofi-chill' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm' | 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise';
}

const FOCUS_ROOMS: FocusRoom[] = [
  {
    id: 'deep-focus',
    name: 'Deep Focus Room',
    description: 'Clarity & momentum',
    icon: <Headphones className="w-8 h-8" />,
    gradient: 'from-sky-600 to-cyan-600',
    bgGradient: 'from-sky-50 to-cyan-50',
    soundType: 'lofi-deep-focus',
  },
  {
    id: 'soft-composure',
    name: 'Soft Composure Room',
    description: 'Calm nervous system',
    icon: <Heart className="w-8 h-8" />,
    gradient: 'from-teal-600 to-cyan-600',
    bgGradient: 'from-teal-50 to-cyan-50',
    soundType: 'lofi-soft-composure',
  },
  {
    id: 'warm-connection',
    name: 'Warm Connection Room',
    description: 'Empathy for 1:1s',
    icon: <Sparkles className="w-8 h-8" />,
    gradient: 'from-pink-600 to-rose-600',
    bgGradient: 'from-pink-50 to-rose-50',
    soundType: 'lofi-warm-connection',
  },
  {
    id: 'pitch-pulse',
    name: 'Pitch Pulse Room',
    description: 'Confidence boost',
    icon: <Zap className="w-8 h-8" />,
    gradient: 'from-yellow-600 to-orange-600',
    bgGradient: 'from-yellow-50 to-orange-50',
    soundType: 'lofi-pitch-pulse',
  },
  {
    id: 'recovery-lounge',
    name: 'Recovery Lounge',
    description: 'Decompress after tough scenes',
    icon: <Moon className="w-8 h-8" />,
    gradient: 'from-slate-600 to-slate-700',
    bgGradient: 'from-slate-50 to-gray-50',
    soundType: 'lofi-recovery-lounge',
  },
];

type TimerOption = 5 | 10 | 20 | '∞';

export default function FocusRooms() {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState<TimerOption>(20);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState(0);
  const [activeTab, setActiveTab] = useState<'focus-rooms' | 'ambient-library'>('focus-rooms');

  // Stop any ambient sound from Scene Library when entering Focus Rooms page
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'focus-rooms-mount', fadeOut: true },
    }));
  }, []);

  // Load credits on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const statsResponse = await api.get('/api/focus-rooms/stats').catch(() => ({ data: { totalCredits: 0 } }));
        setTotalCredits(statsResponse.data.totalCredits || 0);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
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
    
    // Fade out and stop audio
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'focus-rooms', fadeOut: true }
    }));
    
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

  // Stop any ambient sound before starting a new one
  const stopAmbientIfAny = () => {
    window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
      detail: { source: 'focus-rooms-start', fadeOut: true },
    }));
  };

  const handleRoomSelect = async (room: FocusRoom) => {
    // Stop all audio first
    stopAmbientIfAny();
    
    if (activeRoom === room.id) {
      // Closing the room
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
      // Opening a new room
      try {
        const sessionResponse = await api.post('/api/focus-rooms/sessions/start', {
          roomId: room.id,
          roomName: room.name,
          timerOption: timer.toString(),
          audioSource: 'meetcute',
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

  const startMindGardenAudio = (room: FocusRoom) => {
    console.log('🎵 Starting Mind Garden audio for room:', { roomId: room.id, soundType: room.soundType });
    
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
          soundType: room.soundType
        }
      }));
    }, 150);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout activeSection="sounds">
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

        {/* Tabs */}
        <div className="mg-card overflow-hidden mb-6">
          <div className="flex border-b border-[var(--mg-border)]">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ambient-sound-stop', {
                  detail: { source: 'focus-rooms-tab-switch', fadeOut: true }
                }));
                
                if (activeRoom) {
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
                        
                        {/* Audio Badge */}
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                            Mind Garden Audio
                          </span>
                        </div>

                        {/* Controls when active */}
                        {activeRoom === room.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-gray-300 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                                        setIsPlaying(false);
                                      } else {
                                        // Play
                                        stopAmbientIfAny();
                                        startMindGardenAudio(room);
                                        setIsPlaying(true);
                                      }
                                    }}
                                    className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-center hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md"
                                  >
                                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newMuted = !isMuted;
                                    setIsMuted(newMuted);
                                    
                                    window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                                      detail: { volume: newMuted ? 0 : volume }
                                    }));
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
                                    
                                    window.dispatchEvent(new CustomEvent('ambient-sound-volume', {
                                      detail: { volume: newVolume }
                                    }));
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
