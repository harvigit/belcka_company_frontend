"use client";

import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCar,
  IconCertificate,
  IconCircleCheck,
  IconClock,
  IconCloudUpload,
  IconExternalLink,
  IconEye,
  IconFilter,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { createColumnHelper, SortingState } from "@tanstack/react-table";
import Image from "next/image";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { flexRender } from "@/utils/flexRender";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import AttachmentLightbox from "@/app/components/common/AttachmentLightbox";
import PermissionGuard from "@/app/auth/PermissionGuard";

type CertificateRow = {
  id: number;
  document_type: string;
  type?: number;
  card_number: string | null;
  expiry_date: string | null;
  valid_until: string | null;
  status: string;
  file_url: string | null;
  uploaded_date: string;
  user_name: string;
  user_image: string | null;
  expires_in_days?: number | null;
};

type DashboardCounts = {
  valid: number;
  expiring_soon: number;
  expired: number;
  insurance: number;
  driving_license: number;
  certificate: number;
};

type Course = { id: number; name: string; type: number };
type DocCategory = { id: number; name: string };
type CompanyUser = { id: number; name: string };

type FilterKey =
  | "all"
  | "valid"
  | "expiring_soon"
  | "expired"
  | "insurance"
  | "driving"
  | "certificate";

const EMPTY_COUNTS: DashboardCounts = {
  valid: 0,
  expiring_soon: 0,
  expired: 0,
  insurance: 0,
  driving_license: 0,
  certificate: 0,
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Valid: { bg: "#E8F8EF", color: "#1B7A45" },
  "Expiring Soon": { bg: "#FFF4E5", color: "#C47A00" },
  Expired: { bg: "#FDECEC", color: "#C62828" },
};

const FILTERS: {
  key: FilterKey;
  label: string;
  countKey: keyof DashboardCounts;
  accent: string;
  bg: string;
  icon: React.ElementType;
}[] = [
  {
    key: "valid",
    label: "Valid",
    countKey: "valid",
    accent: "#1B7A45",
    bg: "#E8F8EF",
    icon: IconCircleCheck,
  },
  {
    key: "expiring_soon",
    label: "Expiring soon",
    countKey: "expiring_soon",
    accent: "#C47A00",
    bg: "#FFF4E5",
    icon: IconClock,
  },
  {
    key: "expired",
    label: "Expired",
    countKey: "expired",
    accent: "#C62828",
    bg: "#FDECEC",
    icon: IconAlertTriangle,
  },
  {
    key: "insurance",
    label: "Insurance",
    countKey: "insurance",
    accent: "#5B4B8A",
    bg: "#F3EEF8",
    icon: IconShieldCheck,
  },
  {
    key: "driving",
    label: "Driving licence",
    countKey: "driving_license",
    accent: "#1E4DB7",
    bg: "#E8F1FC",
    icon: IconCar,
  },
  {
    key: "certificate",
    label: "Certificates",
    countKey: "certificate",
    accent: "#0B6E4F",
    bg: "#E7F6F1",
    icon: IconCertificate,
  },
];

const COLUMN_LABELS: Record<string, string> = {
  document_type: "Document type",
  document: "Document",
  user_name: "User",
  card_number: "Number",
  valid_until: "Valid until",
  uploaded_date: "Uploaded",
  status: "Status",
};

const columnHelper = createColumnHelper<CertificateRow>();
const toApiDate = (date: Date) => format(date, "dd/MM/yyyy");
const currentWeek = () => ({
  from: startOfWeek(new Date(), { weekStartsOn: 1 }),
  to: endOfWeek(new Date(), { weekStartsOn: 1 }),
});

const isPdf = (url?: string | null) =>
  Boolean(url && url.split("?")[0].toLowerCase().endsWith(".pdf"));

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const StatusChip = ({ status }: { status: string }) => {
  const style = STATUS_STYLE[status] || STATUS_STYLE.Valid;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        px: 1.25,
        py: 0.35,
        borderRadius: "999px",
        bgcolor: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </Box>
  );
};

