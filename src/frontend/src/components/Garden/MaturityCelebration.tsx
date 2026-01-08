/**
 * Maturity Celebration Component
 * 
 * Displays a celebratory animation when a plant reaches maturity (30 actions).
 * Features confetti, a congratulations message, and options to expand the garden.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PartyPopper, ChevronRight, Award, Leaf } from 'lucide-react';
import OnePlantSVG, { PlantType, PLANT_CONFIGS } from './OnePlantSVG';

interface MaturityCelebrationProps {
  isVisible: boolean;
  plantType: PlantType;
  totalActions?: number; // Optional, for future use in stats display
  totalPlantsGrown: number;
  streak: number;
  onClose: () => void;
  onExpand: () => void;
}

// Confetti particle
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

// Generate confetti particles
function generateConfetti(count: number): ConfettiParticle[] {
  const colors = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
    delay: Math.random() * 0.5,
  }));
}

export default function MaturityCelebration({
  isVisible,
  plantType,
  totalActions: _totalActions,
  totalPlantsGrown,
  streak,
  onClose,
  onExpand,
}: MaturityCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [showContent, setShowContent] = useState(false);
  
  const config = PLANT_CONFIGS[plantType];
  
  useEffect(() => {
    if (isVisible) {
      // Generate confetti
      setConfetti(generateConfetti(50));
      
      // Show content after confetti starts
      const timer = setTimeout(() => setShowContent(true), 500);
      
      return () => clearTimeout(timer);
    } else {
      setConfetti([]);
      setShowContent(false);
    }
  }, [isVisible]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confetti.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute"
                style={{
                  left: `${particle.x}%`,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                }}
                initial={{ 
                  y: `${particle.y}vh`,
                  rotate: particle.rotation,
                  opacity: 0,
                }}
                animate={{ 
                  y: '110vh',
                  rotate: particle.rotation + 720,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  delay: particle.delay,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
          
          {/* Sparkle bursts */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute text-4xl"
              style={{
                left: `${15 + (i % 4) * 25}%`,
                top: `${20 + Math.floor(i / 4) * 40}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                delay: 0.3 + i * 0.1,
                duration: 1,
                repeat: 2,
                repeatDelay: 1,
              }}
            >
              ✨
            </motion.div>
          ))}
          
          {/* Main content */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="relative max-w-lg w-full mx-4 p-8 rounded-3xl bg-gradient-to-b from-teal-900 to-teal-950 border border-teal-700/50 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Party popper icon */}
                <motion.div
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <PartyPopper className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
                
                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mt-4 mb-6"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">
                    🎉 Congratulations! 🎉
                  </h2>
                  <p className="text-teal-300 text-lg">
                    Your {config.name} is fully grown!
                  </p>
                </motion.div>
                
                {/* Plant display */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    {/* Glow effect */}
                    <motion.div
                      className="absolute inset-0 -m-4 rounded-full bg-teal-400/30 blur-xl"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <OnePlantSVG
                      plantType={plantType}
                      actionsCount={30}
                      size={160}
                      animated={true}
                      showPot={true}
                    />
                  </div>
                </motion.div>
                
                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-3 gap-4 mb-6"
                >
                  <div className="text-center p-3 rounded-xl bg-teal-800/30 border border-teal-700/30">
                    <Leaf className="w-5 h-5 mx-auto mb-1 text-teal-400" />
                    <div className="text-2xl font-bold text-white">30</div>
                    <div className="text-xs text-teal-400/70">Actions</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-amber-800/30 border border-amber-700/30">
                    <Sparkles className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <div className="text-2xl font-bold text-white">{streak}</div>
                    <div className="text-xs text-amber-400/70">Day Streak</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-violet-800/30 border border-violet-700/30">
                    <Award className="w-5 h-5 mx-auto mb-1 text-violet-400" />
                    <div className="text-2xl font-bold text-white">{totalPlantsGrown + 1}</div>
                    <div className="text-xs text-violet-400/70">Plants</div>
                  </div>
                </motion.div>
                
                {/* Message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center text-teal-200/80 mb-6"
                >
                  You've completed 30 mental wellness practices. 
                  Your dedication is beautiful. Ready to grow your garden further?
                </motion.p>
                
                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col gap-3"
                >
                  <button
                    onClick={onExpand}
                    className="w-full py-4 px-6 rounded-2xl font-semibold text-lg bg-gradient-to-r from-teal-500 to-teal-500 hover:from-teal-400 hover:to-teal-400 text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all flex items-center justify-center gap-3"
                  >
                    <Sparkles className="w-5 h-5" />
                    Plant a Second Seed
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full py-3 px-6 rounded-xl font-medium text-teal-300/70 hover:text-teal-200 transition-colors"
                  >
                    Celebrate Your Progress
                  </button>
                </motion.div>
                
                {/* Fun fact */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-6 text-center text-xs text-teal-400/50"
                >
                  🌿 Fun fact: You've spent meaningful time caring for your mental wellness!
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export a hook for tracking maturity
export function useMaturityCelebration(actionsCount: number, previousCount: number) {
  const [shouldCelebrate, setShouldCelebrate] = useState(false);
  
  useEffect(() => {
    // Check if we just crossed the maturity threshold
    if (previousCount < 30 && actionsCount >= 30) {
      setShouldCelebrate(true);
    }
  }, [actionsCount, previousCount]);
  
  const dismiss = () => setShouldCelebrate(false);
  
  return { shouldCelebrate, dismiss };
}

