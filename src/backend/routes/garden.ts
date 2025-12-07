/**
 * Mind Garden - Garden State API
 * 
 * Advanced garden mechanics with:
 * - Point-based growth system (non-punitive)
 * - 5 visual states: Thriving, Growing, Stable, Idle, Dormant
 * - Plant unlock system based on practice types
 * - Seasonal and milestone plants
 */

import express from 'express';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================
// TYPE DEFINITIONS
// ============================================

// All possible plant types
type PlantType = 
  // Starter plants (available immediately)
  | 'daisy'           // Pre-Meeting Focus
  | 'chamomile'       // Quick Reset
  | 'marigold'        // End-of-Day Transition
  | 'morning-glory'   // Morning Intention
  | 'lavender'        // Post-Meeting Decompress
  // Unlockable plants
  | 'sunflower'       // 10 morning flows
  | 'evening-primrose'// 10 evening flows
  | 'rose'            // 25 extended flows
  | 'lotus'           // 10 deep meditations
  | 'poppy'           // 15 presentation preps
  | 'violet'          // 20 difficult conversation preps
  | 'fern'            // 30 gratitude entries
  | 'bamboo'          // 20 breathing practices
  | 'succulent'       // 15 thought reframes
  | 'herb'            // 25 mindful moments
  | 'ivy'             // 14-day streak
  | 'moonflower'      // Evening flows
  | 'night-jasmine'   // Evening wind-down
  | 'golden-flower'   // Gratitude
  // Milestone trees
  | 'cherry-tree'     // 30 days consistent
  | 'oak-sapling'     // 90 days consistent
  | 'willow'          // 180 days consistent
  | 'mature-tree';    // 365 days consistent

type GrowthStage = 'seed' | 'sprout' | 'growing' | 'blooming' | 'full';

type GardenState = 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant';

type Season = 'spring' | 'summer' | 'fall' | 'winter';

type WeatherType = 'sunny' | 'partly-cloudy' | 'cloudy' | 'golden-hour' | 'mist' | 'gentle-rain' | 'soft-snow';

// Time of day setting options
type TimeOfDaySetting = 'auto' | 'morning' | 'afternoon' | 'evening' | 'night' | 'dynamic';

// Decoration types
type DecorationCategory = 'path' | 'seating' | 'water' | 'lighting' | 'structure';

type DecorationType = 
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
type CompanionType = 'butterflies' | 'bees' | 'birds' | 'rabbits' | 'koi-fish' | 'dragonflies';

// Badge types
type BadgeType = 
  | 'first-flow' | '7-day-streak' | '30-day-streak' | '100-flows'
  | 'morning-person' | 'evening-ritual' | 'meeting-master'
  | 'garden-diversity' | 'zen-master' | 'gratitude-heart'
  | 'breath-expert' | 'thought-shifter' | 'year-gardener';

interface Plant {
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

interface Decoration {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
  placedAt: string;
}

interface Badge {
  type: BadgeType;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
}

interface GardenSettings {
  timeOfDay: TimeOfDaySetting;
  showWeather: boolean;
  weatherOverride: WeatherType | 'auto';
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

// Activity tracking for unlocks
interface ActivityCounts {
  morningFlows: number;
  eveningFlows: number;
  extendedFlows: number;
  deepMeditations: number;
  presentationPreps: number;
  difficultConversationPreps: number;
  gratitudeEntries: number;
  breathingPractices: number;
  thoughtReframes: number;
  mindfulMoments: number;
  quickResets: number;
  preMeetingFocus: number;
  microFlows: number; // Total micro-flows for Meeting Master badge
}

// Plant unlock requirements
interface UnlockRequirement {
  type: PlantType;
  name: string;
  description: string;
  requirement: (counts: ActivityCounts, streak: number, totalDays: number) => boolean;
}

// Decoration unlock requirements
interface DecorationUnlock {
  type: DecorationType;
  name: string;
  category: DecorationCategory;
  requirement: number; // Total flows needed
  description: string;
  special?: string; // Special requirement (e.g., "evening flows")
}

// Badge requirements
interface BadgeRequirement {
  type: BadgeType;
  name: string;
  emoji: string;
  description: string;
  requirement: (data: GardenData) => boolean;
}

// Companion requirements
interface CompanionRequirement {
  type: CompanionType;
  name: string;
  requirement: (data: GardenData) => boolean;
  description: string;
}

interface GardenData {
  // Core metrics
  growthPoints: number;
  totalPoints: number;
  plants: Plant[];
  gridSize: number;
  
  // Activity tracking
  activityCounts: ActivityCounts;
  activitiesThisWeek: number;
  
  // Streaks and timing
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  daysSinceActive: number;
  totalActiveDays: number;
  
  // Unlocks
  unlockedPlants: PlantType[];
  unlockedDecorations: DecorationType[];
  
  // Placed items
  decorations: Decoration[];
  
  // Badges
  badges: Badge[];
  
  // Settings
  settings: GardenSettings;
  
  // Visual state
  visualState: GardenState;
  weather: WeatherType;
  season: Season;
  theme: string;
  
  // Active companions (computed from conditions)
  companions: CompanionType[];
  
  // Milestones
  milestones: string[];
  
  // Legacy compatibility
  health: number;
  totalFlows: number;
  flowsToday: number;
  growth: number;
  
