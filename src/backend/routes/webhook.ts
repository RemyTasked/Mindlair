import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Slack webhook endpoint (for future Slack app integration)
router.post(
  '/slack',
  asyncHandler(async (req, res) => {
    const { challenge, type, event } = req.body;

    // Respond to Slack URL verification challenge
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Handle Slack events
    logger.info('Slack event received', { type, event });

    return res.json({ ok: true });
  })
);

// Google Calendar webhook (for real-time updates)
router.post(
  '/google/calendar',
  asyncHandler(async (req, res) => {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    logger.info('Google Calendar webhook received', {
      channelId,
      resourceState,
    });

    // Handle calendar change notifications
    // This can be used to immediately sync calendar changes instead of polling

    res.status(200).send('OK');
  })
);

export default router;

