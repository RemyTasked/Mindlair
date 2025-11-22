import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface GardenPlant {
  id: string;
  type: 'grass' | 'tree' | 'flower' | 'cloud' | 'thorn' | 'rock';
  emotion: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  createdAt: Date;
}

export interface GardenWeather {
  type: 'calm' | 'stormy' | 'sunny' | 'windy';
  intensity: number;
}

export interface GardenState {
  plants: GardenPlant[];
  weather: GardenWeather;
  lastUpdated: Date;
}

/**
 * Record emotion check-in and update garden
 */
export async function recordEmotionCheckIn(
  userId: string,
  emotion: string,
  intensity: number = 5,
  notes?: string
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create check-in
    await prisma.emotionCheckIn.create({
      data: {
        userId,
        date: today,
        emotion,
        intensity,
        notes,
      },
    });

    // Update garden state
    await updateGardenState(userId, emotion, intensity);
  } catch (error) {
    logger.error('Error recording emotion check-in:', error);
    throw error;
  }
}

/**
 * Update garden state based on emotion and activities
 */
export async function updateGardenState(
  userId: string,
  emotion: string,
  intensity: number,
  activityType?: 'focus-room' | 'thought-tidy' | 'game' | 'breathing'
): Promise<GardenState> {
  try {
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });

    const now = new Date();
    let plants: GardenPlant[] = [];
    let weather: GardenWeather = { type: 'calm', intensity: 0 };

    if (gardenState) {
      const existing = gardenState.gardenData as any;
      plants = existing.plants || [];
      weather = existing.weather || weather;
    }

    // Map emotions to plant types
    const emotionToPlant: Record<string, 'grass' | 'tree' | 'flower' | 'cloud' | 'thorn' | 'rock'> = {
      calm: 'grass',
      grounded: 'tree',
      joy: 'flower',
      gratitude: 'flower',
      anxiety: 'cloud',
      overwhelm: 'cloud',
      anger: 'thorn',
      frustration: 'thorn',
      stress: 'rock',
    };

    const plantType = emotionToPlant[emotion.toLowerCase()] || 'grass';

    // Add new plant based on emotion and activity type
    // Activities like focus-room, thought-tidy, breathing create more growth
    const activityMultiplier = activityType ? 1.2 : 1.0; // Activities create slightly larger plants
    
    const newPlant: GardenPlant = {
      id: `plant-${Date.now()}-${Math.random()}`,
      type: plantType,
      emotion,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: (0.5 + (intensity / 10) * 0.5) * activityMultiplier, // Size based on intensity and activity
      opacity: 0.7 + (intensity / 10) * 0.3,
      createdAt: now,
    };

    plants.push(newPlant);

    // Update weather based on recent emotions
    const recentCheckIns = await prisma.emotionCheckIn.findMany({
      where: {
        userId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const anxiousCount = recentCheckIns.filter(c => 
      ['anxiety', 'overwhelm', 'stress'].includes(c.emotion.toLowerCase())
    ).length;

    if (anxiousCount > 5) {
      weather = { type: 'stormy', intensity: Math.min(anxiousCount / 10, 1) };
    } else if (recentCheckIns.filter(c => 
      ['joy', 'gratitude', 'calm'].includes(c.emotion.toLowerCase())
    ).length > 5) {
      weather = { type: 'sunny', intensity: 0.8 };
    } else {
      weather = { type: 'calm', intensity: 0.3 };
    }

    // Limit plants to last 50 to keep performance good
    if (plants.length > 50) {
      plants = plants.slice(-50);
    }

    const newGardenState: GardenState = {
      plants,
      weather,
      lastUpdated: now,
    };

    // Save garden state
    await prisma.emotionGardenState.upsert({
      where: { userId },
      update: {
        gardenData: newGardenState as any,
        lastUpdated: now,
      },
      create: {
        userId,
        gardenData: newGardenState as any,
        lastUpdated: now,
      },
    });

    return newGardenState;
  } catch (error) {
    logger.error('Error updating garden state:', error);
    throw error;
  }
}

/**
 * Get current garden state
 */
export async function getGardenState(userId: string): Promise<GardenState | null> {
  try {
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });

    if (!gardenState) {
      // Create initial garden state
      return await updateGardenState(userId, 'calm', 5);
    }

    return gardenState.gardenData as unknown as GardenState;
  } catch (error) {
    logger.error('Error getting garden state:', error);
    return null;
  }
}

/**
 * Get garden insights (patterns over time)
 */
export async function getGardenInsights(userId: string): Promise<{
  calmDays: number;
  stormyDays: number;
  thoughtTidyCorrelation: boolean;
  focusRoomCorrelation: boolean;
}> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const checkIns = await prisma.emotionCheckIn.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
    });

    const calmDays = new Set(
      checkIns
        .filter(c => ['calm', 'joy', 'gratitude'].includes(c.emotion.toLowerCase()))
        .map(c => c.date.toISOString().split('T')[0])
    ).size;

    const stormyDays = new Set(
      checkIns
        .filter(c => ['anxiety', 'overwhelm', 'stress', 'anger'].includes(c.emotion.toLowerCase()))
        .map(c => c.date.toISOString().split('T')[0])
    ).size;

    // Check correlations (simplified - would need more data)
    const thoughtTidyCorrelation = false; // TODO: Implement correlation analysis
    const focusRoomCorrelation = false; // TODO: Implement correlation analysis

    return {
      calmDays,
      stormyDays,
      thoughtTidyCorrelation,
      focusRoomCorrelation,
    };
  } catch (error) {
    logger.error('Error getting garden insights:', error);
    return {
      calmDays: 0,
      stormyDays: 0,
      thoughtTidyCorrelation: false,
      focusRoomCorrelation: false,
    };
  }
}

