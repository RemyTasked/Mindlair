/**
 * Mind Garden - Chrome Extension Background Service Worker
 * 
 * Handles authentication, API calls, calendar event monitoring,
 * stress forecasting, and flow triggers.
 */

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const PROD_API_BASE_URL = 'https://mindgarden.app/api';

// State
let authToken = null;
let userProfile = null;
let todaysMeetings = [];
let gardenState = null;

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🌱 Mind Garden extension installed/updated:', details.reason);
  
  // Initialize default settings
  await chrome.storage.local.set({
    settings: {
      notificationTiming: 10, // minutes before meeting
      autoSuggestFlows: true,
      ambientAutoPlay: false,
      theme: 'zen',
      voice: 'calm',
    },
    flowHistory: [],
    dailyFlowCount: 0,
    lastSyncTime: null,
  });
  
  // Set up daily reset alarm
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60,
  });
  
  // Show welcome notification
  if (details.reason === 'install') {
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Welcome to Mind Garden! 🌱',
      message: 'Click the extension icon to get started and connect your calendar.',
    });
  }
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('⏰ Alarm fired:', alarm.name);
  
  if (alarm.name === 'dailyReset') {
    await chrome.storage.local.set({ dailyFlowCount: 0 });
    console.log('🌅 Daily flow count reset');
  } else if (alarm.name.startsWith('meeting-')) {
    const meetingId = alarm.name.replace('meeting-', '');
    await triggerPreMeetingFlow(meetingId);
  } else if (alarm.name.startsWith('post-meeting-')) {
    const meetingId = alarm.name.replace('post-meeting-', '');
    await triggerPostMeetingFlow(meetingId);
  }
});

async function triggerPreMeetingFlow(meetingId) {
  const meeting = todaysMeetings.find(m => m.id === meetingId);
  if (!meeting) return;
  
  const minutesUntil = getMinutesUntil(meeting.startTime);
  const suggestedFlow = getSuggestedFlow(meeting, 'pre');
  
  chrome.notifications.create(`pre-flow-${meetingId}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: '🎯 Time to Prepare',
    message: `"${meeting.title}" starts in ${minutesUntil} minutes. Take a ${suggestedFlow.name}?`,
    buttons: [
      { title: 'Start Flow' },
      { title: 'Skip' },
    ],
    requireInteraction: true,
  });
}

async function triggerPostMeetingFlow(meetingId) {
  const meeting = todaysMeetings.find(m => m.id === meetingId);
  if (!meeting) return;
  
  chrome.notifications.create(`post-flow-${meetingId}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: '🌊 Meeting Complete',
    message: `"${meeting.title}" just ended. Take 90 seconds to decompress?`,
    buttons: [
      { title: 'Start Flow' },
      { title: 'Skip' },
    ],
    requireInteraction: true,
  });
}

function getSuggestedFlow(meeting, timing) {
  const title = meeting.title.toLowerCase();
  
  if (timing === 'pre') {
    if (title.includes('presentation') || title.includes('demo') || title.includes('pitch')) {
      return { id: 'pre-presentation-power', name: 'Pre-Presentation Power' };
    }
    if (title.includes('difficult') || title.includes('feedback') || title.includes('review')) {
      return { id: 'difficult-conversation-prep', name: 'Difficult Conversation Prep' };
    }
    return { id: 'pre-meeting-focus', name: 'Pre-Meeting Focus' };
  }
  
  return { id: 'post-meeting-decompress', name: 'Post-Meeting Decompress' };
}

