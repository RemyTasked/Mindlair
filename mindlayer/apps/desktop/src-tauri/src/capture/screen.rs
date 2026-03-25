use super::{CaptureEvent, CaptureEventType, CaptureData};
use chrono::Utc;
use tokio::sync::broadcast;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::path::PathBuf;
use std::process::Command;

pub trait ScreenOcr {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&mut self);
    fn capture_now(&self) -> Option<String>;
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScreenOcrConfig {
    pub capture_interval_secs: u32,
    pub min_text_length: usize,
    pub languages: Vec<String>,
}

impl Default for ScreenOcrConfig {
    fn default() -> Self {
        Self {
            capture_interval_secs: 60,
            min_text_length: 100,
            languages: vec!["eng".to_string()],
        }
    }
}

#[cfg(target_os = "macos")]
pub struct MacScreenOcr {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    config: ScreenOcrConfig,
    last_text_hash: Arc<std::sync::Mutex<u64>>,
}

#[cfg(target_os = "macos")]
impl MacScreenOcr {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            config: ScreenOcrConfig::default(),
            last_text_hash: Arc::new(std::sync::Mutex::new(0)),
        }
    }

    pub fn with_config(mut self, config: ScreenOcrConfig) -> Self {
        self.config = config;
        self
    }

    fn get_frontmost_app_info() -> Option<(String, String)> {
        let script = r#"
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to name of frontApp
                try
                    set winTitle to name of first window of frontApp
                on error
                    set winTitle to ""
                end try
                return appName & "|||" & winTitle
            end tell
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
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

    fn capture_screen_to_file() -> Option<PathBuf> {
        let temp_path = std::env::temp_dir().join(format!("mindlayer_screen_{}.png", uuid::Uuid::new_v4()));

        let status = Command::new("screencapture")
            .args(["-x", "-C", "-t", "png", &temp_path.to_string_lossy()])
            .status()
            .ok()?;

        if status.success() && temp_path.exists() {
            Some(temp_path)
        } else {
            None
        }
    }

    fn ocr_image(image_path: &PathBuf, languages: &[String]) -> Option<String> {
        if let Some(text) = Self::ocr_with_tesseract(image_path, languages) {
            return Some(text);
        }

        Self::ocr_with_vision(image_path)
    }

    fn ocr_with_tesseract(image_path: &PathBuf, languages: &[String]) -> Option<String> {
        let lang_arg = languages.join("+");

        let output = Command::new("tesseract")
            .args([
                &image_path.to_string_lossy().to_string(),
                "stdout",
                "-l", &lang_arg,
                "--psm", "3",
            ])
            .output()
            .ok()?;

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            if !text.trim().is_empty() {
                return Some(Self::clean_ocr_text(&text));
            }
        }

        None
    }

    fn ocr_with_vision(image_path: &PathBuf) -> Option<String> {
        let script = format!(r#"
            use framework "Vision"
            use framework "Foundation"
            use scripting additions

            set imagePath to "{}"
            set imageURL to current application's NSURL's fileURLWithPath:imagePath

            set requestHandler to current application's VNImageRequestHandler's alloc()'s initWithURL:imageURL options:(current application's NSDictionary's dictionary())

            set textRequest to current application's VNRecognizeTextRequest's alloc()'s init()
            textRequest's setRecognitionLevel:(current application's VNRequestTextRecognitionLevelAccurate)

            requestHandler's performRequests:{{textRequest}} |error|:(missing value)

            set results to textRequest's results()
            set outputText to ""

            repeat with observation in results
                set topCandidate to (observation's topCandidates:1)'s firstObject()
                if topCandidate is not missing value then
                    set outputText to outputText & (topCandidate's |string|() as text) & linefeed
                end if
            end repeat

            return outputText
        "#, image_path.to_string_lossy());

        let output = Command::new("osascript")
            .arg("-l")
            .arg("AppleScript")
            .arg("-e")
            .arg(&script)
            .output()
            .ok()?;

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            if !text.trim().is_empty() {
                return Some(Self::clean_ocr_text(&text));
            }
        }

        None
    }

    fn clean_ocr_text(text: &str) -> String {
        let lines: Vec<&str> = text.lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .filter(|l| l.len() > 2)
            .filter(|l| !l.chars().all(|c| c.is_ascii_punctuation() || c.is_whitespace()))
            .collect();

        lines.join("\n")
    }

    fn hash_text(text: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let normalized: String = text.chars()
            .filter(|c| c.is_alphanumeric())
            .take(500)
            .collect();

        let mut hasher = DefaultHasher::new();
        normalized.hash(&mut hasher);
        hasher.finish()
    }

    fn should_skip_app(app_name: &str) -> bool {
        let skip_apps = [
            "loginwindow",
            "ScreenSaverEngine",
            "Spotlight",
            "SystemUIServer",
            "Dock",
            "Finder",
            "SecurityAgent",
        ];

        skip_apps.iter().any(|&skip| app_name.eq_ignore_ascii_case(skip))
    }
}

