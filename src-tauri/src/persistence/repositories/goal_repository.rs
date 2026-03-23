use crate::persistence::database::Database;
use crate::persistence::models::{
    Goal, GoalMilestone, GoalProgressEntry, GoalStatus, GoalTrackingMode, GoalType,
};
use crate::persistence::support::{
    decode_enum, encode_enum, option_string, run_in_transaction, to_sql_error,
};
use rusqlite::{params, Connection};

#[cfg(test)]
use rusqlite::OptionalExtension;

pub struct GoalRepository<'a> {
    db: &'a Database,
}

impl<'a> GoalRepository<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    pub fn create(&self, goal: Goal) -> Result<(), String> {
        let connection = self.db.connection();

        run_in_transaction(connection, || {
            insert_goal(connection, &goal)?;
            replace_schedule_days(connection, &goal.id, &goal.schedule_days)?;
            replace_milestones(connection, &goal.id, &goal.milestones)?;
            Ok(())
        })
    }

    pub fn update(&self, goal: Goal) -> Result<(), String> {
        let connection = self.db.connection();

        run_in_transaction(connection, || {
            update_goal(connection, &goal)?;
            replace_schedule_days(connection, &goal.id, &goal.schedule_days)?;
            replace_milestones(connection, &goal.id, &goal.milestones)?;
            Ok(())
        })
    }

    #[cfg(test)]
    pub fn get(&self, id: &str) -> Result<Option<Goal>, String> {
        let connection = self.db.connection();
        let mut goal = connection
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
            .map_err(|error| error.to_string())?;

        if let Some(goal) = goal.as_mut() {
          hydrate_goal(connection, goal)?;
        }

        Ok(goal)
    }

    pub fn list(&self) -> Result<Vec<Goal>, String> {
        let connection = self.db.connection();
        let mut statement = connection
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

        let mut goals = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;

        for goal in &mut goals {
            hydrate_goal(connection, goal)?;
        }

        Ok(goals)
    }

    pub fn log_progress(&self, entry: GoalProgressEntry) -> Result<(), String> {
        let connection = self.db.connection();

        run_in_transaction(connection, || {
            connection
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

            connection
                .execute(
                    "UPDATE goals SET current_value = ?2 WHERE id = ?1",
                    params![entry.goal_id, entry.value],
                )
                .map_err(|error| error.to_string())?;

            Ok(())
        })
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
        let connection = self.db.connection();
        connection
            .execute("DELETE FROM goal_progress_entries", [])
            .map_err(|error| error.to_string())?;
        connection
            .execute("DELETE FROM goals", [])
            .map_err(|error| error.to_string())?;

        for goal in &goals {
            insert_goal(connection, goal)?;
            replace_schedule_days(connection, &goal.id, &goal.schedule_days)?;
            replace_milestones(connection, &goal.id, &goal.milestones)?;
        }

        Ok(())
    }
}

fn insert_goal(connection: &Connection, goal: &Goal) -> Result<(), String> {
    connection
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

fn update_goal(connection: &Connection, goal: &Goal) -> Result<(), String> {
    connection
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

fn replace_schedule_days(
    connection: &Connection,
    goal_id: &str,
    schedule_days: &[String],
) -> Result<(), String> {
    connection
        .execute("DELETE FROM goal_schedule_days WHERE goal_id = ?1", params![goal_id])
        .map_err(|error| error.to_string())?;

    for day in schedule_days {
        connection
            .execute(
                "INSERT INTO goal_schedule_days (goal_id, weekday) VALUES (?1, ?2)",
                params![goal_id, day],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn replace_milestones(
    connection: &Connection,
    goal_id: &str,
    milestones: &[GoalMilestone],
) -> Result<(), String> {
    connection
        .execute("DELETE FROM goal_milestones WHERE goal_id = ?1", params![goal_id])
        .map_err(|error| error.to_string())?;

    for milestone in milestones {
        connection
            .execute(
                "
                INSERT INTO goal_milestones (
                    id, goal_id, title, sort_order, is_completed, completed_at, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                ",
                params![
                    milestone.id,
                    goal_id,
                    milestone.title,
                    milestone.sort_order,
                    milestone.is_completed,
                    milestone.completed_at,
                    milestone.created_at,
                    milestone.updated_at
                ],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn hydrate_goal(connection: &rusqlite::Connection, goal: &mut Goal) -> Result<(), String> {
    goal.schedule_days = load_schedule_days(connection, &goal.id)?;
    goal.milestones = load_milestones(connection, &goal.id)?;
    Ok(())
}

fn load_schedule_days(connection: &rusqlite::Connection, goal_id: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT weekday
            FROM goal_schedule_days
            WHERE goal_id = ?1
            ",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![goal_id], |row| row.get::<_, String>(0))
        .map_err(|error| error.to_string())?;

    let mut schedule_days = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    schedule_days.sort_by_key(|weekday| weekday_order(weekday));

    Ok(schedule_days)
}

fn load_milestones(connection: &rusqlite::Connection, goal_id: &str) -> Result<Vec<GoalMilestone>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, sort_order, is_completed, completed_at, created_at, updated_at
            FROM goal_milestones
            WHERE goal_id = ?1
            ORDER BY sort_order ASC, created_at ASC
            ",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map(params![goal_id], |row| {
            Ok(GoalMilestone {
                id: row.get(0)?,
                title: row.get(1)?,
                sort_order: row.get(2)?,
                is_completed: row.get(3)?,
                completed_at: option_string(row, 4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
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
        schedule_days: Vec::new(),
        milestones: Vec::new(),
        created_at: row.get(17)?,
        updated_at: row.get(18)?,
        archived_at: option_string(row, 19)?,
        completed_at: option_string(row, 20)?,
    })
}

fn weekday_order(weekday: &str) -> usize {
    match weekday {
        "monday" => 0,
        "tuesday" => 1,
        "wednesday" => 2,
        "thursday" => 3,
        "friday" => 4,
        "saturday" => 5,
        "sunday" => 6,
        _ => usize::MAX,
    }
}
