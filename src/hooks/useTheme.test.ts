import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./useTheme";

/**
 * A minimal in-memory localStorage implementation for test isolation.
 *
 * Tauri patches the jsdom localStorage with a file-backed version that drops
 * the ``clear()`` method.  Using a fresh in-memory store for every test avoids
 * that incompatibility and gives full isolation between test cases.
 */
function makeLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("useTheme", () => {
  beforeEach(() => {
    // Reset the document class list before each test
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
    // Replace localStorage with a clean in-memory mock for isolation
    vi.stubGlobal("localStorage", makeLocalStorageMock());
    // Default matchMedia: no preference
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to dark theme when no localStorage value and no OS preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("defaults to dark theme when OS prefers dark", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("defaults to light theme when OS prefers light and no localStorage value", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: light)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
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
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: light)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("toggles from dark to light", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");
  });

  it("toggles from light to dark", () => {
    localStorage.setItem("epik-theme", "light");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");
  });

  it("persists theme choice to localStorage after toggle", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(localStorage.getItem("epik-theme")).toBe("light");
  });

  it("applies dark class to document.documentElement when theme is dark", () => {
    localStorage.setItem("epik-theme", "dark");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from document.documentElement when theme is light", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("epik-theme", "light");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates html class when toggled", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    act(() => {
      result.current.toggleTheme();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("sets data-theme attribute on document.documentElement", () => {
    localStorage.setItem("epik-theme", "dark");
    renderHook(() => useTheme());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("updates data-theme attribute to light when toggled", () => {
    localStorage.setItem("epik-theme", "dark");
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
