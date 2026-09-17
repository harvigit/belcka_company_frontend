"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  IconEye,
  IconFileExport,
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Image from "next/image";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useRouter } from "next/navigation";

dayjs.extend(customParseFormat);

export type ProjectDashboardRow = {
  id: number;
  name: string;
  uuid: string;
  status: number;
  status_text: string;
  assigned_teams: number;
  working_teams: number;
  team_capacity: number;
  total_working_users: number;
  limit: number;
  checkins_7_days: number;
  checkins_30_days: number;
  total_checkins: number;
  checking_hour: number;
  shift_hour: number;
  risk: number;
  risk_percent: string;
  last_activity: string | null;
  last_activity_date: string | null;
  last_activity_action: "start" | "stop" | null;
  cases: number;
  open: number;
  close: number;
  in_amount: number;
  out_amount: number;
  in_amount_formatted: string;
  out_amount_formatted: string;
  currency: string;
  total_amount?: number;
  total_amount_formatted?: string;
};

type ProjectListingExportTotals = {
  working_teams: number;
  total_working_users: number;
  limit: number;
  checkins_7_days: number;
  checkins_30_days: number;
  total_checkins: number;
  checking_hour: number;
  shift_hour: number;
  checking_hour_formatted: string;
  shift_hour_formatted: string;
  cases: number;
  open: number;
  close: number;
  in_amount: number;
  out_amount: number;
  total_amount: number;
  in_amount_formatted: string;
  out_amount_formatted: string;
  total_amount_formatted: string;
};

const columnHelper = createColumnHelper<ProjectDashboardRow>();

const formatActivityDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(
    value,
    ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY", "DD-MM-YYYY HH:mm", "YYYY-MM-DD"],
    true,
  );
  if (parsed.isValid()) return parsed.format("DD/MM/YYYY");
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format("DD/MM/YYYY") : "-";
};

const getExportPreviewColumns = (currencySymbol: string) => [
  {
    key: "name",
    label: "Name",
    render: (row: ProjectDashboardRow) => row.name || "-",
    footer: () => "Category Totals",
  },
  {
    key: "uuid",
    label: "ID",
    render: (row: ProjectDashboardRow) => row.uuid || "-",
  },
  {
    key: "working_teams",
    label: "Teams",
    render: (row: ProjectDashboardRow) => row.working_teams || 0,
    footer: (totals: ProjectListingExportTotals) => totals.working_teams || 0,
  },
  {
    key: "total_working_users",
    label: "On site",
    render: (row: ProjectDashboardRow) => row.total_working_users || 0,
    footer: (totals: ProjectListingExportTotals) =>
      totals.total_working_users || 0,
  },
  {
    key: "limit",
    label: "Limit",
    render: (row: ProjectDashboardRow) => row.limit || 0,
    footer: (totals: ProjectListingExportTotals) => totals.limit || 0,
  },
  {
    key: "checkins_7_days",
    label: "Avrg 7 days",
    render: (row: ProjectDashboardRow) => row.checkins_7_days || 0,
    footer: (totals: ProjectListingExportTotals) =>
      totals.checkins_7_days || 0,
  },
  {
    key: "checkins_30_days",
    label: "Avrg 30 days",
    render: (row: ProjectDashboardRow) => row.checkins_30_days || 0,
    footer: (totals: ProjectListingExportTotals) =>
      totals.checkins_30_days || 0,
  },
  {
    key: "total_checkins",
    label: "Total Check in",
    render: (row: ProjectDashboardRow) => row.total_checkins || 0,
    footer: (totals: ProjectListingExportTotals) => totals.total_checkins || 0,
  },
  {
    key: "checking_hour",
    label: "Check in Hours",
    render: (row: ProjectDashboardRow) =>
      Number(row.checking_hour || 0).toFixed(2),
    footer: (totals: ProjectListingExportTotals) =>
      totals.checking_hour_formatted ||
      Number(totals.checking_hour || 0).toFixed(2),
  },
  {
    key: "shift_hour",
    label: "Shift Hours",
    render: (row: ProjectDashboardRow) =>
      Number(row.shift_hour || 0).toFixed(2),
    footer: (totals: ProjectListingExportTotals) =>
      totals.shift_hour_formatted || Number(totals.shift_hour || 0).toFixed(2),
  },
  {
    key: "risk_percent",
    label: "Risk",
    render: (row: ProjectDashboardRow) => row.risk_percent || "0%",
  },
  {
    key: "activity",
    label: "Activity",
    render: (row: ProjectDashboardRow) =>
      formatActivityDate(row.last_activity_date),
  },
  {
    key: "cases",
    label: "Case",
    render: (row: ProjectDashboardRow) => row.cases || 0,
    footer: (totals: ProjectListingExportTotals) => totals.cases || 0,
  },
  {
    key: "open",
    label: "Open",
    render: (row: ProjectDashboardRow) => row.open || 0,
    footer: (totals: ProjectListingExportTotals) => totals.open || 0,
  },
  {
    key: "close",
    label: "Close",
    render: (row: ProjectDashboardRow) => row.close || 0,
    footer: (totals: ProjectListingExportTotals) => totals.close || 0,
  },
  {
    key: "in_amount",
    label: `In (${currencySymbol})`,
    render: (row: ProjectDashboardRow) => row.in_amount_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.in_amount_formatted || "-",
  },
  {
    key: "out_amount",
    label: `Out (${currencySymbol})`,
    render: (row: ProjectDashboardRow) => row.out_amount_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.out_amount_formatted || "-",
  },
  {
    key: "total_amount",
    label: "Total",
    render: (row: ProjectDashboardRow) => row.total_amount_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.total_amount_formatted || "-",
  },
];