  [key: string]: unknown;
}

// ============================================
// CONSTANTS
// ============================================

// Point values for activities
const ACTIVITY_POINTS: Record<string, number> = {
  // Micro-flows (2-3 min)
  'micro-flow': 10,
  'pre-meeting-focus': 10,
  'pre-presentation-power': 10,
  'difficult-conversation-prep': 10,
  'quick-reset': 10,
  'post-meeting-decompress': 10,
  'end-of-day-transition': 10,
  // Extended flows (10-15 min)
  'extended-flow': 30,
  'morning-intention': 30,
  'evening-wind-down': 30,
  'weekend-wellness': 30,
  // Deep meditation (30 min)
  'deep-meditation': 50,
  'body-scan': 30,
  // Activities
  'gratitude-entry': 10,
  'thought-reframe': 15,
  'breathing-practice': 10,
  'game': 15,
  'journal': 10,
};

// Growth thresholds
const THRESHOLDS = {
  BLOOM_ANIMATION: 10,      // Small bloom on existing plant
  NEW_PLANT: 30,            // New flower planted
  BONUS_GROWTH: 50,         // Bonus growth (daily max)
  GRID_EXPANSION_1: 500,    // 5x5 -> 7x7
  GRID_EXPANSION_2: 1000,   // 7x7 -> 10x10
  GRID_EXPANSION_3: 2000,   // 10x10 -> 12x12
  GRID_EXPANSION_4: 5000,   // 12x12 -> 15x15
};

// Map flow types to activity categories
const FLOW_TO_ACTIVITY: Record<string, keyof ActivityCounts> = {
  'morning-intention': 'morningFlows',
  'evening-wind-down': 'eveningFlows',
  'weekend-wellness': 'extendedFlows',
  'deep-meditation': 'deepMeditations',
  'body-scan': 'extendedFlows',
  'pre-presentation-power': 'presentationPreps',
  'difficult-conversation-prep': 'difficultConversationPreps',
  'gratitude': 'gratitudeEntries',
  'breathing': 'breathingPractices',
  'quick-reset': 'quickResets',
  'pre-meeting-focus': 'preMeetingFocus',
  'post-meeting-decompress': 'eveningFlows',
  'end-of-day-transition': 'eveningFlows',
};

// Map flow types to plant types
const FLOW_TO_PLANT: Record<string, PlantType> = {
  'pre-meeting-focus': 'daisy',
  'pre-presentation-power': 'poppy',
  'difficult-conversation-prep': 'violet',
  'quick-reset': 'chamomile',
  'post-meeting-decompress': 'evening-primrose',
  'end-of-day-transition': 'marigold',
  'morning-intention': 'morning-glory',
  'evening-wind-down': 'night-jasmine',
  'weekend-wellness': 'lotus',
  'deep-meditation': 'mature-tree',
  'breathing': 'bamboo',
  'body-scan': 'lotus',
  'gratitude': 'golden-flower',
};

// Plant unlock requirements
const PLANT_UNLOCKS: UnlockRequirement[] = [
  // Starter plants (always unlocked)
  { type: 'daisy', name: 'Daisy', description: 'Pre-Meeting Focus', requirement: () => true },
  { type: 'chamomile', name: 'Chamomile', description: 'Quick Reset', requirement: () => true },
  { type: 'marigold', name: 'Marigold', description: 'End-of-Day Transition', requirement: () => true },
  { type: 'morning-glory', name: 'Morning Glory', description: 'Morning Intention', requirement: () => true },
  { type: 'lavender', name: 'Lavender', description: 'Post-Meeting Decompress', requirement: () => true },
  
  // Unlockable by practice type
  { type: 'sunflower', name: 'Sunflower', description: '10 morning flows', requirement: (c) => c.morningFlows >= 10 },
  { type: 'evening-primrose', name: 'Evening Primrose', description: '10 evening flows', requirement: (c) => c.eveningFlows >= 10 },
  { type: 'rose', name: 'Rose', description: '25 extended flows', requirement: (c) => c.extendedFlows >= 25 },
  { type: 'lotus', name: 'Lotus', description: '10 deep meditations', requirement: (c) => c.deepMeditations >= 10 },
  { type: 'poppy', name: 'Poppy', description: '15 presentation preps', requirement: (c) => c.presentationPreps >= 15 },
  { type: 'violet', name: 'Violet', description: '20 difficult conversation preps', requirement: (c) => c.difficultConversationPreps >= 20 },
  { type: 'fern', name: 'Fern', description: '30 gratitude entries', requirement: (c) => c.gratitudeEntries >= 30 },
  { type: 'bamboo', name: 'Bamboo', description: '20 breathing practices', requirement: (c) => c.breathingPractices >= 20 },
  { type: 'succulent', name: 'Succulent', description: '15 thought reframes', requirement: (c) => c.thoughtReframes >= 15 },
  { type: 'herb', name: 'Herb Garden', description: '25 mindful moments', requirement: (c) => c.mindfulMoments >= 25 },
  { type: 'moonflower', name: 'Moonflower', description: '15 evening flows', requirement: (c) => c.eveningFlows >= 15 },
  { type: 'night-jasmine', name: 'Night Jasmine', description: '20 evening wind-downs', requirement: (c) => c.eveningFlows >= 20 },
  { type: 'golden-flower', name: 'Golden Flower', description: '25 gratitude entries', requirement: (c) => c.gratitudeEntries >= 25 },
  
  // Streak-based
  { type: 'ivy', name: 'Ivy', description: '14-day streak', requirement: (_, s) => s >= 14 },
  
  // Milestone trees (by total days)
  { type: 'cherry-tree', name: 'Cherry Blossom', description: '30 days consistent', requirement: (_, __, d) => d >= 30 },
  { type: 'oak-sapling', name: 'Oak Sapling', description: '90 days consistent', requirement: (_, __, d) => d >= 90 },
  { type: 'willow', name: 'Willow', description: '180 days consistent', requirement: (_, __, d) => d >= 180 },
  { type: 'mature-tree', name: 'Ancient Tree', description: '365 days consistent', requirement: (_, __, d) => d >= 365 },
];

// State messages (non-punitive, encouraging)
const STATE_MESSAGES: Record<GardenState, { title: string; message: string }> = {
  thriving: {
    title: 'Your garden is thriving!',
    message: 'Keep nurturing your practice. The butterflies are visiting!',
  },
  growing: {
    title: 'Your garden is growing steadily.',
    message: "You're doing great. Each moment counts.",
  },
  stable: {
    title: 'Your garden is stable and peaceful.',
    message: 'Practice when you\'re ready. No pressure.',
  },
  idle: {
    title: 'Your garden is resting.',
    message: 'It\'s waiting for you. Come back when you\'re ready.',
  },
  dormant: {
    title: 'Your garden rested while you were away.',
    message: 'Welcome back! Ready to grow again?',
  },
};

// ============================================
// DECORATION UNLOCKS
// ============================================
const DECORATION_UNLOCKS: DecorationUnlock[] = [
  // Paths
  { type: 'stone-path', name: 'Stone Path', category: 'path', requirement: 5, description: 'Complete 5 flows' },
  { type: 'brick-path', name: 'Brick Path', category: 'path', requirement: 25, description: 'Complete 25 flows' },
  { type: 'gravel-path', name: 'Gravel Path', category: 'path', requirement: 50, description: 'Complete 50 flows' },
  { type: 'tile-path', name: 'Decorative Tile Path', category: 'path', requirement: 100, description: 'Complete 100 flows' },
  // Seating
  { type: 'simple-bench', name: 'Simple Bench', category: 'seating', requirement: 10, description: 'Complete 10 flows' },
  { type: 'ornate-bench', name: 'Ornate Bench', category: 'seating', requirement: 50, description: 'Complete 50 flows' },
  { type: 'garden-swing', name: 'Garden Swing', category: 'seating', requirement: 100, description: 'Complete 100 flows' },
  { type: 'reading-nook', name: 'Reading Nook', category: 'seating', requirement: 200, description: 'Complete 200 flows' },
  // Water features
  { type: 'bird-bath', name: 'Bird Bath', category: 'water', requirement: 25, description: 'Complete 25 flows' },
  { type: 'small-fountain', name: 'Small Fountain', category: 'water', requirement: 100, description: 'Complete 100 flows' },
  { type: 'koi-pond', name: 'Koi Pond', category: 'water', requirement: 250, description: 'Complete 250 flows' },
  { type: 'waterfall', name: 'Waterfall', category: 'water', requirement: 500, description: 'Complete 500 flows' },
  // Lighting
  { type: 'garden-lantern', name: 'Garden Lanterns', category: 'lighting', requirement: 15, description: 'Complete 15 evening flows', special: 'eveningFlows' },
  { type: 'string-lights', name: 'String Lights', category: 'lighting', requirement: 30, description: 'Complete 30 evening flows', special: 'eveningFlows' },
  { type: 'solar-lights', name: 'Solar Path Lights', category: 'lighting', requirement: 50, description: 'Complete 50 flows' },
  { type: 'fairy-lights', name: 'Fairy Lights', category: 'lighting', requirement: 0, description: 'Premium feature' },
  // Structures
  { type: 'garden-arch', name: 'Garden Arch', category: 'structure', requirement: 75, description: 'Complete 75 flows' },
  { type: 'pergola', name: 'Pergola', category: 'structure', requirement: 150, description: 'Complete 150 flows' },
  { type: 'gazebo', name: 'Gazebo', category: 'structure', requirement: 300, description: 'Complete 300 flows' },
  { type: 'greenhouse', name: 'Greenhouse', category: 'structure', requirement: 500, description: 'Complete 500 flows' },
];

// ============================================
// BADGE REQUIREMENTS
// ============================================
const BADGE_REQUIREMENTS: BadgeRequirement[] = [
  { type: 'first-flow', name: 'First Flow', emoji: '🌱', description: 'Completed your first flow', requirement: (d) => d.totalFlows >= 1 },
  { type: '7-day-streak', name: 'Week Warrior', emoji: '🔥', description: '7-day streak', requirement: (d) => d.longestStreak >= 7 },
  { type: '30-day-streak', name: 'Month Master', emoji: '🌟', description: '30-day streak', requirement: (d) => d.longestStreak >= 30 },
  { type: '100-flows', name: 'Century', emoji: '💯', description: '100 flows completed', requirement: (d) => d.totalFlows >= 100 },
  { type: 'morning-person', name: 'Morning Person', emoji: '☀️', description: '10 morning flows', requirement: (d) => d.activityCounts.morningFlows >= 10 },
  { type: 'evening-ritual', name: 'Evening Ritual', emoji: '🌙', description: '10 evening flows', requirement: (d) => d.activityCounts.eveningFlows >= 10 },
  { type: 'meeting-master', name: 'Meeting Master', emoji: '💼', description: '50 micro-flows', requirement: (d) => (d.activityCounts.microFlows || 0) >= 50 },
  { type: 'garden-diversity', name: 'Garden Diversity', emoji: '🌈', description: '20 plant types', requirement: (d) => d.unlockedPlants.length >= 20 },
  { type: 'zen-master', name: 'Zen Master', emoji: '🧘', description: '20 deep meditations', requirement: (d) => d.activityCounts.deepMeditations >= 20 },
  { type: 'gratitude-heart', name: 'Gratitude Heart', emoji: '💝', description: '30 gratitude entries', requirement: (d) => d.activityCounts.gratitudeEntries >= 30 },
  { type: 'breath-expert', name: 'Breath Expert', emoji: '🌬️', description: '50 breathing practices', requirement: (d) => d.activityCounts.breathingPractices >= 50 },
  { type: 'thought-shifter', name: 'Thought Shifter', emoji: '🧠', description: '20 thought reframes', requirement: (d) => d.activityCounts.thoughtReframes >= 20 },
  { type: 'year-gardener', name: 'Year-Long Gardener', emoji: '🏆', description: '365 days of practice', requirement: (d) => d.totalActiveDays >= 365 },
];

// ============================================
// COMPANION REQUIREMENTS
// ============================================
const COMPANION_REQUIREMENTS: CompanionRequirement[] = [
  { type: 'butterflies', name: 'Butterflies', description: '5+ flowering plants', requirement: (d) => countFloweringPlants(d) >= 5 },
  { type: 'bees', name: 'Bees', description: '10+ flowering plants', requirement: (d) => countFloweringPlants(d) >= 10 },
  { type: 'birds', name: 'Birds', description: 'Have a tree', requirement: (d) => hasTree(d) },
  { type: 'rabbits', name: 'Rabbits', description: '20+ plants, meadow theme', requirement: (d) => d.plants.length >= 20 && d.theme === 'meadow' },
  { type: 'koi-fish', name: 'Koi Fish', description: 'Have a koi pond', requirement: (d) => d.decorations.some(dec => dec.type === 'koi-pond') },
  { type: 'dragonflies', name: 'Dragonflies', description: 'Have water feature', requirement: (d) => hasWaterFeature(d) },
];

// Flowering plant types
const FLOWERING_PLANTS: PlantType[] = [
  'daisy', 'chamomile', 'marigold', 'morning-glory', 'lavender', 'sunflower',
  'evening-primrose', 'rose', 'lotus', 'poppy', 'violet', 'moonflower',
  'night-jasmine', 'golden-flower',
];

// Tree types
const TREE_TYPES: PlantType[] = ['cherry-tree', 'oak-sapling', 'willow', 'mature-tree'];

// Water feature decorations
const WATER_FEATURES: DecorationType[] = ['bird-bath', 'small-fountain', 'koi-pond', 'waterfall'];

// Helper to count flowering plants
function countFloweringPlants(data: GardenData): number {
  return data.plants.filter(p => FLOWERING_PLANTS.includes(p.type)).length;
}

// Helper to check if garden has a tree
function hasTree(data: GardenData): boolean {
  return data.plants.some(p => TREE_TYPES.includes(p.type));
}

// Helper to check if garden has water feature
function hasWaterFeature(data: GardenData): boolean {
  return data.decorations.some(d => WATER_FEATURES.includes(d.type as DecorationType));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get current season based on date
function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// Calculate grid size based on total points
function calculateGridSize(totalPoints: number): number {
  if (totalPoints >= THRESHOLDS.GRID_EXPANSION_4) return 15;
  if (totalPoints >= THRESHOLDS.GRID_EXPANSION_3) return 12;
  if (totalPoints >= THRESHOLDS.GRID_EXPANSION_2) return 10;
  if (totalPoints >= THRESHOLDS.GRID_EXPANSION_1) return 7;
  return 5;
}

// Calculate garden state based on weekly activity (NON-PUNITIVE)
function calculateGardenState(activitiesThisWeek: number, daysSinceActive: number): GardenState {
  // Dormant: 14+ days since last activity (but still beautiful)
  if (daysSinceActive >= 14) return 'dormant';
  
  // Idle: 0 activities this week (peaceful, not dead)
  if (activitiesThisWeek === 0) return 'idle';
  
  // Active states based on weekly activity
  if (activitiesThisWeek >= 5) return 'thriving';
  if (activitiesThisWeek >= 3) return 'growing';
  return 'stable';
}

// Get weather based on garden state (all weather is positive/beautiful)
function getWeatherForState(state: GardenState, season: Season): WeatherType {
  switch (state) {
    case 'thriving':
      return 'sunny';
    case 'growing':
      return 'partly-cloudy';
    case 'stable':
      return 'cloudy'; // Soft, contemplative
    case 'idle':
      return 'golden-hour'; // Beautiful sunset/dusk
    case 'dormant':
      return season === 'winter' ? 'soft-snow' : 'mist'; // Peaceful rest
    default:
      return 'sunny';
  }
}

// Calculate days since last active
function calculateDaysSinceActive(lastActiveDate: string | null): number {
  if (!lastActiveDate) return 999; // Never active
  const last = new Date(lastActiveDate);
  const now = new Date();
  const diffTime = now.getTime() - last.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Check which plants are unlocked
function getUnlockedPlants(counts: ActivityCounts, streak: number, totalDays: number): PlantType[] {
  return PLANT_UNLOCKS
    .filter(unlock => unlock.requirement(counts, streak, totalDays))
    .map(unlock => unlock.type);
}

// Find empty position in grid (center-out spiral)
function findEmptyPosition(plants: Plant[], gridSize: number): { x: number; y: number } | null {
  const occupied = new Set(plants.map(p => `${p.x},${p.y}`));
  const center = Math.floor(gridSize / 2);
  
  for (let radius = 0; radius <= center; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = center + dx;
        const y = center + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !occupied.has(`${x},${y}`)) {
          return { x, y };
        }
      }
    }
  }
  return null;
}

// Create default garden data
function createDefaultGardenData(): GardenData {
  return {
    growthPoints: 0,
    totalPoints: 0,
    plants: [],
    gridSize: 5,
    activityCounts: {
      morningFlows: 0,
      eveningFlows: 0,
      extendedFlows: 0,
      deepMeditations: 0,
      presentationPreps: 0,
      difficultConversationPreps: 0,
      gratitudeEntries: 0,
      breathingPractices: 0,
      thoughtReframes: 0,
      mindfulMoments: 0,
      quickResets: 0,
      preMeetingFocus: 0,
      microFlows: 0,
    },
    activitiesThisWeek: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    daysSinceActive: 999,
    totalActiveDays: 0,
    unlockedPlants: ['daisy', 'chamomile', 'marigold', 'morning-glory', 'lavender'],
    unlockedDecorations: ['stone-path'], // Default decoration
    decorations: [],
    badges: [],
    settings: {
      timeOfDay: 'auto',
      showWeather: true,
      weatherOverride: 'auto',
      soundEnabled: true,
      animationsEnabled: true,
    },
    visualState: 'stable',
    weather: 'sunny',
    season: getCurrentSeason(),
    theme: 'cottage',
    companions: [],
    milestones: [],
    // Legacy
    health: 50,
    totalFlows: 0,
    flowsToday: 0,
    growth: 0,
  };
}

// Get unlocked decorations based on flow counts
function getUnlockedDecorations(totalFlows: number, activityCounts: ActivityCounts): DecorationType[] {
  return DECORATION_UNLOCKS
    .filter(dec => {
      if (dec.special === 'eveningFlows') {
        return activityCounts.eveningFlows >= dec.requirement;
      }
      return totalFlows >= dec.requirement && dec.requirement > 0;
    })
    .map(dec => dec.type);
}

// Check and award badges
function checkBadges(data: GardenData): Badge[] {
  const earnedBadges: Badge[] = [...(data.badges || [])];
  const earnedTypes = new Set(earnedBadges.map(b => b.type));
  
  for (const req of BADGE_REQUIREMENTS) {
    if (!earnedTypes.has(req.type) && req.requirement(data)) {
      earnedBadges.push({
        type: req.type,
        name: req.name,
        emoji: req.emoji,
        description: req.description,
        earnedAt: new Date().toISOString(),
      });
    }
  }
  
  return earnedBadges;
}

// Get active companions based on garden conditions
function getActiveCompanions(data: GardenData): CompanionType[] {
  return COMPANION_REQUIREMENTS
    .filter(comp => comp.requirement(data))
    .map(comp => comp.type);
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/garden/state
 * Get user's complete garden state
 */
router.get(
  '/state',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Get stored garden state
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    // Get activity data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Count flows today
    const todaysFlows = await prisma.wellnessCheckIn.count({
      where: { userId, type: { startsWith: 'flow-' }, createdAt: { gte: today } },
    });
    
    // Count flows this week
    const weeklyFlows = await prisma.wellnessCheckIn.count({
      where: { userId, type: { startsWith: 'flow-' }, createdAt: { gte: weekAgo } },
    });
    
    // Get most recent flow date
    const lastFlow = await prisma.wellnessCheckIn.findFirst({
      where: { userId, type: { startsWith: 'flow-' } },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate streak
    const recentCheckIns = await prisma.wellnessCheckIn.findMany({
      where: { userId, type: { startsWith: 'flow-' } },
      orderBy: { createdAt: 'desc' },
      take: 365,
    });
    
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const hasActivity = recentCheckIns.some(ci => {
        const ciDate = new Date(ci.createdAt);
        ciDate.setHours(0, 0, 0, 0);
        return ciDate.getTime() === checkDate.getTime();
      });
      
      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Allow today to not count yet
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Load or create garden data
    let gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    // Update calculated fields
    const lastActiveDate = lastFlow?.createdAt?.toISOString() || gardenData.lastActiveDate;
    const daysSinceActive = calculateDaysSinceActive(lastActiveDate);
    const season = getCurrentSeason();
    const visualState = calculateGardenState(weeklyFlows, daysSinceActive);
    const weather = getWeatherForState(visualState, season);
    const gridSize = calculateGridSize(gardenData.totalPoints);
    
    // Update unlocked plants
    const unlockedPlants = getUnlockedPlants(
      gardenData.activityCounts,
      streak,
      gardenData.totalActiveDays
    );
    
    // Calculate health (legacy compatibility) - always positive
    const health = Math.min(100, Math.max(20, 
      50 + (streak * 3) + (weeklyFlows * 5)
    ));
    
    // Merge updated data
    gardenData = {
      ...gardenData,
      streak,
      longestStreak: Math.max(gardenData.longestStreak, streak),
      lastActiveDate,
      daysSinceActive,
      activitiesThisWeek: weeklyFlows,
      visualState,
      weather,
      season,
      gridSize,
      unlockedPlants,
      health,
      totalFlows: recentCheckIns.length,
      flowsToday: todaysFlows,
    };
    
    // Update unlocked decorations
    const unlockedDecorations = getUnlockedDecorations(
      gardenData.totalFlows,
      gardenData.activityCounts
    );
    gardenData.unlockedDecorations = [...new Set([...gardenData.unlockedDecorations, ...unlockedDecorations])];
    
    // Check and award badges
    gardenData.badges = checkBadges(gardenData);
    
    // Get active companions
    gardenData.companions = getActiveCompanions(gardenData);
    
    // Get state message
    const stateInfo = STATE_MESSAGES[visualState];
    
    res.json({
      ...gardenData,
      stateTitle: stateInfo.title,
      stateMessage: stateInfo.message,
      lastUpdated: gardenState?.lastUpdated || new Date(),
    });
  })
);

/**
 * POST /api/garden/activity
 * Record an activity and award points (main growth endpoint)
 */
router.post(
  '/activity',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { activityType, flowType, duration } = req.body;
    
    // Get current garden state
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    let gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    // Calculate points based on activity
    let points = ACTIVITY_POINTS[flowType] || ACTIVITY_POINTS[activityType] || 10;
    
    // Bonus for longer sessions
    if (duration && duration > 20) {
      points = Math.floor(points * 1.5);
    }
    
    // Update activity counts
    const activityKey = FLOW_TO_ACTIVITY[flowType];
    if (activityKey && gardenData.activityCounts[activityKey] !== undefined) {
      gardenData.activityCounts[activityKey]++;
    }
    
    // Award points
    gardenData.growthPoints += points;
    gardenData.totalPoints += points;
    
    // Track as active today
    const today = new Date().toISOString().split('T')[0];
    if (gardenData.lastActiveDate?.split('T')[0] !== today) {
      gardenData.totalActiveDays++;
    }
    gardenData.lastActiveDate = new Date().toISOString();
    
    // Check for new plant threshold
    let newPlant: Plant | null = null;
    let growthFeedback = 'bloom'; // Default: existing plant blooms
    
    if (gardenData.growthPoints >= THRESHOLDS.NEW_PLANT) {
      // Plant a new flower!
      gardenData.growthPoints -= THRESHOLDS.NEW_PLANT;
      
      const plantType = FLOW_TO_PLANT[flowType] || 'daisy';
      const position = findEmptyPosition(gardenData.plants, gardenData.gridSize);
      
      if (position) {
        newPlant = {
          id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: plantType,
          x: position.x,
          y: position.y,
          growthStage: 'sprout',
          plantedAt: new Date().toISOString(),
          bloomCount: 0,
          associatedWith: flowType,
        };
        
        gardenData.plants.push(newPlant);
        gardenData.growth++;
        growthFeedback = 'new-plant';
      }
    } else if (gardenData.growthPoints >= THRESHOLDS.BLOOM_ANIMATION && gardenData.plants.length > 0) {
      // Bloom animation on existing plant
      const randomPlant = gardenData.plants[Math.floor(Math.random() * gardenData.plants.length)];
      if (randomPlant) {
        randomPlant.bloomCount++;
        growthFeedback = 'bloom';
      }
    }
    
    // Update grid size if points threshold reached
    gardenData.gridSize = calculateGridSize(gardenData.totalPoints);
    
    // Check for new unlocks
    const newUnlocks = getUnlockedPlants(
      gardenData.activityCounts,
      gardenData.streak,
      gardenData.totalActiveDays
    ).filter(p => !gardenData.unlockedPlants.includes(p));
    
    if (newUnlocks.length > 0) {
      gardenData.unlockedPlants.push(...newUnlocks);
    }
    
    // Check for milestone achievements
    const milestones: string[] = [];
    if (gardenData.totalActiveDays === 7) milestones.push('first-week');
    if (gardenData.totalActiveDays === 30) milestones.push('first-month');
    if (gardenData.streak === 7) milestones.push('week-streak');
    if (gardenData.streak === 21) milestones.push('21-day-habit');
    if (gardenData.totalPoints >= 100) milestones.push('100-points');
    if (gardenData.totalPoints >= 500) milestones.push('500-points');
    if (gardenData.plants.length === 10) milestones.push('10-plants');
    
    // Save garden state
    if (gardenState) {
      await prisma.emotionGardenState.update({
        where: { userId },
        data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
      });
    } else {
      await prisma.emotionGardenState.create({
        data: { userId, gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
      });
    }
    
    // Record the wellness check-in
    await prisma.wellnessCheckIn.create({
      data: {
        userId,
        type: `flow-${flowType}`,
        completed: true,
        mindState: 'flow-completed',
        notes: `Earned ${points} points`,
      },
    });
    
    logger.info('Garden activity recorded', { userId, flowType, points, growthFeedback });
    
    res.json({
      success: true,
      pointsEarned: points,
      totalPoints: gardenData.totalPoints,
      growthFeedback,
      newPlant,
      newUnlocks,
      milestones,
      gardenState: {
        visualState: gardenData.visualState,
        gridSize: gardenData.gridSize,
        plantCount: gardenData.plants.length,
      },
    });
  })
);

/**
 * POST /api/garden/plant
 * Plant a specific flower (legacy endpoint, calls /activity internally)
 */
router.post(
  '/plant',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { flowType, flowName } = req.body;
    
    // Delegate to activity endpoint logic
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    let gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    const plantType = FLOW_TO_PLANT[flowType] || 'daisy';
    const position = findEmptyPosition(gardenData.plants, gardenData.gridSize);
    
    if (!position) {
      return res.json({
        success: false,
        message: 'Garden is full! Complete more flows to expand.',
        gardenHealth: gardenData.health,
      });
    }
    
    const newPlant: Plant = {
      id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: plantType,
      x: position.x,
      y: position.y,
      growthStage: 'sprout',
      plantedAt: new Date().toISOString(),
      bloomCount: 0,
      associatedWith: flowName || flowType,
    };
    
    gardenData.plants.push(newPlant);
    gardenData.growth++;
    gardenData.totalPoints += 30;
    gardenData.gridSize = calculateGridSize(gardenData.totalPoints);
    
    if (gardenState) {
      await prisma.emotionGardenState.update({
        where: { userId },
        data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
      });
    } else {
      await prisma.emotionGardenState.create({
        data: { userId, gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
      });
    }
    
    logger.info('Plant added to garden', { userId, plantType, position });
    
    return res.json({
      success: true,
      plant: newPlant,
      gardenHealth: gardenData.health,
    });
  })
);

