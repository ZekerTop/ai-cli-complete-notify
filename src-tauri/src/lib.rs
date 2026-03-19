use serde::Serialize;
use std::{env, fs, path::PathBuf};
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

#[derive(Clone, Copy)]
struct LaunchState {
    silent_start_requested: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StartupStatus {
    autostart_enabled: bool,
    autostart_supported: bool,
    silent_start_requested: bool,
    autostart_error: Option<String>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum CloseBehavior {
    Ask,
    Tray,
    Exit,
}

impl CloseBehavior {
    fn from_config_value(value: &str) -> Self {
        match value.trim().to_ascii_lowercase().as_str() {
            "tray" => Self::Tray,
            "exit" => Self::Exit,
            _ => Self::Ask,
        }
    }
}

fn get_data_dir() -> PathBuf {
    const DATA_DIR_ENV: [&str; 4] = [
        "AI_CLI_COMPLETE_NOTIFY_DATA_DIR",
        "AICLI_COMPLETE_NOTIFY_DATA_DIR",
        "TASKPULSE_DATA_DIR",
        "AI_REMINDER_DATA_DIR",
    ];

    for key in DATA_DIR_ENV {
        if let Ok(value) = env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return PathBuf::from(trimmed);
            }
        }
    }

    if let Ok(app_data) = env::var("APPDATA") {
        let trimmed = app_data.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed).join("ai-cli-complete-notify");
        }
    }

    if let Ok(home) = env::var("USERPROFILE").or_else(|_| env::var("HOME")) {
        let trimmed = home.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed).join(".ai-cli-complete-notify");
        }
    }

    PathBuf::from(".ai-cli-complete-notify")
}

fn read_close_behavior() -> CloseBehavior {
    let settings_path = get_data_dir().join("settings.json");
    let bytes = match fs::read(&settings_path) {
        Ok(bytes) => bytes,
        Err(_) => return CloseBehavior::Ask,
    };

    let parsed: serde_json::Value = match serde_json::from_slice(&bytes) {
        Ok(value) => value,
        Err(_) => return CloseBehavior::Ask,
    };

    parsed
        .get("ui")
        .and_then(|ui| ui.get("closeBehavior"))
        .and_then(|value| value.as_str())
        .map(CloseBehavior::from_config_value)
        .unwrap_or(CloseBehavior::Ask)
}

fn build_startup_status(app: &tauri::AppHandle, launch_state: LaunchState) -> StartupStatus {
    match app.autolaunch().is_enabled() {
        Ok(enabled) => StartupStatus {
            autostart_enabled: enabled,
            autostart_supported: true,
            silent_start_requested: launch_state.silent_start_requested,
            autostart_error: None,
        },
        Err(error) => StartupStatus {
            autostart_enabled: false,
            autostart_supported: false,
            silent_start_requested: launch_state.silent_start_requested,
            autostart_error: Some(error.to_string()),
        },
    }
}

#[tauri::command]
fn get_startup_status(
    app: tauri::AppHandle,
    launch_state: tauri::State<'_, LaunchState>,
) -> StartupStatus {
    build_startup_status(&app, *launch_state.inner())
}

#[tauri::command]
fn set_autostart_enabled(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|error| error.to_string())?;
    } else {
        autostart.disable().map_err(|error| error.to_string())?;
    }
    autostart.is_enabled().map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--silent-start"])
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_startup_status,
            set_autostart_enabled
        ])
        .setup(|app| {
            app.manage(LaunchState {
                silent_start_requested: std::env::args().any(|arg| arg == "--silent-start"),
            });

            // Build system tray
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .text("show", "Show")
                .separator()
                .text("quit", "Quit")
                .build()?;

            let mut tray = tauri::tray::TrayIconBuilder::with_id("main")
                .menu(&tray_menu)
                .tooltip("AI CLI Complete Notify");

            if let Some(icon) = app.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }

            let _tray = tray
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();

                match read_close_behavior() {
                    CloseBehavior::Tray => {
                        let _ = window.hide();
                    }
                    CloseBehavior::Exit => {
                        window.app_handle().exit(0);
                    }
                    CloseBehavior::Ask => {
                        let _ = window.emit("app-close-requested", ());
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
