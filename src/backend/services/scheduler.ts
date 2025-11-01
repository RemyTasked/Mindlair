import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { googleCalendarService } from './calendar/googleCalendar';
import { outlookCalendarService } from './calendar/outlookCalendar';
import { promptGenerator } from './ai/promptGenerator';
import { emailService } from './delivery/emailService';
import { slackService } from './delivery/slackService';
import { smsService } from './delivery/smsService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export function startScheduler() {
  // Check for upcoming meetings every minute
  cron.schedule('* * * * *', async () => {
    await checkUpcomingMeetings();
  });

  // Send daily wrap-ups at 8 PM every day
  cron.schedule('0 20 * * *', async () => {
    await sendDailyWrapUps();
  });

  // Check for post-meeting insights every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await sendPostMeetingInsights();
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

      const alertMinutes = user.preferences?.alertMinutesBefore || 5;
      const alertTime = new Date(now.getTime() + alertMinutes * 60 * 1000);
      const endTime = new Date(alertTime.getTime() + 2 * 60 * 1000); // 2-minute window

      // Fetch events from all connected calendars
      const allEvents = [];

      for (const account of user.calendarAccounts) {
        try {
          let events;

          if (account.provider === 'google') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await googleCalendarService.refreshAccessToken(
                account.refreshToken!
              );
              await prisma.calendarAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: tokens.access_token!,
                  expiresAt: new Date(Date.now() + (tokens.expiry_date || 3600) * 1000),
                },
              });
              account.accessToken = tokens.access_token!;
            }

            events = await googleCalendarService.getUpcomingEvents(
              account.accessToken,
              account.refreshToken || undefined,
              alertTime,
              endTime
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

      // Process each event
      for (const event of allEvents) {
        await processUpcomingMeeting(user, event, alertMinutes);
      }
    }
  } catch (error: any) {
    logger.error('Error in meeting check scheduler', { error: error.message });
  }
}

async function processUpcomingMeeting(user: any, event: any, alertMinutes: number) {
  try {
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

    const historicalInsights = historicalMeetings.map(m => ({
      meetingType: m.meetingType || 'general',
      rating: m.meetingRating!,
      feedback: m.meetingFeedback || undefined,
      wasBackToBack: m.isBackToBack,
      focusSceneUsed: m.focusSceneOpened,
    }));

    // Generate AI cue with historical context
    const tone = user.preferences?.tone || 'balanced';
    const cueMessage = await promptGenerator.generatePreMeetingCue(
      {
        title: event.summary,
        description: event.description,
        attendees: event.attendees,
        duration: Math.round((event.end - event.start) / (1000 * 60)),
        isBackToBack,
        meetingType,
      },
      tone,
      historicalInsights.length > 0 ? historicalInsights : undefined
    );

    // Create or update meeting record
    const focusSceneUrl = user.preferences?.enableFocusScene
      ? `${process.env.BASE_URL}/focus/${user.id}/${event.id}`
      : undefined;

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
        location: event.location,
        meetingLink: event.hangoutLink,
        meetingType,
        isBackToBack,
        cueScheduledFor,
        cueContent: cueMessage,
        focusSceneUrl,
        cueDelivered: true,
        cueSentAt: new Date(),
      },
      update: {
        cueContent: cueMessage,
        cueDelivered: true,
        cueSentAt: new Date(),
      },
    });

    // Send cue via enabled channels
    const delivery = user.deliverySettings;

    if (delivery?.emailEnabled) {
      await emailService.sendPreMeetingCue(
        user.email,
        event.summary,
        cueMessage,
        focusSceneUrl
      );
    }

    if (delivery?.slackEnabled && delivery?.slackWebhookUrl) {
      await slackService.sendPreMeetingCue(
        delivery.slackWebhookUrl,
        event.summary,
        cueMessage,
        focusSceneUrl
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

    logger.info('Pre-meeting cue sent', {
      userId: user.id,
      meetingId: meeting.id,
      title: event.summary,
    });
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
          user.deliverySettings?.slackWebhookUrl
        ) {
          await slackService.sendDailyWrapUp(
            user.deliverySettings.slackWebhookUrl,
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

