import axios from 'axios';
import { logger } from '../../utils/logger';
import { CalendarEvent } from './googleCalendar';

export class OutlookCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  private graphApiBase = 'https://graph.microsoft.com/v1.0';

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || '';
  }

  getAuthUrl(userId?: string): string {
    const scopes = [
      'User.Read',
      'Calendars.Read',
      'Presence.Read',
      'CallRecords.Read.All',
      'OnlineMeetings.Read',
      'offline_access',
    ].join(' ');

    const params: any = {
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      response_mode: 'query',
    };

    // If userId is provided, include it in state to track which user is adding a calendar
    if (userId) {
      params.state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    }

    const urlParams = new URLSearchParams(params);
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${urlParams.toString()}`;
  }

  async getTokensFromCode(code: string) {
    try {
      const response = await axios.post(
        this.tokenEndpoint,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Error getting Outlook tokens', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const response = await axios.post(
        this.tokenEndpoint,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      logger.error('Error refreshing Outlook token', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  async getUpcomingEvents(
    accessToken: string,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    try {
      const startDateTime = (timeMin || new Date()).toISOString();
      const endDateTime = timeMax?.toISOString();

      let url = `${this.graphApiBase}/me/calendar/calendarView?startDateTime=${startDateTime}`;
      if (endDateTime) {
        url += `&endDateTime=${endDateTime}`;
      }
      url += '&$orderby=start/dateTime&$top=50';

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const events = response.data.value || [];

      return events.map((event: any) => ({
        id: event.id,
        summary: event.subject || 'Untitled Meeting',
        description: event.bodyPreview,
        start: new Date(event.start.dateTime + 'Z'),
        end: new Date(event.end.dateTime + 'Z'),
        attendees:
          event.attendees
            ?.filter((a: any) => a.emailAddress?.address)
            .map((a: any) => a.emailAddress.address) || [],
        location: event.location?.displayName,
        hangoutLink: event.onlineMeeting?.joinUrl,
      }));
    } catch (error: any) {
      logger.error('Error fetching Outlook Calendar events', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      const response = await axios.get(`${this.graphApiBase}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        email: response.data.mail || response.data.userPrincipalName,
        name: response.data.displayName,
      };
    } catch (error: any) {
      logger.error('Error fetching Outlook user info', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }
}

export const outlookCalendarService = new OutlookCalendarService();

