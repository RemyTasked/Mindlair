/**
 * Plant Selector Component
 * 
 * Allows users to choose their plant type at the start of their garden journey.
 * Shows free plant types (Classic, Succulent, Flowering) and premium options (locked).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, Check, ChevronRight } from 'lucide-react';
import OnePlantSVG, { PlantType, PLANT_CONFIGS } from './OnePlantSVG';

interface PlantOption {
  type: PlantType;
  name: string;
  description: string;
  leafColor: string;
  flowerColor: string;
  potColor: string;
  isPremium: boolean;
  isUnlocked: boolean;
}

interface PlantSelectorProps {
  onSelect: (plantType: PlantType) => void;
  availablePlants?: PlantOption[];
  isLoading?: boolean;
  mode?: 'initial' | 'expand'; // 'initial' for first plant, 'expand' for adding to garden
  premiumUnlocked?: boolean;   // Whether premium plants are available
  totalPlants?: number;        // How many plants user has
}

// Default plant options (used if availablePlants not provided)
const DEFAULT_PLANTS: PlantOption[] = [
  {
    type: 'classic',
    name: 'Classic Houseplant',
    description: 'Reliable, friendly, approachable',
    leafColor: '#4CAF50',
    flowerColor: '#FF69B4',
    potColor: '#8B4513',
    isPremium: false,
    isUnlocked: true,
  },
  {
    type: 'succulent',
    name: 'Succulent',
    description: 'Resilient, patient, steady',
    leafColor: '#90EE90',
    flowerColor: '#FFD700',
    potColor: '#D2691E',
    isPremium: false,
    isUnlocked: true,
  },
  {
    type: 'flowering',
    name: 'Flowering Plant',
    description: 'Vibrant, joyful, celebratory',
    leafColor: '#32CD32',
    flowerColor: '#FF1493',
    potColor: '#8B7355',
    isPremium: false,
    isUnlocked: true,
  },
];

const PREMIUM_PLANTS: PlantOption[] = [
  {
    type: 'fern',
    name: 'Fern',
    description: 'Lush, tropical, abundant',
    leafColor: '#228B22',
    flowerColor: 'none',
    potColor: '#5D4037',
    isPremium: true,
    isUnlocked: false,
  },
  {
    type: 'bonsai',
    name: 'Bonsai',
    description: 'Zen, patient, meditative',
    leafColor: '#9DC183',
    flowerColor: '#FFB7C5',
    potColor: '#4A3728',
    isPremium: true,
    isUnlocked: false,
  },
  {
    type: 'monstera',
    name: 'Monstera',
    description: 'Bold, modern, stylish',
    leafColor: '#0F5D3E',
    flowerColor: 'none',
    potColor: '#37474F',
    isPremium: true,
    isUnlocked: false,
  },
  {
    type: 'bamboo',
    name: 'Bamboo',
    description: 'Strong, flexible, zen',
    leafColor: '#7CB342',
    flowerColor: 'none',
    potColor: '#607D8B',
    isPremium: true,
    isUnlocked: false,
  },
  {
    type: 'orchid',
    name: 'Orchid',
    description: 'Exotic, elegant, sophisticated',
    leafColor: '#2E7D32',
    flowerColor: '#DA70D6',
    potColor: '#ECEFF1',
    isPremium: true,
    isUnlocked: false,
  },
  {
    type: 'ivy',
    name: 'Ivy',
    description: 'Flowing, romantic, wild',
    leafColor: '#388E3C',
    flowerColor: '#FFFFFF',
    potColor: '#795548',
    isPremium: true,
    isUnlocked: false,
  },
];

export default function PlantSelector({
  onSelect,
  availablePlants,
  isLoading = false,
  mode = 'initial',
  premiumUnlocked = false,
  totalPlants = 0,
}: PlantSelectorProps) {
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [showPremium, setShowPremium] = useState(premiumUnlocked);
  
  // Use provided plants or defaults, applying premium unlock status
  const freePlants = (availablePlants?.filter(p => !p.isPremium) || DEFAULT_PLANTS).map(p => ({
    ...p,
    isUnlocked: true,
  }));
  
  const premiumPlants = (availablePlants?.filter(p => p.isPremium) || PREMIUM_PLANTS).map(p => ({
    ...p,
    isUnlocked: premiumUnlocked,
  }));
  
  const handleConfirm = () => {
    if (selectedPlant) {
      onSelect(selectedPlant);
    }
  };
  
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="text-5xl mb-4">
          {mode === 'initial' ? '🌱' : '🎉'}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-emerald-100 mb-2">
          {mode === 'initial' 
            ? "Let's plant your first seed!"
            : totalPlants === 1 
              ? "Add your second plant!"
              : `Add plant #${totalPlants + 1} to your garden!`}
        </h2>
        <p className="text-emerald-300/70 max-w-md">
          {mode === 'initial'
            ? "Choose a plant to grow through your mental wellness practice. Each action you take will help it grow."
            : premiumUnlocked 
              ? "Your dedication has unlocked premium plants! Choose any plant to add to your growing garden."
              : "Choose a new plant to add next to your mature plants."}
        </p>
      </motion.div>
      
      {/* Free Plants */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-3xl mb-8"
      >
        <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-4 text-center">
          Choose Your Plant
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {freePlants.map((plant, index) => (
            <motion.button
              key={plant.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => setSelectedPlant(plant.type)}
              disabled={!plant.isUnlocked}
              className={`
                relative p-6 rounded-2xl border-2 transition-all duration-300
                ${selectedPlant === plant.type
                  ? 'border-emerald-400 bg-emerald-900/40 shadow-lg shadow-emerald-500/20'
                  : 'border-emerald-800/50 bg-emerald-900/20 hover:border-emerald-600/50 hover:bg-emerald-900/30'
                }
                ${!plant.isUnlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection indicator */}
              {selectedPlant === plant.type && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              
              {/* Plant preview */}
              <div className="flex justify-center mb-4">
                <OnePlantSVG
                  plantType={plant.type}
                  actionsCount={25} // Show a nice preview
                  size={100}
                  animated={false}
                  showPot={true}
                />
              </div>
              
              {/* Plant info */}
              <h4 className="text-lg font-semibold text-emerald-100 mb-1">
                {plant.name}
              </h4>
              <p className="text-sm text-emerald-300/60">
                {plant.description}
              </p>
              
              {/* Color preview */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: plant.leafColor }}
                  title="Leaf color"
                />
                {plant.flowerColor !== 'none' && (
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: plant.flowerColor }}
                    title="Flower color"
                  />
                )}
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: plant.potColor }}
                  title="Pot color"
                />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
      
      {/* Premium Plants Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-3xl mb-8"
      >
        <button
          onClick={() => setShowPremium(!showPremium)}
          className={`flex items-center justify-center gap-2 w-full py-3 text-sm font-medium transition-colors ${
            premiumUnlocked 
              ? 'text-purple-400 hover:text-purple-300' 
              : 'text-emerald-400/70 hover:text-emerald-400'
          }`}
        >
          {premiumUnlocked ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          <span>{premiumUnlocked ? 'Premium Plants Unlocked!' : 'Premium Plants'} ({premiumPlants.length})</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showPremium ? 'rotate-90' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showPremium && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                {premiumPlants.map((plant, index) => (
                  <motion.div
                    key={plant.type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      relative p-3 rounded-xl border transition-all
                      ${plant.isUnlocked
                        ? selectedPlant === plant.type
                          ? 'border-emerald-400 bg-emerald-900/40'
                          : 'border-emerald-800/50 bg-emerald-900/20 hover:border-emerald-600/50 cursor-pointer'
                        : 'border-slate-700/50 bg-slate-800/20 opacity-60'
                      }
                    `}
                    onClick={() => plant.isUnlocked && setSelectedPlant(plant.type)}
                  >
                    {/* Lock overlay */}
                    {!plant.isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded-xl">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    
                    {/* Selection indicator */}
                    {selectedPlant === plant.type && plant.isUnlocked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    
                    {/* Plant preview */}
                    <div className="flex justify-center mb-2">
                      <OnePlantSVG
                        plantType={plant.type}
                        actionsCount={25}
                        size={60}
                        animated={false}
                        showPot={false}
                      />
                    </div>
                    
                    <p className="text-xs text-center text-emerald-200/80 font-medium truncate">
                      {plant.name}
                    </p>
                  </motion.div>
                ))}
              </div>
              
              <p className="text-center text-xs text-slate-400 mt-4">
                {premiumUnlocked 
                  ? 'Premium plants are unlocked! Choose any plant for your garden.'
                  : 'Premium plants unlock after your first plant reaches maturity (30 actions)'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Confirm Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={handleConfirm}
          disabled={!selectedPlant || isLoading}
          className={`
            w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300
            flex items-center justify-center gap-3
            ${selectedPlant
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Planting...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>
                {selectedPlant 
                  ? `Plant ${PLANT_CONFIGS[selectedPlant].name}`
                  : 'Select a plant to continue'
                }
              </span>
            </>
          )}
        </button>
        
        {selectedPlant && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-emerald-300/60 mt-3"
          >
            Complete your first flow to help your seed sprout!
          </motion.p>
        )}
      </motion.div>
      
      {/* Growth preview hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center"
      >
        <div className="inline-flex items-center gap-6 px-6 py-3 rounded-xl bg-emerald-900/20 border border-emerald-800/30">
          <div className="text-center">
            <div className="text-xs text-emerald-400/60">Seedling</div>
            <div className="text-sm font-medium text-emerald-300">1-10</div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600" />
          <div className="text-center">
            <div className="text-xs text-emerald-400/60">Growing</div>
            <div className="text-sm font-medium text-emerald-300">11-20</div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600" />
          <div className="text-center">
            <div className="text-xs text-emerald-400/60">Mature</div>
            <div className="text-sm font-medium text-emerald-300">30+</div>
          </div>
        </div>
        <p className="text-xs text-emerald-400/50 mt-2">
          Each action = 1 growth. No time pressure, just practice.
        </p>
      </motion.div>
    </div>
  );
}

