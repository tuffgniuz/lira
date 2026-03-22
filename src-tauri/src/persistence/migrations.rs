use rusqlite::Connection;

pub fn run_migrations(connection: &Connection) -> Result<(), String> {
    connection
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
                has_kanban_board INTEGER NOT NULL DEFAULT 1,
                task_template_json TEXT,
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
                custom_field_values_json TEXT NOT NULL DEFAULT '{}',
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

            CREATE TABLE IF NOT EXISTS goal_schedule_days (
                goal_id TEXT NOT NULL,
                weekday TEXT NOT NULL,
                PRIMARY KEY(goal_id, weekday),
                FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS goal_milestones (
                id TEXT PRIMARY KEY,
                goal_id TEXT NOT NULL,
                title TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                is_completed INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
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

    add_column_if_missing(connection, "tasks", "is_completed", "INTEGER NOT NULL DEFAULT 0")?;
    add_column_if_missing(
        connection,
        "tasks",
        "schedule_bucket",
        "TEXT NOT NULL DEFAULT 'none'",
    )?;
    add_column_if_missing(connection, "tasks", "priority", "INTEGER")?;
    add_column_if_missing(connection, "tasks", "due_at", "TEXT")?;
    add_column_if_missing(connection, "tasks", "completed_at", "TEXT")?;
    add_column_if_missing(connection, "tasks", "estimate_minutes", "INTEGER")?;
    add_column_if_missing(connection, "tasks", "project_id", "TEXT")?;
    add_column_if_missing(connection, "tasks", "project_lane_id", "TEXT")?;
    add_column_if_missing(connection, "tasks", "source_capture_id", "TEXT")?;
    add_column_if_missing(
        connection,
        "tasks",
        "custom_field_values_json",
        "TEXT NOT NULL DEFAULT '{}'",
    )?;
    migrate_legacy_task_status_column(connection)?;
    add_column_if_missing(connection, "goals", "scope_tag", "TEXT")?;
    add_column_if_missing(
        connection,
        "projects",
        "has_kanban_board",
        "INTEGER NOT NULL DEFAULT 1",
    )?;
    add_column_if_missing(connection, "projects", "task_template_json", "TEXT")
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
                custom_field_values_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL,
                FOREIGN KEY(source_capture_id) REFERENCES captures(id) ON DELETE SET NULL
            );

            INSERT INTO tasks_migrated (
                id, title, description, lifecycle_status, is_completed, schedule_bucket,
                priority, due_at, completed_at, estimate_minutes, project_id, project_lane_id, source_capture_id,
                custom_field_values_json, created_at, updated_at
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
                '{}',
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
