export type DiffEntry = {
  key: string;
  old: any;
  new: any;
};

export type DisplayDiff = {
  key: string;
  old: any;
  new: any;
  label: string;
};

const IGNORED_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "edited_at",
  "added_at",
  "added_by",
  "edited_by",
  "user_id",
  "company_id",
  "record_id",
  "action",
  "expired_at",
  "request_date",
  "qr_code_image",
  "user_code",
  "usersId",
  "image",
  "password",
  "token",
  "is_working",
  "is_active",
  "is_invited",
  "is_check_in",
  "status",
  "joined_on",
  "archived_at",
  "removed_on",
  "timezone_id",
  "cis_amount",
  "gross_amount",
  "user_role_id",
  "joining_date",
  "new_rate_perDay",
  "new_rate_perday",
  "net_rate_perhour",
  "trade_id",
  "is_conflict_resolved",
  "is_account_conflict_resolved",
  "conflict_resolved_by",
  "account_conflict_resolved_by",
]);

const ID_TO_NAME: Record<string, string> = {
  trade_id: "trade_name",
  trade: "trade_name",
  shift_id: "shift_name",
  shift: "shift_name",
  team_id: "team_title",
  team: "team_title",
  project_id: "project_name",
  store_id: "store_name",
  supplier_id: "supplier_name",
  address_id: "address_name",
  supervisor_id: "supervisor_name",
  category_id: "category_name",
  leave_id: "leave_name",
  net_rate_perday: "rate"
};

const LABEL_OVERRIDES: Record<string, string> = {
  trade_id: "Trade",
  trade_name: "Trade",
  trade: "Trade",
  shift_id: "Shift",
  shift_name: "Shift",
  team_id: "Team",
  team_title: "Team",
  team_name: "Team",
  project_id: "Project",
  project_name: "Project",
  store_id: "Store",
  store_name: "Store",
  supplier_id: "Supplier",
  supplier_name: "Supplier",
  address_id: "Address",
  address_name: "Address",
  supervisor_id: "Supervisor",
  supervisor_name: "Supervisor",
  category_id: "Category",
  category_name: "Category",
  leave_id: "Leave Type",
  leave_name: "Leave Type",
  utr_number: "UTR Number",
  net_rate_perday: "Rate",
  net_rate_perDay: "Rate",
  rate: "Rate",
  start_work_location: "Start Location",
  stop_work_location: "End Location",
  penalty_note: "Penalty Note",
  appeal_note: "Appeal Note",
  penalty_type: "Type",
  penalty_hours: "Penalty Hours",
  penalty_minutes: "Penalty Hours",
  date: "Date",
  start_time: "Start Time",
  end_time: "End Time",
  start_date: "Start Date",
  end_date: "End Date",
};

export function isBlankDiffValue(value: any, _key?: string): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "object") return true;
  const text = String(value).trim().toLowerCase();
  if (
    text === "" ||
    text === "null" ||
    text === "none" ||
    text === "undefined" ||
    text === "nan" ||
    text === "0" ||
    value === 0
  ) {
    return true;
  }
  return false;
}

export function formatDiffLabel(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  return key
    .replace(/_id$/i, "")
    .replace(/_name$/i, "")
    .replace(/_/g, " ")
    .trim();
}

const KEY_ALIASES: Record<string, string> = {
  trade: "trade_name",
  team: "team_title",
  shift: "shift_name",
  net_rate_perday: "rate",
  net_rate_perDay: "rate",
};

export function prepareDisplayDiffs(diffs?: DiffEntry[] | null): DisplayDiff[] {
  if (!diffs?.length) return [];

  const byKey = new Map<string, DiffEntry>();
  for (const diff of diffs) {
    const key = KEY_ALIASES[diff?.key] || diff?.key;
    if (!key || IGNORED_KEYS.has(key) || IGNORED_KEYS.has(diff.key)) continue;
    byKey.set(key, { ...diff, key });
  }

  for (const [idKey, nameKey] of Object.entries(ID_TO_NAME)) {
    if (byKey.has(nameKey)) {
      byKey.delete(idKey);
    }
  }

  const rows: DisplayDiff[] = [];
  for (const diff of byKey.values()) {
    const oldValue = isBlankDiffValue(diff.old, diff.key) ? null : diff.old;
    const newValue = isBlankDiffValue(diff.new, diff.key) ? null : diff.new;
    if (oldValue == null && newValue == null) continue;
    rows.push({
      key: diff.key,
      old: oldValue,
      new: newValue,
      label: formatDiffLabel(diff.key),
    });
  }

  return rows;
}

export function fallbackDiffsFromPayload(
  oldData: any,
  newData: any,
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  if (!oldData && !newData) return diffs;

  const parse = (data: any) => {
    if (data == null) return {};
    if (typeof data === "string") {
      if (data === "[object Object]") return {};
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  };

  let oldObj = parse(oldData);
  let newObj = parse(newData);
  const hasReferenceIds = Object.keys(ID_TO_NAME).some(
    (key) =>
      Object.prototype.hasOwnProperty.call(oldObj, key) ||
      Object.prototype.hasOwnProperty.call(newObj, key),
  );

  const nested = (obj: any, key: string) => parse(obj?.[key]);
  if (!hasReferenceIds) {
    if (newObj.billing_info || oldObj.billing_info) {
      newObj = nested(newObj, "billing_info");
      oldObj = nested(oldObj, "billing_info");
    } else if (newObj.billin_info || oldObj.billin_info) {
      newObj = nested(newObj, "billin_info");
      oldObj = nested(oldObj, "billin_info");
    } else if (newObj.user || oldObj.user) {
      newObj = nested(newObj, "user");
      oldObj = nested(oldObj, "user");
    } else if (newObj.rate_trade || oldObj.rate_trade) {
      newObj = nested(newObj, "rate_trade");
      oldObj = nested(oldObj, "rate_trade");
    }
  }

  const flattenNames = (obj: Record<string, any>) => {
    const flat = { ...obj };
    if (flat.trade && typeof flat.trade === "object") {
      if (flat.trade_name == null) flat.trade_name = flat.trade.name ?? null;
      if (flat.trade_id == null) flat.trade_id = flat.trade.id ?? null;
      delete flat.trade;
    } else if (typeof flat.trade === "string") {
      if (flat.trade_name == null) flat.trade_name = flat.trade;
      delete flat.trade;
    }
    return flat;
  };
  oldObj = flattenNames(oldObj);
  newObj = flattenNames(newObj);

  const keys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);

  for (const key of keys) {
    const mappedKey = KEY_ALIASES[key] || key;
    if (IGNORED_KEYS.has(mappedKey) || IGNORED_KEYS.has(key)) continue;
    const nameKey = ID_TO_NAME[mappedKey] || ID_TO_NAME[key];
    if (nameKey && (oldObj[nameKey] != null || newObj[nameKey] != null)) {
      continue;
    }
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (oldVal && typeof oldVal === "object") continue;
    if (newVal && typeof newVal === "object") continue;
    if (isBlankDiffValue(oldVal, key) && isBlankDiffValue(newVal, key)) continue;
    if (oldVal === newVal || String(oldVal ?? "") === String(newVal ?? "")) {
      continue;
    }
    diffs.push({ key: mappedKey, old: oldVal, new: newVal });
  }

  return diffs;
}

