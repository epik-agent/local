use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// ---------------------------------------------------------------------------
// IPC message types (Rust ↔ Node.js sidecar)
// ---------------------------------------------------------------------------

/// A single turn in the conversation history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurn {
    pub role: String,
    pub content: String,
}

/// Message sent to the sidecar to start a streaming Claude session.
#[derive(Debug, Serialize)]
struct SendMessageRequest {
    #[serde(rename = "type")]
    kind: &'static str,
    request_id: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    history: Option<Vec<ConversationTurn>>,
}

/// Message sent to the sidecar to cancel an in-flight request.
#[derive(Debug, Serialize)]
struct CancelRequest {
    #[serde(rename = "type")]
    kind: &'static str,
    request_id: String,
}

/// Message sent to the sidecar to request graceful shutdown.
#[derive(Debug, Serialize)]
struct ShutdownRequest {
    #[serde(rename = "type")]
    kind: &'static str,
}

// ---------------------------------------------------------------------------
// Tauri event payloads (Rust → frontend)
// ---------------------------------------------------------------------------

/// Emitted on ``sidecar://status`` when the sidecar process state changes.
#[derive(Debug, Clone, Serialize)]
struct StatusPayload {
    status: &'static str,
}

/// Emitted on ``sidecar://token`` when a streaming token arrives.
#[derive(Debug, Clone, Serialize)]
struct TokenPayload {
    #[serde(rename = "requestId")]
    request_id: String,
    token: String,
}

/// Emitted on ``sidecar://complete`` when a streaming response finishes.
#[derive(Debug, Clone, Serialize)]
struct CompletePayload {
    #[serde(rename = "requestId")]
    request_id: String,
    #[serde(rename = "fullText")]
    full_text: String,
}

/// Emitted on ``sidecar://error`` when an error occurs in the sidecar.
#[derive(Debug, Clone, Serialize)]
struct ErrorPayload {
    #[serde(rename = "requestId")]
    request_id: String,
    message: String,
}

// ---------------------------------------------------------------------------
// Sidecar state
// ---------------------------------------------------------------------------

/// Shared mutable state holding the sidecar child process handle.
pub struct SidecarState(pub Mutex<Option<CommandChild>>);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Write a JSON-serialisable message to the sidecar's stdin followed by a
/// newline (newline-delimited JSON protocol).
fn write_to_sidecar<T: Serialize>(child: &mut CommandChild, msg: &T) -> Result<(), String> {
    let json = serde_json::to_string(msg).map_err(|e| e.to_string())?;
    let line = format!("{json}\n");
    child.write(line.as_bytes()).map_err(|e| e.to_string())
}

/// Spawn the sidecar process, register stdout/stderr event listeners that
/// forward sidecar events to the frontend, and return the ``CommandChild``.
fn spawn_sidecar(app: &AppHandle) -> Result<CommandChild, String> {
    let sidecar_cmd = app
        .shell()
        .sidecar("epik-sidecar")
        .map_err(|e| e.to_string())?;

    let (mut rx, child) = sidecar_cmd.spawn().map_err(|e| e.to_string())?;

    let app_handle = app.clone();

    // Spawn a Tokio task to read sidecar stdout/stderr and forward events to
    // the frontend via Tauri's event system.
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&line) {
                        let event_type = value
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();

                        match event_type.as_str() {
                            "ready" => {
                                let _ = app_handle
                                    .emit("sidecar://status", StatusPayload { status: "ready" });
                            }
                            "token" => {
                                if let (Some(request_id), Some(token)) = (
                                    value.get("request_id").and_then(|v| v.as_str()),
                                    value.get("token").and_then(|v| v.as_str()),
                                ) {
                                    let _ = app_handle.emit(
                                        "sidecar://token",
                                        TokenPayload {
                                            request_id: request_id.to_string(),
                                            token: token.to_string(),
                                        },
                                    );
                                }
                            }
                            "complete" => {
                                if let (Some(request_id), Some(full_text)) = (
                                    value.get("request_id").and_then(|v| v.as_str()),
                                    value.get("full_text").and_then(|v| v.as_str()),
                                ) {
                                    let _ = app_handle.emit(
                                        "sidecar://complete",
                                        CompletePayload {
                                            request_id: request_id.to_string(),
                                            full_text: full_text.to_string(),
                                        },
                                    );
                                }
                            }
                            "error" => {
                                let request_id = value
                                    .get("request_id")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                let message = value
                                    .get("message")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown sidecar error")
                                    .to_string();
                                let _ = app_handle.emit(
                                    "sidecar://error",
                                    ErrorPayload {
                                        request_id,
                                        message,
                                    },
                                );
                            }
                            _ => {}
                        }
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    eprintln!("[sidecar stderr] {line}");
                }
                CommandEvent::Error(err) => {
                    eprintln!("[sidecar error] {err}");
                    let _ = app_handle.emit("sidecar://status", StatusPayload { status: "error" });
                }
                CommandEvent::Terminated(status) => {
                    eprintln!("[sidecar] terminated: {status:?}");
                    let _ =
                        app_handle.emit("sidecar://status", StatusPayload { status: "stopped" });
                }
                _ => {}
            }
        }
    });

    Ok(child)
}

