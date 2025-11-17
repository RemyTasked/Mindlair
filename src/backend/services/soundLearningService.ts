import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

type PrepMode = 'clarity' | 'confidence' | 'connection' | 'composure' | 'momentum';
type SoundType = 'calm-ocean' | 'rain' | 'forest' | 'meditation-bell' | 'white-noise' | 'lofi-chill' | 'lofi-focus' | 'lofi-morning' | 'lofi-evening' | 'lofi-calm';

interface SoundPreference {
  soundType: SoundType;
  frequency: number;
  percentage: number;
}

interface LearnedPreferences {
  [prepMode: string]: SoundPreference[];
}

/**
 * Analyzes user's sound preferences over time
 * Returns learned preferences for each prep mode
 */
export async function analyzeSoundPreferences(userId: string): Promise<LearnedPreferences> {
  try {
    // Get all focus sessions with sound data
    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        soundType: { not: null },
        prepMode: { not: null },
      },
      select: {
        prepMode: true,
        soundType: true,
        usedAISound: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Last 100 sessions
    });

    if (sessions.length === 0) {
      return {};
    }

    // Group by prep mode
    const preferencesByMode: { [key: string]: { [sound: string]: number } } = {};

    sessions.forEach((session) => {
      if (!session.prepMode || !session.soundType) return;

      if (!preferencesByMode[session.prepMode]) {
        preferencesByMode[session.prepMode] = {};
      }

      if (!preferencesByMode[session.prepMode][session.soundType]) {
        preferencesByMode[session.prepMode][session.soundType] = 0;
      }

      preferencesByMode[session.prepMode][session.soundType]++;
    });

    // Convert to percentage-based preferences
    const learnedPreferences: LearnedPreferences = {};

    Object.keys(preferencesByMode).forEach((mode) => {
      const sounds = preferencesByMode[mode];
      const total = Object.values(sounds).reduce((sum, count) => sum + count, 0);

      learnedPreferences[mode] = Object.entries(sounds)
        .map(([soundType, frequency]) => ({
          soundType: soundType as SoundType,
          frequency,
          percentage: (frequency / total) * 100,
        }))
        .sort((a, b) => b.frequency - a.frequency);
    });

    logger.info('Analyzed sound preferences', {
      userId,
      totalSessions: sessions.length,
      modesAnalyzed: Object.keys(learnedPreferences).length,
    });

    return learnedPreferences;
  } catch (error) {
    logger.error('Error analyzing sound preferences', { userId, error });
    return {};
  }
}

/**
 * Gets the user's preferred sound for a specific prep mode
 * Returns null if no strong preference (< 60% usage)
 */
export async function getPreferredSound(
  userId: string,
  prepMode: PrepMode
): Promise<SoundType | null> {
  try {
    const preferences = await analyzeSoundPreferences(userId);

    if (!preferences[prepMode] || preferences[prepMode].length === 0) {
      return null;
    }

    const topPreference = preferences[prepMode][0];

    // Only return if user has a strong preference (>= 60% of the time)
    if (topPreference.percentage >= 60) {
      logger.info('Found strong sound preference', {
        userId,
        prepMode,
        soundType: topPreference.soundType,
        percentage: topPreference.percentage,
      });
      return topPreference.soundType;
    }

    return null;
  } catch (error) {
    logger.error('Error getting preferred sound', { userId, prepMode, error });
    return null;
  }
}

/**
 * Gets sound insights for Director's Insights
 */
export async function getSoundInsights(userId: string): Promise<string[]> {
  try {
    const preferences = await analyzeSoundPreferences(userId);
    const insights: string[] = [];

    // Check if user consistently overrides AI recommendations
    const recentSessions = await prisma.focusSession.findMany({
      where: {
        userId,
        soundType: { not: null },
      },
      select: {
        usedAISound: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    if (recentSessions.length >= 10) {
      const aiUsageCount = recentSessions.filter((s) => s.usedAISound).length;
      const aiUsagePercentage = (aiUsageCount / recentSessions.length) * 100;

      if (aiUsagePercentage < 30) {
        insights.push(
          `You prefer choosing your own sounds - ${Math.round(100 - aiUsagePercentage)}% of the time you override AI recommendations.`
        );
      } else if (aiUsagePercentage > 80) {
        insights.push(
          `You trust AI sound recommendations - you use them ${Math.round(aiUsagePercentage)}% of the time.`
        );
      }
    }

    // Find favorite sound across all modes
    const allSounds: { [sound: string]: number } = {};
    Object.values(preferences).forEach((modePrefs) => {
      modePrefs.forEach((pref) => {
        if (!allSounds[pref.soundType]) {
          allSounds[pref.soundType] = 0;
        }
        allSounds[pref.soundType] += pref.frequency;
      });
    });

    if (Object.keys(allSounds).length > 0) {
      const favSound = Object.entries(allSounds).sort((a, b) => b[1] - a[1])[0];
      const soundNames: { [key: string]: string } = {
        'lofi-focus': 'Lofi Focus',
        'lofi-morning': 'Lofi Morning',
        'lofi-calm': 'Lofi Calm',
        'lofi-chill': 'Lofi Chill',
        'lofi-evening': 'Lofi Evening',
        'rain': 'Gentle Rain',
        'calm-ocean': 'Ocean Waves',
        'forest': 'Forest Sounds',
        'meditation-bell': 'Meditation Bell',
        'white-noise': 'White Noise',
      };

      insights.push(
        `Your go-to sound is ${soundNames[favSound[0]] || favSound[0]} - it helps you focus across different meeting types.`
      );
    }

    // Mode-specific preferences
    Object.entries(preferences).forEach(([mode, prefs]) => {
      if (prefs[0].percentage >= 70) {
        const modeNames: { [key: string]: string } = {
          clarity: 'Clarity Mode',
          confidence: 'Confidence Mode',
          connection: 'Connection Mode',
          composure: 'Composure Mode',
          momentum: 'Momentum Mode',
        };
        const soundNames: { [key: string]: string } = {
          'lofi-focus': 'Lofi Focus',
          'lofi-morning': 'Lofi Morning',
          'lofi-calm': 'Lofi Calm',
          'lofi-chill': 'Lofi Chill',
          'lofi-evening': 'Lofi Evening',
          'rain': 'Gentle Rain',
          'calm-ocean': 'Ocean Waves',
          'forest': 'Forest Sounds',
          'meditation-bell': 'Meditation Bell',
          'white-noise': 'White Noise',
        };

        insights.push(
          `For ${modeNames[mode]}, you consistently choose ${soundNames[prefs[0].soundType]} (${Math.round(prefs[0].percentage)}% of the time).`
        );
      }
    });

    return insights;
  } catch (error) {
    logger.error('Error getting sound insights', { userId, error });
    return [];
  }
}

/**
 * Gets AI-recommended sound with learned preferences applied
 */
export function getSmartSoundRecommendation(
  prepMode: PrepMode,
  learnedPreference: SoundType | null
): SoundType {
  // If user has a strong learned preference, use it
  if (learnedPreference) {
    return learnedPreference;
  }

  // Otherwise, use default AI recommendation
  const defaultRecommendations: Record<PrepMode, SoundType> = {
    clarity: 'lofi-focus',
    confidence: 'lofi-morning',
    connection: 'lofi-calm',
    composure: 'rain',
    momentum: 'lofi-chill',
  };

  return defaultRecommendations[prepMode];
}

