import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { z } from 'zod';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

// Schema for extension token verification
const verifyExtensionTokenSchema = z.object({
  token: z.string(),
});

// Schema for extension login with Google token
const extensionGoogleLoginSchema = z.object({
  googleAccessToken: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});

/**
 * Verify an existing JWT token from the extension
 * Used when extension has a stored token and wants to validate it
 */
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { token } = verifyExtensionTokenSchema.parse(req.body);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
        },
      });

      if (!user) {
        return res.status(401).json({ valid: false, error: 'User not found' });
      }

      logger.info('Extension token verified', { userId: user.id });
      
      return res.json({
        valid: true,
        user,
      });
    } catch (error) {
      logger.warn('Invalid extension token');
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  })
);

/**
 * Exchange Google OAuth token for Mind Garden JWT
 * Used by extension after Google OAuth flow
 */
router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { googleAccessToken, email, name, picture } = extensionGoogleLoginSchema.parse(req.body);

    // Verify the Google token by fetching user info
    try {
      const googleResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });

      if (!googleResponse.ok) {
        logger.warn('Invalid Google token from extension');
        return res.status(401).json({ error: 'Invalid Google token' });
      }

      const googleUser = await googleResponse.json();

      // Verify email matches
      if (googleUser.email !== email) {
        return res.status(401).json({ error: 'Email mismatch' });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || name,
            picture: googleUser.picture || picture,
            provider: 'google',
            providerId: googleUser.id,
          },
        });
        logger.info('New user created from extension', { userId: user.id, email: user.email });
      } else {
        // Update existing user info if needed
        if (googleUser.name || googleUser.picture) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: googleUser.name || user.name,
              picture: googleUser.picture || user.picture,
            },
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      logger.info('Extension login successful', { userId: user.id });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      });
    } catch (error) {
      logger.error('Extension Google login error', { error });
      return res.status(500).json({ error: 'Authentication failed' });
    }
  })
);

/**
 * Get a short-lived extension token for authenticated web users
 * Used when user is logged in on web and wants to connect extension
 */
router.get(
  '/web-connect',
  asyncHandler(async (req, res) => {
    // Check for existing web session
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate a short-lived token for extension
      const extensionToken = jwt.sign(
        { userId: user.id, type: 'extension' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      logger.info('Web-to-extension token generated', { userId: user.id });

      return res.json({
        token: extensionToken,
        user,
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  })
);

/**
 * Logout endpoint for extension
 * Invalidates the extension session
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    // In a production system, you might want to maintain a token blacklist
    // For now, the client just needs to clear the stored token
    logger.info('Extension logout requested');
    return res.json({ success: true });
  })
);

export default router;

