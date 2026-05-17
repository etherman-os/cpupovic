use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

use crate::app_state::{AppState, TrayMenuHandles};

use super::events::{emit_tray_action, show_dashboard};

pub fn setup(app: &mut tauri::App) -> tauri::Result<()> {
    let status = MenuItem::with_id(app, "status-display", "Status: Running", false, None::<&str>)?;
    let audio = MenuItem::with_id(app, "audio-display", "Audio: Unmuted", false, None::<&str>)?;
    let profile = MenuItem::with_id(
        app,
        "profile-display",
        "Sound Pack: Local Engine Pack",
        false,
        None::<&str>,
    )?;
    let threshold = MenuItem::with_id(
        app,
        "threshold-display",
        "Threshold: 50% on / 45% off",
        false,
        None::<&str>,
    )?;
    let open = MenuItem::with_id(app, "open-dashboard", "Open Dashboard", true, None::<&str>)?;
    let start = MenuItem::with_id(app, "start", "Start CPUpoviç", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Pause CPUpoviç", true, None::<&str>)?;
    let mute = MenuItem::with_id(app, "toggle-mute", "Mute", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let threshold_0 = MenuItem::with_id(app, "threshold:0", "0%", true, None::<&str>)?;
    let threshold_25 = MenuItem::with_id(app, "threshold:25", "25%", true, None::<&str>)?;
    let threshold_50 = MenuItem::with_id(app, "threshold:50", "50%", true, None::<&str>)?;
    let threshold_75 = MenuItem::with_id(app, "threshold:75", "75%", true, None::<&str>)?;
    let threshold_menu = Submenu::with_items(
        app,
        "CPU Threshold",
        true,
        &[&threshold_0, &threshold_25, &threshold_50, &threshold_75],
    )?;

    let separator_a = PredefinedMenuItem::separator(app)?;
    let separator_b = PredefinedMenuItem::separator(app)?;
    let separator_c = PredefinedMenuItem::separator(app)?;
    let separator_status = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &status,
            &audio,
            &profile,
            &threshold,
            &separator_status,
            &open,
            &separator_a,
            &start,
            &pause,
            &mute,
            &separator_b,
            &threshold_menu,
            &settings,
            &separator_c,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("CPUpoviç")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open-dashboard" | "settings" => {
                show_dashboard(app);
                emit_tray_action(app, "open-dashboard", None);
            }
            "start" => emit_tray_action(app, "start", None),
            "pause" => emit_tray_action(app, "pause", None),
            "toggle-mute" => emit_tray_action(app, "toggle-mute", None),
            "threshold:0" => emit_tray_action(app, "set-threshold", Some("0")),
            "threshold:25" => emit_tray_action(app, "set-threshold", Some("25")),
            "threshold:50" => emit_tray_action(app, "set-threshold", Some("50")),
            "threshold:75" => emit_tray_action(app, "set-threshold", Some("75")),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_dashboard(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    if let Ok(mut handles) = app.state::<AppState>().tray_menu_handles.lock() {
        *handles = Some(TrayMenuHandles {
            status,
            audio,
            profile,
            threshold,
            start,
            pause,
            mute,
        });
    }

    tray.build(app)?;
    Ok(())
}
