use crate::persistence::database::Database;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const APP_DB_NAME: &str = "lira.sqlite3";

pub fn initialize_vault(path: &str) -> Result<String, String> {
    let resolved = resolve_vault_path(path.trim())?;

    fs::create_dir_all(&resolved).map_err(|error| {
        format!(
            "Failed to create vault directory at {}: {}",
            resolved.display(),
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

pub fn open_database_from_input(path: &str) -> Result<Database, String> {
    open_database(&resolve_vault_path(path.trim())?)
}

pub fn open_database(vault_path: &Path) -> Result<Database, String> {
    let db_path = vault_path.join(APP_DB_NAME);

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to prepare vault directory at {}: {}",
                parent.display(),
                error
            )
        })?;
    }

    migrate_legacy_database_if_needed(vault_path, &db_path)?;

    Database::open(&db_path)
}

pub fn resolve_vault_path(input: &str) -> Result<PathBuf, String> {
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

fn migrate_legacy_database_if_needed(vault_path: &Path, db_path: &Path) -> Result<(), String> {
    if db_path.exists() {
        return Ok(());
    }

    let Some(legacy_db_path) = find_legacy_database_path(vault_path)? else {
        return Ok(());
    };

    fs::rename(&legacy_db_path, db_path).map_err(|error| {
        format!(
            "Failed to migrate legacy SQLite database from {} to {}: {}",
            legacy_db_path.display(),
            db_path.display(),
            error
        )
    })
}

fn find_legacy_database_path(vault_path: &Path) -> Result<Option<PathBuf>, String> {
    let entries = fs::read_dir(vault_path).map_err(|error| {
        format!(
            "Failed to inspect vault directory at {}: {}",
            vault_path.display(),
            error
        )
    })?;

    let mut matches = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|error| format!("Failed to inspect vault contents: {}", error))?;
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };

        if !path.is_dir() || !file_name.starts_with('.') || file_name == ".lira" {
            continue;
        }

        let Some(stem) = file_name.strip_prefix('.') else {
            continue;
        };

        let candidate = path.join(format!("{stem}.sqlite3"));

        if candidate.is_file() {
            matches.push(candidate);
        }
    }

    if matches.len() == 1 {
        Ok(matches.pop())
    } else {
        Ok(None)
    }
}
