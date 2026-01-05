/**
 * One Garden Display Component
 * 
 * The main visualization for the cumulative garden system:
 * - Shows ALL plants in the garden (mature and growing)
 * - Highlights the active plant being grown
 * - Displays progress (actions count, growth stage)
 * - Shows "Add Plant" button when active plant is mature
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Sparkles, TrendingUp, Award, Plus } from 'lucide-react';
import OnePlantSVG, { PlantType, PLANT_CONFIGS, calculateVisuals } from './OnePlantSVG';

// Types matching backend
interface OnePlant {
  id: string;
  type: PlantType;
  actionsCount: number;
  leavesCount: number;
  flowersCount: number;
  flowerBudsCount: number;
  growthStage: string;
  plantedAt: string;
  maturedAt?: string;
  position: number;
}

interface OneGardenDisplayProps {
  plants: OnePlant[];               // ALL plants in the garden
  activePlantId: string | null;     // ID of the plant currently being grown
  streak: number;
  totalActions: number;
  progressToMature: number;
  nextMilestone: { action: number; description: string } | null;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  canAddNewPlant?: boolean;
  premiumUnlocked?: boolean;
  onWater?: () => void;
  onAddPlant?: () => void;
  className?: string;
}

// Growth stage info
const STAGE_INFO = {
  seed: { emoji: '🌰', label: 'Seed', color: 'amber' },
  seedling: { emoji: '🌱', label: 'Seedling', color: 'lime' },
  growing: { emoji: '🌿', label: 'Growing', color: 'green' },
  maturing: { emoji: '🌸', label: 'Maturing', color: 'pink' },
  mature: { emoji: '🌺', label: 'Mature', color: 'emerald' },
};

// Time-based backgrounds
const TIME_BACKGROUNDS = {
  morning: 'from-amber-100/20 via-sky-100/10 to-emerald-100/20',
  afternoon: 'from-sky-100/20 via-white/10 to-emerald-100/20',
  evening: 'from-orange-200/30 via-rose-100/20 to-purple-100/20',
  night: 'from-slate-900/50 via-indigo-900/30 to-slate-900/50',
};

export default function OneGardenDisplay({
  plants,
  activePlantId,
  streak,
  totalActions,
  progressToMature,
  nextMilestone,
  timeOfDay = 'afternoon',
  canAddNewPlant = false,
  premiumUnlocked = false,
  onWater,
  onAddPlant,
  className = '',
}: OneGardenDisplayProps) {
  const [isWatering, setIsWatering] = useState(false);
  const [showMilestonePopup, setShowMilestonePopup] = useState(false);
  const [waterDroplets, setWaterDroplets] = useState<{ id: number; x: number }[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  // Get active plant
  const activePlant = plants.find(p => p.id === activePlantId) || null;
  
  // Plant to show details for (selected or active)
  const detailPlant = selectedPlantId 
    ? plants.find(p => p.id === selectedPlantId) || activePlant
    : activePlant;
  
  // Handle watering animation
  const handleWater = () => {
    if (isWatering || !onWater) return;
    
    setIsWatering(true);
    
    // Generate water droplets
    const droplets = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
    }));
    setWaterDroplets(droplets);
    
    onWater();
    
    setTimeout(() => {
      setIsWatering(false);
      setWaterDroplets([]);
    }, 2000);
  };
  
  // Show milestone popup when close to a milestone
  useEffect(() => {
    if (nextMilestone && activePlant) {
      const remaining = nextMilestone.action - activePlant.actionsCount;
      if (remaining <= 3 && remaining > 0) {
        setShowMilestonePopup(true);
        const timer = setTimeout(() => setShowMilestonePopup(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [nextMilestone, activePlant?.actionsCount]);
  
  const stageInfo = detailPlant 
    ? STAGE_INFO[detailPlant.growthStage as keyof typeof STAGE_INFO] || STAGE_INFO.seed
    : STAGE_INFO.seed;
  
  const visuals = detailPlant ? calculateVisuals(detailPlant.actionsCount) : null;
  
  // Sort plants by position for display
  const sortedPlants = [...plants].sort((a, b) => a.position - b.position);
  
  return (
    <div className={`relative rounded-3xl overflow-hidden ${className}`}>
      {/* Background gradient based on time of day */}
      <div className={`absolute inset-0 bg-gradient-to-br ${TIME_BACKGROUNDS[timeOfDay]}`} />
      
      {/* Ground/shelf */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-900/40 to-transparent" />
      
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {timeOfDay !== 'night' && [...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-200/30"
            initial={{ x: `${10 + i * 15}%`, y: '100%', opacity: 0 }}
            animate={{
              y: '-10%',
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              delay: i * 1.5,
              ease: 'linear',
            }}
          />
        ))}
      </div>
      
      {/* Water droplets animation */}
      <AnimatePresence>
        {waterDroplets.map((droplet) => (
          <motion.div
            key={droplet.id}
            className="absolute pointer-events-none"
            style={{ left: `${droplet.x}%` }}
            initial={{ top: '10%', opacity: 0 }}
            animate={{ top: '70%', opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeIn' }}
          >
            <Droplet className="w-4 h-4 text-sky-400 fill-sky-300" />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Main content */}
      <div className="relative z-10 p-6 md:p-8">
        {/* Header stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Streak */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
              <span className="text-amber-400">🔥</span>
              <span className="text-sm font-medium text-amber-200">{streak} day{streak !== 1 ? 's' : ''}</span>
            </div>
            
            {/* Total actions */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-200">{totalActions} actions</span>
            </div>
            
            {/* Plants count */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
              <span className="text-violet-400">🪴</span>
              <span className="text-sm font-medium text-violet-200">{plants.length} plant{plants.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          {/* Premium badge */}
          {premiumUnlocked && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200">Premium</span>
            </div>
          )}
        </div>
        
        {/* Garden View - All Plants */}
        {plants.length > 0 ? (
          <div className="mb-6">
            {/* Garden shelf with all plants */}
            <div className="relative min-h-[280px] flex items-end justify-center gap-4 pb-4 overflow-x-auto">
              {sortedPlants.map((plant, index) => {
                const isActive = plant.id === activePlantId;
                const isSelected = plant.id === selectedPlantId;
                const isMature = plant.actionsCount >= 30;
                
                return (
                  <motion.div
                    key={plant.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative cursor-pointer transition-all duration-300 ${
                      isActive ? 'z-20' : 'z-10'
                    }`}
                    onClick={() => setSelectedPlantId(isSelected ? null : plant.id)}
                  >
                    {/* Active/Selected indicator */}
                    {(isActive || isSelected) && (
                      <motion.div
                        layoutId="plant-highlight"
                        className={`absolute -inset-3 rounded-2xl ${
                          isActive 
                            ? 'bg-emerald-500/20 border-2 border-emerald-400/50' 
                            : 'bg-sky-500/10 border border-sky-400/30'
                        }`}
                        initial={false}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    {/* Mature glow */}
                    {isMature && (
                      <motion.div
                        className="absolute inset-0 -m-4 rounded-full bg-emerald-400/10 blur-lg"
                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    )}
                    
                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider z-30">
                        Growing
                      </div>
                    )}
                    
                    {/* Plant */}
                    <OnePlantSVG
                      plantType={plant.type}
                      actionsCount={plant.actionsCount}
                      size={isActive ? 160 : 120}
                      animated={isActive}
                      showPot={true}
                    />
                    
                    {/* Progress indicator for active plant */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24">
                        <div className="h-1.5 bg-emerald-900/40 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (plant.actionsCount / 30) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              
              {/* Add Plant Button */}
              {canAddNewPlant && onAddPlant && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAddPlant}
                  className="flex flex-col items-center justify-end h-[160px] w-[100px] p-3 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/10 transition-all group"
                >
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 flex items-center justify-center transition-colors">
                      <Plus className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-400 mt-2">Add Plant</span>
                </motion.button>
              )}
            </div>
            
            {/* Selected/Active Plant Details */}
            {detailPlant && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-2xl bg-emerald-900/20 border border-emerald-800/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{stageInfo.emoji}</span>
                    <div>
                      <h3 className="font-semibold text-emerald-100">
                        {PLANT_CONFIGS[detailPlant.type].name}
                      </h3>
                      <p className="text-xs text-emerald-400/70">
                        {stageInfo.label} • {detailPlant.actionsCount} actions
                      </p>
                    </div>
                  </div>
                  
                  {visuals && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-emerald-400">🌿 {visuals.leavesCount}</span>
                      {visuals.flowers > 0 && <span className="text-pink-400">🌸 {visuals.flowers}</span>}
                      {visuals.flowerBuds > 0 && <span className="text-yellow-400">🌼 {visuals.flowerBuds}</span>}
                    </div>
                  )}
                </div>
                
                {/* Progress bar (only for active plant) */}
                {detailPlant.id === activePlantId && detailPlant.actionsCount < 30 && (
                  <div>
                    <div className="flex justify-between text-xs text-emerald-300/70 mb-1">
                      <span>Progress to maturity</span>
                      <span>{30 - detailPlant.actionsCount} actions remaining</span>
                    </div>
                    <div className="h-2 bg-emerald-900/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToMature}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    
                    {/* Milestones */}
                    <div className="flex justify-between mt-2">
                      {[10, 15, 20, 25, 30].map((milestone) => (
                        <div
                          key={milestone}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                            detailPlant.actionsCount >= milestone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-900/40 text-emerald-400/50'
                          }`}
                          title={
                            milestone === 10 ? 'Seedling complete' :
                            milestone === 15 ? 'First bud' :
                            milestone === 20 ? 'First flower' :
                            milestone === 25 ? 'Second bud' :
                            'Mature!'
                          }
                        >
                          {milestone}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Mature message */}
                {detailPlant.actionsCount >= 30 && (
                  <p className="text-sm text-emerald-300/70 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    Fully grown! {detailPlant.id === activePlantId && canAddNewPlant && 'Ready for a new plant?'}
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Next milestone popup */}
            <AnimatePresence>
              {showMilestonePopup && nextMilestone && activePlant && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-center"
                >
                  <p className="text-sm text-amber-200">
                    <Sparkles className="inline w-4 h-4 mr-1" />
                    {nextMilestone.action - activePlant.actionsCount} more to: {nextMilestone.description}!
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // No plants yet - prompt to select
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold text-emerald-100 mb-2">
              Your garden awaits!
            </h3>
            <p className="text-emerald-300/70 text-center max-w-sm mb-6">
              Plant your first seed to begin your mental wellness journey.
            </p>
            {onAddPlant && (
              <button
                onClick={onAddPlant}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Plant Your First Seed
              </button>
            )}
          </div>
        )}
        
        {/* Actions */}
        {plants.length > 0 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={handleWater}
              disabled={isWatering}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                isWatering
                  ? 'bg-sky-400/30 text-sky-300 cursor-not-allowed'
                  : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30'
              }`}
            >
              <Droplet className="w-4 h-4" />
              {isWatering ? 'Watering...' : 'Water Garden'}
            </button>
            
            {canAddNewPlant && onAddPlant && (
              <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={onAddPlant}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add New Plant
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
