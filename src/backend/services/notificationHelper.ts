/**
 * Notification Helper Service
 * 
 * Bridges simplified notification preferences with legacy DeliverySettings
 * Converts new 3-category system to granular channel-specific flags
 */

import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface SimplifiedNotificationPrefs {
  primaryChannel: 'email' | 'push';
  secondaryChannels: string[]; // ['slack', 'sms'] or []
  meetingMoments: boolean;
  dailyRhythm: boolean;
  wellness: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ChannelFlags {
  email: boolean;
  push: boolean;
  slack: boolean;
  sms: boolean;
}

/**
 * Get simplified notification preferences for a user
 */
export async function getSimplifiedNotificationPrefs(userId: string): Promise<SimplifiedNotificationPrefs | null> {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) return null;

    const secondaryChannels = prefs.notificationSecondaryChannels
      ? prefs.notificationSecondaryChannels.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    return {
      primaryChannel: (prefs.notificationPrimaryChannel as 'email' | 'push') || 'push',
      secondaryChannels,
      meetingMoments: prefs.notificationsMeetingMoments ?? true,
      dailyRhythm: prefs.notificationsDailyRhythm ?? true,
      wellness: prefs.notificationsWellness ?? true,
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
    };
  } catch (error) {
    logger.error('Error getting simplified notification prefs', { userId, error });
    return null;
  }
}

/**
 * Check if a notification category is enabled for a specific channel
 */
export function isNotificationEnabled(
  prefs: SimplifiedNotificationPrefs,
  category: 'meetingMoments' | 'dailyRhythm' | 'wellness',
  channel: 'email' | 'push' | 'slack' | 'sms'
): boolean {
  // Check if category is enabled
  if (category === 'meetingMoments' && !prefs.meetingMoments) return false;
  if (category === 'dailyRhythm' && !prefs.dailyRhythm) return false;
  if (category === 'wellness' && !prefs.wellness) return false;

  // Check if channel is enabled
  if (channel === prefs.primaryChannel) return true;
  if (prefs.secondaryChannels.includes(channel)) return true;

  return false;
}

/**
 * Check if we're in quiet hours
 */
export function isQuietHours(prefs: SimplifiedNotificationPrefs): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 21:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  
  return currentTime >= start && currentTime <= end;
}

/**
 * Convert simplified prefs to legacy DeliverySettings format for backward compatibility
 * This allows existing scheduler code to work with new simplified system
 */
export function toLegacyDeliverySettings(
  prefs: SimplifiedNotificationPrefs,
  legacyDelivery?: any
): any {
  const channels: ChannelFlags = {
    email: prefs.primaryChannel === 'email' || prefs.secondaryChannels.includes('email'),
    push: prefs.primaryChannel === 'push' || prefs.secondaryChannels.includes('push'),
    slack: prefs.secondaryChannels.includes('slack'),
    sms: prefs.secondaryChannels.includes('sms'),
  };

  // Map categories to legacy granular flags
  return {
    emailEnabled: channels.email,
    pushEnabled: channels.push,
    slackEnabled: channels.slack,
    smsEnabled: channels.sms,

    // Meeting Moments (pre/during/post)
    emailPreMeetingCues: channels.email && prefs.meetingMoments,
    emailInMeetingCues: false, // In-meeting cues are now only via Cue Companion (Level 2)
    emailPostMeetingCues: channels.email && prefs.meetingMoments,
    
    pushPreMeetingCues: channels.push && prefs.meetingMoments,
    pushInMeetingCues: false, // In-meeting cues are now only via Cue Companion
    pushPostMeetingCues: channels.push && prefs.meetingMoments,
    
    slackPreMeetingCues: channels.slack && prefs.meetingMoments,
    slackInMeetingCues: false,
    slackPostMeetingCues: channels.slack && prefs.meetingMoments,
    
    smsPreMeetingCues: channels.sms && prefs.meetingMoments,
    smsInMeetingCues: false,
    smsPostMeetingCues: false, // SMS post-meeting is usually too intrusive

    // Daily Rhythm (Presley Flow, Morning Recap, Daily Wrap-Up, Winding Down)
    emailPresleyFlow: channels.email && prefs.dailyRhythm,
    emailMorningRecap: channels.email && prefs.dailyRhythm,
    emailDailyWrapUp: channels.email && prefs.dailyRhythm,
    emailWindingDown: channels.email && prefs.dailyRhythm,
    
    pushPresleyFlow: channels.push && prefs.dailyRhythm,
    pushMorningRecap: channels.push && prefs.dailyRhythm,
    pushDailyWrapUp: channels.push && prefs.dailyRhythm,
    pushWindingDown: channels.push && prefs.dailyRhythm,
    
    slackPresleyFlow: channels.slack && prefs.dailyRhythm,
    slackMorningRecap: channels.slack && prefs.dailyRhythm,
    slackDailyWrapUp: channels.slack && prefs.dailyRhythm,
    slackWindingDown: channels.slack && prefs.dailyRhythm,
    
    smsPresleyFlow: channels.sms && prefs.dailyRhythm,
    smsMorningRecap: channels.sms && prefs.dailyRhythm,
    smsDailyWrapUp: channels.sms && prefs.dailyRhythm,
    smsWindingDown: false, // Winding down via SMS is too intrusive

    // Wellness & Insights
    emailWellnessReminders: channels.email && prefs.wellness,
    emailMeetingInsights: channels.email && prefs.wellness,
    
    pushWellnessReminders: channels.push && prefs.wellness,
    pushMeetingInsights: channels.push && prefs.wellness,
    
    slackWellnessReminders: channels.slack && prefs.wellness,
    slackMeetingInsights: channels.slack && prefs.wellness,
    
    smsWellnessReminders: channels.sms && prefs.wellness,
    smsMeetingInsights: false, // Meeting insights via SMS is too intrusive

    // Preserve legacy fields if they exist
    phoneNumber: legacyDelivery?.phoneNumber,
    slackWebhookUrl: legacyDelivery?.slackWebhookUrl,
    slackAccessToken: legacyDelivery?.slackAccessToken,
    slackTeamId: legacyDelivery?.slackTeamId,
    slackTeamName: legacyDelivery?.slackTeamName,
    slackChannelId: legacyDelivery?.slackChannelId,
    slackChannelName: legacyDelivery?.slackChannelName,
    slackUserId: legacyDelivery?.slackUserId,
  };
}

