// QS review (web): shared types and helpers.

export type QsLineStatus = "pending" | "approved" | "excluded";

export type QsLine = {
  item_id: number;
  room: string;
  path: string[];
  element: string;
  work_name: string | null;
  surveyor: { qty: number | null; unit: string | null; qty_status: "est" | "ver" | null; vo: "Main" | "VO" | null; note: string | null; also_rooms: string[] };
  photos: { id: number; url: string | null }[];
  added_on_site: boolean;
  ai_suggested: boolean;
  code: string | null;
  code_changed: boolean;
  nhf: { sheet: string; short_name: string | null; long_description: string | null; uom: string | null; rate: number | null } | null;
  template_rate: number | null;
  rate: number | null;
  rate_source: "manual" | "nhf" | "template" | "none";
  qty: number | null;
  qty_changed: boolean;
  unit: string | null;
  uom_mismatch: boolean;
  net: number | null;
  amount: number | null;
  status: QsLineStatus;
  reason: string | null;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  changed_after_review: boolean;
};

export type QsTotals = {
  lines: number;
  pending: number;
  approved: number;
  excluded: number;
  no_rate: number;
  changed_after_review: number;
  net: number;
  uplift: number;
  total: number;
  vat_on: boolean;
  vat: number;
  grand_total: number;
};

export type QsDetail = {
  survey: {
    id: number;
    reference: string;
    title: string;
    status: string;
    status_label: string;
    project: { id: number; name: string } | null;
    address: { id: number; name: string } | null;
    surveyor: { id: number; name: string } | null;
    submitted_at: string | null;
    rework_notes: string | null;
    qs_started_by: string | null;
    qs_started_at: string | null;
    qs_completed_by: string | null;
    qs_completed_at: string | null;
  };
  uplift_percent: number;
  lines: QsLine[];
  totals: QsTotals;
  exclude_reasons: string[];
  can_start: boolean;
  can_edit: boolean;
  can_rework: boolean;
  can_complete: boolean;
  can_reopen: boolean;
};

export type QsRow = {
  id: number;
  reference: string;
  title: string;
  project: { id: number; name: string } | null;
  address: { id: number; name: string } | null;
  surveyor: { id: number; name: string } | null;
  status: string;
  status_label: string;
  rework_notes: string | null;
  submitted_at: string | null;
  qs_completed_at: string | null;
  lines: number;
  reviewed: number;
  no_rate: number;
  total: number | null;
};

export const LINE_META: Record<QsLineStatus, { label: string; color: "warning" | "success" | "default" }> = {
  pending: { label: "To review", color: "warning" },
  approved: { label: "Approved", color: "success" },
  excluded: { label: "Excluded", color: "default" },
};

export const RATE_SOURCE: Record<QsLine["rate_source"], string> = {
  nhf: "NHF rate",
  manual: "Manual rate",
  template: "Template rate",
  none: "No rate",
};

export const gbp = (n?: number | null) =>
  n === null || n === undefined ? "–" : "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
