import express from 'express';
import { pushNotificationService } from '../services/delivery/pushNotificationService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/push/public-key
 * Get VAPID public key for frontend
 */
router.get('/public-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getPublicKey();
    
    if (!publicKey) {
      return res.status(503).json({
        error: 'Push notifications not configured',
      });
    }

    res.json({ publicKey });
  } catch (error: any) {
    logger.error('Error getting VAPID public key', { error: error.message });
    res.status(500).json({ error: 'Failed to get public key' });
  }
});

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { subscription } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const userAgent = req.headers['user-agent'];
    const success = await pushNotificationService.subscribe(
      userId,
      subscription,
      userAgent
    );

    if (success) {
      logger.info('User subscribed to push notifications', { userId });
      res.json({ success: true, message: 'Subscribed to push notifications' });
    } else {
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  } catch (error: any) {
    logger.error('Error subscribing to push notifications', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    const success = await pushNotificationService.unsubscribe(endpoint);

    if (success) {
      logger.info('User unsubscribed from push notifications', { endpoint });
      res.json({ success: true, message: 'Unsubscribed from push notifications' });
    } else {
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  } catch (error: any) {
    logger.error('Error unsubscribing from push notifications', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /api/push/test
 * Send a test notification (for testing purposes)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const success = await pushNotificationService.sendToUser(userId, {
      title: '🎉 Test Notification',
      body: 'Push notifications are working! You\'ll receive alerts for meetings and flows.',
      icon: '/logo.png',
      url: '/dashboard',
      tag: 'test',
    });

    if (success) {
      res.json({ success: true, message: 'Test notification sent' });
    } else {
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  } catch (error: any) {
    logger.error('Error sending test notification', { error: error.message });
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;

