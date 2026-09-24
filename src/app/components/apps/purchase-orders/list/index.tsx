"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  readListingTableState,
  writeListingTableState,
} from "@/utils/listingTableStateStorage";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  Typography,
  Box,
  Grid,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Menu,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import {
  IconDownload,
  IconEye,
  IconFileInvoice,
  IconFileSignal,
  IconFilter,
  IconMenuOrder,
  IconNotes,
  IconSearch,
  IconShare,
  IconShoppingCartCancel,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Link from "next/link";
import { IconDotsVertical } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import PermissionGuard from "@/app/auth/PermissionGuard";
import PurchaseProductList from "../products";
import PurchaseOrder from "../create";
import ArchivePurchaseOrder from "../archive";
import DraftPurchaseOrder from "../drafts";
import PurchaseOrderHistory from "../history";
import TermsAndConditions from "../terms-conditions";
import { IconHelp } from "@tabler/icons-react";
import CancelOrder from "../cancel-orders";
import OtherProductsDrawer from "../other-products";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import ColumnVisibilityPopover from "@/app/components/common/ColumnVisibilityPopover";
import ListConfirmDialog from "@/app/components/common/ListConfirmDialog";
import PurchaseOrderFiltersDialog from "./filters-dialog";
import DeliveryDateDialog from "./delivery-date-dialog";
import InvoicePreviewDialog from "./invoice-preview-dialog";

dayjs.extend(customParseFormat);

interface TableRow {
  id: number;
  expected_delivery_date?: string;
}

type PurchaseOrderFilters = {
  status: string;
};

type PurchaseOrdersTableCookieState = {
  searchTerm?: string;
  filters?: Partial<PurchaseOrderFilters>;
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
  };
};

const DEFAULT_PURCHASE_ORDER_FILTERS: PurchaseOrderFilters = { status: "" };

const getPurchaseOrdersTableStateKey = (
  userId?: number | string,
  companyId?: number | string | null,
) =>
  userId && companyId
    ? `purchase_orders_table_state_${userId}_${companyId}`
    : "";

const normalizePurchaseOrderStatus = (value?: string | number | null) => {
  if (
    value === undefined ||
    value === null ||
    value === "all" ||
    value === "All"
  ) {
    return "";
  }
  return String(value);
};

const normalizePurchaseOrderFilters = (
  filters?: Partial<PurchaseOrderFilters> | Record<string, string | number>,
): PurchaseOrderFilters => ({
  status: normalizePurchaseOrderStatus(filters?.status),
});