function getMinutesUntil(isoTime) {
  const targetTime = new Date(isoTime).getTime();
  return Math.max(0, Math.round((targetTime - Date.now()) / (1000 * 60)));
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // Start Flow
    let flowId = 'quick-reset';
    
    if (notificationId.includes('pre-flow')) {
      flowId = 'pre-meeting-focus';
    } else if (notificationId.includes('post-flow')) {
      flowId = 'post-meeting-decompress';
    }
    
    chrome.tabs.create({ url: `http://localhost:5173/flow/${flowId}` });
  }
  
  chrome.notifications.clear(notificationId);
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message.type);
  
  const handleAsync = async () => {
    switch (message.type) {
      case 'GET_AUTH_STATUS':
        return { authenticated: !!authToken, user: userProfile };
        
      case 'LOGIN':
        return await handleLogin(message.token, message.provider);
        
      case 'LOGOUT':
        return await handleLogout();
        
      case 'SYNC_MEETINGS':
        return await syncMeetings(message.meetings);
        
      case 'GET_STRESS_FORECAST':
        return calculateStressForecast();
        
      case 'COMPLETE_FLOW':
        return await completeFlow(message.flowType, message.meetingId);
        
      case 'GET_GARDEN_STATE':
        return gardenState || { streak: 0, health: 'idle' };
        
      case 'GET_TODAYS_MEETINGS':
        return todaysMeetings;
        
      case 'GET_SETTINGS':
        const { settings } = await chrome.storage.local.get('settings');
        return settings;
        
      case 'UPDATE_SETTINGS':
        await chrome.storage.local.set({ settings: message.settings });
        return { success: true };
        
      default:
        return { error: 'Unknown message type' };
    }
  };
  
  handleAsync().then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleLogin(token, provider = 'google') {
  try {
    authToken = token;
    
    // Fetch user profile from Google
    if (provider === 'google') {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const googleProfile = await response.json();
        userProfile = {
          id: googleProfile.id,
          email: googleProfile.email,
          name: googleProfile.name,
          picture: googleProfile.picture,
        };
      }
    }
    
    // Store auth data
    await chrome.storage.local.set({ 
      authToken: token, 
      userProfile,
      authProvider: provider,
    });
    
    // Fetch garden state from backend
    await fetchGardenState();
    
    // Fetch calendar events
    if (provider === 'google') {
      await fetchGoogleCalendarEvents();
    }
    
    return { success: true, user: userProfile };
  } catch (error) {
    console.error('Login error:', error);
    authToken = null;
    userProfile = null;
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  // Revoke Google token if applicable
  if (authToken) {
    chrome.identity.removeCachedAuthToken({ token: authToken });
  }
  
  authToken = null;
  userProfile = null;
  gardenState = null;
  todaysMeetings = [];
  
  await chrome.storage.local.remove(['authToken', 'userProfile', 'authProvider']);
  
  // Clear meeting alarms
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-') || alarm.name.startsWith('post-meeting-')) {
      chrome.alarms.clear(alarm.name);
    }
  }
  
  return { success: true };
}

async function fetchGoogleCalendarEvents() {
  if (!authToken) return;
  
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      const meetings = (data.items || []).map(event => ({
        id: event.id,
        title: event.summary || 'Untitled Meeting',
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        attendees: event.attendees?.length || 0,
        isOrganizer: event.organizer?.self || false,
      }));
      
      await syncMeetings(meetings);
    }
  } catch (error) {
    console.error('Failed to fetch calendar:', error);
  }
}

async function syncMeetings(meetings) {
  todaysMeetings = meetings;
  
  // Clear existing meeting alarms
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-') || alarm.name.startsWith('post-meeting-')) {
      chrome.alarms.clear(alarm.name);
    }
  }
  
  // Set up new alarms for each meeting
  const { settings } = await chrome.storage.local.get('settings');
  const notificationMinutes = settings?.notificationTiming || 10;
  
  const now = Date.now();
  for (const meeting of meetings) {
    const meetingStart = new Date(meeting.startTime).getTime();
    const meetingEnd = new Date(meeting.endTime).getTime();
    
    // Pre-meeting alert
    const preAlertTime = meetingStart - (notificationMinutes * 60 * 1000);
    if (preAlertTime > now) {
      chrome.alarms.create(`meeting-${meeting.id}`, { when: preAlertTime });
    }
    
    // Post-meeting alert (2 minutes after end)
    const postAlertTime = meetingEnd + (2 * 60 * 1000);
    if (postAlertTime > now) {
      chrome.alarms.create(`post-meeting-${meeting.id}`, { when: postAlertTime });
    }
  }
  
  await chrome.storage.local.set({ 
    lastSyncTime: new Date().toISOString(),
    todaysMeetingCount: meetings.length,
  });
  
  console.log(`📅 Synced ${meetings.length} meetings`);
  return { success: true, meetingCount: meetings.length };
}

