import cron from 'node-cron';
import moment from 'moment-timezone';
import { prisma } from '../utils/prisma';
import { googleCalendarService } from './calendar/googleCalendar';
import { outlookCalendarService } from './calendar/outlookCalendar';
import { promptGenerator } from './ai/promptGenerator';
import { emailService } from './delivery/emailService';
import { slackService } from './delivery/slackService';
import { smsService } from './delivery/smsService';
import { pushNotificationService } from './delivery/pushNotificationService';
import { logger } from '../utils/logger';
import { analyzeMindStatePatterns } from './ai/mindStateAnalyzer';

/**
 * Get the current hour in the user's timezone
 */
function getUserCurrentHour(userTimezone: string): number {
  return moment().tz(userTimezone).hour();
}

/**
 * Get the current day of week in the user's timezone (0 = Sunday, 6 = Saturday)
 */
function getUserDayOfWeek(userTimezone: string): number {
  return moment().tz(userTimezone).day();
}

export function startScheduler() {
  // Check for upcoming meetings every minute
  cron.schedule('* * * * *', async () => {
    await checkUpcomingMeetings();
  });

  // Send daily wrap-ups every hour (check user's evening flow time)
  cron.schedule('0 * * * *', async () => {
    await sendDailyWrapUps();
  });

  // Check for post-meeting insights every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await sendPostMeetingInsights();
  });

  // Send Presley Flow sessions every hour (users can configure their time)
  cron.schedule('0 * * * *', async () => {
    await sendPresleyFlowSessions();
  });

  // Send morning recaps at 7 AM every day
  cron.schedule('0 7 * * *', async () => {
    await sendMorningRecaps();
  });

  // Send wellness reminders every hour (users can configure frequency)
  cron.schedule('0 * * * *', async () => {
    await sendWellnessReminders();
  });

  // Send winding down notifications every hour (check user's winding down time)
  cron.schedule('0 * * * *', async () => {
    await sendWindingDownNotifications();
  });

  logger.info('Scheduler initialized');
}

async function checkUpcomingMeetings() {
  try {
    const now = new Date();
    const users = await prisma.user.findMany({
      include: {
        calendarAccounts: true,
        preferences: true,
        deliverySettings: true,
      },
    });

    for (const user of users) {
      if (user.calendarAccounts.length === 0) continue;

      const alertMinutes = user.preferences?.alertMinutesBefore || 10;
      
      // Fetch events for today and tomorrow (wider range for dashboard and planning)
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfTomorrow = new Date(now);
      endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
      endOfTomorrow.setHours(23, 59, 59, 999);
      
      const alertTime = startOfToday; // Fetch from start of today
      const endTime = endOfTomorrow;  // Through end of tomorrow

      // Fetch events from all connected calendars
      const allEvents = [];

      logger.info('🔍 Checking calendar for user', {
        userId: user.id,
        email: user.email,
        alertMinutes,
        fetchingFrom: startOfToday.toISOString(),
        fetchingTo: endOfTomorrow.toISOString(),
      });

      for (const account of user.calendarAccounts) {
        try {
          let events;

          if (account.provider === 'google') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
            const tokens = await googleCalendarService.refreshAccessToken(
              account.refreshToken!
            );
            
            // Google returns expiry_date as absolute timestamp (ms)
            // Validate it's reasonable (within next 24 hours)
            let expiresAt = new Date();
            if (tokens.expiry_date) {
              const expiryTimestamp = Number(tokens.expiry_date);
              const maxExpiry = Date.now() + 86400 * 1000; // 24 hours from now
              const minExpiry = Date.now() + 60 * 1000; // 1 minute from now
              
              if (expiryTimestamp > minExpiry && expiryTimestamp < maxExpiry) {
                expiresAt = new Date(expiryTimestamp);
              } else {
                // If invalid, default to 1 hour from now
                expiresAt = new Date(Date.now() + 3600 * 1000);
              }
            } else {
              // Default to 1 hour
              expiresAt = new Date(Date.now() + 3600 * 1000);
            }
            
            await prisma.calendarAccount.update({
              where: { id: account.id },
              data: {
                accessToken: tokens.access_token!,
                expiresAt,
              },
            });
            account.accessToken = tokens.access_token!;
            }

            events = await googleCalendarService.getUpcomingEvents(
              account.accessToken,
              account.refreshToken || undefined,
              alertTime,
              endTime,
              account.email // Pass user's calendar email for organizer detection
            );
          } else if (account.provider === 'microsoft') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await outlookCalendarService.refreshAccessToken(
                account.refreshToken!
              );
              
              // Validate expires_in (should be in seconds, typically 3600)
              // Cap at 24 hours to prevent invalid dates
              const expiresInSeconds = Math.min(
                Math.max(Number(tokens.expires_in) || 3600, 60),
                86400
              );
              
              await prisma.calendarAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: tokens.access_token,
                  expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
                },
              });
              account.accessToken = tokens.access_token;
            }

            events = await outlookCalendarService.getUpcomingEvents(
              account.accessToken,
              alertTime,
              endTime
            );
          }

          if (events) {
            allEvents.push(...events);
          }
        } catch (error: any) {
          logger.error('Error fetching calendar events', {
            userId: user.id,
            provider: account.provider,
            error: error.message,
          });
        }
      }

      logger.info('📅 Found calendar events', {
        userId: user.id,
        email: user.email,
        eventCount: allEvents.length,
        events: allEvents.map((e: any) => ({
          title: e.summary,
          start: e.start,
        })),
      });

      // Process each event (exclude single-attendee meetings - likely personal tasks/reminders)
      for (const event of allEvents) {
        // Skip if only 1 or 0 attendees (user only or no attendees)
        if (!event.attendees || event.attendees.length <= 1) {
          logger.info('⏭️ Skipping single-attendee event', {
            userId: user.id,
            event: event.summary,
            attendeeCount: event.attendees?.length || 0,
          });
          continue;
        }
        
        await processUpcomingMeeting(user, event, alertMinutes);
      }
    }
  } catch (error: any) {
    logger.error('Error in meeting check scheduler', { error: error.message });
  }
}

