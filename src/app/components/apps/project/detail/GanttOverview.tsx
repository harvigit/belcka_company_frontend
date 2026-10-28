"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
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

const NAME_COL = 128;
const ROW_H = 32;
const BAR_H = 8;
const HEADER_H = 40;

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

  if (max.diff(min, "day") < 7) max = min.add(7, "day");

  const days: Dayjs[] = [];
  for (
    let cursor = min;
    cursor.isBefore(max) || cursor.isSame(max, "day");
    cursor = cursor.add(1, "day")
  ) {
    days.push(cursor);
  }

  const months: { label: string; start: number; span: number }[] = [];
  days.forEach((day, index) => {
    const label = day.format("MMMM YYYY");
    const current = months[months.length - 1];
    if (current?.label === label) current.span += 1;
    else months.push({ label, start: index, span: 1 });
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
  const [sectionW, setSectionW] = useState(0);

  const timeline = useMemo(() => {
    try {
      return buildTimeline(items || []);
    } catch (error) {
      console.error("Failed to build gantt timeline", error);
      return null;
    }
  }, [items]);

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
      <Typography fontSize={13} color="text.secondary">
        No case timeline yet
      </Typography>
    );
  }

  const { days, months, min, todayIndex } = timeline;
  const chartAvail = Math.max(sectionW - NAME_COL, 0);
  const dayW =
    days.length > 0 && chartAvail > 0
      ? Math.max(chartAvail / days.length, 1)
      : 16;
  const chartWidth = days.length * dayW;
  const compactDays = dayW < 18;
  const sparseDays = dayW < 10;
  const todayLeft =
    todayIndex >= 0 ? NAME_COL + todayIndex * dayW + dayW / 2 : null;

  return (
    <Box ref={wrapRef} sx={{ minWidth: 0, width: "100%" }}>
      <Box
        sx={{
          overflowX: "hidden",
          overflowY: "visible",
          mx: { xs: -0.5, md: -0.5 },
        }}
      >
        <Box
          sx={{
            position: "relative",
            minWidth: NAME_COL + chartWidth,
            width: "100%",
            pb: 0.25,
          }}
        >
          <Box
            display="flex"
            sx={{
              height: HEADER_H,
              borderBottom: "1px solid #E8EEF5",
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
                borderRight: "1px solid #E8EEF5",
              }}
            />
            <Box sx={{ width: chartWidth, minWidth: chartWidth }}>
              <Box display="flex" height={18}>
                {months.map((month) => (
                  <Typography
                    key={`${month.label}-${month.start}`}
                    fontSize={10}
                    fontWeight={600}
                    color="text.secondary"
                    noWrap
                    sx={{
                      width: month.span * dayW,
                      textAlign: "center",
                      lineHeight: "18px",
                      px: 0.25,
                    }}
                  >
                    {month.label}
                  </Typography>
                ))}
              </Box>
              <Box display="flex" height={22}>
                {days.map((day) => {
                  const showLabel = sparseDays
                    ? day.date() === 1
                    : compactDays
                      ? day.date() === 1 || day.day() === 1
                      : true;
                  return (
                    <Typography
                      key={day.format("YYYY-MM-DD")}
                      fontSize={9}
                      color="text.secondary"
                      sx={{
                        width: dayW,
                        minWidth: dayW,
                        textAlign: "center",
                        lineHeight: "22px",
                        borderLeft: "1px solid #F1F5F9",
                        overflow: "hidden",
                      }}
                    >
                      {showLabel ? day.format("DD") : ""}
                    </Typography>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {items.map((item) => {
            const start = parseDay(item.start) ?? min;
            const end = parseDay(item.end) ?? start.add(7, "day");
            const startIdx = Math.max(0, start.diff(min, "day"));
            const endIdx = Math.min(days.length - 1, end.diff(min, "day"));
            const visible = endIdx >= 0 && startIdx <= days.length - 1;
            const left = startIdx * dayW;
            const width = Math.max((endIdx - startIdx + 1) * dayW, dayW);
            const progress = Math.min(Math.max(Number(item.progress || 0), 0), 100);
            const color = GANTT_COLORS[item.status] || "#3B82F6";
            const startLabel = start.format("DD/MM/YYYY");
            const endLabel = end.format("DD/MM/YYYY");

            return (
              <Box
                key={item.id}
                display="flex"
                sx={{
                  height: ROW_H,
                  borderBottom: "1px solid #F1F5F9",
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
                    borderRight: "1px solid #E8EEF5",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    px: 1,
                    boxShadow: "4px 0 8px -6px rgba(15, 23, 42, 0.18)",
                  }}
                >
                  <Typography fontSize={11} fontWeight={600} noWrap>
                    {item.name}
                  </Typography>
                  <Typography fontSize={10} fontWeight={700} color={color} lineHeight={1.2}>
                    {progress}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    position: "relative",
                    width: chartWidth,
                    minWidth: chartWidth,
                    backgroundImage: `repeating-linear-gradient(
                      to right,
                      transparent 0,
                      transparent ${Math.max(dayW - 1, 0)}px,
                      #EEF2F7 ${Math.max(dayW - 1, 0)}px,
                      #EEF2F7 ${dayW}px
                    )`,
                  }}
                >
                  {visible && (
                    <Tooltip
                      arrow
                      placement="top"
                      describeChild
                      title={
                        <Box sx={{ px: 0.25, py: 0.25 }}>
                          <Typography fontSize={12} fontWeight={700}>
                            {item.name}
                          </Typography>
                          <Typography fontSize={11}>
                            {item.status} · {progress}%
                          </Typography>
                          <Typography fontSize={11}>
                            {startLabel} – {endLabel}
                          </Typography>
                        </Box>
                      }
                      slotProps={{
                        popper: { sx: { zIndex: 2000 } },
                        tooltip: {
                          sx: {
                            maxWidth: 280,
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
                          borderRadius: 999,
                          bgcolor: withAlpha(color, 0.22),
                          overflow: "hidden",
                          cursor: "pointer",
                        }}
                      >
                        <Box
                          sx={{
                            width: `${progress}%`,
                            height: "100%",
                            borderRadius: 999,
                            bgcolor: color,
                          }}
                        />
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}

          {todayLeft != null && (
            <Box
              sx={{
                position: "absolute",
                top: 14,
                bottom: 0,
                left: todayLeft,
                width: 0,
                borderLeft: "1.5px dashed #EF4444",
                zIndex: 6,
                pointerEvents: "none",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  bgcolor: "#EF4444",
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 2px #fff",
                }}
              >
                {days[todayIndex].format("DD")}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1.25}
        flexWrap="wrap"
        useFlexGap
        pt={1}
      >
        {Object.entries(GANTT_COLORS).map(([label, color]) => (
          <Stack key={label} direction="row" spacing={0.75} alignItems="center">
            <Box
              width={16}
              height={6}
              borderRadius={999}
              bgcolor={color}
            />
            <Typography fontSize={10} color="text.secondary">
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default GanttOverview;
