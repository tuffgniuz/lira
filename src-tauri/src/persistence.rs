use rusqlite::{params, Connection, OptionalExtension, Row};
use std::path::Path;

pub mod models {
    use serde::{Deserialize, Serialize};

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
        pub created_at: String,
        pub updated_at: String,
        pub archived_at: Option<String>,
        pub completed_at: Option<String>,
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

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    #[serde(rename_all = "camelCase")]
    pub struct JournalEntry {
        pub id: String,
        pub entry_date: String,
        pub title: Option<String>,
        pub content_markdown: Option<String>,
        pub morning_intention: Option<String>,
        pub reflection_prompt: Option<String>,
        pub created_at: String,
        pub updated_at: String,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
    #[serde(rename_all = "snake_case")]
    pub enum JournalCommitmentStatus {
        Open,
        Missed,
        Partial,
        Done,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    #[serde(rename_all = "camelCase")]
    pub struct JournalCommitment {
        pub id: String,
        pub journal_entry_id: String,
        pub text: String,
        pub status: JournalCommitmentStatus,
        pub sort_order: i64,
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

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    #[serde(rename_all = "camelCase")]
    pub struct JournalEntrySummary {
        pub entry_date: String,
        pub title: Option<String>,
        pub preview: String,
    }
}

pub mod database {
    use super::*;

    pub struct Database {
        connection: Connection,
    }

    impl Database {
        pub fn in_memory() -> Result<Self, String> {
            let connection = Connection::open_in_memory().map_err(|error| error.to_string())?;
            let database = Self { connection };
            database.migrate()?;
            Ok(database)
        }

        pub fn open(path: &Path) -> Result<Self, String> {
            let connection = Connection::open(path).map_err(|error| error.to_string())?;
            let database = Self { connection };
            database.migrate()?;
            Ok(database)
        }

        pub fn connection(&self) -> &Connection {
            &self.connection
        }

