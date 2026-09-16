export type NamedFilterOption = {
  id: number | string;
  name: string;
  title?: string;
  [key: string]: unknown;
};

export function uniqueOptionsFromRows<T extends Record<string, any>>(
  rows: T[],
  idKey: keyof T,
  nameKey: keyof T,
): NamedFilterOption[] {
  const map = new Map<string, NamedFilterOption>();
  for (const row of rows) {
    const id = row[idKey];
    if (id == null || id === "") continue;
    if (typeof id === "number" && id <= 0) continue;
    const key = String(id);
    if (map.has(key)) continue;
    const name = String(row[nameKey] ?? "").trim() || key;
    map.set(key, { id, name, title: name });
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function mergeFilterOptions(
  ...lists: Array<NamedFilterOption[] | undefined | null>
): NamedFilterOption[] {
  const map = new Map<string, NamedFilterOption>();
  for (const list of lists) {
    for (const item of list || []) {
      if (item?.id == null || item.id === "") continue;
      const key = String(item.id);
      if (!map.has(key)) map.set(key, item);
    }
  }
  return [...map.values()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      sensitivity: "base",
    }),
  );
}

export function tableFilterOptions<T extends Record<string, any>>(
  apiOptions: NamedFilterOption[] | undefined,
  rows: T[],
  idKey: keyof T,
  nameKey: keyof T,
  previous?: NamedFilterOption[] | null,
): NamedFilterOption[] {
  if (Array.isArray(apiOptions)) {
    return mergeFilterOptions(apiOptions);
  }
  return mergeFilterOptions(previous, uniqueOptionsFromRows(rows, idKey, nameKey));
}
