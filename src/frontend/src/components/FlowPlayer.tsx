/**
 * Mind Garden - Flow Player Component
 * 
 * A beautiful, immersive flow player for guided micro-interventions.
 * Features animated breathing indicators, step progress, and Spotify integration.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, SkipForward, Volume2, VolumeX, RotateCcw, Check, Music } from 'lucide-react';

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
  breathingPattern: 'box' | 'calming' | 'energizing' | 'cleansing';
  spotifyMood: string;
  steps: FlowStep[];
  benefits: string[];
  icon: string;
}

interface FlowPlayerProps {
  flow: MicroFlow;
  onComplete: (rating?: number, notes?: string) => void;
  onClose: () => void;
  spotifyEnabled?: boolean;
}

// Breathing timing patterns
const BREATHING_PATTERNS = {
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  calming: { inhale: 4, holdIn: 6, exhale: 4, holdOut: 8 },
  energizing: { inhale: 4, holdIn: 2, exhale: 4, holdOut: 2 },
  cleansing: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
};

export default function FlowPlayer({ flow, onComplete, onClose, spotifyEnabled = false }: FlowPlayerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [breathProgress, setBreathProgress] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

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

  // Handle completion submit
  const handleComplete = () => {
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
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center"
          >
            <Check className="w-12 h-12 text-white" />
          </motion.div>

          <h2 className="text-3xl font-bold text-emerald-300 mb-2">Flow Complete!</h2>
          <p className="text-emerald-100/70 mb-8">Your garden grew 🌱</p>

          {/* Rating */}
          <div className="mb-6">
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
          </div>

          {/* Optional Note */}
          <div className="mb-8">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any thoughts? (optional)"
              className="w-full px-4 py-3 bg-emerald-900/20 border border-emerald-800/30 rounded-xl text-emerald-100 placeholder-emerald-500/50 focus:outline-none focus:border-emerald-500/50 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={restartFlow}
              className="flex-1 px-6 py-3 bg-emerald-900/30 text-emerald-300 rounded-xl hover:bg-emerald-800/50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Repeat
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-colors font-medium"
            >
              Done
            </button>
          </div>
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

