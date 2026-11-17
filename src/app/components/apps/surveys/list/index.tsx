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
  Tooltip,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
  Divider,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Autocomplete,
} from "@mui/material";
import { alpha, darken, Theme } from "@mui/material/styles";
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconCamera,
  IconTrash,
  IconClipboardCheck,
  IconX,
  IconCalculator,
  IconBriefcase,
  IconLock,
  IconSettings,
  IconDotsVertical,
  IconCopy,
  IconColumns,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
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
import { NamedFilterOption, tableFilterOptions } from "@/utils/uniqueFilterOptions";
import { Survey, SurveyorOption, SurveyStatus } from "../types";

type ToneColor = "grey" | "primary" | "secondary" | "info" | "success" | "warning" | "error";

// Status order follows the survey lifecycle; the tabs above the table use the same order.
const STATUS_META: Record<SurveyStatus, { label: string; tone: ToneColor }> = {
  draft: { label: "Draft", tone: "grey" },
  assigned: { label: "Assigned", tone: "info" },
  in_progress: { label: "In Progress", tone: "warning" },
  submitted: { label: "Submitted", tone: "primary" },
  qs_review: { label: "QS Review", tone: "secondary" },
  completed: { label: "Completed", tone: "success" },
  frozen: { label: "Frozen", tone: "grey" },
};
const STATUS_ORDER = Object.keys(STATUS_META) as SurveyStatus[];

// Statuses in which the surveyor can still inspect, edit, or the survey can be deleted.
const FIELD_STATUSES: string[] = ["draft", "assigned", "in_progress"];
const QS_STATUSES: string[] = ["submitted", "qs_review", "completed", "frozen"];

// Soft "tonal" badge colours from the theme palette, readable in light and dark mode.
const toneSx = (tone: ToneColor) => (theme: Theme) => {
  const main = tone === "grey" ? theme.palette.grey[500] : theme.palette[tone].main;
  return {
    bgcolor: alpha(main, theme.palette.mode === "dark" ? 0.24 : 0.12),
    color: theme.palette.mode === "dark" ? main : darken(main, tone === "warning" ? 0.45 : 0.15),
  };
};

