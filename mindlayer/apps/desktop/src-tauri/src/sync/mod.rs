use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json;

pub struct SyncManager {
    endpoint: String,
    client: Client,
    api_key: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IngestRequest {
    url: Option<String>,
    surface: String,
    title: Option<String>,
    content_type: Option<String>,
    text: Option<String>,
    consumed_at: String,
    dwell_time_ms: Option<u64>,
    scroll_depth: Option<f64>,
    completion_percent: Option<f64>,
    visit_count: Option<u32>,
    metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct IngestResponse {
    source_id: String,
    status: String,
}

#[derive(Debug, Serialize)]
struct BatchIngestRequest {
    items: Vec<IngestRequest>,
}

#[derive(Debug, Deserialize)]
struct BatchIngestResponse {
    processed: i32,
    source_ids: Vec<String>,
}

impl SyncManager {
    pub fn new(endpoint: String) -> Self {
        Self {
            endpoint,
            client: Client::new(),
            api_key: None,
        }
    }
    
    pub fn set_endpoint(&mut self, endpoint: String) {
        self.endpoint = endpoint;
    }
    
    pub fn get_endpoint(&self) -> String {
        self.endpoint.clone()
    }
    
    pub fn set_api_key(&mut self, api_key: Option<String>) {
        self.api_key = api_key;
    }
    
    pub fn has_api_key(&self) -> bool {
        self.api_key.is_some()
    }
    
    pub async fn sync_pending(&self) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        // This would be called with pending items from the database
        // For now, return a placeholder response
        
        Ok(serde_json::json!({
            "status": "ok",
            "message": "Sync not yet implemented",
            "synced": 0
        }))
    }
    
    pub async fn sync_items(&self, items: Vec<serde_json::Value>) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
        if items.is_empty() {
            return Ok(vec![]);
        }
        
        let requests: Vec<IngestRequest> = items.iter().filter_map(|item| {
            let url = item.get("url").and_then(|v| v.as_str()).map(String::from);
            let text = item.get("text").and_then(|v| v.as_str()).map(String::from);
            
            // Skip items without URL or text
            if url.is_none() && text.is_none() {
                return None;
            }
            
            // Extract engagement metrics from metadata if present
            let engagement = item.get("metadata")
                .and_then(|m| m.get("engagement"));
            
            let dwell_time_ms = engagement
                .and_then(|e| e.get("dwell_time_ms"))
                .and_then(|v| v.as_u64());
            
            let scroll_depth = engagement
                .and_then(|e| e.get("scroll_depth"))
                .and_then(|v| v.as_f64());
            
            let completion_percent = engagement
                .and_then(|e| e.get("completion_percent"))
                .and_then(|v| v.as_f64());
            
            let visit_count = engagement
                .and_then(|e| e.get("visit_count"))
                .and_then(|v| v.as_u64())
                .map(|v| v as u32);
            
            // Also check top-level duration_ms as fallback
            let dwell_time_ms = dwell_time_ms.or_else(|| {
                item.get("duration_ms").and_then(|v| v.as_u64())
            });
            
            Some(IngestRequest {
                url,
                surface: "desktop_app".to_string(),
                title: item.get("title").and_then(|v| v.as_str()).map(String::from),
                content_type: Some(Self::determine_content_type(item)),
                text,
                consumed_at: item.get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                dwell_time_ms,
                scroll_depth,
                completion_percent,
                visit_count,
                metadata: item.get("metadata").cloned(),
            })
        }).collect();
        
        if requests.is_empty() {
            return Ok(vec![]);
        }
        
        // For single items, use regular ingest endpoint
        // For batches, use batch endpoint
        let mut synced_ids = Vec::new();
        
        for (idx, request) in requests.iter().enumerate() {
            let url = format!("{}/ingest", self.endpoint);
            
            let mut req_builder = self.client.post(&url)
                .json(request);
            
            if let Some(ref api_key) = self.api_key {
                req_builder = req_builder.header("x-api-key", api_key);
            }
            
            match req_builder.send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        if let Some(id) = items.get(idx).and_then(|i| i.get("id")).and_then(|v| v.as_str()) {
                            synced_ids.push(id.to_string());
                        }
                    } else {
                        log::warn!("Failed to sync item: {}", response.status());
                    }
                }
                Err(e) => {
                    log::error!("Sync request failed: {}", e);
                }
            }
        }
        
        Ok(synced_ids)
    }
    
    fn determine_content_type(item: &serde_json::Value) -> String {
        let event_type = item.get("event_type")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        
        match event_type {
            "UrlVisit" => "article".to_string(),
            "AudioTranscript" => "audio".to_string(),
            "ScreenText" => "text".to_string(),
            "ClipboardContent" => {
                if item.get("url").is_some() {
                    "article".to_string()
                } else {
                    "text".to_string()
                }
            }
            _ => "unknown".to_string(),
        }
    }
    
    pub async fn check_connection(&self) -> bool {
        let url = format!("{}/health", self.endpoint);
        
        match self.client.get(&url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }
}
