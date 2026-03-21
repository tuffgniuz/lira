mod persistence;

use persistence::capture_repository::CaptureRepository;
use persistence::database::Database;
use persistence::goal_repository::GoalRepository;
use persistence::journal_repository::JournalRepository;
use persistence::models::{
    Capture, CaptureLifecycleStatus, CaptureTriageStatus, EntityTag, Goal, GoalProgressEntry,
    GoalStatus, GoalTrackingMode, GoalType, JournalCommitment, JournalCommitmentStatus,
    JournalEntry, JournalEntrySummary, Project, ProjectBoardLane, ProjectStatus, Relationship,
    Tag, Task, TaskLifecycleStatus, TaskQuery, TaskScheduleBucket, UserProfile,
};
use persistence::project_repository::ProjectRepository;
use persistence::relationship_repository::RelationshipRepository;
use persistence::tag_repository::TagRepository;
use persistence::task_repository::TaskRepository;
use persistence::user_profile_repository::UserProfileRepository;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceItemDto {
    id: String,
    kind: String,
    state: String,
    source_type: String,
    title: String,
    content: String,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    project_id: Option<String>,
    #[serde(default)]
    project_lane_id: Option<String>,
    #[serde(default)]
    project: String,
    #[serde(default)]
    is_completed: bool,
    #[serde(default)]
    priority: String,
    #[serde(default)]
    due_date: String,
    #[serde(default)]
    completed_at: String,
    #[serde(default)]
    estimate: String,
    #[serde(default)]
    schedule_bucket: Option<String>,
    #[serde(default)]
    source_capture_id: Option<String>,
    #[serde(default)]
    goal_metric: Option<String>,
    #[serde(default = "default_goal_target")]
    goal_target: i64,
    #[serde(default)]
    goal_progress: i64,
    #[serde(default)]
    goal_progress_by_date: std::collections::HashMap<String, i64>,
    #[serde(default = "default_goal_period")]
    goal_period: String,
    #[serde(default)]
    goal_scope: Option<WorkspaceGoalScopeDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceGoalScopeDto {
    #[serde(default)]
    project_id: Option<String>,
    #[serde(default)]
    tag: Option<String>,
    #[serde(default)]
    task_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalEntryDto {
    id: String,
    date: String,
    morning_intention: String,
    diary_entry: String,
    reflection_entry: String,
    focuses: Vec<String>,
    commitments: Vec<JournalCommitmentDto>,
    reflection: JournalReflectionDto,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalCommitmentDto {
    id: String,
    text: String,
    status: String,
    order: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalReflectionDto {
    went_well: String,
    didnt_go_well: String,
    learned: String,
    gratitude: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JournalEntrySummaryDto {
    date: String,
    preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserProfileDto {
    name: String,
    profile_picture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectDto {
    id: String,
    name: String,
    description: String,
    #[serde(default)]
    board_lanes: Vec<ProjectBoardLaneDto>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectBoardLaneDto {
    id: String,
    name: String,
    order: i64,
}

#[tauri::command]
fn initialize_vault(path: &str) -> Result<String, String> {
    let resolved = resolve_vault_path(path.trim())?;

    fs::create_dir_all(&resolved).map_err(|error| {
        format!(
            "Failed to create vault directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    let db_dir = resolved.join(".kenchi");
    fs::create_dir_all(&db_dir).map_err(|error| {
        format!(
            "Failed to create SQLite directory at {}: {}",
            db_dir.display(),
            error
        )
    })?;

    open_database(&resolved)?;

    resolved
        .canonicalize()
        .or(Ok::<PathBuf, std::io::Error>(resolved))
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|error| format!("Failed to resolve vault path: {}", error))
}

#[tauri::command]
fn load_workspace_items(path: &str) -> Result<Vec<WorkspaceItemDto>, String> {
    let db = open_database_from_input(path)?;
    load_workspace_items_from_db(&db)
}

#[tauri::command]
fn replace_workspace_items(path: &str, items: Vec<WorkspaceItemDto>) -> Result<(), String> {
    let db = open_database_from_input(path)?;
    replace_workspace_items_in_db(&db, items)
}

fn load_workspace_items_from_db(db: &Database) -> Result<Vec<WorkspaceItemDto>, String> {
    let capture_repository = CaptureRepository::new(&db);
    let task_repository = TaskRepository::new(&db);
    let goal_repository = GoalRepository::new(&db);
    let tag_repository = TagRepository::new(&db);
    let relationship_repository = RelationshipRepository::new(&db);

    let captures = capture_repository.list()?;
    let tasks = task_repository.list(TaskQuery::default())?;
    let goals = goal_repository.list()?;

    let mut items = Vec::with_capacity(captures.len() + tasks.len() + goals.len());

    for capture in captures {
        let mut item = workspace_item_from_capture(capture);
        item.tags = load_entity_tags(&tag_repository, "capture", &item.id)?;
        items.push(item);
    }

    for task in tasks {
        let mut item = workspace_item_from_task(task);
        item.tags = load_entity_tags(&tag_repository, "task", &item.id)?;
        items.push(item);
    }

    for goal in goals {
        let progress = goal_repository.list_progress_entries(&goal.id)?;
        let relationships = relationship_repository.list_for_entity("goal", &goal.id)?;
        let mut item = workspace_item_from_goal(goal, progress, relationships);
        item.tags = load_entity_tags(&tag_repository, "goal", &item.id)?;
        items.push(item);
    }

    items.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(items)
}

fn replace_workspace_items_in_db(db: &Database, items: Vec<WorkspaceItemDto>) -> Result<(), String> {
    let capture_repository = CaptureRepository::new(&db);
    let task_repository = TaskRepository::new(&db);
    let goal_repository = GoalRepository::new(&db);

    let captures = items
        .iter()
        .filter(|item| item.kind == "capture")
        .cloned()
        .map(capture_from_workspace_item)
        .collect::<Result<Vec<_>, _>>()?;
    let tasks = items
        .iter()
        .filter(|item| item.kind == "task")
        .cloned()
        .map(task_from_workspace_item)
        .collect::<Result<Vec<_>, _>>()?;
    let goals = items
        .iter()
        .filter(|item| item.kind == "goal")
        .cloned()
        .map(goal_from_workspace_item)
        .collect::<Result<Vec<_>, _>>()?;

    capture_repository.replace_all(captures)?;
    task_repository.replace_all(tasks)?;
    goal_repository.replace_all(goals)?;
    replace_goal_progress_entries(db, &items)?;
    replace_workspace_entity_tags(db, &items)?;
    replace_goal_task_links(db, &items)?;

    Ok(())
}

#[tauri::command]
fn list_tasks(path: &str) -> Result<Vec<Task>, String> {
    let db = open_database_from_input(path)?;
    TaskRepository::new(&db).list(TaskQuery::default())
}

#[tauri::command]
fn create_task(path: &str, task: Task) -> Result<Task, String> {
    let db = open_database_from_input(path)?;
    TaskRepository::new(&db).create(task.clone())?;
    Ok(task)
}

#[tauri::command]
fn update_task(path: &str, task: Task) -> Result<Task, String> {
    let db = open_database_from_input(path)?;
    TaskRepository::new(&db).update(task.clone())?;
    Ok(task)
}

#[tauri::command]
fn list_captures(path: &str) -> Result<Vec<Capture>, String> {
    let db = open_database_from_input(path)?;
    CaptureRepository::new(&db).list()
}

#[tauri::command]
fn create_capture(path: &str, capture: Capture) -> Result<Capture, String> {
    let db = open_database_from_input(path)?;
    CaptureRepository::new(&db).create(capture.clone())?;
    Ok(capture)
}

#[tauri::command]
fn update_capture(path: &str, capture: Capture) -> Result<Capture, String> {
    let db = open_database_from_input(path)?;
    CaptureRepository::new(&db).update(capture.clone())?;
    Ok(capture)
}

#[tauri::command]
fn process_capture(path: &str, capture_id: &str, processed_at: &str) -> Result<Capture, String> {
    let db = open_database_from_input(path)?;
    let repository = CaptureRepository::new(&db);
    let capture = repository
        .get(capture_id)?
        .ok_or_else(|| format!("Capture {} was not found.", capture_id))?;
    let updated = Capture {
        triage_status: CaptureTriageStatus::Processed,
        processed_at: Some(processed_at.to_string()),
        ..capture
    };
    repository.update(updated.clone())?;
    Ok(updated)
}

#[tauri::command]
fn list_goals(path: &str) -> Result<Vec<Goal>, String> {
    let db = open_database_from_input(path)?;
    GoalRepository::new(&db).list()
}

#[tauri::command]
fn create_goal(path: &str, goal: Goal) -> Result<Goal, String> {
    let db = open_database_from_input(path)?;
    GoalRepository::new(&db).create(goal.clone())?;
    Ok(goal)
}

#[tauri::command]
fn update_goal(path: &str, goal: Goal) -> Result<Goal, String> {
    let db = open_database_from_input(path)?;
    GoalRepository::new(&db).update(goal.clone())?;
    Ok(goal)
}

#[tauri::command]
fn log_goal_progress(path: &str, entry: GoalProgressEntry) -> Result<GoalProgressEntry, String> {
    let db = open_database_from_input(path)?;
    GoalRepository::new(&db).log_progress(entry.clone())?;
    Ok(entry)
}

#[tauri::command]
fn load_journal_entry(path: &str, date: &str) -> Result<Option<JournalEntryDto>, String> {
    let db = open_database_from_input(path)?;
    let repository = JournalRepository::new(&db);
    let entry = repository.get_entry(date)?;

    match entry {
        Some(entry) => {
            let commitments = repository.list_commitments(&entry.id)?;
            Ok(Some(journal_entry_dto_from_models(entry, commitments)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn save_journal_entry(path: &str, entry: JournalEntryDto) -> Result<(), String> {
    let db = open_database_from_input(path)?;
    let repository = JournalRepository::new(&db);
    let (journal_entry, commitments) = journal_models_from_dto(entry)?;
    repository.upsert_entry(journal_entry.clone())?;
    repository.replace_commitments(&journal_entry.id, commitments)?;
    Ok(())
}

#[tauri::command]
fn list_journal_entries(path: &str) -> Result<Vec<JournalEntrySummaryDto>, String> {
    let db = open_database_from_input(path)?;
    JournalRepository::new(&db)
        .list_entries()
        .map(|entries| entries.into_iter().map(journal_entry_summary_dto_from_model).collect())
}

#[tauri::command]
fn load_profile(path: &str) -> Result<Option<UserProfileDto>, String> {
    let db = open_database_from_input(path)?;
    Ok(UserProfileRepository::new(&db)
        .get()?
        .map(user_profile_dto_from_model))
}

#[tauri::command]
fn save_profile(path: &str, profile: UserProfileDto) -> Result<(), String> {
    let db = open_database_from_input(path)?;
    UserProfileRepository::new(&db).upsert(user_profile_from_dto(profile))
}

#[tauri::command]
fn load_projects(path: &str) -> Result<Vec<ProjectDto>, String> {
    let db = open_database_from_input(path)?;
    ProjectRepository::new(&db)
        .list()
        .map(|projects| projects.into_iter().map(project_dto_from_model).collect())
}

#[tauri::command]
fn save_projects(path: &str, projects: Vec<ProjectDto>) -> Result<(), String> {
    let db = open_database_from_input(path)?;
    let repository = ProjectRepository::new(&db);
    repository.replace_all(projects.into_iter().map(project_from_dto).collect())
}

fn open_database_from_input(path: &str) -> Result<Database, String> {
    open_database(&resolve_vault_path(path.trim())?)
}

fn open_database(vault_path: &Path) -> Result<Database, String> {
    let db_path = vault_path.join(".kenchi").join("kenchi.sqlite3");
    Database::open(&db_path)
}

fn resolve_vault_path(input: &str) -> Result<PathBuf, String> {
    if input.is_empty() {
        return Err("Vault path cannot be empty.".into());
    }

    if input == "~" {
        return home_dir();
    }

    if let Some(stripped) = input.strip_prefix("~/") {
        return home_dir().map(|home| home.join(stripped));
    }

    Ok(Path::new(input).to_path_buf())
}

fn home_dir() -> Result<PathBuf, String> {
    env::var_os("HOME")
        .map(PathBuf::from)
        .ok_or_else(|| "Could not resolve the home directory for '~' expansion.".into())
}

fn workspace_item_from_capture(capture: Capture) -> WorkspaceItemDto {
    WorkspaceItemDto {
        id: capture.id,
        kind: "capture".into(),
        state: match capture.triage_status {
            CaptureTriageStatus::Inbox => "inbox".into(),
            CaptureTriageStatus::Processed => "active".into(),
            CaptureTriageStatus::Someday => "someday".into(),
        },
        source_type: "capture".into(),
        title: capture.text.clone(),
        content: capture.text,
        created_at: capture.created_at,
        updated_at: capture.updated_at,
        tags: Vec::new(),
        project_id: capture.project_id,
        project_lane_id: None,
        project: String::new(),
        is_completed: false,
        priority: String::new(),
        due_date: String::new(),
        completed_at: String::new(),
        estimate: String::new(),
        schedule_bucket: None,
        source_capture_id: None,
        goal_metric: None,
        goal_target: 1,
        goal_progress: 0,
        goal_progress_by_date: std::collections::HashMap::new(),
        goal_period: "weekly".into(),
        goal_scope: None,
    }
}

fn workspace_item_from_task(task: Task) -> WorkspaceItemDto {
    WorkspaceItemDto {
        id: task.id,
        kind: "task".into(),
        state: encode_task_lifecycle_state(&task.lifecycle_status),
        source_type: if task.source_capture_id.is_some() {
            "capture".into()
        } else {
            "manual".into()
        },
        title: task.title,
        content: task.description.unwrap_or_default(),
        created_at: task.created_at,
        updated_at: task.updated_at,
        tags: Vec::new(),
        project_id: task.project_id,
        project_lane_id: task.project_lane_id,
        project: String::new(),
        is_completed: task.is_completed,
        priority: encode_workspace_priority(task.priority),
        due_date: task.due_at.unwrap_or_default(),
        completed_at: task.completed_at.unwrap_or_default(),
        estimate: task
            .estimate_minutes
            .map(|value| value.to_string())
            .unwrap_or_default(),
        schedule_bucket: Some(encode_task_schedule_bucket(&task.schedule_bucket)),
        source_capture_id: task.source_capture_id,
        goal_metric: None,
        goal_target: 1,
        goal_progress: 0,
        goal_progress_by_date: std::collections::HashMap::new(),
        goal_period: "weekly".into(),
        goal_scope: None,
    }
}

fn workspace_item_from_goal(
    goal: Goal,
    progress_entries: Vec<GoalProgressEntry>,
    relationships: Vec<Relationship>,
) -> WorkspaceItemDto {
    let goal_progress_by_date = progress_entries
        .into_iter()
        .map(|entry| (entry.date, entry.value as i64))
        .collect();
    let linked_task_ids = relationships
        .into_iter()
        .filter(|relationship| {
            relationship.from_entity_type == "goal"
                && relationship.from_entity_id == goal.id
                && relationship.to_entity_type == "task"
                && relationship.relation_type == "goal_task_link"
        })
        .map(|relationship| relationship.to_entity_id)
        .collect::<Vec<_>>();

    WorkspaceItemDto {
        id: goal.id,
        kind: "goal".into(),
        state: match goal.status {
            GoalStatus::Archived => "archived".into(),
            _ => "active".into(),
        },
        source_type: "manual".into(),
        title: goal.title,
        content: goal.description.unwrap_or_default(),
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        tags: Vec::new(),
        project_id: None,
        project_lane_id: None,
        project: String::new(),
        is_completed: false,
        priority: String::new(),
        due_date: goal.ends_at.unwrap_or_default(),
        completed_at: goal.completed_at.unwrap_or_default(),
        estimate: String::new(),
        schedule_bucket: None,
        source_capture_id: None,
        goal_metric: goal.metric,
        goal_target: goal.target_value.unwrap_or(1.0) as i64,
        goal_progress: goal.current_value.unwrap_or(0.0) as i64,
        goal_progress_by_date,
        goal_period: goal.period_unit.unwrap_or_else(|| "weekly".into()),
        goal_scope: Some(WorkspaceGoalScopeDto {
            project_id: goal.scope_project_id,
            tag: goal.scope_tag,
            task_ids: if linked_task_ids.is_empty() {
                None
            } else {
                Some(linked_task_ids)
            },
        }),
    }
}

fn capture_from_workspace_item(item: WorkspaceItemDto) -> Result<Capture, String> {
    let processed_at = match item.state.as_str() {
        "active" => Some(item.updated_at.clone()),
        _ => None,
    };

    Ok(Capture {
        id: item.id,
        text: item.content,
        lifecycle_status: match item.state.as_str() {
            "archived" => CaptureLifecycleStatus::Archived,
            "deleted" => CaptureLifecycleStatus::Deleted,
            _ => CaptureLifecycleStatus::Active,
        },
        triage_status: match item.state.as_str() {
            "processed" | "active" => CaptureTriageStatus::Processed,
            "someday" => CaptureTriageStatus::Someday,
            _ => CaptureTriageStatus::Inbox,
        },
        project_id: item.project_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        processed_at,
    })
}

fn task_from_workspace_item(item: WorkspaceItemDto) -> Result<Task, String> {
    Ok(Task {
        id: item.id,
        title: item.title,
        description: if item.content.trim().is_empty() {
            None
        } else {
            Some(item.content)
        },
        lifecycle_status: match item.state.as_str() {
            "archived" => TaskLifecycleStatus::Archived,
            "deleted" => TaskLifecycleStatus::Deleted,
            _ => TaskLifecycleStatus::Active,
        },
        is_completed: item.is_completed,
        priority: decode_workspace_priority(&item.priority),
        due_at: empty_string_to_none(item.due_date.clone()),
        completed_at: empty_string_to_none(item.completed_at),
        estimate_minutes: item.estimate.parse::<i64>().ok(),
        project_id: item.project_id,
        project_lane_id: item.project_lane_id,
        schedule_bucket: decode_task_schedule_bucket(item.schedule_bucket.as_deref(), &item.due_date)?,
        source_capture_id: item.source_capture_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
    })
}

fn goal_from_workspace_item(item: WorkspaceItemDto) -> Result<Goal, String> {
    let goal_scope = item.goal_scope;

    Ok(Goal {
        id: item.id,
        title: item.title,
        description: empty_string_to_none(item.content),
        goal_type: GoalType::Outcome,
        status: match item.state.as_str() {
            "archived" => GoalStatus::Archived,
            _ => GoalStatus::Active,
        },
        tracking_mode: if item.goal_metric.is_some() {
            GoalTrackingMode::Automatic
        } else {
            GoalTrackingMode::Manual
        },
        metric: item.goal_metric,
        target_value: Some(item.goal_target as f64),
        current_value: Some(item.goal_progress as f64),
        period_unit: empty_string_to_none(item.goal_period),
        period_start: None,
        period_end: None,
        starts_at: None,
        ends_at: empty_string_to_none(item.due_date),
        scope_project_id: goal_scope
            .as_ref()
            .and_then(|scope| scope.project_id.clone())
            .or(item.project_id),
        scope_tag: goal_scope.and_then(|scope| scope.tag),
        source_query: None,
        created_at: item.created_at,
        updated_at: item.updated_at,
        archived_at: None,
        completed_at: empty_string_to_none(item.completed_at),
    })
}

fn load_entity_tags(
    tag_repository: &TagRepository<'_>,
    entity_type: &str,
    entity_id: &str,
) -> Result<Vec<String>, String> {
    tag_repository
        .list_for_entity(entity_type, entity_id)
        .map(|tags| tags.into_iter().map(|tag| tag.name).collect())
}

fn replace_workspace_entity_tags(db: &Database, items: &[WorkspaceItemDto]) -> Result<(), String> {
    db.connection()
        .execute(
            "DELETE FROM entity_tags WHERE entity_type IN ('capture', 'task', 'goal')",
            [],
        )
        .map_err(|error| error.to_string())?;

    let tag_repository = TagRepository::new(db);

    for item in items {
        for tag_name in &item.tags {
            let tag_id = ensure_tag(db, tag_name)?;
            tag_repository.attach(EntityTag {
                entity_type: item.kind.clone(),
                entity_id: item.id.clone(),
                tag_id,
            })?;
        }
    }

    Ok(())
}

fn ensure_tag(db: &Database, tag_name: &str) -> Result<String, String> {
    let existing_id = db
        .connection()
        .query_row(
            "SELECT id FROM tags WHERE name = ?1",
            [tag_name],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    if let Some(id) = existing_id {
        return Ok(id);
    }

    let id = format!("tag:{}", tag_name);
    TagRepository::new(db).create(Tag {
        id: id.clone(),
        name: tag_name.to_string(),
        color: None,
        created_at: "1970-01-01T00:00:00Z".into(),
    })?;

    Ok(id)
}

fn replace_goal_task_links(db: &Database, items: &[WorkspaceItemDto]) -> Result<(), String> {
    db.connection()
        .execute(
            "
            DELETE FROM relationships
            WHERE from_entity_type = 'goal'
              AND to_entity_type = 'task'
              AND relation_type = 'goal_task_link'
            ",
            [],
        )
        .map_err(|error| error.to_string())?;

    let relationship_repository = RelationshipRepository::new(db);

    for item in items.iter().filter(|item| item.kind == "goal") {
        let task_ids = item
            .goal_scope
            .as_ref()
            .and_then(|scope| scope.task_ids.as_ref())
            .cloned()
            .unwrap_or_default();

        for task_id in task_ids {
            relationship_repository.create(Relationship {
                id: format!("relationship:goal-task:{}:{}", item.id, task_id),
                from_entity_type: "goal".into(),
                from_entity_id: item.id.clone(),
                to_entity_type: "task".into(),
                to_entity_id: task_id,
                relation_type: "goal_task_link".into(),
                created_at: item.updated_at.clone(),
            })?;
        }
    }

    Ok(())
}

fn replace_goal_progress_entries(db: &Database, items: &[WorkspaceItemDto]) -> Result<(), String> {
    for item in items.iter().filter(|item| item.kind == "goal") {
        let mut progress_entries = item
            .goal_progress_by_date
            .iter()
            .map(|(date, value)| GoalProgressEntry {
                id: format!("goal-progress:{}:{}", item.id, date),
                goal_id: item.id.clone(),
                date: date.clone(),
                value: *value as f64,
                source_type: None,
                source_entity_type: None,
                source_entity_id: None,
                created_at: item.updated_at.clone(),
            })
            .collect::<Vec<_>>();

        progress_entries.sort_by(|left, right| left.date.cmp(&right.date));

        for entry in progress_entries {
            db.connection()
                .execute(
                    "
                    INSERT INTO goal_progress_entries (
                        id, goal_id, date, value, source_type, source_entity_type, source_entity_id, created_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                    ",
                    rusqlite::params![
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
        }
    }

    Ok(())
}

fn journal_entry_dto_from_models(
    entry: JournalEntry,
    commitments: Vec<JournalCommitment>,
) -> JournalEntryDto {
    let sections = parse_journal_markdown(entry.content_markdown.as_deref().unwrap_or_default());

    JournalEntryDto {
        id: entry.id,
        date: entry.entry_date,
        morning_intention: entry.morning_intention.unwrap_or_default(),
        diary_entry: sections.diary_entry,
        reflection_entry: sections.reflection_entry,
        focuses: sections.focuses,
        commitments: commitments
            .into_iter()
            .map(|commitment| JournalCommitmentDto {
                id: commitment.id,
                text: commitment.text,
                status: match commitment.status {
                    JournalCommitmentStatus::Open => "unmarked".into(),
                    JournalCommitmentStatus::Missed => "missed".into(),
                    JournalCommitmentStatus::Partial => "partial".into(),
                    JournalCommitmentStatus::Done => "done".into(),
                },
                order: commitment.sort_order,
            })
            .collect(),
        reflection: JournalReflectionDto {
            went_well: sections.went_well,
            didnt_go_well: sections.didnt_go_well,
            learned: sections.learned,
            gratitude: sections.gratitude,
        },
        created_at: entry.created_at,
        updated_at: entry.updated_at,
    }
}

fn journal_models_from_dto(
    entry: JournalEntryDto,
) -> Result<(JournalEntry, Vec<JournalCommitment>), String> {
    let content_markdown = render_journal_markdown(&entry);
    let commitments = entry
        .commitments
        .into_iter()
        .map(|commitment| {
            Ok(JournalCommitment {
                id: commitment.id,
                journal_entry_id: entry.id.clone(),
                text: commitment.text,
                status: match commitment.status.as_str() {
                    "missed" => JournalCommitmentStatus::Missed,
                    "partial" => JournalCommitmentStatus::Partial,
                    "done" => JournalCommitmentStatus::Done,
                    _ => JournalCommitmentStatus::Open,
                },
                sort_order: commitment.order,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok((
        JournalEntry {
            id: entry.id,
            entry_date: entry.date,
            title: None,
            content_markdown: Some(content_markdown),
            morning_intention: empty_string_to_none(entry.morning_intention),
            reflection_prompt: empty_string_to_none(entry.reflection_entry),
            created_at: entry.created_at,
            updated_at: entry.updated_at,
        },
        commitments,
    ))
}

fn journal_entry_summary_dto_from_model(summary: JournalEntrySummary) -> JournalEntrySummaryDto {
    JournalEntrySummaryDto {
        date: summary.entry_date,
        preview: summary.preview,
    }
}

fn user_profile_dto_from_model(profile: UserProfile) -> UserProfileDto {
    UserProfileDto {
        name: profile.name,
        profile_picture: profile.profile_picture.unwrap_or_default(),
    }
}

fn user_profile_from_dto(profile: UserProfileDto) -> UserProfile {
    UserProfile {
        id: "user-profile".into(),
        name: profile.name,
        profile_picture: empty_string_to_none(profile.profile_picture),
        created_at: "1970-01-01T00:00:00Z".into(),
        updated_at: "1970-01-01T00:00:00Z".into(),
    }
}

fn project_dto_from_model(project: Project) -> ProjectDto {
    ProjectDto {
        id: project.id,
        name: project.name,
        description: project.description.unwrap_or_default(),
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

fn project_from_dto(project: ProjectDto) -> Project {
    Project {
        id: project.id,
        name: project.name,
        description: empty_string_to_none(project.description),
        status: ProjectStatus::Active,
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

struct ParsedJournalSections {
    diary_entry: String,
    reflection_entry: String,
    focuses: Vec<String>,
    went_well: String,
    didnt_go_well: String,
    learned: String,
    gratitude: String,
}

fn parse_journal_markdown(markdown: &str) -> ParsedJournalSections {
    let mut current = "";
    let mut diary_entry = String::new();
    let mut reflection_entry = String::new();
    let mut focuses = Vec::new();
    let mut went_well = String::new();
    let mut didnt_go_well = String::new();
    let mut learned = String::new();
    let mut gratitude = String::new();

    for line in markdown.lines() {
        match line {
            "## Diary" => current = "diary",
            "## Reflection Entry" => current = "reflection_entry",
            "## Focuses" => current = "focuses",
            "## Went Well" => current = "went_well",
            "## Didn't Go Well" => current = "didnt_go_well",
            "## Learned" => current = "learned",
            "## Gratitude" => current = "gratitude",
            _ => match current {
                "diary" => push_markdown_line(&mut diary_entry, line),
                "reflection_entry" => push_markdown_line(&mut reflection_entry, line),
                "focuses" => {
                    if let Some(item) = line.strip_prefix("- ") {
                        focuses.push(item.to_string());
                    }
                }
                "went_well" => push_markdown_line(&mut went_well, line),
                "didnt_go_well" => push_markdown_line(&mut didnt_go_well, line),
                "learned" => push_markdown_line(&mut learned, line),
                "gratitude" => push_markdown_line(&mut gratitude, line),
                _ => {}
            },
        }
    }

    ParsedJournalSections {
        diary_entry,
        reflection_entry,
        focuses,
        went_well,
        didnt_go_well,
        learned,
        gratitude,
    }
}

fn render_journal_markdown(entry: &JournalEntryDto) -> String {
    let mut sections = Vec::new();
    sections.push(render_journal_section("Diary", &entry.diary_entry));
    sections.push(render_journal_section("Reflection Entry", &entry.reflection_entry));
    sections.push(render_journal_focuses(&entry.focuses));
    sections.push(render_journal_section("Went Well", &entry.reflection.went_well));
    sections.push(render_journal_section("Didn't Go Well", &entry.reflection.didnt_go_well));
    sections.push(render_journal_section("Learned", &entry.reflection.learned));
    sections.push(render_journal_section("Gratitude", &entry.reflection.gratitude));
    sections.join("\n\n")
}

fn render_journal_section(title: &str, body: &str) -> String {
    format!("## {}\n{}", title, body)
}

fn render_journal_focuses(focuses: &[String]) -> String {
    let lines = if focuses.is_empty() {
        String::new()
    } else {
        focuses
            .iter()
            .map(|focus| format!("- {}", focus))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!("## Focuses\n{}", lines)
}

fn push_markdown_line(target: &mut String, line: &str) {
    if !target.is_empty() {
        target.push('\n');
    }
    target.push_str(line);
}

fn encode_task_lifecycle_state(status: &TaskLifecycleStatus) -> String {
    match status {
        TaskLifecycleStatus::Active => "active".into(),
        TaskLifecycleStatus::Archived => "archived".into(),
        TaskLifecycleStatus::Deleted => "deleted".into(),
    }
}

fn encode_workspace_priority(priority: Option<i64>) -> String {
    match priority {
        Some(1) => "low".into(),
        Some(2) => "medium".into(),
        Some(3) => "high".into(),
        Some(4) => "urgent".into(),
        _ => String::new(),
    }
}

fn decode_workspace_priority(priority: &str) -> Option<i64> {
    match priority {
        "low" => Some(1),
        "medium" => Some(2),
        "high" => Some(3),
        "urgent" => Some(4),
        _ => None,
    }
}

fn encode_task_schedule_bucket(bucket: &TaskScheduleBucket) -> String {
    match bucket {
        TaskScheduleBucket::Inbox => "inbox".into(),
        TaskScheduleBucket::Today => "today".into(),
        TaskScheduleBucket::Upcoming => "upcoming".into(),
        TaskScheduleBucket::Someday => "someday".into(),
        TaskScheduleBucket::None => "none".into(),
    }
}

fn decode_task_schedule_bucket(
    encoded_bucket: Option<&str>,
    due_date: &str,
) -> Result<TaskScheduleBucket, String> {
    match encoded_bucket {
        Some("inbox") => Ok(TaskScheduleBucket::Inbox),
        Some("today") => Ok(TaskScheduleBucket::Today),
        Some("upcoming") => Ok(TaskScheduleBucket::Upcoming),
        Some("someday") => Ok(TaskScheduleBucket::Someday),
        Some("none") => Ok(TaskScheduleBucket::None),
        Some(other) => Err(format!("Unknown task schedule bucket: {}", other)),
        None => {
            if due_date.is_empty() {
                Ok(TaskScheduleBucket::None)
            } else {
                Ok(TaskScheduleBucket::Today)
            }
        }
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

fn default_goal_target() -> i64 {
    1
}

fn default_goal_period() -> String {
    "weekly".into()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            initialize_vault,
            load_workspace_items,
            replace_workspace_items,
            list_tasks,
            create_task,
            update_task,
            list_captures,
            create_capture,
            update_capture,
            process_capture,
            list_goals,
            create_goal,
            update_goal,
            log_goal_progress,
            load_journal_entry,
            save_journal_entry,
            list_journal_entries,
            load_profile,
            save_profile,
            load_projects,
            save_projects
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod persistence_tests;

#[cfg(test)]
mod workspace_item_tests {
    use super::{
        goal_from_workspace_item, load_workspace_items_from_db, replace_workspace_items_in_db,
        WorkspaceItemDto,
    };
    use crate::persistence::{
        database::Database,
        models::{Project, ProjectBoardLane, ProjectStatus},
        project_repository::ProjectRepository,
    };
    use serde_json::json;

    #[test]
    fn deserializes_current_frontend_goal_shape_and_maps_to_goal_model() {
        let dto: WorkspaceItemDto = serde_json::from_value(json!({
            "id": "goal-1",
            "kind": "goal",
            "state": "active",
            "sourceType": "manual",
            "title": "Complete 5 tasks",
            "content": "",
            "createdAt": "just now",
            "updatedAt": "just now",
            "tags": [],
            "project": "",
            "isCompleted": false,
            "priority": "",
            "dueDate": "",
            "completedAt": "",
            "estimate": "",
            "goalMetric": "tasks_completed",
            "goalTarget": 5,
            "goalProgress": 0,
            "goalProgressByDate": {},
            "goalPeriod": "daily",
            "goalScope": {
                "projectId": "project-1",
                "taskIds": ["task-1"]
            }
        }))
        .expect("current frontend workspace goal shape should deserialize");

        let goal = goal_from_workspace_item(dto).expect("workspace goal should convert to backend goal");

        assert_eq!(goal.metric.as_deref(), Some("tasks_completed"));
        assert_eq!(goal.period_unit.as_deref(), Some("daily"));
        assert_eq!(goal.scope_project_id.as_deref(), Some("project-1"));
        assert_eq!(goal.target_value, Some(5.0));
        assert_eq!(goal.tracking_mode, crate::persistence::models::GoalTrackingMode::Automatic);
    }

    #[test]
    fn preserves_task_and_goal_workspace_state_across_replace_and_load() {
        let db = Database::in_memory().expect("in-memory database should initialize");
        ProjectRepository::new(&db)
            .create(Project {
                id: "project-1".into(),
                name: "Kenchi".into(),
                description: Some("Workspace".into()),
                status: ProjectStatus::Active,
                board_lanes: vec![
                    ProjectBoardLane {
                        id: "project-1-lane-to-do".into(),
                        name: "To Do".into(),
                        order: 0,
                    },
                    ProjectBoardLane {
                        id: "project-1-lane-in-progress".into(),
                        name: "In Progress".into(),
                        order: 1,
                    },
                    ProjectBoardLane {
                        id: "project-1-lane-done".into(),
                        name: "Done".into(),
                        order: 2,
                    },
                ],
                created_at: "2026-03-17T07:00:00Z".into(),
                updated_at: "2026-03-17T07:00:00Z".into(),
            })
            .expect("project should save");
        let items: Vec<WorkspaceItemDto> = serde_json::from_value(json!([
            {
                "id": "capture-1",
                "kind": "capture",
                "state": "inbox",
                "sourceType": "capture",
                "title": "Review transcript note",
                "content": "Review transcript note",
                "createdAt": "2026-03-17T08:00:00Z",
                "updatedAt": "2026-03-17T08:00:00Z",
                "tags": ["inbox"],
                "projectId": "project-1",
                "project": "",
                "isCompleted": false,
                "priority": "",
                "dueDate": "",
                "completedAt": "",
                "estimate": "",
                "goalTarget": 1,
                "goalProgress": 0,
                "goalProgressByDate": {},
                "goalPeriod": "weekly"
            },
            {
                "id": "task-1",
                "kind": "task",
                "state": "active",
                "sourceType": "capture",
                "title": "Review transcript",
                "content": "Check edits",
                "createdAt": "2026-03-17T09:00:00Z",
                "updatedAt": "2026-03-17T09:30:00Z",
                "tags": ["deep-work", "review"],
                "projectId": "project-1",
                "projectLaneId": "project-1-lane-in-progress",
                "project": "",
                "isCompleted": false,
                "priority": "high",
                "dueDate": "2026-03-18T09:00:00Z",
                "completedAt": "",
                "estimate": "45",
                "goalTarget": 1,
                "goalProgress": 0,
                "goalProgressByDate": {},
                "goalPeriod": "weekly",
                "scheduleBucket": "upcoming",
                "sourceCaptureId": "capture-1"
            },
            {
                "id": "goal-1",
                "kind": "goal",
                "state": "active",
                "sourceType": "manual",
                "title": "Complete 5 tasks",
                "content": "",
                "createdAt": "2026-03-17T10:00:00Z",
                "updatedAt": "2026-03-17T10:00:00Z",
                "tags": ["quarterly"],
                "project": "",
                "isCompleted": false,
                "priority": "",
                "dueDate": "",
                "completedAt": "",
                "estimate": "",
                "goalMetric": "tasks_completed",
                "goalTarget": 5,
                "goalProgress": 2,
                "goalProgressByDate": {
                    "2026-03-17": 2
                },
                "goalPeriod": "daily",
                "goalScope": {
                    "projectId": "project-1",
                    "tag": "deep-work",
                    "taskIds": ["task-1"]
                }
            }
        ]))
        .expect("workspace DTOs should deserialize");

        replace_workspace_items_in_db(&db, items.clone()).expect("workspace items should save");

        let loaded = load_workspace_items_from_db(&db).expect("workspace items should load");
        let task = loaded.iter().find(|item| item.id == "task-1").expect("task should exist");
        let goal = loaded.iter().find(|item| item.id == "goal-1").expect("goal should exist");

        assert_eq!(task.tags, vec!["deep-work", "review"]);
        assert_eq!(
            serde_json::to_value(task).expect("task should serialize")["scheduleBucket"],
            json!("upcoming")
        );
        assert_eq!(
            serde_json::to_value(task).expect("task should serialize")["sourceCaptureId"],
            json!("capture-1")
        );
        assert_eq!(
            serde_json::to_value(task).expect("task should serialize")["projectLaneId"],
            json!("project-1-lane-in-progress")
        );
        assert_eq!(goal.tags, vec!["quarterly"]);
        assert_eq!(
            serde_json::to_value(goal).expect("goal should serialize")["goalScope"]["tag"],
            json!("deep-work")
        );
        assert_eq!(
            serde_json::to_value(goal).expect("goal should serialize")["goalScope"]["taskIds"],
            json!(["task-1"])
        );
        assert_eq!(
            serde_json::to_value(goal).expect("goal should serialize")["goalProgressByDate"],
            json!({"2026-03-17": 2})
        );
    }
}
