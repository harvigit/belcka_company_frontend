"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import dayjs from "dayjs";
import { Survey, SurveyItem } from "../../types";
import { PDF_PAGE_BLOCK_ATTR } from "./surveyPdfExport";
import { REPORT, Pill, Tone, ReportHeader, SectionTitle, Stat, Label, tableSx, money, humanize } from "./ReportParts";

interface SurveyPrintableReportProps {
  survey: Survey;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

const block = { [PDF_PAGE_BLOCK_ATTR]: "true" };

const CONDITION: Record<string, { label: string; tone: Tone }> = {
  good: { label: "Good", tone: "success" },
  minor_defects: { label: "Minor defects", tone: "warning" },
  damaged: { label: "Damaged", tone: "danger" },
  not_accessible: { label: "Not accessible", tone: "neutral" },
};

const STATUS_TONE: Record<string, Tone> = {
  completed: "success",
  frozen: "success",
  submitted: "brand",
  qs_review: "brand",
  in_progress: "warning",
};

const isDefect = (item: SurveyItem) =>
  item.condition === "damaged" || item.condition === "minor_defects" || Boolean(item.repair_action);

const quantityText = (item: SurveyItem) =>
  item.calculated_qty !== null && item.calculated_qty !== undefined
    ? `${item.calculated_qty} ${item.output_unit || ""}`.trim()
    : "—";

const measurementsText = (item: SurveyItem) => {
  const dims = [
    [item.dimension_1_name, item.dimension_1_value, item.dimension_1_unit],
    [item.dimension_2_name, item.dimension_2_value, item.dimension_2_unit],
    [item.dimension_3_name, item.dimension_3_value, item.dimension_3_unit],
  ]
    .filter(([name, value]) => name && value !== null && value !== undefined && value !== ("" as any))
    .map(([name, value, unit]) => `${name} ${value}${unit ? ` ${unit}` : ""}`);
  return dims.length ? dims.join(" × ") : "—";
};

export default function SurveyPrintableReport({ survey, containerRef }: SurveyPrintableReportProps) {
  const getImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const rooms = survey.rooms || [];
  const totalElements = rooms.reduce((acc, r) => acc + (r.items?.length || 0), 0);
  const inspectedElements = rooms.reduce((acc, r) => acc + (r.items || []).filter((i) => i.is_inspected).length, 0);
  const inspectedPct = totalElements > 0 ? Math.round((inspectedElements / totalElements) * 100) : 0;
  const defects = rooms.flatMap((room) => (room.items || []).filter(isDefect).map((item) => ({ room, item })));

  const scopeItems = survey.scope_items || [];
  const baseEstimate = scopeItems.reduce((acc, l) => acc + (Number(l.total_amount) || 0), 0);
  const adjustSign = survey.scope_adjust_sign === -1 ? -1 : 1;
  const adjustType = survey.scope_adjust_type || "percent";
  const adjustValue = Number(survey.scope_adjust_value) || 0;
  const adjustAmount =
    adjustType === "percent"
      ? Math.round((baseEstimate * (adjustValue / 100) * adjustSign + Number.EPSILON) * 100) / 100
      : Math.round((adjustValue * adjustSign + Number.EPSILON) * 100) / 100;
  const isLocked = Boolean(survey.baseline_locked_at);
  const baselineTotal =
    survey.baseline_total !== null && survey.baseline_total !== undefined
      ? Number(survey.baseline_total)
      : Math.max(0, baseEstimate + adjustAmount);
  const totalLabel = isLocked ? "Approved baseline" : "Proposed total";
  const hasDuration = survey.estimated_duration_days !== null && survey.estimated_duration_days !== undefined;

  const surveyorName =
    survey.surveyor_name ||
    (survey.surveyor ? `${survey.surveyor.first_name || ""} ${survey.surveyor.last_name || ""}`.trim() : "") ||
    "Unassigned";

  let section = 0;
  const next = () => (section += 1);

  return (
    <Box
      ref={containerRef}
      id="survey-printable-report"
      sx={{
        width: 794, // A4 width at 96 DPI
        // Positioned so each PDF block's offsetLeft/offsetTop is measured from the page, not the window.
        position: "relative",
        mx: "auto",
        px: 5,
        py: 4.5,
        bgcolor: "#ffffff",
        color: REPORT.text,
        fontFamily: REPORT.font,
        lineHeight: 1.45,
        "& .MuiTypography-root": { fontFamily: REPORT.font },
      }}
    >
      {/* 1. Header and summary */}
      <Box {...block} sx={{ mb: 3.5 }}>
        <ReportHeader
          documentType="Survey Studio"
          title="Inspection & Commercial Scope Report"
          subtitle={
            <>
              <strong style={{ color: REPORT.ink }}>{survey.reference}</strong>
              {survey.title ? ` · ${survey.title}` : ""}
            </>
          }
          status={humanize(survey.status)}
          statusTone={STATUS_TONE[survey.status] || "neutral"}
          meta={[
            { label: "Property address", value: survey.property_name || survey.address?.name || "—" },
            { label: "Project", value: survey.project_name || survey.project?.name || "—" },
            { label: "Surveyor", value: surveyorName },
            { label: "Inspection date", value: survey.survey_date ? dayjs(survey.survey_date).format("DD MMM YYYY") : "—" },
          ]}
        />

        <Box sx={{ mt: 2.5, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1.5 }}>
          <Stat label="Rooms / areas" value={rooms.length} hint={`${totalElements} element${totalElements === 1 ? "" : "s"}`} />
          <Stat
            label="Inspected"
            value={`${inspectedPct}%`}
            hint={`${inspectedElements} of ${totalElements} elements`}
            valueColor={inspectedPct === 100 ? "#047857" : REPORT.ink}
          />
          <Stat
            label="Defects found"
            value={defects.length}
            hint={defects.length ? "See defect schedule" : "No defects recorded"}
            valueColor={defects.length ? "#b42318" : "#047857"}
          />
          <Stat label={totalLabel} value={money(baselineTotal)} hint={isLocked ? "Locked by QS" : "Pending QS lock"} valueColor={REPORT.brand} />
        </Box>

        <Typography sx={{ fontSize: 10.5, color: REPORT.faint, mt: 1.25, textAlign: "right" }}>
          Generated {dayjs().format("DD MMM YYYY, HH:mm")}
        </Typography>
      </Box>

      {/* 2. Defect schedule */}
      {defects.length > 0 && (
        <Box {...block} sx={{ mb: 3.5 }}>
          <SectionTitle number={next()} title="Defect schedule" aside={<Pill tone="danger">{defects.length} to remedy</Pill>} />
          <Box sx={{ border: `1px solid ${REPORT.line}`, borderRadius: "8px", overflow: "hidden" }}>
            <Box component="table" sx={tableSx}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Room · Element</th>
                  <th style={{ width: "22%" }}>Condition</th>
                  <th style={{ width: "14%" }}>Quantity</th>
                  <th style={{ width: "36%" }}>Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {defects.map(({ room, item }) => {
                  const cond = CONDITION[item.condition || ""] || { label: humanize(item.condition) || "Defect", tone: "warning" as Tone };
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: REPORT.ink }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: REPORT.muted }}>{room.name}</div>
                      </td>
                      <td>
                        <Pill tone={cond.tone}>{cond.label}</Pill>
                        {(item.damage_type_name || item.severity) && (
                          <div style={{ fontSize: 11, color: REPORT.muted, marginTop: 4 }}>
                            {[item.damage_type_name, item.severity ? `${humanize(item.severity)} severity` : ""].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td>{quantityText(item)}</td>
                      <td>{item.repair_action || item.notes || <span style={{ color: REPORT.faint }}>Not specified</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        </Box>
      )}

      {/* 3. Room-by-room inspection */}
      {rooms.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Box {...block}>
            <SectionTitle number={next()} title="Room-by-room inspection" />
          </Box>
          {rooms.map((room, rIdx) => {
            const items = room.items || [];
            const photos = items.flatMap((i) => (i.photos || []).map((p) => ({ item: i, photo: p })));
            return (
              <Box
                key={room.id}
                {...block}
                sx={{ mb: 2, border: `1px solid ${REPORT.line}`, borderRadius: "8px", overflow: "hidden" }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: REPORT.soft,
                    borderBottom: `1px solid ${REPORT.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: REPORT.ink }}>
                    {rIdx + 1}. {room.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: REPORT.muted, fontWeight: 600 }}>
                    {items.filter((i) => i.is_inspected).length} of {items.length} inspected
                  </Typography>
                </Box>

                {items.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: REPORT.muted, fontStyle: "italic", p: 1.5 }}>
                    No elements in this room.
                  </Typography>
                ) : (
                  <Box component="table" sx={tableSx}>
                    <thead>
                      <tr>
                        <th style={{ width: "22%" }}>Element</th>
                        <th style={{ width: "17%" }}>Condition</th>
                        <th style={{ width: "26%" }}>Measurements</th>
                        <th style={{ width: "12%" }}>Quantity</th>
                        <th style={{ width: "23%" }}>Repair</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const cond = item.is_inspected
                          ? CONDITION[item.condition || ""] || { label: humanize(item.condition) || "Recorded", tone: "neutral" as Tone }
                          : { label: "Not inspected", tone: "neutral" as Tone };
                        return (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 700, color: REPORT.ink }}>{item.name}</td>
                            <td>
                              <Pill tone={cond.tone}>{cond.label}</Pill>
                            </td>
                            <td>{measurementsText(item)}</td>
                            <td style={{ fontWeight: 600 }}>{quantityText(item)}</td>
                            <td>
                              {item.repair_action || item.damage_type_name ? (
                                <>
                                  {item.repair_action || "Repair"}
                                  {item.damage_type_name && (
                                    <div style={{ fontSize: 11, color: REPORT.muted }}>{item.damage_type_name}</div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: REPORT.faint }}>None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Box>
                )}

                {photos.length > 0 && (
                  <Box sx={{ p: 1.5, borderTop: `1px dashed ${REPORT.line}` }}>
                    <Label>Site photos ({photos.length})</Label>
                    <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1 }}>
                      {photos.map(({ item, photo }) => (
                        <Box key={photo.id} sx={{ borderRadius: "6px", overflow: "hidden", border: `1px solid ${REPORT.line}` }}>
                          <Box
                            component="img"
                            src={getImageUrl(photo.file_path)}
                            alt={photo.caption || item.name}
                            sx={{ width: "100%", height: 104, objectFit: "cover", display: "block", bgcolor: REPORT.soft }}
                          />
                          <Box sx={{ px: 0.75, py: 0.5 }}>
                            <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: REPORT.ink }}>
                              {item.name}
                            </Typography>
                            {photo.caption && (
                              <Typography noWrap sx={{ fontSize: 10, color: REPORT.muted }}>
                                {photo.caption}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* 4. Commercial scope */}
      {scopeItems.length > 0 && (
        <Box {...block} sx={{ mb: 3.5 }}>
          <SectionTitle
            number={next()}
            title="Commercial scope & schedule of rates"
            aside={<Pill tone={isLocked ? "success" : "brand"}>{isLocked ? "Baseline locked" : "In QS review"}</Pill>}
          />
          <Box sx={{ border: `1px solid ${REPORT.line}`, borderRadius: "8px", overflow: "hidden" }}>
            <Box component="table" sx={tableSx}>
              <thead>
                <tr>
                  <th style={{ width: "12%" }}>Code</th>
                  <th style={{ width: "24%" }}>Location</th>
                  <th style={{ width: "32%" }}>Work item</th>
                  <th className="num" style={{ width: "11%" }}>Qty</th>
                  <th className="num" style={{ width: "10%" }}>Rate</th>
                  <th className="num" style={{ width: "11%" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {scopeItems.map((line) => (
                  <tr key={line.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>{line.item_code || `ITM-${line.id}`}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: REPORT.ink }}>{line.room_name || "General"}</div>
                      {line.element_name && <div style={{ fontSize: 11, color: REPORT.muted }}>{line.element_name}</div>}
                    </td>
                    <td>{line.description}</td>
                    <td className="num">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="num">{money(line.unit_rate)}</td>
                    <td className="num" style={{ fontWeight: 700, color: REPORT.ink }}>
                      {money(line.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>

          {/* Totals */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
            <Box sx={{ width: 300, fontSize: 12.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                <span style={{ color: REPORT.muted }}>Work lines</span>
                <span style={{ fontWeight: 600 }}>{money(baseEstimate)}</span>
              </Box>
              {adjustAmount !== 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                  <span style={{ color: REPORT.muted }}>
                    Adjustment ({adjustSign > 0 ? "+" : "−"}
                    {adjustType === "percent" ? `${adjustValue}%` : money(adjustValue)})
                  </span>
                  <span style={{ fontWeight: 600, color: adjustSign > 0 ? "#047857" : "#b42318" }}>
                    {adjustSign > 0 ? "+" : "−"}
                    {money(Math.abs(adjustAmount))}
                  </span>
                </Box>
              )}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 0.75,
                  pt: 1,
                  borderTop: `2px solid ${REPORT.ink}`,
                  borderRadius: 0,
                }}
              >
                <span style={{ fontWeight: 800, color: REPORT.ink }}>{totalLabel}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: REPORT.brand }}>{money(baselineTotal)}</span>
              </Box>
            </Box>
          </Box>

          {/* Sign-off */}
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: "8px",
              bgcolor: REPORT.soft,
              border: `1px solid ${REPORT.line}`,
              display: "grid",
              gridTemplateColumns: hasDuration ? "1fr auto" : "1fr",
              gap: 2,
            }}
          >
            <Box>
              <Label>Commercial sign-off</Label>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: REPORT.ink, mt: 0.25 }}>
                {isLocked
                  ? `Baseline approved and locked on ${dayjs(survey.baseline_locked_at).format("DD MMM YYYY, HH:mm")}`
                  : "In QS review. The total can still change until the baseline is locked."}
              </Typography>
            </Box>
            {hasDuration && (
              <Box sx={{ textAlign: "right" }}>
                <Label>Estimated duration</Label>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: REPORT.brand, mt: 0.25 }}>
                  {survey.estimated_duration_days} working day{Number(survey.estimated_duration_days) === 1 ? "" : "s"}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 5. Footer */}
      <Box
        {...block}
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: `1px solid ${REPORT.line}`,
          borderRadius: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          fontSize: 10.5,
          color: REPORT.muted,
        }}
      >
        <span>
          <strong style={{ color: REPORT.ink }}>Belcka</strong> · Confidential inspection document. Site evidence and
          costing are recorded and audited.
        </span>
        <span style={{ whiteSpace: "nowrap" }}>
          Doc SVY-{survey.id} · {survey.reference}
        </span>
      </Box>
    </Box>
  );
}
