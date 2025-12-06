/**
 * Mind Garden - Google Calendar Content Script
 * 
 * Injects the Mind Garden sidebar and floating widget into Google Calendar.
 */

console.log('🌱 Mind Garden loading for Google Calendar...');

// State
let sidebarVisible = false;
let sidebarContainer = null;
let floatingWidget = null;
let currentMeetings = [];
let stressForecast = null;

// Configuration
const SIDEBAR_WIDTH = 320;

// Initialize when DOM is ready
function init() {
  // Wait for Google Calendar to fully load
  const checkCalendarLoaded = setInterval(() => {
    const mainContent = document.querySelector('[role="main"]');
    if (mainContent) {
      clearInterval(checkCalendarLoaded);
      injectMindGarden();
    }
  }, 500);
}

function injectMindGarden() {
  createFloatingWidget();
  createSidebar();
  fetchData();
  
  // Observe for calendar changes
  observeCalendarChanges();
  
  console.log('🌱 Mind Garden injected into Google Calendar');
}

function createFloatingWidget() {
  floatingWidget = document.createElement('div');
  floatingWidget.id = 'mind-garden-widget';
  floatingWidget.innerHTML = `
    <div class="mg-widget-btn" id="mg-toggle-btn">
      <span class="mg-widget-icon">🌱</span>
      <span class="mg-widget-badge" id="mg-flow-badge">0</span>
    </div>
  `;
  document.body.appendChild(floatingWidget);
  
  document.getElementById('mg-toggle-btn').addEventListener('click', toggleSidebar);
}

function createSidebar() {
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'mind-garden-sidebar';
  sidebarContainer.className = 'mg-sidebar mg-hidden';
  sidebarContainer.innerHTML = `
    <div class="mg-sidebar-header">
      <div class="mg-logo">
        <span class="mg-logo-icon">🌱</span>
        <span class="mg-logo-text">Mind Garden</span>
      </div>
      <button class="mg-close-btn" id="mg-close-sidebar">×</button>
    </div>
    
    <div class="mg-sidebar-content">
      <div class="mg-loading" id="mg-loading">
        <div class="mg-spinner"></div>
        <p>Growing...</p>
      </div>
      
      <div class="mg-main-content" id="mg-main-content" style="display:none;">
        <!-- Stress Forecast -->
        <div class="mg-card mg-forecast-card" id="mg-forecast">
          <div class="mg-forecast-header">
            <span class="mg-forecast-icon" id="mg-forecast-icon">☀️</span>
            <span class="mg-forecast-label" id="mg-forecast-label">Loading forecast...</span>
          </div>
          <p class="mg-forecast-desc" id="mg-forecast-desc">Analyzing your calendar...</p>
        </div>
        
        <!-- Quick Actions -->
        <div class="mg-card mg-actions-card">
          <h3 class="mg-section-title">Quick Flows</h3>
          <div class="mg-action-grid">
            <button class="mg-action-btn" data-flow="breathing" title="2-minute breathing exercise">
              <span class="mg-action-icon">🌬️</span>
              <span class="mg-action-label">Breathe</span>
            </button>
            <button class="mg-action-btn" data-flow="quick-reset" title="60-second mental reset">
              <span class="mg-action-icon">🔄</span>
              <span class="mg-action-label">Reset</span>
            </button>
            <button class="mg-action-btn" data-flow="pre-meeting-focus" title="Pre-meeting preparation">
              <span class="mg-action-icon">🎯</span>
              <span class="mg-action-label">Focus</span>
            </button>
            <button class="mg-action-btn" data-flow="post-meeting-decompress" title="Post-meeting decompression">
              <span class="mg-action-icon">🌊</span>
              <span class="mg-action-label">Decompress</span>
            </button>
          </div>
        </div>
        
        <!-- Today's Summary -->
        <div class="mg-card mg-summary-card">
          <h3 class="mg-section-title">Today's Summary</h3>
          <div class="mg-summary-stats">
            <div class="mg-stat">
              <span class="mg-stat-value" id="mg-meeting-count">0</span>
              <span class="mg-stat-label">Meetings</span>
            </div>
            <div class="mg-stat">
              <span class="mg-stat-value" id="mg-flow-count">0</span>
              <span class="mg-stat-label">Flows Done</span>
            </div>
          </div>
        </div>
        
        <!-- Upcoming Meeting Alert -->
        <div class="mg-card mg-next-meeting-card" id="mg-next-meeting" style="display:none;">
          <div class="mg-next-meeting-info">
            <span class="mg-next-meeting-time" id="mg-next-time">In 10 min</span>
            <span class="mg-next-meeting-title" id="mg-next-title">Meeting Title</span>
          </div>
          <button class="mg-prepare-btn" id="mg-prepare-btn">Prepare</button>
        </div>
      </div>
    </div>
    
    <div class="mg-sidebar-footer">
      <a href="http://localhost:5173/dashboard" target="_blank" class="mg-dashboard-link">
        Open Full Dashboard →
      </a>
    </div>
  `;
  
  document.body.appendChild(sidebarContainer);
  
  // Event listeners
  document.getElementById('mg-close-sidebar').addEventListener('click', toggleSidebar);
  
  document.querySelectorAll('.mg-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const flowType = btn.dataset.flow;
      startFlow(flowType);
    });
  });
  
  document.getElementById('mg-prepare-btn')?.addEventListener('click', () => {
    startFlow('pre-meeting-focus');
  });
}

