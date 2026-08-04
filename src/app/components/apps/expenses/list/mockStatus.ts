import { ExpenseStatus } from "./types";

/**
 * Temporary status helpers until `expense/list-web` returns status.
 * Remove this file and related imports once the API provides status.
 */
const CYCLE: ExpenseStatus[] = [
  "approved",
  "pending",
  "pending",
  "approved",
  "sent",
  "approved",
  "pending",
  "sent",
];

export const getMockExpenseStatus = (expenseId: number): ExpenseStatus => {
  return CYCLE[Math.abs(expenseId) % CYCLE.length];
};

/** Static tab counts for UI only — replace with API aggregates later. */
export const MOCK_EXPENSE_TAB_COUNTS = [
  { key: "all" as const, label: "All", count: 56 },
  { key: "pending" as const, label: "Pending", count: 24 },
  { key: "approved" as const, label: "Approved", count: 23 },
  { key: "sent" as const, label: "Sent", count: 9 },
  { key: "rejected" as const, label: "Rejected", count: 0 },
];
