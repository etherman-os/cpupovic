mod app_state;
mod commands;
mod sensors;
mod tray;

use app_state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            tray::setup(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let should_hide = window
                    .state::<AppState>()
                    .close_to_tray
                    .lock()
                    .map(|close_to_tray| *close_to_tray)
                    .unwrap_or(true);

                if should_hide {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::sensor_commands::get_sensor_sample,
            commands::sensor_commands::get_battery_sample,
            commands::settings_commands::settings_store_ready,
            commands::settings_commands::set_close_to_tray,
            commands::tray_commands::show_dashboard,
            commands::tray_commands::hide_dashboard,
            commands::tray_commands::quit_app,
            commands::tray_commands::update_tray_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
