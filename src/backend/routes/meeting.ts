import express, { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { googleCalendarService } from '../services/calendar/googleCalendar';
import { outlookCalendarService } from '../services/calendar/outlookCalendar';
import { promptGenerator } from '../services/ai/promptGenerator';
import { logger } from '../utils/logger';

const router = express.Router();

// Get upcoming meetings
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : undefined;

    const meetings = await prisma.meeting.findMany({
      where: {
        userId: req.userId,
        startTime: {
          gte: start,
          ...(end && { lte: end }),
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        focusSession: true,
      },
    });

    res.json({ meetings });
  })
);

// Sync meetings from calendar NOW (manual refresh)
router.post(
  '/sync',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const userId = req.userId!; // authenticate middleware ensures this exists

    try {
      logger.info('📲 Manual meeting sync requested', { userId });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          calendarAccounts: true,
          preferences: true,
        },
      });

      if (!user || !user.calendarAccounts.length) {
        return res.status(400).json({ error: 'No calendar connected' });
      }

      const now = new Date();
      const startTime = now;
      const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Next 2 days

      let syncedCount = 0;
      const allEvents: any[] = [];

      // Fetch events from all connected calendars
      for (const account of user.calendarAccounts) {
        try {
          let events: any[] = [];

          if (account.provider === 'google') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await googleCalendarService.refreshAccessToken(
                account.refreshToken!
              );
              
              // Google returns expiry_date as absolute timestamp (ms)
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
              
              if (tokens.access_token) {
                await prisma.calendarAccount.update({
                  where: { id: account.id },
                  data: {
                    accessToken: tokens.access_token,
                    expiresAt,
                  },
                });
                account.accessToken = tokens.access_token;
              }
            }

            events = await googleCalendarService.getUpcomingEvents(
              account.accessToken,
              account.refreshToken || undefined,
              startTime,
              endTime,
              account.email
            );
          } else if (account.provider === 'microsoft') {
            // Refresh token if needed
            if (account.expiresAt && new Date(account.expiresAt) < now) {
              const tokens = await outlookCalendarService.refreshAccessToken(
                account.refreshToken!
              );
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
              startTime,
              endTime
            );
          }

          if (events) {
            allEvents.push(...events);
          }
        } catch (error: any) {
          logger.error('Error fetching calendar events during manual sync', {
            userId,
            provider: account.provider,
            error: error.message,
          });
        }
      }

      logger.info('📅 Manual sync found events', {
        userId,
        eventCount: allEvents.length,
      });

      // Sync each event to database (skip single-attendee meetings)
      for (const event of allEvents) {
        // Skip if only 1 or 0 attendees
        if (!event.attendees || event.attendees.length <= 1) {
          logger.info('⏭️ Skipping single-attendee event', {
            userId,
            event: event.summary,
            attendeeCount: event.attendees?.length || 0,
          });
          continue;
        }

        // Infer meeting type
        const meetingType = await promptGenerator.inferMeetingType(
          event.summary,
          event.attendees
        );

        // Check if this is back-to-back
        const previousMeetings = await prisma.meeting.findMany({
          where: {
            userId,
            endTime: {
              gte: new Date(event.start.getTime() - 5 * 60 * 1000),
              lte: event.start,
            },
          },
        });
        const isBackToBack = previousMeetings.length > 0;

        // Calculate attendee count
        const attendeeCount = event.attendees?.length || 0;

        // Upsert meeting to database
        await prisma.meeting.upsert({
          where: {
            userId_calendarEventId: {
              userId,
              calendarEventId: event.id,
            },
          },
          create: {
            userId,
            calendarEventId: event.id,
            title: event.summary,
            description: event.description || null,
            startTime: event.start,
            endTime: event.end,
            attendees: event.attendees || [],
            attendeeCount,
            location: event.location || null,
            meetingLink: event.hangoutLink || null,
            meetingType: meetingType || null,
            isOrganizer: event.isOrganizer || false,
            isBackToBack,
            cueDelivered: false,
          },
          update: {
            title: event.summary,
            description: event.description || null,
            startTime: event.start,
            endTime: event.end,
            attendees: event.attendees || [],
            attendeeCount,
            location: event.location || null,
            meetingLink: event.hangoutLink || null,
            meetingType: meetingType || null,
            isOrganizer: event.isOrganizer || false,
            isBackToBack,
          },
        });

        syncedCount++;
      }

      logger.info('✅ Manual meeting sync completed', {
        userId,
        syncedCount,
      });

      return res.json({
        success: true,
        syncedCount,
        message: `Synced ${syncedCount} meetings from your calendar`,
      });
    } catch (error: any) {
      logger.error('❌ Manual meeting sync failed', {
        userId,
        error: error.message,
      });
      return res.status(500).json({
        error: 'Failed to sync meetings',
        message: error.message,
      });
    }
  })
);

// Get meeting by ID
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res) => {
    const { id } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        userId: req.userId,
      },
      include: {
        focusSession: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    return res.json({ meeting });
  })
);

export default router;

