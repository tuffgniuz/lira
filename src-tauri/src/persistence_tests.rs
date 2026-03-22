use crate::persistence::{
    capture_repository::CaptureRepository,
    database::Database,
    goal_repository::GoalRepository,
    journal_repository::JournalRepository,
    models::{
        Capture, CaptureLifecycleStatus, CaptureTriageStatus, EntityTag, Goal, GoalProgressEntry,
        GoalStatus, GoalTrackingMode, GoalType, JournalCommitment, JournalCommitmentStatus,
        JournalEntry, Project, ProjectBoardLane, ProjectStatus, ProjectTaskTemplate,
        ProjectTaskTemplateField, ProjectTaskTemplateFieldType, Relationship, Tag, Task,
        TaskLifecycleStatus, TaskQuery, TaskScheduleBucket, UserProfile,
    },
    project_repository::ProjectRepository,
    relationship_repository::RelationshipRepository,
    tag_repository::TagRepository,
    task_repository::TaskRepository,
    user_profile_repository::UserProfileRepository,
};
use rusqlite::Connection;
use tempfile::NamedTempFile;

fn test_db() -> Database {
    Database::in_memory().expect("in-memory sqlite database should initialize")
}

fn sample_project() -> Project {
    Project {
        id: "project-1".into(),
        name: "Lira".into(),
        description: Some("Primary workspace".into()),
        status: ProjectStatus::Active,
        has_kanban_board: true,
        task_template: None,
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
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
    }
}

fn sample_capture() -> Capture {
    Capture {
        id: "capture-1".into(),
        text: "Turn this note into a task".into(),
        lifecycle_status: CaptureLifecycleStatus::Active,
        triage_status: CaptureTriageStatus::Inbox,
        project_id: Some("project-1".into()),
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
        processed_at: None,
    }
}

fn sample_task() -> Task {
    Task {
        id: "task-1".into(),
        title: "Ship sqlite migration".into(),
        description: Some("Replace item persistence".into()),
        lifecycle_status: TaskLifecycleStatus::Active,
        is_completed: false,
        schedule_bucket: TaskScheduleBucket::Today,
        priority: Some(2),
        due_at: Some("2026-03-18T09:00:00Z".into()),
        completed_at: None,
        estimate_minutes: Some(45),
        project_id: Some("project-1".into()),
        project_lane_id: Some("project-1-lane-to-do".into()),
        source_capture_id: Some("capture-1".into()),
        custom_field_values: std::collections::HashMap::new(),
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
    }
}

fn sample_goal() -> Goal {
    Goal {
        id: "goal-1".into(),
        title: "Close five tasks".into(),
        description: Some("Weekly throughput target".into()),
        goal_type: GoalType::Outcome,
        status: GoalStatus::Active,
        tracking_mode: GoalTrackingMode::Manual,
        metric: Some("tasks_completed".into()),
        target_value: Some(5.0),
        current_value: Some(2.0),
        period_unit: Some("week".into()),
        period_start: Some("2026-03-16".into()),
        period_end: Some("2026-03-22".into()),
        starts_at: Some("2026-03-16T00:00:00Z".into()),
        ends_at: Some("2026-03-22T23:59:59Z".into()),
        scope_project_id: Some("project-1".into()),
        scope_tag: None,
        source_query: None,
        schedule_days: Vec::new(),
        milestones: Vec::new(),
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
        archived_at: None,
        completed_at: None,
    }
}

fn sample_goal_progress_entry() -> GoalProgressEntry {
    GoalProgressEntry {
        id: "goal-progress-1".into(),
        goal_id: "goal-1".into(),
        date: "2026-03-17".into(),
        value: 3.0,
        source_type: Some("manual".into()),
        source_entity_type: Some("task".into()),
        source_entity_id: Some("task-1".into()),
        created_at: "2026-03-17T09:30:00Z".into(),
    }
}

fn sample_journal_entry() -> JournalEntry {
    JournalEntry {
        id: "journal-2026-03-17".into(),
        entry_date: "2026-03-17".into(),
        title: Some("Daily note".into()),
        content_markdown: Some("Finished the backend plan.".into()),
        morning_intention: Some("Stay focused".into()),
        reflection_prompt: Some("What moved forward?".into()),
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
    }
}

