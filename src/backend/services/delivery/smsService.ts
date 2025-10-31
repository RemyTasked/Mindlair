import twilio from 'twilio';
import { logger } from '../../utils/logger';

export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;

  constructor() {
    // Only initialize Twilio client if credentials are provided
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
    ) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  private isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== '';
  }

  async sendPreMeetingCue(
    phoneNumber: string,
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('SMS service not configured, skipping SMS send');
      return false;
    }

    try {
      let message = `🎬 You're on in 5\n\n${meetingTitle}\n\n${cueMessage}`;
      
      if (focusSceneUrl) {
        message += `\n\nFocus Scene: ${focusSceneUrl}`;
      }

      await this.client!.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber,
      });

      logger.info('Pre-meeting cue SMS sent', { phoneNumber, meetingTitle });
      return true;
    } catch (error: any) {
      logger.error('Error sending SMS', {
        error: error.message,
        phoneNumber,
      });
      return false;
    }
  }

  async sendDailyWrapUp(
    phoneNumber: string,
    wrapUpMessage: string
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('SMS service not configured, skipping SMS send');
      return false;
    }

    try {
      await this.client!.messages.create({
        body: `🌙 Daily Wrap-Up\n\n${wrapUpMessage}`,
        from: this.fromNumber,
        to: phoneNumber,
      });

      logger.info('Daily wrap-up SMS sent', { phoneNumber });
      return true;
    } catch (error: any) {
      logger.error('Error sending daily wrap-up SMS', {
        error: error.message,
        phoneNumber,
      });
      return false;
    }
  }
}

export const smsService = new SMSService();

