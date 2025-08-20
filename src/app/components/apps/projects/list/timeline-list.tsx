"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import api from "@/utils/axios";
import DynamicGantt from "@/app/components/DynamicGantt";

export type TimelineListProps = {
  projectId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultOpenIds?: number[];
};

type Task = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  status: "Pending" | "In Progress" | "Completed";
  type: "project" | "task";
  parentId?: string;
  created_at?: Date;
};

export default function TimelineList({
  projectId,
  startDate,
  endDate,
  defaultOpenIds = [],
}: TimelineListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Utility functions same as before...

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

      const projects = response.data.info;

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
                : t.status === 3
                ? "In Progress"
                : "Pending",
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

  return (
    <div style={{ padding: 20 }}>
      {!loading && tasks.length > 0 ? (
        <DynamicGantt
          tasks={tasks}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
        />
      ) : (
        !loading && (
          <p className="text-gray-500">No tasks available in this range</p>
        )
      )}
    </div>
  );
}
