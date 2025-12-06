/**
 * Mind Garden - Calendar Analysis API
 * 
 * Endpoints for smart meeting analysis and stress forecasting
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
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
    
    res.json(forecast);
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
    
    // This would analyze historical meeting data
    // For now, return placeholder
    res.json({
      userId,
      patterns: {
        busiestDay: 'Tuesday',
        busiestTime: 'afternoon',
        avgMeetingsPerDay: 4.2,
        avgBackToBack: 1.5,
        highStakesMeetingsPerWeek: 2,
      },
      recommendations: [
        'Your Tuesdays are consistently meeting-heavy. Consider blocking focus time.',
        'Afternoon meetings tend to cluster - plan breaks after lunch.',
      ],
    });
  })
);

export default router;