        fn migrate(&self) -> Result<(), String> {
            self.connection
                .execute_batch(
                    "
                    PRAGMA foreign_keys = ON;

                    CREATE TABLE IF NOT EXISTS captures (
                        id TEXT PRIMARY KEY,
                        text TEXT NOT NULL,
                        lifecycle_status TEXT NOT NULL,
                        triage_status TEXT NOT NULL,
                        project_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        processed_at TEXT,
                        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        status TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS project_board_lanes (
                        id TEXT PRIMARY KEY,
                        project_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        sort_order INTEGER NOT NULL,
                        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS tasks (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        description TEXT,
                        lifecycle_status TEXT NOT NULL,
                        is_completed INTEGER NOT NULL,
                        schedule_bucket TEXT NOT NULL,
                        priority INTEGER,
                        due_at TEXT,
                        completed_at TEXT,
                        estimate_minutes INTEGER,
                        project_id TEXT,
                        project_lane_id TEXT,
                        source_capture_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
                        FOREIGN KEY(source_capture_id) REFERENCES captures(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS goals (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        description TEXT,
                        goal_type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        tracking_mode TEXT NOT NULL,
                        metric TEXT,
                        target_value REAL,
                        current_value REAL,
                        period_unit TEXT,
                        period_start TEXT,
                        period_end TEXT,
                        starts_at TEXT,
                        ends_at TEXT,
                        scope_project_id TEXT,
                        scope_tag TEXT,
                        source_query TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        archived_at TEXT,
                        completed_at TEXT,
                        FOREIGN KEY(scope_project_id) REFERENCES projects(id) ON DELETE SET NULL
                    );

                    CREATE TABLE IF NOT EXISTS goal_progress_entries (
                        id TEXT PRIMARY KEY,
                        goal_id TEXT NOT NULL,
                        date TEXT NOT NULL,
                        value REAL NOT NULL,
                        source_type TEXT,
                        source_entity_type TEXT,
                        source_entity_id TEXT,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS journal_entries (
                        id TEXT PRIMARY KEY,
                        entry_date TEXT NOT NULL UNIQUE,
                        title TEXT,
                        content_markdown TEXT,
                        morning_intention TEXT,
                        reflection_prompt TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS journal_commitments (
                        id TEXT PRIMARY KEY,
                        journal_entry_id TEXT NOT NULL,
                        text TEXT NOT NULL,
                        status TEXT NOT NULL,
                        sort_order INTEGER NOT NULL,
                        FOREIGN KEY(journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS tags (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        color TEXT,
                        created_at TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS entity_tags (
                        entity_type TEXT NOT NULL,
                        entity_id TEXT NOT NULL,
                        tag_id TEXT NOT NULL,
                        PRIMARY KEY(entity_type, entity_id, tag_id),
                        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
                    );

                    CREATE TABLE IF NOT EXISTS relationships (
                        id TEXT PRIMARY KEY,
                        from_entity_type TEXT NOT NULL,
                        from_entity_id TEXT NOT NULL,
                        to_entity_type TEXT NOT NULL,
                        to_entity_id TEXT NOT NULL,
                        relation_type TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS user_profile (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        profile_picture TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                    ",
                )
                .map_err(|error| error.to_string())?;

            add_column_if_missing(
                &self.connection,
                "tasks",
                "is_completed",
                "INTEGER NOT NULL DEFAULT 0",
            )?;
            add_column_if_missing(
                &self.connection,
                "tasks",
                "schedule_bucket",
                "TEXT NOT NULL DEFAULT 'none'",
            )?;
            add_column_if_missing(&self.connection, "tasks", "priority", "INTEGER")?;
            add_column_if_missing(&self.connection, "tasks", "due_at", "TEXT")?;
            add_column_if_missing(&self.connection, "tasks", "completed_at", "TEXT")?;
            add_column_if_missing(&self.connection, "tasks", "estimate_minutes", "INTEGER")?;
            add_column_if_missing(&self.connection, "tasks", "project_id", "TEXT")?;
            add_column_if_missing(&self.connection, "tasks", "project_lane_id", "TEXT")?;
            add_column_if_missing(&self.connection, "tasks", "source_capture_id", "TEXT")?;
            migrate_legacy_task_status_column(&self.connection)?;
            add_column_if_missing(&self.connection, "goals", "scope_tag", "TEXT")
        }
    }
}

fn add_column_if_missing(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    column_definition: &str,
) -> Result<(), String> {
    let columns = table_columns(connection, table_name)?;

    if columns.iter().any(|column| column == column_name) {
        return Ok(());
    }

    connection
        .execute(
            &format!(
                "ALTER TABLE {} ADD COLUMN {} {}",
                table_name, column_name, column_definition
            ),
            [],
        )
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn table_columns(connection: &Connection, table_name: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({})", table_name))
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn migrate_legacy_task_status_column(connection: &Connection) -> Result<(), String> {
    let columns = table_columns(connection, "tasks")?;

    if !columns.iter().any(|column| column == "task_status") {
        return Ok(());
    }

    connection
        .execute_batch(
            "
            PRAGMA foreign_keys = OFF;

            CREATE TABLE tasks_migrated (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                lifecycle_status TEXT NOT NULL,
                is_completed INTEGER NOT NULL,
                schedule_bucket TEXT NOT NULL,
                priority INTEGER,
                due_at TEXT,
                completed_at TEXT,
                estimate_minutes INTEGER,
                project_id TEXT,
                project_lane_id TEXT,
                source_capture_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY(source_capture_id) REFERENCES captures(id) ON DELETE SET NULL
            );

            INSERT INTO tasks_migrated (
                id, title, description, lifecycle_status, is_completed, schedule_bucket,
                priority, due_at, completed_at, estimate_minutes, project_id, project_lane_id, source_capture_id,
                created_at, updated_at
            )
            SELECT
                id,
                title,
                description,
                lifecycle_status,
                is_completed,
                schedule_bucket,
                priority,
                due_at,
                completed_at,
                estimate_minutes,
                project_id,
                NULL,
                source_capture_id,
                created_at,
                updated_at
            FROM tasks;

            DROP TABLE tasks;
            ALTER TABLE tasks_migrated RENAME TO tasks;

            PRAGMA foreign_keys = ON;
            ",
        )
        .map_err(|error| error.to_string())
}

fn decode_enum<T>(value: String) -> Result<T, String>
where
    T: serde::de::DeserializeOwned,
{
    serde_json::from_str(&format!("\"{}\"", value)).map_err(|error| error.to_string())
}

fn encode_enum<T>(value: &T) -> Result<String, String>
where
    T: serde::Serialize,
{
    serde_json::to_string(value)
        .map_err(|error| error.to_string())
        .map(|encoded| encoded.trim_matches('"').to_string())
}

fn option_string(row: &Row<'_>, index: usize) -> rusqlite::Result<Option<String>> {
    row.get(index)
}

fn preview(value: Option<String>) -> String {
    value.unwrap_or_default().chars().take(84).collect()
}

pub mod capture_repository {
    use super::database::Database;
    use super::models::{Capture, CaptureLifecycleStatus, CaptureTriageStatus};
    use super::{decode_enum, encode_enum, option_string, params, to_sql_error, OptionalExtension};

    pub struct CaptureRepository<'a> {
        db: &'a Database,
    }

    impl<'a> CaptureRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn create(&self, capture: Capture) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO captures (
                        id, text, lifecycle_status, triage_status, project_id, created_at, updated_at, processed_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                    ",
                    params![
                        capture.id,
                        capture.text,
                        encode_enum(&capture.lifecycle_status)?,
                        encode_enum(&capture.triage_status)?,
                        capture.project_id,
                        capture.created_at,
                        capture.updated_at,
                        capture.processed_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn update(&self, capture: Capture) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    UPDATE captures
                    SET text = ?2,
                        lifecycle_status = ?3,
                        triage_status = ?4,
                        project_id = ?5,
                        created_at = ?6,
                        updated_at = ?7,
                        processed_at = ?8
                    WHERE id = ?1
                    ",
                    params![
                        capture.id,
                        capture.text,
                        encode_enum(&capture.lifecycle_status)?,
                        encode_enum(&capture.triage_status)?,
                        capture.project_id,
                        capture.created_at,
                        capture.updated_at,
                        capture.processed_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn get(&self, id: &str) -> Result<Option<Capture>, String> {
            self.db
                .connection()
                .query_row(
                    "
                    SELECT id, text, lifecycle_status, triage_status, project_id, created_at, updated_at, processed_at
                    FROM captures
                    WHERE id = ?1
                    ",
                    params![id],
                    |row| {
                        Ok(Capture {
                            id: row.get(0)?,
                            text: row.get(1)?,
                            lifecycle_status: decode_enum::<CaptureLifecycleStatus>(row.get(2)?)
                                .map_err(to_sql_error)?,
                            triage_status: decode_enum::<CaptureTriageStatus>(row.get(3)?)
                                .map_err(to_sql_error)?,
                            project_id: option_string(row, 4)?,
                            created_at: row.get(5)?,
                            updated_at: row.get(6)?,
                            processed_at: option_string(row, 7)?,
                        })
                    },
                )
                .optional()
                .map_err(|error| error.to_string())
        }

        pub fn list(&self) -> Result<Vec<Capture>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, text, lifecycle_status, triage_status, project_id, created_at, updated_at, processed_at
                    FROM captures
                    ORDER BY created_at DESC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map([], |row| {
                    Ok(Capture {
                        id: row.get(0)?,
                        text: row.get(1)?,
                        lifecycle_status: decode_enum::<CaptureLifecycleStatus>(row.get(2)?)
                            .map_err(to_sql_error)?,
                        triage_status: decode_enum::<CaptureTriageStatus>(row.get(3)?)
                            .map_err(to_sql_error)?,
                        project_id: option_string(row, 4)?,
                        created_at: row.get(5)?,
                        updated_at: row.get(6)?,
                        processed_at: option_string(row, 7)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }

        pub fn replace_all(&self, captures: Vec<Capture>) -> Result<(), String> {
            self.db
                .connection()
                .execute("DELETE FROM captures", [])
                .map_err(|error| error.to_string())?;

            for capture in captures {
                self.create(capture)?;
            }

            Ok(())
        }
    }
}

pub mod project_repository {
    use super::database::Database;
    use super::models::{Project, ProjectBoardLane, ProjectStatus};
    use super::{decode_enum, encode_enum, option_string, params, to_sql_error};

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
            let board_lanes = if project.board_lanes.is_empty() {
                default_project_board_lanes(&project.id)
            } else {
                project.board_lanes.clone()
            };

            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO projects (id, name, description, status, created_at, updated_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                    ",
                    params![
                        project.id,
                        project.name,
                        project.description,
                        encode_enum(&project.status)?,
                        project.created_at,
                        project.updated_at
                    ],
                )
                .map_err(|error| error.to_string())?;

            self.replace_board_lanes(&project.id, &board_lanes)
        }

        pub fn update(&self, project: Project) -> Result<(), String> {
            let board_lanes = if project.board_lanes.is_empty() {
                default_project_board_lanes(&project.id)
            } else {
                project.board_lanes.clone()
            };

            self.db
                .connection()
                .execute(
                    "
                    UPDATE projects
                    SET name = ?2, description = ?3, status = ?4, created_at = ?5, updated_at = ?6
                    WHERE id = ?1
                    ",
                    params![
                        project.id,
                        project.name,
                        project.description,
                        encode_enum(&project.status)?,
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
                    SELECT id, name, description, status, created_at, updated_at
                    FROM projects
                    ORDER BY created_at DESC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map([], |row| {
                    Ok(Project {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        description: option_string(row, 2)?,
                        status: decode_enum::<ProjectStatus>(row.get(3)?).map_err(to_sql_error)?,
                        board_lanes: Vec::new(),
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            let mut projects = rows
                .collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())?;

            for project in &mut projects {
                let lanes = self.list_board_lanes(&project.id)?;
                project.board_lanes = if lanes.is_empty() {
                    default_project_board_lanes(&project.id)
                } else {
                    lanes
                };
            }

            Ok(projects)
        }

        pub fn delete(&self, id: &str) -> Result<(), String> {
            self.db
                .connection()
                .execute("DELETE FROM projects WHERE id = ?1", params![id])
                .map(|_| ())
                .map_err(|error| error.to_string())
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

        fn replace_board_lanes(
            &self,
            project_id: &str,
            board_lanes: &[ProjectBoardLane],
        ) -> Result<(), String> {
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
}

pub mod task_repository {
    use super::database::Database;
    use super::models::{Task, TaskLifecycleStatus, TaskQuery, TaskScheduleBucket};
    use super::{decode_enum, encode_enum, option_string, params, to_sql_error, OptionalExtension};

    pub struct TaskRepository<'a> {
        db: &'a Database,
    }

    impl<'a> TaskRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn create(&self, task: Task) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO tasks (
                        id, title, description, lifecycle_status, is_completed, schedule_bucket,
                        priority, due_at, completed_at, estimate_minutes, project_id, project_lane_id,
                        source_capture_id, created_at, updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
                    ",
                    params![
                        task.id,
                        task.title,
                        task.description,
                        encode_enum(&task.lifecycle_status)?,
                        task.is_completed,
                        encode_enum(&task.schedule_bucket)?,
                        task.priority,
                        task.due_at,
                        task.completed_at,
                        task.estimate_minutes,
                        task.project_id,
                        task.project_lane_id,
                        task.source_capture_id,
                        task.created_at,
                        task.updated_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn update(&self, task: Task) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    UPDATE tasks
                    SET title = ?2,
                        description = ?3,
                        lifecycle_status = ?4,
                        is_completed = ?5,
                        schedule_bucket = ?6,
                        priority = ?7,
                        due_at = ?8,
                        completed_at = ?9,
                        estimate_minutes = ?10,
                        project_id = ?11,
                        project_lane_id = ?12,
                        source_capture_id = ?13,
                        created_at = ?14,
                        updated_at = ?15
                    WHERE id = ?1
                    ",
                    params![
                        task.id,
                        task.title,
                        task.description,
                        encode_enum(&task.lifecycle_status)?,
                        task.is_completed,
                        encode_enum(&task.schedule_bucket)?,
                        task.priority,
                        task.due_at,
                        task.completed_at,
                        task.estimate_minutes,
                        task.project_id,
                        task.project_lane_id,
                        task.source_capture_id,
                        task.created_at,
                        task.updated_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn get(&self, id: &str) -> Result<Option<Task>, String> {
            self.db
                .connection()
                .query_row(
                    "
                    SELECT id, title, description, lifecycle_status, is_completed, schedule_bucket, priority,
                           due_at, completed_at, estimate_minutes, project_id, project_lane_id, source_capture_id, created_at, updated_at
                    FROM tasks
                    WHERE id = ?1
                    ",
                    params![id],
                    |row| map_task(row),
                )
                .optional()
                .map_err(|error| error.to_string())
        }

        pub fn list(&self, query: TaskQuery) -> Result<Vec<Task>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, title, description, lifecycle_status, is_completed, schedule_bucket, priority,
                           due_at, completed_at, estimate_minutes, project_id, project_lane_id, source_capture_id, created_at, updated_at
                    FROM tasks
                    WHERE (?1 IS NULL OR lifecycle_status = ?1)
                      AND (?2 IS NULL OR is_completed = ?2)
                      AND (?3 IS NULL OR schedule_bucket = ?3)
                      AND (?4 IS NULL OR project_id = ?4)
                    ORDER BY created_at DESC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let lifecycle_status = query
                .lifecycle_status
                .as_ref()
                .map(encode_enum)
                .transpose()?;
            let schedule_bucket = query
                .schedule_bucket
                .as_ref()
                .map(encode_enum)
                .transpose()?;

            let rows = statement
                .query_map(
                    params![
                        lifecycle_status,
                        query.is_completed,
                        schedule_bucket,
                        query.project_id
                    ],
                    map_task,
                )
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }

        pub fn replace_all(&self, tasks: Vec<Task>) -> Result<(), String> {
            self.db
                .connection()
                .execute("DELETE FROM tasks", [])
                .map_err(|error| error.to_string())?;

            for task in tasks {
                self.create(task)?;
            }

            Ok(())
        }
    }

    fn map_task(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: option_string(row, 2)?,
            lifecycle_status: decode_enum::<TaskLifecycleStatus>(row.get(3)?).map_err(to_sql_error)?,
            is_completed: row.get(4)?,
            schedule_bucket: decode_enum::<TaskScheduleBucket>(row.get(5)?).map_err(to_sql_error)?,
            priority: row.get(6)?,
            due_at: option_string(row, 7)?,
            completed_at: option_string(row, 8)?,
            estimate_minutes: row.get(9)?,
            project_id: option_string(row, 10)?,
            project_lane_id: option_string(row, 11)?,
            source_capture_id: option_string(row, 12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }
}

pub mod goal_repository {
    use super::database::Database;
    use super::models::{Goal, GoalProgressEntry, GoalStatus, GoalTrackingMode, GoalType};
    use super::{decode_enum, encode_enum, option_string, params, to_sql_error, OptionalExtension};

    pub struct GoalRepository<'a> {
        db: &'a Database,
    }

    impl<'a> GoalRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn create(&self, goal: Goal) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO goals (
                        id, title, description, goal_type, status, tracking_mode, metric, target_value, current_value,
                        period_unit, period_start, period_end, starts_at, ends_at, scope_project_id, scope_tag, source_query,
                        created_at, updated_at, archived_at, completed_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
                    ",
                    params![
                        goal.id,
                        goal.title,
                        goal.description,
                        encode_enum(&goal.goal_type)?,
                        encode_enum(&goal.status)?,
                        encode_enum(&goal.tracking_mode)?,
                        goal.metric,
                        goal.target_value,
                        goal.current_value,
                        goal.period_unit,
                        goal.period_start,
                        goal.period_end,
                        goal.starts_at,
                        goal.ends_at,
                        goal.scope_project_id,
                        goal.scope_tag,
                        goal.source_query,
                        goal.created_at,
                        goal.updated_at,
                        goal.archived_at,
                        goal.completed_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn update(&self, goal: Goal) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    UPDATE goals
                    SET title = ?2, description = ?3, goal_type = ?4, status = ?5, tracking_mode = ?6,
                        metric = ?7, target_value = ?8, current_value = ?9, period_unit = ?10, period_start = ?11,
                        period_end = ?12, starts_at = ?13, ends_at = ?14, scope_project_id = ?15, scope_tag = ?16, source_query = ?17,
                        created_at = ?18, updated_at = ?19, archived_at = ?20, completed_at = ?21
                    WHERE id = ?1
                    ",
                    params![
                        goal.id,
                        goal.title,
                        goal.description,
                        encode_enum(&goal.goal_type)?,
                        encode_enum(&goal.status)?,
                        encode_enum(&goal.tracking_mode)?,
                        goal.metric,
                        goal.target_value,
                        goal.current_value,
                        goal.period_unit,
                        goal.period_start,
                        goal.period_end,
                        goal.starts_at,
                        goal.ends_at,
                        goal.scope_project_id,
                        goal.scope_tag,
                        goal.source_query,
                        goal.created_at,
                        goal.updated_at,
                        goal.archived_at,
                        goal.completed_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn get(&self, id: &str) -> Result<Option<Goal>, String> {
            self.db
                .connection()
                .query_row(
                    "
                    SELECT id, title, description, goal_type, status, tracking_mode, metric, target_value, current_value,
                           period_unit, period_start, period_end, starts_at, ends_at, scope_project_id, scope_tag, source_query,
                           created_at, updated_at, archived_at, completed_at
                    FROM goals
                    WHERE id = ?1
                    ",
                    params![id],
                    map_goal,
                )
                .optional()
                .map_err(|error| error.to_string())
        }

        pub fn list(&self) -> Result<Vec<Goal>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, title, description, goal_type, status, tracking_mode, metric, target_value, current_value,
                           period_unit, period_start, period_end, starts_at, ends_at, scope_project_id, scope_tag, source_query,
                           created_at, updated_at, archived_at, completed_at
                    FROM goals
                    ORDER BY created_at DESC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map([], map_goal)
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }

        pub fn log_progress(&self, entry: GoalProgressEntry) -> Result<(), String> {
            let transaction = self
                .db
                .connection()
                .unchecked_transaction()
                .map_err(|error| error.to_string())?;

            transaction
                .execute(
                    "
                    INSERT INTO goal_progress_entries (
                        id, goal_id, date, value, source_type, source_entity_type, source_entity_id, created_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                    ",
                    params![
                        entry.id,
                        entry.goal_id,
                        entry.date,
                        entry.value,
                        entry.source_type,
                        entry.source_entity_type,
                        entry.source_entity_id,
                        entry.created_at
                    ],
                )
                .map_err(|error| error.to_string())?;

            transaction
                .execute(
                    "UPDATE goals SET current_value = ?2 WHERE id = ?1",
                    params![entry.goal_id, entry.value],
                )
                .map_err(|error| error.to_string())?;

            transaction.commit().map_err(|error| error.to_string())
        }

        pub fn list_progress_entries(&self, goal_id: &str) -> Result<Vec<GoalProgressEntry>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, goal_id, date, value, source_type, source_entity_type, source_entity_id, created_at
                    FROM goal_progress_entries
                    WHERE goal_id = ?1
                    ORDER BY date ASC, created_at ASC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map(params![goal_id], |row| {
                    Ok(GoalProgressEntry {
                        id: row.get(0)?,
                        goal_id: row.get(1)?,
                        date: row.get(2)?,
                        value: row.get(3)?,
                        source_type: option_string(row, 4)?,
                        source_entity_type: option_string(row, 5)?,
                        source_entity_id: option_string(row, 6)?,
                        created_at: row.get(7)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }

        pub fn replace_all(&self, goals: Vec<Goal>) -> Result<(), String> {
            self.db
                .connection()
                .execute("DELETE FROM goal_progress_entries", [])
                .map_err(|error| error.to_string())?;
            self.db
                .connection()
                .execute("DELETE FROM goals", [])
                .map_err(|error| error.to_string())?;

            for goal in goals {
                self.create(goal)?;
            }

            Ok(())
        }
    }

    fn map_goal(row: &rusqlite::Row<'_>) -> rusqlite::Result<Goal> {
        Ok(Goal {
            id: row.get(0)?,
            title: row.get(1)?,
            description: option_string(row, 2)?,
            goal_type: decode_enum::<GoalType>(row.get(3)?).map_err(to_sql_error)?,
            status: decode_enum::<GoalStatus>(row.get(4)?).map_err(to_sql_error)?,
            tracking_mode: decode_enum::<GoalTrackingMode>(row.get(5)?).map_err(to_sql_error)?,
            metric: option_string(row, 6)?,
            target_value: row.get(7)?,
            current_value: row.get(8)?,
            period_unit: option_string(row, 9)?,
            period_start: option_string(row, 10)?,
            period_end: option_string(row, 11)?,
            starts_at: option_string(row, 12)?,
            ends_at: option_string(row, 13)?,
            scope_project_id: option_string(row, 14)?,
            scope_tag: option_string(row, 15)?,
            source_query: option_string(row, 16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
            archived_at: option_string(row, 19)?,
            completed_at: option_string(row, 20)?,
        })
    }
}

pub mod journal_repository {
    use super::database::Database;
    use super::models::{
        JournalCommitment, JournalCommitmentStatus, JournalEntry, JournalEntrySummary,
    };
    use super::{
        decode_enum, encode_enum, option_string, params, preview, to_sql_error, OptionalExtension,
    };

    pub struct JournalRepository<'a> {
        db: &'a Database,
    }

    impl<'a> JournalRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn upsert_entry(&self, entry: JournalEntry) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO journal_entries (
                        id, entry_date, title, content_markdown, morning_intention, reflection_prompt, created_at, updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                    ON CONFLICT(id) DO UPDATE SET
                        entry_date = excluded.entry_date,
                        title = excluded.title,
                        content_markdown = excluded.content_markdown,
                        morning_intention = excluded.morning_intention,
                        reflection_prompt = excluded.reflection_prompt,
                        created_at = excluded.created_at,
                        updated_at = excluded.updated_at
                    ",
                    params![
                        entry.id,
                        entry.entry_date,
                        entry.title,
                        entry.content_markdown,
                        entry.morning_intention,
                        entry.reflection_prompt,
                        entry.created_at,
                        entry.updated_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn get_entry(&self, entry_date: &str) -> Result<Option<JournalEntry>, String> {
            self.db
                .connection()
                .query_row(
                    "
                    SELECT id, entry_date, title, content_markdown, morning_intention, reflection_prompt, created_at, updated_at
                    FROM journal_entries
                    WHERE entry_date = ?1
                    ",
                    params![entry_date],
                    |row| {
                        Ok(JournalEntry {
                            id: row.get(0)?,
                            entry_date: row.get(1)?,
                            title: option_string(row, 2)?,
                            content_markdown: option_string(row, 3)?,
                            morning_intention: option_string(row, 4)?,
                            reflection_prompt: option_string(row, 5)?,
                            created_at: row.get(6)?,
                            updated_at: row.get(7)?,
                        })
                    },
                )
                .optional()
                .map_err(|error| error.to_string())
        }

        pub fn list_entries(&self) -> Result<Vec<JournalEntrySummary>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT entry_date, title, content_markdown, reflection_prompt, morning_intention
                    FROM journal_entries
                    ORDER BY entry_date DESC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map([], |row| {
                    let content_markdown: Option<String> = option_string(row, 2)?;
                    let reflection_prompt: Option<String> = option_string(row, 3)?;
                    let morning_intention: Option<String> = option_string(row, 4)?;
                    Ok(JournalEntrySummary {
                        entry_date: row.get(0)?,
                        title: option_string(row, 1)?,
                        preview: preview(content_markdown.or(reflection_prompt).or(morning_intention)),
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }

        pub fn replace_commitments(
            &self,
            journal_entry_id: &str,
            commitments: Vec<JournalCommitment>,
        ) -> Result<(), String> {
            let transaction = self
                .db
                .connection()
                .unchecked_transaction()
                .map_err(|error| error.to_string())?;

            transaction
                .execute(
                    "DELETE FROM journal_commitments WHERE journal_entry_id = ?1",
                    params![journal_entry_id],
                )
                .map_err(|error| error.to_string())?;

            for commitment in commitments {
                transaction
                    .execute(
                        "
                        INSERT INTO journal_commitments (id, journal_entry_id, text, status, sort_order)
                        VALUES (?1, ?2, ?3, ?4, ?5)
                        ",
                        params![
                            commitment.id,
                            commitment.journal_entry_id,
                            commitment.text,
                            encode_enum(&commitment.status)?,
                            commitment.sort_order
                        ],
                    )
                    .map_err(|error| error.to_string())?;
            }

            transaction.commit().map_err(|error| error.to_string())
        }

        pub fn list_commitments(&self, journal_entry_id: &str) -> Result<Vec<JournalCommitment>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, journal_entry_id, text, status, sort_order
                    FROM journal_commitments
                    WHERE journal_entry_id = ?1
                    ORDER BY sort_order ASC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map(params![journal_entry_id], |row| {
                    Ok(JournalCommitment {
                        id: row.get(0)?,
                        journal_entry_id: row.get(1)?,
                        text: row.get(2)?,
                        status: decode_enum::<JournalCommitmentStatus>(row.get(3)?)
                            .map_err(to_sql_error)?,
                        sort_order: row.get(4)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }
    }
}

pub mod tag_repository {
    use super::database::Database;
    use super::models::{EntityTag, Tag};
    use super::{option_string, params};

    pub struct TagRepository<'a> {
        db: &'a Database,
    }

    impl<'a> TagRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn create(&self, tag: Tag) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                    params![tag.id, tag.name, tag.color, tag.created_at],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn attach(&self, entity_tag: EntityTag) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?1, ?2, ?3)",
                    params![entity_tag.entity_type, entity_tag.entity_id, entity_tag.tag_id],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn list_for_entity(&self, entity_type: &str, entity_id: &str) -> Result<Vec<Tag>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT tags.id, tags.name, tags.color, tags.created_at
                    FROM entity_tags
                    INNER JOIN tags ON tags.id = entity_tags.tag_id
                    WHERE entity_tags.entity_type = ?1 AND entity_tags.entity_id = ?2
                    ORDER BY tags.name ASC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map(params![entity_type, entity_id], |row| {
                    Ok(Tag {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: option_string(row, 2)?,
                        created_at: row.get(3)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }
    }
}

pub mod relationship_repository {
    use super::database::Database;
    use super::models::Relationship;
    use super::{params};

    pub struct RelationshipRepository<'a> {
        db: &'a Database,
    }

    impl<'a> RelationshipRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn create(&self, relationship: Relationship) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO relationships (
                        id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type, created_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    ",
                    params![
                        relationship.id,
                        relationship.from_entity_type,
                        relationship.from_entity_id,
                        relationship.to_entity_type,
                        relationship.to_entity_id,
                        relationship.relation_type,
                        relationship.created_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn list_for_entity(
            &self,
            entity_type: &str,
            entity_id: &str,
        ) -> Result<Vec<Relationship>, String> {
            let mut statement = self
                .db
                .connection()
                .prepare(
                    "
                    SELECT id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type, created_at
                    FROM relationships
                    WHERE (from_entity_type = ?1 AND from_entity_id = ?2)
                       OR (to_entity_type = ?1 AND to_entity_id = ?2)
                    ORDER BY created_at ASC
                    ",
                )
                .map_err(|error| error.to_string())?;

            let rows = statement
                .query_map(params![entity_type, entity_id], |row| {
                    Ok(Relationship {
                        id: row.get(0)?,
                        from_entity_type: row.get(1)?,
                        from_entity_id: row.get(2)?,
                        to_entity_type: row.get(3)?,
                        to_entity_id: row.get(4)?,
                        relation_type: row.get(5)?,
                        created_at: row.get(6)?,
                    })
                })
                .map_err(|error| error.to_string())?;

            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())
        }
    }
}

pub mod user_profile_repository {
    use super::database::Database;
    use super::models::UserProfile;
    use super::{option_string, params, OptionalExtension};

    pub struct UserProfileRepository<'a> {
        db: &'a Database,
    }

    impl<'a> UserProfileRepository<'a> {
        pub fn new(db: &'a Database) -> Self {
            Self { db }
        }

        pub fn upsert(&self, profile: UserProfile) -> Result<(), String> {
            self.db
                .connection()
                .execute(
                    "
                    INSERT INTO user_profile (id, name, profile_picture, created_at, updated_at)
                    VALUES (?1, ?2, ?3, ?4, ?5)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        profile_picture = excluded.profile_picture,
                        created_at = excluded.created_at,
                        updated_at = excluded.updated_at
                    ",
                    params![
                        profile.id,
                        profile.name,
                        profile.profile_picture,
                        profile.created_at,
                        profile.updated_at
                    ],
                )
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        pub fn get(&self) -> Result<Option<UserProfile>, String> {
            self.db
                .connection()
                .query_row(
                    "
                    SELECT id, name, profile_picture, created_at, updated_at
                    FROM user_profile
                    LIMIT 1
                    ",
                    [],
                    |row| {
                        Ok(UserProfile {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            profile_picture: option_string(row, 2)?,
                            created_at: row.get(3)?,
                            updated_at: row.get(4)?,
                        })
                    },
                )
                .optional()
                .map_err(|error| error.to_string())
        }
    }
}

fn to_sql_error(message: String) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        0,
        rusqlite::types::Type::Text,
        Box::<dyn std::error::Error + Send + Sync>::from(message),
    )
}
