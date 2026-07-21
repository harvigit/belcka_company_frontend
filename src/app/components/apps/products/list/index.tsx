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
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import {
  IconFileExport,
  IconFileImport,
  IconFilter,
  IconHistory,
  IconNotes,
  IconSearch,
  IconTrash,
  IconX,
  IconSettings,
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
import ProductAddEdit from "../create";
import ArchiveProduct from "../archive";
import { IconEye } from "@tabler/icons-react";
import { FileDownload } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import ProductView from "../view";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ProductHistory from "../history";
import { IconLayersIntersect } from "@tabler/icons-react";
import SetList from "../sets/list";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ManagePriceDrawer from "../manage-price";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import HireOrderHistory from "../hire-history";
import Settings from "../settings";

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

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const ProductList = () => {
  const [data, setData] = useState<any[]>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllAcrossPages = async (checked: boolean) => {
    if (!checked) {
      setSelectedRowIds(new Set());
      return;
    }
    try {
      (window as any).__isSelectingAll = true;
      await fetchProducts();
      (window as any).__isSelectingAll = false;
      if ((window as any).__lastFetchedIds) {
        setSelectedRowIds(new Set((window as any).__lastFetchedIds));
      }
    } catch (err: any) {
      if (err.message !== 'SELECT_ALL_INTERCEPT') {
        console.error(err);
      }
    } finally {
      (window as any).__isSelectingAll = false;
      }
  }

  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id: number;
    user_role_id: number;
  };

  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_products`,
    enabled: !!user?.id,
  });

  const [productPermission, setProductPermission] = useState<string | null>(
    null,
  );

  const fetchProductPermission = async () => {
    try {
      const res = await api.get(
        `setting/payrate-users?company_id=${user.company_id}`,
      );
      if (res.data.IsSuccess) {
        const currentUserData = res.data.info.find(
          (u: any) => u.user_id === user.id || u.id === user.id,
        );
        if (currentUserData) {
          setProductPermission(currentUserData.product_permission);
        }
      }
    } catch (err) {
      console.error("Failed to fetch product permission", err);
    }
  };

  useEffect(() => {
    if (user?.company_id && user?.id && user?.user_role_id !== 1) {
      fetchProductPermission();
    }
  }, [user?.company_id, user?.id, user?.user_role_id]);

  const isAdmin = user?.user_role_id === 1;
  const canView =
    isAdmin ||
    productPermission === "view" ||
    productPermission === "view_edit";
  const canEdit = isAdmin || productPermission === "view_edit";
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
  const [filters, setFilters] = useState<{
    supplier: string;
    category: string;
    projects: any[];
  }>({ supplier: "", category: "", projects: [] });
  const [tempFilters, setTempFilters] = useState(filters);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignCategoryOpen, setAssignCategoryOpen] = useState(false);
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);
  const [selectedCategoryToAssign, setSelectedCategoryToAssign] =
    useState<any>(null);
  const [selectedProjectToAssign, setSelectedProjectToAssign] = useState<any[]>(
    [],
  );
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
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
  const [productSetOpen, setProductSetOpen] = useState(false);
  const [hireHistoryDrawer, setHireHistoryDrawer] = useState(false);
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

  const [rowProjects, setRowProjects] = useState<Record<string, any[]>>({});
  const [draftProjects, setDraftProjects] = useState<any[]>([]);
  const [editingProjectRowId, setEditingProjectRowId] = useState<string | null>(
    null,
  );
  const [openProjectModal, setOpenProjectModal] = useState(false);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictProducts, setConflictProducts] = useState<any[]>([]);
  const [isConflictLoading, setIsConflictLoading] = useState(false);
  const [selectedConflictIds, setSelectedConflictIds] = useState<number[]>([]);
  const [priceDrawerOpen, setPriceDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handlePriceOpen = (item: any) => {
    setSelectedProduct(item);
    setPriceDrawerOpen(true);
  };

  const handlePriceClose = () => {
    setPriceDrawerOpen(false);
    setSelectedProduct(null);
  };
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
    link.href = "/files/products_import.xlsx";
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

        setData((prev: any[]) =>
          prev.map((p) => {
            if (p.id === selectedRow.id) {
              let newImageUrl = p.image_url;
              if (res.data.data?.image_url) {
                newImageUrl = res.data.data.image_url;
              } else if (res.data.image_url) {
                newImageUrl = res.data.image_url;
              } else if (newMainImage) {
                newImageUrl = URL.createObjectURL(newMainImage);
              } else if (mainImageId !== null) {
                const selectedImg = uploadedImages.find(
                  (img) => img.id === mainImageId,
                );
                if (selectedImg) newImageUrl = selectedImg.url;
              } else {
                const mainStillExists = uploadedImages.some(
                  (img) => img.url === originalMainImage,
                );
                if (!mainStillExists && originalMainImage) {
                  newImageUrl = null;
                }
              }
              return { ...p, image_url: newImageUrl };
            }
            return p;
          }),
        );

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
      const projectRes = await api.get(
        `project/get?company_id=${user.company_id}`,
      );
      if (projectRes.data) {
        setProjects(projectRes.data.projects || projectRes.data.info || []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  // Fetch data
  const fetchProducts = async (restorePage?: number) => {
    setFetchProduct(true);
    try {
      let url = `products/get?company_id=${user.company_id}&is_products=true&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      if (filters.category && filters.category !== "All") {
        const categoryId = categories.find(
          (c) => c.name === filters.category,
        )?.id;
        if (categoryId) {
          url += `&category_ids=${categoryId}`;
        }
      }
      if (filters.supplier && filters.supplier !== "All") {
        const supplierObj = suppliers.find((s) => s.name === filters.supplier);
        if (supplierObj) {
          url += `&supplier_ids=${supplierObj.id}`;
        } else {
          url += `&supplier=${encodeURIComponent(filters.supplier)}`;
        }
      }
      if (filters.projects && filters.projects.length > 0) {
        const projectIds = filters.projects.map((p: any) => p.id).join(",");
        url += `&project_ids=${projectIds}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData =
          res.data.info || res.data.data?.data || res.data.data || [];
        setData(responseData);

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

        if (responseData.length > 0) {
          setCurrency(responseData[0]?.currency || "");
        }

        if (restorePage !== undefined) {
          setTimeout(() => {
            setPagination((prev) => ({ ...prev, pageIndex: restorePage }));
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
  }, []);

  const exportProducts = async () => {
    try {
      const selectedIds = Array.from(selectedRowIds);
      const ids = selectedIds.join(",");
      const payload = {
        company_id: user.company_id,
        ids: ids,
      };
      const res = await api.post(`products/export`, payload, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `products_import.xlsx`;
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
        setConflictProducts(res.data.conflicts || []);
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

  const handleDeleteConflictProduct = async (
    productId: number,
    type: "original" | "imported",
  ) => {
    try {
      setIsConflictLoading(true);

      const res = await api.post("products/archive", {
        product_ids: String(productId),
      });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);

        setConflictProducts((prev: any[]) => {
          const updated = prev
            .map((item: any) => {
              if (
                type === "original" &&
                item.original_product?.id === productId
              ) {
                return {
                  ...item,
                  original_product: null,
                };
              }

              if (
                type === "imported" &&
                item.imported_product?.id === productId
              ) {
                return {
                  ...item,
                  imported_product: null,
                };
              }

              return item;
            })
            .filter(
              (item: any) =>
                item.original_product !== null ||
                item.imported_product !== null,
            );

          if (updated.length === 0) {
            setConflictOpen(false);
          }

          return updated;
        });

        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setIsConflictLoading(false);
    }
  };

  const handleKeepAll = () => {
    fetchProducts();
    setSelectedConflictIds([]);
    setConflictOpen(false);
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

      if (barcodes.length > 0) {
        formPayload.append("barcode_text", barcodes.join(","));
      }

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
        setData((prev: any[]) =>
          prev.map((p) => {
            if (p.id === Number(id)) {
              return {
                ...p,
                category_ids: selected.map((c) => c.id).join(","),
                product_categories: selected,
              };
            }
            return p;
          }),
        );
        setOpenCategoryModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditProjects = (item: any) => {
    setEditingProjectRowId(item.id);

    let initialProjects: any[] = [];

    if (rowProjects[item.id]) {
      initialProjects = rowProjects[item.id];
    } else if (Array.isArray(item.project_names)) {
      initialProjects = item.project_names;
    } else if (typeof item.project_names === "string") {
      initialProjects = item.project_names
        .split(",")
        .map((name: string) => ({ name: name.trim() }));
    }

    const selectedIds = item.project_ids
      ? item.project_ids.split(",").map((id: string) => Number(id))
      : [];
    initialProjects = projects.filter((proj) => selectedIds.includes(proj.id));

    setDraftProjects(initialProjects);
    setOpenProjectModal(true);
  };

  const updateProjects = async (id: string, selected: any[]) => {
    try {
      const payload = {
        product_ids: [Number(id)],
        project_ids: selected.map((p) => p.id),
      };
      const res = await api.post("products/bulk-assign-projects", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Updated projects");
        setData((prev: any[]) =>
          prev.map((p) => {
            if (p.id === Number(id)) {
              return {
                ...p,
                project_ids: selected.map((proj) => proj.id).join(","),
                project_names: selected,
              };
            }
            return p;
          }),
        );
        setRowProjects((prev) => ({
          ...prev,
          [id]: selected,
        }));
        setOpenProjectModal(false);
      } else {
        toast.error(res.data.message || "Failed to update projects");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update projects");
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

  const updateSubQty = async (id: string, is_sub_qty: boolean) => {
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        is_sub_qty,
      };

      const res = await api.post("products/update", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setData((prev: any[]) =>
          prev.map((p) =>
            p.id === Number(id)
              ? {
                  ...p,
                  is_sub_qty,
                }
              : p,
          ),
        );
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
        setData((prev: any[]) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(price !== undefined && { price }),
                  ...(market_price !== undefined && { market_price }),
                }
              : p,
          ),
        );
      }
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  const handleView = useCallback((id: number) => {
    setSelectedTaskId(id);
    setViewDrawerOpen(true);
  }, []);

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = (document as any).execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) toast.success("Copied!");
      else toast.error("Copy failed!");
    } catch (err) {
      console.error("Fallback copy failed:", err);
      toast.error("Failed to copy!");
    }
  };

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
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); e.preventDefault(); handleSelectAllAcrossPages(e.target.checked); }}
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
        const uuid = item.uuid ? item.uuid : "-";
        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3 }}
          >
            <Typography
              textTransform="capitalize"
              className="f-14"
              onClick={() => {
                if (!uuid) {
                  toast.error("No uuid to copy!");
                  return;
                }

                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard
                    .writeText(uuid)
                    .then(() => toast.success("Copied!"))
                    .catch((err) => {
                      console.error("Clipboard API failed:", err);
                      fallbackCopy(uuid);
                    });
                } else {
                  fallbackCopy(uuid);
                }
              }}
            >
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
            {canEdit && (
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
            )}
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
            onClick={() => handleView(item.id)}
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
                  WebkitLineClamp: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.25,
                  maxWidth: 300,
                  width: 250,
                  wordBreak: "break-word",
                  "&:hover": { color: "#1976d2" },
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
        const code = item.supplier_code ? item.supplier_code : "-";
        return (
          <Stack direction="row" alignItems="center">
            <Typography
              textTransform="capitalize"
              className="f-14"
              onClick={() => {
                if (!code) {
                  toast.error("No code to copy!");
                  return;
                }

                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard
                    .writeText(code)
                    .then(() => toast.success("Code copied!"))
                    .catch((err) => {
                      console.error("Clipboard API failed:", err);
                      fallbackCopy(code);
                    });
                } else {
                  fallbackCopy(code);
                }
              }}
            >
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
        const placeholder = "/images/products/product.svg";

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Image
              src={item.qr_code_url || placeholder}
              alt={"QR code"}
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
            sx={{ cursor: canEdit ? "pointer" : "default" }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) handleEditCategories(item);
            }}
          >
            <Tooltip
              title={
                selectedForRow.length
                  ? selectedForRow.map((c) => c.name).join(", ")
                  : item.product_categories || ""
              }
            >
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
                {selectedForRow.length
                  ? selectedForRow.map((c) => c.name).join(", ")
                  : item.product_categories || "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row.project_names, {
      id: "projects",
      header: () => "Projects",
      cell: ({ row }) => {
        const item = row.original;
        const selectedForRow = rowProjects[item.id] || [];

        return (
          <Stack
            sx={{ cursor: canEdit ? "pointer" : "default" }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) handleEditProjects(item);
            }}
          >
            <Tooltip
              title={
                selectedForRow.length
                  ? selectedForRow.map((c: any) => c.name).join(", ")
                  : item.project_names || "-"
              }
            >
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
                {selectedForRow.length
                  ? selectedForRow.map((c: any) => c.name).join(", ")
                  : item.project_names || "-"}
              </Typography>
            </Tooltip>
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
                  if (!canEdit) return;
                  setEditing({ id: item.id, field: "max_stock" });
                  const initVal =
                    item.max_stock !== null && item.max_stock !== undefined
                      ? String(item.max_stock).replace(/,/g, "")
                      : "0";
                  setInputValue(initVal);
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
                  let value = e.target.value.replace(/,/g, ".");

                  if (/^\d*\.?\d*$/.test(value)) {
                    const parts = value.split(".");
                    if (!parts[1] || parts[1].length <= 2) {
                      if (
                        value === "" ||
                        value === "." ||
                        (!isNaN(Number(value)) && Number(value) <= 10000)
                      ) {
                        setInputValue(value);
                      }
                    }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInputValue("");
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onBlur={async () => {
                  if (inputValue === "") return;
                  let number = Number(inputValue);
                  if (isNaN(number) || number > 10000) {
                    return;
                  }

                  const formatted = number.toFixed(2);

                  await updatePrice(item.id, Number(formatted), undefined);

                  setEditing({ id: null, field: null });
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputValue === "") return;
                    let number = Number(inputValue);
                    if (isNaN(number) || number > 10000) {
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
                  if (!canEdit) return;
                  setEditing({ id: item.id, field: "price" });
                  const initVal =
                    item.price !== null && item.price !== undefined
                      ? String(item.price).replace(/,/g, "")
                      : "0";
                  setInputValue(initVal);
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
                  let value = e.target.value.replace(/,/g, ".");

                  if (/^\d*\.?\d*$/.test(value)) {
                    const parts = value.split(".");
                    if (!parts[1] || parts[1].length <= 2) {
                      if (
                        value === "" ||
                        value === "." ||
                        (!isNaN(Number(value)) && Number(value) <= 100000)
                      ) {
                        setInputValue(value);
                      }
                    }
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInputValue("");
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <IconX size={14} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onBlur={async () => {
                  if (inputValue === "") return;
                  let number = Number(inputValue);
                  if (isNaN(number) || number > 100000) {
                    return;
                  }

                  const formatted = number.toFixed(2);

                  await updatePrice(item.id, undefined, Number(formatted));

                  setEditing({ id: null, field: null });
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (inputValue === "") return;
                    let number = Number(inputValue);
                    if (isNaN(number) || number > 100000) {
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
                  if (!canEdit) return;
                  setEditing({ id: item.id, field: "market_price" });
                  const initVal =
                    item.market_price !== null &&
                    item.market_price !== undefined
                      ? String(item.market_price).replace(/,/g, "")
                      : "0";
                  setInputValue(initVal);
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

    columnHelper.accessor((row) => row?.is_sub_qty, {
      id: "packOff",
      header: () => "Pack Off",
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
          >
            <IOSSwitch
              checked={Boolean(item.is_sub_qty)}
              disabled={!canEdit}
              onChange={async (e) => {
                const checked = e.target.checked;
                await updateSubQty(item.id, checked);
              }}
            />
          </Stack>
        );
      },
    }),

    // columnHelper.display({
    //   id: "actions",
    //   header: "Actions",
    //   cell: ({ row }) => {
    //     const item = row.original;

    //     return (
    //       <Stack direction="row" spacing={1}>
    //         <IconButton
    //           onClick={(e) => {
    //             e.stopPropagation();
    //             handlePriceOpen(item);
    //           }}
    //           color="primary"
    //         >
    //           <IconArrowsShuffle size={18} />
    //         </IconButton>
    //       </Stack>
    //     );
    //   },
    // }),
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
    fetchData: fetchProducts,
    debounceDependencies: [searchTerm, filters, user.company_id, categories],
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

        {/* for handling projects update */}
        <Dialog
          open={openProjectModal}
          onClose={() => setOpenProjectModal(false)}
        >
          <DialogTitle>Select Projects</DialogTitle>
          <DialogContent>
            <Autocomplete
              multiple
              className="project_selection"
              options={projects || []}
              getOptionLabel={(option) => option.name}
              value={Array.isArray(draftProjects) ? draftProjects : []}
              onChange={(_, newValue) => {
                setDraftProjects(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    draftProjects.length === 0 ? "Select projects" : ""
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
                setOpenProjectModal(false);
                setDraftProjects([]);
              }}
              color="error"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingProjectRowId) {
                  setRowProjects((prev) => ({
                    ...prev,
                    [editingProjectRowId]: draftProjects,
                  }));

                  updateProjects(editingProjectRowId, draftProjects);
                }

                setOpenProjectModal(false);
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
             {isSaving? "Saving..." : "Save"}
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
              sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
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
            {canView && (
              <Button
                variant="contained"
                startIcon={<IconFileImport width={18} />}
                onClick={handleModelOpen}
              >
                Import
              </Button>
            )}
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
                   {isImport ? "Importing..." : "Save"}
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
            <Tooltip title="Hire History">
              <IconButton
                color="primary"
                onClick={() => setHireHistoryDrawer(true)}
                sx={{ ml: 1 }}
              >
                <IconHistory width={18} />
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={handlePopoverOpen}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            {canView && (
              <Tooltip title="Settings">
                <IconButton
                  color="primary"
                  onClick={() => setSettingOpen(true)}
                  sx={{ ml: 1 }}
                >
                  <IconSettings width={18} />
                </IconButton>
              </Tooltip>
            )}
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
                        <CustomCheckbox
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
            <Dialog
              open={assignCategoryOpen}
              onClose={() => setAssignCategoryOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Assign Category</DialogTitle>
              <DialogContent>
                <Autocomplete
                  options={categories || []}
                  getOptionLabel={(option: any) => option.name || ""}
                  value={selectedCategoryToAssign}
                  onChange={(event, newValue) =>
                    setSelectedCategoryToAssign(newValue)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Category"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setAssignCategoryOpen(false)}
                  variant="outlined"
                  color="error"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedCategoryToAssign) {
                      toast.error("Please select a category");
                      return;
                    }
                    try {
                      const payload = {
                        product_ids: Array.from(selectedRowIds),
                        category_id: selectedCategoryToAssign.id,
                      };
                      const response = await api.post(
                        "products/bulk-assign-categories",
                        payload,
                      );
                      if (response.data.IsSuccess) {
                        toast.success(
                          response.data.message || "Assigned Successfully",
                        );
                        setAssignCategoryOpen(false);
                        setSelectedRowIds(new Set());
                        fetchProducts();
                      } else {
                        toast.error(
                          response.data.message || "Failed to assign category",
                        );
                      }
                    } catch (error) {
                      toast.error("Failed to assign category");
                    }
                  }}
                  variant="contained"
                  color="primary"
                >
                  Assign
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={assignProjectOpen}
              onClose={() => setAssignProjectOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Assign Project</DialogTitle>
              <DialogContent>
                <Autocomplete
                  multiple
                  options={projects || []}
                  getOptionLabel={(option: any) => option.name || ""}
                  value={selectedProjectToAssign}
                  onChange={(event, newValue) =>
                    setSelectedProjectToAssign(newValue)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Projects"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setAssignProjectOpen(false)}
                  variant="outlined"
                  color="error"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (
                      !selectedProjectToAssign ||
                      selectedProjectToAssign.length === 0
                    ) {
                      toast.error("Please select at least one project");
                      return;
                    }
                    try {
                      const payload = {
                        product_ids: Array.from(selectedRowIds),
                        project_ids: selectedProjectToAssign.map(
                          (p: any) => p.id,
                        ),
                      };
                      const response = await api.post(
                        "products/bulk-assign-projects",
                        payload,
                      );
                      if (response.data.IsSuccess) {
                        toast.success(
                          response.data.message || "Assigned Successfully",
                        );
                        setAssignProjectOpen(false);
                        setSelectedRowIds(new Set());
                        setSelectedProjectToAssign([]);
                        fetchProducts();
                      } else {
                        toast.error(
                          response.data.message || "Failed to assign project",
                        );
                      }
                    } catch (error) {
                      toast.error("Failed to assign project");
                    }
                  }}
                  variant="contained"
                  color="primary"
                >
                  Assign
                </Button>
              </DialogActions>
            </Dialog>
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
                        backgroundColor: "#fff",
                      }}
                    >
                      <Stack spacing={2}>
                        {/* Existing Product */}
                        {item.original_product && (
                          <Box
                            sx={{
                              border: "1px solid #f1f1f1",
                              borderRadius: 2,
                              p: 2,
                              backgroundColor: "#fafafa",
                            }}
                          >
                            <Typography
                              fontWeight={700}
                              color="primary"
                              mb={1}
                              fontSize="14px"
                            >
                              Existing Product
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={2}
                              alignItems="center"
                            >
                              <Image
                                src={
                                  item.original_product.image ||
                                  "/images/products/product.svg"
                                }
                                alt="Existing Product"
                                width={60}
                                height={60}
                              />

                              <Box flex={1}>
                                <Typography fontWeight={700}>
                                  {item.original_product.short_name ||
                                    item.original_product.name}
                                </Typography>

                                <Typography variant="body2">
                                  ID: {item.original_product.id}
                                </Typography>

                                <Typography variant="body2">
                                  UUID: {item.original_product.uuid || "-"}
                                </Typography>
                              </Box>

                              <IconButton
                                color="error"
                                disabled={isConflictLoading}
                                onClick={() =>
                                  handleDeleteConflictProduct(
                                    item.original_product.id,
                                    "original",
                                  )
                                }
                              >
                                <IconTrash size={20} />
                              </IconButton>
                            </Stack>
                          </Box>
                        )}

                        {/* Imported Product */}
                        {item.imported_product && (
                          <Box
                            sx={{
                              border: "1px solid #f1f1f1",
                              borderRadius: 2,
                              p: 2,
                              backgroundColor: "#fff8f0",
                            }}
                          >
                            <Typography
                              fontWeight={700}
                              color="warning.main"
                              mb={1}
                              fontSize="14px"
                            >
                              Imported Product
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={2}
                              alignItems="center"
                            >
                              <Image
                                src={
                                  item.imported_product.image ||
                                  "/images/products/product.svg"
                                }
                                alt="Imported Product"
                                width={60}
                                height={60}
                              />

                              <Box flex={1}>
                                <Typography fontWeight={700}>
                                  {item.imported_product.short_name ||
                                    item.imported_product.name}
                                </Typography>

                                <Typography variant="body2">
                                  ID: {item.imported_product.id}
                                </Typography>

                                <Typography variant="body2">
                                  UUID: {item.imported_product.uuid || "-"}
                                </Typography>
                              </Box>

                              <IconButton
                                color="error"
                                disabled={isConflictLoading}
                                onClick={() =>
                                  handleDeleteConflictProduct(
                                    item.imported_product.id,
                                    "imported",
                                  )
                                }
                              >
                                <IconTrash size={20} />
                              </IconButton>
                            </Stack>
                          </Box>
                        )}
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
            {canView && (
              <IconButton
                sx={{ margin: "0px" }}
                id="basic-button"
                aria-controls={openMenu ? "basic-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? "true" : undefined}
                onClick={(e) => {
                  if (canEdit) handleClick(e);
                  else toast.error("You do not have permission to do this.");
                }}
              >
                <IconDotsVertical width={18} />
              </IconButton>
            )}
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
              {selectedRowIds.size > 0 && (
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setAssignCategoryOpen(true);
                  }}
                >
                  <Link
                    color="body1"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconLayersIntersect width={18} />
                    </ListItemIcon>
                    Assign Category
                  </Link>
                </MenuItem>
              )}
              {selectedRowIds.size > 0 && (
                <MenuItem
                  onClick={() => {
                    handleClose();
                    setAssignProjectOpen(true);
                  }}
                >
                  <Link
                    color="body1"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconLayersIntersect width={18} />
                    </ListItemIcon>
                    Assign Project
                  </Link>
                </MenuItem>
              )}
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

                  <Autocomplete
                    multiple
                    options={projects || []}
                    getOptionLabel={(option) => option.name}
                    value={tempFilters.projects || []}
                    onChange={(_, newValue) => {
                      setTempFilters({
                        ...tempFilters,
                        projects: newValue,
                      });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Projects" />
                    )}
                  />
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      supplier: "",
                      category: "",
                      projects: [],
                    });
                    setFilters({
                      supplier: "",
                      category: "",
                      projects: [],
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
          canEdit={canEdit}
        />

        {/* Archive Product List */}
        <ArchiveProduct
          open={archiveProductList}
          companyId={Number(user.company_id)}
          onClose={() => setArchiveProductList(false)}
          onWorkUpdated={fetchProducts}
        />

        <HireOrderHistory
          open={hireHistoryDrawer}
          onClose={() => setHireHistoryDrawer(false)}
        />

        <ProductHistory
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
        />

        <SetList
          openDrawer={productSetOpen}
          onClose={() => setProductSetOpen(false)}
        />

        <ManagePriceDrawer
          open={priceDrawerOpen}
          onClose={handlePriceClose}
          product={selectedProduct}
        />
        {!canView && !isAdmin && productPermission == null ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              textAlign: "center",
              mt: "20%",
            }}
          >
            <Typography variant="h5">
              You don't have permission to view products.
            </Typography>
          </Box>
        ) : (
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
        )}
        {!canView && !isAdmin && productPermission == null ? (
          <></>
        ) : (
          <>
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
          </>
        )}
        <Settings
          settingOpen={settingOpen}
          onClose={() => setSettingOpen(false)}
        />
      </Box>
    </PermissionGuard>
  );
};

export default ProductList;
