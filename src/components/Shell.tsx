import { BuildStreamPanel } from "./BuildStreamPanel";
import { ChatView } from "./ChatView";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { WaveSidebar } from "./WaveSidebar";

/**
 * Main application shell.
 *
 * Renders the persistent title bar and a three-zone layout:
 * - Left: ChatView (primary workspace, always visible)
 * - Right: WaveSidebar (collapsible wave-progress panel)
 * - Bottom: BuildStreamPanel (collapsible live sidecar output, full width)
 *
 * Mirrors the VS Code layout model.
 */
export function Shell(): React.ReactElement {
  return (
    <div
      className="flex h-full min-h-screen flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      data-testid="shell"
    >
      {/* Title bar */}
      <header
        className="flex flex-shrink-0 items-center gap-3 border-b px-4 py-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
        data-testid="app-header"
      >
        <Logo size={24} />
        <span className="text-sm font-semibold tracking-wide" style={{ color: "var(--text)" }}>
          Epik
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* Body: horizontal zones + bottom panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Primary content — Chat + Wave sidebar */}
        <main className="flex flex-1 overflow-hidden" data-testid="main-content">
          <ChatView />
          <WaveSidebar />
        </main>

        {/* Bottom panel — Build stream (full width) */}
        <BuildStreamPanel />
      </div>
    </div>
  );
}
