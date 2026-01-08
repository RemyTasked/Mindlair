import { useState, useEffect } from 'react';
import api from '../lib/axios';

/**
 * Push Notification Settings Component
 * 
 * Handles:
 * - Requesting notification permissions
 * - Subscribing to push notifications
 * - Displaying subscription status
 * - Testing notifications
 */

export default function PushNotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    checkNotificationStatus();
    fetchPublicKey();
  }, []);

  const checkNotificationStatus = async () => {
    if (!('Notification' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    setPermission(Notification.permission);

    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }
  };

  const fetchPublicKey = async () => {
    try {
      const response = await api.get('/api/push/public-key');
      setPublicKey(response.data.publicKey);
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!publicKey) {
      alert('Push notifications not configured on server');
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        alert('Please allow notifications to receive meeting reminders');
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to backend
      await api.post('/api/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      alert('✅ Push notifications enabled! You\'ll receive meeting reminders.');
    } catch (error: any) {
      console.error('Error subscribing to push notifications:', error);
      alert('Failed to enable push notifications: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/api/push/unsubscribe', {
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      alert('Push notifications disabled');
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      alert('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await api.post('/api/push/test');
      alert('Test notification sent! Check your device.');
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification');
    }
  };

  // Check if push notifications are supported
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">
              Push Notifications Not Supported
            </h4>
            <p className="text-sm text-yellow-800">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Safari on iOS 16.4+.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className={`rounded-lg p-4 border-2 ${
        isSubscribed 
          ? 'bg-cyan-50 border-cyan-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {isSubscribed ? '🔔' : '🔕'}
          </span>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">
              Push Notifications
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              {isSubscribed
                ? 'You\'ll receive notifications for meetings, flows, and reminders'
                : 'Enable notifications to get meeting reminders even when the app is closed'}
            </p>
            
            {/* Permission Status */}
            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded-full ${
                permission === 'granted' 
                  ? 'bg-cyan-100 text-cyan-700'
                  : permission === 'denied'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {permission === 'granted' ? '✓ Allowed' : permission === 'denied' ? '✗ Blocked' : '○ Not Set'}
              </span>
              {isSubscribed && (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  ✓ Subscribed
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isSubscribed ? (
                <button
                  onClick={subscribeToPush}
                  disabled={isLoading || permission === 'denied'}
                  className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-600 text-white rounded-lg font-semibold hover:from-teal-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? 'Enabling...' : '🔔 Enable Notifications'}
                </button>
              ) : (
                <>
                  <button
                    onClick={sendTestNotification}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                  >
                    📬 Send Test
                  </button>
                  <button
                    onClick={unsubscribeFromPush}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {isLoading ? 'Disabling...' : 'Disable'}
                  </button>
                </>
              )}
            </div>

            {permission === 'denied' && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ Notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <span>💡</span>
          What you'll receive:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Pre-meeting cues (5 minutes before meetings)</li>
          <li>• Presley Flow reminders (morning & evening)</li>
          <li>• Wellness check-ins (breathing, walks, mindful moments)</li>
          <li>• New Director's Insights</li>
        </ul>
      </div>
    </div>
  );
}

