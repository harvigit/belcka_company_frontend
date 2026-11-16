"use client";

import React from "react";
import { Box, Typography } from "@mui/material";

// Shared building blocks for the printable survey documents (survey report, job pack), so both
// look like one family. Fixed colours rather than theme tokens: these pages are printed and
// captured to PDF, and must look the same in light and dark mode.
export const REPORT = {
  ink: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  soft: "#f8fafc",
  brand: "#1e4db7",
  brandSoft: "#eef3fc",
  font: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: "#f1f5f9", fg: "#475569", border: "#e2e8f0" },
  brand: { bg: "#eef3fc", fg: "#1e4db7", border: "#c9d7f5" },
  success: { bg: "#ecfdf3", fg: "#047857", border: "#bbf0d4" },
  warning: { bg: "#fff7e6", fg: "#a15c07", border: "#fde3b0" },
  danger: { bg: "#fef2f2", fg: "#b42318", border: "#fecdca" },
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: "16px",
        whiteSpace: "nowrap",
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
      }}
    >
      {children}
    </span>
  );
}

/** Top of a document: brand line, title, reference, status and generated date. */
export function ReportHeader({
  documentType,
  title,
  subtitle,
  status,
  statusTone = "brand",
  meta,
}: {
  documentType: string;
  title: string;
  subtitle?: React.ReactNode;
  status: string;
  statusTone?: Tone;
  meta: { label: string; value: React.ReactNode }[];
}) {
  return (
    <Box sx={{ pb: 2.5, borderBottom: `2px solid ${REPORT.brand}`, borderRadius: 0 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography sx={{ fontWeight: 800, letterSpacing: "0.32em", fontSize: 18, color: REPORT.ink }}>
            BELCKA
          </Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: REPORT.muted, textTransform: "uppercase", letterSpacing: 1 }}>
            {documentType}
          </Typography>
        </Box>
        <Pill tone={statusTone}>{status}</Pill>
      </Box>

      <Typography sx={{ fontSize: 24, fontWeight: 800, color: REPORT.ink, lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 13, color: REPORT.muted, mt: 0.5 }}>{subtitle}</Typography>
      )}

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: `repeat(${meta.length}, 1fr)`,
          gap: 2,
        }}
      >
        {meta.map((m) => (
          <Box key={m.label} sx={{ minWidth: 0 }}>
            <Label>{m.label}</Label>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: REPORT.ink, mt: 0.25, wordBreak: "break-word" }}>
              {m.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="div"
      sx={{ fontSize: 10, fontWeight: 700, color: REPORT.muted, textTransform: "uppercase", letterSpacing: 0.6 }}
    >
      {children}
    </Typography>
  );
}

/** Numbered section heading, e.g. "2  Defect schedule". */
export function SectionTitle({ number, title, aside }: { number: number; title: string; aside?: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "6px",
            bgcolor: REPORT.brandSoft,
            color: REPORT.brand,
            fontSize: 12,
            fontWeight: 800,
            display: "grid",
            placeItems: "center",
          }}
        >
          {number}
        </Box>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: REPORT.ink }}>{title}</Typography>
      </Box>
      {aside}
    </Box>
  );
}

/** Small stat tile used in the summary row. */
export function Stat({ label, value, hint, valueColor }: { label: string; value: React.ReactNode; hint?: React.ReactNode; valueColor?: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: "8px", border: `1px solid ${REPORT.line}`, bgcolor: "#fff" }}>
      <Label>{label}</Label>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: valueColor || REPORT.ink, mt: 0.5, lineHeight: 1.2 }}>
        {value}
      </Typography>
      {hint && <Typography sx={{ fontSize: 11, color: REPORT.muted, mt: 0.25 }}>{hint}</Typography>}
    </Box>
  );
}

/** Table styling shared by the documents' data tables. */
export const tableSx = {
  width: "100%",
  borderCollapse: "collapse" as const,
  fontSize: 12,
  color: REPORT.text,
  "& th": {
    textAlign: "left" as const,
    fontSize: 10,
    fontWeight: 700,
    color: REPORT.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    bgcolor: REPORT.soft,
    px: 1,
    py: 0.875,
    borderBottom: `1px solid ${REPORT.line}`,
  },
  "& td": {
    px: 1,
    py: 0.875,
    borderBottom: `1px solid ${REPORT.line}`,
    verticalAlign: "top" as const,
  },
  "& tbody tr:last-of-type td": { borderBottom: "none" },
  "& .num": { textAlign: "right" as const, whiteSpace: "nowrap" as const },
};

export const money = (value: number | string | null | undefined) =>
  `£${(Number(value) || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const humanize = (value?: string | null) =>
  value
    ? value
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .replace(/\bqs\b/gi, "QS")
    : "";
