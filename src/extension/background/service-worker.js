/**
 * Mind Garden - Background Service Worker
 * 
 * Handles:
 * - Authentication state management
 * - API communication with Mind Garden backend
 * - Smart Meeting Analysis (parsing calendar events)
 * - Alarm scheduling for flow triggers
 * - Cross-tab state synchronization
 */

// Configuration
const API_BASE_URL = 'https://mindgarden.app/api'; // Production
const DEV_API_BASE_URL = 'http://localhost:3000/api'; // Development

// State
let authToken = null;
let userProfile = null;
let todaysMeetings = [];
let gardenState = null;

// Initialize on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🌱 Mind Garden extension installed/updated:', details.reason);
  
  // Initialize storage with defaults
  await chrome.storage.local.set({
    settings: {
      notificationTiming: 10, // minutes before meeting
      autoSuggestFlows: true,
      spotifyAutoPlay: false,
      theme: 'zen',
    },
    flowHistory: [],
    dailyFlowCount: 0,
    lastSyncTime: null,
  });
  
  // Set up daily reset alarm
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 24 * 60, // Every 24 hours
  });
});

// Helper: Get next midnight timestamp
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
    // Reset daily flow count
    await chrome.storage.local.set({ dailyFlowCount: 0 });
    console.log('🌅 Daily flow count reset');
  } else if (alarm.name.startsWith('meeting-')) {
    // Pre-meeting flow trigger
    const meetingId = alarm.name.replace('meeting-', '');
    await triggerPreMeetingFlow(meetingId);
  }
});

// Trigger pre-meeting flow notification
async function triggerPreMeetingFlow(meetingId) {
  const meeting = todaysMeetings.find(m => m.id === meetingId);
  if (!meeting) {
    console.warn('Meeting not found for alarm:', meetingId);
    return;
  }
  
  // Send notification
  chrome.notifications.create(`flow-${meetingId}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'Time to Prepare',
    message: `"${meeting.title}" starts in ${getMinutesUntil(meeting.startTime)} minutes. Take a moment to center yourself.`,
    buttons: [
      { title: '🧘 Start Flow' },
      { title: '⏰ Remind in 5 min' },
    ],
    requireInteraction: true,
  });
}

// Helper: Get minutes until a time
function getMinutesUntil(isoTime) {
  const targetTime = new Date(isoTime).getTime();
  const now = Date.now();
  return Math.round((targetTime - now) / (1000 * 60));
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('flow-')) {
    const meetingId = notificationId.replace('flow-', '');
    
    if (buttonIndex === 0) {
      // Start Flow - open sidebar or popup
      await startFlow(meetingId);
    } else if (buttonIndex === 1) {
      // Remind in 5 min
      chrome.alarms.create(`meeting-${meetingId}`, {
        delayInMinutes: 5,
      });
    }
    
    chrome.notifications.clear(notificationId);
  }
});

// Start a flow for a meeting
async function startFlow(meetingId) {
  const meeting = todaysMeetings.find(m => m.id === meetingId);
  if (!meeting) return;
  
  // Determine flow type based on meeting context
  const flowType = suggestFlowType(meeting);
  
  // Send message to content script to open flow UI
  const tabs = await chrome.tabs.query({
    url: ['https://calendar.google.com/*', 'https://outlook.office.com/*']
  });
  
  if (tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'START_FLOW',
      meetingId,
      meetingTitle: meeting.title,
      flowType,
    });
  } else {
    // Open in popup if no calendar tab
    chrome.action.openPopup();
  }
}

// Suggest flow type based on meeting context
function suggestFlowType(meeting) {
  const title = meeting.title.toLowerCase();
  
  // Check for high-stakes keywords
  if (title.includes('presentation') || title.includes('demo') || title.includes('pitch')) {
    return 'pre-presentation';
  }
  
  if (title.includes('review') || title.includes('feedback') || title.includes('performance')) {
    return 'difficult-conversation';
  }
  
  if (title.includes('interview')) {
    return 'pre-presentation';
  }
  
  // Default to pre-meeting focus
  return 'pre-meeting';
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Message received:', message.type);
  
  switch (message.type) {
    case 'GET_AUTH_STATUS':
      sendResponse({ authenticated: !!authToken, user: userProfile });
      break;
      
    case 'LOGIN':
      handleLogin(message.token).then(sendResponse);
      return true; // Will respond async
      
    case 'LOGOUT':
      handleLogout().then(sendResponse);
      return true;
      
    case 'SYNC_MEETINGS':
      syncMeetings(message.meetings).then(sendResponse);
      return true;
      
    case 'GET_STRESS_FORECAST':
      sendResponse(calculateStressForecast());
      break;
      
    case 'COMPLETE_FLOW':
      completeFlow(message.flowType, message.meetingId).then(sendResponse);
      return true;
      
    case 'GET_GARDEN_STATE':
      sendResponse(gardenState);
      break;
      
    case 'GET_TODAYS_MEETINGS':
      sendResponse(todaysMeetings);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

// Handle login
async function handleLogin(token) {
  try {
    authToken = token;
    await chrome.storage.local.set({ authToken: token });
    
    // Fetch user profile
    const response = await fetch(`${getApiBaseUrl()}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      userProfile = await response.json();
      await chrome.storage.local.set({ userProfile });
      
      // Fetch garden state
      await fetchGardenState();
      
      return { success: true, user: userProfile };
    } else {
      throw new Error('Failed to fetch profile');
    }
  } catch (error) {
    console.error('Login error:', error);
    authToken = null;
    return { success: false, error: error.message };
  }
}

