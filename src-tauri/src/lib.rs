mod commands;
mod db;
mod error;
mod models;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Get app data directory
            let app_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app data dir: {}", e))?;

            // Create app data directory if it doesn't exist
            std::fs::create_dir_all(&app_dir)
                .map_err(|e| format!("Failed to create app data dir: {}", e))?;

            let db_path = app_dir.join("eventually.db");

            // Initialize database pool
            let pool = tauri::async_runtime::block_on(async {
                db::create_pool(db_path)
                    .await
                    .map_err(|e| format!("Failed to create database pool: {:?}", e))
            })?;

            // Run migrations
            tauri::async_runtime::block_on(async {
                db::run_migrations(&pool)
                    .await
                    .map_err(|e| format!("Failed to run migrations: {:?}", e))
            })?;

            // Manage state
            app.manage(pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::create_task,
            commands::tasks::get_all_tasks,
            commands::tasks::get_task_tree,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::reorder_task,
            commands::categories::create_category,
            commands::categories::get_all_categories,
            commands::categories::update_category,
            commands::categories::delete_category,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
