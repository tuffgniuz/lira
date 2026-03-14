use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CaptureItem {
    id: String,
    text: String,
    created_at: String,
    tags: Vec<String>,
    project: Option<String>,
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

    fs::create_dir_all(resolved.join("notes")).map_err(|error| {
        format!(
            "Failed to initialize notes directory at {}: {}",
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

    if !inbox_file.exists() {
        fs::write(&inbox_file, "[]").map_err(|error| {
            format!(
                "Failed to initialize inbox storage at {}: {}",
                inbox_file.display(),
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
            save_inbox_items
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
