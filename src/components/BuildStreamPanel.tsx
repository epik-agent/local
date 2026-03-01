import { useCallback, useRef, useState } from "react";
import type { BuildSession } from "../lib/build";
import { useBuildStream } from "../hooks/useBuildStream";
import { useResizeHandle } from "../hooks/useResizeHandle";

const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 600;

// ---------------------------------------------------------------------------
// Session tab bar
// ---------------------------------------------------------------------------

interface SessionTabBarProps {
  sessions: BuildSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

function SessionTabBar({
  sessions,
  activeSessionId,
  onSelect,
}: SessionTabBarProps): React.ReactElement {
  return (
    <div
      data-testid="session-tab-bar"
      className="flex items-center gap-1 overflow-x-auto border-b px-2"
      style={{ borderColor: "var(--border)" }}
    >
      {sessions.map((session) => {
        const isActive = session.id === activeSessionId;
        const isRunning = session.status === "running";
        return (
          <button
            key={session.id}
            data-testid={`session-tab-${session.id}`}
            data-active={String(isActive)}
            onClick={(): void => {
              onSelect(session.id);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-t px-2 py-1 text-xs transition-colors"
            style={{
              color: isActive ? "var(--text)" : "var(--text-muted)",
              backgroundColor: isActive ? "var(--bg-active)" : "transparent",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
            }}
            aria-pressed={isActive}
          >
            {isRunning && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "var(--accent)" }}
                aria-label="running"
              />
            )}
            <span className="max-w-[100px] truncate">{session.repo}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session stream view
// ---------------------------------------------------------------------------

interface SessionStreamProps {
  sessionId: string | undefined;
  height: number;
  logRef: React.RefObject<HTMLDivElement | null>;
}

function SessionStream({ sessionId, height, logRef }: SessionStreamProps): React.ReactElement {
  const { lines, isActive } = useBuildStream(sessionId);

  return (
    <>
      {isActive && (
        <span
          className="ml-1 h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
          aria-label="Build active"
        />
      )}
      <div
        ref={logRef}
        data-testid="build-stream-log"
        className="overflow-y-auto p-3"
        style={{
          height: `${String(height)}px`,
          fontFamily: "var(--brand-font-mono)",
          fontSize: "13px",
          lineHeight: "1.7",
          color: "var(--text-secondary)",
        }}
      >
        {lines.length === 0 ? (
          <div data-testid="build-stream-idle" className="flex h-full items-center justify-center">
            <p style={{ color: "var(--text-muted)" }}>No active build</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {lines.map((line, index) => (
              <span key={String(index)} className="whitespace-pre-wrap break-all">
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// BuildStreamPanel
// ---------------------------------------------------------------------------

interface BuildStreamPanelProps {
  /** Build sessions to display as tabs.  When empty the panel shows a single global stream. */
  sessions?: BuildSession[];
  /** The currently selected session ID, or ``null`` when no session is selected. */
  activeSessionId?: string | null;
  /** Called when the user selects a different session tab. */
  onSelectSession?: (sessionId: string) => void;
}

/**
 * Bottom-panel component showing live Claude Code sidecar output.
 *
 * When multiple build sessions are active (``sessions`` prop is non-empty),
 * a tab bar is rendered above the log area so the user can switch between
 * sessions.  Each tab shows the repo name and a running indicator dot.
 *
 * When no sessions are provided the panel falls back to the global
 * ``sidecar://token`` / ``sidecar://complete`` event channels used by the chat
 * sidecar.
 *
 * The panel is collapsible via a toggle button and resizable by dragging the
 * top edge.
 */
export function BuildStreamPanel({
  sessions = [],
  activeSessionId = null,
  onSelectSession,
}: BuildStreamPanelProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(true);
  const logRef = useRef<HTMLDivElement | null>(null);

  const {
    size: height,
    isDragging,
    onMouseDown: handleDragStart,
  } = useResizeHandle({
    defaultSize: DEFAULT_HEIGHT,
    minSize: MIN_HEIGHT,
    maxSize: MAX_HEIGHT,
    axis: "vertical",
    direction: "negative",
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const sessionId = activeSession?.id;

  const handleSelect = useCallback(
    (id: string): void => {
      onSelectSession?.(id);
    },
    [onSelectSession],
  );

  return (
    <div
      data-testid="build-stream-panel"
      className="flex shrink-0 flex-col border-t"
      style={{
        backgroundColor: "var(--bg-bar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Drag handle */}
      <div
        data-testid="build-stream-drag-handle"
        onMouseDown={handleDragStart}
        className="group flex h-2 shrink-0 cursor-row-resize items-center justify-center transition-colors"
        style={{ backgroundColor: isDragging ? "var(--border-strong)" : "var(--border)" }}
        role="separator"
        aria-label="Resize build panel"
      >
        <div
          className="h-0.5 w-8 rounded-full transition-colors"
          style={{ backgroundColor: isDragging ? "var(--text-muted)" : "var(--text-faint)" }}
        />
      </div>

      {/* Header bar */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          data-testid="build-stream-toggle"
          onClick={(): void => {
            setIsOpen((o) => !o);
          }}
          className="flex items-center gap-1.5 rounded p-1 transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label={isOpen ? "Collapse build panel" : "Expand build panel"}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            {isOpen ? <path d="M6 8L1 3h10L6 8Z" /> : <path d="M6 4L11 9H1L6 4Z" />}
          </svg>
        </button>
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Build Output
        </span>
      </div>

      {/* Session tab bar — shown when there are multiple sessions */}
      {isOpen && sessions.length > 0 && (
        <SessionTabBar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={handleSelect}
        />
      )}

      {/* Log area */}
      {isOpen && <SessionStream sessionId={sessionId} height={height} logRef={logRef} />}
    </div>
  );
}
