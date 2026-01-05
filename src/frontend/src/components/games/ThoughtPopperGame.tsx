/**
 * Mind Garden - Thought Popper Game
 * 
 * Focus and Mental Clearing Game
 * Pop negative thought bubbles to clear your mind and grow your plant.
 * Each session adds +1 leaf to your growing plant!
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wind, Target, AlertTriangle, Info, CheckCircle2, Leaf } from 'lucide-react';
import api from '../../lib/axios';

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
  health: number; // For gamification: destructive words need more pops
  maxHealth: number;
  isDestructive: boolean;
}

// Words that are more harmful to mental health
const DESTRUCTIVE_WORDS = [
  "Failure", "Worthless", "Hopeless", "Useless", "Hate", "Never", 
  "Unloved", "Broken", "Guilty", "Ashamed", "Stupid", "Loser",
  "Burden", "Weak", "Incompetent", "Ugly", "Alone", "Pointless"
];

// Why these words are bad - for summary
const WORD_EXPLANATIONS: Record<string, string> = {
  "Failure": "Labeling yourself a failure ignores your growth and potential for learning.",
  "Worthless": "Your worth is inherent and not defined by your productivity or achievements.",
  "Hopeless": "Hopelessness is often a temporary feeling, not a permanent reality.",
  "Useless": "You have unique value and contribute to the world in ways you may not see.",
  "Hate": "Self-directed hate is a destructive cycle that masks your inner strength.",
  "Never": "Absolute words like 'never' create rigid, unrealistic mental boundaries.",
  "Unloved": "Feeling unloved doesn't mean you aren't loved or lovable.",
  "Broken": "You aren't broken; you're a human going through a challenging experience.",
  "Guilty": "Excessive guilt keeps you trapped in the past instead of moving forward.",
  "Ashamed": "Shame thrives in silence; naming it and letting go is the first step to healing.",
  "Stupid": "One mistake or struggle doesn't define your intelligence or capability.",
  "Loser": "Life isn't a game of winners and losers; it's a journey of individual growth.",
  "Burden": "You are not a burden; we are all interconnected and need support sometimes.",
  "Weak": "Vulnerability and seeking help are actually signs of immense courage.",
  "Incompetent": "Focusing on incompetence ignores the skills you've worked hard to build.",
  "Ugly": "Self-image is often distorted by mood; your beauty is multifaceted.",
  "Alone": "Loneliness is a feeling, but you are part of a global human community.",
  "Pointless": "Finding meaning is a process; even small actions have purpose.",
  "General": "Negative self-talk creates mental clutter that blocks your natural peace."
};

const FALLBACK_THOUGHTS = [
  "Anxiety", "Doubt", "Fear", "Worry", "Panic", "Dread",
  "Burnout", "Overwhelm", "Deadline", "Pressure", "Overload",
  "Noise", "Chaos", "Clutter", "Distraction", "Confusion",
  "Stress", "Tension", "Fatigue", "Exhaustion", "Restless",
  "Not enough", "Conflict", "Judgment", "Rejection", "Criticism",
  "What if", "Uncertainty", "Unknown", "Tomorrow", "Later",
  "Should have", "If only", "Mistake", "Missed", "Lost",
  "Can't", "Won't work", "Too hard", "Impossible"
];

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { name: 'Mindful', goal: 12, maxBubbles: 5, spawnRate: 1200, speedMultiplier: 0.7, description: 'A gentle start' },
  { name: 'Focused', goal: 18, maxBubbles: 6, spawnRate: 1000, speedMultiplier: 0.85, description: 'Building concentration' },
  { name: 'Centered', goal: 25, maxBubbles: 7, spawnRate: 900, speedMultiplier: 1.0, description: 'Stay present' },
  { name: 'Intense', goal: 35, maxBubbles: 8, spawnRate: 750, speedMultiplier: 1.2, description: 'Challenge your focus' },
  { name: 'Master', goal: 50, maxBubbles: 10, spawnRate: 600, speedMultiplier: 1.5, description: 'Ultimate mental clarity' },
];

export default function ThoughtPopperGame({ onComplete, onExit }: ThoughtPopperGameProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1); // Default to "Focused"
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [thoughtPool, setThoughtPool] = useState<string[]>([...FALLBACK_THOUGHTS, ...DESTRUCTIVE_WORDS]);
  const [isLoading, setIsLoading] = useState(false);
  const [poppedWords, setPoppedWords] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const currentLevel = DIFFICULTY_LEVELS[selectedLevel];
  const GOAL = currentLevel.goal;

  // Load thoughts from API
  useEffect(() => {
    const loadThoughts = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/thoughts/popper', { params: { count: 50 } });
        if (response.data.thoughts && response.data.thoughts.length > 0) {
          // Mix API thoughts with destructive words for gamification
          setThoughtPool([...response.data.thoughts, ...DESTRUCTIVE_WORDS]);
        }
      } catch (error) {
        console.warn('Using fallback thoughts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadThoughts();
  }, []);

  // Spawn bubbles periodically based on difficulty
  useEffect(() => {
    if (!gameActive || gameComplete) return;

    const spawnInterval = setInterval(() => {
      if (bubbles.length < currentLevel.maxBubbles) {
        const id = Math.random().toString(36).substr(2, 9);
        const text = thoughtPool[Math.floor(Math.random() * thoughtPool.length)];
        const isDestructive = DESTRUCTIVE_WORDS.includes(text);
        
        const x = Math.random() * 70 + 15;
        // Apply speed multiplier from difficulty
        const baseSpeed = isDestructive ? Math.random() * 0.6 + 0.8 : Math.random() * 0.6 + 0.4;
        const speed = baseSpeed * currentLevel.speedMultiplier;
        const size = isDestructive ? Math.random() * 20 + 60 : Math.random() * 30 + 80;
        const health = isDestructive ? 3 : 1;

        setBubbles(prev => [...prev, { id, text, x, y: 100, speed, size, health, maxHealth: health, isDestructive }]);
      }
    }, currentLevel.spawnRate);

    return () => clearInterval(spawnInterval);
  }, [gameActive, gameComplete, bubbles.length, thoughtPool, currentLevel]);

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

  const handlePop = useCallback((id: string) => {
    setBubbles(prev => {
      const bubble = prev.find(b => b.id === id);
      if (!bubble) return prev;

      if (bubble.health > 1) {
        // Just damage it
        return prev.map(b => b.id === id ? { ...b, health: b.health - 1 } : b);
      } else {
        // Actually pop it
        setScore(s => s + 1);
        setPoppedWords(pw => [...new Set([...pw, bubble.text])]);
        return prev.filter(b => b.id !== id);
      }
    });
  }, []);

  const finishGame = (_won: boolean) => {
    setGameActive(false);
    setGameComplete(true);
    const credits = score * 2;
    setCreditsEarned(credits);
    // Show summary instead of immediate exit
    setTimeout(() => setShowSummary(true), 1500);
  };

  const handleClaimReward = () => {
    onComplete(creditsEarned, 1);
  };

  const startGame = () => {
    setShowOnboarding(false);
    setGameActive(true);
    setBubbles([]);
    setScore(0);
    setMissed(0);
    setPoppedWords([]);
    setShowSummary(false);
  };

  // Level Select Screen
  if (showLevelSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-teal-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wind className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Difficulty</h2>
          <p className="text-gray-600 mb-6 text-sm">Higher levels = faster thoughts, bigger rewards</p>
          
          <div className="space-y-2 mb-6">
            {DIFFICULTY_LEVELS.map((level, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedLevel(index);
                  setShowLevelSelect(false);
                  startGame();
                }}
                className="w-full p-4 rounded-xl text-left transition-all border-2 bg-sky-50 border-sky-200 hover:border-sky-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{level.name}</h3>
                    <p className="text-sm text-gray-500">{level.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-sky-600">{level.goal}</span>
                    <p className="text-xs text-gray-400">thoughts</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {onExit && (
            <button
              onClick={onExit}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Games
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-teal-100 p-4">
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
            <ul className="space-y-3 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Pop negative thoughts before they drift away.
              </li>
              <li className="flex items-start gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span><strong>Destructive thoughts</strong> (red) are smaller, faster, and require <strong>3 taps</strong> to pop!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                Choose from 5 difficulty levels with increasing challenge.
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => setShowLevelSelect(true)}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-sky-600 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'Loading thoughts...' : 'Choose Level'}
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

  // Summary Screen
  if (showSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-teal-100 p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] flex flex-col"
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">😌</div>
            <h2 className="text-3xl font-bold text-gray-900">Mind Cleared!</h2>
            <p className="text-gray-600">You've successfully cleared your mental space.</p>
          </div>

          <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              Why we popped these thoughts:
            </h3>
            <div className="space-y-3">
              {poppedWords.map((word, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <span className={`font-bold ${DESTRUCTIVE_WORDS.includes(word) ? 'text-red-500' : 'text-blue-600'}`}>
                    {word}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {WORD_EXPLANATIONS[word] || WORD_EXPLANATIONS["General"]}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-2xl font-bold text-emerald-600">
                <Leaf className="w-6 h-6" />
                <span>+1 Leaf 🍃</span>
              </div>
              <button
                onClick={handleClaimReward}
                className="py-3 px-8 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Claim Reward
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Game Complete (Transition)
  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-teal-100 p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-4">✨</div>
          <h2 className="text-4xl font-bold text-blue-900">Well Done</h2>
        </motion.div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-teal-100 p-4 overflow-hidden touch-none">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-bold text-blue-900 shadow-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
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
      <div className="relative w-full max-w-4xl mx-auto h-[70vh] bg-gradient-to-b from-white/40 to-blue-200/40 rounded-3xl overflow-hidden shadow-inner border-4 border-white/50">
        <AnimatePresence>
          {bubbles.map(bubble => (
            <motion.button
              key={bubble.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                rotate: bubble.health < bubble.maxHealth ? [0, -2, 2, 0] : 0
              }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 0.2 },
                default: { duration: 0.2 }
              }}
              onClick={() => handlePop(bubble.id)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full backdrop-blur-md border-2 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all
                ${bubble.isDestructive 
                  ? 'bg-gradient-to-br from-red-100/90 to-rose-200/80 border-red-300' 
                  : 'bg-gradient-to-br from-white/95 to-blue-100/90 border-white/60'}`}
              style={{ 
                top: `${bubble.y}%`, 
                left: `${bubble.x}%`,
                width: `${bubble.size}px`,
                height: `${bubble.size}px`,
              }}
            >
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-bold px-2 text-center leading-tight
                  ${bubble.isDestructive ? 'text-red-800' : 'text-blue-800'}`}>
                  {bubble.text}
                </span>
                {bubble.health > 1 && (
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: bubble.health }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        
        {/* Particle effects or background animations could go here */}
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto mt-6 relative z-10">
        <div className="bg-white/50 rounded-full h-4 overflow-hidden border border-white/30 p-0.5">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(score / GOAL) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-center text-blue-900/60 text-sm mt-2 font-medium">
          {score < GOAL ? `Pop ${GOAL - score} more thoughts to clear your mind` : 'Mind focus achieved!'}
        </p>
      </div>
    </div>
  );
}
