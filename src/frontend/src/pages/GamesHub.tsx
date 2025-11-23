import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Sparkles, Play, Settings as SettingsIcon, Headphones, Gamepad2 } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../lib/axios';
import SceneSenseGame from '../components/games/SceneSenseGame';
import MindMatchGame from '../components/games/MindMatchGame';
import ThoughtTidyGame from '../components/games/ThoughtTidyGame';
import EmotionGarden from '../components/EmotionGarden';

interface GameProgress {
  totalCredits: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
}

export default function GamesHub() {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState<'scene-sense' | 'mind-match' | 'thought-tidy' | null>(null);
  const [showEmotionGarden, setShowEmotionGarden] = useState(false);
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    loadDailyGame();
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

  const loadDailyGame = async () => {
    try {
      setLoading(true);
      // First check if games are seeded
      let seedStatus;
      try {
        seedStatus = await api.get('/api/games/seed-status');
      } catch (statusError) {
        console.warn('⚠️ Could not check seed status, attempting to seed anyway');
        seedStatus = { data: { seeded: false } };
      }

      // Check if games are seeded - if not, force seeding
      if (!seedStatus.data.seeded || seedStatus.data.questionCount === 0 || seedStatus.data.pairCount === 0) {
        console.log('🌱 Games not seeded, attempting to seed...');
        try {
          const seedResponse = await api.post('/api/games/seed');
          console.log('✅ Games seeded successfully:', seedResponse.data);
          // Wait longer for database to update
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (seedError: any) {
          console.error('❌ Error seeding games:', seedError);
          // Don't return - try to load anyway in case some data exists
        }
      }

      const response = await api.get('/api/games/daily');
      if (response.data.gameType) {
        setGameType(response.data.gameType);
        setProgress(response.data.progress);
        console.log('✅ Daily game loaded:', response.data.gameType);
      } else {
        console.warn('⚠️ No game type returned, but no error');
        // Set a default game type so user can still play
        setGameType('scene-sense');
      }
    } catch (error: any) {
      console.error('❌ Error loading daily game:', error);
      
      // If games aren't seeded, try to seed them
      if (error.response?.status === 500 || error.message?.includes('seed') || error.message?.includes('No game') || error.message?.includes('not available')) {
        try {
          console.log('🌱 Attempting to seed games database...');
          const seedResponse = await api.post('/api/games/seed');
          console.log('✅ Games seeded successfully:', seedResponse.data);
          // Wait longer for database to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Reload after seeding
          const retryResponse = await api.get('/api/games/daily');
          if (retryResponse.data.gameType) {
            setGameType(retryResponse.data.gameType);
            setProgress(retryResponse.data.progress);
          } else {
            // Set default so user can still play
            setGameType('scene-sense');
          }
        } catch (seedError: any) {
          console.error('❌ Error seeding games:', seedError);
          // Set default game type so user can still access games
          setGameType('scene-sense');
        }
      } else if (error.response?.status === 401) {
        // Not authenticated - redirect to login
        navigate('/');
      } else {
        // For other errors, set a default game type so user can still play
        setGameType('scene-sense');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGameComplete = async () => {
    // Refresh progress after game completion
    const response = await api.get('/api/games/progress');
    setProgress(response.data);
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
        {renderHeader()}
        {gameType === 'scene-sense' ? (
          <SceneSenseGame onComplete={handleGameComplete} onExit={() => setGameStarted(false)} />
        ) : gameType === 'mind-match' ? (
          <MindMatchGame onComplete={handleGameComplete} onExit={() => setGameStarted(false)} />
        ) : (
          <ThoughtTidyGame onComplete={handleGameComplete} onExit={() => setGameStarted(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50">
      {renderHeader()}

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-5xl">
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
                <span className="text-sm text-gray-600">Credits</span>
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

        {/* Daily Game Card */}
        {gameType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8"
          >
            <div className={`p-8 ${
              gameType === 'scene-sense'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                : 'bg-gradient-to-r from-purple-500 to-pink-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {gameType === 'scene-sense' ? 'Scene Sense' : 'Mind Match'}
                  </h2>
                  <p className="text-blue-100 text-lg">
                    {gameType === 'scene-sense'
                      ? 'Mental Prep Trivia — Train your mind for any scene'
                      : 'Cognitive Pairing — Pair the moves that shift the moment'}
                  </p>
                </div>
                <div className="text-6xl">
                  {gameType === 'scene-sense' ? '🧠' : '🎯'}
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Today's Challenge</h3>
                <p className="text-gray-600">
                  {gameType === 'scene-sense'
                    ? 'Answer 3-5 questions to build implicit mental performance skills through micro-learning.'
                    : 'Match 3 pairs of cards to reinforce strategy patterns for emotional + cognitive readiness.'}
                </p>
              </div>

              <button
                onClick={() => {
                  console.log('Starting game:', gameType);
                  setGameStarted(true);
                }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-lg hover:from-indigo-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!gameType}
              >
                <Play className="w-6 h-6" />
                Start Game
              </button>
            </div>
          </motion.div>
        )}

        {!gameType && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Game Not Available</h3>
            <p className="text-yellow-800">
              Unable to load today's game. Please refresh the page or try again later.
            </p>
          </motion.div>
        )}

        {/* All Games Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-md"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              Scene Sense
            </h3>
            <ul className="space-y-2 text-gray-600 mb-4">
              <li>• 3-5 questions per session</li>
              <li>• Multiple choice format</li>
              <li>• Immediate feedback</li>
              <li>• Short cinematic micro-teaching</li>
              <li>• Build mental performance skills</li>
            </ul>
            <button
              onClick={() => {
                setGameType('scene-sense');
                setGameStarted(true);
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Play Now
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-md"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Mind Match
            </h3>
            <ul className="space-y-2 text-gray-600 mb-4">
              <li>• 6 face-down cards (3 pairs)</li>
              <li>• Flip 2 cards to match</li>
              <li>• Unlock teaching on match</li>
              <li>• Short cinematic micro-reveal</li>
              <li>• Learn winning skill combinations</li>
            </ul>
            <button
              onClick={() => {
                setGameType('mind-match');
                setGameStarted(true);
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Play Now
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-md"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              Thought Tidy
            </h3>
            <ul className="space-y-2 text-gray-600 mb-4">
              <li>• End-of-day brain declutter</li>
              <li>• Sort thoughts into 3 buckets</li>
              <li>• Keep, Park, or Release</li>
              <li>• Reduce rumination</li>
              <li>• Better sleep preparation</li>
            </ul>
            <button
              onClick={() => {
                setGameType('thought-tidy');
                setGameStarted(true);
              }}
              className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
            >
              Start Tidy
            </button>
          </motion.div>
        </div>

        {/* Emotion Garden Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 sm:p-6 shadow-md border-2 border-green-200"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">🌱</span>
                Emotion Garden
              </h3>
              <p className="text-gray-700 mb-2 text-sm sm:text-base">Your inner world, rendered as a living scene</p>
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
              onClick={() => {
                // Optimize: Pre-load garden state immediately
                setShowEmotionGarden(true);
              }}
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