/**
 * GET /api/garden/unlocks
 * Get list of all plants and their unlock status
 */
router.get(
  '/unlocks',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    const unlocks = PLANT_UNLOCKS.map(unlock => ({
      type: unlock.type,
      name: unlock.name,
      description: unlock.description,
      unlocked: gardenData.unlockedPlants.includes(unlock.type),
    }));
    
    res.json({
      unlockedCount: gardenData.unlockedPlants.length,
      totalPlants: PLANT_UNLOCKS.length,
      unlocks,
      activityCounts: gardenData.activityCounts,
    });
  })
);

/**
 * POST /api/garden/water
 * Water the garden (cosmetic engagement)
 */
router.post(
  '/water',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = { ...createDefaultGardenData(), ...(gardenState.gardenData as object) } as GardenData;
    
    // Water all plants
    gardenData.plants = gardenData.plants.map(plant => ({
      ...plant,
      lastWatered: new Date().toISOString(),
    }));
    
    // Small point bonus for engagement
    gardenData.totalPoints += 2;
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    logger.info('Garden watered', { userId });
    
    return res.json({
      success: true,
      message: 'Garden watered! ✨',
      pointsEarned: 2,
    });
  })
);

/**
 * POST /api/garden/grow
 * Progress a specific plant's growth
 */
