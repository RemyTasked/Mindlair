mod url;
mod audio;
mod screen;
mod clipboard;
pub mod content_filter;
#[cfg(target_os = "macos")]
mod safari_history;

pub use url::UrlMonitor;
pub use audio::{AudioCapture, check_audio_capture_requirements};
pub use screen::{ScreenOcr, check_screen_ocr_requirements};
pub use clipboard::ClipboardMonitor;
#[cfg(target_os = "macos")]
pub use safari_history::PermissionStatus;

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use tokio::sync::broadcast;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureEvent {
    pub id: String,
    pub event_type: CaptureEventType,
    pub timestamp: DateTime<Utc>,
    pub data: CaptureData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CaptureEventType {
    UrlVisit,
    AudioTranscript,
    ScreenText,
    ClipboardContent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureData {
    pub url: Option<String>,
    pub title: Option<String>,
    pub text: Option<String>,
    pub app_name: Option<String>,
    pub duration_ms: Option<u64>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngagementMetrics {
    pub dwell_time_ms: u64,
    pub scroll_depth: f64,
    pub completion_percent: f64,
    pub visit_count: u32,
    pub max_dwell_time_ms: u64,
}

impl EngagementMetrics {
    pub fn new() -> Self {
        Self {
            dwell_time_ms: 0,
            scroll_depth: 0.0,
            completion_percent: 0.0,
            visit_count: 1,
            max_dwell_time_ms: 0,
        }
    }
    
    pub fn update_dwell(&mut self, dwell_ms: u64) {
        self.dwell_time_ms = dwell_ms;
        if dwell_ms > self.max_dwell_time_ms {
            self.max_dwell_time_ms = dwell_ms;
        }
    }
    
    pub fn increment_visit(&mut self) {
        self.visit_count += 1;
    }
    
    pub fn calculate_engagement_score(&self) -> f64 {
        let dwell_normalized = (self.dwell_time_ms as f64 / 600_000.0).min(1.0);
        let scroll = self.scroll_depth.min(1.0);
        let completion = self.completion_percent.min(1.0);
        
        0.4 * dwell_normalized + 0.3 * scroll + 0.3 * completion
    }
}

pub struct CaptureManager {
    is_running: bool,
    url_enabled: bool,
    audio_enabled: bool,
    screen_enabled: bool,
    clipboard_enabled: bool,
    safari_history_enabled: bool,
    event_tx: Option<broadcast::Sender<CaptureEvent>>,
    capture_count: u64,
    
    #[cfg(target_os = "macos")]
    url_monitor: Option<url::MacUrlMonitor>,
    
    #[cfg(target_os = "windows")]
    url_monitor: Option<url::WindowsUrlMonitor>,
    
    #[cfg(target_os = "linux")]
    url_monitor: Option<url::LinuxUrlMonitor>,
    
    #[cfg(target_os = "macos")]
    safari_history_bridge: Option<safari_history::SafariHistoryBridge>,
}

impl CaptureManager {
    pub fn new() -> Self {
        Self {
            is_running: false,
            url_enabled: true,
            audio_enabled: true,
            screen_enabled: true,
            clipboard_enabled: true,
            safari_history_enabled: true,
            event_tx: None,
            capture_count: 0,
            url_monitor: None,
            #[cfg(target_os = "macos")]
            safari_history_bridge: None,
        }
    }
    
    pub fn get_capture_count(&self) -> u64 {
        self.capture_count
    }
    
    pub fn increment_capture_count(&mut self) {
        self.capture_count += 1;
    }
    
    pub fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.is_running {
            return Ok(());
        }
        
        let (tx, _rx) = broadcast::channel(100);
        self.event_tx = Some(tx.clone());
        
        // Start URL monitoring
        if self.url_enabled {
            #[cfg(target_os = "macos")]
            {
                let mut monitor = url::MacUrlMonitor::new(tx.clone());
                monitor.start()?;
                self.url_monitor = Some(monitor);
            }
            
            #[cfg(target_os = "windows")]
            {
                let mut monitor = url::WindowsUrlMonitor::new(tx.clone());
                monitor.start()?;
                self.url_monitor = Some(monitor);
            }
            
            #[cfg(target_os = "linux")]
            {
                let mut monitor = url::LinuxUrlMonitor::new(tx.clone());
                monitor.start()?;
                self.url_monitor = Some(monitor);
            }
        }
        
        // Start Safari iCloud history bridge (macOS only)
        #[cfg(target_os = "macos")]
        if self.safari_history_enabled {
            let mut bridge = safari_history::SafariHistoryBridge::new(tx.clone());
            match bridge.start() {
                Ok(_) => {
                    log::info!("Safari iCloud history bridge started");
                    self.safari_history_bridge = Some(bridge);
                }
                Err(e) => {
                    log::warn!("Failed to start Safari history bridge: {}", e);
                }
            }
        }
        
        // TODO: Start audio capture
        // TODO: Start screen OCR
        // TODO: Start clipboard monitor
        
        self.is_running = true;
        log::info!("Capture manager started");
        Ok(())
    }
    
    pub fn stop(&mut self) {
        if !self.is_running {
            return;
        }
        
        // Stop URL monitoring
        if let Some(ref mut monitor) = self.url_monitor {
            monitor.stop();
        }
        self.url_monitor = None;
        
        // Stop Safari history bridge (macOS only)
        #[cfg(target_os = "macos")]
        {
            if let Some(ref mut bridge) = self.safari_history_bridge {
                bridge.stop();
            }
            self.safari_history_bridge = None;
        }
        
        // TODO: Stop other capture modules
        
        self.event_tx = None;
        self.is_running = false;
        log::info!("Capture manager stopped");
    }
    
    pub fn is_running(&self) -> bool {
        self.is_running
    }
    
    pub fn url_monitoring_enabled(&self) -> bool {
        self.url_enabled
    }
    
    pub fn audio_capture_enabled(&self) -> bool {
        self.audio_enabled
    }
    
    pub fn screen_ocr_enabled(&self) -> bool {
        self.screen_enabled
    }
    
    pub fn clipboard_enabled(&self) -> bool {
        self.clipboard_enabled
    }
    
    pub fn subscribe(&self) -> Option<broadcast::Receiver<CaptureEvent>> {
        self.event_tx.as_ref().map(|tx| tx.subscribe())
    }
    
    #[cfg(target_os = "macos")]
    pub fn safari_history_enabled(&self) -> bool {
        self.safari_history_enabled
    }
    
    #[cfg(target_os = "macos")]
    pub fn check_safari_permissions() -> PermissionStatus {
        safari_history::SafariHistoryBridge::check_permissions()
    }
    
    #[cfg(not(target_os = "macos"))]
    pub fn safari_history_enabled(&self) -> bool {
        false
    }
}

impl Default for CaptureManager {
    fn default() -> Self {
        Self::new()
    }
}
