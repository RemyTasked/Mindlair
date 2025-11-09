import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../utils/logger';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string;
  hangoutLink?: string;
  isOrganizer?: boolean; // Is the user the organizer/host?
  calendarLabel?: string;
  calendarColor?: string | null;
  calendarAccountId?: string;
  calendarProvider?: string;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      prompt: 'consent',
    });
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  async getUpcomingEvents(
    accessToken: string,
    refreshToken?: string,
    timeMin?: Date,
    timeMax?: Date,
    userEmail?: string
  ): Promise<CalendarEvent[]> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: (timeMin || new Date()).toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      return events
        .filter((event) => event.start?.dateTime && event.end?.dateTime)
        .map((event) => {
          // Check if user is the organizer
          // User is organizer if: event.organizer.email matches userEmail OR if organizer.self is true
          const isOrganizer = 
            event.organizer?.self === true || 
            (userEmail && event.organizer?.email === userEmail);

          return {
            id: event.id!,
            summary: event.summary || 'Untitled Meeting',
            description: event.description || undefined,
            start: new Date(event.start!.dateTime!),
            end: new Date(event.end!.dateTime!),
            attendees:
              event.attendees
                ?.filter((a) => a.email)
                .map((a) => a.email!) || [],
            location: event.location || undefined,
            hangoutLink: event.hangoutLink || undefined,
            isOrganizer: isOrganizer || false,
          };
        });
    } catch (error: any) {
      logger.error('Error fetching Google Calendar events', {
        error: error.message,
      });
      throw error;
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2',
      });

      const { data } = await oauth2.userinfo.get();
      
      return {
        email: data.email!,
        name: data.name,
      };
    } catch (error: any) {
      logger.error('Error fetching Google user info', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();

