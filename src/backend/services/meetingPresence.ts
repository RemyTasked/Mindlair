import axios from 'axios';
import { CalendarAccount, Meeting, Prisma } from '@prisma/client';
import moment from 'moment-timezone';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { googleCalendarService } from './calendar/googleCalendar';
import { outlookCalendarService } from './calendar/outlookCalendar';

const GOOGLE_MEET_API_BASE = 'https://meet.googleapis.com/v1';
const MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const MICROSOFT_IN_CALL_ACTIVITIES = new Set([
  'InACall',
  'InAConferenceCall',
  'Presenting',
  'InAMeeting',
  'InAPresentation',
]);

interface PresenceDetectionResult {
  isActive: boolean;
  hasEnded: boolean;
  detectedStart?: Date;
  detectedEnd?: Date;
  source: string;
}

type AccountMap = Map<string, CalendarAccount>;

export async function updateMeetingPresence(
  meeting: Meeting,
  accountMap: AccountMap,
  now: Date
): Promise<{ meeting: Meeting; isActive: boolean; hasEnded: boolean; source: string }> {
  // If we already marked this meeting as ended, skip further checks
  if (meeting.actualEndTime) {
    return {
      meeting,
      isActive: false,
      hasEnded: true,
      source: meeting.statusSource || 'recorded_end',
    };
  }

  const meetingStart = new Date(meeting.startTime);
  const meetingEnd = new Date(meeting.endTime);

  // Only check presence within a reasonable window around the meeting
  const windowStart = new Date(meetingStart.getTime() - 15 * 60 * 1000); // 15 min before
  const windowEnd = new Date(meetingEnd.getTime() + 45 * 60 * 1000); // 45 min after

  if (now < windowStart || now > windowEnd) {
    return {
      meeting,
      isActive: false,
      hasEnded: Boolean(meeting.actualEndTime),
      source: 'outside_presence_window',
    };
  }

  const account = meeting.calendarAccountId
    ? accountMap.get(meeting.calendarAccountId)
    : undefined;
  const provider = account?.provider || meeting.calendarProvider || null;

  let presence: PresenceDetectionResult | null = null;

  try {
    if (provider === 'google') {
      presence = await detectGoogleMeetPresence(account, meeting, now);
    } else if (provider === 'microsoft') {
      presence = await detectMicrosoftPresence(account, now);
    }
  } catch (error: any) {
    logger.error('Presence detection failed', {
      meetingId: meeting.id,
      provider,
      error: error.message,
      stack: error.stack,
    });
  }

  // Fallback heuristic if we couldn't detect via provider APIs
  if (!presence) {
    const withinScheduledWindow =
      now.getTime() >= meetingStart.getTime() - 2 * 60 * 1000 &&
      now.getTime() <= meetingEnd.getTime() + 10 * 60 * 1000;

    presence = {
      isActive: withinScheduledWindow,
      hasEnded: now.getTime() > meetingEnd.getTime() + 10 * 60 * 1000,
      detectedStart: withinScheduledWindow ? now : undefined,
      detectedEnd: now.getTime() > meetingEnd.getTime() ? now : undefined,
      source: 'heuristic',
    };
  }

  const updates: Prisma.MeetingUpdateInput = {
    lastPresenceCheck: now,
  };

  let updatedMeeting = meeting;
  let shouldUpdate = false;

  if (presence.isActive && !meeting.actualStartTime) {
    updates.actualStartTime = presence.detectedStart || now;
    updates.status = 'active';
    updates.statusSource = presence.source;
    shouldUpdate = true;
  }

  if (presence.hasEnded && !meeting.actualEndTime) {
    updates.actualEndTime = presence.detectedEnd || now;
    updates.status = 'ended';
    updates.statusSource = presence.source;
    shouldUpdate = true;
  }

  if (!meeting.actualStartTime && presence.isActive === false && now > meetingStart) {
    // If we're past the scheduled start and never saw an active state, mark start heuristically
    updates.actualStartTime = meetingStart;
    updates.status = 'active';
    updates.statusSource = presence.source;
    shouldUpdate = true;
  }

  if (meeting.actualStartTime && !meeting.actualEndTime && !presence.isActive && now > meetingEnd) {
    // Gracefully close meetings that have gone past their scheduled end
    updates.actualEndTime = presence.detectedEnd || now;
    updates.status = 'ended';
    updates.statusSource = presence.source;
    shouldUpdate = true;
  }

  if (shouldUpdate) {
    updatedMeeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: updates,
    });
  } else {
    // Ensure lastPresenceCheck is persisted if nothing else changed
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { lastPresenceCheck: now },
    });
  }

  return {
    meeting: updatedMeeting,
    isActive: presence.isActive,
    hasEnded: presence.hasEnded || Boolean(updatedMeeting.actualEndTime),
    source: presence.source,
  };
}

