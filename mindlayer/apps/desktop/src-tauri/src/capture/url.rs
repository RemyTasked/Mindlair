use super::{CaptureEvent, CaptureEventType, CaptureData, EngagementMetrics};
use super::content_filter;
use chrono::Utc;
use tokio::sync::broadcast;
use std::thread;
use std::time::Duration;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::collections::HashMap;

pub trait UrlMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&mut self);
}

#[derive(Debug, Clone)]
struct UrlSession {
    url: String,
    title: String,
    app_name: String,
    start_time: std::time::Instant,
    engagement: EngagementMetrics,
}

#[cfg(target_os = "macos")]
pub struct MacUrlMonitor {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    current_session: Arc<std::sync::Mutex<Option<UrlSession>>>,
    url_metrics: Arc<std::sync::Mutex<HashMap<String, EngagementMetrics>>>,
}

#[cfg(target_os = "macos")]
impl MacUrlMonitor {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            current_session: Arc::new(std::sync::Mutex::new(None)),
            url_metrics: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }
    
    fn emit_session_complete(
        event_tx: &broadcast::Sender<CaptureEvent>,
        session: &UrlSession,
        metrics: &EngagementMetrics,
    ) {
        let event = CaptureEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: CaptureEventType::UrlVisit,
            timestamp: Utc::now(),
            data: CaptureData {
                url: Some(session.url.clone()),
                title: Some(session.title.clone()),
                text: None,
                app_name: Some(session.app_name.clone()),
                duration_ms: Some(metrics.dwell_time_ms),
                metadata: Some(serde_json::json!({
                    "engagement": {
                        "dwell_time_ms": metrics.dwell_time_ms,
                        "scroll_depth": metrics.scroll_depth,
                        "completion_percent": metrics.completion_percent,
                        "visit_count": metrics.visit_count,
                        "engagement_score": metrics.calculate_engagement_score(),
                    }
                })),
            },
        };
        
        let _ = event_tx.send(event);
    }
    
    fn get_frontmost_browser_url() -> Option<(String, String, String)> {
        let script = r#"
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
            end tell
            
            if frontApp is "Safari" then
                tell application "Safari"
                    set currentURL to URL of current tab of front window
                    set currentTitle to name of current tab of front window
                end tell
                return "Safari" & "|" & currentURL & "|" & currentTitle
            else if frontApp is "Google Chrome" then
                tell application "Google Chrome"
                    set currentURL to URL of active tab of front window
                    set currentTitle to title of active tab of front window
                end tell
                return "Google Chrome" & "|" & currentURL & "|" & currentTitle
            else if frontApp is "Firefox" then
                return ""
            else if frontApp is "Arc" then
                tell application "Arc"
                    set currentURL to URL of active tab of front window
                    set currentTitle to title of active tab of front window
                end tell
                return "Arc" & "|" & currentURL & "|" & currentTitle
            else if frontApp is "Microsoft Edge" then
                tell application "Microsoft Edge"
                    set currentURL to URL of active tab of front window
                    set currentTitle to title of active tab of front window
                end tell
                return "Microsoft Edge" & "|" & currentURL & "|" & currentTitle
            else if frontApp is "Brave Browser" then
                tell application "Brave Browser"
                    set currentURL to URL of active tab of front window
                    set currentTitle to title of active tab of front window
                end tell
                return "Brave Browser" & "|" & currentURL & "|" & currentTitle
            end if
            
            return ""
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .ok()?;
        
        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !result.is_empty() {
                let parts: Vec<&str> = result.splitn(3, '|').collect();
                if parts.len() == 3 {
                    return Some((
                        parts[0].to_string(),
                        parts[1].to_string(),
                        parts[2].to_string(),
                    ));
                }
            }
        }
        
        None
    }
}