// Handle logout
async function handleLogout() {
  authToken = null;
  userProfile = null;
  gardenState = null;
  todaysMeetings = [];
  
  await chrome.storage.local.remove(['authToken', 'userProfile']);
  
  // Clear all meeting alarms
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-')) {
      chrome.alarms.clear(alarm.name);
    }
  }
  
  return { success: true };
}

// Sync meetings from calendar
async function syncMeetings(meetings) {
  todaysMeetings = meetings;
  
  // Clear old meeting alarms
  const alarms = await chrome.alarms.getAll();
  for (const alarm of alarms) {
    if (alarm.name.startsWith('meeting-')) {
      chrome.alarms.clear(alarm.name);
    }
  }
  
  // Get user's notification timing preference
  const { settings } = await chrome.storage.local.get('settings');
  const notificationMinutes = settings?.notificationTiming || 10;
  
  // Schedule alarms for upcoming meetings
  const now = Date.now();
  for (const meeting of meetings) {
    const meetingTime = new Date(meeting.startTime).getTime();
    const alertTime = meetingTime - (notificationMinutes * 60 * 1000);
    
    if (alertTime > now) {
      chrome.alarms.create(`meeting-${meeting.id}`, {
        when: alertTime,
      });
      console.log(`⏰ Scheduled alarm for "${meeting.title}" at ${new Date(alertTime).toLocaleTimeString()}`);
    }
  }
  
  // Sync to backend if authenticated
  if (authToken) {
    try {
      await fetch(`${getApiBaseUrl()}/analysis/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ meetings }),
      });
    } catch (error) {
      console.warn('Failed to sync meetings to backend:', error);
    }
  }
  
  return { success: true, meetingCount: meetings.length };
}

// Calculate stress forecast based on today's meetings
function calculateStressForecast() {
  if (todaysMeetings.length === 0) {
    return {
      level: 'light',
      label: 'Light day',
      description: 'No meetings scheduled',
      color: 'green',
    };
  }
  
  const stressIndicators = {
    backToBack: 0,
    longMeetings: 0,
    highStakes: 0,
    totalMeetings: todaysMeetings.length,
  };
  
  // Sort by start time
  const sorted = [...todaysMeetings].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  
  // Analyze meetings
  for (let i = 0; i < sorted.length; i++) {
    const meeting = sorted[i];
    const duration = (new Date(meeting.endTime) - new Date(meeting.startTime)) / (1000 * 60);
    const title = meeting.title.toLowerCase();
    
    // Long meeting (> 60 min)
    if (duration > 60) {
      stressIndicators.longMeetings++;
    }
    
    // High-stakes keywords
    const highStakeWords = ['presentation', 'review', 'interview', 'pitch', 'board', 'exec', 'client'];
    if (highStakeWords.some(word => title.includes(word))) {
      stressIndicators.highStakes++;
    }
    
    // Back-to-back (< 15 min gap)
    if (i > 0) {
      const prevEnd = new Date(sorted[i - 1].endTime).getTime();
      const currStart = new Date(meeting.startTime).getTime();
      const gap = (currStart - prevEnd) / (1000 * 60);
      
      if (gap < 15) {
        stressIndicators.backToBack++;
      }
    }
  }
  
  // Calculate stress score
  let score = stressIndicators.totalMeetings * 1;
  score += stressIndicators.backToBack * 2;
  score += stressIndicators.longMeetings * 1.5;
  score += stressIndicators.highStakes * 2;
  
  // Determine level
  if (score <= 4) {
    return {
      level: 'light',
      label: `${stressIndicators.totalMeetings} meeting${stressIndicators.totalMeetings !== 1 ? 's' : ''} with good spacing`,
      description: 'A manageable day ahead',
      color: 'green',
      indicators: stressIndicators,
    };
  } else if (score <= 8) {
    return {
      level: 'moderate',
      label: `${stressIndicators.totalMeetings} meetings, ${stressIndicators.backToBack} back-to-back`,
      description: 'Consider taking breaks between calls',
      color: 'yellow',
      indicators: stressIndicators,
    };
  } else {
    return {
      level: 'heavy',
      label: `${stressIndicators.totalMeetings} meetings, ${stressIndicators.backToBack} back-to-back${stressIndicators.highStakes > 0 ? ', includes high-stakes' : ''}`,
      description: 'Heavy day - prioritize self-care',
      color: 'orange',
      indicators: stressIndicators,
    };
  }
}

// Complete a flow and update garden
async function completeFlow(flowType, meetingId) {
  const { flowHistory, dailyFlowCount } = await chrome.storage.local.get(['flowHistory', 'dailyFlowCount']);
  
  // Add to history
  const newEntry = {
    flowType,
    meetingId,
    completedAt: new Date().toISOString(),
  };
  
  await chrome.storage.local.set({
    flowHistory: [...(flowHistory || []), newEntry],
    dailyFlowCount: (dailyFlowCount || 0) + 1,
  });
  
  // Sync to backend if authenticated
  if (authToken) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/flows/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ flowType, meetingId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        gardenState = result.gardenState;
        return { success: true, gardenState };
      }
    } catch (error) {
      console.warn('Failed to sync flow completion:', error);
    }
  }
  
  return { success: true };
}

// Fetch garden state from backend
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
    console.warn('Failed to fetch garden state:', error);
  }
  
  return null;
}

// Get API base URL (dev vs prod)
function getApiBaseUrl() {
  // Check if we're in development mode
  const isDev = !('update_url' in chrome.runtime.getManifest());
  return isDev ? DEV_API_BASE_URL : API_BASE_URL;
}

// Restore auth on startup
chrome.storage.local.get(['authToken', 'userProfile']).then(({ authToken: token, userProfile: profile }) => {
  if (token) {
    authToken = token;
    userProfile = profile;
    fetchGardenState();
    console.log('🔐 Auth restored from storage');
  }
});

console.log('🌱 Mind Garden background service worker started');

