use std::env;
use std::fs;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CaptureItem {
    id: String,
    text: String,
    created_at: String,
    tags: Vec<String>,
    project: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskItem {
    id: String,
    title: String,
    status: String,
    due_date: String,
    priority: String,
    project: String,
    tags: Vec<String>,
    notes: String,
    estimate: String,
    source: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserProfile {
    name: String,
    profile_picture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoalItem {
    id: String,
    title: String,
    description: String,
    metric_type: String,
    target_value: i64,
    period: String,
    project: String,
    tag_filter: String,
    status: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Item {
    id: String,
    kind: String,
    state: String,
    source_type: String,
    title: String,
    content: String,
    created_at: String,
    updated_at: String,
    tags: Vec<String>,
    project: String,
    task_status: String,
    priority: String,
    due_date: String,
    estimate: String,
    goal_metric_type: String,
    goal_target_value: i64,
    goal_period: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn initialize_vault(path: &str) -> Result<String, String> {
    let trimmed = path.trim();

    if trimmed.is_empty() {
        return Err("Vault path cannot be empty.".into());
    }

    let resolved = expand_home(trimmed)?;

    fs::create_dir_all(&resolved).map_err(|error| {
        format!(
            "Failed to create vault directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    let kenchi_dir = resolved.join(".inbox");

    fs::create_dir_all(&kenchi_dir).map_err(|error| {
        format!(
            "Failed to initialize .inbox directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    fs::create_dir_all(resolved.join("journal")).map_err(|error| {
        format!(
            "Failed to initialize journal directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    let inbox_file = kenchi_dir.join("inbox.json");
    let tasks_file = resolved.join(".tasks").join("tasks.json");
    let goals_file = resolved.join(".goals").join("goals.json");
    let items_file = resolved.join(".items").join("items.json");
    let profile_file = resolved.join(".profile").join("profile.json");

    fs::create_dir_all(resolved.join(".tasks")).map_err(|error| {
        format!(
            "Failed to initialize .tasks directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    fs::create_dir_all(resolved.join(".profile")).map_err(|error| {
        format!(
            "Failed to initialize .profile directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    fs::create_dir_all(resolved.join(".goals")).map_err(|error| {
        format!(
            "Failed to initialize .goals directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    fs::create_dir_all(resolved.join(".items")).map_err(|error| {
        format!(
            "Failed to initialize .items directory at {}: {}",
            resolved.display(),
            error
        )
    })?;

    if !inbox_file.exists() {
        fs::write(&inbox_file, "[]").map_err(|error| {
            format!(
                "Failed to initialize inbox storage at {}: {}",
                inbox_file.display(),
                error
            )
        })?;
    }

    if !tasks_file.exists() {
        fs::write(&tasks_file, "[]").map_err(|error| {
            format!(
                "Failed to initialize task storage at {}: {}",
                tasks_file.display(),
                error
            )
        })?;
    }

    if !goals_file.exists() {
        fs::write(&goals_file, "[]").map_err(|error| {
            format!(
                "Failed to initialize goal storage at {}: {}",
                goals_file.display(),
                error
            )
        })?;
    }

    if !items_file.exists() {
        fs::write(&items_file, "[]").map_err(|error| {
            format!(
                "Failed to initialize item storage at {}: {}",
                items_file.display(),
                error
            )
        })?;
    }

    if !profile_file.exists() {
        let profile = serde_json::to_string_pretty(&UserProfile {
            name: "User".into(),
            profile_picture: String::new(),
        })
        .map_err(|error| format!("Failed to serialize initial profile: {}", error))?;

        fs::write(&profile_file, profile).map_err(|error| {
            format!(
                "Failed to initialize profile storage at {}: {}",
                profile_file.display(),
                error
            )
        })?;
    }

    resolved
        .canonicalize()
        .or(Ok::<PathBuf, std::io::Error>(resolved))
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|error| format!("Failed to resolve vault path: {}", error))
}

#[tauri::command]
fn load_inbox_items(path: &str) -> Result<Vec<CaptureItem>, String> {
    let resolved = expand_home(path.trim())?;
    let inbox_file = resolved.join(".inbox").join("inbox.json");

    if !inbox_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&inbox_file).map_err(|error| {
        format!(
            "Failed to read inbox storage at {}: {}",
            inbox_file.display(),
            error
        )
    })?;

    serde_json::from_str::<Vec<CaptureItem>>(&content).map_err(|error| {
        format!(
            "Failed to parse inbox storage at {}: {}",
            inbox_file.display(),
            error
        )
    })
}

#[tauri::command]
fn save_inbox_items(path: &str, items: Vec<CaptureItem>) -> Result<(), String> {
    let resolved = expand_home(path.trim())?;
    let inbox_file = resolved.join(".inbox").join("inbox.json");
    let serialized = serde_json::to_string_pretty(&items)
        .map_err(|error| format!("Failed to serialize inbox items: {}", error))?;

    fs::write(&inbox_file, serialized).map_err(|error| {
        format!(
            "Failed to write inbox storage at {}: {}",
            inbox_file.display(),
            error
        )
    })
}

#[tauri::command]
fn load_tasks(path: &str) -> Result<Vec<TaskItem>, String> {
    let resolved = expand_home(path.trim())?;
    let tasks_file = resolved.join(".tasks").join("tasks.json");

    if !tasks_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&tasks_file).map_err(|error| {
        format!(
            "Failed to read task storage at {}: {}",
            tasks_file.display(),
            error
        )
    })?;

    serde_json::from_str::<Vec<TaskItem>>(&content).map_err(|error| {
        format!(
            "Failed to parse task storage at {}: {}",
            tasks_file.display(),
            error
        )
    })
}

#[tauri::command]
fn save_tasks(path: &str, tasks: Vec<TaskItem>) -> Result<(), String> {
    let resolved = expand_home(path.trim())?;
    let tasks_file = resolved.join(".tasks").join("tasks.json");
    let serialized = serde_json::to_string_pretty(&tasks)
        .map_err(|error| format!("Failed to serialize tasks: {}", error))?;

    fs::write(&tasks_file, serialized).map_err(|error| {
        format!(
            "Failed to write task storage at {}: {}",
            tasks_file.display(),
            error
        )
    })
}

#[tauri::command]
fn load_goals(path: &str) -> Result<Vec<GoalItem>, String> {
    let resolved = expand_home(path.trim())?;
    let goals_file = resolved.join(".goals").join("goals.json");

    if !goals_file.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&goals_file).map_err(|error| {
        format!(
            "Failed to read goal storage at {}: {}",
            goals_file.display(),
            error
        )
    })?;

    serde_json::from_str::<Vec<GoalItem>>(&content).map_err(|error| {
        format!(
            "Failed to parse goal storage at {}: {}",
            goals_file.display(),
            error
        )
    })
}

#[tauri::command]
fn save_goals(path: &str, goals: Vec<GoalItem>) -> Result<(), String> {
    let resolved = expand_home(path.trim())?;
    let goals_file = resolved.join(".goals").join("goals.json");
    let serialized = serde_json::to_string_pretty(&goals)
        .map_err(|error| format!("Failed to serialize goals: {}", error))?;

    fs::write(&goals_file, serialized).map_err(|error| {
        format!(
            "Failed to write goal storage at {}: {}",
            goals_file.display(),
            error
        )
    })
}

#[tauri::command]
fn load_items(path: &str) -> Result<Vec<Item>, String> {
    let resolved = expand_home(path.trim())?;
    let items_file = resolved.join(".items").join("items.json");

    if items_file.exists() {
        let content = fs::read_to_string(&items_file).map_err(|error| {
            format!(
                "Failed to read item storage at {}: {}",
                items_file.display(),
                error
            )
        })?;

        let items = serde_json::from_str::<Vec<Item>>(&content).map_err(|error| {
            format!(
                "Failed to parse item storage at {}: {}",
                items_file.display(),
                error
            )
        })?;

        if !items.is_empty() {
            return Ok(items);
        }
    }

    migrate_legacy_items(&resolved)
}

#[tauri::command]
fn save_items(path: &str, items: Vec<Item>) -> Result<(), String> {
    let resolved = expand_home(path.trim())?;
    let items_file = resolved.join(".items").join("items.json");
    let serialized = serde_json::to_string_pretty(&items)
        .map_err(|error| format!("Failed to serialize items: {}", error))?;

    fs::write(&items_file, serialized).map_err(|error| {
        format!(
            "Failed to write item storage at {}: {}",
            items_file.display(),
            error
        )
    })
}

fn migrate_legacy_items(resolved: &Path) -> Result<Vec<Item>, String> {
    let inbox_file = resolved.join(".inbox").join("inbox.json");
    let tasks_file = resolved.join(".tasks").join("tasks.json");
    let goals_file = resolved.join(".goals").join("goals.json");
    let mut items: Vec<Item> = Vec::new();

    if inbox_file.exists() {
        let content = fs::read_to_string(&inbox_file).map_err(|error| {
            format!(
                "Failed to read inbox storage at {}: {}",
                inbox_file.display(),
                error
            )
        })?;
        let captures = serde_json::from_str::<Vec<CaptureItem>>(&content).map_err(|error| {
            format!(
                "Failed to parse inbox storage at {}: {}",
                inbox_file.display(),
                error
            )
        })?;

        items.extend(captures.into_iter().map(|capture| Item {
            id: capture.id,
            kind: "capture".into(),
            state: "inbox".into(),
            source_type: "capture".into(),
            title: capture.text.clone(),
            content: capture.text,
            created_at: capture.created_at,
            updated_at: String::from(""),
            tags: capture.tags,
            project: capture.project.unwrap_or_default(),
            task_status: "inbox".into(),
            priority: String::new(),
            due_date: String::new(),
            estimate: String::new(),
            goal_metric_type: "tasks_completed".into(),
            goal_target_value: 1,
            goal_period: "weekly".into(),
        }));
    }

    if tasks_file.exists() {
        let content = fs::read_to_string(&tasks_file).map_err(|error| {
            format!(
                "Failed to read task storage at {}: {}",
                tasks_file.display(),
                error
            )
        })?;
        let tasks = serde_json::from_str::<Vec<TaskItem>>(&content).map_err(|error| {
            format!(
                "Failed to parse task storage at {}: {}",
                tasks_file.display(),
                error
            )
        })?;

        items.extend(tasks.into_iter().map(|task| Item {
            id: task.id,
            kind: "task".into(),
            state: "active".into(),
            source_type: "manual".into(),
            title: task.title,
            content: task.notes,
            created_at: task.created_at,
            updated_at: String::new(),
            tags: task.tags,
            project: task.project,
            task_status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            estimate: task.estimate,
            goal_metric_type: "tasks_completed".into(),
            goal_target_value: 1,
            goal_period: "weekly".into(),
        }));
    }

    if goals_file.exists() {
        let content = fs::read_to_string(&goals_file).map_err(|error| {
            format!(
                "Failed to read goal storage at {}: {}",
                goals_file.display(),
                error
            )
        })?;
        let goals = serde_json::from_str::<Vec<GoalItem>>(&content).map_err(|error| {
            format!(
                "Failed to parse goal storage at {}: {}",
                goals_file.display(),
                error
            )
        })?;

        items.extend(goals.into_iter().map(|goal| Item {
            id: goal.id,
            kind: "goal".into(),
            state: if goal.status == "archived" {
                "archived".into()
            } else {
                "active".into()
            },
            source_type: "manual".into(),
            title: goal.title,
            content: goal.description,
            created_at: goal.created_at,
            updated_at: String::new(),
            tags: if goal.tag_filter.is_empty() {
                Vec::new()
            } else {
                vec![goal.tag_filter]
            },
            project: goal.project,
            task_status: "inbox".into(),
            priority: String::new(),
            due_date: String::new(),
            estimate: String::new(),
            goal_metric_type: goal.metric_type,
            goal_target_value: goal.target_value,
            goal_period: goal.period,
        }));
    }

    Ok(items)
}

#[tauri::command]
fn load_profile(path: &str) -> Result<Option<UserProfile>, String> {
    let resolved = expand_home(path.trim())?;
    let profile_file = resolved.join(".profile").join("profile.json");

    if !profile_file.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&profile_file).map_err(|error| {
        format!(
            "Failed to read profile storage at {}: {}",
            profile_file.display(),
            error
        )
    })?;

    serde_json::from_str::<UserProfile>(&content)
        .map(Some)
        .map_err(|error| {
            format!(
                "Failed to parse profile storage at {}: {}",
                profile_file.display(),
                error
            )
        })
}

#[tauri::command]
fn save_profile(path: &str, profile: UserProfile) -> Result<(), String> {
    let resolved = expand_home(path.trim())?;
    let profile_file = resolved.join(".profile").join("profile.json");
    let serialized = serde_json::to_string_pretty(&profile)
        .map_err(|error| format!("Failed to serialize profile: {}", error))?;

    fs::write(&profile_file, serialized).map_err(|error| {
        format!(
            "Failed to write profile storage at {}: {}",
            profile_file.display(),
            error
        )
    })
}

fn expand_home(input: &str) -> Result<PathBuf, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            initialize_vault,
            load_inbox_items,
            save_inbox_items,
            load_tasks,
            save_tasks,
            load_goals,
            save_goals,
            load_items,
            save_items,
            load_profile,
            save_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
