/**
 * One Plant SVG Components
 * 
 * Dynamic plant visualizations that grow based on action count.
 * Each plant type has a unique visual style but follows the same growth logic:
 * - 1 leaf per action (up to 35 leaves)
 * - Stem grows: 30% → 60% → 90% → 100%
 * - Flower buds at 15 and 25 actions
 * - Flowers bloom at 20, 25, and 30 actions
 */

import { motion } from 'framer-motion';

// Plant types
export type PlantType = 'classic' | 'succulent' | 'flowering' | 'fern' | 'bonsai' | 'monstera' | 'bamboo' | 'orchid' | 'ivy';

// Growth stage
export type GrowthStage = 'seed' | 'seedling' | 'growing' | 'maturing' | 'mature';

// Plant configuration
export interface PlantConfig {
  name: string;
  leafColor: string;
  leafColorDark: string;
  flowerColor: string;
  flowerColorDark: string;
  potColor: string;
  potColorDark: string;
}

// Plant configurations
const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  classic: {
    name: 'Classic Houseplant',
    leafColor: '#4CAF50',
    leafColorDark: '#388E3C',
    flowerColor: '#FF69B4',
    flowerColorDark: '#DB7093',
    potColor: '#8B4513',
    potColorDark: '#5D4037',
  },
  succulent: {
    name: 'Succulent',
    leafColor: '#90EE90',
    leafColorDark: '#66BB6A',
    flowerColor: '#FFD700',
    flowerColorDark: '#FFC107',
    potColor: '#D2691E',
    potColorDark: '#A0522D',
  },
  flowering: {
    name: 'Flowering Plant',
    leafColor: '#32CD32',
    leafColorDark: '#228B22',
    flowerColor: '#FF1493',
    flowerColorDark: '#C71585',
    potColor: '#8B7355',
    potColorDark: '#6B5344',
  },
  fern: {
    name: 'Fern',
    leafColor: '#228B22',
    leafColorDark: '#006400',
    flowerColor: 'transparent',
    flowerColorDark: 'transparent',
    potColor: '#5D4037',
    potColorDark: '#3E2723',
  },
  bonsai: {
    name: 'Bonsai',
    leafColor: '#9DC183',
    leafColorDark: '#7CB342',
    flowerColor: '#FFB7C5',
    flowerColorDark: '#F48FB1',
    potColor: '#4A3728',
    potColorDark: '#2E1F1A',
  },
  monstera: {
    name: 'Monstera',
    leafColor: '#0F5D3E',
    leafColorDark: '#004D40',
    flowerColor: 'transparent',
    flowerColorDark: 'transparent',
    potColor: '#37474F',
    potColorDark: '#263238',
  },
  bamboo: {
    name: 'Bamboo',
    leafColor: '#7CB342',
    leafColorDark: '#558B2F',
    flowerColor: 'transparent',
    flowerColorDark: 'transparent',
    potColor: '#607D8B',
    potColorDark: '#455A64',
  },
  orchid: {
    name: 'Orchid',
    leafColor: '#2E7D32',
    leafColorDark: '#1B5E20',
    flowerColor: '#DA70D6',
    flowerColorDark: '#BA55D3',
    potColor: '#ECEFF1',
    potColorDark: '#CFD8DC',
  },
  ivy: {
    name: 'Ivy',
    leafColor: '#388E3C',
    leafColorDark: '#2E7D32',
    flowerColor: '#FFFFFF',
    flowerColorDark: '#E0E0E0',
    potColor: '#795548',
    potColorDark: '#5D4037',
  },
};

// Props for the plant component
interface OnePlantProps {
  plantType: PlantType;
  actionsCount: number;
  size?: number;
  animated?: boolean;
  showPot?: boolean;
  className?: string;
}

