import sgMail from '@sendgrid/mail';
import { logger } from '../../utils/logger';

// Only set API key if provided and valid
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@meetcuteai.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'Meet Cute';
    this.isConfigured = !!(
      process.env.SENDGRID_API_KEY && 
      process.env.SENDGRID_API_KEY.startsWith('SG.')
    );
  }

  async sendPreMeetingCue(
    email: string,
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const html = this.generatePreMeetingHtml(
        meetingTitle,
        cueMessage,
        focusSceneUrl
      );

      await sgMail.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: `🎬 You're on in 5: ${meetingTitle}`,
        text: cueMessage + (focusSceneUrl ? `\n\nOpen Focus Scene: ${focusSceneUrl}` : ''),
        html,
      });

      logger.info('Pre-meeting cue email sent', { email, meetingTitle });
      return true;
    } catch (error: any) {
      logger.error('Error sending pre-meeting cue email', {
        error: error.message,
        email,
      });
      return false;
    }
  }

  async sendDailyWrapUp(
    email: string,
    wrapUpMessage: string,
    stats: {
      totalMeetings: number;
      scenesCompleted: number;
      focusSessionsOpened: number;
    }
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try{
      const html = this.generateDailyWrapUpHtml(wrapUpMessage, stats);

      await sgMail.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: '🌙 Daily Wrap-Up: Meet Cute',
        text: wrapUpMessage,
        html,
      });

      logger.info('Daily wrap-up email sent', { email });
      return true;
    } catch (error: any) {
      logger.error('Error sending daily wrap-up email', {
        error: error.message,
        email,
      });
      return false;
    }
  }

  async sendPostMeetingInsight(
    email: string,
    meetingTitle: string,
    meetingStartTime: Date,
    ratingUrl: string
  ): Promise<boolean> {
    if (!this.isConfigured) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const html = this.generatePostMeetingInsightHtml(
        meetingTitle,
        meetingStartTime,
        ratingUrl
      );

      await sgMail.send({
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: `✨ How did your meeting go? ${meetingTitle}`,
        text: `How was your meeting "${meetingTitle}"? Take a moment to reflect and rate your performance: ${ratingUrl}`,
        html,
      });

      logger.info('Post-meeting insight email sent', { email, meetingTitle });
      return true;
    } catch (error: any) {
      logger.error('Error sending post-meeting insight email', {
        error: error.message,
        email,
      });
      return false;
    }
  }

  private generatePreMeetingHtml(
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .meeting-title {
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 20px;
    }
    .cue-message {
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 You're on in 5</h1>
    </div>
    <div class="content">
      <div class="meeting-title">${meetingTitle}</div>
      <div class="cue-message">${cueMessage}</div>
      ${
        focusSceneUrl
          ? `
      <div style="text-align: center;">
        <a href="${focusSceneUrl}" class="cta-button">
          Enter Focus Scene →
        </a>
      </div>
      `
          : ''
      }
    </div>
    <div class="footer">
      Meet Cute · Cinematic-professional focus moments
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateDailyWrapUpHtml(
    wrapUpMessage: string,
    stats: {
      totalMeetings: number;
      scenesCompleted: number;
      focusSessionsOpened: number;
    }
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .message {
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      margin-bottom: 30px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 30px 0;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #3b82f6;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌙 Daily Wrap-Up</h1>
    </div>
    <div class="content">
      <div class="message">${wrapUpMessage}</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${stats.totalMeetings}</div>
          <div class="stat-label">Meetings</div>
        </div>
        <div class="stat">
          <div class="stat-number">${stats.scenesCompleted}</div>
          <div class="stat-label">Scene Preps</div>
        </div>
        <div class="stat">
          <div class="stat-number">${stats.focusSessionsOpened}</div>
          <div class="stat-label">Focus Sessions</div>
        </div>
      </div>
    </div>
    <div class="footer">
      Meet Cute · Rest well, prepare brilliantly
    </div>
  </div>
</body>
</html>
    `;
  }

  private generatePostMeetingInsightHtml(
    meetingTitle: string,
    meetingStartTime: Date,
    ratingUrl: string
  ): string {
    const timeAgo = this.getTimeAgo(meetingStartTime);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 40px 30px;
    }
    .meeting-info {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    .meeting-title {
      font-size: 18px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 5px;
    }
    .meeting-time {
      font-size: 14px;
      color: #78350f;
    }
    .question {
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      margin: 30px 0;
      color: #333;
    }
    .rating-buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin: 30px 0;
    }
    .star-rating {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 40px;
    }
    .star {
      font-size: 36px;
      line-height: 1;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    .benefits {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    .benefit {
      display: flex;
      align-items: start;
      margin-bottom: 12px;
    }
    .benefit-icon {
      margin-right: 12px;
      font-size: 20px;
    }
    .benefit-text {
      color: #475569;
      font-size: 14px;
    }
    .footer {
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ How did it go?</h1>
      <p>Take a moment to reflect on your meeting</p>
    </div>
    <div class="content">
      <div class="meeting-info">
        <div class="meeting-title">${meetingTitle}</div>
        <div class="meeting-time">Ended ${timeAgo}</div>
      </div>

      <div class="question">
        How would you rate your performance?
      </div>

      <div class="star-rating">
        <span class="star">⭐</span>
        <span class="star">⭐</span>
        <span class="star">⭐</span>
        <span class="star">⭐</span>
        <span class="star">⭐</span>
      </div>

      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${ratingUrl}" class="cta-button">
          Rate Your Meeting →
        </a>
      </div>

      <div class="benefits">
        <div class="benefit">
          <div class="benefit-icon">📊</div>
          <div class="benefit-text">
            <strong>Track your progress</strong> - See how you improve over time
          </div>
        </div>
        <div class="benefit">
          <div class="benefit-icon">💡</div>
          <div class="benefit-text">
            <strong>Get insights</strong> - Understand your meeting patterns
          </div>
        </div>
        <div class="benefit">
          <div class="benefit-icon">🎯</div>
          <div class="benefit-text">
            <strong>Improve performance</strong> - Learn what works best for you
          </div>
        </div>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        Takes less than 30 seconds
      </p>
    </div>
    <div class="footer">
      Meet Cute · Reflect, learn, and grow
    </div>
  </div>
</body>
</html>
    `;
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

export const emailService = new EmailService();

