use std::time::{SystemTime, UNIX_EPOCH};

use sysinfo::{CpuRefreshKind, RefreshKind, System};

use super::{temperature, types::SensorSample};

pub struct CpuSensor {
    system: System,
}

impl CpuSensor {
    pub fn new() -> Self {
        let mut system =
            System::new_with_specifics(RefreshKind::nothing().with_cpu(CpuRefreshKind::everything()));
        system.refresh_cpu_usage();
        Self { system }
    }

    pub fn sample(&mut self) -> SensorSample {
        self.system.refresh_cpu_usage();

        let cpus = self.system.cpus();
        let cpu_load_percent = if cpus.is_empty() {
            0.0
        } else {
            cpus.iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / cpus.len() as f32
        };

        SensorSample {
            timestamp_ms: now_ms(),
            cpu_load_percent: cpu_load_percent.clamp(0.0, 100.0),
            temperature_celsius: temperature::read_cpu_temperature_celsius(),
            fan_rpm: None,
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
