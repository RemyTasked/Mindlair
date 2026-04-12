/**
 * Mindlair browser extension — background service worker.
 *
 * Passively captures every URL the user visits, tracks dwell time,
 * batches captures, and syncs them to the Mindlair API.
 */

importScripts("content-filter.js");

const MIN_DWELL_MS = 5000;
const SYNC_INTERVAL_MINUTES = 2;
const SYNC_ALARM_NAME = "mindlair-sync";
const MAX_PENDING_ITEMS = 200;
const DEFAULT_API_URL = "https://mindlair.app";

// ── State ─────────────────────────────────────────────────────────

let activeSessions = new Map(); // tabId → { url, title, startTime }
let pendingCaptures = [];       // queued for sync
let totalCaptureCount = 0;

// ── Lifecycle ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });

  const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
  if (captureEnabled === undefined) {
    await chrome.storage.local.set({ captureEnabled: true });
  }

  const { captureCount } = await chrome.storage.local.get("captureCount");
  totalCaptureCount = captureCount || 0;
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  const { captureCount } = await chrome.storage.local.get("captureCount");
  totalCaptureCount = captureCount || 0;
});

// ── URL Capture ───────────────────────────────────────────────────

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // only main frame

  const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
  if (!captureEnabled) return;

  const url = details.url;
  if (MindlairFilter.isUrlBlocked(url)) return;

  const tabId = details.tabId;

  // Close previous session for this tab
  await closeSession(tabId);

  try {
    const tab = await chrome.tabs.get(tabId);
    activeSessions.set(tabId, {
      url: tab.url || url,
      title: tab.title || "",
      startTime: Date.now(),
      scrollDepth: 0,
    });
  } catch {
    // Tab may have been closed between event and get
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  closeSession(tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // When switching tabs, record dwell pause for the previous active tab
  // and timestamp the new active tab
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || MindlairFilter.isUrlBlocked(tab.url)) return;

    const session = activeSessions.get(activeInfo.tabId);
    if (session && session.url === tab.url) {
      // Already tracking — no action needed
    } else if (tab.url && !MindlairFilter.isInternalUrl(tab.url)) {
      // New session from tab switch
      activeSessions.set(activeInfo.tabId, {
        url: tab.url,
        title: tab.title || "",
        startTime: Date.now(),
        scrollDepth: 0,
      });
    }
  } catch {
    // Tab gone
  }
});

// Receive engagement data from content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "engagement_update" && sender.tab?.id) {
    const session = activeSessions.get(sender.tab.id);
    if (session) {
      session.scrollDepth = Math.max(session.scrollDepth || 0, message.scrollDepth || 0);
    }
  }
});

async function closeSession(tabId) {
  const session = activeSessions.get(tabId);
  if (!session) return;
  activeSessions.delete(tabId);

  const dwellMs = Date.now() - session.startTime;
  if (dwellMs < MIN_DWELL_MS) return;

  const capture = {
    url: session.url,
    title: session.title,
    surface: "chrome_extension",
    dwellTimeMs: dwellMs,
    scrollDepth: session.scrollDepth || 0,
    consumedAt: new Date(session.startTime).toISOString(),
  };

  pendingCaptures.push(capture);
  totalCaptureCount++;
  await chrome.storage.local.set({ captureCount: totalCaptureCount });

  // Trim if too many pending
  if (pendingCaptures.length > MAX_PENDING_ITEMS) {
    pendingCaptures = pendingCaptures.slice(-MAX_PENDING_ITEMS);
  }

  // Update badge
  updateBadge();

  // Also persist pending list to survive service worker restarts
  await chrome.storage.local.set({ pendingCaptures });
}

// ── Sync ──────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    syncPending();
  }
});

async function syncPending() {
  const { apiKey, apiUrl } = await chrome.storage.local.get(["apiKey", "apiUrl"]);
  if (!apiKey) return;

  // Restore pending from storage (in case service worker restarted)
  if (pendingCaptures.length === 0) {
    const stored = await chrome.storage.local.get("pendingCaptures");
    pendingCaptures = stored.pendingCaptures || [];
  }

  if (pendingCaptures.length === 0) return;

  const baseUrl = (apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
  const toSync = [...pendingCaptures];
  let syncedCount = 0;

  for (const capture of toSync) {
    try {
      const response = await fetch(`${baseUrl}/api/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          url: capture.url,
          surface: capture.surface,
          title: capture.title,
          dwellTimeMs: capture.dwellTimeMs,
          scrollDepth: capture.scrollDepth,
          consumedAt: capture.consumedAt,
        }),
      });

      if (response.ok || response.status === 422) {
        // 422 = content blocked by server filter — also remove from queue
        syncedCount++;
      } else if (response.status === 401) {
        // Bad API key — stop syncing
        console.warn("Mindlair: API key invalid");
        break;
      }
    } catch (error) {
      console.warn("Mindlair sync error:", error.message);
      break; // Network error — retry later
    }
  }

  if (syncedCount > 0) {
    pendingCaptures = pendingCaptures.slice(syncedCount);
    await chrome.storage.local.set({ pendingCaptures });
    updateBadge();
  }
}

// ── Badge ─────────────────────────────────────────────────────────

async function updateBadge() {
  const { captureEnabled, apiKey } = await chrome.storage.local.get(["captureEnabled", "apiKey"]);

  if (!apiKey) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    return;
  }

  if (!captureEnabled) {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#7a7469" });
    return;
  }

  const pending = pendingCaptures.length;
  if (pending > 0) {
    chrome.action.setBadgeText({ text: String(pending) });
    chrome.action.setBadgeBackgroundColor({ color: "#b8a965" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// ── Message API (for popup) ───────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get_status") {
    (async () => {
      const { captureEnabled, apiKey, apiUrl, captureCount } = await chrome.storage.local.get([
        "captureEnabled", "apiKey", "apiUrl", "captureCount",
      ]);
      sendResponse({
        captureEnabled: captureEnabled ?? true,
        isConnected: !!apiKey,
        apiUrl: apiUrl || DEFAULT_API_URL,
        pendingCount: pendingCaptures.length,
        totalCaptures: captureCount || 0,
      });
    })();
    return true; // async response
  }

  if (message.type === "set_api_key") {
    (async () => {
      await chrome.storage.local.set({
        apiKey: message.apiKey,
        apiUrl: message.apiUrl || DEFAULT_API_URL,
      });
      updateBadge();

      // Validate the key
      const baseUrl = (message.apiUrl || DEFAULT_API_URL).replace(/\/$/, "");
      try {
        const res = await fetch(`${baseUrl}/api/auth/validate`, {
          headers: { "x-api-key": message.apiKey },
        });
        const valid = res.ok;
        sendResponse({ success: valid });
        if (valid) syncPending();
      } catch {
        sendResponse({ success: false });
      }
    })();
    return true;
  }

  if (message.type === "toggle_capture") {
    (async () => {
      const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
      const newState = !captureEnabled;
      await chrome.storage.local.set({ captureEnabled: newState });
      updateBadge();
      sendResponse({ captureEnabled: newState });
    })();
    return true;
  }

  if (message.type === "force_sync") {
    syncPending().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "disconnect") {
    (async () => {
      await chrome.storage.local.remove(["apiKey", "apiUrl"]);
      updateBadge();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === "get_recent") {
    (async () => {
      const recent = pendingCaptures.slice(-10).reverse();
      sendResponse({ recent });
    })();
    return true;
  }
});
