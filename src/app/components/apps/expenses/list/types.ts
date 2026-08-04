export type ExpenseStatus = "pending" | "approved" | "sent" | "rejected";

export type ExpenseTabKey = "all" | ExpenseStatus;

export type ExpenseTabItem = {
  key: ExpenseTabKey;
  label: string;
  count: number;
};

/** Raw row shape from `expense/list-web` */
export type ExpenseApiRow = {
  id: number;
  total_amount: number;
  currency?: string;
  receipt_date?: string | null;
  date_added?: string | null;
  user_id?: number;
  user_name?: string | null;
  project_id?: number;
  project_name?: string | null;
  category_id?: number;
  category_name?: string | null;
  trade_id?: number | null;
  trade_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  address_id?: number;
  address_name?: string | null;
  note?: string | null;
  attachment_count?: number;
  /** Present once list-web is extended; optional for now */
  status?: ExpenseStatus | string | number | null;
};

export type ExpenseListItem = {
  id: number;
  date: string;
  submittedBy: {
    name: string;
    role: string;
    initials: string;
    avatarColor: string;
  };
  project: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  attachmentCount: number;
};

const AVATAR_COLORS = [
  "#7C3AED",
  "#2563EB",
  "#0D9488",
  "#DB2777",
  "#EA580C",
  "#4F46E5",
  "#0891B2",
  "#9333EA",
];

export const getInitials = (name?: string | null): string => {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
};

export const getAvatarColor = (seed: string | number): string => {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash + str.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
};

export const normalizeExpenseStatus = (
  value: ExpenseApiRow["status"],
): ExpenseStatus | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    // Common numeric codes used elsewhere in the app — adjust when API is wired
    if (value === 1) return "pending";
    if (value === 2) return "approved";
    if (value === 3) return "rejected";
    if (value === 4) return "sent";
    return null;
  }
  const key = String(value).toLowerCase();
  if (
    key === "pending" ||
    key === "approved" ||
    key === "rejected" ||
    key === "sent"
  ) {
    return key;
  }
  return null;
};
