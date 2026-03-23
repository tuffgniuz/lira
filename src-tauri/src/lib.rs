use tauri::Manager;
mod application;
mod commands;
mod persistence;
mod transport;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            app.get_webview_window("main")
                .unwrap()
                .set_focus()
                .unwrap();
        }))
        .invoke_handler(tauri::generate_handler![
            commands::vault::initialize_vault,
            commands::workspace::load_workspace_items,
            commands::workspace::replace_workspace_items,
            commands::tasks::list_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::captures::list_captures,
            commands::captures::create_capture,
            commands::captures::update_capture,
            commands::captures::process_capture,
            commands::goals::list_goals,
            commands::goals::create_goal,
            commands::goals::update_goal,
            commands::goals::log_goal_progress,
            commands::profile::load_profile,
            commands::profile::save_profile,
            commands::projects::load_projects,
            commands::projects::save_projects
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod persistence_tests;

#[cfg(test)]
mod refactor_structure_tests;

#[cfg(test)]
mod workspace_item_tests;
