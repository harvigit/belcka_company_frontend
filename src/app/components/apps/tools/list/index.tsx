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
  IconPlaylistAdd,
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
import { IconEye } from "@tabler/icons-react";
import AddEditTool from "../add-edit";
import AssignUserTool from "../assign-user";
import ProductAddEdit from "../../products/create";
import HireHistory from "../history";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openToolDrawer, setOpenToolDrawer] = useState(false);
  const [historyDrawer, setHistoryDrawer] = useState(false);
  const [openProductDrawer, setOpenProductDrawer] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rowTrades, setRowTrades] = useState<Record<string, any[]>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openStoreDialog, setOpenStoreDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
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

  const onClose = () => {
    setDrawerOpen(false);
    setOpenToolDrawer(false);
    setOpenProductDrawer(false);
    setHistoryDrawer(false);
    setSelectedTaskId(null);
  };

  const handleTradeClose = () => {
    setOpenCategoryModal(false);
  };

  // Fetch data
  const fetchProducts = async (restorePage?: number) => {
    setFetchProduct(true);
    try {
      const res = await api.get(
        `products/get-product-trade?company_id=${user.company_id}&is_web=true`,
      );
      if (res.data) {
        setData(res.data.info);

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
    fetchProducts();
    fetchTrades();
  }, []);

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

  const handleEditCategories = (item: any) => {
    setEditingRowId(item.id);
    setEditingProductId(item.product_id);

    const selectedIds = item.trade_ids
      ? item.trade_ids.split(",").map((id: string) => Number(id))
      : [];
    const selected = trades.filter((cat) => selectedIds.includes(cat.id));

    setRowTrades((prev) => ({ ...prev, [item.id]: selected }));
    setOpenCategoryModal(true);
  };

  const updateTrades = async (
    id: string,
    productId: string,
    selected: any[],
  ) => {
    try {
      const payload = {
        id: Number(id),
        company_id: Number(user.company_id),
        product_id: Number(productId),
        trade_ids: selected.map((c) => c.id).join(","),
      };
      const res = await api.post("products/manage-trades", payload);
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
      let url = `get-inventory-resources?company_id=${user.company_id}`;
      const res = await api.get(url);
      if (res.data) {
        setStores(res.data.stores);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resources", err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [api]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.short_name?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search) ||
        item.price?.toLowerCase().includes(search) ||
        item.supplier_code?.toLowerCase().includes(search) ||
        item.product_trades?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search);

      return matchesSearch;
    });
  }, [data, searchTerm]);

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
    columnHelper.accessor((row) => row?.hire_qty, {
      id: "qty",
      header: () => "Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.hire_qty ? item.hire_qty : "-"}
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
                : item.product_trades || "-"}
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
    <PermissionGuard permission="Tools">
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
                  );
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
        />

        {/* history */}
        <HireHistory
          open={historyDrawer}
          onClose={() => onClose()}
          companyId={user?.company_id ?? null}
          onWorkUpdated={fetchProducts}
          setId={selectedTaskId}
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
                              header.column.id === "actions" ? 200 : "auto",
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
                            <TableCell key={cell.id}>
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

export default ToolsList;
