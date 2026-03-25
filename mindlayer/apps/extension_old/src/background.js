// Mindlayer Background Service Worker
import { CONFIG } from './config.js';

// Track active tabs and their engagement data
const tabEngagement = new Map();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Initialize engagement tracking for this tab
    if (!shouldSkipUrl(tab.url)) {
      tabEngagement.set(tabId, {
        url: tab.url,
        title: tab.title,
        startTime: Date.now(),
        lastActiveTime: Date.now(),
        dwellTimeMs: 0,
        scrollDepth: 0,
        completionPercent: 0,
        hasPrompted: false,
      });
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  const engagement = tabEngagement.get(tabId);
  if (engagement && !engagement.hasPrompted) {
    // Save for digest if there was meaningful engagement
    if (meetsEngagementThreshold(engagement)) {
      saveForDigest(engagement);
    }
  }
  tabEngagement.delete(tabId);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  
  switch (message.type) {
    case 'UPDATE_ENGAGEMENT':
      if (tabId && tabEngagement.has(tabId)) {
        const engagement = tabEngagement.get(tabId);
        engagement.scrollDepth = Math.max(engagement.scrollDepth, message.scrollDepth);
        engagement.completionPercent = Math.max(engagement.completionPercent, message.completionPercent);
        engagement.dwellTimeMs = message.dwellTimeMs;
        engagement.lastActiveTime = Date.now();
        
        // Check if we should trigger the prompt
        if (!engagement.hasPrompted && meetsEngagementThreshold(engagement)) {
          engagement.hasPrompted = true;
          triggerClaimExtraction(tabId, engagement);
        }
      }
      break;
      
    case 'SUBMIT_REACTION':
      handleReactionSubmission(message.data, sendResponse);
      return true; // Will respond asynchronously
      
    case 'SKIP_REACTION':
      if (tabId && tabEngagement.has(tabId)) {
        const engagement = tabEngagement.get(tabId);
        saveForDigest(engagement);
      }
      break;
      
    case 'GET_PENDING_COUNT':
      getPendingCount().then(count => sendResponse({ count }));
      return true;
  }
});

function shouldSkipUrl(url) {
  try {
    const urlObj = new URL(url);
    return CONFIG.SKIP_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return true;
  }
}

function meetsEngagementThreshold(engagement) {
  return (
    engagement.dwellTimeMs >= CONFIG.MIN_DWELL_TIME_MS &&
    (engagement.scrollDepth >= CONFIG.MIN_SCROLL_DEPTH || 
     engagement.completionPercent >= CONFIG.MIN_COMPLETION)
  );
}

async function triggerClaimExtraction(tabId, engagement) {
  try {
    // First, ingest the content
    const ingestResponse = await fetch(`${CONFIG.API_BASE_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': await getUserId(),
      },
      body: JSON.stringify({
        url: engagement.url,
        surface: 'chrome_extension',
        title: engagement.title,
        dwellTimeMs: engagement.dwellTimeMs,
        scrollDepth: engagement.scrollDepth,
        completionPercent: engagement.completionPercent,
      }),
    });
    
    if (!ingestResponse.ok) {
      console.error('Failed to ingest content');
      return;
    }
    
    const { sourceId } = await ingestResponse.json();
    
    // Extract claim
    const claimResponse = await fetch(`${CONFIG.API_BASE_URL}/claims/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': await getUserId(),
      },
      body: JSON.stringify({ sourceId }),
    });
    
    if (!claimResponse.ok) {
      console.error('Failed to extract claim');
      return;
    }
    
    const claim = await claimResponse.json();
    
    // Send message to content script to show prompt
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_REACTION_PROMPT',
      data: {
        claimId: claim.claimId,
        claimText: claim.claimText,
        sourceTitle: engagement.title,
        sourceUrl: engagement.url,
        outlet: new URL(engagement.url).hostname.replace('www.', ''),
      },
    });
  } catch (error) {
    console.error('Error in claim extraction pipeline:', error);
  }
}

async function handleReactionSubmission(data, sendResponse) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': await getUserId(),
      },
      body: JSON.stringify({
        claimId: data.claimId,
        stance: data.stance,
        note: data.note,
        context: 'realtime',
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      sendResponse({ success: true, result });
    } else {
      sendResponse({ success: false, error: 'API error' });
    }
  } catch (error) {
    console.error('Error submitting reaction:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function saveForDigest(engagement) {
  const pending = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.PENDING_ITEMS);
  const items = pending[CONFIG.STORAGE_KEYS.PENDING_ITEMS] || [];
  
  items.push({
    url: engagement.url,
    title: engagement.title,
    dwellTimeMs: engagement.dwellTimeMs,
    scrollDepth: engagement.scrollDepth,
    completionPercent: engagement.completionPercent,
    savedAt: Date.now(),
  });
  
  // Keep only last 50 items
  const trimmed = items.slice(-50);
  
  await chrome.storage.local.set({
    [CONFIG.STORAGE_KEYS.PENDING_ITEMS]: trimmed,
  });
}

async function getPendingCount() {
  const pending = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.PENDING_ITEMS);
  const items = pending[CONFIG.STORAGE_KEYS.PENDING_ITEMS] || [];
  return items.length;
}

async function getUserId() {
  const stored = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.USER_ID);
  if (stored[CONFIG.STORAGE_KEYS.USER_ID]) {
    return stored[CONFIG.STORAGE_KEYS.USER_ID];
  }
  
  // Generate a new user ID
  const userId = 'user_' + Math.random().toString(36).substring(2, 15);
  await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.USER_ID]: userId });
  return userId;
}
