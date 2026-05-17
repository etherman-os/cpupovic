use super::types::BatterySample;

pub fn read_battery_sample() -> BatterySample {
    BatterySample {
        percent: None,
        is_charging: None,
    }
}
