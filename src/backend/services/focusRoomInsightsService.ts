import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

interface FocusRoomInsights {
  totalSessions: number;
  totalMinutes: number;
  preferredRooms: Record<string, number>;
  averageSessionDuration: number;
  completionRate: number;
  creditsEarned: number;
  roomEffectiveness: Array<{
    roomId: string;
    roomName: string;
    sessions: number;
    averageDuration: number;
    completionRate: number;
  }>;
  usagePatterns: {
    preferredTimer: string;
    preferredAudioSource: string;
    mostActiveTimeOfDay: 'morning' | 'afternoon' | 'evening';
    weeklyPattern: Record<string, number>; // Day of week -> session count
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Analyze Focus Room usage patterns and generate insights
 */
export async function getFocusRoomInsights(userId: string): Promise<FocusRoomInsights> {
  try {
    // Get all Focus Room sessions for this user
    const sessions = await prisma.focusRoomSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        preferredRooms: {},
        averageSessionDuration: 0,
        completionRate: 0,
        creditsEarned: 0,
        roomEffectiveness: [],
        usagePatterns: {
          preferredTimer: '20',
          preferredAudioSource: 'meetcute',
          mostActiveTimeOfDay: 'afternoon',
          weeklyPattern: {},
        },
        insights: [],
        recommendations: [],
      };
    }

    // Calculate basic stats
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 60);
    const averageSessionDuration = Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60);
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const creditsEarned = sessions.reduce((sum, s) => sum + s.creditsEarned, 0);

    // Room preferences
    const roomCounts: Record<string, number> = {};
    const roomDurations: Record<string, number[]> = {};
    const roomCompletions: Record<string, { total: number; completed: number }> = {};

    sessions.forEach(session => {
      roomCounts[session.roomId] = (roomCounts[session.roomId] || 0) + 1;
      if (!roomDurations[session.roomId]) {
        roomDurations[session.roomId] = [];
      }
      roomDurations[session.roomId].push(session.duration);
      if (!roomCompletions[session.roomId]) {
        roomCompletions[session.roomId] = { total: 0, completed: 0 };
      }
      roomCompletions[session.roomId].total++;
      if (session.completed) {
        roomCompletions[session.roomId].completed++;
      }
    });

    // Room effectiveness analysis
    const roomEffectiveness = Object.keys(roomCounts).map(roomId => {
      const durations = roomDurations[roomId] || [];
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)
        : 0;
      const completion = roomCompletions[roomId] || { total: 0, completed: 0 };
      const completionRate = completion.total > 0
        ? Math.round((completion.completed / completion.total) * 100)
        : 0;

      return {
        roomId,
        roomName: sessions.find(s => s.roomId === roomId)?.roomName || roomId,
        sessions: roomCounts[roomId],
        averageDuration: avgDuration,
        completionRate,
      };
    }).sort((a, b) => b.sessions - a.sessions);

    // Usage patterns
    const timerCounts: Record<string, number> = {};
    const audioSourceCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<string, number> = {};

    sessions.forEach(session => {
      timerCounts[session.timerOption] = (timerCounts[session.timerOption] || 0) + 1;
      audioSourceCounts[session.audioSource] = (audioSourceCounts[session.audioSource] || 0) + 1;
      
      const startHour = new Date(session.startedAt).getHours();
      hourCounts[startHour] = (hourCounts[startHour] || 0) + 1;
      
      const dayName = new Date(session.startedAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
    });

    const preferredTimer = Object.keys(timerCounts).reduce((a, b) => 
      timerCounts[a] > timerCounts[b] ? a : b, '20'
    );
    const preferredAudioSource = Object.keys(audioSourceCounts).reduce((a, b) => 
      audioSourceCounts[a] > audioSourceCounts[b] ? a : b, 'meetcute'
    );

    // Determine most active time of day
    const morningCount = Object.keys(hourCounts).filter(h => parseInt(h) < 12).reduce((sum, h) => sum + hourCounts[parseInt(h)], 0);
    const afternoonCount = Object.keys(hourCounts).filter(h => parseInt(h) >= 12 && parseInt(h) < 17).reduce((sum, h) => sum + hourCounts[parseInt(h)], 0);
    const eveningCount = Object.keys(hourCounts).filter(h => parseInt(h) >= 17).reduce((sum, h) => sum + hourCounts[parseInt(h)], 0);
    
    let mostActiveTimeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (morningCount > afternoonCount && morningCount > eveningCount) {
      mostActiveTimeOfDay = 'morning';
    } else if (eveningCount > afternoonCount && eveningCount > morningCount) {
      mostActiveTimeOfDay = 'evening';
    }

    // Generate insights
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Session frequency insights
    if (totalSessions >= 10) {
      insights.push(`You've completed ${totalSessions} Focus Room sessions, building a strong focus practice.`);
    } else if (totalSessions >= 5) {
      insights.push(`You're building a focus habit with ${totalSessions} sessions. Keep it up!`);
    }

    // Room preference insights
    const topRoom = roomEffectiveness[0];
    if (topRoom && topRoom.sessions >= 3) {
      insights.push(`Your go-to room is ${topRoom.roomName} (${topRoom.sessions} sessions), suggesting you value ${getRoomBenefit(topRoom.roomId)}.`);
    }

    // Duration insights
    if (averageSessionDuration >= 15) {
      insights.push(`You average ${averageSessionDuration} minutes per session, showing commitment to deep focus.`);
    } else if (averageSessionDuration >= 10) {
      insights.push(`Your ${averageSessionDuration}-minute sessions indicate a balanced approach to focus time.`);
    }

    // Completion rate insights
    if (completionRate >= 80) {
      insights.push(`Your ${completionRate}% completion rate shows strong follow-through on focus sessions.`);
    } else if (completionRate < 50 && totalSessions >= 5) {
      recommendations.push(`Consider setting shorter timers (5-10 min) to improve your ${completionRate}% completion rate.`);
    }

    // Timer preference insights
    if (preferredTimer === '∞') {
      insights.push(`You prefer unlimited sessions, indicating you value flexible, open-ended focus time.`);
    } else if (preferredTimer === '20') {
      insights.push(`Your preference for 20-minute sessions aligns with the Pomodoro technique for optimal focus.`);
    } else if (preferredTimer === '5' || preferredTimer === '10') {
      insights.push(`You favor shorter ${preferredTimer}-minute sessions, perfect for quick mental resets.`);
    }

    // Time of day insights
    if (mostActiveTimeOfDay === 'morning') {
      insights.push(`You're most active in the morning, using Focus Rooms to start your day with intention.`);
      recommendations.push(`Try using Deep Focus Room in the morning to maximize your peak energy hours.`);
    } else if (mostActiveTimeOfDay === 'evening') {
      insights.push(`Evening sessions suggest you use Focus Rooms to decompress and transition after work.`);
      recommendations.push(`Recovery Lounge might be perfect for your evening routine.`);
    }

    // Audio source insights
    if (preferredAudioSource === 'ambient' || preferredAudioSource === 'mindgarden') {
      insights.push(`You prefer ${preferredAudioSource === 'ambient' ? 'ambient soundscapes' : 'Mind Garden sounds'}, showing you value immersive audio experiences.`);
    }

    // Credits insights
    if (creditsEarned >= 50) {
      insights.push(`You've earned ${creditsEarned} credits, demonstrating consistent focus practice.`);
    }

    // Room effectiveness recommendations
    if (roomEffectiveness.length > 1) {
      const leastUsedRoom = roomEffectiveness[roomEffectiveness.length - 1];
      if (leastUsedRoom.sessions < 2) {
        recommendations.push(`Try exploring ${leastUsedRoom.roomName} - it might offer a new perspective for your focus practice.`);
      }
    }

    // Performance correlation (if we have meeting data)
    // This could be enhanced by correlating with meeting performance metrics

    return {
      totalSessions,
      totalMinutes,
      preferredRooms: roomCounts,
      averageSessionDuration,
      completionRate,
      creditsEarned,
      roomEffectiveness,
      usagePatterns: {
        preferredTimer,
        preferredAudioSource,
        mostActiveTimeOfDay,
        weeklyPattern: dayCounts,
      },
      insights,
      recommendations,
    };
  } catch (error: any) {
    logger.error('❌ Failed to generate Focus Room insights', {
      error: error.message,
      userId,
    });
    return {
      totalSessions: 0,
      totalMinutes: 0,
      preferredRooms: {},
      averageSessionDuration: 0,
      completionRate: 0,
      creditsEarned: 0,
      roomEffectiveness: [],
      usagePatterns: {
        preferredTimer: '20',
        preferredAudioSource: 'meetcute',
        mostActiveTimeOfDay: 'afternoon',
        weeklyPattern: {},
      },
      insights: [],
      recommendations: [],
    };
  }
}