fn sample_commitment() -> JournalCommitment {
    JournalCommitment {
        id: "commitment-1".into(),
        journal_entry_id: "journal-2026-03-17".into(),
        text: "Finish the persistence refactor".into(),
        status: JournalCommitmentStatus::Open,
        sort_order: 0,
    }
}

fn sample_tag() -> Tag {
    Tag {
        id: "tag-1".into(),
        name: "focus".into(),
        color: Some("#224488".into()),
        created_at: "2026-03-17T08:00:00Z".into(),
    }
}

fn sample_relationship() -> Relationship {
    Relationship {
        id: "relationship-1".into(),
        from_entity_type: "goal".into(),
        from_entity_id: "goal-1".into(),
        to_entity_type: "task".into(),
        to_entity_id: "task-1".into(),
        relation_type: "supports".into(),
        created_at: "2026-03-17T08:30:00Z".into(),
    }
}

fn sample_profile() -> UserProfile {
    UserProfile {
        id: "user-profile".into(),
        name: "User".into(),
        profile_picture: None,
        created_at: "2026-03-17T08:00:00Z".into(),
        updated_at: "2026-03-17T08:00:00Z".into(),
    }
}

#[test]
fn creates_reads_and_updates_captures() {
    let db = test_db();
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created");

    let repository = CaptureRepository::new(&db);
    repository
        .create(sample_capture())
        .expect("capture should be created");

    let created = repository
        .get("capture-1")
        .expect("capture lookup should succeed")
        .expect("capture should exist");
    assert_eq!(created.text, "Turn this note into a task");
    assert_eq!(created.project_id.as_deref(), Some("project-1"));

    repository
        .update(Capture {
            triage_status: CaptureTriageStatus::Processed,
            processed_at: Some("2026-03-17T10:00:00Z".into()),
            ..created
        })
        .expect("capture should update");

    let updated = repository
        .get("capture-1")
        .expect("capture lookup should succeed")
        .expect("capture should exist after update");
    assert_eq!(updated.triage_status, CaptureTriageStatus::Processed);
    assert_eq!(updated.processed_at.as_deref(), Some("2026-03-17T10:00:00Z"));
}

#[test]
fn creates_reads_updates_and_filters_tasks() {
    let db = test_db();
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created");
    CaptureRepository::new(&db)
        .create(sample_capture())
        .expect("capture should be created");

    let repository = TaskRepository::new(&db);
    repository
        .create(sample_task())
        .expect("task should be created");

    let fetched = repository
        .get("task-1")
        .expect("task lookup should succeed")
        .expect("task should exist");
    assert_eq!(fetched.schedule_bucket, TaskScheduleBucket::Today);
    assert_eq!(fetched.source_capture_id.as_deref(), Some("capture-1"));
    assert_eq!(fetched.project_lane_id.as_deref(), Some("project-1-lane-to-do"));

    repository
        .update(Task {
            is_completed: true,
            completed_at: Some("2026-03-17T11:00:00Z".into()),
            ..fetched
        })
        .expect("task should update");

    let done_tasks = repository
        .list(TaskQuery {
            lifecycle_status: Some(TaskLifecycleStatus::Active),
            is_completed: Some(true),
            schedule_bucket: Some(TaskScheduleBucket::Today),
            project_id: Some("project-1".into()),
        })
        .expect("task list should succeed");
    assert_eq!(done_tasks.len(), 1);
    assert_eq!(done_tasks[0].completed_at.as_deref(), Some("2026-03-17T11:00:00Z"));
    assert_eq!(done_tasks[0].project_lane_id.as_deref(), Some("project-1-lane-to-do"));
}

