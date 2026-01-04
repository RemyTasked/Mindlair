import express from 'express';
import jwt from 'jsonwebtoken';
import { googleCalendarService } from '../services/calendar/googleCalendar';
import { outlookCalendarService } from '../services/calendar/outlookCalendar';
import { webexCalendarService } from '../services/calendar/webexCalendar';
import { caldavCalendarService } from '../services/calendar/caldavCalendar';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Get Google OAuth URL
router.get('/google/url', optionalAuthenticate, (req, res) => {
  // If user is already authenticated, pass their userId to track multi-calendar addition
  const userId = req.userId; // Set by optionalAuthenticate middleware if token present
  const authUrl = googleCalendarService.getAuthUrl(userId);
  logger.info('📝 Generated Google OAuth URL', { hasUserId: !!userId });
  return res.json({ authUrl });
});

// Google OAuth callback
router.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, error, state } = req.query;

    logger.info('🔐 Google OAuth callback received', {
      hasCode: !!code,
      error: error,
      hasState: !!state,
      query: req.query,
      frontendUrl: process.env.FRONTEND_URL,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Decode state to get userId if present (for multi-calendar addition)
    let existingUserId: string | null = null;
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        existingUserId = decoded.userId;
        logger.info('📝 Decoded state parameter', { existingUserId });
      } catch (e) {
        logger.warn('⚠️ Failed to decode state parameter', { state });
      }
    }

    if (error) {
      logger.error('❌ Google OAuth error', { error });
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=${error}`;
      return res.redirect(redirectUrl);
    }

    if (!code || typeof code !== 'string') {
      logger.error('❌ No authorization code provided');
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=no_code`;
      return res.redirect(redirectUrl);
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await googleCalendarService.getTokensFromCode(code);
      logger.info('✅ Google tokens received', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
      });
    } catch (error: any) {
      logger.error('❌ Failed to exchange code for tokens', {
        error: error.message,
        code: code?.substring(0, 20) + '...',
      });
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=token_exchange_failed`;
      return res.redirect(redirectUrl);
    }

    // Get user info
    let userInfo;
    try {
      userInfo = await googleCalendarService.getUserInfo(tokens.access_token!);
      logger.info('✅ Google user info received', {
        email: userInfo.email,
        name: userInfo.name,
      });
    } catch (error: any) {
      logger.error('❌ Failed to get user info', { error: error.message });
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=user_info_failed`;
      return res.redirect(redirectUrl);
    }

    // Create or update user
    // If existingUserId is present, this is a multi-calendar addition - use that user
    let user;
    if (existingUserId) {
      user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          preferences: true,
          deliverySettings: true,
        },
      });
      if (!user) {
        throw new AppError('Existing user not found for multi-calendar addition', 404);
      }
      logger.info('✅ Using existing user for multi-calendar addition', { 
        existingUserId, 
        newEmail: userInfo.email 
      });
    } else {
      // Otherwise, find or create user by email (initial signup)
      // Use upsert to avoid race conditions
      try {
        user = await prisma.user.upsert({
          where: { email: userInfo.email },
          update: {
            // Update name if it changed
            name: userInfo.name || undefined,
          },
          create: {
            email: userInfo.email,
            name: userInfo.name || undefined,
            preferences: {
              create: {
                tone: 'balanced',
                alertMinutesBefore: 10,
              },
            },
            deliverySettings: {
              create: {
                emailEnabled: true,
              },
            },
          },
          include: {
            preferences: true,
            deliverySettings: true,
          },
        });
        logger.info('User upserted (Google)', { userId: user.id, email: user.email });
      } catch (error: any) {
        // If upsert fails, try to find the user one more time
        logger.warn('⚠️ Upsert failed, attempting to find user', { email: userInfo.email, error: error.message });
        user = await prisma.user.findUnique({
          where: { email: userInfo.email },
          include: {
            preferences: true,
            deliverySettings: true,
          },
        });
        if (!user) {
          throw new AppError('Failed to create or find user', 500);
        }
      }
    }

    // Ensure user exists (should never be null at this point)
    if (!user) {
      throw new AppError('User not found after upsert', 500);
    }

    // Ensure preferences and delivery settings exist (for old users)
    // HOTFIX: For existing users, ensure they have preferences and delivery settings
    if (!user.preferences) {
      await prisma.userPreferences.create({
        data: { userId: user.id },
      });
      logger.info('Created missing preferences for existing user (Google)', { userId: user.id });
    }
    if (!user.deliverySettings) {
      await prisma.deliverySettings.create({
        data: { 
          userId: user.id,
          emailEnabled: true,
        },
      });
      logger.info('Created missing delivery settings for existing user (Google)', { userId: user.id });
    }

    // Store calendar account
    // Validate expiry_date to prevent invalid dates (cap at 24 hours)
    let expiresAt = null;
    if (tokens.expiry_date) {
      const expiryTimestamp = Number(tokens.expiry_date);
      const maxExpiry = Date.now() + 86400 * 1000; // 24 hours max
      const validExpiry = Math.min(expiryTimestamp, maxExpiry);
      expiresAt = new Date(validExpiry);
    }
    
    // Determine default label if not already set
    const defaultLabel = `Google • ${userInfo.email}`;

    // Check existing account for this email/provider
    const existingAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'google',
        email: userInfo.email,
      },
    });

    if (!existingAccount) {
      // If first Google calendar, set as primary
      const existingGoogleAccounts = await prisma.calendarAccount.findMany({
        where: { userId: user.id, provider: 'google' },
      });

      const isPrimary = existingGoogleAccounts.length === 0;

      await prisma.calendarAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          email: userInfo.email,
          label: defaultLabel,
          color: null,
          isPrimary,
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || null,
          expiresAt,
        },
      });
    } else {
      await prisma.calendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: expiresAt || undefined,
          label: existingAccount.label?.trim() ? undefined : defaultLabel,
        },
      });
    }

    logger.info('📝 Stored Google calendar account', { 
      userId: user.id, 
      email: user.email,
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('✅ JWT token generated for Google auth', {
      userId: user.id,
      email: user.email,
      tokenLength: jwtToken.length,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    });

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`;
    logger.info('🔄 Redirecting to frontend after Google auth', { 
      frontendUrl: process.env.FRONTEND_URL,
      redirectUrlPreview: redirectUrl.substring(0, 100) + '...',
    });
    
    res.redirect(redirectUrl);
  })
);

// Get Microsoft OAuth URL
router.get('/microsoft/url', optionalAuthenticate, (req, res) => {
  // If user is already authenticated, pass their userId to track multi-calendar addition
  const userId = req.userId; // Set by optionalAuthenticate middleware if token present
  const authUrl = outlookCalendarService.getAuthUrl(userId);
  logger.info('📝 Generated Microsoft OAuth URL', { hasUserId: !!userId });
  return res.json({ authUrl });
});

// Microsoft OAuth callback
router.get(
  '/microsoft/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw new AppError('Authorization code is required', 400);
    }

    // Decode state to get userId if present (for multi-calendar addition)
    let existingUserId: string | null = null;
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        existingUserId = decoded.userId;
        logger.info('📝 Decoded state parameter (Microsoft)', { existingUserId });
      } catch (e) {
        logger.warn('⚠️ Failed to decode state parameter (Microsoft)', { state });
      }
    }

    // Exchange code for tokens
    const tokens = await outlookCalendarService.getTokensFromCode(code);

    // Get user info
    const userInfo = await outlookCalendarService.getUserInfo(
      tokens.access_token
    );

    // Create or update user
    // If existingUserId is present, this is a multi-calendar addition - use that user
    let user;
    if (existingUserId) {
      user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          preferences: true,
          deliverySettings: true,
        },
      });
      if (!user) {
        throw new AppError('Existing user not found for multi-calendar addition', 404);
      }
      logger.info('✅ Using existing user for multi-calendar addition (Microsoft)', { 
        existingUserId, 
        newEmail: userInfo.email 
      });
    } else {
      // Otherwise, find or create user by email (initial signup)
      // Use upsert to avoid race conditions
      try {
        user = await prisma.user.upsert({
          where: { email: userInfo.email },
          update: {
            // Update name if it changed
            name: userInfo.name || undefined,
          },
          create: {
            email: userInfo.email,
            name: userInfo.name || undefined,
            preferences: {
              create: {
                tone: 'balanced',
                alertMinutesBefore: 10,
              },
            },
            deliverySettings: {
              create: {
                emailEnabled: true,
              },
            },
          },
          include: {
            preferences: true,
            deliverySettings: true,
          },
        });
        logger.info('User upserted (Microsoft)', { userId: user.id, email: user.email });
      } catch (error: any) {
        // If upsert fails, try to find the user one more time
        logger.warn('⚠️ Upsert failed, attempting to find user (Microsoft)', { email: userInfo.email, error: error.message });
        user = await prisma.user.findUnique({
          where: { email: userInfo.email },
          include: {
            preferences: true,
            deliverySettings: true,
          },
        });
        if (!user) {
          throw new AppError('Failed to create or find user', 500);
        }
      }
    }

    // Ensure user exists (should never be null at this point)
    if (!user) {
      throw new AppError('User not found after upsert', 500);
    }

    // Ensure preferences and delivery settings exist (for old users)
    // HOTFIX: For existing users, ensure they have preferences and delivery settings
    if (!user.preferences) {
      await prisma.userPreferences.create({
        data: { userId: user.id },
      });
      logger.info('Created missing preferences for existing user (Microsoft)', { userId: user.id });
    }
    if (!user.deliverySettings) {
      await prisma.deliverySettings.create({
        data: { 
          userId: user.id,
          emailEnabled: true,
        },
      });
      logger.info('Created missing delivery settings for existing user (Microsoft)', { userId: user.id });
    }

    // Store calendar account
    // Validate expires_in to prevent invalid dates
    const expiresInSeconds = Math.min(
      Math.max(Number(tokens.expires_in) || 3600, 60),
      86400
    );
    
    const defaultLabel = `Microsoft • ${userInfo.email}`;

    const existingAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'microsoft',
        email: userInfo.email,
      },
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    if (!existingAccount) {
      const existingMicrosoftAccounts = await prisma.calendarAccount.findMany({
        where: { userId: user.id, provider: 'microsoft' },
      });
      const isPrimary = existingMicrosoftAccounts.length === 0;

      await prisma.calendarAccount.create({
        data: {
          userId: user.id,
          provider: 'microsoft',
          email: userInfo.email,
          label: defaultLabel,
          color: null,
          isPrimary,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt,
        },
      });
    } else {
      await prisma.calendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt,
          label: existingAccount.label?.trim() ? undefined : defaultLabel,
        },
      });
    }

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

// Disconnect calendar
router.delete(
  '/calendar/:accountId',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { accountId } = req.params;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    logger.info('🔌 Disconnecting specific calendar', {
      userId,
      accountId,
    });

    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new AppError('Calendar account not found', 404);
    }

    await prisma.calendarAccount.delete({
      where: { id: accountId },
    });

    logger.info('✅ Calendar disconnected successfully', {
      userId,
      accountId,
      provider: account.provider,
      email: account.email,
    });

    res.json({
      message: `${account.provider} calendar disconnected successfully`,
      provider: account.provider,
      email: account.email,
    });
  })
);

// Delete account
router.delete(
  '/account',
  asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    logger.warn('🗑️  Account deletion requested', {
      userId,
    });

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        calendarAccounts: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete user (cascade will handle all related data)
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.warn('✅ Account deleted successfully', {
      userId,
      email: user.email,
      calendarAccountsDeleted: user.calendarAccounts.length,
    });

    res.json({
      message: 'Account deleted successfully',
    });
  })
);

// ============================================
// WEBEX OAUTH ROUTES
// ============================================

// Get Webex OAuth URL
router.get('/webex/url', optionalAuthenticate, (req, res) => {
  const userId = req.userId;
  const authUrl = webexCalendarService.getAuthUrl(userId);
  logger.info('📝 Generated Webex OAuth URL', { hasUserId: !!userId });
  return res.json({ authUrl });
});

// Webex OAuth callback
router.get(
  '/webex/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;

    logger.info('🔐 Webex OAuth callback received', {
      hasCode: !!code,
      error: error,
      hasState: !!state,
    });

    // Decode state to get userId if present
    let existingUserId: string | null = null;
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        existingUserId = decoded.userId;
        logger.info('📝 Decoded state parameter', { existingUserId });
      } catch (e) {
        logger.warn('⚠️ Failed to decode state parameter', { state });
      }
    }

    if (error) {
      logger.error('❌ Webex OAuth error', { error });
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=${error}`;
      return res.redirect(redirectUrl);
    }

    if (!code || typeof code !== 'string') {
      logger.error('❌ No authorization code provided');
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=no_code`;
      return res.redirect(redirectUrl);
    }

    // Exchange code for tokens
    const tokens = await webexCalendarService.getTokensFromCode(code);

    // Get user info
    const userInfo = await webexCalendarService.getUserInfo(tokens.access_token);

    // Use first email from Webex
    const email = userInfo.emails[0];
    if (!email) {
      logger.error('❌ No email found in Webex user info');
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=no_email`;
      return res.redirect(redirectUrl);
    }

    // Create or update user
    let user;
    if (existingUserId) {
      user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          preferences: true,
          calendarAccounts: true,
        },
      });

      if (!user) {
        logger.error('❌ User not found for multi-calendar addition', { existingUserId });
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?error=user_not_found`;
        return res.redirect(redirectUrl);
      }

      logger.info('✅ Adding Webex calendar to existing user', {
        userId: user.id,
        email: user.email,
      });
    } else {
      user = await prisma.user.upsert({
        where: { email },
        update: {
          name: userInfo.displayName,
        },
        create: {
          email,
          name: userInfo.displayName,
          preferences: {
            create: {},
          },
        },
        include: {
          preferences: true,
          calendarAccounts: true,
        },
      });

      logger.info('✅ User created/updated', {
        userId: user.id,
        email: user.email,
      });
    }

    // Check if this Webex account is already connected
    const existingAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'webex',
        email: email,
      },
    });

    const defaultLabel = `Webex (${email})`;

    if (!existingAccount) {
      await prisma.calendarAccount.deleteMany({
        where: { userId: user.id, provider: 'webex' },
      });

      await prisma.calendarAccount.create({
        data: {
          userId: user.id,
          provider: 'webex',
          email: email,
          label: defaultLabel,
          color: null,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      logger.info('✅ Webex calendar account created', {
        userId: user.id,
        email: email,
      });
    } else {
      await prisma.calendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      logger.info('✅ Webex calendar account updated', {
        userId: user.id,
        email: email,
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '30d',
    });

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwtToken}`;
    logger.info('🎉 Webex OAuth flow completed', {
      userId: user.id,
      redirectUrl: process.env.FRONTEND_URL,
    });

    return res.redirect(redirectUrl);
  })
);

