import "@testing-library/jest-dom";

// Mock the Tauri API — not available in the test environment
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
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

Object.defineProperty(window, "localStorage", {
  value: makeLocalStorageMock(),
  writable: true,
});
