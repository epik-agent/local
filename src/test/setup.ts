import "@testing-library/jest-dom";

// Mock the Tauri API — not available in the test environment
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
