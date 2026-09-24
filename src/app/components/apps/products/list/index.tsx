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
  CircularProgress,
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
import ProductAddEdit, { ProductFormData } from "../create";
import ArchiveProduct from "../archive";
import { IconEye } from "@tabler/icons-react";
import ProductView from "../view";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ProductHistory from "../history";
import { IconLayersIntersect } from "@tabler/icons-react";
import SetList from "../sets/list";
import ManagePriceDrawer from "../manage-price";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import HireOrderHistory from "../hire-history";
import Settings from "../settings";
import ColumnVisibilityPopover from "@/app/components/common/ColumnVisibilityPopover";
import ExcelImportModal from "@/app/components/common/ExcelImportModal";
import ListConfirmDialog from "@/app/components/common/ListConfirmDialog";
import SelectItemsDialog from "./select-items-dialog";
import ProductImageManagerDialog from "./image-manager-dialog";
import ImagePreviewDialog from "./image-preview-dialog";
import AssignCategoryDialog from "./assign-category-dialog";
import AssignProjectDialog from "./assign-project-dialog";
import ImportConflictDialog from "./import-conflict-dialog";
import ProductFiltersDialog from "./filters-dialog";

dayjs.extend(customParseFormat);
interface TableRow {
  id: number;
  image_url?: string;
  images?: string[];
  [key: string]: any;
}
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import { appendTableSortQuery } from "@/utils/tableSort";

const PRODUCT_TABLE_SORT_MAP: Record<string, string> = {
  Id: "uuid",
  name: "short_name",
  displayName: "display_name",
  supplier: "supplier",
  code: "supplier_code",
  stockLimit: "max_stock",
  lowStock: "cutoff",
  qty: "qty",
  buying: "price",
  market: "market_price",
  barcode: "barcode",
  availability: "availability",
  packOff: "is_sub_qty",
  categories: "categories",
  projects: "projects",
};

type ProductProjectFilter = {
  id: string;
  name: string;
};

type ProductFilters = {
  supplier: string;
  category: string;
  projects: ProductProjectFilter[];
  status: string;
};

type ProductsTableCookieState = {
  searchTerm?: string;
  filters?: Partial<ProductFilters>;
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
  };
};

const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  supplier: "",
  category: "",
  projects: [],
  status: "",
};

const getProductsTableStateKey = (
  userId?: number | string,
  companyId?: number | string | null,
) => (userId && companyId ? `products_table_state_${userId}_${companyId}` : "");

const normalizeProductFilterValue = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "All") return "";
  return String(value);
};

const normalizeProductProjects = (projects?: any[]): ProductProjectFilter[] => {
  if (!Array.isArray(projects)) return [];
  return projects
    .map((project) => {
      const id = project?.id ?? project?.project_id;
      if (id === undefined || id === null || id === "") return null;
      return {
        id: String(id),
        name: String(project?.name || ""),
      };
    })
    .filter(Boolean) as ProductProjectFilter[];
};

const normalizeProductFilters = (
  filters?: Partial<ProductFilters> | Record<string, any>,
): ProductFilters => ({
  supplier: normalizeProductFilterValue(filters?.supplier),
  category: normalizeProductFilterValue(filters?.category),
  projects: normalizeProductProjects(filters?.projects),
  status: normalizeProductFilterValue(filters?.status),
});