router.post(
  '/grow',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { plantId } = req.body;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = { ...createDefaultGardenData(), ...(gardenState.gardenData as object) } as GardenData;
    const growthOrder: GrowthStage[] = ['seed', 'sprout', 'growing', 'blooming', 'full'];
    
    let updatedPlant: Plant | null = null;
    
    gardenData.plants = gardenData.plants.map(plant => {
      if (plant.id === plantId) {
        const currentIndex = growthOrder.indexOf(plant.growthStage);
        if (currentIndex < growthOrder.length - 1) {
          updatedPlant = {
            ...plant,
            growthStage: growthOrder[currentIndex + 1],
            bloomCount: plant.growthStage === 'growing' ? plant.bloomCount + 1 : plant.bloomCount,
          };
          return updatedPlant;
        }
      }
      return plant;
    });
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    return res.json({
      success: true,
      plant: updatedPlant,
    });
  })
);

/**
 * GET /api/garden/insights
 * Get comprehensive insights for the Insights dashboard
 */
router.get(
  '/insights',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // Get all wellness check-ins (flows, gratitude, games, etc.)
    const allCheckIns = await prisma.wellnessCheckIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    const recentCheckIns = allCheckIns.filter(c => new Date(c.createdAt) >= weekAgo);
    const monthCheckIns = allCheckIns.filter(c => new Date(c.createdAt) >= monthAgo);
    
    // Get focus sessions for additional tracking
    const focusSessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    // Calculate garden health (0-100) based on activity
    const activitiesThisWeek = recentCheckIns.length;
    let gardenHealth: number;
    if (activitiesThisWeek >= 7) {
      gardenHealth = Math.min(100, 70 + (activitiesThisWeek * 2) + (gardenData.streak * 1.5));
    } else if (activitiesThisWeek >= 5) {
      gardenHealth = 60 + (activitiesThisWeek * 2);
    } else if (activitiesThisWeek >= 3) {
      gardenHealth = 40 + (activitiesThisWeek * 3);
    } else if (activitiesThisWeek >= 1) {
      gardenHealth = 25 + (activitiesThisWeek * 5);
    } else {
      // Decay based on inactivity but never below 10
      gardenHealth = Math.max(10, 30 - (gardenData.daysSinceActive * 2));
    }
    gardenHealth = Math.round(Math.min(100, Math.max(0, gardenHealth)));
    
    // Calculate total time from focus sessions
    const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
    
    // Calculate flows by day of week
    const flowsByDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayLabel => {
      const dayNum = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(dayLabel);
      const jsDay = dayNum === 6 ? 0 : dayNum + 1; // Convert to JS day (0 = Sunday)
      const count = recentCheckIns.filter(c => {
        const d = new Date(c.createdAt);
        return d.getDay() === jsDay;
      }).length;
      return { day: dayLabel, count };
    });
    
    // Calculate flows by type
    const flowTypeMap: Record<string, number> = {};
    monthCheckIns.forEach(c => {
      // Extract type from 'flow-pre-meeting-focus' -> 'Focus'
      let type = 'Other';
      if (c.type.includes('focus')) type = 'Focus';
      else if (c.type.includes('reset') || c.type.includes('calm')) type = 'Calm';
      else if (c.type.includes('transition') || c.type.includes('decompress')) type = 'Reset';
      else if (c.type.includes('morning') || c.type.includes('evening')) type = 'Transition';
      else if (c.type.includes('gratitude')) type = 'Gratitude';
      else if (c.type.includes('breathing')) type = 'Breathing';
      else if (c.type.includes('game') || c.type.includes('thought')) type = 'Games';
      
      flowTypeMap[type] = (flowTypeMap[type] || 0) + 1;
    });
    
    const flowsByType = Object.entries(flowTypeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    
    // Determine favorite flow
    const favoriteFlow = flowsByType.length > 0 ? flowsByType[0].type : 'None yet';
    
    // Get recent achievements (badges earned)
    const recentAchievements = gardenData.badges
      .slice(-5)
      .reverse()
      .map(b => ({
        id: b.type,
        name: b.name,
        icon: b.emoji,
        date: b.earnedAt,
      }));
    
    // Generate insights
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    // Activity-based insights
    if (activitiesThisWeek >= 7) {
      insights.push('🌟 Great consistency! You completed flows every day this week.');
    } else if (activitiesThisWeek >= 3) {
      insights.push('📈 Good progress! Keep building your flow habit.');
    } else if (activitiesThisWeek > 0) {
      insights.push('🌱 You started your practice this week. Each moment counts.');
    } else {
      insights.push('🧘 Your garden is ready when you are. No pressure.');
    }
    
    // Streak insights
    if (gardenData.streak >= 21) {
      insights.push(`🔥 ${gardenData.streak}-day streak! You've built a solid habit.`);
    } else if (gardenData.streak >= 7) {
      insights.push(`✨ ${gardenData.streak}-day streak! Keep it going!`);
    }
    
    // Pattern insights
    const lowDays = flowsByDay.filter(d => d.count === 0).map(d => d.day);
    if (lowDays.length > 0 && lowDays.length < 7) {
      insights.push(`💡 You tend to skip flows on ${lowDays.slice(0, 2).join(' and ')}. Try setting a reminder.`);
    }
    
    // Recommendations based on patterns
    if (gardenData.activityCounts.morningFlows < 5) {
      recommendations.push('Try a Morning Intention Flow to start your day with clarity.');
    }
    if (gardenData.activityCounts.eveningFlows < 5) {
      recommendations.push('Evening Wind-Down flows can improve your sleep quality.');
    }
    if (gardenData.activityCounts.breathingPractices < 10) {
      recommendations.push('Breathing exercises are quick and effective for stress relief.');
    }
    
    // Unlock progress
    const nextUnlocks = PLANT_UNLOCKS
      .filter(u => !gardenData.unlockedPlants.includes(u.type))
      .slice(0, 3)
      .map(u => ({ type: u.type, name: u.name, requirement: u.description }));
    
    res.json({
      // Core stats
      gardenHealth,
      weeklyFlows: activitiesThisWeek,
      totalFlows: allCheckIns.length + focusSessions.filter(s => s.breathingExerciseCompleted).length,
      currentStreak: gardenData.streak,
      longestStreak: gardenData.longestStreak,
      plantsGrown: gardenData.plants.length,
      favoriteFlow,
      totalMinutes: Math.round(totalMinutes),
      
      // Charts data
      flowsByDay,
      flowsByType,
      
      // Achievements
      recentAchievements,
      totalBadges: gardenData.badges.length,
      
      // Text insights
      insights,
      recommendations,
      nextUnlocks,
      
      // Garden state
      visualState: gardenData.visualState,
      stateInfo: STATE_MESSAGES[gardenData.visualState],
      totalPoints: gardenData.totalPoints,
    });
  })
);

