import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { PromptGenerator } from '../services/ai/promptGenerator';
import { aiService } from '../services/ai/aiService';
import { emailService } from '../services/delivery/emailService';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { googleCalendarService } from '../services/calendar/googleCalendar';
import { logger } from '../utils/logger';

const router = express.Router();
const promptGenerator = new PromptGenerator();
const prisma = new PrismaClient();

/**
 * Test endpoint to verify AI API integration
 * GET /api/test/ai
 */
router.get(
  '/ai',
  asyncHandler(async (_req, res) => {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: [],
      success: true,
    };

    try {
      // Test 1: Check AI Provider Configuration
      results.tests.push({
        name: 'AI Provider Configuration',
        status: 'running',
      });

      const configuredProviders = aiService.getConfiguredProviders();
      
      if (configuredProviders.length === 0) {
        results.tests[0].status = 'failed';
        results.tests[0].error = 'No AI providers configured';
        results.success = false;
        return res.status(500).json(results);
      }

      results.tests[0].status = 'passed';
      results.tests[0].details = {
        configuredProviders,
        primaryProvider: configuredProviders[0] || 'None',
        fallbackProvider: configuredProviders[1] || 'None',
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        geminiConfigured: !!process.env.GOOGLE_GEMINI_API_KEY,
        // Debug: Check if service is available
        aiServiceAvailable: aiService.isAvailable(),
        envVarCheck: {
          OPENAI_API_KEY_exists: !!process.env.OPENAI_API_KEY,
          GOOGLE_GEMINI_API_KEY_exists: !!process.env.GOOGLE_GEMINI_API_KEY,
          OPENAI_API_KEY_length: process.env.OPENAI_API_KEY?.length || 0,
          GOOGLE_GEMINI_API_KEY_length: process.env.GOOGLE_GEMINI_API_KEY?.length || 0,
        },
      };

      // Test 2: Make a simple API call to OpenAI
      results.tests.push({
        name: 'OpenAI API Connection',
        status: 'running',
      });

      const testResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. Respond with exactly: "API working"',
            },
            {
              role: 'user',
              content: 'Test',
            },
          ],
          max_tokens: 10,
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      results.tests[1].status = 'passed';
      results.tests[1].details = {
        model: testResponse.data.model,
        response: testResponse.data.choices[0].message.content,
        tokensUsed: testResponse.data.usage.total_tokens,
      };

      // Test 3: Test Meet Cute specific prompt generation
      results.tests.push({
        name: 'Meet Cute Prompt Generation',
        status: 'running',
      });

      const sampleMeeting = {
        title: 'Q4 Strategy Review',
        startTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        endTime: new Date(Date.now() + 65 * 60 * 1000), // 65 minutes from now
        attendees: ['ceo@company.com', 'cfo@company.com', 'cto@company.com'],
        description: 'Quarterly business review with executive team',
      };

      const meetingContext = {
        title: sampleMeeting.title,
        description: sampleMeeting.description,
        attendees: sampleMeeting.attendees,
        duration: 60,
        isBackToBack: false,
        meetingType: 'strategic_planning',
      };

      const cue = await promptGenerator.generatePreMeetingCue(
        meetingContext,
        'executive',
        undefined
      );

      results.tests[2].status = 'passed';
      results.tests[2].details = {
        sampleMeeting: {
          title: sampleMeeting.title,
          attendeeCount: sampleMeeting.attendees.length,
          tone: 'executive',
        },
        generatedCue: cue,
        cueLength: cue.length,
      };

      // Test 4: Test Presley Flow generation
      results.tests.push({
        name: 'Presley Flow Generation',
        status: 'running',
      });

      const tomorrowMeetings = [
        {
          title: '1:1 with Sarah',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Tomorrow 9 AM
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
          attendees: ['sarah@company.com'],
          meetingType: 'one_on_one',
        },
        {
          title: 'Product Launch Planning',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Tomorrow 2 PM
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
          attendees: ['team@company.com', 'marketing@company.com'],
          meetingType: 'brainstorm',
        },
      ];

      const presleyFlow = await promptGenerator.generatePresleyFlowSession(
        tomorrowMeetings,
        'balanced'
      );

      results.tests[3].status = 'passed';
      results.tests[3].details = {
        meetingCount: tomorrowMeetings.length,
        openingSceneLength: presleyFlow.openingScene.length,
        meetingPreviewsCount: presleyFlow.meetingPreviews.length,
        hasVisualization: presleyFlow.visualizationScript.length > 0,
      };

      // All tests passed
      results.summary = {
        totalTests: results.tests.length,
        passed: results.tests.filter((t: any) => t.status === 'passed').length,
        failed: results.tests.filter((t: any) => t.status === 'failed').length,
      };

      return res.json(results);
    } catch (error: any) {
      // Update the current test as failed
      const currentTest = results.tests[results.tests.length - 1];
      if (currentTest) {
        currentTest.status = 'failed';
        currentTest.error = error.message;

        if (error.response?.data) {
          currentTest.errorDetails = error.response.data;
        }
      }

      results.success = false;
      results.summary = {
        totalTests: results.tests.length,
        passed: results.tests.filter((t: any) => t.status === 'passed').length,
        failed: results.tests.filter((t: any) => t.status === 'failed').length,
      };

      return res.status(500).json(results);
    }
  })
);

