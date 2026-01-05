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

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Droplet, Scissors, Clock } from 'lucide-react';

// Plant Types (aligned with Mind Garden spec)
export type PlantType = 
  // Starter plants
  | 'daisy'            // Pre-Meeting Focus
  | 'chamomile'        // Quick Reset
  | 'marigold'         // End-of-Day Transition (sunset colors)
  | 'morning-glory'    // Morning Intention (climbs, opens with sun)
  | 'lavender'         // Post-Meeting Decompress
  // Unlockable by practice type
  | 'sunflower'        // 10 morning flows
  | 'evening-primrose' // 10 evening flows
  | 'rose'             // 25 extended flows
  | 'lotus'            // 10 deep meditations
  | 'poppy'            // 15 presentation preps
  | 'violet'           // 20 difficult conversation preps
  | 'fern'             // 30 gratitude entries
  | 'bamboo'           // 20 breathing practices
  | 'succulent'        // 15 thought reframes
  | 'herb'             // 25 mindful moments
  | 'moonflower'       // 15 evening flows
  | 'night-jasmine'    // 20 evening wind-downs
  | 'golden-flower'    // 25 gratitude entries
  | 'ivy'              // 14-day streak
  // Milestone trees
  | 'cherry-tree'      // 30 days consistent
  | 'oak-sapling'      // 90 days consistent
  | 'willow'           // 180 days consistent
  | 'mature-tree';     // 365 days consistent

// Growth stages
export type GrowthStage = 'seed' | 'sprout' | 'growing' | 'blooming' | 'full';

// Garden visual states (non-punitive)
export type GardenState = 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant';

// Weather types (all beautiful)
export type WeatherType = 'sunny' | 'partly-cloudy' | 'cloudy' | 'golden-hour' | 'mist' | 'gentle-rain' | 'soft-snow';

// Season type
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

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
  associatedWith?: string;
}

// Garden state (aligned with backend)
export interface GardenData {
  plants: Plant[];
  gridSize: number;
  visualState: GardenState;
  weather: WeatherType;
  season: Season;
  health: number;
  decorations: Decoration[];
  theme: 'cottage' | 'zen' | 'meadow' | 'botanical';
  // Additional metrics from backend
  streak?: number;
  totalPoints?: number;
  activitiesThisWeek?: number;
  stateTitle?: string;
  stateMessage?: string;
}

// Decoration types (aligned with spec)
export type DecorationType = 
  // Paths
  | 'stone-path' | 'brick-path' | 'gravel-path' | 'tile-path'
  // Seating
  | 'simple-bench' | 'ornate-bench' | 'garden-swing' | 'reading-nook'
  // Water features
  | 'bird-bath' | 'small-fountain' | 'koi-pond' | 'waterfall'
  // Lighting
  | 'garden-lantern' | 'string-lights' | 'solar-lights' | 'fairy-lights'
  // Structures
  | 'garden-arch' | 'pergola' | 'gazebo' | 'greenhouse';

// Companion types
export type CompanionType = 'butterflies' | 'bees' | 'birds' | 'rabbits' | 'koi-fish' | 'dragonflies';

// Decorations
export interface Decoration {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
  placedAt?: string;
}

// Garden settings
export interface GardenSettings {
  timeOfDay: 'auto' | 'morning' | 'afternoon' | 'evening' | 'night' | 'dynamic';
  showWeather: boolean;
  weatherOverride: WeatherType | 'auto';
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

interface GardenCanvasProps {
  data: GardenData;
  onPlantClick?: (plant: Plant) => void;
  onCellClick?: (x: number, y: number) => void;
  onWater?: () => void;
  onPrune?: () => void;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  interactive?: boolean;
  isWatering?: boolean;
  isPruning?: boolean;
  pendingPoints?: number;
  recentActivity?: boolean;
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

  // ============================================
  // NEW PLANTS FROM SPEC
  // ============================================

