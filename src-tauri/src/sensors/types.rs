use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SensorSample {
    pub timestamp_ms: u64,
    pub cpu_load_percent: f32,
    pub temperature_celsius: Option<f32>,
    pub fan_rpm: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatterySample {
    pub percent: Option<f32>,
    pub is_charging: Option<bool>,
}
