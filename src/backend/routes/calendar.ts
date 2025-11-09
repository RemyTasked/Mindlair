import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Update account metadata (label/color/isPrimary)
router.put(
  '/accounts/:accountId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { label, color, isPrimary } = req.body;

    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });

    if (!account) {
      throw new AppError('Calendar account not found', 404);
    }

    if (typeof label === 'string') {
      account.label = label.trim();
    }
    if (typeof color === 'string') {
      account.color = color.trim() || null;
    } else if (color === null) {
      account.color = null;
    }

    if (typeof isPrimary === 'boolean' && isPrimary !== account.isPrimary) {
      await prisma.calendarAccount.updateMany({
        where: { userId: req.userId, provider: account.provider },
        data: { isPrimary: false },
      });
      account.isPrimary = true;
    }

    const updated = await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        label: account.label,
        color: account.color,
        isPrimary: account.isPrimary,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        label: true,
        color: true,
        isPrimary: true,
        createdAt: true,
      },
    });

    res.json({ account: updated });
  })
);

// Set a primary calendar for a provider
router.post(
  '/accounts/:accountId/primary',
  authenticate,
  asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const account = await prisma.calendarAccount.findFirst({
      where: { id: accountId, userId: req.userId },
    });

    if (!account) {
      throw new AppError('Calendar account not found', 404);
    }

    await prisma.calendarAccount.updateMany({
      where: { userId: req.userId, provider: account.provider },
      data: { isPrimary: false },
    });

    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: { isPrimary: true },
    });

    res.json({ message: 'Primary calendar updated' });
  })
);

export default router;

