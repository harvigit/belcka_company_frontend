"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useSession } from "next-auth/react";

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

export type ReportBrand = { name: string; logo: string | null };

// Logos are inlined as data URLs so html2canvas can draw them (a cross-origin <img> would taint
// the canvas). One fetch per URL for the whole session; null when the image can't be read.
const logoCache = new Map<string, Promise<string | null>>();
const logoDataUrl = (url: string) => {
  if (!logoCache.has(url)) {
    logoCache.set(
      url,
      fetch(url)
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
        .then(
          (blob) =>
            new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            }),
        )
        .catch(() => null),
    );
  }
  return logoCache.get(url)!;
};

/** The signed-in company's name and logo, shown in the header of every survey document. */
export function useReportBrand(): ReportBrand {
  const { data } = useSession();
  const user = data?.user as { company_name?: string | null; company_image?: string | null } | undefined;
  const image = user?.company_image || null;
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLogo(null);
    if (image) void logoDataUrl(image).then((value) => active && setLogo(value));
    return () => {
      active = false;
    };
  }, [image]);
  return { name: user?.company_name || "Belcka", logo };
}

/**
 * Common top of every survey document: company logo, document type and reference in a brand bar,
 * then the title, status and key facts.
 */
export function ReportHeader({
  brand,
  documentType,
  reference,
  title,
  subtitle,
  status,
  statusTone = "brand",
  meta,
}: {
  brand: ReportBrand;
  documentType: string;
  reference: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status: string;
  statusTone?: Tone;
  meta: { label: string; value: React.ReactNode }[];
}) {
  return (
    <Box>
      {/* Brand bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          pb: 1.75,
          borderBottom: `1px solid ${REPORT.line}`,
          borderRadius: 0,
          minHeight: 56,
        }}
      >
        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo} alt={brand.name} style={{ maxHeight: 40, maxWidth: 180, objectFit: "contain", display: "block" }} />
        ) : (
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: REPORT.ink }}>{brand.name}</Typography>
        )}
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: REPORT.brand, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {documentType}
          </Typography>
          <Typography sx={{ fontSize: 11, color: REPORT.muted, mt: 0.25 }}>
            {reference} · Generated {reportDate(new Date())}
          </Typography>
        </Box>
      </Box>

      {/* Title and status */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 800, color: REPORT.ink, lineHeight: 1.25 }}>{title}</Typography>
          {subtitle && <Typography sx={{ fontSize: 13, color: REPORT.muted, mt: 0.75 }}>{subtitle}</Typography>}
        </Box>
        <Box sx={{ flexShrink: 0, pt: 0.5 }}>
          <Pill tone={statusTone}>{status}</Pill>
        </Box>
      </Box>

      {/* Key facts */}
      <Box
        sx={{
          mt: 2.5,
          display: "grid",
          gridTemplateColumns: `repeat(${meta.length}, 1fr)`,
          border: `1px solid ${REPORT.line}`,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {meta.map((m, index) => (
          <Box
            key={m.label}
            sx={{ minWidth: 0, px: 1.75, py: 1.25, borderLeft: index ? `1px solid ${REPORT.line}` : "none", borderRadius: 0 }}
          >
            <Label>{m.label}</Label>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: REPORT.ink, mt: 0.375, wordBreak: "break-word" }}>
              {m.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Common bottom of every survey document on screen and in print. The downloaded PDF draws the same
 * line on each page (with the page number) instead, so this block is not part of the PDF.
 */
export function ReportFooter({ brand, documentType, reference }: { brand: ReportBrand; documentType: string; reference: string }) {
  return (
    <Box
      sx={{
        mt: 3,
        pt: 1.5,
        borderTop: `1px solid ${REPORT.line}`,
        borderRadius: 0,
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        fontSize: 10.5,
        color: REPORT.muted,
      }}
    >
      <span>
        <strong style={{ color: REPORT.ink }}>{brand.name}</strong> · {documentType}
      </span>
      <span style={{ whiteSpace: "nowrap" }}>{reference}</span>
    </Box>
  );
}

export const reportDate = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

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
