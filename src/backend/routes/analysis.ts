/**
 * Mind Garden - Calendar Analysis API
 * 
 * Endpoints for smart meeting analysis and stress forecasting
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

// Stress indicators configuration (can be customized per user)
const DEFAULT_STRESS_THRESHOLDS = {
  backToBackGapMinutes: 15, // Less than this = back-to-back
  longMeetingMinutes: 60, // More than this = long meeting
  highDensityCount: 6, // More than this = high density day
  highStakeKeywords: [
    'presentation', 'present',
    'demo', 'demonstration',
    'pitch', 'pitching',
    'interview',
    'review', 'performance',
    'board', 'exec', 'executive',
    'client', 'customer',
    'all-hands', 'town hall',
    'workshop',
  ],
};

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeCount?: number;
}

interface StressForecast {
  level: 'light' | 'moderate' | 'heavy';
  label: string;
  description: string;
  color: 'green' | 'yellow' | 'orange';
  score: number;
  indicators: {
    totalMeetings: number;
    backToBack: number;
    longMeetings: number;
    highStakes: number;
  };
  recommendations: string[];
  suggestedFlows: string[];
}

/**
 * POST /api/analysis/forecast
 * Analyze calendar events and return stress forecast
 */
router.post(
  '/forecast',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { meetings } = req.body as { meetings: CalendarEvent[] };
    
    if (!meetings || !Array.isArray(meetings)) {
      return res.status(400).json({ error: 'Invalid meetings data' });
    }
    
    logger.info('Analyzing calendar for stress forecast', {
      userId,
      meetingCount: meetings.length,
    });
    
    const forecast = calculateStressForecast(meetings);
    
    return res.json(forecast);
  })
);

/**
 * Calculate stress forecast from calendar events
 */