/**
 * POST /api/garden/checkin
 * Record an emotion check-in (legacy support)
 */
router.post(
  '/checkin',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { emotion, intensity, notes } = req.body;
    
    // Record check-in
    const checkIn = await prisma.emotionCheckIn.create({
      data: {
        userId,
        emotion,
        intensity: intensity || 5,
        notes,
      },
    });
    
    logger.info('Emotion check-in recorded', { userId, emotion, intensity });
    
    res.json({
      success: true,
      checkIn,
    });
  })
);

// ============================================
// DECORATION ENDPOINTS
// ============================================

/**
 * GET /api/garden/decorations
 * Get all decorations with unlock status
 */
router.get(
  '/decorations',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    // Get unlocked decorations
    const unlockedDecorations = getUnlockedDecorations(
      gardenData.totalFlows,
      gardenData.activityCounts
    );
    
    // Build decoration list with unlock status
    const decorations = DECORATION_UNLOCKS.map(dec => ({
      type: dec.type,
      name: dec.name,
      category: dec.category,
      description: dec.description,
      requirement: dec.requirement,
      special: dec.special,
      unlocked: unlockedDecorations.includes(dec.type) || dec.requirement === 0,
      placed: gardenData.decorations.some(d => d.type === dec.type),
    }));
    
    res.json({
      decorations,
      placedDecorations: gardenData.decorations,
    });
  })
);