async function processUpcomingMeeting(user: any, event: any, alertMinutes: number) {
  try {
    const now = new Date();
    const cueScheduledFor = new Date(event.start.getTime() - alertMinutes * 60 * 1000);

    // Check if meeting already exists and cue was sent
    const existingMeeting = await prisma.meeting.findUnique({
      where: {
        userId_calendarEventId: {
          userId: user.id,
          calendarEventId: event.id,
        },
      },
    });

    if (existingMeeting?.cueDelivered) {
      return; // Already sent cue for this meeting
    }

    // Check if it's time to send the cue (within alert window or past due)
    const timeDiffMs = cueScheduledFor.getTime() - now.getTime();
    // Send if: cue time has passed OR within next 2 minutes
    const shouldSendCue = timeDiffMs <= 2 * 60 * 1000; // Send if due now or within 2 minutes

    // Infer meeting type
    const meetingType = await promptGenerator.inferMeetingType(
      event.summary,
      event.attendees
    );

    // Check if this is back-to-back
    const previousMeetings = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        endTime: {
          gte: new Date(event.start.getTime() - 5 * 60 * 1000),
          lte: event.start,
        },
      },
    });
    const isBackToBack = previousMeetings.length > 0;

    // Fetch historical insights from last 10 rated meetings
    const historicalMeetings = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        meetingRating: {
          not: null,
        },
        ratedAt: {
          not: null,
        },
      },
      orderBy: {
        ratedAt: 'desc',
      },
      take: 10,
      include: {
        focusSession: true,
      },
    });

    const historicalInsights = historicalMeetings.map((m: any) => ({
      meetingType: m.meetingType || 'general',
      rating: m.meetingRating!,
      feedback: m.meetingFeedback || undefined,
      wasBackToBack: m.isBackToBack,
      focusSceneUsed: m.focusSceneOpened,
    }));

    // Analyze mind state patterns for more grounded cues
    const mindStatePatterns = await analyzeMindStatePatterns(user.id);

    // Generate AI cue with historical context and mind state patterns
    const tone = user.preferences?.tone || 'balanced';
    const cueMessage = await promptGenerator.generatePreMeetingCue(
      {
        title: event.summary,
        description: event.description,
        attendees: event.attendees,
        duration: Math.round((event.end - event.start) / (1000 * 60)),
        isBackToBack,
        meetingType,
        isOrganizer: event.isOrganizer,
      },
      tone,
      historicalInsights.length > 0 ? historicalInsights : undefined,
      mindStatePatterns
    );

    // Create or update meeting record
    const focusSceneUrl = user.preferences?.enableFocusScene
      ? `${process.env.BASE_URL}/focus/${user.id}/${event.id}`
      : undefined;

    const attendeeCount = event.attendees?.length || 0;

    const meeting = await prisma.meeting.upsert({
      where: {
        userId_calendarEventId: {
          userId: user.id,
          calendarEventId: event.id,
        },
      },
      create: {
        userId: user.id,
        calendarEventId: event.id,
        title: event.summary,
        description: event.description,
        startTime: event.start,
        endTime: event.end,
        attendees: event.attendees,
        attendeeCount,
        location: event.location,
        meetingLink: event.hangoutLink,
        meetingType,
        isOrganizer: event.isOrganizer || false,
        isBackToBack,
        cueScheduledFor,
        cueContent: cueMessage,
        focusSceneUrl,
        cueDelivered: shouldSendCue,
        cueSentAt: shouldSendCue ? new Date() : null,
      },
      update: {
        title: event.summary,
        description: event.description,
        startTime: event.start,
        endTime: event.end,
        attendees: event.attendees,
        attendeeCount,
        location: event.location,
        meetingLink: event.hangoutLink,
        isOrganizer: event.isOrganizer || false,
        cueContent: cueMessage,
        cueScheduledFor,
        ...(shouldSendCue && {
          cueDelivered: true,
          cueSentAt: new Date(),
        }),
      },
    });

    // Only send cue if it's time
    if (shouldSendCue) {
      const delivery = user.deliverySettings;

      logger.info('📧 Sending pre-meeting cue', {
        userId: user.id,
        email: user.email,
        meetingTitle: event.summary,
        cueScheduledFor,
        emailEnabled: delivery?.emailEnabled,
        slackEnabled: delivery?.slackEnabled,
        smsEnabled: delivery?.smsEnabled,
      });

      if (delivery?.emailEnabled) {
        await emailService.sendPreMeetingCue(
          user.email,
          event.summary,
          cueMessage,
          focusSceneUrl
        );
        logger.info('✅ Email cue sent successfully', {
          userId: user.id,
          email: user.email,
        });
      } else {
        logger.warn('⚠️ Email delivery not enabled', {
          userId: user.id,
          deliverySettings: delivery,
        });
      }

      if (delivery?.slackEnabled && (delivery?.slackAccessToken || delivery?.slackWebhookUrl)) {
        await slackService.sendPreMeetingCue(
          delivery.slackWebhookUrl || null,
          event.summary,
          cueMessage,
          focusSceneUrl,
          delivery.slackAccessToken || null,
          delivery.slackChannelId || null
        );
      }

      if (delivery?.smsEnabled && delivery?.phoneNumber) {
        await smsService.sendPreMeetingCue(
          delivery.phoneNumber,
          event.summary,
          cueMessage,
          focusSceneUrl
        );
      }

      if (delivery?.pushEnabled && delivery?.pushPreMeetingCues) {
        await pushNotificationService.sendPreMeetingCue(
          user.id,
          event.summary,
          cueMessage,
          focusSceneUrl
        );
        logger.info('✅ Push notification sent successfully', {
          userId: user.id,
        });
      }

      logger.info('Pre-meeting cue sent', {
        userId: user.id,
        meetingId: meeting.id,
        title: event.summary,
      });
    } else {
      logger.debug('Meeting stored but cue not sent yet', {
        userId: user.id,
        meetingTitle: event.summary,
        cueScheduledFor,
        minutesUntilCue: Math.round(timeDiffMs / (1000 * 60)),
      });
    }
  } catch (error: any) {
    logger.error('Error processing upcoming meeting', {
      userId: user.id,
      eventId: event.id,
      error: error.message,
    });
  }
}

