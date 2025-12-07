import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X, Sparkles, Film } from 'lucide-react';
import api from '../../lib/axios';

interface ThoughtCard {
  id: string;
  text: string;
  category?: 'keep' | 'park' | 'release';
}

interface ThoughtTidyGameProps {
  onComplete: () => void;
  onExit?: () => void;
}

type Category = 'keep' | 'park' | 'release';

console.log('🎬 ThoughtTidyGame component loaded');

export default function ThoughtTidyGame({ onComplete, onExit }: ThoughtTidyGameProps) {
  const [cards, setCards] = useState<ThoughtCard[]>([]);
  const [draggedCard, setDraggedCard] = useState<ThoughtCard | null>(null);
  const [buckets, setBuckets] = useState<{
    keep: ThoughtCard[];
    park: ThoughtCard[];
    release: ThoughtCard[];
  }>({
    keep: [],
    park: [],
    release: [],
  });
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('thought-tidy-onboarding-seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const response = await api.get('/api/thought-tidy/cards');
      setCards(response.data.cards);
    } catch (error) {
      console.error('Error loading thought cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (card: ThoughtCard) => {
    setDraggedCard(card);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
  };

  const handleDrop = (category: Category, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard) return;

    // Remove card from original location
    setCards(cards.filter(c => c.id !== draggedCard.id));
    
    // Remove from any bucket it might be in
    setBuckets(prev => ({
      keep: prev.keep.filter(c => c.id !== draggedCard.id),
      park: prev.park.filter(c => c.id !== draggedCard.id),
      release: prev.release.filter(c => c.id !== draggedCard.id),
    }));

    // Add to new bucket
    setBuckets(prev => ({
      ...prev,
      [category]: [...prev[category], { ...draggedCard, category }],
    }));

    setDraggedCard(null);
  };

  const handleRemoveFromBucket = (category: Category, cardId: string) => {
    const card = buckets[category].find(c => c.id === cardId);
    if (!card) return;

    // Remove from bucket
    setBuckets(prev => ({
      ...prev,
      [category]: prev[category].filter(c => c.id !== cardId),
    }));

    // Add back to cards
    setCards([...cards, { ...card, category: undefined }]);
  };

  const handleComplete = async () => {
    if (cards.length > 0) {
      // Still have unsorted cards
      return;
    }

    try {
      // Send arrays of strings (thought text) as the backend expects
      const response = await api.post('/api/thought-tidy/submit', {
        kept: buckets.keep.map(card => typeof card === 'string' ? card : card.text || card.id),
        parked: buckets.park.map(card => typeof card === 'string' ? card : card.text || card.id),
        released: buckets.release.map(card => typeof card === 'string' ? card : card.text || card.id),
      });

      setCreditsEarned(response.data.credits || 2);
      setShowSummary(true);

      // Call onComplete after showing summary
      setTimeout(() => {
        onComplete();
      }, 5000);
    } catch (error: any) {
      console.error('Error submitting Thought Tidy:', error);
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to complete Thought Tidy: ${errorMessage}\n\nPlease try again.`);
    }
  };

  // Onboarding Modal
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
        >
          <div className="text-center mb-6">
            <Film className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Thought Tidy</h2>
            <p className="text-gray-600">End-of-day brain declutter</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-teal-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Review Your Thoughts</h3>
                <p className="text-gray-600 text-sm">You'll see thought cards from your day. Drag each one to the right place.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Keep</h3>
                <p className="text-gray-600 text-sm">Things that are meaningful and worth remembering.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-yellow-600 font-bold">P</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Park</h3>
                <p className="text-gray-600 text-sm">Things that need action later - not now, but don't forget.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-1">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Release</h3>
                <p className="text-gray-600 text-sm">Things that don't deserve more mental energy - let them go.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-teal-600 font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Complete & Earn</h3>
                <p className="text-gray-600 text-sm">Once all thoughts are sorted, complete to earn credits and reduce rumination.</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              localStorage.setItem('thought-tidy-onboarding-seen', 'true');
              setShowOnboarding(false);
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all font-semibold"
          >
            Let's Tidy!
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-emerald-900 to-pink-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading your thoughts...</p>
        </div>
      </div>
    );
  }

  if (showSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-900 via-emerald-900 to-pink-900 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            🎬
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-4">Scene Wrapped</h2>
          
          <div className="space-y-3 mb-6 text-white/90">
            <p className="text-lg">
              <span className="font-semibold text-green-300">Kept:</span> {buckets.keep.length} {buckets.keep.length === 1 ? 'thing' : 'things'} that mattered
            </p>
            <p className="text-lg">
              <span className="font-semibold text-yellow-300">Parked:</span> {buckets.park.length} {buckets.park.length === 1 ? 'thing' : 'things'} you'll handle tomorrow
            </p>
            <p className="text-lg">
              <span className="font-semibold text-emerald-300">Released:</span> {buckets.release.length} {buckets.release.length === 1 ? 'thing' : 'things'} that don't get tonight
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-yellow-300 mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-semibold">+{creditsEarned} Credits</span>
          </div>

          <p className="text-white/80 italic text-lg">
            "Scene wrapped. Rest is allowed now."
          </p>
        </motion.div>
      </div>
    );
  }

  const allSorted = cards.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-emerald-900 to-pink-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Exit Button - Always show */}
        <div className="mb-6 flex justify-end">
          {onExit ? (
            <button
              onClick={onExit}
              className="p-2 text-white/80 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              aria-label="Exit Game"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Back to Games</span>
            </button>
          ) : (
            <button
              onClick={() => window.location.href = '/games'}
              className="p-2 text-white/80 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              aria-label="Back to Games"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Back to Games</span>
            </button>
          )}
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Film className="w-8 h-8" />
            Thought Tidy
          </h1>
          <p className="text-white/80 text-lg">Don't go to bed in a messy mind</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm">
              {cards.length} {cards.length === 1 ? 'thought' : 'thoughts'} remaining
            </span>
            {allSorted && (
              <span className="text-green-300 text-sm font-semibold">✓ All sorted!</span>
            )}
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${((cards.length + buckets.keep.length + buckets.park.length + buckets.release.length - cards.length) / (cards.length + buckets.keep.length + buckets.park.length + buckets.release.length)) * 100}%` }}
              className="bg-gradient-to-r from-green-400 to-teal-400 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Thought Cards */}
        {cards.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white/80 text-sm font-semibold mb-4 uppercase tracking-wide">Your Thoughts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card)}
                  onDragEnd={handleDragEnd}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20 cursor-move hover:bg-white/20 active:bg-white/30 transition-all touch-manipulation"
                  whileHover={{ scale: 1.05 }}
                  whileDrag={{ opacity: 0.5, scale: 0.95 }}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <p className="text-white text-sm sm:text-base leading-relaxed">{card.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Buckets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Keep */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop('keep', e)}
            className={`bg-green-500/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 border-2 border-dashed ${
              draggedCard ? 'border-green-400' : 'border-green-500/50'
            } min-h-[180px] sm:min-h-[200px]`}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <h3 className="text-green-300 font-semibold text-lg">Keep</h3>
              <span className="text-green-300/80 text-sm">({buckets.keep.length})</span>
            </div>
            <p className="text-green-200/80 text-xs mb-4">Meaningful / worth remembering</p>
            <div className="space-y-2">
              {buckets.keep.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 rounded-lg p-3 flex items-start justify-between gap-2"
                >
                  <p className="text-white text-xs flex-1">{card.text}</p>
                  <button
                    onClick={() => handleRemoveFromBucket('keep', card.id)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Park */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop('park', e)}
            className={`bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 border-2 border-dashed ${
              draggedCard ? 'border-yellow-400' : 'border-yellow-500/50'
            } min-h-[180px] sm:min-h-[200px]`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Film className="w-5 h-5 text-yellow-300" />
              <h3 className="text-yellow-300 font-semibold text-lg">Park</h3>
              <span className="text-yellow-300/80 text-sm">({buckets.park.length})</span>
            </div>
            <p className="text-yellow-200/80 text-xs mb-4">Needs action later</p>
            <div className="space-y-2">
              {buckets.park.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 rounded-lg p-3 flex items-start justify-between gap-2"
                >
                  <p className="text-white text-xs flex-1">{card.text}</p>
                  <button
                    onClick={() => handleRemoveFromBucket('park', card.id)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Release */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop('release', e)}
            className={`bg-emerald-500/20 backdrop-blur-sm rounded-xl p-4 sm:p-6 border-2 border-dashed ${
              draggedCard ? 'border-emerald-400' : 'border-emerald-500/50'
            } min-h-[180px] sm:min-h-[200px]`}
          >
            <div className="flex items-center gap-2 mb-4">
              <X className="w-5 h-5 text-emerald-300" />
              <h3 className="text-emerald-300 font-semibold text-lg">Release</h3>
              <span className="text-emerald-300/80 text-sm">({buckets.release.length})</span>
            </div>
            <p className="text-emerald-200/80 text-xs mb-4">Doesn't deserve more mental energy</p>
            <div className="space-y-2">
              {buckets.release.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white/10 rounded-lg p-3 flex items-start justify-between gap-2"
                >
                  <p className="text-white text-xs flex-1 line-through opacity-60">{card.text}</p>
                  <button
                    onClick={() => handleRemoveFromBucket('release', card.id)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Complete Button */}
        {allSorted && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleComplete}
            className="w-full sm:w-auto mx-auto block px-8 py-4 sm:py-5 bg-gradient-to-r from-teal-600 to-teal-600 text-white rounded-lg hover:from-teal-700 hover:to-teal-700 active:from-teal-800 active:to-teal-800 transition-all shadow-lg hover:shadow-xl font-semibold text-base sm:text-lg touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Complete Thought Tidy
          </motion.button>
        )}
      </div>
    </div>
  );
}

