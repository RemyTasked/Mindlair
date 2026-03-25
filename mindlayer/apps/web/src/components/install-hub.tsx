"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Apple, 
  Monitor,
  Download,
  Share,
  Bell,
  Wifi,
  Plus,
  Check
} from "lucide-react";

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

interface DetectedDevice {
  platform: PlatformType;
  isMobile: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const GITHUB_REPO = "clodel-MeetCute/meet-cute";
const APP_VERSION = "0.1.0";

const DOWNLOAD_URLS = {
  mac: `https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlayer_${APP_VERSION}_x64.dmg`,
  macArm: `https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlayer_${APP_VERSION}_aarch64.dmg`,
  windows: `https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlayer_${APP_VERSION}_x64-setup.exe`,
  linux: `https://github.com/${GITHUB_REPO}/releases/latest/download/mindlayer_${APP_VERSION}_amd64.AppImage`,
};

function detectDevice(): DetectedDevice {
  if (typeof window === "undefined") {
    return { platform: "other", isMobile: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android/.test(ua);
  
  let platform: PlatformType = "other";
  
  if (ua.includes("iphone") || ua.includes("ipad")) {
    platform = "ios";
  } else if (ua.includes("android")) {
    platform = "android";
  } else if (ua.includes("mac")) {
    platform = "mac";
  } else if (ua.includes("win")) {
    platform = "windows";
  } else if (ua.includes("linux")) {
    platform = "linux";
  }

  return { platform, isMobile };
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.002c-.06-.135-.12-.2-.246-.334-.09-.134-.2-.2-.416-.333l-.003-.003c-.22-.135-.46-.268-.86-.468l-.003-.002a6.683 6.683 0 00-.235-.136c.014-.136.014-.267-.007-.465-.04-.268-.12-.47-.214-.736-.201-.4-.468-.866-.927-1.467-.027-.048-.09-.135-.18-.2-.089-.134-.27-.332-.55-.465-.236-.135-.52-.201-.87-.2h-.005c-.048 0-.085.015-.133.017-.067.005-.132.017-.2.03-.469.085-.876.468-1.188.933-.167.266-.267.535-.336.866-.08.268-.12.47-.155.803l-.003.003c-.291-.002-.586.066-.877.2l-.003.003c-.14.065-.26.2-.397.333a.996.996 0 00-.121.334c-.09.4-.148.666-.163.933-.015.4.06.733.21 1.002-.09.003-.175.016-.265.065-.442.22-.667.6-.8.867-.067.266-.1.4-.067.733.033.3.17.6.4.867.22.268.52.4.853.533.353.1.686.166 1.02.133.333-.033.666-.133.867-.4.167-.2.267-.467.312-.733.03-.2.1-.333.148-.467.067-.134.167-.267.267-.333.27-.2.453-.333.58-.533a.5.5 0 00.048-.066c.058.135.094.27.106.403.026.265-.034.535-.14.867-.106.328-.267.728-.32 1.2-.04.398.034.798.173 1.267.134.398.334.798.534 1.066.2.27.4.4.53.4.138 0 .208-.133.143-.4a.99.99 0 00-.088-.267c-.05-.133-.133-.334-.218-.534-.085-.2-.18-.4-.238-.6a1.16 1.16 0 01-.052-.267c0-.07.01-.134.027-.2.023-.066.05-.134.103-.2.09-.134.207-.27.382-.333.167-.067.4-.134.68-.134.28.002.492.002.752.068.247.065.48.2.6.465.12.27.2.6.28.934.067.332.127.666.207.932.08.27.167.472.287.605.12.132.266.2.418.2.15 0 .333-.068.483-.203.15-.136.3-.336.4-.6.105-.27.18-.6.213-.934a3.86 3.86 0 00-.027-.998c-.073-.4-.207-.868-.463-1.334-.22-.4-.46-.8-.74-1.067a4.703 4.703 0 00-.266-.2c-.02-.013-.024-.03-.047-.042.013-.066.03-.133.04-.2.026-.135.047-.268.053-.4a1.07 1.07 0 00-.007-.2c-.01-.068-.015-.133-.04-.2-.025-.063-.055-.126-.093-.186-.138-.2-.32-.33-.513-.466l-.14-.086-.1-.066c-.063-.044-.126-.088-.184-.138-.005-.067.006-.134.006-.2v-.013c.018-.27.03-.535-.006-.8-.04-.27-.128-.47-.274-.733-.15-.27-.366-.535-.664-.8-.12-.133-.267-.2-.4-.334-.137-.133-.267-.2-.4-.267-.067-.067-.133-.067-.2-.133h-.007c-.02-.133-.04-.266-.067-.333-.058-.135-.128-.2-.2-.333-.067-.133-.137-.2-.2-.267-.2-.2-.465-.4-.733-.532-.267-.134-.534-.2-.8-.334a6.62 6.62 0 01-.534-.2 15.02 15.02 0 01-.466-.2h-.003v-.002c-.267-.067-.533-.2-.8-.267-.266-.133-.466-.133-.733-.2l-.025-.003c-.21-.05-.4-.103-.56-.168-.18-.066-.34-.138-.473-.22l-.001-.001a2.9 2.9 0 01-.267-.2c-.069-.066-.127-.133-.183-.2.16-.075.31-.163.449-.263.283-.2.5-.4.65-.6.15-.134.23-.27.28-.335.05-.067.074-.133.074-.133 0-.003 0-.003 0-.003z"/>
    </svg>
  );
}

export function InstallHub() {
  const [device, setDevice] = useState<DetectedDevice | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsPwaInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsPwaInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!device) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-zinc-400">Detecting your device...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Primary CTA based on device */}
      {device.isMobile ? (
        <MobilePwaCard 
          platform={device.platform} 
          onInstall={handlePwaInstall}
          canInstall={!!deferredPrompt}
          isInstalled={isPwaInstalled}
        />
      ) : (
        <DesktopDownloadCard platform={device.platform} />
      )}

      {/* Toggle other platforms */}
      <div className="space-y-4">
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mx-auto"
        >
          {showAll ? "Hide other options" : "Show all platforms"}
        </button>

        {showAll && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Desktop Apps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Desktop App
                </CardTitle>
                <CardDescription>
                  Full passive capture on your computer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PlatformLink
                  label="macOS (Apple Silicon)"
                  available
                  icon={Apple}
                  href={DOWNLOAD_URLS.macArm}
                />
                <PlatformLink
                  label="macOS (Intel)"
                  available
                  icon={Apple}
                  href={DOWNLOAD_URLS.mac}
                />
                <PlatformLink
                  label="Windows"
                  available
                  icon={WindowsIcon}
                  href={DOWNLOAD_URLS.windows}
                />
                <PlatformLink
                  label="Linux (AppImage)"
                  available
                  icon={LinuxIcon}
                  href={DOWNLOAD_URLS.linux}
                />
              </CardContent>
            </Card>

            {/* Mobile PWA */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Mobile App
                </CardTitle>
                <CardDescription>
                  View your map and share content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Install as a Progressive Web App:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Bell className="w-4 h-4 text-rose-500" />
                      Push notifications
                    </li>
                    <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Share className="w-4 h-4 text-rose-500" />
                      Share from any app
                    </li>
                    <li className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Wifi className="w-4 h-4 text-rose-500" />
                      Works offline
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-zinc-500">
                  Open mindlayer.app on your phone and tap &quot;Add to Home Screen&quot;
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Integration callout */}
      <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
            Use <strong>Readwise</strong>, <strong>Pocket</strong>, or{" "}
            <strong>Instapaper</strong>? Connect after install to import your reading history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function DesktopDownloadCard({ platform }: { platform: PlatformType }) {
  const platformConfig = {
    mac: {
      icon: Apple,
      label: "Mac",
      url: DOWNLOAD_URLS.mac,
      note: "macOS 10.15+ required",
    },
    windows: {
      icon: WindowsIcon,
      label: "Windows",
      url: DOWNLOAD_URLS.windows,
      note: "Windows 10+ required",
    },
    linux: {
      icon: LinuxIcon,
      label: "Linux",
      url: DOWNLOAD_URLS.linux,
      note: "AppImage - works on most distributions",
    },
    other: {
      icon: Monitor,
      label: "Desktop",
      url: DOWNLOAD_URLS.mac,
      note: "Select your platform below",
    },
  };

  const config = platformConfig[platform as keyof typeof platformConfig] || platformConfig.other;
  const Icon = config.icon;

  return (
    <Card className="border-2 border-zinc-900 dark:border-zinc-100 shadow-xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl">Get Mindlayer</CardTitle>
        <CardDescription className="text-base">
          Silently captures what you read, watch, and listen to
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button
          size="xl"
          variant="gradient"
          className="w-full max-w-sm"
          onClick={() => {
            window.location.href = config.url;
          }}
        >
          <Icon className="w-5 h-5 mr-2" />
          Download for {config.label}
          <Download className="w-4 h-4 ml-1" />
        </Button>
        <p className="text-xs text-zinc-500 text-center max-w-xs">
          {config.note}. Free, no account needed.
        </p>
        
        {/* Quick links to other platforms */}
        {platform !== "other" && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 w-full max-w-sm">
            <span className="text-xs text-zinc-400">Also available:</span>
            {platform !== "mac" && (
              <a href={DOWNLOAD_URLS.mac} className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline">
                Mac
              </a>
            )}
            {platform !== "windows" && (
              <a href={DOWNLOAD_URLS.windows} className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline">
                Windows
              </a>
            )}
            {platform !== "linux" && (
              <a href={DOWNLOAD_URLS.linux} className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline">
                Linux
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MobilePwaCard({ 
  platform, 
  onInstall, 
  canInstall,
  isInstalled 
}: { 
  platform: PlatformType;
  onInstall: () => void;
  canInstall: boolean;
  isInstalled: boolean;
}) {
  const isIOS = platform === "ios";

  if (isInstalled) {
    return (
      <Card className="border-2 border-emerald-500 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Mindlayer Installed</CardTitle>
          <CardDescription>
            You&apos;re all set! Open from your home screen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-zinc-900 dark:border-zinc-100 shadow-xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl">Add Mindlayer</CardTitle>
        <CardDescription className="text-base">
          Install on your home screen for the best experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PWA Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Notifications</p>
          </div>
          <div className="space-y-1">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
              <Share className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Share Target</p>
          </div>
          <div className="space-y-1">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
              <Wifi className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Works Offline</p>
          </div>
        </div>

        {/* Install Instructions */}
        {isIOS ? (
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              To install on iPhone/iPad:
            </p>
            <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button in Safari</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                <span>Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                <span>Tap <strong>&quot;Add&quot;</strong> in the top right</span>
              </li>
            </ol>
          </div>
        ) : canInstall ? (
          <Button
            size="xl"
            variant="gradient"
            className="w-full"
            onClick={onInstall}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add to Home Screen
          </Button>
        ) : (
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              To install on Android:
            </p>
            <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                <span>Tap the menu (three dots) in Chrome</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                <span>Tap <strong>&quot;Add to Home screen&quot;</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                <span>Tap <strong>&quot;Add&quot;</strong></span>
              </li>
            </ol>
          </div>
        )}

        <p className="text-xs text-zinc-500 text-center">
          Free to use. Sign in to sync with your desktop.
        </p>
      </CardContent>
    </Card>
  );
}

function PlatformLink({
  label,
  available,
  comingSoon,
  icon: Icon,
  href,
}: {
  label: string;
  available?: boolean;
  comingSoon?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      {comingSoon ? (
        <Badge variant="secondary" className="text-xs">
          Soon
        </Badge>
      ) : available ? (
        <Download className="w-4 h-4 text-zinc-400" />
      ) : null}
    </>
  );

  if (available && href) {
    return (
      <a
        href={href}
        className="flex items-center justify-between p-3 rounded-lg border transition-all border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 cursor-pointer"
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        available
          ? "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
          : "border-zinc-100 dark:border-zinc-800/50 opacity-60"
      }`}
    >
      {content}
    </div>
  );
}
