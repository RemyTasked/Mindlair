import React, { useEffect, useState } from 'react';
import { pushNotificationService } from '../services/pushNotificationService';

interface PushNotificationManagerProps {
  token: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  token,
  enabled,
  onToggle,
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(pushNotificationService.isSupported());
    
    if (pushNotificationService.isSupported()) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    const subscribed = await pushNotificationService.isSubscribed();
    setIsSubscribed(subscribed);
  };

  const handleToggle = async () => {
    if (!isSupported) {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const message = isSafari
        ? 'Safari has limited support for push notifications. For the best experience, please use Chrome, Firefox, or Edge.'
        : 'Push notifications are not supported in your browser. Please use Chrome, Firefox, Edge, or Safari 16+.';
      alert(message);
      return;
    }

    setIsLoading(true);

    try {
      if (enabled) {
        // User wants to disable
        const success = await pushNotificationService.unsubscribe(token);
        if (success) {
          setIsSubscribed(false);
          onToggle(false);
        } else {
          alert('Failed to disable push notifications. Please try again.');
        }
      } else {
        // User wants to enable
        const success = await pushNotificationService.subscribe(token);
        if (success) {
          setIsSubscribed(true);
          setPermission(Notification.permission);
          onToggle(true);
        } else {
          if (Notification.permission === 'denied') {
            alert(
              'Push notifications are blocked. Please enable them in your browser settings.'
            );
          } else {
            alert('Failed to enable push notifications. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      alert('Please enable push notifications first.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await pushNotificationService.sendTestNotification(token);
      if (success) {
        // Show a brief success message
        alert('Test notification sent! Check your notifications.');
      } else {
        alert('Failed to send test notification. Please try again.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          ⚠️ Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800 mb-2">
          🚫 Push notifications are blocked in your browser.
        </p>
        <p className="text-xs text-red-600">
          To enable them, click the lock icon in your address bar and allow notifications for this site.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              disabled={isLoading}
              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Enable Push Notifications
              </span>
              <p className="text-xs text-gray-500">
                Get notified about meetings and flows even when the app is closed
              </p>
            </div>
          </label>
        </div>
      </div>

      {enabled && isSubscribed && (
        <div className="ml-8">
          <button
            onClick={handleTestNotification}
            disabled={isLoading}
            className="text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Test Notification'}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="ml-8 text-xs text-gray-500">
          Processing...
        </div>
      )}
    </div>
  );
};