function calculateStressForecast(meetings: CalendarEvent[]): StressForecast {
  if (meetings.length === 0) {
    return {
      level: 'light',
      label: 'No meetings scheduled',
      description: 'A clear day ahead - great time for deep work!',
      color: 'green',
      score: 0,
      indicators: {
        totalMeetings: 0,
        backToBack: 0,
        longMeetings: 0,
        highStakes: 0,
      },
      recommendations: ['Use this time for focused work or self-care'],
      suggestedFlows: [],
    };
  }
  
  const indicators = {
    totalMeetings: meetings.length,
    backToBack: 0,
    longMeetings: 0,
    highStakes: 0,
  };
  
  // Sort meetings by start time
  const sorted = [...meetings].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  // Analyze each meeting
  const highStakeMeetings: string[] = [];
  
  for (let i = 0; i < sorted.length; i++) {
    const meeting = sorted[i];
    const startTime = new Date(meeting.startTime).getTime();
    const endTime = new Date(meeting.endTime).getTime();
    const durationMinutes = (endTime - startTime) / (1000 * 60);
    const title = meeting.title.toLowerCase();
    
    // Long meeting check
    if (durationMinutes > DEFAULT_STRESS_THRESHOLDS.longMeetingMinutes) {
      indicators.longMeetings++;
    }
    
    // High-stakes keyword check
    const isHighStakes = DEFAULT_STRESS_THRESHOLDS.highStakeKeywords.some(
      keyword => title.includes(keyword)
    );
    if (isHighStakes) {
      indicators.highStakes++;
      highStakeMeetings.push(meeting.title);
    }
    
    // Back-to-back check (compare with previous meeting)
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const gap = (startTime - prevEnd) / (1000 * 60);
      
      if (gap < DEFAULT_STRESS_THRESHOLDS.backToBackGapMinutes) {
        indicators.backToBack++;
      }
    }
  }
  
  // Calculate stress score
  let score = indicators.totalMeetings * 1;
  score += indicators.backToBack * 2;
  score += indicators.longMeetings * 1.5;
  score += indicators.highStakes * 2.5;
  
  // Bonus stress for high density
  if (indicators.totalMeetings > DEFAULT_STRESS_THRESHOLDS.highDensityCount) {
    score += (indicators.totalMeetings - DEFAULT_STRESS_THRESHOLDS.highDensityCount) * 1.5;
  }
  
  // Generate recommendations and suggested flows
  const recommendations: string[] = [];
  const suggestedFlows: string[] = [];
  
  if (indicators.backToBack > 0) {
    recommendations.push('Try to get a 5-minute buffer between back-to-back meetings');
    suggestedFlows.push('quick-reset');
  }
  
  if (indicators.longMeetings > 0) {
    recommendations.push('Plan a short break after your long meetings');
    suggestedFlows.push('post-meeting-decompress');
  }
  
  if (indicators.highStakes > 0) {
    recommendations.push('Use pre-meeting flows before high-stakes meetings');
    if (highStakeMeetings.some(m => m.includes('presentation') || m.includes('pitch'))) {
      suggestedFlows.push('pre-presentation-power');
    } else if (highStakeMeetings.some(m => m.includes('review') || m.includes('feedback'))) {
      suggestedFlows.push('difficult-conversation-prep');
    } else {
      suggestedFlows.push('pre-meeting-focus');
    }
  }
  
  // Always recommend end-of-day transition on busy days
  if (score >= 6) {
    suggestedFlows.push('end-of-day-transition');
  }
  
  // Determine level and messaging
  if (score <= 4) {
    return {
      level: 'light',
      label: `${indicators.totalMeetings} meeting${indicators.totalMeetings !== 1 ? 's' : ''} with good spacing`,
      description: 'A manageable day ahead. Stay mindful!',
      color: 'green',
      score,
      indicators,
      recommendations: recommendations.length > 0 ? recommendations : ['Great schedule! Consider starting with a morning flow.'],
      suggestedFlows: suggestedFlows.length > 0 ? suggestedFlows : ['pre-meeting-focus'],
    };
  } else if (score <= 8) {
    return {
      level: 'moderate',
      label: `${indicators.totalMeetings} meetings${indicators.backToBack > 0 ? `, ${indicators.backToBack} back-to-back` : ''}`,
      description: 'A busy day - prioritize breaks between meetings.',
      color: 'yellow',
      score,
      indicators,
      recommendations: recommendations.length > 0 ? recommendations : ['Take short breaks between meetings'],
      suggestedFlows: suggestedFlows.length > 0 ? suggestedFlows : ['quick-reset', 'pre-meeting-focus'],
    };
  } else {
    return {
      level: 'heavy',
      label: `${indicators.totalMeetings} meetings${indicators.backToBack > 0 ? `, ${indicators.backToBack} back-to-back` : ''}${indicators.highStakes > 0 ? ', includes high-stakes' : ''}`,
      description: 'Heavy day ahead - self-care is essential!',
      color: 'orange',
      score,
      indicators,
      recommendations: [
        'Protect at least 5 minutes between meetings',
        'Use flows before and after intense meetings',
        'Stay hydrated and take micro-breaks',
        ...recommendations,
      ],
      suggestedFlows: Array.from(new Set([
        'quick-reset',
        'pre-meeting-focus',
        'post-meeting-decompress',
        'end-of-day-transition',
        ...suggestedFlows,
      ])),
    };
  }
}

/**
 * GET /api/analysis/patterns
 * Get user's meeting patterns over time (for dashboard insights)
 */
