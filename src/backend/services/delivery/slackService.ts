import { logger } from '../../utils/logger';

export class SlackService {
  async sendPreMeetingCue(
    webhookUrl: string,
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string
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

      logger.info('Pre-meeting cue sent to Slack', { meetingTitle });
      return true;
    } catch (error: any) {
      logger.error('Error sending Slack message', {
        error: error.message,
      });
      return false;
    }
  }

  async sendDailyWrapUp(
    webhookUrl: string,
    wrapUpMessage: string,
    stats: {
      totalMeetings: number;
      scenesCompleted: number;
      focusSessionsOpened: number;
    }
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

      logger.info('Daily wrap-up sent to Slack');
      return true;
    } catch (error: any) {
      logger.error('Error sending Slack daily wrap-up', {
        error: error.message,
      });
      return false;
    }
  }
}

export const slackService = new SlackService();

