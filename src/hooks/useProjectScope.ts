import { useCallback, useMemo, useState } from "react";

const ORG_KEY = "epik.projectScope.org";
const REPO_KEY = "epik.projectScope.repo";

/**
 * Return type for the useProjectScope hook.
 */
export interface UseProjectScopeResult {
  /** The currently selected GitHub organisation (or null if unset). */
  org: string | null;
  /** The currently selected GitHub repository name (or null if unset). */
  repo: string | null;
  /** Combined ``org/repo`` label, or null if either value is missing. */
  scopeLabel: string | null;
  /** Set the organisation, persisting to localStorage. Pass null to clear. */
  setOrg: (value: string | null) => void;
  /** Set the repository, persisting to localStorage. Pass null to clear. */
  setRepo: (value: string | null) => void;
}

/**
 * Hook for storing and retrieving the selected GitHub project scope.
 *
 * The selected ``org`` and ``repo`` are persisted in ``localStorage`` so the
 * user's choice survives page reloads.  Values are read from storage on mount
 * and written back whenever ``setOrg`` or ``setRepo`` are called.
 */
export function useProjectScope(): UseProjectScopeResult {
  const [org, setOrgState] = useState<string | null>(() => localStorage.getItem(ORG_KEY));
  const [repo, setRepoState] = useState<string | null>(() => localStorage.getItem(REPO_KEY));

  const setOrg = useCallback((value: string | null): void => {
    if (value === null) {
      localStorage.removeItem(ORG_KEY);
    } else {
      localStorage.setItem(ORG_KEY, value);
    }
    setOrgState(value);
  }, []);

  const setRepo = useCallback((value: string | null): void => {
    if (value === null) {
      localStorage.removeItem(REPO_KEY);
    } else {
      localStorage.setItem(REPO_KEY, value);
    }
    setRepoState(value);
  }, []);

  const scopeLabel = useMemo((): string | null => {
    if (org === null || repo === null) return null;
    return `${org}/${repo}`;
  }, [org, repo]);

  return { org, repo, scopeLabel, setOrg, setRepo };
}
