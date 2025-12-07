import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type MindState = 'calm' | 'stressed' | 'focused' | 'unclear';

interface BreathingPhase {
  action: string;
  duration: number; // seconds
  instruction: string;
  color: string;
}

interface AdaptiveBreathingFlowProps {
  mindState: MindState;
  onComplete: () => void;
}

const BREATHING_PROMPTS: Record<MindState, string[]> = {
  calm: [
    'Gently fill your lungs',
    'Feel the stillness',
    'Release with ease',
    'Breathe in peace',
    'Hold this moment',
    'Let it flow out',
    'Drawing in calm',
    'Rest here',
    'Softly release',
  ],
  stressed: [
    'Draw in calm energy',
    'Let tension dissolve',
    'Release all stress',
    'Breathe in relief',
    'Feel it melt away',
    'Exhale the pressure',
    'Invite peace in',
    'Rest in stillness',
    'Let it all go',
  ],
  focused: [
    'Sharp and clear',
    'Gather your energy',
    'Quick and complete',
    'Fuel your focus',
    'Harness this power',
    'Channel your strength',
    'Breathe in clarity',
    'Hold your intention',
    'Release, renewed',
  ],
  unclear: [
    'Invite clarity',
    'Create space',
    'Let go of confusion',
    'Breathe in light',
    'Ground yourself here',
    'Release the fog',
    'Draw in focus',
    'Find your center',
    'Clear the noise',
  ],
};

const BREATHING_FLOWS: Record<MindState, BreathingPhase[]> = {
  calm: [
    { action: 'Breathe In', duration: 5, instruction: '', color: 'from-blue-400 to-cyan-400' },
    { action: 'Hold', duration: 5, instruction: '', color: 'from-teal-400 to-blue-400' },
    { action: 'Breathe Out', duration: 7, instruction: '', color: 'from-teal-400 to-teal-400' },
  ],
  stressed: [
    { action: 'Breathe In', duration: 5, instruction: '', color: 'from-green-400 to-emerald-400' },
    { action: 'Hold', duration: 8, instruction: '', color: 'from-teal-400 to-green-400' },
    { action: 'Breathe Out', duration: 10, instruction: '', color: 'from-blue-400 to-teal-400' },
  ],
  focused: [
    { action: 'Breathe In', duration: 4, instruction: '', color: 'from-orange-400 to-amber-400' },
    { action: 'Hold', duration: 4, instruction: '', color: 'from-yellow-400 to-orange-400' },
    { action: 'Breathe Out', duration: 4, instruction: '', color: 'from-amber-400 to-yellow-400' },
  ],
  unclear: [
    { action: 'Breathe In', duration: 6, instruction: '', color: 'from-violet-400 to-teal-400' },
    { action: 'Hold', duration: 6, instruction: '', color: 'from-teal-400 to-fuchsia-400' },
    { action: 'Breathe Out', duration: 8, instruction: '', color: 'from-pink-400 to-violet-400' },
  ],
};

const FLOW_DESCRIPTIONS: Record<MindState, string> = {
  calm: 'Balanced breathing to maintain your centered state',
  stressed: 'Extended exhales to activate your relaxation response',
  focused: 'Energizing rhythm to sharpen your attention',
  unclear: 'Grounding flow to bring mental clarity',
};

export default function AdaptiveBreathingFlow({ mindState, onComplete }: AdaptiveBreathingFlowProps) {
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  const flow = BREATHING_FLOWS[mindState];
  const prompts = BREATHING_PROMPTS[mindState];
  const totalCycles = 3; // Reduced from 5 to 3 cycles, but each cycle is more deliberate
  const currentPhase = flow[currentPhaseIndex];
  const currentPrompt = prompts[promptIndex % prompts.length];

  useEffect(() => {
    // Start the first phase
    setTimeLeft(currentPhase.duration);
    setIsActive(true);
  }, []);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Move to next phase
          const nextPhaseIndex = (currentPhaseIndex + 1) % flow.length;
          
          if (nextPhaseIndex === 0) {
            // Completed a full cycle
            const nextCycle = currentCycle + 1;
            if (nextCycle >= totalCycles) {
              // All cycles complete
              onComplete();
              return 0;
            }
            setCurrentCycle(nextCycle);
          }
          
          setCurrentPhaseIndex(nextPhaseIndex);
          setPromptIndex((prev) => prev + 1); // Cycle through prompts
          return flow[nextPhaseIndex].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft, currentPhaseIndex, currentCycle, flow, onComplete]);

  const progress = ((currentPhase.duration - timeLeft) / currentPhase.duration) * 100;
  const circleScale = currentPhase.action === 'Hold' ? 1 : 
                      currentPhase.action === 'Breathe In' ? 0.6 + (progress / 100) * 0.4 : 
                      1 - (progress / 100) * 0.4;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Flow Description */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-8 px-4"
      >
        <p className="text-base sm:text-lg text-teal-200">
          {FLOW_DESCRIPTIONS[mindState]}
        </p>
      </motion.div>

      {/* Breathing Circle */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mb-6 sm:mb-8">
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentPhase.color} opacity-30 blur-2xl`}
          animate={{
            scale: circleScale * 1.2,
          }}
          transition={{
            duration: 1,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentPhase.color} flex items-center justify-center`}
          animate={{
            scale: circleScale,
          }}
          transition={{
            duration: 1,
            ease: "easeInOut",
          }}
        >
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase.action}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {currentPhase.action}
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-white">
                  {timeLeft}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Instruction */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentPhase.action}-${promptIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="text-xl sm:text-2xl text-white font-light mb-6 sm:mb-8 text-center px-4"
        >
          {currentPrompt}
        </motion.div>
      </AnimatePresence>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-sm sm:text-base text-teal-200">Cycle {currentCycle + 1} of {totalCycles}</span>
        <div className="flex gap-1 sm:gap-2">
          {[...Array(totalCycles)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < currentCycle ? 'bg-green-400' : 
                i === currentCycle ? 'bg-white' : 
                'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

