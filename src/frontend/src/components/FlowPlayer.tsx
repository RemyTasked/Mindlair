/**
 * Mind Garden - Flow Player Component
 * 
 * A beautiful, immersive flow player for guided micro-interventions.
 * Features animated breathing indicators, step progress, ambient sounds with fade,
 * and garden growth rewards with cross-promotion prompts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Pause, Play, SkipForward, Volume2, VolumeX, RotateCcw, Leaf, Sparkles } from 'lucide-react';

// Ambient sound URLs for flow background
const AMBIENT_SOUNDS: Record<string, string> = {
  calm: 'https://cdn.freesound.org/previews/531/531947_6183164-lq.mp3', // Gentle rain
  focus: 'https://cdn.freesound.org/previews/463/463903_9497060-lq.mp3', // Soft ambient
  energize: 'https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3', // Uplifting tone
};

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
  autostart?: boolean;
}

// Breathing timing patterns - SLOWED DOWN for meditative experience
const BREATHING_PATTERNS = {
  box: { inhale: 6, holdIn: 6, exhale: 6, holdOut: 6 },                  // Increased from 4s to 6s
  calming: { inhale: 5, holdIn: 8, exhale: 10, holdOut: 0 },             // 5-8-10 breathing (slowed)
  'extended-exhale': { inhale: 5, holdIn: 7, exhale: 10, holdOut: 0 },   // Calms nervous system
  energizing: { inhale: 5, holdIn: 3, exhale: 5, holdOut: 3 },           // Increased from 4s
  cleansing: { inhale: 5, holdIn: 0, exhale: 8, holdOut: 0 },            // Increased from 4s/6s
};

export default function FlowPlayer({ flow, onComplete, onClose, autostart = false }: FlowPlayerProps) {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autostart);
  const [isMuted, setIsMuted] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [breathProgress, setBreathProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [flowCount, setFlowCount] = useState(0);
  const [showCrossPromo, setShowCrossPromo] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const stepStartTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>();
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentStep = flow.steps[currentStepIndex];
  const totalSteps = flow.steps.length;
  const isBreathingStep = currentStep?.type === 'breathing';
  const breathTiming = BREATHING_PATTERNS[flow.breathingPattern];

  // Calculate total breath cycle duration
  const breathCycleDuration = breathTiming.inhale + breathTiming.holdIn + breathTiming.exhale + breathTiming.holdOut;

  // Get ambient sound type based on flow
  const getAmbientSoundType = useCallback((flowId: string): keyof typeof AMBIENT_SOUNDS => {
    if (flowId.includes('morning') || flowId.includes('energiz') || flowId.includes('presentation')) return 'energize';
    if (flowId.includes('focus') || flowId.includes('meeting') || flowId.includes('reset')) return 'focus';
    return 'calm';
  }, []);

  // Start ambient background sound
  const startAmbientSound = useCallback(() => {
    if (ambientAudioRef.current) return; // Already playing
    
    const soundType = getAmbientSoundType(flow.id);
    const audio = new Audio(AMBIENT_SOUNDS[soundType]);
    audio.loop = true;
    audio.volume = 0.3; // Quiet background level
    
    audio.play().catch(err => {
      console.warn('Ambient audio blocked:', err);
    });
    
    ambientAudioRef.current = audio;
  }, [flow.id, getAmbientSoundType]);

  // Stop ambient sound
  const stopAmbientSound = useCallback(() => {
    if (ambientAudioRef.current) {
      // Fade out over 1 second
      const audio = ambientAudioRef.current;
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.02) {
          audio.volume = Math.max(0, audio.volume - 0.02);
        } else {
          clearInterval(fadeOut);
          audio.pause();
          audio.currentTime = 0;
          ambientAudioRef.current = null;
        }
      }, 50);
    }
  }, []);

  // Duck ambient volume when speaking
  const duckAmbientVolume = useCallback((duck: boolean) => {
    if (ambientAudioRef.current) {
      const targetVolume = duck ? 0.08 : 0.3; // Very quiet during speech, louder after
      const audio = ambientAudioRef.current;
      const step = duck ? -0.02 : 0.02;
      const fadeDuration = duck ? 300 : 800; // Faster fade down, slower fade up
      const stepTime = fadeDuration / Math.abs((targetVolume - audio.volume) / 0.02);
      
      const fadeInterval = setInterval(() => {
        const newVolume = audio.volume + step;
        if ((duck && newVolume <= targetVolume) || (!duck && newVolume >= targetVolume)) {
          audio.volume = targetVolume;
          clearInterval(fadeInterval);
        } else {
          audio.volume = newVolume;
        }
      }, stepTime);
    }
  }, []);

  // Speak guidance text - VERY SLOW pacing for meditative delivery
  const speakGuidance = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    
    // Duck ambient sound while speaking
    duckAmbientVolume(true);
    
    // Add natural pauses - more generous spacing for meditative feel
    // Split into sentences and speak with pauses between
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    
    let sentenceIndex = 0;
    
    const speakNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        // Done speaking - restore ambient volume after a pause
        setTimeout(() => {
          duckAmbientVolume(false);
        }, 1000);
        return;
      }
      
      const sentence = sentences[sentenceIndex];
      const utterance = new SpeechSynthesisUtterance(sentence);
      
      // VERY slow, meditative settings - slowed down further
      utterance.rate = 0.55;      // Even slower for calm, deliberate delivery
      utterance.pitch = 0.85;     // Lower pitch sounds warmer and calmer
      utterance.volume = 0.8;     // Clear but not overwhelming
      
      // Try to find the best available voice for meditation/wellness
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order of preferred voices (tested to sound most natural)
      const voicePreferences = [
        // macOS voices (high quality)
        'Samantha',           // macOS - female, warm
        'Karen',              // macOS - Australian, calm
        'Moira',              // macOS - Irish, soothing
        'Daniel',             // macOS - British, calm
        // Windows voices
        'Microsoft Zira',     // Windows - female, neutral
        'Microsoft David',    // Windows - male, calm
        // Google voices
        'Google UK English Female',
        'Google UK English Male',
        // Generic fallbacks
        'Female',
        'en-US',
        'en-GB',
      ];
      
      let selectedVoice = voices[0];
      for (const pref of voicePreferences) {
        const match = voices.find(v => 
          v.name.toLowerCase().includes(pref.toLowerCase())
        );
        if (match) {
          selectedVoice = match;
          break;
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => {
        sentenceIndex++;
        // LONGER pause between sentences for meditative feel (2.5 seconds)
        setTimeout(speakNextSentence, 2500);
      };
      
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };
    
    speakNextSentence();
  }, [isMuted, duckAmbientVolume]);

  // Handle step progression
  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepProgress(0);
      stepStartTimeRef.current = Date.now();
    } else {
      // Flow complete
      setIsPlaying(false);
      stopAmbientSound();
      
      // Increment flow count and check if we should show cross-promotion
      const newCount = incrementFlowCount();
      setFlowCount(newCount);
      // Show cross-promo every 3rd flow
      setShowCrossPromo(newCount % 3 === 0);
      
      setShowCompletion(true);
    }
  }, [currentStepIndex, totalSteps, stopAmbientSound]);

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
    // Restart ambient sound
    if (!ambientAudioRef.current) {
      startAmbientSound();
    }
  }, [startAmbientSound]);

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

  // Start ambient sound when flow begins
  useEffect(() => {
    // Start ambient sound after a short delay to allow user gesture
    const timer = setTimeout(() => {
      if (isPlaying && !showCompletion) {
        startAmbientSound();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isPlaying, showCompletion, startAmbientSound]);

  // Cleanup speech synthesis and ambient audio on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
        ambientAudioRef.current = null;
      }
    };
  }, []);

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
    navigate('/dashboard');
  };

  // Handle completion submit
  const handleComplete = () => {
    stopAmbientSound();
    onComplete(rating ?? undefined, notes || undefined);
  };

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

        <button
          onClick={toggleMute}
          className="p-2 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-lg hover:bg-emerald-900/30"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
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
          onClick={toggleMute}
          className="p-3 text-emerald-300/60 hover:text-emerald-300 transition-colors rounded-full hover:bg-emerald-900/30"
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>

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
