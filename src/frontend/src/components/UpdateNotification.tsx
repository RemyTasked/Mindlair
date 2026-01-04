import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';

/**
 * Mind Garden PWA Auto-Update System
 * 
 * Updates are applied silently in the background. Users only see a brief
 * success toast after the update is complete - no manual action required.
 */

interface UpdateToastProps {
  message: string;
  onClose: () => void;
}

// Brief success toast shown after auto-update completes
export const UpdateToast: React.FC<UpdateToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-emerald-600 text-white rounded-xl shadow-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

// Loading indicator shown briefly during update
export const UpdateSpinner: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-800/90 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
        <p className="text-xs">Updating...</p>
      </div>
    </div>
  );
};

// Global state management for auto-update
let pendingUpdateCallback: (() => void) | null = null;

/**
 * Apply a pending update automatically
 * Called when a new service worker is ready
 */
export const applyAutoUpdate = (onUpdate: () => void) => {
  console.log('🔄 Auto-update: Applying update silently...');
  
  // Store the callback for after reload
  pendingUpdateCallback = onUpdate;
  
  // Show brief updating indicator then apply
  window.dispatchEvent(new CustomEvent('pwa-updating'));
  
  // Small delay to show the updating state, then apply
  setTimeout(() => {
    onUpdate();
  }, 300);
};

/**
 * Show success toast after update completes
 * Called on page load if we just updated
 */
export const showUpdateSuccessToast = () => {
  // Check if we just completed an update
  const justUpdated = sessionStorage.getItem('mindgarden_just_updated');
  if (justUpdated) {
    sessionStorage.removeItem('mindgarden_just_updated');
    window.dispatchEvent(new CustomEvent('pwa-updated'));
  }
};

/**
 * Mark that we're about to update (for success toast after reload)
 */
export const markUpdatePending = () => {
  sessionStorage.setItem('mindgarden_just_updated', 'true');
};

// Manager component to handle update UI globally
export const UpdateNotificationManager: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const handleUpdating = () => {
      setIsUpdating(true);
    };

    const handleUpdated = () => {
      setIsUpdating(false);
      setShowSuccess(true);
    };

    window.addEventListener('pwa-updating', handleUpdating);
    window.addEventListener('pwa-updated', handleUpdated);
    
    // Check on mount if we just updated
    showUpdateSuccessToast();

    return () => {
      window.removeEventListener('pwa-updating', handleUpdating);
      window.removeEventListener('pwa-updated', handleUpdated);
    };
  }, []);

  if (isUpdating) {
    return <UpdateSpinner />;
  }

  if (showSuccess) {
    return (
      <UpdateToast 
        message="Mind Garden updated! 🌱" 
        onClose={() => setShowSuccess(false)} 
      />
    );
  }

  return null;
};

// Legacy export for compatibility - now auto-applies instead of prompting
export const showUpdateNotification = (onUpdate: () => void) => {
  console.log('🔄 Auto-update: New version detected, applying automatically...');
  applyAutoUpdate(onUpdate);
};

export const hideUpdateNotification = () => {
  // No-op for compatibility
};