function Badge({ tone, label, icon }: { tone: ToneColor; label: string; icon?: React.ReactNode }) {
  return (
    <Box
      component="span"
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.25,
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
        },
        toneSx(tone),
      ]}
    >
      {icon}
      {label}
    </Box>
  );
}

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const formatMoney = (value: number | string | null | undefined) =>
  `£${Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function SurveyList() {
  const router = useRouter();
  const access = useSurveyAccess();
  const isAdmin = access.is_admin;
  const session = useSession();
  const user = session.data?.user as any;
  // Survey Settings is open to everyone who can see this page (admins and Surveys permission
  // holders); the API allows the same users to manage elements, groups, templates, etc.
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Survey[]>([]);
  // Totals per status across all pages (ignoring the status tab), for the tab counts.
  const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [surveyorFilter, setSurveyorFilter] = useState<string>("all");

  // Options
  // Assignable users for the work order dialog's contractor picker.
  const [surveyors, setSurveyors] = useState<SurveyorOption[]>([]);
  // Filter dropdown options: only projects and surveyors that appear in the listing (all pages).
  const [projectOptions, setProjectOptions] = useState<NamedFilterOption[]>([]);
  const [surveyorOptions, setSurveyorOptions] = useState<NamedFilterOption[]>([]);

  // Row "more actions" menu
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; survey: Survey } | null>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);

  // Duplicate survey dialog: copies the set-up into a new survey, assigned to the chosen surveyor.
  const [duplicateSource, setDuplicateSource] = useState<Survey | null>(null);
  const [duplicateSurveyorId, setDuplicateSurveyorId] = useState<string>("");
  const [duplicateDate, setDuplicateDate] = useState<string>("");
  // Both fields are required; problems are shown after the first Create attempt.
  const [duplicateTried, setDuplicateTried] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const openDuplicate = (survey: Survey) => {
    setDuplicateSource(survey);
    setDuplicateTried(false);
    // Start with the same surveyor when they can still be assigned.
    const same = survey.surveyor_id && surveyors.some((s) => String(s.id) === String(survey.surveyor_id));
    setDuplicateSurveyorId(same ? String(survey.surveyor_id) : "");
    // Local today, as YYYY-MM-DD for the date input.
    const now = new Date();
    setDuplicateDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    );
  };

  const handleDuplicate = async () => {
    if (!duplicateSource) return;
    if (!duplicateSurveyorId || !duplicateDate) {
      setDuplicateTried(true);
      return;
    }
    try {
      setDuplicating(true);
      const res = await api.post(`surveys/${duplicateSource.id}/duplicate`, {
        surveyor_id: Number(duplicateSurveyorId),
        survey_date: duplicateDate,
      });
      if (res.data?.IsSuccess) {
        toast.success(res.data.message || "Survey duplicated");
        setDuplicateSource(null);
        const newId = res.data.info?.id;
        if (newId) router.push(`/apps/surveys/view/${newId}`);
        else void fetchSurveys();
      } else {
        toast.error(res.data?.message || "Failed to duplicate survey");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to duplicate survey");
    } finally {
      setDuplicating(false);
    }
  };
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

  // Persistent column visibility (Created Date is hidden until the user turns it on)
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_surveys_list_v3`,
    enabled: !!user?.id,
    defaultVisibility: { template: false, baseline_total: false, created_at: false },
    alwaysVisibleColumns: ["actions"],
  });

  // Load assignable users for the work order dialog
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [resUsers] = await Promise.allSettled([api.get("surveys/assignable-users")]);

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
      const baseParams: any = {};
      if (search.trim()) baseParams.search = search.trim();
      if (projectFilter !== "all") baseParams.project_id = projectFilter;
      if (surveyorFilter !== "all") baseParams.surveyor_id = surveyorFilter;

      const params: any = {
        ...baseParams,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };
      if (statusFilter !== "all") params.status = statusFilter;

      // The API counts per status within the given filters, so with a status tab selected the
      // other tabs' counts come from a second, one-row request without the status filter.
      const [res, countsRes] = await Promise.all([
        api.get("surveys/get", { params }),
        statusFilter !== "all"
          ? api.get("surveys/get", { params: { ...baseParams, page: 1, limit: 1 } }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (res.data?.IsSuccess) {
        const rows = res.data.info || [];
        setData(rows);
        setTotalRows(res.data.data?.totalItems ?? rows.length);
        setPageCount(res.data.data?.totalPages ?? 1);
        setStatusCounts(
          statusFilter === "all"
            ? res.data.data?.statusCounts ?? null
            : countsRes?.data?.data?.statusCounts ?? null,
        );
        const filterOptions = res.data.filter_options || {};
        setProjectOptions((prev) => tableFilterOptions(filterOptions.projects, rows, "project_id", "project_name", prev));
        setSurveyorOptions((prev) => tableFilterOptions(filterOptions.surveyors, rows, "surveyor_id", "surveyor_name", prev));
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

  // What the current user can do with a survey; the same rules the old icon buttons used.
  const surveyActions = (survey: Survey) => {
    const status = survey.status;
    const isCompleted = status === "completed" || status === "frozen";
    const workOrder = (survey as any).work_order;
    const activeWorkOrder = workOrder && workOrder.status !== "cancelled" ? workOrder : null;
    return {
      canInspect: (isAdmin || survey.surveyor_id === access.user_id) && FIELD_STATUSES.includes(status),
      canQs: QS_STATUSES.includes(status),
      canEdit: isAdmin && !isCompleted,
      canDelete: isAdmin && FIELD_STATUSES.includes(status),
      canIssueWorkOrder:
        isAdmin && status === "completed" && Boolean(survey.baseline_locked_at) && !activeWorkOrder,
      workOrder: isCompleted && survey.baseline_locked_at ? workOrder : null,
    };
  };

  const columns = useMemo(
    () => [
      {
        id: "reference",
        header: "Survey",
        meta: { label: "Survey", width: "19%" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const s = row.original;
          return (
            <Box sx={{ minWidth: 0 }}>
              <Link
                href={`/apps/surveys/view/${s.id}`}
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: "none" }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color="primary.main"
                  noWrap
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  {s.reference || `SRV-${s.id}`}
                </Typography>
              </Link>
              <Tooltip title={s.title || ""} placement="top-start" enterDelay={600}>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {s.title || "—"}
                </Typography>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        id: "property",
        header: "Property",
        meta: { label: "Property", width: "21%" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Box sx={{ minWidth: 0 }}>
            <Tooltip title={row.original.property_name || ""} placement="top-start" enterDelay={600}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {row.original.property_name || "—"}
              </Typography>
            </Tooltip>
            <Typography variant="body2" color="text.secondary" noWrap>
              {row.original.project_name || "—"}
            </Typography>
          </Box>
        ),
      },
      {
        id: "template",
        header: "Template",
        meta: { label: "Template", width: "15%" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const s = row.original;
          const rooms = (s as any).total_rooms ?? s.rooms?.length ?? 0;
          return (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {s.template_name || (s.creation_method === "blank" ? "Custom blank" : "Standard")}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {rooms} {rooms === 1 ? "room" : "rooms"}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: "surveyor",
        header: "Surveyor",
        meta: { label: "Surveyor", width: "15%" },
        cell: ({ row }: { row: { original: Survey } }) =>
          row.original.surveyor_name ? (
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
              <Avatar sx={[{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }, toneSx("primary")]}>
                {initials(row.original.surveyor_name)}
              </Avatar>
              <Typography variant="body2" noWrap>
                {row.original.surveyor_name}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Unassigned
            </Typography>
          ),
      },
      {
        id: "survey_date",
        header: "Survey Date",
        meta: { label: "Survey Date", width: "12%" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Typography variant="body2" noWrap>
            {formatDate(row.original.survey_date)}
          </Typography>
        ),
      },
      {
        id: "status",
        header: "Status",
        meta: { label: "Status", width: "17%" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const s = row.original;
          const status = (s.status || "draft") as SurveyStatus;
          const meta = STATUS_META[status] || { label: status, tone: "grey" as ToneColor };
          const progress = (s as any).progress;
          const formProgress = s.form_progress;
          const workOrder = (s as any).work_order;
          const showProgress = FIELD_STATUSES.includes(status) && progress && progress.total > 0;
          const pct = showProgress ? Math.min(100, Math.max(0, Number(progress.percentage) || 0)) : 0;

          // One short line under the badge saying where the survey stands.
          let detail: React.ReactNode = null;
          if (s.qs_status === "rework_requested" && FIELD_STATUSES.includes(status)) {
            detail = (
              <Typography variant="caption" fontWeight={600} noWrap sx={(theme) => ({ color: toneSx("warning")(theme).color })}>
                Rework requested by QS
              </Typography>
            );
          } else if (showProgress) {
            detail = (
              <Tooltip
                placement="top-start"
                title={
                  <Box>
                    <div>
                      {progress.inspected} of {progress.total} elements inspected
                    </div>
                    {formProgress && formProgress.required_total > 0 && (
                      <div>
                        Property details: {formProgress.required_answered} of {formProgress.required_total} answered
                      </div>
                    )}
                  </Box>
                }
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct === 100 ? "success" : "primary"}
                    sx={{ flex: 1, maxWidth: 90, height: 5, borderRadius: 3, bgcolor: "action.hover" }}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {progress.inspected}/{progress.total} inspected
                  </Typography>
                </Stack>
              </Tooltip>
            );
          } else if (status === "submitted") {
            detail = "Waiting for QS";
          } else if (status === "qs_review") {
            detail = s.qs_status === "approved" ? "QS approved" : "QS pricing in progress";
          } else if ((status === "completed" || status === "frozen") && s.baseline_total != null) {
            detail = `${formatMoney(s.baseline_total)} baseline${
              workOrder && workOrder.status !== "cancelled" ? ` · ${workOrder.reference}` : ""
            }`;
          }

          return (
            <Stack spacing={0.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <Badge
                tone={meta.tone}
                label={meta.label}
                icon={status === "frozen" ? <IconLock size={12} /> : undefined}
              />
              {typeof detail === "string" ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {detail}
                </Typography>
              ) : (
                detail
              )}
            </Stack>
          );
        },
      },
      {
        id: "baseline_total",
        header: "Commercial",
        meta: { label: "Commercial", width: "13%" },
        cell: ({ row }: { row: { original: Survey } }) => {
          const s = row.original;
          const actions = surveyActions(s);
          const hasBaseline = s.baseline_total !== null && s.baseline_total !== undefined;
          const workOrder = actions.workOrder;

          if (hasBaseline) {
            return (
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {formatMoney(s.baseline_total)}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.25}>
                  <IconLock size={12} />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    Baseline locked
                  </Typography>
                </Stack>
                {workOrder && (
                  <Box mt={0.75}>
                    <Tooltip
                      title={
                        workOrder.status === "cancelled"
                          ? `Work order ${workOrder.reference} was cancelled`
                          : `Issued to ${workOrder.contractor_name || "contractor"} for ${formatMoney(workOrder.total_amount)}`
                      }
                    >
                      <Box
                        component={Link}
                        href={`/apps/surveys/view/${s.id}?tab=commercial`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        sx={{ textDecoration: "none" }}
                      >
                        <Badge
                          tone={workOrder.status === "cancelled" ? "grey" : "primary"}
                          label={workOrder.status === "cancelled" ? `${workOrder.reference} cancelled` : workOrder.reference}
                          icon={<IconBriefcase size={12} />}
                        />
                      </Box>
                    </Tooltip>
                  </Box>
                )}
                {actions.canIssueWorkOrder && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<IconBriefcase size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHandoff(s);
                    }}
                    sx={{ mt: 0.5, px: 0.5, minWidth: 0, fontSize: "0.75rem" }}
                  >
                    Issue work order
                  </Button>
                )}
              </Box>
            );
          }

          // Before a baseline is locked, show where the QS pricing stands.
          const qsState =
            s.qs_status === "rework_requested"
              ? { tone: "warning" as ToneColor, label: "Rework requested" }
              : s.qs_status === "approved"
                ? { tone: "success" as ToneColor, label: "QS approved" }
                : s.status === "qs_review"
                  ? { tone: "secondary" as ToneColor, label: "Being priced" }
                  : s.status === "submitted"
                    ? { tone: "grey" as ToneColor, label: "Awaiting QS" }
                    : null;
          if (qsState) {
            return (
              <Box sx={{ minWidth: 120 }}>
                <Badge tone={qsState.tone} label={qsState.label} />
              </Box>
            );
          }

          return (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          );
        },
      },
      {
        id: "created_at",
        header: "Created",
        meta: { label: "Created Date", width: "10%" },
        cell: ({ row }: { row: { original: Survey } }) => (
          <Typography variant="body2" color="text.secondary" noWrap>
            {formatDate(row.original.created_at)}
          </Typography>
        ),
      },
      {
        id: "actions",
        header: "",
        meta: { label: "Actions", width: 168 },
        cell: ({ row }: { row: { original: Survey } }) => {
          const s = row.original;
          const a = surveyActions(s);

          // One clear next step per row; everything else lives in the ••• menu.
          const primary = a.canInspect
            ? { label: s.status === "in_progress" ? "Continue" : "Inspect", icon: <IconCamera size={16} />, href: `/apps/surveys/inspect/${s.id}` }
            : a.canQs && ["submitted", "qs_review"].includes(s.status)
              ? { label: "QS Review", icon: <IconCalculator size={16} />, href: `/apps/surveys/qs/${s.id}` }
              : { label: "View", icon: <IconEye size={16} />, href: `/apps/surveys/view/${s.id}` };

          return (
            <Stack
              direction="row"
              spacing={0.5}
              justifyContent="flex-end"
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={primary.icon}
                component={Link}
                href={primary.href}
                sx={{ whiteSpace: "nowrap", borderRadius: "8px" }}
              >
                {primary.label}
              </Button>
              <Tooltip title="More actions">
                <IconButton
                  size="small"
                  aria-label="More actions"
                  onClick={(e) => setRowMenu({ anchor: e.currentTarget, survey: s })}
                >
                  <IconDotsVertical size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Reset to first page when search or filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [search, statusFilter, projectFilter, surveyorFilter, setPagination]);

  const allCount = statusCounts
    ? Object.values(statusCounts).reduce((sum, n) => sum + (n || 0), 0)
    : statusFilter === "all"
      ? totalRows
      : null;
  const tabCount = (status: string) =>
    status === "all" ? allCount : statusCounts ? statusCounts[status] ?? 0 : null;

  const menuSurvey = rowMenu?.survey;
  const menuActions = menuSurvey ? surveyActions(menuSurvey) : null;
  const closeMenu = () => setRowMenu(null);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Surveys
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Property surveys from inspection to QS pricing and work orders.
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<IconSettings size={18} />}
            onClick={() => setSettingsOpen(true)}
            sx={{ fontWeight: 600, borderRadius: "8px" }}
          >
            Settings
          </Button>
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
      </Stack>

      <BlankCard>
        {/* Status tabs with counts */}
        <Tabs
          value={statusFilter}
          onChange={(_, value) => setStatusFilter(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1.5,
            minHeight: 52,
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": { minHeight: 52, textTransform: "none", fontWeight: 600, px: 1.5 },
          }}
        >
          {["all", ...STATUS_ORDER].map((status) => {
            const count = tabCount(status);
            const selected = statusFilter === status;
            return (
              <Tab
                key={status}
                value={status}
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>{status === "all" ? "All" : STATUS_META[status as SurveyStatus].label}</span>
                    {count !== null && (
                      <Box
                        component="span"
                        sx={(theme) => ({
                          minWidth: 22,
                          px: 0.75,
                          borderRadius: "10px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          lineHeight: "20px",
                          textAlign: "center",
                          bgcolor: selected ? theme.palette.primary.main : theme.palette.action.selected,
                          color: selected ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                        })}
                      >
                        {count}
                      </Box>
                    )}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {/* Search and filters */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={1.5}
          p={2}
        >
          <CustomTextField
            size="small"
            placeholder="Search reference, title, property or project"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={18} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: { md: 280 }, maxWidth: { md: 420 } }}
          />

          <CustomTextField
            size="small"
            select
            value={projectFilter}
            onChange={(e: any) => setProjectFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All projects</MenuItem>
            {projectOptions.map((p) => (
              <MenuItem key={p.id} value={String(p.id)}>
                {p.name}
              </MenuItem>
            ))}
          </CustomTextField>

          <CustomTextField
            size="small"
            select
            value={surveyorFilter}
            onChange={(e: any) => setSurveyorFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">All surveyors</MenuItem>
            {surveyorOptions.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name}
              </MenuItem>
            ))}
          </CustomTextField>

          {hasActiveFilters && (
            <Button
              color="inherit"
              startIcon={<IconX size={16} />}
              onClick={handleClearFilters}
              sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
            >
              Clear
            </Button>
          )}

          <Box flex={1} display={{ xs: "none", md: "block" }} />

          <Tooltip title="Show / hide columns">
            <IconButton
              onClick={(e) => setColumnAnchor(e.currentTarget)}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", alignSelf: { xs: "flex-end", md: "center" } }}
            >
              <IconColumns size={20} />
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

        <Divider />

        {/* Survey Table */}
        <TableContainer>
          <Table
            stickyHeader
            sx={{
              tableLayout: "fixed",
              width: "100%",
              // Below this the table scrolls sideways instead of squeezing the columns.
              minWidth: table.getVisibleLeafColumns().length * 150,
            }}
          >
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        py: 1.25,
                        px: 1.5,
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        color: "text.secondary",
                        whiteSpace: "nowrap",
                        bgcolor: "background.default",
                        width: (header.column.columnDef.meta as any)?.width,
                        ...(header.column.id === "actions" && {
                          textAlign: "right",
                          position: "sticky",
                          right: 0,
                          zIndex: 3,
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
                      <Avatar sx={[{ width: 56, height: 56 }, toneSx("primary")]}>
                        <IconClipboardCheck size={28} />
                      </Avatar>
                      <Typography variant="h6" fontWeight={600}>
                        No surveys found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" maxWidth={450}>
                        {hasActiveFilters
                          ? "No surveys match these filters. Try another tab or clear the filters."
                          : "No surveys have been created yet. Click 'Create Survey' to start from a template or a blank property."}
                      </Typography>
                      {hasActiveFilters ? (
                        <Button variant="outlined" onClick={handleClearFilters} sx={{ mt: 1, borderRadius: "8px" }}>
                          Clear filters
                        </Button>
                      ) : (
                        isAdmin && (
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
                        )
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => router.push(`/apps/surveys/view/${row.original.id}`)}
                    sx={{
                      cursor: "pointer",
                      "&:hover .sticky-actions": { bgcolor: "action.hover" },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.id === "actions" ? "sticky-actions" : undefined}
                        sx={{
                          py: 1.75,
                          px: 1.5,
                          verticalAlign: "middle",
                          ...(cell.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            bgcolor: "background.paper",
                            backgroundImage: "none",
                            zIndex: 1,
                            width: 1,
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

        <TablePaginationFooter table={table} totalRows={totalRows} />
      </BlankCard>

      {/* Row actions menu */}
      <Menu
        anchorEl={rowMenu?.anchor}
        open={Boolean(rowMenu)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: "10px" } } }}
      >
        {menuSurvey && menuActions && [
          <MenuItem key="view" component={Link} href={`/apps/surveys/view/${menuSurvey.id}`} onClick={closeMenu}>
            <ListItemIcon><IconEye size={18} /></ListItemIcon>
            <ListItemText>View survey</ListItemText>
          </MenuItem>,
          isAdmin && (
            <MenuItem
              key="duplicate"
              onClick={() => {
                closeMenu();
                openDuplicate(menuSurvey);
              }}
            >
              <ListItemIcon><IconCopy size={18} /></ListItemIcon>
              <ListItemText>Duplicate survey</ListItemText>
            </MenuItem>
          ),
          menuActions.canInspect && (
            <MenuItem key="inspect" component={Link} href={`/apps/surveys/inspect/${menuSurvey.id}`} onClick={closeMenu}>
              <ListItemIcon><IconCamera size={18} /></ListItemIcon>
              <ListItemText>Conduct inspection</ListItemText>
            </MenuItem>
          ),
          menuActions.canQs && (
            <MenuItem key="qs" component={Link} href={`/apps/surveys/qs/${menuSurvey.id}`} onClick={closeMenu}>
              <ListItemIcon><IconCalculator size={18} /></ListItemIcon>
              <ListItemText>QS assessment &amp; costing</ListItemText>
            </MenuItem>
          ),
          menuActions.workOrder && (
            <MenuItem
              key="wo"
              component={Link}
              href={`/apps/surveys/view/${menuSurvey.id}?tab=commercial`}
              onClick={closeMenu}
            >
              <ListItemIcon><IconBriefcase size={18} /></ListItemIcon>
              <ListItemText>View work order {menuActions.workOrder.reference}</ListItemText>
            </MenuItem>
          ),
          menuActions.canIssueWorkOrder && (
            <MenuItem
              key="issue"
              onClick={() => {
                closeMenu();
                handleOpenHandoff(menuSurvey);
              }}
            >
              <ListItemIcon><IconBriefcase size={18} /></ListItemIcon>
              <ListItemText>Issue work order</ListItemText>
            </MenuItem>
          ),
          menuActions.canEdit && (
            <MenuItem key="edit" component={Link} href={`/apps/surveys/edit/${menuSurvey.id}`} onClick={closeMenu}>
              <ListItemIcon><IconEdit size={18} /></ListItemIcon>
              <ListItemText>Edit survey</ListItemText>
            </MenuItem>
          ),
          menuActions.canDelete && <Divider key="divider" />,
          menuActions.canDelete && (
            <MenuItem
              key="delete"
              onClick={() => {
                closeMenu();
                setDeleteTargetId(menuSurvey.id);
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon sx={{ color: "error.main" }}><IconTrash size={18} /></ListItemIcon>
              <ListItemText>Delete survey</ListItemText>
            </MenuItem>
          ),
        ]}
      </Menu>

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

      {/* Duplicate Survey Dialog */}
      <Dialog open={Boolean(duplicateSource)} onClose={() => !duplicating && setDuplicateSource(null)} maxWidth="xs" fullWidth>
        <DialogTitle component="div" sx={{ pb: 0.5 }}>
          <Typography variant="h6" component="h2" fontWeight={700}>
            Duplicate survey
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {duplicateSource?.reference}
            {duplicateSource?.title ? ` · ${duplicateSource.title}` : ""}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1.5, mb: 2, p: 1.5, borderRadius: "8px", bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" fontWeight={600} mb={0.5}>
              A new survey is created with the same set-up
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Copied: property, project, template, rooms and elements, property detail questions and notes.
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Not copied: inspection results, measurements, photos, answers and pricing.
            </Typography>
          </Box>
          <Stack spacing={2}>
            <Autocomplete
              options={surveyors}
              value={surveyors.find((u) => String(u.id) === duplicateSurveyorId) || null}
              onChange={(_, user) => setDuplicateSurveyorId(user ? String(user.id) : "")}
              getOptionLabel={(u) => u.name || ""}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              noOptionsText="No surveyor found"
              ListboxProps={{ style: { maxHeight: 280 } }}
              renderOption={(props, u) => {
                const { key, ...optionProps } = props as any;
                return (
                  <Box component="li" key={u.id} {...optionProps} sx={{ display: "flex", gap: 1.25, alignItems: "center", py: "6px !important" }}>
                    <Avatar sx={[{ width: 28, height: 28, fontSize: "0.7rem", fontWeight: 700 }, toneSx("primary")]}>
                      {initials(u.name)}
                    </Avatar>
                    <Box minWidth={0}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {u.name}
                      </Typography>
                      {u.email && (
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {u.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  required
                  label="Assign to"
                  placeholder="Search surveyor by name"
                  error={duplicateTried && !duplicateSurveyorId}
                  helperText={
                    duplicateTried && !duplicateSurveyorId
                      ? "Select the surveyor for the new survey"
                      : "The surveyor is notified and the survey starts as Assigned."
                  }
                />
              )}
            />
            <CustomTextField
              type="date"
              fullWidth
              required
              label="Survey date"
              value={duplicateDate}
              onChange={(e: any) => setDuplicateDate(e.target.value)}
              error={duplicateTried && !duplicateDate}
              helperText={duplicateTried && !duplicateDate ? "Select the survey date" : undefined}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDuplicateSource(null)} disabled={duplicating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={duplicating ? <CircularProgress size={16} color="inherit" /> : <IconCopy size={16} />}
            onClick={handleDuplicate}
            disabled={duplicating}
          >
            {duplicating ? "Creating..." : "Create copy"}
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
