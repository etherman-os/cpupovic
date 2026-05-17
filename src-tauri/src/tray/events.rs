use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

pub const TRAY_ACTION_EVENT: &str = "tray-action";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayActionPayload {
    pub action: String,
    pub value: Option<String>,
}

pub fn emit_tray_action(app: &AppHandle, action: &str, value: Option<&str>) {
    let payload = TrayActionPayload {
        action: action.to_string(),
        value: value.map(str::to_string),
    };
    let _ = app.emit(TRAY_ACTION_EVENT, payload);
}

pub fn show_dashboard(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
