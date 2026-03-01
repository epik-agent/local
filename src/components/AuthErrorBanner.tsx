/**
 * Props for the AuthErrorBanner component.
 */
export interface AuthErrorBannerProps {
  /** Whether the banner is currently visible. */
  show: boolean;
  /** Called when the user clicks the dismiss button. */
  onDismiss: () => void;
}

/**
 * Banner displayed when a GitHub operation fails due to an expired auth token.
 *
 * Shows a message prompting the user to run ``gh auth login`` to re-authenticate,
 * along with a dismiss button to hide the banner once acknowledged.
 * When ``show`` is false, the component renders nothing.
 */
export function AuthErrorBanner({
  show,
  onDismiss,
}: AuthErrorBannerProps): React.ReactElement | null {
  if (!show) {
    return null;
  }

  return (
    <div
      className="flex w-full items-center justify-between gap-4 px-4 py-2 text-sm"
      style={{
        backgroundColor: "var(--error, #b91c1c)",
        color: "var(--error-text, #fff)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
      data-testid="auth-error-banner"
      role="alert"
      aria-live="assertive"
    >
      <span>
        GitHub authentication expired. Run{" "}
        <code className="rounded px-1 font-mono" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
          gh auth login
        </code>{" "}
        in your terminal to re-authenticate.
      </span>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ border: "1px solid rgba(255,255,255,0.4)" }}
        aria-label="Dismiss auth error"
      >
        Dismiss
      </button>
    </div>
  );
}
