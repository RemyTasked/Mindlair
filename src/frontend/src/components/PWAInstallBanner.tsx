/**
 * Mind Garden - PWA Install Banner
 * 
 * Prompts users to install Mind Garden as a Progressive Web App.
 * - On Desktop/Android: Uses beforeinstallprompt event
 * - On iOS: Provides manual instructions (Share -> Add to Home Screen)
 * - Dismissible and remembers user preference
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Smartphone, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallBannerProps {
  variant?: 'banner' | 'modal';
  onDismiss?: () => void;
}

export default function PWAInstallBanner({ variant = 'banner', onDismiss }: PWAInstallBannerProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showDesktopInstructions, setShowDesktopInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode || isIOSStandalone);

    // If already installed, don't show banner
    if (isInStandaloneMode || isIOSStandalone) {
      return;
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect Mac (for Safari instructions)
    const mac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent) && !iOS;
    setIsMac(mac);

    // Detect mobile
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('mindgarden_pwa_dismissed');
    const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    
    // Show banner if never dismissed or dismissed more than 7 days ago
    if (!dismissed || daysSinceDismissed > 7) {
      setShowBanner(true);
    }

    // Listen for beforeinstallprompt (Desktop/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Edge on Android or Desktop - use native prompt
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          setShowBanner(false);
        }
      } catch (err) {
        console.warn('Install prompt failed:', err);
        // Fall back to showing instructions
        if (isMobile) {
          setShowIOSInstructions(true);
        } else {
          setShowDesktopInstructions(true);
        }
      }
      setDeferredPrompt(null);
      setInstalling(false);
    } else if (isIOS) {
      // iOS Safari - show manual instructions
      setShowIOSInstructions(true);
    } else if (isMac || !isMobile) {
      // Desktop (Mac Safari, Firefox, etc.) - show desktop instructions
      setShowDesktopInstructions(true);
    } else {
      // Android browser that doesn't support beforeinstallprompt
      setShowIOSInstructions(true); // Use mobile instructions
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('mindgarden_pwa_dismissed', Date.now().toString());
    setShowBanner(false);
    setShowIOSInstructions(false);
    onDismiss?.();
  };

  // Don't render if already installed or banner dismissed
  if (isStandalone || !showBanner) {
    return null;
  }

  // iOS/Mobile Instructions Modal
  if (showIOSInstructions) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Install Mind Garden</h3>
              </div>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Add Mind Garden to your home screen for quick access and a native app experience.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Tap the Share button</p>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Share className="w-5 h-5" />
                    <span>at the bottom of Safari</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Scroll & tap "Add to Home Screen"</p>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Plus className="w-5 h-5 p-0.5 border border-gray-400 rounded" />
                    <span>in the share menu</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">Tap "Add" to confirm</p>
                  <p className="text-gray-600 text-sm">Mind Garden will appear on your home screen</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop Instructions Modal (for Safari, Firefox, etc.)
  if (showDesktopInstructions) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    const isChrome = /chrome/i.test(navigator.userAgent) && !/edge|edg/i.test(navigator.userAgent);
    
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4"
          onClick={() => setShowDesktopInstructions(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                  🌱
                </div>
                <h3 className="text-xl font-bold text-gray-900">Install Mind Garden</h3>
              </div>
              <button
                onClick={() => setShowDesktopInstructions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Add Mind Garden to your desktop for quick access anytime.
            </p>

            <div className="space-y-4 mb-6">
              {isChrome && (
                <>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Click the install icon</p>
                      <p className="text-gray-600 text-sm">Look for ⊕ in the address bar (right side)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Click "Install"</p>
                      <p className="text-gray-600 text-sm">Mind Garden will open as a standalone app</p>
                    </div>
                  </div>
                </>
              )}
              
              {isSafari && (
                <>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Click File → Add to Dock</p>
                      <p className="text-gray-600 text-sm">In the Safari menu bar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Click "Add"</p>
                      <p className="text-gray-600 text-sm">Mind Garden will appear in your Dock</p>
                    </div>
                  </div>
                </>
              )}
              
              {isFirefox && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="font-medium text-amber-900 mb-1">Firefox doesn't support PWA installation</p>
                  <p className="text-amber-700 text-sm">
                    For the best experience, try using Chrome, Edge, or Safari. 
                    You can still bookmark this page for quick access!
                  </p>
                </div>
              )}
              
              {!isChrome && !isSafari && !isFirefox && (
                <>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Look for an install option</p>
                      <p className="text-gray-600 text-sm">Check your browser's menu or address bar for an "Install" or "Add to..." option</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">Or bookmark this page</p>
                      <p className="text-gray-600 text-sm">Press Cmd+D (Mac) or Ctrl+D (Windows) to bookmark</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowDesktopInstructions(false)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Banner variant (default)
  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative z-10 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 py-4 shadow-lg rounded-xl mx-4 mt-4 md:mx-6 md:mt-6"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo with high contrast background */}
            <div className="p-2 bg-white rounded-xl flex-shrink-0 shadow-md">
              <span className="text-2xl">🌱</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base drop-shadow-sm">
                {isMobile ? 'Add Mind Garden to your home screen!' : 'Install Mind Garden for quick access!'}
              </p>
              <p className="text-xs sm:text-sm text-white/90 hidden sm:block">
                Get instant access, offline support, and push notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-bold text-sm hover:bg-orange-50 transition-colors disabled:opacity-50 shadow-md"
            >
              {installing ? (
                <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Modal variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              🌱
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Install Mind Garden</h3>
            <p className="text-gray-600">
              Add to your {isMobile ? 'home screen' : 'desktop'} for the best experience
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl mb-1">⚡</div>
              <p className="text-xs text-gray-600">Instant Access</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl mb-1">📴</div>
              <p className="text-xs text-gray-600">Works Offline</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl mb-1">🔔</div>
              <p className="text-xs text-gray-600">Notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-50"
            >
              {installing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {isIOS ? 'Show Me How' : 'Install App'}
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="w-full py-3 text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              Continue in browser
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

