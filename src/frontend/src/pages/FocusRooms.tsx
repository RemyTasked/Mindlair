import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, Waves, CloudRain, TreePine, Wind, Coffee, Moon } from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';

// ============================================================================
// AMBIENT SOUND DEFINITIONS - 6 Simple Sounds
// ============================================================================

interface AmbientSound {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    description: 'Calming waves for relaxation',
    icon: <Waves className="w-8 h-8" />,
    color: 'text-blue-500',
    bgColor: 'bg-gradient-to-br from-blue-100 to-cyan-100',
  },
  {
    id: 'gentle-rain',
    name: 'Gentle Rain',
    description: 'Soft rain for focus',
    icon: <CloudRain className="w-8 h-8" />,
    color: 'text-slate-500',
    bgColor: 'bg-gradient-to-br from-slate-100 to-gray-100',
  },
  {
    id: 'forest',
    name: 'Forest Ambience',
    description: 'Birds and rustling leaves',
    icon: <TreePine className="w-8 h-8" />,
    color: 'text-green-600',
    bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
  },
  {
    id: 'wind',
    name: 'Soft Wind',
    description: 'Gentle breeze sounds',
    icon: <Wind className="w-8 h-8" />,
    color: 'text-sky-500',
    bgColor: 'bg-gradient-to-br from-sky-100 to-blue-100',
  },
  {
    id: 'cafe',
    name: 'Café Ambience',
    description: 'Coffee shop background',
    icon: <Coffee className="w-8 h-8" />,
    color: 'text-amber-600',
    bgColor: 'bg-gradient-to-br from-amber-100 to-orange-100',
  },
  {
    id: 'night',
    name: 'Night Sounds',
    description: 'Crickets and peaceful night',
    icon: <Moon className="w-8 h-8" />,
    color: 'text-indigo-500',
    bgColor: 'bg-gradient-to-br from-indigo-100 to-purple-100',
  },
];

// ============================================================================
// AUDIO GENERATION - Simple procedural sounds
// ============================================================================

const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 30; // 30 second loops

function generateAudioBuffer(soundId: string): Float32Array {
  const length = SAMPLE_RATE * DURATION_SECONDS;
  const data = new Float32Array(length);

  switch (soundId) {
    case 'ocean-waves': {
      // Smooth ocean waves with gentle swells
      let prevNoise = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Wave motion at different frequencies
        const wave1 = Math.sin(2 * Math.PI * 0.08 * t) * 0.3;
        const wave2 = Math.sin(2 * Math.PI * 0.12 * t + 0.5) * 0.2;
        // Filtered noise for water texture
        const noise = Math.random() * 2 - 1;
        prevNoise += 0.02 * (noise - prevNoise);
        data[i] = (wave1 + wave2) * 0.4 + prevNoise * 0.3;
      }
      break;
    }
    case 'gentle-rain': {
      // Soft rain without harsh drops
      let prev1 = 0, prev2 = 0;
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1;
        prev1 += 0.01 * (noise - prev1);
        prev2 += 0.03 * (prev1 - prev2);
        data[i] = prev2 * 0.4;
      }
      break;
    }
    case 'forest': {
      // Birds and gentle wind
      let windNoise = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Gentle wind base
        const noise = Math.random() * 2 - 1;
        windNoise += 0.02 * (noise - windNoise);
        // Occasional bird chirps
        const bird1 = (t % 7 < 0.2) ? Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-10 * (t % 7)) * 0.15 : 0;
        const bird2 = ((t + 3) % 11 < 0.15) ? Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-12 * ((t + 3) % 11)) * 0.1 : 0;
        data[i] = windNoise * 0.3 + bird1 + bird2;
      }
      break;
    }
    case 'wind': {
      // Soft, flowing wind
      let prev1 = 0, prev2 = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const noise = Math.random() * 2 - 1;
        prev1 += 0.008 * (noise - prev1);
        prev2 += 0.02 * (prev1 - prev2);
        // Slow modulation for gusts
        const gust = 1 + Math.sin(2 * Math.PI * 0.1 * t) * 0.3;
        data[i] = prev2 * 0.35 * gust;
      }
      break;
    }
    case 'cafe': {
      // Coffee shop ambient murmur
      let prev1 = 0, prev2 = 0;
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const noise = Math.random() * 2 - 1;
        prev1 += 0.03 * (noise - prev1);
        prev2 += 0.05 * (prev1 - prev2);
        // Subtle low frequency murmur
        const murmur = Math.sin(2 * Math.PI * 150 * t) * 0.05;
        data[i] = prev2 * 0.25 + murmur;
      }
      break;
    }
    case 'night': {
      // Crickets and peaceful night
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        // Cricket chirps (high frequency, rhythmic)
        const cricketPhase = (t * 15) % 1;
        const cricket = cricketPhase < 0.3 ? Math.sin(2 * Math.PI * 4000 * t) * 0.08 * (1 - cricketPhase / 0.3) : 0;
        // Soft ambient noise
        const ambient = (Math.random() * 2 - 1) * 0.02;
        // Deep night atmosphere
        const deep = Math.sin(2 * Math.PI * 60 * t) * 0.03;
        data[i] = cricket + ambient + deep;
      }
      break;
    }
    default:
      data.fill(0);
  }

  // Smooth fade in/out to prevent clicks
  const fadeSamples = SAMPLE_RATE * 0.5;
  for (let i = 0; i < fadeSamples; i++) {
    const fade = i / fadeSamples;
    data[i] *= fade * fade;
    data[length - 1 - i] *= fade * fade;
  }

  return data;
}

