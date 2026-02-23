"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  IconEye,
  IconFilter,
  IconMinus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
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
    status: "",
  });

  const [tempFilters, setTempFilters] = useState(filters);

  // Fetch data
  const fetchOrders = async () => {
    setFetchStore(true);
    try {
      const res = await api.get(
        `purchase-orders/orders?company_id=${user.company_id}`,
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    }
    setFetchStore(false);
  };

  useEffect(() => {
    fetchOrders();
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
      const matchStatus =
        filters.status && filters.status !== "all"
          ? item.status_text === filters.status
          : true;

      const matchesSearch =
        item.name?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search) ||
        item.phone?.toLowerCase().includes(search) ||
        item.street?.toLowerCase().includes(search) ||
        item.location?.toLowerCase().includes(search) ||
        item.town?.toLowerCase().includes(search) ||
        item.postcode?.toLowerCase().includes(search) ||
        item.manager_name?.toLowerCase().includes(search) ||
        item.supplier_name?.toLowerCase().includes(search) ||
        item.company_name?.toLowerCase().includes(search);

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
          setData((prev: any[]) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, total_qty: newQty > 0 ? newQty : null }
                : p,
            ),
          );
        };

        if (!item.total_qty) {
          return (
            <IconButton onClick={() => updateQty(1)} size="small">
              +
            </IconButton>
          );
        }

        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            {!item.total_qty || Number(item.total_qty) <= 0 ? (
              <IconButton size="small" onClick={() => updateQty(1)}>
                <IconPlus size={17} />
              </IconButton>
            ) : (
              <>
                <IconButton
                  size="small"
                  onClick={() => {
                    const newQty = Number(item.total_qty) - 1;
                    updateQty(newQty > 0 ? newQty : 0);
                  }}
                >
                  <IconMinus size={17} />
                </IconButton>

                <TextField
                  size="small"
                  value={item.total_qty}
                  inputProps={{
                    style: { textAlign: "center" },
                  }}
                  sx={{ width: 60 }}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (!/^\d*$/.test(value)) return;

                    const num = Number(value);

                    updateQty(num >= 0 ? num : 0);
                  }}
                />

                <IconButton
                  size="small"
                  onClick={() => updateQty(Number(item.total_qty) + 1)}
                >
                  <IconPlus size={17} />
                </IconButton>
              </>
            )}
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
        const image = "/images/products/product.png";
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
                  width: 400,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
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

    columnHelper.accessor((row) => row?.total_qty, {
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
              {item.total_qty ? item.total_qty : "0"}{" "}
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
        display={"flex"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Orders
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
              ORDERS ({table.getPrePaginationRowModel().rows.length}){" "}
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
            {/* <Button variant="contained" onClick={() => setFilterOpen(true)}>
              <IconFilter width={18} />
            </Button> */}

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
                    <MenuItem value="Received">Received</MenuItem>
                    <MenuItem value="Partially Received">
                      Partially Received
                    </MenuItem>
                    <MenuItem value="Issued">Issued</MenuItem>
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
            {selectedRowIds.size > 0 && (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<IconPlus width={18} />}
                  sx={{ marginRight: "5px" }}
                  onClick={() => {
                    handleOpenCreateDrawer();
                  }}
                >
                  Purchase Order
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
    </Drawer>
  );
};

export default PurchaseProductList;
