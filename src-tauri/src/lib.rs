/// Greet command — placeholder IPC endpoint for frontend/sidecar communication.
///
/// Returns a greeting string that the frontend can display. This command demonstrates
/// the Tauri IPC bridge and serves as a placeholder until sidecar integration is added.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to Epik.")
}

/// Application entry point called from main.rs.
///
/// Initialises the Tauri application, registers all commands, and starts the event loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
