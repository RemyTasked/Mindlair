pub(crate) mod capture;
mod storage;
mod sync;

use std::sync::Mutex;
use capture::CaptureManager;
use storage::Database;
use sync::SyncManager;
use tauri::{
    AppHandle, Manager, Emitter,
    menu::{MenuBuilder, MenuItemBuilder, MenuEvent},
    tray::{TrayIconBuilder, TrayIconEvent, TrayIcon, MouseButton, MouseButtonState},
};

const KEYCHAIN_SERVICE: &str = "com.mindlair.desktop";
const KEYCHAIN_ACCOUNT: &str = "api_key";
const FIRST_LAUNCH_KEY: &str = "first_launch_completed";

pub struct AppState {
    pub capture_manager: Mutex<CaptureManager>,
    pub database: Mutex<Database>,
    pub sync_manager: Mutex<SyncManager>,
    pub api_key: Mutex<Option<String>>,
    pub mapping_enabled: Mutex<bool>,
}

#[tauri::command]
fn get_capture_status(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let capture = state.capture_manager.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "is_running": capture.is_running(),
        "url_monitoring": capture.url_monitoring_enabled(),
        "audio_capture": capture.audio_capture_enabled(),
        "screen_ocr": capture.screen_ocr_enabled(),
        "clipboard": capture.clipboard_enabled(),
        "safari_history": capture.safari_history_enabled(),
    }))
}

#[tauri::command]
fn toggle_capture(enabled: bool, state: tauri::State<AppState>) -> Result<(), String> {
    let mut capture = state.capture_manager.lock().map_err(|e| e.to_string())?;
    if enabled {
        capture.start().map_err(|e| e.to_string())?;
    } else {
        capture.stop();
    }
    Ok(())
}

