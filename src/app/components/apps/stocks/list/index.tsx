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
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
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
import { useDropzone } from "react-dropzone";
import ProductAddEdit from "../../products/create";

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
}

const StockList = () => {
  const [data, setData] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchProduct, setFetchProduct] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ supplier: "", category: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stockQty, setStockQty] = useState("0.00");
  const [productName, setProductName] = useState("");
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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const fetchResorces = async () => {
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
  const fetchProducts = async () => {
    setFetchProduct(true);
    try {
      const res = await api.get(`products/get?company_id=${user.company_id}`);
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setFetchProduct(false);
  };

  const fetchHistories = async (id: number) => {
    setLoading(true);
    try {
      const res = await api.get(
        `stocks/history?company_id=${user.company_id}&product_id=${id}`,
      );
      if (res.data && res.data.IsSuccess) {
        setHistory(res.data.info ?? []);
        setStockQty(res.data.stock_qty ?? "0.00");
        setProductName(res.data.product_name ?? "");
      } else {
        setHistory([]);
        setStockQty("0.00");
        setProductName("");
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResorces();
    fetchProducts();
  }, [api]);

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

  const handleHistory = useCallback(async (id: number) => {
    setSelectedTaskId(id);
    setDrawerOpen(true); // open drawer
    await fetchHistories(id);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
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

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("uuid", {
      id: "Id",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
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
          <Typography variant="subtitle2" fontWeight="inherit">
            ID
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const showCheckbox = isChecked || hoveredRow === item.id;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 0.3 }}
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CustomCheckbox
              className="header-checkbox"
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
            <Typography textTransform="capitalize" className="f-14">
              {item.uuid ? item.uuid : "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("product_image", {
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
        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            {item.product_image && (
              <Image
                src={item.product_image}
                alt={"Product image"}
                width={50}
                height={50}
              />
            )}
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.short_name, {
      id: "shortName",
      header: () => "Short Name",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.short_name ? item.short_name : "-"}
              <Typography color="textSecondary" className="f-14">
                {item.name}
              </Typography>
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.supplier_name, {
      id: "supplierName",
      header: () => "Supplier Name",
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
      id: "supplierCode",
      header: () => "Supplier Code",
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

    columnHelper.accessor((row) => row?.qty, {
      id: "Qty",
      header: () => "Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.qty}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.pack_off_qty, {
      id: "subQty",
      header: () => "Sub Qty",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography textTransform="capitalize" className="f-14">
              {item.pack_off_qty}
            </Typography>
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
        const { stock_status, stock_status_id } = row.original;

        const colorMap: Record<number, string> = {
          1: "success.main",
          2: "warning.main",
          3: "error.main",
          4: "error.main",
        };

        return (
          <Typography
            className="f-14"
            variant="h6"
            fontWeight={500}
            color={colorMap[stock_status_id] ?? "text.primary"}
          >
            {stock_status || "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("qr_code_url", {
      id: "QrCode",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            QR Code
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
            <Typography textTransform="capitalize" className="f-14">
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
            <Button variant="contained" color="primary">
              STOCKS ({table.getPrePaginationRowModel().rows.length}){" "}
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
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFilter width={18} />
            </Button>
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
                    const excludedColumns = ["conflicts"];
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
                    <MenuItem value="">All</MenuItem>
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
                    <MenuItem value="">All</MenuItem>
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
                              header.column.id === "barcode"
                                ? 80
                                : header.column.id === "subQty"
                                  ? 100
                                  : header.column.id === "QrCode"
                                    ? 120
                                    : header.column.id === "supplierCode" ||
                                        header.column.id === "stockStatus"
                                      ? 140
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
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
            width: 600,
            "& .MuiDrawer-paper": { width: 600, backgroundColor: "#f9f9f9" },
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
                Qty in Stock: {stockQty}
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
            <Box sx={{ textAlign: "center" }}>
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
                  <TableCell>Qty</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>New Qty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => {
                  const qtyNum = parseFloat(h.qty);
                  const qtyColor =
                    qtyNum > 0 ? "#1a8f03ff" : qtyNum < 0 ? "red" : "inherit";
                  return (
                    <TableRow key={h.id}>
                      <TableCell>{h.date}</TableCell>
                      <TableCell
                        style={{
                          color: qtyColor,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        {h.qty}{" "}
                        <Typography color="text.secondary">
                          ({h.sub_qty})
                        </Typography>
                      </TableCell>
                      <TableCell>
                       <Tooltip title={h.reference} placement="top" arrow>
                         <Typography
                          sx={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: 1.25,
                            maxWidth: 100,
                            wordBreak: "break-word",
                          }}
                        >
                          {h.reference}
                        </Typography>
                       </Tooltip>
                      </TableCell>
                      <TableCell>{h.price}</TableCell>
                      <TableCell style={{ fontWeight: "bold" }}>
                        ({h.new_qty.toFixed(2)})
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Drawer>
      </Box>
    </PermissionGuard>
  );
};

export default StockList;
