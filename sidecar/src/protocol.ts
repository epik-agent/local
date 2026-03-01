/**
 * Newline-delimited JSON IPC protocol between the Rust backend and the
 * Node.js sidecar.
 *
 * Rust writes requests to the sidecar's stdin; the sidecar writes events to
 * its stdout.  All messages are separated by a single newline character.
 */

// ---------------------------------------------------------------------------
// Requests (stdin — Rust → Node.js)
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SendMessageRequest {
  type: "send_message";
  request_id: string;
  message: string;
  history?: ConversationTurn[];
}

export interface CancelRequest {
  type: "cancel";
  request_id: string;
}

export interface ShutdownRequest {
  type: "shutdown";
}

export type SidecarRequest = SendMessageRequest | CancelRequest | ShutdownRequest;

// ---------------------------------------------------------------------------
// Events (stdout — Node.js → Rust)
// ---------------------------------------------------------------------------

export interface ReadyEvent {
  type: "ready";
}

export interface TokenEvent {
  type: "token";
  request_id: string;
  token: string;
}

export interface CompleteEvent {
  type: "complete";
  request_id: string;
  full_text: string;
}

export interface ErrorEvent {
  type: "error";
  request_id: string;
  message: string;
}

export type SidecarEvent = ReadyEvent | TokenEvent | CompleteEvent | ErrorEvent;
