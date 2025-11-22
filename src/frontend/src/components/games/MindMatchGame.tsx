import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, RotateCcw } from 'lucide-react';
import api from '../../lib/axios';

interface Pair {
  id: string;
  cardA: string;
  cardB: string;
  domain: string;
  difficulty: number;
  microTeach: string;
}

interface MindMatchGameProps {
  onComplete: (credits: number, streak: number) => void;
}

interface Card {
  id: string;
  text: string;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MindMatchGame({ onComplete }: MindMatchGameProps) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [showMicroTeach, setShowMicroTeach] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    loadPairs();
  }, []);

  const loadPairs = async () => {
    try {
      const response = await api.get('/api/games/mind-match/pairs');
      let loadedPairs = response.data.pairs || [];
      
      if (loadedPairs.length === 0) {
        console.error('No pairs available. Attempting to seed database...');
        // Try to seed the database
        try {
          await api.post('/api/games/seed');
          // Reload pairs after seeding
          const retryResponse = await api.get('/api/games/mind-match/pairs');
          const retryPairs = retryResponse.data.pairs || [];
          if (retryPairs.length > 0) {
            loadedPairs = retryPairs;
          } else {
            setLoading(false);
            return;
          }
        } catch (seedError) {
          console.error('Error seeding games:', seedError);
          setLoading(false);
          return;
        }
      }
      
      setPairs(loadedPairs);

      // Create cards from pairs (2 cards per pair)
      const newCards: Card[] = [];
      loadedPairs.forEach((pair: Pair) => {
        newCards.push({
          id: `${pair.id}-A`,
          text: pair.cardA,
          pairId: pair.id,
          isFlipped: false,
          isMatched: false,
        });
        newCards.push({
          id: `${pair.id}-B`,
          text: pair.cardB,
          pairId: pair.id,
          isFlipped: false,
          isMatched: false,
        });
      });

      // Shuffle cards
      const shuffled = newCards.sort(() => Math.random() - 0.5);
      setCards(shuffled);
    } catch (error: any) {
      console.error('Error loading pairs:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) {
      return;
    }

    // Flip card
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    setCards(cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    // If two cards are flipped, check for match
    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      checkMatch(newFlipped);
    }
  };

  const checkMatch = (flippedIds: string[]) => {
    const [card1, card2] = flippedIds.map(id => cards.find(c => c.id === id)!);
    
    // Check if they belong to the same pair
    if (card1.pairId === card2.pairId) {
      // Match!
      setTimeout(() => {
        setMatchedPairs(new Set([...matchedPairs, card1.pairId]));
        setCards(cards.map(c =>
          flippedIds.includes(c.id) ? { ...c, isMatched: true, isFlipped: true } : c
        ));
        setFlippedCards([]);

        // Show micro-teaching for this pair
        const pair = pairs.find(p => p.id === card1.pairId);
        if (pair) {
          setShowMicroTeach(pair.microTeach);

          // Submit match to backend
          api.post('/api/games/mind-match/submit', {
            pairId: pair.id,
            matchedPairs: matchedPairs.size + 1,
            totalPairs: pairs.length,
            perfectScore: matchedPairs.size + 1 === pairs.length,
          }).catch(console.error);

          // Check if game is complete
          if (matchedPairs.size + 1 === pairs.length) {
            finishGame();
          }
        }
      }, 500);
    } else {
      // No match - flip back
      setTimeout(() => {
        setCards(cards.map(c =>
          flippedIds.includes(c.id) ? { ...c, isFlipped: false } : c
        ));
        setFlippedCards([]);
      }, 1000);
    }
  };

  const finishGame = async () => {
    const totalCredits = matchedPairs.size + 1 + 3; // 1 per match + 3 bonus for perfect

    try {
      const response = await api.post('/api/games/mind-match/submit', {
        pairId: pairs[pairs.length - 1].id,
        matchedPairs: matchedPairs.size + 1,
        totalPairs: pairs.length,
        perfectScore: true,
      });

      setCreditsEarned(totalCredits);
      setGameComplete(true);

      // Call onComplete after a delay
      setTimeout(() => {
        onComplete(totalCredits, response.data.streak || 0);
      }, 3000);
    } catch (error) {
      console.error('Error finishing game:', error);
      onComplete(totalCredits, 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pairs...</p>
        </div>
      </div>
    );
  }

  if (pairs.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Pairs Available</h2>
          <p className="text-gray-600 mb-4">
            The game database hasn't been seeded yet. Please contact support or check the backend logs.
          </p>
          <button
            onClick={() => window.location.href = '/games'}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Games Hub
          </button>
        </div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Perfect Match!</h2>
          <p className="text-xl text-gray-600 mb-4">
            Matched all {pairs.length} pairs in {moves} moves
          </p>
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-6">
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-semibold">+{creditsEarned} Credits</span>
          </div>
          <p className="text-gray-500">Returning to Games Hub...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Stats */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mind Match</h2>
            <p className="text-gray-600">Match the pairs that work together</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Moves</p>
            <p className="text-2xl font-bold text-indigo-600">{moves}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Matched: {matchedPairs.size} / {pairs.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(matchedPairs.size / pairs.length) * 100}%` }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isFlipped || card.isMatched}
              className={`aspect-[4/3] rounded-xl p-4 font-semibold text-sm sm:text-base transition-all ${
                card.isMatched
                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                  : card.isFlipped
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 hover:from-gray-300 hover:to-gray-400'
              } ${card.isFlipped || card.isMatched ? 'cursor-default' : 'cursor-pointer'}`}
              whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
              whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
            >
              <div className="h-full flex items-center justify-center">
                {card.isFlipped || card.isMatched ? (
                  <motion.div
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    className="text-center"
                  >
                    {card.isMatched && <CheckCircle className="w-6 h-6 mx-auto mb-2" />}
                    <p className="leading-tight">{card.text}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 0 }}
                    className="text-4xl"
                  >
                    ?
                  </motion.div>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Micro Teaching */}
        <AnimatePresence>
          {showMicroTeach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 mb-6 border-l-4 border-purple-500"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Micro-Teaching</h3>
              <p className="text-gray-700 leading-relaxed italic">
                {showMicroTeach}
              </p>
              <button
                onClick={() => setShowMicroTeach(null)}
                className="mt-4 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Continue matching
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

