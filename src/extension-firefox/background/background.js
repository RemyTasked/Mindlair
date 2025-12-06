/**
 * Mind Garden - Firefox Background Script
 * 
 * Firefox-compatible version of the background service worker.
 * Uses browser.* API instead of chrome.* for cross-browser compatibility.
 */

// Polyfill for cross-browser compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Configuration
const API_BASE_URL = 'https://mindgarden.app/api';
const DEV_API_BASE_URL = 'http://localhost:3000/api';

// State
let authToken = null;
let userProfile = null;
let todaysMeetings = [];
let gardenState = null;

// Initialize on install/update
browserAPI.runtime.onInstalled.addListener(async (details) => {
  console.log('🌱 Mind Garden extension installed/updated:', details.reason);
  
  await browserAPI.storage.local.set({
    settings: {
      notificationTiming: 10,
      autoSuggestFlows: true,
      spotifyAutoPlay: false,
      theme: 'zen',
    },
    flowHistory: [],
    dailyFlowCount: 0,
    lastSyncTime: null,
  });
  
  browserAPI.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60,
  });
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// Handle alarms
browserAPI.alarms.onAlarm.addListener(async (alarm) => {
  console.log('⏰ Alarm fired:', alarm.name);
  
  if (alarm.name === 'dailyReset') {
    await browserAPI.storage.local.set({ dailyFlowCount: 0 });
  } else if (alarm.name.startsWith('meeting-')) {
    const meetingId = alarm.name.replace('meeting-', '');
    await triggerPreMeetingFlow(meetingId);
  }
});

async function triggerPreMeetingFlow(meetingId) {
  const meeting = todaysMeetings.find(m => m.id === meetingId);
  if (!meeting) return;
  
  browserAPI.notifications.create(`flow-${meetingId}`, {
    type: 'basic',
    iconUrl: browserAPI.runtime.getURL('icons/icon-128.png'),
    title: 'Time to Prepare',
    message: `"${meeting.title}" starts in ${getMinutesUntil(meeting.startTime)} minutes. Take a moment to center yourself.`,
  });
}

function getMinutesUntil(isoTime) {
  const targetTime = new Date(isoTime).getTime();
  return Math.round((targetTime - Date.now()) / (1000 * 60));
}

