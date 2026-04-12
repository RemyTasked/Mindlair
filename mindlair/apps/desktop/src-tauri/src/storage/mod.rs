use rusqlite::{Connection, params};
use serde_json;
use std::path::PathBuf;
use chrono::Utc;
use crate::capture::CaptureEvent;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = Self::get_db_path()?;
        
        // Ensure directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let conn = Connection::open(&db_path)?;
        
        let db = Self { conn };
        db.init_schema()?;
        
        Ok(db)
    }
    
    fn get_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let data_dir = dirs::data_dir()
            .ok_or("Could not find data directory")?
            .join("mindlair");

        Ok(data_dir.join("mindlair.db"))
    }
    
    fn init_schema(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS captures (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                url TEXT,
                title TEXT,
                text TEXT,
                app_name TEXT,
                duration_ms INTEGER,
                metadata TEXT,
                synced INTEGER DEFAULT 0,
                synced_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS url_engagement (
                url TEXT PRIMARY KEY,
                dwell_time_ms INTEGER DEFAULT 0,
                scroll_depth REAL DEFAULT 0.0,
                completion_percent REAL DEFAULT 0.0,
                visit_count INTEGER DEFAULT 1,
                max_dwell_time_ms INTEGER DEFAULT 0,
                first_visit_at TEXT NOT NULL,
                last_visit_at TEXT NOT NULL,
                synced INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                items_synced INTEGER,
                success INTEGER,
                error_message TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_captures_synced ON captures(synced);
            CREATE INDEX IF NOT EXISTS idx_captures_timestamp ON captures(timestamp);
            CREATE INDEX IF NOT EXISTS idx_captures_url ON captures(url);
            CREATE INDEX IF NOT EXISTS idx_url_engagement_synced ON url_engagement(synced);
            "#
        )?;
        
        Ok(())
    }
    
    pub fn save_capture(&self, event: &CaptureEvent) -> Result<(), Box<dyn std::error::Error>> {
        self.conn.execute(
            r#"
            INSERT INTO captures (id, event_type, timestamp, url, title, text, app_name, duration_ms, metadata)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            params![
                event.id,
                format!("{:?}", event.event_type),
                event.timestamp.to_rfc3339(),
                event.data.url,
                event.data.title,
                event.data.text,
                event.data.app_name,
                event.data.duration_ms,
                event.data.metadata.as_ref().map(|m| serde_json::to_string(m).ok()).flatten(),
            ],
        )?;
        
        Ok(())
    }
    
    pub fn get_pending_items(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, event_type, timestamp, url, title, text, app_name, duration_ms, metadata
            FROM captures
            WHERE synced = 0
            ORDER BY timestamp DESC
            LIMIT 100
            "#
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "event_type": row.get::<_, String>(1)?,
                "timestamp": row.get::<_, String>(2)?,
                "url": row.get::<_, Option<String>>(3)?,
                "title": row.get::<_, Option<String>>(4)?,
                "text": row.get::<_, Option<String>>(5)?,
                "app_name": row.get::<_, Option<String>>(6)?,
                "duration_ms": row.get::<_, Option<i64>>(7)?,
                "metadata": row.get::<_, Option<String>>(8)?,
            }))
        })?;
        
        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        
        Ok(items)
    }
    
    pub fn get_recent_captures(&self, limit: i32) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT id, event_type, timestamp, url, title, text, app_name, duration_ms, metadata, synced
            FROM captures
            ORDER BY timestamp DESC
            LIMIT ?1
            "#
        )?;
        
        let rows = stmt.query_map([limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "event_type": row.get::<_, String>(1)?,
                "timestamp": row.get::<_, String>(2)?,
                "url": row.get::<_, Option<String>>(3)?,
                "title": row.get::<_, Option<String>>(4)?,
                "text": row.get::<_, Option<String>>(5)?,
                "app_name": row.get::<_, Option<String>>(6)?,
                "duration_ms": row.get::<_, Option<i64>>(7)?,
                "metadata": row.get::<_, Option<String>>(8)?,
                "synced": row.get::<_, i32>(9)? == 1,
            }))
        })?;
        
        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        
        Ok(items)
    }
    
    pub fn mark_synced(&self, ids: &[String]) -> Result<(), Box<dyn std::error::Error>> {
        let now = Utc::now().to_rfc3339();
        
        for id in ids {
            self.conn.execute(
                "UPDATE captures SET synced = 1, synced_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
        }
        
        Ok(())
    }
    
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let result = stmt.query_row([key], |row| row.get(0));
        
        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.conn.execute(
            r#"
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?1, ?2, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = CURRENT_TIMESTAMP
            "#,
            params![key, value],
        )?;
        
        Ok(())
    }
    
    pub fn log_sync(&self, items_synced: i32, success: bool, error_message: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
        self.conn.execute(
            r#"
            INSERT INTO sync_log (timestamp, items_synced, success, error_message)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            params![
                Utc::now().to_rfc3339(),
                items_synced,
                if success { 1 } else { 0 },
                error_message,
            ],
        )?;
        
        Ok(())
    }
    
    pub fn upsert_url_engagement(
        &self,
        url: &str,
        dwell_time_ms: u64,
        scroll_depth: f64,
        completion_percent: f64,
        visit_count: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let now = Utc::now().to_rfc3339();
        
        self.conn.execute(
            r#"
            INSERT INTO url_engagement (url, dwell_time_ms, scroll_depth, completion_percent, visit_count, max_dwell_time_ms, first_visit_at, last_visit_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?2, ?6, ?6)
            ON CONFLICT(url) DO UPDATE SET
                dwell_time_ms = MAX(dwell_time_ms, ?2),
                scroll_depth = MAX(scroll_depth, ?3),
                completion_percent = MAX(completion_percent, ?4),
                visit_count = visit_count + 1,
                max_dwell_time_ms = MAX(max_dwell_time_ms, ?2),
                last_visit_at = ?6,
                synced = 0
            "#,
            params![url, dwell_time_ms as i64, scroll_depth, completion_percent, visit_count as i64, now],
        )?;
        
        Ok(())
    }
    
    pub fn get_url_engagement(&self, url: &str) -> Result<Option<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT url, dwell_time_ms, scroll_depth, completion_percent, visit_count, max_dwell_time_ms, first_visit_at, last_visit_at
            FROM url_engagement
            WHERE url = ?1
            "#
        )?;
        
        let result = stmt.query_row([url], |row| {
            Ok(serde_json::json!({
                "url": row.get::<_, String>(0)?,
                "dwell_time_ms": row.get::<_, i64>(1)?,
                "scroll_depth": row.get::<_, f64>(2)?,
                "completion_percent": row.get::<_, f64>(3)?,
                "visit_count": row.get::<_, i64>(4)?,
                "max_dwell_time_ms": row.get::<_, i64>(5)?,
                "first_visit_at": row.get::<_, String>(6)?,
                "last_visit_at": row.get::<_, String>(7)?,
            }))
        });
        
        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    
    pub fn get_pending_engagement_items(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT url, dwell_time_ms, scroll_depth, completion_percent, visit_count, max_dwell_time_ms, first_visit_at, last_visit_at
            FROM url_engagement
            WHERE synced = 0
            ORDER BY last_visit_at DESC
            LIMIT 100
            "#
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "url": row.get::<_, String>(0)?,
                "dwell_time_ms": row.get::<_, i64>(1)?,
                "scroll_depth": row.get::<_, f64>(2)?,
                "completion_percent": row.get::<_, f64>(3)?,
                "visit_count": row.get::<_, i64>(4)?,
                "max_dwell_time_ms": row.get::<_, i64>(5)?,
                "first_visit_at": row.get::<_, String>(6)?,
                "last_visit_at": row.get::<_, String>(7)?,
            }))
        })?;
        
        let mut items = Vec::new();
        for row in rows {
            items.push(row?);
        }
        
        Ok(items)
    }
    
    pub fn mark_engagement_synced(&self, urls: &[String]) -> Result<(), Box<dyn std::error::Error>> {
        for url in urls {
            self.conn.execute(
                "UPDATE url_engagement SET synced = 1 WHERE url = ?1",
                params![url],
            )?;
        }
        
        Ok(())
    }
}
