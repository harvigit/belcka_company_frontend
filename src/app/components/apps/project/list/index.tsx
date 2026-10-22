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
  IconEye,
  IconFileExport,
  IconFilter,
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { createColumnHelper } from "@tanstack/react-table";
import { flexRender } from "@/utils/flexRender";
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
import {
  DndContext,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import toast from "react-hot-toast";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useRouter } from "next/navigation";
import { IconSettings } from "@tabler/icons-react";
import { Grid } from "@mui/system";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission } from "@/lib/permissions";
import dynamic from "next/dynamic";
import { useHasOpened } from "@/hooks/useHasOpened";

// Settings, module panels and the favourites drawer only render after a click, so load them on demand.
const Setting = dynamic(() => import("@/app/components/apps/projects/setting"), { ssr: false });
const AddressWorkspace = dynamic(() => import("@/app/components/apps/addresses/list/address-workspace"), { ssr: false });
const CasesList = dynamic(() => import("@/app/components/apps/cases/list"), { ssr: false });
const CheckinsList = dynamic(() => import("@/app/components/apps/checkins"), { ssr: false });
const FavoriteProductsDrawer = dynamic(() => import("../FavoriteProductsDrawer"), { ssr: false });

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
  section_id?: number | null;
  section_order?: number;
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

// Optional export columns, included only when visible in the listing table.
const EXPORT_OPTIONAL_COLUMNS = [
  { columnId: "total_working_users", exportKey: "on_site" },
  { columnId: "limit", exportKey: "limit" },
] as const;

const getExportPreviewColumns = (extraColumns: string[] = []) => [
  {
    key: "name",
    label: "Project",
    render: (row: ProjectDashboardRow) => row.name || "-",
    footer: () => "Category Totals",
  },
  {
    key: "teams",
    label: "Teams",
    render: (row: ProjectDashboardRow) =>
      `${toCount(row.working_teams)} / ${toCount(row.assigned_teams)}`,
    footer: () => "",
  },
  ...(extraColumns.includes("on_site")
    ? [
        {
          key: "on_site",
          label: "On site",
          render: (row: ProjectDashboardRow) =>
            String(toCount(row.total_working_users)),
          footer: () => "",
        },
      ]
    : []),
  ...(extraColumns.includes("limit")
    ? [
        {
          key: "limit",
          label: "Limit",
          render: (row: ProjectDashboardRow) => String(toCount(row.limit)),
          footer: () => "",
        },
      ]
    : []),
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

// API may send counts as "3 / 0"; keep only the leading number.
const toCount = (value: unknown) => parseInt(String(value ?? 0), 10) || 0;

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

type ProjectSectionGroup = {
  id: number | null;
  name: string;
  sort_order?: number;
  projects: ProjectDashboardRow[];
};

const sectionKey = (sectionId: number | null) =>
  sectionId == null ? "none" : String(sectionId);

function ProjectDragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Box
      {...attributes}
      {...listeners}
      onClick={(event) => event.stopPropagation()}
      sx={{ cursor: "grab", display: "inline-flex", touchAction: "none" }}
    >
      <Typography textAlign="center">⋮⋮</Typography>
    </Box>
  );
}

function SortableProjectRow({
  id,
  sortable,
  onClick,
  children,
}: {
  id: number;
  sortable: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !sortable,
  });

  return (
    <TableRow
      ref={sortable ? setNodeRef : undefined}
      hover
      onClick={onClick}
      sx={{
        cursor: "pointer",
        transform: sortable ? CSS.Transform.toString(transform) : undefined,
        transition: sortable ? transition : undefined,
        opacity: isDragging ? 0.65 : 1,
      }}
    >
      {children}
    </TableRow>
  );
}