// Handle messages
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message.type);
  
  const handleAsync = async () => {
    switch (message.type) {
      case 'GET_AUTH_STATUS':
        return { authenticated: !!authToken, user: userProfile };
        
      case 'LOGIN':
        return await handleLogin(message.token);
        
      case 'LOGOUT':
        return await handleLogout();
        
      case 'SYNC_MEETINGS':
        return await syncMeetings(message.meetings);
        
      case 'GET_STRESS_FORECAST':
        return calculateStressForecast();
        
      case 'COMPLETE_FLOW':
        return await completeFlow(message.flowType, message.meetingId);
        
      case 'GET_GARDEN_STATE':
        return gardenState;
        
      case 'GET_TODAYS_MEETINGS':
        return todaysMeetings;
        
      default:
        return { error: 'Unknown message type' };
    }
  };
  
  handleAsync().then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleLogin(token) {
  try {
    authToken = token;
    await browserAPI.storage.local.set({ authToken: token });
    
    const response = await fetch(`${getApiBaseUrl()}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      userProfile = await response.json();
      await browserAPI.storage.local.set({ userProfile });
      await fetchGardenState();
      return { success: true, user: userProfile };
    }
    throw new Error('Failed to fetch profile');
  } catch (error) {
    authToken = null;
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  authToken = null;
  userProfile = null;
  gardenState = null;
  todaysMeetings = [];
  
  await browserAPI.storage.local.remove(['authToken', 'userProfile']);
  
  const alarms = await browserAPI.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-')) {
      browserAPI.alarms.clear(alarm.name);
    }
  }
  
  return { success: true };
}

async function syncMeetings(meetings) {
  todaysMeetings = meetings;
  
  const alarms = await browserAPI.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-')) {
      browserAPI.alarms.clear(alarm.name);
    }
  }
  
  const { settings } = await browserAPI.storage.local.get('settings');
  const notificationMinutes = settings?.notificationTiming || 10;
  
  const now = Date.now();
  for (const meeting of meetings) {
    const meetingTime = new Date(meeting.startTime).getTime();
    const alertTime = meetingTime - (notificationMinutes * 60 * 1000);
    
    if (alertTime > now) {
      browserAPI.alarms.create(`meeting-${meeting.id}`, { when: alertTime });
    }
  }
  
  return { success: true, meetingCount: meetings.length };
}

function calculateStressForecast() {
  if (todaysMeetings.length === 0) {
    return {
      level: 'light',
      label: 'No meetings scheduled',
      description: 'A clear day ahead',
      color: 'green',
    };
  }
  
  const indicators = {
    totalMeetings: todaysMeetings.length,
    backToBack: 0,
    longMeetings: 0,
    highStakes: 0,
  };
  
  const sorted = [...todaysMeetings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  for (let i = 0; i < sorted.length; i++) {
    const meeting = sorted[i];
    const duration = (new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60);
    const title = meeting.title.toLowerCase();
    
    if (duration > 60) indicators.longMeetings++;
    
    const highStakeWords = ['presentation', 'review', 'interview', 'pitch', 'board', 'exec', 'client'];
    if (highStakeWords.some(word => title.includes(word))) indicators.highStakes++;
    
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currStart = new Date(meeting.startTime).getTime();
      if ((currStart - prevEnd) / (1000 * 60) < 15) indicators.backToBack++;
    }
  }
  
  let score = indicators.totalMeetings + (indicators.backToBack * 2) + 
              (indicators.longMeetings * 1.5) + (indicators.highStakes * 2);
  
  if (score <= 4) {
    return { level: 'light', label: `${indicators.totalMeetings} meetings`, description: 'Manageable day', color: 'green', indicators };
  } else if (score <= 8) {
    return { level: 'moderate', label: `${indicators.totalMeetings} meetings, ${indicators.backToBack} back-to-back`, description: 'Consider breaks', color: 'yellow', indicators };
  }
  return { level: 'heavy', label: `${indicators.totalMeetings} meetings`, description: 'Heavy day - prioritize self-care', color: 'orange', indicators };
}

async function completeFlow(flowType, meetingId) {
  const { flowHistory, dailyFlowCount } = await browserAPI.storage.local.get(['flowHistory', 'dailyFlowCount']);
  
  await browserAPI.storage.local.set({
    flowHistory: [...(flowHistory || []), { flowType, meetingId, completedAt: new Date().toISOString() }],
    dailyFlowCount: (dailyFlowCount || 0) + 1,
  });
  
  if (authToken) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/flows/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ flowType, meetingId }),
      });
      if (response.ok) {
        const result = await response.json();
        gardenState = result.gardenState;
        return { success: true, gardenState };
      }
    } catch (error) {
      console.warn('Failed to sync flow:', error);
    }
  }
  return { success: true };
}

async function fetchGardenState() {
  if (!authToken) return null;
  try {
    const response = await fetch(`${getApiBaseUrl()}/garden/state`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.ok) {
      gardenState = await response.json();
      return gardenState;
    }
  } catch (error) {
    console.warn('Failed to fetch garden:', error);
  }
  return null;
}

function getApiBaseUrl() {
  // Check for development mode
  return API_BASE_URL;
}

// Restore auth on startup
browserAPI.storage.local.get(['authToken', 'userProfile']).then(({ authToken: token, userProfile: profile }) => {
  if (token) {
    authToken = token;
    userProfile = profile;
    fetchGardenState();
  }
});

console.log('🌱 Mind Garden Firefox background script started');

