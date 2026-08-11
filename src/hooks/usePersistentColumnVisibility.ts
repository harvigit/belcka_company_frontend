import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

interface PersistentColumnVisibilityOptions {
  storageKey: string;
  defaultVisibility?: Record<string, boolean>;
  enabled?: boolean;
  /** Column ids that must always stay visible (never hidden via cookie/UI state). */
  alwaysVisibleColumns?: string[];
}

const COOKIE_OPTIONS = { expires: 365, path: '/' };

const applyAlwaysVisible = (
  visibility: Record<string, boolean>,
  alwaysVisibleColumns: string[] = [],
) => {
  if (!alwaysVisibleColumns.length) return visibility;

  const next = { ...visibility };
  alwaysVisibleColumns.forEach((columnId) => {
    next[columnId] = true;
  });
  return next;
};

const readSavedVisibility = (
  storageKey: string,
  defaultVisibility: Record<string, boolean>,
  alwaysVisibleColumns: string[],
) => {
  const saved = Cookies.get(storageKey);
  if (saved) {
    try {
      return applyAlwaysVisible(
        { ...defaultVisibility, ...JSON.parse(saved) },
        alwaysVisibleColumns,
      );
    } catch (e) {}
  }
  return applyAlwaysVisible(defaultVisibility, alwaysVisibleColumns);
};

export function usePersistentColumnVisibility({
  storageKey,
  defaultVisibility = {},
  enabled = true,
  alwaysVisibleColumns = [],
}: PersistentColumnVisibilityOptions) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (!enabled) {
      return applyAlwaysVisible(defaultVisibility, alwaysVisibleColumns);
    }
    return readSavedVisibility(storageKey, defaultVisibility, alwaysVisibleColumns);
  });

  const handleVisibilityChange = useCallback(
    (updater: any) => {
      setColumnVisibility((prev) => {
        const nextVisibility =
          typeof updater === 'function' ? updater(prev) : updater;
        const newVisibility = applyAlwaysVisible(
          nextVisibility,
          alwaysVisibleColumns,
        );
        if (enabled) {
          Cookies.set(storageKey, JSON.stringify(newVisibility), COOKIE_OPTIONS);
        }
        return newVisibility;
      });
    },
    [alwaysVisibleColumns, enabled, storageKey],
  );

  useEffect(() => {
    if (enabled) {
      setColumnVisibility(
        readSavedVisibility(storageKey, defaultVisibility, alwaysVisibleColumns),
      );
    } else {
      setColumnVisibility(
        applyAlwaysVisible(defaultVisibility, alwaysVisibleColumns),
      );
    }
    // defaultVisibility is rebuilt each render in some callers; key off enabled/storageKey/alwaysVisible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey, alwaysVisibleColumns.join('|')]);

  return { columnVisibility, onColumnVisibilityChange: handleVisibilityChange };
}
