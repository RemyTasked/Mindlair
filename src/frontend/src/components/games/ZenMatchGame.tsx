/**
 * Mind Garden - Zen Match Game
 * 
 * Cognitive Concentration Game
 * Classic memory game with nature-themed icons to sharpen focus.
 * Now with expanded variety and Harmony Levels!
 * Each completed game adds +1 leaf to your growing plant!
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Sparkles, Leaf, Sun, Cloud, CloudRain, 
  Wind, Flower2, Moon, Star, Snowflake, Droplets,
  Mountain, TreeDeciduous, Bird, Feather, Shell, Heart, Waves,
  Sprout, TreePine, Sunrise, Sunset, Umbrella, CloudSun,
  Gem, Flame, Zap, Globe, Palmtree, Clover, Cherry
} from 'lucide-react';

interface ZenMatchGameProps {
  onComplete: (credits: number, streak: number) => void;
  onExit?: () => void;
}

interface Card {
  id: string;
  iconType: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// Expanded pool of nature-themed icons for variety
const ALL_ICON_CONFIGS = [
  // Weather & Sky
  { type: 'sun', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
  { type: 'moon', icon: Moon, color: 'text-slate-400', bg: 'bg-slate-50' },
  { type: 'star', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { type: 'cloud', icon: Cloud, color: 'text-sky-400', bg: 'bg-sky-50' },
  { type: 'rain', icon: CloudRain, color: 'text-sky-500', bg: 'bg-sky-50' },
  { type: 'snow', icon: Snowflake, color: 'text-cyan-400', bg: 'bg-cyan-50' },
  { type: 'wind', icon: Wind, color: 'text-teal-400', bg: 'bg-teal-50' },
  { type: 'sunrise', icon: Sunrise, color: 'text-orange-400', bg: 'bg-orange-50' },
  { type: 'sunset', icon: Sunset, color: 'text-rose-400', bg: 'bg-rose-50' },
  { type: 'cloudsun', icon: CloudSun, color: 'text-amber-400', bg: 'bg-amber-50' },
  { type: 'umbrella', icon: Umbrella, color: 'text-blue-400', bg: 'bg-blue-50' },
  // Nature Elements
  { type: 'flower', icon: Flower2, color: 'text-pink-400', bg: 'bg-pink-50' },
  { type: 'leaf', icon: Leaf, color: 'text-green-500', bg: 'bg-green-50' },
  { type: 'tree', icon: TreeDeciduous, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { type: 'pine', icon: TreePine, color: 'text-green-700', bg: 'bg-green-50' },
  { type: 'mountain', icon: Mountain, color: 'text-slate-500', bg: 'bg-slate-50' },
  { type: 'sprout', icon: Sprout, color: 'text-lime-500', bg: 'bg-lime-50' },
  { type: 'palm', icon: Palmtree, color: 'text-green-600', bg: 'bg-green-50' },
  { type: 'clover', icon: Clover, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { type: 'cherry', icon: Cherry, color: 'text-red-400', bg: 'bg-red-50' },
  // Water
  { type: 'droplet', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  { type: 'waves', icon: Waves, color: 'text-blue-400', bg: 'bg-blue-50' },
  { type: 'shell', icon: Shell, color: 'text-orange-400', bg: 'bg-orange-50' },
  // Creatures
  { type: 'bird', icon: Bird, color: 'text-sky-500', bg: 'bg-sky-50' },
  { type: 'feather', icon: Feather, color: 'text-gray-500', bg: 'bg-gray-50' },
  // Elements & Energy
  { type: 'gem', icon: Gem, color: 'text-purple-500', bg: 'bg-purple-50' },
  { type: 'flame', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { type: 'zap', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { type: 'globe', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
  // Feelings
  { type: 'heart', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
];

// Harmony levels with increasing difficulty
const HARMONY_LEVELS = [
  { name: 'Calm', pairs: 6, description: 'A gentle start' },
  { name: 'Focused', pairs: 8, description: 'Building concentration' },
  { name: 'Centered', pairs: 10, description: 'Deep focus mode' },
  { name: 'Enlightened', pairs: 12, description: 'High focus' },
  { name: 'Transcendent', pairs: 14, description: 'Push your limits' },
  { name: 'Master', pairs: 16, description: 'Ultimate memory challenge' },
];

// Icon themes for variety
const ICON_THEMES = {
  nature: {
    name: 'Nature',
    emoji: '🌿',
    icons: ['sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'sunrise', 'sunset', 'cloudsun', 'flower', 'leaf', 'tree', 'pine', 'mountain', 'sprout'],
  },
  cosmic: {
    name: 'Cosmic',
    emoji: '✨',
    icons: ['star', 'moon', 'sun', 'gem', 'zap', 'globe', 'sunrise', 'sunset', 'wind', 'snow', 'cloud', 'rain', 'flame', 'heart', 'feather', 'droplet'],
  },
  ocean: {
    name: 'Ocean',
    emoji: '🌊',
    icons: ['waves', 'droplet', 'shell', 'cloud', 'rain', 'wind', 'sun', 'moon', 'star', 'bird', 'feather', 'palm', 'sunrise', 'sunset', 'fish', 'umbrella'],
  },
  wellness: {
    name: 'Wellness',
    emoji: '🧘',
    icons: ['heart', 'flower', 'leaf', 'sprout', 'sun', 'moon', 'star', 'clover', 'cherry', 'gem', 'feather', 'bird', 'tree', 'mountain', 'waves', 'droplet'],
  },
};

// Game rewards: +1 leaf for completing any level

export default function ZenMatchGame({ onComplete, onExit }: ZenMatchGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [harmonyLevel, setHarmonyLevel] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showThemeSelect, setShowThemeSelect] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof ICON_THEMES>('nature');

  const currentLevel = HARMONY_LEVELS[harmonyLevel];
  const numPairs = currentLevel.pairs;

  useEffect(() => {
    if (selectedLevel !== null) {
      initializeGame();
    }
  }, [selectedLevel]);

  const initializeGame = () => {
    const level = selectedLevel !== null ? selectedLevel : harmonyLevel;
    const pairs = HARMONY_LEVELS[level].pairs;
    
    // Filter icons based on selected theme
    const themeIconTypes = ICON_THEMES[selectedTheme].icons;
    const filteredIcons = ALL_ICON_CONFIGS.filter(config => themeIconTypes.includes(config.type));
    
    // Select random icons for this game from the filtered set
    const shuffledIcons = [...filteredIcons].sort(() => Math.random() - 0.5);
    const selectedIcons = shuffledIcons.slice(0, pairs);
    
    // Create pairs of cards
    const newCards: Card[] = [];
    selectedIcons.forEach((config, index) => {
      newCards.push({ id: `a-${index}`, iconType: config.type, isFlipped: false, isMatched: false });
      newCards.push({ id: `b-${index}`, iconType: config.type, isFlipped: false, isMatched: false });
    });
    // Shuffle cards
    newCards.sort(() => Math.random() - 0.5);
    setCards(newCards);
    setMatchedPairs(new Set());
    setFlippedCards([]);
    setMoves(0);
    setGameComplete(false);
  };

  const handleLevelSelect = (level: number) => {
    setHarmonyLevel(level);
    setSelectedLevel(level);
    setShowLevelSelect(false);
    setShowThemeSelect(true); // Show theme selection after level
  };

  const handleThemeSelect = (theme: keyof typeof ICON_THEMES) => {
    setSelectedTheme(theme);
    setShowThemeSelect(false);
    setShowOnboarding(false);
  };

  const handleCardClick = (id: string) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);
    
    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setIsChecking(true);
      checkMatch(newFlipped);
    }
  };

  const checkMatch = (currentFlipped: string[]) => {
    const card1 = cards.find(c => c.id === currentFlipped[0]);
    const card2 = cards.find(c => c.id === currentFlipped[1]);

    if (card1 && card2 && card1.iconType === card2.iconType) {
      // Match found!
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          currentFlipped.includes(c.id) ? { ...c, isMatched: true } : c
        ));
        
        const newMatched = new Set([...matchedPairs, card1.iconType]);
        setMatchedPairs(newMatched);
        setFlippedCards([]);
        setIsChecking(false);
        
        // Check if game is complete
        if (newMatched.size === numPairs) {
          finishGame();
        }
      }, 600);
    } else {
      // No match - flip back
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          currentFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
        ));
        setFlippedCards([]);
        setIsChecking(false);
      }, 1000);
    }
  };

  const finishGame = () => {
    setGameComplete(true);
    
    // Unlock next level if applicable
    if (harmonyLevel < HARMONY_LEVELS.length - 1) {
      // Could persist this to backend/localStorage in future
    }
    
    // Each completed game = +1 leaf for plant growth
    setTimeout(() => onComplete(1, 1), 2500);
  };

  const getIconComponent = (type: string) => {
    const config = ALL_ICON_CONFIGS.find(c => c.type === type);
    if (!config) return null;
    const IconComponent = config.icon;
    return <IconComponent className={`w-8 h-8 ${config.color}`} />;
  };

  const getIconBg = (type: string) => {
    return ALL_ICON_CONFIGS.find(c => c.type === type)?.bg || 'bg-gray-50';
  };

  // Calculate grid columns based on number of cards
  const getGridCols = () => {
    const totalCards = numPairs * 2;
    if (totalCards <= 12) return 'grid-cols-3 sm:grid-cols-4';
    if (totalCards <= 16) return 'grid-cols-4';
    if (totalCards <= 20) return 'grid-cols-4 sm:grid-cols-5';
    return 'grid-cols-4 sm:grid-cols-6';
  };

  // Theme Select
  if (showThemeSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-teal-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Theme</h2>
          <p className="text-gray-600 mb-6 text-sm">Each theme offers a unique set of icons</p>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(ICON_THEMES).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => handleThemeSelect(key as keyof typeof ICON_THEMES)}
                className="p-4 rounded-xl text-center transition-all border-2 bg-green-50 border-green-200 hover:border-green-400"
              >
                <span className="text-3xl block mb-2">{theme.emoji}</span>
                <h3 className="font-semibold text-gray-800">{theme.name}</h3>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              setShowThemeSelect(false);
              setShowLevelSelect(true);
            }}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Back to Level Select
          </button>
        </motion.div>
      </div>
    );
  }

  // Level Select
  if (showLevelSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-teal-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Level</h2>
          <p className="text-gray-600 mb-6">Select a Harmony Level to begin</p>
          
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {HARMONY_LEVELS.map((level, index) => (
              <button
                key={index}
                onClick={() => handleLevelSelect(index)}
                className="w-full p-4 rounded-xl text-left transition-all border-2 bg-green-50 border-green-200 hover:border-green-400 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{level.name}</h3>
                    <p className="text-sm text-gray-500">{level.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">{level.pairs} pairs</span>
                    <p className="text-xs text-emerald-500">+1 🍃</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {onExit && (
            <button
              onClick={onExit}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Games
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-teal-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Zen Match</h2>
          <p className="text-gray-600 mb-6">
            Cognitive Concentration Game
          </p>
          
          <div className="bg-green-50 rounded-2xl p-5 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">How to Play:</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Tap cards to flip them over
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Find matching pairs of nature icons
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Choose your Harmony Level for varying difficulty
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-1">🍃</span>
                +1 leaf to grow your plant
              </li>
            </ul>
          </div>
          
          <button
            onClick={() => setShowLevelSelect(true)}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-lg"
          >
            Choose Level
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

  const handlePlayNextLevel = () => {
    if (harmonyLevel < HARMONY_LEVELS.length - 1) {
      const nextLevel = harmonyLevel + 1;
      setHarmonyLevel(nextLevel);
      setSelectedLevel(nextLevel);
      setGameComplete(false);
    }
  };

  // Game Complete
  if (gameComplete) {
    const canLevelUp = harmonyLevel < HARMONY_LEVELS.length - 1;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-teal-100 p-4">
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
            🧘
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Harmony Found</h2>
          <p className="text-gray-600 mb-2">
            All {numPairs} pairs matched in {moves} moves
          </p>
          <p className="text-sm text-green-600 font-medium mb-4">
            Level: {currentLevel.name}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-emerald-600 mb-6">
            <Leaf className="w-6 h-6" />
            <span>+1 Leaf 🍃</span>
          </div>
          
          {canLevelUp && (
            <>
              <div className="bg-green-50 rounded-xl p-3 mb-4 text-sm text-green-700">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Next level unlocked: {HARMONY_LEVELS[harmonyLevel + 1].name}!
              </div>
              
              <button
                onClick={handlePlayNextLevel}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-lg mb-3"
              >
                Play Next Level
              </button>
            </>
          )}
          
          <button
            onClick={onExit}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Games
          </button>
        </motion.div>
      </div>
    );
  }

  // Main Game
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-100 p-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Zen Match</h2>
            <p className="text-gray-600 text-sm">Level: {currentLevel.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
              Moves: {moves}
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

      {/* Progress */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Matched: {matchedPairs.size} / {numPairs}
          </span>
          <span className="text-sm text-emerald-600 font-medium">
            {matchedPairs.size === numPairs ? '+1 🍃' : `${Math.round((matchedPairs.size / numPairs) * 100)}%`}
          </span>
        </div>
        <div className="bg-white/50 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(matchedPairs.size / numPairs) * 100}%` }}
            className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-3xl mx-auto">
        <div className={`grid ${getGridCols()} gap-2 sm:gap-3`}>
          {cards.map(card => {
            const isRevealed = card.isFlipped || card.isMatched;
            
            return (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || isChecking}
                className={`aspect-square rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ${
                  card.isMatched ? 'cursor-default' : ''
                }`}
                whileHover={!card.isMatched && !isChecking ? { scale: 1.05 } : {}}
                whileTap={!card.isMatched && !isChecking ? { scale: 0.95 } : {}}
              >
                <motion.div
                  className="w-full h-full relative"
                  initial={false}
                  animate={{ rotateY: isRevealed ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Card Back */}
                  <div 
                    className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-400 to-green-500 shadow-lg flex items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <Leaf className="w-6 h-6 sm:w-8 sm:h-8 text-white/40" />
                  </div>
                  
                  {/* Card Front */}
                  <div 
                    className={`absolute inset-0 rounded-xl sm:rounded-2xl ${getIconBg(card.iconType)} shadow-lg flex items-center justify-center border-2 ${
                      card.isMatched ? 'border-green-400' : 'border-gray-100'
                    }`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    {getIconComponent(card.iconType)}
                    {card.isMatched && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1"
                      >
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="max-w-3xl mx-auto mt-6 text-center">
        <p className="text-gray-500 text-sm">
          {matchedPairs.size === 0 
            ? "Tap any card to begin" 
            : `${numPairs - matchedPairs.size} pairs remaining`}
        </p>
      </div>
    </div>
  );
}
