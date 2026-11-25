import { unitLabel } from "@/app/components/apps/surveys/shared/units";
// Survey › Settings › NHF rates: shared types and helpers.

export type NhfSheet = {
  id: number;
  name: string;
  effective_date: string | null;
  current_version: { id: number; version: number; file_name: string | null; note: string | null; created_at: string } | null;
  codes_count: number;
  versions_count: number;
  used_by_template_lines: number;
};

export type NhfCode = {
  id: number;
  code: string;
  short_name: string | null;
  long_description: string | null;
  element_1: string | null;
  element_2: string | null;
  element_3: string | null;
  uom: string | null;
  rate: number | null;
  source: "import" | "manual" | "template";
  source_note: string | null;
};

export type NhfVersion = {
  id: number;
  version: number;
  file_name: string | null;
  note: string | null;
  effective_date: string | null;
  codes_count: number;
  created_at: string;
  created_by: string | null;
  current: boolean;
};

// Unit code → label, from Survey settings › Units (see shared/units.ts).
export const uomLabel = (u?: string | null) => unitLabel(u);

export const money = (n?: number | null) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "–"
    : "£" + Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const shortDate = (iso?: string | null) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "–";

export const apiMessage = (error: any, fallback: string) => {
  const m = error?.response?.data?.message;
  return Array.isArray(m) ? m.join(", ") : typeof m === "string" ? m : fallback;
};
