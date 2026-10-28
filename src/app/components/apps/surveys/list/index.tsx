"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  MenuItem,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconCamera,
  IconTrash,
  IconClipboardCheck,
  IconClock,
  IconCheck,
  IconFileText,
  IconX,
  IconCalculator,
  IconBriefcase,
  IconLock,
  IconSettings,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission } from "@/lib/permissions";
import useSurveyAccess from "../useSurveyAccess";
import { useSession } from "next-auth/react";
import { flexRender } from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import ColumnVisibilityPopover from "@/app/components/common/ColumnVisibilityPopover";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import BlankCard from "@/app/components/shared/BlankCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import SurveySettings from "@/app/components/apps/settings/survey-settings";
import { Survey, SurveyProjectOption, SurveyorOption, SurveyStatus } from "../types";

const statusColorMap: Record<
  SurveyStatus,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  draft: "default",
  assigned: "info",
  in_progress: "warning",
  submitted: "primary",
  qs_review: "secondary",
  completed: "success",
  frozen: "success",
};

const statusLabelMap: Record<SurveyStatus, string> = {
  draft: "Draft",
  assigned: "Assigned",
  in_progress: "In Progress",
  submitted: "Submitted",
  qs_review: "QS Review",
  completed: "Completed",
  frozen: "Frozen",
};

