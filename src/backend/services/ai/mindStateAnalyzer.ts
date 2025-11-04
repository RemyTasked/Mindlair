import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';


export interface MindStatePattern {
  // Overall patterns
  mostCommonState: string;
  stressFrequency: number; // Percentage of sessions marked as stressed
  
  // Time-based patterns
  stressfulDaysOfWeek: string[]; // e.g., ["Monday", "Friday"]
  stressfulTimesOfDay: string[]; // e.g., ["morning", "afternoon"]
  
  // Meeting-type patterns
  stressfulMeetingTypes: Array<{
    type: string;
    stressCount: number;
    totalCount: number;
    stressRate: number;
  }>;
  
  // Recent trend
  recentTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
  
  // Insights for AI
  insights: string[];
}

export async function analyzeMindStatePatterns(userId: string): Promise<MindStatePattern> {
  try {
    // Get all focus sessions with mind state data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        startedAt: { gte: ninetyDaysAgo },
      },
      include: {
        meeting: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    // Filter for sessions with mindState (Prisma types not yet regenerated)
    const sessionsWithMindState = sessions.filter((s: any) => s.mindState != null);

    if (sessionsWithMindState.length < 3) {
      return {
        mostCommonState: 'unknown',
        stressFrequency: 0,
        stressfulDaysOfWeek: [],
        stressfulTimesOfDay: [],
        stressfulMeetingTypes: [],
        recentTrend: 'insufficient_data',
        insights: ['Not enough data yet to identify patterns. Keep tracking your mind state!'],
      };
    }

    // Analyze state distribution
    const stateCounts: Record<string, number> = {};
    sessionsWithMindState.forEach((s: any) => {
      if (s.mindState) {
        stateCounts[s.mindState] = (stateCounts[s.mindState] || 0) + 1;
      }
    });

    const mostCommonState = Object.entries(stateCounts)
      .sort(([, a], [, b]) => b - a)[0][0];

    const stressedCount = stateCounts['stressed'] || 0;
    const stressFrequency = (stressedCount / sessionsWithMindState.length) * 100;

    // Analyze day of week patterns
    const dayStressCounts: Record<string, { stressed: number; total: number }> = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    sessionsWithMindState.forEach((s: any) => {
      const dayIndex = new Date(s.meeting.startTime).getDay();
      const dayName = daysOfWeek[dayIndex];
      
      if (!dayStressCounts[dayName]) {
        dayStressCounts[dayName] = { stressed: 0, total: 0 };
      }
      
      dayStressCounts[dayName].total++;
      if (s.mindState === 'stressed') {
        dayStressCounts[dayName].stressed++;
      }
    });

    const stressfulDaysOfWeek = Object.entries(dayStressCounts)
      .filter(([, counts]) => counts.total >= 2) // At least 2 meetings on that day
      .filter(([, counts]) => (counts.stressed / counts.total) > 0.4) // >40% stress rate
      .map(([day]) => day)
      .sort((a, b) => {
        const rateA = dayStressCounts[a].stressed / dayStressCounts[a].total;
        const rateB = dayStressCounts[b].stressed / dayStressCounts[b].total;
        return rateB - rateA;
      });

    // Analyze time of day patterns
    const timeStressCounts: Record<string, { stressed: number; total: number }> = {
      morning: { stressed: 0, total: 0 },
      afternoon: { stressed: 0, total: 0 },
      evening: { stressed: 0, total: 0 },
    };

    sessionsWithMindState.forEach((s: any) => {
      const hour = new Date(s.meeting.startTime).getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      timeStressCounts[timeOfDay].total++;
      if (s.mindState === 'stressed') {
        timeStressCounts[timeOfDay].stressed++;
      }
    });

    const stressfulTimesOfDay = Object.entries(timeStressCounts)
      .filter(([, counts]) => counts.total >= 2)
      .filter(([, counts]) => (counts.stressed / counts.total) > 0.4)
      .map(([time]) => time);

    // Analyze meeting type patterns
    const meetingTypeStress: Record<string, { stressed: number; total: number }> = {};
    
    sessionsWithMindState.forEach((s: any) => {
      const type = s.meeting.meetingType || 'general';
      
      if (!meetingTypeStress[type]) {
        meetingTypeStress[type] = { stressed: 0, total: 0 };
      }
      
      meetingTypeStress[type].total++;
      if (s.mindState === 'stressed') {
        meetingTypeStress[type].stressed++;
      }
    });

    const stressfulMeetingTypes = Object.entries(meetingTypeStress)
      .filter(([, counts]) => counts.total >= 2)
      .map(([type, counts]) => ({
        type,
        stressCount: counts.stressed,
        totalCount: counts.total,
        stressRate: (counts.stressed / counts.total) * 100,
      }))
      .filter(mt => mt.stressRate > 40)
      .sort((a, b) => b.stressRate - a.stressRate);

    // Analyze recent trend (last 2 weeks vs previous 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentSessions = sessionsWithMindState.filter((s: any) => new Date(s.startedAt) >= twoWeeksAgo);
    const previousSessions = sessionsWithMindState.filter(
      (s: any) => new Date(s.startedAt) >= fourWeeksAgo && new Date(s.startedAt) < twoWeeksAgo
    );

    let recentTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data' = 'insufficient_data';
    
    if (recentSessions.length >= 2 && previousSessions.length >= 2) {
      const recentStressRate = recentSessions.filter((s: any) => s.mindState === 'stressed').length / recentSessions.length;
      const previousStressRate = previousSessions.filter((s: any) => s.mindState === 'stressed').length / previousSessions.length;
      const difference = recentStressRate - previousStressRate;

      if (Math.abs(difference) < 0.1) {
        recentTrend = 'stable';
      } else if (difference < -0.1) {
        recentTrend = 'improving';
      } else {
        recentTrend = 'worsening';
      }
    }

    // Generate insights
    const insights: string[] = [];
    
    if (stressFrequency > 50) {
      insights.push('You experience stress before meetings more than half the time. Consider building in more buffer time between meetings.');
    }
    
    if (stressfulDaysOfWeek.length > 0) {
      insights.push(`${stressfulDaysOfWeek.join(' and ')} tend to be more stressful for you. Extra self-care on these days could help.`);
    }
    
    if (stressfulTimesOfDay.includes('morning')) {
      insights.push('Morning meetings often find you stressed. A morning routine or earlier wake-up time might help.');
    }
    
    if (stressfulMeetingTypes.length > 0) {
      const topStressful = stressfulMeetingTypes[0];
      insights.push(`${topStressful.type} meetings are particularly stressful (${Math.round(topStressful.stressRate)}% of the time). Extra preparation for these might help.`);
    }
    
    if (recentTrend === 'improving') {
      insights.push('Your stress levels have been improving recently. Keep up whatever you\'re doing!');
    } else if (recentTrend === 'worsening') {
      insights.push('Your stress levels have increased recently. It might be time to reassess your schedule or self-care practices.');
    }

    if (insights.length === 0) {
      insights.push('Your meeting stress levels are well-balanced. Keep maintaining your current practices!');
    }

    logger.info('Mind state pattern analysis completed', {
      userId,
      sessionCount: sessionsWithMindState.length,
      stressFrequency,
      stressfulDaysOfWeek,
      recentTrend,
    });

    return {
      mostCommonState,
      stressFrequency,
      stressfulDaysOfWeek,
      stressfulTimesOfDay,
      stressfulMeetingTypes,
      recentTrend,
      insights,
    };
  } catch (error: any) {
    logger.error('Error analyzing mind state patterns', {
      userId,
      error: error.message,
    });
    
    return {
      mostCommonState: 'unknown',
      stressFrequency: 0,
      stressfulDaysOfWeek: [],
      stressfulTimesOfDay: [],
      stressfulMeetingTypes: [],
      recentTrend: 'insufficient_data',
      insights: [],
    };
  }
}

