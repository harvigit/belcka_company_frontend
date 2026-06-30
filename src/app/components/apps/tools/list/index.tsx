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
  Autocomplete,
  Select,
  Modal,
  LinearProgress,
  CircularProgress,
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
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconNotes,
  IconPlaylistAdd,
  IconSearch,
  IconTrash,
  IconX,
  IconInfoCircle,
  IconFileImport,
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
import { IconEye } from "@tabler/icons-react";
import AddEditTool from "../add-edit";
import AssignUserTool from "../assign-user";
import ProductAddEdit from "../../products/create";
import HireHistory from "../history";
import { AxiosResponse } from "axios";
import ArchiveTools from "../archive";
import ProductView from "../../products/view";
import ToolCategoriesDrawer from "../categories";
import ProductHistory from "../product-history";
import { IconKeyframes } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { FileDownload } from "@mui/icons-material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Cookies from "js-cookie";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

dayjs.extend(customParseFormat);
interface TableRow {
  id: number;
  image_url?: string;
  images?: string[];
  [key: string]: any;
}
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
  remove_image?: boolean;
  max_stock?: number | null;
}

const ToolsList = () => {
  const [data, setData] = useState<any[]>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const storedStore = Cookies.get(`tools_store_${user.id}_${user.company_id}`);
  const activeStore = storedStore ? JSON.parse(storedStore) : null;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openToolDrawer, setOpenToolDrawer] = useState(false);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [productHistoryDrawer, setProductHistoryDrawer] = useState(false);
  const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false);
  const [openProductDrawer, setOpenProductDrawer] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [selectedUsersList, setSelectedUsersList] = useState<any[]>([]);
  const [preselectedUserId, setPreselectedUserId] = useState<number | null>(
    null,
  );
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [storeAnchorEl, setStoreAnchorEl] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rowTrades, setRowTrades] = useState<Record<string, any[]>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openTradeModal, setOpenTradeModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [trades, setTrades] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openStoreDialog, setOpenStoreDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [archiveDrawerOpen, setArchiveDrawerOpen] = useState(false);
  const [rowCategories, setRowCategories] = useState<Record<string, any[]>>({});
  const [draftCategories, setDraftCategories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [openModel, setOpenModel] = useState(false);
  const [file, setFile] = useState<any | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isImport, setIsImport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null);

  const [openImageManager, setOpenImageManager] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [newMainImage, setNewMainImage] = useState<File | null>(null);

  const [formData, setFormData] = useState<any>({
    id: 0,
    company_id: user?.company_id,
    name: "",
    sort_id: 0,
    short_name: "",
    description: "",
    uuid: "",
    status: true,
  });

  const onDropMainImage = (acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setNewMainImage(acceptedFiles[0]);
  };

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } =
    useDropzone({
      accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
      maxFiles: 1,
      onDrop: onDropMainImage,
    });

  // Paste support
  useEffect(() => {
    if (!openImageManager) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image")) {
          const f = items[i].getAsFile();
          if (f) {
            setNewMainImage(f);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [openImageManager]);

  const handleSaveMainImage = async () => {
    if (!selectedRow || !newMainImage) return;
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", String(selectedRow.product_id ?? selectedRow.id));
      fd.append("image", newMainImage);
      const res = await api.post("products/new-images", fd, {
        headers: { "Content-Type": undefined },
      });
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        const newUrl =
          res.data.data?.image_url ||
          res.data.image_url ||
          URL.createObjectURL(newMainImage);
        setData((prev: any[]) =>
          prev.map((p) =>
            p.product_id === selectedRow.product_id || p.id === selectedRow.id
              ? { ...p, image_url: newUrl }
              : p,
          ),
        );
        setOpenImageManager(false);
        setNewMainImage(null);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setIsSaving(false);
    }
  };

  // trades
  const fetchTrades = async () => {
    try {
      const res = await api.get(
        `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
      );
      if (res.data?.info) setTrades(res.data.info);
    } catch (err) {}
  };

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

  const onClose = () => {
    setDrawerOpen(false);
    setOpenToolDrawer(false);
    setOpenProductDrawer(false);
    setHistoryDrawer(false);
    setProductHistoryDrawer(false);
    setCategoriesDrawerOpen(false);
    setSelectedTaskId(null);
    setPreselectedUserId(null);
    setUsersDialogOpen(false);
  };

  const handleTradeClose = () => {
    setOpenCategoryModal(false);
    setOpenTradeModal(false);
  };

  const handleStoreChange = (storeId: number) => {
    const selectedStore = stores.find((s) => s.id === storeId);
    if (!selectedStore || !user?.id) return;

    Cookies.set(
      `tools_store_${user.id}_${user.company_id}`,
      JSON.stringify({
        id: selectedStore.id,
        name: selectedStore.name,
      }),
      { expires: 365 },
    );

    setStoreId(selectedStore.id);

    fetchProducts();

    setStoreAnchorEl(null);
  };

  useEffect(() => {
    if (!user?.id) return;

    if (storedStore) {
      const store = JSON.parse(storedStore);
      setStoreId(store.id);
    }
  }, [user, stores]);

  // Fetch data
  const fetchProducts = async () => {
    setFetchProduct(true);
    try {
      const storeFilter = activeStore?.id ? `&store_id=${activeStore.id}` : "";
      let url = `product-tools/get?company_id=${user.company_id}&is_web=true${storeFilter}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      const res = await api.get(url);
      if (res.data) {
        const responseData =
          res.data.info?.data || res.data.info || res.data.data || [];
        setData(responseData);

        const pagMeta =
          res.data.data?.totalPages !== undefined ||
          res.data.data?.totalItems !== undefined
            ? res.data.data
            : res.data.info;

        if (pagMeta) {
          setTotalRows(pagMeta.totalItems || responseData.length);
          setPageCount(pagMeta.totalPages || 1);
        } else {
          setTotalRows(responseData.length);
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
    setFetchProduct(false);
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleModelOpen = () => {
    setPreview(null);
    setFile(null);
    setOpenModel(true);
  };
  const handleModelClose = () => setOpenModel(false);

  const handleFileChange = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(selectedFile.name);
  };

  const downloadSampleFile = () => {
    const link = document.createElement("a");
    link.href = "/files/tools_export.xlsx";
    link.download = "sample-file.xlsx";
    link.click();
  };

  const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps } =
    useDropzone({
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
      onDrop: handleFileChange,
    });

  const importTools = async () => {
    if (!activeStore?.id) {
      toast.error("Please select a store first");
      return;
    }
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsImport(true);
    setUploadProgress(0);
    setIsProcessing(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company_id", String(user?.company_id));
      formData.append("store_id", String(activeStore.id));

      const res = await api.post("product-tools/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );

            setUploadProgress(percent);

            if (percent === 100) {
              setIsProcessing(true);
            }
          }
        },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchProducts();
        setTimeout(() => {
          handleModelClose();
          setUploadProgress(0);
          setIsProcessing(false);
        }, 1000);
      } else {
        toast.error(res.data.message || "Failed to import excel!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setIsImport(false);
    }
  };

  // add product
  const handleSubmit = async (
    e: React.FormEvent,
    galleryFiles: File[],
    barcodes: string[],
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

      galleryFiles.forEach((file) => {
        formPayload.append("files", file);
      });

      formPayload.append("barcode_text", barcodes.join(","));
      formPayload.append("is_trade", "true");
      formPayload.append("store_id", String(selectedStore));

      const result = await api.post("products/create", formPayload, {
        headers: {
          "Content-Type": undefined,
        },
      });

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setOpenProductDrawer(false);
        fetchProducts();
      } else {
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsSaving(false);
    }
    setIsSaving(false);
  };

  // UseCallback to memoize these functions
  const handleEdit = useCallback((id: number) => {
    setSelectedTaskId(id);
    setDrawerOpen(true);
  }, []);

  const handleView = useCallback((id: number) => {
    setSelectedTaskId(id);
    setViewDrawerOpen(true);
  }, []);

  const closeDrawer = () => {
    setViewDrawerOpen(false);
    fetchProducts();
  };

  const handleEditCategories = (item: any) => {
    setEditingRowId(item.product_id);
    let initialCategories: any[] = [];

    if (rowCategories[item.product_id]) {
      initialCategories = rowCategories[item.product_id];
    } else if (Array.isArray(item.product_categories)) {
      initialCategories = item.product_categories;
    } else if (typeof item.product_categories === "string") {
      initialCategories = item.product_categories
        .split(",")
        .map((name: string) => ({ name: name.trim() }));
    }

    const selectedIds = item.category_ids
      ? item.category_ids.split(",").map((id: string) => Number(id))
      : [];
    initialCategories = categories.filter((cat) =>
      selectedIds.includes(cat.id),
    );

    setDraftCategories(initialCategories);

    setOpenCategoryModal(true);
  };

  const updateCategories = async (id: string, selected: any[]) => {
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        tool_category_ids: selected.map((c) => c.id).join(","),
      };
      const res = await api.post("products/update", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchProducts();
        setOpenCategoryModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditTrades = (item: any) => {
    setEditingRowId(item.id);
    setEditingProductId(item.product_id);
    setEditingStoreId(item.store_id);

    const selectedIds = item.trade_ids
      ? item.trade_ids.split(",").map((id: string) => Number(id))
      : [];
    const selected = trades.filter((cat) => selectedIds.includes(cat.id));

    setRowTrades((prev) => ({ ...prev, [item.id]: selected }));
    setOpenTradeModal(true);
  };

  const updateTrades = async (
    id: string,
    productId: string,
    selected: any[],
    storeId: string | null,
  ) => {
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        product_id: Number(productId),
        store_id: storeId ? Number(storeId) : undefined,
        trade_ids: selected.map((c) => c.id).join(","),
      };
      const res = await api.post("product-tools/manage-tools", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchProducts();
        setOpenCategoryModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResources = async () => {
    try {
      let url = `get-inventory-resources?company_id=${user.company_id}&is_web=true`;
      const res = await api.get(url);
      if (res.data) {
        setStores(res.data.stores);
        setCategories(res.data.tool_categories);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resources", err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [api]);

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
            checked={selectedRowIds.size === data.length && data.length > 0}
            indeterminate={
              selectedRowIds.size > 0 && selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(new Set(data.map((row) => row.id)));
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
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3 }}
          >
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
          <Typography variant="subtitle2">Image</Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const placeholder = "/images/products/product.svg";

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Image
              src={item.image_url || placeholder}
              alt="Product"
              width={50}
              height={50}
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewImage(item.image_url || placeholder);
                setOpenPreview(true);
              }}
            />
            <Tooltip title="Upload primary image">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRow(item);
                  setNewMainImage(null);
                  setOpenImageManager(true);
                }}
              >
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={() => handleView(item.product_id)}
          >
            <Tooltip
              title={item.short_name ? item.short_name : (item.name ?? "")}
              placement="top"
              arrow
            >
              <Typography
                className="f-14"
                variant="body1"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: 250,
                  width: 200,
                  wordBreak: "break-word",
                  "&:hover": { color: "#1976d2" },
                }}
              >
                {item.short_name ? item.short_name : ""}
                <Typography color="textSecondary" className="f-14">
                  {item.name ? item.name : ""}
                </Typography>
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.store_name, {
      id: "store",
      header: () => "Store",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.store_name ? item.store_name : "-"}
            </Typography>
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
            <Typography textTransform="capitalize" className="f-14">
              {item.supplier_code ? item.supplier_code : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row.product_categories, {
      id: "categories",
      header: () => "Categories",
      cell: ({ row }) => {
        const item = row.original;
        const selectedForRow = rowCategories[item.id] || [];

        return (
          <Stack
            sx={{ cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              handleEditCategories(item);
            }}
          >
            <Typography
              textTransform="capitalize"
              className="f-14"
              sx={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
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
              {selectedForRow.length
                ? selectedForRow.map((c) => c.name).join(", ")
                : item.product_categories || "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.user_name, {
      id: "assignUser",
      header: () => "Assign User",
      cell: ({ row }) => {
        const item = row.original;
        const name = item.user_name;
        const usersList = item.users_with_trades || [];

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {name ? name : "-"}
            </Typography>
            {usersList.length > 0 && item.order_id && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUsersList(usersList);
                  setSelectedTaskId(item.order_id);
                  setUsersDialogOpen(true);
                }}
              >
                <IconInfoCircle size={16} />
              </IconButton>
            )}
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row?.team_name, {
      id: "team",
      header: () => "Team",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.team_name ? item.team_name : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row.product_trades, {
      id: "trades",
      header: () => "Trades",
      cell: ({ row }) => {
        const item = row.original;
        const selectedForRow = rowTrades[item.id] || [];

        return (
          <Stack
            sx={{ cursor: "pointer", minWidth: 200 }}
            onClick={(e) => {
              e.stopPropagation();
              handleEditTrades(item);
            }}
          >
            <Typography
              textTransform="capitalize"
              className="f-14"
              sx={{
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
              {selectedForRow.length
                ? selectedForRow.map((c) => c.name).join(", ")
                : item.product_trades || "-"}
            </Typography>
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row?.assigned_days, {
      id: "borrowDays",
      header: () => "Borrow days",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
            <Typography className="f-14" fontWeight={500} sx={{ width: 100 }}>
              {item.assigned_days ? item.assigned_days : "-"}
            </Typography>
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row?.order_status, {
      id: "status",
      header: () => "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
            <Typography
              className="f-14"
              color={item.order_status_color}
              fontWeight={500}
              sx={{ width: 100 }}
            >
              {item.order_status ? item.order_status : "-"}
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
          <Stack direction="row" spacing={1} alignItems={"center"}>
            <Tooltip title="Edit">
              <IconButton onClick={() => handleEdit(item.id)} color="primary">
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="History">
              <IconButton
                onClick={() => {
                  setSelectedTaskId(item.product_id);
                  setProductHistoryDrawer(true);
                }}
                color="primary"
              >
                <IconClock size={18} />
              </IconButton>
            </Tooltip>
            {item.need_service && (
              <Typography color="error" variant="h6" fontWeight={500}>
                Need service
              </Typography>
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
    columns,
    fetchData: () => {
      if (activeStore?.id) {
        fetchProducts();
      }
    },
    debounceDependencies: [searchTerm, activeStore?.id, user?.company_id],
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
    <PermissionGuard permission="Tools">
      <Dialog open={!activeStore?.id} disableEscapeKeyDown>
        <DialogTitle>Select Store</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Typography variant="body2" mb={2}>
            Please select a store to view its tools.
          </Typography>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={""}
            onChange={(e) => {
              const storeId = Number(e.target.value);
              const store = stores.find((s) => s.id === storeId);
              if (store) {
                Cookies.set(
                  `tools_store_${user.id}_${user.company_id}`,
                  JSON.stringify({
                    id: store.id,
                    name: store.name,
                  }),
                  { expires: 365 },
                );
                setStoreId(store.id);
                window.location.reload();
              }
            }}
          >
            <MenuItem value="" disabled>
              Select Store
            </MenuItem>
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
      </Dialog>
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* for handling trade update */}
        <Dialog open={openTradeModal} onClose={() => setOpenTradeModal(false)}>
          <DialogTitle>Select Trades</DialogTitle>
          <DialogContent>
            <Autocomplete
              multiple
              className="product_selection"
              options={trades || []}
              getOptionLabel={(option) => option.name}
              value={editingRowId ? rowTrades[editingRowId] || [] : []}
              onChange={(_, newValue) => {
                setRowTrades((prev) => ({
                  ...prev,
                  [editingRowId!]: newValue,
                }));
              }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select trades" />
              )}
              size="small"
              sx={{ width: 400 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => handleTradeClose()} color="error">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRowId && editingProductId) {
                  updateTrades(
                    editingRowId,
                    editingProductId,
                    rowTrades[editingRowId],
                    editingStoreId,
                  );
                }
                setOpenTradeModal(false);
              }}
              variant="contained"
              color="primary"
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* for handling categories update */}
        <Dialog
          open={openCategoryModal}
          onClose={() => setOpenCategoryModal(false)}
        >
          <DialogTitle>Select Categories</DialogTitle>
          <DialogContent>
            <Autocomplete
              multiple
              className="product_selection"
              options={categories || []}
              getOptionLabel={(option) => option.name}
              value={Array.isArray(draftCategories) ? draftCategories : []}
              onChange={(_, newValue) => {
                setDraftCategories(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    draftCategories.length === 0 ? "Select categories" : ""
                  }
                />
              )}
              size="small"
              sx={{ width: 400 }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenCategoryModal(false);
                setDraftCategories([]);
              }}
              color="error"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRowId) {
                  setRowCategories((prev) => ({
                    ...prev,
                    [editingRowId]: draftCategories,
                  }));

                  updateCategories(editingRowId, draftCategories);
                }

                setOpenCategoryModal(false);
              }}
              variant="contained"
              color="primary"
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Primary Image Upload Dialog */}
        <Dialog
          open={openImageManager}
          onClose={() => {
            setOpenImageManager(false);
            setNewMainImage(null);
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Upload Primary Image</DialogTitle>
          <DialogContent>
            <div
              {...getImageRootProps()}
              style={{
                border: "2px dashed #1976d2",
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 20,
                backgroundColor: newMainImage ? "#e8f4ff" : undefined,
              }}
            >
              <input {...getImageInputProps()} />
              <Typography>
                {newMainImage
                  ? `Selected: ${newMainImage.name}`
                  : "Drag & drop, click to browse, or paste (Ctrl+V) an image"}
              </Typography>
            </div>
            {newMainImage && (
              <Box textAlign="center">
                <img
                  src={URL.createObjectURL(newMainImage)}
                  alt="preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenImageManager(false);
                setNewMainImage(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveMainImage}
              disabled={isSaving || !newMainImage}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openPreview}
          onClose={() => setOpenPreview(false)}
          fullScreen
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <IconButton
            onClick={() => setOpenPreview(false)}
            color="primary"
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 1301,
              backgroundColor: "#fff",
              "&:hover": {
                backgroundColor: "#eee",
                color: "#1e4db7",
              },
            }}
          >
            <IconX />
          </IconButton>

          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setOpenPreview(false)}
          >
            <img
              src={previewImage || ""}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "90% !important",
                height: "50%",
                objectFit: "contain",
              }}
            />
          </Box>
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
            <Button
              variant="contained"
              startIcon={<IconFileImport width={18} />}
              onClick={handleModelOpen}
            >
              Import
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

          {/* Modal for File Upload */}
          <Modal
            open={openModel}
            onClose={handleModelClose}
            disableEscapeKeyDown
          >
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: "background.paper",
                p: 3,
                borderRadius: 2,
                boxShadow: 24,
                width: 400,
              }}
            >
              <DialogTitle sx={{ p: 0 }}>
                <Typography color="GrayText" fontWeight={700}>
                  Upload Your File
                </Typography>
                <IconButton
                  onClick={() => handleModelClose()}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: 10,
                    backgroundColor: "transparent",
                  }}
                >
                  <IconX size={40} />
                </IconButton>
              </DialogTitle>

              <Box
                {...getExcelRootProps()}
                sx={{
                  width: 350,
                  height: 100,
                  mt: 2,
                  border: "2px dashed",
                  borderColor: "primary.main",
                  borderRadius: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": {
                    backgroundColor: "primary.light",
                  },
                }}
              >
                <input {...getExcelInputProps()} accept=".xls,.xlsx" />
                {preview ? (
                  preview
                ) : (
                  <Typography fontSize="12px" color="primary.main">
                    Click or Drag File
                  </Typography>
                )}
              </Box>
              <Typography fontSize="12px" color="text.secondary">
                Upload Excel File
              </Typography>
              {isImport && (
                <Box sx={{ mt: 2 }}>
                  {!isProcessing ? (
                    <>
                      <Typography variant="body2" mb={1}>
                        Uploading... {uploadProgress}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{ height: 8, borderRadius: 5 }}
                      />
                    </>
                  ) : (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">
                        Processing file...
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              {/* Action buttons */}
              <Box sx={{ mt: 2, display: "flex", justifyContent: "end" }}>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    downloadSampleFile();
                  }}
                  style={{
                    width: "100%",
                    color: "#1e4db7",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyItems: "center",
                  }}
                >
                  <FileDownload />
                  Download Sample File
                </Link>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    disabled={isImport}
                    onClick={(e: any) => {
                      importTools();
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleModelClose}
                    color="error"
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Box>
          </Modal>

          <Stack
            mb={2}
            justifyContent="end"
            direction={{ xs: "column", sm: "row" }}
          >
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                onClick={() => {
                  const selectedIds = Array.from(selectedRowIds);
                  setUsersToDelete(selectedIds);
                  setOpenDialog(true);
                }}
              >
                Archive
              </Button>
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
                        col.id === "QR"
                          ? "QR"
                          : col.columnDef.meta?.label
                            ? col.columnDef.meta.label
                            : typeof col.columnDef.header === "string" &&
                                col.columnDef.header.trim() !== ""
                              ? col.columnDef.header
                              : col.id
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/^./, (str: string) =>
                                    str.toUpperCase(),
                                  )
                                  .trim()
                      }
                    />
                  ))}
              </FormGroup>
            </Popover>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>Confirm Archive</DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to archive {usersToDelete.length}{" "}
                  product
                  {usersToDelete.length > 1 ? "s" : ""} from the products?
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
                        product_ids: usersToDelete.join(","),
                      };
                      const response = await api.post(
                        "products/archive",
                        payload,
                      );
                      toast.success(response.data.message);
                      setSelectedRowIds(new Set());
                      await fetchProducts();
                    } catch (error) {
                      toast.error("Failed to archive products");
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
                    setDrawerOpen(true);
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
                  Add New
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenStoreDialog(true);
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
                    <IconPlaylistAdd width={18} />
                  </ListItemIcon>
                  Add Product
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenToolDrawer(true);
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
                    <IconEdit width={18} />
                  </ListItemIcon>
                  Assign tool to user
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchiveDrawerOpen(true);
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
                  Archived Tool List
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCategoriesDrawerOpen(true);
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
                    <IconKeyframes width={18} />
                  </ListItemIcon>
                  Categories
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setHistoryDrawer(true);
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
          </Stack>
        </Stack>
        <Divider />

        {/* Add Edit Tool */}
        <AddEditTool
          open={drawerOpen}
          onClose={() => onClose()}
          companyId={user?.company_id ?? null}
          onWorkUpdated={fetchProducts}
          setId={selectedTaskId}
        />

        {/* Add product */}
        <ProductAddEdit
          open={openProductDrawer}
          onClose={() => setOpenProductDrawer(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          storeId={selectedStore ?? null}
          companyId={user?.company_id ?? null}
        />

        {/* Assign tool */}
        <AssignUserTool
          open={openToolDrawer}
          onClose={() => onClose()}
          companyId={user?.company_id ?? null}
          onWorkUpdated={fetchProducts}
          setId={selectedTaskId}
          preselectedUserId={preselectedUserId}
        />

        {/* history */}
        <HireHistory
          open={historyDrawer}
          onClose={() => onClose()}
          companyId={user?.company_id ?? null}
          onWorkUpdated={fetchProducts}
          setId={selectedTaskId}
        />

        {/* Product history */}
        <ProductHistory
          open={productHistoryDrawer}
          onClose={() => onClose()}
          productId={selectedTaskId}
        />

        {/* Archive task list */}
        <ArchiveTools
          open={archiveDrawerOpen}
          onClose={() => setArchiveDrawerOpen(false)}
          onWorkUpdated={fetchProducts}
        />

        {/* Categories list */}
        <ToolCategoriesDrawer
          open={categoriesDrawerOpen}
          onClose={() => onClose()}
          onWorkUpdated={fetchResources}
          companyId={user?.company_id ?? null}
        />

        {/* View product */}
        <ProductView
          open={viewDrawerOpen}
          onClose={() => closeDrawer()}
          productId={selectedTaskId}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
          companyId={user?.company_id ?? null}
          isCategory={true}
        />

        <Dialog
          maxWidth={"sm"}
          fullWidth
          open={openStoreDialog}
          onClose={() => setOpenStoreDialog(false)}
        >
          <DialogTitle>Select Store</DialogTitle>

          <DialogContent>
            <Select
              fullWidth
              value={selectedStore || ""}
              onChange={(e) => setSelectedStore(Number(e.target.value))}
            >
              {stores.map((store) => (
                <MenuItem key={store.id} value={store.id}>
                  {store.name}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenStoreDialog(false)}>Cancel</Button>

            <Button
              variant="contained"
              disabled={!selectedStore}
              onClick={() => {
                if (!selectedStore) return;

                setOpenStoreDialog(false);
                setOpenProductDrawer(true);
              }}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        {/* Users List Dialog */}
        <Dialog
          open={usersDialogOpen}
          onClose={() => onClose()}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Trades</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              {selectedUsersList.length > 0 ? (
                selectedUsersList.map((item: any) => (
                  <Box key={item.id} display="flex" alignItems="center" gap={2}>
                    <Image
                      src={item.image_url || "/images/users/user.svg"}
                      alt={item.name?.[0]?.toUpperCase()}
                      width={40}
                      height={40}
                      style={{ borderRadius: "50%" }}
                    />
                    <Typography variant="body1" flex={1}>
                      {item.name}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        try {
                          const payload = {
                            company_id: user.company_id,
                            order_id: selectedTaskId,
                            user_id: item.id,
                          };
                          const res = await api.post(
                            "hire-orders/update-user",
                            payload,
                          );
                          if (res.data?.IsSuccess) {
                            toast.success(res.data.message);
                            setUsersDialogOpen(false);
                            fetchProducts();
                          }
                        } catch (err: any) {}
                      }}
                    >
                      Assign
                    </Button>
                  </Box>
                ))
              ) : (
                <Typography>No users found.</Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onClose()}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* archive client */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to archive products from Tools?
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
                  const payload = {
                    ids: usersToDelete.join(","),
                  };
                  const response: AxiosResponse<any> = await api.post(
                    "product-tools/archive",
                    payload,
                  );
                  toast.success(response.data.message);
                  setSelectedRowIds(new Set());
                  await fetchProducts();
                } catch (error) {
                } finally {
                  setOpenDialog(false);
                }
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

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
                          sx={{
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            width:
                              header.column.id === "actions" ? 100 : "auto",

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
                      <TableRow
                        key={row.id}
                        hover
                        sx={{
                          cursor: "pointer",
                        }}
                      >
                        {row.getVisibleCells().map((cell) => {
                          return (
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
                          );
                        })}
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
        <TablePaginationFooter table={table} totalRows={totalRows} />
      </Box>
    </PermissionGuard>
  );
};

export default ToolsList;
