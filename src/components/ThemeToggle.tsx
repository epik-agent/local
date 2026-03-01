import { useTheme } from "../hooks/useTheme";

/**
 * Sun (light-mode) icon — shown when in dark mode to invite switching to light.
 */
function SunIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-testid="theme-toggle-icon"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

/**
 * Moon (dark-mode) icon — shown when in light mode to invite switching to dark.
 */
function MoonIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-testid="theme-toggle-icon"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/**
 * A persistent icon button that toggles between dark and light themes.
 *
 * Reads the current theme from ``useTheme`` and renders an appropriate icon:
 * - Sun icon in dark mode (click to switch to light)
 * - Moon icon in light mode (click to switch to dark)
 *
 * Designed to be placed in the application title bar or any persistent chrome.
 */
export function ThemeToggle(): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "2rem",
        height: "2rem",
        borderRadius: "0.375rem",
        border: "none",
        cursor: "pointer",
        color: "var(--text)",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
