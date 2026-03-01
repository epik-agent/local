import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

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

  it("renders the toggle button with data-testid", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label reflecting current theme", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to light mode");
  });

  it("updates accessible label when in light mode", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("calls toggleTheme when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button"));
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("renders a theme icon", () => {
    render(<ThemeToggle />);
    expect(screen.getByTestId("theme-toggle-icon")).toBeInTheDocument();
  });
});