// Calculate visual properties based on actions
// 1 leaf per 2 activities (actions), max 35 leaves at 70 actions
function calculateVisuals(actionsCount: number) {
  const leavesCount = Math.min(Math.floor(actionsCount / 2), 35);
  
  // Stem height percentage
  let stemHeight = 30;
  if (actionsCount > 10) stemHeight = 60;
  if (actionsCount > 20) stemHeight = 90;
  if (actionsCount >= 30) stemHeight = 100;
  
  // Flower buds
  let flowerBuds = 0;
  if (actionsCount >= 15 && actionsCount < 20) flowerBuds = 1;
  if (actionsCount >= 25 && actionsCount < 30) flowerBuds = 2;
  
  // Flowers
  let flowers = 0;
  if (actionsCount >= 20) flowers = 1;
  if (actionsCount >= 25) flowers = 2;
  if (actionsCount >= 30) flowers = 3;
  
  // Growth stage
  let stage: GrowthStage = 'seed';
  if (actionsCount >= 1) stage = 'seedling';
  if (actionsCount > 10) stage = 'growing';
  if (actionsCount > 20) stage = 'maturing';
  if (actionsCount >= 30) stage = 'mature';
  
  return { leavesCount, stemHeight, flowerBuds, flowers, stage };
}

// Generate leaf positions for classic plant
function generateClassicLeaves(count: number, stemHeight: number): Array<{ x: number; y: number; rotation: number; scale: number; side: 'left' | 'right' }> {
  const leaves: Array<{ x: number; y: number; rotation: number; scale: number; side: 'left' | 'right' }> = [];
  
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 'left' : 'right';
    const verticalPosition = 100 - (stemHeight * (0.3 + (i / count) * 0.6));
    const horizontalOffset = 15 + (i % 3) * 5;
    
    leaves.push({
      x: side === 'left' ? 50 - horizontalOffset : 50 + horizontalOffset,
      y: Math.max(20, verticalPosition),
      rotation: side === 'left' ? -30 - (i % 4) * 10 : 30 + (i % 4) * 10,
      scale: 0.6 + (i / count) * 0.4,
      side,
    });
  }
  
  return leaves;
}

