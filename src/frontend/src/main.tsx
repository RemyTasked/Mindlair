import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { showUpdateNotification, markUpdatePending, showUpdateSuccessToast } from './components/UpdateNotification';
import { getToken } from './utils/persistentStorage';

// PWA version tracking for cache management
const CURRENT_VERSION = '20260104'; // Mind Garden PWA version
const clearOldCaches = async () => {
  const lastVersion = localStorage.getItem('mindgarden_version');
  
  if (lastVersion !== CURRENT_VERSION) {
    console.log('🌱 Mind Garden: Clearing old caches...');
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }
    
    // Clear old localStorage keys
    localStorage.removeItem('meetcute_profile_cache');
    localStorage.removeItem('meetcute_logo_version');
    
    // Update version
    localStorage.setItem('mindgarden_version', CURRENT_VERSION);
    console.log('✅ Mind Garden: Cache cleared, version:', CURRENT_VERSION);
  }
};

// Clear caches before rendering
const bootstrap = async () => {
  try {
    await getToken();
  } catch (error) {
    console.error('⚠️ Failed to restore auth token from persistent storage:', error);
  }

  try {
    await clearOldCaches();
  } catch (error) {
    console.error('⚠️ Failed to clear old caches:', error);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
};

bootstrap().catch((error) => {
  console.error('❌ Failed to bootstrap Mind Garden app:', error);
});

// Check for update success toast on load
showUpdateSuccessToast();

// Listen for service worker cache updates - auto-apply silently
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    console.log('🌱 Service Worker message received:', event.data);
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('🌱 Service Worker: Cache updated to', event.data.version);
      // Auto-apply the update silently
      const { markUpdatePending } = await import('./components/UpdateNotification');
      markUpdatePending();
      window.location.reload();
    }
  });

  // Listen for controller change (new service worker activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🌱 Service Worker: Controller changed - new version activated');
  });
}

// Auto-apply any waiting service worker on load
const autoApplyWaitingServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        console.log('🌱 Found waiting service worker - auto-applying update...');
        markUpdatePending();
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Reload will happen via controllerchange event
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('⚠️ Error auto-applying service worker update:', error);
    }
  }
};

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('🌱 Mind Garden PWA: Ready for offline use!');
    // Check for waiting service worker after registration
    setTimeout(autoApplyWaitingServiceWorker, 1000);
  },
  onUpdate: (registration) => {
    console.log('🌱 Mind Garden PWA: New version available - auto-applying...');
    
    // Mark that we're updating (for success toast after reload)
    markUpdatePending();

    // Skip waiting and activate new service worker immediately
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Listen for the service worker to become active, then reload
      registration.waiting.addEventListener('statechange', (e: any) => {
        if (e.target.state === 'activated') {
          window.location.reload();
        }
      });
      
      // Fallback reload if statechange doesn't fire
      setTimeout(() => window.location.reload(), 1000);
    } else {
      window.location.reload();
    }
  },
});

// Auto-apply waiting service worker on app load
setTimeout(autoApplyWaitingServiceWorker, 2000);

