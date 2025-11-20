import { useState, useEffect } from 'react';
import Logo from './Logo';

/**
 * PWA Install Prompt Component
 * 
 * Shows a banner prompting users to install the app on their device.
 * - Detects if app is already installed
 * - Shows platform-specific instructions (iOS vs Android)
 * - Can be dismissed and won't show again for 7 days
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode || isIOSStandalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check if user dismissed prompt recently
    const dismissedDate = localStorage.getItem('pwa-install-dismissed');
    if (dismissedDate) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days
      }
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show prompt after a delay if not installed
    if (iOS && !isIOSStandalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`🎬 PWA Install: User ${outcome}`);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
    // For iOS, the prompt just shows instructions
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed or user dismissed
  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-slide-up">
      <div className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-600 to-teal-600 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Logo size="md" />
              <div>
                <h3 className="text-lg font-bold">Install Meet Cute</h3>
                <p className="text-sm text-indigo-100">
                  Get the full experience with our app
                </p>
              </div>
            </div>

            {isIOS ? (
              // iOS-specific instructions
              <div className="text-sm text-indigo-100 space-y-2 bg-white/10 rounded-lg p-4">
                <p className="font-semibold">To install on iPhone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the <strong>Share</strong> button (square with arrow) below</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right</li>
                </ol>
              </div>
            ) : (
              // Android/Chrome
              <div className="text-sm text-indigo-100 mb-4">
                <p>✨ Instant access from your home screen</p>
                <p>⚡ Faster loading and offline support</p>
                <p>🔔 Get meeting reminders (coming soon)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isIOS && (
          <button
            onClick={handleInstallClick}
            className="mt-4 w-full bg-white text-indigo-600 font-bold py-3 px-6 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Install Now
          </button>
        )}
      </div>
    </div>
  );
}