const readProductsTableStateCookie = (
  cookieKey: string,
): ProductsTableCookieState => {
  try {
    const stored = readListingTableState(cookieKey);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const ProductList = () => {
  const [data, setData] = useState<any[]>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(true);
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
  const user = session.data?.user as User & {
    company_id?: number | null;
    id: number;
    user_role_id: number;
  };

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [archiveProductList, setArchiveProductList] = useState<boolean>(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(
    DEFAULT_PRODUCT_FILTERS,
  );
  const [tempFilters, setTempFilters] = useState(filters);
  const productsTableStateKey = useMemo(
    () => getProductsTableStateKey(user?.id, user?.company_id),
    [user?.id, user?.company_id],
  );
  const restoredTableStateKeyRef = useRef("");
  const skipNextDependencyPageResetRef = useRef(false);
  const [isTableStateReady, setIsTableStateReady] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignCategoryOpen, setAssignCategoryOpen] = useState(false);
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");
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
  const [openImageManager, setOpenImageManager] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TableRow | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [editing, setEditing] = useState<{
    id: number | null;
    field:
      | "price"
      | "market_price"
      | "max_stock"
      | "cutoff"
      | "display_name"
      | null;
  }>({ id: null, field: null });
  const [savingCell, setSavingCell] = useState<{
    id: number | null;
    field:
      | "price"
      | "market_price"
      | "max_stock"
      | "cutoff"
      | "is_sub_qty"
      | "display_name"
      | "status"
      | null;
  }>({ id: null, field: null });
  const [inputValue, setInputValue] = useState("");
  const [rowCategories, setRowCategories] = useState<Record<string, any[]>>({});
  const [draftCategories, setDraftCategories] = useState<any[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

  const [rowProjects, setRowProjects] = useState<Record<string, any[]>>({});
  const [draftProjects, setDraftProjects] = useState<any[]>([]);
  const [editingProjectRowId, setEditingProjectRowId] = useState<string | null>(
    null,
  );
  const [openProjectModal, setOpenProjectModal] = useState(false);
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isCellSaving = (
    id: number | string,
    field: NonNullable<(typeof savingCell)["field"]>,
  ) => Number(savingCell.id) === Number(id) && savingCell.field === field;

  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictProducts, setConflictProducts] = useState<any[]>([]);
  const [isConflictLoading, setIsConflictLoading] = useState(false);
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
    if (!user?.company_id || !isTableStateReady) return;
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
      if (filters.status && filters.status !== "All") {
        url += `&stock_status=${filters.status}`;
      }
      url = appendTableSortQuery(url, sorting, PRODUCT_TABLE_SORT_MAP);

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
    setConflictOpen(false);
    setOpenModel(false);
  };

  const handleOpenCreateDrawer = () => {
    setFormData({
      id: 0,
      company_id: user?.company_id,
      name: "",
      sort_id: 0,
      short_name: "",
      display_name: "",
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
    setIsCategorySaving(true);
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        category_ids: selected.map((c) => c.id).join(","),
      };
      const res = await api.post("products/update", payload);
      if (res.data.IsSuccess) {
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
        toast.success(res.data.message);
      } else {
        toast.error(res.data?.message || "Failed to update categories");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update categories");
    } finally {
      setIsCategorySaving(false);
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
    setIsProjectSaving(true);
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
    } finally {
      setIsProjectSaving(false);
    }
  };

  const updateDisplayName = async (
    id: string | number,
    displayName: string,
  ) => {
    setSavingCell({ id: Number(id), field: "display_name" });
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        display_name: displayName,
      };
      const res = await api.post("products/update", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setData((prev: any[]) =>
          prev.map((p) =>
            Number(p.id) === Number(id)
              ? { ...p, display_name: displayName }
              : p,
          ),
        );
      } else {
        toast.error(res.data?.message || "Failed to update display name");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update display name",
      );
    } finally {
      setSavingCell({ id: null, field: null });
    }
  };

  const updateStockLimit = async (id: string, limit: any) => {
    setSavingCell({ id: Number(id), field: "max_stock" });
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        max_stock: limit,
      };
      const res = await api.post("products/update", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setData((prev: any[]) =>
          prev.map((p) =>
            Number(p.id) === Number(id) ? { ...p, max_stock: limit } : p,
          ),
        );
      } else {
        toast.error(res.data?.message || "Failed to update stock limit");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update stock limit",
      );
    } finally {
      setSavingCell({ id: null, field: null });
    }
  };

  // Low Stock uses dedicated update-cutoff API (same as Adjust Stock),
  // not full products/update — mirrors products/update-price for Price edits.
  const updateLowStock = async (id: string | number, limit: any) => {
    setSavingCell({ id: Number(id), field: "cutoff" });
    try {
      const payload = {
        id: Number(id),
        cutoff: Number(limit),
      };
      const res = await api.post("products/update-cutoff", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setData((prev: any[]) =>
          prev.map((p) =>
            Number(p.id) === Number(id) ? { ...p, cutoff: Number(limit) } : p,
          ),
        );
      } else {
        toast.error(res.data?.message || "Failed to update low stock");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update low stock");
    } finally {
      setSavingCell({ id: null, field: null });
    }
  };

  const updateSubQty = async (id: string, is_sub_qty: boolean) => {
    setSavingCell({ id: Number(id), field: "is_sub_qty" });
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
      } else {
        toast.error(res.data?.message || "Failed to update pack off");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update pack off");
    } finally {
      setSavingCell({ id: null, field: null });
    }
  };

  const updatePrice = async (
    id: number,
    price?: number,
    market_price?: number,
  ) => {
    const field = price !== undefined ? "price" : "market_price";
    setSavingCell({ id: Number(id), field });
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
      } else {
        toast.error(res.data?.message || "Failed to update price");
      }
    } catch (error: any) {
      console.error("Update failed", error);
      toast.error(error?.response?.data?.message || "Failed to update price");
    } finally {
      setSavingCell({ id: null, field: null });
    }
  };

  const updateStatus = async (id: string, status: boolean) => {
    setSavingCell({ id: Number(id), field: "status" });
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        status,
      };

      const res = await api.post("products/update", payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setData((prev: any[]) =>
          prev.map((p) =>
            p.id === Number(id)
              ? {
                  ...p,
                  status,
                }
              : p,
          ),
        );
      } else {
        toast.error(res.data?.message || "Failed to update status");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setSavingCell({ id: null, field: null });
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
      enableSorting: false,
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
      enableSorting: false,
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
                component="div"
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
                <Typography
                  color="textSecondary"
                  className="f-14"
                  component="span"
                  display="block"
                >
                  {item.name}
                </Typography>
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.display_name, {
      id: "displayName",
      header: () => "Display Name",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing =
          editing.id === item.id && editing.field === "display_name";
        const isSaving = isCellSaving(item.id, "display_name");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : isEditing ? (
              <TextField
                className="f-14"
                size="small"
                value={inputValue}
                autoFocus
                type="text"
                variant="standard"
                sx={{ width: 250 }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  setInputValue(e.target.value);
                }}
                onBlur={async () => {
                  const next = inputValue.trim();
                  const prev = String(item.display_name ?? "").trim();
                  setEditing({ id: null, field: null });
                  if (next === prev) return;
                  await updateDisplayName(item.id, next);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = inputValue.trim();
                    const prev = String(item.display_name ?? "").trim();
                    setEditing({ id: null, field: null });
                    if (next === prev) return;
                    await updateDisplayName(item.id, next);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing({ id: null, field: null });
                  }
                }}
              />
            ) : (
              <Tooltip title={item.display_name ?? ""}>
                <Typography
                  textTransform="capitalize"
                  className="f-14"
                  component="div"
                  variant="body1"
                  sx={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    // lineHeight: 1.25,
                    maxWidth: 300,
                    width: 250,
                    wordBreak: "break-word",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: canEdit ? "pointer" : "default",
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                    "&:hover": canEdit
                      ? {
                          border: "1px solid #1976d2",
                        }
                      : undefined,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!canEdit || isSaving) return;
                    setEditing({ id: item.id, field: "display_name" });
                    setInputValue(item.display_name ?? "");
                  }}
                >
                  {item.display_name ? item.display_name : "-"}
                </Typography>
              </Tooltip>
            )}
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
            <Tooltip title={item.supplier_code ? item.supplier_code : "-"}>
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
                  width: "85px",
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
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
            </Tooltip>
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
        const isSaving = isCellSaving(item.id, "max_stock");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : isEditing ? (
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
                  setEditing({ id: null, field: null });
                  await updateStockLimit(item.id, number);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    let number = Number(inputValue);
                    if (number > 9999) {
                      return;
                    }
                    setEditing({ id: null, field: null });
                    await updateStockLimit(item.id, number);
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
                  if (!canEdit || isSaving) return;
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

    columnHelper.accessor((row) => row?.cutoff, {
      id: "lowStock",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Low Stock
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editing.id === item.id && editing.field === "cutoff";
        const isSaving = isCellSaving(item.id, "cutoff");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : isEditing ? (
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
                  setEditing({ id: null, field: null });
                  await updateLowStock(item.id, number);
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    let number = Number(inputValue);
                    if (number > 9999) {
                      return;
                    }
                    setEditing({ id: null, field: null });
                    await updateLowStock(item.id, number);
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
                  if (!canEdit || isSaving) return;
                  setEditing({ id: item.id, field: "cutoff" });
                  const initVal =
                    item.cutoff !== null && item.cutoff !== undefined
                      ? String(item.cutoff).replace(/,/g, "")
                      : "0";
                  setInputValue(initVal);
                }}
              >
                {item.cutoff || "0"}
              </Typography>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.qty, {
      id: "qty",
      header: () => "Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.qty ? item.qty : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.sub_qty, {
      id: "subQty",
      header: () => "Sub Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            {item.is_sub_qty}
            <Typography
              className="f-14"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: item.is_sub_qty ? "pointer" : "default",
                border: "1px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {item?.is_sub_qty && item.sub_qty > 0 ? item.sub_qty : "-"}
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
        const isSaving = isCellSaving(item.id, "price");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : isEditing ? (
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

                  setEditing({ id: null, field: null });
                  await updatePrice(item.id, Number(formatted), undefined);
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

                    setEditing({ id: null, field: null });
                    await updatePrice(item.id, Number(formatted), undefined);
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
                  if (!canEdit || isSaving) return;
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
        const isSaving = isCellSaving(item.id, "market_price");

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
            {isSaving ? (
              <CircularProgress size={16} />
            ) : isEditing ? (
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

                  setEditing({ id: null, field: null });
                  await updatePrice(item.id, undefined, Number(formatted));
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

                    setEditing({ id: null, field: null });
                    await updatePrice(item.id, undefined, Number(formatted));
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
                  if (!canEdit || isSaving) return;
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
        const isSaving = isCellSaving(item.id, "is_sub_qty");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : (
              <IOSSwitch
                checked={Boolean(item.is_sub_qty)}
                disabled={!canEdit}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  await updateSubQty(item.id, checked);
                }}
              />
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.status, {
      id: "isShow",
      header: () => "Is Show",
      cell: ({ row }) => {
        const item = row.original;
        const isSaving = isCellSaving(item.id, "status");

        return (
          <Stack
            direction="row"
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
          >
            {isSaving ? (
              <CircularProgress size={16} />
            ) : (
              <IOSSwitch
                checked={Boolean(item.status)}
                disabled={!canEdit}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  await updateStatus(item.id, checked);
                }}
              />
            )}
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
    debounceDependencies: [
      searchTerm,
      filters,
      user?.company_id,
      isTableStateReady,
      categories.length,
      suppliers.length,
      projects.length,
    ],
    state: { columnVisibility },
    onColumnVisibilityChange,
    manualSorting: true,
    shouldResetPageOnDebounce: () => {
      return !skipNextDependencyPageResetRef.current;
    },
  });

  useEffect(() => {
    if (!productsTableStateKey) {
      setIsTableStateReady(false);
      restoredTableStateKeyRef.current = "";
      return;
    }
    if (restoredTableStateKeyRef.current === productsTableStateKey) return;

    const savedState = readProductsTableStateCookie(productsTableStateKey);
    const savedPagination = savedState.pagination;
    const hasSavedState =
      savedState.searchTerm !== undefined ||
      savedState.filters !== undefined ||
      savedState.pagination !== undefined;

    skipNextDependencyPageResetRef.current = hasSavedState;
    restoredTableStateKeyRef.current = productsTableStateKey;

    setSearchTerm(savedState.searchTerm ?? "");
    const restoredFilters = normalizeProductFilters(savedState.filters);
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
  }, [productsTableStateKey, setPagination]);

  useEffect(() => {
    if (!productsTableStateKey || !isTableStateReady) return;
    if (restoredTableStateKeyRef.current !== productsTableStateKey) return;

    writeListingTableState(
      productsTableStateKey,
      JSON.stringify({
        searchTerm,
        filters: normalizeProductFilters(filters),
        pagination: {
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
    );
  }, [
    productsTableStateKey,
    isTableStateReady,
    searchTerm,
    filters,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  // Reset to first page when search term changes
  useEffect(() => {
    if (skipNextDependencyPageResetRef.current) return;
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, [searchTerm, setPagination]);

  const hasActiveFilters =
    Boolean(filters.supplier && filters.supplier !== "All") ||
    Boolean(filters.category && filters.category !== "All") ||
    (Array.isArray(filters.projects) && filters.projects.length > 0) ||
    Boolean(filters.status && filters.status !== "All");

  const handleClearAppliedFilters = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    skipNextDependencyPageResetRef.current = false;
    setTempFilters(DEFAULT_PRODUCT_FILTERS);
    setFilters(DEFAULT_PRODUCT_FILTERS);
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  };

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
        <SelectItemsDialog
          open={openCategoryModal}
          title="Select Categories"
          className="product_selection"
          options={categories || []}
          value={draftCategories}
          onChange={setDraftCategories}
          loading={isCategorySaving}
          placeholder="Select categories"
          onClose={() => {
            setOpenCategoryModal(false);
            setDraftCategories([]);
          }}
          onSubmit={async () => {
            if (!editingRowId || isCategorySaving) return;
            setRowCategories((prev) => ({
              ...prev,
              [editingRowId]: draftCategories,
            }));
            await updateCategories(editingRowId, draftCategories);
          }}
        />
        <SelectItemsDialog
          open={openProjectModal}
          title="Select Projects"
          className="project_selection"
          options={projects || []}
          value={draftProjects}
          onChange={setDraftProjects}
          loading={isProjectSaving}
          placeholder="Select projects"
          onClose={() => {
            setOpenProjectModal(false);
            setDraftProjects([]);
          }}
          onSubmit={async () => {
            if (!editingProjectRowId || isProjectSaving) return;
            setRowProjects((prev) => ({
              ...prev,
              [editingProjectRowId]: draftProjects,
            }));
            await updateProjects(editingProjectRowId, draftProjects);
          }}
        />
        <ProductImageManagerDialog
          open={openImageManager}
          onClose={() => setOpenImageManager(false)}
          product={selectedRow}
          onUpdated={(productId, imageUrl) => {
            setData((prev: any[]) =>
              prev.map((item) =>
                item.id === productId ? { ...item, image_url: imageUrl } : item,
              ),
            );
          }}
        />
        <ImagePreviewDialog
          open={openPreview}
          src={previewImage}
          onClose={() => setOpenPreview(false)}
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
                setTempFilters(normalizeProductFilters(filters));
                setOpen(true);
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
                onClick={() => setOpenModel(true)}
              >
                Import
              </Button>
            )}
          </Grid>
          <ExcelImportModal
            open={openModel}
            onClose={() => setOpenModel(false)}
            importUrl="products/import"
            sampleHref="/files/products_import.xlsx"
            extraFormData={{
              with_stock_import: "true",
              selected_type: "addEditRecord",
            }}
            onImported={(data) => {
              if (data?.conflicts?.length > 0) {
                setConflictProducts(data.conflicts || []);
                setConflictOpen(true);
                return true;
              }
              return false;
            }}
            onSuccess={fetchProducts}
          />

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
              onClick={(event) => setAnchorEl2(event.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            {user.user_role_id === 1 && (
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
            <ColumnVisibilityPopover
              open={Boolean(anchorEl2)}
              anchorEl={anchorEl2}
              onClose={() => setAnchorEl2(null)}
              table={table}
              excludedColumns={["conflicts", "select"]}
            />
            <AssignCategoryDialog
              open={assignCategoryOpen}
              onClose={() => setAssignCategoryOpen(false)}
              categories={categories}
              productIds={Array.from(selectedRowIds)}
              onAssigned={() => {
                setSelectedRowIds(new Set());
                fetchProducts();
              }}
            />
            <AssignProjectDialog
              open={assignProjectOpen}
              onClose={() => setAssignProjectOpen(false)}
              projects={projects}
              productIds={Array.from(selectedRowIds)}
              onAssigned={() => {
                setSelectedRowIds(new Set());
                fetchProducts();
              }}
            />
            <ListConfirmDialog
              open={confirmOpen}
              title="Confirm Archive"
              message={`Are you sure you want to archive ${usersToDelete.length} product${usersToDelete.length > 1 ? "s" : ""} from the products?`}
              confirmLabel="Archive"
              loadingLabel="Archiving..."
              loading={isArchiving}
              onClose={() => setConfirmOpen(false)}
              onConfirm={async () => {
                setIsArchiving(true);
                try {
                  const response = await api.post("products/archive", {
                    product_ids: usersToDelete.join(","),
                  });
                  toast.success(response.data.message);
                  setSelectedRowIds(new Set());
                  await fetchProducts();
                  setConfirmOpen(false);
                } catch (error) {
                  toast.error("Failed to archive products");
                } finally {
                  setIsArchiving(false);
                }
              }}
            />
            <ImportConflictDialog
              open={conflictOpen}
              products={conflictProducts}
              loading={isConflictLoading}
              onClose={() => setConflictOpen(false)}
              onKeepAll={handleKeepAll}
              onDelete={handleDeleteConflictProduct}
            />
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

            <ProductFiltersDialog
              open={open}
              onClose={() => setOpen(false)}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              suppliers={suppliers}
              categories={categories}
              projects={projects}
              normalizeFilterValue={normalizeProductFilterValue}
              normalizeProjects={normalizeProductProjects}
              onClear={() => {
                handleClearAppliedFilters();
                setOpen(false);
              }}
              onApply={() => {
                skipNextDependencyPageResetRef.current = false;
                setFilters(normalizeProductFilters(tempFilters));
                setPagination((prev) =>
                  prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
                );
                setOpen(false);
              }}
            />
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
              You don&apos;t have permission to view products.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <TableContainer
              ref={tableContainerRef}
              sx={{ flex: 1, minHeight: 0, overflow: "auto" }}
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
                                header.column.id === "price" ||
                                header.column.id === "barcode"
                                  ? 80
                                  : header.column.id === "QrCode"
                                    ? 120
                                    : header.column.id === "supplierCode"
                                      ? 140
                                      : header.column.id === "select"
                                        ? 5
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
