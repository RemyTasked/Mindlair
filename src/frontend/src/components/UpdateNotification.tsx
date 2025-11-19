import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface UpdateNotificationProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-xl shadow-2xl p-4 border border-indigo-400">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <RefreshCw className={`w-6 h-6 text-white ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1">
            {isUpdating ? (
              <>
                <h3 className="font-semibold text-lg mb-1">Updating... ✨</h3>
                <p className="text-sm text-indigo-100">
                  Refreshing to the latest version. This will only take a moment!
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-1">Update Available! ✨</h3>
                <p className="text-sm text-indigo-100 mb-3">
                  A new version of Meet Cute is ready. Update now to get the latest features and improvements.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsUpdating(true);
                      // Small delay to show the updating state
                      setTimeout(() => {
                        onUpdate();
                      }, 500);
                    }}
                    className="flex-1 px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm shadow-md"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      onDismiss();
                    }}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors font-medium text-sm"
                  >
                    Later
                  </button>
                </div>
                <p className="text-xs text-indigo-200 mt-2">
                  💡 Tip: Update during a break to avoid interrupting your workflow
                </p>
              </>
            )}
          </div>
          {!isUpdating && (
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="flex-shrink-0 text-white hover:text-indigo-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Global state management for update notification
let updateNotificationCallback: (() => void) | null = null;

export const showUpdateNotification = (onUpdate: () => void) => {
  console.log('🔔 showUpdateNotification called - showing notification');
  updateNotificationCallback = onUpdate;
  // Dispatch event immediately to show notification
  window.dispatchEvent(new CustomEvent('show-update-notification'));
  // Also try a small delay in case event listener isn't ready
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('show-update-notification'));
  }, 100);
};

export const hideUpdateNotification = () => {
  window.dispatchEvent(new CustomEvent('hide-update-notification'));
};

// Manager component to handle the notification globally
export const UpdateNotificationManager: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);
  const [updateCallback, setUpdateCallback] = useState<(() => void) | null>(null);

  useEffect(() => {
    const handleShow = () => {
      console.log('🔔 UpdateNotificationManager: show-update-notification event received');
      if (updateNotificationCallback) {
        setUpdateCallback(() => updateNotificationCallback);
        setShowNotification(true);
      } else {
        console.warn('⚠️ UpdateNotificationManager: No callback set yet');
      }
    };

    const handleHide = () => {
      setShowNotification(false);
    };

    window.addEventListener('show-update-notification', handleShow);
    window.addEventListener('hide-update-notification', handleHide);

    return () => {
      window.removeEventListener('show-update-notification', handleShow);
      window.removeEventListener('hide-update-notification', handleHide);
    };
  }, []);

  if (!showNotification || !updateCallback) return null;

  return (
    <UpdateNotification
      onUpdate={() => {
        updateCallback();
        setShowNotification(false);
      }}
      onDismiss={() => {
        setShowNotification(false);
        // Show again in 1 hour if user dismisses
        setTimeout(() => {
          setShowNotification(true);
        }, 60 * 60 * 1000);
      }}
    />
  );
};

