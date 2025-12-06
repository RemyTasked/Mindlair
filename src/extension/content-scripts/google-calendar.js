/**
 * Mind Garden - Google Calendar Content Script
 * 
 * Injects the Mind Garden sidebar into Google Calendar
 * Parses calendar events and sends to background service worker
 */

// Sidebar state
let sidebarVisible = false;
let sidebarElement = null;

// Initialize
function init() {
  console.log('🌱 Mind Garden: Initializing Google Calendar integration');
  
  // Wait for calendar to load
  waitForCalendar().then(() => {
    console.log('📅 Google Calendar detected');
    
    // Inject floating widget
    injectFloatingWidget();
    
    // Parse meetings
    parseMeetings();
    
    // Set up mutation observer to detect calendar changes
    observeCalendarChanges();
  });
}

// Wait for Google Calendar to fully load
function waitForCalendar() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Check for main calendar grid
      const calendarGrid = document.querySelector('[role="main"]');
      if (calendarGrid) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });
}

// Inject floating widget button
function injectFloatingWidget() {
  if (document.getElementById('mindgarden-widget')) return;
  
  const widget = document.createElement('div');
  widget.id = 'mindgarden-widget';
  widget.innerHTML = `
    <button id="mindgarden-toggle" class="mindgarden-toggle-btn" title="Mind Garden">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
      </svg>
      <span class="mindgarden-badge" id="mindgarden-flow-count">0</span>
    </button>
  `;
  
  document.body.appendChild(widget);
  
  // Add click handler
  document.getElementById('mindgarden-toggle').addEventListener('click', toggleSidebar);
  
  // Update flow count
  updateFlowCount();
}

// Toggle sidebar visibility
function toggleSidebar() {
  if (sidebarVisible) {
    hideSidebar();
  } else {
    showSidebar();
  }
}

// Show sidebar
function showSidebar() {
  if (sidebarElement) {
    sidebarElement.classList.add('visible');
  } else {
    createSidebar();
  }
  sidebarVisible = true;
}

// Hide sidebar
function hideSidebar() {
  if (sidebarElement) {
    sidebarElement.classList.remove('visible');
  }
  sidebarVisible = false;
}

