/**
 * Mind Garden - Gratitude Garden
 * 
 * Daily journaling activity that plants golden flowers in the garden.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Heart,
} from 'lucide-react';
import api from '../lib/axios';

interface GratitudeEntry {
  id: string;
  content: string;
  createdAt: string;
  mood?: string;
}

// Gratitude prompts for inspiration
const PROMPTS = [
  "What made you smile today?",
  "Who are you thankful for?",
  "What small pleasure did you enjoy today?",
  "What challenge helped you grow recently?",
  "What are you looking forward to?",
  "What about your body are you grateful for?",
  "What skill or ability are you thankful to have?",
  "What moment of peace did you experience today?",
  "Who showed you kindness recently?",
  "What beauty did you notice today?",
];

export default function GratitudeGarden() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(PROMPTS[0]);
  const [viewMode, setViewMode] = useState<'write' | 'history'>('write');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [streak, setStreak] = useState(0);

  // Load entries
  useEffect(() => {
    loadEntries();
    // Randomize prompt
    setCurrentPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      // For now, we'll use local storage
      const stored = localStorage.getItem('mindgarden_gratitude_entries');
      if (stored) {
        setEntries(JSON.parse(stored));
        calculateStreak(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (entriesList: GratitudeEntry[]) => {
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort by date descending
    const sorted = [...entriesList].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Check consecutive days
    for (let i = 0; i < sorted.length; i++) {
      const entryDate = new Date(sorted[i].createdAt);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - currentStreak);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0 && entryDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow for yesterday if no entry today yet
        currentStreak = 0;
      } else {
        break;
      }
    }
    
    setStreak(currentStreak);
  };

  const handleSubmit = async () => {
    if (!currentEntry.trim()) return;

    setSaving(true);
    try {
      const newEntry: GratitudeEntry = {
        id: `gratitude-${Date.now()}`,
        content: currentEntry.trim(),
        createdAt: new Date().toISOString(),
        mood: selectedMood || undefined,
      };

      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      localStorage.setItem('mindgarden_gratitude_entries', JSON.stringify(updatedEntries));
      
      // Try to save to backend
      try {
        await api.post('/api/garden/checkin', {
          emotion: 'gratitude',
          intensity: 8,
          notes: currentEntry.trim(),
        });
      } catch (apiError) {
        console.warn('Could not save to backend:', apiError);
      }

      setCurrentEntry('');
      setSelectedMood(null);
      setShowSuccess(true);
      calculateStreak(updatedEntries);
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRandomPrompt = () => {
    const newPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setCurrentPrompt(newPrompt);
  };

  const todayEntry = entries.find(e => {
    const entryDate = new Date(e.createdAt);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  // Get entries for selected date
  const entriesForDate = entries.filter(e => {
    const entryDate = new Date(e.createdAt);
    return entryDate.toDateString() === selectedDate.toDateString();
  });

  const moods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😌', label: 'Peaceful' },
    { emoji: '🥰', label: 'Loved' },
    { emoji: '🌟', label: 'Inspired' },
    { emoji: '💪', label: 'Strong' },
  ];

  return (
    <div className="min-h-screen bg-[var(--mg-bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--mg-bg-secondary)] border-b border-[var(--mg-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/activities')}
            className="flex items-center gap-2 text-[var(--mg-text-secondary)] hover:text-[var(--mg-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="text-2xl">✨</div>
            <h1 className="text-lg font-semibold text-[var(--mg-text-primary)]">
              Gratitude Garden
            </h1>
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'write' ? 'history' : 'write')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--mg-bg-card)] text-[var(--mg-text-secondary)] hover:text-[var(--mg-text-primary)] transition-colors"
          >
            {viewMode === 'write' ? (
              <>
                <Calendar className="w-4 h-4" />
                <span className="text-sm">History</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Write</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Streak Banner */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔥</div>
                <div>
                  <div className="text-lg font-bold text-amber-400">{streak} Day Streak!</div>
                  <div className="text-sm text-[var(--mg-text-muted)]">
                    Keep going to grow more golden flowers
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === 'write' ? (
          <>
            {/* Today's Status */}
            {todayEntry && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/20">
                    <Flower2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-400 mb-1">
                      You planted a golden flower today! 🌟
                    </h3>
                    <p className="text-sm text-[var(--mg-text-secondary)] line-clamp-2">
                      "{todayEntry.content}"
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Prompt Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--mg-text-muted)]">Today's Prompt</span>
                <button
                  onClick={getRandomPrompt}
                  className="text-xs text-[var(--mg-accent)] hover:underline"
                >
                  New prompt
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
                <p className="text-lg text-[var(--mg-text-primary)] italic">
                  "{currentPrompt}"
                </p>
              </div>
            </motion.div>

            {/* Journal Entry */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <label className="text-sm text-[var(--mg-text-muted)] mb-2 block">
                What are you grateful for?
              </label>
              <textarea
                value={currentEntry}
                onChange={(e) => setCurrentEntry(e.target.value)}
                placeholder="Write your thoughts here..."
                rows={5}
                className="w-full p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)] text-[var(--mg-text-primary)] placeholder-[var(--mg-text-muted)] focus:outline-none focus:border-[var(--mg-accent)] resize-none"
              />
            </motion.div>

            {/* Mood Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <label className="text-sm text-[var(--mg-text-muted)] mb-3 block">
                How are you feeling? (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => setSelectedMood(selectedMood === mood.label ? null : mood.label)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                      selectedMood === mood.label
                        ? 'bg-[var(--mg-accent)] text-white'
                        : 'bg-[var(--mg-bg-card)] text-[var(--mg-text-secondary)] hover:bg-[var(--mg-accent)]/20'
                    }`}
                  >
                    <span className="text-xl">{mood.emoji}</span>
                    <span className="text-sm">{mood.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleSubmit}
              disabled={!currentEntry.trim() || saving}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                'Planting...'
              ) : (
                <>
                  <Flower2 className="w-5 h-5" />
                  Plant a Golden Flower
                </>
              )}
            </motion.button>

            {/* Tips */}
            <div className="mt-8 p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
              <h4 className="font-medium text-[var(--mg-text-primary)] mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Gratitude Tips
              </h4>
              <ul className="text-sm text-[var(--mg-text-muted)] space-y-1">
                <li>• Be specific - "My morning coffee" vs "food"</li>
                <li>• Include people, moments, and small pleasures</li>
                <li>• Notice things you usually take for granted</li>
                <li>• Write at the same time each day for habit</li>
              </ul>
            </div>
          </>
        ) : (
          /* History View */
          <div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-[var(--mg-text-primary)]">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 rounded-lg hover:bg-[var(--mg-bg-card)] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid (simplified) */}
            <div className="grid grid-cols-7 gap-1 mb-6">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-[var(--mg-text-muted)] py-2">
                  {day}
                </div>
              ))}
              {generateCalendarDays(selectedDate, entries).map((day, i) => (
                <button
                  key={i}
                  onClick={() => day.date && setSelectedDate(day.date)}
                  disabled={!day.date}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-colors ${
                    day.isToday
                      ? 'bg-[var(--mg-accent)] text-white'
                      : day.hasEntry
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : day.date
                      ? 'hover:bg-[var(--mg-bg-card)] text-[var(--mg-text-secondary)]'
                      : 'text-transparent'
                  }`}
                >
                  {day.day || ''}
                  {day.hasEntry && !day.isToday && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Entries List */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-[var(--mg-text-muted)]">
                {selectedDate.toDateString() === new Date().toDateString()
                  ? "Today's Entries"
                  : `Entries for ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
              </h3>
              
              {entriesForDate.length > 0 ? (
                entriesForDate.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl">✨</div>
                      <div className="flex-1">
                        <p className="text-[var(--mg-text-primary)]">{entry.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--mg-text-muted)]">
                          <span>
                            {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {entry.mood && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--mg-bg-primary)]">
                              {entry.mood}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--mg-text-muted)]">
                  <Flower2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No entries for this day</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
                <div className="text-2xl font-bold text-amber-400">{entries.length}</div>
                <div className="text-sm text-[var(--mg-text-muted)]">Total Entries</div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
                <div className="text-2xl font-bold text-emerald-400">{streak}</div>
                <div className="text-sm text-[var(--mg-text-muted)]">Day Streak</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/90 to-yellow-500/90 text-white text-center"
            >
              <div className="text-6xl mb-4">🌟</div>
              <h2 className="text-2xl font-bold mb-2">Beautiful!</h2>
              <p>A golden flower has been planted in your garden</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to generate calendar days
function generateCalendarDays(date: Date, entries: GratitudeEntry[]) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  
  const days: Array<{
    day: number | null;
    date: Date | null;
    hasEntry: boolean;
    isToday: boolean;
  }> = [];
  
  // Pad start
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push({ day: null, date: null, hasEntry: false, isToday: false });
  }
  
  // Days of month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const currentDate = new Date(year, month, d);
    const hasEntry = entries.some(e => {
      const entryDate = new Date(e.createdAt);
      return entryDate.toDateString() === currentDate.toDateString();
    });
    
    days.push({
      day: d,
      date: currentDate,
      hasEntry,
      isToday: currentDate.toDateString() === today.toDateString(),
    });
  }
  
  return days;
}

