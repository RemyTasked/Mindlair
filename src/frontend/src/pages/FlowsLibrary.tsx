/**
 * Mind Garden - Flows Library
 * 
 * Browse and start all available wellness flows.
 * Organized by category and duration.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Clock,
  Filter,
  Play,
  Star,
  Sparkles,
  Target,
  Zap,
  Wind,
  Sunrise,
  Moon,
} from 'lucide-react';
import DashboardLayout from '../components/Garden/DashboardLayout';

// Flow definitions
interface Flow {
  id: string;
  name: string;
  shortName: string;
  description: string;
  duration: number; // seconds
  category: 'focus' | 'calm' | 'energy' | 'transition' | 'deep';
  bestFor: string[];
  icon: string;
  color: string;
  popular?: boolean;
  new?: boolean;
}

const ALL_FLOWS: Flow[] = [
  // Micro-Flows (90s - 3min)
  {
    id: 'quick-reset',
    name: 'Quick Reset',
    shortName: 'Reset',
    description: 'A rapid 90-second reset to clear your mind between meetings.',
    duration: 90,
    category: 'energy',
    bestFor: ['Between meetings', 'Context switching', 'Mental fatigue'],
    icon: '🔄',
    color: 'from-orange-500 to-amber-500',
    popular: true,
  },
  {
    id: 'breathing',
    name: 'Simple Breathing',
    shortName: 'Breathe',
    description: 'A calming breathing exercise to center your mind.',
    duration: 60,
    category: 'calm',
    bestFor: ['Quick calm', 'Anxiety relief', 'Focus boost'],
    icon: '🌬️',
    color: 'from-sky-500 to-cyan-500',
    popular: true,
  },
  {
    id: 'pre-meeting-focus',
    name: 'Pre-Meeting Focus',
    shortName: 'Focus',
    description: 'Center yourself before any meeting with focused breathing and intention setting.',
    duration: 120,
    category: 'focus',
    bestFor: ['Standard meetings', 'Check-ins', 'One-on-ones'],
    icon: '🎯',
    color: 'from-sky-500 to-teal-500',
    popular: true,
  },
  {
    id: 'pre-presentation-power',
    name: 'Pre-Presentation Power',
    shortName: 'Power Up',
    description: 'Build confidence and presence before presentations, pitches, and speeches.',
    duration: 180,
    category: 'energy',
    bestFor: ['Presentations', 'Pitches', 'Demos', 'Interviews'],
    icon: '⚡',
    color: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'difficult-conversation-prep',
    name: 'Difficult Conversation Prep',
    shortName: 'Ground',
    description: 'Ground yourself before challenging discussions with emotional regulation.',
    duration: 180,
    category: 'calm',
    bestFor: ['Performance reviews', 'Conflicts', 'Hard feedback'],
    icon: '🌿',
    color: 'from-emerald-500 to-green-500',
  },
  {
    id: 'post-meeting-decompress',
    name: 'Post-Meeting Decompress',
    shortName: 'Decompress',
    description: 'Release tension and transition after difficult or long meetings.',
    duration: 120,
    category: 'calm',
    bestFor: ['After difficult meetings', 'After long meetings'],
    icon: '🌊',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'end-of-day-transition',
    name: 'End-of-Day Transition',
    shortName: 'Transition',
    description: 'Create a mental boundary between work and personal life.',
    duration: 180,
    category: 'transition',
    bestFor: ['After work', 'Before commute', 'Work-from-home'],
    icon: '🌅',
    color: 'from-orange-500 to-rose-500',
  },
  // Extended Flows (5-15min)
  {
    id: 'morning-intention',
    name: 'Morning Intention',
    shortName: 'Morning',
    description: 'Start your day with gratitude, intention setting, and gentle energizing.',
    duration: 600, // 10 min
    category: 'transition',
    bestFor: ['Morning routine', 'Daily start', 'Setting intentions'],
    icon: '☀️',
    color: 'from-amber-400 to-orange-500',
    new: true,
  },
  {
    id: 'evening-wind-down',
    name: 'Evening Wind-Down',
    shortName: 'Wind Down',
    description: 'Transition from work mode with body scan, reflection, and sleep preparation.',
    duration: 900, // 15 min
    category: 'transition',
    bestFor: ['Evening routine', 'Before sleep', 'Day reflection'],
    icon: '🌙',
    color: 'from-slate-500 to-slate-600',
    new: true,
  },
  {
    id: 'weekend-wellness',
    name: 'Weekend Wellness',
    shortName: 'Weekend',
    description: 'Longer meditation session for weekends with week reflection and self-compassion.',
    duration: 1200, // 20 min
    category: 'deep',
    bestFor: ['Weekends', 'Deep relaxation', 'Self-care'],
    icon: '🧘',
    color: 'from-teal-500 to-emerald-500',
    new: true,
  },
  // Deep Sessions (20-45min)
  {
    id: 'deep-breath-meditation',
    name: 'Deep Breath Meditation',
    shortName: 'Deep Breath',
    description: 'Extended breath-focused meditation for profound calm.',
    duration: 1200, // 20 min
    category: 'deep',
    bestFor: ['Deep relaxation', 'Stress relief', 'Mental clarity'],
    icon: '🍃',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'body-scan',
    name: 'Full Body Scan',
    shortName: 'Body Scan',
    description: 'Complete body awareness meditation for tension release.',
    duration: 1500, // 25 min
    category: 'deep',
    bestFor: ['Physical tension', 'Awareness', 'Relaxation'],
    icon: '✨',
    color: 'from-rose-500 to-pink-500',
  },
];

// Category metadata
const CATEGORIES = {
  focus: { label: 'Focus', icon: Target, color: 'text-sky-400' },
  calm: { label: 'Calm', icon: Wind, color: 'text-sky-400' },
  energy: { label: 'Energy', icon: Zap, color: 'text-amber-400' },
  transition: { label: 'Transition', icon: Sunrise, color: 'text-orange-400' },
  deep: { label: 'Deep', icon: Moon, color: 'text-violet-400' },
};

// Duration filters
const DURATION_FILTERS = [
  { label: 'All', max: Infinity },
  { label: '< 2 min', max: 120 },
  { label: '2-5 min', max: 300 },
  { label: '5-15 min', max: 900 },
  { label: '15+ min', max: Infinity, min: 900 },
];

export default function FlowsLibrary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter flows
  const filteredFlows = useMemo(() => {
    return ALL_FLOWS.filter(flow => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!flow.name.toLowerCase().includes(query) && 
            !flow.description.toLowerCase().includes(query) &&
            !flow.bestFor.some(b => b.toLowerCase().includes(query))) {
          return false;
        }
      }
      
      // Category filter
      if (selectedCategory && flow.category !== selectedCategory) {
        return false;
      }
      
      // Duration filter
      const durationFilter = DURATION_FILTERS[selectedDuration];
      if (durationFilter.min && flow.duration < durationFilter.min) {
        return false;
      }
      if (durationFilter.max !== Infinity && flow.duration > durationFilter.max) {
        return false;
      }
      
      return true;
    });
  }, [searchQuery, selectedCategory, selectedDuration]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} min`;
    return `${mins}m ${secs}s`;
  };

  return (
    <DashboardLayout activeSection="flows">
      <div className="p-4 md:p-8 pb-32 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--mg-text-primary)] mb-2">
            Flow Library
          </h1>
          <p className="text-[var(--mg-text-secondary)]">
            Choose a flow to grow your garden and cultivate focus
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--mg-text-muted)]" />
            <input
              type="text"
              placeholder="Search flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)] text-[var(--mg-text-primary)] placeholder-[var(--mg-text-muted)] focus:outline-none focus:border-[var(--mg-accent)]"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              showFilters || selectedCategory || selectedDuration > 0
                ? 'bg-[var(--mg-accent)]/20 border-[var(--mg-accent)] text-[var(--mg-accent)]'
                : 'bg-[var(--mg-bg-card)] border-[var(--mg-border)] text-[var(--mg-text-secondary)]'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]"
          >
            {/* Categories */}
            <div className="mb-4">
              <label className="text-sm font-medium text-[var(--mg-text-secondary)] mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    !selectedCategory
                      ? 'bg-[var(--mg-accent)] text-white'
                      : 'bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
                  }`}
                >
                  All
                </button>
                {Object.entries(CATEGORIES).map(([key, { label, icon: Icon, color }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedCategory === key
                        ? 'bg-[var(--mg-accent)] text-white'
                        : 'bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${selectedCategory !== key ? color : ''}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-[var(--mg-text-secondary)] mb-2 block">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_FILTERS.map((filter, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDuration(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedDuration === i
                        ? 'bg-[var(--mg-accent)] text-white'
                        : 'bg-[var(--mg-bg-primary)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Popular Section */}
        {!searchQuery && !selectedCategory && selectedDuration === 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[var(--mg-text-primary)] mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Popular Flows
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {ALL_FLOWS.filter(f => f.popular).map((flow, i) => (
                <motion.button
                  key={flow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate(`/flow/${flow.id}`)}
                  className={`relative overflow-hidden rounded-2xl p-5 text-left bg-gradient-to-br ${flow.color} group`}
                >
                  <div className="relative z-10">
                    <span className="text-3xl">{flow.icon}</span>
                    <h3 className="text-lg font-bold text-white mt-2">{flow.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-white/80 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(flow.duration)}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 p-2 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* New Flows Section */}
        {!searchQuery && !selectedCategory && selectedDuration === 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[var(--mg-text-primary)] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              New Extended Flows
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {ALL_FLOWS.filter(f => f.new).map((flow, i) => (
                <motion.button
                  key={flow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => navigate(`/flow/${flow.id}`)}
                  className="mg-card hover:border-[var(--mg-accent)] transition-colors text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{flow.icon}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                      NEW
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--mg-text-primary)]">{flow.name}</h3>
                  <p className="text-sm text-[var(--mg-text-muted)] mt-1 mb-3 line-clamp-2">
                    {flow.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--mg-text-secondary)] text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(flow.duration)}</span>
                    </div>
                    <div className="p-2 rounded-full bg-[var(--mg-bg-primary)] group-hover:bg-[var(--mg-accent)]/20 transition-colors">
                      <Play className="w-4 h-4 text-[var(--mg-accent)]" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* All Flows Grid */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--mg-text-primary)] mb-4">
            {searchQuery || selectedCategory || selectedDuration > 0 
              ? `${filteredFlows.length} Flow${filteredFlows.length !== 1 ? 's' : ''} Found`
              : 'All Flows'}
          </h2>
          
          {filteredFlows.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlows.map((flow, i) => {
                const CategoryIcon = CATEGORIES[flow.category].icon;
                
                return (
                  <motion.button
                    key={flow.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/flow/${flow.id}`)}
                    className="mg-card hover:border-[var(--mg-accent)] transition-colors text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{flow.icon}</span>
                      <div className={`flex items-center gap-1 ${CATEGORIES[flow.category].color}`}>
                        <CategoryIcon className="w-4 h-4" />
                        <span className="text-xs">{CATEGORIES[flow.category].label}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-[var(--mg-text-primary)]">{flow.name}</h3>
                    <p className="text-sm text-[var(--mg-text-muted)] mt-1 mb-3 line-clamp-2">
                      {flow.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[var(--mg-text-secondary)] text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(flow.duration)}</span>
                      </div>
                      <div className="p-2 rounded-full bg-[var(--mg-bg-primary)] group-hover:bg-[var(--mg-accent)]/20 transition-colors">
                        <Play className="w-4 h-4 text-[var(--mg-accent)]" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-[var(--mg-text-muted)] opacity-50" />
              <p className="text-[var(--mg-text-muted)]">No flows match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                  setSelectedDuration(0);
                }}
                className="mt-4 text-[var(--mg-accent)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