/**
 * Simple health check endpoint
 * GET /api/test/health
 */
router.get('/health', (_req, res) => {
  const configuredAIProviders = aiService.getConfiguredProviders();
  
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ai: {
      providers: configuredAIProviders,
      primary: configuredAIProviders[0] || 'None',
      fallback: configuredAIProviders[1] || 'None',
      available: configuredAIProviders.length > 0,
    },
    services: {
      database: 'connected',
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GOOGLE_GEMINI_API_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
    },
  });
});

/**
 * Manual calendar sync endpoint
 * GET /api/test/sync-calendar
 */
router.get(
  '/sync-calendar',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const results: any = {
      timestamp: now.toISOString(),
      users: [],
      errors: [],
    };

    try {
      // Get all users with calendar accounts
      const users = await prisma.user.findMany({
        include: {
          calendarAccounts: true,
          preferences: true,
        },
      });

      for (const user of users) {
        const userResult: any = {
          userId: user.id,
          email: user.email,
          calendars: [],
        };

        for (const account of user.calendarAccounts) {
          try {
            if (account.provider === 'google') {
              // Fetch events from today through tomorrow
              const startOfToday = new Date(now);
              startOfToday.setHours(0, 0, 0, 0);
              
              const endOfTomorrow = new Date(now);
              endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
              endOfTomorrow.setHours(23, 59, 59, 999);

              logger.info('Fetching calendar events', {
                userId: user.id,
                email: user.email,
                from: startOfToday.toISOString(),
                to: endOfTomorrow.toISOString(),
              });

              const events = await googleCalendarService.getUpcomingEvents(
                account.accessToken,
                account.refreshToken || undefined,
                startOfToday,
                endOfTomorrow
              );

              userResult.calendars.push({
                provider: 'google',
                eventsFound: events.length,
                events: events.map((e: any) => ({
                  id: e.id,
                  summary: e.summary,
                  start: e.start,
                  end: e.end,
                  attendees: e.attendees?.length || 0,
                })),
              });
            }
          } catch (error: any) {
            userResult.calendars.push({
              provider: account.provider,
              error: error.message,
            });
            results.errors.push({
              userId: user.id,
              provider: account.provider,
              error: error.message,
            });
          }
        }

        results.users.push(userResult);
      }

      return res.json(results);
    } catch (error: any) {
      logger.error('Error in sync-calendar test', { error: error.message });
      return res.status(500).json({
        error: error.message,
        results,
      });
    }
  })
);

/**
 * Debug endpoint to check meetings in database
 * GET /api/test/meetings
 */
router.get(
  '/meetings',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        calendarAccounts: true,
        preferences: true,
      },
    });

    // Get all meetings
    const allMeetings = await prisma.meeting.findMany({
      where: {
        startTime: {
          gte: now,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 20,
    });

    // Get meetings within 10 minutes
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        startTime: {
          gte: now,
          lte: tenMinutesFromNow,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return res.json({
      timestamp: now.toISOString(),
      tenMinutesFromNow: tenMinutesFromNow.toISOString(),
      users: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        hasCalendarAccounts: u.calendarAccounts.length > 0,
        calendarProviders: u.calendarAccounts.map((a: any) => a.provider),
        alertMinutesBefore: u.preferences?.alertMinutesBefore || 10,
        enableFocusScene: u.preferences?.enableFocusScene ?? true,
      })),
      totalMeetings: allMeetings.length,
      upcomingMeetingsWithin10Min: upcomingMeetings.length,
      upcomingMeetings: upcomingMeetings.map((m: any) => ({
        id: m.id,
        title: m.title,
        startTime: m.startTime,
        minutesUntil: Math.round((m.startTime.getTime() - now.getTime()) / (1000 * 60)),
        hasFocusSceneUrl: !!m.focusSceneUrl,
        focusSceneUrl: m.focusSceneUrl,
        cueDelivered: m.cueDelivered,
      })),
      allMeetings: allMeetings.slice(0, 5).map((m: any) => ({
        title: m.title,
        startTime: m.startTime,
        minutesUntil: Math.round((m.startTime.getTime() - now.getTime()) / (1000 * 60)),
        hasFocusSceneUrl: !!m.focusSceneUrl,
      })),
      baseUrl: process.env.BASE_URL,
    });
  })
);

