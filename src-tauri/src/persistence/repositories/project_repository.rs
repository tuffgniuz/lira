use crate::persistence::database::Database;
use crate::persistence::models::{
    Project, ProjectBoardLane, ProjectStatus, ProjectTaskTemplate,
};
use crate::persistence::support::{decode_enum, encode_enum, option_string, to_sql_error};
use rusqlite::params;

fn default_project_board_lanes(project_id: &str) -> Vec<ProjectBoardLane> {
    vec![
        ProjectBoardLane {
            id: format!("{}-lane-to-do", project_id),
            name: "To Do".into(),
            order: 0,
        },
        ProjectBoardLane {
            id: format!("{}-lane-in-progress", project_id),
            name: "In Progress".into(),
            order: 1,
        },
        ProjectBoardLane {
            id: format!("{}-lane-done", project_id),
            name: "Done".into(),
            order: 2,
        },
    ]
}

pub struct ProjectRepository<'a> {
    db: &'a Database,
}

impl<'a> ProjectRepository<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    pub fn create(&self, project: Project) -> Result<(), String> {
        let board_lanes = if project.has_kanban_board && project.board_lanes.is_empty() {
            default_project_board_lanes(&project.id)
        } else {
            project.board_lanes.clone()
        };

        self.db
            .connection()
            .execute(
                "
                INSERT INTO projects (
                    id, name, description, status, has_kanban_board, task_template_json, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ",
                params![
                    project.id,
                    project.name,
                    project.description,
                    encode_enum(&project.status)?,
                    project.has_kanban_board,
                    serialize_task_template(project.task_template.as_ref())?,
                    project.created_at,
                    project.updated_at
                ],
            )
            .map_err(|error| error.to_string())?;

        self.replace_board_lanes(&project.id, &board_lanes)
    }

    #[cfg(test)]
    pub fn update(&self, project: Project) -> Result<(), String> {
        let board_lanes = if project.has_kanban_board && project.board_lanes.is_empty() {
            default_project_board_lanes(&project.id)
        } else {
            project.board_lanes.clone()
        };

        self.db
            .connection()
            .execute(
                "
                UPDATE projects
                SET name = ?2,
                    description = ?3,
                    status = ?4,
                    has_kanban_board = ?5,
                    task_template_json = ?6,
                    created_at = ?7,
                    updated_at = ?8
                WHERE id = ?1
                ",
                params![
                    project.id,
                    project.name,
                    project.description,
                    encode_enum(&project.status)?,
                    project.has_kanban_board,
                    serialize_task_template(project.task_template.as_ref())?,
                    project.created_at,
                    project.updated_at
                ],
            )
            .map_err(|error| error.to_string())?;

        self.replace_board_lanes(&project.id, &board_lanes)
    }

    pub fn list(&self) -> Result<Vec<Project>, String> {
        let mut statement = self
            .db
            .connection()
            .prepare(
                "
                SELECT id, name, description, status, has_kanban_board, task_template_json, created_at, updated_at
                FROM projects
                ORDER BY created_at DESC
                ",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map([], |row| {
                let task_template_json: Option<String> = row.get(5)?;

                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: option_string(row, 2)?,
                    status: decode_enum::<ProjectStatus>(row.get(3)?).map_err(to_sql_error)?,
                    has_kanban_board: row.get(4)?,
                    task_template: deserialize_task_template(task_template_json)
                        .map_err(to_sql_error)?,
                    board_lanes: Vec::new(),
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|error| error.to_string())?;

        let mut projects = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;

        for project in &mut projects {
            let lanes = self.list_board_lanes(&project.id)?;
            project.board_lanes = if project.has_kanban_board && lanes.is_empty() {
                default_project_board_lanes(&project.id)
            } else {
                lanes
            };
        }

        Ok(projects)
    }

    pub fn replace_all(&self, projects: Vec<Project>) -> Result<(), String> {
        self.db
            .connection()
            .execute("DELETE FROM project_board_lanes", [])
            .map_err(|error| error.to_string())?;
        self.db
            .connection()
            .execute("DELETE FROM projects", [])
            .map_err(|error| error.to_string())?;

        for project in projects {
            self.create(project)?;
        }

        Ok(())
    }

    fn list_board_lanes(&self, project_id: &str) -> Result<Vec<ProjectBoardLane>, String> {
        let mut statement = self
            .db
            .connection()
            .prepare(
                "
                SELECT id, name, sort_order
                FROM project_board_lanes
                WHERE project_id = ?1
                ORDER BY sort_order ASC, id ASC
                ",
            )
            .map_err(|error| error.to_string())?;

        let rows = statement
            .query_map(params![project_id], |row| {
                Ok(ProjectBoardLane {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    order: row.get(2)?,
                })
            })
            .map_err(|error| error.to_string())?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())
    }

    fn replace_board_lanes(&self, project_id: &str, board_lanes: &[ProjectBoardLane]) -> Result<(), String> {
        self.db
            .connection()
            .execute(
                "DELETE FROM project_board_lanes WHERE project_id = ?1",
                params![project_id],
            )
            .map_err(|error| error.to_string())?;

        for lane in board_lanes {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO project_board_lanes (id, project_id, name, sort_order)
                    VALUES (?1, ?2, ?3, ?4)
                    ",
                    params![lane.id, project_id, lane.name, lane.order],
                )
                .map_err(|error| error.to_string())?;
        }

        Ok(())
    }
}

fn serialize_task_template(task_template: Option<&ProjectTaskTemplate>) -> Result<Option<String>, String> {
    task_template
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| error.to_string())
}

fn deserialize_task_template(
    task_template_json: Option<String>,
) -> Result<Option<ProjectTaskTemplate>, String> {
    task_template_json
        .filter(|value| !value.trim().is_empty())
        .map(|value| serde_json::from_str(&value).map_err(|error| error.to_string()))
        .transpose()
}
