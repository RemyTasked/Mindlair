use super::{CaptureEvent, CaptureEventType, CaptureData};
use chrono::Utc;
use tokio::sync::broadcast;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub trait ClipboardMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&mut self);
}

pub struct GenericClipboardMonitor {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    last_content: Arc<std::sync::Mutex<String>>,
}

impl GenericClipboardMonitor {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            last_content: Arc::new(std::sync::Mutex::new(String::new())),
        }
    }
    
    #[cfg(target_os = "macos")]
    fn get_clipboard_content() -> Option<String> {
        let output = std::process::Command::new("pbpaste")
            .output()
            .ok()?;
        
        if output.status.success() {
            Some(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            None
        }
    }
    
    #[cfg(target_os = "windows")]
    fn get_clipboard_content() -> Option<String> {
        // Use windows crate for clipboard access
        // Placeholder for now
        None
    }
    
    #[cfg(target_os = "linux")]
    fn get_clipboard_content() -> Option<String> {
        // Try xclip first, then xsel
        let output = std::process::Command::new("xclip")
            .args(["-selection", "clipboard", "-o"])
            .output()
            .or_else(|_| {
                std::process::Command::new("xsel")
                    .args(["--clipboard", "--output"])
                    .output()
            })
            .ok()?;
        
        if output.status.success() {
            Some(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            None
        }
    }
    
    fn is_url(text: &str) -> bool {
        text.starts_with("http://") || text.starts_with("https://")
    }
    
    fn is_meaningful_text(text: &str) -> bool {
        // At least 50 characters and contains spaces (likely a sentence/paragraph)
        text.len() >= 50 && text.contains(' ')
    }
}

impl ClipboardMonitor for GenericClipboardMonitor {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }
        
        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let last_content = self.last_content.clone();
        
        let handle = thread::spawn(move || {
            log::info!("Clipboard monitor started");
            
            while running.load(Ordering::SeqCst) {
                if let Some(content) = Self::get_clipboard_content() {
                    let mut last = last_content.lock().unwrap();
                    
                    if content != *last && !content.trim().is_empty() {
                        *last = content.clone();
                        
                        // Only capture URLs or meaningful text blocks
                        let should_capture = Self::is_url(&content) || Self::is_meaningful_text(&content);
                        
                        if should_capture {
                            let event = CaptureEvent {
                                id: uuid::Uuid::new_v4().to_string(),
                                event_type: CaptureEventType::ClipboardContent,
                                timestamp: Utc::now(),
                                data: CaptureData {
                                    url: if Self::is_url(&content) { Some(content.clone()) } else { None },
                                    title: None,
                                    text: if !Self::is_url(&content) { Some(content) } else { None },
                                    app_name: None,
                                    duration_ms: None,
                                    metadata: None,
                                },
                            };
                            
                            let _ = event_tx.send(event);
                        }
                    }
                }
                
                thread::sleep(Duration::from_millis(500));
            }
            
            log::info!("Clipboard monitor stopped");
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