// ---------------------------------------------------------------------------
// Tauri commands — sidecar lifecycle
// ---------------------------------------------------------------------------

/// Start the sidecar process.
///
/// Emits ``sidecar://status`` with ``"starting"`` immediately, then the sidecar
/// forwards its own ``"ready"`` event once it has initialised.
#[tauri::command]
async fn sidecar_start(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    let _ = app.emit("sidecar://status", StatusPayload { status: "starting" });

    let child = spawn_sidecar(&app)?;

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(child);

    Ok(())
}

/// Stop the sidecar process.
///
/// Sends a graceful ``shutdown`` message then kills the process.
#[tauri::command]
async fn sidecar_stop(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(mut child) = guard.take() {
        // Best-effort graceful shutdown
        let _ = write_to_sidecar(&mut child, &ShutdownRequest { kind: "shutdown" });
        child.kill().map_err(|e| e.to_string())?;
    }

    let _ = app.emit("sidecar://status", StatusPayload { status: "stopped" });

    Ok(())
}

/// Restart the sidecar process (stop then start).
#[tauri::command]
async fn sidecar_restart(app: AppHandle, state: State<'_, SidecarState>) -> Result<(), String> {
    // Stop existing process if any
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = guard.take() {
            let _ = write_to_sidecar(&mut child, &ShutdownRequest { kind: "shutdown" });
            let _ = child.kill();
        }
    }

    let _ = app.emit("sidecar://status", StatusPayload { status: "starting" });

    let child = spawn_sidecar(&app)?;

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(child);

    Ok(())
}

// ---------------------------------------------------------------------------
// Tauri commands — messaging
// ---------------------------------------------------------------------------

/// Send a message to Claude via the sidecar.
///
/// The sidecar will emit ``token``, ``complete``, and/or ``error`` events on
/// stdout which are forwarded to the frontend as Tauri events.
#[tauri::command]
async fn sidecar_send_message(
    state: State<'_, SidecarState>,
    #[allow(non_snake_case)] requestId: String,
    message: String,
    history: Option<Vec<ConversationTurn>>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    let child = guard
        .as_mut()
        .ok_or_else(|| "Sidecar is not running".to_string())?;

    write_to_sidecar(
        child,
        &SendMessageRequest {
            kind: "send_message",
            request_id: requestId,
            message,
            history,
        },
    )
}

/// Cancel an in-flight streaming request.
#[tauri::command]
async fn sidecar_cancel(
    state: State<'_, SidecarState>,
    #[allow(non_snake_case)] requestId: String,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    let child = guard
        .as_mut()
        .ok_or_else(|| "Sidecar is not running".to_string())?;

    write_to_sidecar(
        child,
        &CancelRequest {
            kind: "cancel",
            request_id: requestId,
        },
    )
}

// ---------------------------------------------------------------------------
// Placeholder / legacy commands
// ---------------------------------------------------------------------------

/// Greet command — kept for backwards-compatibility with the scaffold.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to Epik.")
}

// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

/// Application entry point called from main.rs.
///
/// Initialises the Tauri application, registers all commands, manages the
/// sidecar state, and starts the event loop.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            greet,
            sidecar_start,
            sidecar_stop,
            sidecar_restart,
            sidecar_send_message,
            sidecar_cancel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
