"use client";

import React from "react";
import { Box, Typography, Chip, Stack } from "@mui/material";
import { Survey, SurveyWorkOrder } from "../../types";
import { PDF_PAGE_BLOCK_ATTR } from "./surveyPdfExport";

interface WorkOrderJobPackReportProps {
  survey: Survey;
  workOrder: SurveyWorkOrder;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function WorkOrderJobPackReport({
  survey,
  workOrder,
  containerRef,
}: WorkOrderJobPackReportProps) {
  const items = workOrder.items || [];
  const approvedVariations = (workOrder.variation_orders || []).filter(
    (vo) => vo.status === "approved"
  );
  const totalApprovedVos = approvedVariations.reduce(
    (sum, vo) => sum + (Number(vo.amount) || 0),
    0
  );
  const currentTotal = Number(
    workOrder.total_amount ?? (Number(workOrder.baseline_total) + totalApprovedVos)
  );

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    issued: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    active: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    in_progress: { bg: "#fefce8", text: "#854d0e", border: "#fef08a" },
    completed: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
    cancelled: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  };

  const stStyle = statusColors[workOrder.status] || {
    bg: "#f8fafc",
    text: "#475569",
    border: "#cbd5e1",
  };

  return (
    <Box
      ref={containerRef}
      id="work-order-job-pack-report"
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
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#ffffff",
                }}
              >
                B
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 1 }}>
                BELCKA PROPERTY SOLUTIONS
              </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} color="#38bdf8" mb={0.5}>
              CONTRACTOR WORK ORDER & JOB PACK
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Official Contractual Scope of Works, Schedule of Rates & Acceptance Specification
            </Typography>
          </Box>

          <Box textAlign="right">
            <Box
              sx={{
                display: "inline-block",
                px: 1.5,
                py: 0.5,
                borderRadius: "6px",
                bgcolor: stStyle.bg,
                color: stStyle.text,
                border: `1px solid ${stStyle.border}`,
                fontWeight: 700,
                fontSize: 12,
                mb: 1,
              }}
            >
              STATUS: {workOrder.status.toUpperCase()}
            </Box>
            <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
              Work Order Ref: <strong>{workOrder.reference}</strong>
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
              Survey Ref: {survey.reference || `SRV-${survey.id}`}
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
              Issued:{" "}
              {workOrder.issued_at
                ? new Date(workOrder.issued_at).toLocaleDateString("en-GB")
                : new Date().toLocaleDateString("en-GB")}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ============================================================== */}
      {/* 2. SPECIFICATION CARDS (Contractor, Site, Schedule, Finance)   */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }} sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2,
          }}
        >
          {/* Assigned Contractor */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="#64748b"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Assigned Contractor / Subcontractor
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mt={0.5}>
              {workOrder.contractor_name || "Direct Subcontractor"}
            </Typography>
            <Typography variant="body2" color="#334155" mt={0.25}>
              Trade Package: <strong>{workOrder.trade_name || "General Building Works"}</strong>
            </Typography>
            {workOrder.contractor_id && (
              <Typography variant="caption" color="#64748b" display="block" mt={0.5}>
                User Account ID: #{workOrder.contractor_id}
              </Typography>
            )}
          </Box>

          {/* Site & Property Location */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="#64748b"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Project & Property Location
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a" mt={0.5}>
              {survey.project_name || "Belcka Asset Management"}
            </Typography>
            <Typography variant="body2" color="#334155" mt={0.25}>
              Property Address: <strong>{survey.property_name || "Property Site Address"}</strong>
            </Typography>
            {survey.title && survey.title !== survey.reference && (
              <Typography variant="caption" color="#64748b" display="block" mt={0.5}>
                Title: {survey.title}
              </Typography>
            )}
          </Box>

          {/* Schedule & Duration */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              bgcolor: "#f8fafc",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="#64748b"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Execution Schedule & Working Period
            </Typography>
            <Stack direction="row" spacing={3} mt={0.75}>
              <Box>
                <Typography variant="caption" color="#64748b" display="block">
                  START DATE
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {workOrder.start_date
                    ? new Date(workOrder.start_date).toLocaleDateString("en-GB")
                    : "To Be Agreed"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="#64748b" display="block">
                  TARGET COMPLETION
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {workOrder.target_completion_date
                    ? new Date(workOrder.target_completion_date).toLocaleDateString("en-GB")
                    : "To Be Agreed"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="#64748b" display="block">
                  DURATION
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {workOrder.duration_days ? `${workOrder.duration_days} Days` : "—"}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Financial Contract Reconciliation */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #0284c7",
              bgcolor: "#f0f9ff",
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="#0369a1"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              Contract Value & Agreed Rates
            </Typography>
            <Stack spacing={0.5} mt={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="#475569">
                  Baseline Agreed Scope:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  £
                  {Number(workOrder.baseline_total || 0).toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="#475569">
                  Approved Variation Orders ({approvedVariations.length}):
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color={totalApprovedVos >= 0 ? "#166534" : "#991b1b"}
                >
                  {totalApprovedVos >= 0 ? "+" : ""}£
                  {totalApprovedVos.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Stack>
              <Box sx={{ borderTop: "1px dashed #bae6fd", pt: 0.5, mt: 0.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography variant="subtitle2" fontWeight={800} color="#0c4a6e">
                    Current Contract Total:
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="#0284c7">
                    £
                    {currentTotal.toLocaleString("en-GB", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ============================================================== */}
      {/* 3. ITEMIZED SCHEDULE OF WORKS & RATES TABLE                    */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }} sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={1}>
          Itemized Scope of Works & Agreed Schedule of Rates ({items.length} Line Items)
        </Typography>

        <Box
          sx={{
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "60px 140px 1fr 60px 50px 80px 90px 70px",
              bgcolor: "#f1f5f9",
              p: 1,
              fontWeight: 700,
              fontSize: "0.75rem",
              color: "#475569",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <Box>Code</Box>
            <Box>Location & Element</Box>
            <Box>Remedial Scope & Description</Box>
            <Box textAlign="right">Qty</Box>
            <Box textAlign="center">Unit</Box>
            <Box textAlign="right">Rate (£)</Box>
            <Box textAlign="right">Total (£)</Box>
            <Box textAlign="center">State</Box>
          </Box>

          {items.map((it, idx) => (
            <Box
              key={it.id || idx}
              sx={{
                display: "grid",
                gridTemplateColumns: "60px 140px 1fr 60px 50px 80px 90px 70px",
                p: 1,
                fontSize: "0.75rem",
                color: "#1e293b",
                borderBottom: idx === items.length - 1 ? "none" : "1px solid #f1f5f9",
                bgcolor: idx % 2 === 0 ? "#ffffff" : "#fcfcfd",
                alignItems: "center",
              }}
            >
              <Box fontWeight={700} color="#64748b">
                {it.item_code || `#${idx + 1}`}
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={700} display="block" color="#0f172a">
                  {it.room_name || "General"}
                </Typography>
                <Typography variant="caption" color="#64748b">
                  {it.element_name || "—"}
                </Typography>
              </Box>
              <Box sx={{ pr: 1 }}>
                <Typography variant="caption" display="block">
                  {it.description}
                </Typography>
                {it.notes && (
                  <Typography variant="caption" color="#64748b" fontStyle="italic">
                    Note: {it.notes}
                  </Typography>
                )}
              </Box>
              <Box textAlign="right" fontWeight={700}>
                {Number(it.quantity).toLocaleString("en-GB", { maximumFractionDigits: 2 })}
              </Box>
              <Box textAlign="center">
                <Chip
                  size="small"
                  label={it.unit || "nr"}
                  sx={{ height: 18, fontSize: "0.68rem" }}
                />
              </Box>
              <Box textAlign="right">
                £
                {Number(it.unit_rate || 0).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Box>
              <Box textAlign="right" fontWeight={700}>
                £
                {Number(it.total_amount || 0).toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Box>
              <Box textAlign="center">
                <Box
                  sx={{
                    display: "inline-block",
                    px: 0.75,
                    py: 0.2,
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: it.is_completed ? "#f0fdf4" : "#f8fafc",
                    color: it.is_completed ? "#166534" : "#64748b",
                    border: `1px solid ${it.is_completed ? "#bbf7d0" : "#cbd5e1"}`,
                  }}
                >
                  {it.is_completed ? "DONE" : "PENDING"}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ============================================================== */}
      {/* 4. APPROVED VARIATION ORDERS SECTION                            */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }} sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={1}>
          Approved Variation Orders ({approvedVariations.length})
        </Typography>

        {approvedVariations.length === 0 ? (
          <Box
            sx={{
              p: 2,
              border: "1px dashed #cbd5e1",
              borderRadius: "6px",
              bgcolor: "#f8fafc",
              textAlign: "center",
            }}
          >
            <Typography variant="caption" color="#64748b">
              No variation orders have been approved to date. All site activities must strictly
              conform to the baseline schedule of works above. Any unforeseen works must be formally
              requested and approved prior to commencement.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 120px 120px",
                bgcolor: "#f1f5f9",
                p: 1,
                fontWeight: 700,
                fontSize: "0.75rem",
                color: "#475569",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <Box>VO Ref</Box>
              <Box>Reason / Description</Box>
              <Box textAlign="right">Approved Value</Box>
              <Box textAlign="center">Date Approved</Box>
            </Box>

            {approvedVariations.map((vo, idx) => (
              <Box
                key={vo.id || idx}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 120px 120px",
                  p: 1,
                  fontSize: "0.75rem",
                  borderBottom:
                    idx === approvedVariations.length - 1 ? "none" : "1px solid #f1f5f9",
                  alignItems: "center",
                }}
              >
                <Box fontWeight={700} color="#0284c7">
                  {vo.reference}
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} display="block">
                    {vo.reason}
                  </Typography>
                  {vo.notes && (
                    <Typography variant="caption" color="#64748b">
                      {vo.notes}
                    </Typography>
                  )}
                </Box>
                <Box textAlign="right" fontWeight={700}>
                  £
                  {Number(vo.amount || 0).toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Box>
                <Box textAlign="center" color="#64748b">
                  {vo.approved_at
                    ? new Date(vo.approved_at).toLocaleDateString("en-GB")
                    : "Approved"}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ============================================================== */}
      {/* 5. SITE RULES, HEALTH & SAFETY AND INSTRUCTIONS                */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }} sx={{ mb: 3 }}>
        <Box
          sx={{
            p: 2,
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            bgcolor: "#fffbeb",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="#b45309" mb={1}>
            SITE INSTRUCTIONS & HEALTH & SAFETY COMPLIANCE RULES
          </Typography>

          {workOrder.notes && (
            <Box mb={1.5} pb={1.5} sx={{ borderBottom: "1px dashed #fcd34d" }}>
              <Typography variant="caption" fontWeight={700} color="#78350f" display="block">
                SPECIFIC HANDOFF INSTRUCTIONS:
              </Typography>
              <Typography variant="caption" color="#451a03">
                {workOrder.notes}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="#78350f" display="block" sx={{ mb: 0.5 }}>
            • <strong>Mandatory PPE:</strong> Suitable hard hat, high-visibility vest, and safety boots
            must be worn on site at all times.
          </Typography>
          <Typography variant="caption" color="#78350f" display="block" sx={{ mb: 0.5 }}>
            • <strong>Protection of Existing Property:</strong> Adequate protection to all existing
            flooring, finishes, and adjoining areas must be maintained throughout works.
          </Typography>
          <Typography variant="caption" color="#78350f" display="block" sx={{ mb: 0.5 }}>
            • <strong>Unforeseen Site Conditions:</strong> Do NOT carry out any work beyond this scope
            without an approved Belcka Variation Order. Unauthorised works will not be compensated.
          </Typography>
          <Typography variant="caption" color="#78350f" display="block">
            • <strong>Cleanliness & Handover:</strong> The workspace must be left in a safe, clean, and
            debris-free condition ready for quality inspection upon completion.
          </Typography>
        </Box>
      </Box>

      {/* ============================================================== */}
      {/* 6. DUAL SIGN-OFF & ACCEPTANCE SECTION                          */}
      {/* ============================================================== */}
      <Box {...{ [PDF_PAGE_BLOCK_ATTR]: "true" }}>
        <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={1.5}>
          Contractual Acceptance & Dual Authorisation Sign-Off
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2.5,
          }}
        >
          {/* Subcontractor Signing Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={0.5}>
              SUBCONTRACTOR / CONTRACTOR ACCEPTANCE
            </Typography>
            <Typography variant="caption" color="#64748b" display="block" mb={2}>
              I confirm receipt and agreement to execute the works in accordance with the
              specification, agreed rates, and site conditions detailed above.
            </Typography>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5, mb: 1.5, mt: 3 }}>
              <Typography variant="caption" color="#64748b">
                Print Full Name: {workOrder.contractor_name || "_________________________________"}
              </Typography>
            </Box>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5, mb: 1.5 }}>
              <Typography variant="caption" color="#64748b">
                Authorised Signature: _________________________________________
              </Typography>
            </Box>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5 }}>
              <Typography variant="caption" color="#64748b">
                Date: _______________________________________________________
              </Typography>
            </Box>
          </Box>

          {/* Belcka Signing Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              bgcolor: "#ffffff",
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={0.5}>
              BELCKA AUTHORISED REPRESENTATIVE
            </Typography>
            <Typography variant="caption" color="#64748b" display="block" mb={2}>
              Authorised for commercial execution on behalf of Belcka Property Solutions. Works are
              subject to final sign-off inspection.
            </Typography>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5, mb: 1.5, mt: 3 }}>
              <Typography variant="caption" color="#64748b">
                Print Full Name: _____________________________________________
              </Typography>
            </Box>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5, mb: 1.5 }}>
              <Typography variant="caption" color="#64748b">
                Authorised Signature: _________________________________________
              </Typography>
            </Box>

            <Box sx={{ borderBottom: "1px solid #94a3b8", pb: 0.5 }}>
              <Typography variant="caption" color="#64748b">
                Date: _______________________________________________________
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
