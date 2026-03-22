use crate::persistence::capture_repository::CaptureRepository;
use crate::persistence::database::Database;
use crate::persistence::goal_repository::GoalRepository;
use crate::persistence::models::{
    Capture, CaptureLifecycleStatus, CaptureTriageStatus, EntityTag, Goal, GoalMilestone,
    GoalProgressEntry, GoalStatus, GoalTrackingMode, GoalType, Relationship, Tag, Task,
    TaskLifecycleStatus, TaskQuery, TaskScheduleBucket,
};
use crate::persistence::relationship_repository::RelationshipRepository;
use crate::persistence::tag_repository::TagRepository;
use crate::persistence::task_repository::TaskRepository;
use crate::transport::workspace::{
    WorkspaceGoalMilestoneDto, WorkspaceGoalScopeDto, WorkspaceItemDto,
};
use rusqlite::OptionalExtension;

pub fn load_workspace_items_from_db(db: &Database) -> Result<Vec<WorkspaceItemDto>, String> {
    let capture_repository = CaptureRepository::new(db);
    let task_repository = TaskRepository::new(db);
    let goal_repository = GoalRepository::new(db);
    let tag_repository = TagRepository::new(db);
    let relationship_repository = RelationshipRepository::new(db);

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

pub fn replace_workspace_items_in_db(db: &Database, items: Vec<WorkspaceItemDto>) -> Result<(), String> {
    let capture_repository = CaptureRepository::new(db);
    let task_repository = TaskRepository::new(db);
    let goal_repository = GoalRepository::new(db);

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
        custom_field_values: std::collections::HashMap::new(),
        goal_metric: None,
        goal_target: 1,
        goal_progress: 0,
        goal_progress_by_date: std::collections::HashMap::new(),
        goal_period: "weekly".into(),
        goal_schedule_days: Vec::new(),
        goal_milestones: Vec::new(),
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
        custom_field_values: task.custom_field_values,
        goal_metric: None,
        goal_target: 1,
        goal_progress: 0,
        goal_progress_by_date: std::collections::HashMap::new(),
        goal_period: "weekly".into(),
        goal_schedule_days: Vec::new(),
        goal_milestones: Vec::new(),
        goal_scope: None,
    }
}

fn workspace_item_from_goal(
    goal: Goal,
    progress_entries: Vec<GoalProgressEntry>,
    relationships: Vec<Relationship>,
) -> WorkspaceItemDto {
    let goal_id = goal.id.clone();
    let goal_progress_by_date = progress_entries
        .into_iter()
        .map(|entry| (entry.date, entry.value as i64))
        .collect();
    let linked_task_ids = relationships
        .into_iter()
        .filter(|relationship| {
            relationship.from_entity_type == "goal"
                && relationship.from_entity_id == goal_id
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
        custom_field_values: std::collections::HashMap::new(),
        goal_metric: goal.metric,
        goal_target: goal.target_value.unwrap_or(1.0) as i64,
        goal_progress: goal.current_value.unwrap_or(0.0) as i64,
        goal_progress_by_date,
        goal_period: goal.period_unit.unwrap_or_else(|| "weekly".into()),
        goal_schedule_days: goal.schedule_days,
        goal_milestones: goal
            .milestones
            .into_iter()
            .map(|milestone| WorkspaceGoalMilestoneDto {
                id: milestone.id,
                title: milestone.title,
                is_completed: milestone.is_completed,
                completed_at: milestone.completed_at.unwrap_or_default(),
            })
            .collect(),
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
        custom_field_values: item.custom_field_values,
        created_at: item.created_at,
        updated_at: item.updated_at,
    })
}

pub(crate) fn goal_from_workspace_item(item: WorkspaceItemDto) -> Result<Goal, String> {
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
        target_value: Some(
            if item.goal_milestones.is_empty() {
                item.goal_target
            } else {
                item.goal_milestones.len() as i64
            } as f64,
        ),
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
        schedule_days: item.goal_schedule_days,
        milestones: item
            .goal_milestones
            .into_iter()
            .enumerate()
            .map(|(index, milestone)| GoalMilestone {
                id: milestone.id,
                title: milestone.title,
                sort_order: index as i64,
                is_completed: milestone.is_completed,
                completed_at: empty_string_to_none(milestone.completed_at),
                created_at: item.created_at.clone(),
                updated_at: item.updated_at.clone(),
            })
            .collect(),
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