#[test]
fn persists_project_task_templates_and_task_custom_field_values() {
    let db = test_db();

    ProjectRepository::new(&db)
        .create(Project {
            task_template: Some(ProjectTaskTemplate {
                updated_at: "2026-03-17T08:15:00Z".into(),
                fields: vec![
                    ProjectTaskTemplateField {
                        id: "field-task-id".into(),
                        key: "task_id".into(),
                        label: "Task ID".into(),
                        field_type: ProjectTaskTemplateFieldType::Text,
                    },
                    ProjectTaskTemplateField {
                        id: "field-stage-uuid".into(),
                        key: "stage_uuid".into(),
                        label: "Stage UUID".into(),
                        field_type: ProjectTaskTemplateFieldType::Boolean,
                    },
                ],
            }),
            ..sample_project()
        })
        .expect("project should be created");
    CaptureRepository::new(&db)
        .create(sample_capture())
        .expect("capture should be created");

    let mut task = sample_task();
    task.custom_field_values = std::collections::HashMap::from([
        ("task_id".into(), "TASK-9".into()),
        ("stage_uuid".into(), "stage-uuid-9".into()),
    ]);

    TaskRepository::new(&db)
        .create(task)
        .expect("task should be created");

    let projects = ProjectRepository::new(&db)
        .list()
        .expect("projects should load");
    let tasks = TaskRepository::new(&db)
        .list(TaskQuery::default())
        .expect("tasks should load");

    assert_eq!(
        projects[0].task_template.as_ref().expect("template should exist").fields.len(),
        2
    );
    assert_eq!(
        projects[0]
            .task_template
            .as_ref()
            .expect("template should exist")
            .fields[1]
            .field_type,
        ProjectTaskTemplateFieldType::Boolean
    );
    assert_eq!(
        tasks[0].custom_field_values.get("task_id").map(String::as_str),
        Some("TASK-9")
    );
    assert_eq!(
        tasks[0].custom_field_values.get("stage_uuid").map(String::as_str),
        Some("stage-uuid-9")
    );
}

#[test]
fn creates_reads_and_updates_project_board_lanes() {
    let db = test_db();
    let repository = ProjectRepository::new(&db);

    repository
        .create(sample_project())
        .expect("project should be created");

    let created = repository.list().expect("projects should list");
    assert_eq!(created.len(), 1);
    assert!(created[0].has_kanban_board);
    assert_eq!(created[0].board_lanes.len(), 3);
    assert_eq!(created[0].board_lanes[0].name, "To Do");

    repository
        .update(Project {
            board_lanes: vec![
                ProjectBoardLane {
                    id: "project-1-lane-to-do".into(),
                    name: "Backlog".into(),
                    order: 0,
                },
                ProjectBoardLane {
                    id: "project-1-lane-in-progress".into(),
                    name: "Doing".into(),
                    order: 1,
                },
                ProjectBoardLane {
                    id: "project-1-lane-review".into(),
                    name: "Review".into(),
                    order: 2,
                },
                ProjectBoardLane {
                    id: "project-1-lane-done".into(),
                    name: "Done".into(),
                    order: 3,
                },
            ],
            ..sample_project()
        })
        .expect("project should update");

    let updated = repository.list().expect("projects should list after update");
    assert_eq!(updated[0].board_lanes.len(), 4);
    assert_eq!(updated[0].board_lanes[2].name, "Review");
}

#[test]
fn persists_projects_without_an_enabled_kanban_board() {
    let db = test_db();
    let repository = ProjectRepository::new(&db);

    repository
        .create(Project {
            has_kanban_board: false,
            board_lanes: Vec::new(),
            ..sample_project()
        })
        .expect("project should be created");

    let projects = repository.list().expect("projects should list");

    assert_eq!(projects.len(), 1);
    assert!(!projects[0].has_kanban_board);
    assert!(projects[0].board_lanes.is_empty());
}

#[test]
fn rejects_task_with_missing_source_capture_relation() {
    let db = test_db();
    let repository = TaskRepository::new(&db);

    let result = repository.create(sample_task());

    assert!(result.is_err(), "task create should fail without required relations");
}

#[test]
fn creates_goals_and_tracks_progress_entries() {
    let db = test_db();
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created");

    let repository = GoalRepository::new(&db);
    repository
        .create(sample_goal())
        .expect("goal should be created");

    repository
        .log_progress(sample_goal_progress_entry())
        .expect("goal progress should be logged");

    let goal = repository
        .get("goal-1")
        .expect("goal lookup should succeed")
        .expect("goal should exist");
    assert_eq!(goal.current_value, Some(3.0));

    let progress_entries = repository
        .list_progress_entries("goal-1")
        .expect("progress entries should load");
    assert_eq!(progress_entries.len(), 1);
    assert_eq!(progress_entries[0].source_entity_id.as_deref(), Some("task-1"));
}

