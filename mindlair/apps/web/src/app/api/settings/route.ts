import { NextRequest, NextResponse } from 'next/server';
import { updateSettingsSchema } from '@/lib/validations';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;

    let settings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Create default settings
      settings = await db.userSettings.create({
        data: { userId },
      });
    }

    const userProfile = await db.user.findUnique({
      where: { id: userId },
      select: { timezone: true, name: true },
    });

    return NextResponse.json({
      displayName: userProfile?.name ?? null,
      digestWindows: {
        morning: {
          enabled: settings.morningDigestEnabled,
          hour: settings.morningDigestHour,
          minute: settings.morningDigestMinute,
        },
        evening: {
          enabled: settings.eveningDigestEnabled,
          hour: settings.eveningDigestHour,
          minute: settings.eveningDigestMinute,
        },
      },
      notifications: {
        push: settings.pushEnabled,
        email: settings.emailEnabled,
        newPost: settings.notifyOnNewPost,
      },
      timezone: userProfile?.timezone || 'America/New_York',
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.message },
        { status: 400 }
      );
    }

    const data = validation.data;

    const userId = user.id;

    const updateData: Record<string, unknown> = {};

    if (data.digestWindows?.morning) {
      updateData.morningDigestEnabled = data.digestWindows.morning.enabled;
      updateData.morningDigestHour = data.digestWindows.morning.hour;
      updateData.morningDigestMinute = data.digestWindows.morning.minute;
    }

    if (data.digestWindows?.evening) {
      updateData.eveningDigestEnabled = data.digestWindows.evening.enabled;
      updateData.eveningDigestHour = data.digestWindows.evening.hour;
      updateData.eveningDigestMinute = data.digestWindows.evening.minute;
    }

    if (data.notifications) {
      if (data.notifications.push !== undefined) {
        updateData.pushEnabled = data.notifications.push;
      }
      if (data.notifications.email !== undefined) {
        updateData.emailEnabled = data.notifications.email;
      }
      if (data.notifications.newPost !== undefined) {
        updateData.notifyOnNewPost = data.notifications.newPost;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.userSettings.upsert({
        where: { userId },
        update: updateData,
        create: { userId, ...updateData },
      });
    }

    if (data.timezone) {
      await db.user.update({
        where: { id: userId },
        data: { timezone: data.timezone },
      });
    }

    if (data.displayName !== undefined) {
      const normalized = data.displayName.trim();
      await db.user.update({
        where: { id: userId },
        data: { name: normalized },
      });

      // Backfill the denormalized author byline on past self-published sources
      // so the UI promise ("Changing your name updates how past content shows
      // as well") actually holds for the feed/genealogy byline.
      await db.source.updateMany({
        where: { userId, surface: 'mindlair_publish' },
        data: { author: normalized },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
