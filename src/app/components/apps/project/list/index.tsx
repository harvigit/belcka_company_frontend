"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconBookmark,
  IconDotsVertical,
  IconEye,
  IconFileExport,
  IconFilter,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Image from "next/image";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  readListingTableState,
  removeListingTableState,
  writeListingTableState,
} from "@/utils/listingTableStateStorage";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useRouter } from "next/navigation";
import Setting from "@/app/components/apps/projects/setting";
import { IconSettings } from "@tabler/icons-react";
import { IconNotes } from "@tabler/icons-react";
import CreateProject from "../../projects/create";
import EditProject from "../../projects/edit";
import ArchiveProject from "../../addresses/list/archive-project-list";
import { IconEdit } from "@tabler/icons-react";
import { Grid } from "@mui/system";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission } from "@/lib/permissions";
import AddressList from "@/app/components/apps/addresses/list";
import CasesList from "@/app/components/apps/cases/list";
import CheckinsList from "@/app/components/apps/checkins";

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
  material?: number;
  labour?: number;
  material_issue?: number;
  expense?: number;
  collect?: number;
  material_formatted?: string;
  labour_formatted?: string;
  material_issue_formatted?: string;
  expense_formatted?: string;
  collect_formatted?: string;
};

type ProjectListingExportTotals = {
  material: number;
  labour: number;
  material_issue: number;
  expense: number;
  collect: number;
  total_amount: number;
  material_formatted: string;
  labour_formatted: string;
  material_issue_formatted: string;
  expense_formatted: string;
  collect_formatted: string;
  total_amount_formatted: string;
};

const columnHelper = createColumnHelper<ProjectDashboardRow>();

type ProjectDashboardFilters = {
  status: string;
};

type ProjectDashboardCookieState = {
  searchTerm?: string;
  filters?: Partial<ProjectDashboardFilters>;
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
  };
};

const DEFAULT_PROJECT_FILTERS: ProjectDashboardFilters = { status: "all" };

type ProjectModuleKey = "addresses" | "cases" | "checkins";

const PROJECT_MODULE_BUTTONS: {
  key: ProjectModuleKey;
  label: string;
  permission: string;
}[] = [
  { key: "addresses", label: "Addresses", permission: "Addresses" },
  { key: "cases", label: "Cases", permission: "Cases" },
  { key: "checkins", label: "Check ins", permission: "Check ins" },
];

const getProjectDashboardStateKey = (
  userId?: number | string,
  companyId?: number | string | null,
) =>
  userId && companyId
    ? `project_dashboard_table_state_${userId}_${companyId}`
    : "";

const normalizeProjectStatus = (value?: string | number | null) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "All"
  ) {
    return "all";
  }
  return String(value);
};

const normalizeProjectFilters = (
  filters?: Partial<ProjectDashboardFilters> | Record<string, string | number>,
): ProjectDashboardFilters => ({
  status: normalizeProjectStatus(filters?.status),
});

const readProjectDashboardCookie = (
  key: string,
): ProjectDashboardCookieState => {
  if (!key) return {};

  const saved = readListingTableState(key);
  if (!saved) return {};

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error(
      "Failed to parse project dashboard table state cookie",
      error,
    );
    removeListingTableState(key);
    return {};
  }
};

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

const getExportPreviewColumns = () => [
  {
    key: "name",
    label: "Project",
    render: (row: ProjectDashboardRow) => row.name || "-",
    footer: () => "Category Totals",
  },
  {
    key: "material",
    label: "Material",
    render: (row: ProjectDashboardRow) => row.material_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.material_formatted || "-",
  },
  {
    key: "labour",
    label: "Labour",
    render: (row: ProjectDashboardRow) => row.labour_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.labour_formatted || "-",
  },
  {
    key: "material_issue",
    label: "Material Issue",
    render: (row: ProjectDashboardRow) => row.material_issue_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.material_issue_formatted || "-",
  },
  {
    key: "expense",
    label: "Expense",
    render: (row: ProjectDashboardRow) => row.expense_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.expense_formatted || "-",
  },
  {
    key: "collect",
    label: "Collect",
    render: (row: ProjectDashboardRow) => row.collect_formatted || "-",
    footer: (totals: ProjectListingExportTotals) =>
      totals.collect_formatted || "-",
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
    component="span"
    variant="subtitle2"
    sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}
  >
    {children}
  </Typography>
);

