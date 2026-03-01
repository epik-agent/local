/**
 * Data types for the wave progress sidebar and build stream panel.
 *
 * Defines the issue status, wave grouping, and stream types used by
 * ``WaveSidebar`` and ``BuildStreamPanel``.
 */

/**
 * The status of a single issue in the build pipeline.
 *
 * Maps to GitHub's project-board column palette adjusted for dark theme:
 * - ``todo``        → blue
 * - ``in_progress`` → purple
 * - ``done``        → green
 */
export type IssueStatus = "todo" | "in_progress" | "done";

/**
 * A single issue within a wave, with its current build status and links.
 */
export interface WaveIssue {
  /** GitHub issue number. */
  number: number;
  /** Issue title (may be truncated for display). */
  title: string;
  /** Current status within the build pipeline. */
  status: IssueStatus;
  /** PR number, if a pull request has been opened for this issue. */
  prNumber?: number;
  /** URL to the PR page on GitHub. */
  prUrl?: string;
  /** URL to the CI Actions run for this issue, if one is running. */
  ciUrl?: string;
  /** Whether this is the currently-active issue being worked on. */
  isActive: boolean;
}

/**
 * A wave — a named group of issues that are built together.
 */
export interface Wave {
  /** Wave number (1-indexed). */
  number: number;
  /** Issues that belong to this wave. */
  issues: WaveIssue[];
}

/**
 * The live output stream from the active Claude Code build sidecar.
 */
export interface BuildStream {
  /** Accumulated output lines from the sidecar. */
  lines: string[];
  /** Whether a build is currently running. */
  isActive: boolean;
}
