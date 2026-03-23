use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskLifecycleStatus {
    Active,
    Archived,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TaskScheduleBucket {
    Inbox,
    Today,
    Upcoming,
    Someday,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBoardLane {
    pub id: String,
    pub name: String,
    pub order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProjectTaskTemplateFieldType {
    Text,
    Boolean,
    Number,
    Date,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTaskTemplateField {
    pub id: String,
    pub key: String,
    pub label: String,
    #[serde(default = "default_project_task_template_field_type")]
    pub field_type: ProjectTaskTemplateFieldType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTaskTemplate {
    #[serde(default)]
    pub fields: Vec<ProjectTaskTemplateField>,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub lifecycle_status: TaskLifecycleStatus,
    pub is_completed: bool,
    pub schedule_bucket: TaskScheduleBucket,
    pub priority: Option<i64>,
    pub due_at: Option<String>,
    pub completed_at: Option<String>,
    pub estimate_minutes: Option<i64>,
    pub project_id: Option<String>,
    pub project_lane_id: Option<String>,
    pub source_capture_id: Option<String>,
    #[serde(default)]
    pub custom_field_values: HashMap<String, String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Doc {
    pub id: String,
    pub title: String,
    pub body: String,
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CaptureLifecycleStatus {
    Active,
    Archived,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CaptureTriageStatus {
    Inbox,
    Processed,
    Someday,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Capture {
    pub id: String,
    pub text: String,
    pub lifecycle_status: CaptureLifecycleStatus,
    pub triage_status: CaptureTriageStatus,
    pub project_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub processed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GoalType {
    Activity,
    Outcome,
    Milestone,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GoalStatus {
    Draft,
    Active,
    Paused,
    Completed,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GoalTrackingMode {
    Automatic,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub goal_type: GoalType,
    pub status: GoalStatus,
    pub tracking_mode: GoalTrackingMode,
    pub metric: Option<String>,
    pub target_value: Option<f64>,
    pub current_value: Option<f64>,
    pub period_unit: Option<String>,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub scope_project_id: Option<String>,
    pub scope_tag: Option<String>,
    pub source_query: Option<String>,
    #[serde(default)]
    pub schedule_days: Vec<String>,
    #[serde(default)]
    pub milestones: Vec<GoalMilestone>,
    pub created_at: String,
    pub updated_at: String,
    pub archived_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GoalMilestone {
    pub id: String,
    pub title: String,
    pub sort_order: i64,
    pub is_completed: bool,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GoalProgressEntry {
    pub id: String,
    pub goal_id: String,
    pub date: String,
    pub value: f64,
    pub source_type: Option<String>,
    pub source_entity_type: Option<String>,
    pub source_entity_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProjectStatus {
    Active,
    Archived,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: ProjectStatus,
    pub has_kanban_board: bool,
    #[serde(default)]
    pub task_template: Option<ProjectTaskTemplate>,
    pub board_lanes: Vec<ProjectBoardLane>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntityTag {
    pub entity_type: String,
    pub entity_id: String,
    pub tag_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Relationship {
    pub id: String,
    pub from_entity_type: String,
    pub from_entity_id: String,
    pub to_entity_type: String,
    pub to_entity_id: String,
    pub relation_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub profile_picture: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TaskQuery {
    pub lifecycle_status: Option<TaskLifecycleStatus>,
    pub is_completed: Option<bool>,
    pub schedule_bucket: Option<TaskScheduleBucket>,
    pub project_id: Option<String>,
}

fn default_project_task_template_field_type() -> ProjectTaskTemplateFieldType {
    ProjectTaskTemplateFieldType::Text
}
