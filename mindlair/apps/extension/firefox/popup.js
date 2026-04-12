/**
 * Mindlair extension popup — connects to background service worker
 * and renders status, controls, and recent captures.
 */

const $ = (sel) => document.querySelector(sel);

const setupView = $("#setupView");
const dashboardView = $("#dashboardView");
const statusDot = $("#statusDot");
const connectBtn = $("#connectBtn");
const connectError = $("#connectError");
const apiKeyInput = $("#apiKeyInput");
const apiUrlInput = $("#apiUrlInput");
const toggleBtn = $("#toggleBtn");
const syncBtn = $("#syncBtn");
const disconnectBtn = $("#disconnectBtn");
const totalCapturesEl = $("#totalCaptures");
const pendingCountEl = $("#pendingCount");
const recentList = $("#recentList");
const openDashboard = $("#openDashboard");
const feedLink = $("#feedLink");
const publishLink = $("#publishLink");
const mapLink = $("#mapLink");

// ── Init ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const status = await sendMessage({ type: "get_status" });
  render(status);
});

// ── Render ─────────────────────────────────────────────────────────

function render(status) {
  if (!status?.isConnected) {
    setupView.style.display = "flex";
    dashboardView.style.display = "none";
    statusDot.className = "status-dot disconnected";
    return;
  }

  setupView.style.display = "none";
  dashboardView.style.display = "flex";

  totalCapturesEl.textContent = formatNumber(status.totalCaptures || 0);
  pendingCountEl.textContent = String(status.pendingCount || 0);

  if (status.captureEnabled) {
    statusDot.className = "status-dot active";
    toggleBtn.textContent = "Pause";
    toggleBtn.style.borderColor = "";
    toggleBtn.style.color = "";
  } else {
    statusDot.className = "status-dot paused";
    toggleBtn.textContent = "Resume";
    toggleBtn.style.borderColor = "var(--amber)";
    toggleBtn.style.color = "var(--amber)";
  }

  const baseUrl = status.apiUrl || "https://mindlair.app";
  
  openDashboard.href = baseUrl;
  openDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    browser.tabs.create({ url: baseUrl + "/map" });
  });

  // Quick links
  feedLink.href = baseUrl + "/feed";
  feedLink.addEventListener("click", (e) => {
    e.preventDefault();
    browser.tabs.create({ url: baseUrl + "/feed" });
  });

  publishLink.href = baseUrl + "/publish";
  publishLink.addEventListener("click", (e) => {
    e.preventDefault();
    browser.tabs.create({ url: baseUrl + "/publish" });
  });

  mapLink.href = baseUrl + "/map";
  mapLink.addEventListener("click", (e) => {
    e.preventDefault();
    browser.tabs.create({ url: baseUrl + "/map" });
  });

  loadRecent();
}

async function loadRecent() {
  const { recent } = await sendMessage({ type: "get_recent" });

  if (!recent || recent.length === 0) {
    recentList.innerHTML = `<div style="color: var(--muted); font-size: 12px; padding: 8px;">No captures yet. Start browsing!</div>`;
    return;
  }

  recentList.innerHTML = recent.map((item) => {
    const dwell = formatDwell(item.dwellTimeMs);
    const domain = getDomain(item.url);
    return `
      <div class="recent-item">
        <div class="title" title="${escapeHtml(item.title || item.url)}">${escapeHtml(item.title || item.url)}</div>
        <div class="meta">
          <span>${domain}</span>
          <span>${dwell}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ── Actions ────────────────────────────────────────────────────────

connectBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  const apiUrl = apiUrlInput.value.trim() || "https://mindlair.app";

  if (!apiKey) {
    connectError.textContent = "Please enter your API key.";
    connectError.style.display = "block";
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";
  connectError.style.display = "none";

  const result = await sendMessage({ type: "set_api_key", apiKey, apiUrl });

  if (result?.success) {
    const status = await sendMessage({ type: "get_status" });
    render(status);
  } else {
    connectError.textContent = "Invalid API key or server unreachable.";
    connectError.style.display = "block";
  }

  connectBtn.disabled = false;
  connectBtn.textContent = "Connect";
});

toggleBtn.addEventListener("click", async () => {
  const result = await sendMessage({ type: "toggle_capture" });
  const status = await sendMessage({ type: "get_status" });
  render(status);
});

syncBtn.addEventListener("click", async () => {
  syncBtn.textContent = "Syncing...";
  syncBtn.disabled = true;
  await sendMessage({ type: "force_sync" });
  const status = await sendMessage({ type: "get_status" });
  render(status);
  syncBtn.textContent = "Sync Now";
  syncBtn.disabled = false;
});

disconnectBtn.addEventListener("click", async () => {
  await sendMessage({ type: "disconnect" });
  const status = await sendMessage({ type: "get_status" });
  render(status);
});

// ── Helpers ────────────────────────────────────────────────────────

function sendMessage(message) {
  return new Promise((resolve) => {
    browser.runtime.sendMessage(message).then((response) => {
      resolve(response || {});
    }).catch(() => {
      resolve({});
    });
  });
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function formatDwell(ms) {
  if (!ms) return "";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return secs + "s";
  const mins = Math.round(secs / 60);
  if (mins < 60) return mins + "m";
  return Math.round(mins / 60) + "h";
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
