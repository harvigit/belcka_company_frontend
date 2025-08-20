"use client";

import React, { useEffect, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import api from "@/utils/axios";
import { format } from "date-fns";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export type TimelineListProps = {
  projectId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultOpenIds?: number[];
};

export default function TimelineList({
  projectId,
  startDate,
  endDate,
  defaultOpenIds = [],
}: TimelineListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const clampDate = (date: Date, min?: Date | null, max?: Date | null) => {
    let d = dayjs(date);
    if (min && d.isBefore(dayjs(min))) d = dayjs(min);
    if (max && d.isAfter(dayjs(max))) d = dayjs(max);
    return d.toDate();
  };

  const isOverlapping = (
    start: Date,
    end: Date,
    rangeStart?: Date | null,
    rangeEnd?: Date | null
  ) => {
    if (!rangeStart || !rangeEnd) return true;
    return !(
      dayjs(end).isBefore(dayjs(rangeStart)) ||
      dayjs(start).isAfter(dayjs(rangeEnd))
    );
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await api.get(`address/get`, {
        params: {
          project_id: projectId,
          start_date: startDate ? dayjs(startDate).format("YYYY-MM-DD") : null,
          end_date: endDate ? dayjs(endDate).format("YYYY-MM-DD") : null,
        },
      });

      const mappedTasks: Task[] = [];
      const projects = response.data.info;

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

        const displayStart = clampDate(projStart, startDate, endDate);
        const displayEnd = showFullEnd
          ? projEnd
          : clampDate(projEnd, startDate, endDate);

        if (
          !showFullEnd &&
          !isOverlapping(displayStart, displayEnd, startDate, endDate)
        )
          return;
        if (displayStart > displayEnd) return;

        mappedTasks.push({
          id: `project-${project.id}`,
          name: project.name,
          type: "project",
          start: displayStart,
          end: displayEnd,
          progress: Number(project.progress) || 0,
          isDisabled: false,
          hideChildren: defaultOpenIds?.length
            ? !defaultOpenIds.includes(project.id)
            : false,
          styles: {
            progressColor: "#9BF6FF",
            progressSelectedColor: "#9BF6FF",
            backgroundColor: "#9BF6FF",
            backgroundSelectedColor: "#9BF6FF",
          },
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

          const displayTaskStart = clampDate(taskStart, startDate, endDate);
          const displayTaskEnd = showFullEndChild
            ? taskEnd
            : clampDate(taskEnd, startDate, endDate);

          if (
            !showFullEndChild &&
            !isOverlapping(displayTaskStart, displayTaskEnd, startDate, endDate)
          )
            return;
          if (displayTaskStart > displayTaskEnd) return;

          let barColor = "#CDB4DB"; 
          switch (t.status) {
            case 13:
              barColor = "#bfdaf0d5";
              break;
            case 4:
              barColor = "#B9FBC0";
              break;
            case 3:
              barColor = "#ffc5b7ff";
              break;
          }

          mappedTasks.push({
            id: `task-${t.id}`,
            name: t.name,
            type: "task",
            start: displayTaskStart,
            end: displayTaskEnd,
            progress: Number(t.progress) || 0,
            project: `project-${project.id}`,
            isDisabled: false,
            styles: {
              progressColor: barColor,
              progressSelectedColor: barColor,
              backgroundColor: barColor,
              backgroundSelectedColor: barColor,
            },
          });
        });
      });

      setTasks(mappedTasks);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [projectId, startDate, endDate]);

  const handleExpanderClick = (task: Task) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, hideChildren: !t.hideChildren } : t
      )
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      {!loading && tasks.length > 0 ? (
        <div style={{ maxHeight: "600px", overflowY: "auto" }}>
          <Gantt
            tasks={tasks}
            viewMode={ViewMode.Day}
            locale="en-GB"
            onExpanderClick={handleExpanderClick}
            listCellWidth="200px"
          />
        </div>
      ) : (
        !loading && (
          <p className="text-gray-500">No tasks available in this range</p>
        )
      )}
    </div>
  );
}
