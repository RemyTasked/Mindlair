// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';


// Configure web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@meetcuteai.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  logger.info('Web Push configured with VAPID keys');
} else {
  logger.warn('VAPID keys not configured - push notifications will not work');
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: any;
}

class PushNotificationService {
  /**
   * Send a push notification to a specific user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length === 0) {
        logger.info('No push subscriptions found for user', { userId });
        return false;
      }

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/logo.png',
        badge: payload.badge || '/logo.png',
        url: payload.url,
        tag: payload.tag,
        data: payload.data,
      });

      let successCount = 0;
      const failedSubscriptions: string[] = [];

      // Send to all user's subscriptions (multiple devices/browsers)
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, notificationPayload);
          successCount++;
          
          logger.info('Push notification sent successfully', {
            userId,
            subscriptionId: subscription.id,
          });
        } catch (error: any) {
          logger.error('Failed to send push notification', {
            userId,
            subscriptionId: subscription.id,
            error: error.message,
          });

          // If subscription is invalid (410 Gone or 404), delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            failedSubscriptions.push(subscription.id);
          }
        }
      }

      // Clean up invalid subscriptions
      if (failedSubscriptions.length > 0) {
        await prisma.pushSubscription.deleteMany({
          where: {
            id: { in: failedSubscriptions },
          },
        });
        logger.info('Removed invalid push subscriptions', {
          count: failedSubscriptions.length,
        });
      }

      return successCount > 0;
    } catch (error: any) {
      logger.error('Error sending push notification to user', {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send pre-meeting cue notification
   */
  async sendPreMeetingCue(
    userId: string,
    meetingTitle: string,
    cueMessage: string,
    focusSceneUrl?: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: `Meeting in 10 minutes: ${meetingTitle}`,
      body: cueMessage,
      icon: '/logo.png',
      url: focusSceneUrl || '/dashboard',
      tag: 'pre-meeting-cue',
      data: {
        type: 'pre-meeting-cue',
        meetingTitle,
        focusSceneUrl,
      },
    });
  }

  /**
   * Send Presley Flow notification
   */
  async sendPresleyFlowNotification(
    userId: string,
    presleyFlowUrl: string,
    meetingCount: number,
    dateStr: string
  ): Promise<boolean> {
    const isEvening = new Date().getHours() >= 17;
    const title = isEvening
      ? '🌙 Evening Mental Rehearsal'
      : '☀️ Morning Meeting Prep';
    const body = isEvening
      ? `Reflect on today and prepare for tomorrow's ${meetingCount} meeting${meetingCount > 1 ? 's' : ''}`
      : `Get ready for today's ${meetingCount} meeting${meetingCount > 1 ? 's' : ''}`;

    return this.sendToUser(userId, {
      title,
      body,
      icon: '/logo.png',
      url: presleyFlowUrl,
      tag: 'presley-flow',
      data: {
        type: 'presley-flow',
        presleyFlowUrl,
        meetingCount,
        dateStr,
      },
    });
  }

  /**
   * Send morning recap notification
   */
  async sendMorningRecap(
    userId: string,
    recapMessage: string,
    firstMeetingTime: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '☀️ Good Morning - Your Day Ahead',
      body: `First meeting at ${firstMeetingTime}. ${recapMessage}`,
      icon: '/logo.png',
      url: '/dashboard',
      tag: 'morning-recap',
      data: {
        type: 'morning-recap',
        firstMeetingTime,
      },
    });
  }

  /**
   * Send daily wrap-up notification
   */
  async sendDailyWrapUp(
    userId: string,
    wrapUpMessage: string,
    stats: { totalMeetings: number; scenesCompleted: number }
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '🌙 Daily Wrap-Up',
      body: wrapUpMessage,
      icon: '/logo.png',
      url: '/dashboard',
      tag: 'daily-wrap-up',
      data: {
        type: 'daily-wrap-up',
        stats,
      },
    });
  }

  /**
   * Send post-meeting insight notification
   */
  async sendPostMeetingInsight(
    userId: string,
    meetingTitle: string,
    ratingUrl: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '💭 How did your meeting go?',
      body: `Share your thoughts on "${meetingTitle}"`,
      icon: '/logo.png',
      url: ratingUrl,
      tag: 'post-meeting-insight',
      data: {
        type: 'post-meeting-insight',
        meetingTitle,
        ratingUrl,
      },
    });
  }

  /**
   * Send wellness reminder notification
   */
  async sendWellnessReminder(
    userId: string,
    type: 'breathing' | 'walk' | 'mindful_moment' | 'sleep' | 'morning_energy',
    message: string
  ): Promise<boolean> {
    const titles = {
      breathing: '🫁 Time for a Breathing Break',
      walk: '🚶 Take a Quick Walk',
      mindful_moment: '🧘 Mindful Moment',
      sleep: '🌙 Time to Rest',
      morning_energy: '☀️ Good Morning',
    };

    return this.sendToUser(userId, {
      title: titles[type],
      body: message,
      icon: '/logo.png',
      url: '/dashboard',
      tag: 'wellness-reminder',
      data: {
        type: 'wellness-reminder',
        reminderType: type,
      },
    });
  }

  /**
   * Subscribe a user to push notifications
   */
  async subscribe(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Check if subscription already exists
      const existing = await prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint },
      });

      if (existing) {
        // Update if it belongs to a different user (user switched accounts)
        if (existing.userId !== userId) {
          await prisma.pushSubscription.update({
            where: { id: existing.id },
            data: {
              userId,
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
              userAgent,
            },
          });
        }
        logger.info('Push subscription already exists', { userId, endpoint: subscription.endpoint });
        return true;
      }

      // Create new subscription
      await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
        },
      });

      logger.info('Push subscription created', { userId });
      return true;
    } catch (error: any) {
      logger.error('Error subscribing to push notifications', {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(endpoint: string): Promise<boolean> {
    try {
      await prisma.pushSubscription.delete({
        where: { endpoint },
      });
      logger.info('Push subscription removed', { endpoint });
      return true;
    } catch (error: any) {
      logger.error('Error unsubscribing from push notifications', {
        endpoint,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Send winding down notification
   */
  async sendWindingDownNotification(
    userId: string,
    windingDownUrl: string
  ): Promise<boolean> {
    return this.sendToUser(userId, {
      title: '🌙 Time to Wind Down',
      body: 'Your evening ritual awaits. Take a few minutes for deep breathing and relaxation.',
      icon: '/logo.png',
      url: windingDownUrl,
      tag: 'winding-down',
      data: {
        type: 'winding-down',
        windingDownUrl,
      },
    });
  }

  /**
   * Get VAPID public key for frontend
   */
  getPublicKey(): string {
    return vapidPublicKey;
  }
}

export const pushNotificationService = new PushNotificationService();