#[cfg(target_os = "macos")]
impl UrlMonitor for MacUrlMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let current_session = self.current_session.clone();
        let url_metrics = self.url_metrics.clone();
        
        let handle = thread::spawn(move || {
            log::info!("macOS URL monitor started");
            const MIN_DWELL_MS: u64 = 5000;
            
            while running.load(Ordering::SeqCst) {
                if let Some((app_name, url, title)) = Self::get_frontmost_browser_url() {
                    if content_filter::is_url_blocked(&url) {
                        log::debug!("Blocked NSFW URL: {}", url);
                        thread::sleep(Duration::from_millis(1000));
                        continue;
                    }

                    let mut session_guard = current_session.lock().unwrap();
                    let mut metrics_guard = url_metrics.lock().unwrap();
                    
                    let url_changed = session_guard.as_ref()
                        .map(|s| s.url != url)
                        .unwrap_or(true);
                    
                    if url_changed {
                        if let Some(ref prev_session) = *session_guard {
                            let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                            
                            if dwell_ms >= MIN_DWELL_MS {
                                let metrics = metrics_guard
                                    .entry(prev_session.url.clone())
                                    .or_insert_with(EngagementMetrics::new);
                                
                                metrics.update_dwell(dwell_ms);
                                
                                log::debug!(
                                    "URL session complete: {} - {}ms (visits: {})", 
                                    prev_session.url, dwell_ms, metrics.visit_count
                                );
                                
                                Self::emit_session_complete(&event_tx, prev_session, metrics);
                            }
                        }
                        
                        let metrics = metrics_guard
                            .entry(url.clone())
                            .or_insert_with(EngagementMetrics::new);
                        metrics.increment_visit();
                        
                        *session_guard = Some(UrlSession {
                            url: url.clone(),
                            title,
                            app_name,
                            start_time: std::time::Instant::now(),
                            engagement: metrics.clone(),
                        });
                        
                        log::debug!("New URL session started: {} (visit #{})", url, metrics.visit_count);
                    }
                } else {
                    let mut session_guard = current_session.lock().unwrap();
                    let mut metrics_guard = url_metrics.lock().unwrap();
                    
                    if let Some(ref prev_session) = *session_guard {
                        let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                        
                        if dwell_ms >= MIN_DWELL_MS {
                            let metrics = metrics_guard
                                .entry(prev_session.url.clone())
                                .or_insert_with(EngagementMetrics::new);
                            
                            metrics.update_dwell(dwell_ms);
                            Self::emit_session_complete(&event_tx, prev_session, metrics);
                        }
                    }
                    
                    *session_guard = None;
                }
                
                thread::sleep(Duration::from_millis(1000));
            }
            
            {
                let mut session_guard = current_session.lock().unwrap();
                let mut metrics_guard = url_metrics.lock().unwrap();
                
                if let Some(ref session) = *session_guard {
                    let dwell_ms = session.start_time.elapsed().as_millis() as u64;
                    if dwell_ms >= MIN_DWELL_MS {
                        let metrics = metrics_guard
                            .entry(session.url.clone())
                            .or_insert_with(EngagementMetrics::new);
                        metrics.update_dwell(dwell_ms);
                        Self::emit_session_complete(&event_tx, session, metrics);
                    }
                }
                *session_guard = None;
            }
            
            log::info!("macOS URL monitor stopped");
        });
        
        self.thread_handle = Some(handle);
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

#[cfg(target_os = "windows")]
pub struct WindowsUrlMonitor {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    current_session: Arc<std::sync::Mutex<Option<UrlSession>>>,
    url_metrics: Arc<std::sync::Mutex<HashMap<String, EngagementMetrics>>>,
}

