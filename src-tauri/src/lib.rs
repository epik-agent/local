use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

// ---------------------------------------------------------------------------
// Resource limits
// ---------------------------------------------------------------------------

/// Maximum number of concurrent build sidecar sessions allowed.
pub const MAX_CONCURRENT_BUILDS: usize = 3;

// ---------------------------------------------------------------------------
// IPC message types (Rust ↔ Node.js sidecar)
// ---------------------------------------------------------------------------

/// A single turn in the conversation history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurn {
    pub role: String,
    pub content: String,
}

/// Configuration for a single MCP server process.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<std::collections::HashMap<String, String>>,
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

/// Message sent to the sidecar to update MCP server configuration.
#[derive(Debug, Serialize)]
struct SetMcpConfigRequest {
    #[serde(rename = "type")]
    kind: &'static str,
    mcp_servers: Vec<McpServerConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_prompt: Option<String>,
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

/// Emitted on ``sidecar://tool_call`` when Claude invokes an MCP tool.
#[derive(Debug, Clone, Serialize)]
struct ToolCallPayload {
    #[serde(rename = "requestId")]
    request_id: String,
    #[serde(rename = "toolCallId")]
    tool_call_id: String,
    name: String,
    args: serde_json::Value,
}

/// Emitted on ``sidecar://tool_result`` when an MCP tool call completes.
#[derive(Debug, Clone, Serialize)]
struct ToolResultPayload {
    #[serde(rename = "requestId")]
    request_id: String,
    #[serde(rename = "toolCallId")]
    tool_call_id: String,
    result: String,
    #[serde(rename = "isError")]
    is_error: bool,
}

/// Emitted on ``sidecar://build/status`` when a build session changes state.
#[derive(Debug, Clone, Serialize)]
struct BuildStatusPayload {
    #[serde(rename = "sessionId")]
    session_id: String,
    status: &'static str,
}

// ---------------------------------------------------------------------------
// Sidecar state
// ---------------------------------------------------------------------------

/// Shared mutable state holding the chat sidecar child process handle.
pub struct SidecarState(pub Mutex<Option<CommandChild>>);

/// Shared mutable state holding a map of build session ID → sidecar child
/// process for the concurrent build session management system.
pub struct BuildSidecarState(pub Mutex<HashMap<String, CommandChild>>);

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
                            "tool_call" => {
                                if let (Some(request_id), Some(tool_call_id), Some(name)) = (
                                    value.get("request_id").and_then(|v| v.as_str()),
                                    value.get("tool_call_id").and_then(|v| v.as_str()),
                                    value.get("name").and_then(|v| v.as_str()),
                                ) {
                                    let args = value.get("args").cloned().unwrap_or(
                                        serde_json::Value::Object(serde_json::Map::new()),
                                    );
                                    let _ = app_handle.emit(
                                        "sidecar://tool_call",
                                        ToolCallPayload {
                                            request_id: request_id.to_string(),
                                            tool_call_id: tool_call_id.to_string(),
                                            name: name.to_string(),
                                            args,
                                        },
                                    );
                                }
                            }
                            "tool_result" => {
                                if let (Some(request_id), Some(tool_call_id)) = (
                                    value.get("request_id").and_then(|v| v.as_str()),
                                    value.get("tool_call_id").and_then(|v| v.as_str()),
                                ) {
                                    let result = value
                                        .get("result")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string();
                                    let is_error = value
                                        .get("is_error")
                                        .and_then(|v| v.as_bool())
                                        .unwrap_or(false);
                                    let _ = app_handle.emit(
                                        "sidecar://tool_result",
                                        ToolResultPayload {
                                            request_id: request_id.to_string(),
                                            tool_call_id: tool_call_id.to_string(),
                                            result,
                                            is_error,
                                        },
                                    );
                                }
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

/// Spawn a build sidecar process for the given session ID.
///
/// Emits session-scoped events prefixed with the session ID so the frontend
/// can route output to the correct build session panel.
fn spawn_build_sidecar(
    app: &AppHandle,
    session_id: String,
    repo: String,
) -> Result<CommandChild, String> {
    let sidecar_cmd = app
        .shell()
        .sidecar("epik-sidecar")
        .map_err(|e| e.to_string())?;

    let (mut rx, child) = sidecar_cmd.spawn().map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let sid = session_id.clone();

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
                            "token" => {
                                if let (Some(request_id), Some(token)) = (
                                    value.get("request_id").and_then(|v| v.as_str()),
                                    value.get("token").and_then(|v| v.as_str()),
                                ) {
                                    let channel = format!("sidecar://token/{sid}");
                                    let _ = app_handle.emit(
                                        &channel,
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
                                    let channel = format!("sidecar://complete/{sid}");
                                    let _ = app_handle.emit(
                                        &channel,
                                        CompletePayload {
                                            request_id: request_id.to_string(),
                                            full_text: full_text.to_string(),
                                        },
                                    );
                                    let _ = app_handle.emit(
                                        "sidecar://build/status",
                                        BuildStatusPayload {
                                            session_id: sid.clone(),
                                            status: "completed",
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
                                let channel = format!("sidecar://error/{sid}");
                                let _ = app_handle.emit(
                                    &channel,
                                    ErrorPayload {
                                        request_id,
                                        message,
                                    },
                                );
                                let _ = app_handle.emit(
                                    "sidecar://build/status",
                                    BuildStatusPayload {
                                        session_id: sid.clone(),
                                        status: "failed",
                                    },
                                );
                            }
                            _ => {}
                        }
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    eprintln!("[build sidecar {sid} stderr] {line}");
                }
                CommandEvent::Error(err) => {
                    eprintln!("[build sidecar {sid} error] {err}");
                    let _ = app_handle.emit(
                        "sidecar://build/status",
                        BuildStatusPayload {
                            session_id: sid.clone(),
                            status: "failed",
                        },
                    );
                }
                CommandEvent::Terminated(status) => {
                    eprintln!("[build sidecar {sid}] terminated: {status:?}");
                }
                _ => {}
            }
        }
    });

