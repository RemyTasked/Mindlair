/**
 * Webex Calendar Service
 * Handles OAuth and calendar integration for Cisco Webex
 */

import axios from 'axios';
import { logger } from '../../utils/logger';

const WEBEX_CLIENT_ID = process.env.WEBEX_CLIENT_ID;
const WEBEX_CLIENT_SECRET = process.env.WEBEX_CLIENT_SECRET;
const WEBEX_REDIRECT_URI = process.env.WEBEX_REDIRECT_URI;

const WEBEX_AUTH_URL = 'https://webexapis.com/v1/authorize';
const WEBEX_TOKEN_URL = 'https://webexapis.com/v1/access_token';
const WEBEX_API_BASE = 'https://webexapis.com/v1';

interface WebexTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface WebexUserInfo {
  id: string;
  emails: string[];
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  orgId: string;
}

interface WebexMeeting {
  id: string;
  title: string;
  start: string;
  end: string;
  meetingNumber?: string;
  webLink?: string;
  hostEmail?: string;
}

class WebexCalendarService {
  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(userId?: string): string {
    if (!WEBEX_CLIENT_ID || !WEBEX_REDIRECT_URI) {
      throw new Error('Webex OAuth credentials not configured');
    }

    const scopes = [
      'spark:people_read',
      'spark-compliance:meetings_read',
    ].join(' ');

    // Encode userId in state parameter for multi-calendar support
    const state = userId 
      ? Buffer.from(JSON.stringify({ userId })).toString('base64')
      : Buffer.from(JSON.stringify({})).toString('base64');

    const params = new URLSearchParams({
      client_id: WEBEX_CLIENT_ID,
      response_type: 'code',
      redirect_uri: WEBEX_REDIRECT_URI,
      scope: scopes,
      state,
    });

    const authUrl = `${WEBEX_AUTH_URL}?${params.toString()}`;
    logger.info('🔗 Generated Webex OAuth URL', { hasUserId: !!userId });
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<WebexTokens> {
    if (!WEBEX_CLIENT_ID || !WEBEX_CLIENT_SECRET || !WEBEX_REDIRECT_URI) {
      throw new Error('Webex OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        WEBEX_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: WEBEX_CLIENT_ID,
          client_secret: WEBEX_CLIENT_SECRET,
          code,
          redirect_uri: WEBEX_REDIRECT_URI,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info('✅ Webex tokens received');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to exchange Webex code for tokens', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<WebexTokens> {
    if (!WEBEX_CLIENT_ID || !WEBEX_CLIENT_SECRET) {
      throw new Error('Webex OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        WEBEX_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: WEBEX_CLIENT_ID,
          client_secret: WEBEX_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      logger.info('✅ Webex token refreshed');
      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to refresh Webex token', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get user info from Webex
   */
  async getUserInfo(accessToken: string): Promise<WebexUserInfo> {
    try {
      const response = await axios.get(`${WEBEX_API_BASE}/people/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      logger.info('✅ Webex user info received', {
        email: response.data.emails?.[0],
        name: response.data.displayName,
      });

      return response.data;
    } catch (error: any) {
      logger.error('❌ Failed to get Webex user info', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Get upcoming meetings from Webex
   */
  async getUpcomingMeetings(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<WebexMeeting[]> {
    try {
      // Webex Meetings API
      const response = await axios.get(`${WEBEX_API_BASE}/meetings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          max: 100, // Maximum meetings to fetch
        },
      });

      logger.info('✅ Webex meetings fetched', {
        count: response.data.items?.length || 0,
      });

      return response.data.items || [];
    } catch (error: any) {
      logger.error('❌ Failed to fetch Webex meetings', {
        error: error.response?.data || error.message,
      });
      throw error;
    }
  }

  /**
   * Convert Webex meeting to our Meeting format
   */
  convertToMeeting(webexMeeting: WebexMeeting, calendarAccountId: string) {
    return {
      calendarAccountId,
      externalId: webexMeeting.id,
      title: webexMeeting.title || 'Webex Meeting',
      startTime: new Date(webexMeeting.start),
      endTime: new Date(webexMeeting.end),
      meetingLink: webexMeeting.webLink || null,
      attendeeCount: null, // Webex API doesn't provide this easily
      isRecurring: false, // Would need additional API call to determine
      location: 'Webex',
    };
  }
}

export const webexCalendarService = new WebexCalendarService();