// Classic Houseplant
function ClassicPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight, flowerBuds, flowers } = calculateVisuals(actionsCount);
  const leaves = generateClassicLeaves(leavesCount, stemHeight);
  
  const stemTopY = 100 - stemHeight;
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Stem */}
      {actionsCount > 0 && (
        <motion.path
          d={`M50 100 Q50 ${70 - stemHeight * 0.3}, 50 ${stemTopY}`}
          stroke={config.leafColorDark}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0 } : {}}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* Leaves */}
      {leaves.map((leaf, i) => (
        <motion.ellipse
          key={i}
          cx={leaf.x}
          cy={leaf.y}
          rx={8 * leaf.scale}
          ry={12 * leaf.scale}
          fill={i % 3 === 0 ? config.leafColorDark : config.leafColor}
          transform={`rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`}
          initial={animated ? { scale: 0, opacity: 0 } : {}}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
        />
      ))}
      
      {/* Flower buds */}
      {flowerBuds > 0 && (
        <motion.circle
          cx={40}
          cy={stemTopY + 5}
          r={4}
          fill={config.flowerColorDark}
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
        />
      )}
      {flowerBuds > 1 && (
        <motion.circle
          cx={60}
          cy={stemTopY + 8}
          r={3}
          fill={config.flowerColorDark}
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
        />
      )}
      
      {/* Flowers */}
      {flowers >= 1 && (
        <motion.g
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx={50}
              cy={stemTopY - 5}
              rx={4}
              ry={8}
              fill={config.flowerColor}
              transform={`rotate(${i * 72} 50 ${stemTopY - 5})`}
            />
          ))}
          <circle cx={50} cy={stemTopY - 5} r={4} fill="#FFD700" />
        </motion.g>
      )}
      {flowers >= 2 && (
        <motion.g
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        >
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx={35}
              cy={stemTopY + 15}
              rx={3}
              ry={6}
              fill={config.flowerColor}
              transform={`rotate(${i * 72} 35 ${stemTopY + 15})`}
            />
          ))}
          <circle cx={35} cy={stemTopY + 15} r={3} fill="#FFD700" />
        </motion.g>
      )}
      {flowers >= 3 && (
        <motion.g
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
        >
          {[...Array(5)].map((_, i) => (
            <ellipse
              key={i}
              cx={65}
              cy={stemTopY + 12}
              rx={3}
              ry={6}
              fill={config.flowerColor}
              transform={`rotate(${i * 72} 65 ${stemTopY + 12})`}
            />
          ))}
          <circle cx={65} cy={stemTopY + 12} r={3} fill="#FFD700" />
        </motion.g>
      )}
      
      {/* Seed (when no actions) */}
      {actionsCount === 0 && (
        <motion.ellipse
          cx={50}
          cy={92}
          rx={5}
          ry={3}
          fill="#8B4513"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

// Succulent Plant
function SucculentPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, flowers } = calculateVisuals(actionsCount);
  
  // Succulents have a rosette pattern
  const layers = Math.min(Math.ceil(leavesCount / 6), 5);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Base rosette layers */}
      {actionsCount > 0 && [...Array(layers)].map((_, layerIdx) => {
        const layerLeaves = Math.min(6, leavesCount - layerIdx * 6);
        const baseY = 70 - layerIdx * 8;
        const scale = 1 - layerIdx * 0.15;
        
        return [...Array(layerLeaves)].map((_, i) => (
          <motion.ellipse
            key={`${layerIdx}-${i}`}
            cx={50}
            cy={baseY}
            rx={12 * scale}
            ry={8 * scale}
            fill={layerIdx % 2 === 0 ? config.leafColor : config.leafColorDark}
            transform={`rotate(${(i * 60) + layerIdx * 15} 50 ${baseY})`}
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (layerIdx * 6 + i) * 0.02 }}
          />
        ));
      })}
      
      {/* Center */}
      {actionsCount > 0 && (
        <motion.circle
          cx={50}
          cy={70 - layers * 8}
          r={5}
          fill={config.leafColorDark}
          initial={animated ? { scale: 0 } : {}}
          animate={{ scale: 1 }}
        />
      )}
      
      {/* Flowers on top */}
      {flowers >= 1 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }}>
          <circle cx={50} cy={35} r={8} fill={config.flowerColor} />
          <circle cx={50} cy={35} r={4} fill={config.flowerColorDark} />
        </motion.g>
      )}
      {flowers >= 2 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
          <circle cx={38} cy={45} r={6} fill={config.flowerColor} />
        </motion.g>
      )}
      {flowers >= 3 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
          <circle cx={62} cy={45} r={6} fill={config.flowerColor} />
        </motion.g>
      )}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse
          cx={50}
          cy={85}
          rx={6}
          ry={4}
          fill="#8B5A2B"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