function SectionHeaderRow({
  section,
  colSpan,
  collapsed,
  onToggle,
  checked,
  indeterminate,
  onCheck,
}: {
  section: ProjectSectionGroup;
  colSpan: number;
  collapsed: boolean;
  onToggle: () => void;
  checked: boolean;
  indeterminate: boolean;
  onCheck: (checked: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionKey(section.id)}`,
  });
  const onSite = section.projects.reduce(
    (total, project) => total + Number(project.total_working_users || 0),
    0,
  );

  return (
    <TableRow ref={setNodeRef}>
      <TableCell
        sx={{
          width: 46,
          py: 0.75,
          backgroundColor: isOver ? "action.hover" : "grey.100",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <CustomCheckbox
          className="header-checkbox"
          checked={checked}
          indeterminate={indeterminate}
          disabled={section.projects.length === 0}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onCheck(event.target.checked);
          }}
          inputProps={{ "aria-label": `Select projects in ${section.name}` }}
        />
      </TableCell>
      <TableCell
        colSpan={Math.max(colSpan - 1, 1)}
        sx={{
          py: 0.75,
          backgroundColor: isOver ? "action.hover" : "grey.100",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <IconButton
            size="small"
            aria-label={
              collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`
            }
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            {collapsed ? (
              <IconChevronRight size={18} />
            ) : (
              <IconChevronDown size={18} />
            )}
          </IconButton>
          <Typography fontWeight={700} fontSize={14}>
            {section.name}
          </Typography>
          <Chip
            size="small"
            label={section.projects.length}
            sx={{ height: 22, fontWeight: 700 }}
          />
          <Typography variant="body2" color="text.secondary">
            {onSite} on site
          </Typography>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

const ProjectDashboard = () => {
  const router = useRouter();
  const [data, setData] = useState<ProjectDashboardRow[]>([]);
  const [sections, setSections] = useState<ProjectSectionGroup[]>([]);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [sectionSaving, setSectionSaving] = useState(false);
  const sectionActionsRef = useRef({
    locked: false,
    sorting: false,
    sections: [] as ProjectSectionGroup[],
    move: (_id: number, _direction: -1 | 1) => {},
    assign: (_id: number, _sectionId: number | null) => {},
  });
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
  const [isSaving, setIsSaving] = useState(false);
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

  const [productDrawer, setProductDrawer] = useState(false);
  const settingMounted = useHasOpened(settingOpen);
  const productDrawerMounted = useHasOpened(productDrawer);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

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
      defaultVisibility: { total_working_users: false, limit: false },
      alwaysVisibleColumns: ["drag", "order", "section", "select", "actions"],
    });

  const exportExtraColumns = EXPORT_OPTIONAL_COLUMNS.filter(
    ({ columnId }) => columnVisibility[columnId] !== false,
  ).map(({ exportKey }) => exportKey);

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
      ...(exportExtraColumns.length > 0
        ? { extra_columns: exportExtraColumns.join(",") }
        : {}),
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
      let url = `project/dashboard?company_id=${user.company_id}&is_web=true&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status && filters.status !== "all") {
        url += `&status=${filters.status}`;
      }
      const res = await api.get(url);
      if (res.data) {
        const responseData = Array.isArray(res.data.info)
          ? res.data.info
          : res.data.info?.data || [];
        const apiSections = (
          Array.isArray(res.data.sections)
            ? (res.data.sections as ProjectSectionGroup[])
            : [
                {
                  id: null,
                  name: "Unsectioned",
                  sort_order: -1,
                  projects: responseData,
                },
              ]
        ).map((section) => ({
          ...section,
          projects: section.projects || [],
        }));
        setSections(apiSections);
        setData(apiSections.flatMap((section) => section.projects || []));
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

  const persistSectionOrder = async (nextSections: ProjectSectionGroup[]) => {
    const previousSections = sections;
    const previousData = data;
    const cleaned = nextSections.filter(
      (section) => section.id != null || section.projects.length > 0,
    );
    setSections(cleaned);
    setData(cleaned.flatMap((section) => section.projects));
    const previousPlace = new Map<
      number,
      { sectionId: number | null; index: number }
    >();
    previousSections.forEach((section) => {
      section.projects.forEach((project, index) => {
        previousPlace.set(project.id, { sectionId: section.id, index });
      });
    });
    const changedProjects = cleaned.flatMap((section) =>
      section.projects.flatMap((project, index) => {
        const previous = previousPlace.get(project.id);
        if (
          previous &&
          previous.sectionId === section.id &&
          previous.index === index
        ) {
          return [];
        }
        return [
          {
            id: project.id,
            section_id: section.id,
            section_order: index + 1,
          },
        ];
      }),
    );
    if (!changedProjects.length) return;
    try {
      const res = await api.post("project/section-order", {
        company_id: user?.company_id,
        projects: changedProjects,
      });
      if (!res.data?.IsSuccess) {
        throw new Error(res.data?.message || "Failed to save project order");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save project order",
      );
      setSections(previousSections);
      setData(previousData);
    }
  };

  const moveProject = (projectId: number, direction: -1 | 1) => {
    if (sectionActionsRef.current.locked) return;
    const next = sections.map((section) => ({
      ...section,
      projects: [...section.projects],
    }));
    const section = next.find((item) =>
      item.projects.some((project) => project.id === projectId),
    );
    if (!section) return;
    const index = section.projects.findIndex(
      (project) => project.id === projectId,
    );
    const target = index + direction;
    if (target < 0 || target >= section.projects.length) return;
    const [project] = section.projects.splice(index, 1);
    section.projects.splice(target, 0, project);
    void persistSectionOrder(next);
  };

  const assignProjectSection = (
    projectId: number,
    sectionId: number | null,
  ) => {
    if (sectionActionsRef.current.locked) return;
    const next = sections.map((section) => ({
      ...section,
      projects: [...section.projects],
    }));
    const current = next.find((section) =>
      section.projects.some((project) => project.id === projectId),
    );
    if (!current || current.id === sectionId) return;
    let moved: ProjectDashboardRow | undefined;
    for (const section of next) {
      const index = section.projects.findIndex(
        (project) => project.id === projectId,
      );
      if (index >= 0) {
        moved = section.projects.splice(index, 1)[0];
        break;
      }
    }
    if (!moved) return;
    let target = next.find((section) => section.id === sectionId);
    if (!target && sectionId == null) {
      target = {
        id: null,
        name: "Unsectioned",
        sort_order: -1,
        projects: [],
      };
      next.unshift(target);
    }
    if (!target) return;
    target.projects.push({ ...moved, section_id: target.id });
    void persistSectionOrder(next);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    if (sectionActionsRef.current.locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const projectId = Number(active.id);
    const overId = String(over.id);
    if (overId.startsWith("section-")) {
      const key = overId.slice("section-".length);
      assignProjectSection(projectId, key === "none" ? null : Number(key));
      return;
    }
    const overProjectId = Number(over.id);
    const next = sections.map((section) => ({
      ...section,
      projects: [...section.projects],
    }));
    let moved: ProjectDashboardRow | undefined;
    for (const section of next) {
      const index = section.projects.findIndex(
        (project) => project.id === projectId,
      );
      if (index >= 0) {
        moved = section.projects.splice(index, 1)[0];
        break;
      }
    }
    const target = next.find((section) =>
      section.projects.some((project) => project.id === overProjectId),
    );
    if (!moved || !target) return;
    const overIndex = target.projects.findIndex(
      (project) => project.id === overProjectId,
    );
    target.projects.splice(
      overIndex < 0 ? target.projects.length : overIndex,
      0,
      {
        ...moved,
        section_id: target.id,
      },
    );
    void persistSectionOrder(next);
  };

  const createSection = async () => {
    const name = sectionName.trim();
    if (!name) {
      setSectionError("Section name is required");
      return;
    }
    if (
      sections.some(
        (section) => section.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      setSectionError("A section with this name already exists.");
      return;
    }
    if (!user?.company_id) return;
    setSectionSaving(true);
    try {
      const res = await api.post("project/sections", {
        company_id: user.company_id,
        name,
      });
      setSectionDialogOpen(false);
      setSectionName("");
      setSectionError("");
      toast.success(res.data.message || "Section created");
      fetchProjects();
    } catch (error) {
      console.error(error);
    } finally {
      setSectionSaving(false);
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
      {
        id: "drag",
        enableSorting: false,
        enableHiding: false,
        header: () => <Typography variant="subtitle2"></Typography>,
        cell: ({ row }: { row: { original: ProjectDashboardRow } }) =>
          sectionActionsRef.current.locked ||
          sectionActionsRef.current.sorting ? (
            <Typography color="text.disabled" textAlign="center">
              ⋮⋮
            </Typography>
          ) : (
            <ProjectDragHandle id={row.original.id} />
          ),
      },
      {
        id: "order",
        enableSorting: false,
        enableHiding: false,
        header: () => <Typography variant="subtitle2">Order</Typography>,
        cell: ({ row }: { row: { original: ProjectDashboardRow } }) => {
          const section = sectionActionsRef.current.sections.find((item) =>
            item.projects.some((project) => project.id === row.original.id),
          );
          const index =
            section?.projects.findIndex(
              (project) => project.id === row.original.id,
            ) ?? -1;
          const locked =
            sectionActionsRef.current.locked ||
            sectionActionsRef.current.sorting;
          return (
            <Stack
              direction="row"
              spacing={0.25}
              onClick={(event) => event.stopPropagation()}
            >
              <IconButton
                size="small"
                aria-label={`Move ${row.original.name} up`}
                disabled={locked || index <= 0}
                onClick={() =>
                  sectionActionsRef.current.move(row.original.id, -1)
                }
              >
                <IconArrowUp size={16} />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Move ${row.original.name} down`}
                disabled={
                  locked ||
                  !section ||
                  index < 0 ||
                  index >= section.projects.length - 1
                }
                onClick={() =>
                  sectionActionsRef.current.move(row.original.id, 1)
                }
              >
                <IconArrowDown size={16} />
              </IconButton>
            </Stack>
          );
        },
      },
      {
        id: "section",
        enableSorting: false,
        enableHiding: false,
        header: () => <Typography variant="subtitle2">Section</Typography>,
        cell: ({ row }: { row: { original: ProjectDashboardRow } }) => {
          const locked =
            sectionActionsRef.current.locked ||
            sectionActionsRef.current.sorting;
          const current =
            sectionActionsRef.current.sections.find((item) =>
              item.projects.some((project) => project.id === row.original.id),
            )?.id ?? null;
          return (
            <TextField
              select
              size="small"
              value={current == null ? "none" : String(current)}
              // disabled={locked}
              aria-label={`Section for ${row.original.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const value = event.target.value;
                sectionActionsRef.current.assign(
                  row.original.id,
                  value === "none" ? null : Number(value),
                );
              }}
              sx={{ minWidth: 140, maxWidth: 180 }}
            >
              <MenuItem value="none">Unsectioned</MenuItem>
              {sectionActionsRef.current.sections
                .filter((section) => section.id != null)
                .map((section) => (
                  <MenuItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </MenuItem>
                ))}
            </TextField>
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
        cell: ({ row }) => (
          <NumberCell
            value={`${toCount(row.original.working_teams)} / ${toCount(
              row.original.assigned_teams,
            )}`}
          />
        ),
      }),
      columnHelper.accessor("total_working_users", {
        header: () => <HeaderLabel>On site</HeaderLabel>,
        meta: { label: "On site" },
        cell: ({ row }) => (
          <NumberCell value={toCount(row.original.total_working_users)} />
        ),
      }),
      columnHelper.accessor("limit", {
        header: () => <HeaderLabel>Limit</HeaderLabel>,
        meta: { label: "Limit" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.display({
        id: "working_limit",
        header: () => <HeaderLabel>Working / Limit</HeaderLabel>,
        meta: { label: "Working / Limit" },
        cell: ({ row }) => (
          <NumberCell
            value={`${toCount(row.original.total_working_users)} / ${toCount(
              row.original.limit,
            )}`}
          />
        ),
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
          <NumberCell value={Math.round(Number(getValue() || 0))} />
        ),
      }),
      columnHelper.accessor("shift_hour", {
        header: () => <HeaderLabel>Shift Hours</HeaderLabel>,
        meta: { label: "Shift Hours" },
        cell: ({ getValue }) => (
          <NumberCell value={Math.round(Number(getValue() || 0))} />
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

          return (
            <Stack
              direction="row"
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
              sx={{ px: 1 }}
            >
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
            </Stack>
          );
        },
      }),
    ],
    [currency, data, hoveredRow, selectedRowIds, user?.company_id],
  );

  const {
    table,
    pagination,
    setPagination,
    setPageCount,
    totalRows,
    setTotalRows,
    sorting,
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
  const reorderLocked = Boolean(searchTerm.trim()) || hasActiveFilters;
  const groupedView = sorting.length === 0;
  sectionActionsRef.current = {
    locked: reorderLocked,
    sorting: sorting.length > 0,
    sections,
    move: moveProject,
    assign: assignProjectSection,
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (!user?.company_id) return;
    try {
      const stored = localStorage.getItem(
        `project-sections-collapsed:${user.company_id}`,
      );
      setCollapsedSectionIds(new Set(stored ? JSON.parse(stored) : []));
    } catch {
      setCollapsedSectionIds(new Set());
    }
  }, [user?.company_id]);

  const toggleSection = (sectionId: number | null) => {
    const key = sectionKey(sectionId);
    setCollapsedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (user?.company_id) {
        localStorage.setItem(
          `project-sections-collapsed:${user.company_id}`,
          JSON.stringify([...next]),
        );
      }
      return next;
    });
  };

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
  const exportPreviewColumns = useMemo(
    () => getExportPreviewColumns(exportExtraColumns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportExtraColumns.join(",")],
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
            <Button
              variant="contained"
              startIcon={<IconPlus width={18} />}
              onClick={() => {
                setSectionName("");
                setSectionError("");
                setSectionDialogOpen(true);
              }}
              sx={{ ml: 1, textTransform: "none" }}
            >
              Add section
            </Button>
            <Button
              variant="contained"
              onClick={openExportPreview}
              sx={{ ml: 1 }}
            >
              <IconFileExport width={18} /> Export
            </Button>

            {Number(user?.user_role_id) === 1 && (
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

        {settingMounted && (
          <Setting
            settingOpen={settingOpen}
            onClose={() => setSettingOpen(false)}
          />
        )}

        <Drawer
          anchor="bottom"
          open={Boolean(moduleDrawer)}
          onClose={() => setModuleDrawer(null)}
          ModalProps={{ disableEnforceFocus: true }}
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
            <Box width={"100%"} display={"flex"} alignItems={"center"}>
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
              <AddressWorkspace embedded />
            ) : null}
            {moduleDrawer === "cases" ? <CasesList embedded /> : null}
            {moduleDrawer === "checkins" ? <CheckinsList embedded /> : null}
          </Box>
        </Drawer>

        {productDrawerMounted && (
          <FavoriteProductsDrawer
            open={productDrawer}
            projectId={activeProjectId}
            companyId={user?.company_id}
            onClose={() => setProductDrawer(false)}
          />
        )}

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

        <Dialog
          open={sectionDialogOpen}
          onClose={() => !sectionSaving && setSectionDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Add section</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="Section name"
              placeholder="e.g. Priority projects"
              value={sectionName}
              onChange={(event) => {
                setSectionName(event.target.value.slice(0, 50));
                setSectionError("");
              }}
              inputProps={{ maxLength: 50 }}
              error={Boolean(sectionError)}
              helperText={sectionError || " "}
            />
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              disabled={sectionSaving}
              onClick={() => setSectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={sectionSaving}
              onClick={() => void createSection()}
            >
              Create section
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <TableBody>
                {loading ? (
                  <SkeletonLoader
                    columns={simpleColumns}
                    rowCount={simpleColumns.length}
                  />
                ) : table.getRowModel().rows.length === 0 &&
                  sections.length === 0 ? (
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
                ) : groupedView ? (
                  sections.map((section) => {
                    const collapsed = collapsedSectionIds.has(
                      sectionKey(section.id),
                    );
                    const rows = section.projects
                      .map((project) =>
                        table
                          .getRowModel()
                          .rows.find((row) => row.original.id === project.id),
                      )
                      .filter((row): row is NonNullable<typeof row> =>
                        Boolean(row),
                      );
                    return (
                      <React.Fragment key={sectionKey(section.id)}>
                        <SectionHeaderRow
                          section={section}
                          colSpan={table.getVisibleLeafColumns().length}
                          collapsed={collapsed}
                          onToggle={() => toggleSection(section.id)}
                          checked={
                            section.projects.length > 0 &&
                            section.projects.every((project) =>
                              selectedRowIds.has(project.id),
                            )
                          }
                          indeterminate={
                            section.projects.some((project) =>
                              selectedRowIds.has(project.id),
                            ) &&
                            !section.projects.every((project) =>
                              selectedRowIds.has(project.id),
                            )
                          }
                          onCheck={(checked) => {
                            setSelectedRowIds((current) => {
                              const next = new Set(current);
                              section.projects.forEach((project) => {
                                if (checked) next.add(project.id);
                                else next.delete(project.id);
                              });
                              return next;
                            });
                          }}
                        />
                        {collapsed ? null : rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={table.getVisibleLeafColumns().length}
                              sx={{
                                color: "text.secondary",
                                py: 2,
                                pl: 7,
                              }}
                            >
                              No projects in this section. Choose it from a
                              project&apos;s section menu to move one here.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext
                            items={rows.map((row) => row.original.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {rows.map((row) => (
                              <SortableProjectRow
                                key={row.id}
                                id={row.original.id}
                                sortable={!reorderLocked}
                                onClick={() =>
                                  router.push(
                                    `/apps/project/list/${row.original.id}`,
                                  )
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
                              </SortableProjectRow>
                            ))}
                          </SortableContext>
                        )}
                      </React.Fragment>
                    );
                  })
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
            </DndContext>
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