/**
 * POST /api/garden/decoration/place
 * Place a decoration in the garden
 */
router.post(
  '/decoration/place',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { type, x, y } = req.body as { type: DecorationType; x: number; y: number };
    
    if (!type || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing required fields: type, x, y' });
    }
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = { ...createDefaultGardenData(), ...(gardenState.gardenData as object) } as GardenData;
    
    // Check if decoration is unlocked
    const unlockedDecorations = getUnlockedDecorations(
      gardenData.totalFlows,
      gardenData.activityCounts
    );
    
    if (!unlockedDecorations.includes(type)) {
      return res.status(403).json({ error: 'Decoration not unlocked yet' });
    }
    
    // Check if position is valid
    if (x < 0 || x >= gardenData.gridSize || y < 0 || y >= gardenData.gridSize) {
      return res.status(400).json({ error: 'Invalid position' });
    }
    
    // Check if position is occupied
    const occupied = gardenData.plants.some(p => p.x === x && p.y === y) ||
                     gardenData.decorations.some(d => d.x === x && d.y === y);
    
    if (occupied) {
      return res.status(400).json({ error: 'Position already occupied' });
    }
    
    // Add decoration
    const decoration: Decoration = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x,
      y,
      placedAt: new Date().toISOString(),
    };
    
    gardenData.decorations.push(decoration);
    
    // Update companions (placing decorations might unlock new companions)
    gardenData.companions = getActiveCompanions(gardenData);
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    logger.info('Decoration placed', { userId, type, x, y });
    
    return res.json({
      success: true,
      decoration,
      companions: gardenData.companions,
    });
  })
);

