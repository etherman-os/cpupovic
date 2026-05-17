use tauri::State;

use crate::app_state::AppState;

#[tauri::command]
pub fn settings_store_ready() -> bool {
    true
}

#[tauri::command]
pub fn set_close_to_tray(close_to_tray: bool, state: State<'_, AppState>) -> Result<(), String> {
    let mut stored = state
        .close_to_tray
        .lock()
        .map_err(|_| "close-to-tray state lock is poisoned".to_string())?;
    *stored = close_to_tray;
    Ok(())
}
