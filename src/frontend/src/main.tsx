import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { showUpdateNotification } from './components/UpdateNotification';
import { getToken } from './utils/persistentStorage';

// AGGRESSIVE CACHE CLEARING - Force clear old logo caches
const CURRENT_VERSION = '20251108192533'; // UNIFIED timestamp
const clearOldCaches = async () => {
  const lastVersion = localStorage.getItem('meetcute_logo_version');
  
  if (lastVersion !== CURRENT_VERSION) {
    console.log('🗑️ Clearing old caches for new logo version...');
    
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
    
    // Clear localStorage cache
    localStorage.removeItem('meetcute_profile_cache');
    
    // Update version
    localStorage.setItem('meetcute_logo_version', CURRENT_VERSION);
    console.log('✅ Cache cleared, new version:', CURRENT_VERSION);
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
  console.error('❌ Failed to bootstrap Meet Cute app:', error);
});

// Listen for service worker cache updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    console.log('🎬 Service Worker message received:', event.data);
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('🎬 Service Worker: Cache updated to', event.data.version);
      console.log('🔄 Showing automatic update notification...');

      // Show update notification automatically when cache is updated
      const { showUpdateNotification } = await import('./components/UpdateNotification');
      showUpdateNotification(() => {
        console.log('🔄 User initiated update - reloading...');
        window.location.reload();
      });
    }
  });

  // Also listen for controller change (when a new service worker takes over)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🎬 Service Worker: Controller changed - new version activated');
    // Optional: Could show notification here too if needed
  });
}

// Check for waiting service worker immediately on load
const checkForWaitingServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.waiting) {
        console.log('🎬 Found waiting service worker on app load - showing update notification immediately');
        showUpdateNotification(() => {
          console.log('✨ User accepted update, activating waiting service worker...');
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('⚠️ Error checking for waiting service worker:', error);
    }
  }
};

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('🎬 PWA: App is ready for offline use!');
    // Check for waiting service worker after successful registration
    setTimeout(checkForWaitingServiceWorker, 1000);
  },
  onUpdate: (registration) => {
    console.log('🎬 PWA: New version available! Showing update notification...');

    // Show update notification immediately
    showUpdateNotification(() => {
      console.log('✨ User accepted update, activating new version...');

      // Skip waiting and activate new service worker immediately
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // Listen for the service worker to become active
        registration.waiting.addEventListener('statechange', (e: any) => {
          if (e.target.state === 'activated') {
            // Reload as soon as the new service worker is active
            window.location.reload();
          }
        });
      } else {
        // If no waiting worker, just reload
        window.location.reload();
      }
    });
  },
});

// Also check for waiting service worker on app load
setTimeout(checkForWaitingServiceWorker, 2000);