router.get(
  '/patterns',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Get meetings from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: { gte: thirtyDaysAgo },
      },
      orderBy: { startTime: 'asc' },
    });
    
    if (meetings.length === 0) {
      return res.json({
        userId,
        patterns: null,
        message: 'Not enough meeting data yet. Keep using Mind Garden!',
        recommendations: ['Connect your calendar to start tracking meeting patterns.'],
      });
    }
    
    // Analyze day of week patterns
    const dayOfWeekCounts: Record<string, number> = {
      Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0,
    };
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Analyze time of day patterns
    const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0 };
    
    // Track back-to-back and high-stakes
    let backToBackCount = 0;
    let highStakesCount = 0;
    
    meetings.forEach((meeting, index) => {
      const startTime = new Date(meeting.startTime);
      const dayName = daysOfWeek[startTime.getDay()];
      dayOfWeekCounts[dayName]++;
      
      const hour = startTime.getHours();
      if (hour < 12) timeOfDayCounts.morning++;
      else if (hour < 17) timeOfDayCounts.afternoon++;
      else timeOfDayCounts.evening++;
      
      // Check back-to-back
      if (index > 0) {
        const prevEnd = new Date(meetings[index - 1].endTime).getTime();
        const gap = (startTime.getTime() - prevEnd) / (1000 * 60);
        if (gap < 15) backToBackCount++;
      }
      
      // Check high-stakes (by title keywords)
      const title = meeting.title.toLowerCase();
      const highStakesKeywords = ['presentation', 'pitch', 'demo', 'interview', 'review', 'client', 'exec', 'board'];
      if (highStakesKeywords.some(kw => title.includes(kw))) {
        highStakesCount++;
      }
    });
    
    // Find busiest day
    const busiestDay = Object.entries(dayOfWeekCounts)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    // Find busiest time
    const busiestTime = Object.entries(timeOfDayCounts)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    // Calculate averages
    const uniqueDays = new Set(
      meetings.map(m => new Date(m.startTime).toDateString())
    ).size;
    const avgMeetingsPerDay = uniqueDays > 0 ? (meetings.length / uniqueDays) : 0;
    const avgBackToBack = uniqueDays > 0 ? (backToBackCount / uniqueDays) : 0;
    const weeksInPeriod = Math.max(1, Math.ceil(uniqueDays / 7));
    const highStakesMeetingsPerWeek = highStakesCount / weeksInPeriod;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (dayOfWeekCounts[busiestDay] > meetings.length / 5) {
      recommendations.push(`Your ${busiestDay}s are meeting-heavy. Consider blocking focus time.`);
    }
    
    if (avgBackToBack > 1) {
      recommendations.push('You have frequent back-to-back meetings. Try to add 5-minute buffers.');
    }
    
    if (timeOfDayCounts.afternoon > meetings.length / 2) {
      recommendations.push('Most meetings cluster in the afternoon. Plan breaks after lunch.');
    }
    
    if (timeOfDayCounts.morning > meetings.length / 2) {
      recommendations.push('Heavy morning schedule. A Morning Intention flow could help you start strong.');
    }
    
    if (highStakesMeetingsPerWeek >= 2) {
      recommendations.push('You have several high-stakes meetings weekly. Use Pre-Presentation Power flows to prepare.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your meeting schedule looks balanced. Keep it up!');
    }
    
    return res.json({
      userId,
      period: '30 days',
      totalMeetings: meetings.length,
      patterns: {
        busiestDay,
        busiestTime,
        avgMeetingsPerDay: Number(avgMeetingsPerDay.toFixed(1)),
        avgBackToBack: Number(avgBackToBack.toFixed(1)),
        highStakesMeetingsPerWeek: Number(highStakesMeetingsPerWeek.toFixed(1)),
        dayBreakdown: dayOfWeekCounts,
        timeBreakdown: timeOfDayCounts,
      },
      recommendations,
    });
  })
);

/**
 * GET /api/analysis/stress-patterns
 * Get user's stress patterns from mind state data
 */
router.get(
  '/stress-patterns',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Import and use the mind state analyzer
    const { analyzeMindStatePatterns } = await import('../services/ai/mindStateAnalyzer');
    const patterns = await analyzeMindStatePatterns(userId);
    
    res.json({
      userId,
      stressPatterns: patterns,
    });
  })
);

export default router;

