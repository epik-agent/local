import { Shell } from "./components/Shell";

/**
 * Root application component.
 *
 * Renders the main application shell. All top-level routing and layout will
 * be handled here as the application grows.  The ``ThemeToggle`` inside
 * ``Shell`` initialises the theme system via ``useTheme`` so the correct CSS
 * class and ``data-theme`` attribute are applied to ``<html>`` before paint.
 */
export default function App(): React.ReactElement {
  return <Shell />;
}