/**
 * Test email service
 * GET /api/test/email?to=user@example.com
 */
router.get(
  '/email',
  asyncHandler(async (req, res) => {
    const { to } = req.query;

    if (!to || typeof to !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email address required. Use ?to=your@email.com',
      });
    }

    logger.info('📧 Testing email service', { to });

    const result = await emailService.sendPreMeetingCue(
      to,
      'Test Meeting - Email Service Check',
      'This is a test email from Meet Cute to verify your email notifications are working correctly! 🎬',
      `${process.env.BASE_URL}/dashboard`
    );

    if (result) {
      return res.json({
        success: true,
        message: 'Test email sent successfully!',
        to,
        checkInbox: 'Check your email inbox (and spam folder)',
        sendgridConfigured: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@meetcuteai.com',
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        sendgridConfigured: !!process.env.SENDGRID_API_KEY,
        apiKeyPrefix: process.env.SENDGRID_API_KEY?.substring(0, 8),
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@meetcuteai.com',
        hint: 'Check Railway logs for detailed error messages',
      });
    }
  })
);

// Check if database migrations have run
router.get('/db-schema', asyncHandler(async (_req, res) => {
  try {
    // Try to query with new fields to see if they exist
    const schemaCheck: any = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    // Check 1: Can we query user_preferences with new fields?
    try {
      const prefs = await prisma.userPreferences.findFirst({
        select: {
          enableVoiceNarration: true,
          morningFlowTime: true,
          eveningFlowTime: true,
          enableMorningFlow: true,
          enableEveningFlow: true,
        },
      });
      schemaCheck.checks.push({
        table: 'user_preferences',
        newFields: ['enableVoiceNarration', 'morningFlowTime', 'eveningFlowTime', 'enableMorningFlow', 'enableEveningFlow'],
        status: 'EXISTS',
        sampleData: prefs || 'No records yet',
      });
    } catch (error: any) {
      schemaCheck.checks.push({
        table: 'user_preferences',
        newFields: ['enableVoiceNarration', 'morningFlowTime', 'eveningFlowTime', 'enableMorningFlow', 'enableEveningFlow'],
        status: 'MISSING',
        error: error.message,
      });
    }

    // Check 2: Can we query meetings with isOrganizer?
    try {
      const meeting = await prisma.meeting.findFirst({
        select: {
          isOrganizer: true,
        },
      });
      schemaCheck.checks.push({
        table: 'meetings',
        newFields: ['isOrganizer'],
        status: 'EXISTS',
        sampleData: meeting || 'No records yet',
      });
    } catch (error: any) {
      schemaCheck.checks.push({
        table: 'meetings',
        newFields: ['isOrganizer'],
        status: 'MISSING',
        error: error.message,
      });
    }

    // Check 3: Can we query presley_flow_sessions?
    try {
      const session = await prisma.presleyFlowSession.findFirst({
        select: {
          performanceRating: true,
          improvementNotes: true,
        },
      });
      schemaCheck.checks.push({
        table: 'presley_flow_sessions',
        newFields: ['performanceRating', 'improvementNotes'],
        status: 'EXISTS',
        sampleData: session || 'No records yet',
      });
    } catch (error: any) {
      schemaCheck.checks.push({
        table: 'presley_flow_sessions',
        newFields: ['performanceRating', 'improvementNotes'],
        status: 'MISSING',
        error: error.message,
      });
    }

    const allChecksPass = schemaCheck.checks.every((c: any) => c.status === 'EXISTS');
    schemaCheck.migrationsComplete = allChecksPass;
    schemaCheck.message = allChecksPass 
      ? '✅ All migrations have run successfully' 
      : '❌ Some migrations are missing - database schema is out of date';

    return res.json(schemaCheck);
  } catch (error: any) {
    console.error('❌ Error checking database schema:', error);
    return res.status(500).json({
      error: error.message,
      message: 'Failed to check database schema',
    });
  }
}));

// Debug user authentication flow
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  console.log('🔍 Debug: Checking user', { userId });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        calendarAccounts: true,
        deliverySettings: true,
      },
    });

    if (!user) {
      return res.json({
        success: false,
        error: 'User not found',
        userId,
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasPreferences: !!user.preferences,
        hasCalendarAccounts: user.calendarAccounts.length > 0,
        hasDeliverySettings: !!user.deliverySettings,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    console.error('❌ Error checking user:', error);
    return res.json({
      success: false,
      error: error.message,
      userId,
    });
  }
}));

export default router;

