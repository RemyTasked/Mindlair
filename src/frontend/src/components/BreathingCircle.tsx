import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BreathingCircleProps {
  onComplete?: () => void;
  duration?: number; // Total duration in seconds
}

export default function BreathingCircle({ onComplete, duration = 60 }: BreathingCircleProps) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const totalCycles = Math.ceil(duration / 12); // Each cycle is ~12 seconds

  useEffect(() => {
    if (cycleCount >= totalCycles) {
      onComplete?.();
      return;
    }

    const phaseTimers = {
      inhale: 4000,   // 4 seconds
      hold: 4000,     // 4 seconds
      exhale: 4000,   // 4 seconds
    };

    const timer = setTimeout(() => {
      if (phase === 'inhale') {
        setPhase('hold');
      } else if (phase === 'hold') {
        setPhase('exhale');
      } else {
        setPhase('inhale');
        setCycleCount((prev) => prev + 1);
      }
    }, phaseTimers[phase]);

    return () => clearTimeout(timer);
  }, [phase, cycleCount, totalCycles, onComplete]);

  const phaseText = {
    inhale: 'Breathe In',
    hold: 'Hold',
    exhale: 'Breathe Out',
  };

  const circleScale = {
    inhale: 1.3,
    hold: 1.3,
    exhale: 0.7,
  };

  return (
    <div className="flex flex-col items-center gap-12">
      <div className="relative w-64 h-64">
        {/* Outer glow */}
        <motion.div
          animate={{
            scale: circleScale[phase],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: phase === 'hold' ? 4 : 4,
            ease: phase === 'hold' ? 'linear' : 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-teal-400 blur-3xl"
        />

        {/* Main breathing circle */}
        <motion.div
          animate={{
            scale: circleScale[phase],
          }}
          transition={{
            duration: phase === 'hold' ? 4 : 4,
            ease: phase === 'hold' ? 'linear' : 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 opacity-80 flex items-center justify-center"
        >
          <div className="text-white text-2xl font-semibold">
            {phaseText[phase]}
          </div>
        </motion.div>

        {/* Inner circle */}
        <motion.div
          animate={{
            scale: circleScale[phase] * 0.6,
          }}
          transition={{
            duration: phase === 'hold' ? 4 : 4,
            ease: phase === 'hold' ? 'linear' : 'easeInOut',
          }}
          className="absolute inset-0 m-auto w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm"
        />
      </div>

      <div className="text-center">
        <div className="text-lg text-teal-200">
          Cycle {cycleCount + 1} of {totalCycles}
        </div>
      </div>
    </div>
  );
}