// Get mind state insights for tomorrow's meetings
export async function getTomorrowMindStateInsights(userId: string): Promise<string[]> {
  try {
    const patterns = await analyzeMindStatePatterns(userId);
    
    // Get tomorrow's meetings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const tomorrowMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: {
          gte: tomorrow,
          lte: endOfTomorrow,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (tomorrowMeetings.length === 0) {
      return [];
    }

    const insights: string[] = [];
    const tomorrowDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()];

    // Check if tomorrow is typically stressful
    if (patterns.stressfulDaysOfWeek.includes(tomorrowDayOfWeek)) {
      insights.push(`Tomorrow is ${tomorrowDayOfWeek}, which tends to be more stressful for you. Plan some extra self-care.`);
    }

    // Check meeting types
    const stressfulTypes = new Set(patterns.stressfulMeetingTypes.map(mt => mt.type));
    const hasStressfulMeetingType = tomorrowMeetings.some((m: any) => 
      m.meetingType && stressfulTypes.has(m.meetingType)
    );

    if (hasStressfulMeetingType) {
      const stressfulMeeting = tomorrowMeetings.find((m: any) => 
        m.meetingType && stressfulTypes.has(m.meetingType)
      );
      insights.push(`You have a ${stressfulMeeting?.meetingType} meeting tomorrow, which you often find stressful. Extra preparation could help.`);
    }

    // Check time of day
    const morningMeetings = tomorrowMeetings.filter((m: any) => new Date(m.startTime).getHours() < 12);
    if (morningMeetings.length > 0 && patterns.stressfulTimesOfDay.includes('morning')) {
      insights.push('You have morning meetings tomorrow, which can be stressful for you. Consider a calming morning routine.');
    }

    // Check for back-to-back
    const hasBackToBack = tomorrowMeetings.some((m: any) => m.isBackToBack);
    if (hasBackToBack && patterns.stressFrequency > 40) {
      insights.push('You have back-to-back meetings tomorrow. Build in micro-breaks to reset between them.');
    }

    return insights;
  } catch (error: any) {
    logger.error('Error getting tomorrow mind state insights', {
      userId,
      error: error.message,
    });
    return [];
  }
}