// Create sidebar element
function createSidebar() {
  sidebarElement = document.createElement('div');
  sidebarElement.id = 'mindgarden-sidebar';
  sidebarElement.className = 'mindgarden-sidebar visible';
  
  sidebarElement.innerHTML = `
    <div class="mindgarden-sidebar-header">
      <div class="mindgarden-logo">
        <span class="mindgarden-icon">🌱</span>
        <span class="mindgarden-title">Mind Garden</span>
      </div>
      <button class="mindgarden-close-btn" id="mindgarden-close">×</button>
    </div>
    
    <div class="mindgarden-sidebar-content" id="mindgarden-content">
      <div class="mindgarden-loading">
        <div class="mindgarden-spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(sidebarElement);
  
  // Add close handler
  document.getElementById('mindgarden-close').addEventListener('click', hideSidebar);
  
  // Load sidebar content
  loadSidebarContent();
}

// Load sidebar content
async function loadSidebarContent() {
  const content = document.getElementById('mindgarden-content');
  
  // Get data from background
  const [authStatus, forecast, gardenState] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }),
    chrome.runtime.sendMessage({ type: 'GET_STRESS_FORECAST' }),
    chrome.runtime.sendMessage({ type: 'GET_GARDEN_STATE' }),
  ]);
  
  if (!authStatus.authenticated) {
    // Show login prompt
    content.innerHTML = `
      <div class="mindgarden-login-prompt">
        <div class="mindgarden-garden-preview">🌿</div>
        <h3>Welcome to Mind Garden</h3>
        <p>Sign in to access your garden and personalized flows.</p>
        <button class="mindgarden-btn mindgarden-btn-primary" id="mindgarden-login">
          Sign In
        </button>
      </div>
    `;
    
    document.getElementById('mindgarden-login').addEventListener('click', () => {
      // Open popup for login
      chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' });
    });
    return;
  }
  
  // Show main content
  const forecastColor = forecast.color === 'green' ? '#10b981' : 
                        forecast.color === 'yellow' ? '#f59e0b' : '#f97316';
  
  content.innerHTML = `
    <!-- Mini Garden -->
    <div class="mindgarden-mini-garden" id="mindgarden-garden">
      <div class="mindgarden-garden-visual">🌱</div>
      <div class="mindgarden-garden-stats">
        <span class="mindgarden-flow-badge">${await getFlowCount()} flows today</span>
      </div>
    </div>
    
    <!-- Stress Forecast -->
    <div class="mindgarden-forecast" style="border-left: 3px solid ${forecastColor}">
      <div class="mindgarden-forecast-icon" style="color: ${forecastColor}">
        ${forecast.level === 'light' ? '☀️' : forecast.level === 'moderate' ? '⛅' : '🌧️'}
      </div>
      <div class="mindgarden-forecast-text">
        <strong>${forecast.label}</strong>
        <p>${forecast.description}</p>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="mindgarden-quick-actions">
      <h4>Quick Flows</h4>
      <div class="mindgarden-action-grid">
        <button class="mindgarden-action-btn" data-flow="quick-reset">
          <span class="mindgarden-action-icon">🔄</span>
          <span class="mindgarden-action-label">Quick Reset</span>
          <span class="mindgarden-action-time">90s</span>
        </button>
        <button class="mindgarden-action-btn" data-flow="pre-meeting">
          <span class="mindgarden-action-icon">🎯</span>
          <span class="mindgarden-action-label">Pre-Meeting</span>
          <span class="mindgarden-action-time">2m</span>
        </button>
        <button class="mindgarden-action-btn" data-flow="breathing">
          <span class="mindgarden-action-icon">🌬️</span>
          <span class="mindgarden-action-label">Breathe</span>
          <span class="mindgarden-action-time">30s</span>
        </button>
        <button class="mindgarden-action-btn" data-flow="decompress">
          <span class="mindgarden-action-icon">🌊</span>
          <span class="mindgarden-action-label">Decompress</span>
          <span class="mindgarden-action-time">2m</span>
        </button>
      </div>
    </div>
    
    <!-- Spotify Quick Play -->
    <div class="mindgarden-spotify">
      <h4>🎵 Quick Play</h4>
      <div class="mindgarden-spotify-buttons">
        <button class="mindgarden-spotify-btn" data-mood="focus">Focus</button>
        <button class="mindgarden-spotify-btn" data-mood="calm">Calm</button>
        <button class="mindgarden-spotify-btn" data-mood="energize">Energize</button>
      </div>
    </div>
    
    <!-- View Full Dashboard -->
    <div class="mindgarden-footer">
      <a href="https://mindgarden.app/dashboard" target="_blank" class="mindgarden-dashboard-link">
        Open Full Dashboard →
      </a>
    </div>
  `;
  
  // Add flow button handlers
  document.querySelectorAll('.mindgarden-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const flowType = btn.dataset.flow;
      startFlowUI(flowType);
    });
  });
  
  // Add Spotify button handlers
  document.querySelectorAll('.mindgarden-spotify-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      playSpotifyMood(mood);
    });
  });
  
  // Add garden click handler
  document.getElementById('mindgarden-garden').addEventListener('click', () => {
    window.open('https://mindgarden.app/dashboard', '_blank');
  });
}

// Get flow count from storage
async function getFlowCount() {
  const { dailyFlowCount } = await chrome.storage.local.get('dailyFlowCount');
  return dailyFlowCount || 0;
}

// Update flow count badge
async function updateFlowCount() {
  const count = await getFlowCount();
  const badge = document.getElementById('mindgarden-flow-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Start flow UI
function startFlowUI(flowType) {
  console.log('🧘 Starting flow:', flowType);
  
  // Create flow overlay
  const overlay = document.createElement('div');
  overlay.id = 'mindgarden-flow-overlay';
  overlay.className = 'mindgarden-flow-overlay';
  overlay.innerHTML = `
    <div class="mindgarden-flow-container">
      <button class="mindgarden-flow-close">×</button>
      <div class="mindgarden-flow-content" id="mindgarden-flow-content">
        <div class="mindgarden-flow-intro">
          <h2>${getFlowTitle(flowType)}</h2>
          <p>${getFlowDescription(flowType)}</p>
          <button class="mindgarden-btn mindgarden-btn-primary" id="mindgarden-start-flow">
            Begin
          </button>
        </div>
      </div>
      <div class="mindgarden-flow-progress">
        <div class="mindgarden-progress-bar" id="mindgarden-progress"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add close handler
  overlay.querySelector('.mindgarden-flow-close').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Add start handler
  document.getElementById('mindgarden-start-flow').addEventListener('click', () => {
    runFlow(flowType, overlay);
  });
}

// Get flow title
function getFlowTitle(flowType) {
  const titles = {
    'quick-reset': 'Quick Reset',
    'pre-meeting': 'Pre-Meeting Focus',
    'breathing': 'Breathing Exercise',
    'decompress': 'Post-Meeting Decompress',
    'pre-presentation': 'Pre-Presentation Power',
    'difficult-conversation': 'Difficult Conversation Prep',
  };
  return titles[flowType] || 'Flow';
}