#[cfg(target_os = "windows")]
impl WindowsUrlMonitor {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            current_session: Arc::new(std::sync::Mutex::new(None)),
            url_metrics: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }
    
    fn emit_session_complete(
        event_tx: &broadcast::Sender<CaptureEvent>,
        session: &UrlSession,
        metrics: &EngagementMetrics,
    ) {
        let event = CaptureEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: CaptureEventType::UrlVisit,
            timestamp: Utc::now(),
            data: CaptureData {
                url: Some(session.url.clone()),
                title: Some(session.title.clone()),
                text: None,
                app_name: Some(session.app_name.clone()),
                duration_ms: Some(metrics.dwell_time_ms),
                metadata: Some(serde_json::json!({
                    "engagement": {
                        "dwell_time_ms": metrics.dwell_time_ms,
                        "scroll_depth": metrics.scroll_depth,
                        "completion_percent": metrics.completion_percent,
                        "visit_count": metrics.visit_count,
                        "engagement_score": metrics.calculate_engagement_score(),
                    }
                })),
            },
        };
        
        let _ = event_tx.send(event);
    }

    fn get_foreground_window_info() -> Option<(String, String)> {
        use std::process::Command;

        let ps_script = r#"
            Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            using System.Text;
            public class Win32 {
                [DllImport("user32.dll")]
                public static extern IntPtr GetForegroundWindow();
                [DllImport("user32.dll")]
                public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
                [DllImport("user32.dll")]
                public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            }
"@
            $hwnd = [Win32]::GetForegroundWindow()
            $sb = New-Object System.Text.StringBuilder 256
            [Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
            $title = $sb.ToString()
            
            $processId = 0
            [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            $processName = if ($process) { $process.ProcessName } else { "" }
            
            "$processName|||$title"
        "#;

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", ps_script])
            .output()
            .ok()?;

        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let parts: Vec<&str> = result.split("|||").collect();
            if parts.len() >= 2 {
                return Some((parts[0].to_string(), parts[1].to_string()));
            }
        }

        None
    }

    fn get_browser_url(process_name: &str) -> Option<String> {
        use std::process::Command;

        let browser_class = match process_name.to_lowercase().as_str() {
            "chrome" | "msedge" | "brave" => "Chrome_WidgetWin_1",
            "firefox" => "MozillaWindowClass",
            _ => return None,
        };

        let ps_script = format!(r#"
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            
            $root = [System.Windows.Automation.AutomationElement]::RootElement
            $condition = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ClassNameProperty,
                "{}"
            )
            
            $browser = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $condition)
            if ($browser -eq $null) {{ return "" }}
            
            # Find address bar - typically an Edit control
            $editCondition = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::Edit
            )
            
            $addressBar = $browser.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $editCondition)
            if ($addressBar -eq $null) {{ return "" }}
            
            $valuePattern = $addressBar.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern) -as [System.Windows.Automation.ValuePattern]
            if ($valuePattern -ne $null) {{
                $valuePattern.Current.Value
            }} else {{
                $addressBar.Current.Name
            }}
        "#, browser_class);

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .output()
            .ok()?;

        if output.status.success() {
            let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !url.is_empty() && (url.starts_with("http") || url.contains('.')) {
                let normalized = if !url.starts_with("http") {
                    format!("https://{}", url)
                } else {
                    url
                };
                return Some(normalized);
            }
        }

        None
    }

    fn is_browser(process_name: &str) -> bool {
        let browsers = ["chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "iexplore"];
        let lower = process_name.to_lowercase();
        browsers.iter().any(|b| lower.contains(b))
    }
}

#[cfg(target_os = "windows")]
impl UrlMonitor for WindowsUrlMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let current_session = self.current_session.clone();
        let url_metrics = self.url_metrics.clone();
        
        let handle = thread::spawn(move || {
            log::info!("Windows URL monitor started");
            const MIN_DWELL_MS: u64 = 5000;
            
            while running.load(Ordering::SeqCst) {
                let mut should_clear_session = false;
                
                if let Some((process_name, window_title)) = Self::get_foreground_window_info() {
                    if Self::is_browser(&process_name) {
                        if let Some(url) = Self::get_browser_url(&process_name) {
                            if content_filter::is_url_blocked(&url) {
                                log::debug!("Blocked NSFW URL: {}", url);
                                thread::sleep(Duration::from_millis(1000));
                                continue;
                            }

                            let mut session_guard = current_session.lock().unwrap();
                            let mut metrics_guard = url_metrics.lock().unwrap();
                            
                            let url_changed = session_guard.as_ref()
                                .map(|s| s.url != url)
                                .unwrap_or(true);
                            
                            if url_changed {
                                if let Some(ref prev_session) = *session_guard {
                                    let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                                    
                                    if dwell_ms >= MIN_DWELL_MS {
                                        let metrics = metrics_guard
                                            .entry(prev_session.url.clone())
                                            .or_insert_with(EngagementMetrics::new);
                                        
                                        metrics.update_dwell(dwell_ms);
                                        Self::emit_session_complete(&event_tx, prev_session, metrics);
                                    }
                                }
                                
                                let metrics = metrics_guard
                                    .entry(url.clone())
                                    .or_insert_with(EngagementMetrics::new);
                                metrics.increment_visit();
                                
                                *session_guard = Some(UrlSession {
                                    url: url.clone(),
                                    title: window_title,
                                    app_name: process_name,
                                    start_time: std::time::Instant::now(),
                                    engagement: metrics.clone(),
                                });
                            }
                        } else {
                            should_clear_session = true;
                        }
                    } else {
                        should_clear_session = true;
                    }
                } else {
                    should_clear_session = true;
                }
                
                if should_clear_session {
                    let mut session_guard = current_session.lock().unwrap();
                    let mut metrics_guard = url_metrics.lock().unwrap();
                    
                    if let Some(ref prev_session) = *session_guard {
                        let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                        
                        if dwell_ms >= MIN_DWELL_MS {
                            let metrics = metrics_guard
                                .entry(prev_session.url.clone())
                                .or_insert_with(EngagementMetrics::new);
                            
                            metrics.update_dwell(dwell_ms);
                            Self::emit_session_complete(&event_tx, prev_session, metrics);
                        }
                    }
                    *session_guard = None;
                }
                
                thread::sleep(Duration::from_millis(1000));
            }
            
            {
                let mut session_guard = current_session.lock().unwrap();
                let mut metrics_guard = url_metrics.lock().unwrap();
                
                if let Some(ref session) = *session_guard {
                    let dwell_ms = session.start_time.elapsed().as_millis() as u64;
                    if dwell_ms >= MIN_DWELL_MS {
                        let metrics = metrics_guard
                            .entry(session.url.clone())
                            .or_insert_with(EngagementMetrics::new);
                        metrics.update_dwell(dwell_ms);
                        Self::emit_session_complete(&event_tx, session, metrics);
                    }
                }
                *session_guard = None;
            }
            
            log::info!("Windows URL monitor stopped");
        });
        
        self.thread_handle = Some(handle);
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

