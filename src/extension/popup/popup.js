/**
 * Mind Garden - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const mainContent = document.getElementById('main-content');
  const loading = document.getElementById('loading');

  try {
    // Check auth status
    const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    
    if (!authStatus.authenticated) {
      showLoginScreen();
    } else {
      await showDashboard(authStatus.user);
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Failed to load. Please try again.');
  }

  // Hide loading
  loading.style.display = 'none';
});

// Show login screen
function showLoginScreen() {
  const mainContent = document.getElementById('main-content');
  
  mainContent.innerHTML = `
    <div class="login-screen">
      <div class="login-icon">🌱</div>
      <h2>Welcome to Mind Garden</h2>
      <p>Sign in to start your mental fitness journey and grow your garden.</p>
      
      <button class="btn btn-google" id="google-login">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26a5.4 5.4 0 0 1-8.09-2.84H1.01v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.96 10.72a5.41 5.41 0 0 1 0-3.44V4.95H1.01a9 9 0 0 0 0 8.1l2.95-2.33z" fill="#FBBC05"/>
          <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.97 8.97 0 0 0 9 0a9 9 0 0 0-7.99 4.95l2.95 2.33A5.36 5.36 0 0 1 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
      
      <button class="btn btn-microsoft" id="microsoft-login">
        <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
          <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
        Sign in with Microsoft
      </button>
    </div>
  `;

  // Add login handlers
  document.getElementById('google-login').addEventListener('click', () => {
    // Open web app for OAuth flow
    chrome.tabs.create({ url: 'https://mindgarden.app/auth/google?source=extension' });
  });

  document.getElementById('microsoft-login').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mindgarden.app/auth/microsoft?source=extension' });
  });
}

// Show dashboard
async function showDashboard(user) {
  const mainContent = document.getElementById('main-content');
  
  // Get data from background
  const [forecast, gardenState] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_STRESS_FORECAST' }),
    chrome.runtime.sendMessage({ type: 'GET_GARDEN_STATE' }),
  ]);
  
  // Get flow count from storage
  const { dailyFlowCount } = await chrome.storage.local.get('dailyFlowCount');
  
  const forecastColor = forecast.color === 'green' ? '#10b981' : 
                        forecast.color === 'yellow' ? '#f59e0b' : '#f97316';

  mainContent.innerHTML = `
    <div class="dashboard-view">
      <!-- User Info -->
      <div class="user-info">
        <div class="user-details">
          <div class="user-avatar">${(user.name || user.email || '?')[0].toUpperCase()}</div>
          <div>
            <div class="user-name">${user.name || 'User'}</div>
            <div class="user-email">${user.email || ''}</div>
          </div>
        </div>
        <button class="logout-btn" id="logout-btn">Sign Out</button>
      </div>

      <!-- Garden Card -->
      <div class="garden-card" id="garden-card">
        <div class="garden-visual">🌱</div>
        <div class="garden-stats">
          <div class="stat">
            <div class="stat-value">${dailyFlowCount || 0}</div>
            <div class="stat-label">Flows Today</div>
          </div>
          <div class="stat">
            <div class="stat-value">${gardenState?.streak || 0}</div>
            <div class="stat-label">Day Streak</div>
          </div>
        </div>
      </div>

      <!-- Stress Forecast -->
      <div class="forecast-card" style="border-left-color: ${forecastColor}">
        <div class="forecast-header">
          <span class="forecast-icon">
            ${forecast.level === 'light' ? '☀️' : forecast.level === 'moderate' ? '⛅' : '🌧️'}
          </span>
          <span class="forecast-title">${forecast.label}</span>
        </div>
        <div class="forecast-description">${forecast.description}</div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3>Quick Flows</h3>
        <div class="action-grid">
          <button class="action-btn" data-flow="breathing">
            <span class="action-icon">🌬️</span>
            <span class="action-label">Breathe</span>
          </button>
          <button class="action-btn" data-flow="quick-reset">
            <span class="action-icon">🔄</span>
            <span class="action-label">Quick Reset</span>
          </button>
          <button class="action-btn" data-flow="pre-meeting">
            <span class="action-icon">🎯</span>
            <span class="action-label">Pre-Meeting</span>
          </button>
          <button class="action-btn" data-flow="decompress">
            <span class="action-icon">🌊</span>
            <span class="action-label">Decompress</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add event handlers
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    showLoginScreen();
  });

  document.getElementById('garden-card').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mindgarden.app/dashboard' });
  });

  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const flowType = btn.dataset.flow;
      startFlow(flowType);
    });
  });
}

// Start a flow
function startFlow(flowType) {
  // For now, open dashboard with flow parameter
  chrome.tabs.create({ url: `https://mindgarden.app/flow/${flowType}` });
}

// Show error
function showError(message) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="error-screen">
      <p>❌ ${message}</p>
      <button class="btn btn-primary" onclick="location.reload()">Retry</button>
    </div>
  `;
}