  /**
   * Evening Primrose - Post-Meeting Decompress
   * Soft yellow petals that open in evening light
   */
  'evening-primrose': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Stem */}
      <path d="M50 100 Q48 75, 50 45" stroke="#16a34a" strokeWidth="2" fill="none" />
      {/* Leaves */}
      {stage !== 'seed' && (
        <>
          <path d="M50 80 Q35 75, 32 85 Q42 82, 50 80" fill="#22c55e" />
          <path d="M50 65 Q65 60, 68 70 Q58 67, 50 65" fill="#22c55e" />
        </>
      )}
      {/* Flower - soft yellow evening bloom */}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 38)">
          {/* Outer petals - soft yellow */}
          {[...Array(4)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-15"
              rx="10"
              ry="18"
              fill="#fef08a"
              stroke="#fde047"
              strokeWidth="0.5"
              transform={`rotate(${i * 90})`}
              className="mg-plant-bloom"
            />
          ))}
          {/* Inner cup */}
          <ellipse cx="0" cy="0" rx="6" ry="5" fill="#fbbf24" />
          {/* Stamens */}
          {[...Array(6)].map((_, i) => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2={Math.cos(i * 60 * Math.PI / 180) * 5}
              y2={Math.sin(i * 60 * Math.PI / 180) * 5 - 3}
              stroke="#f59e0b"
              strokeWidth="1"
            />
          ))}
        </g>
      )}
      {/* Bud */}
      {stage === 'growing' && (
        <ellipse cx="50" cy="40" rx="6" ry="10" fill="#fef9c3" stroke="#fde047" strokeWidth="0.5" />
      )}
      {/* Sprout */}
      {stage === 'sprout' && (
        <path d="M50 85 Q45 75, 50 65 Q55 75, 50 85" fill="#22c55e" />
      )}
    </svg>
  ),

  /**
   * Morning Glory - Morning Intention Flow
   * Trumpet-shaped emerald/blue flowers on climbing vine
   */
  'morning-glory': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Climbing vine */}
      <path 
        d="M30 100 Q25 80, 35 65 Q45 50, 40 35 Q35 20, 50 15" 
        stroke="#16a34a" 
        strokeWidth="2" 
        fill="none" 
      />
      {/* Tendrils */}
      {stage !== 'seed' && (
        <>
          <path d="M35 70 Q25 65, 20 70" stroke="#22c55e" strokeWidth="1" fill="none" />
          <path d="M40 50 Q50 45, 55 50" stroke="#22c55e" strokeWidth="1" fill="none" />
        </>
      )}
      {/* Heart-shaped leaves */}
      {stage !== 'seed' && (
        <>
          <path d="M35 75 Q25 70, 25 80 Q30 85, 35 75" fill="#22c55e" />
          <path d="M42 55 Q52 50, 55 60 Q48 62, 42 55" fill="#22c55e" />
          <path d="M38 35 Q28 30, 30 40 Q35 42, 38 35" fill="#22c55e" />
        </>
      )}
      {/* Trumpet flowers */}
      {(stage === 'blooming' || stage === 'full') && (
        <>
          {/* Main flower */}
          <g transform="translate(50, 18) rotate(-15)">
            <ellipse cx="0" cy="0" rx="12" ry="10" fill="#8b5cf6" />
            <ellipse cx="0" cy="2" rx="10" ry="8" fill="#a78bfa" />
            <ellipse cx="0" cy="4" rx="6" ry="5" fill="#c4b5fd" />
            <circle cx="0" cy="5" r="3" fill="#fef9c3" />
            {/* Star pattern in center */}
            {[...Array(5)].map((_, i) => (
              <line
                key={i}
                x1="0"
                y1="5"
                x2={Math.cos((i * 72 - 90) * Math.PI / 180) * 4}
                y2={5 + Math.sin((i * 72 - 90) * Math.PI / 180) * 4}
                stroke="white"
                strokeWidth="0.5"
                opacity="0.6"
              />
            ))}
          </g>
          {/* Secondary flower */}
          {stage === 'full' && (
            <g transform="translate(28, 40) rotate(15)">
              <ellipse cx="0" cy="0" rx="8" ry="7" fill="#7c3aed" />
              <ellipse cx="0" cy="2" rx="6" ry="5" fill="#8b5cf6" />
              <circle cx="0" cy="3" r="2" fill="#fef9c3" />
            </g>
          )}
        </>
      )}
      {/* Bud */}
      {stage === 'growing' && (
        <g transform="translate(48, 20)">
          <ellipse cx="0" cy="0" rx="5" ry="8" fill="#c4b5fd" />
        </g>
      )}
    </svg>
  ),

  /**
   * Night Jasmine - Evening Wind-Down Flow
   * Small white star-shaped flowers, delicate and fragrant
   */
  'night-jasmine': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Main stem */}
      <path d="M50 100 Q50 75, 48 55 Q46 40, 50 25" stroke="#16a34a" strokeWidth="2" fill="none" />
      {/* Side branches */}
      {stage !== 'seed' && (
        <>
          <path d="M48 70 Q35 65, 30 55" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          <path d="M50 50 Q65 45, 70 35" stroke="#22c55e" strokeWidth="1.5" fill="none" />
        </>
      )}
      {/* Small oval leaves */}
      {stage !== 'seed' && (
        <>
          <ellipse cx="42" cy="80" rx="6" ry="4" fill="#22c55e" transform="rotate(-20 42 80)" />
          <ellipse cx="56" cy="65" rx="6" ry="4" fill="#22c55e" transform="rotate(15 56 65)" />
          <ellipse cx="44" cy="45" rx="5" ry="3" fill="#22c55e" transform="rotate(-10 44 45)" />
        </>
      )}
      {/* Star-shaped white flowers */}
      {(stage === 'blooming' || stage === 'full') && (
        <>
          {/* Flower cluster 1 */}
          <g transform="translate(50, 22)">
            {[...Array(5)].map((_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-6"
                rx="2"
                ry="5"
                fill="white"
                transform={`rotate(${i * 72})`}
                className="mg-plant-bloom"
              />
            ))}
            <circle cx="0" cy="0" r="3" fill="#fef9c3" />
          </g>
          {/* Flower cluster 2 */}
          <g transform="translate(30, 52)">
            {[...Array(5)].map((_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-5"
                rx="1.5"
                ry="4"
                fill="white"
                transform={`rotate(${i * 72})`}
                className="mg-plant-bloom"
              />
            ))}
            <circle cx="0" cy="0" r="2" fill="#fef9c3" />
          </g>
          {/* Flower cluster 3 */}
          {stage === 'full' && (
            <g transform="translate(70, 32)">
              {[...Array(5)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-5"
                  rx="1.5"
                  ry="4"
                  fill="white"
                  transform={`rotate(${i * 72})`}
                  className="mg-plant-bloom"
                />
              ))}
              <circle cx="0" cy="0" r="2" fill="#fef9c3" />
            </g>
          )}
          {/* Fragrance indicator - subtle glow */}
          <circle cx="50" cy="22" r="15" fill="white" opacity="0.1" className="mg-fragrance" />
        </>
      )}
      {/* Buds */}
      {stage === 'growing' && (
        <>
          <ellipse cx="50" cy="25" rx="3" ry="5" fill="#f0fdf4" />
          <ellipse cx="32" cy="55" rx="2" ry="4" fill="#f0fdf4" />
        </>
      )}
    </svg>
  ),

  /**
   * Mature Tree - Deep Meditation
   * A full, majestic tree that grows slowly over multiple sessions
   */
  'mature-tree': ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Trunk */}
      <path 
        d="M45 100 L45 60 Q45 55, 40 50 M55 100 L55 60 Q55 55, 60 50 M50 65 L50 45" 
        stroke="#78350f" 
        strokeWidth="6" 
        fill="none" 
        strokeLinecap="round"
      />
      {/* Roots */}
      <path d="M40 100 Q35 95, 25 98" stroke="#92400e" strokeWidth="3" fill="none" />
      <path d="M60 100 Q65 95, 75 98" stroke="#92400e" strokeWidth="3" fill="none" />
      {/* Crown layers based on growth */}
      {stage === 'seed' && (
        <ellipse cx="50" cy="90" rx="8" ry="5" fill="#92400e" />
      )}
      {stage === 'sprout' && (
        <>
          <rect x="48" y="70" width="4" height="30" fill="#78350f" />
          <ellipse cx="50" cy="65" rx="10" ry="12" fill="#22c55e" />
        </>
      )}
      {stage === 'growing' && (
        <>
          <ellipse cx="50" cy="40" rx="25" ry="20" fill="#22c55e" />
          <ellipse cx="35" cy="45" rx="15" ry="12" fill="#16a34a" />
          <ellipse cx="65" cy="45" rx="15" ry="12" fill="#16a34a" />
        </>
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <g>
          {/* Main crown */}
          <ellipse cx="50" cy="35" rx="35" ry="28" fill="#22c55e" />
          <ellipse cx="30" cy="40" rx="20" ry="18" fill="#16a34a" />
          <ellipse cx="70" cy="40" rx="20" ry="18" fill="#16a34a" />
          <ellipse cx="50" cy="25" rx="25" ry="20" fill="#15803d" />
          {/* Highlight */}
          <ellipse cx="45" cy="20" rx="12" ry="10" fill="#22c55e" opacity="0.5" />
          {/* Birds (for full stage) */}
          {stage === 'full' && (
            <>
              <path d="M25 30 Q28 27, 31 30 Q34 27, 37 30" stroke="#374151" strokeWidth="1" fill="none" />
              <path d="M65 25 Q67 23, 69 25" stroke="#374151" strokeWidth="0.8" fill="none" />
            </>
          )}
          {/* Subtle glow for meditation */}
          <ellipse cx="50" cy="35" rx="40" ry="32" fill="white" opacity="0.05" />
        </g>
      )}
    </svg>
  ),

  // ============================================
  // ADDITIONAL PLANTS (New for Advanced Mechanics)
  // ============================================

  /**
   * Marigold - End-of-Day Transition (starter)
   * Warm sunset colors, represents work-life boundary
   */
  marigold: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q50 80, 50 55" stroke="#16a34a" strokeWidth="2" fill="none" />
      {stage !== 'seed' && (
        <>
          <path d="M50 85 Q38 80, 35 88 Q43 86, 50 85" fill="#22c55e" />
          <path d="M50 70 Q62 65, 65 73 Q57 71, 50 70" fill="#22c55e" />
        </>
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 48)">
          {/* Outer petals - orange */}
          {[...Array(12)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-12"
              rx="4"
              ry="10"
              fill="#f97316"
              transform={`rotate(${i * 30})`}
              className="mg-plant-bloom"
            />
          ))}
          {/* Inner petals - yellow */}
          {[...Array(8)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-8"
              rx="3"
              ry="7"
              fill="#fbbf24"
              transform={`rotate(${i * 45 + 22.5})`}
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#ea580c" />
        </g>
      )}
      {stage === 'growing' && (
        <ellipse cx="50" cy="50" rx="6" ry="10" fill="#fdba74" />
      )}
    </svg>
  ),

  /**
   * Poppy - Presentation Preps
   * Bold red/orange, represents confidence
   */
  poppy: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      <path d="M50 100 Q48 75, 50 45" stroke="#16a34a" strokeWidth="2" fill="none" />
      {stage !== 'seed' && (
        <path d="M50 80 Q35 75, 33 85 Q42 82, 50 80" fill="#22c55e" />
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <g transform="translate(50, 38)">
          {/* Delicate petals - crinkled effect */}
          {[...Array(4)].map((_, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-12"
              rx="12"
              ry="16"
              fill={i % 2 === 0 ? '#ef4444' : '#dc2626'}
              transform={`rotate(${i * 90 + 45})`}
              className="mg-plant-bloom"
            />
          ))}
          {/* Black center */}
          <circle cx="0" cy="0" r="6" fill="#1f2937" />
          {/* Stamens */}
          {[...Array(8)].map((_, i) => (
            <circle
              key={i}
              cx={Math.cos(i * 45 * Math.PI / 180) * 4}
              cy={Math.sin(i * 45 * Math.PI / 180) * 4}
              r="1"
              fill="#fbbf24"
            />
          ))}
        </g>
      )}
      {stage === 'growing' && (
        <ellipse cx="50" cy="42" rx="5" ry="8" fill="#86efac" />
      )}
    </svg>
  ),

  /**
   * Violet - Difficult Conversation Preps
   * Delicate strength, emerald tones
   */
  violet: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant mg-plant-sway">
      {/* Low growing, clustered */}
      <path d="M50 100 Q50 90, 50 75" stroke="#16a34a" strokeWidth="1.5" fill="none" />
      {/* Heart-shaped leaves */}
      {stage !== 'seed' && (
        <>
          <path d="M50 95 Q35 88, 30 95 Q40 100, 50 95" fill="#22c55e" />
          <path d="M50 95 Q65 88, 70 95 Q60 100, 50 95" fill="#22c55e" />
          <path d="M45 85 Q30 78, 28 88 Q38 90, 45 85" fill="#16a34a" />
        </>
      )}
      {(stage === 'blooming' || stage === 'full') && (
        <>
          {/* Flower 1 */}
          <g transform="translate(50, 65)">
            {[...Array(5)].map((_, i) => (
              <ellipse
                key={i}
                cx="0"
                cy="-8"
                rx="5"
                ry="8"
                fill={i < 2 ? '#8b5cf6' : '#a78bfa'}
                transform={`rotate(${i * 72})`}
                className="mg-plant-bloom"
              />
            ))}
            <circle cx="0" cy="0" r="3" fill="#fef9c3" />
          </g>
          {/* Flower 2 */}
          {stage === 'full' && (
            <g transform="translate(35, 72)">
              {[...Array(5)].map((_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-6"
                  rx="4"
                  ry="6"
                  fill="#7c3aed"
                  transform={`rotate(${i * 72})`}
                />
              ))}
              <circle cx="0" cy="0" r="2" fill="#fef9c3" />
            </g>
          )}
        </>
      )}
      {stage === 'growing' && (
        <ellipse cx="50" cy="68" rx="4" ry="6" fill="#c4b5fd" />
      )}
    </svg>
  ),

  /**
   * Herb Garden - Mindful Moments
   * Practical, aromatic collection (basil, mint, sage)
   */
  herb: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Pot/base */}
      <rect x="30" y="85" width="40" height="15" rx="3" fill="#92400e" />
      <rect x="25" y="82" width="50" height="5" rx="2" fill="#78350f" />
      
      {stage !== 'seed' && (
        <>
          {/* Basil (left) */}
          <path d="M38 85 Q38 70, 35 55" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <ellipse cx="32" cy="55" rx="6" ry="4" fill="#22c55e" transform="rotate(-30 32 55)" />
          <ellipse cx="38" cy="50" rx="5" ry="3.5" fill="#22c55e" transform="rotate(15 38 50)" />
          <ellipse cx="30" cy="48" rx="5" ry="3.5" fill="#16a34a" transform="rotate(-20 30 48)" />
          
          {/* Mint (center) */}
          <path d="M50 85 Q50 65, 50 45" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <ellipse cx="45" cy="50" rx="5" ry="4" fill="#4ade80" transform="rotate(-15 45 50)" />
          <ellipse cx="55" cy="48" rx="5" ry="4" fill="#4ade80" transform="rotate(15 55 48)" />
          <ellipse cx="48" cy="42" rx="4" ry="3" fill="#22c55e" transform="rotate(-10 48 42)" />
          
          {/* Sage (right) */}
          <path d="M62 85 Q62 70, 65 55" stroke="#16a34a" strokeWidth="1.5" fill="none" />
          <ellipse cx="68" cy="58" rx="7" ry="4" fill="#6b7280" transform="rotate(20 68 58)" />
          <ellipse cx="62" cy="52" rx="6" ry="3.5" fill="#9ca3af" transform="rotate(-10 62 52)" />
          <ellipse cx="70" cy="50" rx="5" ry="3" fill="#6b7280" transform="rotate(25 70 50)" />
        </>
      )}
      
      {(stage === 'blooming' || stage === 'full') && (
        <>
          {/* Small flowers on mint */}
          {[...Array(3)].map((_, i) => (
            <circle key={i} cx={48 + i * 4} cy={38 - i * 2} r="2" fill="#e9d5ff" />
          ))}
        </>
      )}
    </svg>
  ),

  /**
   * Willow - 180 Days Consistent
   * Graceful, flowing, contemplative milestone tree
   */
  willow: ({ stage, size }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant">
      {/* Trunk */}
      <path d="M50 100 L50 55" stroke="#78350f" strokeWidth="5" fill="none" />
      {/* Main branches */}
      {stage !== 'seed' && (
        <>
          <path d="M50 60 Q35 50, 25 55" stroke="#78350f" strokeWidth="2" fill="none" />
          <path d="M50 60 Q65 50, 75 55" stroke="#78350f" strokeWidth="2" fill="none" />
          <path d="M50 55 Q40 45, 30 50" stroke="#92400e" strokeWidth="1.5" fill="none" />
          <path d="M50 55 Q60 45, 70 50" stroke="#92400e" strokeWidth="1.5" fill="none" />
        </>
      )}
      {/* Weeping branches */}
      {(stage === 'growing' || stage === 'blooming' || stage === 'full') && (
        <>
          {/* Left weeping branches */}
          <path d="M25 55 Q20 65, 15 85" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
          <path d="M30 52 Q25 65, 20 82" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
          <path d="M35 50 Q30 65, 28 80" stroke="#16a34a" strokeWidth="1" fill="none" className="mg-plant-sway" />
          {/* Right weeping branches */}
          <path d="M75 55 Q80 65, 85 85" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
          <path d="M70 52 Q75 65, 80 82" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
          <path d="M65 50 Q70 65, 72 80" stroke="#16a34a" strokeWidth="1" fill="none" className="mg-plant-sway" />
          {/* Center weeping */}
          <path d="M45 48 Q40 60, 38 75" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
          <path d="M55 48 Q60 60, 62 75" stroke="#22c55e" strokeWidth="1" fill="none" className="mg-plant-sway" />
        </>
      )}
      {/* Crown foliage */}
      {(stage === 'blooming' || stage === 'full') && (
        <g>
          <ellipse cx="50" cy="45" rx="25" ry="15" fill="#22c55e" opacity="0.8" />
          <ellipse cx="35" cy="48" rx="15" ry="10" fill="#16a34a" opacity="0.7" />
          <ellipse cx="65" cy="48" rx="15" ry="10" fill="#16a34a" opacity="0.7" />
        </g>
      )}
    </svg>
  ),
};