const readPurchaseOrdersTableStateCookie = (
  cookieKey: string,
): PurchaseOrdersTableCookieState => {
  try {
    const stored = readListingTableState(cookieKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const PurchaseOrderList = () => {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fetchStore, setFetchStore] = useState<boolean>(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: number | string;
  };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_purchase_orders`,
      enabled: !!user?.id,
    });

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openCancelOrder, setOpenCancelOrder] = useState(false);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openOtherProductsDrawer, setOpenOtherProductsDrawer] = useState(false);
  const [openConditionDrawer, setOpenConditionDrawer] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [selectedRow, setSelectedRow] = React.useState<TableRow | null>(null);
  const [selectedRow2, setSelectedRow2] = useState<any>(null);

  const [singleDate, setSingleDate] = React.useState<Date | undefined>(
    undefined,
  );
  const [archivePurchaseList, setArchivePurchaseList] =
    useState<boolean>(false);
  const [draftPurchaseList, setDraftPurchaseList] = useState<boolean>(false);

  const [email, setEmail] = useState("");

  const [menuPos, setMenuPos] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const menuOpen = Boolean(menuPos);

  const handleCloseMenu = () => {
    setMenuPos(null);
    setSelectedRow2(null);
  };

  function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const parseDDMMYYYY = (dateString: string | null) => {
    if (!dateString) return undefined;

    const [day, month, year] = dateString.split("/");
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const handleOpenModal = (row: TableRow) => {
    setSelectedRow(row);
    setSingleDate(
      row.expected_delivery_date
        ? parseDDMMYYYY(row.expected_delivery_date)
        : undefined,
    );
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRow(null);
  };
  const [purchaseOrder, setPurchaseOrder] = useState<any | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<PurchaseOrderFilters>(
    DEFAULT_PURCHASE_ORDER_FILTERS,
  );
  const [tempFilters, setTempFilters] = useState(filters);
  const purchaseOrdersTableStateKey = useMemo(
    () => getPurchaseOrdersTableStateKey(user?.id, user?.company_id),
    [user?.id, user?.company_id],
  );
  const restoredTableStateKeyRef = useRef("");
  const skipNextDependencyPageResetRef = useRef(false);
  const [isTableStateReady, setIsTableStateReady] = useState(false);
  const [formData, setFormData] = useState({
    company_id: Number(user?.company_id),
    order_id: "",
    checked_product: false,
    supplier_id: "",
    id: 0,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const updateExpectedDate = async (rowId: number, date: any) => {
    try {
      const res = await api.post("purchase-orders/change-delivery-date", {
        id: rowId,
        date: date,
      });
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchOrders();
      }
    } catch (error) {
      console.error("Date update failed", error);
    }
  };

  // Fetch data
  const fetchOrders = async () => {
    if (!user?.company_id || !isTableStateReady) return;
    setFetchStore(true);
    try {
      const queryParams = new URLSearchParams({
        company_id: String(user?.company_id || ""),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });

      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }

      if (filters.status && filters.status !== "all") {
        queryParams.append("status", filters.status);
      }

      if (sorting.length > 0) {
        queryParams.append("sort_by", sorting[0].id);
        queryParams.append("sort_order", sorting[0].desc ? "desc" : "asc");
      }

      const res = await api.get(
        `purchase-orders/get?${queryParams.toString()}`,
      );
      if (res.data) {
        setData(res.data.info);
        setTotalRows(res.data?.data?.totalItems);
        setPageCount(res.data?.data?.totalPages || 1);
        setEmail(res.data.info?.[0]?.supplier_email || "");
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setFetchStore(false);
  };

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  } = useServerTable({
    data,
    columns: [],
    fetchData: fetchOrders,
    debounceDependencies: [
      searchTerm,
      filters,
      user?.company_id,
      isTableStateReady,
    ],
    state: { columnVisibility },
    onColumnVisibilityChange,
    shouldResetPageOnDebounce: () => {
      return !skipNextDependencyPageResetRef.current;
    },
  });

  useEffect(() => {
    if (!purchaseOrdersTableStateKey) {
      setIsTableStateReady(false);
      restoredTableStateKeyRef.current = "";
      return;
    }
    if (restoredTableStateKeyRef.current === purchaseOrdersTableStateKey)
      return;

    const savedState = readPurchaseOrdersTableStateCookie(
      purchaseOrdersTableStateKey,
    );
    const savedPagination = savedState.pagination;
    const hasSavedState =
      savedState.searchTerm !== undefined ||
      savedState.filters !== undefined ||
      savedState.pagination !== undefined;

    skipNextDependencyPageResetRef.current = hasSavedState;
    restoredTableStateKeyRef.current = purchaseOrdersTableStateKey;

    setSearchTerm(savedState.searchTerm ?? "");
    const restoredFilters = normalizePurchaseOrderFilters(savedState.filters);
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
  }, [purchaseOrdersTableStateKey, setPagination]);

  useEffect(() => {
    if (!purchaseOrdersTableStateKey || !isTableStateReady) return;
    if (restoredTableStateKeyRef.current !== purchaseOrdersTableStateKey)
      return;

    writeListingTableState(
      purchaseOrdersTableStateKey,
      JSON.stringify({
        searchTerm,
        filters: normalizePurchaseOrderFilters(filters),
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    );
  }, [
    purchaseOrdersTableStateKey,
    isTableStateReady,
    searchTerm,
    filters,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const hasActiveFilters = Boolean(
    filters.status && filters.status !== "all" && filters.status !== "All",
  );

  const handleClearAppliedFilters = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    skipNextDependencyPageResetRef.current = false;
    setTempFilters(DEFAULT_PURCHASE_ORDER_FILTERS);
    setFilters(DEFAULT_PURCHASE_ORDER_FILTERS);
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  };

  useEffect(() => {
    // Initial fetch is handled by useServerTable
  }, [api]);

  const handleCancelOrder = useCallback((id: number) => {
    setSelectedId(id);
    setOpenCancelOrder(true);
  }, []);

  const handleOpenCreateDrawer = () => {
    setFormData({
      company_id: Number(user?.company_id),
      order_id: "",
      checked_product: false,
      supplier_id: "",
      id: 0,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent, is_draft = false) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = new FormData();
      const submissionData = { ...formData, is_draft };

      Object.entries(submissionData).forEach(([key, value]) => {
        if (key === "product_data") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value ?? ""));
        }
      });

      const result = await api.post("purchase-orders/create", submissionData);

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        setSelectedRowIds(new Set());
        setProductDrawerOpen(false);
        fetchOrders();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const editOrder = async (e: React.FormEvent, is_draft = false) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = new FormData();
      const submissionData = { ...formData, is_draft };

      Object.entries(submissionData).forEach(([key, value]) => {
        if (key === "product_data") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value ?? ""));
        }
      });
      const result = await api.post("purchase-orders/update", submissionData);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          company_id: Number(user?.company_id),
          order_id: "",
          checked_product: false,
          supplier_id: "",
          id: 0,
        });
        setEditDrawerOpen(false);
        setSelectedRowIds(new Set());
        fetchOrders();
      } else {
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
    setSelectedRowIds(new Set());
  };

  const handlePreview = async (orderId: number) => {
    try {
      setLoading(true);

      const res = await api.get(
        `purchase-orders/get?company_id=${user.company_id}&id=${orderId}`,
      );

      let purchaseOrder = res.data?.info?.[0];

      if (purchaseOrder && !purchaseOrder.invoice) {
        await api.post(
          `purchase-orders/invoice?company_id=${user.company_id}&id=${orderId}`,
        );
        const refetchRes = await api.get(
          `purchase-orders/get?company_id=${user.company_id}&id=${orderId}`,
        );
        purchaseOrder = refetchRes.data?.info?.[0];
      }

      if (res.data.IsSuccess) {
        setPurchaseOrder(purchaseOrder);
        setOpen(true);
      }
    } catch (error) {
      console.error("Invoice generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = useCallback((item: any) => {
    setSelectedPurchaseOrder(item);
    setEditDrawerOpen(true);
  }, []);

  const selectedProductsWithQty = useMemo(() => {
    return data
      .filter(
        (item) => selectedRowIds.has(item.id) && Number(item.total_qty) > 0,
      )
      .map((item) => ({
        id: item.id,
        qty: Number(item.total_qty),
        supplier_id: Number(item.supplier_id),
      }));
  }, [data, selectedRowIds]);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

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
  }, [data, drawerOpen, editDrawerOpen, productDrawerOpen]);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size > 0 && selectedRowIds.size >= data.length
            }
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
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

    columnHelper.accessor("created_date", {
      id: "orderDate",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit" width={70}>
            Order Date
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3, ml: 1 }}
          >
            <Typography textTransform="capitalize" className="f-14">
              {item.created_date ? item.created_date : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("order_id", {
      id: "orderId",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography
            variant="subtitle2"
            fontWeight="inherit"
            sx={{ whiteSpace: "nowrap" }}
          >
            Order ID
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3, ml: 1 }}
          >
            <Tooltip title={item.order_id ? item.order_id : ""}>
              <Typography
                textTransform="capitalize"
                className="f-14"
                sx={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.order_id ? item.order_id : "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("receive_by_name", {
      id: "receivedBy",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography
            variant="subtitle2"
            fontWeight="inherit"
            sx={{ whiteSpace: "nowrap" }}
          >
            Received By
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3, ml: 1 }}
          >
            <Typography textTransform="capitalize" className="f-14">
              {item.receive_by_name ? item.receive_by_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.order_qty, {
      id: "orderQty",
      header: () => "Order QTY",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" ml={1} width={85}>
            <Typography textTransform="capitalize" className="f-14">
              {item.order_qty ? item.order_qty : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.receive_qty, {
      id: "receiveQty",
      header: () => "Receive QTY",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" ml={1} width={100}>
            <Typography textTransform="capitalize" className="f-14">
              {item.receive_qty ? item.receive_qty : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.store_name, {
      id: "deliveryAddress",
      header: () => (
        <Typography
          variant="subtitle2"
          fontWeight="inherit"
          sx={{ whiteSpace: "nowrap" }}
        >
          Delivery address
        </Typography>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ whiteSpace: "nowrap" }}
          >
            <Typography
              textTransform="capitalize"
              className="f-14"
              ml={1}
              sx={{ whiteSpace: "nowrap" }}
            >
              {item.store_name ? item.store_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.supplier_name, {
      id: "supplier",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2">Supplier</Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={4} ml={1}>
            <Box
              sx={{
                px: 1,
                py: 0.5,
              }}
            >
              <Tooltip title={item.supplier_name || ""}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.supplier_name || "-"}
                </Typography>
              </Tooltip>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.expected_delivery_date, {
      id: "expectedDeliveryDate",
      header: () => (
        <Stack
          direction="row"
          alignItems="center"
          spacing={4}
          sx={{ whiteSpace: "nowrap" }}
        >
          <Typography variant="subtitle2">Expect Delivery Date</Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isShow = item.status !== 4 && item.status !== 5;

        return (
          <Stack direction="row" alignItems="center" spacing={4} ml={1}>
            <Box
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(item);
              }}
              sx={{
                minWidth: 50,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid transparent",
                transition: "all 0.2s ease",
                "&:hover": isShow ? { border: "1px solid #1976d2" } : {},
                opacity: isShow ? 1 : 0.5,
                pointerEvents: isShow ? "" : "none",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: 14,
                  display: "flex",
                  textAlign: "center",
                  color: item.expected_delivery_date
                    ? "inherit"
                    : "text.secondary",
                }}
              >
                {item.date_label && (
                  <Typography mr={1}>
                    <Tooltip
                      title={item.dates}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconHelp size={16} />
                    </Tooltip>
                  </Typography>
                )}
                {item.expected_delivery_date || "Select Date"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.status_text, {
      id: "status",
      header: () => "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
            <Typography
              className="f-14"
              color={item.status_color}
              fontWeight={500}
            >
              {item.status_text ? item.status_text : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.ref, {
      id: "ref",
      header: () => "Ref",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
            <Tooltip title={item.ref ? item.ref : ""} placement="top" arrow>
              <Typography
                className="f-14"
                fontWeight={500}
                sx={{
                  maxWidth: 100,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.ref ? item.ref : "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" display={"flex"}>
            <IconButton
              color="primary"
              // disabled={!item.supplier_email}
              onClick={(e) => {
                e.stopPropagation();

                setSelectedRow2(item);

                setMenuPos({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                });
              }}
            >
              <IconShare size={18} />
            </IconButton>

            <Menu
              open={menuOpen}
              onClose={handleCloseMenu}
              anchorReference="anchorPosition"
              anchorPosition={
                menuPos
                  ? {
                      top: menuPos.mouseY + 8,
                      left: menuPos.mouseX - 150,
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
                  {/* Header */}
                  <Box mb={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Sharing Link
                    </Typography>
                    <Divider sx={{ mt: 1 }} />
                  </Box>

                  {/* Gmail */}
                  <Box
                    onClick={async (e) => {
                      e.stopPropagation();
                      handleCloseMenu();

                      if (!selectedRow2) return;

                      try {
                        setLoading(true);

                        let invoice = selectedRow2.invoice;
                        if (!invoice) {
                          const res = await api.post(
                            `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                          );

                          if (!res.data?.IsSuccess) return;

                          invoice = res.data?.invoice || "";
                        }

                        if (!invoice) return;

                        const subject = encodeURIComponent(
                          `Invoice #${selectedRow2.order_id}`,
                        );

                        const body = encodeURIComponent(`
Please find your invoice below.

Invoice No: ${selectedRow2.order_id}

Download Invoice:
${invoice}

Best regards,
Team Belcka
`);

                        window.open(
                          `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedRow2.supplier_email}&su=${subject}&body=${body}`,
                          "_blank",
                        );
                      } finally {
                        setLoading(false);
                      }
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 1,
                      py: 1,
                      borderRadius: 2,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <img src="/gmail.ico" width={22} height={22} alt="gmail" />
                    <Typography variant="body2" fontWeight={500}>
                      Gmail
                    </Typography>
                  </Box>

                  {/* Outlook */}
                  <Box
                    onClick={async (e) => {
                      e.stopPropagation();
                      handleCloseMenu();

                      if (!selectedRow2) return;

                      try {
                        setLoading(true);

                        let invoice = selectedRow2.invoice;
                        if (!invoice) {
                          const res = await api.post(
                            `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                          );

                          if (!res.data?.IsSuccess) return;

                          invoice = res.data?.invoice || "";
                        }

                        if (!invoice) return;

                        const subject = encodeURIComponent(
                          `Invoice #${selectedRow2.order_id}`,
                        );

                        const body = encodeURIComponent(`
Please find your invoice below.

Invoice No: ${selectedRow2.order_id}

Download Invoice:
${invoice}

Best regards,
Team Belcka
`);

                        // ✅ Outlook link
                        const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${selectedRow2.supplier_email}&subject=${subject}&body=${body}`;

                        window.open(outlookUrl, "_blank");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 1,
                      py: 1,
                      borderRadius: 2,
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <img
                      src="/outlook.ico"
                      width={22}
                      height={22}
                      alt="outlook"
                    />
                    <Typography variant="body2" fontWeight={500}>
                      Outlook
                    </Typography>
                  </Box>
                  {/* Download */}
                  <Box
                    onClick={async (e) => {
                      e.stopPropagation();
                      handleCloseMenu();

                      if (!selectedRow2) return;

                      try {
                        setLoading(true);

                        let invoiceUrl = selectedRow2.invoice;
                        if (!invoiceUrl) {
                          const res = await api.post(
                            `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                          );

                          if (!res.data?.IsSuccess) return;

                          invoiceUrl = res.data?.invoice || "";
                        }

                        if (!invoiceUrl) return;

                        window.open(
                          invoiceUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } catch (error) {
                        console.error(error);
                      } finally {
                        setLoading(false);
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
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
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

            <IconButton
              color="primary"
              disabled={
                item.purchase_orders.length <= 0 &&
                !item.purchase_orders.some(
                  (cancel: any) => cancel.cancel_orders,
                ) &&
                item.status !== 4
              }
              onClick={(e) => {
                e.stopPropagation();
                handleCancelOrder(item.id);
              }}
            >
              <IconShoppingCartCancel size={18} />
            </IconButton>

            {item.status !== 5 && item.status !== 4 && (
              <Button
                href={`/apps/receive-orders/${item.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                View
              </Button>
            )}
          </Stack>
        );
      },
    }),
  ];

  table.setOptions((prev: any) => ({
    ...prev,
    columns,
  }));

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Purchasing">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <InvoicePreviewDialog
          open={open}
          onClose={() => setOpen(false)}
          loading={loading}
          purchaseOrder={purchaseOrder}
        />

        {/* Render the search and table */}
        <Stack
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Grid display="flex" gap={1} alignItems={"center"}>
            <TextField
              id="search"
              type="text"
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                skipNextDependencyPageResetRef.current = false;
                setSearchTerm(e.target.value);
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size={"16"} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="contained"
              onClick={() => {
                setTempFilters(normalizePurchaseOrderFilters(filters));
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
                onClick={handleClearAppliedFilters}
                sx={{
                  mt: { xs: 1, sm: 0 },
                  minHeight: 34,
                  height: 34,
                  minWidth: 64,
                  px: 1.5,
                }}
                aria-label="Clear filters"
              >
                <IconX size={18} />
              </Button>
            )}

            <PurchaseOrderFiltersDialog
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              normalizeStatus={normalizePurchaseOrderStatus}
              onClear={() => {
                handleClearAppliedFilters();
                setFilterOpen(false);
              }}
              onApply={() => {
                skipNextDependencyPageResetRef.current = false;
                setFilters(normalizePurchaseOrderFilters(tempFilters));
                setPagination((prev) =>
                  prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
                );
                setFilterOpen(false);
              }}
            />
          </Grid>
          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            <Button
              color="primary"
              variant="outlined"
              size="small"
              onClick={() => setOpenDrawer(true)}
              sx={{
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
                mr: 1,
              }}
            >
              Activity
            </Button>
            {selectedRowIds.size > 0 && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
                  sx={{ marginRight: "5px" }}
                  onClick={() => {
                    const selectedIds = Array.from(selectedRowIds);
                    setUsersToDelete(selectedIds);
                    setConfirmOpen(true);
                  }}
                >
                  Archive
                </Button>
              </>
            )}

            <IconButton
              onClick={(event) => setAnchorEl2(event.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            <ColumnVisibilityPopover
              open={Boolean(anchorEl2)}
              anchorEl={anchorEl2}
              onClose={() => setAnchorEl2(null)}
              table={table}
              excludedColumns={["conflicts", "select"]}
            />
            <ListConfirmDialog
              open={confirmOpen}
              title="Confirm Deletion"
              message={`Are you sure you want to archive ${usersToDelete.length} order product${usersToDelete.length > 1 ? "s" : ""} from the orders?`}
              confirmLabel="Archive"
              onClose={() => setConfirmOpen(false)}
              onConfirm={async () => {
                try {
                  const payload = {
                    order_ids: usersToDelete.join(","),
                  };
                  const response = await api.post(
                    "purchase-orders/archive",
                    payload,
                  );
                  toast.success(response.data.message);
                  setSelectedRowIds(new Set());
                  await fetchOrders();
                } catch (error) {
                } finally {
                  setConfirmOpen(false);
                }
              }}
            />
            <IconButton
              sx={{ margin: "0px" }}
              id="basic-button"
              aria-controls={openMenu ? "basic-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={openMenu ? "true" : undefined}
              onClick={handleClick}
            >
              <IconDotsVertical width={18} />
            </IconButton>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleClose}
              slotProps={{
                list: {
                  "aria-labelledby": "basic-button",
                },
              }}
            >
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setProductDrawerOpen(true);
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
                  Add Purchase Order
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenOtherProductsDrawer(true);
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
                  Add Products
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchivePurchaseList(true);
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
                    <IconNotes width={18} />
                  </ListItemIcon>
                  Archived Purchase Order
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setDraftPurchaseList(true);
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
                    <IconMenuOrder width={18} />
                  </ListItemIcon>
                  Draft Purchase Orders
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenConditionDrawer(true);
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
                    <IconFileSignal width={18} />
                  </ListItemIcon>
                  Terms and Conditions
                </Link>
              </MenuItem>
              {/* <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="/apps/invoices/list"
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
                    <IconFileInvoice width={18} />
                  </ListItemIcon>
                  Invoices
                </Link>
              </MenuItem> */}
            </Menu>
          </Stack>
        </Stack>
        <Divider />
        <PurchaseOrder
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ids={selectedProductsWithQty}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
          mode="create"
        />
        <PurchaseOrder
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          ids={selectedProductsWithQty}
          handleSubmit={editOrder}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
          mode="edit"
          editData={selectedPurchaseOrder}
        />
        <PurchaseProductList
          open={productDrawerOpen}
          onClose={() => setProductDrawerOpen(false)}
          ids={selectedProductsWithQty}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
          mode="create"
          onDraftSaved={fetchOrders}
        />

        {/* Archive Product List */}
        <ArchivePurchaseOrder
          open={archivePurchaseList}
          companyId={Number(user.company_id)}
          onClose={() => setArchivePurchaseList(false)}
          onWorkUpdated={fetchOrders}
        />

        <DraftPurchaseOrder
          open={draftPurchaseList}
          companyId={Number(user.company_id)}
          onClose={() => setDraftPurchaseList(false)}
          onWorkUpdated={fetchOrders}
          onEditOrder={handleEdit}
        />

        <PurchaseOrderHistory
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
        />

        <TermsAndConditions
          open={openConditionDrawer}
          onClose={() => setOpenConditionDrawer(false)}
          companyId={user.company_id ?? null}
        />

        <CancelOrder
          open={openCancelOrder}
          onClose={() => setOpenCancelOrder(false)}
          companyId={user.company_id ?? null}
          id={selectedId}
        />

        <OtherProductsDrawer
          open={openOtherProductsDrawer}
          onClose={() => setOpenOtherProductsDrawer(false)}
          companyId={user.company_id ?? null}
        />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <TableContainer ref={tableContainerRef}>
            <Table stickyHeader aria-label="sticky table">
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
                            width:
                              header.column.id === "select"
                                ? 30
                                : header.column.id === "shortName"
                                  ? 400
                                  : "auto",
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
                {fetchStore ? (
                  <SkeletonLoader
                    columns={simpleColumns}
                    rowCount={simpleColumns.length}
                  />
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
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                          }}
                          width={200}
                          height={200}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => {
                    const item = row.original;
                    return (
                      <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
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
                            onClick={() => {
                              handleEdit(item);
                            }}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {data.length ? <Divider /> : <></>}
        </Box>
        <Divider />
        <TablePaginationFooter
          selectedCount={
            typeof selectedRowIds !== "undefined"
              ? selectedRowIds.size
              : undefined
          }
          table={table}
          totalRows={totalRows}
        />

        <DeliveryDateDialog
          open={modalOpen}
          selectedDate={singleDate}
          onClose={handleCloseModal}
          onSave={async (date) => {
            if (selectedRow) {
              const formattedDate = formatDateLocal(date);
              await updateExpectedDate(selectedRow.id, formattedDate);
              handleCloseModal();
            }
          }}
        />
      </Box>
    </PermissionGuard>
  );
};

export default PurchaseOrderList;
