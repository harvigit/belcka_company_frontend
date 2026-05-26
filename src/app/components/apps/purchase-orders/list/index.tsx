"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  Menu,
  ListItemIcon,
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Paper,
  ListItemText,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import {
  IconBasketCancel,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconEye,
  IconFileSignal,
  IconFilter,
  IconNotes,
  IconSearch,
  IconShare,
  IconShoppingCartCancel,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
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
import { DayPicker } from "react-day-picker";
import { styled } from "@mui/material/styles";
import ArchivePurchaseOrder from "../archive";
import PurchaseOrderHistory from "../history";
import TermsAndConditions from "../terms-conditions";
import { IconHelp } from "@tabler/icons-react";
import CancelOrder from "../cancel-orders";

dayjs.extend(customParseFormat);

const StyledDayPicker = styled(Box)(({ theme }) => ({
  "& .rdp": {
    "--rdp-cell-size": "36px",
    "--rdp-accent-color": "#50ABFF",
    "--rdp-background-color": "#e6f3ff",
    "--rdp-selected-color": "#fff",
    "--rdp-selected-background": "#50ABFF",
    "--rdp-today-background": "#f0f0f0",
    fontSize: "14px",
    padding: theme.spacing(1),
    backgroundColor: "#fff",
  },
  "& .rdp-day": {
    borderRadius: "4px",
  },
  "& .rdp-day_selected": {
    backgroundColor: "#50ABFF",
    color: "#fff",
  },
  "& .rdp-day:hover": {
    backgroundColor: "#e6f3ff",
  },
}));

interface TableRow {
  id: number;
  expected_delivery_date?: string;
}

const PurchaseOrderList = () => {
  const [data, setData] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [openCancelOrder, setOpenCancelOrder] = useState(false);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openConditionDrawer, setOpenConditionDrawer] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [selectedRow, setSelectedRow] = React.useState<TableRow | null>(null);
  const [selectedRow2, setSelectedRow2] = useState<any>(null);

  const [singleDate, setSingleDate] = React.useState<Date | undefined>(
    undefined,
  );
  const [archivePurchaseList, setArchivePurchaseList] =
    useState<boolean>(false);

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
  const [anchorEl3, setAnchorEl3] = useState<null | HTMLElement>(null);

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
  const [filters, setFilters] = useState({
    status: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);
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
    setFetchStore(true);
    try {
      const res = await api.get(
        `purchase-orders/get?company_id=${user.company_id}`,
      );
      if (res.data) {
        setData(res.data.info);
        setEmail(res.data.info.supplier_email);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setFetchStore(false);
  };

  useEffect(() => {
    fetchOrders();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "product_data") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value ?? ""));
        }
      });

      const result = await api.post("purchase-orders/create", formData);

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

  const editOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "product_data") {
          payload.append(key, JSON.stringify(value));
        } else {
          payload.append(key, String(value ?? ""));
        }
      });
      const result = await api.post("purchase-orders/update", formData);
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

      const response = await api.post(
        `purchase-orders/invoice?company_id=${user.company_id}&id=${orderId}`,
      );

      const res = await api.get(
        `purchase-orders/get?company_id=${user.company_id}&id=${orderId}`,
      );
      if (response.data.IsSuccess && res.data.IsSuccess) {
        setPurchaseOrder(res.data.info[0]);
        setOpen(true);
      }
    } catch (error) {
      console.error("Invoice generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!purchaseOrder) return;

    const divContents = document.getElementById("purchase-order-preview");
    if (!divContents) return;

    const printWindow = window.open("", "_blank", "height=800,width=800");
    if (!printWindow) return;

    printWindow.document.write(
      "<html lang='en'><head><title>Purchase Order</title>",
    );

    printWindow.document.write(`
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #000;
        margin: 20px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
      }
      th {
        background-color: #f2f2f2;
        text-align: left;
      }
      .company-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .company-logo {
        width: 100px;
        height: auto;
      }

      .amount-section {
        width: 30%;
        margin-left: auto;
        border: 1px solid #e9e9e9;
        padding: 10px;
      }
      .amount-section div {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      @media print {
        @page { size: A4; margin: 0.5in; }
      }
      .purchase-order {
        padding: 2rem !important;
      }
      .print-order .card-body{
        padding: 0 !important;
        color: #000;
      }

      .company-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .company-logo {
        max-width: 100px;
        height: auto;
      }

      .company-details {
        text-align: right;
      }

      .company-details h1 {
        margin: 0;
        font-size: 20px;
      }

      .company-details p {
        margin: 5px 0 0;
        font-size: 14px;
      }

      .purchase-order {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
      }

      h4 {
        font-size: 27px;
        text-align: center;
        margin-bottom: 10px;
        color: #000;
        margin-top: 0;
      }

      .sub-header {
        color: #000;
        text-align: center;
        font-size: 13px;
        margin-bottom: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        border: 1px solid #ddd;
      }

      th, td {
        padding: 8px;
        text-align: left;
      }
      .order-table{
          .font-14 {
            font-size: 14px !important;
            margin: 2px !important;
          }

          .font-12 {
            color: #777e89;
            font-size: 12px !important;
          }
      }
      .order-table thead th{
        padding: 5px !important;
      }

      .order-table tbody td{
        padding: 5px !important;
      }

      th {
        background-color: #f2f2f2;
      }

      .to-address {
        width: 48%;
        margin-left: 32px;

        h5{
          margin: 0px !important;
          margin-bottom: 5px !important;
        }
      }
      .delivery-address {
        width: 48%;
        h5{
          margin: 0px !important;
          margin-bottom: 5px !important;
        }
      }

      .company-details h5{
        margin: 0.5rem 0;    
      }

      h5{
        color: #000;
        font-weight: 400;
      }
      .address_wrapper {
        border: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        margin-bottom: 10px;
        padding-top: 16px;
        padding-bottom : 16px;
      }

      .info_wrapper {
        border: 1px solid #ddd;
      }

      .info-table {
        width: 33.33%;
        display: flex;
        gap: 6px;
        padding: 2px 5px !important;

        p {
          margin: 3px !important;
        }
      }

      .address-table  {
        width: 50%;
        vertical-align: top;
      }

      .font-size-13{
        font-size: 13px;
        margin: 0;
      }

      .text-right {
        text-align: right;
      }

      .alert-text{
        color: crimson;
        margin-bottom: 10px;
      }

      .description-col{
        width: 50%;
      }

      .qty-col{
        text-align: center;
        width: 10%;
      }

      .rate-col{
        text-align: right;
        width: 15%;
      }

      .line-total-col{
        text-align: right;
        width: 15%;
      }

      .sub-total-col{
        text-align: right;
        border: 1px solid #ddd;
      }

      .tbody-qty-col{
        text-align: center;
      }

      .amount-col{
        text-align: right;
      }

      .amount-section{
        width: 30%;
        float: right;
      }

      .amount-section-label{
        text-align: left !important;
        p {
          margin: 2px !important;
          font-size: 14px !important;
        }

        .bold {
          font-weight: bold;
        }
      }

      .amount-section td{
        text-align: right;
      }
    </style>
  `);

    printWindow.document.write("</head><body>");
    printWindow.document.write(divContents.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleEdit = useCallback((item: any) => {
    setSelectedPurchaseOrder(item);
    setEditDrawerOpen(true);
  }, []);

  const filteredData = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return data.filter((item) => {
      const matchStatus =
        filters.status && filters.status !== "all"
          ? item.status === Number(filters.status)
          : true;

      const matchesSearch =
        String(item.created_date ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.order_id ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.user_name ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.order_qty ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.receive_qty ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.store_name ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.expected_delivery_date ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.status_text ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.ref ?? "")
          .toLowerCase()
          .includes(search);

      return matchesSearch && matchStatus;
    });
  }, [data, searchTerm, filters]);

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

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
              } else {
                setSelectedRowIds(new Set());
              }
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
          <Typography variant="subtitle2" fontWeight="inherit">
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
          <Typography variant="subtitle2" fontWeight="inherit">
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
            <Typography textTransform="capitalize" className="f-14">
              {item.order_id ? item.order_id : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("user_name", {
      id: "receivedBy",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
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
              {item.user_name ? item.user_name : "-"}
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
          <Stack direction="row" alignItems="center" ml={1}>
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
          <Stack direction="row" alignItems="center" ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.receive_qty ? item.receive_qty : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.store_name, {
      id: "deliveryAddress",
      header: () => "Delivery address",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14" ml={1}>
              {item.store_name ? item.store_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.expected_delivery_date, {
      id: "expectedDeliveryDate",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
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
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: 300,
                  wordBreak: "break-word",
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

                        await api.post(
                          `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        const res = await api.get(
                          `purchase-orders/get?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        if (!res.data?.IsSuccess) return;

                        const invoice = res.data?.info?.[0]?.invoice || "";
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

                        await api.post(
                          `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        const res = await api.get(
                          `purchase-orders/get?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        if (!res.data?.IsSuccess) return;

                        const invoice = res.data?.info?.[0]?.invoice || "";
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

                        await api.post(
                          `purchase-orders/invoice?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        const res = await api.get(
                          `purchase-orders/get?company_id=${user.company_id}&id=${selectedRow2.id}`,
                        );

                        if (!res.data?.IsSuccess) return;

                        const invoiceUrl = res.data.info[0]?.invoice;

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
                )
              }
              onClick={(e) => {
                e.stopPropagation();
                handleCancelOrder(item.id);
              }}
            >
              <IconShoppingCartCancel size={18} />
            </IconButton>

            {item.status !== 5 && (
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

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

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
        {/* Invoice model */}
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            <Typography>Preview</Typography>
            <IconButton
              onClick={() => setOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <IconX />
            </IconButton>
          </DialogTitle>

          <DialogContent
            dividers
            sx={{ height: "100vh", overflowY: "auto" }}
            className="print-order"
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center">
                <CircularProgress />
              </Box>
            ) : purchaseOrder ? (
              <Paper id="purchase-order-preview" sx={{ p: 2 }}>
                {/* Company Info */}
                <Box
                  display="flex"
                  justifyContent={"space-between"}
                  alignItems="center"
                  mb={2}
                  className="company-info"
                >
                  {purchaseOrder?.company_image && (
                    <img
                      src={purchaseOrder?.company_image}
                      alt="Company Logo"
                      style={{ width: 90, marginRight: 16 }}
                      className="company-logo"
                    />
                  )}
                  <Box justifyItems={"end"} className="company-details">
                    <Typography variant="h1" fontSize={18}>
                      {purchaseOrder?.company_name}
                    </Typography>
                    {purchaseOrder?.company.address && (
                      <Typography>{purchaseOrder?.company.address}</Typography>
                    )}
                  </Box>
                </Box>

                <Typography
                  variant="h4"
                  fontSize={24}
                  fontWeight={500}
                  align="center"
                  mb={1}
                >
                  Purchase Order
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  mb={2}
                  className="sub-header"
                >
                  SUPPLY THE MATERIAL/EQUIPMENT/GOODS TO THE REQUIRED
                  SPECIFICATION AS SET OUT BELOW. THIS ORDER IS PLACED SUBJECT
                  TO OUR TERMS AND CONDITIONS.
                </Typography>

                {/* Info Table */}
                <Box
                  display="flex"
                  flexDirection="column"
                  mb={2}
                  border="1px solid #e9e9e9"
                  borderRadius={0}
                  p={2}
                  className="info_wrapper"
                  gap={1}
                >
                  <Box display="flex" gap={2} className="info-table">
                    <Typography variant="body2" fontWeight="bold">
                      PO:
                    </Typography>
                    <Typography variant="body2">
                      {purchaseOrder?.order_id}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={2} className="info-table">
                    <Typography variant="body2" fontWeight="bold">
                      Date:
                    </Typography>
                    <Typography variant="body2">
                      {purchaseOrder?.date}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={2} className="info-table">
                    <Typography variant="body2" fontWeight="bold">
                      Account No:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {purchaseOrder?.supplier?.account_number}
                    </Typography>
                  </Box>
                </Box>

                {/* Address Table */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  mb={2}
                  border="1px solid #e9e9e9"
                  borderRadius={0}
                  className="address_wrapper"
                  py={2}
                >
                  {/* Supplier */}
                  <Box width="48%" ml={4} className="to-address">
                    <Typography variant="h5">To</Typography>
                    <Typography variant="h5">
                      <b>Name:</b> {purchaseOrder?.supplier?.name}
                    </Typography>
                    <Typography variant="h5">
                      <b>Street:</b> {purchaseOrder?.supplier?.street}
                    </Typography>
                    <Typography variant="h5">
                      <b>Location:</b> {purchaseOrder?.supplier?.location}
                    </Typography>
                    <Typography variant="h5">
                      <b>Town:</b> {purchaseOrder?.supplier?.town}
                    </Typography>
                    <Typography variant="h5">
                      <b>Postcode:</b> {purchaseOrder?.supplier?.postcode}
                    </Typography>
                    <Typography variant="h5">
                      <b>Contact:</b> {purchaseOrder?.supplier?.company_name}
                    </Typography>
                    <Typography variant="h5">
                      <b>Tel:</b>{" "}
                      {purchaseOrder?.supplier?.phone_with_extension}
                    </Typography>
                    <Typography variant="h5">
                      <b>Email:</b> {purchaseOrder?.supplier?.email}
                    </Typography>
                  </Box>

                  {/* Store */}
                  <Box width="48%" className="delivery-address">
                    <Typography variant="h5">Deliver To</Typography>
                    <Typography variant="h5">
                      <b>Name:</b> {purchaseOrder?.store?.name}
                    </Typography>
                    <Typography variant="h5">
                      <b>Street:</b> {purchaseOrder?.store?.street}
                    </Typography>
                    <Typography variant="h5">
                      <b>Location:</b> {purchaseOrder?.store?.location}
                    </Typography>
                    <Typography variant="h5">
                      <b>Town:</b> {purchaseOrder?.store?.town}
                    </Typography>
                    <Typography variant="h5">
                      <b>Postcode:</b> {purchaseOrder?.store?.postcode}
                    </Typography>
                    <Typography variant="h5">
                      <b>Contact:</b> {purchaseOrder?.user_name}
                    </Typography>
                    <Typography variant="h5">
                      <b>Tel:</b> {purchaseOrder?.store?.phone_with_extension}
                    </Typography>
                    <Typography variant="h5">
                      <b>Email:</b> {purchaseOrder?.store?.email}
                    </Typography>
                  </Box>
                </Box>

                <Box mt={2}>
                  {/* Products Table - Full Width */}
                  <TableContainer>
                    <Table className="order-table">
                      <TableHead>
                        <TableRow>
                          <TableCell className="item-col">Item</TableCell>
                          <TableCell className="description-col">
                            Products
                          </TableCell>
                          <TableCell className="qty-col">Qty</TableCell>
                          <TableCell className="rate-col">Rate</TableCell>
                          <TableCell className="line-total-col" width={100}>
                            Line Total
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {purchaseOrder?.purchase_orders.map(
                          (product: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-14">
                                {product.product.supplier_code}
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="h6"
                                  className="font-14"
                                  fontWeight={500}
                                >
                                  {product.product.name ||
                                    product.product.short_name}
                                </Typography>
                                <Typography
                                  className="font-12"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {product.product.description
                                    ? product.product.description
                                    : ""}
                                </Typography>
                              </TableCell>
                              <TableCell className="font-14">
                                {product.qty}
                              </TableCell>
                              <TableCell className="font-14">
                                {purchaseOrder.currency}
                                {product.price}
                              </TableCell>
                              <TableCell className="font-14">
                                {purchaseOrder.currency}
                                {product.price}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Totals Box - Right Aligned Below Table */}
                  <Box display="flex" justifyContent="flex-end" mt={2}>
                    <Box
                      display="flex"
                      flexDirection="column"
                      width="30%"
                      border="1px solid #e9e9e9"
                      borderRadius={0}
                      p={2}
                      gap={1}
                      className="amount-section"
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        className="amount-section-label"
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          className="bold"
                        >
                          Sub Total
                        </Typography>
                        <Typography variant="body2">
                          {purchaseOrder?.currency}
                          {purchaseOrder?.total_amount}
                        </Typography>
                      </Box>

                      <Box
                        display="flex"
                        justifyContent="space-between"
                        className="amount-section-label"
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          className="bold"
                        >
                          Add VAT @20%
                        </Typography>
                        <Typography variant="body2">
                          {purchaseOrder?.currency}
                          {purchaseOrder?.tax}
                        </Typography>
                      </Box>

                      <Box
                        display="flex"
                        justifyContent="space-between"
                        className="amount-section-label"
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          className="bold"
                        >
                          Total
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {purchaseOrder?.currency}
                          {(
                            (Number(purchaseOrder?.total_amount) || 0) +
                            (Number(purchaseOrder?.tax) || 0)
                          ).toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ) : (
              <Typography>No data found</Typography>
            )}
          </DialogContent>

          <DialogActions>
            <Button variant="contained" onClick={handlePrint}>
              Print
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

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
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <Button variant="contained" onClick={() => setFilterOpen(true)}>
              <IconFilter width={18} />
            </Button>

            <Dialog
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle
                sx={{ m: 0, position: "relative", overflow: "visible" }}
              >
                Filters
                <IconButton
                  aria-label="close"
                  onClick={() => setFilterOpen(false)}
                  size="large"
                  sx={{
                    position: "absolute",
                    right: 12,
                    top: 8,
                    color: (theme) => theme.palette.grey[900],
                    backgroundColor: "transparent",
                    zIndex: 10,
                    width: 50,
                    height: 50,
                  }}
                >
                  <IconX size={40} style={{ width: 40, height: 40 }} />
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
                    <MenuItem value="1">Partially Delivered</MenuItem>
                    <MenuItem value="2">Upcoming</MenuItem>
                    <MenuItem value="3">Processing</MenuItem>
                    <MenuItem value="4">Cancelled</MenuItem>
                    <MenuItem value="5">On stock</MenuItem>
                  </TextField>
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      status: "",
                    });
                    setFilters({
                      status: "",
                    });
                    setFilterOpen(false);
                  }}
                  color="inherit"
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
              onClick={handlePopoverOpen}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            <Popover
              open={Boolean(anchorEl2)}
              anchorEl={anchorEl2}
              onClose={handlePopoverClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
            >
              <TextField
                size="small"
                placeholder="Search"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1 }}
              />
              <FormGroup>
                {table
                  .getAllLeafColumns()
                  .filter((col: any) => {
                    const excludedColumns = ["conflicts", "select"];
                    if (excludedColumns.includes(col.id)) return false;

                    return col.id.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((col: any) => (
                    <FormControlLabel
                      key={col.id}
                      control={
                        <Checkbox
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                          disabled={col.id === "conflicts"}
                        />
                      }
                      sx={{ textTransform: "none" }}
                      label={
                        col.columnDef.meta?.label ||
                        (typeof col.columnDef.header === "string" &&
                        col.columnDef.header.trim() !== ""
                          ? col.columnDef.header
                          : col.id
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str: string) => str.toUpperCase())
                              .trim())
                      }
                    />
                  ))}
              </FormGroup>
            </Popover>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to archive {usersToDelete.length} order
                  product
                  {usersToDelete.length > 1 ? "s" : ""} from the orders?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setConfirmOpen(false)}
                  variant="outlined"
                  color="primary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
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
                  variant="outlined"
                  color="error"
                >
                  Archive
                </Button>
              </DialogActions>
            </Dialog>
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
        />

        {/* Archive Product List */}
        <ArchivePurchaseOrder
          open={archivePurchaseList}
          companyId={Number(user.company_id)}
          onClose={() => setArchivePurchaseList(false)}
          onWorkUpdated={fetchOrders}
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
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        >
          <TableContainer>
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
                            sx={{ padding: "10px" }}
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
        <Stack
          gap={1}
          pr={3}
          pt={1}
          pl={3}
          pb={2}
          alignItems="center"
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography color="textSecondary" className="f-14">
              {table.getPrePaginationRowModel().rows.length} Rows
            </Typography>
          </Box>
          <Box
            sx={{
              display: {
                xs: "block",
                sm: "flex",
              },
            }}
            alignItems="center"
          >
            <Stack direction="row" alignItems="center">
              <Typography color="textSecondary" className="f-14">
                Page
              </Typography>
              <Typography
                color="textSecondary"
                className="f-14"
                fontWeight={600}
                ml={1}
              >
                {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </Typography>
              <Typography color="textSecondary" ml={"3px"} className="f-14">
                {" "}
                | Entries :{" "}
              </Typography>
            </Stack>
            <Stack
              ml={"5px"}
              direction="row"
              alignItems="center"
              color="textSecondary"
            >
              <CustomSelect
                className="custom-select"
                value={table.getState().pagination.pageSize}
                onChange={(e: { target: { value: any } }) => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                {[50, 100, 250, 500].map((pageSize) => (
                  <MenuItem key={pageSize} value={pageSize}>
                    {pageSize}
                  </MenuItem>
                ))}
              </CustomSelect>
              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <IconChevronLeft />
              </IconButton>
              <IconButton
                size="small"
                sx={{ width: "30px" }}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <IconChevronRight />
              </IconButton>
            </Stack>
          </Box>
        </Stack>

        <Dialog open={modalOpen} onClose={handleCloseModal}>
          <DialogTitle>Select Delivery Date</DialogTitle>
          <DialogContent>
            <StyledDayPicker>
              <DayPicker
                mode="single"
                selected={singleDate}
                onSelect={setSingleDate}
                showOutsideDays
                defaultMonth={singleDate || new Date()}
                modifiersClassNames={{
                  selected: "rdp-day_selected",
                }}
              />
            </StyledDayPicker>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (selectedRow && singleDate) {
                  const formattedDate = formatDateLocal(singleDate);
                  await updateExpectedDate(selectedRow.id, formattedDate);
                  handleCloseModal();
                }
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default PurchaseOrderList;
