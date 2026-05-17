use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendRuntimeState {
    pub dashboard_visible: bool,
}

impl Default for BackendRuntimeState {
    fn default() -> Self {
        Self {
            dashboard_visible: true,
        }
    }
}
