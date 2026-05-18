"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Clock, 
  RefreshCw, 
  Key,
  Copy,
  Trash2,
  Plus,
  LogOut,
  Play,
  Download,
  Monitor,
  Globe,
  Smartphone,
  Share,
} from "lucide-react";
import { PushNotifications } from "@/components/push-notifications";
import { APP_VERSION, GITHUB_REPO } from "@/lib/app-config";

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

function detectDevice(): { platform: PlatformType; isMobile: boolean } {
  if (typeof window === "undefined") return { platform: "other", isMobile: false };
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android/.test(ua);
  let platform: PlatformType = "other";
  if (ua.includes("iphone") || ua.includes("ipad")) platform = "ios";
  else if (ua.includes("android")) platform = "android";
  else if (ua.includes("mac")) platform = "mac";
  else if (ua.includes("win")) platform = "windows";
  else if (ua.includes("linux")) platform = "linux";
  return { platform, isMobile };
}

interface DigestWindow {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface UserSettings {
  displayName: string | null;
  digestWindows: {
    morning: DigestWindow;
    evening: DigestWindow;
  };
  notifications: {
    push: boolean;
    email: boolean;
  };
  timezone: string;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UserSession {
  id: string;
  email: string;
  name: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ platform: PlatformType; isMobile: boolean } | null>(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  useEffect(() => {
    setDeviceInfo(detectDevice());
  }, []);

  const fetchSettings = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [settingsRes, apiKeysRes, sessionRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/auth/api-keys"),
        fetch("/api/auth/session"),
      ]);
      