async function detectGoogleMeetPresence(
  account: CalendarAccount | undefined,
  meeting: Meeting,
  now: Date
): Promise<PresenceDetectionResult | null> {
  if (!account) return null;
  if (!meeting.meetingLink || !meeting.meetingLink.includes('meet.google.com')) {
    return null;
  }

  const accessToken = await ensureGoogleAccessToken(account);
  if (!accessToken) return null;

  const match = meeting.meetingLink.match(/meet\.google\.com\/([a-z\-]+)/i);
  if (!match) return null;

  const meetingCode = match[1].split('?')[0];

  try {
    const response = await axios.get(`${GOOGLE_MEET_API_BASE}/spaces/${meetingCode}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        view: 'FULL',
      },
    });

    const data = response.data || {};
    const conference = data.activeConference || data.conference || {};
    const participants = data.activeParticipants?.participantCount
      ?? data.activeParticipants?.participants?.length
      ?? 0;
    const state = conference.conferenceState || conference.state || data.state;

    const isActive =
      state === 'CONFERENCE_STATE_STARTED' ||
      state === 'CONFERENCE_STATE_ACTIVE' ||
      state === 'ACTIVE' ||
      participants > 0;

    const hasEnded =
      state === 'CONFERENCE_STATE_ENDED' ||
      state === 'ENDED' ||
      Boolean(conference.endTime && new Date(conference.endTime).getTime() <= now.getTime());

    const detectedStart = conference.startTime ? new Date(conference.startTime) : undefined;
    const detectedEnd = conference.endTime ? new Date(conference.endTime) : undefined;

    if (!isActive && !hasEnded && participants === 0) {
      return null; // Let heuristic handle
    }

    return {
      isActive,
      hasEnded,
      detectedStart,
      detectedEnd,
      source: 'google_meet',
    };
  } catch (error: any) {
    const status = error.response?.status;

    // 403 indicates scope not granted yet
    if (status === 403) {
      logger.warn('Google Meet presence requires additional scopes', {
        accountId: account.id,
        userId: account.userId,
      });
    } else if (status !== 404) {
      logger.error('Failed to fetch Google Meet presence', {
        meetingId: meeting.id,
        status,
        error: error.response?.data || error.message,
      });
    }

    return null;
  }
}

async function detectMicrosoftPresence(
  account: CalendarAccount | undefined,
  now: Date
): Promise<PresenceDetectionResult | null> {
  if (!account) return null;

  const accessToken = await ensureMicrosoftAccessToken(account);
  if (!accessToken) return null;

  try {
    const response = await axios.get(`${MICROSOFT_GRAPH_BASE}/me/presence`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const activity: string | undefined = response.data?.activity;
    const isActive = activity ? MICROSOFT_IN_CALL_ACTIVITIES.has(activity) : false;

    return {
      isActive,
      hasEnded: !isActive,
      detectedStart: isActive ? now : undefined,
      source: 'microsoft_graph_presence',
    };
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 403) {
      logger.warn('Microsoft presence requires admin consent for Presence.Read', {
        accountId: account.id,
        userId: account.userId,
      });
    } else {
      logger.error('Failed to fetch Microsoft presence', {
        status,
        error: error.response?.data || error.message,
      });
    }
    return null;
  }
}

async function ensureGoogleAccessToken(account: CalendarAccount): Promise<string | null> {
  try {
    if (account.expiresAt && moment(account.expiresAt).isAfter(moment().add(1, 'minute'))) {
      return account.accessToken;
    }

    if (!account.refreshToken) {
      return account.accessToken;
    }

    const tokens = await googleCalendarService.refreshAccessToken(account.refreshToken);
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 55 * 60 * 1000);

    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.access_token || account.accessToken,
        expiresAt,
      },
    });

    account.accessToken = tokens.access_token || account.accessToken;
    account.expiresAt = expiresAt;
    return account.accessToken;
  } catch (error: any) {
    logger.error('Failed to refresh Google token for presence detection', {
      accountId: account.id,
      error: error.message,
    });
    return null;
  }
}

async function ensureMicrosoftAccessToken(account: CalendarAccount): Promise<string | null> {
  try {
    if (account.expiresAt && moment(account.expiresAt).isAfter(moment().add(1, 'minute'))) {
      return account.accessToken;
    }

    if (!account.refreshToken) {
      return account.accessToken;
    }

    const tokens = await outlookCalendarService.refreshAccessToken(account.refreshToken);
    const expiresAt = new Date(Date.now() + Math.min(Number(tokens.expires_in) || 3600, 3600) * 1000);

    await prisma.calendarAccount.update({
      where: { id: account.id },
      data: {
        accessToken: tokens.access_token || account.accessToken,
        refreshToken: tokens.refresh_token || account.refreshToken,
        expiresAt,
      },
    });

    account.accessToken = tokens.access_token || account.accessToken;
    account.refreshToken = tokens.refresh_token || account.refreshToken;
    account.expiresAt = expiresAt;

    return account.accessToken;
  } catch (error: any) {
    logger.error('Failed to refresh Microsoft token for presence detection', {
      accountId: account.id,
      error: error.message,
    });
    return null;
  }
}