#[cfg(target_os = "macos")]
impl ScreenOcr for MacScreenOcr {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let config = self.config.clone();
        let last_text_hash = self.last_text_hash.clone();

        let handle = thread::spawn(move || {
            log::info!("macOS screen OCR started");

            while running.load(Ordering::SeqCst) {
                let (app_name, window_title) = Self::get_frontmost_app_info()
                    .unwrap_or(("Unknown".to_string(), "".to_string()));

                if !Self::should_skip_app(&app_name) {
                    if let Some(image_path) = Self::capture_screen_to_file() {
                        if let Some(text) = Self::ocr_image(&image_path, &config.languages) {
                            let _ = std::fs::remove_file(&image_path);

                            if text.len() >= config.min_text_length {
                                let text_hash = Self::hash_text(&text);
                                let mut last_hash = last_text_hash.lock().unwrap();

                                if text_hash != *last_hash {
                                    *last_hash = text_hash;
                                    drop(last_hash);

                                    let event = CaptureEvent {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        event_type: CaptureEventType::ScreenText,
                                        timestamp: Utc::now(),
                                        data: CaptureData {
                                            url: None,
                                            title: Some(window_title.clone()),
                                            text: Some(text),
                                            app_name: Some(app_name.clone()),
                                            duration_ms: None,
                                            metadata: Some(serde_json::json!({
                                                "source": "screen_ocr",
                                                "window_title": window_title,
                                            })),
                                        },
                                    };

                                    if let Err(e) = event_tx.send(event) {
                                        log::warn!("Failed to send screen OCR event: {}", e);
                                    }
                                }
                            }
                        } else {
                            let _ = std::fs::remove_file(&image_path);
                        }
                    }
                }

                thread::sleep(Duration::from_secs(config.capture_interval_secs as u64));
            }

            log::info!("macOS screen OCR stopped");
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

    fn capture_now(&self) -> Option<String> {
        let image_path = Self::capture_screen_to_file()?;
        let text = Self::ocr_image(&image_path, &self.config.languages);
        let _ = std::fs::remove_file(&image_path);
        text
    }
}

pub fn check_screen_ocr_requirements() -> ScreenOcrStatus {
    #[cfg(target_os = "macos")]
    {
        let has_tesseract = Command::new("tesseract").arg("--version").output().is_ok();
        let has_screencapture = Command::new("screencapture").arg("-h").output().is_ok();

        ScreenOcrStatus {
            available: has_screencapture,
            ocr_engine: if has_tesseract { "tesseract" } else { "vision" }.to_string(),
            missing_components: {
                let mut missing = Vec::new();
                if !has_screencapture {
                    missing.push("screencapture (should be available on macOS)".to_string());
                }
                missing
            },
            setup_instructions: if !has_tesseract {
                Some("For better OCR results, install Tesseract: brew install tesseract".to_string())
            } else {
                None
            },
        }
    }

    #[cfg(target_os = "windows")]
    {
        let has_tesseract = Command::new("tesseract").arg("--version").output().is_ok();

        ScreenOcrStatus {
            available: true,
            ocr_engine: if has_tesseract { "tesseract" } else { "none" }.to_string(),
            missing_components: {
                let mut missing = Vec::new();
                if !has_tesseract {
                    missing.push("tesseract".to_string());
                }
                missing
            },
            setup_instructions: if !has_tesseract {
                Some("Install Tesseract OCR: winget install UB-Mannheim.TesseractOCR\nOr download from: https://github.com/UB-Mannheim/tesseract/wiki".to_string())
            } else {
                None
            },
        }
    }

    #[cfg(target_os = "linux")]
    {
        let has_tesseract = Command::new("tesseract").arg("--version").output().is_ok();
        let has_xdotool = Command::new("xdotool").arg("--version").output().is_ok();
        let has_screenshot = Command::new("gnome-screenshot").arg("--version").output().is_ok()
            || Command::new("scrot").arg("--version").output().is_ok()
            || Command::new("import").arg("-version").output().is_ok();

        ScreenOcrStatus {
            available: has_screenshot && has_tesseract,
            ocr_engine: if has_tesseract { "tesseract" } else { "none" }.to_string(),
            missing_components: {
                let mut missing = Vec::new();
                if !has_tesseract {
                    missing.push("tesseract".to_string());
                }
                if !has_xdotool {
                    missing.push("xdotool".to_string());
                }
                if !has_screenshot {
                    missing.push("screenshot tool (gnome-screenshot, scrot, or imagemagick)".to_string());
                }
                missing
            },
            setup_instructions: {
                let mut instructions = Vec::new();
                if !has_tesseract {
                    instructions.push("sudo apt install tesseract-ocr");
                }
                if !has_xdotool {
                    instructions.push("sudo apt install xdotool");
                }
                if !has_screenshot {
                    instructions.push("sudo apt install gnome-screenshot");
                }
                if instructions.is_empty() {
                    None
                } else {
                    Some(instructions.join("\n"))
                }
            },
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScreenOcrStatus {
    pub available: bool,
    pub ocr_engine: String,
    pub missing_components: Vec<String>,
    pub setup_instructions: Option<String>,
}

#[cfg(target_os = "windows")]
pub struct WindowsScreenOcr {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    config: ScreenOcrConfig,
    last_text_hash: Arc<std::sync::Mutex<u64>>,
}

#[cfg(target_os = "windows")]
impl WindowsScreenOcr {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            config: ScreenOcrConfig::default(),
            last_text_hash: Arc::new(std::sync::Mutex::new(0)),
        }
    }

    pub fn with_config(mut self, config: ScreenOcrConfig) -> Self {
        self.config = config;
        self
    }

    fn get_foreground_window_info() -> Option<(String, String)> {
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

    fn capture_screen_to_file() -> Option<PathBuf> {
        let temp_path = std::env::temp_dir().join(format!("mindlayer_screen_{}.png", uuid::Uuid::new_v4()));

        let ps_script = format!(r#"
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object {{
                $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height)
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size)
                $bitmap.Save("{}")
                $graphics.Dispose()
                $bitmap.Dispose()
            }}
        "#, temp_path.to_string_lossy().replace("\\", "\\\\"));

        let status = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_script])
            .status()
            .ok()?;

        if status.success() && temp_path.exists() {
            Some(temp_path)
        } else {
            None
        }
    }

    fn ocr_image(image_path: &PathBuf) -> Option<String> {
        let output = Command::new("tesseract")
            .args([
                &image_path.to_string_lossy().to_string(),
                "stdout",
                "-l", "eng",
            ])
            .output()
            .ok()?;

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            if !text.trim().is_empty() {
                return Some(Self::clean_ocr_text(&text));
            }
        }

        None
    }

