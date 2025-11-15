import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

type PrepMode = 'clarity' | 'confidence' | 'connection' | 'composure' | 'momentum';

interface RecommendationContext {
  meetingTitle: string;
  attendeeCount: number;
  userId: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
}

/**
 * Recommends a prep mode based on meeting context and user patterns
 * 
 * Logic:
 * 1. Check user's default mode for this meeting type (if set)
 * 2. Analyze meeting title for keywords
 * 3. Consider attendee count
 * 4. Look at user's past prep mode choices for similar meetings
 * 5. Consider time of day patterns
 */
export async function recommendPrepMode(context: RecommendationContext): Promise<PrepMode> {
  const { meetingTitle, attendeeCount, userId, timeOfDay, dayOfWeek } = context;
  
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
  
  // Clarity keywords: decision, strategy, planning, roadmap, alignment, review
  if (
    titleLower.includes('decision') ||
    titleLower.includes('strategy') ||
    titleLower.includes('planning') ||
    titleLower.includes('roadmap') ||
    titleLower.includes('alignment') ||
    titleLower.includes('review') ||
    titleLower.includes('standup') ||
    titleLower.includes('sync')
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
  
  // Connection keywords: 1:1, one-on-one, feedback, coaching, check-in
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
    attendeeCount === 2 // Small meetings are often 1:1s
  ) {
    logger.info('✅ Recommending Connection mode based on title keywords or attendee count');
    return 'connection';
  }
  
  // Composure keywords: difficult, conflict, performance, urgent, crisis
  if (
    titleLower.includes('difficult') ||
    titleLower.includes('conflict') ||
    titleLower.includes('performance') ||
    titleLower.includes('urgent') ||
    titleLower.includes('crisis') ||
    titleLower.includes('escalation')
  ) {
    logger.info('✅ Recommending Composure mode based on title keywords');
    return 'composure';
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
  
  // Step 3: Look at user's past prep mode choices
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
  
  // Step 4: Time of day defaults
  // Morning: Clarity (fresh mind, planning)
  // Afternoon: Momentum (push things forward)
  // Evening: Composure (maintain energy)
  if (timeOfDay === 'morning') {
    logger.info('✅ Recommending Clarity mode based on time of day (morning)');
    return 'clarity';
  }
  
  if (timeOfDay === 'afternoon') {
    logger.info('✅ Recommending Momentum mode based on time of day (afternoon)');
    return 'momentum';
  }
  
  if (timeOfDay === 'evening') {
    logger.info('✅ Recommending Composure mode based on time of day (evening)');
    return 'composure';
  }
  
  // Default fallback: Clarity (most universal)
  logger.info('✅ Recommending Clarity mode as default fallback');
  return 'clarity';
}

/**
 * Get explanation for why a mode was recommended
 */
export function getRecommendationReason(
  mode: PrepMode,
  context: RecommendationContext
): string {
  const { meetingTitle, attendeeCount, timeOfDay } = context;
  const titleLower = meetingTitle.toLowerCase();
  
  switch (mode) {
    case 'clarity':
      if (titleLower.includes('decision') || titleLower.includes('strategy')) {
        return 'Decision-focused meetings benefit from clear priorities';
      }
      if (timeOfDay === 'morning') {
        return 'Morning meetings are great for clarity and planning';
      }
      return 'Helps you identify what matters most';
      
    case 'confidence':
      if (titleLower.includes('presentation') || titleLower.includes('pitch')) {
        return 'Presentations call for steady, confident presence';
      }
      return 'Grounds you in your strength and capability';
      
    case 'connection':
      if (attendeeCount === 2) {
        return 'Small meetings thrive on human connection';
      }
      if (titleLower.includes('1:1') || titleLower.includes('feedback')) {
        return '1:1s are about relationship first, task second';
      }
      return 'Helps you see the human first';
      
    case 'composure':
      if (titleLower.includes('difficult') || titleLower.includes('conflict')) {
        return 'Challenging conversations need emotional grounding';
      }
      if (timeOfDay === 'evening') {
        return 'Evening meetings need energy protection';
      }
      return 'Protects your energy and sets boundaries';
      
    case 'momentum':
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

