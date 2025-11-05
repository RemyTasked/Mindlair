import axios from 'axios';

// In production, API is on same domain. In dev, use localhost.
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  /**
   * Check if push notifications are supported
   * Note: Safari on macOS/iOS has limited/no support for Web Push API
   */
  isSupported(): boolean {
    // Check basic support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    // Safari on iOS doesn't support Push API at all
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.warn('Push notifications are not supported on iOS Safari');
      return false;
    }

    // Safari on macOS has limited support (requires macOS 13+ and Safari 16+)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      // Check Safari version
      const match = navigator.userAgent.match(/Version\/(\d+)/);
      const version = match ? parseInt(match[1]) : 0;
      if (version < 16) {
        console.warn('Push notifications require Safari 16+ on macOS 13+');
        return false;
      }
      console.log('Safari 16+ detected - Push notifications supported with limitations');
    }

    // Firefox has excellent push notification support
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (isFirefox) {
      console.log('Firefox detected - Full push notification support');
    }

    // Chrome/Edge have full support (no special checks needed)
    const isChrome = /chrome|chromium|edg/i.test(navigator.userAgent);
    if (isChrome) {
      console.log('Chrome/Edge detected - Full push notification support');
    }

    return true;
  }

  /**
   * Check if user has granted notification permission
   */
  hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration);
      this.registration = registration;

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('Service Worker ready');

      return registration;
    } catch (error) {
      console.error('Error registering service worker:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(token: string): Promise<boolean> {
    try {
      // Ensure service worker is registered
      if (!this.registration) {
        this.registration = await this.registerServiceWorker();
      }

      if (!this.registration) {
        console.error('Service worker registration failed');
        return false;
      }

      // Request permission if not granted
      if (!this.hasPermission()) {
        const granted = await this.requestPermission();
        if (!granted) {
          console.log('Notification permission denied');
          return false;
        }
      }

      // Get VAPID public key from backend
      const { data } = await axios.get(`${API_URL}/api/push/public-key`);
      const publicKey = data.publicKey;

      if (!publicKey) {
        console.error('No VAPID public key available');
        return false;
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      console.log('Push subscription created:', subscription);
      this.subscription = subscription;

      // Send subscription to backend
      await axios.post(
        `${API_URL}/api/push/subscribe`,
        { subscription: subscription.toJSON() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Push subscription sent to backend');
      return true;
    } catch (error: any) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(token: string): Promise<boolean> {
    try {
      if (!this.subscription) {
        // Try to get existing subscription
        if (this.registration) {
          this.subscription = await this.registration.pushManager.getSubscription();
        }
      }

      if (!this.subscription) {
        console.log('No active push subscription');
        return true;
      }

      const endpoint = this.subscription.endpoint;

      // Unsubscribe from push manager
      await this.subscription.unsubscribe();
      console.log('Unsubscribed from push manager');

      // Remove subscription from backend
      await axios.post(
        `${API_URL}/api/push/unsubscribe`,
        { endpoint },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Push subscription removed from backend');
      this.subscription = null;
      return true;
    } catch (error: any) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  /**
   * Check if user is currently subscribed
   */
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.registration) {
        this.registration = (await navigator.serviceWorker.getRegistration()) || null;
      }

      if (!this.registration) {
        return false;
      }

      const subscription = await this.registration.pushManager.getSubscription();
      this.subscription = subscription;
      return subscription !== null;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(token: string): Promise<boolean> {
    try {
      await axios.post(
        `${API_URL}/api/push/test`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Test notification sent');
      return true;
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  /**
   * Convert VAPID public key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushNotificationService = new PushNotificationService();