// Procedural filler element types
interface FillerElement {
  id: string;
  type: 'grass' | 'wildflower' | 'pebble';
  x: number;
  y: number;
  variant: number;
  delay: number;
}

// Generate procedural filler elements based on health and pending points
// Optimized: limit total elements to prevent performance issues
function generateFillerElements(gridSize: number, health: number, pendingPoints: number, plants: Plant[]): FillerElement[] {
  const elements: FillerElement[] = [];
  const occupiedCells = new Set(plants.map(p => `${p.x},${p.y}`));
  
  // Limit total elements to prevent performance issues (max ~60 elements)
  const MAX_ELEMENTS = 60;
  const emptyCells: {x: number, y: number}[] = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!occupiedCells.has(`${x},${y}`)) {
        emptyCells.push({x, y});
      }
    }
  }
  
  // Randomly sample empty cells to keep element count manageable
  const sampled = emptyCells.sort(() => Math.random() - 0.5).slice(0, Math.min(emptyCells.length, 15));
  
  // More filler as health increases, but capped
  const density = Math.min(2, Math.floor((health / 100) * 2) + 1);
  const wildflowerChance = Math.min(0.35, (health / 100) * 0.4 + (pendingPoints > 0 ? 0.15 : 0));
  
  for (const {x, y} of sampled) {
    if (elements.length >= MAX_ELEMENTS) break;
    
    // Add grass tufts (limited)
    for (let i = 0; i < density && elements.length < MAX_ELEMENTS; i++) {
      if (Math.random() < 0.6) {
        elements.push({
          id: `grass-${x}-${y}-${i}`,
          type: 'grass',
          x: x + (Math.random() * 0.8 - 0.4),
          y: y + (Math.random() * 0.8 - 0.4),
          variant: Math.floor(Math.random() * 3),
          delay: Math.random() * 2,
        });
      }
    }
    
    // Add wildflowers (more common with higher health)
    if (Math.random() < wildflowerChance && elements.length < MAX_ELEMENTS) {
      elements.push({
        id: `flower-${x}-${y}`,
        type: 'wildflower',
        x: x + (Math.random() * 0.6 - 0.3),
        y: y + (Math.random() * 0.6 - 0.3),
        variant: Math.floor(Math.random() * 5),
        delay: Math.random() * 1.5,
      });
    }
    
    // Add occasional pebbles
    if (Math.random() < 0.1 && elements.length < MAX_ELEMENTS) {
      elements.push({
        id: `pebble-${x}-${y}`,
        type: 'pebble',
        x: x + (Math.random() * 0.6 - 0.3),
        y: y + (Math.random() * 0.6 - 0.3),
        variant: Math.floor(Math.random() * 3),
        delay: 0,
      });
    }
  }
  
  return elements;
}

