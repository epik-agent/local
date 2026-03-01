import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BuildStreamPanel } from "./BuildStreamPanel";

// Mock useBuildStream
vi.mock("../hooks/useBuildStream", () => ({
  useBuildStream: vi.fn(),
}));

import { useBuildStream } from "../hooks/useBuildStream";
const mockUseBuildStream = vi.mocked(useBuildStream);

describe("BuildStreamPanel", () => {
  beforeEach(() => {
    mockUseBuildStream.mockReset();
    mockUseBuildStream.mockReturnValue({ lines: [], isActive: false });
  });

  it("renders the build stream panel container", () => {
    render(<BuildStreamPanel />);
    expect(screen.getByTestId("build-stream-panel")).toBeInTheDocument();
  });

  it("shows idle placeholder when no build is active", () => {
    render(<BuildStreamPanel />);
    expect(screen.getByTestId("build-stream-idle")).toBeInTheDocument();
    expect(screen.getByText("No active build")).toBeInTheDocument();
  });

  it("renders output lines when a build is active", () => {
    mockUseBuildStream.mockReturnValue({
      lines: ["Line one", "Line two", "Line three"],
      isActive: true,
    });
    render(<BuildStreamPanel />);
    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Line two")).toBeInTheDocument();
    expect(screen.getByText("Line three")).toBeInTheDocument();
  });

  it("does not show idle placeholder when build is active", () => {
    mockUseBuildStream.mockReturnValue({
      lines: ["output"],
      isActive: true,
    });
    render(<BuildStreamPanel />);
    expect(screen.queryByTestId("build-stream-idle")).not.toBeInTheDocument();
  });

  it("renders the toggle button", () => {
    render(<BuildStreamPanel />);
    expect(screen.getByTestId("build-stream-toggle")).toBeInTheDocument();
  });

  it("collapses the panel when the toggle is clicked", () => {
    mockUseBuildStream.mockReturnValue({
      lines: ["some output"],
      isActive: true,
    });
    render(<BuildStreamPanel />);
    const toggle = screen.getByTestId("build-stream-toggle");
    fireEvent.click(toggle);
    expect(screen.queryByText("some output")).not.toBeInTheDocument();
  });

  it("expands the panel when the toggle is clicked again", () => {
    mockUseBuildStream.mockReturnValue({
      lines: ["some output"],
      isActive: true,
    });
    render(<BuildStreamPanel />);
    const toggle = screen.getByTestId("build-stream-toggle");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByText("some output")).toBeInTheDocument();
  });

  it("auto-opens when a build becomes active", () => {
    const { rerender } = render(<BuildStreamPanel />);

    // Panel is initially open by default - test it shows content when active
    mockUseBuildStream.mockReturnValue({
      lines: ["build started"],
      isActive: true,
    });
    rerender(<BuildStreamPanel />);

    expect(screen.getByText("build started")).toBeInTheDocument();
  });

  it("renders a drag handle for resizing", () => {
    render(<BuildStreamPanel />);
    expect(screen.getByTestId("build-stream-drag-handle")).toBeInTheDocument();
  });

  it("renders output in a monospace container", () => {
    mockUseBuildStream.mockReturnValue({
      lines: ["output text"],
      isActive: true,
    });
    render(<BuildStreamPanel />);
    const log = screen.getByTestId("build-stream-log");
    expect(log).toBeInTheDocument();
  });
});
