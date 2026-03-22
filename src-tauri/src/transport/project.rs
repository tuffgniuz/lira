use crate::persistence::models::{
    Project, ProjectBoardLane, ProjectStatus, ProjectTaskTemplate, ProjectTaskTemplateField,
    ProjectTaskTemplateFieldType,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default = "default_true")]
    pub has_kanban_board: bool,
    #[serde(default)]
    pub task_template: Option<ProjectTaskTemplateDto>,
    #[serde(default)]
    pub board_lanes: Vec<ProjectBoardLaneDto>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBoardLaneDto {
    pub id: String,
    pub name: String,
    pub order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTaskTemplateDto {
    #[serde(default)]
    pub fields: Vec<ProjectTaskTemplateFieldDto>,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTaskTemplateFieldDto {
    pub id: String,
    pub key: String,
    pub label: String,
    #[serde(rename = "type", default = "default_task_template_field_type")]
    pub field_type: String,
}

pub fn project_dto_from_model(project: Project) -> ProjectDto {
    ProjectDto {
        id: project.id,
        name: project.name,
        description: project.description.unwrap_or_default(),
        has_kanban_board: project.has_kanban_board,
        task_template: project.task_template.map(task_template_dto_from_model),
        board_lanes: project
            .board_lanes
            .into_iter()
            .map(|lane| ProjectBoardLaneDto {
                id: lane.id,
                name: lane.name,
                order: lane.order,
            })
            .collect(),
        created_at: project.created_at,
        updated_at: project.updated_at,
    }
}

pub fn project_from_dto(project: ProjectDto) -> Project {
    Project {
        id: project.id,
        name: project.name,
        description: empty_string_to_none(project.description),
        status: ProjectStatus::Active,
        has_kanban_board: project.has_kanban_board,
        task_template: project.task_template.map(task_template_from_dto),
        board_lanes: project
            .board_lanes
            .into_iter()
            .map(|lane| ProjectBoardLane {
                id: lane.id,
                name: lane.name,
                order: lane.order,
            })
            .collect(),
        created_at: project.created_at,
        updated_at: project.updated_at,
    }
}

fn empty_string_to_none(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn default_true() -> bool {
    true
}

fn task_template_dto_from_model(template: ProjectTaskTemplate) -> ProjectTaskTemplateDto {
    ProjectTaskTemplateDto {
        fields: template
            .fields
            .into_iter()
            .map(|field| ProjectTaskTemplateFieldDto {
                id: field.id,
                key: field.key,
                label: field.label,
                field_type: task_template_field_type_to_string(field.field_type),
            })
            .collect(),
        updated_at: template.updated_at,
    }
}

fn task_template_from_dto(template: ProjectTaskTemplateDto) -> ProjectTaskTemplate {
    ProjectTaskTemplate {
        fields: template
            .fields
            .into_iter()
            .map(|field| ProjectTaskTemplateField {
                id: field.id,
                key: field.key,
                label: field.label,
                field_type: task_template_field_type_from_string(&field.field_type),
            })
            .collect(),
        updated_at: template.updated_at,
    }
}

fn default_task_template_field_type() -> String {
    "text".into()
}

fn task_template_field_type_to_string(field_type: ProjectTaskTemplateFieldType) -> String {
    match field_type {
        ProjectTaskTemplateFieldType::Text => "text".into(),
        ProjectTaskTemplateFieldType::Boolean => "boolean".into(),
        ProjectTaskTemplateFieldType::Number => "number".into(),
        ProjectTaskTemplateFieldType::Date => "date".into(),
    }
}

fn task_template_field_type_from_string(value: &str) -> ProjectTaskTemplateFieldType {
    match value {
        "boolean" => ProjectTaskTemplateFieldType::Boolean,
        "number" => ProjectTaskTemplateFieldType::Number,
        "date" => ProjectTaskTemplateFieldType::Date,
        _ => ProjectTaskTemplateFieldType::Text,
    }
}
