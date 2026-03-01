import { useEffect, useState } from "react";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { BuildStreamPanel } from "./BuildStreamPanel";
import { ChatView } from "./ChatView";
import { Logo } from "./Logo";
import { NetworkBanner } from "./NetworkBanner";
import { SetupWizard } from "./SetupWizard";
import { ThemeToggle } from "./ThemeToggle";
import { WaveSidebar } from "./WaveSidebar";
import { useResizeHandle } from "../hooks/useResizeHandle";
import { useSetup } from "../hooks/useSetup";
import { useSidecar } from "../hooks/useSidecar";

/**
 * Main application shell.
 *
 * On first launch, renders ``SetupWizard`` until the user completes all setup
 * steps.  Once setup is complete, renders the normal three-zone layout:
 * - Left: ChatView (primary workspace, always visible)
 * - Right: WaveSidebar (collapsible wave-progress panel)
 * - Bottom: BuildStreamPanel (collapsible live sidecar output, full width)
 *
 * ``NetworkBanner`` is always present at the top and shows when offline.
 * ``AuthErrorBanner`` is shown when a GitHub operation fails with an auth error.
 *
 * Mirrors the VS Code layout model.
 */
export function Shell(): React.ReactElement {
  const { step, status, retry, completeSetup } = useSetup();
  const [showAuthError, setShowAuthError] = useState(false);
  const { status: sidecarStatus, error: sidecarError, start } = useSidecar();

  const {
    size: chatWidth,
    isDragging: isSplitDragging,
    onMouseDown: handleSplitDragStart,
  } = useResizeHandle({
    defaultSize: 600,
    minSize: 300,
    maxSize: 900,
    axis: "horizontal",
    direction: "positive",
  });

  useEffect(() => {
    if (step === "ready") {
      void start();
    }
  }, [step, start]);

  const handleRetry = (): void => {
    void retry();
  };

  if (step !== "ready") {
    return (
      <div
        className="flex h-full min-h-screen flex-col"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
        data-testid="shell"
      >
        <NetworkBanner />
        <SetupWizard step={step} status={status} onRetry={handleRetry} onComplete={completeSetup} />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-screen flex-col"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      data-testid="shell"
    >
      <NetworkBanner />
      <AuthErrorBanner
        show={showAuthError}
        onDismiss={(): void => {
          setShowAuthError(false);
        }}
      />

      {/* Title bar */}
      <header
        className="flex flex-shrink-0 items-center gap-3.5 border-b px-5 py-3.5"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
        data-testid="app-header"
      >
        <Logo size={26} />
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
          <ChatView sidecarStatus={sidecarStatus} sidecarError={sidecarError} width={chatWidth} />
          {/* Split handle */}
          <div
            data-testid="chat-wave-split-handle"
            onMouseDown={handleSplitDragStart}
            className="flex w-1 shrink-0 cursor-col-resize items-center justify-center transition-colors"
            style={{ backgroundColor: isSplitDragging ? "var(--border-strong)" : "var(--border)" }}
            role="separator"
            aria-label="Resize chat / waves split"
          />
          <WaveSidebar />
        </main>

        {/* Bottom panel — Build stream (full width) */}
        <BuildStreamPanel />
      </div>
    </div>
  );
}
