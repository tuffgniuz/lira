use crate::commands::vault::resolve_vault_path;
use crate::application::vault::open_database;
use crate::persistence::repositories::task_repository::TaskRepository;
use crate::transport::workspace::WorkspaceItemDto;
use tempfile::tempdir;

#[test]
fn exposes_refactored_backend_modules_for_commands_and_transport_types() {
    let path = resolve_vault_path("~/lira-test").expect("path should resolve");
    assert!(path.ends_with("lira-test"));

    let workspace_item = WorkspaceItemDto {
        id: "item-1".into(),
        kind: "capture".into(),
        state: "inbox".into(),
        source_type: "capture".into(),
        title: "Title".into(),
        content: "Content".into(),
        created_at: "2026-03-22T00:00:00Z".into(),
        updated_at: "2026-03-22T00:00:00Z".into(),
        tags: Vec::new(),
        project_id: None,
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
    };

    assert_eq!(workspace_item.kind, "capture");
    let repository_type_name = std::any::type_name::<TaskRepository<'static>>();
    assert!(repository_type_name.contains("TaskRepository"));
}

#[test]
fn migrates_an_existing_hidden_app_database_into_the_lira_layout() {
    let vault_dir = tempdir().expect("temporary vault should initialize");
    let hidden_app_dir = vault_dir.path().join(".archive");
    std::fs::create_dir_all(&hidden_app_dir).expect("hidden app directory should be created");

    let legacy_db_path = hidden_app_dir.join("archive.sqlite3");
    crate::persistence::database::Database::open(&legacy_db_path)
        .expect("legacy app database should initialize");

    open_database(vault_dir.path()).expect("database should open through the lira layout");

    assert!(vault_dir.path().join(".lira").join("lira.sqlite3").exists());
    assert!(!legacy_db_path.exists());
}
