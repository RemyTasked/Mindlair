import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already blocked
    const existingBlock = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: targetUserId,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json({
        success: true,
        blocked: true,
        message: 'Already blocked',
      });
    }

    // Create block
    await db.block.create({
      data: {
        blockerId: user.id,
        blockedId: targetUserId,
      },
    });

    // Also remove any follows in both directions
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: user.id },
        ],
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_blocked',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      blocked: true,
    });
  } catch (error) {
    console.error('Block error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to block user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const block = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: targetUserId,
        },
      },
    });

    if (!block) {
      return NextResponse.json({
        success: true,
        blocked: false,
        message: 'Not blocked',
      });
    }

    await db.block.delete({
      where: { id: block.id },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_unblocked',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      blocked: false,
    });
  } catch (error) {
    console.error('Unblock error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const block = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: targetUserId,
        },
      },
    });

    const blockedBy = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: targetUserId,
          blockedId: user.id,
        },
      },
    });

    return NextResponse.json({
      blocked: !!block,
      blockedBy: !!blockedBy,
    });
  } catch (error) {
    console.error('Get block status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get block status' },
      { status: 500 }
    );
  }
}