/**
 * DELETE /api/garden/decoration/:id
 * Remove a decoration from the garden
 */
router.delete(
  '/decoration/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = { ...createDefaultGardenData(), ...(gardenState.gardenData as object) } as GardenData;
    
    const decorationIndex = gardenData.decorations.findIndex(d => d.id === id);
    
    if (decorationIndex === -1) {
      return res.status(404).json({ error: 'Decoration not found' });
    }
    
    gardenData.decorations.splice(decorationIndex, 1);
    
    // Update companions
    gardenData.companions = getActiveCompanions(gardenData);
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    return res.json({
      success: true,
      companions: gardenData.companions,
    });
  })
);

// ============================================
// SETTINGS ENDPOINTS
// ============================================

/**
 * GET /api/garden/settings
 * Get garden display settings
 */
router.get(
  '/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    res.json({
      settings: gardenData.settings,
      availableTimeOfDay: ['auto', 'morning', 'afternoon', 'evening', 'night', 'dynamic'],
      availableWeather: ['auto', 'sunny', 'partly-cloudy', 'cloudy', 'golden-hour', 'mist', 'gentle-rain', 'soft-snow'],
    });
  })
);

/**
 * PUT /api/garden/settings
 * Update garden display settings
 */
router.put(
  '/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { timeOfDay, showWeather, weatherOverride, soundEnabled, animationsEnabled } = req.body;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      // Create garden state with settings
      const newGardenData = {
        ...createDefaultGardenData(),
        settings: {
          timeOfDay: timeOfDay || 'auto',
          showWeather: showWeather !== false,
          weatherOverride: weatherOverride || 'auto',
          soundEnabled: soundEnabled !== false,
          animationsEnabled: animationsEnabled !== false,
        },
      };
      await prisma.emotionGardenState.create({
        data: {
          userId,
          gardenData: newGardenData as unknown as Prisma.InputJsonValue,
          lastUpdated: new Date(),
        },
      });
    } else {
      const gardenData = { ...createDefaultGardenData(), ...(gardenState.gardenData as object) } as GardenData;
      
      gardenData.settings = {
        ...gardenData.settings,
        ...(timeOfDay !== undefined && { timeOfDay }),
        ...(showWeather !== undefined && { showWeather }),
        ...(weatherOverride !== undefined && { weatherOverride }),
        ...(soundEnabled !== undefined && { soundEnabled }),
        ...(animationsEnabled !== undefined && { animationsEnabled }),
      };
      
      await prisma.emotionGardenState.update({
        where: { userId },
        data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
      });
    }
    
    logger.info('Garden settings updated', { userId });
    
    return res.json({ success: true });
  })
);

