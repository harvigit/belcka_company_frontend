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
  Modal,
  LinearProgress,
  CircularProgress,
  Autocomplete,
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
  IconBasket,
  IconChevronLeft,
  IconChevronRight,
  IconFileExport,
  IconFileImport,
  IconFilter,
  IconNotes,
  IconSearch,
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
import ProductAddEdit from "../create";
import ArchiveProduct from "../archive";
import { IconEye } from "@tabler/icons-react";
import { FileDownload } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import ProductView from "../view";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ProductHistory from "../history";
import UnitList from "../../units/list";
import { IconLayersIntersect } from "@tabler/icons-react";
import SetList from "../sets/list";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

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
  manufacture?: number | null;
  model?: number | null;
  qty?: number | null;
}

const ProductList = () => {
  const [data, setData] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(true);
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
  const [isImport, setIsImport] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [archiveProductList, setArchiveProductList] = useState<boolean>(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ supplier: "", category: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    id: 0,
    company_id: user?.company_id,
    name: "",
    sort_id: 0,
    short_name: "",
    description: "",
    uuid: "",
    status: true,
    qty: 0,
  });
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [productSetOpen, setProductSetOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<any | null>(null);
  const [openImageManager, setOpenImageManager] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [uploadedImages, setUploadedImages] = useState<
    { id: number; url: string; isMain: boolean }[]
  >([]);

  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const [newOtherImages, setNewOtherImages] = useState<File[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [mainImageId, setMainImageId] = useState<number | null>(null);
  const [originalUploadedImages, setOriginalUploadedImages] = useState([]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [editing, setEditing] = useState<{
    id: number | null;
    field: "price" | "market_price" | "max_stock" | null;
  }>({ id: null, field: null });
  const [inputValue, setInputValue] = useState("");
  const [rowCategories, setRowCategories] = useState<Record<string, any[]>>({});
  const [draftCategories, setDraftCategories] = useState<any[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictProducts, setConflictProducts] = useState<any[]>([]);
  const [isConflictLoading, setIsConflictLoading] = useState(false);
  const [selectedConflictIds, setSelectedConflictIds] = useState<number[]>([]);

  useEffect(() => {
    if (selectedRow) {
      setUploadedImages(selectedRow.product_images || []);
      setOriginalUploadedImages(selectedRow.product_images || []);
    }
  }, [selectedRow]);
  // Load images when row is selected
  useEffect(() => {
    if (!selectedRow) return;

    const existingImages = [
      selectedRow.image_url
        ? { id: 0, image_url: selectedRow.image_url }
        : null,
      ...(selectedRow.product_images || []),
    ]
      .filter((img): img is { id: number; image_url: string } => !!img)
      .map((img) => ({
        id: img.id,
        url: img.image_url,
        isMain: img.image_url === selectedRow.image_url,
      }));

    setUploadedImages(existingImages);

    const mainIdx = existingImages.findIndex((img) => img.isMain);
    setMainImageId(mainIdx >= 0 ? mainIdx : null);

    setNewImages([]);
    setNewOtherImages([]);
    setNewMainImage(null);
  }, [selectedRow]);

  const handleSetMainExisting = (id: number) => {
    setUploadedImages((prev) =>
      prev.map((img) => ({
        ...img,
        isMain: img.id === id,
      })),
    );
    setMainImageId(id);
    setNewMainImage(null); // deselect new images if any
  };

  const handleSetMainNew = (file: File) => {
    setNewMainImage(file);
    setMainImageId(null); // clear existing main
    setUploadedImages((prev) => prev.map((img) => ({ ...img, isMain: false })));
  };

  const onDrop = (acceptedFiles: File[]) => {
    setNewImages((prev) => [...prev, ...acceptedFiles]);
    setNewOtherImages((prev) => [...prev, ...acceptedFiles]);
  };

  const handleModelOpen = () => {
    setPreview(null);
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
    link.href = "/files/products_export.xlsx";
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

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } =
    useDropzone({
      accept: {
        "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      },
      onDrop: onDrop,
    });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const closeDrawer = () => {
    setViewDrawerOpen(false);
    fetchProducts();
  };

  useEffect(() => {
    if (!openImageManager) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.startsWith("image")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        setNewImages((prev) => [...prev, ...imageFiles]);
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [openImageManager]);

  const handleSaveImages = async () => {
    if (!selectedRow) return;

    setIsSaving(true);

    const formData = new FormData();
    formData.append("id", String(selectedRow.id));

    const originalMainImage = selectedRow.image_url;

    const removedIds = originalUploadedImages
      .filter((orig: any) => !uploadedImages.some((u) => u.id === orig.id))
      .map((img: any) => img.id);

    removedIds.forEach((id) => {
      formData.append("removed_image_ids[]", String(id));
    });

    if (newMainImage) {
      formData.append("image", newMainImage);

      newImages
        .filter((file) => file !== newMainImage)
        .forEach((file) => {
          formData.append("files", file);
        });
    } else {
      if (mainImageId !== null) {
        formData.append("main_image_id", String(mainImageId));
      }

      // Upload normal new images
      newImages.forEach((file) => {
        formData.append("files", file);
      });

      // If main image was deleted
      const mainStillExists = uploadedImages.some(
        (img) => img.url === originalMainImage,
      );

      if (!mainStillExists && originalMainImage) {
        formData.append("remove_image", "1");
      }
    }

    try {
      const currentPage = table.getState().pagination.pageIndex;

      const res = await api.post(`products/new-images`, formData, {
        headers: { "Content-Type": undefined },
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchProducts(currentPage);
        setOpenImageManager(false);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    }

    setIsSaving(false);
  };

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}`,
      );
      if (res.data) {
        setSuppliers(res.data.suppliers);
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  // Fetch data
  const fetchProducts = async (restorePage?: number) => {
    setFetchProduct(true);
    try {
      const res = await api.get(
        `products/get?company_id=${user.company_id}&is_products=true`,
      );
      if (res.data) {
        setData(res.data.info);
        setCurrency(res.data.info[0]?.currency);

        if (restorePage !== undefined) {
          setTimeout(() => {
            table.setPageIndex(restorePage);
          }, 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
    setFetchProduct(false);
  };

  useEffect(() => {
    fetchResources();
    fetchProducts();
  }, []);

  const exportProducts = async () => {
    try {
      const selectedIds = Array.from(selectedRowIds);
      const ids = selectedIds.join(",");
      const res = await api.get(
        `products/export?company_id=${user.company_id}&ids=${ids}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `products_export.xlsx`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      fetchProducts();
      setSelectedRowIds(new Set());
    } catch (err) {
      console.error("Failed to export products", err);
    }
  };

  const importProducts = async () => {
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
      formData.append("with_stock_import", "true");
      formData.append("selected_type", "addEditRecord");
      // formData.append("store_id", "1");

      const res = await api.post("products/import", formData, {
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

      if (res.data.conflicts?.length > 0) {
        setConflictProducts(res.data.conflicts);
        setConflictOpen(true);

        return;
      }

      toast.success(res.data.message);

      fetchProducts();

      setTimeout(() => {
        handleModelClose();
        setUploadProgress(0);
        setIsProcessing(false);
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setIsImport(false);
    }
  };

  const handleDeleteConflictProduct = async (productId: number) => {
    try {
      setIsConflictLoading(true);

      await api.post("products/archive", {
        product_ids: String(productId),
      });

      const updated = conflictProducts.filter(
        (item: any) => item.product_id !== productId,
      );

      setConflictProducts(updated);

      if (updated.length === 0) {
        setConflictOpen(false);
      }

      toast.success("Product archived successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to archive product");
    } finally {
      setIsConflictLoading(false);
    }
  };
  const handleKeepAll = () => {
    setConflictOpen(false);
    setSelectedConflictIds([]);
    handleModelClose();
  };

  const handleOpenCreateDrawer = () => {
    setFormData({
      id: 0,
      company_id: user?.company_id,
      name: "",
      sort_id: 0,
      short_name: "",
      description: "",
      uuid: "",
      status: true,
      qty: 0,
    });
    setDrawerOpen(true);
  };

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

      const result = await api.post("products/create", formPayload, {
        headers: {
          "Content-Type": undefined,
        },
      });

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setDrawerOpen(false);
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

  const handleEditCategories = (item: any) => {
    setEditingRowId(item.id);

    let initialCategories: any[] = [];

    if (rowCategories[item.id]) {
      initialCategories = rowCategories[item.id];
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
        category_ids: selected.map((c) => c.id).join(","),
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

  const updateStockLimit = async (id: string, limit: any) => {
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        max_stock: limit,
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

  const updatePrice = async (
    id: number,
    price?: number,
    market_price?: number,
  ) => {
    try {
      const payload: any = { id };

      if (price !== undefined) payload.price = Number(price);
      if (market_price !== undefined)
        payload.market_price = Number(market_price);

      const res = await api.post("products/update-price", payload);

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchProducts();
      }
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      if (filters.supplier == "All") return data;
      if (filters.category == "All") return data;
      const matchesSupplier = filters.supplier
        ? item.supplier_name === filters.supplier
        : true;

      const matchesCategory = filters.category
        ? item.product_categories
            ?.toLowerCase()
            .split(",")
            .map((c: any) => c.trim())
            .includes(filters.category.toLowerCase())
        : true;

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.short_name?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search) ||
        item.price?.toLowerCase().includes(search) ||
        item.supplier_code?.toLowerCase().includes(search) ||
        item.product_categories?.toLowerCase().includes(search) ||
        item.barcode_text?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search);

      return matchesSearch && matchesCategory && matchesSupplier;
    });
  }, [data, searchTerm, filters]);

  const handleView = useCallback((id: number) => {
    setSelectedTaskId(id);
    setViewDrawerOpen(true);
  }, []);
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
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(item);
                setOpenImageManager(true);
              }}
            >
              <AddCircleOutlineIcon fontSize="small" />
            </IconButton>
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
              placement="top"
              arrow
            >
              <Typography
                className="f-14"
                variant="body1"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: 300,
                  wordBreak: "break-word",
                }}
              >
                {item.short_name ? item.short_name : "-"}
                <Typography color="textSecondary" className="f-14">
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
            <Typography textTransform="capitalize" className="f-14">
              {item.supplier_code ? item.supplier_code : "-"}
            </Typography>
          </Stack>
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

    columnHelper.accessor((row) => row.product_categories, {
      id: "categories",
      header: () => "Categories",
      cell: ({ row }) => {
        const item = row.original;
        const selectedForRow = rowCategories[item.id] || [];

        return (
          <Stack
            sx={{ cursor: "pointer", minWidth: 200 }}
            onClick={(e) => {
              e.stopPropagation();
              handleEditCategories(item);
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
                : item.product_categories || "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.max_stock, {
      id: "stockLimit",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Stock Limit
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing =
          editing.id === item.id && editing.field === "max_stock";

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d*$/.test(value)) {
                    if (value === "" || Number(value) <= 9999) {
                      setInputValue(value);
                    }
                  }
                }}
                onBlur={async () => {
                  if (inputValue === "") return;
                  let number = Number(inputValue);
                  if (number > 9999) {
                    return;
                  }
                  updateStockLimit(item.id, number);

                  setEditing({ id: null, field: null });
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    let number = Number(inputValue);
                    if (number > 9999) {
                      return;
                    }
                    updateStockLimit(item.id, number);
                    setEditing({ id: null, field: null });
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
                  "&:hover": {
                    border: "1px solid #1976d2",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing({ id: item.id, field: "max_stock" });
                  setInputValue(item.max_stock || "0");
                }}
              >
                {item.max_stock || "0"}
              </Typography>
            )}
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

    columnHelper.accessor((row) => row?.price, {
      id: "buying",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Buying({currency ? currency : "£"})
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editing.id === item.id && editing.field === "price";

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d*(\.\d{0,2})?$/.test(value)) {
                    if (value === "" || Number(value) <= 10000) {
                      setInputValue(value);
                    }
                  }
                }}
                onBlur={async () => {
                  if (inputValue === "") return;
                  let number = Number(inputValue);
                  if (number > 10000) {
                    return;
                  }

                  const formatted = number.toFixed(2);

                  await updatePrice(item.id, Number(formatted), undefined);

                  setEditing({ id: null, field: null });
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    let number = Number(inputValue);
                    if (number > 10000) {
                      return;
                    }
                    const formatted = number.toFixed(2);

                    await updatePrice(item.id, Number(formatted), undefined);
                    setEditing({ id: null, field: null });
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
                  "&:hover": {
                    border: "1px solid #1976d2",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing({ id: item.id, field: "price" });
                  setInputValue(item.price || "0");
                }}
              >
                {item.currency}
                {item.price || "0"}
              </Typography>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.market_price, {
      id: "market",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Market({currency ? currency : "£"})
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing =
          editing.id === item.id && editing.field === "market_price";

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Amount */}
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
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^\d*(\.\d{0,2})?$/.test(value)) {
                    if (value === "" || Number(value) <= 10000) {
                      setInputValue(value);
                    }
                  }
                }}
                onBlur={async () => {
                  if (inputValue === "") return;
                  let number = Number(inputValue);
                  if (number > 10000) {
                    return;
                  }

                  const formatted = number.toFixed(2);

                  await updatePrice(item.id, undefined, Number(formatted));

                  setEditing({ id: null, field: null });
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    let number = Number(inputValue);
                    if (number > 10000) {
                      return;
                    }
                    const formatted = number.toFixed(2);

                    await updatePrice(item.id, undefined, Number(formatted));
                    setEditing({ id: null, field: null });
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
                  "&:hover": {
                    border: "1px solid #1976d2",
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing({ id: item.id, field: "market_price" });
                  setInputValue(item.market_price || "0");
                }}
              >
                {item.currency}
                {item.market_price || "0"}
              </Typography>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.stock_status, {
      id: "availability",
      header: () => "Availability",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 1 }}>
            <Typography
              className="f-14"
              color={item.status_color}
              fontWeight={500}
              sx={{ width: 100 }}
            >
              {item.stock_status ? item.stock_status : "-"}
            </Typography>
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
    autoResetPageIndex: false,
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
  }, [searchTerm]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Products">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
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

        {/* for handling image upload */}
        <Dialog
          open={openImageManager}
          onClose={() => setOpenImageManager(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Image</DialogTitle>
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
              }}
            >
              <input {...getImageInputProps()} />
              <Typography>Drag & drop or paste images</Typography>
            </div>

            <Grid container spacing={2}>
              {uploadedImages.map((img) => (
                <Grid key={img.id} style={{ position: "relative" }}>
                  <img
                    src={img.url}
                    width={80}
                    height={80}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />

                  {/* Main image selector */}
                  <button
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      background: img.isMain ? "#1976d2" : "rgba(0,0,0,0.4)",
                      color: "white",
                      fontSize: 12,
                      border: "none",
                      borderRadius: "0 4px 0 0",
                      padding: "2px 4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSetMainExisting(img.id)}
                  >
                    {img.isMain ? "Primary" : "Images"}
                  </button>

                  {/* Delete button */}
                  <IconButton
                    color="error"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      backgroundColor: "#fff",
                      zIndex: 2,
                      "&:hover": {
                        backgroundColor: "#fff",
                        color: "red",
                      },
                    }}
                    onClick={() =>
                      setUploadedImages(
                        uploadedImages.filter((i) => i.id !== img.id),
                      )
                    }
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Grid>
              ))}

              {newImages.map((file, index) => (
                <Grid key={index} style={{ position: "relative" }}>
                  <img
                    src={URL.createObjectURL(file)}
                    width={80}
                    height={80}
                    style={{ objectFit: "cover", borderRadius: 4 }}
                  />

                  {/* Main selector for new files */}
                  <button
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      background:
                        newMainImage === file ? "#1976d2" : "rgba(0,0,0,0.4)",
                      color: "white",
                      fontSize: 12,
                      border: "none",
                      borderRadius: "0 4px 0 0",
                      padding: "2px 4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSetMainNew(file)}
                  >
                    Primary
                  </button>

                  <IconButton
                    size="small"
                    color="error"
                    sx={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      backgroundColor: "#fff",
                      zIndex: 2,
                      "&:hover": {
                        backgroundColor: "#fff",
                        color: "red",
                      },
                    }}
                    onClick={() =>
                      setNewImages(newImages.filter((_, i) => i !== index))
                    }
                  >
                    <IconTrash size={16} />
                  </IconButton>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImageManager(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSaveImages}
              disabled={isSaving}
            >
              Save
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
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFilter width={18} />
            </Button>
            <Button
              variant="contained"
              onClick={exportProducts}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFileExport width={18} /> Export
            </Button>

            <Button
              variant="contained"
              startIcon={<IconFileImport width={18} />}
              onClick={handleModelOpen}
            >
              Import
            </Button>
          </Grid>
          {/* file Import model */}

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
                Upload Excel Files
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
                      importProducts();
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
            <Button
              color="primary"
              variant="outlined"
              size="small"
              onClick={() => setOpenDrawer(true)}
              sx={{
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Activity
            </Button>

            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                sx={{ marginRight: "5px", marginLeft: 1 }}
                onClick={() => {
                  const selectedIds = Array.from(selectedRowIds);
                  setUsersToDelete(selectedIds);
                  setConfirmOpen(true);
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
            {/* conflict dialog */}
            <Dialog
              open={conflictOpen}
              maxWidth="md"
              fullWidth
              onClose={(event, reason) => {
                if (reason === "backdropClick" || reason === "escapeKeyDown")
                  return;
                setConflictOpen(false);
              }}
              disableEscapeKeyDown
            >
              <DialogTitle>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberIcon color="warning" />
                  <Typography variant="h6" fontWeight={700}>
                    Duplicate product found
                  </Typography>
                </Stack>
              </DialogTitle>

              <DialogContent dividers>
                <Stack spacing={2}>
                  {conflictProducts.map((item: any, index: number) => (
                    <Box
                      key={index}
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Image
                          src={item.image || "/images/products/product.svg"}
                          alt="Product"
                          height={60}
                          width={60}
                        />

                        <Box flex={1}>
                          <Typography fontWeight={700}>
                            {item.short_name || item.name}
                          </Typography>

                          <Typography variant="body2">
                            UUID: {item.uuid || "-"}
                          </Typography>

                          <Typography variant="body2">
                            Product ID: {item.product_id}
                          </Typography>

                          <Typography variant="body2">
                            Short Name: {item.short_name}
                          </Typography>
                        </Box>

                        <IconButton
                          color="error"
                          disabled={isConflictLoading}
                          onClick={() =>
                            handleDeleteConflictProduct(item.product_id)
                          }
                        >
                          <IconTrash size={20} />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </DialogContent>

              <DialogActions sx={{ p: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleKeepAll}
                  disabled={isConflictLoading}
                >
                  Keep All
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
                    handleOpenCreateDrawer();
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
                  Add Product
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setProductSetOpen(true);
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
                    <IconLayersIntersect width={18} />
                  </ListItemIcon>
                  Product Sets
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchiveProductList(true);
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
                  Archived Product list
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setUnitDrawerOpen(true);
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
                    <IconBasket width={18} />
                  </ListItemIcon>
                  Units
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
                    });
                    setFilters({
                      supplier: "",
                      category: "",
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

        {/* Add product */}
        <ProductAddEdit
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          isSaving={isSaving}
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
        />

        {/* Archive Product List */}
        <ArchiveProduct
          open={archiveProductList}
          companyId={Number(user.company_id)}
          onClose={() => setArchiveProductList(false)}
          onWorkUpdated={fetchProducts}
        />

        <ProductHistory
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
        />

        <UnitList
          openDrawer={unitDrawerOpen}
          onClose={() => setUnitDrawerOpen(false)}
        />

        <SetList
          openDrawer={productSetOpen}
          onClose={() => setProductSetOpen(false)}
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
                          sx={{
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            width:
                              header.column.id === "actions" ||
                              header.column.id === "price" ||
                              header.column.id === "barcode"
                                ? 80
                                : header.column.id === "QrCode"
                                  ? 120
                                  : header.column.id === "supplierCode"
                                    ? 140
                                    : header.column.id === "select"
                                      ? 30
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
                              onClick={() => handleView(item.id)}
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
      </Box>
    </PermissionGuard>
  );
};

export default ProductList;
