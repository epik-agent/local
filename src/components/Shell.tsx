import { Logo } from "./Logo";

/**
 * Main application shell — the branded empty canvas.
 *
 * Renders the top-level layout with the Epik brand: dark background, Geist font,
 * and the mint accent colour in the placeholder heading. This component provides
 * the structural container for the application content.
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
        className="flex items-center gap-3 border-b px-4 py-3"
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
      </header>

      {/* Main content */}
      <main
        className="flex flex-1 flex-col items-center justify-center gap-6 p-8"
        data-testid="main-content"
      >
        <Logo size={64} />
        <h1
          className="text-4xl font-bold tracking-tight"
          style={{ color: "var(--accent)" }}
          data-testid="brand-heading"
        >
          Epik
        </h1>
        <p
          className="text-center text-lg"
          style={{ color: "var(--text-muted)" }}
          data-testid="brand-tagline"
        >
          You say it. We make it.
        </p>
      </main>
    </div>
  );
}