// ============================================
// BADGE ENDPOINTS
// ============================================

/**
 * GET /api/garden/badges
 * Get all badges with earned status
 */
router.get(
  '/badges',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    const earnedBadgeTypes = new Set(gardenData.badges.map(b => b.type));
    
    // Build badge list with earned status
    const badges = BADGE_REQUIREMENTS.map(badge => ({
      type: badge.type,
      name: badge.name,
      emoji: badge.emoji,
      description: badge.description,
      earned: earnedBadgeTypes.has(badge.type),
      earnedAt: gardenData.badges.find(b => b.type === badge.type)?.earnedAt,
    }));
    
    res.json({
      badges,
      totalEarned: gardenData.badges.length,
      totalAvailable: BADGE_REQUIREMENTS.length,
    });
  })
);

// ============================================
// COMPANION ENDPOINTS
// ============================================

/**
 * GET /api/garden/companions
 * Get all companions with availability status
 */
router.get(
  '/companions',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const gardenData: GardenData = gardenState?.gardenData 
      ? { ...createDefaultGardenData(), ...(gardenState.gardenData as object) }
      : createDefaultGardenData();
    
    const activeCompanions = getActiveCompanions(gardenData);
    
    // Build companion list with availability
    const companions = COMPANION_REQUIREMENTS.map(comp => ({
      type: comp.type,
      name: comp.name,
      description: comp.description,
      active: activeCompanions.includes(comp.type),
    }));
    
    res.json({
      companions,
      activeCompanions,
    });
  })
);

export default router;