function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  
  if (sidebarVisible) {
    sidebarContainer.classList.remove('mg-hidden');
    sidebarContainer.classList.add('mg-visible');
    floatingWidget.classList.add('mg-sidebar-open');
  } else {
    sidebarContainer.classList.remove('mg-visible');
    sidebarContainer.classList.add('mg-hidden');
    floatingWidget.classList.remove('mg-sidebar-open');
  }
}

async function fetchData() {
  try {
    // Get stress forecast
    stressForecast = await chrome.runtime.sendMessage({ type: 'GET_STRESS_FORECAST' });
    updateForecastUI(stressForecast);
    
    // Get today's meetings
    currentMeetings = await chrome.runtime.sendMessage({ type: 'GET_TODAYS_MEETINGS' });
    updateMeetingsUI();
    
    // Get flow count
    const { dailyFlowCount } = await chrome.storage.local.get('dailyFlowCount');
    updateFlowCount(dailyFlowCount || 0);
    
    // Show main content
    document.getElementById('mg-loading').style.display = 'none';
    document.getElementById('mg-main-content').style.display = 'block';
  } catch (error) {
    console.error('Failed to fetch Mind Garden data:', error);
  }
}

function updateForecastUI(forecast) {
  if (!forecast) return;
  
  const iconEl = document.getElementById('mg-forecast-icon');
  const labelEl = document.getElementById('mg-forecast-label');
  const descEl = document.getElementById('mg-forecast-desc');
  const card = document.getElementById('mg-forecast');
  
  const icons = { light: '☀️', moderate: '⛅', heavy: '🌧️' };
  const colors = { light: '#10b981', moderate: '#f59e0b', heavy: '#f97316' };
  
  iconEl.textContent = icons[forecast.level] || '☀️';
  labelEl.textContent = forecast.label;
  descEl.textContent = forecast.description;
  card.style.borderLeftColor = colors[forecast.level] || '#10b981';
}

function updateMeetingsUI() {
  document.getElementById('mg-meeting-count').textContent = currentMeetings.length;
  
  // Show next meeting if within 30 minutes
  const nextMeeting = currentMeetings.find(m => {
    const startTime = new Date(m.startTime).getTime();
    const minutesUntil = (startTime - Date.now()) / (1000 * 60);
    return minutesUntil > 0 && minutesUntil <= 30;
  });
  
  const nextMeetingCard = document.getElementById('mg-next-meeting');
  
  if (nextMeeting) {
    const startTime = new Date(nextMeeting.startTime).getTime();
    const minutesUntil = Math.round((startTime - Date.now()) / (1000 * 60));
    
    document.getElementById('mg-next-time').textContent = `In ${minutesUntil} min`;
    document.getElementById('mg-next-title').textContent = nextMeeting.title;
    nextMeetingCard.style.display = 'flex';
  } else {
    nextMeetingCard.style.display = 'none';
  }
}

function updateFlowCount(count) {
  document.getElementById('mg-flow-count').textContent = count;
  document.getElementById('mg-flow-badge').textContent = count;
  
  // Update widget icon based on flow count
  const widgetIcon = document.querySelector('.mg-widget-icon');
  if (count >= 5) {
    widgetIcon.textContent = '🌳';
  } else if (count >= 3) {
    widgetIcon.textContent = '🌿';
  } else if (count >= 1) {
    widgetIcon.textContent = '🌱';
  } else {
    widgetIcon.textContent = '🌰';
  }
}

function startFlow(flowType) {
  // Open flow in new tab
  window.open(`http://localhost:5173/flow/${flowType}`, '_blank');
}

function observeCalendarChanges() {
  // Refresh data periodically
  setInterval(() => {
    fetchData();
  }, 60000); // Every minute
  
  // Also observe URL changes for navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      fetchData();
    }
  }).observe(document.body, { subtree: true, childList: true });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FLOW_COMPLETED') {
    updateFlowCount(message.dailyFlowCount);
  }
  if (message.type === 'REFRESH_DATA') {
    fetchData();
  }
});

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
