import type { VisibilityState } from '@tanstack/react-table';
import {
  readListingTableState,
  writeListingTableState,
} from '@/utils/listingTableStateStorage';

// Stored in localStorage (legacy cookies are migrated and removed on read).
export const loadColumnVisibilityCookie = (key: string): VisibilityState | null => {
  try {
    const stored = readListingTableState(key);
    return stored ? JSON.parse(stored) as VisibilityState : null;
  } catch (error) {
    console.error(`Error loading column visibility ${key}:`, error);
    return null;
  }
};

export const saveColumnVisibilityCookie = (key: string, visibility: VisibilityState) => {
  writeListingTableState(key, JSON.stringify(visibility));
};
