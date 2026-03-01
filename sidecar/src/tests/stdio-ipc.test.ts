import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseLine, writeEvent } from "../stdio-ipc.js";
import type { SidecarEvent } from "../protocol.js";

describe("parseLine", () => {
  it("returns null for empty string", () => {
    expect(parseLine("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseLine("   ")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseLine("{not json}")).toBeNull();
  });

  it("returns null for JSON that is not an object", () => {
    expect(parseLine('"string"')).toBeNull();
    expect(parseLine("42")).toBeNull();
    expect(parseLine("null")).toBeNull();
    expect(parseLine("[1,2,3]")).toBeNull();
  });

  it("returns null for object without a type field", () => {
    expect(parseLine('{"message":"hello"}')).toBeNull();
  });

  it("returns null for unknown type", () => {
    expect(parseLine('{"type":"unknown"}')).toBeNull();
  });

  it("parses a send_message request", () => {
    const line = JSON.stringify({ type: "send_message", request_id: "r1", message: "Hello" });
    const result = parseLine(line);
    expect(result).toEqual({ type: "send_message", request_id: "r1", message: "Hello" });
  });

  it("parses a send_message request with history", () => {
    const line = JSON.stringify({
      type: "send_message",
      request_id: "r2",
      message: "Follow up",
      history: [{ role: "user", content: "Hi" }],
    });
    const result = parseLine(line);
    expect(result).toMatchObject({ type: "send_message", request_id: "r2" });
  });

  it("parses a cancel request", () => {
    const line = JSON.stringify({ type: "cancel", request_id: "r1" });
    const result = parseLine(line);
    expect(result).toEqual({ type: "cancel", request_id: "r1" });
  });

  it("parses a shutdown request", () => {
    const line = JSON.stringify({ type: "shutdown" });
    const result = parseLine(line);
    expect(result).toEqual({ type: "shutdown" });
  });

  it("handles trailing whitespace in the line", () => {
    const line = JSON.stringify({ type: "shutdown" }) + "  \n";
    expect(parseLine(line)).toEqual({ type: "shutdown" });
  });
});

describe("writeEvent", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("writes a ready event as newline-delimited JSON", () => {
    const event: SidecarEvent = { type: "ready" };
    writeEvent(event);
    expect(writeSpy).toHaveBeenCalledWith('{"type":"ready"}\n');
  });

  it("writes a token event as newline-delimited JSON", () => {
    const event: SidecarEvent = { type: "token", request_id: "r1", token: "Hello" };
    writeEvent(event);
    expect(writeSpy).toHaveBeenCalledWith('{"type":"token","request_id":"r1","token":"Hello"}\n');
  });

  it("writes a complete event as newline-delimited JSON", () => {
    const event: SidecarEvent = {
      type: "complete",
      request_id: "r1",
      full_text: "Hello world",
    };
    writeEvent(event);
    expect(writeSpy).toHaveBeenCalledWith(
      '{"type":"complete","request_id":"r1","full_text":"Hello world"}\n',
    );
  });

  it("writes an error event as newline-delimited JSON", () => {
    const event: SidecarEvent = {
      type: "error",
      request_id: "r1",
      message: "Something went wrong",
    };
    writeEvent(event);
    expect(writeSpy).toHaveBeenCalledWith(
      '{"type":"error","request_id":"r1","message":"Something went wrong"}\n',
    );
  });
});
