import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { updateBeliefGraph } from '@/lib/services/belief-graph';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stance, note } = body;

    if (!stance || !['agree', 'disagree', 'complicated', 'skip'].includes(stance)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Valid stance is required (agree, disagree, complicated, skip)' },
        { status: 400 }
      );
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        source: {
          include: {
            claims: {
              include: {
                claimConcepts: true,
              },
            },
          },
        },
      },
    });

    if (!post || post.status !== 'published') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Published post not found' },
        { status: 404 }
      );
    }

    // Check if user is blocked by author
    const blocked = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: post.authorId,
          blockedId: user.id,
        },
      },
    });

    if (blocked) {
      return NextResponse.json(
        { code: 'BLOCKED', message: 'You cannot react to this post' },
        { status: 403 }
      );
    }

    // Check rate limit for new accounts
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

    if (isNewAccount) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayReactions = await db.postReaction.count({
        where: {
          userId: user.id,
          createdAt: { gte: todayStart },
        },
      });

      if (todayReactions >= 50) {
        return NextResponse.json(
          { code: 'RATE_LIMITED', message: 'New accounts are limited to 50 reactions per day' },
          { status: 429 }
        );
      }
    }

    // Check if user already reacted
    const existingReaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    let reaction;

    if (existingReaction) {
      // Update existing reaction
      reaction = await db.postReaction.update({
        where: { id: existingReaction.id },
        data: { stance, note },
      });

      await db.analyticsEvent.create({
        data: {
          userId: user.id,
          type: 'post_reaction_updated',
          surface: 'web',
          payload: {
            postId,
            previousStance: existingReaction.stance,
            newStance: stance,
          },
        },
      });
    } else {
      // Create new reaction
      reaction = await db.postReaction.create({
        data: {
          postId,
          userId: user.id,
          stance,
          note,
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId: user.id,
          type: 'post_reaction_created',
          surface: 'web',
          payload: { postId, stance },
        },
      });
    }

    // Update user's belief graph based on reaction
    if (post.source?.claims && stance !== 'skip') {
      for (const claim of post.source.claims) {
        // Find existing position to potentially supersede
        const existingPosition = await db.position.findFirst({
          where: {
            userId: user.id,
            claimId: claim.id,
            context: 'post_reaction',
          },
          orderBy: { createdAt: 'desc' },
        });

        // Create new position (superseding if exists)
        await db.position.create({
          data: {
            userId: user.id,
            claimId: claim.id,
            stance,
            note,
            context: 'post_reaction',
            supersedesId: existingPosition?.id,
          },
        });

        // Update belief graph
        const conceptIds = claim.claimConcepts.map(cc => cc.conceptId);
        await updateBeliefGraph(
          user.id,
          claim.id,
          stance as 'agree' | 'disagree' | 'complicated',
          conceptIds
        );
      }
    }

    // Get updated reaction counts now that user has reacted
    const counts = await db.postReaction.groupBy({
      by: ['stance'],
      where: { postId },
      _count: true,
    });

    const reactionCounts = counts.reduce((acc, c) => {
      acc[c.stance] = c._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      reaction: {
        stance: reaction.stance,
        note: reaction.note,
      },
      reactionCounts,
    });
  } catch (error) {
    console.error('Post reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to react to post' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const reaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    if (!reaction) {
      return NextResponse.json({
        hasReacted: false,
        reaction: null,
        reactionCounts: null,
      });
    }

    // Get reaction counts only if user has reacted
    const counts = await db.postReaction.groupBy({
      by: ['stance'],
      where: { postId },
      _count: true,
    });

    const reactionCounts = counts.reduce((acc, c) => {
      acc[c.stance] = c._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      hasReacted: true,
      reaction: {
        stance: reaction.stance,
        note: reaction.note,
      },
      reactionCounts,
    });
  } catch (error) {
    console.error('Get reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const reaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    if (!reaction) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Reaction not found' },
        { status: 404 }
      );
    }

    await db.postReaction.delete({
      where: { id: reaction.id },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'post_reaction_deleted',
        surface: 'web',
        payload: { postId, previousStance: reaction.stance },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete reaction' },
      { status: 500 }
    );
  }
}
