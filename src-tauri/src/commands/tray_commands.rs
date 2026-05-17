use serde::Deserialize;
use tauri::{AppHandle, Manager, State};

use crate::app_state::{AppState, TrayMenuHandles};

#[tauri::command]
pub fn show_dashboard(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    }

    if let Ok(mut runtime_state) = state.runtime_state.lock() {
        runtime_state.dashboard_visible = true;
    }

    Ok(())
}

#[tauri::command]
pub fn hide_dashboard(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|error| error.to_string())?;
    }

    if let Ok(mut runtime_state) = state.runtime_state.lock() {
        runtime_state.dashboard_visible = false;
    }

    Ok(())
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayStatusUpdate {
    pub running: bool,
    pub muted: bool,
    pub profile_id: String,
    pub cpu_threshold_on: f64,
    pub cpu_threshold_off: f64,
}

#[tauri::command]
pub fn update_tray_status(
    status: TrayStatusUpdate,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let handles = state
        .tray_menu_handles
        .lock()
        .map_err(|_| "tray menu handle lock is poisoned".to_string())?;

    if let Some(handles) = handles.as_ref() {
        apply_tray_status(handles, &status)?;
    }

    Ok(())
}

fn apply_tray_status(handles: &TrayMenuHandles, status: &TrayStatusUpdate) -> Result<(), String> {
    handles
        .status
        .set_text(if status.running {
            "Status: Running"
        } else {
            "Status: Paused"
        })
        .map_err(|error| error.to_string())?;
    handles
        .audio
        .set_text(if status.muted {
            "Audio: Muted"
        } else {
            "Audio: Unmuted"
        })
        .map_err(|error| error.to_string())?;
    handles
        .profile
        .set_text(format!("Sound Pack: {}", profile_label(&status.profile_id)))
        .map_err(|error| error.to_string())?;
    handles
        .threshold
        .set_text(format!(
            "Threshold: {:.0}% on / {:.0}% off",
            status.cpu_threshold_on, status.cpu_threshold_off
        ))
        .map_err(|error| error.to_string())?;
    handles
        .start
        .set_enabled(!status.running)
        .map_err(|error| error.to_string())?;
    handles
        .pause
        .set_enabled(status.running)
        .map_err(|error| error.to_string())?;
    handles
        .mute
        .set_text(if status.muted { "Unmute" } else { "Mute" })
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn profile_label(profile_id: &str) -> String {
    match profile_id {
        "local-engine" => "Local Engine Pack".to_string(),
        "supara" => "Supara Pack".to_string(),
        other => other
            .split('-')
            .filter(|part| !part.is_empty())
            .map(capitalize_ascii)
            .collect::<Vec<_>>()
            .join(" "),
    }
}

fn capitalize_ascii(value: &str) -> String {
    let mut chars = value.chars();

    match chars.next() {
        Some(first) => format!("{}{}", first.to_ascii_uppercase(), chars.as_str()),
        None => String::new(),
    }
}
