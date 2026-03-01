/**
 * Thin API layer for fetching wave/issue data from the Epik MCP tools.
 *
 * In production this delegates to the Epik MCP server via the sidecar.
 * The function signature is kept simple so tests can easily mock it.
 */

import type { Wave } from "./build";

/**
 * Fetch the current wave plan for a GitHub repository.
 *
 * Calls the ``epik_list_waves`` MCP tool (or equivalent) and returns the
 * result as a structured ``Wave[]`` array.  Returns an empty array when no
 * project data is available.
 *
 * :param org: GitHub organisation name.
 * :param repo: GitHub repository name.
 * :returns: Array of waves with their issues.
 */
export function fetchWaves(org: string, repo: string): Promise<Wave[]> {
  // In the real implementation this would call the Epik MCP tool via sidecar.
  // For now return an empty list — the hook tests mock this function directly.
  void org;
  void repo;
  return Promise.resolve([]);
}
