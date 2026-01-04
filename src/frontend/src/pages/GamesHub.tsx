/**
 * Mind Garden - Games Hub
 * 
 * Interactive Serenity Builders
 * Gamified activities and cognitive tools to help manage focus, anxiety, and stress.
 * Each successful interaction contributes to your garden's Serenity Score.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, Target, Sparkles,
  Wind, Leaf, LayoutGrid,
  Palette, Music
} from 'lucide-react';
import api from '../lib/axios';
import DashboardLayout from '../components/Garden/DashboardLayout';
import ThoughtPopperGame from '../components/games/ThoughtPopperGame';
import ZenMatchGame from '../components/games/ZenMatchGame';
import ThoughtSorterGame from '../components/games/ThoughtSorterGame';
import ThoughtReframingLab from '../components/games/ThoughtReframingLab';
import MandalaGame from '../components/games/MandalaGame';
import SoundBowlGame from '../components/games/SoundBowlGame';

interface GameProgress {
  totalCredits: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
}

type GameType = 'thought-popper' | 'zen-match' | 'thought-sorter' | 'thought-reframing' | 'mandala' | 'sound-bowl' | null;

export default function GamesHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gameType, setGameType] = useState<GameType>(null);
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    // Check if we should auto-open a game from navigation state
    const state = location.state as { openGame?: GameType } | null;
    if (state?.openGame) {
      loadProgress();
      setGameType(state.openGame);
      setGameStarted(true);
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    } else {
      // If no game specified, redirect to the unified Activities page
      navigate('/activities', { replace: true });
    }
  }, [location.state, navigate]);

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
      <DashboardLayout activeSection="activities">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-[var(--mg-text-secondary)]">Loading Games Hub...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Render active game full-screen
  if (gameStarted && gameType) {
    return (
      <>
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
        {gameType === 'thought-reframing' && (
          <ThoughtReframingLab 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
        {gameType === 'mandala' && (
          <MandalaGame 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
        {gameType === 'sound-bowl' && (
          <SoundBowlGame 
            onComplete={handleGameComplete} 
            onExit={() => setGameStarted(false)} 
          />
        )}
      </>
    );
  }

  return (
    <DashboardLayout activeSection="activities">
      <div className="p-4 md:p-8 pb-32 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
            Interactive Serenity Builders
          </h1>
          <p className="text-[var(--mg-text-secondary)]">
            Gamified activities to help you manage focus, anxiety, and stress
          </p>
        </div>

        {/* Progress Stats */}
        {progress && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-[var(--mg-text-muted)]">Serenity Score</span>
              </div>
              <p className="text-2xl font-bold text-[var(--mg-text-primary)]">{progress.totalCredits}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-[var(--mg-text-muted)]">Streak</span>
              </div>
              <p className="text-2xl font-bold text-[var(--mg-text-primary)]">{progress.currentStreak}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-[var(--mg-text-muted)]">Best Streak</span>
              </div>
              <p className="text-2xl font-bold text-[var(--mg-text-primary)]">{progress.longestStreak}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                <span className="text-sm text-[var(--mg-text-muted)]">Badges</span>
              </div>
              <p className="text-2xl font-bold text-[var(--mg-text-primary)]">{progress.badges.length}</p>
            </motion.div>
          </div>
        )}

        {/* Serenity Games */}
        <h2 className="text-xl font-bold text-[var(--mg-text-primary)] mb-4">Serenity Games</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Thought Popper */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-blue-500 hover:border-blue-400 transition-all"
            onClick={() => {
              setGameType('thought-popper');
              setGameStarted(true);
            }}
          >
            <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Wind className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-2">Thought Popper</h3>
            <p className="text-[var(--mg-text-muted)] text-sm mb-4">
              Focus and Mental Clearing Game. Pop floating bubbles representing intrusive thoughts.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                +2 Serenity / Pop
              </span>
              <span className="text-xs text-[var(--mg-text-muted)]">1-2 min</span>
            </div>
          </motion.button>

          {/* Zen Match */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-green-500 hover:border-green-400 transition-all"
            onClick={() => {
              setGameType('zen-match');
              setGameStarted(true);
            }}
          >
            <div className="bg-green-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Leaf className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-2">Zen Match</h3>
            <p className="text-[var(--mg-text-muted)] text-sm mb-4">
              Cognitive Concentration Game. Find matching pairs of nature icons.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
                +5 Serenity / Match
              </span>
              <span className="text-xs text-[var(--mg-text-muted)]">3-5 min</span>
            </div>
          </motion.button>

          {/* Thought Sorter */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-teal-500 hover:border-teal-400 transition-all"
            onClick={() => {
              setGameType('thought-sorter');
              setGameStarted(true);
            }}
          >
            <div className="bg-teal-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <LayoutGrid className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-2">Thought Sorter</h3>
            <p className="text-[var(--mg-text-muted)] text-sm mb-4">
              Categorization Tool. Sort thoughts into Keep, Park, or Let Go buckets.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 bg-teal-500/20 px-3 py-1 rounded-full">
                +3 Serenity / Sort
              </span>
              <span className="text-xs text-[var(--mg-text-muted)]">5-10 min</span>
            </div>
          </motion.button>
        </div>

        {/* Cognitive Tools */}
        <h2 className="text-xl font-bold text-[var(--mg-text-primary)] mb-4">Cognitive Tools</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Thought Reframing Lab */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-indigo-500 hover:border-indigo-400 transition-all"
            onClick={() => {
              setGameType('thought-reframing');
              setGameStarted(true);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-1">Thought Reframing Lab</h3>
                <p className="text-[var(--mg-text-muted)] text-sm mb-3">
                  CBT-based cognitive restructuring. Identify distortions and practice balanced thinking.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-full">
                    +5 Serenity / Reframe
                  </span>
                  <span className="text-xs text-[var(--mg-text-muted)]">5-10 min</span>
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Creative Activities */}
        <h2 className="text-xl font-bold text-[var(--mg-text-primary)] mb-4">Creative Activities</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Mandala Garden */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-rose-500 hover:border-rose-400 transition-all"
            onClick={() => {
              setGameType('mandala');
              setGameStarted(true);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="bg-rose-500/20 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Palette className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-1">Mandala Garden</h3>
                <p className="text-[var(--mg-text-muted)] text-sm mb-3">
                  Digital coloring for meditative relaxation. Create beautiful patterns while calming your mind.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full">
                    +3 per section • +20 bonus
                  </span>
                  <span className="text-xs text-[var(--mg-text-muted)]">10-20 min</span>
                </div>
              </div>
            </div>
          </motion.button>

          {/* Sound Bowl Garden */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -5 }}
            className="mg-card p-5 text-left cursor-pointer border-b-4 border-purple-500 hover:border-purple-400 transition-all"
            onClick={() => {
              setGameType('sound-bowl');
              setGameStarted(true);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--mg-text-primary)] mb-1">Sound Bowl Sanctuary</h3>
                <p className="text-[var(--mg-text-muted)] text-sm mb-3">
                  Interactive singing bowls. Create layered soundscapes for deep calm and meditation.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">
                    +2 per strike • +10 bonus
                  </span>
                  <span className="text-xs text-[var(--mg-text-muted)]">5-15 min</span>
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Mind Garden Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🌱</div>
              <div>
                <h3 className="text-lg font-bold text-[var(--mg-text-primary)]">
                  Your Mind Garden
                </h3>
                <p className="text-[var(--mg-text-secondary)] text-sm">
                  See how your activities grow your garden
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-400 transition-colors whitespace-nowrap"
            >
              View Garden
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
