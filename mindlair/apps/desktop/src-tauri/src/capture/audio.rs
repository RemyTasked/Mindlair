use super::{CaptureEvent, CaptureEventType, CaptureData};
use chrono::Utc;
use tokio::sync::broadcast;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::path::PathBuf;
use std::process::{Command, Child};

pub trait AudioCapture {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>>;
    fn stop(&mut self);
    fn is_capturing(&self) -> bool;
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AudioCaptureConfig {
    pub sample_rate: u32,
    pub chunk_duration_secs: u32,
    pub audio_device: Option<String>,
    pub whisper_model: String,
}

impl Default for AudioCaptureConfig {
    fn default() -> Self {
        Self {
            sample_rate: 16000,
            chunk_duration_secs: 30,
            audio_device: None,
            whisper_model: "base".to_string(),
        }
    }
}

#[cfg(target_os = "macos")]
pub struct MacAudioCapture {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    config: AudioCaptureConfig,
    capture_thread: Option<thread::JoinHandle<()>>,
    ffmpeg_process: Arc<std::sync::Mutex<Option<Child>>>,
    output_dir: PathBuf,
}

#[cfg(target_os = "macos")]
impl MacAudioCapture {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        let output_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join("mindlair")
            .join("audio_chunks");
        
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            config: AudioCaptureConfig::default(),
            capture_thread: None,
            ffmpeg_process: Arc::new(std::sync::Mutex::new(None)),
            output_dir,
        }
    }

    pub fn with_config(mut self, config: AudioCaptureConfig) -> Self {
        self.config = config;
        self
    }

    fn get_audio_device() -> Option<String> {
        let output = Command::new("ffmpeg")
            .args(["-f", "avfoundation", "-list_devices", "true", "-i", ""])
            .output()
            .ok()?;
        
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        for line in stderr.lines() {
            let lower = line.to_lowercase();
            if lower.contains("blackhole") || lower.contains("loopback") {
                if let Some(start) = line.find('[') {
                    if let Some(end) = line.find(']') {
                        let idx = &line[start + 1..end];
                        if let Ok(_) = idx.parse::<i32>() {
                            return Some(format!(":{}", idx));
                        }
                    }
                }
            }
        }
        
        None
    }

    fn start_ffmpeg_capture(&self) -> Result<Child, Box<dyn std::error::Error>> {
        std::fs::create_dir_all(&self.output_dir)?;

        let device = self.config.audio_device.clone()
            .or_else(|| Self::get_audio_device())
            .ok_or("No audio capture device found. Install BlackHole or similar.")?;

        let output_pattern = self.output_dir
            .join("chunk_%03d.wav")
            .to_string_lossy()
            .to_string();

        let child = Command::new("ffmpeg")
            .args([
                "-f", "avfoundation",
                "-i", &device,
                "-ar", &self.config.sample_rate.to_string(),
                "-ac", "1",
                "-f", "segment",
                "-segment_time", &self.config.chunk_duration_secs.to_string(),
                "-reset_timestamps", "1",
                &output_pattern,
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()?;

        Ok(child)
    }
}

#[cfg(target_os = "macos")]
impl AudioCapture for MacAudioCapture {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let child = self.start_ffmpeg_capture()?;
        *self.ffmpeg_process.lock().unwrap() = Some(child);
        
        self.running.store(true, Ordering::SeqCst);
        
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let output_dir = self.output_dir.clone();
        let chunk_duration = self.config.chunk_duration_secs;

        let handle = thread::spawn(move || {
            let mut processed_chunks: std::collections::HashSet<String> = std::collections::HashSet::new();
            
            while running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(chunk_duration as u64 + 2));

                if let Ok(entries) = std::fs::read_dir(&output_dir) {
                    let mut chunks: Vec<_> = entries
                        .filter_map(|e| e.ok())
                        .filter(|e| {
                            e.path().extension().map(|x| x == "wav").unwrap_or(false)
                        })
                        .collect();
                    
                    chunks.sort_by(|a, b| {
                        a.metadata().and_then(|m| m.modified()).ok()
                            .cmp(&b.metadata().and_then(|m| m.modified()).ok())
                    });

                    for entry in chunks.iter().rev().skip(1) {
                        let path_str = entry.path().to_string_lossy().to_string();
                        
                        if processed_chunks.contains(&path_str) {
                            continue;
                        }

                        if let Some(transcript) = transcribe_audio_chunk(&entry.path()) {
                            if !transcript.trim().is_empty() {
                                let event = CaptureEvent {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    event_type: CaptureEventType::AudioTranscript,
                                    timestamp: Utc::now(),
                                    data: CaptureData {
                                        url: None,
                                        title: None,
                                        text: Some(transcript.clone()),
                                        app_name: Some("System Audio".to_string()),
                                        duration_ms: Some((chunk_duration * 1000) as u64),
                                        metadata: Some(serde_json::json!({
                                            "source": "audio_capture",
                                            "chunk_file": entry.file_name().to_string_lossy(),
                                        })),
                                    },
                                };

                                if let Err(e) = event_tx.send(event) {
                                    log::warn!("Failed to send audio event: {}", e);
                                }
                            }
                        }

                        processed_chunks.insert(path_str.clone());
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
            
            log::info!("Audio capture processing thread stopped");
        });

        self.capture_thread = Some(handle);
        log::info!("macOS audio capture started");
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        
        if let Some(mut child) = self.ffmpeg_process.lock().unwrap().take() {
            let _ = child.kill();
        }

        if let Some(handle) = self.capture_thread.take() {
            let _ = handle.join();
        }

        if self.output_dir.exists() {
            let _ = std::fs::remove_dir_all(&self.output_dir);
        }

        log::info!("macOS audio capture stopped");
    }
    
    fn is_capturing(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

fn transcribe_audio_chunk(audio_path: &std::path::Path) -> Option<String> {
    let whisper_path = find_whisper_executable()?;
    let model_path = find_whisper_model()?;

    let output = Command::new(&whisper_path)
        .args([
            "-m", &model_path,
            "-f", &audio_path.to_string_lossy(),
            "--output-txt",
            "-l", "auto",
        ])
        .output()
        .ok()?;

    if output.status.success() {
        let txt_path = audio_path.with_extension("txt");
        if txt_path.exists() {
            let content = std::fs::read_to_string(&txt_path).ok()?;
            let _ = std::fs::remove_file(txt_path);
            return Some(content);
        }
    }

    let output = Command::new("whisper")
        .args([
            &audio_path.to_string_lossy().to_string(),
            "--model", "base",
            "--output_format", "txt",
            "--output_dir", audio_path.parent()?.to_string_lossy().as_ref(),
        ])
        .output()
        .ok()?;

    if output.status.success() {
        let txt_path = audio_path.with_extension("txt");
        if txt_path.exists() {
            let content = std::fs::read_to_string(&txt_path).ok()?;
            let _ = std::fs::remove_file(txt_path);
            return Some(content);
        }
    }

    None
}

fn find_whisper_executable() -> Option<String> {
    let possible_paths = [
        "/usr/local/bin/whisper",
        "/opt/homebrew/bin/whisper",
        "whisper",
    ];

    for path in &possible_paths {
        if Command::new(path).arg("--help").output().is_ok() {
            return Some(path.to_string());
        }
    }

    None
}

fn find_whisper_model() -> Option<String> {
    let home = dirs::home_dir()?;
    let possible_paths = [
        home.join(".cache/whisper/ggml-base.bin"),
        home.join("whisper.cpp/models/ggml-base.bin"),
        PathBuf::from("/usr/local/share/whisper/models/ggml-base.bin"),
    ];

    for path in &possible_paths {
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    None
}

#[cfg(target_os = "windows")]
pub struct WindowsAudioCapture {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    config: AudioCaptureConfig,
    capture_thread: Option<thread::JoinHandle<()>>,
    ffmpeg_process: Arc<std::sync::Mutex<Option<Child>>>,
    output_dir: PathBuf,
}

#[cfg(target_os = "windows")]
impl WindowsAudioCapture {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        let output_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("C:\\Temp"))
            .join("mindlair")
            .join("audio_chunks");
        
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            config: AudioCaptureConfig::default(),
            capture_thread: None,
            ffmpeg_process: Arc::new(std::sync::Mutex::new(None)),
            output_dir,
        }
    }

    pub fn with_config(mut self, config: AudioCaptureConfig) -> Self {
        self.config = config;
        self
    }

    fn get_loopback_device() -> Option<String> {
        let output = Command::new("ffmpeg")
            .args(["-list_devices", "true", "-f", "dshow", "-i", "dummy"])
            .output()
            .ok()?;
        
        let stderr = String::from_utf8_lossy(&output.stderr);
        
        for line in stderr.lines() {
            let lower = line.to_lowercase();
            if lower.contains("stereo mix") || lower.contains("loopback") || lower.contains("what u hear") {
                if let Some(start) = line.find('"') {
                    if let Some(end) = line[start + 1..].find('"') {
                        let device_name = &line[start + 1..start + 1 + end];
                        return Some(device_name.to_string());
                    }
                }
            }
        }
        
        None
    }

    fn start_ffmpeg_capture(&self) -> Result<Child, Box<dyn std::error::Error>> {
        std::fs::create_dir_all(&self.output_dir)?;

        let device = self.config.audio_device.clone()
            .or_else(|| Self::get_loopback_device())
            .ok_or("No audio loopback device found. Enable 'Stereo Mix' in Windows sound settings.")?;

        let output_pattern = self.output_dir
            .join("chunk_%03d.wav")
            .to_string_lossy()
            .to_string();

        let child = Command::new("ffmpeg")
            .args([
                "-f", "dshow",
                "-i", &format!("audio={}", device),
                "-ar", &self.config.sample_rate.to_string(),
                "-ac", "1",
                "-f", "segment",
                "-segment_time", &self.config.chunk_duration_secs.to_string(),
                "-reset_timestamps", "1",
                &output_pattern,
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()?;

        Ok(child)
    }
}

#[cfg(target_os = "windows")]
impl AudioCapture for WindowsAudioCapture {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let child = self.start_ffmpeg_capture()?;
        *self.ffmpeg_process.lock().unwrap() = Some(child);
        
        self.running.store(true, Ordering::SeqCst);
        
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let output_dir = self.output_dir.clone();
        let chunk_duration = self.config.chunk_duration_secs;

        let handle = thread::spawn(move || {
            let mut processed_chunks: std::collections::HashSet<String> = std::collections::HashSet::new();
            
            while running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(chunk_duration as u64 + 2));

                if let Ok(entries) = std::fs::read_dir(&output_dir) {
                    let mut chunks: Vec<_> = entries
                        .filter_map(|e| e.ok())
                        .filter(|e| {
                            e.path().extension().map(|x| x == "wav").unwrap_or(false)
                        })
                        .collect();
                    
                    chunks.sort_by(|a, b| {
                        a.metadata().and_then(|m| m.modified()).ok()
                            .cmp(&b.metadata().and_then(|m| m.modified()).ok())
                    });

                    for entry in chunks.iter().rev().skip(1) {
                        let path_str = entry.path().to_string_lossy().to_string();
                        
                        if processed_chunks.contains(&path_str) {
                            continue;
                        }

                        if let Some(transcript) = transcribe_audio_chunk(&entry.path()) {
                            if !transcript.trim().is_empty() {
                                let event = CaptureEvent {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    event_type: CaptureEventType::AudioTranscript,
                                    timestamp: Utc::now(),
                                    data: CaptureData {
                                        url: None,
                                        title: None,
                                        text: Some(transcript.clone()),
                                        app_name: Some("System Audio".to_string()),
                                        duration_ms: Some((chunk_duration * 1000) as u64),
                                        metadata: Some(serde_json::json!({
                                            "source": "audio_capture",
                                            "chunk_file": entry.file_name().to_string_lossy(),
                                        })),
                                    },
                                };

                                if let Err(e) = event_tx.send(event) {
                                    log::warn!("Failed to send audio event: {}", e);
                                }
                            }
                        }

                        processed_chunks.insert(path_str.clone());
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
            
            log::info!("Windows audio capture processing thread stopped");
        });

        self.capture_thread = Some(handle);
        log::info!("Windows audio capture started");
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        
        if let Some(mut child) = self.ffmpeg_process.lock().unwrap().take() {
            let _ = child.kill();
        }

        if let Some(handle) = self.capture_thread.take() {
            let _ = handle.join();
        }

        if self.output_dir.exists() {
            let _ = std::fs::remove_dir_all(&self.output_dir);
        }

        log::info!("Windows audio capture stopped");
    }
    
    fn is_capturing(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

#[cfg(target_os = "linux")]
pub struct LinuxAudioCapture {
    event_tx: broadcast::Sender<CaptureEvent>,
    running: Arc<AtomicBool>,
    config: AudioCaptureConfig,
    capture_thread: Option<thread::JoinHandle<()>>,
    ffmpeg_process: Arc<std::sync::Mutex<Option<Child>>>,
    output_dir: PathBuf,
}

#[cfg(target_os = "linux")]
impl LinuxAudioCapture {
    pub fn new(event_tx: broadcast::Sender<CaptureEvent>) -> Self {
        let output_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join("mindlair")
            .join("audio_chunks");
        
        Self {
            event_tx,
            running: Arc::new(AtomicBool::new(false)),
            config: AudioCaptureConfig::default(),
            capture_thread: None,
            ffmpeg_process: Arc::new(std::sync::Mutex::new(None)),
            output_dir,
        }
    }

    pub fn with_config(mut self, config: AudioCaptureConfig) -> Self {
        self.config = config;
        self
    }

    fn get_pulse_monitor_source() -> Option<String> {
        let output = Command::new("pactl")
            .args(["list", "short", "sources"])
            .output()
            .ok()?;
        
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains(".monitor") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        return Some(parts[1].to_string());
                    }
                }
            }
        }
        
        None
    }

    fn start_ffmpeg_capture(&self) -> Result<Child, Box<dyn std::error::Error>> {
        std::fs::create_dir_all(&self.output_dir)?;

        let source = self.config.audio_device.clone()
            .or_else(|| Self::get_pulse_monitor_source())
            .ok_or("No PulseAudio monitor source found.")?;

        let output_pattern = self.output_dir
            .join("chunk_%03d.wav")
            .to_string_lossy()
            .to_string();

        let child = Command::new("ffmpeg")
            .args([
                "-f", "pulse",
                "-i", &source,
                "-ar", &self.config.sample_rate.to_string(),
                "-ac", "1",
                "-f", "segment",
                "-segment_time", &self.config.chunk_duration_secs.to_string(),
                "-reset_timestamps", "1",
                &output_pattern,
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()?;

        Ok(child)
    }
}

#[cfg(target_os = "linux")]
impl AudioCapture for LinuxAudioCapture {
    fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        if self.running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let child = self.start_ffmpeg_capture()?;
        *self.ffmpeg_process.lock().unwrap() = Some(child);
        
        self.running.store(true, Ordering::SeqCst);
        
        let running = self.running.clone();
        let event_tx = self.event_tx.clone();
        let output_dir = self.output_dir.clone();
        let chunk_duration = self.config.chunk_duration_secs;

        let handle = thread::spawn(move || {
            let mut processed_chunks: std::collections::HashSet<String> = std::collections::HashSet::new();
            
            while running.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(chunk_duration as u64 + 2));

                if let Ok(entries) = std::fs::read_dir(&output_dir) {
                    let mut chunks: Vec<_> = entries
                        .filter_map(|e| e.ok())
                        .filter(|e| {
                            e.path().extension().map(|x| x == "wav").unwrap_or(false)
                        })
                        .collect();
                    
                    chunks.sort_by(|a, b| {
                        a.metadata().and_then(|m| m.modified()).ok()
                            .cmp(&b.metadata().and_then(|m| m.modified()).ok())
                    });

                    for entry in chunks.iter().rev().skip(1) {
                        let path_str = entry.path().to_string_lossy().to_string();
                        
                        if processed_chunks.contains(&path_str) {
                            continue;
                        }

                        if let Some(transcript) = transcribe_audio_chunk(&entry.path()) {
                            if !transcript.trim().is_empty() {
                                let event = CaptureEvent {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    event_type: CaptureEventType::AudioTranscript,
                                    timestamp: Utc::now(),
                                    data: CaptureData {
                                        url: None,
                                        title: None,
                                        text: Some(transcript.clone()),
                                        app_name: Some("System Audio".to_string()),
                                        duration_ms: Some((chunk_duration * 1000) as u64),
                                        metadata: Some(serde_json::json!({
                                            "source": "audio_capture",
                                            "chunk_file": entry.file_name().to_string_lossy(),
                                        })),
                                    },
                                };

                                if let Err(e) = event_tx.send(event) {
                                    log::warn!("Failed to send audio event: {}", e);
                                }
                            }
                        }

                        processed_chunks.insert(path_str.clone());
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
            
            log::info!("Linux audio capture processing thread stopped");
        });

        self.capture_thread = Some(handle);
        log::info!("Linux audio capture started");
        Ok(())
    }
    
    fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        
        if let Some(mut child) = self.ffmpeg_process.lock().unwrap().take() {
            let _ = child.kill();
        }

        if let Some(handle) = self.capture_thread.take() {
            let _ = handle.join();
        }

        if self.output_dir.exists() {
            let _ = std::fs::remove_dir_all(&self.output_dir);
        }

        log::info!("Linux audio capture stopped");
    }
    
    fn is_capturing(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

pub fn check_audio_capture_requirements() -> AudioCaptureStatus {
    #[cfg(target_os = "macos")]
    {
        let has_ffmpeg = Command::new("ffmpeg").arg("-version").output().is_ok();
        let has_whisper = find_whisper_executable().is_some();
        let has_audio_device = MacAudioCapture::get_audio_device().is_some();
        let has_model = find_whisper_model().is_some();

        AudioCaptureStatus {
            available: has_ffmpeg && has_audio_device,
            transcription_available: has_whisper && has_model,
            missing_components: {
                let mut missing = Vec::new();
                if !has_ffmpeg { missing.push("ffmpeg".to_string()); }
                if !has_audio_device { missing.push("BlackHole or audio loopback device".to_string()); }
                if !has_whisper { missing.push("whisper".to_string()); }
                if !has_model { missing.push("whisper model (ggml-base.bin)".to_string()); }
                missing
            },
            setup_instructions: if !has_ffmpeg || !has_audio_device {
                Some("Install ffmpeg: brew install ffmpeg\nInstall BlackHole: https://existential.audio/blackhole/".to_string())
            } else if !has_whisper || !has_model {
                Some("Install whisper: pip install openai-whisper\nOr build whisper.cpp from source".to_string())
            } else {
                None
            },
        }
    }

    #[cfg(target_os = "windows")]
    {
        let has_ffmpeg = Command::new("ffmpeg").arg("-version").output().is_ok();
        let has_whisper = find_whisper_executable().is_some();
        let has_audio_device = WindowsAudioCapture::get_loopback_device().is_some();
        let has_model = find_whisper_model().is_some();

        AudioCaptureStatus {
            available: has_ffmpeg && has_audio_device,
            transcription_available: has_whisper && has_model,
            missing_components: {
                let mut missing = Vec::new();
                if !has_ffmpeg { missing.push("ffmpeg".to_string()); }
                if !has_audio_device { missing.push("Stereo Mix or audio loopback device".to_string()); }
                if !has_whisper { missing.push("whisper".to_string()); }
                if !has_model { missing.push("whisper model".to_string()); }
                missing
            },
            setup_instructions: if !has_ffmpeg || !has_audio_device {
                Some("Install ffmpeg: winget install ffmpeg\nEnable 'Stereo Mix' in Sound Settings > Recording Devices".to_string())
            } else if !has_whisper || !has_model {
                Some("Install whisper: pip install openai-whisper".to_string())
            } else {
                None
            },
        }
    }

    #[cfg(target_os = "linux")]
    {
        let has_ffmpeg = Command::new("ffmpeg").arg("-version").output().is_ok();
        let has_whisper = find_whisper_executable().is_some();
        let has_audio_device = LinuxAudioCapture::get_pulse_monitor_source().is_some();
        let has_model = find_whisper_model().is_some();

        AudioCaptureStatus {
            available: has_ffmpeg && has_audio_device,
            transcription_available: has_whisper && has_model,
            missing_components: {
                let mut missing = Vec::new();
                if !has_ffmpeg { missing.push("ffmpeg".to_string()); }
                if !has_audio_device { missing.push("PulseAudio monitor source".to_string()); }
                if !has_whisper { missing.push("whisper".to_string()); }
                if !has_model { missing.push("whisper model".to_string()); }
                missing
            },
            setup_instructions: if !has_ffmpeg || !has_audio_device {
                Some("Install ffmpeg: sudo apt install ffmpeg\nEnsure PulseAudio is running with monitor sources".to_string())
            } else if !has_whisper || !has_model {
                Some("Install whisper: pip install openai-whisper".to_string())
            } else {
                None
            },
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AudioCaptureStatus {
    pub available: bool,
    pub transcription_available: bool,
    pub missing_components: Vec<String>,
    pub setup_instructions: Option<String>,
}