#[tauri::command]
fn get_pending_items(state: tauri::State<AppState>) -> Result<Vec<serde_json::Value>, String> {
    let db = state.database.lock().map_err(|e| e.to_string())?;
    db.get_pending_items().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recent_captures(limit: i32, state: tauri::State<AppState>) -> Result<Vec<serde_json::Value>, String> {
    let db = state.database.lock().map_err(|e| e.to_string())?;
    db.get_recent_captures(limit).map_err(|e| e.to_string())
}

#[tauri::command]
async fn sync_now(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    let endpoint = {
        let sync = state.sync_manager.lock().map_err(|e| e.to_string())?;
        sync.get_endpoint()
    };
    
    // Create a temporary SyncManager for the async operation
    let temp_sync = sync::SyncManager::new(endpoint);
    temp_sync.sync_pending().await.map_err(|e| e.to_string())
}

#[tauri::command]
fn set_api_endpoint(endpoint: String, state: tauri::State<AppState>) -> Result<(), String> {
    let mut sync = state.sync_manager.lock().map_err(|e| e.to_string())?;
    sync.set_endpoint(endpoint);
    Ok(())
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn check_safari_permissions() -> serde_json::Value {
    let status = capture::CaptureManager::check_safari_permissions();
    serde_json::json!({
        "status": status,
        "message": match status {
            capture::PermissionStatus::Granted => "Safari history access granted",
            capture::PermissionStatus::NeedsFullDiskAccess => "Full Disk Access required. Go to System Settings > Privacy & Security > Full Disk Access and enable Mindlair.",
            capture::PermissionStatus::NotAvailable => "Safari history not available on this system",
        }
    })
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn check_safari_permissions() -> serde_json::Value {
    serde_json::json!({
        "status": "not_available",
        "message": "Safari history bridge is only available on macOS"
    })
}

#[tauri::command]
fn check_audio_capture_status() -> serde_json::Value {
    let status = capture::check_audio_capture_requirements();
    serde_json::json!(status)
}

#[tauri::command]
fn check_screen_ocr_status() -> serde_json::Value {
    let status = capture::check_screen_ocr_requirements();
    serde_json::json!(status)
}

#[tauri::command]
fn get_auth_status(state: tauri::State<AppState>) -> serde_json::Value {
    let api_key = state.api_key.lock().ok().and_then(|k| k.clone());
    serde_json::json!({
        "authenticated": api_key.is_some(),
        "key_preview": api_key.as_ref().map(|k| {
            if k.len() > 8 {
                format!("{}...{}", &k[..4], &k[k.len()-4..])
            } else {
                "****".to_string()
            }
        })
    })
}

#[tauri::command]
fn set_api_key(key: String, state: tauri::State<AppState>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use security_framework::passwords::set_generic_password;
        set_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, key.as_bytes())
            .map_err(|e| format!("Failed to save to keychain: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (subkey, _) = hkcu.create_subkey("SOFTWARE\\Mindlair").map_err(|e| e.to_string())?;
        subkey.set_value("api_key", &key).map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;
        let config_dir = dirs::config_dir().ok_or("No config directory")?;
        let app_dir = config_dir.join("mindlair");
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        let key_file = app_dir.join("api_key");
        fs::write(&key_file, &key).map_err(|e| e.to_string())?;
        fs::set_permissions(&key_file, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    
    let mut api_key_guard = state.api_key.lock().map_err(|e| e.to_string())?;
    *api_key_guard = Some(key.clone());
    
    let mut sync = state.sync_manager.lock().map_err(|e| e.to_string())?;
    sync.set_api_key(Some(key));
    
    Ok(())
}

#[tauri::command]
fn clear_api_key(state: tauri::State<AppState>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use security_framework::passwords::delete_generic_password;
        let _ = delete_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    }
    
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(subkey) = hkcu.open_subkey_with_flags("SOFTWARE\\Mindlair", KEY_WRITE) {
            let _ = subkey.delete_value("api_key");
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        let config_dir = dirs::config_dir().ok_or("No config directory")?;
        let key_file = config_dir.join("mindlair").join("api_key");
        let _ = fs::remove_file(key_file);
    }
    
    let mut api_key_guard = state.api_key.lock().map_err(|e| e.to_string())?;
    *api_key_guard = None;
    
    let mut sync = state.sync_manager.lock().map_err(|e| e.to_string())?;
    sync.set_api_key(None);
    
    Ok(())
}

fn load_saved_api_key() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        use security_framework::passwords::get_generic_password;
        get_generic_password(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
            .ok()
            .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
    }
    
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        hkcu.open_subkey("SOFTWARE\\Mindlair")
            .ok()
            .and_then(|subkey| subkey.get_value::<String, _>("api_key").ok())
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        let config_dir = dirs::config_dir()?;
        let key_file = config_dir.join("mindlair").join("api_key");
        fs::read_to_string(key_file).ok()
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

fn is_first_launch() -> bool {
    let config_path = get_config_path();
    if let Some(path) = config_path {
        let flag_file = path.join(FIRST_LAUNCH_KEY);
        !flag_file.exists()
    } else {
        true
    }
}

fn mark_first_launch_complete() {
    if let Some(path) = get_config_path() {
        let _ = std::fs::create_dir_all(&path);
        let flag_file = path.join(FIRST_LAUNCH_KEY);
        let _ = std::fs::write(flag_file, "1");
    }
}

fn get_config_path() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|p| p.join("mindlair"))
}

#[tauri::command]
fn get_mapping_status(state: tauri::State<AppState>) -> serde_json::Value {
    let is_mapping = state.mapping_enabled.lock().ok().map(|m| *m).unwrap_or(false);
    let capture = state.capture_manager.lock().ok();
    
    let capture_count = capture.as_ref().map(|c| c.get_capture_count()).unwrap_or(0);
    
    serde_json::json!({
        "is_mapping": is_mapping,
        "capture_count": capture_count,
    })
}

#[tauri::command]
fn set_mapping_enabled(enabled: bool, state: tauri::State<AppState>) -> Result<(), String> {
    let mut capture = state.capture_manager.lock().map_err(|e| e.to_string())?;
    let mut mapping_enabled = state.mapping_enabled.lock().map_err(|e| e.to_string())?;
    
    if enabled {
        capture.start().map_err(|e| e.to_string())?;
        *mapping_enabled = true;
    } else {
        capture.stop();
        *mapping_enabled = false;
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    
    let saved_api_key = load_saved_api_key();
    let first_launch = is_first_launch();
    
    let database = Database::new().expect("Failed to initialize database");
    let mut capture_manager = CaptureManager::new();
    let mut sync_manager = SyncManager::new("http://localhost:3000/api".to_string());
    
    if let Some(ref key) = saved_api_key {
        sync_manager.set_api_key(Some(key.clone()));
    }
    
    // Auto-start mapping on first launch or if it was previously enabled
    let should_start_mapping = first_launch || load_mapping_preference();
    if should_start_mapping {
        let _ = capture_manager.start();
        if first_launch {
            mark_first_launch_complete();
        }
    }
    
    let app_state = AppState {
        capture_manager: Mutex::new(capture_manager),
        database: Mutex::new(database),
        sync_manager: Mutex::new(sync_manager),
        api_key: Mutex::new(saved_api_key),
        mapping_enabled: Mutex::new(should_start_mapping),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_capture_status,
            toggle_capture,
            get_pending_items,
            get_recent_captures,
            sync_now,
            set_api_endpoint,
            check_safari_permissions,
            check_audio_capture_status,
            check_screen_ocr_status,
            get_auth_status,
            set_api_key,
            clear_api_key,
            get_mapping_status,
            set_mapping_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn load_mapping_preference() -> bool {
    if let Some(path) = get_config_path() {
        let pref_file = path.join("mapping_enabled");
        std::fs::read_to_string(pref_file)
            .map(|s| s.trim() == "1")
            .unwrap_or(true) // Default to enabled
    } else {
        true
    }
}

fn save_mapping_preference(enabled: bool) {
    if let Some(path) = get_config_path() {
        let _ = std::fs::create_dir_all(&path);
        let pref_file = path.join("mapping_enabled");
        let _ = std::fs::write(pref_file, if enabled { "1" } else { "0" });
    }
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_dashboard = MenuItemBuilder::with_id("open", "Open Dashboard").build(app)?;
    let toggle_mapping = MenuItemBuilder::with_id("toggle", "Pause Mapping").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Mindlair").build(app)?;
    
    let menu = MenuBuilder::new(app)
        .item(&open_dashboard)
        .separator()
        .item(&toggle_mapping)
        .separator()
        .item(&quit)
        .build()?;
    
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Mindlair - Mapping enabled")
        .on_menu_event(|app: &AppHandle, event: MenuEvent| {
            match event.id().as_ref() {
                "open" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "toggle" => {
                    let state = app.state::<AppState>();
                    let mut mapping = state.mapping_enabled.lock().unwrap();
                    let new_state = !*mapping;
                    *mapping = new_state;
                    
                    let mut capture = state.capture_manager.lock().unwrap();
                    if new_state {
                        let _ = capture.start();
                    } else {
                        capture.stop();
                    }
                    
                    save_mapping_preference(new_state);
                    
                    // Emit event to frontend
                    let _ = app.emit("mapping-status-changed", new_state);
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;
    
    Ok(())
}
