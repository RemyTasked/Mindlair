import express, { Request } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

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