export default function GardenCanvas({
  data,
  onPlantClick,
  onCellClick,
  onWater,
  onPrune,
  timeOfDay = 'afternoon',
  interactive = true,
  isWatering = false,
  isPruning = false,
  pendingPoints = 0,
  recentActivity = false,
}: GardenCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [timeLapseStage, setTimeLapseStage] = useState(0);
  const [showActivityBurst, setShowActivityBurst] = useState(false);
  const [prevPendingPoints, setPrevPendingPoints] = useState(pendingPoints);
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null);
  const [showLushBoost, setShowLushBoost] = useState(false);
  
  // Generate filler elements (memoized based on key data)
  const fillerElements = useRef<FillerElement[]>([]);
  useEffect(() => {
    fillerElements.current = generateFillerElements(
      data.gridSize, 
      data.health || 50, 
      pendingPoints,
      data.plants || []
    );
  }, [data.gridSize, data.health, data.plants?.length, pendingPoints > 0]);
  
  // Detect when pendingPoints increases to trigger activity burst and lush boost
  useEffect(() => {
    if (pendingPoints > prevPendingPoints) {
      const pointsGained = pendingPoints - prevPendingPoints;
      setShowActivityBurst(true);
      setFloatingPoints(pointsGained);
      setShowLushBoost(true);
      
      // Hide after animation
      const timer = setTimeout(() => {
        setShowActivityBurst(false);
        setFloatingPoints(null);
      }, 2500);
      
      const lushTimer = setTimeout(() => {
        setShowLushBoost(false);
      }, 2000);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(lushTimer);
      };
    }
    setPrevPendingPoints(pendingPoints);
  }, [pendingPoints, prevPendingPoints]);
  
  // Time-lapse effect - cycle through growth stages
  useEffect(() => {
    if (!showTimeLapse) {
      setTimeLapseStage(0);
      return;
    }
    
    const stages = ['seed', 'sprout', 'growing', 'blooming', 'full'];
    const interval = setInterval(() => {
      setTimeLapseStage(prev => (prev + 1) % stages.length);
    }, 800);
    
    return () => clearInterval(interval);
  }, [showTimeLapse]);
  
  // Get time-lapse growth stage
  const getTimeLapseStage = (originalStage: GrowthStage): GrowthStage => {
    if (!showTimeLapse) return originalStage;
    const stages: GrowthStage[] = ['seed', 'sprout', 'growing', 'blooming'];
    return stages[timeLapseStage % stages.length];
  };
  
  // Generate water droplet positions for animation
  const waterDroplets = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    startY: -20 - Math.random() * 30,
    endY: 80 + Math.random() * 20,
    delay: Math.random() * 0.5,
    duration: 0.8 + Math.random() * 0.4,
    size: 4 + Math.random() * 4,
  }));
  
  // Generate sparkle positions for pruning animation  
  const pruneSparkles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    delay: Math.random() * 0.3,
    scale: 0.5 + Math.random() * 0.5,
  }));

  // Calculate cell size based on grid
  const cellSize = Math.min(80, 600 / data.gridSize);

  // Get visual state (default to stable if not provided)
  const visualState = data.visualState || 'stable';

  // Get weather class (handle new weather types)
  const weatherClass = `mg-weather-${data.weather || 'sunny'}`;

  // Get time of day lighting (overlays on top of state background)
  const getLighting = () => {
    switch (timeOfDay) {
      case 'morning':
        return 'bg-gradient-to-b from-amber-100/20 to-transparent';
      case 'afternoon':
        return 'bg-gradient-to-b from-white/10 to-transparent';
      case 'evening':
        return 'bg-gradient-to-b from-orange-200/30 to-slate-200/10';
      case 'night':
        return 'bg-gradient-to-b from-slate-900/40 to-transparent';
    }
  };

  // Get state-based background gradient
  const getStateBackground = () => {
    switch (visualState) {
      case 'thriving':
        return 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #ccfbf1 100%)';
      case 'growing':
        return 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 50%, #f0fdf4 100%)';
      case 'stable':
        return 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 50%, #ecfdf5 100%)';
      case 'idle':
        return 'linear-gradient(135deg, #fffbeb 0%, #fed7aa 50%, #fce7f3 100%)';
      case 'dormant':
        return 'linear-gradient(135deg, #f1f5f9 0%, #f5f3ff 50%, #eef2ff 100%)';
      default:
        return 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)';
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

  // Decoration SVG components
  const DecorationSVG: Record<DecorationType, (size: number) => JSX.Element> = {
    // Paths
    'stone-path': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <ellipse cx="30" cy="30" rx="15" ry="12" fill="#94a3b8" />
        <ellipse cx="60" cy="25" rx="18" ry="14" fill="#9ca3af" />
        <ellipse cx="45" cy="55" rx="20" ry="15" fill="#6b7280" />
        <ellipse cx="70" cy="60" rx="16" ry="13" fill="#94a3b8" />
        <ellipse cx="25" cy="75" rx="14" ry="11" fill="#9ca3af" />
        <ellipse cx="55" cy="80" rx="17" ry="12" fill="#6b7280" />
      </svg>
    ),
    'brick-path': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="10" y="15" width="35" height="20" fill="#b45309" rx="2" />
        <rect x="55" y="15" width="35" height="20" fill="#d97706" rx="2" />
        <rect x="10" y="40" width="35" height="20" fill="#d97706" rx="2" />
        <rect x="55" y="40" width="35" height="20" fill="#b45309" rx="2" />
        <rect x="10" y="65" width="35" height="20" fill="#b45309" rx="2" />
        <rect x="55" y="65" width="35" height="20" fill="#d97706" rx="2" />
      </svg>
    ),
    'gravel-path': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        {[...Array(40)].map((_, i) => (
          <circle
            key={i}
            cx={10 + Math.random() * 80}
            cy={10 + Math.random() * 80}
            r={2 + Math.random() * 3}
            fill={i % 2 === 0 ? '#d1d5db' : '#9ca3af'}
          />
        ))}
      </svg>
    ),
    'tile-path': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="5" y="5" width="40" height="40" fill="#f0abfc" rx="3" />
        <rect x="55" y="5" width="40" height="40" fill="#c4b5fd" rx="3" />
        <rect x="5" y="55" width="40" height="40" fill="#c4b5fd" rx="3" />
        <rect x="55" y="55" width="40" height="40" fill="#f0abfc" rx="3" />
        <circle cx="25" cy="25" r="8" fill="#a855f7" opacity="0.3" />
        <circle cx="75" cy="75" r="8" fill="#a855f7" opacity="0.3" />
      </svg>
    ),
    // Seating
    'simple-bench': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="15" y="40" width="70" height="8" fill="#92400e" rx="2" />
        <rect x="20" y="48" width="8" height="30" fill="#78350f" />
        <rect x="72" y="48" width="8" height="30" fill="#78350f" />
        <rect x="18" y="75" width="12" height="5" fill="#78350f" />
        <rect x="70" y="75" width="12" height="5" fill="#78350f" />
      </svg>
    ),
    'ornate-bench': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M15 30 Q50 20, 85 30" stroke="#92400e" strokeWidth="4" fill="none" />
        <rect x="15" y="35" width="70" height="10" fill="#b45309" rx="3" />
        <path d="M20 45 Q25 60, 20 75" stroke="#78350f" strokeWidth="5" fill="none" />
        <path d="M80 45 Q75 60, 80 75" stroke="#78350f" strokeWidth="5" fill="none" />
        <ellipse cx="20" cy="77" rx="5" ry="3" fill="#78350f" />
        <ellipse cx="80" cy="77" rx="5" ry="3" fill="#78350f" />
      </svg>
    ),
    'garden-swing': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100" className="mg-plant-sway">
        <rect x="20" y="5" width="60" height="5" fill="#78350f" />
        <line x1="25" y1="10" x2="25" y2="45" stroke="#92400e" strokeWidth="3" />
        <line x1="75" y1="10" x2="75" y2="45" stroke="#92400e" strokeWidth="3" />
        <rect x="20" y="45" width="60" height="10" fill="#b45309" rx="3" />
        <rect x="18" y="55" width="64" height="25" fill="#d97706" rx="5" />
        <ellipse cx="50" cy="82" rx="25" ry="3" fill="rgba(0,0,0,0.1)" />
      </svg>
    ),
    'reading-nook': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <ellipse cx="50" cy="75" rx="35" ry="15" fill="#d1d5db" />
        <ellipse cx="50" cy="65" rx="30" ry="20" fill="#f1f5f9" />
        <rect x="65" y="55" width="15" height="20" fill="#b45309" rx="2" />
        <rect x="67" y="57" width="11" height="16" fill="#fef3c7" />
      </svg>
    ),
    // Water features
    'bird-bath': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="45" y="50" width="10" height="35" fill="#9ca3af" />
        <ellipse cx="50" cy="50" rx="30" ry="10" fill="#6b7280" />
        <ellipse cx="50" cy="45" rx="25" ry="8" fill="#38bdf8" opacity="0.7" />
        <ellipse cx="50" cy="88" rx="18" ry="5" fill="#6b7280" />
      </svg>
    ),
    'small-fountain': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <ellipse cx="50" cy="80" rx="35" ry="12" fill="#6b7280" />
        <ellipse cx="50" cy="75" rx="30" ry="10" fill="#38bdf8" opacity="0.6" />
        <rect x="45" y="40" width="10" height="35" fill="#9ca3af" />
        <circle cx="50" cy="35" r="12" fill="#6b7280" />
        <path d="M50 25 Q55 15, 50 5 Q45 15, 50 25" fill="#38bdf8" opacity="0.8" className="mg-fountain-spray" />
        <path d="M40 30 Q35 20, 40 10" stroke="#38bdf8" strokeWidth="2" fill="none" className="mg-fountain-spray" />
        <path d="M60 30 Q65 20, 60 10" stroke="#38bdf8" strokeWidth="2" fill="none" className="mg-fountain-spray" />
      </svg>
    ),
    'koi-pond': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <ellipse cx="50" cy="50" rx="45" ry="35" fill="#0891b2" opacity="0.7" />
        <ellipse cx="50" cy="45" rx="40" ry="30" fill="#38bdf8" opacity="0.6" />
        <path d="M30 50 Q35 45, 40 50 Q35 55, 30 50" fill="#fb923c" className="mg-fish-swim" />
        <path d="M60 40 Q65 35, 70 40 Q65 45, 60 40" fill="#f43f5e" className="mg-fish-swim" style={{ animationDelay: '0.5s' }} />
        <path d="M45 60 Q50 55, 55 60 Q50 65, 45 60" fill="#fbbf24" className="mg-fish-swim" style={{ animationDelay: '1s' }} />
        <circle cx="25" cy="40" r="10" fill="#22c55e" />
        <circle cx="75" cy="55" r="8" fill="#22c55e" />
      </svg>
    ),
    'waterfall': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M20 20 L30 20 L30 30 L50 30 L50 10 L70 10 L70 25 L80 25 L80 35" fill="#6b7280" />
        <path d="M25 20 L25 80" stroke="#38bdf8" strokeWidth="8" opacity="0.6" className="mg-waterfall" />
        <path d="M45 30 L45 80" stroke="#38bdf8" strokeWidth="8" opacity="0.6" className="mg-waterfall" style={{ animationDelay: '0.3s' }} />
        <path d="M65 10 L65 80" stroke="#38bdf8" strokeWidth="8" opacity="0.6" className="mg-waterfall" style={{ animationDelay: '0.6s' }} />
        <ellipse cx="50" cy="85" rx="40" ry="10" fill="#0891b2" opacity="0.7" />
      </svg>
    ),
    // Lighting
    'garden-lantern': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="45" y="60" width="10" height="30" fill="#78350f" />
        <rect x="40" y="40" width="20" height="25" fill="#1f2937" />
        <rect x="42" y="42" width="16" height="21" fill="#fef08a" opacity="0.9" className="mg-lantern-glow" />
        <rect x="35" y="35" width="30" height="8" fill="#374151" />
        <polygon points="50,20 35,35 65,35" fill="#374151" />
      </svg>
    ),
    'string-lights': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M10 30 Q30 50, 50 30 Q70 10, 90 30" stroke="#374151" strokeWidth="2" fill="none" />
        {[20, 35, 50, 65, 80].map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={30 + (i % 2) * 10} r="5" fill={['#fef08a', '#f0abfc', '#a5f3fc', '#fca5a1', '#86efac'][i]} className="mg-string-light" style={{ animationDelay: `${i * 0.2}s` }} />
          </g>
        ))}
      </svg>
    ),
    'solar-lights': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        {[25, 50, 75].map((x, i) => (
          <g key={i}>
            <rect x={x - 3} y="50" width="6" height="35" fill="#374151" />
            <circle cx={x} cy="45" r="8" fill="#fef08a" opacity="0.8" className="mg-solar-glow" style={{ animationDelay: `${i * 0.5}s` }} />
            <rect x={x - 5} y="40" width="10" height="5" fill="#1f2937" />
          </g>
        ))}
      </svg>
    ),
    'fairy-lights': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        {[...Array(15)].map((_, i) => (
          <circle
            key={i}
            cx={10 + Math.random() * 80}
            cy={10 + Math.random() * 80}
            r="3"
            fill={['#fef08a', '#f0abfc', '#a5f3fc', '#fca5a1', '#86efac'][i % 5]}
            className="mg-fairy-light"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </svg>
    ),
    // Structures
    'garden-arch': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M20 90 L20 40 Q50 10, 80 40 L80 90" stroke="#92400e" strokeWidth="6" fill="none" />
        <path d="M25 90 L25 45 Q50 20, 75 45 L75 90" stroke="#78350f" strokeWidth="4" fill="none" />
        <path d="M22 50 Q35 45, 35 60" stroke="#22c55e" strokeWidth="3" fill="none" />
        <path d="M78 50 Q65 45, 65 60" stroke="#22c55e" strokeWidth="3" fill="none" />
        <circle cx="30" cy="55" r="4" fill="#f472b6" />
        <circle cx="70" cy="55" r="4" fill="#f472b6" />
      </svg>
    ),
    'pergola': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="15" y="20" width="8" height="70" fill="#92400e" />
        <rect x="77" y="20" width="8" height="70" fill="#92400e" />
        <rect x="10" y="15" width="80" height="8" fill="#78350f" />
        {[25, 45, 65].map((x, i) => (
          <rect key={i} x={x} y="10" width="5" height="15" fill="#92400e" />
        ))}
        <path d="M15 30 Q50 20, 85 30" stroke="#22c55e" strokeWidth="8" fill="none" opacity="0.7" />
      </svg>
    ),
    'gazebo': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <polygon points="50,5 10,30 90,30" fill="#78350f" />
        <rect x="15" y="30" width="8" height="55" fill="#92400e" />
        <rect x="77" y="30" width="8" height="55" fill="#92400e" />
        <rect x="46" y="30" width="8" height="55" fill="#92400e" />
        <path d="M10 85 Q50 80, 90 85" stroke="#d1d5db" strokeWidth="3" fill="none" />
        <rect x="25" y="75" width="50" height="10" fill="#e5e7eb" opacity="0.5" />
      </svg>
    ),
    'greenhouse': (size) => (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="15" y="40" width="70" height="50" fill="#1f2937" opacity="0.3" />
        <rect x="15" y="40" width="70" height="50" stroke="#6b7280" strokeWidth="2" fill="none" />
        <polygon points="50,10 15,40 85,40" fill="#6b7280" opacity="0.3" />
        <polygon points="50,10 15,40 85,40" stroke="#6b7280" strokeWidth="2" fill="none" />
        <line x1="50" y1="10" x2="50" y2="40" stroke="#6b7280" strokeWidth="1" />
        <line x1="15" y1="60" x2="85" y2="60" stroke="#6b7280" strokeWidth="1" />
        <line x1="15" y1="75" x2="85" y2="75" stroke="#6b7280" strokeWidth="1" />
        <line x1="35" y1="40" x2="35" y2="90" stroke="#6b7280" strokeWidth="1" />
        <line x1="65" y1="40" x2="65" y2="90" stroke="#6b7280" strokeWidth="1" />
        <circle cx="30" cy="70" r="5" fill="#22c55e" />
        <circle cx="50" cy="65" r="6" fill="#16a34a" />
        <circle cx="70" cy="70" r="5" fill="#22c55e" />
      </svg>
    ),
  };

  // Render procedural filler (grass, wildflowers, pebbles)
  const renderProceduralFiller = () => {
    if (!fillerElements.current.length) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 5 }}>
        {fillerElements.current.map((element) => {
          const left = ((element.x + 0.5) / data.gridSize) * 100;
          const top = ((element.y + 0.5) / data.gridSize) * 100;
          
          if (element.type === 'grass') {
            const height = 8 + element.variant * 4;
            return (
              <div
                key={element.id}
                className="absolute mg-grass-tuft"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${element.delay}s`,
                }}
              >
                <svg width="12" height={height} viewBox={`0 0 12 ${height}`}>
                  <path
                    d={`M4 ${height} Q3 ${height * 0.6}, 2 ${height * 0.3} Q1 0, 3 ${height * 0.4} Q4 ${height * 0.7}, 4 ${height}`}
                    fill="#22c55e"
                    opacity="0.8"
                  />
                  <path
                    d={`M6 ${height} Q6 ${height * 0.5}, 6 ${height * 0.2} Q6 0, 6 ${height * 0.3} Q6 ${height * 0.6}, 6 ${height}`}
                    fill="#16a34a"
                    opacity="0.9"
                  />
                  <path
                    d={`M8 ${height} Q9 ${height * 0.6}, 10 ${height * 0.3} Q11 0, 9 ${height * 0.4} Q8 ${height * 0.7}, 8 ${height}`}
                    fill="#22c55e"
                    opacity="0.7"
                  />
                </svg>
              </div>
            );
          }
          
          if (element.type === 'wildflower') {
            const colors = ['#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#38bdf8'];
            const color = colors[element.variant % colors.length];
            return (
              <div
                key={element.id}
                className="absolute mg-wildflower"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${element.delay}s`,
                }}
              >
                <svg width="10" height="14" viewBox="0 0 10 14">
                  <path d="M5 14 Q5 10, 5 6" stroke="#16a34a" strokeWidth="1" fill="none" />
                  <circle cx="5" cy="4" r="3" fill={color} />
                  <circle cx="5" cy="4" r="1.5" fill="#fef08a" />
                </svg>
              </div>
            );
          }
          
          if (element.type === 'pebble') {
            const sizes = [4, 5, 6];
            const size = sizes[element.variant % sizes.length];
            return (
              <div
                key={element.id}
                className="absolute"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                }}
              >
                <svg width={size * 2} height={size} viewBox={`0 0 ${size * 2} ${size}`}>
                  <ellipse cx={size} cy={size / 2} rx={size} ry={size / 2} fill="#9ca3af" opacity="0.5" />
                </svg>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  // Render vitality overlay (sunbeams, sparkles when pendingPoints > 0)
  // Optimized: reduced number of animated elements
  const renderVitalityOverlay = () => {
    if (pendingPoints <= 0 && !recentActivity) return null;
    
    // Reduced sparkle count for better performance
    const sparkleCount = Math.min(8, Math.floor(pendingPoints / 10) + 3);
    
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 15 }}>
        {/* Sunbeams - reduced to 2 */}
        {[0, 1].map((i) => (
          <div
            key={`sunbeam-${i}`}
            className="mg-sunbeam"
            style={{
              left: `${-20 + i * 60}%`,
              top: '-20%',
              animationDelay: `${i * 5}s`,
            }}
          />
        ))}
        
        {/* Energy sparkles - reduced count */}
        {[...Array(sparkleCount)].map((_, i) => (
          <motion.div
            key={`energy-${i}`}
            className="absolute"
            style={{
              left: `${15 + (i % 4) * 20}%`,
              top: `${25 + Math.floor(i / 4) * 25}%`,
            }}
            animate={{
              y: [0, -20, -40],
              opacity: [0.4, 0.9, 0],
              scale: [0.8, 1.2, 0.6],
            }}
            transition={{
              duration: 3,
              delay: i * 0.4,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="2" fill="#fbbf24" />
              <circle cx="4" cy="4" r="3" fill="#fbbf24" opacity="0.3" />
            </svg>
          </motion.div>
        ))}
        
        {/* Ambient glow overlay - CSS only, no JS animation */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-400/5 via-emerald-300/10 to-amber-200/5 animate-pulse" />
      </div>
    );
  };

  // Companion animations
  const renderCompanions = () => {
    // Auto-add butterflies if health > 40
    let companions: CompanionType[] = (data as any).companions || [];
    if (data.health > 40 && !companions.includes('butterflies')) {
      companions = [...companions, 'butterflies'];
    }
    if (data.health > 60 && !companions.includes('bees')) {
      companions = [...companions, 'bees'];
    }
    if (pendingPoints > 20 && !companions.includes('birds')) {
      companions = [...companions, 'birds'];
    }
    
    if (companions.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {companions.includes('butterflies') && (
          <>
            {[...Array(3)].map((_, i) => (
              <div
                key={`butterfly-${i}`}
                className="mg-butterfly"
                style={{
                  left: `${20 + i * 25}%`,
                  top: `${20 + i * 15}%`,
                  animationDelay: `${i * 2}s`,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M12 8 Q6 4, 4 8 Q6 12, 12 8" fill="#f472b6" className="mg-wing-left" />
                  <path d="M12 8 Q18 4, 20 8 Q18 12, 12 8" fill="#f472b6" className="mg-wing-right" />
                  <ellipse cx="12" cy="12" rx="1.5" ry="4" fill="#374151" />
                </svg>
              </div>
            ))}
          </>
        )}
        
        {companions.includes('bees') && (
          <>
            {[...Array(2)].map((_, i) => (
              <div
                key={`bee-${i}`}
                className="mg-bee"
                style={{
                  left: `${40 + i * 20}%`,
                  top: `${30 + i * 10}%`,
                  animationDelay: `${i * 1.5}s`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <ellipse cx="8" cy="8" rx="5" ry="4" fill="#fbbf24" />
                  <line x1="5" y1="6" x2="5" y2="10" stroke="#1f2937" strokeWidth="1" />
                  <line x1="8" y1="5" x2="8" y2="11" stroke="#1f2937" strokeWidth="1" />
                  <line x1="11" y1="6" x2="11" y2="10" stroke="#1f2937" strokeWidth="1" />
                  <ellipse cx="5" cy="5" rx="3" ry="2" fill="white" opacity="0.6" className="mg-wing-buzz" />
                  <ellipse cx="11" cy="5" rx="3" ry="2" fill="white" opacity="0.6" className="mg-wing-buzz" />
                </svg>
              </div>
            ))}
          </>
        )}
        
        {companions.includes('birds') && (
          <>
            {[...Array(2)].map((_, i) => (
              <div
                key={`bird-${i}`}
                className="mg-bird"
                style={{
                  left: `${15 + i * 50}%`,
                  top: `${10 + i * 5}%`,
                  animationDelay: `${i * 3}s`,
                }}
              >
                <svg width="20" height="12" viewBox="0 0 20 12">
                  <path d="M0 6 Q5 2, 10 6 Q15 2, 20 6" stroke="#374151" strokeWidth="2" fill="none" />
                </svg>
              </div>
            ))}
          </>
        )}
        
        {companions.includes('dragonflies') && (
          <div className="mg-dragonfly" style={{ left: '60%', top: '40%' }}>
            <svg width="30" height="20" viewBox="0 0 30 20">
              <ellipse cx="15" cy="10" rx="8" ry="2" fill="#38bdf8" />
              <ellipse cx="8" cy="6" rx="6" ry="1.5" fill="#38bdf8" opacity="0.6" />
              <ellipse cx="8" cy="14" rx="6" ry="1.5" fill="#38bdf8" opacity="0.6" />
              <ellipse cx="22" cy="6" rx="6" ry="1.5" fill="#38bdf8" opacity="0.6" />
              <ellipse cx="22" cy="14" rx="6" ry="1.5" fill="#38bdf8" opacity="0.6" />
            </svg>
          </div>
        )}
        
        {companions.includes('rabbits') && (
          <div className="mg-rabbit" style={{ left: '70%', bottom: '15%' }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <ellipse cx="15" cy="22" rx="8" ry="6" fill="#d1d5db" />
              <circle cx="15" cy="14" r="6" fill="#e5e7eb" />
              <ellipse cx="11" cy="6" rx="2" ry="5" fill="#e5e7eb" />
              <ellipse cx="19" cy="6" rx="2" ry="5" fill="#e5e7eb" />
              <ellipse cx="11" cy="5" rx="1" ry="3" fill="#fca5a1" />
              <ellipse cx="19" cy="5" rx="1" ry="3" fill="#fca5a1" />
              <circle cx="13" cy="13" r="1" fill="#374151" />
              <circle cx="17" cy="13" r="1" fill="#374151" />
              <ellipse cx="15" cy="16" rx="1.5" ry="1" fill="#fca5a1" />
            </svg>
          </div>
        )}
      </div>
    );
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
            className={`mg-garden-cell ${plant ? 'has-plant' : ''} ${decoration ? 'has-decoration' : ''}`}
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
            {decoration && (
              <div className="absolute inset-0 flex items-center justify-center">
                {DecorationSVG[decoration.type]?.(cellSize * 0.85)}
              </div>
            )}
            
            {plant && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {PlantSVG[plant.type]?.({ stage: getTimeLapseStage(plant.growthStage), size: cellSize * 0.9 })}
              </motion.div>
            )}
          </motion.div>
        );
      }
    }
    return cells;
  };

  // Render weather effects (all weather is beautiful)
  const renderWeatherEffects = () => {
    switch (data.weather) {
      case 'gentle-rain':
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
      case 'soft-snow':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="mg-snowflake"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${4 + Math.random() * 2}s`,
                  opacity: 0.6 + Math.random() * 0.4,
                }}
              />
            ))}
          </div>
        );
      case 'mist':
        return (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-slate-100/20 to-transparent animate-pulse" />
          </div>
        );
      case 'golden-hour':
        return (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-orange-200/10" />
          </div>
        );
      default:
        return null;
    }
  };

  // Determine dynamic classes
  const vitalityClass = pendingPoints > 0 ? 'mg-vitality-active' : '';
  const breathingClass = data.health > 30 ? 'mg-garden-breathing' : '';
  const lushBoostClass = showLushBoost ? 'mg-lush-boost' : '';

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl bg-[var(--mg-bg-primary)] ${vitalityClass}`}>
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

      {/* Garden Ground - State-based background */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/2"
        style={{
          background: getStateBackground(),
          opacity: 0.8,
        }}
      />

      {/* Procedural Filler Layer (grass, wildflowers, pebbles) */}
      {renderProceduralFiller()}

      {/* Companions Layer */}
      {renderCompanions()}

      {/* Vitality Overlay (sunbeams, sparkles when active) */}
      {renderVitalityOverlay()}

      {/* Garden Grid Container */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 flex items-center justify-center overflow-auto p-8 ${breathingClass} ${lushBoostClass}`}
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

      {/* Watering Animation Overlay */}
      <AnimatePresence>
        {isWatering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
          >
            {/* Water droplets falling */}
            {waterDroplets.map((drop) => (
              <motion.div
                key={drop.id}
                className="absolute"
                style={{ left: `${drop.x}%` }}
                initial={{ y: drop.startY, opacity: 0 }}
                animate={{ 
                  y: drop.endY,
                  opacity: [0, 1, 1, 0]
                }}
                transition={{
                  duration: drop.duration,
                  delay: drop.delay,
                  repeat: Infinity,
                  repeatDelay: 0.2,
                  ease: 'easeIn'
                }}
              >
                <svg width={drop.size} height={drop.size * 1.5} viewBox="0 0 10 15">
                  <path 
                    d="M5 0 Q0 7, 5 15 Q10 7, 5 0" 
                    fill="#7dd3fc"
                    opacity="0.8"
                  />
                </svg>
              </motion.div>
            ))}
            
            {/* Sparkle effect on plants */}
            {data.plants.slice(0, 6).map((plant, i) => (
              <motion.div
                key={`sparkle-${plant.id}`}
                className="absolute"
                style={{ 
                  left: `${(plant.x / data.gridSize) * 80 + 10}%`, 
                  top: `${(plant.y / data.gridSize) * 80 + 10}%` 
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{ 
                  delay: 0.5 + i * 0.15,
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              >
                <span className="text-2xl">💧</span>
              </motion.div>
            ))}
            
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-sky-300/20 via-transparent to-sky-400/10"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Pruning Animation Overlay */}
      <AnimatePresence>
        {isPruning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
          >
            {/* Snip sparkles */}
            {pruneSparkles.map((sparkle) => (
              <motion.div
                key={sparkle.id}
                className="absolute"
                style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, sparkle.scale, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  delay: sparkle.delay,
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 0.3
                }}
              >
                <span className="text-lg">✂️</span>
              </motion.div>
            ))}
            
            {/* Leaf particles floating away */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`leaf-${i}`}
                className="absolute"
                style={{ 
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 40}%`
                }}
                initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
                animate={{ 
                  y: [0, -30, -80],
                  x: [0, (Math.random() - 0.5) * 50],
                  opacity: [0, 1, 0],
                  rotate: [0, Math.random() * 360]
                }}
                transition={{
                  delay: i * 0.1,
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
              >
                <span className="text-sm">🍃</span>
              </motion.div>
            ))}
            
            {/* Clean shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-200/10 via-green-200/20 to-amber-200/10"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Time-lapse Indicator */}
      <AnimatePresence>
        {showTimeLapse && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-teal-600/90 text-white font-medium shadow-lg z-40 flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Clock className="w-4 h-4" />
            </motion.div>
            <span>Time-lapse Mode</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Activity Burst Animation - Shows when user earns points */}
      {/* Optimized: reduced sparkle count from 24 to 12 */}
      <AnimatePresence>
        {showActivityBurst && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-35 overflow-hidden"
          >
            {/* Sparkle particles across garden - reduced from 24 to 12 */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`activity-sparkle-${i}`}
                className="absolute text-2xl"
                style={{ 
                  left: `${15 + (i % 4) * 22}%`,
                  top: `${20 + Math.floor(i / 4) * 25}%`,
                }}
                initial={{ scale: 0, opacity: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180],
                  y: [0, -20],
                }}
                transition={{ 
                  delay: i * 0.08,
                  duration: 1.2,
                  ease: 'easeOut'
                }}
              >
                ✨
              </motion.div>
            ))}
            
            {/* Floating points indicator */}
            {floatingPoints && (
              <motion.div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center"
                initial={{ scale: 0, opacity: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  opacity: [0, 1, 1, 0],
                  y: [0, -60],
                }}
                transition={{ duration: 2, ease: 'easeOut' }}
              >
                <div className="text-4xl font-bold text-emerald-500 drop-shadow-lg">
                  +{floatingPoints}
                </div>
                <div className="text-lg font-medium text-emerald-600 drop-shadow">
                  Serenity Points
                </div>
              </motion.div>
            )}
            
            {/* Garden shimmer overlay - using CSS animation instead */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-300/20 via-transparent to-emerald-200/10 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Recent Activity Glow - Subtle ambient effect when garden is active */}
      {(recentActivity || pendingPoints > 0) && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-emerald-400/10 via-transparent to-transparent"
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Garden Actions */}
      {interactive && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <button
            onClick={onWater}
            disabled={isWatering}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-white shadow-lg ${
              isWatering 
                ? 'bg-sky-400 animate-pulse cursor-not-allowed' 
                : 'bg-sky-600/80 hover:bg-sky-500'
            }`}
            title="Water garden"
          >
            <motion.div animate={isWatering ? { rotate: [0, -15, 15, 0] } : {}} transition={{ repeat: Infinity, duration: 0.5 }}>
              <Droplet className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-medium">{isWatering ? 'Watering...' : 'Water'}</span>
          </button>
          <button
            onClick={onPrune}
            disabled={isPruning}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-white shadow-lg ${
              isPruning
                ? 'bg-amber-400 animate-pulse cursor-not-allowed'
                : 'bg-amber-600/80 hover:bg-amber-500'
            }`}
            title="Prune garden"
          >
            <motion.div animate={isPruning ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 0.3 }}>
              <Scissors className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-medium">{isPruning ? 'Pruning...' : 'Prune'}</span>
          </button>
          <button
            onClick={() => setShowTimeLapse(!showTimeLapse)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-white shadow-lg ${
              showTimeLapse 
                ? 'bg-teal-500 ring-2 ring-teal-300' 
                : 'bg-teal-600/80 hover:bg-teal-500'
            }`}
            title="View time-lapse"
          >
            <Clock className="w-5 h-5" />
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