#[test]
fn persists_goal_schedule_days_and_milestones() {
    let db = test_db();
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created");

    let repository = GoalRepository::new(&db);
    repository
        .create(Goal {
            schedule_days: vec!["monday".into(), "wednesday".into(), "friday".into()],
            milestones: vec![
                crate::persistence::models::GoalMilestone {
                    id: "milestone-1".into(),
                    title: "Draft review".into(),
                    sort_order: 0,
                    is_completed: false,
                    completed_at: None,
                    created_at: "2026-03-17T08:00:00Z".into(),
                    updated_at: "2026-03-17T08:00:00Z".into(),
                },
                crate::persistence::models::GoalMilestone {
                    id: "milestone-2".into(),
                    title: "Publish review".into(),
                    sort_order: 1,
                    is_completed: true,
                    completed_at: Some("2026-03-18T10:00:00Z".into()),
                    created_at: "2026-03-17T08:00:00Z".into(),
                    updated_at: "2026-03-18T10:00:00Z".into(),
                },
            ],
            ..sample_goal()
        })
        .expect("goal should be created");

    let goal = repository
        .get("goal-1")
        .expect("goal lookup should succeed")
        .expect("goal should exist");

    assert_eq!(goal.schedule_days, vec!["monday", "wednesday", "friday"]);
    assert_eq!(goal.milestones.len(), 2);
    assert_eq!(goal.milestones[1].title, "Publish review");
    assert!(goal.milestones[1].is_completed);
}

#[test]
fn goal_progress_requires_existing_goal() {
    let db = test_db();
    let repository = GoalRepository::new(&db);

    let result = repository.log_progress(sample_goal_progress_entry());

    assert!(result.is_err(), "goal progress should fail for missing goals");
}

#[test]
fn creates_journal_entries_and_commitments() {
    let db = test_db();
    let repository = JournalRepository::new(&db);

    repository
        .upsert_entry(sample_journal_entry())
        .expect("journal entry should save");
    repository
        .replace_commitments("journal-2026-03-17", vec![sample_commitment()])
        .expect("commitments should save");

    let entry = repository
        .get_entry("2026-03-17")
        .expect("journal lookup should succeed")
        .expect("journal entry should exist");
    assert_eq!(entry.title.as_deref(), Some("Daily note"));

    let commitments = repository
        .list_commitments("journal-2026-03-17")
        .expect("commitments should load");
    assert_eq!(commitments.len(), 1);
    assert_eq!(commitments[0].text, "Finish the persistence refactor");
}

#[test]
fn creates_projects_tags_entity_tags_relationships_and_profile() {
    let db = test_db();

    let project_repository = ProjectRepository::new(&db);
    project_repository
        .create(sample_project())
        .expect("project should be created");

    let tag_repository = TagRepository::new(&db);
    tag_repository
        .create(sample_tag())
        .expect("tag should be created");
    tag_repository
        .attach(EntityTag {
            entity_type: "project".into(),
            entity_id: "project-1".into(),
            tag_id: "tag-1".into(),
        })
        .expect("entity tag should be created");

    let relationship_repository = RelationshipRepository::new(&db);
    relationship_repository
        .create(sample_relationship())
        .expect("relationship should be created");

    let profile_repository = UserProfileRepository::new(&db);
    profile_repository
        .upsert(sample_profile())
        .expect("profile should save");

    let tags = tag_repository
        .list_for_entity("project", "project-1")
        .expect("project tags should load");
    assert_eq!(tags.len(), 1);
    assert_eq!(tags[0].name, "focus");

    let relationships = relationship_repository
        .list_for_entity("goal", "goal-1")
        .expect("relationships should load");
    assert_eq!(relationships.len(), 1);
    assert_eq!(relationships[0].to_entity_id, "task-1");

    let profile = profile_repository
        .get()
        .expect("profile lookup should succeed")
        .expect("profile should exist");
    assert_eq!(profile.name, "User");
}

#[test]
fn supports_nullable_fields_and_empty_query_results() {
    let db = test_db();

    ProjectRepository::new(&db)
        .create(Project {
            description: None,
            ..sample_project()
        })
        .expect("project should be created");

    GoalRepository::new(&db)
        .create(Goal {
            description: None,
            metric: None,
            target_value: None,
            current_value: None,
            period_unit: None,
            period_start: None,
            period_end: None,
            starts_at: None,
            ends_at: None,
            scope_project_id: None,
            scope_tag: None,
            source_query: None,
            ..sample_goal()
        })
        .expect("goal with nullable fields should be created");

    let tasks = TaskRepository::new(&db)
        .list(TaskQuery {
            lifecycle_status: Some(TaskLifecycleStatus::Archived),
            is_completed: None,
            schedule_bucket: None,
            project_id: None,
        })
        .expect("empty task query should succeed");

    assert!(tasks.is_empty(), "archived task query should be empty");
}

