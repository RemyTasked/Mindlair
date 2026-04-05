"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Clock, 
  Link2, 
  RefreshCw, 
  Check,
  ExternalLink,
  BookOpen,
  FileText,
  Key,
  Copy,
  Trash2,
  Plus,
  LogOut,
  Play
} from "lucide-react";

interface DigestWindow {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface UserSettings {
  digestWindows: {
    morning: DigestWindow;
    evening: DigestWindow;
  };
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  connectedSources: {
    readwise: boolean;
    instapaper: boolean;
  };
  timezone: string;
}

interface Integration {
  provider: string;
  connected: boolean;
  lastSyncAt: string | null;
  connectedAt: string | null;
  sourceCount: number;
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
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, integrationsRes, apiKeysRes, sessionRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/integrations"),
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
      
      if (integrationsRes.ok) {
        const integrationsData = await integrationsRes.json();
        setIntegrations(integrationsData.integrations || []);
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
      setIsLoading(false);
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

  const connectReadwise = async () => {
    const token = prompt("Enter your Readwise Access Token (from readwise.io/access_token):");
    if (!token) return;

    try {
      const response = await fetch("/api/integrations/readwise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        fetchSettings();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to connect Readwise");
      }
    } catch (err) {
      alert("Failed to connect Readwise");
    }
  };

  const connectInstapaper = async () => {
    const email = prompt("Enter your Instapaper email:");
    if (!email) return;
    const password = prompt("Enter your Instapaper password:");
    if (!password) return;

    try {
      const response = await fetch("/api/integrations/instapaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        fetchSettings();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to connect Instapaper");
      }
    } catch (err) {
      alert("Failed to connect Instapaper");
    }
  };

  const syncIntegration = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      const response = await fetch(`/api/integrations/${provider}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Imported ${result.imported} new items from ${provider}`);
        fetchSettings();
      } else {
        const error = await response.json();
        alert(error.message || `Failed to sync ${provider}`);
      }
    } catch (err) {
      alert(`Failed to sync ${provider}`);
    } finally {
      setSyncingProvider(null);
    }
  };

  const disconnectIntegration = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

    try {
      await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
      fetchSettings();
    } catch (err) {
      alert(`Failed to disconnect ${provider}`);
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
          <Button onClick={fetchSettings}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const getIntegration = (provider: string) => 
    integrations.find(i => i.provider === provider);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Settings
        </h1>
        <p className="text-zinc-500">
          Configure how Mindlayer captures and delivers your digests.
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
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Re-run setup</p>
                <p className="text-sm text-zinc-500">Go through onboarding again to connect integrations</p>
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

        {/* Connected Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Connected Sources
            </CardTitle>
            <CardDescription>
              Import your reading history to seed your belief map.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <IntegrationItem
              name="Readwise"
              description="Sync highlights and saved articles"
              icon={<BookOpen className="w-5 h-5 text-yellow-500" />}
              integration={getIntegration("readwise")}
              isSyncing={syncingProvider === "readwise"}
              onConnect={connectReadwise}
              onSync={() => syncIntegration("readwise")}
              onDisconnect={() => disconnectIntegration("readwise")}
            />
            <IntegrationItem
              name="Instapaper"
              description="Sync your reading list"
              icon={<FileText className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />}
              integration={getIntegration("instapaper")}
              isSyncing={syncingProvider === "instapaper"}
              onConnect={connectInstapaper}
              onSync={() => syncIntegration("instapaper")}
              onDisconnect={() => disconnectIntegration("instapaper")}
            />
          </CardContent>
        </Card>

        {/* Digest Windows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Digest Windows
            </CardTitle>
            <CardDescription>
              When should we send your twice-daily digest?
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
          <CardContent className="space-y-4">
            <NotificationToggle
              label="Push notifications"
              description="Get notified in your browser or mobile app"
              enabled={settings.notifications.push}
              onToggle={(enabled) =>
                updateSettings({
                  notifications: { ...settings.notifications, push: enabled },
                })
              }
            />
            <NotificationToggle
              label="Email notifications"
              description="Receive digest summaries via email"
              enabled={settings.notifications.email}
              onToggle={(enabled) =>
                updateSettings({
                  notifications: { ...settings.notifications, email: enabled },
                })
              }
            />
            <NotificationToggle
              label="SMS notifications"
              description="Get text messages for your digests"
              enabled={settings.notifications.sms}
              onToggle={(enabled) =>
                updateSettings({
                  notifications: { ...settings.notifications, sms: enabled },
                })
              }
            />
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

function IntegrationItem({
  name,
  description,
  icon,
  integration,
  isSyncing,
  onConnect,
  onSync,
  onDisconnect,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  integration?: Integration;
  isSyncing: boolean;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = integration?.connected;

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-zinc-500">{description}</p>
          {isConnected && integration?.sourceCount > 0 && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {integration.sourceCount} sources imported
            </p>
          )}
        </div>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={onConnect}>
          Connect
        </Button>
      )}
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
