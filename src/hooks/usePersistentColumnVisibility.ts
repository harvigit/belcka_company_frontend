import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface PersistentColumnVisibilityOptions {
  storageKey: string;
  defaultVisibility?: Record<string, boolean>;
  enabled?: boolean;
}

const COOKIE_OPTIONS = { expires: 365, path: '/' };

export function usePersistentColumnVisibility({
  storageKey,
  defaultVisibility = {},
  enabled = true
}: PersistentColumnVisibilityOptions) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (!enabled) return defaultVisibility;
    const saved = Cookies.get(storageKey);
    if (saved) {
      try {
        return { ...defaultVisibility, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return defaultVisibility;
  });

  const handleVisibilityChange = (updater: any) => {
    setColumnVisibility((prev) => {
      const newVisibility = typeof updater === 'function' ? updater(prev) : updater;
      if (enabled) {
        Cookies.set(storageKey, JSON.stringify(newVisibility), COOKIE_OPTIONS);
      }
      return newVisibility;
    });
  };

  useEffect(() => {
    if (enabled) {
      const saved = Cookies.get(storageKey);
      if (saved) {
        try {
          setColumnVisibility({ ...defaultVisibility, ...JSON.parse(saved) });
        } catch (e) {}
      } else {
        setColumnVisibility(defaultVisibility);
      }
    } else {
      setColumnVisibility(defaultVisibility);
    }
  }, [enabled, storageKey]);

  return { columnVisibility, onColumnVisibilityChange: handleVisibilityChange };
}
