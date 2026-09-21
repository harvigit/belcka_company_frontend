import Cookies from "js-cookie";

const COOKIE_REMOVE_OPTIONS = { path: "/" };

export const LISTING_STATE_COOKIE_PREFIXES = [
  "users_table_state_",
  "teams_table_state_",
  "cases_table_state_",
  "checkins_table_state_",
  "tasks_table_state_",
  "project_dashboard_table_state_",
  "products_table_state_",
  "collect_table_state_",
  "purchase_orders_table_state_",
  "stocks_table_state_",
  "expense-list-filters",
  "time-clock-filters",
  "pricework-list-filters",
  "address-list-preferences",
  "leave-list-preferences",
  "po_invoices_table_state_",
  "project-detail-filters",
] as const;

const isListingStateCookieName = (name: string) =>
  LISTING_STATE_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix));

export const readListingTableState = (key: string): string | undefined => {
  if (!key || typeof window === "undefined") return undefined;

  try {
    const fromStorage = window.localStorage.getItem(key);
    if (fromStorage != null) {
      Cookies.remove(key, COOKIE_REMOVE_OPTIONS);
      return fromStorage;
    }

    const fromCookie = Cookies.get(key);
    if (fromCookie != null) {
      window.localStorage.setItem(key, fromCookie);
      Cookies.remove(key, COOKIE_REMOVE_OPTIONS);
      return fromCookie;
    }
  } catch (error) {
    console.error("Failed to read listing table state", error);
  }

  Cookies.remove(key, COOKIE_REMOVE_OPTIONS);
  return undefined;
};

export const writeListingTableState = (key: string, value: string) => {
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error("Failed to write listing table state", error);
  }

  Cookies.remove(key, COOKIE_REMOVE_OPTIONS);
};

export const removeListingTableState = (key: string) => {
  if (!key || typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to remove listing table state", error);
  }

  Cookies.remove(key, COOKIE_REMOVE_OPTIONS);
};

export const clearLegacyListingStateCookies = () => {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.cookie.split(";").forEach((part) => {
    const name = part.split("=")[0]?.trim();
    if (!name || !isListingStateCookieName(name)) return;

    const value = Cookies.get(name);
    if (value != null) {
      try {
        if (window.localStorage.getItem(name) == null) {
          window.localStorage.setItem(name, value);
        }
      } catch (error) {
        console.error("Failed to migrate listing table state cookie", error);
      }
    }

    Cookies.remove(name, COOKIE_REMOVE_OPTIONS);
  });
};