async function sendDailyWrapUps() {
  try {
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enableDailyWrapUp: true,
        },
      },
      include: {
        deliverySettings: true,
        preferences: true,
      },
    });

    for (const user of users) {
      try {
        // Get current hour in USER'S timezone
        const userTimezone = user.timezone || 'America/New_York';
        const currentHour = getUserCurrentHour(userTimezone);
        
        // Only send at user's evening flow time
        const eveningFlowTime = user.preferences?.eveningFlowTime || '18:00';
        const [eveningHour] = eveningFlowTime.split(':').map(Number);
        
        if (currentHour !== eveningHour) {
          continue; // Skip if not the user's evening time
        }
        
        // Get today in user's timezone
        const today = moment().tz(userTimezone).startOf('day').toDate();
        // Get today's stats
        const meetings = await prisma.meeting.findMany({
          where: {
            userId: user.id,
            startTime: {
              gte: today,
            },
          },
        });

        const focusSessions = await prisma.focusSession.findMany({
          where: {
            userId: user.id,
            startedAt: {
              gte: today,
            },
          },
        });

        const stats = {
          totalMeetings: meetings.length,
          scenesCompleted: meetings.filter((m: any) => m.cueDelivered).length,
          focusSessionsOpened: focusSessions.length,
        };

        // Get today's rated meetings with feedback
        const ratedMeetings = meetings
          .filter((m: any) => m.meetingRating !== null)
          .map((m: any) => ({
            title: m.title,
            rating: m.meetingRating,
            feedback: m.meetingFeedback,
          }));

        // Get tomorrow's first meeting
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        const nextMeeting = await prisma.meeting.findFirst({
          where: {
            userId: user.id,
            startTime: {
              gte: tomorrow,
              lt: dayAfterTomorrow,
            },
          },
          orderBy: {
            startTime: 'asc',
          },
        });

        // Generate wrap-up message with rating insights
        const wrapUpMessage = await promptGenerator.generateDailyWrapUp({
          ...stats,
          nextMeetingTime: nextMeeting?.startTime,
          ratedMeetings: ratedMeetings.length > 0 ? ratedMeetings : undefined,
        });

        // Send wrap-up
        if (user.deliverySettings?.emailEnabled) {
          await emailService.sendDailyWrapUp(user.email, wrapUpMessage, stats);
        }

        if (
          user.deliverySettings?.slackEnabled &&
          (user.deliverySettings?.slackAccessToken || user.deliverySettings?.slackWebhookUrl)
        ) {
          await slackService.sendDailyWrapUp(
            user.deliverySettings.slackWebhookUrl || null,
            wrapUpMessage,
            stats,
            user.deliverySettings.slackAccessToken || null,
            user.deliverySettings.slackChannelId || null
          );
        }

        if (user.deliverySettings?.pushEnabled && user.deliverySettings?.pushDailyWrapUp) {
          await pushNotificationService.sendDailyWrapUp(
            user.id,
            wrapUpMessage,
            stats
          );
        }

        // Store daily reflection
        await prisma.dailyReflection.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: today,
            },
          },
          create: {
            userId: user.id,
            date: today,
            ...stats,
            wrapUpSentAt: new Date(),
          },
          update: {
            ...stats,
            wrapUpSentAt: new Date(),
          },
        });

        logger.info('Daily wrap-up sent', { userId: user.id });
      } catch (error: any) {
        logger.error('Error sending daily wrap-up', {
          userId: user.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in daily wrap-up scheduler', { error: error.message });
  }
}

async function sendPostMeetingInsights() {
  try {
    const now = new Date();
    // Look for meetings that ended 30 minutes to 2 hours ago and haven't sent post-meeting email
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: {
        endTime: {
          gte: twoHoursAgo,
          lte: thirtyMinutesAgo,
        },
        postMeetingEmailSent: false,
        cueDelivered: true, // Only send insights if they received the pre-meeting cue
      },
      include: {
        user: {
          include: {
            deliverySettings: true,
          },
        },
      },
    });

    for (const meeting of meetings) {
      try {
        // Only send if email delivery is enabled
        if (!meeting.user.deliverySettings?.emailEnabled) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: { postMeetingEmailSent: true },
          });
          continue;
        }

        // Generate rating URL
        const ratingUrl = `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/rate/${meeting.userId}/${meeting.id}`;

        // Send post-meeting insight email
        const sent = await emailService.sendPostMeetingInsight(
          meeting.user.email,
          meeting.title,
          meeting.startTime,
          ratingUrl
        );

        // Send push notification if enabled
        if (meeting.user.deliverySettings?.pushEnabled) {
          await pushNotificationService.sendPostMeetingInsight(
            meeting.userId,
            meeting.title,
            ratingUrl
          );
        }

        if (sent) {
          await prisma.meeting.update({
            where: { id: meeting.id },
            data: {
              postMeetingEmailSent: true,
              postMeetingEmailSentAt: new Date(),
            },
          });

          logger.info('Post-meeting insight email sent', {
            userId: meeting.userId,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
          });
        }
      } catch (error: any) {
        logger.error('Error sending post-meeting insight', {
          meetingId: meeting.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in post-meeting insights scheduler', {
      error: error.message,
    });
  }
}

