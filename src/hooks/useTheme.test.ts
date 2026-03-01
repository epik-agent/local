import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./useTheme";

function stubMatchMedia(preference: "dark" | "light" | "none"): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: preference !== "none" && query === `(prefers-color-scheme: ${preference})`,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
    stubMatchMedia("none");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to dark theme when no localStorage value and no OS preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("respects OS preference for light theme when no localStorage value", () => {
    stubMatchMedia("light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("reads theme preference from localStorage on mount", () => {
    localStorage.setItem("epik-theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("localStorage value takes priority over OS preference", () => {
    localStorage.setItem("epik-theme", "dark");
    stubMatchMedia("light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("toggles between dark and light", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");
  });

  it("applies dark class and data-theme attribute to document.documentElement", () => {
    localStorage.setItem("epik-theme", "dark");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("updates class, data-theme, and localStorage when toggled", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("epik-theme")).toBe("light");
  });
});