const StackedHeader = ({ top, bottom }: { top: string; bottom: string }) => (
  <Box>
    <Typography
      component="span"
      variant="subtitle2"
      display="block"
      sx={{ whiteSpace: "nowrap", lineHeight: 1.15 }}
    >
      {top}
    </Typography>
    <Typography
      component="span"
      variant="subtitle2"
      display="block"
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
  const [filters, setFilters] = useState<ProjectDashboardFilters>(
    DEFAULT_PROJECT_FILTERS,
  );
  const [tempFilters, setTempFilters] = useState(filters);
  const restoredTableStateKeyRef = useRef("");
  const skipNextDependencyPageResetRef = useRef(false);
  const [isTableStateReady, setIsTableStateReady] = useState(false);
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
  const [exportPreviewTotals, setExportPreviewTotals] =
    useState<ProjectListingExportTotals | null>(null);
  const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
  const [exportEndDate, setExportEndDate] = useState<Date | null>(null);
  const exportPreviewRequestId = useRef(0);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  const [settingOpen, setSettingOpen] = useState(false);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [moduleDrawer, setModuleDrawer] = useState<ProjectModuleKey | null>(
    null,
  );

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    id: number;
  } & { user_role_id: number };
  const { permissions } = usePermissions();
  const isAdmin = Number(user?.user_role_id) === 1;
  const moduleButtons = PROJECT_MODULE_BUTTONS.filter(
    (item) => isAdmin || hasPermission(permissions, item.permission),
  );
  const activeModule = PROJECT_MODULE_BUTTONS.find(
    (item) => item.key === moduleDrawer,
  );

  const initialFormData = {
    name: "",
    address: "",
    budget: "",
    description: "",
    code: 0,
    // shift_ids: "",
    team_ids: "",
    user_ids: "",
    company_id: user?.company_id || 0,
    workzone_ids: "",
    project_limit: "",
    allow_work: true,
  };

  const [formData, setFormData] = useState<any>(initialFormData);
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl2);
  const [productDrawer, setProductDrawer] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isFetchingFavorites, setIsFetchingFavorites] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const productLimit = 50;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl2(null);
  };

  const handleEdit = async (project: any) => {
    if (!user?.company_id || !project?.id) return;
    try {
      const res = await api.get(
        `project/get?company_id=${user.company_id}&project_id=${project.id}`,
      );
      const projectRow = Array.isArray(res.data?.info)
        ? res.data.info[0]
        : res.data?.info;
      setSelectedProject(projectRow || project);
      setEditDrawerOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project");
    }
  };

  const handleCreate = () => {
    handleClose();
    setFormData({ ...initialFormData, company_id: user?.company_id || 0 });
    setDrawerOpen(true);
  };

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

  const projectDashboardStateKey = useMemo(
    () => getProjectDashboardStateKey(user?.id, user?.company_id),
    [user?.id, user?.company_id],
  );
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_project_dashboard`,
      enabled: !!user?.id,
      alwaysVisibleColumns: ["select", "actions"],
    });

  const getExportPayload = (range?: {
    start: Date | null;
    end: Date | null;
  }) => {
    const selectedIds = Array.from(selectedRowIds);
    const start = range !== undefined ? range.start : exportStartDate;
    const end = range !== undefined ? range.end : exportEndDate;
    return {
      company_id: user.company_id,
      search: searchTerm,
      status: filters.status,
      ...(selectedIds.length > 0 ? { ids: selectedIds.join(",") } : {}),
      ...(start && end
        ? {
            start_date: dayjs(start).format("DD/MM/YYYY"),
            end_date: dayjs(end).format("DD/MM/YYYY"),
          }
        : {}),
    };
  };

  const loadExportPreview = async (range?: {
    start: Date | null;
    end: Date | null;
  }) => {
    if (!user?.company_id) return;
    const requestId = ++exportPreviewRequestId.current;
    setExportPreviewLoading(true);
    try {
      const res = await api.get("project/export-listing", {
        params: getExportPayload(range),
      });
      if (requestId !== exportPreviewRequestId.current) return;
      if (!res.data?.IsSuccess) {
        toast.error(res.data?.message || "Failed to load export preview");
        return;
      }
      const rows = Array.isArray(res.data.info) ? res.data.info : [];
      setExportPreviewRows(rows);
      if (res.data.totals) setExportPreviewTotals(res.data.totals);
    } catch (err) {
      if (requestId !== exportPreviewRequestId.current) return;
      console.error("Failed to load project listing export preview", err);
      toast.error("Failed to load export preview");
    } finally {
      if (requestId === exportPreviewRequestId.current) {
        setExportPreviewLoading(false);
      }
    }
  };

  const closeExportPreview = () => {
    if (exportDownloading) return;
    setExportPreviewOpen(false);
    setExportStartDate(null);
    setExportEndDate(null);
  };

  const openExportPreview = async () => {
    if (!user?.company_id) return;
    setExportStartDate(null);
    setExportEndDate(null);
    setExportPreviewOpen(true);
    setExportPreviewRows([]);
    setExportPreviewTotals(null);
    await loadExportPreview({ start: null, end: null });
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
      setExportStartDate(null);
      setExportEndDate(null);
    } catch (err) {
      console.error("Failed to export project listing", err);
      toast.error("Failed to export project listing");
    } finally {
      setExportDownloading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user?.company_id || !isTableStateReady) return;
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

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post("project/create", formData);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Project created successfully");
        setDrawerOpen(false);
        fetchProjects();
      } else {
        toast.error(res.data.message || "Failed to create project");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put("project/update", formData);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Project updated successfully");
        setEditDrawerOpen(false);
        fetchProjects();
      } else {
        toast.error(res.data.message || "Failed to update project");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user?.company_id}&is_web=true`,
      );
      if (res.data) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  const fetchFavoriteProducts = async () => {
    if (!activeProjectId) return;
    setIsFetchingFavorites(true);
    try {
      const response = await api.get(
        `project/get-favorite?company_id=${user?.company_id}&project_id=${activeProjectId}`,
      );
      if (response.data?.IsSuccess) {
        const savedIds =
          response.data?.info[0]?.products?.map(
            (item: any) => item.product_id,
          ) || [];
        setSelectedProducts(savedIds);
      }
    } catch (error) {
      console.error("Failed to fetch favorite products:", error);
    } finally {
      setIsFetchingFavorites(false);
    }
  };

  const handleSaveProducts = async () => {
    try {
      setIsSaving(true);
      const productIdsString = selectedProducts.join(",");
      const response = await api.post("project/favorite-products", {
        id: activeProjectId,
        product_ids: productIdsString,
      });
      if (response.data.IsSuccess) {
        toast.success(response.data.message || "Favorites saved.");
        setProductDrawer(false);
      } else {
        toast.error(response.data.message || "Failed to save favorites.");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save favorites.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseProductDrawer = () => {
    setSearchProduct("");
    setSelectAll(false);
    setProductPage(1);
    setProductDrawer(false);
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchResources();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (productDrawer && activeProjectId) {
      fetchFavoriteProducts();
    }
  }, [productDrawer, activeProjectId]);

  const handleProductToggle = (id: any) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredData = useMemo(() => {
    let result = products.filter((item) => {
      const search = searchProduct.toLowerCase();
      let matchesSearch = true;
      if (search) {
        matchesSearch =
          item.short_name?.toLowerCase().includes(search) ||
          item.supplier_code?.toLowerCase().includes(search) ||
          item.supplier_name?.toLowerCase().includes(search) ||
          item.uuid?.toLowerCase().includes(search) ||
          item.name?.toLowerCase().includes(search);
      }
      return matchesSearch;
    });

    result.sort((a, b) => {
      const aSelected = selectedProducts.includes(a.id);
      const bSelected = selectedProducts.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return result;
  }, [products, searchProduct, selectedProducts]);

  const paginatedProduct =
    filteredData?.slice(0, productPage * productLimit) || [];

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
        header: () => <HeaderLabel>Code</HeaderLabel>,
        meta: { label: "Code" },
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
          <NumberCell value={`${row.original.total_working_users || 0}`} />
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
              <Tooltip title="Edit">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item);
                  }}
                  color="primary"
                >
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Favorite Products">
                <IconButton
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveProjectId(item.id);
                    setProductDrawer(true);
                  }}
                >
                  <IconBookmark size={18} />
                </IconButton>
              </Tooltip>
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
    debounceDependencies: [
      searchTerm,
      user?.company_id,
      filters.status,
      isTableStateReady,
    ],
    state: { columnVisibility },
    onColumnVisibilityChange,
    shouldResetPageOnDebounce: () => {
      return !skipNextDependencyPageResetRef.current;
    },
  });

  useEffect(() => {
    if (!projectDashboardStateKey) {
      setIsTableStateReady(false);
      restoredTableStateKeyRef.current = "";
      return;
    }
    if (restoredTableStateKeyRef.current === projectDashboardStateKey) return;

    const savedState = readProjectDashboardCookie(projectDashboardStateKey);
    const savedPagination = savedState.pagination;
    const hasSavedState =
      savedState.searchTerm !== undefined ||
      savedState.filters !== undefined ||
      savedState.pagination !== undefined;

    skipNextDependencyPageResetRef.current = hasSavedState;
    restoredTableStateKeyRef.current = projectDashboardStateKey;

    setSearchTerm(savedState.searchTerm ?? "");
    const restoredFilters = normalizeProjectFilters(savedState.filters);
    setFilters(restoredFilters);
    setTempFilters(restoredFilters);

    if (
      typeof savedPagination?.pageIndex === "number" &&
      savedPagination.pageIndex >= 0 &&
      typeof savedPagination?.pageSize === "number" &&
      savedPagination.pageSize > 0
    ) {
      setPagination({
        pageIndex: savedPagination.pageIndex,
        pageSize: savedPagination.pageSize,
      });
    }

    setIsTableStateReady(true);
  }, [projectDashboardStateKey, setPagination]);

  useEffect(() => {
    if (!projectDashboardStateKey || !isTableStateReady) return;
    if (restoredTableStateKeyRef.current !== projectDashboardStateKey) return;

    writeListingTableState(
      projectDashboardStateKey,
      JSON.stringify({
        searchTerm,
        filters,
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    );
  }, [
    projectDashboardStateKey,
    isTableStateReady,
    searchTerm,
    filters,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
    if (skipNextDependencyPageResetRef.current) return;
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, [searchTerm, filters.status, setPagination]);

  const hasActiveFilters = Boolean(
    filters.status && filters.status !== "all" && filters.status !== "All",
  );

  const handleClearAppliedFilters = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    skipNextDependencyPageResetRef.current = false;
    setTempFilters(DEFAULT_PROJECT_FILTERS);
    setFilters(DEFAULT_PROJECT_FILTERS);
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  };

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));
  const exportPreviewColumns = useMemo(() => getExportPreviewColumns(), []);

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
              onChange={(e) => {
                skipNextDependencyPageResetRef.current = false;
                setSearchTerm(e.target.value);
              }}
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
            {hasActiveFilters && (
              <Button
                color="error"
                variant="outlined"
                onClick={handleClearAppliedFilters}
                aria-label="Clear filters"
                sx={{
                  ml: 1,
                  minHeight: 34,
                  height: 34,
                  minWidth: 64,
                  px: 1.5,
                }}
              >
                <IconX size={18} />
              </Button>
            )}

            {moduleButtons.map((item) => (
              <Button
                key={item.key}
                variant="outlined"
                onClick={() => setModuleDrawer(item.key)}
                sx={{
                  ml: 1,
                  minHeight: 34,
                  height: 34,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box display="flex" alignItems="center">
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                onClick={() => setOpenDialog(true)}
              >
                Archive
              </Button>
            )}
            <Button
              variant="contained"
              onClick={openExportPreview}
              sx={{ ml: 1 }}
            >
              <IconFileExport width={18} /> Export
            </Button>

            {user.user_role_id === 1 && (
              <Tooltip title="Settings">
                <IconButton
                  color="primary"
                  sx={{ ml: 1 }}
                  onClick={() => setSettingOpen(true)}
                >
                  <IconSettings />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>

            <IconButton onClick={handleClick} size="small">
              <IconDotsVertical width={20} />
            </IconButton>
            <Menu anchorEl={anchorEl2} open={openMenu} onClose={handleClose}>
              <MenuItem onClick={handleCreate}>
                <ListItemIcon>
                  <IconPlus width={18} />
                </ListItemIcon>
                Add Project
              </MenuItem>

              <MenuItem
                onClick={() => {
                  handleClose();
                  setArchiveListOpen(true);
                }}
              >
                <ListItemIcon>
                  <IconNotes width={18} />
                </ListItemIcon>
                Archived project list
              </MenuItem>
            </Menu>

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
                              (typeof col.columnDef.header === "string" &&
                              col.columnDef.header.trim() !== ""
                                ? col.columnDef.header
                                : col.id
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str: string) =>
                                      str.toUpperCase(),
                                    )
                                    .trim())
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

        <ArchiveProject
          open={archiveListOpen}
          companyId={Number(user?.company_id)}
          onClose={() => setArchiveListOpen(false)}
          onWorkUpdated={fetchProjects}
        />

        <Setting
          settingOpen={settingOpen}
          onClose={() => setSettingOpen(false)}
        />

        <Drawer
          anchor="bottom"
          open={Boolean(moduleDrawer)}
          onClose={() => setModuleDrawer(null)}
          PaperProps={{
            sx: {
              height: "95vh",
              boxShadow: "none",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <Box
            display={"flex"}
            alignContent={"space-between"}
            gap={1}
            px={2}
            py={1.25}
          >
            <Box  width={"100%"} display={"flex"} alignItems={"center"}>
              <IconButton
                onClick={() => setModuleDrawer(null)}
                size="small"
                aria-label="Back"
              >
                <IconArrowLeft />
              </IconButton>
              <Typography fontWeight={700} fontSize={16} noWrap>
                {activeModule?.label || ""}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setModuleDrawer(null)}
              size="small"
              aria-label="Back"
            >
              <IconX />
            </IconButton>
          </Box>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {moduleDrawer === "addresses" ? (
              <AddressList projectId={null} embedded />
            ) : null}
            {moduleDrawer === "cases" ? <CasesList embedded /> : null}
            {moduleDrawer === "checkins" ? <CheckinsList embedded /> : null}
          </Box>
        </Drawer>

        {drawerOpen && (
          <CreateProject
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleProjectSubmit}
            isSaving={isSaving}
          />
        )}

        {editDrawerOpen && (
          <EditProject
            open={editDrawerOpen}
            onClose={() => setEditDrawerOpen(false)}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleEditSubmit}
            isSaving={isSaving}
            project={selectedProject}
          />
        )}

        {/* Dialogs and Drawers */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to archive {selectedRowIds.size} project(s)?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  let allSuccess = true;
                  for (const id of Array.from(selectedRowIds)) {
                    const res = await api.post("project/archive", { id });
                    if (
                      !res.data.IsSuccess &&
                      !res.data.isSuccess &&
                      !res.data.success &&
                      !(res.status >= 200 && res.status < 300)
                    ) {
                      allSuccess = false;
                    }
                  }
                  if (allSuccess) {
                    toast.success("Projects archived successfully.");
                  } else {
                    toast.error("Some projects failed to archive.");
                  }
                  fetchProjects();
                  setSelectedRowIds(new Set());
                } catch (error) {
                  console.error(error);
                  toast.error("Error archiving projects.");
                }
                setOpenDialog(false);
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

        <Drawer
          anchor="right"
          open={productDrawer}
          onClose={handleCloseProductDrawer}
          PaperProps={{
            sx: {
              width: 550,
              maxWidth: "100%",
              "& .MuiDrawer-paper": {
                width: 550,
                padding: 2,
                backgroundColor: "#f9f9f9",
                display: "flex",
                flexDirection: "column",
              },
            },
          }}
        >
          <Box
            display="flex"
            alignContent="center"
            alignItems="center"
            flexWrap="wrap"
            p={2}
            pb={0}
          >
            <Box display="flex" alignContent="center" alignItems="center">
              <IconButton onClick={handleCloseProductDrawer}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Favorite products{" "}
                {selectedProducts.length > 0
                  ? `(${selectedProducts.length})`
                  : ""}
              </Typography>
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleCloseProductDrawer}
              size="small"
              sx={{
                position: "absolute",
                right: 0,
                top: 8,
                color: (theme) => theme.palette.grey[900],
                backgroundColor: "transparent",
                zIndex: 10,
                width: 50,
                height: 50,
              }}
            >
              <IconX size={18} />
            </IconButton>
          </Box>

          <Grid display="flex" alignItems="center" mr={1}>
            <TextField
              id="search"
              type="text"
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchProduct}
              fullWidth
              sx={{ width: "90%", ml: 2 }}
              onChange={(e) => setSearchProduct(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size="16" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {products.length > 0 && (
              <FormControlLabel
                control={
                  <CustomCheckbox
                    checked={
                      filteredData.length > 0 &&
                      filteredData.every((p) => selectedProducts.includes(p.id))
                    }
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setSelectAll(isChecked);
                      if (isChecked) {
                        const newSelected = [...selectedProducts];
                        filteredData.forEach((p) => {
                          if (!newSelected.includes(p.id))
                            newSelected.push(p.id);
                        });
                        setSelectedProducts(newSelected);
                      } else {
                        const visibleIds = filteredData.map((p) => p.id);
                        setSelectedProducts(
                          selectedProducts.filter(
                            (id) => !visibleIds.includes(id),
                          ),
                        );
                      }
                    }}
                  />
                }
                label="Select All"
                sx={{ width: "30%", m: 0 }}
              />
            )}
          </Grid>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Grid container spacing={2} display="block" mt={1}>
              {isFetchingFavorites ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  my={5}
                >
                  <CircularProgress />
                </Box>
              ) : filteredData.length > 0 ? (
                <Box>
                  {paginatedProduct.map((product) => (
                    <Box
                      key={product.id}
                      mt={1}
                      p={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        border: "1px solid #e7e3e3ff",
                        borderRadius: "10px",
                        background: "#fff",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <CustomCheckbox
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleProductToggle(product.id)}
                        />
                        <Box
                          sx={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 2,
                            p: 1,
                            textAlign: "center",
                          }}
                        >
                          <Image
                            src={
                              product.image_url ||
                              "/images/products/product.svg"
                            }
                            alt="product"
                            width={50}
                            height={50}
                            style={{ objectFit: "contain" }}
                          />
                        </Box>
                        <Stack mt={2} spacing={1}>
                          <Typography
                            variant="body2"
                            sx={{
                              minWidth: "150px",
                              width: "100%",
                              maxWidth: "500px",
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.25,

                              wordBreak: "break-word",
                            }}
                          >
                            {product.short_name ?? product.name}{" "}
                            {product.uuid && (
                              <Chip
                                label={product.uuid}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                            <br />
                            Supplier Code: {product.supplier_code}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  ))}
                  {paginatedProduct.length < filteredData.length && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <Button
                        variant="outlined"
                        onClick={() => setProductPage((prev) => prev + 1)}
                      >
                        See More
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography mt={2} textAlign="center">
                  No products found
                </Typography>
              )}
            </Grid>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              gap: 2,
              m: 2,
              pl: 2,
            }}
          >
            <Button
              color="primary"
              onClick={handleSaveProducts}
              variant="contained"
              size="large"
              disabled={isSaving}
              sx={{ borderRadius: 3 }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              color="inherit"
              onClick={handleCloseProductDrawer}
              variant="contained"
              size="large"
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                color: "GrayText",
              }}
            >
              Cancel
            </Button>
          </Box>
        </Drawer>

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
                value={normalizeProjectStatus(tempFilters.status)}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    status: normalizeProjectStatus(e.target.value),
                  })
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
                handleClearAppliedFilters();
                setFilterOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                skipNextDependencyPageResetRef.current = false;
                setFilters(normalizeProjectFilters(tempFilters));
                setFilterOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={exportPreviewOpen}
          onClose={closeExportPreview}
          fullWidth
          maxWidth="xl"
        >
          <DialogTitle
            component="div"
            sx={{ m: 0, position: "relative", pr: 7 }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1.5}
              pr={4}
            >
              <Typography variant="h6" component="span">
                Export Preview
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <DateRangePickerBox
                  from={exportStartDate}
                  to={exportEndDate}
                  onChange={(range) => {
                    setExportStartDate(range.from);
                    setExportEndDate(range.to);
                    void loadExportPreview({
                      start: range.from,
                      end: range.to,
                    });
                  }}
                />
                {(exportStartDate || exportEndDate) && (
                  <Button
                    color="error"
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setExportStartDate(null);
                      setExportEndDate(null);
                      void loadExportPreview({ start: null, end: null });
                    }}
                    disabled={exportPreviewLoading || exportDownloading}
                    aria-label="Clear date range"
                    sx={{
                      minHeight: 34,
                      height: 34,
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      fontWeight: 600,
                      minWidth: 64,
                      px: 1.5,
                    }}
                  >
                    <IconX size={18} />
                  </Button>
                )}
              </Stack>
            </Stack>
            <IconButton
              aria-label="close"
              onClick={closeExportPreview}
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
                          <Typography component="span" variant="subtitle2">
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
              onClick={closeExportPreview}
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
                          <Typography component="span" variant="subtitle2">
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