async function sendPresleyFlowSessions() {
  try {
    // Get all users with Presley Flow enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enableEveningFlow: true,
        },
      },
      include: {
        preferences: true,
        deliverySettings: true,
        calendarAccounts: true,
      },
    });

    for (const user of users) {
      try {
        // Get current hour in USER'S timezone
        const userTimezone = user.timezone || 'America/New_York';
        const currentHour = getUserCurrentHour(userTimezone);
        const now = moment().tz(userTimezone).toDate();
        
        // Check if it's the user's configured morning OR evening flow time
        const morningFlowTime = user.preferences?.morningFlowTime || '06:00';
        const eveningFlowTime = user.preferences?.eveningFlowTime || '18:00';
        const [morningHour] = morningFlowTime.split(':').map(Number);
        const [eveningHour] = eveningFlowTime.split(':').map(Number);

        // Only proceed if it's the right hour (we run every hour)
        const isMorningTime = currentHour === morningHour && user.preferences?.enableMorningFlow;
        const isEveningTime = currentHour === eveningHour && user.preferences?.enableEveningFlow;
        
        if (!isMorningTime && !isEveningTime) continue;

        // Only send if email is enabled
        if (!user.deliverySettings?.emailEnabled) continue;

        // Determine which day to check for meetings
        let targetDate = new Date(now);
        let dateLabel = '';
        
        if (isMorningTime) {
          // Morning flow: check TODAY's meetings
          targetDate.setHours(0, 0, 0, 0);
          dateLabel = 'today';
        } else {
          // Evening flow: check TOMORROW's meetings
          targetDate.setDate(targetDate.getDate() + 1);
          targetDate.setHours(0, 0, 0, 0);
          dateLabel = 'tomorrow';
        }
        
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        const meetings = await prisma.meeting.findMany({
          where: {
            userId: user.id,
            startTime: {
              gte: targetDate,
              lte: endOfTargetDate,
            },
          },
          orderBy: { startTime: 'asc' },
        });

        if (meetings.length === 0) {
          logger.info(`No meetings ${dateLabel}, skipping Presley Flow`, {
            userId: user.id,
            flowType: isMorningTime ? 'morning' : 'evening',
          });
          continue;
        }

        // Generate Presley Flow URL
        const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const presleyFlowUrl = `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/presley-flow/${user.id}/${targetDateStr}`;

        // Send via email
        const emailSent = await emailService.sendPresleyFlowNotification(
          user.email,
          presleyFlowUrl,
          meetings.length,
          targetDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })
        );

        // Send via SMS if enabled
        if (user.deliverySettings?.smsEnabled && user.deliverySettings.phoneNumber) {
          await smsService.sendPresleyFlowNotification(
            user.deliverySettings.phoneNumber,
            presleyFlowUrl,
            meetings.length
          );
        }

        // Send via push notification if enabled
        if (user.deliverySettings?.pushEnabled && user.deliverySettings?.pushPresleyFlow) {
          await pushNotificationService.sendPresleyFlowNotification(
            user.id,
            presleyFlowUrl,
            meetings.length,
            targetDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })
          );
        }

        if (emailSent) {
          logger.info('✅ Presley Flow notification sent', {
            userId: user.id,
            flowType: isMorningTime ? 'morning' : 'evening',
            targetDate: dateLabel,
            meetingCount: meetings.length,
          });
        }
      } catch (error: any) {
        logger.error('Error sending Presley Flow for user', {
          userId: user.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in Presley Flow scheduler', {
      error: error.message,
    });
  }
}

