import { useEffect, useState } from "react";

/**
 * The possible theme values.
 */
export type Theme = "dark" | "light";

const STORAGE_KEY = "epik-theme";

/**
 * Determine the initial theme in preference order:
 *
 * 1. Previously persisted value from localStorage
 * 2. OS-level preference via ``prefers-color-scheme`` media query
 * 3. Fallback: dark
 */
function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

/**
 * Apply the theme to the document root element by toggling the ``dark`` CSS
 * class and setting the ``data-theme`` attribute.  Both are used by the CSS
 * custom-property cascade in ``index.css``.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-theme", theme);
}

/**
 * Hook that manages the application theme.
 *
 * Returns the current ``theme`` value (``"dark"`` or ``"light"``) and a
 * ``toggleTheme`` callback that switches between the two.  The chosen theme
 * is persisted to ``localStorage`` under the key ``"epik-theme"`` so it
 * survives page reloads and app restarts.
 *
 * On first load the hook resolves the theme from (in order of priority):
 * 1. ``localStorage`` — remembers an explicit user choice
 * 2. OS ``prefers-color-scheme`` media query
 * 3. Fallback to dark
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = (): void => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return { theme, toggleTheme };
}
