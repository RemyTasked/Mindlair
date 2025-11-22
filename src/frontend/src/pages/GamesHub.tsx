import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Zap, Target, Sparkles, Play } from 'lucide-react';
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

  useEffect(() => {
    loadDailyGame();
  }, []);

  const loadDailyGame = async () => {
    try {
      const response = await api.get('/api/games/daily');
      setGameType(response.data.gameType);
      setProgress(response.data.progress);
      console.log('✅ Daily game loaded:', response.data.gameType);
    } catch (error: any) {
      console.error('❌ Error loading daily game:', error);
      // Show error to user
      if (error.response?.status === 401) {
        // Not authenticated - redirect to login
        navigate('/');
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

  if (showEmotionGarden) {
    return <EmotionGarden />;
  }

  if (gameStarted && gameType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50">
        {gameType === 'scene-sense' ? (
          <SceneSenseGame onComplete={handleGameComplete} />
        ) : gameType === 'mind-match' ? (
          <MindMatchGame onComplete={handleGameComplete} />
        ) : (
          <ThoughtTidyGame onComplete={handleGameComplete} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-teal-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Games Hub</h1>
            </div>
          </div>
        </div>
      </header>

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
          className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 shadow-md border-2 border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-3xl">🌱</span>
                Emotion Garden
              </h3>
              <p className="text-gray-700 mb-2">Your inner world, rendered as a living scene</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Visual representation of your emotional patterns</li>
                <li>• Grows with check-ins and activities</li>
                <li>• See your mental landscape over time</li>
                <li>• Gentle insights into your patterns</li>
              </ul>
            </div>
            <button
              onClick={() => setShowEmotionGarden(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              View Garden
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

