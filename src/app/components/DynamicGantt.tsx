import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

type Task = {
  id: string;
  name: string;
  start?: Date; // only for listing
  end?: Date; // only for listing
  created_at?: Date; // new field for bar start
  progress: number;
  status: "Pending" | "In Progress" | "Completed";
  type: "project" | "task";
  parentId?: string;
};

type Props = {
  tasks: Task[];
  timelineStart: Date;
  timelineEnd: Date;
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
  return (
    dayjs(new Date()).isAfter(dayjs(timelineStart)) &&
    dayjs(task.start).isBefore(dayjs(timelineEnd))
  );
}

function calcPosition(task: Task, timelineStart: Date, timelineEnd: Date) {
  const totalDays = daysBetween(timelineStart, timelineEnd);

  const taskStart = dayjs(task.start);
  const taskEnd = dayjs(new Date());
  const rangeStart = dayjs(timelineStart);
  const rangeEnd = dayjs(timelineEnd);

  const effectiveStart = taskStart.isBefore(rangeStart)
    ? rangeStart
    : taskStart;
  const effectiveEnd = taskEnd.isAfter(rangeEnd) ? rangeEnd : taskEnd;

  const startOffset = effectiveStart.diff(rangeStart, "day");
  const taskDuration = Math.max(
    1,
    effectiveEnd.diff(effectiveStart, "day") + 1
  );

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (taskDuration / totalDays) * 100;

  return { leftPercent, widthPercent };
}

export default function DynamicGantt({
  tasks,
  timelineStart,
  timelineEnd,
}: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );
  const totalDays = daysBetween(timelineStart, timelineEnd);
  const dayWidth = 36;
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

  return (
    <Box>
      <Box sx={{ overflow: "auto", borderColor: "divider" }}>
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 5,
            minWidth: 540 + timelineWidth,
          }}
        >
          {/* Sticky left side */}
          <Box
            sx={{
              flexShrink: 0,
              width: 540,
              position: "sticky",
              display: "flex",
              left: 0,
              backgroundColor: "#fafbfb",
              zIndex: 2,
            }}
          >
            <Box sx={{ width: 300 }}>
              <Typography>Name</Typography>
            </Box>
            <Box sx={{ width: 120 }}>
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
        <Divider sx={{ mt:2}}/>

        {/* BODY */}
        <Box sx={{ display: "flex", minWidth: 540 + timelineWidth }}>
          {/* LEFT SIDE */}
          <Box
            sx={{
              flexShrink: 0,
              width: 540,
              position: "sticky",
              left: 0,
              bgcolor: "background.paper",
              zIndex: 2,
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
                      sx={{ width: 300, display: "flex", alignItems: "center" }}
                    >
                      <IconButton size="small" edge="start" sx={{ mr: 1 }}>
                        {showChildren ? (
                          <KeyboardArrowDownIcon />
                        ) : (
                          <KeyboardArrowRightIcon />
                        )}
                      </IconButton>
                      <Typography fontWeight={600} noWrap>
                        {project.name}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 120 }}>
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
                        <Box sx={{ width: 250 }}>
                          <Typography noWrap>{task.name}</Typography>
                        </Box>
                        <Box sx={{ width: 120 }}>
                          <Typography noWrap>
                            {task.start
                              ? dayjs(task.start).format("ddd D/M")
                              : "-"}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 120 }}>
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

function BarWithDates({
  task,
  timelineStart,
  timelineEnd,
}: {
  task: Task;
  timelineStart: Date;
  timelineEnd: Date;
}) {
  const { leftPercent, widthPercent } = calcPosition(
    task,
    timelineStart,
    timelineEnd
  );

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
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          height: 20,
          backgroundColor: bgColor,
          borderRadius: 1,
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
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
