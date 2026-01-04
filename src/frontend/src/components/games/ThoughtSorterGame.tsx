/**
 * Mind Garden - Thought Sorter Game
 * 
 * Categorization Tool with Smart Feedback
 * Sort your mental inputs into actionable buckets to reduce cognitive load.
 * Now provides educational guidance when you might benefit from a different choice!
 * +3 Serenity per sort
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Wind,
  LayoutGrid, Sparkles, Heart, Plus, Lightbulb
} from 'lucide-react';
import api from '../../lib/axios';

interface ThoughtSorterGameProps {
  onComplete: (credits: number, streak: number) => void;
  onExit?: () => void;
}

interface Thought {
  id: string;
  text: string;
  isCustom?: boolean;
  suggestedBucket?: string | null;
  category?: string;
}

// Fallback thoughts with suggested buckets
const FALLBACK_THOUGHTS: Thought[] = [
  // Negative thoughts - suggest "letGo"
  { id: '1', text: "I always mess up presentations", suggestedBucket: "letGo", category: "negative" },
  { id: '2', text: "Everyone thinks I'm incompetent", suggestedBucket: "letGo", category: "negative" },
  { id: '3', text: "I'm such an idiot", suggestedBucket: "letGo", category: "negative" },
  { id: '4', text: "What if I fail?", suggestedBucket: "letGo", category: "worry" },
  { id: '5', text: "They probably don't like me", suggestedBucket: "letGo", category: "negative" },
  { id: '6', text: "I'm not good enough", suggestedBucket: "letGo", category: "negative" },
  // Tasks - suggest "park"
  { id: '7', text: "I need to finish that report", suggestedBucket: "park", category: "work" },
  { id: '8', text: "Should schedule that appointment", suggestedBucket: "park", category: "health" },
  { id: '9', text: "Need to reply to that email", suggestedBucket: "park", category: "work" },
  { id: '10', text: "The house needs cleaning", suggestedBucket: "park", category: "general" },
  // Positive thoughts - suggest "keep"
  { id: '11', text: "I handled that well today", suggestedBucket: "keep", category: "positive" },
  { id: '12', text: "I'm grateful for my friends", suggestedBucket: "keep", category: "gratitude" },
  { id: '13', text: "I'm making progress", suggestedBucket: "keep", category: "positive" },
  { id: '14', text: "Small steps still count", suggestedBucket: "keep", category: "positive" },
  { id: '15', text: "I deserve some rest", suggestedBucket: "keep", category: "positive" },
];

const POINTS_PER_SORT = 3;

type BucketType = 'keep' | 'park' | 'letGo';

// Feedback messages for different scenarios
const FEEDBACK_MESSAGES: Record<string, Record<BucketType, string>> = {
  negative: {
    keep: "This sounds like a self-critical thought. Consider 'Letting Go' to clear it from your mind, or 'Parking' it to examine later with more perspective.",
    park: "Parking can work, but be careful not to revisit self-criticism too often. Sometimes it's healthier to just 'Let Go'.",
    letGo: "", // Correct choice
  },
  worry: {
    keep: "Holding onto worries can increase anxiety. Try 'Letting Go' to release this thought, or 'Park' it to address it constructively later.",
    park: "If you plan to take action on this, parking is fine. Otherwise, consider 'Letting Go' to reduce mental noise.",
    letGo: "", // Correct choice
  },
  positive: {
    keep: "", // Correct choice
    park: "Positive thoughts deserve to be cherished! Consider 'Keeping' this one to boost your mood.",
    letGo: "This sounds like a positive thought! Try 'Keeping' it instead - positive self-talk is valuable.",
  },
  gratitude: {
    keep: "", // Correct choice
    park: "Gratitude is a gift to yourself. Try 'Keeping' this thought to nurture appreciation.",
    letGo: "Gratitude thoughts are precious! Consider 'Keeping' this one to build a positive mindset.",
  },
  work: {
    keep: "This seems like a task. Try 'Parking' it so you can address it at the right time.",
    park: "", // Correct choice
    letGo: "If this is something you need to do, consider 'Parking' it rather than letting it go entirely.",
  },
  health: {
    keep: "Health tasks are important to address. Try 'Parking' this so you remember to follow up.",
    park: "", // Correct choice
    letGo: "Health matters! Consider 'Parking' this to schedule or address it properly.",
  },
  general: {
    keep: "",
    park: "",
    letGo: "",
  },
};

export default function ThoughtSorterGame({ onComplete, onExit }: ThoughtSorterGameProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortedCounts, setSortedCounts] = useState({ keep: 0, park: 0, letGo: 0 });
  const [gameComplete, setGameComplete] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [animatingTo, setAnimatingTo] = useState<BucketType | null>(null);
  const [customThoughtInput, setCustomThoughtInput] = useState('');
  const [showAddThought, setShowAddThought] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingSort, setPendingSort] = useState<BucketType | null>(null);

  // Load thoughts from API
  useEffect(() => {
    loadThoughts();
  }, []);

  const loadThoughts = async () => {
    try {
      const response = await api.get('/api/thoughts/sorter', { params: { count: 12 } });
      if (response.data.thoughts && response.data.thoughts.length > 0) {
        setThoughts(response.data.thoughts.map((t: any) => ({
          id: t.id,
          text: t.text,
          suggestedBucket: t.suggestedBucket,
          category: t.category,
        })));
      } else {
        // Use fallback and shuffle
        const shuffled = [...FALLBACK_THOUGHTS].sort(() => Math.random() - 0.5);
        setThoughts(shuffled.slice(0, 10));
      }
    } catch (error) {
      console.warn('Using fallback thoughts:', error);
      const shuffled = [...FALLBACK_THOUGHTS].sort(() => Math.random() - 0.5);
      setThoughts(shuffled.slice(0, 10));
    } finally {
      setLoading(false);
    }
  };

  const addCustomThought = async () => {
    if (customThoughtInput.trim()) {
      const newThought: Thought = {
        id: `custom-${Date.now()}`,
        text: customThoughtInput.trim(),
        isCustom: true,
      };
      // Insert custom thought at current position
      setThoughts(prev => [
        ...prev.slice(0, currentIndex + 1),
        newThought,
        ...prev.slice(currentIndex + 1),
      ]);
      
      // Share to community pool (fire and forget)
      try {
        await api.post('/api/thoughts/share', { 
          text: customThoughtInput.trim(),
          category: 'general',
        });
      } catch (error) {
        // Non-critical, ignore errors
      }
      
      setCustomThoughtInput('');
      setShowAddThought(false);
    }
  };

  const currentThought = thoughts[currentIndex];
  const totalThoughts = thoughts.length;

  const checkForFeedback = (bucket: BucketType): string | null => {
    if (!currentThought) return null;
    
    const category = currentThought.category || 'general';
    const suggested = currentThought.suggestedBucket;
    
    // If there's a suggested bucket and user chose differently, show feedback
    if (suggested && suggested !== bucket) {
      const message = FEEDBACK_MESSAGES[category]?.[bucket];
      if (message) {
        return message;
      }
    }
    
    return null;
  };

  const handleSort = async (bucket: BucketType) => {
    if (!currentThought || animatingTo) return;

    // Check if we should show feedback
    const feedback = checkForFeedback(bucket);
    
    if (feedback && !pendingSort) {
      // Show feedback first, let user reconsider or confirm
      setFeedbackMessage(feedback);
      setPendingSort(bucket);
      return;
    }

    // Proceed with sorting
    confirmSort(bucket);
  };

  const confirmSort = (bucket: BucketType) => {
    setFeedbackMessage(null);
    setPendingSort(null);
    setAnimatingTo(bucket);
    
    // Update counts
    setSortedCounts(prev => ({ ...prev, [bucket]: prev[bucket] + 1 }));

    // Animate out then move to next
    setTimeout(() => {
      setAnimatingTo(null);
      
      if (currentIndex < totalThoughts - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        finishGame();
      }
    }, 400);
  };

  const dismissFeedback = () => {
    if (pendingSort) {
      confirmSort(pendingSort);
    }
  };

  const reconsiderSort = () => {
    setFeedbackMessage(null);
    setPendingSort(null);
  };

  const finishGame = async () => {
    setGameComplete(true);
    const totalSorted = sortedCounts.keep + sortedCounts.park + sortedCounts.letGo + 1; // +1 for current
    const credits = totalSorted * POINTS_PER_SORT;

    // Submit to backend
    try {
      await api.post('/api/thought-tidy/submit', {
        kept: Array(sortedCounts.keep + (animatingTo === 'keep' ? 1 : 0)).fill('thought'),
        parked: Array(sortedCounts.park + (animatingTo === 'park' ? 1 : 0)).fill('thought'),
        released: Array(sortedCounts.letGo + (animatingTo === 'letGo' ? 1 : 0)).fill('thought'),
      });
    } catch (error) {
      console.warn('Failed to submit thoughts:', error);
    }

    setTimeout(() => onComplete(credits, 1), 2500);
  };

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-100 to-emerald-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LayoutGrid className="w-10 h-10 text-teal-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Thought Sorter</h2>
          <p className="text-gray-600 mb-6">
            Categorization Tool with Smart Guidance
          </p>
          
          <div className="bg-teal-50 rounded-2xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">How to Play:</h3>
            <ul className="space-y-3 text-gray-600 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <span className="font-medium text-green-700">Keep</span>
                  <p className="text-xs text-gray-500">Positive thoughts to cherish</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-medium text-amber-700">Park</span>
                  <p className="text-xs text-gray-500">Tasks to address later</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wind className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="font-medium text-blue-700">Let Go</span>
                  <p className="text-xs text-gray-500">Negative thoughts to release</p>
                </div>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-teal-100 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-600">Smart feedback helps you learn healthy thought patterns</span>
            </div>
            <div className="mt-2">
              <span className="text-teal-600 font-medium">+{POINTS_PER_SORT}</span>
              <span className="text-gray-500 text-sm"> Serenity per sort</span>
            </div>
          </div>
          
          <button
            onClick={() => setShowOnboarding(false)}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-teal-600 hover:to-emerald-700 transition-all shadow-lg"
          >
            Start Sorting
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

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-100 to-emerald-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-teal-700">Loading your thoughts...</p>
        </div>
      </div>
    );
  }

  // Game Complete
  if (gameComplete) {
    const totalSorted = sortedCounts.keep + sortedCounts.park + sortedCounts.letGo;
    const credits = totalSorted * POINTS_PER_SORT;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-100 to-emerald-100 p-4">
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
            🧠
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mind Cleared</h2>
          <p className="text-gray-600 mb-4">
            You processed {totalSorted} thoughts
          </p>
          
          <div className="flex justify-center gap-6 text-sm mb-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-bold text-green-700">{sortedCounts.keep}</p>
              <p className="text-gray-500 text-xs">Kept</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="font-bold text-amber-700">{sortedCounts.park}</p>
              <p className="text-gray-500 text-xs">Parked</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-1">
                <Wind className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-bold text-blue-700">{sortedCounts.letGo}</p>
              <p className="text-gray-500 text-xs">Let Go</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-teal-600 mb-6">
            <Sparkles className="w-6 h-6" />
            <span>+{credits} Serenity</span>
          </div>
          
          <p className="text-gray-500 text-sm">Returning to Games Hub...</p>
        </motion.div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-100 to-emerald-100 p-4 flex flex-col">
      {/* Header */}
      <div className="max-w-2xl mx-auto w-full mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Thought Sorter</h2>
            <p className="text-gray-600 text-sm">Process your thoughts mindfully</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
              {currentIndex + 1} / {totalThoughts}
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
      </div>

      {/* Add Custom Thought */}
      <div className="max-w-2xl mx-auto w-full mb-4">
        <AnimatePresence>
          {showAddThought ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/90 rounded-2xl p-4 shadow-lg"
            >
              <p className="text-gray-700 text-sm font-medium mb-2">Add your own thought to sort:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customThoughtInput}
                  onChange={(e) => setCustomThoughtInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomThought()}
                  placeholder="What's on your mind?"
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 text-gray-800"
                  autoFocus
                />
                <button
                  onClick={addCustomThought}
                  disabled={!customThoughtInput.trim()}
                  className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddThought(false); setCustomThoughtInput(''); }}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddThought(true)}
              className="flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add your own thought
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto w-full mb-8">
        <div className="bg-white/50 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex) / totalThoughts) * 100}%` }}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto w-full">
        <div className="relative w-full max-w-md h-64">
          <AnimatePresence mode="wait">
            {currentThought && (
              <motion.div
                key={currentThought.id}
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ 
                  y: 0, 
                  opacity: 1, 
                  scale: 1,
                  x: animatingTo === 'keep' ? -200 : animatingTo === 'letGo' ? 200 : animatingTo === 'park' ? 0 : 0,
                  ...(animatingTo === 'park' ? { y: 100 } : {}),
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-8"
              >
                <div className="text-center">
                  {currentThought.isCustom && (
                    <span className="inline-block mb-2 px-2 py-1 text-xs bg-teal-100 text-teal-700 rounded-full">
                      Your thought
                    </span>
                  )}
                  <p className="text-xl sm:text-2xl font-medium text-gray-800 leading-relaxed">
                    {currentThought.text}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Gentle Suggestion</h3>
                  <p className="text-gray-600 text-sm">{feedbackMessage}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={reconsiderSort}
                  className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                >
                  Try Another
                </button>
                <button
                  onClick={dismissFeedback}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Keep My Choice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buckets */}
      <div className="max-w-2xl mx-auto w-full mt-8 mb-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Keep */}
          <motion.button
            onClick={() => handleSort('keep')}
            disabled={!!animatingTo || !!feedbackMessage}
            className="bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-2 transition-all shadow-lg disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Heart className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="font-bold text-sm sm:text-base">Keep</span>
            <span className="text-xs opacity-80 hidden sm:block">Cherish</span>
          </motion.button>

          {/* Park */}
          <motion.button
            onClick={() => handleSort('park')}
            disabled={!!animatingTo || !!feedbackMessage}
            className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-2 transition-all shadow-lg disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="font-bold text-sm sm:text-base">Park</span>
            <span className="text-xs opacity-80 hidden sm:block">For later</span>
          </motion.button>

          {/* Let Go */}
          <motion.button
            onClick={() => handleSort('letGo')}
            disabled={!!animatingTo || !!feedbackMessage}
            className="bg-gradient-to-br from-sky-400 to-teal-500 text-white rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-2 transition-all shadow-lg disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Wind className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="font-bold text-sm sm:text-base">Let Go</span>
            <span className="text-xs opacity-80 hidden sm:block">Release</span>
          </motion.button>
        </div>
      </div>

      {/* Bucket counts */}
      <div className="max-w-2xl mx-auto w-full text-center text-sm text-gray-500">
        <span className="text-green-600">{sortedCounts.keep} kept</span>
        {' • '}
        <span className="text-amber-600">{sortedCounts.park} parked</span>
        {' • '}
        <span className="text-blue-600">{sortedCounts.letGo} let go</span>
      </div>
    </div>
  );
}
