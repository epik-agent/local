import type { SidecarEvent, SidecarRequest } from "./protocol.js";

export type RequestHandler = (request: SidecarRequest) => void;

/**
 * Write a sidecar event to stdout as a newline-delimited JSON line.
 */
export function writeEvent(event: SidecarEvent): void {
  const line = JSON.stringify(event) + "\n";
  process.stdout.write(line);
}

/**
 * Parse a line of stdin text into a SidecarRequest.
 *
 * Returns null if the line is not valid JSON or does not match a known request
 * type.
 */
export function parseLine(line: string): SidecarRequest | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj["type"] !== "string") {
    return null;
  }

  const type = obj["type"];
  if (type !== "send_message" && type !== "cancel" && type !== "shutdown") {
    return null;
  }

  return parsed as SidecarRequest;
}

/**
 * Start listening for newline-delimited JSON requests on stdin and invoke the
 * handler for each valid request.
 *
 * The returned cleanup function removes all stdin listeners.
 */
export function listenStdin(handler: RequestHandler): () => void {
  let buffer = "";

  const onData = (chunk: Buffer | string): void => {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = buffer.split("\n");
    // The last element is an incomplete line (no trailing newline yet)
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const request = parseLine(line);
      if (request !== null) {
        handler(request);
      }
    }
  };

  const onEnd = (): void => {
    // Process any remaining buffered content when stdin closes
    if (buffer.trim().length > 0) {
      const request = parseLine(buffer);
      if (request !== null) {
        handler(request);
      }
      buffer = "";
    }
  };

  process.stdin.on("data", onData);
  process.stdin.on("end", onEnd);

  return () => {
    process.stdin.removeListener("data", onData);
    process.stdin.removeListener("end", onEnd);
  };
}
