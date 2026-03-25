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
    const { subscription, deviceName } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    const existingSubscription = await db.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existingSubscription) {
      await db.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: request.headers.get('user-agent') || undefined,
          deviceName: deviceName || undefined,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated' 
      });
    }

    await db.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get('user-agent') || undefined,
        deviceName: deviceName || undefined,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription created' 
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscriptions' },
      { status: 500 }
    );
  }
}