async function sendMorningRecaps() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Get all users with morning flow enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enableMorningFlow: true,
        },
      },
      include: {
        preferences: true,
        deliverySettings: true,
      },
    });

    for (const user of users) {
      try {
        // Only send if email is enabled
        if (!user.deliverySettings?.emailEnabled) continue;

        // Check if there are meetings today
        const todayMeetings = await prisma.meeting.findMany({
          where: {
            userId: user.id,
            startTime: {
              gte: today,
              lte: endOfToday,
            },
          },
          orderBy: { startTime: 'asc' },
        });

        if (todayMeetings.length === 0) continue;

        const firstMeeting = todayMeetings[0];

        // Generate morning recap message
        const recapMessage = await promptGenerator.generateMorningRecap(
          firstMeeting.startTime,
          true, // presleyFlowCompleted - we assume they saw it if enabled
          user.id // Pass userId for mind state insights
        );

        // Send via email
        const emailSent = await emailService.sendMorningRecap(
          user.email,
          recapMessage,
          firstMeeting.startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        );

        // Send via SMS if enabled
        if (user.deliverySettings?.smsEnabled && user.deliverySettings.phoneNumber) {
          await smsService.sendMorningRecap(
            user.deliverySettings.phoneNumber,
            recapMessage
          );
        }

        // Send via push notification if enabled
        if (user.deliverySettings?.pushEnabled && user.deliverySettings?.pushMorningRecap) {
          await pushNotificationService.sendMorningRecap(
            user.id,
            recapMessage,
            firstMeeting.startTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })
          );
        }

        if (emailSent) {
          logger.info('Morning recap sent', {
            userId: user.id,
            firstMeetingTime: firstMeeting.startTime,
          });
        }
      } catch (error: any) {
        logger.error('Error sending morning recap for user', {
          userId: user.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in morning recap scheduler', {
      error: error.message,
    });
  }
}

