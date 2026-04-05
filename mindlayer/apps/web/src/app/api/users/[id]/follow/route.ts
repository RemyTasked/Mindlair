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
        { code: 'VALIDATION_ERROR', message: 'Cannot follow yourself' },
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

    // Check if blocked
    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: targetUserId, blockedId: user.id },
          { blockerId: user.id, blockedId: targetUserId },
        ],
      },
    });

    if (blocked) {
      return NextResponse.json(
        { code: 'BLOCKED', message: 'Cannot follow this user' },
        { status: 403 }
      );
    }

    // Check if already following
    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      return NextResponse.json({
        success: true,
        following: true,
        message: 'Already following',
      });
    }

    await db.follow.create({
      data: {
        followerId: user.id,
        followingId: targetUserId,
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_followed',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      following: true,
    });
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to follow user' },
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

    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      return NextResponse.json({
        success: true,
        following: false,
        message: 'Not following',
      });
    }

    await db.follow.delete({
      where: { id: follow.id },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_unfollowed',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      following: false,
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to unfollow user' },
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

    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      following: !!follow,
    });
  } catch (error) {
    console.error('Get follow status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get follow status' },
      { status: 500 }
    );
  }
}
