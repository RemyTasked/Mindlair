import OpenAI from 'openai';
import { logger } from '../../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MeetingContext {
  title: string;
  description?: string;
  attendees: string[];
  duration: number; // in minutes
  isBackToBack: boolean;
  meetingType?: string;
}

export type ToneType = 'executive' | 'cinematic' | 'balanced' | 'calm';

const TONE_GUIDELINES = {
  executive: `Professional, authoritative, strategic. Use business terminology. 
    Example: "Strategic session ahead. Lead with clarity and decisive intent."`,
  
  cinematic: `Dramatic, visual, scene-based. Use film/theater metaphors.
    Example: "Scene opens: The room settles. All eyes turn to you. Command the moment."`,
  
  balanced: `Professional yet warm. Balance confidence with approachability.
    Example: "You're on in 5. Step in prepared, present, and ready to engage."`,
  
  calm: `Gentle, mindful, centered. Focus on breath and presence.
    Example: "Five minutes to center yourself. Breathe deeply. You're ready."`,
};

export class PromptGenerator {
  async generatePreMeetingCue(
    context: MeetingContext,
    tone: ToneType = 'balanced'
  ): Promise<string> {
    try {
      const toneGuideline = TONE_GUIDELINES[tone];
      
      const prompt = `You are an AI assistant for "Meet Cute," a pre-meeting preparation tool that helps professionals mentally prepare before meetings.

Generate a short, personalized pre-meeting message (2-3 sentences max) with the following context:

Meeting Title: ${context.title}
${context.description ? `Description: ${context.description}` : ''}
Attendees: ${context.attendees.length} people
Duration: ${context.duration} minutes
${context.isBackToBack ? 'Note: This is a back-to-back meeting' : ''}
${context.meetingType ? `Type: ${context.meetingType}` : ''}

Tone: ${tone}
${toneGuideline}

The message should:
1. Be brief and impactful (2-3 sentences)
2. Help the person mentally prepare and focus
3. Match the ${tone} tone perfectly
4. Reference the meeting context appropriately
5. End with confidence and readiness

Generate the message now:`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional focus coach who helps people prepare for meetings with brief, inspiring messages.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      const generatedMessage = response.choices[0]?.message?.content?.trim();

      if (!generatedMessage) {
        throw new Error('Failed to generate message from AI');
      }

      logger.info('Generated pre-meeting cue', {
        meetingTitle: context.title,
        tone,
      });

      return generatedMessage;
    } catch (error) {
      logger.error('Error generating pre-meeting cue', { error });
      // Fallback to template-based message
      return this.getFallbackMessage(context, tone);
    }
  }

  async generateDailyWrapUp(data: {
    totalMeetings: number;
    scenesCompleted: number;
    focusSessionsOpened: number;
    nextMeetingTime?: Date;
    insights?: string[];
  }): Promise<string> {
    try {
      const prompt = `Generate a brief daily wrap-up message for a user of Meet Cute.

Today's Stats:
- Total meetings: ${data.totalMeetings}
- Scene Preps completed: ${data.scenesCompleted}
- Focus Sessions opened: ${data.focusSessionsOpened}
${data.nextMeetingTime ? `- Tomorrow's first meeting: ${data.nextMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
${data.insights && data.insights.length > 0 ? `\nInsights: ${data.insights.join(', ')}` : ''}

Create a warm, encouraging wrap-up message (2-3 sentences) that:
1. Acknowledges their preparation efforts
2. Provides a gentle reflection
3. Previews tomorrow if applicable
4. Maintains a cinematic-professional tone

Generate the message now:`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a supportive coach providing end-of-day reflections.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const message = response.choices[0]?.message?.content?.trim();

      if (!message) {
        throw new Error('Failed to generate wrap-up message');
      }

      return message;
    } catch (error) {
      logger.error('Error generating daily wrap-up', { error });
      // Fallback message
      return `You completed ${data.scenesCompleted} Scene Preps today. ${
        data.nextMeetingTime
          ? `Tomorrow's first scene starts at ${data.nextMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`
          : 'Rest well.'
      }`;
    }
  }

  private getFallbackMessage(context: MeetingContext, tone: ToneType): string {
    const templates = {
      executive: `Strategic session: ${context.title}. Lead with clarity and decisive action.`,
      cinematic: `Scene opens in 5 minutes. ${context.title} — Your moment to shine.`,
      balanced: `You're on in 5: ${context.title}. Step in prepared and present.`,
      calm: `Five minutes to ${context.title}. Breathe. Center yourself. You're ready.`,
    };

    return templates[tone];
  }

  async inferMeetingType(title: string, attendees: string[]): Promise<string> {
    const attendeeCount = attendees.length;
    const lowerTitle = title.toLowerCase();

    // Simple rule-based inference
    if (attendeeCount === 1 || lowerTitle.includes('1:1') || lowerTitle.includes('one-on-one')) {
      return 'one-on-one';
    }

    if (lowerTitle.includes('standup') || lowerTitle.includes('daily')) {
      return 'standup';
    }

    if (lowerTitle.includes('interview') || lowerTitle.includes('screening')) {
      return 'interview';
    }

    if (lowerTitle.includes('review') || lowerTitle.includes('retro')) {
      return 'review';
    }

    if (lowerTitle.includes('client') || lowerTitle.includes('customer')) {
      return 'client';
    }

    if (attendeeCount > 5) {
      return 'team';
    }

    return 'general';
  }
}

export const promptGenerator = new PromptGenerator();