      if (settingsRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      
      if (!settingsRes.ok) throw new Error("Failed to fetch settings");
      
      const settingsData = await settingsRes.json();
      setSettings(settingsData);
      if (typeof settingsData.displayName === "string" || settingsData.displayName === null) {
        setDisplayNameDraft(settingsData.displayName ?? "");
      }
      
      if (apiKeysRes.ok) {
        const apiKeysData = await apiKeysRes.json();
        setApiKeys(apiKeysData.keys || []);
      }
      
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.authenticated) {
          setCurrentUser(sessionData.user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!opts?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    setIsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setSettings((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (err) {
      console.error("Failed to update settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisplayName = async () => {
    setDisplayNameSaving(true);
    setDisplayNameError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayNameDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDisplayNameError(data.message || "Could not save display name");
        return;
      }
      await fetchSettings({ silent: true });
    } catch {
      setDisplayNameError("Network error. Try again.");
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsCreatingKey(true);
    try {
      const response = await fetch("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey(data.key);
        setNewKeyName("");
        fetchSettings();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create API key");
      }
    } catch (err) {
      alert("Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };
  
  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Any devices using it will be disconnected.")) return;
    
    try {
      const response = await fetch(`/api/auth/api-keys?id=${keyId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchSettings();
      } else {
        alert("Failed to revoke API key");
      }
    } catch (err) {
      alert("Failed to revoke API key");
    }
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      prompt("Copy this key:", text);
    }
  };
  
  const handleLogout = async (allDevices: boolean = false) => {
    try {
      await fetch(`/api/auth/session${allDevices ? '?all=true' : ''}`, {
        method: "DELETE",
      });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const rerunOnboarding = async () => {
    setIsResettingOnboarding(true);
    try {
      await fetch("/api/onboarding", { method: "DELETE" });
      router.push("/onboarding");
    } catch (err) {
      console.error("Failed to reset onboarding:", err);
      setIsResettingOnboarding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <p className="text-red-500 mb-4">{error || "Failed to load settings"}</p>
          <Button onClick={() => fetchSettings()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Settings
        </h1>
        <p className="text-zinc-500">
          Configure how Mindlair captures and delivers your digests.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Account
            </CardTitle>
            <CardDescription>
              {currentUser?.email || "Manage your account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="display-name" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Display name
              </label>
              <p className="text-sm text-zinc-500">
                How you appear on posts, comments, and your profile. Your sign-in email is never shown to other
                users. At least 2 characters; you cannot use the word &quot;Anonymous&quot; or an email-style name
                (no @).
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="display-name"
                  type="text"
                  minLength={2}
                  maxLength={60}
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <Button type="button" variant="outline" onClick={saveDisplayName} disabled={displayNameSaving}>
                  {displayNameSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save name"}
                </Button>
              </div>
              {displayNameError && <p className="text-sm text-red-500">{displayNameError}</p>}
              <p className="text-xs text-zinc-500">
                Required before you can publish posts or leave comments. Changing your name updates how past content
                shows as well.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Re-run setup</p>
                <p className="text-sm text-zinc-500">Go through onboarding again</p>
              </div>
              <Button variant="outline" onClick={rerunOnboarding} disabled={isResettingOnboarding}>
                {isResettingOnboarding ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-zinc-500">Sign out of this device</p>
              </div>
              <Button variant="outline" onClick={() => handleLogout(false)}>
                Sign out
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out everywhere</p>
                <p className="text-sm text-zinc-500">Sign out of all devices</p>
              </div>
              <Button variant="outline" onClick={() => handleLogout(true)}>
                Sign out all
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Downloads - Device-aware */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {deviceInfo?.isMobile ? "Install App" : "Downloads"}
            </CardTitle>
            <CardDescription>
              {deviceInfo?.platform === "ios" 
                ? "Add Mindlair to your home screen for the best experience."
                : deviceInfo?.platform === "android"
                ? "Install the app or add to your home screen."
                : "Install apps and extensions to capture what you consume."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* iOS - Add to Home Screen */}
            {deviceInfo?.platform === "ios" && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">Add to Home Screen</h4>
                  <p className="text-xs text-zinc-500 mb-3">Get the full app experience with notifications and offline support.</p>
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      <strong>In Safari:</strong> Tap <Share className="w-4 h-4 inline align-text-bottom mx-1" /> Share → <strong>Add to Home Screen</strong>
                    </p>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    Works best in Safari. You&apos;ll get push notifications and quick access from your home screen.
                  </p>
                </div>
              </div>
            )}

            {/* Android - Add to Home Screen + APK */}
            {deviceInfo?.platform === "android" && (
              <>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Add to Home Screen</h4>
                    <p className="text-xs text-zinc-500 mb-3">Quick access with notifications — no download needed.</p>
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        <strong>In Chrome:</strong> Tap <strong>⋮</strong> menu → <strong>Add to Home screen</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Download className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Android App (APK)</h4>
                      <p className="text-xs text-zinc-500 mb-2">Native app with passive capture for podcasts and videos</p>
                      <a
                        href={`https://github.com/${GITHUB_REPO}/releases/download/android-v${APP_VERSION}/mindlair-${APP_VERSION}-debug.apk`}
                        className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 transition-colors inline-flex items-center gap-1 text-white font-medium"
                      >
                        <Download className="w-3 h-3" /> Download APK
                      </a>
                      <p className="text-xs text-zinc-600 mt-2">
                        Requires Android 8.0+. Enable &quot;Install from unknown sources&quot; to install.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Desktop - Apps and Extensions */}
            {!deviceInfo?.isMobile && (
              <>
                {/* Desktop Apps */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Desktop Companion</h4>
                    <p className="text-xs text-zinc-500 mb-2">Captures what you read and watch across all browsers</p>
                    <div className="flex flex-wrap gap-2">
                      {deviceInfo?.platform === "mac" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_aarch64.dmg`}
                          className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 transition-colors inline-flex items-center gap-1 text-white font-medium"
                        >
                          <Download className="w-3 h-3" /> macOS (Recommended)
                        </a>
                      )}
                      {deviceInfo?.platform === "windows" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_x64-setup.exe`}
                          className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 transition-colors inline-flex items-center gap-1 text-white font-medium"
                        >
                          <Download className="w-3 h-3" /> Windows (Recommended)
                        </a>
                      )}
                      {deviceInfo?.platform === "linux" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_amd64.AppImage`}
                          className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 transition-colors inline-flex items-center gap-1 text-white font-medium"
                        >
                          <Download className="w-3 h-3" /> Linux (Recommended)
                        </a>
                      )}
                      {deviceInfo?.platform !== "mac" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_aarch64.dmg`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> macOS
                        </a>
                      )}
                      {deviceInfo?.platform !== "windows" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_x64-setup.exe`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Windows
                        </a>
                      )}
                      {deviceInfo?.platform !== "linux" && (
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/latest/download/Mindlair_${APP_VERSION}_amd64.AppImage`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Linux
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Browser Extensions */}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Browser Extensions</h4>
                      <p className="text-xs text-zinc-500 mb-2">Passively tracks articles and videos you read</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/download/ext-v${APP_VERSION}/mindlair-chrome-${APP_VERSION}.zip`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Chrome
                        </a>
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/download/ext-v${APP_VERSION}/mindlair-firefox-${APP_VERSION}.zip`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Firefox
                        </a>
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/download/ext-v${APP_VERSION}/mindlair-edge-${APP_VERSION}.zip`}
                          className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Edge
                        </a>
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">
                        Extract the ZIP and load as an unpacked extension. Store versions coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Digest & Nudge Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Digest & Nudge Schedule
            </CardTitle>
            <CardDescription>
              When should we send your digest? Nudges are delivered alongside your digest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DigestWindowSetting
              label="Morning Digest"
              enabled={settings.digestWindows.morning.enabled}
              hour={settings.digestWindows.morning.hour}
              minute={settings.digestWindows.morning.minute}
              onToggle={(enabled) =>
                updateSettings({
                  digestWindows: {
                    ...settings.digestWindows,
                    morning: { ...settings.digestWindows.morning, enabled },
                  },
                })
              }
              onTimeChange={(hour, minute) =>
                updateSettings({
                  digestWindows: {
                    ...settings.digestWindows,
                    morning: { ...settings.digestWindows.morning, hour, minute },
                  },
                })
              }
            />
            <DigestWindowSetting
              label="Evening Digest"
              enabled={settings.digestWindows.evening.enabled}
              hour={settings.digestWindows.evening.hour}
              minute={settings.digestWindows.evening.minute}
              onToggle={(enabled) =>
                updateSettings({
                  digestWindows: {
                    ...settings.digestWindows,
                    evening: { ...settings.digestWindows.evening, enabled },
                  },
                })
              }
              onTimeChange={(hour, minute) =>
                updateSettings({
                  digestWindows: {
                    ...settings.digestWindows,
                    evening: { ...settings.digestWindows.evening, hour, minute },
                  },
                })
              }
            />
            <div className="pt-4 border-t">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <span className="text-lg">✨</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Nudges delivered with your digest
                  </p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-1">
                    Up to 5 nudges per day will appear at your scheduled digest time, helping you explore new perspectives without feeling overwhelmed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              How should we notify you about digests and nudges?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Push Notifications - Browser Setup */}
            <div>
              <h4 className="font-medium text-sm mb-3">Push Notifications</h4>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <PushNotifications 
                  onSubscriptionChange={(subscribed) => {
                    if (subscribed !== settings.notifications.push) {
                      updateSettings({
                        notifications: { ...settings.notifications, push: subscribed },
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Email Toggle */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <NotificationToggle
                label="Email notifications"
                description="Receive digest summaries and nudges via email"
                enabled={settings.notifications.email}
                onToggle={(enabled) =>
                  updateSettings({
                    notifications: { ...settings.notifications, email: enabled },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* API Keys for Desktop/Mobile Apps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Generate keys to connect the desktop app or other devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {newlyCreatedKey && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Your new API key (copy it now, you won&apos;t see it again):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white dark:bg-zinc-900 rounded border text-sm font-mono break-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setNewlyCreatedKey(null)}
                >
                  Done
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key name (e.g., MacBook Pro)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              />
              <Button
                onClick={createApiKey}
                disabled={isCreatingKey || !newKeyName.trim()}
              >
                {isCreatingKey ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Create
                  </>
                )}
              </Button>
            </div>
            
            {apiKeys.length > 0 ? (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-zinc-500 font-mono">{key.keyPreview}</p>
                      {key.lastUsedAt && (
                        <p className="text-xs text-zinc-400">
                          Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 text-center py-4">
                No API keys yet. Create one to connect the desktop app.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Export your data</p>
                <p className="text-sm text-zinc-500">
                  Download all your beliefs, positions, and sources
                </p>
              </div>
              <Button variant="outline">Export</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">
                  Delete account
                </p>
                <p className="text-sm text-zinc-500">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DigestWindowSetting({
  label,
  enabled,
  hour,
  minute,
  onToggle,
  onTimeChange,
}: {
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  onToggle: (enabled: boolean) => void;
  onTimeChange: (hour: number, minute: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(!enabled)}
          className={`w-10 h-6 rounded-full transition-colors ${
            enabled ? "bg-amber-500" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <span className="font-medium">{label}</span>
      </div>
      <select
        value={`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`}
        onChange={(e) => {
          const [h, m] = e.target.value.split(":").map(Number);
          onTimeChange(h, m);
        }}
        disabled={!enabled}
        className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:opacity-50"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={`${h.toString().padStart(2, "0")}:00`}>
            {h === 0 ? "12:00 AM" : h < 12 ? `${h}:00 AM` : h === 12 ? "12:00 PM" : `${h - 12}:00 PM`}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`w-10 h-6 rounded-full transition-colors ${
          enabled ? "bg-amber-500" : "bg-zinc-200 dark:bg-zinc-700"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${
            enabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