function createAudioDataUrl(soundId: string): string {
  const samples = generateAudioBuffer(soundId);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Convert samples to 16-bit PCM
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

// ============================================================================
// FOCUS ROOMS COMPONENT
// ============================================================================

type TimerOption = 5 | 10 | 20 | 30;

export default function FocusRooms() {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [timer, setTimer] = useState<TimerOption>(20);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || !isPlaying) return;
    
    if (timeRemaining <= 0) {
      stopAudio();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPlaying]);

  // Stop when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && isPlaying) {
      stopAudio();
    }
  }, [timeRemaining, isPlaying]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setActiveSound(null);
    setTimeRemaining(null);
  }, []);

  const startAudio = useCallback((soundId: string) => {
    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Generate audio URL
    const audioUrl = createAudioDataUrl(soundId);
    audioUrlRef.current = audioUrl;

    // Create and play audio
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    
    audio.play().catch((err) => {
      console.warn('Audio playback failed:', err);
    });

    audioRef.current = audio;
    setIsPlaying(true);
    setActiveSound(soundId);
    setTimeRemaining(timer * 60);
  }, [volume, isMuted, timer]);

  const toggleSound = useCallback((soundId: string) => {
    if (activeSound === soundId && isPlaying) {
      stopAudio();
    } else {
      startAudio(soundId);
    }
  }, [activeSound, isPlaying, startAudio, stopAudio]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !activeSound) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
  }, [isPlaying, activeSound]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout activeSection="sounds">
      <div className="p-4 md:p-8 pb-32 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--mg-text-primary)] mb-3">
            🎧 Ambient Sounds
          </h1>
          <p className="text-[var(--mg-text-secondary)] text-lg">
            Choose a sound to help you focus, relax, or unwind.
          </p>
        </div>

        {/* Sound Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {AMBIENT_SOUNDS.map((sound, index) => (
            <motion.button
              key={sound.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleSound(sound.id)}
              className={`
                relative p-6 rounded-2xl text-left transition-all duration-300
                ${sound.bgColor}
                ${activeSound === sound.id 
                  ? 'ring-4 ring-[var(--mg-accent)] shadow-xl scale-[1.02]' 
                  : 'hover:shadow-lg hover:scale-[1.01]'
                }
              `}
            >
              {/* Playing indicator */}
              {activeSound === sound.id && isPlaying && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 bg-[var(--mg-accent)] rounded-full animate-pulse" />
                </div>
              )}

              <div className={`${sound.color} mb-4`}>
                {sound.icon}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {sound.name}
              </h3>
              <p className="text-sm text-gray-600">
                {sound.description}
              </p>

              {/* Play/Pause overlay for active sound */}
              {activeSound === sound.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl">
                  <div className={`p-3 rounded-full bg-white shadow-lg ${sound.color}`}>
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </div>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Controls - Only show when a sound is active */}
        {activeSound && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mg-card p-6 space-y-6"
          >
            {/* Now Playing */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${AMBIENT_SOUNDS.find(s => s.id === activeSound)?.bgColor}`}>
                  {AMBIENT_SOUNDS.find(s => s.id === activeSound)?.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--mg-text-primary)]">
                    Now Playing
                  </h3>
                  <p className="text-sm text-[var(--mg-text-secondary)]">
                    {AMBIENT_SOUNDS.find(s => s.id === activeSound)?.name}
                  </p>
                </div>
              </div>

              {/* Timer display */}
              {timeRemaining !== null && (
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-[var(--mg-text-primary)]">
                    {formatTime(timeRemaining)}
                  </p>
                  <p className="text-xs text-[var(--mg-text-muted)]">remaining</p>
                </div>
              )}
            </div>

            {/* Timer Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[var(--mg-text-muted)]" />
                <span className="text-sm font-medium text-[var(--mg-text-secondary)]">Timer</span>
              </div>
              <div className="flex gap-2">
                {([5, 10, 20, 30] as TimerOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setTimer(option);
                      if (isPlaying) {
                        setTimeRemaining(option * 60);
                      }
                    }}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all text-sm
                      ${timer === option
                        ? 'bg-[var(--mg-accent)] text-white'
                        : 'bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-bg-secondary)]'
                      }
                    `}
                  >
                    {option}m
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Control */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-[var(--mg-text-muted)]" />
                <span className="text-sm font-medium text-[var(--mg-text-secondary)]">
                  Volume: {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-bg-secondary)] transition-all"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    setIsMuted(newVolume === 0);
                  }}
                  className="flex-1 h-2 bg-[var(--mg-bg-primary)] rounded-lg appearance-none cursor-pointer accent-[var(--mg-accent)]"
                />
              </div>
            </div>

            {/* Play/Pause and Stop */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={togglePlayPause}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--mg-accent)] text-white font-semibold hover:bg-[var(--mg-accent-dark)] transition-all"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 ml-0.5" />
                    Resume
                  </>
                )}
              </button>
              <button
                onClick={stopAudio}
                className="px-6 py-3 rounded-xl bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] font-semibold hover:bg-[var(--mg-bg-secondary)] transition-all"
              >
                Stop
              </button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!activeSound && (
          <div className="text-center py-8 text-[var(--mg-text-muted)]">
            <p>Tap a sound above to start playing</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
