import { useState } from "react";
import type { BuildSession, IssueStatus, WaveIssue } from "../lib/build";
import { useProjectScope } from "../hooks/useProjectScope";
import { useResizeHandle } from "../hooks/useResizeHandle";
import { useWaveData } from "../hooks/useWaveData";

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<IssueStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  todo: "Todo",
};

const STATUS_COLOR: Record<IssueStatus, string> = {
  done: "var(--color-status-done)",
  in_progress: "var(--color-status-in-progress)",
  todo: "var(--color-status-todo)",
};

interface StatusChipProps {
  status: IssueStatus;
  issueNumber: number;
}

function StatusChip({ status, issueNumber }: StatusChipProps): React.ReactElement {
  return (
    <span
      data-testid={`status-chip-${String(issueNumber)}`}
      className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{
        color: STATUS_COLOR[status],
        backgroundColor: `${STATUS_COLOR[status]}22`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Issue row
// ---------------------------------------------------------------------------

interface IssueRowProps {
  issue: WaveIssue;
  org: string;
  repo: string;
}

function IssueRow({ issue, org, repo }: IssueRowProps): React.ReactElement {
  const issueUrl = `https://github.com/${org}/${repo}/issues/${String(issue.number)}`;

  return (
    <div
      data-testid={`issue-row-${String(issue.number)}`}
      data-active={String(issue.isActive)}
      className="flex flex-col gap-1 rounded-lg px-2.5 py-2"
      style={{
        backgroundColor: issue.isActive ? "var(--bg-active)" : "transparent",
        borderLeft: issue.isActive ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      {/* Top row: number, title, status chip */}
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          #{String(issue.number)}
        </span>
        <a
          href={issueUrl}
          className="min-w-0 flex-1 truncate text-sm font-medium"
          style={{
            color: issue.isActive ? "var(--text)" : "var(--text-secondary)",
            textDecoration: "none",
          }}
          title={issue.title}
          target="_blank"
          rel="noreferrer"
        >
          {issue.title}
        </a>
        <StatusChip status={issue.status} issueNumber={issue.number} />
      </div>

      {/* Bottom row: PR link, CI link */}
      {(issue.prUrl !== undefined || issue.ciUrl !== undefined) && (
        <div className="flex items-center gap-2 pl-4">
          {issue.prUrl !== undefined && issue.prNumber !== undefined && (
            <a
              data-testid={`pr-link-${String(issue.number)}`}
              href={issue.prUrl}
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--accent)" }}
              target="_blank"
              rel="noreferrer"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z" />
              </svg>
              #{String(issue.prNumber)}
            </a>
          )}
          {issue.ciUrl !== undefined && (
            <a
              data-testid={`ci-link-${String(issue.number)}`}
              href={issue.ciUrl}
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--text-muted)" }}
              target="_blank"
              rel="noreferrer"
              aria-label="CI run"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
                className="animate-spin"
              >
                <path d="M8 0a8 8 0 1 0 8 8A8.009 8.009 0 0 0 8 0ZM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0Z" />
              </svg>
              CI
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active build selector
// ---------------------------------------------------------------------------

interface ActiveBuildSelectorProps {
  sessions: BuildSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

/**
 * Horizontal tab bar displayed at the top of the sidebar content area when
 * multiple concurrent build sessions are active.
 *
 * Each tab shows the repo name of the session and a running indicator dot for
 * sessions that are still in progress.
 */
function ActiveBuildSelector({
  sessions,
  activeSessionId,
  onSelect,
}: ActiveBuildSelectorProps): React.ReactElement {
  return (
    <div
      data-testid="active-build-selector"
      className="flex items-center gap-1 overflow-x-auto border-b px-1 py-1"
      style={{ borderColor: "var(--border)" }}
    >
      {sessions.map((session) => {
        const isSelected = session.id === activeSessionId;
        const isRunning = session.status === "running";
        return (
          <button
            key={session.id}
            data-testid={`build-selector-tab-${session.id}`}
            data-selected={String(isSelected)}
            onClick={(): void => {
              onSelect(session.id);
            }}
            className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors"
            style={{
              color: isSelected ? "var(--text)" : "var(--text-muted)",
              backgroundColor: isSelected ? "var(--bg-active)" : "transparent",
              borderBottom: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
            }}
            aria-pressed={isSelected}
          >
            {isRunning && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--accent)" }}
                aria-label="running"
              />
            )}
            <span className="max-w-[80px] truncate">{session.repo}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WaveSidebar
// ---------------------------------------------------------------------------

interface WaveSidebarProps {
  /** Concurrent build sessions to show in the build selector at the top of the sidebar. */
  sessions?: BuildSession[];
  /** The currently selected build session ID. */
  activeSessionId?: string | null;
  /** Called when the user selects a build session from the selector. */
  onSelectSession?: (sessionId: string) => void;
}

/**
 * Right-panel sidebar showing build progress grouped by wave.
 *
 * Renders issues from ``useWaveData`` as a vertical stack, grouped by wave
 * number.  Each issue shows its number, title (clickable link), status chip,
 * and optional PR/CI links.  The panel is collapsible via a toggle button.
 *
 * When multiple concurrent build sessions are active (``sessions`` prop is
 * non-empty), an ``ActiveBuildSelector`` tab bar is shown at the top of the
 * content area so the user can switch between builds.
 */
export function WaveSidebar({
  sessions = [],
  activeSessionId = null,
  onSelectSession,
}: WaveSidebarProps): React.ReactElement {
  const { waves } = useWaveData();
  const { org, repo } = useProjectScope();
  const [isOpen, setIsOpen] = useState(true);

  const {
    size: sidebarWidth,
    isDragging,
    onMouseDown: handleDragStart,
  } = useResizeHandle({
    defaultSize: 280,
    minSize: 180,
    maxSize: 480,
    axis: "horizontal",
    direction: "positive",
  });

  const boardUrl =
    org !== null && repo !== null
      ? `https://github.com/orgs/${org}/projects`
      : "https://github.com";

  const isEmpty = waves.length === 0;
  const hasMultipleSessions = sessions.length > 1;

  return (
    <div
      data-testid="wave-sidebar"
      className="flex shrink-0"
      style={{
        width: isOpen ? `${String(sidebarWidth)}px` : "40px",
        minWidth: isOpen ? `${String(sidebarWidth)}px` : "40px",
        transition: isDragging ? "none" : "width 0.2s ease, min-width 0.2s ease",
      }}
    >
      {/* Left-edge resize handle */}
      {isOpen && (
        <div
          data-testid="wave-sidebar-resize-handle"
          onMouseDown={handleDragStart}
          className="flex w-1 shrink-0 cursor-col-resize items-center justify-center transition-colors"
          style={{ backgroundColor: isDragging ? "var(--border-strong)" : "var(--border)" }}
          role="separator"
          aria-label="Resize wave sidebar"
        />
      )}
      <aside
        className="flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--bg-bar)",
          overflowY: isOpen ? "auto" : "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-2 border-b px-3 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            data-testid="sidebar-toggle"
            onClick={(): void => {
              setIsOpen((o) => !o);
            }}
            className="shrink-0 rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label={isOpen ? "Collapse wave sidebar" : "Expand wave sidebar"}
            title={isOpen ? "Collapse" : "Expand"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M14.5 3h-13a.5.5 0 0 0 0 1h13a.5.5 0 0 0 0-1ZM14.5 7.5h-13a.5.5 0 0 0 0 1h13a.5.5 0 0 0 0-1ZM14.5 12h-13a.5.5 0 0 0 0 1h13a.5.5 0 0 0 0-1Z" />
            </svg>
          </button>
          {isOpen && (
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              Waves
            </span>
          )}
        </div>

        {/* Content */}
        {isOpen && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
            {/* Active build selector — shown when more than one session is running */}
            {hasMultipleSessions && onSelectSession !== undefined && (
              <ActiveBuildSelector
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelect={onSelectSession}
              />
            )}

            {/* View board link */}
            <a
              data-testid="view-board-link"
              href={boardUrl}
              className="block text-xs"
              style={{ color: "var(--accent)" }}
              target="_blank"
              rel="noreferrer"
            >
              View full board in GitHub →
            </a>

            {/* Empty state */}
            {isEmpty && (
              <div data-testid="wave-sidebar-empty" className="py-4 text-center">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No active build
                </p>
              </div>
            )}

            {/* Wave groups */}
            {waves.map((wave) => (
              <div key={wave.number} className="flex flex-col gap-1">
                <div
                  className="px-2 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-faint)" }}
                >
                  Wave {String(wave.number)}
                </div>
                {wave.issues.map((issue) => (
                  <IssueRow key={issue.number} issue={issue} org={org ?? ""} repo={repo ?? ""} />
                ))}
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
