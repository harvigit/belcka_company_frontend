import Cookies from 'js-cookie';
import type { VisibilityState } from '@tanstack/react-table';

const COOKIE_OPTIONS = {
  expires: 365,
  sameSite: 'lax' as const,
  path: '/',
};

export const loadColumnVisibilityCookie = (key: string): VisibilityState | null => {
  try {
    const stored = Cookies.get(key);
    return stored ? JSON.parse(stored) as VisibilityState : null;
  } catch (error) {
    console.error(`Error loading column visibility cookie ${key}:`, error);
    return null;
  }
};

export const saveColumnVisibilityCookie = (key: string, visibility: VisibilityState) => {
  try {
    Cookies.set(key, JSON.stringify(visibility), COOKIE_OPTIONS);
  } catch (error) {
    console.error(`Error saving column visibility cookie ${key}:`, error);
  }
};
