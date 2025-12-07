/**
 * Mind Garden - Thought Sorter Game
 * 
 * Categorization Tool
 * Sort your mental inputs into actionable buckets to reduce cognitive load.
 * +3 Serenity per sort
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Wind,
  LayoutGrid, Sparkles, Heart, Plus
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
}

// Extended pool of thoughts for variety
const ALL_THOUGHTS: Thought[] = [
  // Work-related
  { id: '1', text: "I need to finish that report" },
  { id: '2', text: "My presentation is tomorrow" },
  { id: '3', text: "That meeting was stressful" },
  { id: '4', text: "I have too many emails" },
  { id: '5', text: "Did I miss that deadline?" },
  { id: '6', text: "I need to follow up with that client" },
  { id: '7', text: "The project scope keeps changing" },
  { id: '8', text: "I should ask for that raise" },
  { id: '9', text: "My inbox is out of control" },
  { id: '10', text: "I need to update my resume" },
  // Positive self-talk
  { id: '11', text: "Today was a good day" },
  { id: '12', text: "I am capable" },
  { id: '13', text: "I handled that well" },
  { id: '14', text: "I'm making progress" },
  { id: '15', text: "I'm proud of what I accomplished" },
  { id: '16', text: "I've grown so much this year" },
  { id: '17', text: "Small steps still count" },
  { id: '18', text: "I showed up for myself today" },
  // Worries & Anxiety
  { id: '19', text: "What if I fail?" },
  { id: '20', text: "Did I lock the door?" },
  { id: '21', text: "Too much noise in my head" },
  { id: '22', text: "What will people think?" },
  { id: '23', text: "I'm not good enough" },
  { id: '24', text: "Everything feels overwhelming" },
  { id: '25', text: "I can't stop worrying about money" },
  { id: '26', text: "Am I making the right decisions?" },
  { id: '27', text: "I feel like I'm falling behind" },
  // Tasks & Reminders
  { id: '28', text: "Call mom tomorrow" },
  { id: '29', text: "I should exercise more" },
  { id: '30', text: "Need to schedule that appointment" },
  { id: '31', text: "The house is a mess" },
  { id: '32', text: "I forgot to reply to that message" },
  { id: '33', text: "Groceries are running low" },
  { id: '34', text: "I need to pay that bill" },
  { id: '35', text: "Should I meal prep this weekend?" },
  // Relationships
  { id: '36', text: "I miss my old friends" },
  { id: '37', text: "That conversation was awkward" },
  { id: '38', text: "I should reach out more often" },
  { id: '39', text: "They probably don't like me" },
  { id: '40', text: "I'm grateful for my support system" },
  { id: '41', text: "Did I say the wrong thing?" },
  { id: '42', text: "I wish I had more time for family" },
  { id: '43', text: "That text came across wrong" },
  // Self-care & Health
  { id: '44', text: "I need more sleep" },
  { id: '45', text: "I should drink more water" },
  { id: '46', text: "When did I last take a real break?" },
  { id: '47', text: "I deserve some quiet time" },
  { id: '48', text: "I should schedule that checkup" },
  { id: '49', text: "My back has been hurting lately" },
  { id: '50', text: "I need to be kinder to myself" },
  // Future & Goals
  { id: '51', text: "Where will I be in 5 years?" },
  { id: '52', text: "I'm excited about new possibilities" },
  { id: '53', text: "Change can be good" },
  { id: '54', text: "I'm ready for the next chapter" },
  { id: '55', text: "What do I actually want in life?" },
  { id: '56', text: "I want to learn something new" },
  // Past & Regrets
  { id: '57', text: "I wish I'd done things differently" },
  { id: '58', text: "That was a great memory" },
  { id: '59', text: "I learned from that mistake" },
  { id: '60', text: "Why did I say that?" },
  // Financial
  { id: '61', text: "I need to check my bank balance" },
  { id: '62', text: "Should I start saving more?" },
  { id: '63', text: "That purchase wasn't necessary" },
  { id: '64', text: "I'm doing okay financially" },
  // Creative & Hobbies
  { id: '65', text: "I want to start painting again" },
  { id: '66', text: "I miss playing music" },
  { id: '67', text: "I should read more books" },
  { id: '68', text: "When did I last do something creative?" },
  // Gratitude
  { id: '69', text: "I'm lucky to have good friends" },
  { id: '70', text: "The weather was beautiful today" },
  { id: '71', text: "That meal was really delicious" },
  { id: '72', text: "I appreciate the small moments" },
  // Random daily thoughts
  { id: '73', text: "I wonder what's for dinner" },
  { id: '74', text: "Traffic was terrible today" },
  { id: '75', text: "I need a vacation" },
  { id: '76', text: "Why is everything so expensive?" },
  { id: '77', text: "That song has been stuck in my head" },
  { id: '78', text: "I should clean out my closet" },
];

// Select random thoughts for each session
const selectRandomThoughts = (count: number = 10): Thought[] => {
  const shuffled = [...ALL_THOUGHTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const POINTS_PER_SORT = 3;

type BucketType = 'keep' | 'park' | 'letGo';

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

  // Load thoughts
  useEffect(() => {
    loadThoughts();
  }, []);

  const loadThoughts = async () => {
    try {
      const response = await api.get('/api/thought-tidy/cards');
      if (response.data.cards && response.data.cards.length > 0) {
        setThoughts(response.data.cards.map((card: any, index: number) => ({
          id: card.id || String(index),
          text: card.text || card,
        })));
      } else {
        // Select fresh random thoughts each session
        setThoughts(selectRandomThoughts(10));
      }
    } catch (error) {
      console.warn('Using random default thoughts:', error);
      // Select fresh random thoughts each session for variety
      setThoughts(selectRandomThoughts(10));
    } finally {
      setLoading(false);
    }
  };

  const addCustomThought = () => {
    if (customThoughtInput.trim()) {
      const newThought: Thought = {
        id: `custom-${Date.now()}`,
        text: customThoughtInput.trim(),
        isCustom: true,
      };
      // Insert custom thought at current position (so it appears next)
      setThoughts(prev => [
        ...prev.slice(0, currentIndex + 1),
        newThought,
        ...prev.slice(currentIndex + 1),
      ]);
      setCustomThoughtInput('');
      setShowAddThought(false);
    }
  };

  const currentThought = thoughts[currentIndex];
  const totalThoughts = thoughts.length;

  const handleSort = async (bucket: BucketType) => {
    if (!currentThought || animatingTo) return;

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

  const finishGame = async () => {
    setGameComplete(true);
    const totalSorted = sortedCounts.keep + sortedCounts.park + sortedCounts.letGo + 1; // +1 for current
    const credits = totalSorted * POINTS_PER_SORT;

    // Try to submit to backend (map letGo to release for compatibility)
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
            Categorization Tool
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
                  <p className="text-xs text-gray-500">Something positive to cherish</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-medium text-amber-700">Park</span>
                  <p className="text-xs text-gray-500">File away for later</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wind className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <span className="font-medium text-blue-700">Let Go</span>
                  <p className="text-xs text-gray-500">Consciously dismiss</p>
                </div>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-teal-100">
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
            <p className="text-gray-600 text-sm">Process your thoughts</p>
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

      {/* Buckets */}
      <div className="max-w-2xl mx-auto w-full mt-8 mb-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Keep */}
          <motion.button
            onClick={() => handleSort('keep')}
            disabled={!!animatingTo}
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
            disabled={!!animatingTo}
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
            disabled={!!animatingTo}
            className="bg-gradient-to-br from-sky-400 to-teal-500 text-white rounded-2xl p-4 sm:p-6 flex flex-col items-center gap-2 transition-all shadow-lg disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Wind className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="font-bold text-sm sm:text-base">Let Go</span>
            <span className="text-xs opacity-80 hidden sm:block">Dismiss</span>
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