/**
 * Apply notification preset (minimal, balanced, full)
 */
export function applyNotificationPreset(preset: 'minimal' | 'balanced' | 'full'): Partial<SimplifiedNotificationPrefs> {
  switch (preset) {
    case 'minimal':
      return {
        primaryChannel: 'push',
        secondaryChannels: [],
        meetingMoments: true, // Only pre-meeting focus
        dailyRhythm: false,
        wellness: false,
      };
    
    case 'balanced':
      return {
        primaryChannel: 'push',
        secondaryChannels: [],
        meetingMoments: true,
        dailyRhythm: true,
        wellness: false, // Wellness is opt-in
      };
    
    case 'full':
      return {
        primaryChannel: 'push',
        secondaryChannels: [],
        meetingMoments: true,
        dailyRhythm: true,
        wellness: true,
      };
    
    default:
      return {};
  }
}

/**
 * Check if a notification should be sent based on category and channel
 * Returns the legacy delivery settings object for backward compatibility
 */
export async function shouldSendNotification(
  userId: string,
  category: 'meetingMoments' | 'dailyRhythm' | 'wellness',
  legacyDelivery?: any
): Promise<{ shouldSend: boolean; delivery: any }> {
  const simplifiedPrefs = await getSimplifiedNotificationPrefs(userId);
  
  // Check quiet hours
  if (simplifiedPrefs && isQuietHours(simplifiedPrefs)) {
    return { shouldSend: false, delivery: null };
  }

  // Convert to legacy format
  const delivery = simplifiedPrefs
    ? toLegacyDeliverySettings(simplifiedPrefs, legacyDelivery)
    : legacyDelivery;

  // Check if category is enabled
  if (simplifiedPrefs) {
    const primaryChannel = simplifiedPrefs.primaryChannel;
    const categoryEnabled = 
      (category === 'meetingMoments' && simplifiedPrefs.meetingMoments) ||
      (category === 'dailyRhythm' && simplifiedPrefs.dailyRhythm) ||
      (category === 'wellness' && simplifiedPrefs.wellness);

    if (!categoryEnabled) {
      return { shouldSend: false, delivery };
    }

    // Check if primary or secondary channels are enabled
    const hasEnabledChannel = 
      (primaryChannel === 'email' && delivery?.emailEnabled) ||
      (primaryChannel === 'push' && delivery?.pushEnabled) ||
      (simplifiedPrefs.secondaryChannels.includes('email') && delivery?.emailEnabled) ||
      (simplifiedPrefs.secondaryChannels.includes('push') && delivery?.pushEnabled) ||
      (simplifiedPrefs.secondaryChannels.includes('slack') && delivery?.slackEnabled) ||
      (simplifiedPrefs.secondaryChannels.includes('sms') && delivery?.smsEnabled);

    return { shouldSend: hasEnabledChannel, delivery };
  }

  // Fallback to legacy check
  const hasEnabledChannel = 
    delivery?.emailEnabled || 
    delivery?.pushEnabled || 
    delivery?.slackEnabled || 
    delivery?.smsEnabled;

  return { shouldSend: hasEnabledChannel, delivery };
}

