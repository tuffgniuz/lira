use crate::application::workspace::{
    goal_from_workspace_item, load_workspace_items_from_db, replace_workspace_items_in_db,
};
use crate::persistence::{
    database::Database,
    models::{Project, ProjectBoardLane, ProjectStatus},
    project_repository::ProjectRepository,
};
use crate::transport::workspace::WorkspaceItemDto;
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
fn preserves_goal_schedule_days_and_milestones_across_workspace_mapping() {
    let dto: WorkspaceItemDto = serde_json::from_value(json!({
        "id": "goal-1",
        "kind": "goal",
        "state": "active",
        "sourceType": "manual",
        "title": "Ship the monthly review",
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
        "goalTarget": 2,
        "goalProgress": 1,
        "goalProgressByDate": {},
        "goalPeriod": "monthly",
        "goalScheduleDays": ["monday", "wednesday"],
        "goalMilestones": [
            {
                "id": "milestone-1",
                "title": "Draft review",
                "isCompleted": true,
                "completedAt": "2026-03-18"
            },
            {
                "id": "milestone-2",
                "title": "Publish review",
                "isCompleted": false,
                "completedAt": ""
            }
        ]
    }))
    .expect("goal DTO should deserialize");

    let goal = goal_from_workspace_item(dto).expect("workspace goal should convert to backend goal");

    assert_eq!(goal.schedule_days, vec!["monday", "wednesday"]);
    assert_eq!(goal.milestones.len(), 2);
    assert_eq!(goal.milestones[0].title, "Draft review");
    assert!(goal.milestones[0].is_completed);
}

#[test]
fn preserves_task_and_goal_workspace_state_across_replace_and_load() {
    let db = Database::in_memory().expect("in-memory database should initialize");
    ProjectRepository::new(&db)
        .create(Project {
            id: "project-1".into(),
            name: "Lira".into(),
            description: Some("Workspace".into()),
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
            "sourceCaptureId": "capture-1",
            "customFieldValues": {
                "task_id": "TASK-88",
                "stage_uuid": "stage-uuid-88"
            }
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
    assert_eq!(
        serde_json::to_value(task).expect("task should serialize")["customFieldValues"],
        json!({
            "task_id": "TASK-88",
            "stage_uuid": "stage-uuid-88"
        })
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
