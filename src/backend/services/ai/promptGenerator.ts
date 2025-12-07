/**
 * Mind Garden - AI Prompt Generator
 * 
 * Simplified for Mind Garden - generates wellness content and insights
 */

import { logger } from '../../utils/logger';
import { aiService } from './aiService';

export type ToneType = 'calm' | 'energizing' | 'grounding' | 'uplifting';

/**
 * Generate a personalized wellness insight based on user's activity
 */
export async function generateWellnessInsight(data: {
  streak: number;
  totalFlows: number;
  recentActivities: string[];
  gardenState: string;
}): Promise<string> {
  try {
    const prompt = `Generate a brief, encouraging wellness message (1-2 sentences) for someone with:
- ${data.streak} day streak
- ${data.totalFlows} total flows completed
- Recent activities: ${data.recentActivities.slice(0, 3).join(', ') || 'starting out'}
- Garden state: ${data.gardenState}

Be warm, supportive, and nature-themed. Focus on growth and progress, not perfection.`;

    const response = await aiService.generateCompletion({
      messages: [
        { role: 'system', content: 'You are a gentle wellness coach. Keep responses brief and encouraging.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 100,
    });

    return response.content.trim();
  } catch (error) {
    logger.error('Error generating wellness insight', { error });
    return getDefaultInsight(data.gardenState);
  }
}

/**
 * Generate flow guidance text for a specific flow type
 */
export async function generateFlowGuidance(flowType: string, tone: ToneType = 'calm'): Promise<string> {
  try {
    const toneGuidelines: Record<ToneType, string> = {
      calm: 'Gentle and soothing, like a peaceful garden',
      energizing: 'Invigorating and positive, like morning sunlight',
      grounding: 'Steady and centered, like deep roots',
      uplifting: 'Light and hopeful, like spring blossoms',
    };

    const prompt = `Generate brief guidance text (2-3 sentences) for a ${flowType} mindfulness flow.
Tone: ${toneGuidelines[tone]}

Focus on breath, presence, and natural imagery.`;

    const response = await aiService.generateCompletion({
      messages: [
        { role: 'system', content: 'You are a mindfulness guide. Use nature metaphors and gentle language.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      maxTokens: 150,
    });

    return response.content.trim();
  } catch (error) {
    logger.error('Error generating flow guidance', { error });
    return 'Take a deep breath. Let your mind settle like still water. You are exactly where you need to be.';
  }
}

/**
 * Generate weekly summary based on activity data
 */
export async function generateWeeklySummary(data: {
  flowsCompleted: number;
  streak: number;
  favoriteFlow: string;
  plantsGrown: number;
  minutesSpent: number;
}): Promise<string> {
  try {
    const prompt = `Generate a warm weekly summary (2-3 sentences) for someone who:
- Completed ${data.flowsCompleted} wellness flows this week
- Has a ${data.streak} day streak
- Favorite activity: ${data.favoriteFlow}
- Grew ${data.plantsGrown} plants in their garden
- Spent ${data.minutesSpent} minutes on wellness

Celebrate their progress using garden/growth metaphors.`;

    const response = await aiService.generateCompletion({
      messages: [
        { role: 'system', content: 'You are a supportive wellness companion. Celebrate progress, no matter how small.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 150,
    });

    return response.content.trim();
  } catch (error) {
    logger.error('Error generating weekly summary', { error });
    return `This week you nurtured your mind with ${data.flowsCompleted} moments of calm. Your garden continues to grow!`;
  }
}

// Default insights for fallback
function getDefaultInsight(gardenState: string): string {
  const insights: Record<string, string> = {
    thriving: 'Your garden is flourishing! Each moment of mindfulness adds to its beauty.',
    growing: 'Beautiful growth happening here. Keep nurturing your practice.',
    stable: 'Your garden rests peacefully. It awaits whenever you\'re ready.',
    idle: 'Your garden misses you. Even a single breath can bring it back to life.',
    dormant: 'Welcome back to your garden. It\'s ready to grow again with you.',
  };
  return insights[gardenState] || insights.stable;
}

// Legacy export for backward compatibility (simplified)
export class PromptGenerator {
  async inferMeetingType(title: string, attendees: string[]): Promise<string> {
    const lowerTitle = title.toLowerCase();
    const attendeeCount = attendees.length;

    if (attendeeCount <= 2 || lowerTitle.includes('1:1') || lowerTitle.includes('one-on-one')) {
      return 'one-on-one';
    }
    if (lowerTitle.includes('standup') || lowerTitle.includes('daily')) {
      return 'standup';
    }
    if (lowerTitle.includes('review') || lowerTitle.includes('retro')) {
      return 'review';
    }
    if (attendeeCount > 5) {
      return 'team';
    }
    return 'general';
  }

  /**
   * Generate a simple pre-meeting focus cue (simplified - no AI)
   */
  async generatePreMeetingCue(
    context: { title: string; description?: string; attendees: string[]; duration: number; isBackToBack: boolean; meetingType?: string; isOrganizer?: boolean },
    _tone: string = 'balanced',
    _historicalInsights?: unknown[],
    _mindStatePatterns?: unknown
  ): Promise<string> {
    const lowerTitle = context.title.toLowerCase();
    
    // Simple targeted messages based on meeting type
    if (lowerTitle.includes('interview')) {
      return 'Be authentic and let your experience shine. Listen carefully and respond thoughtfully.';
    }
    if (lowerTitle.includes('present') || lowerTitle.includes('demo')) {
      return 'Take a breath. You know this material. Speak with confidence and engage your audience.';
    }
    if (lowerTitle.includes('1:1') || context.attendees.length === 1) {
      return 'Create space for genuine connection. Listen actively and be present.';
    }
    if (lowerTitle.includes('standup') || lowerTitle.includes('sync')) {
      return 'Keep it concise and action-focused. Share what matters most.';
    }
    if (context.isBackToBack) {
      return 'Take a moment to reset. Clear your mind and step in refreshed.';
    }
    if (context.isOrganizer) {
      return 'You\'re leading this one. Set clear intentions and guide with purpose.';
    }
    
    return 'Step in with presence and intention. You\'re prepared for this.';
  }

  /**
   * Generate daily wrap-up message (simplified - no AI)
   */
  async generateDailyWrapUp(data: {
    totalMeetings: number;
    scenesCompleted: number;
    focusSessionsOpened: number;
    nextMeetingTime?: Date;
    ratedMeetings?: unknown[];
  }): Promise<string> {
    if (data.totalMeetings === 0) {
      return 'A meeting-free day! Hopefully you used the time for deep work or self-care.';
    }
    
    if (data.scenesCompleted > 0) {
      return `You prepared for ${data.scenesCompleted} meetings today. Well done on taking time for yourself. Rest well tonight.`;
    }
    
    return `${data.totalMeetings} meetings are behind you. Take a moment to unwind and prepare for tomorrow.`;
  }

  /**
   * Generate morning recap message (simplified - no AI)
   */
  async generateMorningRecap(
    firstMeetingTime?: Date,
    _presleyFlowCompleted: boolean = false,
    _userId?: string
  ): Promise<string> {
    if (firstMeetingTime) {
      const timeStr = firstMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Good morning! Your first meeting is at ${timeStr}. Take a moment to center yourself before the day begins.`;
    }
    
    return 'Good morning! A clear calendar today - perfect for focused work or wellness time.';
  }
}

export const promptGenerator = new PromptGenerator();