    fn clean_ocr_text(text: &str) -> String {
        let lines: Vec<&str> = text.lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .filter(|l| l.len() > 2)
            .collect();

        lines.join("\n")
    }

    fn hash_text(text: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let normalized: String = text.chars()
            .filter(|c| c.is_alphanumeric())
            .take(500)
            .collect();

        let mut hasher = DefaultHasher::new();
        normalized.hash(&mut hasher);
        hasher.finish()
    }

    fn should_skip_app(app_name: &str) -> bool {
        let skip_apps = ["explorer", "SearchHost", "StartMenuExperienceHost", "ShellExperienceHost"];
        skip_apps.iter().any(|&skip| app_name.eq_ignore_ascii_case(skip))
    }
}

#[cfg(target_os = "windows")]
impl ScreenOcr for WindowsScreenOcr {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let config = self.config.clone();
        let last_text_hash = self.last_text_hash.clone();

        let handle = thread::spawn(move || {
            log::info!("Windows screen OCR started");

            while running.load(Ordering::SeqCst) {
                let (app_name, window_title) = Self::get_foreground_window_info()
                    .unwrap_or(("Unknown".to_string(), "".to_string()));

                if !Self::should_skip_app(&app_name) {
                    if let Some(image_path) = Self::capture_screen_to_file() {
                        if let Some(text) = Self::ocr_image(&image_path) {
                            let _ = std::fs::remove_file(&image_path);

                            if text.len() >= config.min_text_length {
                                let text_hash = Self::hash_text(&text);
                                let mut last_hash = last_text_hash.lock().unwrap();

                                if text_hash != *last_hash {
                                    *last_hash = text_hash;
                                    drop(last_hash);

                                    let event = CaptureEvent {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        event_type: CaptureEventType::ScreenText,
                                        timestamp: Utc::now(),
                                        data: CaptureData {
                                            url: None,
                                            title: Some(window_title.clone()),
                                            text: Some(text),
                                            app_name: Some(app_name.clone()),
                                            duration_ms: None,
                                            metadata: Some(serde_json::json!({
                                                "source": "screen_ocr",
                                            })),
                                        },
                                    };

                                    if let Err(e) = event_tx.send(event) {
                                        log::warn!("Failed to send screen OCR event: {}", e);
                                    }
                                }
                            }
                        } else {
                            let _ = std::fs::remove_file(&image_path);
                        }
                    }
                }

                thread::sleep(Duration::from_secs(config.capture_interval_secs as u64));
            }

            log::info!("Windows screen OCR stopped");
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

    fn capture_now(&self) -> Option<String> {
        let image_path = Self::capture_screen_to_file()?;
        let text = Self::ocr_image(&image_path);
        let _ = std::fs::remove_file(&image_path);
        text
    }
}

#[cfg(target_os = "linux")]
pub struct LinuxScreenOcr {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    config: ScreenOcrConfig,
    last_text_hash: Arc<std::sync::Mutex<u64>>,
}

#[cfg(target_os = "linux")]
impl LinuxScreenOcr {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            config: ScreenOcrConfig::default(),
            last_text_hash: Arc::new(std::sync::Mutex::new(0)),
        }
    }

