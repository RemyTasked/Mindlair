import { logger } from '../../utils/logger';
import { aiService } from './aiService';
import { MindStatePattern, getTomorrowMindStateInsights } from './mindStateAnalyzer';

export interface MeetingContext {
  title: string;
  description?: string;
  attendees: string[];
  duration: number; // in minutes
  isBackToBack: boolean;
  meetingType?: string;
  isOrganizer?: boolean; // Is the user hosting/organizing this meeting?
}

export interface HistoricalInsight {
  meetingType: string;
  rating: number;
  feedback?: string;
  wasBackToBack: boolean;
  focusSceneUsed: boolean;
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
    tone: ToneType = 'balanced',
    historicalInsights?: HistoricalInsight[],
    mindStatePatterns?: MindStatePattern
  ): Promise<string> {
    try {
      const toneGuideline = TONE_GUIDELINES[tone];
      
      // Build historical context if available
      let historicalContext = '';
      if (historicalInsights && historicalInsights.length > 0) {
        const avgRating = historicalInsights.reduce((sum, i) => sum + i.rating, 0) / historicalInsights.length;
        const highRatedMeetings = historicalInsights.filter(i => i.rating >= 4);
        const lowRatedMeetings = historicalInsights.filter(i => i.rating <= 2);
        
        historicalContext = `\n\nHISTORICAL PERFORMANCE INSIGHTS:
Average recent rating: ${avgRating.toFixed(1)}/5 stars
Recent meetings: ${historicalInsights.length} rated

${highRatedMeetings.length > 0 ? `SUCCESS PATTERNS (${highRatedMeetings.length} meetings rated 4-5 stars):
${highRatedMeetings.map(m => `- ${m.meetingType}: ${m.feedback || 'Went well'}${m.focusSceneUsed ? ' (Used Focus Scene)' : ''}`).slice(0, 2).join('\n')}` : ''}

${lowRatedMeetings.length > 0 ? `\nAREAS TO IMPROVE (${lowRatedMeetings.length} meetings rated 1-2 stars):
${lowRatedMeetings.map(m => `- ${m.meetingType}: ${m.feedback || 'Challenging'}${m.wasBackToBack ? ' (Was back-to-back)' : ''}`).slice(0, 2).join('\n')}` : ''}

Use these insights to craft a message that:
- Builds on what has worked well for this user
- Addresses any patterns from lower-rated meetings
- Provides specific, actionable focus points based on their history`;
      }

      // Build mind state pattern context if available
      let mindStateContext = '';
      if (mindStatePatterns && mindStatePatterns.mostCommonState !== 'unknown') {
        const stressLevel = mindStatePatterns.stressFrequency > 50 ? 'high' : 
                           mindStatePatterns.stressFrequency > 30 ? 'moderate' : 'low';
        
        mindStateContext = `\n\nMIND STATE PATTERNS:
Stress frequency: ${Math.round(mindStatePatterns.stressFrequency)}% of meetings (${stressLevel})
Recent trend: ${mindStatePatterns.recentTrend}
${mindStatePatterns.stressfulDaysOfWeek.length > 0 ? `Typically stressed on: ${mindStatePatterns.stressfulDaysOfWeek.join(', ')}` : ''}
${mindStatePatterns.stressfulMeetingTypes.length > 0 ? `\nStressful meeting types: ${mindStatePatterns.stressfulMeetingTypes.map(mt => `${mt.type} (${Math.round(mt.stressRate)}%)`).join(', ')}` : ''}

IMPORTANT: Use this data to provide MORE GROUNDED, PRACTICAL support:
- If stress is high, focus on concrete calming techniques (not just "stay calm")
- If this meeting type/day typically causes stress, acknowledge it and provide specific prep strategies
- If trend is worsening, be extra supportive and suggest buffer time or breaks
- Match the energy level to their needs: stressed users need grounding, not hype`;
      }
      
      const roleContext = context.isOrganizer 
        ? 'USER ROLE: Meeting Organizer/Host - They are leading this meeting'
        : 'USER ROLE: Meeting Participant/Attendee - They are joining this meeting';

      const prompt = `You are an AI assistant for "Meet Cute," a pre-meeting preparation tool that helps professionals mentally prepare before meetings.

Generate a short, personalized pre-meeting message (2-3 sentences max) with the following context:

Meeting Title: ${context.title}
${context.description ? `Description: ${context.description}` : ''}
Attendees: ${context.attendees.length} people
Duration: ${context.duration} minutes
${context.isBackToBack ? 'Note: This is a back-to-back meeting' : ''}
${context.meetingType ? `Type: ${context.meetingType}` : ''}
${roleContext}

Tone: ${tone}
${toneGuideline}${historicalContext}${mindStateContext}

The message should:
1. Be brief and impactful (2-3 sentences)
2. Help the person mentally prepare and focus
3. Match the ${tone} tone perfectly
4. Reference the meeting context appropriately
5. TAILOR TO THEIR ROLE:
   - If ORGANIZER: Focus on leadership, setting the agenda, facilitating, keeping things on track
   - If PARTICIPANT: Focus on engagement, contributing value, active listening, prepared questions
${historicalInsights && historicalInsights.length > 0 ? '5. Subtly incorporate learnings from their past performance without explicitly mentioning ratings\n6. End with confidence and readiness' : '5. End with confidence and readiness'}
${mindStateContext ? '7. Be GROUNDED and PRACTICAL based on their stress patterns - avoid generic motivation if they typically find this type of meeting stressful' : ''}

Generate the message now:`;

      const response = await aiService.generateCompletion({
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
        maxTokens: 150,
        // Don't specify model - let each provider use its default
      });

      const generatedMessage = response.content.trim();

      if (!generatedMessage) {
        throw new Error('Failed to generate message from AI');
      }
      
      logger.info('Pre-meeting cue generated', {
        provider: response.provider,
        model: response.model,
      });

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
    ratedMeetings?: Array<{
      title: string;
      rating: number;
      feedback?: string;
    }>;
  }): Promise<string> {
    try {
      // Build rating insights
      let ratingInsights = '';
      if (data.ratedMeetings && data.ratedMeetings.length > 0) {
        const avgRating = data.ratedMeetings.reduce((sum, m) => sum + m.rating, 0) / data.ratedMeetings.length;
        const highRated = data.ratedMeetings.filter(m => m.rating >= 4);
        const lowRated = data.ratedMeetings.filter(m => m.rating <= 2);
        
        ratingInsights = `\n\nPERFORMANCE INSIGHTS TODAY:
- Meetings rated: ${data.ratedMeetings.length}/${data.totalMeetings}
- Average rating: ${avgRating.toFixed(1)}/5 stars
${highRated.length > 0 ? `- ${highRated.length} meeting${highRated.length > 1 ? 's' : ''} went exceptionally well (4-5 stars)` : ''}
${lowRated.length > 0 ? `- ${lowRated.length} meeting${lowRated.length > 1 ? 's' : ''} had challenges (1-2 stars)` : ''}

Notable feedback:
${data.ratedMeetings.filter(m => m.feedback).slice(0, 2).map(m => `- "${m.feedback}" (${m.rating}⭐)`).join('\n') || 'No specific feedback yet'}`;
      }
      
      const prompt = `Generate a brief daily wrap-up message for a user of Meet Cute.

Today's Stats:
- Total meetings: ${data.totalMeetings}
- Scene Preps completed: ${data.scenesCompleted}
- Focus Sessions opened: ${data.focusSessionsOpened}
${data.nextMeetingTime ? `- Tomorrow's first meeting: ${data.nextMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
${data.insights && data.insights.length > 0 ? `\nInsights: ${data.insights.join(', ')}` : ''}${ratingInsights}

Create a warm, encouraging wrap-up message (3-4 sentences) that:
1. Acknowledges their preparation efforts
2. ${ratingInsights ? 'Celebrates successes or addresses challenges from their rated meetings' : 'Provides a gentle reflection'}
3. ${ratingInsights ? 'Offers specific, actionable insight for tomorrow based on today\'s performance' : 'Previews tomorrow if applicable'}
4. Maintains a cinematic-professional tone
5. Ends with encouragement

Generate the message now:`;

      const response = await aiService.generateCompletion({
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
        maxTokens: 200,
        // Don't specify model - let each provider use its default
      });

      const message = response.content.trim();

      if (!message) {
        throw new Error('Failed to generate wrap-up message');
      }
      
      logger.info('Daily wrap-up generated', {
        provider: response.provider,
        model: response.model,
      });

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

  async generatePresleyFlowSession(meetings: Array<{
    title: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    description?: string;
    meetingType?: string;
  }>, tone: ToneType = 'balanced', historicalInsights?: HistoricalInsight[], userId?: string, flowType: 'morning' | 'evening' = 'evening'): Promise<{
    openingScene: string;
    meetingPreviews: Array<{
      title: string;
      time: string;
      focusCue: string;
    }>;
    mindsetTheme: string;
    visualizationScript: string;
    closingMessage: string;
  }> {
    try {
      const meetingsSummary = meetings.map((m, i) => {
        // Format time - don't specify timezone, let it use server/UTC time
        // The Date object from DB is already in the correct timezone
        const timeStr = m.startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true
        });
        const duration = Math.round((m.endTime.getTime() - m.startTime.getTime()) / 60000);
        return `${i + 1}. ${m.title} - ${timeStr} (${duration} min, ${m.attendees.length} attendees)`;
      }).join('\n');

      let historicalContext = '';
      if (historicalInsights && historicalInsights.length > 0) {
        const avgRating = historicalInsights.reduce((sum, i) => sum + i.rating, 0) / historicalInsights.length;
        historicalContext = `\n\nUser's Historical Performance: ${avgRating.toFixed(1)}/5 average rating`;
      }

      // Get mind state insights for tomorrow
      let mindStateInsights = '';
      if (userId) {
        const insights = await getTomorrowMindStateInsights(userId);
        if (insights.length > 0) {
          mindStateInsights = `\n\nMIND STATE INSIGHTS FOR TOMORROW:
${insights.map(i => `- ${i}`).join('\n')}

IMPORTANT: Incorporate these insights naturally into your preparation script. If certain meetings or times are typically stressful, provide specific grounding strategies (not just "stay positive"). Be practical and supportive.`;
        }
      }

      // Different prompts for morning vs evening flows
      const dayReference = flowType === 'morning' ? 'TODAY' : 'TOMORROW';
      const timeContext = flowType === 'morning' 
        ? 'morning preparation for today\'s meetings' 
        : 'evening mental rehearsal for tomorrow\'s meetings';
      
      const openingGuidance = flowType === 'morning'
        ? '"Today\'s script is ready. You\'ll move through it with clarity and confidence."'
        : '"Tomorrow\'s script is ready. You\'ll move through it with grace."';
      
      const closingGuidance = flowType === 'morning'
        ? '"Your day is mapped out. Step into it with intention—you\'re ready."'
        : '"Tomorrow\'s script is ready. Rest easy—you\'re prepared."';
      
      const themeGuidance = flowType === 'morning'
        ? 'Identify the emotional/strategic theme of today - "Today\'s tone is collaborative and decisive" or "A day of focused execution"'
        : 'Identify the emotional/strategic theme of tomorrow - "Tomorrow\'s tone is collaborative and decisive" or "A day of focused execution"';
      
      const visualizationGuidance = flowType === 'morning'
        ? 'Have them picture moving through today\'s scenes with confidence and presence'
        : 'Have them picture moving through tomorrow\'s scenes smoothly, preparing mentally for each';

      const prompt = `You are creating a ${timeContext} - a "Presley Flow Session."

${dayReference}'S SCHEDULE:
${meetingsSummary}

User's Tone Preference: ${tone}${historicalContext}${mindStateInsights}

Create a cinematic, calming mental preparation experience with these components:

1. OPENING SCENE (2 sentences):
   - Set the tone: calm, cinematic, confident
   - ${openingGuidance}

2. MEETING PREVIEWS:
   For each meeting, provide a brief focus cue (1 sentence) that helps them mentally ${flowType === 'morning' ? 'prepare for' : 'rehearse'} their role:
   ${meetings.map((m, i) => `   ${i + 1}. ${m.title} - Focus cue for this scene`).join('\n')}

3. MINDSET THEME (2 sentences):
   - ${themeGuidance}

4. VISUALIZATION SCRIPT (3-4 sentences):
   - A 30-second guided mental imagery
   - ${visualizationGuidance}
   - Cinematic language: "camera follows your composure"

5. CLOSING MESSAGE (2 sentences):
   - Reassurance and confidence
   - ${closingGuidance}

CRITICAL: This is a ${flowType.toUpperCase()} flow for ${dayReference}'s meetings. Use "${dayReference.toLowerCase()}" language throughout, NOT "tomorrow" if it's morning or "today" if it's evening.

Match the ${tone} tone throughout. Make it feel like a director's cut of ${dayReference.toLowerCase()}.

Return as JSON:
{
  "openingScene": "...",
  "meetingPreviews": [{"title": "...", "time": "...", "focusCue": "..."}],
  "mindsetTheme": "...",
  "visualizationScript": "...",
  "closingMessage": "..."
}`;

      const systemMessage = flowType === 'morning'
        ? 'You are a cinematic preparation coach creating morning preparation sessions. Return valid JSON only.'
        : 'You are a cinematic preparation coach creating evening mental rehearsals. Return valid JSON only.';

      const response = await aiService.generateCompletion({
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 800,
        // Don't specify model - let each provider use its default
      });

      const content = response.content.trim();
      if (!content) {
        throw new Error('Failed to generate Presley Flow content');
      }
      
      logger.info('Presley Flow generated', {
        provider: response.provider,
        model: response.model,
      });

      const parsed = JSON.parse(content);
      
      // Ensure meeting previews match the input
      parsed.meetingPreviews = meetings.map((m, i) => ({
        title: m.title,
        time: m.startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true
        }),
        focusCue: parsed.meetingPreviews?.[i]?.focusCue || `Bring clarity and presence to this ${m.meetingType || 'meeting'}.`,
      }));

      logger.info('Generated Presley Flow session', { meetingCount: meetings.length });
      return parsed;
    } catch (error) {
      logger.error('Error generating Presley Flow', { error });
      // Fallback with correct day reference
      const dayRef = flowType === 'morning' ? 'Today' : 'Tomorrow';
      const dayRefLower = dayRef.toLowerCase();
      
      return {
        openingScene: `${dayRef}'s script is ready. You'll move through each scene with intention and ease.`,
        meetingPreviews: meetings.map(m => ({
          title: m.title,
          time: m.startTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
          }),
          focusCue: `Bring your full presence and clarity to this moment.`,
        })),
        mindsetTheme: `${dayRef} calls for focus and authentic connection. Trust your preparation.`,
        visualizationScript: `Picture yourself moving through ${dayRefLower}'s scenes. The camera follows your composure. Each meeting unfolds smoothly. You transition with ease, centered and clear.`,
        closingMessage: flowType === 'morning' 
          ? `${dayRef}'s script is ready. Step into it with confidence—you're prepared.`
          : `${dayRef}'s script is ready. Rest well—you're prepared for every scene.`,
      };
    }
  }

  async generateMorningRecap(
    firstMeetingTime?: Date, 
    presleyFlowCompleted: boolean = false,
    userId?: string
  ): Promise<string> {
    try {
      const timeStr = firstMeetingTime 
        ? firstMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'soon';

      // Get mind state insights
      let mindStateNote = '';
      if (userId) {
        const insights = await getTomorrowMindStateInsights(userId);
        if (insights.length > 0) {
          mindStateNote = `\n\nNote: ${insights[0]}`; // Include first insight only for brevity
        }
      }

      const prompt = `Generate a brief morning recap message (2 sentences max) for someone who ${presleyFlowCompleted ? 'completed their Presley Flow evening rehearsal' : 'has meetings today'}.

${firstMeetingTime ? `First meeting: ${timeStr}` : 'Schedule ahead'}${mindStateNote}

The message should:
1. Be brief and energizing
2. Reference that they prepared last night (if applicable)
3. Build confidence for the day
4. Use cinematic tone: "Your first scene opens at..."

Generate the message now:`;

      const response = await aiService.generateCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a supportive morning coach using cinematic language.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 100,
        // Don't specify model - let each provider use its default
      });

      const message = response.content.trim();
      if (!message) {
        throw new Error('Failed to generate morning recap');
      }
      
      logger.info('Morning recap generated', {
        provider: response.provider,
        model: response.model,
      });

      return message;
    } catch (error) {
      logger.error('Error generating morning recap', { error });
      return firstMeetingTime
        ? `Good morning. Your first scene opens at ${firstMeetingTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. You're ready.`
        : 'Good morning. Step into today with confidence.';
    }
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

