/**
 * Mind Garden - Sound Bowl Sanctuary
 * 
 * Interactive singing bowl meditation using Web Audio API.
 * Create harmonious, sustained tones for deep relaxation.
 * Each session adds +1 leaf to your growing plant!
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Sparkles, Check, Info } from 'lucide-react';

interface SoundBowlGameProps {
  onComplete: (credits: number, streak: number) => void;
  onExit: () => void;
}

// Bowl configurations with meditative frequencies
const BOWLS = [
  { id: 'bowl-1', name: 'Root', frequency: 256, color: '#DC2626', note: 'C4', size: 'large' },
  { id: 'bowl-2', name: 'Heart', frequency: 341.3, color: '#16A34A', note: 'F4', size: 'medium' },
  { id: 'bowl-3', name: 'Throat', frequency: 384, color: '#2563EB', note: 'G4', size: 'medium' },
  { id: 'bowl-4', name: 'Crown', frequency: 512, color: '#7C3AED', note: 'C5', size: 'small' },
  { id: 'bowl-5', name: 'Om', frequency: 432, color: '#D97706', note: 'A4', size: 'medium' },
];

export default function SoundBowlGame({ onComplete, onExit }: SoundBowlGameProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'complete'>('intro');
  const [activeBowls, setActiveBowls] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [score, setScore] = useState(0);
  const [ripples, setRipples] = useState<{ id: string; bowlId: string; x: number; y: number }[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, { osc: OscillatorNode; gain: GainNode }>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  const playTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Create master gain
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = isMuted ? 0 : 0.3;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    
    // Resume if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [isMuted]);

  // Play a bowl
  const playBowl = useCallback((bowlId: string, frequency: number) => {
    initAudio();
    
    const ctx = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    // Stop existing oscillator for this bowl
    if (oscillatorsRef.current.has(bowlId)) {
      const existing = oscillatorsRef.current.get(bowlId)!;
      existing.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      setTimeout(() => {
        try {
          existing.osc.stop();
          existing.osc.disconnect();
          existing.gain.disconnect();
        } catch (e) {
          // Already stopped
        }
      }, 100);
      oscillatorsRef.current.delete(bowlId);
    }

    // Create oscillator with harmonics for rich sound
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Use sine wave for pure, meditative tone
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    // Create envelope for natural bowl sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.5); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 8); // Long decay
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start();
    osc.stop(ctx.currentTime + 8);
    
    oscillatorsRef.current.set(bowlId, { osc, gain: gainNode });

    // Add harmonics for richer sound
    const harmonic = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonic.type = 'sine';
    harmonic.frequency.value = frequency * 2; // Octave up
    harmonicGain.gain.setValueAtTime(0, ctx.currentTime);
    harmonicGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 6);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);
    harmonic.start();
    harmonic.stop(ctx.currentTime + 6);

    // Update active bowls
    setActiveBowls(prev => new Set([...prev, bowlId]));
    
    // Award points
    setScore(prev => prev + 2);

    // Clear from active after decay
    setTimeout(() => {
      setActiveBowls(prev => {
        const next = new Set(prev);
        next.delete(bowlId);
        return next;
      });
    }, 4000);
  }, [initAudio]);

  // Handle bowl click
  const handleBowlClick = useCallback((bowl: typeof BOWLS[0], event: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    // Add ripple effect
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const rippleId = `${bowl.id}-${Date.now()}`;
    setRipples(prev => [...prev, { id: rippleId, bowlId: bowl.id, x, y }]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 1000);
    
    playBowl(bowl.id, bowl.frequency);
  }, [gameState, playBowl]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = next ? 0 : 0.3;
      }
      return next;
    });
  }, []);

  // Track play time
  useEffect(() => {
    if (gameState === 'playing') {
      playTimeIntervalRef.current = setInterval(() => {
        setPlayTime(prev => {
          const next = prev + 1;
          // Complete after 2 minutes
          if (next >= 120) {
            setScore(s => s + 10); // Bonus for completing
            setGameState('complete');
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (playTimeIntervalRef.current) {
        clearInterval(playTimeIntervalRef.current);
      }
    };
  }, [gameState]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach(({ osc, gain }) => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          // Already stopped
        }
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleComplete = () => {
    onComplete(score, 1);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Intro screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20"
        >
          <div className="text-6xl mb-4">🔔</div>
          <h1 className="text-3xl font-bold text-white mb-2">Sound Bowl Sanctuary</h1>
          <p className="text-white/70 mb-6">
            Create harmonious soundscapes with Tibetan singing bowls. 
            Tap the bowls to produce sustained, healing tones.
          </p>

          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-white mb-2">How to Play</h3>
            <ul className="text-sm text-white/70 space-y-1 text-left">
              <li>• Tap any bowl to create a tone</li>
              <li>• Layer multiple bowls for rich harmonies</li>
              <li>• Complete a session to grow your plant</li>
              <li>• +1 leaf after 2 minutes of meditation 🍃</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 justify-center text-white/60 text-sm mb-6">
            <Info className="w-4 h-4" />
            <span>Best experienced with headphones</span>
          </div>

          <button
            onClick={() => {
              initAudio();
              setGameState('playing');
            }}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
          >
            Begin Meditation
          </button>

          <button
            onClick={onExit}
            className="mt-4 text-white/50 hover:text-white/70 transition-colors"
          >
            ← Back to Games
          </button>
        </motion.div>
      </div>
    );
  }

  // Complete screen
  if (gameState === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-6xl mb-4"
          >
            🙏
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Namaste</h1>
          <p className="text-white/70 mb-6">
            You've completed your sound meditation. Peace flows through your garden.
          </p>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6 border border-purple-500/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <span className="text-3xl font-bold text-white">+1</span>
            </div>
            <p className="text-sm text-white/60">Leaf Earned 🍃</p>
          </div>

          <div className="text-white/60 text-sm mb-6">
            Session Duration: {formatTime(playTime)}
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Claim Reward
          </button>
        </motion.div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Exit
          </button>

          <div className="flex items-center gap-4">
            <div className="text-white/60 text-sm">
              {formatTime(playTime)} / 2:00
            </div>
            
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{score}</span>
            </div>

            <button
              onClick={toggleMute}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white/60" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${(playTime / 120) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Instruction */}
      <div className="text-center mb-8">
        <p className="text-white/60 text-sm">Tap the bowls to create sounds • Layer for harmony</p>
      </div>

      {/* Bowls */}
      <div className="max-w-xl mx-auto">
        <div className="flex flex-wrap justify-center gap-6">
          {BOWLS.map((bowl) => {
            const isActive = activeBowls.has(bowl.id);
            const sizes = {
              large: 'w-32 h-32',
              medium: 'w-24 h-24',
              small: 'w-20 h-20',
            };
            
            return (
              <motion.button
                key={bowl.id}
                onClick={(e) => handleBowlClick(bowl, e)}
                className={`relative ${sizes[bowl.size as keyof typeof sizes]} rounded-full flex items-center justify-center transition-all overflow-hidden`}
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${bowl.color}90, ${bowl.color}40)`,
                  boxShadow: isActive
                    ? `0 0 40px ${bowl.color}80, 0 0 80px ${bowl.color}40`
                    : `0 0 20px ${bowl.color}30`,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: isActive ? [1, 1.02, 1] : 1,
                }}
                transition={{
                  scale: { repeat: isActive ? Infinity : 0, duration: 0.5 },
                }}
              >
                {/* Bowl inner gradient */}
                <div
                  className="absolute inset-2 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 40% 40%, ${bowl.color}20, transparent 70%)`,
                  }}
                />
                
                {/* Bowl rim highlight */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                  }}
                />
                
                {/* Bowl info */}
                <div className="relative z-10 text-center">
                  <div className="text-white font-bold text-lg">{bowl.note}</div>
                  <div className="text-white/60 text-xs">{bowl.name}</div>
                </div>

                {/* Ripple effects */}
                <AnimatePresence>
                  {ripples
                    .filter(r => r.bowlId === bowl.id)
                    .map(ripple => (
                      <motion.div
                        key={ripple.id}
                        className="absolute rounded-full border-2"
                        style={{
                          borderColor: bowl.color,
                          left: ripple.x,
                          top: ripple.y,
                          transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ width: 0, height: 0, opacity: 1 }}
                        animate={{ width: 150, height: 150, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    ))}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-white/50 text-sm">
            💡 Try combining the Root (C4) with Heart (F4) for a peaceful harmony
          </p>
        </div>
      </div>

      {/* Manual complete button */}
      <div className="max-w-md mx-auto mt-8 text-center">
        <button
          onClick={() => {
            setScore(s => s + 5);
            setGameState('complete');
          }}
          className="text-white/40 hover:text-white/60 text-sm transition-colors"
        >
          End session early
        </button>
      </div>
    </div>
  );
}

