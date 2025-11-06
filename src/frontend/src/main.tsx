import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('🎬 PWA: App is ready for offline use!');
  },
  onUpdate: () => {
    console.log('🎬 PWA: New version available! Refresh to update.');
    // Optional: Show a toast notification to user
    if (confirm('New version of Meet Cute is available! Refresh to update?')) {
      window.location.reload();
    }
  },
});