    pub fn with_config(mut self, config: ScreenOcrConfig) -> Self {
        self.config = config;
        self
    }

    fn get_active_window_info() -> Option<(String, String)> {
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

    fn capture_screen_to_file() -> Option<PathBuf> {
        let temp_path = std::env::temp_dir().join(format!("mindlayer_screen_{}.png", uuid::Uuid::new_v4()));

        let tools = ["gnome-screenshot", "scrot", "import"];
        
        for tool in &tools {
            let result = match *tool {
                "gnome-screenshot" => Command::new(tool)
                    .args(["-f", &temp_path.to_string_lossy()])
                    .status(),
                "scrot" => Command::new(tool)
                    .args([&temp_path.to_string_lossy().to_string()])
                    .status(),
                "import" => Command::new(tool)
                    .args(["-window", "root", &temp_path.to_string_lossy().to_string()])
                    .status(),
                _ => continue,
            };

            if result.map(|s| s.success()).unwrap_or(false) && temp_path.exists() {
                return Some(temp_path);
            }
        }

        None
    }

    fn ocr_image(image_path: &PathBuf, languages: &[String]) -> Option<String> {
        let lang_arg = languages.join("+");

        let output = Command::new("tesseract")
            .args([
                &image_path.to_string_lossy().to_string(),
                "stdout",
                "-l", &lang_arg,
            ])
            .output()
            .ok()?;

        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            if !text.trim().is_empty() {
                return Some(Self::clean_ocr_text(&text));
            }
        }

        None
    }

    fn clean_ocr_text(text: &str) -> String {
        let lines: Vec<&str> = text.lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty())
            .filter(|l| l.len() > 2)
            .collect();

        lines.join("\n")
    }

    fn hash_text(text: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let normalized: String = text.chars()
            .filter(|c| c.is_alphanumeric())
            .take(500)
            .collect();

        let mut hasher = DefaultHasher::new();
        normalized.hash(&mut hasher);
        hasher.finish()
    }
}

#[cfg(target_os = "linux")]
impl ScreenOcr for LinuxScreenOcr {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let config = self.config.clone();
        let last_text_hash = self.last_text_hash.clone();

        let handle = thread::spawn(move || {
            log::info!("Linux screen OCR started");

            while running.load(Ordering::SeqCst) {
                let (app_name, window_title) = Self::get_active_window_info()
                    .unwrap_or(("Unknown".to_string(), "".to_string()));

                if let Some(image_path) = Self::capture_screen_to_file() {
                    if let Some(text) = Self::ocr_image(&image_path, &config.languages) {
                        let _ = std::fs::remove_file(&image_path);

                        if text.len() >= config.min_text_length {
                            let text_hash = Self::hash_text(&text);
                            let mut last_hash = last_text_hash.lock().unwrap();

                            if text_hash != *last_hash {
                                *last_hash = text_hash;
                                drop(last_hash);

                                let event = CaptureEvent {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    event_type: CaptureEventType::ScreenText,
                                    timestamp: Utc::now(),
                                    data: CaptureData {
                                        url: None,
                                        title: Some(window_title.clone()),
                                        text: Some(text),
                                        app_name: Some(app_name.clone()),
                                        duration_ms: None,
                                        metadata: Some(serde_json::json!({
                                            "source": "screen_ocr",
                                        })),
                                    },
                                };

                                if let Err(e) = event_tx.send(event) {
                                    log::warn!("Failed to send screen OCR event: {}", e);
                                }
                            }
                        }
                    } else {
                        let _ = std::fs::remove_file(&image_path);
                    }
                }

                thread::sleep(Duration::from_secs(config.capture_interval_secs as u64));
            }

            log::info!("Linux screen OCR stopped");
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

    fn capture_now(&self) -> Option<String> {
        let image_path = Self::capture_screen_to_file()?;
        let text = Self::ocr_image(&image_path, &self.config.languages);
        let _ = std::fs::remove_file(&image_path);
        text
    }
}
