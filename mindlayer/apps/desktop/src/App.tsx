import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface CaptureStatus {
  is_running: boolean;
  url_monitoring: boolean;
  audio_capture: boolean;
  screen_ocr: boolean;
  clipboard: boolean;
}

interface CaptureItem {
  id: string;
  event_type: string;
  timestamp: string;
  url?: string;
  title?: string;
  text?: string;
  app_name?: string;
  synced: boolean;
}

interface MappingStatus {
  is_mapping: boolean;
  capture_count: number;
}

interface AuthStatus {
  authenticated: boolean;
  key_preview?: string;
}

function App() {
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [mappingStatus, setMappingStatus] = useState<MappingStatus>({ is_mapping: false, capture_count: 0 });
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ authenticated: false });
  const [recentCaptures, setRecentCaptures] = useState<CaptureItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "captures" | "settings">("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  const loadMappingStatus = useCallback(async () => {
    try {
      const mapping = await invoke<MappingStatus>("get_mapping_status");
      setMappingStatus(mapping);
    } catch (error) {
      console.error("Failed to load mapping status:", error);
    }
  }, []);

  const loadAuthStatus = useCallback(async () => {
    try {
      const auth = await invoke<AuthStatus>("get_auth_status");
      setAuthStatus(auth);
    } catch (error) {
      console.error("Failed to load auth status:", error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadMappingStatus();
    loadAuthStatus();
    
    const interval = setInterval(() => {
      loadData();
      loadMappingStatus();
    }, 5000);
    
    // Listen for mapping status changes from tray
    const unlisten = listen<boolean>("mapping-status-changed", (event) => {
      setMappingStatus(prev => ({ ...prev, is_mapping: event.payload }));
    });
    
    return () => {
      clearInterval(interval);
      unlisten.then(fn => fn());
    };
  }, [loadMappingStatus, loadAuthStatus]);

  async function loadData() {
    try {
      const [captureStatus, captures, pending] = await Promise.all([
        invoke<CaptureStatus>("get_capture_status"),
        invoke<CaptureItem[]>("get_recent_captures", { limit: 20 }),
        invoke<{ id: string }[]>("get_pending_items"),
      ]);
      
      setStatus(captureStatus);
      setRecentCaptures(captures);
      setPendingCount(pending.length);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleMapping() {
    try {
      const newState = !mappingStatus.is_mapping;
      await invoke("set_mapping_enabled", { enabled: newState });
      setMappingStatus(prev => ({ ...prev, is_mapping: newState }));
      loadData();
    } catch (error) {
      console.error("Failed to toggle mapping:", error);
    }
  }

  async function syncNow() {
    try {
      const result = await invoke("sync_now");
      console.log("Sync result:", result);
      loadData();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="spinner"></div>
        <p>Loading Mindlair...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Persistent Mapping Status Widget */}
      <MappingStatusWidget 
        isMapping={mappingStatus.is_mapping}
        captureCount={mappingStatus.capture_count}
        onToggle={toggleMapping}
      />
      
      <header className="header">
        <div className="logo">
          <h1>Mindlair</h1>
          <span className="tagline">Map how you think</span>
        </div>
        <div className="status-badge">
          <span className={`dot ${mappingStatus.is_mapping ? "active" : "inactive"}`}></span>
          {mappingStatus.is_mapping ? "Mapping" : "Paused"}
        </div>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === "dashboard" ? "active" : ""} 
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === "captures" ? "active" : ""} 
          onClick={() => setActiveTab("captures")}
        >
          Captures ({recentCaptures.length})
        </button>
        <button 
          className={activeTab === "settings" ? "active" : ""} 
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </nav>

      <main className="content">
        {activeTab === "dashboard" && (
          <Dashboard 
            status={status}
            mappingStatus={mappingStatus}
            pendingCount={pendingCount}
            onToggleMapping={toggleMapping}
            onSync={syncNow}
          />
        )}
        
        {activeTab === "captures" && (
          <CapturesList captures={recentCaptures} />
        )}
        
        {activeTab === "settings" && (
          <Settings authStatus={authStatus} onAuthChange={loadAuthStatus} />
        )}
      </main>

      <footer className="footer">
        <a href="http://localhost:3000/map" target="_blank" rel="noopener noreferrer">
          Open Web Dashboard
        </a>
        <span className="version">v0.1.0</span>
      </footer>
    </div>
  );
}

function MappingStatusWidget({ 
  isMapping, 
  captureCount,
  onToggle 
}: { 
  isMapping: boolean;
  captureCount: number;
  onToggle: () => void;
}) {
  return (
    <div className={`mapping-widget ${isMapping ? 'active' : 'paused'}`}>
      <div className="mapping-indicator">
        <span className={`pulse-dot ${isMapping ? 'pulsing' : ''}`}></span>
        <span className="mapping-text">
          {isMapping ? 'Mapping' : 'Paused'}
        </span>
      </div>
      {isMapping && captureCount > 0 && (
        <span className="capture-count">{captureCount} captured</span>
      )}
      <button 
        className="mapping-toggle-btn"
        onClick={onToggle}
        title={isMapping ? 'Pause mapping' : 'Resume mapping'}
      >
        {isMapping ? '⏸' : '▶'}
      </button>
    </div>
  );
}

function Dashboard({ 
  status,
  mappingStatus,
  pendingCount,
  onToggleMapping,
  onSync
}: { 
  status: CaptureStatus | null;
  mappingStatus: MappingStatus;
  pendingCount: number;
  onToggleMapping: () => void;
  onSync: () => void;
}) {
  return (
    <div className="dashboard">
      <div className="control-card main">
        <h2>Mapping Control</h2>
        <button 
          className={`capture-toggle ${mappingStatus.is_mapping ? "running" : "stopped"}`}
          onClick={onToggleMapping}
        >
          {mappingStatus.is_mapping ? "Pause Mapping" : "Start Mapping"}
        </button>
        <p className="description">
          {mappingStatus.is_mapping 
            ? "Mindlair is mapping your browsing and media consumption."
            : "Mapping is paused. Click to resume."}
        </p>
        {mappingStatus.capture_count > 0 && (
          <p className="capture-stats">
            {mappingStatus.capture_count} items captured this session
          </p>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending Sync</div>
        </div>
        <div className="stat-card">
          <div className={`stat-indicator ${status?.url_monitoring ? "on" : "off"}`}></div>
          <div className="stat-label">URL Monitoring</div>
        </div>
        <div className="stat-card">
          <div className={`stat-indicator ${status?.audio_capture ? "on" : "off"}`}></div>
          <div className="stat-label">Audio Capture</div>
        </div>
        <div className="stat-card">
          <div className={`stat-indicator ${status?.screen_ocr ? "on" : "off"}`}></div>
          <div className="stat-label">Screen OCR</div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="sync-card">
          <p>{pendingCount} items waiting to sync</p>
          <button onClick={onSync} className="sync-button">
            Sync Now
          </button>
        </div>
      )}
    </div>
  );
}

function CapturesList({ captures }: { captures: CaptureItem[] }) {
  if (captures.length === 0) {
    return (
      <div className="captures-empty">
        <p>No captures yet</p>
        <p className="hint">Start browsing and Mindlair will capture your activity</p>
      </div>
    );
  }

  return (
    <div className="captures-list">
      {captures.map((capture) => (
        <div key={capture.id} className={`capture-item ${capture.synced ? "synced" : "pending"}`}>
          <div className="capture-type">{formatEventType(capture.event_type)}</div>
          <div className="capture-content">
            {capture.url && (
              <a href={capture.url} target="_blank" rel="noopener noreferrer" className="capture-url">
                {capture.title || capture.url}
              </a>
            )}
            {capture.text && (
              <p className="capture-text">{truncate(capture.text, 200)}</p>
            )}
            {capture.app_name && (
              <span className="capture-app">{capture.app_name}</span>
            )}
          </div>
          <div className="capture-meta">
            <span className="capture-time">{formatTime(capture.timestamp)}</span>
            <span className={`sync-status ${capture.synced ? "synced" : "pending"}`}>
              {capture.synced ? "Synced" : "Pending"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Settings({ 
  authStatus, 
  onAuthChange 
}: { 
  authStatus: AuthStatus;
  onAuthChange: () => void;
}) {
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:3000/api");
  const [apiKey, setApiKey] = useState("");
  const [isSettingKey, setIsSettingKey] = useState(false);

  async function saveEndpoint() {
    try {
      await invoke("set_api_endpoint", { endpoint: apiEndpoint });
      alert("Settings saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  async function saveApiKey() {
    if (!apiKey.trim()) return;
    
    setIsSettingKey(true);
    try {
      await invoke("set_api_key", { key: apiKey.trim() });
      setApiKey("");
      onAuthChange();
      alert("API key saved! Your data will now sync to your account.");
    } catch (error) {
      console.error("Failed to save API key:", error);
      alert("Failed to save API key");
    } finally {
      setIsSettingKey(false);
    }
  }

  async function clearApiKey() {
    if (!confirm("Are you sure you want to disconnect this device?")) return;
    
    try {
      await invoke("clear_api_key");
      onAuthChange();
    } catch (error) {
      console.error("Failed to clear API key:", error);
    }
  }

  return (
    <div className="settings">
      {/* Account / API Key Section */}
      <div className="setting-group auth-section">
        <h3>🔑 Account Connection</h3>
        {authStatus.authenticated ? (
          <div className="auth-connected">
            <div className="auth-status">
              <span className="auth-indicator connected"></span>
              <span>Connected</span>
              <code className="key-preview">{authStatus.key_preview}</code>
            </div>
            <p className="setting-description">
              This device is syncing to your Mindlair account.
            </p>
            <button onClick={clearApiKey} className="disconnect-btn">
              Disconnect Device
            </button>
          </div>
        ) : (
          <div className="auth-disconnected">
            <p className="setting-description">
              To sync your belief map across devices, enter an API key from your 
              <a href="http://localhost:3000/settings" target="_blank" rel="noopener noreferrer"> web dashboard</a>.
            </p>
            <div className="api-key-input">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ml_xxxxxxxxxxxx"
              />
              <button 
                onClick={saveApiKey} 
                disabled={!apiKey.trim() || isSettingKey}
              >
                {isSettingKey ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="setting-group">
        <h3>🌐 API Endpoint</h3>
        <input
          id="api-endpoint"
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://api.mindlayer.app"
        />
        <button onClick={saveEndpoint}>Save</button>
      </div>

      <div className="setting-group">
        <h3>📡 Capture Options</h3>
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked />
          Monitor browser URLs
        </label>
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked />
          Capture system audio (podcasts, videos)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked />
          Screen text extraction (OCR)
        </label>
        <label className="checkbox-label">
          <input type="checkbox" defaultChecked />
          Clipboard monitoring
        </label>
      </div>

      <div className="setting-group">
        <h3>🔒 Privacy</h3>
        <p className="setting-description">
          All capture and transcription happens locally on your device. 
          Only processed content is synced to the cloud.
        </p>
        <button className="danger">Clear Local Data</button>
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  const types: Record<string, string> = {
    UrlVisit: "URL",
    AudioTranscript: "Audio",
    ScreenText: "Screen",
    ClipboardContent: "Clipboard",
  };
  return types[type] || type;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export default App;
