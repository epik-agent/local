import { useCallback, useEffect, useRef, useState } from "react";
import { useBuildStream } from "../hooks/useBuildStream";

const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 600;

/**
 * Bottom-panel component showing live Claude Code sidecar output.
 *
 * Renders a full-width, monospace, read-only log of the streaming sidecar
 * output.  The panel is collapsible via a toggle button and resizable by
 * dragging the top edge.  When no build is active, a placeholder message is
 * shown instead of the log.
 */
export function BuildStreamPanel(): React.ReactElement {
  const { lines, isActive } = useBuildStream();
  const [isOpen, setIsOpen] = useState(true);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const logRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(DEFAULT_HEIGHT);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const el = logRef.current;
    if (el === null) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 8;
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent): void => {
      isDraggingRef.current = true;
      dragStartYRef.current = e.clientY;
      dragStartHeightRef.current = height;
      e.preventDefault();
    },
    [height],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current) return;
      const delta = dragStartYRef.current - e.clientY;
      const newHeight = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, dragStartHeightRef.current + delta),
      );
      setHeight(newHeight);
    };

    const handleMouseUp = (): void => {
      isDraggingRef.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return (): void => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
        className="flex h-1 shrink-0 cursor-row-resize items-center justify-center"
        style={{ backgroundColor: "var(--border)" }}
        role="separator"
        aria-label="Resize build panel"
      />

      {/* Header bar */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5"
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
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
          Build Output
        </span>
        {isActive && (
          <span
            className="ml-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
            aria-label="Build active"
          />
        )}
      </div>

      {/* Log area */}
      {isOpen && (
        <div
          ref={logRef}
          data-testid="build-stream-log"
          className="overflow-y-auto p-3"
          style={{
            height: `${String(height)}px`,
            fontFamily: "var(--brand-font-mono)",
            fontSize: "12px",
            lineHeight: "1.6",
            color: "var(--text-secondary)",
          }}
        >
          {lines.length === 0 ? (
            <div
              data-testid="build-stream-idle"
              className="flex h-full items-center justify-center"
            >
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
      )}
    </div>
  );
}
