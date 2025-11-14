/**
 * Meeting Detection Utility
 * 
 * Determines if a meeting is currently active based on calendar data
 */

export interface MeetingWindow {
  meetingId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  minutesUntilStart: number;
  minutesUntilEnd: number;
}

/**
 * Check if a meeting is currently active
 * A meeting is considered "active" if:
 * - Current time is between startTime and endTime
 * - Or within 5 minutes before start (prep window)
 */
export function isMeetingActive(startTime: Date, endTime: Date): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // 5 minutes before meeting starts (prep window)
  const prepWindowStart = new Date(start.getTime() - 5 * 60 * 1000);
  
  return now >= prepWindowStart && now <= end;
}

/**
 * Get the currently active meeting from a list of meetings
 */
export function getActiveMeeting(meetings: Array<{
  id: string;
  title: string;
  startTime: string | Date;
  endTime?: string | Date;
  duration?: number; // in minutes
}>): MeetingWindow | null {
  const now = new Date();
  
  for (const meeting of meetings) {
    const startTime = new Date(meeting.startTime);
    const endTime = meeting.endTime 
      ? new Date(meeting.endTime)
      : new Date(startTime.getTime() + (meeting.duration || 60) * 60 * 1000);
    
    if (isMeetingActive(startTime, endTime)) {
      const minutesUntilStart = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / (60 * 1000)));
      const minutesUntilEnd = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (60 * 1000)));
      
      return {
        meetingId: meeting.id,
        title: meeting.title,
        startTime,
        endTime,
        isActive: now >= startTime && now <= endTime,
        minutesUntilStart,
        minutesUntilEnd,
      };
    }
  }
  
  return null;
}

/**
 * Store active meeting ID in localStorage for Level 1 cue polling
 */
export function setActiveMeetingId(meetingId: string | null): void {
  if (meetingId) {
    localStorage.setItem('meetcute_active_meeting_id', meetingId);
  } else {
    localStorage.removeItem('meetcute_active_meeting_id');
  }
}

/**
 * Get active meeting ID from localStorage
 */
export function getActiveMeetingId(): string | null {
  return localStorage.getItem('meetcute_active_meeting_id');
}

