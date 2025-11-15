/**
 * CalDAV Calendar Service
 * Supports Yahoo Calendar, iCloud Calendar, and any CalDAV-compatible server
 * No OAuth required - uses email + app password
 */

import dav from 'dav';
import { logger } from '../../utils/logger';

interface CalDAVConfig {
  email: string;
  password: string; // App password
  serverUrl?: string; // Optional - auto-detected if not provided
}

interface CalDAVEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  description?: string;
}

// Known CalDAV server endpoints
const CALDAV_SERVERS: Record<string, string> = {
  'yahoo.com': 'https://caldav.calendar.yahoo.com',
  'icloud.com': 'https://caldav.icloud.com',
  'me.com': 'https://caldav.icloud.com',
  'fastmail.com': 'https://caldav.fastmail.com',
  'fastmail.fm': 'https://caldav.fastmail.com',
};

class CalDAVCalendarService {
  /**
   * Detect CalDAV server URL from email domain
   */
  private detectServerUrl(email: string): string {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      throw new Error('Invalid email address');
    }

    // Check known providers
    if (CALDAV_SERVERS[domain]) {
      return CALDAV_SERVERS[domain];
    }

    // Default CalDAV autodiscovery URL
    return `https://caldav.${domain}`;
  }

  /**
   * Test CalDAV connection and credentials
   */
  async testConnection(config: CalDAVConfig): Promise<boolean> {
    try {
      const serverUrl = config.serverUrl || this.detectServerUrl(config.email);
      
      logger.info('🔍 Testing CalDAV connection', {
        email: config.email,
        serverUrl,
      });

      const xhr = new dav.transport.Basic(
        new dav.Credentials({
          username: config.email,
          password: config.password,
        })
      );

      const account = await dav.createAccount({
        server: serverUrl,
        xhr: xhr,
        accountType: 'caldav',
        loadCollections: false,
      });

      logger.info('✅ CalDAV connection successful', {
        email: config.email,
        principalUrl: account.principalUrl,
      });

      return true;
    } catch (error: any) {
      logger.error('❌ CalDAV connection failed', {
        email: config.email,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get CalDAV account and calendars
   */
  async getAccount(config: CalDAVConfig) {
    const serverUrl = config.serverUrl || this.detectServerUrl(config.email);

    logger.info('📅 Fetching CalDAV account', {
      email: config.email,
      serverUrl,
    });

    const xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: config.email,
        password: config.password,
      })
    );

    const account = await dav.createAccount({
      server: serverUrl,
      xhr: xhr,
      accountType: 'caldav',
      loadCollections: true,
    });

    logger.info('✅ CalDAV account fetched', {
      email: config.email,
      calendarsCount: account.calendars?.length || 0,
    });

    return account;
  }

  /**
   * Get events from CalDAV calendar
   */
  async getEvents(
    config: CalDAVConfig,
    startDate: Date,
    endDate: Date
  ): Promise<CalDAVEvent[]> {
    try {
      const account = await this.getAccount(config);

      if (!account.calendars || account.calendars.length === 0) {
        logger.warn('⚠️ No calendars found for CalDAV account', {
          email: config.email,
        });
        return [];
      }

      // Get events from all calendars
      const allEvents: CalDAVEvent[] = [];

      for (const calendar of account.calendars) {
        logger.info('📆 Syncing calendar', {
          email: config.email,
          calendarName: calendar.displayName,
        });

        const xhr = new dav.transport.Basic(
          new dav.Credentials({
            username: config.email,
            password: config.password,
          })
        );

        // Sync calendar objects
        await dav.syncCalendar(calendar, {
          xhr: xhr,
          syncMethod: 'basic',
          filters: [{
            type: 'comp-filter',
            attrs: { name: 'VCALENDAR' },
          }],
        });

        // Parse calendar objects
        for (const calendarObject of calendar.objects || []) {
          try {
            const events = this.parseICalendar(calendarObject.calendarData);
            
            // Filter events by date range
            const filteredEvents = events.filter(event => {
              return event.dtstart >= startDate && event.dtstart <= endDate;
            });

            allEvents.push(...filteredEvents);
          } catch (parseError: any) {
            logger.warn('⚠️ Failed to parse calendar object', {
              error: parseError.message,
            });
          }
        }
      }

      logger.info('✅ CalDAV events fetched', {
        email: config.email,
        eventsCount: allEvents.length,
      });

      return allEvents;
    } catch (error: any) {
      logger.error('❌ Failed to fetch CalDAV events', {
        email: config.email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse iCalendar data (simplified parser)
   */
  private parseICalendar(icalData: string): CalDAVEvent[] {
    const events: CalDAVEvent[] = [];
    
    // Split into individual VEVENT blocks
    const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    let match;

    while ((match = veventRegex.exec(icalData)) !== null) {
      const eventData = match[1];
      
      try {
        const event: Partial<CalDAVEvent> = {};

        // Extract UID
        const uidMatch = eventData.match(/UID:(.*)/);
        if (uidMatch) event.uid = uidMatch[1].trim();

        // Extract SUMMARY (title)
        const summaryMatch = eventData.match(/SUMMARY:(.*)/);
        if (summaryMatch) event.summary = summaryMatch[1].trim();

        // Extract DTSTART
        const dtstartMatch = eventData.match(/DTSTART[;:]([^\r\n]*)/);
        if (dtstartMatch) {
          event.dtstart = this.parseICalDate(dtstartMatch[1]);
        }

        // Extract DTEND
        const dtendMatch = eventData.match(/DTEND[;:]([^\r\n]*)/);
        if (dtendMatch) {
          event.dtend = this.parseICalDate(dtendMatch[1]);
        }

        // Extract LOCATION
        const locationMatch = eventData.match(/LOCATION:(.*)/);
        if (locationMatch) event.location = locationMatch[1].trim();

        // Extract DESCRIPTION
        const descriptionMatch = eventData.match(/DESCRIPTION:(.*)/);
        if (descriptionMatch) event.description = descriptionMatch[1].trim();

        // Only add if we have required fields
        if (event.uid && event.summary && event.dtstart && event.dtend) {
          events.push(event as CalDAVEvent);
        }
      } catch (error: any) {
        logger.warn('⚠️ Failed to parse VEVENT', { error: error.message });
      }
    }

    return events;
  }

  /**
   * Parse iCalendar date format
   */
  private parseICalDate(dateStr: string): Date {
    // Remove TZID parameter if present
    const cleanDate = dateStr.replace(/TZID=[^:]*:/, '');
    
    // Format: YYYYMMDDTHHMMSS or YYYYMMDD
    if (cleanDate.includes('T')) {
      // DateTime format: 20231115T140000
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      const hour = parseInt(cleanDate.substring(9, 11));
      const minute = parseInt(cleanDate.substring(11, 13));
      const second = parseInt(cleanDate.substring(13, 15));
      
      return new Date(year, month, day, hour, minute, second);
    } else {
      // Date only format: 20231115
      const year = parseInt(cleanDate.substring(0, 4));
      const month = parseInt(cleanDate.substring(4, 6)) - 1;
      const day = parseInt(cleanDate.substring(6, 8));
      
      return new Date(year, month, day);
    }
  }

  /**
   * Convert CalDAV event to our Meeting format
   */
  convertToMeeting(caldavEvent: CalDAVEvent, calendarAccountId: string) {
    return {
      calendarAccountId,
      externalId: caldavEvent.uid,
      title: caldavEvent.summary || 'Untitled Event',
      startTime: caldavEvent.dtstart,
      endTime: caldavEvent.dtend,
      meetingLink: null,
      attendeeCount: null,
      isRecurring: false,
      location: caldavEvent.location || null,
    };
  }

  /**
   * Get provider name from email domain
   */
  getProviderName(email: string): string {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain?.includes('yahoo')) return 'Yahoo Calendar';
    if (domain?.includes('icloud') || domain?.includes('me.com')) return 'iCloud Calendar';
    if (domain?.includes('fastmail')) return 'Fastmail Calendar';
    
    return 'CalDAV Calendar';
  }
}

export const caldavCalendarService = new CalDAVCalendarService();

