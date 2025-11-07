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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      let message = 'Push notifications are not supported in your browser. Please use Chrome, Firefox, Edge, or Safari 16+ on macOS 13+.';
      
      if (isIOS) {
        message = 'Browser push notifications are not yet supported on iOS/iPadOS.\n\n' +
                  'You can still receive notifications via:\n' +
                  '• Email (enabled above)\n' +
                  '• SMS (enable below with your phone number)\n' +
                  '• Slack (if configured)\n\n' +
                  'For browser push notifications, please use Chrome, Firefox, or Edge on desktop.';
      } else if (isSafari) {
        message = 'Safari has limited support for push notifications. Please use Chrome, Firefox, or Edge for the best experience.';
      }
      
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">
          ℹ️ {isIOS ? 'iOS Browser Notifications Not Available' : 'Browser Push Notifications Not Supported'}
        </p>
        <p className="text-xs text-blue-700">
          {isIOS 
            ? 'iOS doesn\'t support browser push notifications yet. You can still receive notifications via Email (above) or SMS (below with your phone number).'
            : 'Please use a modern browser like Chrome, Firefox, or Edge for push notifications.'
          }
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
        <div className="ml-8 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-900 mb-1">
                ✅ Push Notifications Enabled
              </p>
              <p className="text-xs text-indigo-700">
                Test your notifications to make sure they're working
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm hover:shadow-md"
            >
              {isLoading ? 'Sending...' : '🧪 Send Test'}
            </button>
          </div>
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

