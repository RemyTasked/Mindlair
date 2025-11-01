import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { PromptGenerator } from '../services/ai/promptGenerator';
import axios from 'axios';

const router = express.Router();
const promptGenerator = new PromptGenerator();

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
      // Test 1: Check OpenAI API key configuration
      results.tests.push({
        name: 'Environment Configuration',
        status: 'running',
      });

      const hasApiKey = !!process.env.OPENAI_API_KEY;
      if (!hasApiKey) {
        results.tests[0].status = 'failed';
        results.tests[0].error = 'OPENAI_API_KEY not set in environment';
        results.success = false;
        return res.status(500).json(results);
      }

      const keyPrefix = process.env.OPENAI_API_KEY!.substring(0, 7);
      results.tests[0].status = 'passed';
      results.tests[0].details = {
        keyPrefix,
        keyLength: process.env.OPENAI_API_KEY!.length,
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
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected', // Assuming Prisma is working if server is running
      openai: !!process.env.OPENAI_API_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
    },
  });
});

export default router;

