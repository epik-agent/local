export interface ProjectScopeSelectorProps {
  /** Currently selected GitHub organisation, or null if unset. */
  org: string | null;
  /** Currently selected GitHub repository name, or null if unset. */
  repo: string | null;
  /** Called when the user changes the org input. */
  onOrgChange: (value: string) => void;
  /** Called when the user changes the repo input. */
  onRepoChange: (value: string) => void;
}

/**
 * Component for selecting the GitHub org/repo that scopes a planning conversation.
 *
 * Renders two text inputs (org and repo) and, when both are filled in, shows a
 * combined ``org/repo`` label to confirm the current scope.
 */
export function ProjectScopeSelector({
  org,
  repo,
  onOrgChange,
  onRepoChange,
}: ProjectScopeSelectorProps): React.ReactElement {
  const scopeLabel =
    org !== null && org !== "" && repo !== null && repo !== "" ? `${org}/${repo}` : null;

  return (
    <div className="flex flex-col gap-2" data-testid="project-scope-selector">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={org ?? ""}
          onChange={(e): void => {
            onOrgChange(e.target.value);
          }}
          placeholder="Org"
          aria-label="GitHub organisation"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text)",
          }}
          data-testid="org-input"
        />
        <span style={{ color: "var(--text-muted)" }}>/</span>
        <input
          type="text"
          value={repo ?? ""}
          onChange={(e): void => {
            onRepoChange(e.target.value);
          }}
          placeholder="Repo"
          aria-label="GitHub repository"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text)",
          }}
          data-testid="repo-input"
        />
      </div>

      {scopeLabel !== null && (
        <span
          className="text-xs font-mono"
          style={{ color: "var(--accent)" }}
          data-testid="scope-label"
        >
          {scopeLabel}
        </span>
      )}
    </div>
  );
}
