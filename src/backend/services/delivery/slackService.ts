import { logger } from '../../utils/logger';

export class SlackService {
  /**
   * Send message using OAuth token (preferred) or webhook URL (legacy)
   */
  private async sendSlackMessage(
    accessToken: string | null,
    channelId: string | null,
    webhookUrl: string | null,
    blocks: any[]
  ): Promise<boolean> {
    try {
      // Prefer OAuth token over webhook
      if (accessToken && channelId) {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            channel: channelId,
            blocks,
          }),
        });

        const data = await response.json();
        
        if (!data.ok) {
          throw new Error(`Slack API error: ${data.error}`);
        }
        
        return true;
      }
      
      // Fallback to webhook
      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ blocks }),
        });

        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`);
        }
        
        return true;
      }
      
      throw new Error('No Slack credentials available');
    } catch (error: any) {
      logger.error('Error sending Slack message', { error: error.message });
      return false;
    }
  }

  async sendPreMeetingCue(
    webhookUrl: string | null,
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string,
    accessToken?: string | null,
    channelId?: string | null
  ): Promise<boolean> {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎬 You\'re on in 5',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${meetingTitle}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: cueMessage,
          },
        },
      ];

      if (focusSceneUrl) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Enter Focus Scene →',
                emoji: true,
              },
              url: focusSceneUrl,
              style: 'primary',
            },
          ],
        } as any);
      }

      const success = await this.sendSlackMessage(
        accessToken || null,
        channelId || null,
        webhookUrl,
        blocks
      );

      if (success) {
        logger.info('Pre-meeting cue sent to Slack', { meetingTitle });
      }
      
      return success;
    } catch (error: any) {
      logger.error('Error sending pre-meeting cue to Slack', {
        error: error.message,
      });
      return false;
    }
  }

  async sendDailyWrapUp(
    webhookUrl: string | null,
    wrapUpMessage: string,
    stats: {
      totalMeetings: number;
      scenesCompleted: number;
      focusSessionsOpened: number;
    },
    accessToken?: string | null,
    channelId?: string | null
  ): Promise<boolean> {
    try {
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🌙 Daily Wrap-Up',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: wrapUpMessage,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*${stats.totalMeetings}*\nMeetings`,
            },
            {
              type: 'mrkdwn',
              text: `*${stats.scenesCompleted}*\nScene Preps`,
            },
            {
              type: 'mrkdwn',
              text: `*${stats.focusSessionsOpened}*\nFocus Sessions`,
            },
          ],
        },
      ];

      const success = await this.sendSlackMessage(
        accessToken || null,
        channelId || null,
        webhookUrl,
        blocks
      );

      if (success) {
        logger.info('Daily wrap-up sent to Slack');
      }
      
      return success;
    } catch (error: any) {
      logger.error('Error sending Slack daily wrap-up', {
        error: error.message,
      });
      return false;
    }
  }
}

export const slackService = new SlackService();

