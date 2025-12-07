/**
 * Mind Garden - Games Hub
 * 
 * Interactive Serenity Builders
 * Gamified activities and cognitive tools to help manage focus, anxiety, and stress.
 * Each successful interaction contributes to your garden's Serenity Score.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, Target, Sparkles, Settings as SettingsIcon, 
  Headphones, Gamepad2, Wind, Leaf, LayoutGrid,
  Palette, Music
} from 'lucide-react';
import Logo from '../components/Logo';
import api from '../lib/axios';
import ThoughtPopperGame from '../components/games/ThoughtPopperGame';
import ZenMatchGame from '../components/games/ZenMatchGame';
import ThoughtSorterGame from '../components/games/ThoughtSorterGame';
import EmotionGarden from '../components/EmotionGarden';

interface GameProgress {
  totalCredits: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
}

type GameType = 'thought-popper' | 'zen-match' | 'thought-sorter' | null;

export default function GamesHub() {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState<GameType>(null);
  const [showEmotionGarden, setShowEmotionGarden] = useState(false);
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadProgress();
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/api/user/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      localStorage.removeItem('meetcute_token');
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.removeItem('meetcute_token');
      navigate('/');
    }
  };

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/games/progress').catch(() => ({ 
        data: { totalCredits: 0, currentStreak: 0, longestStreak: 0, badges: [] } 
      }));
      setProgress(response.data);
    } catch (error) {
      console.error('Error loading progress:', error);
      setProgress({ totalCredits: 0, currentStreak: 0, longestStreak: 0, badges: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleGameComplete = async (credits: number, streak: number) => {
    // Refresh progress after game completion
    try {
      await api.post('/api/games/progress', { credits });
      const response = await api.get('/api/games/progress');
      setProgress(response.data);
    } catch (error) {
      console.error('Error updating progress:', error);
      // Update local progress anyway
      if (progress) {
        setProgress({
          ...progress,
          totalCredits: progress.totalCredits + credits,
          currentStreak: streak > 0 ? progress.currentStreak + 1 : 0,
        });
      }
    }
    setGameStarted(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size="lg" />
          <p className="mt-4 text-gray-600">Loading Games Hub...</p>
        </div>
      </div>
    );
  }

  // Render header component
  const renderHeader = () => (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Navigation Section */}
          <div className="flex items-center gap-6">
            <Logo size="md" />
            <nav className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  window.location.pathname === '/dashboard'
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/focus-rooms')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  window.location.pathname === '/focus-rooms'
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Headphones className="w-4 h-4" />
                Focus Rooms
              </button>
              <button
                onClick={() => navigate('/games')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                  window.location.pathname === '/games'
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                Games
              </button>
            </nav>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="sm:hidden flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              window.location.pathname === '/dashboard'
                ? 'bg-teal-50 text-teal-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/focus-rooms')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              window.location.pathname === '/focus-rooms'
                ? 'bg-teal-50 text-teal-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Headphones className="w-4 h-4" />
            Focus
          </button>
          <button
            onClick={() => navigate('/games')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              window.location.pathname === '/games'
                ? 'bg-teal-50 text-teal-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Games
          </button>
        </nav>
      </div>
    </header>
  );

  if (showEmotionGarden) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        {renderHeader()}
        <EmotionGarden onExit={() => setShowEmotionGarden(false)} />
      </div>
    );
  }

  if (gameStarted && gameType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50">
        {gameType === 'thought-popper' && (
          <ThoughtPopperGame 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
        {gameType === 'zen-match' && (
          <ZenMatchGame 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
        {gameType === 'thought-sorter' && (
          <ThoughtSorterGame 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50">
      {renderHeader()}

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Interactive Serenity Builders
          </h1>
          <p className="text-gray-600 text-lg">
            Gamified activities to help you manage focus, anxiety, and stress
          </p>
        </div>

        {/* Progress Stats */}
        {progress && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-4 shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">Serenity Score</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{progress.totalCredits}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-4 shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600">Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{progress.currentStreak}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-4 shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600">Best Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{progress.longestStreak}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-4 shadow-md"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span className="text-sm text-gray-600">Badges</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{progress.badges.length}</p>
            </motion.div>
          </div>
        )}

        {/* Games Grid */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Serenity Games</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Thought Popper */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-b-4 border-blue-500 cursor-pointer transition-all"
            onClick={() => {
              setGameType('thought-popper');
              setGameStarted(true);
            }}
          >
            <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Wind className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thought Popper</h3>
            <p className="text-gray-600 text-sm mb-4">
              Focus and Mental Clearing Game. Visualize and quickly dismiss intrusive thoughts by popping floating bubbles.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                +2 Serenity / Pop
              </span>
              <span className="text-xs text-gray-500">1-2 min</span>
            </div>
          </motion.div>

          {/* Zen Match */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-b-4 border-green-500 cursor-pointer transition-all"
            onClick={() => {
              setGameType('zen-match');
              setGameStarted(true);
            }}
          >
            <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Leaf className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Zen Match</h3>
            <p className="text-gray-600 text-sm mb-4">
              Cognitive Concentration Game. Classic memory game with nature-themed icons to sharpen focus and recall.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                +5 Serenity / Match
              </span>
              <span className="text-xs text-gray-500">3-5 min</span>
            </div>
          </motion.div>

          {/* Thought Sorter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-b-4 border-indigo-500 cursor-pointer transition-all"
            onClick={() => {
              setGameType('thought-sorter');
              setGameStarted(true);
            }}
          >
            <div className="bg-indigo-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thought Sorter</h3>
            <p className="text-gray-600 text-sm mb-4">
              Categorization Tool. Sort your mental inputs—worries, tasks, or reflections—into actionable buckets.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                +3 Serenity / Sort
              </span>
              <span className="text-xs text-gray-500">5-10 min</span>
            </div>
          </motion.div>
        </div>

        {/* Coming Soon Section */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Coming Soon</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Mandala Garden */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 opacity-80"
          >
            <div className="flex items-start gap-4">
              <div className="bg-rose-100 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-500 mb-1">Mandala Garden</h3>
                <p className="text-gray-400 text-sm">
                  Digital coloring for meditative relaxation. Create beautiful patterns while calming your mind.
                </p>
                <span className="inline-block mt-3 text-xs font-medium text-rose-400 bg-rose-50 px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </motion.div>

          {/* Sound Bowl Garden */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 opacity-80"
          >
            <div className="flex items-start gap-4">
              <div className="bg-teal-100 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-500 mb-1">Sound Bowl Garden</h3>
                <p className="text-gray-400 text-sm">
                  Interactive audio mixer with singing bowls and chimes. Create soothing soundscapes for deep calm.
                </p>
                <span className="inline-block mt-3 text-xs font-medium text-teal-400 bg-teal-50 px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Emotion Garden Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 sm:p-6 shadow-md border-2 border-green-200"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">🌱</span>
                Emotion Garden
              </h3>
              <p className="text-gray-700 mb-2 text-sm sm:text-base">
                Your inner world, rendered as a living scene
              </p>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                <li>• Visual representation of your emotional patterns</li>
                <li>• Grows with check-ins and activities</li>
                <li>• See your mental landscape over time</li>
                <li>• Gentle insights into your patterns</li>
              </ul>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmotionGarden(true)}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl font-semibold text-sm sm:text-base touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              View Garden
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
