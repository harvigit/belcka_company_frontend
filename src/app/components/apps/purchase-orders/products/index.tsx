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
}
const PurchaseProductList: React.FC<Props> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
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
    link.href = "/files/purchase_order_export.xlsx";
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
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  // Fetch data
  const fetchOrders = async (showAll?: boolean) => {
    setFetchStore(true);

    try {
      let url = `purchase-orders/orders?company_id=${user.company_id}`;

      if (showAll) {
        url += `&is_all_product=true`;
      }

      const res = await api.get(url);

      if (res.data) {
        setData(res.data.info);
        setOriginalData(res.data.info);
        setSelectedRowIds(new Set());
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }

    setFetchStore(false);
  };

  useEffect(() => {
    if (open) {
      setData(originalData);
      const autoSelected = new Set(
        originalData.filter((p) => p.total_qty > 0).map((p) => p.id),
      );

      setSelectedRowIds(autoSelected);
      setManuallyDeselected(new Set());
    }
  }, [open, originalData]);

  useEffect(() => {
    fetchOrders();
    fetchResources();
  }, [api]);

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
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();

      if (
        filters.supplier == "All" ||
        filters.project == "All" ||
        filters.address == "All"
      )
        return data;
      const matchSupplier = filters.supplier
        ? item.supplier_name === filters.supplier
        : true;

      const matchProject = filters.project
        ? item.project_name === filters.project
        : true;
      const matchAddress = filters.address
        ? item.address_name === filters.address
        : true;

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search) ||
        item.short_name?.toLowerCase().includes(search) ||
        item.price?.toString().toLowerCase().includes(search) ||
        item.address_name?.toString().toLowerCase().includes(search) ||
        item.qty?.toString().toLowerCase().includes(search) ||
        item.supplier_code?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search) ||
        item.project_name?.toLowerCase().includes(search) ||
        item.company_name?.toLowerCase().includes(search);

      return matchesSearch && matchSupplier && matchProject && matchAddress;
    });
  }, [data, searchTerm, filters]);

  const finalFilteredData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aSelected = selectedRowIds.has(a.id) || Number(a.total_qty) > 0;
      const bSelected = selectedRowIds.has(b.id) || Number(b.total_qty) > 0;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [filteredData, selectedRowIds]);

  const useSelectedProducts = (data: any[], selectedRowIds: Set<number>) => {
    const selectedProductsWithQty = useMemo(() => {
      if (!data?.length || selectedRowIds.size === 0) return [];

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

    const supplierIds = [...new Set(selectedProductsWithQty.map((p) => p.supplier_id))];
    const isSameSupplierSelected = selectedProductsWithQty.length > 0;
    const hasMultipleSuppliers = supplierIds.length > 1;

    return { selectedProductsWithQty, isSameSupplierSelected, hasMultipleSuppliers };
  };

  const { selectedProductsWithQty, isSameSupplierSelected, hasMultipleSuppliers } =
    useSelectedProducts(data, selectedRowIds);

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
              finalFilteredData.every(row => selectedRowIds.has(row.id))
            }
            indeterminate={
              finalFilteredData.some(row => selectedRowIds.has(row.id)) &&
              !finalFilteredData.every(row => selectedRowIds.has(row.id))
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                const newSelected = new Set(selectedRowIds);
                finalFilteredData.forEach(row => newSelected.add(row.id));
                setSelectedRowIds(newSelected);
              } else {
                const newSelected = new Set(selectedRowIds);
                finalFilteredData.forEach(row => newSelected.delete(row.id));
                setSelectedRowIds(newSelected);
                
                const newDeselected = new Set(manuallyDeselected);
                finalFilteredData.forEach(row => newDeselected.add(row.id));
                setManuallyDeselected(newDeselected);
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

        const updateQty = (newQty: number) => {
          setData((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, total_qty: newQty > 0 ? newQty : null }
                : p,
            ),
          );

          if (newQty > 0) {
            setManuallyDeselected((prev) => {
              const updated = new Set(prev);
              updated.delete(item.id);
              return updated;
            });
          }

          setSelectedRowIds((prev) => {
            const updated = new Set(prev);

            if (newQty > 0) {
              updated.add(item.id);
            }

            if (newQty === 0) {
              updated.delete(item.id);
            }

            return updated;
          });
        };
        if (!item.total_qty) {
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
                  const num = Number(value);
                  updateQty(num >= 0 ? num : 0);
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
                  width: 300,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
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
                  WebkitLineClamp: 2,
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
  const table = useReactTable({
    data: finalFilteredData,
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
            <Box display="flex" alignItems="center">
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
            </Box>

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
            alignItems="flex-end"
            justifyContent={"end"}
            width={"25%"}
          >
            <Button
              variant="contained"
              color="primary"
              className="drawer_buttons"
              sx={{ borderRadius: 3, marginRight: "5px" }}
              disabled={selectedRowIds.size === 0 || !isSameSupplierSelected}
              onClick={() => {
                if (hasMultipleSuppliers) {
                  toast.error("All selected products must belong to the same supplier!");
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
    </Drawer>
  );
};

export default PurchaseProductList;