#[cfg(target_os = "linux")]
pub struct LinuxUrlMonitor {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    current_session: Arc<std::sync::Mutex<Option<UrlSession>>>,
    url_metrics: Arc<std::sync::Mutex<HashMap<String, EngagementMetrics>>>,
}

#[cfg(target_os = "linux")]
impl LinuxUrlMonitor {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            current_session: Arc::new(std::sync::Mutex::new(None)),
            url_metrics: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }
    
    fn emit_session_complete(
        event_tx: &broadcast::Sender<CaptureEvent>,
        session: &UrlSession,
        metrics: &EngagementMetrics,
    ) {
        let event = CaptureEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type: CaptureEventType::UrlVisit,
            timestamp: Utc::now(),
            data: CaptureData {
                url: Some(session.url.clone()),
                title: Some(session.title.clone()),
                text: None,
                app_name: Some(session.app_name.clone()),
                duration_ms: Some(metrics.dwell_time_ms),
                metadata: Some(serde_json::json!({
                    "engagement": {
                        "dwell_time_ms": metrics.dwell_time_ms,
                        "scroll_depth": metrics.scroll_depth,
                        "completion_percent": metrics.completion_percent,
                        "visit_count": metrics.visit_count,
                        "engagement_score": metrics.calculate_engagement_score(),
                    }
                })),
            },
        };
        
        let _ = event_tx.send(event);
    }

    fn get_active_window_info() -> Option<(String, String)> {
        use std::process::Command;

        let window_id = Command::new("xdotool")
            .args(["getactivewindow"])
            .output()
            .ok()?;

        if !window_id.status.success() {
            return None;
        }

        let wid = String::from_utf8_lossy(&window_id.stdout).trim().to_string();

        let name_output = Command::new("xdotool")
            .args(["getwindowname", &wid])
            .output()
            .ok()?;

        let pid_output = Command::new("xdotool")
            .args(["getwindowpid", &wid])
            .output()
            .ok()?;

        let window_name = String::from_utf8_lossy(&name_output.stdout).trim().to_string();
        let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();

        let process_output = Command::new("ps")
            .args(["-p", &pid, "-o", "comm="])
            .output()
            .ok()?;

        let process_name = String::from_utf8_lossy(&process_output.stdout).trim().to_string();

        Some((process_name, window_name))
    }

    fn get_browser_url_xdotool(process_name: &str) -> Option<String> {
        use std::process::Command;

        let key_combo = match process_name.to_lowercase().as_str() {
            "chrome" | "chromium" | "google-chrome" | "brave" | "brave-browser" | "microsoft-edge" => {
                "ctrl+l"
            }
            "firefox" | "firefox-esr" => "ctrl+l",
            _ => return None,
        };

        let _ = Command::new("xdotool")
            .args(["key", key_combo])
            .output();

        thread::sleep(Duration::from_millis(100));

        let _ = Command::new("xdotool")
            .args(["key", "ctrl+c"])
            .output();

        thread::sleep(Duration::from_millis(100));

        let _ = Command::new("xdotool")
            .args(["key", "Escape"])
            .output();

        let clipboard = Command::new("xclip")
            .args(["-selection", "clipboard", "-o"])
            .output()
            .ok()?;

        if clipboard.status.success() {
            let url = String::from_utf8_lossy(&clipboard.stdout).trim().to_string();
            if url.starts_with("http") {
                return Some(url);
            }
        }

        None
    }

    fn is_browser(process_name: &str) -> bool {
        let browsers = [
            "chrome", "chromium", "google-chrome", "firefox", "firefox-esr",
            "brave", "brave-browser", "microsoft-edge", "opera", "vivaldi"
        ];
        let lower = process_name.to_lowercase();
        browsers.iter().any(|b| lower.contains(b))
    }
}

