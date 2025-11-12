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
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('🎬 Service Worker: Cache updated to', event.data.version);
      // Force hard reload to get new assets
      window.location.reload();
    }
  });
}

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('🎬 PWA: App is ready for offline use!');
  },
  onUpdate: (registration) => {
    console.log('🎬 PWA: New version available! Showing gentle update notification...');
    
    // Show gentle update notification instead of forcing reload
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

