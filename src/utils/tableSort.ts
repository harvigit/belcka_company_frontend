import type { SortingState } from "@tanstack/react-table";

export const TABLE_SORT_ALL_LIMIT = 10000;

const SKIP_SORT_COLUMN_IDS = new Set([
  "select",
  "actions",
  "action",
  "Image",
  "image",
  "QR",
]);

export function camelToSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function resolveSortField(
  columnId: string,
  fieldMap?: Record<string, string>,
): string {
  if (fieldMap?.[columnId]) return fieldMap[columnId];
  return camelToSnake(columnId);
}

export function getTableSortQuery(
  sorting: SortingState | undefined,
  fieldMap?: Record<string, string>,
): { sort_by: string; sort_order: "asc" | "desc" } | null {
  if (!sorting?.length) return null;
  const columnId = String(sorting[0]?.id || "").trim();
  if (!columnId || SKIP_SORT_COLUMN_IDS.has(columnId)) return null;
  return {
    sort_by: resolveSortField(columnId, fieldMap),
    sort_order: sorting[0].desc ? "desc" : "asc",
  };
}

export function appendTableSortQuery(
  url: string,
  sorting: SortingState | undefined,
  fieldMap?: Record<string, string>,
): string {
  const sort = getTableSortQuery(sorting, fieldMap);
  if (!sort) return url;
  if (/[?&]sort_by=/.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sort_by=${encodeURIComponent(sort.sort_by)}&sort_order=${sort.sort_order}`;
}

export function axiosRequestHasPagination(config: {
  url?: string;
  params?: Record<string, any>;
}): boolean {
  const url = String(config.url || "");
  const params = config.params || {};
  const pageInUrl = /[?&]page=/.test(url);
  const limitInUrl = /[?&]limit=/.test(url);
  const pageInParams = params.page !== undefined && params.page !== null;
  const limitInParams = params.limit !== undefined && params.limit !== null;
  return (pageInUrl || pageInParams) && (limitInUrl || limitInParams);
}

export function axiosRequestHasSort(config: {
  url?: string;
  params?: Record<string, any>;
}): boolean {
  const url = String(config.url || "");
  const params = config.params || {};
  return /[?&]sort_by=/.test(url) || params.sort_by !== undefined;
}

export function applyFetchAllPaginationToAxiosConfig(
  config: { url?: string; params?: Record<string, any> },
  maxRows = TABLE_SORT_ALL_LIMIT,
) {
  if (config.params && typeof config.params === "object") {
    if (config.params.page !== undefined || config.params.limit !== undefined) {
      config.params = {
        ...config.params,
        page: 1,
        limit: maxRows,
      };
    }
  }
  if (config.url && /[?&]page=/.test(config.url) && /[?&]limit=/.test(config.url)) {
    config.url = config.url.replace(/([?&])page=[^&]*/g, `$1page=1`);
    config.url = config.url.replace(/([?&])limit=[^&]*/g, `$1limit=${maxRows}`);
  }
}
