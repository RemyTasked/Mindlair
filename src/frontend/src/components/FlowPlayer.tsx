/**
 * Mind Garden - Flow Player Component
 * 
 * A beautiful, immersive flow player for guided micro-interventions.
 * Features animated breathing indicators, step progress, Spotify integration,
 * and garden growth rewards with cross-promotion prompts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Pause, Play, SkipForward, Volume2, VolumeX, RotateCcw, Music, Leaf, Sparkles } from 'lucide-react';
import spotify from '../services/spotify';

// Types from shared (simplified for frontend)
interface FlowStep {
  id: string;
  type: 'intro' | 'breathing' | 'visualization' | 'body-scan' | 'affirmation' | 'movement' | 'journaling' | 'closing';
  duration: number;
  text: string;
  guidance?: string;
  animation?: 'breathe' | 'expand' | 'pulse' | 'fade' | 'none';
}

interface MicroFlow {
  id: string;
  name: string;
  shortName: string;
  description: string;
  duration: number;
  bestFor: string[];
  breathingPattern: 'box' | 'calming' | 'energizing' | 'cleansing' | 'extended-exhale';
  spotifyMood: string;
  gardenPlant?: string;
  steps: FlowStep[];
  benefits: string[];
  icon: string;
}

// Map flow types to plant names for display
const FLOW_PLANT_NAMES: Record<string, string> = {
  'pre-meeting-focus': 'a small daisy',
  'pre-presentation-power': 'a bold sunflower',
  'difficult-conversation-prep': 'resilient lavender',
  'quick-reset': 'quick-blooming chamomile',
  'post-meeting-decompress': 'calming evening primrose',
  'end-of-day-transition': 'a twilight moonflower',
  'morning-intention': 'a morning glory vine',
  'evening-wind-down': 'serene night jasmine',
  'weekend-wellness': 'a contemplative lotus',
  'deep-meditation': 'your meditation tree',
  'breathing': 'gentle bamboo',
  'body-scan': 'a peaceful lotus',
};

// Get flow completion count from localStorage
const getFlowCount = (): number => {
  try {
    return parseInt(localStorage.getItem('mindgarden_flow_count') || '0', 10);
  } catch {
    return 0;
  }
};

// Increment flow count
const incrementFlowCount = (): number => {
  const newCount = getFlowCount() + 1;
  try {
    localStorage.setItem('mindgarden_flow_count', newCount.toString());
  } catch {
    // Ignore storage errors
  }
  return newCount;
};

interface FlowPlayerProps {
  flow: MicroFlow;
  onComplete: (rating?: number, notes?: string) => void;
  onClose: () => void;
  spotifyEnabled?: boolean;
}

// Breathing timing patterns (aligned with spec)
const BREATHING_PATTERNS = {
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  calming: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },          // 4-7-8 breathing
  'extended-exhale': { inhale: 4, holdIn: 6, exhale: 8, holdOut: 0 }, // Calms nervous system
  energizing: { inhale: 4, holdIn: 2, exhale: 4, holdOut: 2 },
  cleansing: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
};

export default function FlowPlayer({ flow, onComplete, onClose, spotifyEnabled = false }: FlowPlayerProps) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [breathProgress, setBreathProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [flowCount, setFlowCount] = useState(0);
  const [showCrossPromo, setShowCrossPromo] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [showSpotifyPrompt, setShowSpotifyPrompt] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const stepStartTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>();
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStep = flow.steps[currentStepIndex];
  const totalSteps = flow.steps.length;
  const isBreathingStep = currentStep?.type === 'breathing';
  const breathTiming = BREATHING_PATTERNS[flow.breathingPattern];

  // Calculate total breath cycle duration
  const breathCycleDuration = breathTiming.inhale + breathTiming.holdIn + breathTiming.exhale + breathTiming.holdOut;

  // Speak guidance text
  const speakGuidance = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    // Try to use a calm voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Samantha') || 
      v.name.includes('Karen') || 
      v.name.includes('Google UK')
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isMuted]);

  // Handle step progression
  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepProgress(0);
      stepStartTimeRef.current = Date.now();
    } else {
      // Flow complete
      setIsPlaying(false);
      
      // Increment flow count and check if we should show cross-promotion
      const newCount = incrementFlowCount();
      setFlowCount(newCount);
      // Show cross-promo every 3rd flow
      setShowCrossPromo(newCount % 3 === 0);
      
      setShowCompletion(true);
    }
  }, [currentStepIndex, totalSteps]);

  // Skip to next step
  const skipStep = useCallback(() => {
    window.speechSynthesis.cancel();
    nextStep();
  }, [nextStep]);

  // Restart flow
  const restartFlow = useCallback(() => {
    window.speechSynthesis.cancel();
    setCurrentStepIndex(0);
    setStepProgress(0);
    setBreathPhase('inhale');
    setBreathProgress(0);
    setShowCompletion(false);
    setIsPlaying(true);
    stepStartTimeRef.current = Date.now();
    startTimeRef.current = Date.now();
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.pause();
    } else {
      window.speechSynthesis.resume();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!isMuted) {
      window.speechSynthesis.cancel();
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Main animation/progress loop
  useEffect(() => {
    if (!isPlaying || showCompletion) return;

    const animate = () => {

      if (!currentStep) return;

      // Update step progress
      const elapsed = (Date.now() - stepStartTimeRef.current) / 1000;
      const progress = Math.min(elapsed / currentStep.duration, 1);
      setStepProgress(progress);

      // Handle breathing phase updates
      if (isBreathingStep) {
        const cyclePosition = elapsed % breathCycleDuration;
        
        if (cyclePosition < breathTiming.inhale) {
          setBreathPhase('inhale');
          setBreathProgress(cyclePosition / breathTiming.inhale);
        } else if (cyclePosition < breathTiming.inhale + breathTiming.holdIn) {
          setBreathPhase('holdIn');
          setBreathProgress((cyclePosition - breathTiming.inhale) / breathTiming.holdIn);
        } else if (cyclePosition < breathTiming.inhale + breathTiming.holdIn + breathTiming.exhale) {
          setBreathPhase('exhale');
          setBreathProgress((cyclePosition - breathTiming.inhale - breathTiming.holdIn) / breathTiming.exhale);
        } else {
          setBreathPhase('holdOut');
          setBreathProgress((cyclePosition - breathTiming.inhale - breathTiming.holdIn - breathTiming.exhale) / breathTiming.holdOut);
        }
      }

      // Check if step is complete
      if (progress >= 1) {
        nextStep();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, showCompletion, currentStep, isBreathingStep, breathCycleDuration, breathTiming, nextStep]);

  // Speak guidance when step changes
  useEffect(() => {
    if (currentStep?.guidance && isPlaying && !showCompletion) {
      speakGuidance(currentStep.guidance);
    }
  }, [currentStepIndex, isPlaying, showCompletion, speakGuidance, currentStep?.guidance]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Initialize Spotify if enabled
  useEffect(() => {
    if (!spotifyEnabled) return;

    const initSpotify = async () => {
      try {
        const status = await spotify.getConnectionStatus();
        setSpotifyConnected(status.connected);
        
        if (status.connected) {
          // Check if user wants to play music (stored preference)
          const playMusicPref = localStorage.getItem('mindgarden_spotify_autoplay');
          if (playMusicPref === 'true') {
            await startSpotifyMusic();
          } else if (playMusicPref === null) {
            // First time - show prompt
            setShowSpotifyPrompt(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize Spotify:', error);
      }
    };

    initSpotify();
  }, [spotifyEnabled, flow.id]);

  // Duck Spotify volume when speaking
  useEffect(() => {
    if (!spotifyConnected || !spotifyPlaying) return;

    if (currentStep?.guidance && !isMuted) {
      spotify.duckVolume();
    } else {
      spotify.restoreVolume();
    }
  }, [currentStep?.guidance, isMuted, spotifyConnected, spotifyPlaying]);

  // Start Spotify music
  const startSpotifyMusic = async () => {
    try {
      await spotify.playFlowMusic(flow.id);
      setSpotifyPlaying(true);
    } catch (error) {
      console.error('Failed to start Spotify music:', error);
    }
  };

  // Handle Spotify prompt response
  const handleSpotifyPrompt = async (play: boolean, remember: boolean) => {
    setShowSpotifyPrompt(false);
    
    if (remember) {
      localStorage.setItem('mindgarden_spotify_autoplay', play.toString());
    }
    
    if (play) {
      await startSpotifyMusic();
    }
  };

  // Handle completion submit
  const handleComplete = () => {
    // Stop Spotify music if playing
    if (spotifyPlaying) {
      spotify.pause();
      setSpotifyPlaying(false);
    }
    onComplete(rating ?? undefined, notes || undefined);
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalElapsed = (Date.now() - startTimeRef.current) / 1000;
  const totalRemaining = Math.max(0, flow.duration - totalElapsed);

  // Breathing circle animation
  const getBreathScale = () => {
    if (!isBreathingStep) return 1;
    
    switch (breathPhase) {
      case 'inhale':
        return 1 + breathProgress * 0.3;
      case 'holdIn':
        return 1.3;
      case 'exhale':
        return 1.3 - breathProgress * 0.3;
      case 'holdOut':
        return 1;
      default:
        return 1;
    }
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Breathe In';
      case 'holdIn': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'holdOut': return breathTiming.holdOut > 0 ? 'Hold' : 'Breathe In';
    }
  };

  // Get plant name for this flow
  const plantName = FLOW_PLANT_NAMES[flow.id] || 'a new plant';

  // Handle navigation to garden
  const goToGarden = () => {
    handleComplete();
    navigate('/garden');
  };

  // Spotify prompt modal
  if (showSpotifyPrompt) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Music className="w-10 h-10 text-green-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-emerald-300 mb-2">Play Music?</h2>
          <p className="text-emerald-100/70 mb-6">
            Would you like to play calming music during this flow?
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleSpotifyPrompt(true, false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-400 hover:to-emerald-400 transition-colors font-medium"
            >
              Yes, Play Music
            </button>
            <button
              onClick={() => handleSpotifyPrompt(false, false)}
              className="w-full px-6 py-3 bg-emerald-900/30 text-emerald-300 rounded-xl hover:bg-emerald-800/50 transition-colors"
            >
              No, Just Guidance
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-emerald-800/30">
            <label className="flex items-center justify-center gap-2 text-sm text-emerald-400 cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    handleSpotifyPrompt(true, true);
                  }
                }}
                className="rounded border-emerald-600 bg-emerald-900/30 text-green-500 focus:ring-green-500"
              />
              Remember my preference
            </label>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (showCompletion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md text-center"
        >
          {/* Garden Growth Animation */}
          <motion.div
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative w-32 h-32 mx-auto mb-6"
          >
            {/* Soil */}
            <motion.div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-amber-900/60 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            />
            {/* Plant growing animation */}
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2"
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
            >
              <Leaf className="w-16 h-16 text-emerald-400" />
            </motion.div>
            {/* Sparkles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 40}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.6 }}
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </motion.div>
            ))}
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1.5 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
          </motion.div>

          {/* Completion Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-emerald-300 mb-2">Flow Complete!</h2>
            <p className="text-emerald-100/70 mb-2">Your garden grew 🌱</p>
            <p className="text-emerald-400/80 text-sm mb-6">You planted {plantName}</p>
          </motion.div>

          {/* Cross-promotion prompt (shown every 3rd flow) */}
          {showCrossPromo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mb-6 p-4 bg-emerald-900/30 border border-emerald-700/30 rounded-xl"
            >
              <p className="text-emerald-200 font-medium mb-1">
                🎉 {flowCount} flows completed!
              </p>
              <p className="text-emerald-300/70 text-sm">
                Your garden is growing beautifully. Check it out!
              </p>
            </motion.div>
          )}

          {/* Rating */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <p className="text-sm text-emerald-200/60 mb-3">How do you feel?</p>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={`w-12 h-12 rounded-full transition-all ${
                    rating === value
                      ? 'bg-emerald-500 text-white scale-110'
                      : 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/50'
                  }`}
                >
                  {value === 1 ? '😔' : value === 2 ? '😐' : value === 3 ? '🙂' : value === 4 ? '😊' : '🌟'}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Optional Note */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any thoughts? (optional)"
              className="w-full px-4 py-3 bg-emerald-900/20 border border-emerald-800/30 rounded-xl text-emerald-100 placeholder-emerald-500/50 focus:outline-none focus:border-emerald-500/50 resize-none"
              rows={2}
            />
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            {/* View Garden button - prominent when cross-promo is shown */}
            {showCrossPromo && (
              <button
                onClick={goToGarden}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Leaf className="w-5 h-5" />
                View My Garden
              </button>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={restartFlow}
                className="flex-1 px-6 py-3 bg-emerald-900/30 text-emerald-300 rounded-xl hover:bg-emerald-800/50 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Repeat
              </button>
              <button
                onClick={handleComplete}
                className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                  showCrossPromo
                    ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/50'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
                }`}
              >
                {showCrossPromo ? 'Close' : 'Done'}
              </button>
            </div>
            
            {/* Subtle garden link when cross-promo not shown */}
            {!showCrossPromo && (
              <button
                onClick={goToGarden}
                className="w-full text-emerald-400/70 hover:text-emerald-300 text-sm transition-colors flex items-center justify-center gap-1"
              >
                <Leaf className="w-4 h-4" />
                View my garden
              </button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-area-top">
        <button
          onClick={onClose}
          className="p-2 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-lg hover:bg-emerald-900/30"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-emerald-200">{flow.name}</h2>
          <p className="text-sm text-emerald-400/60">{formatTime(totalRemaining)} remaining</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-lg hover:bg-emerald-900/30"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {spotifyEnabled && (
            <button className="p-2 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-lg hover:bg-emerald-900/30">
              <Music className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Step Progress Dots */}
      <div className="flex justify-center gap-2 px-4 mb-4">
        {flow.steps.map((step, index) => (
          <div
            key={step.id}
            className={`h-1.5 rounded-full transition-all ${
              index < currentStepIndex
                ? 'bg-emerald-400 w-8'
                : index === currentStepIndex
                ? 'bg-emerald-500 w-12'
                : 'bg-emerald-900/50 w-8'
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center w-full max-w-md"
          >
            {/* Breathing Animation */}
            {isBreathingStep && (
              <motion.div
                className="w-48 h-48 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-500/30 border-2 border-emerald-400/50 flex items-center justify-center"
                animate={{ scale: getBreathScale() }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <div className="text-center">
                  <p className="text-2xl font-medium text-emerald-200">{getBreathInstruction()}</p>
                </div>
              </motion.div>
            )}

            {/* Step Type Icon */}
            {!isBreathingStep && (
              <motion.div
                className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)`,
                }}
                animate={
                  currentStep?.animation === 'pulse'
                    ? { scale: [1, 1.05, 1] }
                    : currentStep?.animation === 'expand'
                    ? { scale: [0.95, 1.1, 1] }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-6xl">{flow.icon}</span>
              </motion.div>
            )}

            {/* Step Text */}
            <h3 className="text-2xl font-semibold text-emerald-100 mb-4">{currentStep?.text}</h3>
            
            {currentStep?.guidance && (
              <p className="text-lg text-emerald-300/80 leading-relaxed">{currentStep.guidance}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step Progress Bar */}
      <div className="px-6 mb-4">
        <div className="h-1 bg-emerald-900/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
            style={{ width: `${stepProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 pb-8 safe-area-bottom">
        <button
          onClick={restartFlow}
          className="p-3 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-full hover:bg-emerald-900/30"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400 transition-all active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-1" />
          )}
        </button>

        <button
          onClick={skipStep}
          className="p-3 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-full hover:bg-emerald-900/30"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>
    </motion.div>
  );
}