const NumberCell = ({ value }: { value: number | string }) => (
  <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
    {value ?? 0}
  </Typography>
);

const HeaderLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="subtitle2"
    sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}
  >
    {children}
  </Typography>
);

const StackedHeader = ({ top, bottom }: { top: string; bottom: string }) => (
  <Box>
    <Typography
      variant="subtitle2"
      sx={{ whiteSpace: "nowrap", lineHeight: 1.15 }}
    >
      {top}
    </Typography>
    <Typography
      variant="subtitle2"
      sx={{ whiteSpace: "nowrap", lineHeight: 1.15 }}
    >
      {bottom}
    </Typography>
  </Box>
);

const ProjectDashboard = () => {
  const router = useRouter();
  const [data, setData] = useState<ProjectDashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currency, setCurrency] = useState("£");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: "all" });
  const [tempFilters, setTempFilters] = useState({ status: "all" });
  const [columnSearch, setColumnSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(
    new Set(),
  );
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
  const [exportDownloading, setExportDownloading] = useState(false);
  const [exportPreviewRows, setExportPreviewRows] = useState<
    ProjectDashboardRow[]
  >([]);
  const [exportPreviewCurrency, setExportPreviewCurrency] = useState("£");
  const [exportPreviewTotals, setExportPreviewTotals] =
    useState<ProjectListingExportTotals | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(data.map((item) => item.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    id: number;
  };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_project_dashboard`,
      enabled: !!user?.id,
      alwaysVisibleColumns: ["select", "actions"],
    });

  const getExportPayload = () => {
    const selectedIds = Array.from(selectedRowIds);
    return {
      company_id: user.company_id,
      search: searchTerm,
      status: filters.status,
      ...(selectedIds.length > 0 ? { ids: selectedIds.join(",") } : {}),
    };
  };

  const openExportPreview = async () => {
    if (!user?.company_id) return;
    setExportPreviewOpen(true);
    setExportPreviewLoading(true);
    setExportPreviewRows([]);
    setExportPreviewTotals(null);
    try {
      const res = await api.get("project/export-listing", {
        params: getExportPayload(),
      });
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to load export preview");
        return;
      }
      const rows = Array.isArray(res.data.info) ? res.data.info : [];
      setExportPreviewRows(rows);
      if (res.data.currency) setExportPreviewCurrency(res.data.currency);
      if (res.data.totals) setExportPreviewTotals(res.data.totals);
    } catch (err) {
      console.error("Failed to load project listing export preview", err);
      toast.error("Failed to load export preview");
    } finally {
      setExportPreviewLoading(false);
    }
  };

  const downloadExportListing = async () => {
    if (!user?.company_id) return;
    setExportDownloading(true);
    try {
      const res = await api.post("project/export-listing", getExportPayload(), {
        responseType: "blob",
      });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project_listing.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setExportPreviewOpen(false);
    } catch (err) {
      console.error("Failed to export project listing", err);
      toast.error("Failed to export project listing");
    } finally {
      setExportDownloading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user?.company_id) return;
    try {
      setLoading(true);
      let url = `project/dashboard?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status && filters.status !== "all") {
        url += `&status=${filters.status}`;
      }
      const res = await api.get(url);
      if (res.data) {
        const responseData = Array.isArray(res.data.info)
          ? res.data.info
          : res.data.info?.data || [];
        setData(responseData);
        if (res.data.currency) setCurrency(res.data.currency);

        const pagMeta =
          res.data.data?.totalPages !== undefined ||
          res.data.data?.totalItems !== undefined
            ? res.data.data
            : res.data.info && res.data.info.totalPages !== undefined
              ? res.data.info
              : res.data.data || {};

        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else if (pagMeta.total !== undefined) {
          setTotalRows(pagMeta.total);
        } else {
          setTotalRows(responseData.length);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        } else {
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch project dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={data.length > 0 && selectedRowIds.size === data.length}
              indeterminate={
                selectedRowIds.size > 0 && selectedRowIds.size < data.length
              }
              onClick={(e: any) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelectAllRows(e.target.checked);
              }}
            />
          </Stack>
        ),
        cell: ({ row }: any) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);
          const isHovered = hoveredRow === item.id;
          const showCheckbox = isChecked || isHovered;

          return (
            <Stack
              direction="row"
              alignItems="center"
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              sx={{ pl: 1 }}
            >
              <CustomCheckbox
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const newSelected = new Set(selectedRowIds);
                  if (isChecked) {
                    newSelected.delete(item.id);
                  } else {
                    newSelected.add(item.id);
                  }
                  setSelectedRowIds(newSelected);
                }}
                sx={{
                  opacity: showCheckbox ? 1 : 0,
                  pointerEvents: showCheckbox ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              />
            </Stack>
          );
        },
      },
      columnHelper.accessor("name", {
        header: () => <HeaderLabel>Name</HeaderLabel>,
        meta: { label: "Name" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            fontWeight={500}
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("uuid", {
        header: () => <HeaderLabel>ID</HeaderLabel>,
        meta: { label: "ID" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("working_teams", {
        header: () => <HeaderLabel>Teams</HeaderLabel>,
        meta: { label: "Teams" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("total_working_users", {
        header: () => <HeaderLabel>On site</HeaderLabel>,
        meta: { label: "On site" },
        cell: ({ row }) => (
          <NumberCell
            value={`${row.original.total_working_users || 0}`}
          />
        ),
      }),
      columnHelper.accessor("limit", {
        header: () => <HeaderLabel>Limit</HeaderLabel>,
        meta: { label: "Limit" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checkins_7_days", {
        header: () => <StackedHeader top="Avrg" bottom="7 days" />,
        meta: { label: "Avrg 7 days" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checkins_30_days", {
        header: () => <StackedHeader top="Avrg" bottom="30 days" />,
        meta: { label: "Avrg 30 days" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("total_checkins", {
        header: () => <HeaderLabel>Total Check in</HeaderLabel>,
        meta: { label: "Total Check in" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checking_hour", {
        header: () => <HeaderLabel>Check in Hours</HeaderLabel>,
        meta: { label: "Check in Hours" },
        cell: ({ getValue }) => (
          <NumberCell value={Number(getValue() || 0).toFixed(2)} />
        ),
      }),
      columnHelper.accessor("shift_hour", {
        header: () => <HeaderLabel>Shift Hours</HeaderLabel>,
        meta: { label: "Shift Hours" },
        cell: ({ getValue }) => (
          <NumberCell value={Number(getValue() || 0).toFixed(2)} />
        ),
      }),
      columnHelper.accessor("risk_percent", {
        header: () => <HeaderLabel>Risk</HeaderLabel>,
        meta: { label: "Risk" },
        cell: ({ row }) => (
          <Typography
            className="f-14"
            sx={{ px: 1.5, whiteSpace: "nowrap", fontWeight: 600 }}
            color={
              row.original.risk < 0
                ? "error.main"
                : row.original.risk > 0
                  ? "success.main"
                  : "textPrimary"
            }
          >
            {row.original.risk_percent}
          </Typography>
        ),
      }),
      columnHelper.accessor("last_activity_date", {
        id: "activity",
        header: () => <HeaderLabel>Activity</HeaderLabel>,
        meta: { label: "Activity" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {formatActivityDate(getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("cases", {
        header: () => <HeaderLabel>Case</HeaderLabel>,
        meta: { label: "Case" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("open", {
        header: () => <HeaderLabel>Open</HeaderLabel>,
        meta: { label: "Open" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("close", {
        header: () => <HeaderLabel>Close</HeaderLabel>,
        meta: { label: "Close" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("in_amount_formatted", {
        id: "in_amount",
        header: () => <HeaderLabel>{`In (${currency})`}</HeaderLabel>,
        meta: { label: `In ${currency}` },
        cell: ({ row }) => (
          <Typography className="f-14" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
            {row.original.in_amount_formatted}
          </Typography>
        ),
      }),
      columnHelper.accessor("out_amount_formatted", {
        id: "out_amount",
        header: () => <HeaderLabel>{`Out (${currency})`}</HeaderLabel>,
        meta: { label: `Out ${currency}` },
        cell: ({ row }) => (
          <Typography className="f-14" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
            {row.original.out_amount_formatted}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: { label: "Actions" },
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          const isActive = Number(item.status) === 1;
          const isSaving = switchLoadingIds.has(item.id);

          return (
            <Stack
              direction="row"
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
              sx={{ px: 1 }}
            >
              <IOSSwitch
                checked={isActive}
                disabled={isSaving}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setSwitchLoadingIds((prev) => {
                    const next = new Set(prev);
                    next.add(item.id);
                    return next;
                  });
                  try {
                    const result = await api.post("project/change-status", {
                      id: item.id,
                      company_id: user.company_id,
                      status: checked,
                    });
                    if (result.data?.IsSuccess) {
                      setData((prev) => {
                        const updated = prev.map((rowItem) =>
                          rowItem.id === item.id
                            ? {
                                ...rowItem,
                                status: checked ? 1 : 0,
                                status_text: checked ? "Active" : "Closed",
                              }
                            : rowItem,
                        );
                        if (
                          (filters.status === "1" && !checked) ||
                          (filters.status === "0" && checked)
                        ) {
                          return updated.filter(
                            (rowItem) => rowItem.id !== item.id,
                          );
                        }
                        return updated;
                      });
                      toast.success(
                        result.data.message ||
                          (checked
                            ? "Project marked as active!"
                            : "Project marked as closed!"),
                      );
                    } else {
                      toast.error(
                        result.data?.message || "Failed to change status",
                      );
                    }
                  } catch (error) {
                    console.error(error);
                    toast.error("Failed to change status");
                  } finally {
                    setSwitchLoadingIds((prev) => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                  }
                }}
              />
            </Stack>
          );
        },
      }),
    ],
    [
      currency,
      data,
      hoveredRow,
      selectedRowIds,
      switchLoadingIds,
      user?.company_id,
      filters.status,
    ],
  );

  const {
    table,
    pagination,
    setPagination,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchProjects,
    debounceDependencies: [searchTerm, user?.company_id, filters.status],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, filters.status]);

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));
  const exportPreviewColumns = useMemo(
    () => getExportPreviewColumns(exportPreviewCurrency),
    [exportPreviewCurrency],
  );

  return (
    <PermissionGuard permission="Project">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Box display="flex" alignItems="center">
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", sm: 300 } }}
            />
            <Button
              variant="contained"
              onClick={() => {
                setTempFilters(filters);
                setFilterOpen(true);
              }}
              sx={{ ml: 1, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
          </Box>

          <Box display="flex" alignItems="center">
            <Button
              variant="contained"
              onClick={openExportPreview}
              sx={{ mr: 1 }}
            >
              <IconFileExport width={18} /> Export
            </Button>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  width: 280,
                  mt: 1,
                  p: 1,
                  borderRadius: 2,
                  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
                  border: "1px solid #e5e7eb",
                  maxHeight: "min(420px, calc(100vh - 140px))",
                  overflow: "hidden",
                },
              }}
            >
              <TextField
                size="small"
                placeholder="Search columns..."
                fullWidth
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box
                sx={{
                  maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
                  overflowY: "auto",
                }}
              >
                <FormGroup sx={{ gap: 0.25 }}>
                  {(() => {
                    const columnOptions = table
                      .getAllLeafColumns()
                      .filter((col: any) => {
                        if (col.id === "select" || col.id === "actions")
                          return false;
                        const label = String(
                          col.columnDef.meta?.label ||
                            (typeof col.columnDef.header === "string"
                              ? col.columnDef.header
                              : col.id),
                        );
                        return label
                          .toLowerCase()
                          .includes(columnSearch.toLowerCase());
                      });
                    const allSelected =
                      columnOptions.length > 0 &&
                      columnOptions.every((col: any) => col.getIsVisible());
                    const someSelected = columnOptions.some((col: any) =>
                      col.getIsVisible(),
                    );

                    return (
                      <>
                        <FormControlLabel
                          control={
                            <CustomCheckbox
                              size="small"
                              checked={allSelected}
                              indeterminate={!allSelected && someSelected}
                              disabled={columnOptions.length === 0}
                              onChange={(e) => {
                                columnOptions.forEach((col: any) =>
                                  col.toggleVisibility(e.target.checked),
                                );
                              }}
                            />
                          }
                          label="Select All"
                          sx={{
                            m: 0,
                            px: 0.75,
                            py: 0.375,
                            borderBottom: "1px solid #eef2f7",
                            "& .MuiFormControlLabel-label": {
                              fontSize: "14px",
                              fontWeight: 600,
                            },
                          }}
                        />
                        {columnOptions.map((col: any) => (
                          <FormControlLabel
                            key={col.id}
                            control={
                              <CustomCheckbox
                                size="small"
                                checked={col.getIsVisible()}
                                onChange={col.getToggleVisibilityHandler()}
                              />
                            }
                            label={
                              col.columnDef.meta?.label ||
                              (typeof col.columnDef.header === "string"
                                ? col.columnDef.header
                                : col.id)
                            }
                            sx={{
                              m: 0,
                              px: 0.75,
                              py: 0.375,
                              "& .MuiFormControlLabel-label": {
                                fontSize: "14px",
                              },
                            }}
                          />
                        ))}
                      </>
                    );
                  })()}
                </FormGroup>
              </Box>
            </Popover>
          </Box>
        </Stack>

        <Dialog
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ m: 0, position: "relative" }}>
            Filters
            <IconButton
              aria-label="close"
              onClick={() => setFilterOpen(false)}
              sx={{ position: "absolute", right: 12, top: 8 }}
            >
              <IconX />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                select
                label="Status"
                value={tempFilters.status}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, status: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="1">Active</MenuItem>
                <MenuItem value="0">Closed</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setTempFilters({ status: "all" });
                setFilters({ status: "all" });
                setFilterOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setFilters(tempFilters);
                setFilterOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={exportPreviewOpen}
          onClose={() =>
            exportDownloading ? undefined : setExportPreviewOpen(false)
          }
          fullWidth
          maxWidth="xl"
        >
          <DialogTitle sx={{ m: 0, position: "relative" }}>
            Export Preview
            <IconButton
              aria-label="close"
              onClick={() => setExportPreviewOpen(false)}
              disabled={exportDownloading}
              sx={{ position: "absolute", right: 12, top: 8 }}
            >
              <IconX />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {exportPreviewLoading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 240,
                }}
              >
                <CircularProgress />
              </Box>
            ) : exportPreviewRows.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 240,
                }}
              >
                <Typography>No projects to export.</Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: "60vh" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {exportPreviewColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          sx={{
                            whiteSpace: "nowrap",
                            backgroundColor: "#D6E6F7",
                            color: "#1E4E8C",
                          }}
                        >
                          <Typography variant="subtitle2">
                            {column.label}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exportPreviewRows.map((row) => (
                      <TableRow key={row.id}>
                        {exportPreviewColumns.map((column) => (
                          <TableCell
                            key={`${row.id}-${column.key}`}
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {column.render(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {exportPreviewTotals && (
                      <>
                        <TableRow
                          sx={{
                            backgroundColor: "#E8F1FB",
                            "& td": {
                              fontWeight: 700,
                              color: "#1E4E8C",
                              borderTop: "1px solid #B7D0EA",
                            },
                          }}
                        >
                          {exportPreviewColumns.map((column) => (
                            <TableCell
                              key={`category-total-${column.key}`}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {column.key === "name"
                                ? "Category Totals"
                                : column.footer
                                  ? column.footer(exportPreviewTotals)
                                  : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow
                          sx={{
                            "& td": {
                              fontWeight: 700,
                            },
                          }}
                        >
                          {exportPreviewColumns.map((column) => (
                            <TableCell
                              key={`grand-total-${column.key}`}
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {column.key === "name"
                                ? "Grand Total"
                                : column.key === "total_amount"
                                  ? exportPreviewTotals.total_amount_formatted
                                  : ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => setExportPreviewOpen(false)}
              disabled={exportDownloading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={downloadExportListing}
              disabled={
                exportPreviewLoading ||
                exportDownloading ||
                exportPreviewRows.length === 0
              }
              startIcon={
                exportDownloading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <IconFileExport width={18} />
                )
              }
            >
              Download
            </Button>
          </DialogActions>
        </Dialog>

        <TableContainer
          ref={tableContainerRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = header.column.getIsSorted() === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        align="center"
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          width: header.column.id === "select" ? 30 : "auto",

                          ...(header.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 3,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          p={0}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "flex-start",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          <Typography variant="subtitle2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                          {isSortable && (
                            <Box
                              component="span"
                              className="hoverIcon"
                              ml={0.5}
                              sx={{
                                transition: "opacity 0.2s",
                                opacity: isActive ? 1 : 0,
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {isActive ? (isAsc ? "↑" : "↓") : "↑"}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {loading ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                />
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(50vh - 100px)",
                      }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No data"
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() =>
                      router.push(`/apps/project/list/${row.original.id}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          padding: "10px",
                          ...(cell.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 1,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePaginationFooter
          table={table}
          totalRows={totalRows}
          selectedCount={selectedRowIds.size}
        />
      </Box>
    </PermissionGuard>
  );
};

export default ProjectDashboard;
