"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export type GanttItem = {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  status: string;
};

export const GANTT_COLORS: Record<string, string> = {
  "On Track": "#3B82F6",
  "In Progress": "#7B61FF",
  "At Risk": "#F4C430",
  Delayed: "#EF4444",
  "Not Started": "#94A3B8",
};

type Zoom = "fit" | "weeks" | "days";

// Pixels per day for the fixed zoom levels; "fit" stretches to the card width.
const ZOOM_DAY_W: Record<Exclude<Zoom, "fit">, number> = {
  weeks: 12,
  days: 34,
};

const NAME_COL = 210;
const ROW_H = 46;
const BAR_H = 20;
const HEADER_H = 46;
const BODY_MAX_H = 440;
const GRID_LINE = "#EEF2F7";
const BORDER = "#E8EEF5";

const withAlpha = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const parseDay = (value?: string | null) => {
  if (!value) return null;
  const strict = dayjs(
    value,
    ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY"],
    true,
  );
  if (strict.isValid()) return strict.startOf("day");
  const loose = dayjs(value);
  return loose.isValid() ? loose.startOf("day") : null;
};

const buildTimeline = (items: GanttItem[]) => {
  const ranges = items
    .map((item) => ({
      start: parseDay(item.start),
      end: parseDay(item.end),
    }))
    .filter(
      (item): item is { start: Dayjs; end: Dayjs } =>
        !!item.start && !!item.end,
    );

  if (!ranges.length) return null;

  let min = ranges.reduce(
    (acc, item) => (item.start.isBefore(acc) ? item.start : acc),
    ranges[0].start,
  );
  let max = ranges.reduce(
    (acc, item) => (item.end.isAfter(acc) ? item.end : acc),
    ranges[0].end,
  );
  if (max.isBefore(min)) max = min.add(14, "day");

  const today = dayjs().startOf("day");
  if (
    today.isAfter(min.subtract(3, "day")) &&
    today.isBefore(max.add(10, "day"))
  ) {
    if (today.isBefore(min)) min = today;
    if (today.isAfter(max)) max = today;
  }

  // A little breathing room either side of the bars.
  min = min.subtract(1, "day");
  max = max.add(2, "day");
  if (max.diff(min, "day") < 14) max = min.add(14, "day");

  const days: Dayjs[] = [];
  for (
    let cursor = min;
    cursor.isBefore(max) || cursor.isSame(max, "day");
    cursor = cursor.add(1, "day")
  ) {
    days.push(cursor);
  }

  const months: { label: string; short: string; start: number; span: number }[] =
    [];
  days.forEach((day, index) => {
    const label = day.format("MMMM YYYY");
    const current = months[months.length - 1];
    if (current?.label === label) current.span += 1;
    else months.push({ label, short: day.format("MMM YY"), start: index, span: 1 });
  });

  return {
    days,
    months,
    min,
    todayIndex: days.findIndex((day) => day.isSame(today, "day")),
  };
};