// Flowering Plant
function FloweringPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight, flowers } = calculateVisuals(actionsCount);
  const stemTopY = 100 - stemHeight;
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Main stem */}
      {actionsCount > 0 && (
        <motion.path
          d={`M50 100 Q48 ${80 - stemHeight * 0.3}, 50 ${stemTopY}`}
          stroke={config.leafColorDark}
          strokeWidth="3"
          fill="none"
          initial={animated ? { pathLength: 0 } : {}}
          animate={{ pathLength: 1 }}
        />
      )}
      
      {/* Pointed leaves */}
      {[...Array(Math.min(leavesCount, 20))].map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const y = 95 - (i / 20) * stemHeight * 0.8;
        
        return (
          <motion.path
            key={i}
            d={`M50 ${y} Q${50 + side * 20} ${y - 8}, ${50 + side * 25} ${y - 5} Q${50 + side * 15} ${y}, 50 ${y}`}
            fill={i % 3 === 0 ? config.leafColor : config.leafColorDark}
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.02 }}
          />
        );
      })}
      
      {/* Large vibrant flowers */}
      {flowers >= 1 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          {[...Array(6)].map((_, i) => (
            <ellipse
              key={i}
              cx={50}
              cy={stemTopY - 8}
              rx={6}
              ry={12}
              fill={config.flowerColor}
              transform={`rotate(${i * 60} 50 ${stemTopY - 8})`}
            />
          ))}
          <circle cx={50} cy={stemTopY - 8} r={6} fill="#FFE4B5" />
        </motion.g>
      )}
      {flowers >= 2 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
          {[...Array(6)].map((_, i) => (
            <ellipse
              key={i}
              cx={32}
              cy={stemTopY + 20}
              rx={4}
              ry={8}
              fill={config.flowerColor}
              transform={`rotate(${i * 60} 32 ${stemTopY + 20})`}
            />
          ))}
          <circle cx={32} cy={stemTopY + 20} r={4} fill="#FFE4B5" />
        </motion.g>
      )}
      {flowers >= 3 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
          {[...Array(6)].map((_, i) => (
            <ellipse
              key={i}
              cx={68}
              cy={stemTopY + 15}
              rx={4}
              ry={8}
              fill={config.flowerColor}
              transform={`rotate(${i * 60} 68 ${stemTopY + 15})`}
            />
          ))}
          <circle cx={68} cy={stemTopY + 15} r={4} fill="#FFE4B5" />
        </motion.g>
      )}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.path
          d="M50 90 L47 95 L53 95 Z"
          fill="#8B4513"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

