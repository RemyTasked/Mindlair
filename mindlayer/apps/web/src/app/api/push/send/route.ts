import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { 
  sendPushNotification, 
  sendNudgeNotification,
  sendDailyDigestNotification,
  sendTensionAlertNotification,
  type PushPayload 
} from '@/lib/services/push';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, payload } = body;

    let result;

    switch (type) {
      case 'test':
        result = await sendPushNotification(user.id, {
          title: 'Test Notification',
          body: 'Push notifications are working!',
          tag: 'test',
          data: { url: '/' },
        });
        break;

      case 'nudge':
        if (!payload.concept || !payload.sourceTitle || !payload.framing || !payload.url) {
          return NextResponse.json(
            { error: 'Missing required nudge fields' },
            { status: 400 }
          );
        }
        await sendNudgeNotification(user.id, payload);
        result = { sent: 1, failed: 0 };
        break;

      case 'digest':
        if (!payload.id || !payload.itemCount || !payload.summary) {
          return NextResponse.json(
            { error: 'Missing required digest fields' },
            { status: 400 }
          );
        }
        await sendDailyDigestNotification(user.id, payload);
        result = { sent: 1, failed: 0 };
        break;

      case 'tension':
        if (!payload.conceptA || !payload.conceptB || !payload.explanation) {
          return NextResponse.json(
            { error: 'Missing required tension fields' },
            { status: 400 }
          );
        }
        await sendTensionAlertNotification(user.id, payload);
        result = { sent: 1, failed: 0 };
        break;

      case 'custom':
        if (!payload.title || !payload.body) {
          return NextResponse.json(
            { error: 'Missing title or body' },
            { status: 400 }
          );
        }
        result = await sendPushNotification(user.id, payload as PushPayload);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    console.error('Send push error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
