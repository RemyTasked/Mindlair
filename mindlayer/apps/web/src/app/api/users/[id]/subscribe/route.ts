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
        { code: 'VALIDATION_ERROR', message: 'Cannot subscribe to yourself' },
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
        { code: 'BLOCKED', message: 'Cannot subscribe to this user' },
        { status: 403 }
      );
    }

    // Check if already subscribed
    const existingSubscription = await db.subscription.findUnique({
      where: {
        subscriberId_subscribedToId: {
          subscriberId: user.id,
          subscribedToId: targetUserId,
        },
      },
    });

    if (existingSubscription) {
      return NextResponse.json({
        success: true,
        subscribed: true,
        message: 'Already subscribed',
      });
    }

    await db.subscription.create({
      data: {
        subscriberId: user.id,
        subscribedToId: targetUserId,
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_subscribed',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      subscribed: true,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to subscribe to user' },
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

    const subscription = await db.subscription.findUnique({
      where: {
        subscriberId_subscribedToId: {
          subscriberId: user.id,
          subscribedToId: targetUserId,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        subscribed: false,
        message: 'Not subscribed',
      });
    }

    await db.subscription.delete({
      where: { id: subscription.id },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'user_unsubscribed',
        surface: 'web',
        payload: { targetUserId },
      },
    });

    return NextResponse.json({
      success: true,
      subscribed: false,
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to unsubscribe from user' },
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

    const subscription = await db.subscription.findUnique({
      where: {
        subscriberId_subscribedToId: {
          subscriberId: user.id,
          subscribedToId: targetUserId,
        },
      },
    });

    return NextResponse.json({
      subscribed: !!subscription,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
