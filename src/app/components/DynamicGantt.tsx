import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  Divider,
  Button,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import DateRangePickerBox from "./common/DateRangePickerBox";

type Task = {
  id: string;
  name: string;
  start: Date; // only for listing
  end: Date; // only for listing
  created_at?: Date; // new field for bar start
  progress: number;
  status: "Pending" | "In Progress" | "Completed";
  type: "project" | "task";
  parentId?: string;
};

type Props = {
  tasks: Task[];
  open: boolean;
  onClose: () => void;
};

const STATUS_COLORS = {
  Pending: "#A3CEF1",
  "In Progress": "#FFB4A2",
  Completed: "#B9FBC0",
};

function daysBetween(start: Date, end: Date) {
  return dayjs(end).diff(dayjs(start), "day") + 1;
}
function isVisibleInTimeline(
  task: Task,
  timelineStart: Date,
  timelineEnd: Date
) {
  const start = dayjs(task.start);
  const end = dayjs(task.end);

  return (
    end.isAfter(dayjs(timelineStart)) && start.isBefore(dayjs(timelineEnd))
  );
}

export default function DynamicGantt({ tasks, open, onClose }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);

  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);
  const [startDate, setStartDate] = useState<Date | null>(defaultStart);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);

  const timelineStart =
    startDate ??
    (tasks.length
      ? tasks.reduce(
          (min, t) => (t.start < min ? t.start : min),
          tasks[0].start
        )
      : new Date());

  const timelineEnd =
    endDate ??
    (tasks.length
      ? tasks.reduce((max, t) => (t.end > max ? t.end : max), tasks[0].end)
      : new Date());

  const totalDays = daysBetween(timelineStart, timelineEnd);
  const dayWidth = 50;
  const timelineWidth = totalDays * dayWidth;

  const rootProjects = useMemo(
    () => tasks.filter((t) => t.type === "project"),
    [tasks]
  );

  const getChildTasks = (projectId: string) =>
    tasks.filter(
      (t) =>
        t.type === "task" &&
        t.parentId === projectId &&
        isVisibleInTimeline(t, timelineStart, timelineEnd)
    );

  const toggleExpand = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    newSet.has(projectId) ? newSet.delete(projectId) : newSet.add(projectId);
    setExpandedProjects(newSet);
  };
  const isAnyProjectExpanded = useMemo(() => {
    return rootProjects.some((p) => expandedProjects.has(p.id));
  }, [expandedProjects, rootProjects]);

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
    }
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch {
      return "-";
    }
  };
  return (
    <Box>
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
        }}
      >
        <Box
          display={"flex"}
          gap={3}
          justifyItems={"center"}
          alignItems={"center"}
        >
          <Typography fontWeight={700} ml={2}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Typography>
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
          />

          <Box display="flex" gap={1}>
            <Button
              size="small"
              onClick={() => {
                if (isAnyProjectExpanded) {
                  setExpandedProjects(new Set());
                } else {
                  setExpandedProjects(new Set(rootProjects.map((p) => p.id)));
                }
              }}
            >
              {isAnyProjectExpanded ? "Collapse All" : "Expand All"}
            </Button>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small">
          <IconX />
        </IconButton>
      </Box>
      <Box sx={{ overflow: "auto", borderColor: "divider", p: 4 }}>
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 5,
            minWidth: 640 + timelineWidth,
          }}
        >
          {/* Sticky left side */}
          <Box
            sx={{
              flexShrink: 0,
              width: 640,
              position: "sticky",
              display: "flex",
              left: 0,
              backgroundColor: "#fafbfb",
              zIndex: 2,
              ml: 2,
            }}
          >
            <Box sx={{ width: 470 }}>
              <Typography>Name</Typography>
            </Box>
            <Box sx={{ width: 150 }}>
              <Typography>Start Date</Typography>
            </Box>
            <Box sx={{ width: 120 }}>
              <Typography>End Date</Typography>
            </Box>
          </Box>

          {/* Timeline header days */}
          <Box sx={{ flex: 1, display: "flex" }}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const date = dayjs(timelineStart).add(i, "day");
              return (
                <Box
                  key={i}
                  sx={{
                    width: dayWidth,
                    borderLeft: 1,
                    borderColor: "divider",
                    textAlign: "center",
                    fontSize: 12,
                    py: 0.5,
                  }}
                >
                  {date.format("D")}
                </Box>
              );
            })}
          </Box>
        </Box>
        <Divider sx={{ mt: 2 }} />

        {/* BODY */}
        <Box sx={{ display: "flex", minWidth: 300 + timelineWidth }}>
          {/* LEFT SIDE */}
          <Box
            sx={{
              flexShrink: 0,
              width: 640,
              position: "sticky",
              left: 0,
              bgcolor: "background.paper",
              zIndex: 2,
              ml: 2,
            }}
          >
            {rootProjects.map((project) => {
              const showChildren = expandedProjects.has(project.id);
              const children = getChildTasks(project.id);
              return (
                <React.Fragment key={project.id}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      cursor: "pointer",
                      py: 1,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => toggleExpand(project.id)}
                  >
                    <Box
                      sx={{
                        width: 387,
                        display: "flex",
                        alignItems: "center",
                        mr: 2,
                      }}
                    >
                      <IconButton size="small" edge="start" sx={{ mr: 1 }}>
                        {showChildren ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                      <Typography fontWeight={600} noWrap width={345}>
                        {project.name}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 150 }}>
                      <Typography fontWeight={600} noWrap>
                        {project.start
                          ? dayjs(project.start).format("ddd D/M")
                          : "-"}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 120 }}>
                      <Typography fontWeight={600} noWrap>
                        {project.end
                          ? dayjs(project.end).format("ddd D/M")
                          : "-"}
                      </Typography>
                    </Box>
                  </Stack>

                  {showChildren &&
                    children.map((task) => (
                      <Stack
                        key={task.id}
                        direction="row"
                        alignItems="center"
                        sx={{
                          borderBottom: 1,
                          borderColor: "divider",
                          pl: 6,
                          py: 0.75,
                        }}
                      >
                        <Box sx={{ width: 510 }}>
                          <Typography noWrap>{task.name}</Typography>
                        </Box>
                        <Box sx={{ width: 190 }}>
                          <Typography noWrap>
                            {task.start
                              ? dayjs(task.start).format("ddd D/M")
                              : "-"}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 150 }}>
                          <Typography noWrap>
                            {task.end ? dayjs(task.end).format("ddd D/M") : "-"}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                </React.Fragment>
              );
            })}
          </Box>

          {/* RIGHT SIDE TIMELINE */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ minWidth: timelineWidth }}>
              {rootProjects.map((project) => {
                const showChildren = expandedProjects.has(project.id);
                const children = getChildTasks(project.id);
                return (
                  <React.Fragment key={project.id}>
                    <Box
                      sx={{
                        position: "relative",
                        height: 57,
                        borderBottom: 1,
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <BarWithDates
                        task={project}
                        timelineStart={timelineStart}
                        timelineEnd={timelineEnd}
                      />
                    </Box>

                    {showChildren &&
                      children.map((task) => (
                        <Box
                          key={task.id}
                          sx={{
                            position: "relative",
                            height: 34,
                            borderBottom: 1,
                            borderColor: "divider",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <BarWithDates
                            task={task}
                            timelineStart={timelineStart}
                            timelineEnd={timelineEnd}
                          />
                        </Box>
                      ))}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function calcPositionPx(
  task: Task,
  timelineStart: Date,
  timelineEnd: Date,
  dayWidth: number
) {
  const rangeStart = dayjs(timelineStart);
  const rangeEnd = dayjs(timelineEnd);

  const taskStart = dayjs(task.start);
  const taskEnd = dayjs(task.end);

  const effectiveStart = taskStart.isBefore(rangeStart)
    ? rangeStart
    : taskStart;
  const effectiveEnd = taskEnd.isAfter(rangeEnd) ? rangeEnd : taskEnd;

  if (effectiveEnd.isBefore(rangeStart) || effectiveStart.isAfter(rangeEnd)) {
    return null;
  }

  const startOffsetDays = effectiveStart.diff(rangeStart, "day");
  const durationDays = Math.max(
    1,
    effectiveEnd.diff(effectiveStart, "day") + 1
  );

  return {
    leftPx: startOffsetDays * dayWidth,
    widthPx: durationDays * dayWidth,
  };
}

function BarWithDates({
  task,
  timelineStart,
  timelineEnd,
}: {
  task: Task;
  timelineStart: Date;
  timelineEnd: Date;
}) {
  const dayWidth = 50;

  const position = calcPositionPx(task, timelineStart, timelineEnd, dayWidth);
  if (!position) return null;

  const { leftPx, widthPx } = position;

  const bgColor =
    task.type === "project"
      ? "#3091f1ff"
      : STATUS_COLORS[task.status] || "#999999";

  return (
    <>
      <Tooltip
        title={
          <>
            <div>
              <strong>{task.name}</strong>
            </div>
            <div>
              {task.start ? dayjs(task.start).format("DD MMM YYYY") : "-"} →{" "}
              {task.end ? dayjs(task.end).format("DD MMM YYYY") : "-"}
            </div>
            <div>Status: {task.status}</div>
            <div>Progress: {task.progress}%</div>
          </>
        }
      >
        <Box
          sx={{
            position: "absolute",
            left: `${leftPx}px`,
            width: `${widthPx}px`,
            height: 20,
            backgroundColor: bgColor,
            borderRadius: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${task.progress}%`,
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderRadius: 1,
            }}
          />
        </Box>
      </Tooltip>
    </>
  );
}
