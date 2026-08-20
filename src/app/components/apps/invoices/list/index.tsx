"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Link,
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
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconFilter,
  IconNotes,
  IconPlus,
  IconSearch,
  IconShare,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import api from "@/utils/axios";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import CreateInvoice from "@/app/components/apps/invoices/create";
import InvoiceAttachments from "@/app/components/apps/invoices/attachments";
import InvoiceView from "@/app/components/apps/invoices/view";
import ArchiveInvoice from "@/app/components/apps/invoices/archive";
import { InvoiceDocument, InvoiceRow, mapInvoiceApiRow } from "./mockData";

const columnHelper = createColumnHelper<InvoiceRow>();

type FilterOption = {
  id: number;
  name: string;
  project_id?: number;
  user_image?: string | null;
  user_thumb_image?: string | null;
};

const defaultFilters = {
  project_id: "" as string | number,
  project_manual: "" as string,
  address_id: "" as string | number,
  ordered_by: "" as string | number,
  supplier_id: "" as string | number,
};

type InvoiceFilters = typeof defaultFilters;

type InvoicesTableCookieState = {
  search?: string;
  filters?: Partial<InvoiceFilters>;
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
  };
};

const COOKIE_OPTIONS = { expires: 365, path: "/" };
const PAGE_SIZE_OPTIONS = [50, 100, 250, 500];

const getInvoicesTableStateKey = (
  userId?: number | string,
  companyId?: number | string | null,
) =>
  userId && companyId ? `po_invoices_table_state_${userId}_${companyId}` : "";

const readInvoicesTableStateCookie = (
  key: string,
): InvoicesTableCookieState => {
  if (!key) return {};
  const saved = Cookies.get(key);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    Cookies.remove(key, { path: "/" });
    return {};
  }
};

const normalizeInvoiceFilters = (
  filters?: Partial<InvoiceFilters>,
): InvoiceFilters => ({
  project_id: filters?.project_id ?? "",
  project_manual: filters?.project_manual ?? "",
  address_id: filters?.address_id ?? "",
  ordered_by: filters?.ordered_by ?? "",
  supplier_id: filters?.supplier_id ?? "",
});

const getColumnLabel = (col: any) => {
  if (
    typeof col.columnDef?.header === "string" &&
    col.columnDef.header.trim()
  ) {
    return col.columnDef.header;
  }
  return String(col.id || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
};

const formatMoney = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return "-";
  return `£${amount}`;
};

