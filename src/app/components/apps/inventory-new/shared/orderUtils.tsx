import React from "react";
import { Typography } from "@mui/material";
import { qty } from "./useInventoryOptions";

// Base units shown as packs + loose units, e.g. 29 with 12 per pack -> "2 packs + 5 pair".
export function packsText(
  base: number | null | undefined,
  packQty: number | null | undefined,
  unit?: string | null,
  packUnit?: string | null,
) {
  const n = Number(base ?? 0);
  const u = unit || "unit";
  if (!packQty || packQty <= 1) return `${qty(n)} ${u}`;
  const packs = Math.floor(n / packQty + 1e-9);
  const rest = Number((n - packs * packQty).toFixed(2));
  const p = packUnit || "pack";
  const parts = [];
  if (packs) parts.push(`${packs} ${p}${packs > 1 && !packUnit ? "s" : ""}`);
  if (rest || !packs) parts.push(`${qty(rest)} ${u}`);
  return parts.join(" + ");
}

// Splits base units into whole packs and loose units for editing.
export const splitQty = (base: number, packQty: number) => {
  if (!packQty || packQty <= 1) return { packs: 0, units: base };
  const packs = Math.floor(base / packQty + 1e-9);
  return { packs, units: Number((base - packs * packQty).toFixed(2)) };
};

type Tone = "warning" | "success" | "error" | "primary" | "default";

// Coloured status text, the same look as the status labels in the other drawers.
export const StatusText: React.FC<{ label: string; tone: Tone }> = ({
  label,
  tone,
}) => (
  <Typography
    variant="body2"
    component="span"
    sx={{
      bgcolor: tone === "default" ? "grey.200" : `${tone}.light`,
      color: tone === "default" ? "text.secondary" : `${tone}.main`,
      px: 1.25,
      py: 0.25,
      borderRadius: 1,
      display: "inline-block",
      fontWeight: 600,
      whiteSpace: "nowrap",
      fontSize: 13,
    }}
  >
    {label}
  </Typography>
);

export const PO_STATUS: Record<number, { label: string; tone: Tone }> = {
  0: { label: "Draft", tone: "default" },
  1: { label: "Ordered", tone: "primary" },
  2: { label: "Partly received", tone: "warning" },
  3: { label: "Received", tone: "success" },
  4: { label: "Cancelled", tone: "error" },
  5: { label: "Closed short", tone: "default" },
};

export const IO_STATUS: Record<number, { label: string; tone: Tone }> = {
  0: { label: "Draft", tone: "default" },
  1: { label: "Issued", tone: "success" },
  2: { label: "Cancelled", tone: "error" },
};

export const STOCK_LEVEL: Record<string, { label: string; tone: Tone }> = {
  below_min: { label: "Below min", tone: "error" },
  below_max: { label: "Below max", tone: "warning" },
  ok: { label: "OK", tone: "success" },
  not_on_list: { label: "Not on store list", tone: "default" },
};

export const MOVEMENT_TEXT: Record<string, string> = {
  receipt: "Received",
  damaged_on_delivery: "Damaged on delivery (paid)",
  allocation: "Issued",
  missing: "Missing",
  damaged: "Damaged",
  found: "Found",
};

export const dateText = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "-";

// "2026-10-30" for <input type="date">
export const isoDate = (value?: string | Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
