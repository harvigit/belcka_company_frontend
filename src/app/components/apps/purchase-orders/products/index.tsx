"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Fab,
  Modal,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import {
  IconChevronRight,
  IconEye,
  IconFileImport,
  IconFilter,
  IconMinus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconPlus } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Cookies from "js-cookie";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import PurchaseOrder from "../create";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconChevronLeft } from "@tabler/icons-react";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import Link from "next/link";
import { FileDownload } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { format } from "date-fns";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

dayjs.extend(customParseFormat);
interface Props {
  open: boolean;
  onClose: () => void;
  companyId: number | null;

  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;

  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  ids?: { id: number; qty: number }[];
  mode?: "create" | "edit";
  editData?: any;
  onDraftSaved?: () => void;
}
const PurchaseProductList: React.FC<Props> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
  onDraftSaved,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(true);
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

  const selectedRowIdsRef = useRef<Set<number>>(selectedRowIds);
  useEffect(() => {
    selectedRowIdsRef.current = selectedRowIds;
  }, [selectedRowIds]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_orders_products`,
      enabled: !!user?.id,
    });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    project: "",
    supplier: "",
    address: "",
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [storeSelectionOpen, setStoreSelectionOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [tempFilters, setTempFilters] = useState(filters);
  const [allProductsChecked, setAllProductsChecked] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<any | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImport, setIsImport] = useState(false);
  const [manuallyDeselected, setManuallyDeselected] = useState<Set<number>>(
    new Set(),
  );
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [latestFetchedIds, setLatestFetchedIds] = useState<Set<number>>(
    new Set(),
  );
  const [draftOrderIdDialogOpen, setDraftOrderIdDialogOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");

  const handleModelOpen = () => {
    setPreview(null);
    setOpenModel(true);
  };

  const handleModelClose = () => setOpenModel(false);

  const closeFilterModel = () => {
    setTempFilters(filters);
    setFilterOpen(false);
  };

  const handleFileChange = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(selectedFile.name);
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

  const downloadSampleFile = () => {
    const link = document.createElement("a");
    link.href = "/files/purchase_order_import.xlsx";
    link.download = "purchase-order-sample-file.xlsx";
    link.click();
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

      const res = await api.post("purchase-orders/import", formData, {
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

      toast.success(res.data.message);

      fetchOrders();

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

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}`,
      );
      if (res.data) {
        setSuppliers(res.data.suppliers);
        setProjects(res.data.projects);
        setAddresses(res.data.addresses);
        if (res.data.stores) {
          setStores(res.data.stores);
        } else {
          const storesRes = await api.get(
            `stores/get?company_id=${user.company_id}`,
          );
          if (storesRes.data && storesRes.data.info) {
            setStores(storesRes.data.info);
          } else if (storesRes.data && Array.isArray(storesRes.data)) {
            setStores(storesRes.data);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  // Fetch data
  const fetchOrders = async () => {
    setFetchStore(true);

    try {
      const params: any = {
        company_id: user.company_id,
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        is_all_product: true,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }
      if (filters.supplier && filters.supplier !== "All") {
        const supplierObj = suppliers.find((s) => s.name === filters.supplier);
        if (supplierObj) {
          params.suppliers = supplierObj.id;
        }
      }
      if (filters.address && filters.address !== "All") {
        const addressObj = addresses.find((s) => s.name === filters.address);
        if (addressObj) {
          params.address = addressObj.id;
        }
      }
      if (filters.project && filters.project !== "All") {
        const projectObj = projects.find((s) => s.name === filters.project);
        if (projectObj) {
          params.project = projectObj.id;
        }
      }
      const response = await api.get("purchase-orders/orders", { params });

      if (response.data) {
        setData((prevData) => {
          const currentSelected = selectedRowIdsRef.current;
          const selectedItems = prevData.filter(
            (item) =>
              currentSelected.has(item.id) || Number(item.total_qty) > 0,
          );
          const selectedItemIds = new Set(selectedItems.map((item) => item.id));
          const newItems = response.data.info.filter(
            (item: any) => !selectedItemIds.has(item.id),
          );
          return [...selectedItems, ...newItems];
        });
        const fetchedItems = response.data.info;
        setLatestFetchedIds(new Set(fetchedItems.map((item: any) => item.id)));
        const autoSelectedIds = fetchedItems
          .filter((p: any) => p.total_qty > 0)
          .map((p: any) => p.id);
        if (autoSelectedIds.length > 0) {
          setSelectedRowIds((prev) => {
            const next = new Set(prev);
            autoSelectedIds.forEach((id: number) => next.add(id));
            return next;
          });
        }
        const pagMeta = (response.data as any).data || response.data.info;
        if (pagMeta && pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
          setPageCount(pagMeta.totalPages);
        } else if ((response.data as any).totalItems !== undefined) {
          setTotalRows((response.data as any).totalItems);
          setPageCount((response.data as any).totalPages);
        } else {
          setTotalRows(response.data.info.length);
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }

    setFetchStore(false);
  };

  useEffect(() => {
    if (open == true) {
      setData([]);
      setSelectedRowIds(new Set());
      setManuallyDeselected(new Set());
      setDrawerOpen(false);
      setEditDrawerOpen(false);
      fetchOrders();
      fetchResources();
    }
  }, [open]);

  const handleOpenCreateDrawer = () => {
    setFormData({
      company_id: Number(user?.company_id),
      order_id: "",
      checked_product: false,
      id: 0,
    });
    setDrawerOpen(true);
  };

  const editOrder = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  const finalFilteredData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aSearched = searchTerm && latestFetchedIds.has(a.id);
      const bSearched = searchTerm && latestFetchedIds.has(b.id);

      if (aSearched && !bSearched) return -1;
      if (!aSearched && bSearched) return 1;

      const aSelected = selectedRowIds.has(a.id) || Number(a.total_qty) > 0;
      const bSelected = selectedRowIds.has(b.id) || Number(b.total_qty) > 0;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [filteredData, selectedRowIds, searchTerm, latestFetchedIds]);

  const useSelectedProducts = (data: any[], selectedRowIds: Set<number>) => {
    const selectedProductsWithQty = useMemo(() => {
      if (!data?.length || selectedRowIds.size === 0) return [];

      return data
        .filter((item) => selectedRowIds.has(item.id))
        .map((item) => ({
          id: item.id,
          qty: Number(item.total_qty) || 0,
          supplier_id: Number(item.supplier_id),
          supplier_name: item.supplier_name,
        }));
    }, [data, selectedRowIds]);

    const supplierNames = [
      ...new Set(selectedProductsWithQty.map((p) => p.supplier_name || "")),
    ];
    const isSameSupplierSelected = selectedProductsWithQty.length > 0;
    const hasMultipleSuppliers = supplierNames.length > 1;

    return {
      selectedProductsWithQty,
      isSameSupplierSelected,
      hasMultipleSuppliers,
    };
  };

  const {
    selectedProductsWithQty,
    isSameSupplierSelected,
    hasMultipleSuppliers,
  } = useSelectedProducts(data, selectedRowIds);

  const selectedRowCount = selectedRowIds.size;

  const selectedTotalQty = Array.from(selectedRowIds).reduce((sum, id) => {
    const row = data.find((item) => item.id === id);
    return sum + (row?.total_qty ? Number(row.total_qty) : 0);
  }, 0);

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const generateOrderId = (length = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  };

  const submitDraft = async (store_id: any) => {
    const supplier_id = selectedProductsWithQty[0]?.supplier_id || null;

    const product_data = selectedProductsWithQty.map((sp) => {
      const product = data.find((p) => p.id === sp.id);
      return {
        product_id: sp.id,
        qty: sp.qty,
        price: product?.price || 0,
      };
    });
    const order_id = manualOrderId || generateOrderId();
    const submissionData = {
      company_id: user?.company_id,
      store_id: store_id,
      order_id,
      supplier_id: supplier_id,
      product_data: product_data,
      is_draft: true,
      checked_product: false,
    };

    try {
      const result = await api.post("purchase-orders/create", submissionData);
      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setSelectedRowIds(new Set());
        onClose();
        if (onDraftSaved) {
          onDraftSaved();
        }
      } else {
      }
    } catch (err: any) {}
  };

  const handleDirectSaveAsDraft = async () => {
    if (hasMultipleSuppliers) {
      toast.error("All selected products must belong to the same supplier!");
      return;
    }

    if (selectedProductsWithQty.length === 0) {
      toast.error("Please select at least one product with quantity.");
      return;
    }

    let store_id = null;
    if (user?.id && user?.company_id) {
      const storedStoreStr = Cookies.get(
        `user_store_${user.id}_${user.company_id}`,
      );
      if (storedStoreStr) {
        try {
          const parsed = JSON.parse(storedStoreStr);
          store_id = parsed.id;
        } catch (err) {
          console.error("Failed to parse store cookie:", err);
        }
      }
    }

    if (!store_id) {
      setStoreSelectionOpen(true);
      return;
    }

    submitDraft(store_id);
  };

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size > 0 &&
              finalFilteredData.length > 0 &&
              finalFilteredData.every((row) => selectedRowIds.has(row.id))
            }
            indeterminate={
              finalFilteredData.some((row) => selectedRowIds.has(row.id)) &&
              !finalFilteredData.every((row) => selectedRowIds.has(row.id))
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
                const newDeselected = new Set(manuallyDeselected);

                if (isChecked) {
                  newSelected.delete(item.id);
                  newDeselected.add(item.id);
                } else {
                  newSelected.add(item.id);
                  newDeselected.delete(item.id);
                }

                setSelectedRowIds(newSelected);
                setManuallyDeselected(newDeselected);
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

    columnHelper.accessor((row) => row?.total_qty, {
      id: "add",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2">Add</Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;

        const updateQty = (newQty: number | string) => {
          const numValue = Number(newQty);
          setData((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    total_qty:
                      newQty === "" ? "" : numValue > 0 ? numValue : null,
                  }
                : p,
            ),
          );

          if (numValue > 0) {
            setManuallyDeselected((prev) => {
              const updated = new Set(prev);
              updated.delete(item.id);
              return updated;
            });
          }

          setSelectedRowIds((prev) => {
            const updated = new Set(prev);

            if (numValue > 0) {
              updated.add(item.id);
            }

            if (numValue === 0 && newQty !== "") {
              updated.delete(item.id);
            }

            return updated;
          });
        };
        if (!item.total_qty && item.total_qty !== "") {
          return (
            <Fab size="small" onClick={() => updateQty(1)}>
              <IconPlus size={16} />
            </Fab>
          );
        }

        return (
          <Stack display={"block"}>
            <Box display="flex" flexDirection="row" alignItems="center" gap={1}>
              <Fab
                size="small"
                onClick={() => {
                  const newQty = Number(item.total_qty) - 1;
                  updateQty(newQty > 0 ? newQty : 0);
                }}
              >
                <IconMinus size={16} />
              </Fab>

              <TextField
                size="small"
                value={item.total_qty}
                className="qty_input"
                inputProps={{ style: { textAlign: "center" } }}
                sx={{ width: 60 }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!/^\d*$/.test(value)) return;
                  if (value === "") {
                    updateQty("");
                  } else {
                    const num = Number(value);
                    updateQty(num >= 0 ? num : 0);
                  }
                }}
              />

              <Fab
                size="small"
                onClick={() => updateQty(Number(item.total_qty) + 1)}
              >
                <IconPlus size={16} />
              </Fab>
            </Box>
            {item.pending_qty ? (
              <Typography
                fontSize={12}
                color="error"
                variant="h6"
                fontWeight={500}
                mt={1}
                ml={"18px"}
              >
                Requested Qty: {item.pending_qty}
              </Typography>
            ) : (
              <></>
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor("date", {
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
            sx={{ pl: 0.3, ml: 2 }}
          >
            <Typography textTransform="capitalize" className="f-14">
              {item?.employee_orders[0]
                ? formatDate(item.employee_orders[0].created_at)
                : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

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

    columnHelper.accessor("order_users", {
      id: "orderBy",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Order By
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={4} sx={{ ml: 1 }}>
            <Typography textTransform="capitalize" className="f-14">
              {item.order_users ? item.order_users : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.short_name, {
      id: "products",
      header: () => "Products",
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

    columnHelper.accessor((row) => row?.project_name, {
      id: "project",
      header: () => "Project",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Tooltip
              title={item.project_name ? item.project_name : (item.name ?? "")}
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
                  wordBreak: "break-word",
                }}
              >
                {item.project_name ? item.project_name : "-"}
              </Typography>
            </Tooltip>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.price, {
      id: "buyingPrice",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Buying Price
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.currency}
              {item.price ? item.price : "0"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.qty, {
      id: "qty",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Qty
          </Typography>
        </Stack>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1} ml={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.qty ? item.qty : "0"}{" "}
              {item.is_sub_qty ? `${item.pack_off_unit}` : ""}
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
          <Typography textTransform="capitalize" className="f-14" ml={1}>
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
            <Typography textTransform="capitalize" className="f-14" ml={1}>
              {item.supplier_code ? item.supplier_code : "-"}
            </Typography>
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
    data: finalFilteredData,
    columns,
    fetchData: fetchOrders,
    debounceDependencies: [searchTerm, filters, user.company_id],
    state: { columnVisibility },
    onColumnVisibilityChange,
    getRowId: (row: any) => row.id.toString(),
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
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: "90vh",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
      }}
    >
      <Box
        p={2}
        pb={0}
        display={"flex"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Products
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
      <Box
        sx={{
          height: "calc(92vh - 100px)",
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
            <Button variant="contained" color="primary">
              PRODUCTS ({selectedTotalQty})
            </Button>
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
              onClick={() => {
                setTempFilters(filters);
                setFilterOpen(true);
              }}
              sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
            <Box display={"flex"} gap={2}>
              {filters.project && (
                <Typography display={"flex"} alignItems={"flex-start"} gap={2}>
                  <b>Project</b>
                  <p
                    style={{
                      margin: "0px",
                      alignItems: "flex-start",
                      display: "flex",
                    }}
                  >
                    {filters.project} <IconChevronRight />
                  </p>
                </Typography>
              )}
              {filters.supplier && (
                <Typography display={"flex"} alignItems={"flex-start"} gap={2}>
                  <b>Supplier</b>{" "}
                  <p
                    style={{
                      margin: "0px",
                      alignItems: "flex-start",
                      display: "flex",
                    }}
                  >
                    {filters.supplier}
                    <IconChevronRight />
                  </p>
                </Typography>
              )}
              {filters.address && (
                <Typography display={"flex"} alignItems={"flex-start"} gap={2}>
                  <b>Address</b>{" "}
                  <p
                    style={{
                      margin: "0px",
                      alignItems: "flex-start",
                      display: "flex",
                    }}
                  >
                    {filters.address}
                    <IconChevronRight />
                  </p>
                </Typography>
              )}
            </Box>
            <Dialog
              open={filterOpen}
              onClose={() => closeFilterModel()}
              fullWidth
              maxWidth="sm"
            >
              <DialogTitle
                sx={{ m: 0, position: "relative", overflow: "visible" }}
              >
                Filters
                <IconButton
                  aria-label="close"
                  onClick={() => closeFilterModel()}
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
                    label="Projects"
                    value={tempFilters.project}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        project: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {projects.map((item, i) => (
                      <MenuItem key={i} value={item.name}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Addresses"
                    value={tempFilters.address}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        address: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {addresses.map((item, i) => (
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
                      project: "",
                      address: "",
                    });
                    setFilters({
                      supplier: "",
                      project: "",
                      address: "",
                    });
                    closeFilterModel();
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
            {/* <Box display="flex" alignItems="center">
              <FormControlLabel
                label="All Products"
                control={
                  <CustomCheckbox
                    aria-label="All Products"
                    checked={allProductsChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAllProductsChecked(checked);

                      if (checked) {
                        fetchOrders(true);
                      } else {
                        fetchOrders();
                      }
                    }}
                  />
                }
              />
            </Box> */}

            <Button
              variant="contained"
              startIcon={<IconFileImport width={18} />}
              onClick={handleModelOpen}
            >
              Import
            </Button>
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
          </Stack>
        </Stack>
        <Divider />

        {/* Modal for File Upload */}
        <Modal open={openModel} onClose={handleModelClose} disableEscapeKeyDown>
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
                    <Typography variant="body2">Processing file...</Typography>
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
                            width: header.column.id === "select" ? 30 : "auto",
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} sx={{ padding: "10px" }}>
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
          {data.length ? <Divider /> : <></>}
        </Box>
        <Divider />
        <Stack
          gap={1}
          pr={3}
          pt={1}
          pl={3}
          alignItems="center"
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography color="textSecondary" className="f-14">
              Selected Items: {selectedRowCount} from{" "}
              {table.getPrePaginationRowModel().rows.length} Rows | Total Qty:{" "}
              {selectedTotalQty}
            </Typography>
          </Box>
          <Stack
            ml={"5px"}
            direction="row"
            alignItems="center"
            color="textSecondary"
          >
            {" "}
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
                | Entries:{" "}
              </Typography>
            </Stack>
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
          <Box
            display={"flex"}
            alignItems="center"
            gap={2}
            justifyItems={"flex-end"}
          >
            <Button
              variant="contained"
              color="error"
              sx={{ borderRadius: 3 }}
              disabled={selectedRowIds.size === 0 || !isSameSupplierSelected}
              onClick={() => {
                if (hasMultipleSuppliers) {
                  toast.error(
                    "All selected products must belong to the same supplier!",
                  );
                  return;
                }

                if (selectedProductsWithQty.length === 0) {
                  toast.error(
                    "Please select at least one product with quantity.",
                  );
                  return;
                }
                setManualOrderId("");
                setDraftOrderIdDialogOpen(true);
              }}
            >
              Save as Draft
            </Button>
            <Button
              variant="contained"
              color="primary"
              sx={{ borderRadius: 3, width: "100px" }}
              disabled={selectedRowIds.size === 0 || !isSameSupplierSelected}
              onClick={() => {
                if (hasMultipleSuppliers) {
                  toast.error(
                    "All selected products must belong to the same supplier!",
                  );
                  return;
                }
                handleOpenCreateDrawer();
              }}
            >
              Next
            </Button>
          </Box>
        </Stack>
      </Box>
      <Dialog
        open={storeSelectionOpen}
        onClose={() => setStoreSelectionOpen(false)}
      >
        <DialogTitle>Select Store</DialogTitle>
        <DialogContent sx={{ minWidth: 300, mt: 1 }}>
          <Typography variant="body2" mb={2}>
            Please select a store before saving as draft.
          </Typography>
          <CustomSelect
            fullWidth
            size="small"
            value={selectedStoreId}
            onChange={(e: any) => setSelectedStoreId(e.target.value)}
            displayEmpty
          >
            <MenuItem value="" disabled>
              Select Store
            </MenuItem>
            {stores.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </CustomSelect>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStoreSelectionOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!selectedStoreId) {
                toast.error("Please select a store");
                return;
              }
              const sStore = stores.find((s) => s.id === selectedStoreId);
              if (sStore) {
                Cookies.set(
                  `user_store_${user.id}_${user.company_id}`,
                  JSON.stringify({ id: sStore.id, name: sStore.name }),
                  { expires: 365 },
                );
              }
              setStoreSelectionOpen(false);
              submitDraft(selectedStoreId);
            }}
          >
            Save Draft
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={draftOrderIdDialogOpen}
        onClose={() => setDraftOrderIdDialogOpen(false)}
      >
        <DialogTitle pb={0}>Enter Order ID</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField
            fullWidth
            size="small"
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            label="Order Id"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDraftOrderIdDialogOpen(false)}
            color="error"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!manualOrderId) {
                toast.error("Please enter an Order ID");
                return;
              }
              setDraftOrderIdDialogOpen(false);
              handleDirectSaveAsDraft();
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
};

export default PurchaseProductList;
