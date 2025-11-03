import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { googleCalendarService } from './calendar/googleCalendar';
import { outlookCalendarService } from './calendar/outlookCalendar';
import { promptGenerator } from './ai/promptGenerator';
import { emailService } from './delivery/emailService';
import { slackService } from './delivery/slackService';
import { smsService } from './delivery/smsService';
import { logger } from '../utils/logger';
import { analyzeMindStatePatterns } from './ai/mindStateAnalyzer';

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

      logger.info('📅 Found calendar events', {
        userId: user.id,
        email: user.email,
        eventCount: allEvents.length,
        events: allEvents.map((e: any) => ({
          title: e.summary,
          start: e.start,
        })),
      });

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
      },
      tone,
      historicalInsights.length > 0 ? historicalInsights : undefined,
      mindStatePatterns
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
        cueDelivered: shouldSendCue,
        cueSentAt: shouldSendCue ? new Date() : null,
      },
      update: {
        title: event.summary,
        description: event.description,
        startTime: event.start,
        endTime: event.end,
        attendees: event.attendees,
        location: event.location,
        meetingLink: event.hangoutLink,
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

async function sendPresleyFlowSessions() {
  try {
    const now = new Date();
    const currentHour = now.getHours();

    // Get all users with Presley Flow enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enablePresleyFlow: true,
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
        // Check if it's the user's configured time
        const presleyFlowTime = user.preferences?.presleyFlowTime || '20:00';
        const [targetHour] = presleyFlowTime.split(':').map(Number);

        // Only proceed if it's the right hour (we run every hour)
        if (currentHour !== targetHour) continue;

        // Only send if email is enabled
        if (!user.deliverySettings?.emailEnabled) continue;

        // Check if there are meetings tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        const tomorrowMeetings = await prisma.meeting.findMany({
          where: {
            userId: user.id,
            startTime: {
              gte: tomorrow,
              lte: endOfTomorrow,
            },
          },
          orderBy: { startTime: 'asc' },
        });

        if (tomorrowMeetings.length === 0) {
          logger.info('No meetings tomorrow, skipping Presley Flow', {
            userId: user.id,
          });
          continue;
        }

        // Generate Presley Flow URL
        const tomorrowDateStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
        const presleyFlowUrl = `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/presley-flow/${user.id}/${tomorrowDateStr}`;

        // Send via email
        const emailSent = await emailService.sendPresleyFlowNotification(
          user.email,
          presleyFlowUrl,
          tomorrowMeetings.length,
          tomorrow.toLocaleDateString('en-US', {
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
            tomorrowMeetings.length
          );
        }

        if (emailSent) {
          logger.info('Presley Flow notification sent', {
            userId: user.id,
            meetingCount: tomorrowMeetings.length,
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

    // Get all users with morning recap enabled
    const users = await prisma.user.findMany({
      where: {
        preferences: {
          enablePresleyFlow: true,
          enableMorningRecap: true,
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
    const now = new Date();
    const currentHour = now.getHours();

    // Only send during working hours (9 AM - 6 PM)
    if (currentHour < 9 || currentHour >= 18) {
      return;
    }

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
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
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
        // Check if email is enabled
        if (!user.deliverySettings?.emailEnabled) continue;

        const frequency = user.preferences?.wellnessReminderFrequency || 3; // Default: every 3 hours
        
        // Check if it's time for this user's reminder
        const lastCheckIn = user.wellnessCheckIns[0];
        const hoursSinceLastCheckIn = lastCheckIn
          ? (now.getTime() - new Date(lastCheckIn.createdAt).getTime()) / (1000 * 60 * 60)
          : frequency + 1; // If no check-ins, send one

        if (hoursSinceLastCheckIn < frequency) {
          continue; // Too soon for next reminder
        }

        // Analyze mind state patterns to personalize the reminder
        const patterns = await analyzeMindStatePatterns(user.id);
        
        // Determine reminder type based on patterns and time of day
        let type: 'breathing' | 'walk' | 'mindful_moment';
        let message: string;

        if (patterns.stressFrequency > 50 || patterns.recentTrend === 'worsening') {
          // High stress users get more breathing reminders
          type = currentHour < 12 ? 'breathing' : currentHour < 15 ? 'walk' : 'breathing';
          message = patterns.stressFrequency > 50
            ? "You've been experiencing high stress before meetings lately. Take a moment to reset with some deep breaths."
            : "Your stress levels have been climbing. Let's pause and breathe together.";
        } else if (currentHour >= 14 && currentHour < 16) {
          // Afternoon slump - suggest a walk
          type = 'walk';
          message = "Afternoon energy dip? A quick walk can refresh your mind and boost your focus.";
        } else {
          // General mindful moment
          type = 'mindful_moment';
          message = "Take a brief pause. Notice your breath, your body, this moment. You're doing great.";
        }

        // Send the reminder
        const sent = await emailService.sendWellnessReminder(user.email, type, message);

        if (sent) {
          // Create a wellness check-in record
          await (prisma as any).wellnessCheckIn.create({
            data: {
              userId: user.id,
              type,
              completed: false, // User hasn't confirmed yet
            },
          });

          logger.info('Wellness reminder sent', {
            userId: user.id,
            type,
            stressFrequency: patterns.stressFrequency,
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

