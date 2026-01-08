/**
 * Mind Garden - Activities Page
 * 
 * Mental health activities including:
 * - Daily Check-In & Gratitude
 * - Thought Reframing Lab (CBT)
 * - Breathing Garden
 * - Mindful Moments
 * - Games (Thought Popper, Zen Match, Thought Sorter)
 * - Creative Activities (Mandala, Sound Bowls)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Eye,
  Gamepad2,
  Palette,
  ChevronRight,
  Star,
  Sparkles,
  Flower2,
  Brain,
  Wind,
  Cloud,
  Leaf,
  Layers,
  Paintbrush,
  Bell,
  LucideIcon,
  Target,
  Trophy,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';
import api from '../lib/axios';

// Import game components for inline play
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

interface Activity {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  category: 'wellness' | 'mindfulness' | 'games' | 'creative';
  duration?: string;
  growthReward?: string; // What this activity does for your plant
  available: boolean;
  comingSoon?: boolean;
}

const ACTIVITIES: Activity[] = [
  // Wellness Activities
  {
    id: 'daily-checkin',
    name: 'Daily Check-In & Gratitude',
    description: 'Express how you\'re feeling, then plant a seed of gratitude. Voice or text, your privacy is protected.',
    icon: Heart,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-amber-500/20',
    category: 'wellness',
    duration: '2-5 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'thought-reframing',
    name: 'Thought Reframing Lab',
    description: 'CBT-based exercise to challenge and reframe negative thoughts.',
    icon: Brain,
    color: 'text-violet-400',
    gradient: 'from-violet-500/20 to-purple-500/20',
    category: 'wellness',
    duration: '5-10 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'breathing-garden',
    name: 'Breathing Garden',
    description: 'Library of breathing techniques with visual guides.',
    icon: Wind,
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-cyan-500/20',
    category: 'mindfulness',
    duration: '1-10 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'mindful-moments',
    name: 'Mindful Moment Spotter',
    description: 'Daily mindfulness challenges to practice awareness throughout the day.',
    icon: Eye,
    color: 'text-teal-400',
    gradient: 'from-teal-500/20 to-cyan-500/20',
    category: 'mindfulness',
    duration: 'Throughout day',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  // Games
  {
    id: 'thought-popper',
    name: 'Thought Popper',
    description: 'Focus and Mental Clearing Game. Visualize and dismiss intrusive thoughts by popping floating bubbles.',
    icon: Cloud,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    category: 'games',
    duration: '1-2 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'zen-match',
    name: 'Zen Match',
    description: 'Cognitive Concentration Game. Find matching pairs of nature icons to sharpen focus and recall.',
    icon: Leaf,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    category: 'games',
    duration: '3-5 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'thought-sorter',
    name: 'Thought Sorter',
    description: 'Categorization Tool. Sort mental inputs—worries, tasks, or reflections—into Keep, Park, or Let Go.',
    icon: Layers,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-teal-500/20',
    category: 'games',
    duration: '5-10 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  // Creative Activities
  {
    id: 'mandala-garden',
    name: 'Mandala Garden',
    description: 'Digital coloring for meditative relaxation. Create beautiful patterns while calming your mind.',
    icon: Paintbrush,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-pink-500/20',
    category: 'creative',
    duration: '10-20 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
  {
    id: 'sound-bowls',
    name: 'Sound Bowl Sanctuary',
    description: 'Interactive singing bowls. Create layered soundscapes for deep calm and meditation.',
    icon: Bell,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20',
    category: 'creative',
    duration: '5-15 min',
    growthReward: '+1 leaf 🍃',
    available: true,
  },
];

const CATEGORIES = {
  wellness: { label: 'Wellness', icon: Heart },
  mindfulness: { label: 'Mindfulness', icon: Eye },
  games: { label: 'Games', icon: Gamepad2 },
  creative: { label: 'Creative', icon: Palette },
};

export default function Activities() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [gameType, setGameType] = useState<GameType>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
    
    // Check if we should auto-open a game from navigation state
    const state = location.state as { openGame?: GameType } | null;
    if (state?.openGame) {
      setGameType(state.openGame);
      setGameStarted(true);
      // Clear the state to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const filteredActivities = selectedCategory
    ? ACTIVITIES.filter(a => a.category === selectedCategory)
    : ACTIVITIES;

  const startGame = (type: GameType) => {
    setGameType(type);
    setGameStarted(true);
  };

  const handleActivityClick = (activity: Activity) => {
    if (!activity.available) return;
    
    switch (activity.id) {
      case 'daily-checkin':
        navigate('/activities/daily-checkin');
        break;
      case 'thought-reframing':
        startGame('thought-reframing');
        break;
      case 'breathing-garden':
        navigate('/flow/breathing');
        break;
      case 'mindful-moments':
        // Stay on the activities page (this is a daily challenge feature, not flows)
        // For now, navigate to a breathing flow as the main mindful moment
        navigate('/flow/breathing');
        break;
      case 'thought-popper':
        startGame('thought-popper');
        break;
      case 'zen-match':
        startGame('zen-match');
        break;
      case 'thought-sorter':
        startGame('thought-sorter');
        break;
      case 'mandala-garden':
        startGame('mandala');
        break;
      case 'sound-bowls':
        startGame('sound-bowl');
        break;
      default:
        break;
    }
  };

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
      <div className="p-4 md:p-8 pb-32 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
            Activities
          </h1>
          <p className="text-[var(--mg-text-secondary)]">
            Wellness exercises, games, and creative activities to nurture your mind
          </p>
        </div>

        {/* Progress Stats */}
        {progress && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mg-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="w-5 h-5 text-teal-500" />
                <span className="text-sm text-[var(--mg-text-muted)]">Total Activities</span>
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

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              !selectedCategory
                ? 'bg-[var(--mg-accent)] text-white'
                : 'bg-[var(--mg-bg-card)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            All
          </button>
          {Object.entries(CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                selectedCategory === key
                  ? 'bg-[var(--mg-accent)] text-white'
                  : 'bg-[var(--mg-bg-card)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Featured Activity */}
        {!selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  <span className="text-xs sm:text-sm font-medium text-amber-400">Featured</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--mg-text-primary)] mb-2">
                  Daily Check-In
                </h2>
                <p className="text-sm text-[var(--mg-text-secondary)] mb-4 max-w-lg">
                  Two mindful moments: Share how you're feeling, then plant a seed of gratitude. Grows your plant +1 leaf 🍃
                </p>
                <button
                  onClick={() => navigate('/activities/daily-checkin')}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium hover:from-rose-600 hover:to-amber-600 transition-colors text-sm sm:text-base"
                >
                  Begin Check-In
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Flower2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activities Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((activity, i) => (
            <motion.button
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleActivityClick(activity)}
              disabled={!activity.available}
              className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all group ${
                activity.available
                  ? 'mg-card hover:border-[var(--mg-accent)] cursor-pointer'
                  : 'bg-[var(--mg-bg-card)]/50 border-[var(--mg-border)] opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Coming Soon Badge */}
              {activity.comingSoon && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[var(--mg-text-muted)]/20 text-[var(--mg-text-muted)] text-xs font-medium">
                  Coming Soon
                </div>
              )}

              {/* Icon & Category */}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${activity.gradient}`}>
                  <activity.icon className={`w-6 h-6 ${activity.color}`} />
                </div>
                {activity.available && (
                  <div className={`text-xs ${activity.color}`}>
                    {CATEGORIES[activity.category].label}
                  </div>
                )}
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-[var(--mg-text-primary)] mb-1">
                {activity.name}
              </h3>
              <p className="text-sm text-[var(--mg-text-muted)] mb-4 line-clamp-2">
                {activity.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-[var(--mg-text-muted)]">
                  {activity.duration}
                </div>
                {activity.growthReward && activity.available && (
                  <div className="flex items-center gap-1 text-xs text-teal-400">
                    <Leaf className="w-3 h-3" />
                    {activity.growthReward}
                  </div>
                )}
              </div>

              {/* Hover Arrow */}
              {activity.available && (
                <div className="absolute bottom-5 right-5 p-2 rounded-full bg-[var(--mg-bg-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-[var(--mg-accent)]" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Mind Garden Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🌱</div>
              <div>
                <h3 className="text-lg font-bold text-[var(--mg-text-primary)]">
                  Your Mind Garden
                </h3>
                <p className="text-[var(--mg-text-secondary)]">
                  Watch your garden grow with every flow, game, and moment of mindfulness
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-400 transition-colors whitespace-nowrap"
            >
              View Garden
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