#[test]
fn migrates_legacy_tasks_table_to_current_columns() {
    let temp_file = NamedTempFile::new().expect("temp db file should create");
    let connection = Connection::open(temp_file.path()).expect("legacy sqlite db should open");

    connection
        .execute_batch(
            "
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                lifecycle_status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE captures (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                lifecycle_status TEXT NOT NULL,
                triage_status TEXT NOT NULL,
                project_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                processed_at TEXT
            );
            ",
        )
        .expect("legacy schema should create");
    drop(connection);

    let db = Database::open(temp_file.path()).expect("database should migrate legacy schema");
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created after migration");
    CaptureRepository::new(&db)
        .create(sample_capture())
        .expect("capture should be created after migration");

    TaskRepository::new(&db)
        .create(sample_task())
        .expect("task should save after migration adds missing columns");

    let task = TaskRepository::new(&db)
        .get("task-1")
        .expect("task should load")
        .expect("task should exist");

    assert_eq!(task.is_completed, false);
    assert_eq!(task.schedule_bucket, TaskScheduleBucket::Today);
    assert_eq!(task.source_capture_id.as_deref(), Some("capture-1"));
    assert_eq!(task.project_lane_id.as_deref(), Some("project-1-lane-to-do"));
}

#[test]
fn migrates_tasks_table_with_legacy_task_status_column() {
    let temp_file = NamedTempFile::new().expect("temp db file should create");
    let connection = Connection::open(temp_file.path()).expect("legacy sqlite db should open");

    connection
        .execute_batch(
            "
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE captures (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                lifecycle_status TEXT NOT NULL,
                triage_status TEXT NOT NULL,
                project_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                processed_at TEXT
            );

            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                lifecycle_status TEXT NOT NULL,
                task_status TEXT NOT NULL,
                is_completed INTEGER NOT NULL DEFAULT 0,
                schedule_bucket TEXT NOT NULL DEFAULT 'none',
                priority INTEGER,
                due_at TEXT,
                completed_at TEXT,
                estimate_minutes INTEGER,
                project_id TEXT,
                source_capture_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            ",
        )
        .expect("legacy schema should create");
    drop(connection);

    let db = Database::open(temp_file.path()).expect("database should migrate legacy schema");
    ProjectRepository::new(&db)
        .create(sample_project())
        .expect("project should be created after migration");
    CaptureRepository::new(&db)
        .create(sample_capture())
        .expect("capture should be created after migration");

    TaskRepository::new(&db)
        .create(sample_task())
        .expect("task should save after task_status migration");

    let columns = db
        .connection()
        .prepare("PRAGMA table_info(tasks)")
        .expect("task info statement should prepare")
        .query_map([], |row| row.get::<_, String>(1))
        .expect("task info should query")
        .collect::<Result<Vec<_>, _>>()
        .expect("task columns should collect");

    assert!(
        !columns.iter().any(|column| column == "task_status"),
        "legacy task_status column should be removed",
    );
}

#[test]
fn loads_default_project_board_lanes_for_legacy_projects_without_saved_lanes() {
    let temp_file = NamedTempFile::new().expect("temp db file should create");
    let connection = Connection::open(temp_file.path()).expect("legacy sqlite db should open");

    connection
        .execute_batch(
            "
            CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT INTO projects (id, name, description, status, created_at, updated_at)
            VALUES ('project-1', 'Lira', 'Primary workspace', 'active', '2026-03-17T08:00:00Z', '2026-03-17T08:00:00Z');
            ",
        )
        .expect("legacy project schema should create");
    drop(connection);

    let db = Database::open(temp_file.path()).expect("database should migrate legacy schema");
    let projects = ProjectRepository::new(&db)
        .list()
        .expect("projects should list after migration");

    assert_eq!(projects.len(), 1);
    assert!(projects[0].has_kanban_board);
    assert_eq!(projects[0].board_lanes.len(), 3);
    assert_eq!(projects[0].board_lanes[0].name, "To Do");
    assert_eq!(projects[0].board_lanes[1].name, "In Progress");
    assert_eq!(projects[0].board_lanes[2].name, "Done");
}
