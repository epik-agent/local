import type { ConversationTurn, TokenEvent, CompleteEvent, ErrorEvent } from "./protocol.js";

export type TokenCallback = (event: TokenEvent) => void;
export type CompleteCallback = (event: CompleteEvent) => void;
export type ErrorCallback = (event: ErrorEvent) => void;

export interface StreamCallbacks {
  onToken: TokenCallback;
  onComplete: CompleteCallback;
  onError: ErrorCallback;
}

/**
 * Stream a Claude response for the given message using the Claude Code SDK.
 *
 * Emits token, complete, and error events through the provided callbacks.
 * The AbortSignal allows the caller to cancel the stream mid-flight.
 *
 * @param requestId  - Opaque identifier echoed in all emitted events.
 * @param message    - The user message to send to Claude.
 * @param history    - Prior conversation turns to include as context.
 * @param callbacks  - Callbacks for token, complete, and error events.
 * @param signal     - AbortSignal to cancel the stream.
 */
export async function streamClaudeResponse(
  requestId: string,
  message: string,
  history: ConversationTurn[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Lazily import the Claude Code SDK so the sidecar can start up quickly and
  // only load the SDK when the first message is sent.
  const { query } = await import("@anthropic-ai/claude-code");

  const prompt = buildPrompt(message, history);
  let fullText = "";

  try {
    for await (const event of query({
      prompt,
      abortController: signal !== undefined ? { signal } : undefined,
    })) {
      if (signal?.aborted === true) {
        break;
      }

      if (event.type === "assistant" && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            fullText += block.text;
            callbacks.onToken({
              type: "token",
              request_id: requestId,
              token: block.text,
            });
          }
        }
      }
    }

    if (signal?.aborted !== true) {
      callbacks.onComplete({
        type: "complete",
        request_id: requestId,
        full_text: fullText,
      });
    }
  } catch (err) {
    const message_text = err instanceof Error ? err.message : String(err);
    callbacks.onError({
      type: "error",
      request_id: requestId,
      message: message_text,
    });
  }
}

/**
 * Build a single prompt string from a message and optional conversation history.
 *
 * The Claude Code SDK's ``query`` function accepts a single prompt string.
 * When history is provided it is prepended as a simple conversation log so
 * Claude has context from prior turns.
 */
function buildPrompt(message: string, history: ConversationTurn[]): string {
  if (history.length === 0) {
    return message;
  }

  const lines: string[] = [];
  for (const turn of history) {
    const role = turn.role === "user" ? "Human" : "Assistant";
    lines.push(`${role}: ${turn.content}`);
  }
  lines.push(`Human: ${message}`);
  return lines.join("\n\n");
}