/**
 * Get the benefit/outcome associated with each room
 */
function getRoomBenefit(roomId: string): string {
  const benefits: Record<string, string> = {
    'deep-focus': 'deep concentration and clarity',
    'soft-composure': 'calm and nervous system regulation',
    'warm-connection': 'empathy and interpersonal warmth',
    'pitch-pulse': 'confidence and energy',
    'recovery-lounge': 'restoration and decompression',
  };
  return benefits[roomId] || 'focus and clarity';
}

/**
 * Generate meeting prep insights based on Focus Room usage
 */
export async function getMeetingPrepInsights(userId: string): Promise<string[]> {
  try {
    // Get Focus Room sessions and correlate with meeting prep sessions
    const focusRoomSessions = await prisma.focusRoomSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const focusSessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const insights: string[] = [];

    // Check if user uses Focus Rooms before meetings
    // This would require correlating Focus Room sessions with meeting times
    // For now, we'll provide general insights

    if (focusRoomSessions.length > 0 && focusSessions.length > 0) {
      // Calculate average time between Focus Room and meeting
      // This is a simplified version - could be enhanced with actual meeting correlation
      insights.push(`You use Focus Rooms alongside meeting prep, creating a comprehensive preparation ritual.`);
    }

    // Room selection for meeting prep
    const roomUsage = focusRoomSessions.reduce((acc, session) => {
      acc[session.roomId] = (acc[session.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRoom = Object.keys(roomUsage).reduce((a, b) => 
      roomUsage[a] > roomUsage[b] ? a : b, ''
    );

    if (topRoom) {
      const roomName = focusRoomSessions.find(s => s.roomId === topRoom)?.roomName || topRoom;
      insights.push(`Your preference for ${roomName} suggests you're optimizing for ${getRoomBenefit(topRoom)} in your prep routine.`);
    }

    return insights;
  } catch (error: any) {
    logger.error('❌ Failed to generate meeting prep insights', {
      error: error.message,
      userId,
    });
    return [];
  }
}

