import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaveSidebar } from "./WaveSidebar";
import type { BuildSession, Wave } from "../lib/build";

// Mock useWaveData
vi.mock("../hooks/useWaveData", () => ({
  useWaveData: vi.fn(),
}));

import { useWaveData } from "../hooks/useWaveData";
const mockUseWaveData = vi.mocked(useWaveData);

// Mock useProjectScope
vi.mock("../hooks/useProjectScope", () => ({
  useProjectScope: vi.fn(),
}));

import { useProjectScope } from "../hooks/useProjectScope";
const mockUseProjectScope = vi.mocked(useProjectScope);

const sampleWaves: Wave[] = [
  {
    number: 1,
    issues: [
      {
        number: 1,
        title: "Set up the repository",
        status: "done",
        isActive: false,
      },
      {
        number: 2,
        title: "Add continuous integration pipeline",
        status: "in_progress",
        isActive: true,
        prNumber: 5,
        prUrl: "https://github.com/org/repo/pull/5",
        ciUrl: "https://github.com/org/repo/actions/runs/123",
      },
    ],
  },
  {
    number: 2,
    issues: [
      {
        number: 3,
        title: "Add dashboard view",
        status: "todo",
        isActive: false,
      },
    ],
  },
];

describe("WaveSidebar", () => {
  beforeEach(() => {
    mockUseWaveData.mockReset();
    mockUseProjectScope.mockReset();
    mockUseWaveData.mockReturnValue({ waves: sampleWaves, loading: false });
    mockUseProjectScope.mockReturnValue({
      org: "org",
      repo: "repo",
      scopeLabel: "org/repo",
      setOrg: vi.fn(),
      setRepo: vi.fn(),
    });
  });

  it("renders the wave sidebar container", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("wave-sidebar")).toBeInTheDocument();
  });

  it("renders a heading for each wave", () => {
    render(<WaveSidebar />);
    expect(screen.getByText("Wave 1")).toBeInTheDocument();
    expect(screen.getByText("Wave 2")).toBeInTheDocument();
  });

  it("renders issue numbers", () => {
    render(<WaveSidebar />);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("renders issue titles as links to GitHub", () => {
    render(<WaveSidebar />);
    const link = screen.getByText("Set up the repository");
    expect(link.closest("a")).toHaveAttribute("href", "https://github.com/org/repo/issues/1");
  });

  it("renders a status chip for each issue", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("status-chip-1")).toBeInTheDocument();
    expect(screen.getByTestId("status-chip-2")).toBeInTheDocument();
    expect(screen.getByTestId("status-chip-3")).toBeInTheDocument();
  });

  it("renders Done status chip for completed issues", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("status-chip-1")).toHaveTextContent("Done");
  });

  it("renders In Progress status chip for active issues", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("status-chip-2")).toHaveTextContent("In Progress");
  });

  it("renders Todo status chip for queued issues", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("status-chip-3")).toHaveTextContent("Todo");
  });

  it("renders a PR link when a PR is open", () => {
    render(<WaveSidebar />);
    const prLink = screen.getByTestId("pr-link-2");
    expect(prLink).toHaveAttribute("href", "https://github.com/org/repo/pull/5");
    expect(prLink).toHaveTextContent("#5");
  });

  it("renders a CI link when a CI run is active", () => {
    render(<WaveSidebar />);
    const ciLink = screen.getByTestId("ci-link-2");
    expect(ciLink).toHaveAttribute("href", "https://github.com/org/repo/actions/runs/123");
  });

  it("highlights the active issue", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("issue-row-2")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("issue-row-1")).toHaveAttribute("data-active", "false");
  });

  it("renders the view full board link", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("view-board-link")).toBeInTheDocument();
  });

  it("renders a toggle button for collapsing", () => {
    render(<WaveSidebar />);
    expect(screen.getByTestId("sidebar-toggle")).toBeInTheDocument();
  });

  it("collapses and hides wave content when toggle is clicked", () => {
    render(<WaveSidebar />);
    const toggle = screen.getByTestId("sidebar-toggle");
    fireEvent.click(toggle);
    expect(screen.queryByText("Wave 1")).not.toBeInTheDocument();
  });

  it("expands when toggle is clicked again", () => {
    render(<WaveSidebar />);
    const toggle = screen.getByTestId("sidebar-toggle");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByText("Wave 1")).toBeInTheDocument();
  });

  it("shows empty state when there are no waves", () => {
    mockUseWaveData.mockReturnValue({ waves: [], loading: false });
    render(<WaveSidebar />);
    expect(screen.getByTestId("wave-sidebar-empty")).toBeInTheDocument();
  });

  it("shows empty state when no project is selected", () => {
    mockUseProjectScope.mockReturnValue({
      org: null,
      repo: null,
      scopeLabel: null,
      setOrg: vi.fn(),
      setRepo: vi.fn(),
    });
    mockUseWaveData.mockReturnValue({ waves: [], loading: false });
    render(<WaveSidebar />);
    expect(screen.getByTestId("wave-sidebar-empty")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Multi-build session selector tests
  // ---------------------------------------------------------------------------

  const runningSession = (id: string, repo: string): BuildSession => ({
    id,
    org: "acme",
    repo,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  it("does not render active-build-selector when only one session is provided", () => {
    render(<WaveSidebar sessions={[runningSession("s1", "api")]} activeSessionId="s1" />);
    expect(screen.queryByTestId("active-build-selector")).not.toBeInTheDocument();
  });

  it("does not render active-build-selector when sessions prop is empty", () => {
    render(<WaveSidebar sessions={[]} />);
    expect(screen.queryByTestId("active-build-selector")).not.toBeInTheDocument();
  });

  it("renders active-build-selector when multiple sessions and onSelectSession are provided", () => {
    const sessions = [runningSession("s1", "api"), runningSession("s2", "dashboard")];
    render(<WaveSidebar sessions={sessions} activeSessionId="s1" onSelectSession={vi.fn()} />);
    expect(screen.getByTestId("active-build-selector")).toBeInTheDocument();
  });

  it("renders a tab for each session in the selector", () => {
    const sessions = [runningSession("s1", "api"), runningSession("s2", "dashboard")];
    render(<WaveSidebar sessions={sessions} activeSessionId="s1" onSelectSession={vi.fn()} />);
    expect(screen.getByTestId("build-selector-tab-s1")).toBeInTheDocument();
    expect(screen.getByTestId("build-selector-tab-s2")).toBeInTheDocument();
  });

  it("marks the active session tab with data-selected=true", () => {
    const sessions = [runningSession("s1", "api"), runningSession("s2", "dashboard")];
    render(<WaveSidebar sessions={sessions} activeSessionId="s2" onSelectSession={vi.fn()} />);
    expect(screen.getByTestId("build-selector-tab-s2")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("build-selector-tab-s1")).toHaveAttribute("data-selected", "false");
  });

  it("calls onSelectSession when a selector tab is clicked", () => {
    const onSelectSession = vi.fn();
    const sessions = [runningSession("s1", "api"), runningSession("s2", "dashboard")];
    render(
      <WaveSidebar sessions={sessions} activeSessionId="s1" onSelectSession={onSelectSession} />,
    );
    fireEvent.click(screen.getByTestId("build-selector-tab-s2"));
    expect(onSelectSession).toHaveBeenCalledWith("s2");
  });

  it("hides active-build-selector when the sidebar is collapsed", () => {
    const sessions = [runningSession("s1", "api"), runningSession("s2", "dashboard")];
    render(<WaveSidebar sessions={sessions} activeSessionId="s1" onSelectSession={vi.fn()} />);
    fireEvent.click(screen.getByTestId("sidebar-toggle"));
    expect(screen.queryByTestId("active-build-selector")).not.toBeInTheDocument();
  });
});
