import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { OpenAI } from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Submit post-meeting reflection
router.post('/:meetingId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const { rating, oneWord, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!rating || !['great', 'neutral', 'draining'].includes(rating)) {
      res.status(400).json({ error: 'Invalid rating' });
      return;
    }

    // Verify meeting belongs to user
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId
      }
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Analyze emotional tone using AI if oneWord is provided
    let emotionalTone = null;
    if (oneWord && process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an emotional intelligence analyst. Given a word describing a meeting and its rating, provide a brief 2-3 word emotional tone analysis. Be concise and insightful.'
            },
            {
              role: 'user',
              content: `Meeting rating: ${rating}\nUser's word: "${oneWord}"\n\nProvide emotional tone:`
            }
          ],
          max_tokens: 20,
          temperature: 0.7
        });

        emotionalTone = completion.choices[0]?.message?.content?.trim() || null;
      } catch (error) {
        logger.error('Failed to analyze emotional tone', { error });
        // Continue without emotional tone
      }
    }

    // Update meeting with reflection
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        reflectionRating: rating,
        reflectionOneWord: oneWord || null,
        reflectionNotes: notes || null,
        reflectionEmotionalTone: emotionalTone,
        reflectionCapturedAt: new Date()
      }
    });

    logger.info('Post-meeting reflection captured', {
      meetingId,
      userId,
      rating,
      hasOneWord: !!oneWord,
      emotionalTone
    });

    res.json({
      success: true,
      reflection: {
        rating: updatedMeeting.reflectionRating,
        oneWord: updatedMeeting.reflectionOneWord,
        emotionalTone: updatedMeeting.reflectionEmotionalTone,
        capturedAt: updatedMeeting.reflectionCapturedAt
      }
    });
  } catch (error: any) {
    logger.error('Error submitting reflection', { error: error.message });
    res.status(500).json({ error: 'Failed to submit reflection' });
  }
});

// Get reflection insights for dashboard
router.get('/insights', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get recent meetings with reflections
    const recentMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        reflectionCapturedAt: { not: null }
      },
      orderBy: { reflectionCapturedAt: 'desc' },
      take: 20
    });

    // Calculate insights
    const totalReflections = recentMeetings.length;
    
    if (totalReflections === 0) {
      res.json({
        hasData: false,
        stats: null
      });
      return;
    }

    // Count ratings
    const ratingCounts = {
      great: recentMeetings.filter(m => m.reflectionRating === 'great').length,
      neutral: recentMeetings.filter(m => m.reflectionRating === 'neutral').length,
      draining: recentMeetings.filter(m => m.reflectionRating === 'draining').length
    };

    // Determine average rating
    let averageRating: string;
    if (ratingCounts.great > ratingCounts.neutral && ratingCounts.great > ratingCounts.draining) {
      averageRating = 'great';
    } else if (ratingCounts.draining > ratingCounts.great && ratingCounts.draining > ratingCounts.neutral) {
      averageRating = 'draining';
    } else {
      averageRating = 'neutral';
    }

    // Find most common word
    const words = recentMeetings
      .filter(m => m.reflectionOneWord)
      .map(m => m.reflectionOneWord!.toLowerCase());
    
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonWord = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Detect energy trend (last 3 vs previous 3)
    let energyTrend: string | null = null;
    if (totalReflections >= 6) {
      const recent3 = recentMeetings.slice(0, 3);
      const previous3 = recentMeetings.slice(3, 6);

      const recentScore = recent3.reduce((sum, m) => {
        if (m.reflectionRating === 'great') return sum + 2;
        if (m.reflectionRating === 'neutral') return sum + 1;
        return sum;
      }, 0);

      const previousScore = previous3.reduce((sum, m) => {
        if (m.reflectionRating === 'great') return sum + 2;
        if (m.reflectionRating === 'neutral') return sum + 1;
        return sum;
      }, 0);

      if (recentScore > previousScore) {
        energyTrend = 'rising';
      } else if (recentScore < previousScore) {
        energyTrend = 'falling';
      } else {
        energyTrend = 'stable';
      }
    }

    res.json({
      hasData: true,
      stats: {
        totalMeetings: totalReflections,
        averageRating,
        mostCommonWord,
        energyTrend,
        ratingCounts
      },
      recentReflections: recentMeetings.slice(0, 5).map(m => ({
        id: m.id,
        title: m.title,
        rating: m.reflectionRating,
        oneWord: m.reflectionOneWord,
        emotionalTone: m.reflectionEmotionalTone,
        capturedAt: m.reflectionCapturedAt
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching reflection insights', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

export default router;

