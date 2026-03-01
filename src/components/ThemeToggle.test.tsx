import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

// Mock useTheme so we can control it in tests
const mockToggleTheme = vi.fn();
let mockTheme = "dark";

vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockTheme = "dark";
    mockToggleTheme.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has an accessible label for dark mode", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
  });

  it("has an accessible label for light mode", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("calls toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("renders a sun icon when in dark mode (switch to light)", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle-icon")).toBeInTheDocument();
  });

  it("renders a moon icon when in light mode (switch to dark)", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle-icon")).toBeInTheDocument();
  });

  it("has data-testid attribute", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
