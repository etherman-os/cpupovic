use tauri::State;

use crate::{
    app_state::AppState,
    sensors::{battery, types::BatterySample, types::SensorSample},
};

#[tauri::command]
pub fn get_sensor_sample(state: State<'_, AppState>) -> Result<SensorSample, String> {
    let mut sensor = state
        .cpu_sensor
        .lock()
        .map_err(|_| "CPU sensor lock is poisoned".to_string())?;
    Ok(sensor.sample())
}

#[tauri::command]
pub fn get_battery_sample() -> BatterySample {
    battery::read_battery_sample()
}