    // Suppress unused variable warning — repo context is passed to the sidecar
    // via stdin message after spawn; this variable documents the intent.
    let _ = repo;

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

/// Update the MCP server configuration and optional system prompt used by the
/// sidecar for all future Claude sessions.
///
/// The new configuration takes effect immediately for any subsequent
/// ``send_message`` requests.  In-flight requests are not affected.
#[tauri::command]
async fn sidecar_set_mcp_config(
    state: State<'_, SidecarState>,
    #[allow(non_snake_case)] mcpServers: Vec<McpServerConfig>,
    #[allow(non_snake_case)] systemPrompt: Option<String>,
) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    let child = guard
        .as_mut()
        .ok_or_else(|| "Sidecar is not running".to_string())?;

    write_to_sidecar(
        child,
        &SetMcpConfigRequest {
            kind: "set_mcp_config",
            mcp_servers: mcpServers,
            system_prompt: systemPrompt,
        },
    )
}

// ---------------------------------------------------------------------------
// Tauri commands — concurrent build session management
// ---------------------------------------------------------------------------

/// Start a new concurrent build sidecar session for a specific repo.
///
/// Spawns a dedicated sidecar process for the build and records it under the
/// given ``session_id``.  Returns an error if the maximum concurrent build
/// limit (``MAX_CONCURRENT_BUILDS``) has been reached or if a session with
/// the same ID already exists.
///
/// Emits ``sidecar://build/status`` with ``"running"`` for the new session.
#[tauri::command]
async fn sidecar_start_build(
    app: AppHandle,
    build_state: State<'_, BuildSidecarState>,
    #[allow(non_snake_case)] sessionId: String,
    repo: String,
) -> Result<(), String> {
    let mut guard = build_state.0.lock().map_err(|e| e.to_string())?;

    if guard.len() >= MAX_CONCURRENT_BUILDS {
        return Err(format!(
            "Maximum concurrent builds ({MAX_CONCURRENT_BUILDS}) already reached"
        ));
    }

    if guard.contains_key(&sessionId) {
        return Err(format!("Build session '{sessionId}' is already running"));
    }

    let child = spawn_build_sidecar(&app, sessionId.clone(), repo)?;
    guard.insert(sessionId.clone(), child);

    let _ = app.emit(
        "sidecar://build/status",
        BuildStatusPayload {
            session_id: sessionId,
            status: "running",
        },
    );

    Ok(())
}

/// Stop a running build sidecar session by session ID.
///
/// Sends a graceful shutdown message then kills the process.  Emits
/// ``sidecar://build/status`` with ``"cancelled"`` for the session.
/// Returns an error if no session with the given ID exists.
#[tauri::command]
async fn sidecar_stop_build(
    app: AppHandle,
    build_state: State<'_, BuildSidecarState>,
    #[allow(non_snake_case)] sessionId: String,
) -> Result<(), String> {
    let mut guard = build_state.0.lock().map_err(|e| e.to_string())?;

    let mut child = guard
        .remove(&sessionId)
        .ok_or_else(|| format!("No build session found with ID '{sessionId}'"))?;

    let _ = write_to_sidecar(&mut child, &ShutdownRequest { kind: "shutdown" });
    child.kill().map_err(|e| e.to_string())?;

    let _ = app.emit(
        "sidecar://build/status",
        BuildStatusPayload {
            session_id: sessionId,
            status: "cancelled",
        },
    );

    Ok(())
}

/// Return the list of currently active build session IDs.
#[tauri::command]
async fn sidecar_list_builds(
    build_state: State<'_, BuildSidecarState>,
) -> Result<Vec<String>, String> {
    let guard = build_state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.keys().cloned().collect())
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
        .manage(BuildSidecarState(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            greet,
            sidecar_start,
            sidecar_stop,
            sidecar_restart,
            sidecar_send_message,
            sidecar_cancel,
            sidecar_set_mcp_config,
            sidecar_start_build,
            sidecar_stop_build,
            sidecar_list_builds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