const GanttOverview = ({ items }: { items: GanttItem[] }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sectionW, setSectionW] = useState(0);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]);

  const timeline = useMemo(() => {
    try {
      return buildTimeline(items || []);
    } catch (error) {
      console.error("Failed to build gantt timeline", error);
      return null;
    }
  }, [items]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (items || []).forEach((item) => {
      counts.set(item.status, (counts.get(item.status) || 0) + 1);
    });
    return counts;
  }, [items]);

  const visibleItems = useMemo(
    () => (items || []).filter((item) => !hiddenStatuses.includes(item.status)),
    [items, hiddenStatuses],
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setSectionW(el.clientWidth);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [timeline]);

  if (!items.length || !timeline) {
    return (
      <Box
        sx={{
          py: 5,
          textAlign: "center",
          border: `1px dashed ${BORDER}`,
          borderRadius: 2,
        }}
      >
        <Typography fontSize={14} fontWeight={600}>
          No case timeline yet
        </Typography>
        <Typography fontSize={12} color="text.secondary" mt={0.5}>
          Cases with a start and end date will show here.
        </Typography>
      </Box>
    );
  }

  const { days, months, min, todayIndex } = timeline;
  const chartAvail = Math.max(sectionW - NAME_COL - 2, 0);
  const fitDayW =
    days.length > 0 && chartAvail > 0 ? chartAvail / days.length : 16;
  const dayW = zoom === "fit" ? Math.max(fitDayW, 2) : ZOOM_DAY_W[zoom];
  const chartWidth = days.length * dayW;
  const isScrollable = NAME_COL + chartWidth > sectionW + 1;
  const showEveryDay = dayW >= 22;
  const showWeekStarts = !showEveryDay && dayW >= 4;
  const shadeWeekends = dayW >= 6;
  const todayLeft =
    todayIndex >= 0 ? NAME_COL + todayIndex * dayW + dayW / 2 : null;

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el || todayLeft == null) return;
    el.scrollTo({
      left: Math.max(todayLeft - NAME_COL - chartAvail / 2, 0),
      behavior: "smooth",
    });
  };

  const toggleStatus = (status: string) => {
    setHiddenStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((value) => value !== status)
        : [...prev, status],
    );
  };

  const weekendBackground = shadeWeekends
    ? days
        .map((day, index) =>
          day.day() === 0 || day.day() === 6
            ? `linear-gradient(to right, #F8FAFC, #F8FAFC) ${index * dayW}px 0 / ${dayW}px 100% no-repeat`
            : null,
        )
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Box ref={wrapRef} sx={{ minWidth: 0, width: "100%" }}>
      {/* Toolbar: status filters on the left, zoom on the right */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        mb={1.25}
      >
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {Object.entries(GANTT_COLORS).map(([label, color]) => {
            const count = statusCounts.get(label) || 0;
            const hidden = hiddenStatuses.includes(label);
            return (
              <Box
                key={label}
                component="button"
                type="button"
                onClick={() => toggleStatus(label)}
                disabled={!count}
                title={hidden ? `Show ${label}` : `Hide ${label}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1,
                  py: 0.375,
                  borderRadius: 999,
                  border: `1px solid ${hidden ? BORDER : withAlpha(color, 0.45)}`,
                  bgcolor: hidden ? "transparent" : withAlpha(color, 0.1),
                  color: "text.primary",
                  font: "inherit",
                  fontSize: 12,
                  cursor: count ? "pointer" : "default",
                  opacity: count ? (hidden ? 0.5 : 1) : 0.4,
                  transition: "all .15s",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: color,
                  }}
                />
                {label}
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {count}
                </Box>
              </Box>
            );
          })}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {todayLeft != null && isScrollable && (
            <Button
              size="small"
              variant="outlined"
              onClick={scrollToToday}
              sx={{ textTransform: "none", py: 0.25, minWidth: 0 }}
            >
              Today
            </Button>
          )}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={zoom}
            onChange={(_, value) => value && setZoom(value)}
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontSize: 12,
                px: 1.25,
                py: 0.25,
              },
            }}
          >
            <ToggleButton value="fit">Fit</ToggleButton>
            <ToggleButton value="weeks">Weeks</ToggleButton>
            <ToggleButton value="days">Days</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <Box
        ref={scrollRef}
        sx={{
          overflow: "auto",
          maxHeight: BODY_MAX_H,
          border: `1px solid ${BORDER}`,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: NAME_COL + chartWidth,
            minWidth: "100%",
          }}
        >
          {/* Header */}
          <Box
            display="flex"
            sx={{
              height: HEADER_H,
              borderBottom: `1px solid ${BORDER}`,
              position: "sticky",
              top: 0,
              zIndex: 4,
              bgcolor: "background.paper",
            }}
          >
            <Box
              sx={{
                width: NAME_COL,
                minWidth: NAME_COL,
                position: "sticky",
                left: 0,
                zIndex: 5,
                bgcolor: "background.paper",
                borderRight: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                px: 1.5,
              }}
            >
              <Typography fontSize={12} fontWeight={700} color="text.secondary">
                Case ({visibleItems.length})
              </Typography>
            </Box>
            <Box
              sx={{ width: chartWidth, minWidth: chartWidth, position: "relative" }}
            >
              {todayIndex >= 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 2,
                    left: todayIndex * dayW + dayW / 2,
                    transform: "translateX(-50%)",
                    px: 0.75,
                    height: 18,
                    borderRadius: 999,
                    bgcolor: "#EF4444",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                >
                  Today
                </Box>
              )}
              <Box display="flex" height={24}>
                {months.map((month) => {
                  const width = month.span * dayW;
                  return (
                    <Typography
                      key={`${month.label}-${month.start}`}
                      fontSize={12}
                      fontWeight={700}
                      noWrap
                      sx={{
                        width,
                        minWidth: width,
                        lineHeight: "24px",
                        px: 1,
                        borderLeft: month.start ? `1px solid ${BORDER}` : "none",
                        overflow: "hidden",
                      }}
                    >
                      {width >= 90 ? month.label : width >= 44 ? month.short : ""}
                    </Typography>
                  );
                })}
              </Box>
              <Box display="flex" height={22}>
                {days.map((day, index) => {
                  const isToday = index === todayIndex;
                  const showLabel =
                    showEveryDay || (showWeekStarts && day.day() === 1);
                  return (
                    <Typography
                      key={day.format("YYYY-MM-DD")}
                      fontSize={11}
                      fontWeight={isToday ? 700 : 500}
                      color={isToday ? "#EF4444" : "text.secondary"}
                      noWrap
                      sx={{
                        width: dayW,
                        minWidth: dayW,
                        lineHeight: "22px",
                        textAlign: showEveryDay ? "center" : "left",
                        pl: showEveryDay ? 0 : "2px",
                        overflow: "visible",
                        borderLeft:
                          showEveryDay || (showWeekStarts && day.day() === 1)
                            ? `1px solid ${GRID_LINE}`
                            : "none",
                      }}
                    >
                      {showLabel ? day.format(showEveryDay ? "DD" : "D MMM") : ""}
                    </Typography>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Rows */}
          {visibleItems.length === 0 && (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography fontSize={13} color="text.secondary">
                No cases for the selected statuses
              </Typography>
            </Box>
          )}

          {visibleItems.map((item) => {
            const start = parseDay(item.start) ?? min;
            const end = parseDay(item.end) ?? start.add(7, "day");
            const startIdx = Math.max(0, start.diff(min, "day"));
            const endIdx = Math.min(days.length - 1, end.diff(min, "day"));
            const visible = endIdx >= 0 && startIdx <= days.length - 1;
            const left = startIdx * dayW;
            const width = Math.max((endIdx - startIdx + 1) * dayW, 6);
            const progress = Math.round(
              Math.min(Math.max(Number(item.progress || 0), 0), 100),
            );
            const color = GANTT_COLORS[item.status] || "#3B82F6";
            const durationDays = Math.max(end.diff(start, "day") + 1, 1);
            const labelInside = width >= 48;

            return (
              <Box
                key={item.id}
                display="flex"
                sx={{
                  height: ROW_H,
                  borderBottom: `1px solid ${GRID_LINE}`,
                  "&:hover > *": { bgcolor: "#F8FAFF" },
                }}
              >
                <Box
                  sx={{
                    width: NAME_COL,
                    minWidth: NAME_COL,
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    bgcolor: "background.paper",
                    borderRight: `1px solid ${BORDER}`,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    px: 1.5,
                    boxShadow: isScrollable
                      ? "4px 0 8px -6px rgba(15, 23, 42, 0.18)"
                      : "none",
                  }}
                >
                  <Tooltip title={item.name} placement="top-start" enterDelay={500}>
                    <Typography fontSize={13} fontWeight={600} noWrap>
                      {item.name}
                    </Typography>
                  </Tooltip>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography fontSize={11} color="text.secondary" noWrap>
                      {item.status}
                    </Typography>
                    <Typography fontSize={11} fontWeight={700} sx={{ color }}>
                      {progress}%
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  sx={{
                    position: "relative",
                    width: chartWidth,
                    minWidth: chartWidth,
                    background: weekendBackground || undefined,
                  }}
                >
                  {visible && (
                    <Tooltip
                      arrow
                      placement="top"
                      describeChild
                      title={
                        <Box sx={{ px: 0.25, py: 0.25 }}>
                          <Typography fontSize={13} fontWeight={700}>
                            {item.name}
                          </Typography>
                          <Typography fontSize={12} mt={0.25}>
                            {item.status} · {progress}% complete
                          </Typography>
                          <Typography fontSize={12}>
                            {start.format("DD MMM YYYY")} – {end.format("DD MMM YYYY")}
                          </Typography>
                          <Typography fontSize={12} sx={{ opacity: 0.75 }}>
                            {durationDays} day{durationDays === 1 ? "" : "s"}
                          </Typography>
                        </Box>
                      }
                      slotProps={{
                        popper: { sx: { zIndex: 2000 } },
                        tooltip: {
                          sx: {
                            maxWidth: 300,
                            bgcolor: "#0F172A",
                            "& .MuiTooltip-arrow": { color: "#0F172A" },
                          },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left,
                          width,
                          height: BAR_H,
                          transform: "translateY(-50%)",
                          borderRadius: 1.5,
                          bgcolor: withAlpha(color, 0.18),
                          border: `1px solid ${withAlpha(color, 0.45)}`,
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "box-shadow .15s",
                          "&:hover": {
                            boxShadow: `0 2px 8px ${withAlpha(color, 0.35)}`,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: `${progress}%`,
                            height: "100%",
                            bgcolor: color,
                          }}
                        />
                        {labelInside && (
                          <Typography
                            fontSize={11}
                            fontWeight={700}
                            sx={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              px: 0.75,
                              color: progress >= 30 ? "#fff" : "text.primary",
                              textShadow:
                                progress >= 30 ? "0 1px 2px rgba(0,0,0,.25)" : "none",
                              pointerEvents: "none",
                            }}
                          >
                            {progress}%
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  )}
                  {visible && !labelInside && (
                    <Typography
                      fontSize={11}
                      fontWeight={700}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        left: left + width + 6,
                        color,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {progress}%
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}

          {/* Today line (its label sits in the header) */}
          {todayLeft != null && (
            <Box
              sx={{
                position: "absolute",
                top: HEADER_H,
                bottom: 0,
                left: todayLeft,
                width: 0,
                borderLeft: "2px solid #EF4444",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default GanttOverview;
