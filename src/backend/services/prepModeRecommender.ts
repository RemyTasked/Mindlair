import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

type PrepMode = 'clarity' | 'confidence' | 'connection' | 'composure' | 'momentum';

interface RecommendationContext {
  meetingTitle: string;
  attendeeCount: number;
  userId: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  meetingDuration?: number; // in minutes
  isBackToBack?: boolean; // detected from calendar density
  recurringAttendees?: string[]; // for relationship pattern detection
}

/**
 * 🧠 INTELLIGENT PREP MODE RECOMMENDATION ENGINE
 * 
 * A lightweight logic engine combining context, data, and emotion.
 * 
 * Priority Order:
 * 1. User's custom default mappings (sticky preferences)
 * 2. Meeting type keywords (calendar title analysis)
 * 3. Meeting duration (>30min = high stakes → Composure/Clarity)
 * 4. Calendar density (back-to-backs → Composure)
 * 5. Time of day (late-day fatigue → Composure)
 * 6. Attendee patterns (recurring friction → Connection)
 * 7. User's historical patterns (past mode choices)
 * 8. Fallback defaults by time of day
 */
export async function recommendPrepMode(context: RecommendationContext): Promise<PrepMode> {
  const { 
    meetingTitle, 
    attendeeCount, 
    userId, 
    timeOfDay, 
    dayOfWeek,
    meetingDuration,
    isBackToBack,
    recurringAttendees,
  } = context;
  
  logger.info('🎯 Recommending prep mode', { context });
  
  // Step 1: Check for user's default mode for this meeting type
  try {
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });
    
    if (userPreferences?.defaultPrepModes) {
      const defaults = userPreferences.defaultPrepModes as Record<string, PrepMode>;
      
      // Check for exact meeting title match (case-insensitive)
      const titleLower = meetingTitle.toLowerCase();
      for (const [pattern, mode] of Object.entries(defaults)) {
        if (titleLower.includes(pattern.toLowerCase())) {
          logger.info('✅ Using user default mode for meeting type', { pattern, mode });
          return mode;
        }
      }
    }
  } catch (error) {
    logger.error('❌ Error checking user default modes', { error });
  }
  
  // Step 2: Analyze meeting title for keywords
  const titleLower = meetingTitle.toLowerCase();
  
  // Clarity keywords: decision, strategy, planning, roadmap, alignment, review, sync, budget
  if (
    titleLower.includes('decision') ||
    titleLower.includes('strategy') ||
    titleLower.includes('planning') ||
    titleLower.includes('roadmap') ||
    titleLower.includes('alignment') ||
    titleLower.includes('review') ||
    titleLower.includes('standup') ||
    titleLower.includes('sync') ||
    titleLower.includes('budget') ||
    titleLower.includes('status') ||
    titleLower.includes('sprint')
  ) {
    logger.info('✅ Recommending Clarity mode based on title keywords');
    return 'clarity';
  }
  
  // Confidence keywords: presentation, pitch, demo, showcase, interview
  if (
    titleLower.includes('presentation') ||
    titleLower.includes('pitch') ||
    titleLower.includes('demo') ||
    titleLower.includes('showcase') ||
    titleLower.includes('interview') ||
    titleLower.includes('speak')
  ) {
    logger.info('✅ Recommending Confidence mode based on title keywords');
    return 'confidence';
  }
  
  // Connection keywords: 1:1, one-on-one, feedback, coaching, check-in, HR
  if (
    titleLower.includes('1:1') ||
    titleLower.includes('1-on-1') ||
    titleLower.includes('one-on-one') ||
    titleLower.includes('feedback') ||
    titleLower.includes('coaching') ||
    titleLower.includes('check-in') ||
    titleLower.includes('checkin') ||
    titleLower.includes('catch up') ||
    titleLower.includes('coffee') ||
    titleLower.includes('hr') ||
    titleLower.includes('human resources') ||
    attendeeCount === 2 // Small meetings are often 1:1s
  ) {
    logger.info('✅ Recommending Connection mode based on title keywords or attendee count');
    return 'connection';
  }
  
  // Composure keywords: difficult, conflict, performance, urgent, crisis, board, investor
  if (
    titleLower.includes('difficult') ||
    titleLower.includes('conflict') ||
    titleLower.includes('performance') ||
    titleLower.includes('urgent') ||
    titleLower.includes('crisis') ||
    titleLower.includes('escalation') ||
    titleLower.includes('board') ||
    titleLower.includes('investor') ||
    titleLower.includes('executive')
  ) {
    logger.info('✅ Recommending Composure mode based on title keywords');
    return 'composure';
  }
  
  // Step 3: Meeting Duration Analysis (>30min = high stakes)
  if (meetingDuration && meetingDuration > 30) {
    // Long meetings often need either Clarity (to stay focused) or Composure (to maintain energy)
    // If it's also late in the day, prioritize Composure
    if (timeOfDay === 'evening') {
      logger.info('✅ Recommending Composure mode: long meeting + late-day fatigue risk');
      return 'composure';
    } else {
      logger.info('✅ Recommending Clarity mode: long meeting needs focus');
      return 'clarity';
    }
  }
  
  // Step 4: Calendar Density (back-to-backs detected → Composure)
  if (isBackToBack) {
    logger.info('✅ Recommending Composure mode: back-to-back meetings detected');
    return 'composure';
  }
  
  // Step 5: Time of Day + Fatigue Risk (late-day → Composure)
  if (timeOfDay === 'evening') {
    logger.info('✅ Recommending Composure mode: late-day fatigue risk');
    return 'composure';
  }
  
  // Step 6: Recurring Attendee Pattern Analysis
  // If same attendees appear frequently, check for past friction patterns
  if (recurringAttendees && recurringAttendees.length > 0) {
    try {
      // Check if there are past meetings with these attendees that had negative patterns
      // This would be detected from Level 2 audio analysis or post-meeting reflections
      // For now, we'll recommend Connection mode for recurring small groups
      if (attendeeCount <= 3) {
        logger.info('✅ Recommending Connection mode: recurring small group detected');
        return 'connection';
      }
    } catch (error) {
      logger.error('❌ Error analyzing recurring attendee patterns', { error });
    }
  }
  
  // Momentum keywords: unblock, action, follow-up, next steps
  if (
    titleLower.includes('unblock') ||
    titleLower.includes('action') ||
    titleLower.includes('follow-up') ||
    titleLower.includes('followup') ||
    titleLower.includes('next steps') ||
    titleLower.includes('progress')
  ) {
    logger.info('✅ Recommending Momentum mode based on title keywords');
    return 'momentum';
  }
  
  // Step 7: Look at user's past prep mode choices (historical patterns)
  try {
    const pastSessions = await prisma.focusSession.findMany({
      where: {
        userId,
        breathingFlowType: {
          startsWith: 'prep-', // Only get sessions with prep modes
        },
      },
      include: {
        meeting: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10, // Last 10 sessions
    });
    
    if (pastSessions.length > 0) {
      // Count frequency of each mode
      const modeFrequency: Record<PrepMode, number> = {
        clarity: 0,
        confidence: 0,
        connection: 0,
        composure: 0,
        momentum: 0,
      };
      
      pastSessions.forEach(session => {
        const mode = session.breathingFlowType?.replace('prep-', '') as PrepMode;
        if (mode && mode in modeFrequency) {
          modeFrequency[mode]++;
        }
      });
      
      // Find most used mode
      const mostUsedMode = Object.entries(modeFrequency)
        .sort(([, a], [, b]) => b - a)[0][0] as PrepMode;
      
      if (modeFrequency[mostUsedMode] > 0) {
        logger.info('✅ Recommending based on user history', { mostUsedMode, frequency: modeFrequency });
        return mostUsedMode;
      }
    }
  } catch (error) {
    logger.error('❌ Error analyzing past prep modes', { error });
  }
  
  // Step 8: Time of day defaults (final fallback)
  // Morning: Clarity (fresh mind, planning)
  // Afternoon: Momentum (push things forward)
  // Evening: Already handled above in fatigue risk
  if (timeOfDay === 'morning') {
    logger.info('✅ Recommending Clarity mode: morning default (fresh mind)');
    return 'clarity';
  }
  
  if (timeOfDay === 'afternoon') {
    logger.info('✅ Recommending Momentum mode: afternoon default (push forward)');
    return 'momentum';
  }
  
  // Ultimate fallback: Clarity (most universal)
  logger.info('✅ Recommending Clarity mode: universal fallback');
  return 'clarity';
}

