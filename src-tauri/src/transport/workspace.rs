use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceItemDto {
    pub id: String,
    pub kind: String,
    pub state: String,
    pub source_type: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub project_lane_id: Option<String>,
    #[serde(default)]
    pub project: String,
    #[serde(default)]
    pub is_completed: bool,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub completed_at: String,
    #[serde(default)]
    pub estimate: String,
    #[serde(default)]
    pub schedule_bucket: Option<String>,
    #[serde(default)]
    pub source_capture_id: Option<String>,
    #[serde(default)]
    pub custom_field_values: HashMap<String, String>,
    #[serde(default)]
    pub goal_metric: Option<String>,
    #[serde(default = "default_goal_target")]
    pub goal_target: i64,
    #[serde(default)]
    pub goal_progress: i64,
    #[serde(default)]
    pub goal_progress_by_date: std::collections::HashMap<String, i64>,
    #[serde(default = "default_goal_period")]
    pub goal_period: String,
    #[serde(default)]
    pub goal_schedule_days: Vec<String>,
    #[serde(default)]
    pub goal_milestones: Vec<WorkspaceGoalMilestoneDto>,
    #[serde(default)]
    pub goal_scope: Option<WorkspaceGoalScopeDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceGoalScopeDto {
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub tag: Option<String>,
    #[serde(default)]
    pub task_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceGoalMilestoneDto {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub is_completed: bool,
    #[serde(default)]
    pub completed_at: String,
}

fn default_goal_target() -> i64 {
    1
}

fn default_goal_period() -> String {
    "weekly".into()
}