const Certificates = () => {
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: number;
  };
  const companyId = Number(user?.company_id || 0);
  const week = currentWeek();

  const [startDate, setStartDate] = useState<Date | null>(week.from);
  const [endDate, setEndDate] = useState<Date | null>(week.to);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [appliedUserId, setAppliedUserId] = useState(0);
  const [tempUserId, setTempUserId] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "uploaded_date", desc: true },
  ]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [columnSearch, setColumnSearch] = useState("");

  const [detail, setDetail] = useState<CertificateRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState("1");
  const [courseId, setCourseId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null);

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${companyId}_${user?.id ?? "user"}_certificates`,
      enabled: Boolean(companyId),
    });

  const openDetail = async (id: number) => {
    if (!companyId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(
        `certificates/detail?company_id=${companyId}&id=${id}`,
      );
      setDetail(res.data?.info || null);
    } catch (error) {
      toast.error(errorMessage(error, "Could not load certificate"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    columnHelper.accessor("document_type", {
      id: "document_type",
      header: COLUMN_LABELS.document_type,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: "#EEF4FF",
              color: "primary.main",
              width: 36,
              height: 36,
            }}
          >
            <IconCertificate size={18} />
          </Avatar>
          <Box>
            <Typography fontWeight={600} fontSize={14}>
              {row.original.document_type || "Certificate"}
            </Typography>
            {row.original.expires_in_days != null &&
              filter === "expiring_soon" && (
                <Typography variant="caption" color="text.secondary">
                  Expires in {row.original.expires_in_days} days
                </Typography>
              )}
          </Box>
        </Stack>
      ),
    }),
    columnHelper.display({
      id: "document",
      header: COLUMN_LABELS.document,
      enableSorting: false,
      cell: ({ row }) => {
        const fileUrl = row.original.file_url;
        if (!fileUrl) {
          return (
            <Typography className="f-14" color="text.secondary">
              —
            </Typography>
          );
        }
        return (
          <Box
            component="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (isPdf(fileUrl)) {
                window.open(fileUrl, "_blank", "noopener,noreferrer");
                return;
              }
              setPreviewUrl(fileUrl);
              setPreviewOpen(true);
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              border: "none",
              background: "none",
              p: 0,
              cursor: "pointer",
              color: "primary.main",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            View document
            <IconExternalLink size={14} />
          </Box>
        );
      },
    }),
    columnHelper.accessor("user_name", {
      id: "user_name",
      header: COLUMN_LABELS.user_name,
      cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            src={row.original.user_image || undefined}
            sx={{ width: 28, height: 28 }}
          >
            {(row.original.user_name || "?").charAt(0)}
          </Avatar>
          <Typography fontSize={14}>{row.original.user_name || "-"}</Typography>
        </Stack>
      ),
    }),
    columnHelper.accessor("card_number", {
      id: "card_number",
      header: COLUMN_LABELS.card_number,
      cell: ({ getValue }) => getValue() || "-",
    }),
    columnHelper.accessor("valid_until", {
      id: "valid_until",
      header: COLUMN_LABELS.valid_until,
      cell: ({ row }) =>
        row.original.valid_until || row.original.expiry_date || "-",
    }),
    columnHelper.accessor("uploaded_date", {
      id: "uploaded_date",
      header: COLUMN_LABELS.uploaded_date,
      cell: ({ getValue }) => getValue() || "-",
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: COLUMN_LABELS.status,
      cell: ({ getValue }) => <StatusChip status={getValue() || "Valid"} />,
    }),
  ];

  const fetchCertificates = async () => {
    if (!companyId || !startDate || !endDate) return;
    setLoading(true);
    try {
      const status =
        filter === "valid" || filter === "expired" || filter === "expiring_soon"
          ? `&status=${filter}`
          : "";
      const type =
        filter === "insurance"
          ? "&type=3"
          : filter === "driving"
            ? "&type=2"
            : filter === "certificate"
              ? "&type=1"
              : "";
      const activeSorting = sorting[0] ?? { id: "uploaded_date", desc: true };
      let url =
        `certificates/list?company_id=${companyId}` +
        `&user_id=${appliedUserId}` +
        `&page=${pagination.pageIndex + 1}` +
        `&limit=${pagination.pageSize}` +
        `&start_date=${toApiDate(startDate)}` +
        `&end_date=${toApiDate(endDate)}` +
        `&sort_by=${activeSorting.id}` +
        `&sort_order=${activeSorting.desc ? "desc" : "asc"}` +
        status +
        type;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await api.get(url);
      const list: CertificateRow[] = Array.isArray(res.data?.info)
        ? res.data.info
        : [];
      setRows(list);
      const pagMeta = res.data?.data;
      if (pagMeta && pagMeta.totalItems !== undefined) {
        setTotalRows(Number(pagMeta.totalItems) || 0);
        setPageCount(Number(pagMeta.totalPages) || 1);
      } else {
        setTotalRows(list.length);
        setPageCount(1);
      }

      const dash = await api.get(
        `certificates/dashboard?company_id=${companyId}&user_id=${appliedUserId}&start_date=${toApiDate(startDate)}&end_date=${toApiDate(endDate)}`,
      );
      setCounts({ ...EMPTY_COUNTS, ...(dash.data?.info || {}) });
    } catch (error) {
      toast.error(errorMessage(error, "Could not load certificates"));
      setRows([]);
      setTotalRows(0);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  };

  const {
    table,
    pagination,
    setPagination,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data: rows,
    columns,
    fetchData: fetchCertificates,
    initialPagination: { pageIndex: 0, pageSize: 50 },
    debounceDependencies: [
      companyId,
      search,
      filter,
      appliedUserId,
      startDate ? format(startDate, "yyyy-MM-dd") : "",
      endDate ? format(endDate, "yyyy-MM-dd") : "",
    ],
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    manualSorting: true,
    forceServerSorting: true,
  });

  useEffect(() => {
    if (!companyId) return;
    const loadUsers = async () => {
      try {
        const res = await api.get("user/get-user-lists");
        const info = res.data?.info;
        const list = Array.isArray(info) ? info : info?.data || [];
        setUsers(
          list.map((item: any) => ({
            id: Number(item.id),
            name:
              item.name ||
              `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
              "User",
          })),
        );
      } catch (error) {
        console.error(error);
      }
    };
    const loadCategories = async () => {
      try {
        const res = await api.get("certificates/types");
        setCategories(res.data?.info || []);
      } catch (error) {
        console.error(error);
      }
    };
    loadUsers();
    loadCategories();
  }, [companyId]);

  useEffect(() => {
    if (uploadOpen) {
      const loadCourses = async () => {
        try {
          const res = await api.get(`get-courses?type=${categoryId || "1"}`);
          const list: Course[] = res.data?.info || [];
          setCourses(list);
          setCourseId((current) =>
            list.some((course) => String(course.id) === current)
              ? current
              : list[0]
                ? String(list[0].id)
                : "",
          );
        } catch (error) {
          console.error(error);
          setCourses([]);
        }
      };
      loadCourses();
    }
  }, [uploadOpen, categoryId]);

  const resetUpload = () => {
    setCategoryId("1");
    setCourseId("");
    setExpiryDate("");
    setDocumentNumber("");
    setFile(null);
  };

  const saveDocument = async () => {
    if (!companyId) return;
    if (!courseId || !documentNumber.trim() || !expiryDate) {
      toast.error("Document type, number, and expiry date are required");
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      toast.error("File must be 10MB or smaller");
      return;
    }
    const [year, month, day] = expiryDate.split("-");
    const form = new FormData();
    form.append("company_id", String(companyId));
    form.append("course_id", courseId);
    form.append("document_number", documentNumber.trim());
    form.append("type", categoryId || "1");
    form.append("expiry_date", `${day}/${month}/${year}`);
    if (file) form.append("file", file);

    setSaving(true);
    try {
      const res = await api.post("certificates/create", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data?.message || "Certificate uploaded");
      setUploadOpen(false);
      resetUpload();
      await fetchCertificates();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save certificate"));
    } finally {
      setSaving(false);
    }
  };

  const replaceDocument = async (nextFile: File) => {
    if (!detail || !companyId) return;
    if (nextFile.size > 10 * 1024 * 1024) {
      toast.error("File must be 10MB or smaller");
      return;
    }
    const form = new FormData();
    form.append("id", String(detail.id));
    form.append("company_id", String(companyId));
    form.append("file", nextFile);
    setSaving(true);
    try {
      const res = await api.post("certificates/replace", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data?.message || "Document replaced");
      await openDetail(detail.id);
      await fetchCertificates();
    } catch (error) {
      toast.error(errorMessage(error, "Could not replace document"));
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!detail) return;
    setDeleting(true);
    try {
      const res = await api.post("certificates/delete", { id: detail.id });
      toast.success(res.data?.message || "Certificate deleted");
      setDeleteOpen(false);
      setDetailOpen(false);
      setDetail(null);
      await fetchCertificates();
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete certificate"));
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = appliedUserId > 0;
  const visibleColCount =
    table.getVisibleLeafColumns().length || columns.length;
  const simpleColumns = table.getVisibleLeafColumns().map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));
  const filteredColumnToggles = table.getAllLeafColumns().filter((column) => {
    const label = COLUMN_LABELS[column.id] || column.id;
    return label.toLowerCase().includes(columnSearch.trim().toLowerCase());
  });
  const allColumnsSelected =
    filteredColumnToggles.length > 0 &&
    filteredColumnToggles.every((column) => column.getIsVisible());
  const someColumnsSelected = filteredColumnToggles.some((column) =>
    column.getIsVisible(),
  );

  return (
    <PermissionGuard permission="Documents">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack
            mr={2}
            ml={2}
            mb={1}
            mt={1}
            justifyContent="space-between"
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2 }}
            alignItems={{ sm: "center" }}
          >
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <DateRangePickerBox
                from={startDate}
                to={endDate}
                onChange={(range) => {
                  setStartDate(range.from);
                  setEndDate(range.to);
                }}
              />
              <TextField
                size="small"
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size={16} />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 180 } }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  setTempUserId(appliedUserId);
                  setFilterOpen(true);
                }}
                sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
              >
                <IconFilter width={18} />
              </Button>
              {hasActiveFilters && (
                <Button
                  color="error"
                  variant="outlined"
                  onClick={() => {
                    setAppliedUserId(0);
                    setTempUserId(0);
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                  }}
                  sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
                >
                  <IconX size={18} />
                </Button>
              )}
            </Box>
            <Box
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
              gap={1}
            >
              <Tooltip title="Column visibility">
                <IconButton
                  onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
                  color="primary"
                  size="small"
                >
                  <IconEye size={20} />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<IconPlus size={18} />}
                onClick={() => setUploadOpen(true)}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                Upload certificate
              </Button>
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(6, minmax(0, 1fr))",
              },
              gap: 1.25,
              mx: 2,
              mb: 1.5,
            }}
          >
            {FILTERS.map((item) => {
              const selected = filter === item.key;
              const Icon = item.icon;
              return (
                <Box
                  key={item.key}
                  onClick={() => setFilter(selected ? "all" : item.key)}
                  sx={{
                    position: "relative",
                    minHeight: 92,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "14px",
                    cursor: "pointer",
                    bgcolor: "#fff",
                    border: "1px solid",
                    borderColor: selected ? item.accent : "#E6E8EC",
                    boxShadow: selected
                      ? `0 0 0 3px ${item.bg}`
                      : "0 1px 2px rgba(16, 24, 40, 0.04)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    "&:hover": {
                      borderColor: item.accent,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "8px",
                      bgcolor: item.bg,
                      color: item.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} stroke={1.75} />
                  </Box>
                  <Typography
                    sx={{
                      mt: 0.75,
                      fontSize: 22,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: item.accent,
                    }}
                  >
                    {counts[item.countKey] || 0}
                  </Typography>
                  <Typography
                    noWrap
                    sx={{ mt: 0.4, fontSize: 12.5, color: "#667085" }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Table stickyHeader aria-label="certificates table">
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isActive = header.column.getIsSorted();
                      const isAsc = isActive === "asc";
                      const isSortable = header.column.getCanSort();
                      return (
                        <TableCell
                          key={header.id}
                          align={
                            header.column.id === "status" ? "center" : "left"
                          }
                          sx={{
                            py: 1.25,
                            whiteSpace: "nowrap",
                            bgcolor: "background.paper",
                          }}
                        >
                          <Box
                            onClick={header.column.getToggleSortingHandler()}
                            sx={{
                              cursor: isSortable ? "pointer" : "default",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent:
                                header.column.id === "status"
                                  ? "center"
                                  : "flex-start",
                              "&:hover .hoverIcon": { opacity: 1 },
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {isSortable && (
                              <Box
                                component="span"
                                className="hoverIcon"
                                ml={0.5}
                                sx={{
                                  opacity: isActive ? 1 : 0,
                                  transition: "opacity 0.2s",
                                  color: isActive ? "#000" : "#888",
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
                  <SkeletonLoader columns={simpleColumns} rowCount={8} />
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColCount}>
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
                          style={{ maxWidth: "100%", maxHeight: "100%" }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => openDetail(row.original.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          align={
                            cell.column.id === "status" ? "center" : "left"
                          }
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
        </Box>

        <TablePaginationFooter table={table} totalRows={totalRows} />

        <Popover
          open={Boolean(columnMenuAnchor)}
          anchorEl={columnMenuAnchor}
          onClose={() => {
            setColumnMenuAnchor(null);
            setColumnSearch("");
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              p: 1.25,
              width: 280,
              borderRadius: 2,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.14)",
              border: "1px solid #e5e7eb",
            },
          }}
        >
          <TextField
            size="small"
            placeholder="Search columns..."
            fullWidth
            value={columnSearch}
            onChange={(event) => setColumnSearch(event.target.value)}
            sx={{ mb: 1 }}
          />
          <FormGroup>
            <FormControlLabel
              control={
                <CustomCheckbox
                  size="small"
                  checked={allColumnsSelected}
                  indeterminate={!allColumnsSelected && someColumnsSelected}
                  onChange={(event) => {
                    filteredColumnToggles.forEach((column) =>
                      column.toggleVisibility(event.target.checked),
                    );
                  }}
                />
              }
              label="All"
            />
            {filteredColumnToggles.map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <CustomCheckbox
                    size="small"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                }
                label={COLUMN_LABELS[column.id] || column.id}
              />
            ))}
          </FormGroup>
        </Popover>

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
              <IconX size={24} />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={users.find((item) => item.id === tempUserId) || null}
                onChange={(_, value) => setTempUserId(value ? value.id : 0)}
                renderInput={(params) => (
                  <TextField {...params} label="User" fullWidth />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setTempUserId(0);
                setAppliedUserId(0);
                setFilterOpen(false);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setAppliedUserId(tempUserId);
                setFilterOpen(false);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        <Drawer
          anchor="right"
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 450 },
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              py: 1.75,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box display={"flex"} alignItems={"center"}>
              <IconButton onClick={() => setDetailOpen(false)}>
                <IconArrowLeft size={18} />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Document details
              </Typography>
            </Box>
            <IconButton onClick={() => setDetailOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
          {detailLoading || !detail ? (
            <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
              <Typography color="text.secondary">Loading...</Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2.5, py: 2 }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={700}>
                      {detail.document_type}
                    </Typography>
                    <StatusChip status={detail.status} />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar src={detail.user_image || undefined}>
                      {(detail.user_name || "?").charAt(0)}
                    </Avatar>
                    <Typography>{detail.user_name || "-"}</Typography>
                  </Stack>
                  <Stack spacing={1}>
                    <DetailLine
                      label="Card number"
                      value={detail.card_number || "-"}
                    />
                    <DetailLine
                      label="Expiry date"
                      value={detail.expiry_date || "-"}
                    />
                    <DetailLine
                      label="Uploaded"
                      value={detail.uploaded_date || "-"}
                    />
                  </Stack>
                  <Typography fontWeight={600}>Preview</Typography>
                  {detail.file_url ? (
                    isPdf(detail.file_url) ? (
                      <Box
                        component="iframe"
                        src={detail.file_url}
                        title="Certificate preview"
                        sx={{
                          width: "100%",
                          height: 360,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: "8px",
                        }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={detail.file_url}
                        alt={detail.document_type}
                        sx={{
                          width: "100%",
                          maxHeight: 360,
                          objectFit: "contain",
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    )
                  ) : (
                    <Typography color="text.secondary">
                      No file uploaded.
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Stack
                spacing={1}
                sx={{
                  px: 2.5,
                  py: 2,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                {detail.file_url && (
                  <Button
                    variant="outlined"
                    startIcon={<IconEye size={18} />}
                    href={detail.file_url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ textTransform: "none", borderRadius: "8px" }}
                  >
                    {isPdf(detail.file_url) ? "View PDF" : "View file"}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<IconCloudUpload size={18} />}
                  onClick={() => replaceInputRef.current?.click()}
                  disabled={saving}
                  sx={{ textTransform: "none", borderRadius: "8px" }}
                >
                  Replace document
                </Button>
                <input
                  ref={replaceInputRef}
                  hidden
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const next = event.target.files?.[0];
                    event.target.value = "";
                    if (next) replaceDocument(next);
                  }}
                />
                <Button
                  color="error"
                  startIcon={<IconTrash size={18} />}
                  onClick={() => setDeleteOpen(true)}
                  sx={{ textTransform: "none", borderRadius: "8px" }}
                >
                  Delete document
                </Button>
              </Stack>
            </>
          )}
        </Drawer>

        <Drawer
          anchor="right"
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 450 },
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              py: 1.75,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box display={"flex"} alignItems={"center"}>
              <IconButton onClick={() => setUploadOpen(false)}>
                <IconArrowLeft size={18} />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Upload certificate
              </Typography>
            </Box>
            <IconButton onClick={() => setUploadOpen(false)}>
              <IconX size={18} />
            </IconButton>
          </Stack>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 2.5, py: 2 }}>
            <Stack spacing={2}>
              <TextField
                select
                label="Category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {(categories.length
                  ? categories
                  : [
                      { id: 1, name: "Certificates" },
                      { id: 2, name: "Driving license" },
                      { id: 3, name: "Insurance" },
                    ]
                ).map((category) => (
                  <MenuItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Document type"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={String(course.id)}>
                    {course.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Expiry date"
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Document number"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
              />
              <Button
                component="label"
                variant="outlined"
                startIcon={<IconCloudUpload size={18} />}
                sx={{
                  textTransform: "none",
                  borderStyle: "dashed",
                  borderRadius: "12px",
                  py: 2,
                }}
              >
                {file ? file.name : "Tap to upload PDF, JPG or PNG (max 10MB)"}
                <input
                  hidden
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </Button>
            </Stack>
          </Box>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{
              px: 2.5,
              py: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Button
              onClick={() => setUploadOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveDocument}
              disabled={saving}
              sx={{ textTransform: "none", borderRadius: "8px" }}
            >
              {saving ? "Saving..." : "Save document"}
            </Button>
          </Stack>
        </Drawer>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Delete document</DialogTitle>
          <DialogContent>
            <Typography>
              This removes the certificate from the company list.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              onClick={deleteDocument}
              disabled={deleting}
              sx={{ textTransform: "none" }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
        <AttachmentLightbox
          open={previewOpen}
          slides={
            previewUrl
              ? [
                  {
                    src: previewUrl,
                    alt: "Document",
                    downloadFilename:
                      previewUrl.split("?")[0].split("/").pop() ||
                      "document.jpg",
                  },
                ]
              : []
          }
          onClose={() => setPreviewOpen(false)}
        />
      </Box>
    </PermissionGuard>
  );
};

const DetailLine = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography color="text.secondary">{label}</Typography>
    <Typography fontWeight={600} textAlign="right">
      {value}
    </Typography>
  </Stack>
);

export default Certificates;
