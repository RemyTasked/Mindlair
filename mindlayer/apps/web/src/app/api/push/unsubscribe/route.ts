import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, subscriptionId } = body;

    if (!endpoint && !subscriptionId) {
      return NextResponse.json(
        { error: 'Either endpoint or subscriptionId is required' },
        { status: 400 }
      );
    }

    if (subscriptionId) {
      await db.pushSubscription.deleteMany({
        where: {
          id: subscriptionId,
          userId: user.id,
        },
      });
    } else if (endpoint) {
      await db.pushSubscription.deleteMany({
        where: {
          endpoint,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription removed' 
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.pushSubscription.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'All subscriptions removed' 
    });
  } catch (error) {
    console.error('Delete all subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscriptions' },
      { status: 500 }
    );
  }
}
