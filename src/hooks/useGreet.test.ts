import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useGreet } from "./useGreet";

const mockInvoke = vi.mocked(invoke);

describe("useGreet", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("initialises with null message and no loading or error state", () => {
    const { result } = renderHook(() => useGreet());
    expect(result.current.message).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls the greet Tauri command with the provided name", async () => {
    mockInvoke.mockResolvedValueOnce("Hello, World! Welcome to Epik.");
    const { result } = renderHook(() => useGreet());

    await act(async () => {
      await result.current.greet("World");
    });

    expect(mockInvoke).toHaveBeenCalledWith("greet", { name: "World" });
  });

  it("sets the message on a successful IPC call", async () => {
    const expected = "Hello, Epik! Welcome to Epik.";
    mockInvoke.mockResolvedValueOnce(expected);
    const { result } = renderHook(() => useGreet());

    await act(async () => {
      await result.current.greet("Epik");
    });

    expect(result.current.message).toBe(expected);
    expect(result.current.error).toBeNull();
  });

  it("sets error state when the IPC call fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("IPC error"));
    const { result } = renderHook(() => useGreet());

    await act(async () => {
      await result.current.greet("error");
    });

    expect(result.current.error).toBe("IPC error");
    expect(result.current.message).toBeNull();
  });

  it("clears loading state after a successful call", async () => {
    mockInvoke.mockResolvedValueOnce("Hello!");
    const { result } = renderHook(() => useGreet());

    await act(async () => {
      await result.current.greet("test");
    });

    expect(result.current.loading).toBe(false);
  });

  it("clears loading state after a failed call", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useGreet());

    await act(async () => {
      await result.current.greet("fail");
    });

    expect(result.current.loading).toBe(false);
  });
});