// ============================================
// CALDAV ROUTES (Yahoo, iCloud, etc.)
// ============================================

// CalDAV Connect - No OAuth, uses email + app password
router.post(
  '/caldav/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { email, password, provider } = req.body;
    const userId = req.userId!;

    logger.info('🔐 CalDAV connection attempt', {
      userId,
      email,
      provider,
    });

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Test connection
    const isValid = await caldavCalendarService.testConnection({
      email,
      password,
    });

    if (!isValid) {
      throw new AppError('Invalid CalDAV credentials or server unreachable', 401);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { calendarAccounts: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if this CalDAV account is already connected
    const existingAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'caldav',
        email: email,
      },
    });

    const providerName = caldavCalendarService.getProviderName(email);
    const defaultLabel = `${providerName} (${email})`;

    if (existingAccount) {
      // Update existing account
      await prisma.calendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          // Store encrypted password (in production, use proper encryption!)
          accessToken: Buffer.from(password).toString('base64'),
          expiresAt: null, // CalDAV doesn't expire
        },
      });

      logger.info('✅ CalDAV account updated', {
        userId: user.id,
        email: email,
      });
    } else {
      // Create new account
      await prisma.calendarAccount.create({
        data: {
          userId: user.id,
          provider: 'caldav',
          email: email,
          label: defaultLabel,
          color: null,
          // Store encrypted password (in production, use proper encryption!)
          accessToken: Buffer.from(password).toString('base64'),
          refreshToken: null,
          expiresAt: null,
        },
      });

      logger.info('✅ CalDAV account created', {
        userId: user.id,
        email: email,
      });
    }

    return res.json({
      success: true,
      message: `${providerName} connected successfully`,
      provider: providerName,
    });
  })
);

