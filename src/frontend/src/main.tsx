import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// AGGRESSIVE CACHE CLEARING - Force clear old logo caches
const CURRENT_VERSION = '20251108135200';
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
clearOldCaches().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
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
    console.log('🎬 PWA: New version available! Forcing update...');
    // Skip waiting and activate new service worker immediately
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Force hard reload
    window.location.reload();
  },
});