async function sendWellnessReminders() {
  try {
    // Get users with wellness reminders enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enableWellnessReminders: true,
        } as any,
      },
      include: {
        preferences: true,
        deliverySettings: true,
        wellnessCheckIns: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        } as any,
      } as any,
    }) as any;

    for (const user of users) {
      try {
        // Get current hour in USER'S timezone
        const userTimezone = user.timezone || 'America/New_York';
        const currentHour = getUserCurrentHour(userTimezone);
        const dayOfWeek = getUserDayOfWeek(userTimezone);
        const now = moment().tz(userTimezone).toDate();
        
        // Get user's evening flow time to determine work hours
        const eveningFlowTime = user.preferences?.eveningFlowTime || '18:00';
        const [eveningHour] = eveningFlowTime.split(':').map(Number);
        
        // Check if ANY delivery method is enabled
        const hasDeliveryMethod = 
          user.deliverySettings?.emailEnabled || 
          user.deliverySettings?.pushEnabled ||
          user.deliverySettings?.smsEnabled;
          
        if (!hasDeliveryMethod) {
          logger.info('⏭️ Skipping wellness reminder - no delivery methods enabled', {
            userId: user.id,
            email: user.email,
          });
          continue;
        }

        const frequency = user.preferences?.wellnessReminderFrequency || 3; // Default: every 3 hours
        
        // Check if it's time for this user's reminder
        const lastCheckIn = user.wellnessCheckIns[0];
        const hoursSinceLastCheckIn = lastCheckIn
          ? (now.getTime() - new Date(lastCheckIn.createdAt).getTime()) / (1000 * 60 * 60)
          : frequency + 1; // If no check-ins, send one

        if (hoursSinceLastCheckIn < frequency) {
          logger.info('⏭️ Skipping wellness reminder - too soon', {
            userId: user.id,
            hoursSinceLastCheckIn: hoursSinceLastCheckIn.toFixed(2),
            frequency,
            nextReminderIn: (frequency - hoursSinceLastCheckIn).toFixed(2) + ' hours',
          });
          continue; // Too soon for next reminder
        }
        
        logger.info('📬 Sending wellness reminder', {
          userId: user.id,
          email: user.email,
          hoursSinceLastCheckIn: hoursSinceLastCheckIn.toFixed(2),
          frequency,
        });

        // Analyze mind state patterns to personalize the reminder
        const patterns = await analyzeMindStatePatterns(user.id);
        
        // Determine reminder type based on time of day and patterns
        let type: 'breathing' | 'walk' | 'mindful_moment' | 'sleep' | 'morning_energy';
        let message: string;

        // Check if it's the weekend (Saturday = 6, Sunday = 0)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend) {
          // Weekend-specific reminders: Focus on recharging, fun, and letting go
          if (currentHour >= 0 && currentHour < 5) {
            type = 'sleep';
            message = "Late night adventures are fun, but rest is important too. Your body will thank you. 🌙";
          } else if (currentHour >= 5 && currentHour < 9) {
            type = 'morning_energy';
            message = "Weekend morning! No rush today. Take your time waking up and do something that brings you joy. ☀️";
          } else if (currentHour >= 9 && currentHour < 12) {
            type = 'mindful_moment';
            message = "It's the weekend. Let go of last week's stress. What would feel good right now? A hobby? Time with loved ones? 🎨";
          } else if (currentHour >= 12 && currentHour < 15) {
            type = 'walk';
            message = "Weekend midday: Get outside if you can. Nature, fresh air, and movement are the best recharge. 🌳";
          } else if (currentHour >= 15 && currentHour < 18) {
            type = 'mindful_moment';
            message = "Weekend afternoon: This is YOUR time. Do something purely for fun or relaxation. You've earned it. 🎉";
          } else if (currentHour >= 18 && currentHour < 21) {
            type = 'mindful_moment';
            message = "Weekend evening: Enjoy this moment. Connect with people you love, or savor some peaceful alone time. 💫";
          } else {
            type = 'sleep';
            message = "Weekend night: Rest well. You're recharging for the week ahead, but there's no pressure. Just be. 🌙";
          }
        } else {
          // Weekday reminders: Use evening flow time to determine work vs. personal time
          if (currentHour >= 0 && currentHour < 5) {
            // Late night / very early morning (12am-5am): Sleep reminder
            type = 'sleep';
            message = "It's late. Your body needs rest to perform at its best tomorrow. Consider winding down and getting some sleep. 🌙";
          } else if (currentHour >= 5 && currentHour < 7) {
            // Early morning (5am-7am): Gentle wake-up
            type = 'morning_energy';
            message = "Good morning! Start your day with intention. Take 3 deep breaths and set a positive tone for the day ahead. ☀️";
          } else if (currentHour >= 7 && currentHour < 12) {
            // Morning (7am-12pm): Focus on preparation
            if (patterns.stressFrequency > 50) {
              type = 'breathing';
              message = "Morning check-in: You've had some stressful meetings lately. Take a moment to center yourself before the day unfolds.";
            } else {
              type = 'mindful_moment';
              message = "Morning pause: Notice how you're feeling right now. Carry this awareness into your day.";
            }
          } else if (currentHour >= 12 && currentHour < 14) {
            // Midday (12pm-2pm): Energy check
            type = 'walk';
            message = "Midday reset: Step away from your screen. A short walk or stretch can refresh your afternoon energy.";
          } else if (currentHour >= 14 && currentHour < eveningHour) {
            // Afternoon (2pm until evening flow): Combat afternoon slump - WORK HOURS
            type = 'walk';
            message = "Afternoon energy dip? Movement is medicine. A 5-minute walk can boost your focus and mood.";
          } else if (currentHour >= eveningHour && currentHour < 21) {
            // After evening flow until 9pm: Wind down - PERSONAL TIME
            if (patterns.recentTrend === 'worsening') {
              type = 'breathing';
              message = "End-of-day check-in: Your stress has been building. Let's release some tension with deep breathing.";
            } else {
              type = 'mindful_moment';
              message = "Evening reflection: Take a moment to acknowledge what you accomplished today. You did well.";
            }
          } else {
            // Night (9pm-12am): Prepare for rest
            type = 'sleep';
            message = "Winding down? Start preparing your mind and body for rest. Tomorrow is a new day. 🌙";
          }
        }

        // Send the reminder via enabled channels
        let sent = false;
        
        // Send via email if enabled
        if (user.deliverySettings?.emailEnabled) {
          sent = await emailService.sendWellnessReminder(user.email, type, message);
          logger.info('📧 Wellness reminder sent via email', {
            userId: user.id,
            type,
          });
        }

        // Send push notification if enabled
        if (user.deliverySettings?.pushEnabled && user.deliverySettings?.pushWellnessReminders) {
          await pushNotificationService.sendWellnessReminder(user.id, type, message);
          sent = true; // Mark as sent if push succeeds
          logger.info('📱 Wellness reminder sent via push', {
            userId: user.id,
            type,
          });
        }
        
        // TODO: SMS wellness reminders not yet implemented
        // if (user.deliverySettings?.smsEnabled && user.deliverySettings?.phoneNumber) {
        //   await smsService.sendWellnessReminder(user.deliverySettings.phoneNumber, type, message);
        //   sent = true;
        // }

        if (sent) {
          // Create a wellness check-in record
          await (prisma as any).wellnessCheckIn.create({
            data: {
              userId: user.id,
              type,
              completed: false, // User hasn't confirmed yet
            },
          });

          logger.info('✅ Wellness reminder sent successfully', {
            userId: user.id,
            type,
            stressFrequency: patterns.stressFrequency,
          });
        } else {
          logger.warn('⚠️ Wellness reminder not sent - no delivery methods succeeded', {
            userId: user.id,
          });
        }
      } catch (error: any) {
        logger.error('Error sending wellness reminder for user', {
          userId: user.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in wellness reminders scheduler', {
      error: error.message,
    });
  }
}

