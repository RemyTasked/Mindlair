import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { googleCalendarService } from '../services/calendar/googleCalendar';
import { outlookCalendarService } from '../services/calendar/outlookCalendar';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Get Google OAuth URL
router.get('/google/url', (_req, res) => {
  const authUrl = googleCalendarService.getAuthUrl();
  res.json({ authUrl });
});

// Google OAuth callback
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw new AppError('Authorization code is required', 400);
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.getTokensFromCode(code);

    // Get user info
    const userInfo = await googleCalendarService.getUserInfo(tokens.access_token!);

    // Create or update user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || undefined,
          preferences: {
            create: {
              tone: 'balanced',
              alertMinutesBefore: 5,
            },
          },
          deliverySettings: {
            create: {
              emailEnabled: true,
            },
          },
        },
      });
      logger.info('New user created', { userId: user.id, email: user.email });
    }

    // Store calendar account
    await prisma.calendarAccount.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'google',
        },
      },
      create: {
        userId: user.id,
        provider: 'google',
        email: userInfo.email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        expiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      },
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`
    );
  })
);

// Get Microsoft OAuth URL
router.get('/microsoft/url', (_req, res) => {
  const authUrl = outlookCalendarService.getAuthUrl();
  res.json({ authUrl });
});

// Microsoft OAuth callback
router.get(
  '/microsoft/callback',
  asyncHandler(async (req, res) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw new AppError('Authorization code is required', 400);
    }

    // Exchange code for tokens
    const tokens = await outlookCalendarService.getTokensFromCode(code);

    // Get user info
    const userInfo = await outlookCalendarService.getUserInfo(
      tokens.access_token
    );

    // Create or update user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          name: userInfo.name || undefined,
          preferences: {
            create: {
              tone: 'balanced',
              alertMinutesBefore: 5,
            },
          },
          deliverySettings: {
            create: {
              emailEnabled: true,
            },
          },
        },
      });
      logger.info('New user created', { userId: user.id, email: user.email });
    }

    // Store calendar account
    await prisma.calendarAccount.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'microsoft',
        },
      },
      create: {
        userId: user.id,
        provider: 'microsoft',
        email: userInfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`
    );
  })
);

// Verify token
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new AppError('Token is required', 401);
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || 'secret'
  ) as { userId: string; email: string };

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
}));

export default router;