const stripHtml = (value?: string | null) => {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const EllipsisCell = ({
  value,
  maxWidth = 180,
}: {
  value?: string | null;
  maxWidth?: number;
}) => {
  const text = value?.trim() ? value : "-";
  return (
    <Tooltip title={text !== "-" ? text : ""} placement="top" arrow>
      <Typography
        className="f-14"
        noWrap
        sx={{
          maxWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};

const InvoiceList = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const companyId = user?.company_id ? Number(user.company_id) : null;
  const tableStateKey = getInvoicesTableStateKey(user?.id, companyId);

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_po_invoices`,
      enabled: !!user?.id,
    });

  const [data, setData] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [addresses, setAddresses] = useState<FilterOption[]>([]);
  const [orderedByOptions, setOrderedByOptions] = useState<FilterOption[]>([]);
  const [suppliers, setSuppliers] = useState<FilterOption[]>([]);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(
    null,
  );
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attachmentsInvoiceId, setAttachmentsInvoiceId] = useState<
    number | null
  >(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<number | null>(null);
  const [shareInvoice, setShareInvoice] = useState<InvoiceRow | null>(null);
  const [shareMenuPos, setShareMenuPos] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [invoicesToArchive, setInvoicesToArchive] = useState<number[]>([]);
  const shareMenuOpen = Boolean(shareMenuPos);
  const openMenu = Boolean(menuAnchor);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isTableStateReady, setIsTableStateReady] = useState(false);
  const restoredTableStateKeyRef = useRef("");
  const skipNextDependencyPageResetRef = useRef(false);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(data.map((item) => item.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const filteredAddressOptions = useMemo(() => {
    if (tempFilters.project_id) {
      return addresses.filter(
        (a) => String(a.project_id) === String(tempFilters.project_id),
      );
    }
    if (tempFilters.project_manual.trim()) return addresses;
    return addresses;
  }, [addresses, tempFilters.project_id, tempFilters.project_manual]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!companyId) return;
      try {
        const res = await api.get(
          `po-invoices/get-resources?company_id=${companyId}`,
        );
        if (res.data?.IsSuccess) {
          setProjects(res.data.info?.projects || []);
          setAddresses(res.data.info?.addresses || []);
          setOrderedByOptions(res.data.info?.ordered_by || []);
          setSuppliers(res.data.info?.suppliers || []);
        }
      } catch (error) {
        console.error("Failed to load invoice filter options", error);
      }
    };
    loadFilterOptions();
  }, [companyId]);

  const openCreateInvoice = () => {
    setFormMode("create");
    setSelectedInvoice(null);
    setCreateOpen(true);
  };

  const openEditInvoice = async (invoice: InvoiceRow) => {
    if (!companyId) {
      setFormMode("edit");
      setSelectedInvoice(invoice);
      setCreateOpen(true);
      return;
    }
    try {
      const res = await api.get(
        `po-invoices/detail?company_id=${companyId}&id=${invoice.id}`,
      );
      if (res.data?.IsSuccess && res.data.info) {
        setSelectedInvoice(mapInvoiceApiRow(res.data.info));
      } else {
        setSelectedInvoice(invoice);
      }
    } catch {
      setSelectedInvoice(invoice);
    }
    setFormMode("edit");
    setCreateOpen(true);
  };

  const closeInvoiceForm = () => {
    setCreateOpen(false);
    setSelectedInvoice(null);
    setFormMode("create");
  };

  const openInvoiceAttachments = (invoiceId: number) => {
    setAttachmentsInvoiceId(invoiceId);
    setAttachmentsOpen(true);
  };

  const closeInvoiceAttachments = () => {
    setAttachmentsOpen(false);
    setAttachmentsInvoiceId(null);
  };

  const openInvoiceView = (invoiceId: number) => {
    setViewInvoiceId(invoiceId);
    setViewOpen(true);
  };

  const closeInvoiceView = () => {
    setViewOpen(false);
    setViewInvoiceId(null);
  };

  const closeShareMenu = () => {
    setShareMenuPos(null);
    setShareInvoice(null);
  };

  const getInvoiceDocuments = async (
    invoice: InvoiceRow,
  ): Promise<InvoiceDocument[]> => {
    if (invoice.documents?.length) return invoice.documents;
    if (!companyId) return [];
    try {
      const res = await api.get(
        `po-invoices/detail?company_id=${companyId}&id=${invoice.id}`,
      );
      if (res.data?.IsSuccess && res.data.info) {
        return mapInvoiceApiRow(res.data.info).documents || [];
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  };

  const buildShareContent = (invoice: InvoiceRow, docs: InvoiceDocument[]) => {
    const links = docs
      .map((d) => d.url)
      .filter(Boolean)
      .join("\n");
    const subject = encodeURIComponent(
      `Invoice ${invoice.invoiceId || `#${invoice.id}`}`,
    );
    const body = encodeURIComponent(`
Please find the invoice documents below.

Invoice Id: ${invoice.invoiceId || invoice.id}
Project: ${invoice.project}
Supplier: ${invoice.supplier}

Documents:
${links || "No documents available"}

Best regards,
Team Belcka
`);
    return { subject, body, docs };
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
              checked={
                selectedRowIds.size > 0 && selectedRowIds.size >= data.length
              }
              indeterminate={
                selectedRowIds.size > 0 && selectedRowIds.size < data.length
              }
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelectAllRows(e.target.checked);
              }}
            />
          </Stack>
        ),
        cell: ({ row }: any) => {
          const item = row.original as InvoiceRow;
          const isChecked = selectedRowIds.has(item.id);
          const isHovered = hoveredRow === item.id;
          const showCheckbox = isChecked || isHovered;

          return (
            <Stack
              direction="row"
              alignItems="center"
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              <CustomCheckbox
                checked={isChecked}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
      columnHelper.accessor("invoiceId", {
        id: "invoice_id",
        header: "Invoice ID",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            fontWeight={600}
            noWrap
            sx={{ px: 1.5, maxWidth: 160 }}
          >
            {getValue()?.trim() ? getValue() : "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("project", {
        id: "project",
        header: "Project",
        cell: ({ getValue }) => (
          <EllipsisCell value={getValue()} maxWidth={180} />
        ),
      }),
      columnHelper.accessor("deliveryAddress", {
        id: "delivery_address",
        header: "Address",
        enableSorting: false,
        cell: ({ getValue }) => (
          <EllipsisCell value={getValue()} maxWidth={180} />
        ),
      }),
      columnHelper.accessor("orderedBy", {
        id: "ordered_by",
        header: "Ordered By",
        enableSorting: false,
        cell: ({ row }) => {
          const name = row.original.orderedBy;
          if (!name) {
            return <>-</>;
          }

          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ px: 1.5, maxWidth: 180 }}
            >
              {name !== "-" && (
                <Avatar
                  src={row.original.orderedByImage || "/images/users/user.png"}
                  alt={name}
                  sx={{ width: 28, height: 28, fontSize: "12px" }}
                >
                  {name?.[0]?.toUpperCase()}
                </Avatar>
              )}
              <Tooltip title={name !== "-" ? name : ""} placement="top" arrow>
                <Typography
                  className="f-14"
                  noWrap
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </Typography>
              </Tooltip>
            </Stack>
          );
        },
      }),
      columnHelper.accessor("supplier", {
        id: "supplier",
        header: "Supplier",
        enableSorting: false,
        cell: ({ getValue }) => (
          <EllipsisCell value={getValue()} maxWidth={180} />
        ),
      }),
      columnHelper.accessor("expectedDeliveryDate", {
        id: "expected_delivery_date",
        header: "Date",
        cell: ({ getValue }) => (
          <EllipsisCell value={getValue()} maxWidth={140} />
        ),
      }),
      columnHelper.accessor("totalInclVat", {
        id: "total_incl_vat",
        header: "Incl. VAT",
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            fontWeight={600}
            sx={{
              px: 1.5,
              maxWidth: 130,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatMoney(getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("totalExclVat", {
        id: "total_excl_vat",
        header: "Excl. VAT",
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            fontWeight={600}
            sx={{
              px: 1.5,
              maxWidth: 130,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatMoney(getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("description", {
        id: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ getValue }) => (
          <EllipsisCell value={stripHtml(getValue())} maxWidth={220} />
        ),
      }),
      columnHelper.accessor("creditNoteAmount", {
        id: "credit_note_amount",
        header: "Credit Amt",
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            sx={{
              px: 1.5,
              maxWidth: 130,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatMoney(getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Credit Note",
        enableSorting: false,
        cell: ({ getValue }) => (
          <EllipsisCell value={stripHtml(getValue())} maxWidth={200} />
        ),
      }),
      columnHelper.accessor("document_count", {
        id: "document",
        header: "Docs",
        enableSorting: false,
        cell: ({ row }) => {
          const count = Number(row.original.document_count || 0);
          return (
            <Typography
              className="f-14"
              color={count > 0 ? "primary" : "textSecondary"}
              fontWeight={count > 0 ? 600 : 400}
              sx={{
                px: 1.5,
                cursor: count > 0 ? "pointer" : "default",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (count > 0) openInvoiceAttachments(row.original.id);
              }}
            >
              {count}
            </Typography>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" display="flex" alignItems="center">
              <IconButton
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareInvoice(item);
                  setShareMenuPos({
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  });
                }}
              >
                <IconShare size={18} />
              </IconButton>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  openInvoiceView(item.id);
                }}
              >
                View
              </Button>
            </Stack>
          );
        },
      }),
    ],
    [selectedRowIds, hoveredRow, data],
  );

  const skeletonColumns = columns.map((column: any) => ({
    name: column.id ?? "col",
  }));

  const fetchInvoices = async () => {
    if (!companyId || !isTableStateReady) {
      setData([]);
      setTotalRows(0);
      setPageCount(1);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(companyId),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      if (filters.project_id)
        params.set("project_id", String(filters.project_id));
      else if (filters.project_manual.trim())
        params.set("project_manual", filters.project_manual.trim());
      if (filters.address_id)
        params.set("address_id", String(filters.address_id));
      if (filters.ordered_by)
        params.set("ordered_by", String(filters.ordered_by));
      if (filters.supplier_id)
        params.set("supplier_id", String(filters.supplier_id));
      if (sorting.length > 0) {
        params.set("sort_by", sorting[0].id);
        params.set("sort_order", sorting[0].desc ? "desc" : "asc");
      }

      const res = await api.get(`po-invoices/list?${params.toString()}`);
      if (res.data?.IsSuccess) {
        const rows = (res.data.info || []).map(mapInvoiceApiRow);
        setData(rows);
        const total = res.data.data?.totalItems ?? rows.length;
        setTotalRows(total);
        setPageCount(
          res.data.data?.totalPages ??
            Math.max(1, Math.ceil(total / pagination.pageSize)),
        );
      } else {
        setData([]);
        setTotalRows(0);
        setPageCount(1);
        toast.error(res.data?.message || "Failed to load invoices");
      }
    } catch (error: any) {
      console.error(error);
      setData([]);
      setTotalRows(0);
      setPageCount(1);
      toast.error(error?.response?.data?.message || "Failed to load invoices");
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
    data,
    columns,
    fetchData: fetchInvoices,
    debounceDependencies: [
      search,
      companyId,
      refreshKey,
      JSON.stringify(filters),
      isTableStateReady,
    ],
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    manualSorting: true,
    shouldResetPageOnDebounce: () => {
      if (skipNextDependencyPageResetRef.current) {
        skipNextDependencyPageResetRef.current = false;
        return false;
      }
      return true;
    },
  });

  useEffect(() => {
    if (!tableStateKey) {
      setIsTableStateReady(false);
      restoredTableStateKeyRef.current = "";
      return;
    }
    if (restoredTableStateKeyRef.current === tableStateKey) return;

    const savedState = readInvoicesTableStateCookie(tableStateKey);
    const savedPagination = savedState.pagination;
    const hasSavedState =
      savedState.search !== undefined ||
      savedState.filters !== undefined ||
      savedState.pagination !== undefined;

    skipNextDependencyPageResetRef.current = hasSavedState;
    restoredTableStateKeyRef.current = tableStateKey;

    setSearch(savedState.search ?? "");
    const restoredFilters = normalizeInvoiceFilters(savedState.filters);
    setFilters(restoredFilters);
    setTempFilters(restoredFilters);

    if (
      typeof savedPagination?.pageSize === "number" &&
      PAGE_SIZE_OPTIONS.includes(savedPagination.pageSize)
    ) {
      setPagination({
        pageIndex:
          typeof savedPagination.pageIndex === "number" &&
          savedPagination.pageIndex >= 0
            ? savedPagination.pageIndex
            : 0,
        pageSize: savedPagination.pageSize,
      });
    }

    setIsTableStateReady(true);
  }, [tableStateKey, setPagination]);

  useEffect(() => {
    if (!tableStateKey) return;
    if (restoredTableStateKeyRef.current !== tableStateKey) return;
    if (!isTableStateReady) return;

    Cookies.set(
      tableStateKey,
      JSON.stringify({
        search,
        filters,
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
      COOKIE_OPTIONS,
    );
  }, [
    tableStateKey,
    isTableStateReady,
    search,
    filters,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
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
    return () => window.removeEventListener("resize", checkScroll);
  }, [data, columnVisibility, createOpen]);

  return (
    <PermissionGuard permission="Purchasing">
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
          alignItems={{ sm: "center" }}
        >
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ minWidth: "40px", px: 1 }}
              aria-label="Open filters"
              onClick={() => {
                setTempFilters(filters);
                setFilterOpen(true);
              }}
            >
              <IconFilter width={18} />
            </Button>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            spacing={0}
          >
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                sx={{ marginRight: "5px" }}
                onClick={() => {
                  setInvoicesToArchive(Array.from(selectedRowIds));
                  setConfirmArchiveOpen(true);
                }}
              >
                Archive
              </Button>
            )}
            <IconButton
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
              aria-label="Column visibility"
            >
              <IconEye />
            </IconButton>
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
                sx={{
                  mb: 1,
                  "& .MuiInputBase-root": {
                    borderRadius: 1.5,
                    backgroundColor: "#fff",
                  },
                }}
              />
              <Box
                sx={{
                  maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                <FormGroup sx={{ gap: 0.25 }}>
                  {(() => {
                    const columnOptions = table
                      .getAllLeafColumns()
                      .filter((col: any) => {
                        const excludedColumns = ["actions", "select"];
                        if (excludedColumns.includes(col.id)) return false;
                        const label = getColumnLabel(col);
                        const q = columnSearch.toLowerCase();
                        return (
                          col.id.toLowerCase().includes(q) ||
                          label.toLowerCase().includes(q)
                        );
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
                                e.stopPropagation();
                                columnOptions.forEach((col: any) =>
                                  col.toggleVisibility(e.target.checked),
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.5,
                                mr: 1,
                              }}
                            />
                          }
                          sx={{
                            m: 0,
                            px: 0.75,
                            py: 0.375,
                            width: "100%",
                            borderRadius: 1.5,
                            alignItems: "center",
                            textTransform: "none",
                            borderBottom: "1px solid #eef2f7",
                            mb: 0.25,
                            "&:hover": {
                              backgroundColor: "#f8fafc",
                            },
                            "& .MuiFormControlLabel-label": {
                              fontSize: "14px",
                              lineHeight: 1.35,
                              whiteSpace: "nowrap",
                              fontWeight: 600,
                            },
                          }}
                          onClick={(e) => e.stopPropagation()}
                          label="Select All"
                        />
                        {columnOptions.map((col: any) => (
                          <FormControlLabel
                            key={col.id}
                            control={
                              <CustomCheckbox
                                size="small"
                                checked={col.getIsVisible()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  col.getToggleVisibilityHandler()(e);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.5,
                                  mr: 1,
                                }}
                              />
                            }
                            sx={{
                              m: 0,
                              px: 0.75,
                              py: 0.375,
                              width: "100%",
                              borderRadius: 1.5,
                              alignItems: "center",
                              textTransform: "none",
                              "&:hover": {
                                backgroundColor: "#f8fafc",
                              },
                              "& .MuiFormControlLabel-label": {
                                fontSize: "14px",
                                lineHeight: 1.35,
                                whiteSpace: "nowrap",
                              },
                            }}
                            onClick={(e) => e.stopPropagation()}
                            label={getColumnLabel(col)}
                          />
                        ))}
                      </>
                    );
                  })()}
                </FormGroup>
              </Box>
            </Popover>

            <IconButton
              sx={{ margin: "0px" }}
              id="invoices-menu-button"
              aria-controls={openMenu ? "invoices-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? "true" : undefined}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <IconDotsVertical width={18} />
            </IconButton>
            <Menu
              id="invoices-menu"
              anchorEl={menuAnchor}
              open={openMenu}
              onClose={() => setMenuAnchor(null)}
              slotProps={{
                list: {
                  "aria-labelledby": "invoices-menu-button",
                },
              }}
            >
              <MenuItem onClick={() => setMenuAnchor(null)}>
                <Link
                  underline="none"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    openCreateInvoice();
                  }}
                  style={{
                    width: "100%",
                    color: "#11142D",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  <ListItemIcon>
                    <IconPlus width={18} />
                  </ListItemIcon>
                  Add Invoice
                </Link>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setArchiveListOpen(true);
                }}
              >
                <ListItemIcon>
                  <IconNotes width={18} />
                </ListItemIcon>
                Archived Invoice
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        <Dialog
          open={confirmArchiveOpen}
          onClose={() => setConfirmArchiveOpen(false)}
        >
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              {(() => {
                const labels = invoicesToArchive.map((id) => {
                  const row = data.find((item) => item.id === id);
                  return row?.invoiceId?.trim() || String(id);
                });
                if (labels.length === 1) {
                  return (
                    <>
                      Are you sure you want to archive invoice{" "}
                      <strong>{labels[0]}</strong>?
                    </>
                  );
                }
                return (
                  <>
                    Are you sure you want to archive these invoices:{" "}
                    <strong>{labels.join(", ")}</strong>?
                  </>
                );
              })()}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmArchiveOpen(false)}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const response = await api.post("po-invoices/archive", {
                    invoice_ids: invoicesToArchive.join(","),
                  });
                  toast.success(
                    response.data?.message || "Invoice archived successfully!",
                  );
                  setSelectedRowIds(new Set());
                  setRefreshKey((k) => k + 1);
                } catch (error: any) {
                  toast.error(
                    error?.response?.data?.message ||
                      "Failed to archive invoices",
                  );
                } finally {
                  setConfirmArchiveOpen(false);
                }
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

        <Divider />

        <TableContainer
          ref={tableContainerRef}
          sx={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}
        >
          <Table stickyHeader aria-label="invoices sticky table">
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
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          whiteSpace: "nowrap",
                          bgcolor: "background.paper",
                          ...(header.column.id === "actions" && {
                            minWidth: 120,
                            width: 120,
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 3,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                          ...(header.column.id === "select" && {
                            width: 48,
                            minWidth: 48,
                            maxWidth: 48,
                            px: 0.5,
                          }),
                        }}
                      >
                        <Box
                          onClick={
                            header.column.id === "select"
                              ? undefined
                              : header.column.getToggleSortingHandler()
                          }
                          sx={{
                            cursor:
                              isSortable && header.column.id !== "select"
                                ? "pointer"
                                : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            "&:hover": isSortable
                              ? { color: "#888" }
                              : undefined,
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
                <SkeletonLoader columns={skeletonColumns} rowCount={8} />
              ) : data.length === 0 ? (
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
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
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
                    onClick={() => openEditInvoice(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{
                          whiteSpace: "nowrap",
                          ...(cell.column.id === "actions" && {
                            minWidth: 120,
                            width: 120,
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 1,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                          ...(cell.column.id === "select" && {
                            width: 48,
                            minWidth: 48,
                            maxWidth: 48,
                            px: 0.5,
                          }),
                        }}
                        onClick={
                          cell.column.id === "actions" ||
                          cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
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

        <TablePaginationFooter
          selectedCount={selectedRowIds.size}
          table={table}
          totalRows={totalRows}
        />

        <CreateInvoice
          open={createOpen}
          onClose={closeInvoiceForm}
          mode={formMode}
          invoice={selectedInvoice}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />

        <ArchiveInvoice
          open={archiveListOpen}
          companyId={companyId}
          onClose={() => setArchiveListOpen(false)}
          onWorkUpdated={() => setRefreshKey((k) => k + 1)}
        />

        <Drawer
          anchor="right"
          open={attachmentsOpen}
          onClose={closeInvoiceAttachments}
          PaperProps={{
            sx: { width: { xs: "100%", sm: 420 } },
          }}
        >
          {attachmentsInvoiceId && companyId ? (
            <InvoiceAttachments
              invoiceId={attachmentsInvoiceId}
              companyId={companyId}
              onClose={closeInvoiceAttachments}
            />
          ) : null}
        </Drawer>

        <InvoiceView
          open={viewOpen}
          invoiceId={viewInvoiceId}
          companyId={companyId}
          onClose={closeInvoiceView}
          onEdit={(invoice) => {
            openEditInvoice(invoice);
          }}
        />

        <Menu
          open={shareMenuOpen}
          onClose={closeShareMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            shareMenuPos
              ? {
                  top: shareMenuPos.mouseY + 8,
                  left: shareMenuPos.mouseX - 150,
                }
              : undefined
          }
          PaperProps={{
            sx: {
              minWidth: 180,
              borderRadius: 2,
            },
          }}
        >
          <MenuItem
            disableRipple
            sx={{
              py: 1.5,
              px: 2,
              minWidth: 260,
              cursor: "default",
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <Box width="100%">
              <Box mb={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Sharing Link
                </Typography>
                <Divider sx={{ mt: 1 }} />
              </Box>

              <Box
                onClick={async (e) => {
                  e.stopPropagation();
                  closeShareMenu();
                  if (!shareInvoice) return;
                  try {
                    setShareLoading(true);
                    const docs = await getInvoiceDocuments(shareInvoice);
                    const { subject, body } = buildShareContent(
                      shareInvoice,
                      docs,
                    );
                    if (!docs.some((d) => d.url)) {
                      toast.error("No documents available to share!");
                      return;
                    }
                    window.open(
                      `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
                      "_blank",
                    );
                  } finally {
                    setShareLoading(false);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  cursor: shareLoading ? "wait" : "pointer",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <img src="/gmail.ico" width={22} height={22} alt="gmail" />
                <Typography variant="body2" fontWeight={500}>
                  Gmail
                </Typography>
              </Box>

              <Box
                onClick={async (e) => {
                  e.stopPropagation();
                  closeShareMenu();
                  if (!shareInvoice) return;
                  try {
                    setShareLoading(true);
                    const docs = await getInvoiceDocuments(shareInvoice);
                    const { subject, body } = buildShareContent(
                      shareInvoice,
                      docs,
                    );
                    if (!docs.some((d) => d.url)) {
                      toast.error("No documents available to share!");
                      return;
                    }
                    window.open(
                      `https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${body}`,
                      "_blank",
                    );
                  } finally {
                    setShareLoading(false);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1,
                  py: 1,
                  borderRadius: 2,
                  cursor: shareLoading ? "wait" : "pointer",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <img src="/outlook.ico" width={22} height={22} alt="outlook" />
                <Typography variant="body2" fontWeight={500}>
                  Outlook
                </Typography>
              </Box>

              <Box
                onClick={async (e) => {
                  e.stopPropagation();
                  closeShareMenu();
                  if (!shareInvoice) return;
                  try {
                    setShareLoading(true);
                    const docs = await getInvoiceDocuments(shareInvoice);
                    const urls = docs.map((d) => d.url).filter(Boolean);
                    if (!urls.length) {
                      toast.error("No documents available to download!");
                      return;
                    }
                    urls.forEach((url) => {
                      window.open(
                        url as string,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    });
                  } catch (error) {
                    console.error(error);
                    toast.error("Failed to download documents!");
                  } finally {
                    setShareLoading(false);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1,
                  py: 1,
                  mt: 0.5,
                  borderRadius: 2,
                  cursor: shareLoading ? "wait" : "pointer",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
              >
                <IconDownload size={20} color="#1976d2" />
                <Typography variant="body2" fontWeight={500}>
                  Download
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        </Menu>

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
                freeSolo
                options={projects}
                getOptionLabel={(option) =>
                  typeof option === "string" ? option : option.name || ""
                }
                getOptionKey={(option) =>
                  typeof option === "string" ? option : String(option.id)
                }
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === "string" || typeof value === "string") {
                    return (
                      (typeof option === "string" ? option : option.name) ===
                      (typeof value === "string" ? value : value.name)
                    );
                  }
                  return String(option.id) === String(value?.id);
                }}
                value={
                  tempFilters.project_id
                    ? projects.find(
                        (p) => String(p.id) === String(tempFilters.project_id),
                      ) || null
                    : tempFilters.project_manual || null
                }
                onChange={(_, value) => {
                  if (typeof value === "string") {
                    const match = projects.find(
                      (p) =>
                        p.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    setTempFilters({
                      ...tempFilters,
                      project_id: match ? match.id : "",
                      project_manual: match ? "" : value,
                      address_id: "",
                    });
                    return;
                  }
                  if (value && typeof value === "object") {
                    setTempFilters({
                      ...tempFilters,
                      project_id: value.id,
                      project_manual: "",
                      address_id: "",
                    });
                    return;
                  }
                  setTempFilters({
                    ...tempFilters,
                    project_id: "",
                    project_manual: "",
                    address_id: "",
                  });
                }}
                onInputChange={(_, value, reason) => {
                  if (reason !== "input") return;
                  const match = projects.find(
                    (p) => p.name.toLowerCase() === value.trim().toLowerCase(),
                  );
                  setTempFilters((prev) => ({
                    ...prev,
                    project_id: match ? match.id : "",
                    project_manual: match ? "" : value,
                    address_id: "",
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Project"
                    placeholder="Select or type project"
                    fullWidth
                  />
                )}
              />
              <Autocomplete
                options={filteredAddressOptions}
                getOptionLabel={(option) => option.name || ""}
                getOptionKey={(option) => String(option.id)}
                isOptionEqualToValue={(option, value) =>
                  String(option.id) === String(value?.id)
                }
                value={
                  filteredAddressOptions.find(
                    (a) => String(a.id) === String(tempFilters.address_id),
                  ) || null
                }
                onChange={(_, value) =>
                  setTempFilters({
                    ...tempFilters,
                    address_id: value ? value.id : "",
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Address" fullWidth />
                )}
              />
              <Autocomplete
                options={orderedByOptions}
                getOptionLabel={(option) => option.name || ""}
                getOptionKey={(option) => String(option.id)}
                isOptionEqualToValue={(option, value) =>
                  String(option.id) === String(value?.id)
                }
                value={
                  orderedByOptions.find(
                    (u) => String(u.id) === String(tempFilters.ordered_by),
                  ) || null
                }
                onChange={(_, value) =>
                  setTempFilters({
                    ...tempFilters,
                    ordered_by: value ? value.id : "",
                  })
                }
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props as any;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...optionProps}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Avatar
                        src={
                          option.user_thumb_image ||
                          option.user_image ||
                          "/images/users/user.png"
                        }
                        alt={option.name}
                        sx={{ width: 28, height: 28, fontSize: "12px" }}
                      >
                        {option.name?.[0]?.toUpperCase()}
                      </Avatar>
                      <Typography component="span" variant="body2">
                        {option.name}
                      </Typography>
                    </Box>
                  );
                }}
                renderInput={(params) => {
                  const selected = orderedByOptions.find(
                    (u) => String(u.id) === String(tempFilters.ordered_by),
                  );
                  return (
                    <TextField
                      {...params}
                      label="Ordered By"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: selected ? (
                          <>
                            <Avatar
                              src={
                                selected.user_thumb_image ||
                                selected.user_image ||
                                "/images/users/user.png"
                              }
                              alt={selected.name}
                              sx={{
                                width: 24,
                                height: 24,
                                fontSize: "11px",
                                ml: 0.5,
                                mr: 0.5,
                              }}
                            >
                              {selected.name?.[0]?.toUpperCase()}
                            </Avatar>
                            {params.InputProps.startAdornment}
                          </>
                        ) : (
                          params.InputProps.startAdornment
                        ),
                      }}
                    />
                  );
                }}
              />
              <Autocomplete
                options={suppliers}
                getOptionLabel={(option) => option.name || ""}
                getOptionKey={(option) => String(option.id)}
                isOptionEqualToValue={(option, value) =>
                  String(option.id) === String(value?.id)
                }
                value={
                  suppliers.find(
                    (s) => String(s.id) === String(tempFilters.supplier_id),
                  ) || null
                }
                onChange={(_, value) =>
                  setTempFilters({
                    ...tempFilters,
                    supplier_id: value ? value.id : "",
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Supplier" fullWidth />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setTempFilters(defaultFilters);
                setFilters(defaultFilters);
                setFilterOpen(false);
                setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setFilters(tempFilters);
                setFilterOpen(false);
                setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default InvoiceList;
