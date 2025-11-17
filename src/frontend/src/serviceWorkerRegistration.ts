// Service Worker registration for PWA functionality

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    // Wait for page load to register service worker
    window.addEventListener('load', () => {
      // Vite uses import.meta.env.BASE_URL, not process.env.PUBLIC_URL
      const swUrl = `${import.meta.env.BASE_URL || '/'}service-worker.js`;

      if (isLocalhost) {
        // Check if service worker exists in localhost
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log(
            '🎬 This web app is being served cache-first by a service worker.'
          );
        });
      } else {
        // Register service worker in production
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('🎬 Service Worker registered:', registration);

      // Check for updates immediately on registration
      registration.update().then(() => {
        console.log('🎬 Checked for service worker updates');
      });

      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update().then(() => {
          console.log('🎬 Periodic update check completed');
        });
      }, 60000);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available, notify user immediately
              console.log('🎬 New content available; showing update notification.');
              if (config && config.onUpdate) {
                // Call onUpdate immediately when new service worker is installed
                config.onUpdate(registration);
              }
            } else {
              // Content cached for offline use
              console.log('🎬 Content cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
      
      // Also check for waiting service worker on registration
      if (registration.waiting) {
        console.log('🎬 Waiting service worker found; showing update notification.');
        if (config && config.onUpdate) {
          config.onUpdate(registration);
        }
      }
    })
    .catch((error) => {
      console.error('🎬 Error registering service worker:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('🎬 No internet connection. App running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

