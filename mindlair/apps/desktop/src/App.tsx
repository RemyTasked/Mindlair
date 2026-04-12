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
  const [activeTab, setActiveTab] = useState<"dashboard" | "feed" | "publish" | "captures" | "settings">("dashboard");
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
          className={activeTab === "feed" ? "active" : ""} 
          onClick={() => setActiveTab("feed")}
        >
          Feed
        </button>
        <button 
          className={activeTab === "publish" ? "active" : ""} 
          onClick={() => setActiveTab("publish")}
        >
          Post
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
        
        {activeTab === "feed" && (
          <FeedTab />
        )}
        
        {activeTab === "publish" && (
          <PublishTab />
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
          placeholder="https://api.mindlair.app"
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

function FeedTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "subscriptions" | "discover">("all");

  useEffect(() => {
    loadFeed();
  }, [filter]);

  async function loadFeed() {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/feed?filter=${filter === "all" ? "" : filter}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to load feed:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReaction(postId: string, reaction: string) {
    try {
      await fetch(`http://localhost:3000/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      loadFeed();
    } catch (error) {
      console.error("Failed to react:", error);
    }
  }

  const stanceColors: Record<string, string> = {
    arguing: "#a3c47a",
    exploring: "#d4915a",
    steelmanning: "#4a9eff",
  };

  return (
    <div className="feed-tab">
      <div className="feed-header">
        <h2>Feed</h2>
        <div className="feed-filters">
          {(["all", "subscriptions", "discover"] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "For You" : f === "subscriptions" ? "Subscriptions" : "Discover"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="feed-loading">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="feed-empty">
          <p>No posts yet</p>
          <p className="hint">Be the first to post!</p>
        </div>
      ) : (
        <div className="feed-posts">
          {posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div className="post-author">
                  <div className="avatar"></div>
                  <div>
                    <span className="author-name">{post.author?.name || "Anonymous"}</span>
                    <span className="post-date">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span
                  className="stance-badge"
                  style={{ backgroundColor: `${stanceColors[post.authorStance]}20`, color: stanceColors[post.authorStance] }}
                >
                  {post.authorStance}
                </span>
              </div>
              <h3 className="post-headline">{post.headlineClaim}</h3>
              {post.body && <p className="post-body">{truncate(post.body, 200)}</p>}
              {post.topicTags?.length > 0 && (
                <div className="post-tags">
                  {post.topicTags.slice(0, 3).map((tag: string, idx: number) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="post-reactions">
                {!post.userReaction && (
                  <p className="reaction-prompt">React to see what others think</p>
                )}
                <div className="reaction-buttons">
                  {["agree", "disagree", "complicated"].map((r) => (
                    <button
                      key={r}
                      className={`reaction-btn ${r} ${post.userReaction === r ? "active" : ""}`}
                      onClick={() => handleReaction(post.id, r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishTab() {
  const [headlineClaim, setHeadlineClaim] = useState("");
  const [body, setBody] = useState("");
  const [authorStance, setAuthorStance] = useState<"arguing" | "exploring" | "steelmanning">("arguing");
  const [referencedPostId, setReferencedPostId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      setReferencedPostId(ref && ref.trim() ? ref.trim() : null);
    } catch {
      setReferencedPostId(null);
    }
  }, []);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = headlineClaim.length;
  const isValidClaim = charCount >= 10 && charCount <= 280;
  const isValidBody = wordCount >= 100 && wordCount <= 2000;
  const canPublish = isValidClaim && isValidBody && !isSubmitting;

  const emojis = ["😀", "😂", "🤔", "👍", "👎", "❤️", "🔥", "💡", "✨", "🎯", "📚", "💪", "🙏", "⚡", "🌟"];

  function insertEmoji(emoji: string) {
    setBody(prev => prev + emoji);
    setShowEmojiPicker(false);
  }

  async function handlePublish() {
    if (!canPublish) return;
    
    setIsSubmitting(true);
    try {
      // Create post
      const createResponse = await fetch("http://localhost:3000/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headlineClaim,
          postBody: body,
          authorStance,
          ...(referencedPostId ? { referencedPostId } : {}),
        }),
      });
      const createData = await createResponse.json();
      
      if (!createResponse.ok) {
        throw new Error(createData.message || "Failed to create post");
      }

      // Publish post
      const publishResponse = await fetch(`http://localhost:3000/api/posts/${createData.post.id}/publish`, {
        method: "POST",
      });
      
      if (!publishResponse.ok) {
        const publishData = await publishResponse.json();
        throw new Error(publishData.message || "Failed to publish post");
      }

      alert("Published successfully!");
      setHeadlineClaim("");
      setBody("");
      setAuthorStance("arguing");
    } catch (error: any) {
      alert(error.message || "Failed to publish");
    } finally {
      setIsSubmitting(false);
    }
  }

  const stanceConfig = {
    arguing: { label: "Arguing", description: "I believe this", color: "#a3c47a" },
    exploring: { label: "Exploring", description: "I'm uncertain", color: "#d4915a" },
    steelmanning: { label: "Steelmanning", description: "Position I may not hold", color: "#4a9eff" },
  };

  return (
    <div className="publish-tab">
      <h2>Post</h2>
      <p className="publish-subtitle">Share your thinking. Every post shapes your belief map.</p>

      <div className="form-group">
        <label>Your Stance</label>
        <div className="stance-buttons">
          {(Object.keys(stanceConfig) as Array<keyof typeof stanceConfig>).map((stance) => (
            <button
              key={stance}
              className={`stance-btn ${authorStance === stance ? "active" : ""}`}
              style={authorStance === stance ? { borderColor: stanceConfig[stance].color, backgroundColor: `${stanceConfig[stance].color}20` } : {}}
              onClick={() => setAuthorStance(stance)}
            >
              <span className="stance-label">{stanceConfig[stance].label}</span>
              <span className="stance-desc">{stanceConfig[stance].description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <div className="label-row">
          <label>Headline Claim</label>
          <span className={`counter ${!isValidClaim && charCount > 0 ? "error" : ""}`}>{charCount}/280</span>
        </div>
        <textarea
          className="headline-input"
          placeholder="State a specific, falsifiable position"
          value={headlineClaim}
          onChange={(e) => setHeadlineClaim(e.target.value)}
          maxLength={280}
        />
        <p className="hint">Example: "Remote work permanently reduced urban commercial real estate value"</p>
      </div>

      <div className="form-group">
        <div className="label-row">
          <label>Your Argument</label>
          <div className="label-actions">
            <button 
              className={`emoji-btn ${showEmojiPicker ? "active" : ""}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              😀 Emoji
            </button>
            <span className={`counter ${wordCount > 0 && (wordCount < 100 || wordCount > 2000) ? "error" : ""}`}>
              {wordCount} / 100-2000 words
            </span>
          </div>
        </div>
        {showEmojiPicker && (
          <div className="emoji-picker">
            {emojis.map((emoji) => (
              <button key={emoji} onClick={() => insertEmoji(emoji)} className="emoji-item">
                {emoji}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="body-input"
          placeholder="Make your case. Focus on the argument, not formatting. Use emojis to express yourself! 😊"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="publish-info">
        <strong>What happens when you post:</strong> Your post goes through AI screening, 
        then claim extraction. The claims become part of your belief map — posting is 
        the strongest signal of what you actually think.
      </div>

      <button
        className={`publish-btn ${canPublish ? "" : "disabled"}`}
        onClick={handlePublish}
        disabled={!canPublish}
      >
        {isSubmitting ? "Posting..." : "Post"}
      </button>
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
