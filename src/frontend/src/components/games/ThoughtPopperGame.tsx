/**
 * Mind Garden - Thought Popper Game
 * 
 * Focus and Mental Clearing Game
 * Pop negative thought bubbles to clear your mind and earn Serenity points.
 * +2 Serenity per pop
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Wind, Target } from 'lucide-react';

interface ThoughtPopperGameProps {
  onComplete: (credits: number, streak: number) => void;
  onExit?: () => void;
}

interface Bubble {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  size: number;
}

// Extended list of negative thoughts for variety
const NEGATIVE_THOUGHTS = [
  // Common anxieties
  "Anxiety", "Doubt", "Fear", "Worry", "Panic", "Dread",
  // Work stress
  "Burnout", "Overwhelm", "Deadline", "Pressure", "Overload",
  // Emotional burdens
  "Guilt", "Shame", "Regret", "Blame", "Resentment",
  // Mental noise
  "Noise", "Chaos", "Clutter", "Distraction", "Confusion",
  // Physical tension
  "Stress", "Tension", "Fatigue", "Exhaustion", "Restless",
  // Negative self-talk
  "Not enough", "Failure", "Inadequate", "Imposter", "Unworthy",
  // Interpersonal
  "Conflict", "Judgment", "Rejection", "Criticism", "Comparison",
  // Future worries
  "What if", "Uncertainty", "Unknown", "Tomorrow", "Later",
  // Past dwelling
  "Should have", "If only", "Mistake", "Missed", "Lost",
  // General negativity
  "Can't", "Won't work", "Too hard", "Impossible", "Never",
  "Anger", "Frustration", "Irritation", "Impatience", "Rush"
];

const GOAL = 15;

export default function ThoughtPopperGame({ onComplete, onExit }: ThoughtPopperGameProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [creditsEarned, setCreditsEarned] = useState(0);

  // Spawn bubbles periodically
  useEffect(() => {
    if (!gameActive || gameComplete) return;

    const spawnInterval = setInterval(() => {
      if (bubbles.length < 6) {
        const id = Math.random().toString(36).substr(2, 9);
        const text = NEGATIVE_THOUGHTS[Math.floor(Math.random() * NEGATIVE_THOUGHTS.length)];
        const x = Math.random() * 70 + 15; // 15% to 85% width
        const speed = Math.random() * 0.8 + 0.4; // Speed 0.4-1.2
        const size = Math.random() * 30 + 70; // 70-100px

        setBubbles(prev => [...prev, { id, text, x, y: 100, speed, size }]);
      }
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [gameActive, gameComplete, bubbles.length]);

  // Game loop - move bubbles upward
  useEffect(() => {
    if (!gameActive || gameComplete) return;

    const moveInterval = setInterval(() => {
      setBubbles(prev => {
        const updated = prev.map(b => ({ ...b, y: b.y - b.speed }));
        const stillOnScreen = updated.filter(b => b.y > -15);
        const escapedCount = updated.length - stillOnScreen.length;
        
        if (escapedCount > 0) {
          setMissed(m => m + escapedCount);
        }
        
        return stillOnScreen;
      });
    }, 50);

    return () => clearInterval(moveInterval);
  }, [gameActive, gameComplete]);

  // Win condition
  useEffect(() => {
    if (score >= GOAL && gameActive) {
      finishGame(true);
    }
  }, [score, gameActive]);

  // Lose condition (too many missed)
  useEffect(() => {
    if (missed >= 10 && gameActive) {
      finishGame(false);
    }
  }, [missed, gameActive]);

  const handlePop = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    setScore(prev => prev + 1);
  }, []);

  const finishGame = (won: boolean) => {
    setGameActive(false);
    setGameComplete(true);
    const credits = score * 2; // +2 points per pop
    setCreditsEarned(credits);
    setTimeout(() => onComplete(credits, won ? 1 : 0), 2500);
  };

  const startGame = () => {
    setShowOnboarding(false);
    setGameActive(true);
    setBubbles([]);
    setScore(0);
    setMissed(0);
  };

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-indigo-200 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wind className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Thought Popper</h2>
          <p className="text-gray-600 mb-6">
            Focus and Mental Clearing Game
          </p>
          
          <div className="bg-blue-50 rounded-2xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">How to Play:</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Negative thoughts appear as floating bubbles
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Tap them quickly before they drift away
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Pop {GOAL} thoughts to clear your mind
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">+2</span>
                Serenity points per pop
              </li>
            </ul>
          </div>
          
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg"
          >
            Start Popping
          </button>
          
          {onExit && (
            <button
              onClick={onExit}
              className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Games
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Game Complete
  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-indigo-200 p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            {score >= GOAL ? '🎉' : '😌'}
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {score >= GOAL ? 'Clear Mind!' : 'Good Effort!'}
          </h2>
          <p className="text-gray-600 mb-6">
            You popped {score} negative thoughts
          </p>
          
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-blue-600 mb-6">
            <Sparkles className="w-6 h-6" />
            <span>+{creditsEarned} Serenity</span>
          </div>
          
          <p className="text-gray-500 text-sm">Returning to Games Hub...</p>
        </motion.div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-indigo-200 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-bold text-blue-900 shadow-sm">
              <Target className="w-4 h-4 inline mr-2" />
              {score} / {GOAL}
            </div>
            <div className="bg-white/60 backdrop-blur px-3 py-1 rounded-full text-sm text-gray-600">
              Missed: {missed}
            </div>
          </div>
          {onExit && (
            <button 
              onClick={onExit} 
              className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl mx-auto h-[500px] bg-gradient-to-b from-white/40 to-blue-200/40 rounded-3xl overflow-hidden shadow-inner border-4 border-white/50">
        {/* Instruction */}
        {bubbles.length === 0 && score === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-blue-600/60 text-lg font-medium">Bubbles are rising...</p>
          </div>
        )}

        {/* Bubbles */}
        <AnimatePresence>
          {bubbles.map(bubble => (
            <motion.button
              key={bubble.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => handlePop(bubble.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-white/95 to-blue-100/90 backdrop-blur-md border-2 border-white/60 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              style={{ 
                top: `${bubble.y}%`, 
                left: `${bubble.x}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
              }}
            >
              <span className="text-xs font-medium text-blue-800 px-2 text-center leading-tight">
                {bubble.text}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-200/60 to-transparent pointer-events-none" />
        
        {/* Top gradient (where bubbles escape) */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-indigo-200/40 to-transparent pointer-events-none" />
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto mt-4">
        <div className="bg-white/50 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${(score / GOAL) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-center text-blue-700/70 text-sm mt-2">
          Pop {GOAL - score} more to clear your mind
        </p>
      </div>
    </div>
  );
}