/**
 * 📊 RECOMMENDATION REASON GENERATOR
 * 
 * Provides human-readable explanation for why a mode was recommended.
 * This helps users understand the AI's reasoning and builds trust.
 */

/**
 * Get explanation for why a mode was recommended
 */
export function getRecommendationReason(
  mode: PrepMode,
  context: RecommendationContext
): string {
  const { 
    meetingTitle, 
    attendeeCount, 
    timeOfDay, 
    meetingDuration,
    isBackToBack,
  } = context;
  const titleLower = meetingTitle.toLowerCase();
  
  switch (mode) {
    case 'clarity':
      if (meetingDuration && meetingDuration > 30 && timeOfDay !== 'evening') {
        return 'Long meetings need sustained focus — clarity keeps you on track';
      }
      if (titleLower.includes('decision') || titleLower.includes('strategy')) {
        return 'Decision-focused meetings benefit from clear priorities';
      }
      if (titleLower.includes('budget') || titleLower.includes('planning')) {
        return 'Planning sessions thrive when you know what matters most';
      }
      if (timeOfDay === 'morning') {
        return 'Morning meetings are great for clarity and planning';
      }
      return 'Helps you identify what matters most';
      
    case 'confidence':
      if (titleLower.includes('presentation') || titleLower.includes('pitch')) {
        return 'Presentations call for steady, confident presence';
      }
      if (titleLower.includes('interview')) {
        return 'Interviews need you at your most grounded and capable';
      }
      return 'Grounds you in your strength and capability';
      
    case 'connection':
      if (attendeeCount === 2) {
        return 'Small meetings thrive on human connection';
      }
      if (titleLower.includes('1:1') || titleLower.includes('feedback')) {
        return '1:1s are about relationship first, task second';
      }
      if (titleLower.includes('hr') || titleLower.includes('coaching')) {
        return 'People-focused conversations need empathy and presence';
      }
      return 'Helps you see the human first';
      
    case 'composure':
      if (isBackToBack) {
        return 'Back-to-back meetings drain energy — protect yours';
      }
      if (meetingDuration && meetingDuration > 30 && timeOfDay === 'evening') {
        return 'Long evening meetings need energy protection';
      }
      if (titleLower.includes('board') || titleLower.includes('investor')) {
        return 'High-stakes meetings require calm, steady presence';
      }
      if (titleLower.includes('difficult') || titleLower.includes('conflict')) {
        return 'Challenging conversations need emotional grounding';
      }
      if (timeOfDay === 'evening') {
        return 'Evening meetings need energy protection';
      }
      return 'Protects your energy and sets boundaries';
      
    case 'momentum':
      if (titleLower.includes('standup') || titleLower.includes('status')) {
        return 'Status meetings need forward motion, not stagnation';
      }
      if (titleLower.includes('unblock') || titleLower.includes('action')) {
        return 'Action-oriented meetings need forward momentum';
      }
      if (timeOfDay === 'afternoon') {
        return 'Afternoon is perfect for pushing things forward';
      }
      return 'Focuses on moving the story forward';
      
    default:
      return 'A balanced approach for this meeting';
  }
}