// Get flow description
function getFlowDescription(flowType) {
  const descriptions = {
    'quick-reset': 'A quick 90-second reset to clear your mind and re-center.',
    'pre-meeting': 'Prepare mentally for your upcoming meeting with focused breathing.',
    'breathing': 'Simple box breathing to calm your nervous system.',
    'decompress': 'Release tension and transition after a meeting.',
    'pre-presentation': 'Build confidence and presence before your presentation.',
    'difficult-conversation': 'Ground yourself before a challenging discussion.',
  };
  return descriptions[flowType] || 'Take a moment to center yourself.';
}

// Run the flow
async function runFlow(flowType, overlay) {
  const content = document.getElementById('mindgarden-flow-content');
  const progress = document.getElementById('mindgarden-progress');
  
  // Breathing exercise (simplified)
  const steps = [
    { text: 'Breathe in...', duration: 4000 },
    { text: 'Hold...', duration: 4000 },
    { text: 'Breathe out...', duration: 4000 },
    { text: 'Hold...', duration: 4000 },
  ];
  
  const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
  let elapsed = 0;
  
  // Run through steps
  for (const step of steps) {
    content.innerHTML = `
      <div class="mindgarden-flow-step">
        <div class="mindgarden-breathing-circle"></div>
        <h2>${step.text}</h2>
      </div>
    `;
    
    // Update progress
    const startElapsed = elapsed;
    const stepStart = Date.now();
    
    while (Date.now() - stepStart < step.duration) {
      const stepProgress = (Date.now() - stepStart) / step.duration;
      elapsed = startElapsed + (step.duration * stepProgress);
      progress.style.width = `${(elapsed / totalDuration) * 100}%`;
      await new Promise(r => requestAnimationFrame(r));
    }
    
    elapsed = startElapsed + step.duration;
  }
  
  // Complete
  content.innerHTML = `
    <div class="mindgarden-flow-complete">
      <div class="mindgarden-complete-icon">✨</div>
      <h2>Flow Complete!</h2>
      <p>Your garden grew 🌱</p>
      <button class="mindgarden-btn mindgarden-btn-primary" id="mindgarden-done">
        Done
      </button>
    </div>
  `;
  
  progress.style.width = '100%';
  
  // Record completion
  chrome.runtime.sendMessage({
    type: 'COMPLETE_FLOW',
    flowType,
  });
  
  // Update badge
  updateFlowCount();
  
  // Done handler
  document.getElementById('mindgarden-done').addEventListener('click', () => {
    overlay.remove();
    loadSidebarContent(); // Refresh sidebar
  });
}

// Play Spotify mood
function playSpotifyMood(mood) {
  console.log('🎵 Playing Spotify mood:', mood);
  chrome.runtime.sendMessage({
    type: 'PLAY_SPOTIFY',
    mood,
  });
}

// Parse meetings from Google Calendar
function parseMeetings() {
  const meetings = [];
  
  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Try to find meeting elements
  // Note: This is fragile and may need updates as Google changes their DOM
  const eventElements = document.querySelectorAll('[data-eventid]');
  
  eventElements.forEach(el => {
    try {
      const eventId = el.getAttribute('data-eventid');
      const titleEl = el.querySelector('[data-eventchip]') || el;
      const title = titleEl.textContent?.trim() || 'Untitled';
      
      // Try to extract time from aria-label or other attributes
      const ariaLabel = el.getAttribute('aria-label') || '';
      
      meetings.push({
        id: eventId,
        title,
        rawLabel: ariaLabel,
        // Note: Actual time parsing would require more sophisticated extraction
      });
    } catch (error) {
      console.warn('Error parsing meeting:', error);
    }
  });
  
  // Send to background
  if (meetings.length > 0) {
    chrome.runtime.sendMessage({
      type: 'SYNC_MEETINGS',
      meetings,
    });
  }
  
  console.log(`📅 Parsed ${meetings.length} meetings`);
}

// Observe calendar changes
function observeCalendarChanges() {
  const observer = new MutationObserver((mutations) => {
    // Debounce meeting parsing
    clearTimeout(window.mindgardenParseTimeout);
    window.mindgardenParseTimeout = setTimeout(parseMeetings, 1000);
  });
  
  const main = document.querySelector('[role="main"]');
  if (main) {
    observer.observe(main, {
      childList: true,
      subtree: true,
    });
  }
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received:', message.type);
  
  switch (message.type) {
    case 'START_FLOW':
      startFlowUI(message.flowType);
      sendResponse({ success: true });
      break;
      
    case 'SHOW_SIDEBAR':
      showSidebar();
      sendResponse({ success: true });
      break;
      
    case 'UPDATE_GARDEN':
      loadSidebarContent();
      sendResponse({ success: true });
      break;
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