// Test CalDAV connection (before saving)
router.post(
  '/caldav/test',
  authenticate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const isValid = await caldavCalendarService.testConnection({
      email,
      password,
    });

    if (!isValid) {
      throw new AppError('Invalid CalDAV credentials or server unreachable', 401);
    }

    const providerName = caldavCalendarService.getProviderName(email);

    return res.json({
      success: true,
      provider: providerName,
      message: 'Connection successful',
    });
  })
);

// CalDAV Sign-In (creates user + returns JWT)
router.post(
  '/caldav/signin',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('🔐 CalDAV sign-in attempt', { email });

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Test CalDAV connection
    const isValid = await caldavCalendarService.testConnection({
      email,
      password,
    });

    if (!isValid) {
      throw new AppError('Invalid CalDAV credentials or server unreachable', 401);
    }

    const providerName = caldavCalendarService.getProviderName(email);

    // Create or get user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // Update last login
      },
      create: {
        email,
        name: email.split('@')[0], // Use email prefix as default name
        preferences: {
          create: {},
        },
      },
      include: {
        calendarAccounts: true,
      },
    });

    logger.info('✅ User authenticated via CalDAV', {
      userId: user.id,
      email: user.email,
      isNew: !user.calendarAccounts.length,
    });

    // Check if this CalDAV account is already connected
    const existingAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: 'caldav',
        email: email,
      },
    });

    const defaultLabel = `${providerName} (${email})`;

    if (existingAccount) {
      // Update existing account
      await prisma.calendarAccount.update({
        where: { id: existingAccount.id },
        data: {
          // Store encrypted password (in production, use proper encryption!)
          accessToken: Buffer.from(password).toString('base64'),
          expiresAt: null, // CalDAV doesn't expire
        },
      });

      logger.info('✅ CalDAV account updated', {
        userId: user.id,
        email: email,
      });
    } else {
      // Create new account
      await prisma.calendarAccount.create({
        data: {
          userId: user.id,
          provider: 'caldav',
          email: email,
          label: defaultLabel,
          color: null,
          // Store encrypted password (in production, use proper encryption!)
          accessToken: Buffer.from(password).toString('base64'),
          refreshToken: null,
          expiresAt: null,
        },
      });

      logger.info('✅ CalDAV account created', {
        userId: user.id,
        email: email,
      });
    }

    // Generate JWT token (same as other OAuth providers)
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return token to frontend (matches OAuth callback pattern)
    return res.json({
      success: true,
      token,
      provider: providerName,
      message: `Signed in with ${providerName}`,
    });
  })
);

export default router;

