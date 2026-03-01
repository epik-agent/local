import "@testing-library/jest-dom";

// Mock the Tauri API — not available in the test environment
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock the Tauri event API — not available in the test environment
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

/**
 * Tauri patches the jsdom localStorage with a file-backed implementation that
 * drops ``clear()`` and may drop other methods depending on the version.
 * Replace it globally with a fully-functional in-memory store so every test
 * file gets a consistent, standard-compliant localStorage.
 */
function makeLocalStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      Reflect.deleteProperty(store, key);
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        Reflect.deleteProperty(store, key);
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

Object.defineProperty(window, "localStorage", {
  value: makeLocalStorageMock(),
  writable: true,
});

// jsdom does not implement window.matchMedia. Provide a minimal stub so
// components that call it (e.g. useTheme) don't throw in tests.
// Individual tests that care about the return value should override this via
// vi.stubGlobal("matchMedia", ...) in their own beforeEach block.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});
