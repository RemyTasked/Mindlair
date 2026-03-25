use super::{CaptureEvent, CaptureEventType, CaptureData};
use chrono::{DateTime, Utc, TimeZone};
use tokio::sync::broadcast;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::path::PathBuf;
use rusqlite::{Connection, OpenFlags};

pub struct SafariHistoryBridge {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
    last_visit_time: Arc<std::sync::Mutex<f64>>,
    poll_interval_secs: u64,
}

impl SafariHistoryBridge {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            last_visit_time: Arc::new(std::sync::Mutex::new(0.0)),
            poll_interval_secs: 60,
        }
    }

    fn get_safari_history_path() -> Option<PathBuf> {
        dirs::home_dir().map(|h| h.join("Library/Safari/History.db"))
    }

    fn cocoa_timestamp_to_datetime(cocoa_time: f64) -> DateTime<Utc> {
        let unix_epoch_offset: f64 = 978307200.0;
        let unix_timestamp = cocoa_time + unix_epoch_offset;
        Utc.timestamp_opt(unix_timestamp as i64, 0)
            .single()
            .unwrap_or_else(Utc::now)
    }

    fn query_recent_history(
        db_path: &PathBuf,
        since_timestamp: f64,
    ) -> Result<Vec<HistoryEntry>, Box<dyn std::error::Error + Send + Sync>> {
        let conn = Connection::open_with_flags(
            db_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )?;

        let query = r#"
            SELECT 
                hi.id,
                hi.url,
                hv.title,
                hv.visit_time,
                hv.load_successful
            FROM history_items hi
            JOIN history_visits hv ON hi.id = hv.history_item
            WHERE hv.visit_time > ?
                AND hv.load_successful = 1
                AND hi.url NOT LIKE 'file://%'
                AND hi.url NOT LIKE 'about:%'
            ORDER BY hv.visit_time DESC
            LIMIT 100
        "#;

        let mut stmt = conn.prepare(query)?;
        let entries = stmt
            .query_map([since_timestamp], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    url: row.get(1)?,
                    title: row.get(2)?,
                    visit_time: row.get(3)?,
                    load_successful: row.get(4)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    fn is_likely_mobile_visit(url: &str, title: &str) -> bool {
        let mobile_indicators = [
            "m.youtube.com",
            "mobile.",
            ".m.",
            "amp.",
            "/amp/",
            "?amp=",
            "reddit.com/r/", // Often from mobile app shares
        ];

        let url_lower = url.to_lowercase();
        let title_lower = title.to_lowercase();

        for indicator in &mobile_indicators {
            if url_lower.contains(indicator) {
                return true;
            }
        }

        if title_lower.contains("| mobile") || title_lower.ends_with(" - mobile") {
            return true;
        }

        false
    }

    pub fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let history_path = Self::get_safari_history_path()
            .ok_or("Could not find Safari history path")?;

        if !history_path.exists() {
            return Err("Safari history database not found. Ensure Safari is installed and has history.".into());
        }

        self.running.store(true, Ordering::SeqCst);
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let last_visit_time = self.last_visit_time.clone();
        let poll_interval = self.poll_interval_secs;

        let handle = thread::spawn(move || {
            log::info!("Safari iCloud history bridge started");

            {
                let mut last_time = last_visit_time.lock().unwrap();
                let now = Utc::now();
                let unix_epoch_offset: f64 = 978307200.0;
                *last_time = (now.timestamp() as f64) - unix_epoch_offset - 3600.0;
            }

            while running.load(Ordering::SeqCst) {
                let since_time = {
                    let last_time = last_visit_time.lock().unwrap();
                    *last_time
                };

                match Self::query_recent_history(&history_path, since_time) {
                    Ok(entries) => {
                        let mut max_time = since_time;

                        for entry in entries {
                            if entry.visit_time > max_time {
                                max_time = entry.visit_time;
                            }

                            let is_mobile = Self::is_likely_mobile_visit(&entry.url, &entry.title);
                            let surface = if is_mobile {
                                "safari_icloud_mobile"
                            } else {
                                "safari_icloud"
                            };

                            let event = CaptureEvent {
                                id: uuid::Uuid::new_v4().to_string(),
                                event_type: CaptureEventType::UrlVisit,
                                timestamp: Self::cocoa_timestamp_to_datetime(entry.visit_time),
                                data: CaptureData {
                                    url: Some(entry.url.clone()),
                                    title: Some(entry.title.clone()),
                                    text: None,
                                    app_name: Some("Safari".to_string()),
                                    duration_ms: None,
                                    metadata: Some(serde_json::json!({
                                        "source": surface,
                                        "safari_history_id": entry.id,
                                        "is_mobile_likely": is_mobile,
                                    })),
                                },
                            };

                            if let Err(e) = event_tx.send(event) {
                                log::warn!("Failed to send Safari history event: {}", e);
                            }
                        }

                        if max_time > since_time {
                            let mut last_time = last_visit_time.lock().unwrap();
                            *last_time = max_time;
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to query Safari history: {}", e);
                    }
                }

                thread::sleep(Duration::from_secs(poll_interval));
            }

            log::info!("Safari iCloud history bridge stopped");
        });

        self.thread_handle = Some(handle);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn check_permissions() -> PermissionStatus {
        let history_path = match Self::get_safari_history_path() {
            Some(p) => p,
            None => return PermissionStatus::NotAvailable,
        };

        if !history_path.exists() {
            return PermissionStatus::NotAvailable;
        }

        match Connection::open_with_flags(
            &history_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        ) {
            Ok(_) => PermissionStatus::Granted,
            Err(_) => PermissionStatus::NeedsFullDiskAccess,
        }
    }
}

#[derive(Debug)]
struct HistoryEntry {
    id: i64,
    url: String,
    title: String,
    visit_time: f64,
    load_successful: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum PermissionStatus {
    Granted,
    NeedsFullDiskAccess,
    NotAvailable,
}
