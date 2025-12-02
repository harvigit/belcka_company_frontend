"use client";
import React, { useEffect, useState, useMemo } from "react";
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
import dayjs from "dayjs";
import api from "@/utils/axios";
import DateRangePickerBox from "./common/DateRangePickerBox";
import { format } from "date-fns";
import { AxiosResponse } from "axios";

type Task = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  status: "Pending" | "In Progress" | "Completed";
  type: "project" | "task";
  parentId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  companyId: number | null;
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

export default function DynamicGantt({
  open,
  onClose,
  projectId,
  companyId,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Add these states at the top of your component
  const [sortField, setSortField] = useState<"name" | "start" | "end" | null>(
    null
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Sorting function
  const sortTasks = (list: Task[]) => {
    if (!sortField) return list;

    return [...list].sort((a, b) => {
      let valA: string | number | Date | null = null;
      let valB: string | number | Date | null = null;

      if (sortField === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === "start") {
        valA = a.start ?? new Date(0);
        valB = b.start ?? new Date(0);
      } else if (sortField === "end") {
        valA = a.end ?? new Date(0);
        valB = b.end ?? new Date(0);
      }

      if (valA! < valB!) return sortOrder === "asc" ? -1 : 1;
      if (valA! > valB!) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };
  const fetchProjects = async () => {
    if (!projectId || !companyId) return;

    setLoading(true);
    try {
      const res : AxiosResponse<any> = await api.get("address/get", {
        params: {
          project_id: projectId,
          company_id: companyId,
          start_date: startDate ? dayjs(startDate).format("YYYY-MM-DD") : null,
          end_date: endDate ? dayjs(endDate).format("YYYY-MM-DD") : null,
        },
      });
      const projects = res.data.info;

      const mappedTasks: Task[] = [];

      projects.forEach((project: any) => {
        const projStart = project.start_date
          ? new Date(project.start_date)
          : project.created_at
          ? new Date(project.created_at)
          : new Date();

        const projEnd = project.end_date
          ? new Date(project.end_date)
          : new Date();

        const showFullEnd =
          project.progress === 100 || project.status === 4 || !project.end_date;

        const displayStart =
          startDate && projStart < startDate ? startDate : projStart;
        const displayEnd = showFullEnd
          ? projEnd
          : endDate && projEnd > endDate
          ? endDate
          : projEnd;

        if (displayStart > displayEnd) return;

        mappedTasks.push({
          id: `project-${project.id}`,
          name: project.name,
          type: "project",
          start: displayStart,
          end: displayEnd,
          progress: Number(project.progress) || 0,
          status:
            project.status === 4
              ? "Completed"
              : project.status === 3
              ? "In Progress"
              : "Pending",
        });

        project.tasks.forEach((t: any) => {
          const taskStart = t.start_date
            ? new Date(t.start_date)
            : t.created_at
            ? new Date(t.created_at)
            : new Date();

          const taskEnd = t.end_date ? new Date(t.end_date) : new Date();

          const showFullEndChild =
            t.progress === 100 || t.status === 4 || !t.end_date;

          const displayTaskStart =
            startDate && taskStart < startDate ? startDate : taskStart;
          const displayTaskEnd = showFullEndChild
            ? taskEnd
            : endDate && taskEnd > endDate
            ? endDate
            : taskEnd;

          if (displayTaskStart > displayTaskEnd) return;

          mappedTasks.push({
            id: `task-${t.id}`,
            name: t.name,
            type: "task",
            parentId: `project-${project.id}`,
            start: displayTaskStart,
            end: displayTaskEnd,
            progress: Number(t.progress) || 0,
            status:
              t.status === 4
                ? "Completed"
                : t.status === 13 || t.status === 3
                ? "In Progress"
                : "Pending",
          });
        });
      });

      setTasks(mappedTasks);
    } catch (error) {
      console.error("Failed to fetch tasks/projects:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [projectId, companyId, startDate, endDate, open]);

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

  // Sorted root projects
  const sortedProjects = useMemo(
    () => sortTasks(rootProjects),
    [rootProjects, sortField, sortOrder]
  );

  // Child sorting too (optional)
  const getChildTasks = (projectId: string) =>
    sortTasks(
      tasks.filter(
        (t) =>
          t.type === "task" &&
          t.parentId === projectId &&
          isVisibleInTimeline(t, timelineStart, timelineEnd)
      )
    );

  // Handle header click
  const handleSort = (field: "name" | "start" | "end") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleExpand = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
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
    const position = calcPositionPx(task, timelineStart, timelineEnd, dayWidth);
    if (!position) return null;

    const { leftPx, widthPx } = position;

    const bgColor =
      task.type === "project"
        ? "#3091f1ff"
        : STATUS_COLORS[task.status] || "#999999";

    return (
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
    );
  }

  if (!open) return null;

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

      {!loading && tasks.length === 0 ? (
        <Box>
          <Box
            sx={{
              p: 6,
              pt: 3,
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Typography variant="h4" color="text.secondary">
              No records found for tasks.
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: 4 }}>
          <Box
            sx={{ overflow: "auto", borderColor: "divider" }}
            className="month_header"
          >
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
                <Box
                  sx={{
                    width: 470,
                    cursor: "pointer",
                    "&:hover": {
                      color: "GrayText",
                    },
                  }}
                  onClick={() => handleSort("name")}
                >
                  <Typography fontWeight={700}>
                    Name{" "}
                    {sortField === "name"
                      ? sortOrder === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 150,
                    cursor: "pointer",
                    "&:hover": {
                      color: "GrayText",
                    },
                  }}
                  onClick={() => handleSort("start")}
                >
                  <Typography fontWeight={700}>
                    Start Date{" "}
                    {sortField === "start"
                      ? sortOrder === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 120,
                    cursor: "pointer",
                    "&:hover": {
                      color: "GrayText",
                    },
                  }}
                  onClick={() => handleSort("end")}
                >
                  <Typography fontWeight={700}>
                    End Date{" "}
                    {sortField === "end"
                      ? sortOrder === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </Typography>
                </Box>
              </Box>

              {/* Timeline days with months */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Month Row */}
                <Box sx={{ display: "flex" }}>
                  {(() => {
                    const months: {
                      name: string;
                      days: number;
                      startIndex: number;
                    }[] = [];
                    let currentMonth = dayjs(timelineStart).month();
                    let monthStartIndex = 0;
                    let dayCount = 0;

                    for (let i = 0; i < totalDays; i++) {
                      const date = dayjs(timelineStart).add(i, "day");
                      if (date.month() !== currentMonth) {
                        months.push({
                          name: dayjs(timelineStart)
                            .add(monthStartIndex, "day")
                            .format("MMM YYYY"),
                          days: dayCount,
                          startIndex: monthStartIndex,
                        });
                        currentMonth = date.month();
                        monthStartIndex = i;
                        dayCount = 1;
                      } else {
                        dayCount++;
                      }
                    }

                    // Push last month
                    months.push({
                      name: dayjs(timelineStart)
                        .add(monthStartIndex, "day")
                        .format("MMM YYYY"),
                      days: dayCount,
                      startIndex: monthStartIndex,
                    });

                    return months.map((month, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          width: month.days * dayWidth,
                          border: 1,
                          borderColor: "#dfdfdfff",
                          textAlign: "center",
                          fontSize: 14,
                          fontWeight: 600,
                          py: 0.5,
                          bgcolor: "#f5f5f5",
                        }}
                      >
                        <Typography color="textSecondary" fontWeight={600}>
                          {month.name}
                        </Typography>
                      </Box>
                    ));
                  })()}
                </Box>

                {/* Day Row */}
                <Box sx={{ display: "flex" }}>
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
                {sortedProjects.map((project) => {
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
                              py: 1,
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
                                {task.end
                                  ? dayjs(task.end).format("ddd D/M")
                                  : "-"}
                              </Typography>
                            </Box>
                          </Stack>
                        ))}
                    </React.Fragment>
                  );
                })}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ minWidth: timelineWidth }}>
                  {sortedProjects.map((project) => {
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
                                borderRadius: 0
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
                                height: 41,
                                borderBottom: 1,
                                borderColor: "divider",
                                display: "flex",
                                alignItems: "center",
                                borderRadius: 0

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
      )}
    </Box>
  );
}