function calculateStressForecast() {
  if (todaysMeetings.length === 0) {
    return {
      level: 'light',
      label: 'Clear day ahead',
      description: 'No meetings scheduled - great time for deep work',
      color: 'green',
      indicators: { totalMeetings: 0 },
    };
  }
  
  const indicators = {
    totalMeetings: todaysMeetings.length,
    backToBack: 0,
    longMeetings: 0,
    highStakes: 0,
    totalHours: 0,
  };
  
  const sorted = [...todaysMeetings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  for (let i = 0; i < sorted.length; i++) {
    const meeting = sorted[i];
    const duration = (new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60);
    const title = meeting.title.toLowerCase();
    
    indicators.totalHours += duration / 60;
    
    if (duration > 60) indicators.longMeetings++;
    
    const highStakeWords = ['presentation', 'review', 'interview', 'pitch', 'board', 'exec', 'client', 'demo', '1:1', 'performance'];
    if (highStakeWords.some(word => title.includes(word))) indicators.highStakes++;
    
    // Check for back-to-back
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currStart = new Date(meeting.startTime).getTime();
      if ((currStart - prevEnd) / (1000 * 60) < 15) indicators.backToBack++;
    }
  }
  
  // Calculate stress score
  let score = indicators.totalMeetings + 
              (indicators.backToBack * 2) + 
              (indicators.longMeetings * 1.5) + 
              (indicators.highStakes * 2);
  
  if (score <= 4) {
    return { 
      level: 'light', 
      label: `${indicators.totalMeetings} meeting${indicators.totalMeetings > 1 ? 's' : ''} today`, 
      description: 'Good spacing - manageable day ☀️', 
      color: 'green', 
      indicators 
    };
  } else if (score <= 8) {
    return { 
      level: 'moderate', 
      label: `${indicators.totalMeetings} meetings${indicators.backToBack > 0 ? `, ${indicators.backToBack} back-to-back` : ''}`, 
      description: 'Consider short breaks between meetings ⛅', 
      color: 'yellow', 
      indicators 
    };
  }
  
  return { 
    level: 'heavy', 
    label: `${indicators.totalMeetings} meetings, ${Math.round(indicators.totalHours)}h total`, 
    description: 'Heavy day - prioritize micro-breaks 🌧️', 
    color: 'orange', 
    indicators 
  };
}

async function completeFlow(flowType, meetingId) {
  const { flowHistory, dailyFlowCount } = await chrome.storage.local.get(['flowHistory', 'dailyFlowCount']);
  
  const newCount = (dailyFlowCount || 0) + 1;
  const flowEntry = { 
    flowType, 
    meetingId, 
    completedAt: new Date().toISOString() 
  };
  
  await chrome.storage.local.set({
    flowHistory: [...(flowHistory || []).slice(-50), flowEntry], // Keep last 50
    dailyFlowCount: newCount,
  });
  
  // Sync with backend if authenticated
  if (authToken) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/flows/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${authToken}` 
        },
        body: JSON.stringify({ flowType, meetingId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        gardenState = result.gardenState;
        return { success: true, gardenState, dailyFlowCount: newCount };
      }
    } catch (error) {
      console.warn('Failed to sync flow to backend:', error);
    }
  }
  
  return { success: true, dailyFlowCount: newCount };
}

async function fetchGardenState() {
  if (!authToken) return null;
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/garden`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    if (response.ok) {
      gardenState = await response.json();
      return gardenState;
    }
  } catch (error) {
    console.warn('Failed to fetch garden state:', error);
  }
  
  return null;
}

function getApiBaseUrl() {
  // In development, use localhost
  return API_BASE_URL;
}

// Restore auth state on startup
chrome.storage.local.get(['authToken', 'userProfile']).then(({ authToken: token, userProfile: profile }) => {
  if (token) {
    authToken = token;
    userProfile = profile;
    fetchGardenState();
    fetchGoogleCalendarEvents();
  }
});

console.log('🌱 Mind Garden Chrome service worker started');
