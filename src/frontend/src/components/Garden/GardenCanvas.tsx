/**
 * Mind Garden - Garden Canvas
 * 
 * The main garden visualization component featuring:
 * - Dynamic grid system (5x5 to 15x15)
 * - Procedural plant rendering
 * - Weather effects
 * - Time of day lighting
 * - Interactive elements (click, hover, zoom)
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Droplet, Scissors, Eye } from 'lucide-react';

// Plant Types
export type PlantType = 
  | 'sunflower'      // Morning flows
  | 'moonflower'     // Evening flows  
  | 'lavender'       // Micro-flows
  | 'chamomile'      // Quick resets
  | 'daisy'          // Standard flows
  | 'rose'           // Unlockable
  | 'lotus'          // Unlockable
  | 'bamboo'         // Breathing practice
  | 'fern'           // Reflection
  | 'cherry-tree'    // Long meditation (grows over time)
  | 'oak-sapling'    // Long meditation (grows over time)
  | 'golden-flower'  // Gratitude journaling
  | 'ivy'            // Streak connector
  | 'succulent';     // Games/activities

// Growth stages
export type GrowthStage = 'seed' | 'sprout' | 'growing' | 'blooming' | 'full';

// Plant data structure
export interface Plant {
  id: string;
  type: PlantType;
  x: number;
  y: number;
  growthStage: GrowthStage;
  plantedAt: string;
  lastWatered?: string;
  bloomCount: number;
  associatedWith?: string; // e.g., "Pre-Meeting Focus", "Morning Flow"
}

// Garden state
export interface GardenData {
  plants: Plant[];
  gridSize: number; // 5, 7, 10, 12, or 15
  weather: 'sunny' | 'cloudy' | 'rain';
  health: number;
  decorations: Decoration[];
  theme: 'cottage' | 'zen' | 'meadow' | 'botanical';
}

// Decorations
export interface Decoration {
  id: string;
  type: 'path' | 'bench' | 'fountain' | 'lantern' | 'arch' | 'birdbath';
  x: number;
  y: number;
  variant?: string;
}

interface GardenCanvasProps {
  data: GardenData;
  onPlantClick?: (plant: Plant) => void;
  onCellClick?: (x: number, y: number) => void;
  onWater?: () => void;
  onPrune?: () => void;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  interactive?: boolean;
}

// Plant SVG components
const PlantSVG: Record<PlantType, (props: { stage: GrowthStage; size: number }) => JSX.Element> = {
  sunflower: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Stem */}
      <path
        d="M50 100 Q50 70, 50 40"
        stroke="#22c55e"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Leaves */}
      {stage !== 'seed' && (
        <>
          <path d="M50 75 Q35 65, 30 75 Q40 78, 50 75" fill="#22c55e" />
          <path d="M50 60 Q65 50, 70 60 Q60 63, 50 60" fill="#22c55e" />
        </>
      )}
      {/* Flower head */}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 35)">
          {/* Petals */}
          {[...Array(12)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-20"
              rx="6"
              ry="15"
              fill="#fbbf24"
              transform={`rotate(${i * 30})`}
              className="mg-plant-bloom"
            />
          ))}
          {/* Center */}
          <circle cx="0" cy="0" r="12" fill="#92400e" />
          <circle cx="0" cy="0" r="8" fill="#78350f" />
        </g>
      )}
      {/* Bud */}
      {stage === 'growing' && (
        <ellipse cx="50" cy="35" rx="10" ry="15" fill="#84cc16" />
      )}
      {/* Sprout */}
      {stage === 'sprout' && (
        <path d="M50 80 Q45 70, 50 60 Q55 70, 50 80" fill="#22c55e" />
      )}
      {/* Seed */}
      {stage === 'seed' && (
        <ellipse cx="50" cy="90" rx="5" ry="3" fill="#92400e" />
      )}
    </svg>
  ),

  moonflower: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q48 70, 50 35" stroke="#059669" strokeWidth="3" fill="none" />
      {stage !== 'seed' && (
        <path d="M50 65 Q35 55, 35 70 Q42 68, 50 65" fill="#059669" />
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 30)">
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-15"
              rx="8"
              ry="18"
              fill="white"
              opacity="0.95"
              transform={`rotate(${i * 72})`}
              className="mg-plant-bloom"
            />
          ))}
          <circle cx="0" cy="0" r="8" fill="#fef9c3" />
        </g>
      )}
      {stage === 'growing' && (
        <ellipse cx="50" cy="30" rx="8" ry="12" fill="#d1fae5" />
      )}
    </svg>
  ),

  lavender: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q50 80, 50 40" stroke="#059669" strokeWidth="2" fill="none" />
      {(stage === 'blooming' || stage === 'full') && (
        <g>
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={i}
              cx="50"
              cy={40 - i * 4}
              rx="4"
              ry="3"
              fill="#a78bfa"
              className="mg-plant-bloom"
            />
          ))}
        </g>
      )}
      {stage === 'growing' && (
        <ellipse cx="50" cy="35" rx="3" ry="8" fill="#c4b5fd" />
      )}
    </svg>
  ),

  chamomile: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q50 75, 50 50" stroke="#22c55e" strokeWidth="2" fill="none" />
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 45)">
          {[...Array(12)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-10"
              rx="3"
              ry="8"
              fill="white"
              transform={`rotate(${i * 30})`}
            />
          ))}
          <circle cx="0" cy="0" r="6" fill="#fbbf24" />
        </g>
      )}
    </svg>
  ),

  daisy: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q52 75, 50 45" stroke="#16a34a" strokeWidth="2" fill="none" />
      {stage !== 'seed' && (
        <path d="M50 70 Q40 65, 38 75 Q44 72, 50 70" fill="#16a34a" />
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 40)">
          {[...Array(10)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-12"
              rx="4"
              ry="10"
              fill="white"
              transform={`rotate(${i * 36})`}
            />
          ))}
          <circle cx="0" cy="0" r="8" fill="#facc15" />
        </g>
      )}
    </svg>
  ),

  rose: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q50 70, 50 35" stroke="#166534" strokeWidth="3" fill="none" />
      {/* Thorns */}
      <path d="M50 80 L45 75" stroke="#166534" strokeWidth="2" />
      <path d="M50 65 L55 60" stroke="#166534" strokeWidth="2" />
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 30)">
          {/* Rose petals - layered */}
          <ellipse cx="-5" cy="-5" rx="8" ry="10" fill="#fb7185" transform="rotate(-20)" />
          <ellipse cx="5" cy="-5" rx="8" ry="10" fill="#f43f5e" transform="rotate(20)" />
          <ellipse cx="0" cy="-8" rx="6" ry="8" fill="#e11d48" />
          <circle cx="0" cy="0" r="4" fill="#be123c" />
        </g>
      )}
    </svg>
  ),

  lotus: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Water surface */}
      <ellipse cx="50" cy="85" rx="35" ry="10" fill="#0ea5e9" opacity="0.3" />
      {/* Lily pad */}
      <ellipse cx="50" cy="80" rx="25" ry="8" fill="#22c55e" />
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 55)">
          {/* Outer petals */}
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-18"
              rx="6"
              ry="15"
              fill="#fbcfe8"
              transform={`rotate(${i * 45})`}
            />
          ))}
          {/* Inner petals */}
          {[...Array(6)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-12"
              rx="4"
              ry="10"
              fill="#f9a8d4"
              transform={`rotate(${i * 60 + 30})`}
            />
          ))}
          <circle cx="0" cy="0" r="6" fill="#fef08a" />
        </g>
      )}
    </svg>
  ),

  bamboo: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Main stalk */}
      <rect x="47" y="20" width="6" height="80" fill="#22c55e" rx="2" />
      {/* Segments */}
      {[25, 40, 55, 70].map((y, i) => (
        <rect key={i} x="46" y={y} width="8" height="3" fill="#16a34a" />
      ))}
      {/* Leaves */}
      {(stage === 'growing' || stage === 'blooming' || stage === 'full') && (
        <>
          <path d="M53 30 Q65 25, 70 35 Q60 32, 53 30" fill="#22c55e" />
          <path d="M47 45 Q35 40, 30 50 Q40 47, 47 45" fill="#22c55e" />
          <path d="M53 60 Q65 55, 72 65 Q62 62, 53 60" fill="#22c55e" />
        </>
      )}
    </svg>
  ),

  fern: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Center stem */}
      <path d="M50 100 Q50 70, 50 30" stroke="#16a34a" strokeWidth="2" fill="none" />
      {/* Fronds */}
      {(stage !== 'seed' && stage !== 'sprout') && (
        <>
          {[...Array(6)].map((_, i) => (
            <g key={i}>
              <path
                d={`M50 ${85 - i * 10} Q${35 - i * 2} ${80 - i * 10}, ${30 - i * 3} ${75 - i * 10}`}
                stroke="#22c55e"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d={`M50 ${85 - i * 10} Q${65 + i * 2} ${80 - i * 10}, ${70 + i * 3} ${75 - i * 10}`}
                stroke="#22c55e"
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          ))}
        </>
      )}
    </svg>
  ),

  'cherry-tree': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Trunk */}
      <path d="M50 100 L50 60 Q45 55, 40 45 M50 60 Q55 55, 60 45" stroke="#92400e" strokeWidth="6" fill="none" />
      {/* Crown */}
      {(stage === 'blooming' || stage === 'full') && (
        <g>
          <circle cx="50" cy="35" r="25" fill="#22c55e" />
          <circle cx="35" cy="40" r="18" fill="#22c55e" />
          <circle cx="65" cy="40" r="18" fill="#22c55e" />
          {/* Blossoms */}
          {[...Array(12)].map((_, i) => (
            <circle
              key={i}
              cx={35 + Math.random() * 30}
              cy={25 + Math.random() * 25}
              r="3"
              fill="#fbcfe8"
            />
          ))}
        </g>
      )}
      {stage === 'growing' && (
        <circle cx="50" cy="40" r="15" fill="#86efac" />
      )}
    </svg>
  ),

  'oak-sapling': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 L50 50" stroke="#78350f" strokeWidth="4" fill="none" />
      {(stage !== 'seed') && (
        <>
          <ellipse cx="50" cy="40" rx="20" ry="25" fill="#22c55e" />
          <ellipse cx="35" cy="45" rx="12" ry="15" fill="#16a34a" />
          <ellipse cx="65" cy="45" rx="12" ry="15" fill="#16a34a" />
        </>
      )}
    </svg>
  ),

  'golden-flower': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q50 75, 50 45" stroke="#059669" strokeWidth="2" fill="none" />
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 40)">
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-12"
              rx="5"
              ry="12"
              fill="#fbbf24"
              transform={`rotate(${i * 45})`}
              className="mg-plant-bloom"
            />
          ))}
          <circle cx="0" cy="0" r="8" fill="#f59e0b" />
          {/* Sparkle effect */}
          <circle cx="5" cy="-5" r="2" fill="white" opacity="0.8" className="mg-sparkle" />
        </g>
      )}
    </svg>
  ),

  ivy: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      <path d="M20 100 Q30 80, 50 70 Q70 60, 80 40" stroke="#16a34a" strokeWidth="2" fill="none" />
      {(stage !== 'seed') && (
        <>
          {[30, 50, 70].map((x, i) => (
            <path
              key={i}
              d={`M${x} ${90 - i * 20} Q${x - 10} ${85 - i * 20}, ${x - 15} ${90 - i * 20} Q${x - 5} ${95 - i * 20}, ${x} ${90 - i * 20}`}
              fill="#22c55e"
            />
          ))}
        </>
      )}
    </svg>
  ),

  succulent: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      <g transform="translate(50, 70)">
        {/* Rosette pattern */}
        {[...Array(8)].map((_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy={-8 - i * 2}
            rx={12 - i}
            ry={8 - i * 0.5}
            fill={i % 2 === 0 ? '#86efac' : '#4ade80'}
            transform={`rotate(${i * 22.5})`}
          />
        ))}
        <circle cx="0" cy="0" r="5" fill="#22c55e" />
      </g>
    </svg>
  ),
};