// Fern (Premium) - lots of fronds, no flowers
function FernPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight } = calculateVisuals(actionsCount);
  const frondCount = Math.min(Math.ceil(leavesCount / 3), 12);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Fronds */}
      {actionsCount > 0 && [...Array(frondCount)].map((_, i) => {
        const angle = -60 + (i / frondCount) * 120;
        const length = 20 + (stemHeight / 100) * 30;
        
        return (
          <motion.g
            key={i}
            initial={animated ? { opacity: 0, scale: 0 } : {}}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            {/* Main frond stem */}
            <path
              d={`M50 85 Q${50 + Math.sin(angle * Math.PI / 180) * length * 0.5} ${85 - length * 0.5}, ${50 + Math.sin(angle * Math.PI / 180) * length} ${85 - length}`}
              stroke={config.leafColorDark}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Frond leaves */}
            {[...Array(8)].map((_, j) => {
              const t = j / 8;
              const x = 50 + Math.sin(angle * Math.PI / 180) * length * t;
              const y = 85 - length * t;
              return (
                <ellipse
                  key={j}
                  cx={x}
                  cy={y}
                  rx={2}
                  ry={5}
                  fill={j % 2 === 0 ? config.leafColor : config.leafColorDark}
                  transform={`rotate(${angle + 90} ${x} ${y})`}
                />
              );
            })}
          </motion.g>
        );
      })}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse
          cx={50}
          cy={92}
          rx={4}
          ry={2}
          fill="#654321"
          animate={{ y: [0, -1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

// Bonsai (Premium) - twisted trunk, small leaves
function BonsaiPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight, flowers } = calculateVisuals(actionsCount);
  const trunkHeight = stemHeight * 0.6;
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Twisted trunk */}
      {actionsCount > 0 && (
        <motion.path
          d={`M50 95 Q45 ${95 - trunkHeight * 0.3}, 48 ${95 - trunkHeight * 0.5} Q55 ${95 - trunkHeight * 0.7}, 50 ${95 - trunkHeight}`}
          stroke="#8B4513"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          initial={animated ? { pathLength: 0 } : {}}
          animate={{ pathLength: 1 }}
        />
      )}
      
      {/* Branches */}
      {actionsCount > 5 && (
        <>
          <path
            d={`M48 ${95 - trunkHeight * 0.6} Q35 ${95 - trunkHeight * 0.7}, 30 ${95 - trunkHeight * 0.5}`}
            stroke="#8B4513"
            strokeWidth="2"
            fill="none"
          />
          <path
            d={`M52 ${95 - trunkHeight * 0.8} Q65 ${95 - trunkHeight * 0.9}, 70 ${95 - trunkHeight * 0.7}`}
            stroke="#8B4513"
            strokeWidth="2"
            fill="none"
          />
        </>
      )}
      
      {/* Foliage clusters */}
      {[...Array(Math.min(Math.ceil(leavesCount / 5), 6))].map((_, i) => {
        const positions = [
          { x: 50, y: 95 - trunkHeight },
          { x: 30, y: 95 - trunkHeight * 0.5 },
          { x: 70, y: 95 - trunkHeight * 0.7 },
          { x: 40, y: 95 - trunkHeight * 0.3 },
          { x: 60, y: 95 - trunkHeight * 0.4 },
          { x: 50, y: 95 - trunkHeight * 0.8 },
        ];
        const pos = positions[i] || positions[0];
        
        return (
          <motion.circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={8 + (i === 0 ? 4 : 0)}
            fill={i % 2 === 0 ? config.leafColor : config.leafColorDark}
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        );
      })}
      
      {/* Blossoms */}
      {flowers >= 1 && (
        <motion.circle cx={50} cy={95 - trunkHeight - 5} r={4} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />
      )}
      {flowers >= 2 && (
        <motion.circle cx={35} cy={95 - trunkHeight * 0.5 - 5} r={3} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />
      )}
      {flowers >= 3 && (
        <motion.circle cx={65} cy={95 - trunkHeight * 0.7 - 5} r={3} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />
      )}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse cx={50} cy={92} rx={4} ry={2} fill="#654321" animate={{ y: [0, -1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </svg>
  );
}

// Monstera (Premium) - large split leaves
function MonsteraPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight } = calculateVisuals(actionsCount);
  const leafCount = Math.min(Math.ceil(leavesCount / 5), 7);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Large split leaves */}
      {actionsCount > 0 && [...Array(leafCount)].map((_, i) => {
        const angle = -40 + (i / leafCount) * 80;
        const y = 90 - (stemHeight / 100) * (i + 1) * 10;
        const leafSize = 15 + (i * 2);
        
        return (
          <motion.g
            key={i}
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
          >
            {/* Leaf stem */}
            <path
              d={`M50 ${y} Q${50 + angle * 0.3} ${y - 10}, ${50 + angle * 0.5} ${y - leafSize}`}
              stroke={config.leafColorDark}
              strokeWidth="2"
              fill="none"
            />
            {/* Main leaf shape with holes */}
            <ellipse
              cx={50 + angle * 0.5}
              cy={y - leafSize}
              rx={leafSize * 0.7}
              ry={leafSize}
              fill={i % 2 === 0 ? config.leafColor : config.leafColorDark}
              transform={`rotate(${angle * 0.3} ${50 + angle * 0.5} ${y - leafSize})`}
            />
            {/* Monstera holes */}
            {leafSize > 12 && (
              <>
                <ellipse
                  cx={50 + angle * 0.5 - 3}
                  cy={y - leafSize}
                  rx={2}
                  ry={4}
                  fill="#1a1a2e"
                  opacity="0.3"
                />
                <ellipse
                  cx={50 + angle * 0.5 + 3}
                  cy={y - leafSize + 3}
                  rx={2}
                  ry={3}
                  fill="#1a1a2e"
                  opacity="0.3"
                />
              </>
            )}
          </motion.g>
        );
      })}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse cx={50} cy={92} rx={5} ry={3} fill="#2E4A3E" animate={{ y: [0, -1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </svg>
  );
}

// Bamboo (Premium) - segmented stalks
function BambooPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight } = calculateVisuals(actionsCount);
  const segments = Math.min(Math.ceil(actionsCount / 5), 6);
  const stalks = Math.min(Math.ceil(leavesCount / 10), 3);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {actionsCount > 0 && [...Array(stalks)].map((_, stalkIdx) => {
        const x = 40 + stalkIdx * 10;
        const height = stemHeight * (0.8 + stalkIdx * 0.1);
        
        return (
          <motion.g
            key={stalkIdx}
            initial={animated ? { scaleY: 0, opacity: 0 } : {}}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ delay: stalkIdx * 0.1 }}
            style={{ transformOrigin: `${x}px 95px` }}
          >
            {/* Stalk */}
            <rect x={x - 3} y={95 - height} width="6" height={height} fill={config.leafColor} rx="2" />
            
            {/* Segments */}
            {[...Array(segments)].map((_, segIdx) => (
              <rect
                key={segIdx}
                x={x - 4}
                y={95 - height + (segIdx + 1) * (height / (segments + 1))}
                width="8"
                height="3"
                fill={config.leafColorDark}
                rx="1"
              />
            ))}
            
            {/* Leaves at top */}
            {actionsCount > 5 && (
              <>
                <path
                  d={`M${x} ${95 - height} Q${x - 15} ${90 - height}, ${x - 20} ${93 - height}`}
                  fill={config.leafColor}
                />
                <path
                  d={`M${x} ${95 - height} Q${x + 15} ${90 - height}, ${x + 20} ${93 - height}`}
                  fill={config.leafColorDark}
                />
              </>
            )}
          </motion.g>
        );
      })}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse cx={50} cy={92} rx={4} ry={2} fill="#4A7023" animate={{ y: [0, -1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </svg>
  );
}

// Orchid (Premium) - thick leaves, dramatic flower spike
function OrchidPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight, flowers } = calculateVisuals(actionsCount);
  const leafCount = Math.min(leavesCount, 8);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {/* Base leaves */}
      {actionsCount > 0 && [...Array(leafCount)].map((_, i) => {
        const angle = -30 + (i / leafCount) * 60;
        
        return (
          <motion.ellipse
            key={i}
            cx={50}
            cy={85}
            rx={6}
            ry={18}
            fill={i % 2 === 0 ? config.leafColor : config.leafColorDark}
            transform={`rotate(${angle} 50 85)`}
            initial={animated ? { scale: 0, opacity: 0 } : {}}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          />
        );
      })}
      
      {/* Flower spike */}
      {actionsCount > 10 && (
        <motion.path
          d={`M50 75 Q55 ${75 - stemHeight * 0.4}, 60 ${75 - stemHeight * 0.6} Q65 ${75 - stemHeight * 0.8}, 60 ${75 - stemHeight}`}
          stroke={config.leafColorDark}
          strokeWidth="2"
          fill="none"
          initial={animated ? { pathLength: 0 } : {}}
          animate={{ pathLength: 1 }}
        />
      )}
      
      {/* Orchid flowers */}
      {flowers >= 1 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <ellipse cx={60} cy={75 - stemHeight} rx={8} ry={6} fill={config.flowerColor} />
          <ellipse cx={60} cy={75 - stemHeight} rx={6} ry={4} fill={config.flowerColorDark} />
          <circle cx={60} cy={75 - stemHeight} r={2} fill="#FFD700" />
        </motion.g>
      )}
      {flowers >= 2 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
          <ellipse cx={62} cy={75 - stemHeight * 0.7} rx={6} ry={5} fill={config.flowerColor} />
          <ellipse cx={62} cy={75 - stemHeight * 0.7} rx={4} ry={3} fill={config.flowerColorDark} />
        </motion.g>
      )}
      {flowers >= 3 && (
        <motion.g initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
          <ellipse cx={58} cy={75 - stemHeight * 0.5} rx={5} ry={4} fill={config.flowerColor} />
          <ellipse cx={58} cy={75 - stemHeight * 0.5} rx={3} ry={2} fill={config.flowerColorDark} />
        </motion.g>
      )}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse cx={50} cy={92} rx={4} ry={2} fill="#5D3A9B" animate={{ y: [0, -1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </svg>
  );
}

// Ivy (Premium) - trailing vines
function IvyPlant({ actionsCount, config, size, animated }: { actionsCount: number; config: PlantConfig; size: number; animated: boolean }) {
  const { leavesCount, stemHeight, flowers } = calculateVisuals(actionsCount);
  const vineCount = Math.min(Math.ceil(leavesCount / 8), 4);
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {actionsCount > 0 && [...Array(vineCount)].map((_, vineIdx) => {
        const startX = 40 + vineIdx * 8;
        const endX = 20 + vineIdx * 20;
        const length = stemHeight * 0.8;
        
        return (
          <motion.g
            key={vineIdx}
            initial={animated ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={{ delay: vineIdx * 0.1 }}
          >
            {/* Vine */}
            <path
              d={`M${startX} 70 Q${startX - 10} ${70 + length * 0.3}, ${endX} ${70 + length * 0.6} Q${endX - 5} ${70 + length * 0.8}, ${endX - 10} ${70 + length}`}
              stroke={config.leafColorDark}
              strokeWidth="2"
              fill="none"
            />
            
            {/* Ivy leaves along vine */}
            {[...Array(5)].map((_, leafIdx) => {
              const t = leafIdx / 5;
              const x = startX + (endX - startX) * t - 10 * t;
              const y = 70 + length * t;
              
              return (
                <motion.path
                  key={leafIdx}
                  d={`M${x} ${y} Q${x - 5} ${y - 5}, ${x} ${y - 8} Q${x + 5} ${y - 5}, ${x} ${y}`}
                  fill={leafIdx % 2 === 0 ? config.leafColor : config.leafColorDark}
                  initial={animated ? { scale: 0 } : {}}
                  animate={{ scale: 1 }}
                  transition={{ delay: vineIdx * 0.1 + leafIdx * 0.02 }}
                />
              );
            })}
          </motion.g>
        );
      })}
      
      {/* Tiny white flowers */}
      {flowers >= 1 && <motion.circle cx={35} cy={75} r={3} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />}
      {flowers >= 2 && <motion.circle cx={55} cy={85} r={2} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />}
      {flowers >= 3 && <motion.circle cx={25} cy={90} r={3} fill={config.flowerColor} initial={animated ? { scale: 0 } : {}} animate={{ scale: 1 }} />}
      
      {/* Seed */}
      {actionsCount === 0 && (
        <motion.ellipse cx={50} cy={85} rx={4} ry={2} fill="#3E6B48" animate={{ y: [0, -1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
      )}
    </svg>
  );
}

// Pot component
function Pot({ config, size }: { config: PlantConfig; size: number }) {
  return (
    <svg width={size} height={size * 0.3} viewBox="0 0 100 30" className="absolute bottom-0 left-1/2 -translate-x-1/2">
      {/* Pot rim */}
      <rect x="20" y="0" width="60" height="6" rx="2" fill={config.potColor} />
      {/* Pot body */}
      <path
        d="M22 6 L28 28 L72 28 L78 6 Z"
        fill={config.potColor}
      />
      {/* Pot highlight */}
      <path
        d="M25 6 L30 26 L35 26 L30 6 Z"
        fill={config.potColorDark}
        opacity="0.3"
      />
      {/* Soil */}
      <ellipse cx="50" cy="6" rx="28" ry="3" fill="#3E2723" />
    </svg>
  );
}

// Main component
export default function OnePlantSVG({
  plantType,
  actionsCount,
  size = 200,
  animated = true,
  showPot = true,
  className = '',
}: OnePlantProps) {
  const config = PLANT_CONFIGS[plantType];
  
  const PlantComponent = {
    classic: ClassicPlant,
    succulent: SucculentPlant,
    flowering: FloweringPlant,
    fern: FernPlant,
    bonsai: BonsaiPlant,
    monstera: MonsteraPlant,
    bamboo: BambooPlant,
    orchid: OrchidPlant,
    ivy: IvyPlant,
  }[plantType];
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size * 1.2 }}>
      <div style={{ width: size, height: size }}>
        <PlantComponent
          actionsCount={actionsCount}
          config={config}
          size={size}
          animated={animated}
        />
      </div>
      {showPot && <Pot config={config} size={size} />}
    </div>
  );
}

// Export configurations for external use
export { PLANT_CONFIGS, calculateVisuals };

