import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = Router();

// Slack OAuth callback
router.get('/oauth/callback', authenticate, async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Verify state matches userId for security
    if (state !== userId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for access token
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/api/slack/oauth/callback`;

    if (!clientId || !clientSecret) {
      logger.error('Slack OAuth credentials not configured');
      return res.status(500).json({ error: 'Slack integration not configured' });
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenData.ok) {
      logger.error('Slack OAuth token exchange failed', { error: tokenData.error });
      return res.status(400).json({ error: 'Failed to authorize with Slack' });
    }

    // Store Slack OAuth tokens
    await prisma.deliverySettings.upsert({
      where: { userId: userId! },
      create: {
        userId: userId!,
        slackEnabled: true,
        slackAccessToken: tokenData.access_token,
        slackTeamId: tokenData.team?.id || null,
        slackTeamName: tokenData.team?.name || null,
        slackChannelId: tokenData.incoming_webhook?.channel_id || null,
        slackChannelName: tokenData.incoming_webhook?.channel || null,
        slackUserId: tokenData.authed_user?.id || null,
      },
      update: {
        slackEnabled: true,
        slackAccessToken: tokenData.access_token,
        slackTeamId: tokenData.team?.id || null,
        slackTeamName: tokenData.team?.name || null,
        slackChannelId: tokenData.incoming_webhook?.channel_id || null,
        slackChannelName: tokenData.incoming_webhook?.channel || null,
        slackUserId: tokenData.authed_user?.id || null,
      },
    });

    logger.info('Slack OAuth completed successfully', {
      userId,
      teamId: tokenData.team?.id,
      channelId: tokenData.incoming_webhook?.channel_id,
    });

    // Redirect back to settings with success message
    res.redirect(`${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/settings?slack=success`);
  } catch (error: any) {
    logger.error('Error in Slack OAuth callback', { error: error.message });
    res.redirect(`${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/settings?slack=error`);
  }
});

// Disconnect Slack
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    await prisma.deliverySettings.update({
      where: { userId: userId! },
      data: {
        slackEnabled: false,
        slackAccessToken: null,
        slackTeamId: null,
        slackTeamName: null,
        slackChannelId: null,
        slackChannelName: null,
        slackUserId: null,
      },
    });

    logger.info('Slack disconnected', { userId });

    res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error: any) {
    logger.error('Error disconnecting Slack', { error: error.message });
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

// Get Slack connection status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    const delivery = await prisma.deliverySettings.findUnique({
      where: { userId: userId! },
      select: {
        slackEnabled: true,
        slackTeamName: true,
        slackChannelName: true,
      },
    });

    res.json({
      connected: delivery?.slackEnabled || false,
      teamName: delivery?.slackTeamName,
      channelName: delivery?.slackChannelName,
    });
  } catch (error: any) {
    logger.error('Error getting Slack status', { error: error.message });
    res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

export default router;