#[cfg(target_os = "linux")]
impl UrlMonitor for LinuxUrlMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let current_session = self.current_session.clone();
        let url_metrics = self.url_metrics.clone();
        
        let handle = thread::spawn(move || {
            log::info!("Linux URL monitor started");
            const MIN_DWELL_MS: u64 = 5000;
            
            while running.load(Ordering::SeqCst) {
                let mut should_clear_session = false;
                
                if let Some((process_name, window_title)) = Self::get_active_window_info() {
                    if Self::is_browser(&process_name) {
                        if let Some(url) = Self::get_browser_url_xdotool(&process_name) {
                            if content_filter::is_url_blocked(&url) {
                                log::debug!("Blocked NSFW URL: {}", url);
                                thread::sleep(Duration::from_millis(1000));
                                continue;
                            }

                            let mut session_guard = current_session.lock().unwrap();
                            let mut metrics_guard = url_metrics.lock().unwrap();
                            
                            let url_changed = session_guard.as_ref()
                                .map(|s| s.url != url)
                                .unwrap_or(true);
                            
                            if url_changed {
                                if let Some(ref prev_session) = *session_guard {
                                    let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                                    
                                    if dwell_ms >= MIN_DWELL_MS {
                                        let metrics = metrics_guard
                                            .entry(prev_session.url.clone())
                                            .or_insert_with(EngagementMetrics::new);
                                        
                                        metrics.update_dwell(dwell_ms);
                                        Self::emit_session_complete(&event_tx, prev_session, metrics);
                                    }
                                }
                                
                                let metrics = metrics_guard
                                    .entry(url.clone())
                                    .or_insert_with(EngagementMetrics::new);
                                metrics.increment_visit();
                                
                                *session_guard = Some(UrlSession {
                                    url: url.clone(),
                                    title: window_title,
                                    app_name: process_name,
                                    start_time: std::time::Instant::now(),
                                    engagement: metrics.clone(),
                                });
                            }
                        } else {
                            should_clear_session = true;
                        }
                    } else {
                        should_clear_session = true;
                    }
                } else {
                    should_clear_session = true;
                }
                
                if should_clear_session {
                    let mut session_guard = current_session.lock().unwrap();
                    let mut metrics_guard = url_metrics.lock().unwrap();
                    
                    if let Some(ref prev_session) = *session_guard {
                        let dwell_ms = prev_session.start_time.elapsed().as_millis() as u64;
                        
                        if dwell_ms >= MIN_DWELL_MS {
                            let metrics = metrics_guard
                                .entry(prev_session.url.clone())
                                .or_insert_with(EngagementMetrics::new);
                            
                            metrics.update_dwell(dwell_ms);
                            Self::emit_session_complete(&event_tx, prev_session, metrics);
                        }
                    }
                    *session_guard = None;
                }
                
                thread::sleep(Duration::from_millis(2000));
            }
            
            {
                let mut session_guard = current_session.lock().unwrap();
                let mut metrics_guard = url_metrics.lock().unwrap();
                
                if let Some(ref session) = *session_guard {
                    let dwell_ms = session.start_time.elapsed().as_millis() as u64;
                    if dwell_ms >= MIN_DWELL_MS {
                        let metrics = metrics_guard
                            .entry(session.url.clone())
                            .or_insert_with(EngagementMetrics::new);
                        metrics.update_dwell(dwell_ms);
                        Self::emit_session_complete(&event_tx, session, metrics);
                    }
                }
                *session_guard = None;
            }
            
            log::info!("Linux URL monitor stopped");
        });
        
        self.thread_handle = Some(handle);
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}