export default function SurveyList() {
  const router = useRouter();
  const access = useSurveyAccess();
  const isAdmin = access.is_admin;
  const session = useSession();
  const user = session.data?.user as any;
  // Survey Settings is open to admins and holders of the Settings permission; the API enforces the same rule.
  const { permissions } = usePermissions();
  const canOpenSettings = isAdmin || hasPermission(permissions, "Settings");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Survey[]>([]);
  // Totals per status across all pages, returned by the list API for the summary cards.
  const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [surveyorFilter, setSurveyorFilter] = useState<string>("all");

  // Options
  const [projects, setProjects] = useState<SurveyProjectOption[]>([]);
  const [surveyors, setSurveyors] = useState<SurveyorOption[]>([]);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Work Order Handoff Dialog State
  const [handoffTargetSurvey, setHandoffTargetSurvey] = useState<Survey | null>(null);
  const [submittingWo, setSubmittingWo] = useState(false);
  const [woForm, setWoForm] = useState({
    contractor_id: "",
    contractor_name: "",
    trade_name: "",
    start_date: "",
    target_completion_date: "",
    notes: "",
  });

  const handleOpenHandoff = (survey: Survey) => {
    setHandoffTargetSurvey(survey);
    setWoForm({
      contractor_id: survey.surveyor_id ? String(survey.surveyor_id) : "",
      contractor_name: survey.surveyor_name || "",
      trade_name: "",
      start_date: new Date().toISOString().split("T")[0],
      target_completion_date: "",
      notes: `Handoff from survey ${survey.reference}. Baseline total: £${Number(survey.baseline_total || 0).toFixed(2)}.`,
    });
  };

  const handleCreateWorkOrder = async () => {
    if (!handoffTargetSurvey) return;
    try {
      setSubmittingWo(true);
      const res = await api.post(`/surveys/${handoffTargetSurvey.id}/work-order`, {
        contractor_id: woForm.contractor_id ? Number(woForm.contractor_id) : undefined,
        contractor_name: woForm.contractor_name.trim() || undefined,
        trade_name: woForm.trade_name.trim() || undefined,
        start_date: woForm.start_date || undefined,
        target_completion_date: woForm.target_completion_date || undefined,
        notes: woForm.notes.trim() || undefined,
      });

      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Work order successfully issued to contractor!");
        setHandoffTargetSurvey(null);
        void fetchSurveys();
      } else {
        toast.error(res.data?.message || "Failed to issue work order");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to issue work order");
    } finally {
      setSubmittingWo(false);
    }
  };

  // Column Visibility Popover Anchor
  const [columnAnchor, setColumnAnchor] = useState<HTMLElement | null>(null);

  // Persistent column visibility
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_surveys_list`,
    enabled: !!user?.id,
    alwaysVisibleColumns: ["actions"],
  });

  // Load resource options (projects & surveyors)
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [resExpense, resUsers] = await Promise.allSettled([
          api.get("/expense/get-resources"),
          api.get("surveys/assignable-users"),
        ]);

        if (resExpense.status === "fulfilled" && resExpense.value.data) {
          const rawProjects = resExpense.value.data.projects || [];
          setProjects(rawProjects.map((p: any) => ({ id: p.id, name: p.name })));
        }

        if (resUsers.status === "fulfilled" && resUsers.value.data) {
          const rawUsers = resUsers.value.data.info || [];
          setSurveyors(
            rawUsers.map((u: any) => ({
              id: u.id,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || `User #${u.id}`,
              email: u.email,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };

    void loadResources();
  }, []);

  // Fetch surveys from backend API. A plain function (not memoised) so the table hook always
  // calls the version that sees the current page and page size.
  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (projectFilter !== "all") params.project_id = projectFilter;
      if (surveyorFilter !== "all") params.surveyor_id = surveyorFilter;

      const res = await api.get("surveys/get", { params });
      if (res.data?.IsSuccess) {
        const rows = res.data.info || [];
        setData(rows);
        setTotalRows(res.data.data?.totalItems ?? rows.length);
        setPageCount(res.data.data?.totalPages ?? 1);
        setStatusCounts(res.data.data?.statusCounts ?? null);
      } else {
        setData([]);
        setTotalRows(0);
        setPageCount(1);
        setStatusCounts(null);
      }
    } catch (err) {
      console.error("Failed to load surveys", err);
      setData([]);
      setTotalRows(0);
      setPageCount(1);
      setStatusCounts(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await api.post("surveys/delete", { id: deleteTargetId });
      if (res.data?.IsSuccess) {
        toast.success("Survey deleted successfully!");
        void fetchSurveys();
      } else {
        toast.error(res.data?.message || "Failed to delete survey");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete survey");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    statusFilter !== "all" ||
    projectFilter !== "all" ||
    surveyorFilter !== "all"
  );

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setProjectFilter("all");
    setSurveyorFilter("all");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo(
    () => [
      {
        id: "reference",
        header: "Survey Ref",
        meta: { label: "Survey Ref" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Box>
            <Link
              href={`/apps/surveys/view/${row.original.id}`}
              style={{ textDecoration: "none" }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="primary.main"
                sx={{ "&:hover": { textDecoration: "underline" } }}
              >
                {row.original.reference || `SRV-${row.original.id}`}
              </Typography>
            </Link>
            {row.original.title && (
              <Typography variant="caption" color="text.secondary" display="block">
                {row.original.title}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: "property",
        header: "Property / Project",
        meta: { label: "Property / Project" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.original.property_name || "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.project_name || "—"}
            </Typography>
          </Box>
        ),
      },
      {
        id: "template",
        header: "Template / Method",
        meta: { label: "Template / Method" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Box>
            <Typography variant="body2">
              {row.original.template_name || (row.original.creation_method === "blank" ? "Custom Blank" : "Standard")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(row.original as any).total_rooms ?? row.original.rooms?.length ?? 0} room(s)
            </Typography>
          </Box>
        ),
      },
      {
        id: "surveyor",
        header: "Assigned Surveyor",
        meta: { label: "Assigned Surveyor" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Typography variant="body2">
            {row.original.surveyor_name || (
              <Typography component="span" variant="caption" color="text.secondary" fontStyle="italic">
                Unassigned
              </Typography>
            )}
          </Typography>
        ),
      },
      {
        id: "survey_date",
        header: "Survey Date",
        meta: { label: "Survey Date" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Typography variant="body2">
            {row.original.survey_date
              ? new Date(row.original.survey_date).toLocaleDateString()
              : "—"}
          </Typography>
        ),
      },
      {
        id: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const status = row.original.status || "draft";
          const progress = (row.original as any).progress;
          return (
            <Box>
              <Chip
                size="small"
                label={statusLabelMap[status] || status}
                color={statusColorMap[status] || "default"}
                sx={{ fontWeight: 600, textTransform: "capitalize" }}
              />
              {progress && progress.total > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {progress.inspected}/{progress.total} inspected ({progress.percentage}%)
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        id: "baseline_total",
        header: "Commercial Baseline",
        meta: { label: "Commercial Baseline" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const hasBaseline = row.original.baseline_total !== null && row.original.baseline_total !== undefined;
          const isCompleted = row.original.status === "completed" || row.original.status === "frozen";

          if (hasBaseline) {
            return (
              <Box>
                <Typography variant="body2" fontWeight={800} color={isCompleted ? "success.dark" : "text.primary"}>
                  £{Number(row.original.baseline_total).toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
                <Chip
                  size="small"
                  color="success"
                  label="Locked Baseline"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700, mt: 0.5 }}
                />
              </Box>
            );
          }

          if (["submitted", "qs_review"].includes(row.original.status)) {
            return (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                  Under QS Review
                </Typography>
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label="Pricing in Progress"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600, mt: 0.5 }}
                />
              </Box>
            );
          }

          return (
            <Typography variant="caption" color="text.secondary" fontStyle="italic">
              Pre-Inspection
            </Typography>
          );
        },
      },
      {
        id: "qs_status",
        header: "QS & Work Order",
        meta: { label: "QS & Work Order" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const qsStatus = row.original.qs_status;
          const workOrder = (row.original as any).work_order;

          return (
            <Stack spacing={0.5} alignItems="flex-start">
              {workOrder && (
                <Tooltip title={workOrder.status === "cancelled" ? `Work order ${workOrder.reference} was cancelled` : `Issued to ${workOrder.contractor_name || "Contractor"} for £${Number(workOrder.total_amount).toFixed(2)}`}>
                  <Chip
                    size="small"
                    color={workOrder.status === "cancelled" ? "default" : "primary"}
                    icon={<IconBriefcase size={12} />}
                    label={workOrder.status === "cancelled" ? `${workOrder.reference} (cancelled)` : workOrder.reference}
                    component={Link}
                    href={`/apps/surveys/view/${row.original.id}?tab=commercial`}
                    clickable
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                  />
                </Tooltip>
              )}
              {isAdmin && row.original.status === "completed" && row.original.baseline_locked_at && (!workOrder || workOrder.status === "cancelled") && (
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label="Ready for Handoff"
                  onClick={() => handleOpenHandoff(row.original)}
                  sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}
                />
              )}

              {qsStatus === "rework_requested" ? (
                <Chip
                  size="small"
                  color="warning"
                  label="Rework Requested"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600 }}
                />
              ) : qsStatus === "approved" ? (
                <Chip
                  size="small"
                  color="success"
                  label="QS Approved"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600 }}
                />
              ) : qsStatus === "in_review" || qsStatus === "in_progress" ? (
                <Chip
                  size="small"
                  color="secondary"
                  label="QS In Review"
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 600 }}
                />
              ) : null}
            </Stack>
          );
        },
      },
      {
        id: "created_at",
        header: "Created Date",
        meta: { label: "Created Date" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Typography variant="caption" color="text.secondary">
            {row.original.created_at
              ? new Date(row.original.created_at).toLocaleDateString()
              : "—"}
          </Typography>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { label: "Actions" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const isCompleted = row.original.status === "completed" || row.original.status === "frozen";
          const hasBaseline = Boolean(row.original.baseline_locked_at);
          const workOrder = (row.original as any).work_order;

          return (
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              {/* Work Order Handoff Action */}
              {isCompleted && hasBaseline && workOrder && (
                  <Tooltip title={`View Work Order ${workOrder.reference}`}>
                    <IconButton
                      size="small"
                      color="primary"
                      component={Link}
                      href={`/apps/surveys/view/${row.original.id}?tab=commercial`}
                    >
                      <IconBriefcase size={18} />
                    </IconButton>
                  </Tooltip>
              )}
              {isCompleted && hasBaseline && isAdmin && row.original.status === "completed" && (!workOrder || workOrder.status === "cancelled") && (
                  <Tooltip title="Issue Contractor Work Order">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenHandoff(row.original)}
                    >
                      <IconBriefcase size={18} />
                    </IconButton>
                  </Tooltip>
              )}

              {["submitted", "qs_review", "completed", "frozen"].includes(row.original.status) && (
                <Tooltip title="QS Assessment & Costing">
                  <IconButton
                    size="small"
                    color="secondary"
                    component={Link}
                    href={`/apps/surveys/qs/${row.original.id}`}
                  >
                    <IconCalculator size={18} />
                  </IconButton>
                </Tooltip>
              )}

              {(isAdmin || row.original.surveyor_id === access.user_id) &&
                (row.original.status === "assigned" ||
                row.original.status === "in_progress" ||
                row.original.status === "draft") && (
                <Tooltip title="Conduct Inspection">
                  <IconButton
                    size="small"
                    color="success"
                    component={Link}
                    href={`/apps/surveys/inspect/${row.original.id}`}
                  >
                    <IconCamera size={18} />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="View Survey">
                <IconButton
                  size="small"
                  color="primary"
                  component={Link}
                  href={`/apps/surveys/view/${row.original.id}`}
                >
                  <IconEye size={18} />
                </IconButton>
              </Tooltip>

              {isAdmin && !isCompleted && (
                <Tooltip title="Edit Survey">
                  <IconButton
                    size="small"
                    color="info"
                    component={Link}
                    href={`/apps/surveys/edit/${row.original.id}`}
                  >
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
              )}

              {isAdmin && ["draft", "assigned", "in_progress"].includes(row.original.status) && (
                <Tooltip title="Delete Survey">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTargetId(row.original.id)}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          );
        },
      },
    ],
    [isAdmin, access.user_id],
  );

  const {
    table,
    pagination,
    setPagination,
    totalRows,
    setTotalRows,
    setPageCount,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchSurveys,
    debounceDependencies: [search, statusFilter, projectFilter, surveyorFilter],
    initialPagination: { pageIndex: 0, pageSize: 50 },
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  // Summary card count for the given statuses: API totals when available, otherwise the loaded rows.
  const countByStatus = (...statuses: string[]) =>
    statusCounts
      ? statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0)
      : data.filter((s) => statuses.includes(s.status)).length;

  // Reset to first page when search or filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, projectFilter, surveyorFilter, setPagination]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Top Header Bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Surveys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operational surveys, room inspections, and property condition assessments.
          </Typography>
        </Box>

        {canOpenSettings && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Survey Settings">
              <IconButton onClick={() => setSettingsOpen(true)} color="primary" aria-label="Survey Settings">
                <IconSettings />
              </IconButton>
            </Tooltip>
            <SurveySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
            {isAdmin && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<IconPlus size={18} />}
                component={Link}
                href="/apps/surveys/create"
                sx={{ fontWeight: 600, borderRadius: "8px" }}
              >
                Create Survey
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {/* KPI Summary Cards */}
      <Grid container spacing={2.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 44, height: 44, borderRadius: "10px" }}>
                  <IconClipboardCheck size={22} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Total Surveys
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {totalRows}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: "grey.100", color: "grey.700", width: 44, height: 44, borderRadius: "10px" }}>
                  <IconFileText size={22} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Drafts
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {countByStatus("draft")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: "warning.light", color: "warning.main", width: 44, height: 44, borderRadius: "10px" }}>
                  <IconClock size={22} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    In Progress / Assigned
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {countByStatus("assigned", "in_progress")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: "success.light", color: "success.main", width: 44, height: 44, borderRadius: "10px" }}>
                  <IconCheck size={22} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Completed / Submitted
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {countByStatus("completed", "submitted", "qs_review", "frozen")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* Main Table Card with Toolbar */}
      <BlankCard>
        {/* Search, Filters, and Column Visibility Toolbar */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={2}
          p={2.5}
        >
          {/* Left: Search input & inline filters */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={1.5}
            flex={1}
            flexWrap="wrap"
          >
            {/* Search */}
            <CustomTextField
              size="small"
              placeholder="Search reference, property, title..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} color="#64748b" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: "100%", sm: 260 } }}
            />

            {/* Status Filter */}
            <CustomTextField
              size="small"
              select
              label="Status"
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="qs_review">QS Review</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="frozen">Frozen</MenuItem>
            </CustomTextField>

            {/* Project Filter */}
            <CustomTextField
              size="small"
              select
              label="Project"
              value={projectFilter}
              onChange={(e: any) => setProjectFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Projects</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name}
                </MenuItem>
              ))}
            </CustomTextField>

            {/* Surveyor Filter */}
            <CustomTextField
              size="small"
              select
              label="Assigned Surveyor"
              value={surveyorFilter}
              onChange={(e: any) => setSurveyorFilter(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="all">All Surveyors</MenuItem>
              {surveyors.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </CustomTextField>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Tooltip title="Clear all filters">
                <Button
                  color="error"
                  variant="outlined"
                  onClick={handleClearFilters}
                  sx={{ minWidth: 40, px: 1, height: 38 }}
                >
                  <IconX size={18} />
                </Button>
              </Tooltip>
            )}
          </Stack>

          {/* Right: Show/Hide Columns Button */}
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="flex-end">
            <Tooltip title="Show / hide columns">
              <IconButton
                color="primary"
                onClick={(e) => setColumnAnchor(e.currentTarget)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "8px",
                  p: 1,
                }}
              >
                <IconEye size={20} />
              </IconButton>
            </Tooltip>
            <ColumnVisibilityPopover
              open={Boolean(columnAnchor)}
              anchorEl={columnAnchor}
              onClose={() => setColumnAnchor(null)}
              table={table}
              excludedColumns={["actions"]}
            />
          </Stack>
        </Stack>

        <Divider />

        {/* Survey Table */}
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: "grey.50",
                        ...(header.column.id === "actions" && {
                          textAlign: "right",
                          position: "sticky",
                          right: 0,
                          zIndex: 2,
                        }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {loading ? (
                <SkeletonLoader
                  columns={table.getVisibleLeafColumns().map((col: any) => ({ name: col.id }))}
                  rowCount={5}
                />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} align="center" sx={{ py: 8 }}>
                    <Stack spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 56, height: 56 }}>
                        <IconClipboardCheck size={28} />
                      </Avatar>
                      <Typography variant="h6" fontWeight={600}>
                        No surveys found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" maxWidth={450}>
                        {hasActiveFilters
                          ? "No surveys matched your search criteria. Try clearing some filters."
                          : "No surveys have been created yet. Click 'Create Survey' to launch the builder with an existing template or blank property."}
                      </Typography>
                      {isAdmin && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<IconPlus size={18} />}
                          component={Link}
                          href="/apps/surveys/create"
                          sx={{ mt: 1, borderRadius: "8px" }}
                        >
                          Create Survey
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          py: 1.5,
                          ...(cell.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            bgcolor: "background.paper",
                            zIndex: 1,
                          }),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Standard Pagination Footer */}
        <TablePaginationFooter table={table} totalRows={totalRows} />
      </BlankCard>

      {/* Work Order Handoff Dialog */}
      <Dialog
        open={Boolean(handoffTargetSurvey)}
        onClose={() => !submittingWo && setHandoffTargetSurvey(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ bgcolor: "primary.light", color: "primary.main", width: 36, height: 36 }}>
              <IconBriefcase size={20} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Issue Contractor Work Order
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Survey Ref: {handoffTargetSurvey?.reference} • Baseline: £
                {Number(handoffTargetSurvey?.baseline_total || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                bgcolor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.300",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                This will create an official contractor/subcontractor work order snapshotting
                the approved scope items and rates. The original commercial baseline of{" "}
                <strong>
                  £
                  {Number(handoffTargetSurvey?.baseline_total || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>{" "}
                will be preserved. Any future scope changes must be handled via formal Variation Orders.
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  label="Assign Contractor / Subcontractor"
                  value={woForm.contractor_id}
                  onChange={(e: any) => {
                    const selId = e.target.value;
                    const found = surveyors.find((s) => String(s.id) === String(selId));
                    setWoForm((prev) => ({
                      ...prev,
                      contractor_id: selId,
                      contractor_name: found ? found.name : prev.contractor_name,
                    }));
                  }}
                >
                  <MenuItem value="">
                    <em>Select from registered users</em>
                  </MenuItem>
                  {surveyors.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.name} {s.email ? `(${s.email})` : ""}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  label="Contractor Name / Firm"
                  placeholder="e.g. Acme Demolition Ltd"
                  value={woForm.contractor_name}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, contractor_name: e.target.value }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  label="Trade / Package Name"
                  placeholder="e.g. General Building Works, Strip Out, Electrical"
                  value={woForm.trade_name}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, trade_name: e.target.value }))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type="date"
                  label="Scheduled Start Date"
                  value={woForm.start_date}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type="date"
                  label="Target Completion Date"
                  value={woForm.target_completion_date}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, target_completion_date: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Handoff Notes & Instructions"
                  placeholder="Site access details, safety precautions, handover conditions..."
                  value={woForm.notes}
                  onChange={(e: any) =>
                    setWoForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHandoffTargetSurvey(null)} disabled={submittingWo}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={submittingWo ? <CircularProgress size={16} color="inherit" /> : <IconBriefcase size={18} />}
            onClick={handleCreateWorkOrder}
            disabled={submittingWo}
          >
            {submittingWo ? "Issuing Work Order..." : "Issue Work Order"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTargetId)} onClose={() => setDeleteTargetId(null)}>
        <DialogTitle>Delete Survey</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this survey? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTargetId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
