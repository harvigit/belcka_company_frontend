"use client";

import React from "react";
import { Box, Typography, Chip, Stack } from "@mui/material";
import dayjs from "dayjs";
import { Survey } from "../../types";
import { PDF_PAGE_BLOCK_ATTR } from "./surveyPdfExport";

interface SurveyPrintableReportProps {
  survey: Survey;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function SurveyPrintableReport({ survey, containerRef }: SurveyPrintableReportProps) {
  const getImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const totalElements = (survey.rooms || []).reduce(
    (acc, r) => acc + (r.items ? r.items.length : 0),
    0
  );
  const inspectedElements = (survey.rooms || []).reduce(
    (acc, r) => acc + (r.items ? r.items.filter((i) => i.is_inspected).length : 0),
    0
  );
  const defectElements = (survey.rooms || []).flatMap((r) =>
    (r.items || []).filter(
      (i) => i.condition === "damaged" || i.condition === "minor_defects" || Boolean(i.repair_action)
    )
  );

  const scopeItems = survey.scope_items || [];
  const baseEstimate = scopeItems.reduce((acc, l) => acc + (Number(l.total_amount) || 0), 0);
  const adjustSign = survey.scope_adjust_sign === -1 ? -1 : 1;
  const adjustType = survey.scope_adjust_type || "percent";
  const adjustValue = Number(survey.scope_adjust_value) || 0;
  let adjustAmount = 0;
  if (adjustType === "percent") {
    adjustAmount = Math.round((baseEstimate * (adjustValue / 100) * adjustSign + Number.EPSILON) * 100) / 100;
  } else {
    adjustAmount = Math.round((adjustValue * adjustSign + Number.EPSILON) * 100) / 100;
  }
  const baselineTotal =
    survey.baseline_total !== null && survey.baseline_total !== undefined
      ? Number(survey.baseline_total)
      : Math.max(0, baseEstimate + adjustAmount);

  const conditionColors: Record<string, { bg: string; text: string; border: string }> = {
    good: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
    minor_defects: { bg: "#fefce8", text: "#854d0e", border: "#fef08a" },
    damaged: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
    not_accessible: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  };

  return (
    <Box
      ref={containerRef}
      id="survey-printable-report"
      sx={{
        width: 794, // Standard A4 width at 96 DPI
        mx: "auto",
        p: 4,
        bgcolor: "#ffffff",
        color: "#1e293b",
        fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.45,
        "@media print": {
          width: "100%",
          p: 2,
          boxShadow: "none",
        },
      }}
    >
      {/* ============================================================== */}
      {/* 1. COVER / EXECUTIVE HEADER BLOCK                              */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }} sx={{ mb: 3 }}>
        {/* Navy Header Banner */}
        <Box
          sx={{
            p: 3,
            borderRadius: "10px",
            bgcolor: "#102936",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: "#007e85",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "6px",
                  fontWeight: 900,
                  fontSize: "1rem",
                }}
              >
                B
              </Box>
              <Typography variant="overline" sx={{ letterSpacing: 1.5, fontWeight: 700, color: "#66d3d5" }}>
                BELCKA PROPERTY SURVEY STUDIO
              </Typography>
            </Stack>

            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
              Inspection & Commercial Scope Report
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
              Reference: <strong style={{ color: "#ffffff" }}>{survey.reference}</strong> •{" "}
              {survey.title || "Full Property Condition Audit"}
            </Typography>
          </Box>

          <Box sx={{ textAlign: "right" }}>
            <Box
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.75,
                borderRadius: "6px",
                bgcolor:
                  survey.status === "completed" || survey.status === "frozen"
                    ? "#166534"
                    : survey.status === "qs_review" || survey.status === "submitted"
                    ? "#007e85"
                    : "#334155",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {survey.status.replace("_", " ")}
            </Box>
            <Typography variant="caption" sx={{ display: "block", color: "#94a3b8", mt: 0.75 }}>
              Generated: {dayjs().format("DD MMM YYYY, HH:mm")}
            </Typography>
          </Box>
        </Box>

        {/* Property & Survey Metadata Grid */}
        <Box
          sx={{
            mt: 2,
            p: 2.5,
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            bgcolor: "#f8fafc",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                PROPERTY ADDRESS
              </Typography>
              <Typography variant="body2" fontWeight={600} mt={0.25}>
                {survey.property_name || survey.address?.name || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                PROJECT / CLIENT
              </Typography>
              <Typography variant="body2" fontWeight={600} mt={0.25}>
                {survey.project_name || survey.project?.name || "—"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                ASSIGNED SURVEYOR
              </Typography>
              <Typography variant="body2" fontWeight={600} mt={0.25}>
                {survey.surveyor_name ||
                  (survey.surveyor ? `${survey.surveyor.first_name} ${survey.surveyor.last_name}` : "Unassigned")}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                INSPECTION DATE
              </Typography>
              <Typography variant="body2" fontWeight={600} mt={0.25}>
                {survey.survey_date ? dayjs(survey.survey_date).format("DD MMM YYYY") : "—"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 4 Executive KPI Cards */}
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
          }}
        >
          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              TOTAL ROOMS / AREAS
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#102936" mt={0.5}>
              {survey.rooms?.length || 0}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              INSPECTION COMPLETION
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#007e85" mt={0.5}>
              {inspectedElements} / {totalElements} (
              {totalElements > 0 ? Math.round((inspectedElements / totalElements) * 100) : 0}%)
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              DEFECTS IDENTIFIED
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              color={defectElements.length > 0 ? "#b91c1c" : "#166534"}
              mt={0.5}
            >
              {defectElements.length}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid #e2e8f0", bgcolor: "#ffffff" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              COMMERCIAL BASELINE
            </Typography>
            <Typography variant="h5" fontWeight={800} color="#102936" mt={0.5}>
              £
              {baselineTotal.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ============================================================== */}
      {/* 2. DEFECT SUMMARY CALLOUT BLOCK                                */}
      {/* ============================================================== */}
      {defectElements.length > 0 && (
        <Box
          {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }}
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "8px",
            border: "1px solid #fecaca",
            bgcolor: "#fff5f5",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" fontWeight={800} color="#991b1b">
              Defect Schedule & Remedial Actions ({defectElements.length})
            </Typography>
            <Chip
              label="Action Required"
              size="small"
              sx={{ bgcolor: "#fee2e2", color: "#991b1b", fontWeight: 700 }}
            />
          </Stack>

          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              "& th, & td": { p: 1, borderBottom: "1px solid #fee2e2", textAlign: "left" },
              "& th": { color: "#991b1b", fontWeight: 700, bgcolor: "#fef2f2" },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Element / Room</th>
                <th style={{ width: "25%" }}>Defect & Severity</th>
                <th style={{ width: "15%" }}>Qty / Unit</th>
                <th style={{ width: "30%" }}>Recommended Remedial Action</th>
              </tr>
            </thead>
            <tbody>
              {defectElements.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span style={{ color: item.condition === "damaged" ? "#b91c1c" : "#b45309", fontWeight: 600 }}>
                      {item.damage_type_name || item.condition || "Defect"}
                    </span>
                    {item.severity && (
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}> ({item.severity})</span>
                    )}
                  </td>
                  <td>
                    {item.calculated_qty !== null && item.calculated_qty !== undefined
                      ? `${item.calculated_qty} ${item.output_unit || "units"}`
                      : "—"}
                  </td>
                  <td>{item.repair_action || item.notes || "Remedial repair specified"}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {/* ============================================================== */}
      {/* 3. ROOM-BY-ROOM INSPECTION EVIDENCE SCHEDULE                   */}
      {/* ============================================================== */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={800} color="#102936" mb={1.5}>
          Room-by-Room Inspection Evidence Schedule
        </Typography>

        {(survey.rooms || []).map((room, rIdx) => {
          const roomItems = room.items || [];
          return (
            <Box
              key={room.id}
              {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }}
              sx={{
                mb: 3,
                p: 2.5,
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                bgcolor: "#ffffff",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle1" fontWeight={800} color="#102936">
                  {rIdx + 1}. {room.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {roomItems.filter((i) => i.is_inspected).length} of {roomItems.length} elements inspected
                </Typography>
              </Stack>

              {roomItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No inspection elements assigned to this room.
                </Typography>
              ) : (
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.8rem",
                    mb: 2,
                    "& th, & td": { p: 1, borderBottom: "1px solid #e2e8f0", textAlign: "left" },
                    "& th": { color: "#475569", fontWeight: 700, bgcolor: "#f8fafc" },
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Element</th>
                      <th style={{ width: "15%" }}>Condition</th>
                      <th style={{ width: "25%" }}>Site Measurements</th>
                      <th style={{ width: "13%" }}>Quantity</th>
                      <th style={{ width: "25%" }}>Defect & Repair Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomItems.map((item) => {
                      const cond = item.condition || "good";
                      const colors = conditionColors[cond] || conditionColors.good;
                      const dims = [
                        item.dimension_1_name && item.dimension_1_value
                          ? `${item.dimension_1_name}: ${item.dimension_1_value}${item.dimension_1_unit || ""}`
                          : null,
                        item.dimension_2_name && item.dimension_2_value
                          ? `${item.dimension_2_name}: ${item.dimension_2_value}${item.dimension_2_unit || ""}`
                          : null,
                        item.dimension_3_name && item.dimension_3_value
                          ? `${item.dimension_3_name}: ${item.dimension_3_value}${item.dimension_3_unit || ""}`
                          : null,
                      ].filter(Boolean);

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                textTransform: "capitalize",
                                backgroundColor: colors.bg,
                                color: colors.text,
                                border: `1px solid ${colors.border}`,
                              }}
                            >
                              {cond.replace("_", " ")}
                            </span>
                          </td>
                          <td>{dims.length > 0 ? dims.join(" × ") : "Direct"}</td>
                          <td>
                            <strong>
                              {item.calculated_qty !== null && item.calculated_qty !== undefined
                                ? `${item.calculated_qty} ${item.output_unit || "units"}`
                                : "—"}
                            </strong>
                          </td>
                          <td>
                            {item.repair_action || item.damage_type_name ? (
                              <span>
                                {item.repair_action || "Repair"}
                                {item.damage_type_name ? ` (${item.damage_type_name})` : ""}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Sound condition</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
              )}

              {/* Photo Evidence Gallery for this room */}
              {roomItems.some((i) => (i.photos || []).length > 0) && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed #e2e8f0" }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                    PHOTOGRAPHIC SITE EVIDENCE
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 1.5,
                    }}
                  >
                    {roomItems.flatMap((i) =>
                      (i.photos || []).map((p) => (
                        <Box
                          key={p.id}
                          sx={{
                            borderRadius: "6px",
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            bgcolor: "#f8fafc",
                          }}
                        >
                          <Box
                            component="img"
                            src={getImageUrl(p.file_path)}
                            alt={p.file_name || i.name}
                            sx={{
                              width: "100%",
                              height: 100,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          <Box sx={{ p: 0.75 }}>
                            <Typography variant="caption" fontWeight={700} noWrap display="block">
                              {i.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.65rem" }}
                              noWrap
                              display="block"
                            >
                              {p.caption || p.file_name || "Inspection photo"}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ============================================================== */}
      {/* 4. COMMERCIAL SCOPE OF WORK & SCHEDULE OF RATES                */}
      {/* ============================================================== */}
      {scopeItems.length > 0 && (
        <Box
          {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }}
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#102936">
                Commercial Scope of Work & Schedule of Rates
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Priced commercial remediation baseline prepared by Quantity Surveying.
              </Typography>
            </Box>

            <Chip
              label={
                survey.baseline_locked_at
                  ? `Baseline Approved: £${baselineTotal.toFixed(2)}`
                  : `Proposed Total: £${baselineTotal.toFixed(2)}`
              }
              color={survey.baseline_locked_at ? "success" : "primary"}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              mb: 2,
              "& th, & td": { p: 1, borderBottom: "1px solid #e2e8f0", textAlign: "left" },
              "& th": { color: "#475569", fontWeight: 700, bgcolor: "#f8fafc" },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Code</th>
                <th style={{ width: "28%" }}>Location / Element</th>
                <th style={{ width: "30%" }}>Work Item Description</th>
                <th style={{ width: "10%", textAlign: "right" }}>Qty</th>
                <th style={{ width: "10%", textAlign: "right" }}>Rate (£)</th>
                <th style={{ width: "10%", textAlign: "right" }}>Total (£)</th>
              </tr>
            </thead>
            <tbody>
              {scopeItems.map((line) => (
                <tr key={line.id}>
                  <td>
                    <code>{line.item_code || `ITM-${line.id}`}</code>
                  </td>
                  <td>
                    <strong>{line.room_name}</strong>
                    {line.element_name && (
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{line.element_name}</div>
                    )}
                  </td>
                  <td>{line.description}</td>
                  <td style={{ textAlign: "right" }}>
                    {line.quantity} {line.unit}
                  </td>
                  <td style={{ textAlign: "right" }}>£{Number(line.unit_rate).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }}>
                    <strong>£{Number(line.total_amount).toFixed(2)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: "right", fontWeight: 600, paddingTop: "10px" }}>
                  Base Work Lines Estimate:
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, paddingTop: "10px" }}>£{baseEstimate.toFixed(2)}</td>
              </tr>
              {adjustAmount !== 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "right", color: "#64748b" }}>
                    Whole-Scope Adjustment ({adjustSign > 0 ? "+" : "-"}
                    {adjustType === "percent" ? `${adjustValue}%` : `£${adjustValue}`}):
                  </td>
                  <td style={{ textAlign: "right", color: adjustSign > 0 ? "#166534" : "#b91c1c" }}>
                    {adjustSign > 0 ? "+" : "-"}£{Math.abs(adjustAmount).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid #102936" }}>
                <td colSpan={5} style={{ textAlign: "right", fontSize: "0.95rem", fontWeight: 800 }}>
                  Approved Contract Baseline:
                </td>
                <td style={{ textAlign: "right", fontSize: "1rem", fontWeight: 800, color: "#102936" }}>
                  £{baselineTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </Box>

          {/* Baseline Sign-Off Stamp */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: "6px",
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                COMMERCIAL SIGN-OFF & BASELINE STATUS
              </Typography>
              <Typography variant="body2" fontWeight={600} mt={0.25}>
                {survey.baseline_locked_at
                  ? `Baseline Approved & Frozen on ${dayjs(survey.baseline_locked_at).format(
                      "DD MMM YYYY, HH:mm"
                    )}`
                  : "Commercial Scope in Review (Pending QS Final Lock)"}
              </Typography>
            </Box>

            {survey.estimated_duration_days && (
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                  ESTIMATED PROJECT DURATION
                </Typography>
                <Typography variant="body2" fontWeight={700} mt={0.25} color="#007e85">
                  {survey.estimated_duration_days} Working Days
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ============================================================== */}
      {/* 5. REPORT FOOTER & AUDIT BLOCK                                 */}
      {/* ============================================================== */}
      <Box
        {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }}
        sx={{
          mt: 3,
          pt: 2,
          borderTop: "1px solid #cbd5e1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "#64748b",
        }}
      >
        <Box>
          <strong>BELCKA</strong> • Construction & Survey Management Platform
          <Typography variant="caption" display="block" color="text.secondary">
            Confidential inspection document. All site evidence and baseline costing are protected and audited.
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <span>Document ID: SVY-{survey.id}</span> • Ref: {survey.reference}
        </Box>
      </Box>
    </Box>
  );
}