export default function GardenCanvas({
  data,
  onPlantClick,
  onCellClick,
  onWater,
  onPrune,
  timeOfDay = 'afternoon',
  interactive = true,
}: GardenCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showTimeLapse, setShowTimeLapse] = useState(false);

  // Calculate cell size based on grid
  const cellSize = Math.min(80, 600 / data.gridSize);

  // Get weather class
  const weatherClass = `mg-weather-${data.weather}`;

  // Get time of day lighting
  const getLighting = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'bg-gradient-to-b from-amber-100/20 to-transparent';
      case 'afternoon':
        return 'bg-gradient-to-b from-white/10 to-transparent';
      case 'evening':
        return 'bg-gradient-to-b from-orange-200/30 to-purple-200/10';
      case 'night':
        return 'bg-gradient-to-b from-indigo-900/40 to-transparent';
    }
  };

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      if (direction === 'in') return Math.min(prev + 0.2, 2);
      return Math.max(prev - 0.2, 0.5);
    });
  };

  // Handle plant click
  const handlePlantClick = (plant: Plant) => {
    setSelectedPlant(plant);
    onPlantClick?.(plant);
  };

  // Render grid
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        const plant = data.plants.find(p => p.x === x && p.y === y);
        const decoration = data.decorations.find(d => d.x === x && d.y === y);
        
        cells.push(
          <motion.div
            key={`${x}-${y}`}
            className={`mg-garden-cell ${plant ? 'has-plant' : ''}`}
            style={{ width: cellSize, height: cellSize }}
            onClick={() => {
              if (plant) {
                handlePlantClick(plant);
              } else {
                onCellClick?.(x, y);
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {plant && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {PlantSVG[plant.type]?.({ stage: plant.growthStage, size: cellSize * 0.9 })}
              </motion.div>
            )}
            
            {decoration && (
              <div className="absolute inset-0 flex items-center justify-center opacity-60">
                {/* Decoration rendering would go here */}
              </div>
            )}
          </motion.div>
        );
      }
    }
    return cells;
  };

  // Render weather effects
  const renderWeatherEffects = () => {
    if (data.weather === 'rain') {
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="mg-rain-drop"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl bg-[var(--mg-bg-primary)]">
      {/* Sky/Background */}
      <div 
        className={`absolute inset-0 transition-colors duration-1000`}
        style={{
          background: timeOfDay === 'morning' ? 'var(--mg-morning-sky)' :
                     timeOfDay === 'afternoon' ? 'var(--mg-afternoon-sky)' :
                     timeOfDay === 'evening' ? 'var(--mg-evening-sky)' :
                     'var(--mg-night-sky)',
        }}
      />

      {/* Weather Layer */}
      <div className={`mg-weather-layer ${weatherClass}`} />
      {renderWeatherEffects()}

      {/* Lighting Overlay */}
      <div className={`absolute inset-0 pointer-events-none ${getLighting()}`} />

      {/* Garden Ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(34, 197, 94, 0.2) 30%, rgba(22, 163, 74, 0.4) 100%)',
        }}
      />

      {/* Garden Grid Container */}
      <div
        ref={canvasRef}
        className="absolute inset-0 flex items-center justify-center overflow-auto p-8"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        <div
          className="mg-garden-grid"
          style={{
            gridTemplateColumns: `repeat(${data.gridSize}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${data.gridSize}, ${cellSize}px)`,
          }}
        >
          {renderGrid()}
        </div>
      </div>

      {/* Controls */}
      {interactive && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => handleZoom('in')}
            className="p-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)] hover:bg-[var(--mg-accent)]/20 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)] hover:bg-[var(--mg-accent)]/20 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-3 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)] hover:bg-[var(--mg-accent)]/20 transition-colors"
            title="Reset view"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Garden Actions */}
      {interactive && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={onWater}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 hover:bg-sky-500/30 transition-colors text-sky-300"
            title="Water garden"
          >
            <Droplet className="w-5 h-5" />
            <span className="text-sm font-medium">Water</span>
          </button>
          <button
            onClick={onPrune}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-amber-300"
            title="Prune garden"
          >
            <Scissors className="w-5 h-5" />
            <span className="text-sm font-medium">Prune</span>
          </button>
          <button
            onClick={() => setShowTimeLapse(!showTimeLapse)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 transition-colors text-violet-300"
            title="View time-lapse"
          >
            <Eye className="w-5 h-5" />
            <span className="text-sm font-medium">Time-lapse</span>
          </button>
        </div>
      )}

      {/* Plant Details Modal */}
      <AnimatePresence>
        {selectedPlant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedPlant(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--mg-bg-secondary)] rounded-2xl p-6 max-w-sm mx-4 border border-[var(--mg-border)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20">
                  {PlantSVG[selectedPlant.type]?.({ stage: selectedPlant.growthStage, size: 80 })}
                </div>
                <div>
                  <h3 className="text-lg font-semibold capitalize">
                    {selectedPlant.type.replace('-', ' ')}
                  </h3>
                  <p className="text-sm text-[var(--mg-text-muted)]">
                    Stage: {selectedPlant.growthStage}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-[var(--mg-text-muted)]">Planted:</span>{' '}
                  {new Date(selectedPlant.plantedAt).toLocaleDateString()}
                </p>
                <p>
                  <span className="text-[var(--mg-text-muted)]">Bloomed:</span>{' '}
                  {selectedPlant.bloomCount} times
                </p>
                {selectedPlant.associatedWith && (
                  <p>
                    <span className="text-[var(--mg-text-muted)]">From:</span>{' '}
                    {selectedPlant.associatedWith}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedPlant(null)}
                className="mt-4 w-full py-2 rounded-xl bg-[var(--mg-accent)]/20 hover:bg-[var(--mg-accent)]/30 transition-colors font-medium"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Garden State Indicator */}
      <div className="absolute top-4 left-4 px-4 py-2 rounded-xl bg-[var(--mg-bg-card)] border border-[var(--mg-border)]">
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {data.weather === 'sunny' ? '☀️' : data.weather === 'cloudy' ? '⛅' : '🌧️'}
          </div>
          <div>
            <div className="text-sm font-medium">
              {timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
            </div>
            <div className="text-xs text-[var(--mg-text-muted)]">
              {data.plants.length} plants • {data.gridSize}×{data.gridSize} garden
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

