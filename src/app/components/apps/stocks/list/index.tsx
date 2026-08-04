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
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Drawer,
  CircularProgress,
  Menu,
  ListItemIcon,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import {
  IconClock,
  IconDotsVertical,
  IconFilter,
  IconPlus,
  IconPlusMinus,
  IconSearch,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconEdit } from "@tabler/icons-react";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { IconEye } from "@tabler/icons-react";
import ProductAddEdit from "../../products/create";
import AdjustStock from "../adjust-stock";
import Cookies from "js-cookie";
import StoreModal from "../../modals/store-model";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StockHistoryList from "../../settings/history/stock-history";

dayjs.extend(customParseFormat);

export interface ProductFormData {
  id: number;
  company_id: any;
  uuid: string;
  short_name: string;
  name?: string;
  status?: boolean;
  description?: string;
  image?: File | null;
  supplier_code?: string;
  supplier_id?: number | null;
  barcode_text?: string;
  category_ids?: string;
  model_id?: number | null;
  manufacturer_id?: number | null;
  pack_off_qty?: string;
  pack_off_unit?: number | null;
  weight?: string;
  weight_unit?: number | null;
  length?: string;
  width?: string;
  height?: string;
  length_unit?: number | null;
  tax?: string;
  price?: string;
  sort_id?: number | null;
  cutoff?: number;
  is_sub_qty?: boolean;
  store_ids?: string;
  max_stock?: number | null;
  manufacture?: number | null;
  model?: number | null;
}

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const StockList = () => {
  const [data, setData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_stocks`,
      enabled: !!user?.id,
    });

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    supplier: "",
    category: "",
    store: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [editStockOpen, setEditStockOpen] = useState(false);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [storeAnchorEl, setStoreAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stockQty, setStockQty] = useState("0.00");
  const [qty, setQty] = useState("0.00");
  const [packOfUnit, setPackOfUnit] = useState("");
  const [productName, setProductName] = useState("");
  const [isSubQty, setIsSubQty] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    id: 0,
    company_id: user?.company_id,
    name: "",
    sort_id: 0,
    short_name: "",
    description: "",
    uuid: "",
    status: true,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [editing, setEditing] = useState<{
    id: number | null;
    field: string | null;
  }>({
    id: null,
    field: null,
  });

  const [inputValue, setInputValue] = useState<string>("");
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStoreOpen = (event: React.MouseEvent<HTMLElement>) => {
    setStoreAnchorEl(event.currentTarget);
  };

  const handleStoreClose = () => {
    setStoreAnchorEl(null);
  };
  const storedStore = Cookies.get(`user_store_${user.id}_${user.company_id}`);
  const store = storedStore ? JSON.parse(storedStore) : null;

  useEffect(() => {
    if (!user?.id) return;

    if (!storedStore && stores.length > 0) {
      setStoreModalOpen(true);
      return;
    }

    if (storedStore) {
      const store = JSON.parse(storedStore);
      setStoreId((prev) => (prev !== store.id ? store.id : prev));

      setFilters((prev) => {
        if (prev.store === store.name) return prev;
        return {
          ...prev,
          store: store.name,
        };
      });
    }
  }, [user, stores]);

  useEffect(() => {
    if (!searchParams || stores.length === 0) return;
    const storeIdParam = searchParams.get("store_id");
    if (storeIdParam) {
      handleStoreChange(Number(storeIdParam));
    }
  }, [searchParams, stores]);

  const handleStoreConfirm = (store: { id: number; name: string }) => {
    if (!user?.id) return;

    Cookies.set(
      `user_store_${user.id}_${user.company_id}`,
      JSON.stringify({
        id: store.id,
        name: store.name,
      }),
      { expires: 365 },
    );

    setStoreId(store.id);
    setStoreModalOpen(false);
  };

  const handleStoreChange = (storeId: number) => {
    const selectedStore = stores.find((s) => s.id === storeId);
    if (!selectedStore || !user?.id) return;
    if (!searchParams) return;

    const productId = searchParams.get("product_id");
    Cookies.set(
      `user_store_${user.id}_${user.company_id}`,
      JSON.stringify({
        id: selectedStore.id,
        name: selectedStore.name,
      }),
      { expires: 365 },
    );

    setStoreId(selectedStore.id);

    setFilters((prev) => ({
      ...prev,
      store: selectedStore.name,
    }));

    setStoreAnchorEl(null);
  };

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}`,
      );
      if (res.data) {
        setSuppliers(res.data.suppliers);
        setCategories(res.data.categories);
        setStores(res.data.stores);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  // Fetch data
  const fetchProducts = async (
    storeIdParam?: number,
    restorePage?: number,
    productIdParam?: number,
  ) => {
    setFetchProduct(true);

    try {
      const storeFilter = storeIdParam ?? storeId ?? store?.id;

      if (!storeFilter) return;

      const supplierObj = suppliers.find((s) => s.name === filters.supplier);
      const categoryObj = categories.find((c) => c.name === filters.category);

      let url = `products/get?company_id=${user.company_id}&store_ids=${storeFilter}&is_products=true&is_web=true&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (supplierObj) {
        url += `&supplier_ids=${supplierObj.id}`;
      }
      if (categoryObj) {
        url += `&category_ids=${categoryObj.id}`;
      }

      if (productIdParam) {
        url += `&product_id=${productIdParam}`;
      }
      const res = await api.get(url);

      const info = res.data.info;

      if (Array.isArray(info)) {
        setData(info);
      } else if (info) {
        setData([info]);
      } else {
        setData([]);
      }
      if (res.data) {
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
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }
      }

      if (productIdParam) {
        router.replace("/apps/stocks/list", { scroll: false });
      }

      if (restorePage !== undefined) {
        setTimeout(
          () => setPagination((prev) => ({ ...prev, pageIndex: restorePage })),
          0,
        );
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }

    setFetchProduct(false);
  };

  const fetchHistories = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.get(
        `stocks/history?company_id=${user.company_id}&product_id=${id}&store_id=${store?.id}`,
      );
      if (res.data && res.data.IsSuccess) {
        setHistory(res.data.info ?? []);
        setStockQty(res.data.stock_qty ?? "0.00");
        setQty(res.data.qty ?? "0.00");
        setPackOfUnit(res.data.pack_of_unit ?? "");
        setProductName(res.data.product_name ?? "");
        setIsSubQty(res.data.is_sub_qty);
      } else {
        setHistory([]);
        setStockQty("0.00");
        setPackOfUnit("");
        setQty("0.00");
        setProductName("");
        setIsSubQty(false);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSave = async (
    item: any,
    field: "qty" | "sub_qty",
    value: string,
  ) => {
    if (value === "") return;

    const number = Number(value);
    if (isNaN(number) || number < 0) return;

    let updatedQty = item.qty;
    let updatedSubQty = item.sub_qty;

    if (field === "qty") {
      updatedQty = number;
      updatedSubQty =
        item.is_sub_qty && item.pack_off_qty
          ? Number(item.pack_off_qty) * updatedQty
          : updatedSubQty;
    } else {
      updatedSubQty = number;
      if (item.is_sub_qty && item.pack_off_qty) {
        updatedQty = updatedSubQty / item.pack_off_qty;
      }
    }

    try {
      await api.post(`purchase-orders/update-item-qty`, {
        id: Number(item.id),
        store_id: Number(storeId),
        qty: updatedQty,
        sub_qty: updatedSubQty,
      });
      fetchProducts();
    } catch (err) {
      console.error("Failed to update item:", err);
    } finally {
      setEditing({ id: null, field: null });
    }
  };

  const editSupplier = async (
    e: React.FormEvent,
    galleryFiles: File[],
    barcodes: string[],
    removedImageIds: number[],
  ) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formPayload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (key === "image") return;

        if (Array.isArray(value)) {
          value.forEach((v) => {
            formPayload.append(`${key}[]`, String(v));
          });
          return;
        }

        if (typeof value === "boolean") {
          formPayload.append(key, value ? "1" : "0");
          return;
        }

        formPayload.append(key, String(value));
      });

      if (formData.image instanceof File) {
        formPayload.append("image", formData.image);
      }

      removedImageIds.forEach((id) =>
        formPayload.append("removed_image_ids[]", String(id)),
      );

      galleryFiles.forEach((file) => {
        formPayload.append("files", file);
      });

      formPayload.append("barcode_text", barcodes.join(","));

      const result = await api.post("products/update", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          id: 0,
          company_id: user?.company_id,
          name: "",
          sort_id: 0,
          short_name: "",
          description: "",
          uuid: "",
          status: true,
        });
        setEditDrawerOpen(false);
        fetchProducts();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setEditDrawerOpen(true);
  }, []);

  const handleHistory = useCallback(
    async (id: number) => {
      setSelectedTaskId(id);
      setDrawerOpen(true); // open drawer
      await fetchHistories(id);
    },
    [storeId],
  );

  const handleStock = useCallback(async (item: any) => {
    setSelectedTaskId(item.id);
    setSelectedProduct(item);
    setEditStockOpen(true);
  }, []);

  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data;
  }, [data]);

  const MAX_QTY = 1000.99;

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

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={selectedRowIds.size === totalRows && totalRows > 0}
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < totalRows
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
            sx={{ pl: 0.3 }}
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
    columnHelper.accessor("uuid", {
      id: "Id",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            ID
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography textTransform="capitalize" className="f-14">
              {item.uuid ? item.uuid : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("image_url", {
      id: "Image",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Image
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const image = "/images/products/product.svg";

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Image
              src={item.image_url || image}
              style={{ cursor: "pointer" }}
              alt="Product"
              width={50}
              height={50}
            />
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.short_name, {
      id: "name",
      header: () => "Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip
              title={item.short_name ? item.short_name : (item.name ?? "")}
            >
              <Typography
                className="f-14"
                variant="body1"
                sx={{
                  width: "100%",
                  minWidth: "150px",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: "500px",
                  wordBreak: "break-word",
                }}
              >
                {item.short_name ? item.short_name : "-"}
                <Typography
                  component="span"
                  display="block"
                  color="textSecondary"
                  className="f-14"
                >
                  {item.name}
                </Typography>
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.supplier_name, {
      id: "supplier",
      header: () => "Supplier",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Typography textTransform="capitalize" className="f-14">
            {item.supplier_name ? item.supplier_name : "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.supplier_code, {
      id: "code",
      header: () => "Code",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Tooltip title={item.supplier_code ? item.supplier_code : "-"}>
              <Typography
                textTransform="capitalize"
                className="f-14"
                sx={{
                  width: "100%",
                  minWidth: "80px",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: "150px",
                  wordBreak: "break-word",
                }}
              >
                {item.supplier_code ? item.supplier_code : "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row?.qty, {
      id: "Qty",
      header: () => "Qty",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editing.id === item.id && editing.field === "qty";

        return (
          <Stack direction="row" alignItems="center">
            {isEditing ? (
              <TextField
                className="f-14"
                size="small"
                value={inputValue}
                autoFocus
                type="text"
                inputMode="decimal"
                variant="standard"
                sx={{ width: 80 }}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d*$/.test(value)) {
                    const num = Number(value);

                    if (value === "" || num <= MAX_QTY) {
                      setInputValue(value);
                    }
                  }
                }}
                onBlur={() => handleSave(item, "qty", inputValue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave(item, "qty", inputValue);
                  }
                }}
              />
            ) : (
              <Typography
                className="f-14"
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": { border: "1px solid #1976d2" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing({ id: item.id, field: "qty" });
                  setInputValue(item.qty?.toString() || "0");
                }}
              >
                {item?.qty}
                <br />
                <Typography
                  component="span"
                  variant="body2"
                  color="textSecondary"
                >
                  {" "}
                  {item.is_sub_qty && Number(item?.pack_off_qty) > 0
                    ? item?.pack_off_unit
                      ? `(${item.pack_off_qty} ${item.pack_off_unit})`
                      : `(${item.pack_off_qty})`
                    : ""}
                </Typography>
              </Typography>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.sub_qty, {
      id: "subQty",
      header: () => "Sub Qty",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editing.id === item.id && editing.field === "sub_qty";

        return (
          <Stack direction="row" alignItems="center">
            {item.is_sub_qty}
            {isEditing ? (
              <TextField
                size="small"
                value={inputValue}
                autoFocus
                variant="standard"
                sx={{ width: 80 }}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d*(\.\d{0,2})?$/.test(value)) {
                    const num = Number(value);

                    if (value === "" || num <= MAX_QTY) {
                      setInputValue(value);
                    }
                  }
                }}
                onBlur={() => handleSave(item, "sub_qty", inputValue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave(item, "sub_qty", inputValue);
                  }
                }}
              />
            ) : (
              <Typography
                className="f-14"
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: item.is_sub_qty ? "pointer" : "default",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                  "&:hover": item.is_sub_qty
                    ? { border: "1px solid #1976d2" }
                    : {},
                }}
                onClick={(e) => {
                  if (!item.is_sub_qty) return;
                  e.stopPropagation();
                  setEditing({ id: item.id, field: "sub_qty" });
                  setInputValue(item.sub_qty?.toString() || "0");
                }}
              >
                {item.sub_qty > 0 ? item.sub_qty : "-"}
              </Typography>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.total_amount, {
      id: "amount",
      header: () => "Amount",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.currency}
              {item.total_amount}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.stock_status, {
      id: "stockStatus",
      header: () => "Stock Status",
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Typography
            className="f-14"
            variant="h6"
            fontWeight={500}
            color={item.status_color}
          >
            {item.stock_status || "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("qr_code_url", {
      id: "QR",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            QR
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Image
              src={item.qr_code_url}
              alt={"QRr code"}
              width={50}
              height={50}
            />
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.product_categories, {
      id: "categories",
      header: () => "Categories",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              textTransform="capitalize"
              className="f-14"
              sx={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordBreak: "break-word",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid transparent",
                transition: "all 0.2s ease",
                "&:hover": {
                  border: "1px solid #1976d2",
                },
              }}
            >
              {item.product_categories ? item.product_categories : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.barcode_text, {
      id: "barcode",
      header: () => "Barcode",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.barcode_text ? item.barcode_text : "-"}
            </Typography>
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
          <Stack direction="row" spacing={1}>
            <Tooltip title="Edit stock">
              <IconButton color="primary" onClick={() => handleStock(item)}>
                <IconPlusMinus size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="History">
              <IconButton
                color="primary"
                onClick={() => handleHistory(item.id)}
              >
                <IconClock size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton color="primary" onClick={() => handleEdit(item.id)}>
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

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
    data: filteredData,
    columns,
    fetchData: () => {
      if (storeId) {
        const productId = searchParams?.get("product_id");
        fetchProducts(
          storeId,
          undefined,
          productId ? Number(productId) : undefined,
        );
      }
    },
    debounceDependencies: [searchTerm, filters, storeId],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  // Reset to first page when search term changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Stock">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
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
            <Button
              variant="contained"
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
            <>
              <Typography
                color="primary"
                fontWeight={500}
                sx={{ cursor: "pointer" }}
                onClick={handleStoreOpen}
              >
                {stores.find((s) => s.id === storeId)?.name || "Select Store"}
              </Typography>

              <Menu
                anchorEl={storeAnchorEl}
                open={Boolean(storeAnchorEl)}
                onClose={handleStoreClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                {stores.map((s) => (
                  <MenuItem key={s.id} onClick={() => handleStoreChange(s.id)}>
                    {s.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          </Grid>

          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                        const excludedColumns = ["conflicts", "select"];
                        if (excludedColumns.includes(col.id)) return false;

                        return col.id
                          .toLowerCase()
                          .includes(search.toLowerCase());
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
                    setAddStockOpen(true);
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
                  Add Stock
                </Link>
              </MenuItem>

              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHistoryDrawerOpen(true);
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
                    <IconClock width={18} />
                  </ListItemIcon>
                  History
                </Link>
              </MenuItem>
            </Menu>
            {/* Filter Dialog */}
            <Dialog
              open={open}
              onClose={() => setOpen(false)}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle
                sx={{ m: 0, position: "relative", overflow: "visible" }}
              >
                Filters
                <IconButton
                  aria-label="close"
                  onClick={() => setOpen(false)}
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
                    label="Suppliers"
                    value={tempFilters.supplier}
                    onChange={(e) => {
                      setTempFilters({
                        ...tempFilters,
                        supplier: e.target.value,
                      });
                    }}
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {suppliers.map((item, i) => (
                      <MenuItem key={i} value={item.name}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Category"
                    value={tempFilters.category}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        category: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {categories.map((item, i) => (
                      <MenuItem key={i} value={item.name}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      supplier: "",
                      category: "",
                      store: "",
                    });
                    setFilters({
                      supplier: "",
                      category: "",
                      store: "",
                    });
                    setOpen(false);
                  }}
                  color="inherit"
                >
                  Clear
                </Button>

                <Button
                  variant="contained"
                  onClick={() => {
                    setFilters(tempFilters);
                    setOpen(false);
                  }}
                >
                  Apply
                </Button>
              </DialogActions>
            </Dialog>
          </Stack>
        </Stack>
        <Divider />

        {/* <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
          }}
        > */}
          <TableContainer
            ref={tableContainerRef}
            sx={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}
          >
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
                          sx={{
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            width:
                              header.column.id === "actions" ||
                              header.column.id === "barcode"
                                ? 80
                                : header.column.id === "Qty"
                                  ? 120
                                  : header.column.id === "subQty"
                                    ? 100
                                    : header.column.id === "QrCode"
                                      ? 120
                                      : header.column.id === "supplierCode" ||
                                          header.column.id === "stockStatus"
                                        ? 140
                                        : header.column.id === "QrCode"
                                          ? 120
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
                {fetchProduct ? (
                  <SkeletonLoader
                    columns={simpleColumns}
                    rowCount={simpleColumns.length}
                  />
                ) : filteredData.length === 0 ? (
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          sx={{
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
          {data.length ? <Divider /> : <></>}
          </TableContainer>
        {/* </Box> */}
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

        {/* Stock History */}
        <StockHistoryList
          openDrawer={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
        />

        {/* Edit product */}
        <ProductAddEdit
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          isEdit={true}
          formData={formData}
          productId={selectedTaskId}
          setFormData={setFormData}
          handleSubmit={editSupplier}
          isSaving={isSaving}
          companyId={user.company_id ?? null}
        />

        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            width: 700,
            "& .MuiDrawer-paper": { width: 700, backgroundColor: "#f9f9f9" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 2,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Stock History
            </Typography>
            <Box display={"flex"} gap={2} alignItems={"center"}>
              <Typography
                variant="subtitle1"
                color="textSecondary"
                fontWeight={500}
                fontSize={20}
              >
                Qty in Stock: {isSubQty ? qty : stockQty}{" "}
                {isSubQty ? `(${stockQty} ${packOfUnit})` : ""}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <IconX size={18} />
              </IconButton>
            </Box>
          </Box>
          <Divider />
          <Typography
            variant="subtitle1"
            color="text.secondary"
            fontWeight="medium"
            gutterBottom
            ml={2}
            mt={3}
          >
            {productName}
          </Typography>
          <Divider sx={{ mt: 2 }} />

          {loading ? (
            <Box sx={{ textAlign: "center" }} mt={3}>
              <CircularProgress />
            </Box>
          ) : history.length === 0 ? (
            <Typography
              ml={3}
              mt={2}
              textAlign={"center"}
              fontSize={18}
              fontWeight={500}
            >
              No history available
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>{isSubQty ? "Sub Qty" : "Qty"}</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>New Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h, index) => {
                  const qtyNum = parseFloat(h.qty);
                  const qtyColor =
                    qtyNum > 0 ? "#1a8f03ff" : qtyNum < 0 ? "red" : "inherit";
                  return (
                    <>
                      <TableRow key={index} sx={{ alignItems: "start" }}>
                        <TableCell>
                          <Box>{h.date || "-"}</Box>
                          <Box
                            display={"flex"}
                            alignContent={"center"}
                            alignItems={"center"}
                            mr={2}
                          >
                            {h?.user && (
                              <>
                                <IconUser size={18} />{" "}
                                <Typography variant="body2">
                                  {h?.user?.name}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight: "bold",
                          }}
                        >
                          <Box display="flex" alignItems="center">
                            <Typography
                              className="f-14"
                              sx={{
                                fontWeight: "bold",
                              }}
                            >
                              {isSubQty && h.qty_in_pack
                                ? h.qty_in_pack
                                : (h.qty ?? 0)}
                            </Typography>

                            <Typography
                              color="text.secondary"
                              className="f-14"
                              fontWeight={"bold"}
                              ml={0.5}
                            >
                              {isSubQty &&
                                h.qty_in_pack &&
                                `(${h.qty} ${h.pack_off_unit_name})`}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Tooltip
                            title={h.reference ?? ""}
                            placement="top"
                            arrow
                          >
                            <Typography
                              className="f-14"
                              sx={{
                                minWidth: "150px",
                                width: "100%",
                                maxWidth: "500px",
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.25,

                                wordBreak: "break-word",
                              }}
                            >
                              {h.reference || "-"}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell>{h.price ?? "-"}</TableCell>

                        <TableCell sx={{ fontWeight: "bold" }}>
                          {isSubQty && h.new_qty_in_pack ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                color={qtyColor}
                                className="f-14"
                                sx={{ fontWeight: "bold" }}
                              >
                                {Number(h.qty_in_pack || 0).toFixed(2)}
                              </Typography>
                              <Typography className="f-14" fontWeight="bold">
                                ({Number(h.new_qty_in_pack || 0).toFixed(2)})
                              </Typography>
                            </Box>
                          ) : (
                            // <Typography color={qtyColor} className="f-14" sx={{ fontWeight: "bold" }}>
                            //   {Number(h.new_qty || 0).toFixed(2)}
                            // </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                color={qtyColor}
                                className="f-14"
                                sx={{ fontWeight: "bold" }}
                              >
                                {Number(h.qty_in_pack || 0).toFixed(2)}
                              </Typography>
                              <Typography className="f-14" fontWeight="bold">
                                ({Number(h.new_qty || 0).toFixed(2)})
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Drawer>

        {/* Edit stock */}
        <AdjustStock
          open={editStockOpen}
          onClose={() => setEditStockOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onUpdate={fetchProducts}
          onProductChange={() => handleEdit(selectedTaskId ?? 0)}
          onChange={() => handleHistory(selectedTaskId ?? 0)}
          isSaving={isSaving}
          editData={selectedProduct}
          companyId={user.company_id ?? null}
        />

        {/* Add stock */}
        <AdjustStock
          open={addStockOpen}
          onClose={() => setAddStockOpen(false)}
          formData={formData}
          setFormData={setFormData}
          onUpdate={fetchProducts}
          onProductChange={() => handleEdit(selectedTaskId ?? 0)}
          onChange={() => handleHistory(selectedTaskId ?? 0)}
          isSaving={isSaving}
          // editData={selectedProduct}
          companyId={user.company_id ?? null}
          is_product={true}
        />

        <StoreModal
          open={storeModalOpen}
          stores={stores}
          onConfirm={handleStoreConfirm}
        />
      </Box>
    </PermissionGuard>
  );
};

export default StockList;