async function sendWindingDownNotifications() {
  try {
    const now = new Date();
    
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enableWindingDown: true,
        },
      },
      include: {
        deliverySettings: true,
        preferences: true,
      },
    });

    for (const user of users) {
      try {
        // Get user's timezone and current hour
        const userTimezone = user.timezone || 'America/New_York';
        const currentHour = getUserCurrentHour(userTimezone);
        
        // Only send at user's winding down time
        const windingDownTime = user.preferences?.windingDownTime || '21:00';
        const [windingDownHour] = windingDownTime.split(':').map(Number);
        
        if (currentHour !== windingDownHour) {
          continue; // Skip if not the user's winding down time
        }
        
        // Check if ANY delivery method is enabled
        const hasDeliveryMethod = 
          user.deliverySettings?.emailEnabled || 
          user.deliverySettings?.pushEnabled;
        
        if (!hasDeliveryMethod) {
          logger.info('⏭️ Skipping winding down notification - no delivery methods enabled', {
            userId: user.id,
          });
          continue;
        }
        
        const windingDownUrl = `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/winding-down/${user.id}`;
        
        let sent = false;
        
        // Send via email if enabled
        if (user.deliverySettings?.emailEnabled) {
          try {
            await emailService.sendWindingDownNotification(
              user.email,
              windingDownUrl
            );
            sent = true;
          } catch (error: any) {
            logger.error('Failed to send winding down email', {
              userId: user.id,
              error: error.message,
            });
          }
        }
        
        // Send via push notification if enabled
        if (user.deliverySettings?.pushEnabled && user.deliverySettings?.pushWindingDown) {
          try {
            await pushNotificationService.sendWindingDownNotification(
              user.id,
              windingDownUrl
            );
            sent = true;
          } catch (error: any) {
            logger.error('Failed to send winding down push notification', {
              userId: user.id,
              error: error.message,
            });
          }
        }
        
        if (sent) {
          logger.info('✅ Winding down notification sent successfully', {
            userId: user.id,
            windingDownTime,
          });
        } else {
          logger.warn('⚠️ Winding down notification not sent - no delivery methods succeeded', {
            userId: user.id,
          });
        }
      } catch (error: any) {
        logger.error('Error sending winding down notification for user', {
          userId: user.id,
          error: error.message,
        });
      }
    }
  } catch (error: any) {
    logger.error('Error in winding down notifications scheduler', {
      error: error.message,
    });
  }
}

