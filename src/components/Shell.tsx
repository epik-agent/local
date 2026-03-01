import { ChatView } from "./ChatView";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Main application shell.
 *
 * Renders the persistent title bar (brand logo, name, theme toggle) and hosts
 * the ``ChatView`` as the primary content zone.  This is the root layout
 * component that composes the full app UI.
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

      {/* Primary content — Chat view */}
      <main className="flex flex-1 overflow-hidden" data-testid="main-content">
        <ChatView />
      </main>
    </div>
  );
}
