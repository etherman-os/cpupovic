pub mod runtime_state;

use std::sync::Mutex;

use crate::sensors::cpu::CpuSensor;
use runtime_state::BackendRuntimeState;
use tauri::{menu::MenuItem, Wry};

#[derive(Clone)]
pub struct TrayMenuHandles {
    pub status: MenuItem<Wry>,
    pub audio: MenuItem<Wry>,
    pub profile: MenuItem<Wry>,
    pub threshold: MenuItem<Wry>,
    pub start: MenuItem<Wry>,
    pub pause: MenuItem<Wry>,
    pub mute: MenuItem<Wry>,
}

pub struct AppState {
    pub close_to_tray: Mutex<bool>,
    pub cpu_sensor: Mutex<CpuSensor>,
    pub runtime_state: Mutex<BackendRuntimeState>,
    pub tray_menu_handles: Mutex<Option<TrayMenuHandles>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            close_to_tray: Mutex::new(true),
            cpu_sensor: Mutex::new(CpuSensor::new()),
            runtime_state: Mutex::new(BackendRuntimeState::default()),
            tray_menu_handles: Mutex::new(None),
        }
    }
}
