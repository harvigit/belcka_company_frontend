"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Tooltip,
  Alert,
  Stack,
  TableContainer,
} from "@mui/material";
import {
  IconChevronDown,
  IconChevronRight,
  IconPlus,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import { startOfWeek, endOfWeek } from "date-fns";
import {
  format,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

import CreateProjectTask from "../tasks";
import dayjs from "dayjs";

export type Task = {
  id: number | string;
  name: string;
  start_date: string;
  end_date: string;
  color?: string;
  created_at: string;
  address_id: number;
};

export type Project = {
  id: number | string;
  name?: string;
  address: string;
  start_date?: string | null;
  end_date?: string | null;
  tasks: Task[];
};

export type TimelineListProps = {
  endpoints?: {
    listProjects?: string;
  };
  projectId: number | null;
  startDate: Date | null;
  endDate: Date | null;
  defaultOpenIds?: Array<Project["id"]>;
};

export interface TradeList {
  id: number;
  name: string;
}

const toDate = (iso: string) => new Date(iso + "T00:00:00");
const formatISO = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (d: Date, days: number) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt;
};

const getMonthLabel = (d: Date) =>
  d.toLocaleString(undefined, { month: "long", year: "numeric" });

const getWeekdayShort = (d: Date) =>
  d
    .toLocaleDateString(undefined, { weekday: "short" })
    .slice(0, 1)
    .toUpperCase();

const pastelColors = [
  "#A3CEF1",
  "#FFB4A2",
  "#FFD6A5",
  "#B9FBC0",
  "#CDB4DB",
  "#90DBF4",
  "#FFADAD",
  "#CAFFBF",
  "#9BF6FF",
  "#FFC6FF",
];

const getRandomColor = (id: string | number) => {
  const idx =
    Math.abs(
      typeof id === "number"
        ? id
        : id
            .toString()
            .split("")
            .reduce((a, c) => a + c.charCodeAt(0), 0)
    ) % pastelColors.length;
  return pastelColors[idx];
};

const TimelineList: React.FC<TimelineListProps> = ({
  projectId,
  startDate,
  endDate,
}) => {
  const [expanded, setExpanded] = useState<Array<Project["id"]>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [editing, setEditing] = useState<{
    projectId: Project["id"];
    task?: Task;
  } | null>(null);

  const [form, setForm] = useState<Partial<Task>>({
    name: "",
    start_date: "",
    end_date: "",
    color: "",
  });

  const [formData, setFormData] = useState<any>({});

  const { days, months } = useMemo(() => {
    const allDates: string[] = [];

    projects.forEach((p) =>
      p.tasks.forEach((t) => {
        allDates.push(t.start_date);
        allDates.push(t.end_date);
      })
    );

    const minISO = startDate
      ? formatISO(startDate)
      : allDates.length
      ? allDates.reduce((a, b) => (a < b ? a : b))
      : formatISO(new Date());

    const maxISO = endDate
      ? formatISO(endDate)
      : allDates.length
      ? allDates.reduce((a, b) => (a > b ? a : b))
      : formatISO(new Date());

    const min = toDate(minISO);
    const max = toDate(maxISO);

    const start = addDays(min, -2);
    const end = addDays(max, 5);

    const daysArr: Date[] = [];
    let cur = new Date(start);
    while (cur <= end) {
      daysArr.push(new Date(cur));
      cur = addDays(cur, 1);
    }

    type MonthBlock = { label: string; startIndex: number; length: number };
    const monthBlocks: MonthBlock[] = [];
    let idx = 0;
    while (idx < daysArr.length) {
      const m = daysArr[idx].getMonth();
      const label = getMonthLabel(daysArr[idx]);
      let len = 0;
      while (idx + len < daysArr.length && daysArr[idx + len].getMonth() === m)
        len++;
      monthBlocks.push({ label, startIndex: idx, length: len });
      idx += len;
    }

    return { days: daysArr, months: monthBlocks };
  }, [projects, startDate, endDate]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const fetchData = async () => {
    try {
      const today = new Date();
      const defaultStart = startOfWeek(today, { weekStartsOn: 1 });
      const defaultEnd = endOfWeek(today, { weekStartsOn: 1 });

      const fromDate = startDate ?? defaultStart;
      const toDate = endDate ?? defaultEnd;

      const from = format(fromDate, "yyyy-MM-dd");
      const to = format(toDate, "yyyy-MM-dd");

      const res = await api.get(
        `address/get?project_id=${projectId}&start_date=${from}&end_date=${to}`
      );

      const withColors = (res.data.info || []).map((p: Project) => ({
        ...p,
        tasks: p.tasks.map((t) => ({
          ...t,
          color: t.color || getRandomColor(t.id),
        })),
      }));

      setProjects(withColors);
    } catch (err) {
      setError("Failed to fetch timeline data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [projectId, startDate, endDate]);

  const isExpanded = (id: Project["id"]) => expanded.includes(id);
  const toggle = (id: Project["id"]) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const getTaskDateRange = (task: any) => {
    const start = task.start_date
      ? startOfDay(parseISO(task.start_date))
      : startOfDay(parseISO(task.created_at));

    const end = task.end_date
      ? endOfDay(parseISO(task.end_date))
      : endOfDay(new Date());

    return { start, end };
  };

  const renderTaskCells = (task: any) => {
    const { start, end } = getTaskDateRange(task);

    return days.map((day, i) => {
      const currentDay = startOfDay(day);

      const isInRange =
        (isEqual(currentDay, start) || isAfter(currentDay, start)) &&
        (isEqual(currentDay, end) || isBefore(currentDay, end));

      return (
        <TableCell key={i} sx={{ p: 0, height: 40 }}>
          {isInRange && (
            <Tooltip title={task.name} placement="top">
              <Box
                sx={{
                  bgcolor: task.color,
                  height: 18,
                  borderRadius: 0,
                  cursor: "pointer",
                }}
              />
            </Tooltip>
          )}
        </TableCell>
      );
    });
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);
  const handleOpenCreateDrawer = () => {
    setFormData({
      address_id: null,
      type_of_work_id: 0,
      location_id: null,
      trade_id: null,
      company_id: user?.company_id || 0,
      duration: 0,
      rate: 0,
      is_attchment: false,
    });
    setDrawerOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        project_id: projectId,
      };
      const result = await api.post("company-tasks/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        setLoading(true);
        fetchData();
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          address_id: null,
          type_of_work_id: null,
          location_id: null,
          trade_id: null,
          company_id: user?.company_id || 0,
          duration: 0,
          rate: 0,
          is_attchment: false,
        });
      } else {
        toast.error(result.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating address:", error);
      setLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ overflow: "auto" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer sx={{ maxHeight: 600, overflowX: "auto" }}>
        <Table stickyHeader aria-label="sticky table" size="small">
          <TableHead>
            <TableRow>
              <TableCell />
              {months.map((m: any, idx: number) => (
                <TableCell
                  key={idx}
                  align="center"
                  colSpan={m.length}
                  sx={{ bgcolor: "#fafafa", fontWeight: 700 }}
                >
                  {m.label}
                </TableCell>
              ))}
            </TableRow>

            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: "#fafafa",
                  minWidth: 300,
                  height: 60,
                  fontWeight: "bold",
                }}
              >
                Name
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  position: "sticky",
                  left: 300,
                  zIndex: 3,
                  bgcolor: "#fafafa",
                  fontWeight: "bold",
                  minWidth: 120,
                }}
              >
                Start Date
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  position: "sticky",
                  left: 420,
                  zIndex: 3,
                  bgcolor: "#fafafa",
                  fontWeight: "bold",
                  minWidth: 120,
                }}
              >
                End Date
              </TableCell>

              {days.map((d: Date, i: number) => (
                <TableCell key={i} align="center">
                  <Box>
                    <Typography variant="caption" sx={{ lineHeight: 1 }}>
                      {d.getDate()}
                    </Typography>
                    <br />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ lineHeight: 1 }}
                    >
                      {getWeekdayShort(d)}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {projects.map((project: any) => (
              <React.Fragment key={project.id}>
                <TableRow hover>
                  <TableCell
                    sx={{
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => toggle(project.id)}
                      >
                        {isExpanded(project.id) ? (
                          <IconChevronDown size={18} />
                        ) : (
                          <IconChevronRight size={18} />
                        )}
                      </IconButton>
                      <Typography fontWeight={700}>{project.name}</Typography>
                    </Box>
                    <Button
                      sx={{ ml: 4 }}
                      size="small"
                      color="inherit"
                      onClick={(e) => {
                        e.preventDefault();
                        const addressId =
                          project.tasks?.[0]?.address_id ?? null;
                        setSelectedAddressId(addressId);
                        handleOpenCreateDrawer();
                      }}
                    >
                      <IconPlus size={16} color="#007AFF"/>
                      <Typography color="#007AFF" fontWeight={500}>
                        Task
                      </Typography>
                    </Button>
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      position: "sticky",
                      fontWeight: 600,
                      left: 300,
                      zIndex: 2,
                      bgcolor: "#fafafa",
                    }}
                  >
                    {formatDate(project.start_date)}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      position: "sticky",
                      fontWeight: 600,
                      left: 420,
                      bgcolor: "#fafafa",
                      zIndex: 1,
                    }}
                  >
                    {formatDate(project.end_date)}
                  </TableCell>
                  {days.map((_, i) => (
                    <TableCell key={i} />
                  ))}
                </TableRow>

                {/* Task rows */}
                {isExpanded(project.id) &&
                  project.tasks.map((task: any) => (
                    <TableRow key={task.id} hover>
                      <TableCell
                        sx={{
                          position: "sticky",
                          left: 0,
                          zIndex: 3,
                          bgcolor: "#fafafa",
                          minWidth: 250,
                          pl: 7,
                          height: 60,
                          fontWeight: "bold",
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            className="color_box"
                            sx={{
                              bgcolor: task.color,
                              borderRadius: 0.2,
                              width: 12,
                              height: 12,
                            }}
                          />
                          <Box width={"100%"}>
                            <Typography>{task.name}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          position: "sticky",
                          left: 300,
                          zIndex: 2,
                          bgcolor: "#fafafa",
                        }}
                      >
                        {formatDate(task.start_date)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          position: "sticky",
                          left: 420,
                          bgcolor: "#fafafa",
                          zIndex: 1,
                        }}
                      >
                        {formatDate(task.end_date)}
                      </TableCell>
                      {renderTaskCells(task)}
                    </TableRow>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add task */}
      <CreateProjectTask
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleTaskSubmit={handleTaskSubmit}
        trade={trade}
        isSaving={isSaving}
        address_id={selectedAddressId}
        projectId={projectId}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing?.task ? "Edit Task" : "Create Task"}</DialogTitle>
        <DialogContent>
          <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Task name"
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="date"
                label="Start date"
                value={form.start_date || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="date"
                label="End date"
                value={form.end_date || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Color"
              type="color"
              value={form.color || "#1976d2"}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TimelineList;
