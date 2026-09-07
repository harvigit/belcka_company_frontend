"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { endOfWeek, startOfWeek } from "date-fns";
import {
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  IconEye,
  IconFilter,
  IconInfoCircle,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import dayjs from "dayjs";
import Image from "next/image";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

type InternalOrderRow = {
  id: number;
  source: "store" | "collect";
  order_id?: string | null;
  user_name?: string | null;
  address_name?: string | null;
  date?: string | null;
  status_text?: string | null;
  type?: string | null;
  type_key?: "store" | "collect";
  total?: number | string | null;
  total_formatted?: string | null;
  currency?: string | null;
  file?: string | null;
};

const COLUMN_LABELS: Record<string, string> = {
  order_id: "order ID",
  user_name: "By",
  address_name: "Address",
  date: "Date",
  status_text: "Status",
  type: "Type",
  total: "Total",
  file: "File",
};

const defaultFilters = {
  type: "all" as "all" | "store" | "collect",
};

const columnHelper = createColumnHelper<InternalOrderRow>();

const InternalOrders = ({ projectId }: { projectId: number }) => {
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: string | number | null;
  };
  const [data, setData] = useState<InternalOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [startDate, setStartDate] = useState<Date | null>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [endDate, setEndDate] = useState<Date | null>(() =>
    endOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [columnSearch, setColumnSearch] = useState("");

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id ?? "user"}_project_internal_orders`,
      enabled: !!user?.id,
    });

  const columns = useMemo(
    () => [
      columnHelper.accessor("order_id", {
        id: "order_id",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">order ID</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("user_name", {
        id: "user_name",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">By</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("address_name", {
        id: "address_name",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">Address</Typography>,
        cell: ({ getValue }) => (
          <Tooltip title={getValue() ?? ""}>
            <Typography
              className="f-14"
              color="textPrimary"
              sx={{
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {getValue() || "-"}
            </Typography>
          </Tooltip>
        ),
      }),
      columnHelper.accessor("date", {
        id: "date",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">Date</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("status_text", {
        id: "status_text",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">Status</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("type", {
        id: "type",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">Type</Typography>,
        cell: ({ getValue, row }) => (
          <Typography
            className="f-14"
            fontWeight={row.original.type_key === "collect" ? 700 : 500}
            sx={{
              color:
                row.original.type_key === "collect"
                  ? "error.main"
                  : "text.primary",
            }}
            noWrap
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("total", {
        id: "total",
        enableSorting: true,
        header: () => <Typography variant="subtitle2">Total</Typography>,
        cell: ({ row }) => (
          <Typography className="f-14" fontWeight={500} color="textPrimary">
            {row.original.total_formatted ||
              `${row.original.currency || "£"}${Number(row.original.total || 0).toFixed(2)}`}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: "file",
        enableSorting: false,
        header: () => <Typography variant="subtitle2">File</Typography>,
        cell: ({ row }) =>
          row.original.file ? (
            <Tooltip title="View file">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(row.original.file as string, "_blank");
                }}
              >
                <IconInfoCircle size={18} />
              </IconButton>
            </Tooltip>
          ) : (
            <Typography className="f-14" color="text.secondary">
              -
            </Typography>
          ),
      }),
    ],
    [],
  );

  const formattedStart = startDate ? dayjs(startDate).format("DD/MM/YYYY") : "";
  const formattedEnd = endDate ? dayjs(endDate).format("DD/MM/YYYY") : "";

  const fetchOrders = async () => {
    if (!user?.company_id || !projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(user.company_id),
        project_id: String(projectId),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (searchTerm) params.set("search", searchTerm);
      if (filters.type && filters.type !== "all")
        params.set("type", filters.type);
      if (formattedStart) params.set("start_date", formattedStart);
      if (formattedEnd) params.set("end_date", formattedEnd);
      if (sorting.length > 0) {
        params.set("sort_by", sorting[0].id);
        params.set("sort_order", sorting[0].desc ? "desc" : "asc");
      }

      const res = await api.get(`project/internal-orders?${params.toString()}`);
      const responseData = res.data?.info || [];
      setData(Array.isArray(responseData) ? responseData : []);

      const pagMeta =
        res.data?.data?.totalPages !== undefined ||
        res.data?.data?.totalItems !== undefined
          ? res.data.data
          : {};

      if (pagMeta.totalItems !== undefined) {
        setTotalRows(pagMeta.totalItems);
      } else {
        setTotalRows(Array.isArray(responseData) ? responseData.length : 0);
      }

      if (pagMeta.totalPages !== undefined) {
        setPageCount(pagMeta.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch project internal orders", err);
      setData([]);
      setTotalRows(0);
      setPageCount(0);
    }
    setLoading(false);
  };

  const {
    table,
    pagination,
    setPagination,
    totalRows,
    setTotalRows,
    setPageCount,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchOrders,
    debounceDependencies: [
      searchTerm,
      filters.type,
      formattedStart,
      formattedEnd,
      user?.company_id,
      projectId,
    ],
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    manualSorting: true,
    getRowId: (row) => `${row.source}-${row.id}`,
  });

  const visibleColCount =
    table.getVisibleLeafColumns().length || columns.length;
  const skeletonColumns = table.getVisibleLeafColumns().map((column) => ({
    name: column.id ?? "Column",
  }));

  const columnToggles = table.getAllLeafColumns().map((column) => ({
    id: column.id,
    label: COLUMN_LABELS[column.id] || column.id,
    visible: column.getIsVisible(),
    toggleVisibility: column.toggleVisibility,
  }));

  const filteredColumnToggles = columnToggles.filter((column) =>
    column.label.toLowerCase().includes(columnSearch.trim().toLowerCase()),
  );

  const allColumnsSelected =
    filteredColumnToggles.length > 0 &&
    filteredColumnToggles.every((column) => column.visible);

  const someColumnsSelected = filteredColumnToggles.some(
    (column) => column.visible,
  );

  const activeFilterCount = Object.entries(filters).filter(
    ([, value]) => Boolean(value) && value !== "all",
  ).length;

  const handleClearAppliedFilters = (event: React.MouseEvent) => {
    event.stopPropagation();
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack
          mr={2}
          ml={2}
          mb={1}
          mt={1}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ sm: "center" }}
        >
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={(range) => {
                if (range.from && range.to) {
                  setStartDate(range.from);
                  setEndDate(range.to);
                }
              }}
            />
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", sm: 180 } }}
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
          </Box>
          <Box display="flex" justifyContent="flex-end" alignItems="center">
            <Tooltip title="Column visibility">
              <IconButton
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                color="primary"
                size="small"
              >
                <IconEye size={20} />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        <Popover
          open={Boolean(columnMenuAnchor)}
          anchorEl={columnMenuAnchor}
          onClose={() => {
            setColumnMenuAnchor(null);
            setColumnSearch("");
          }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              p: 1.25,
              width: 280,
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
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box
            sx={{
              maxHeight: "calc(min(420px, calc(100vh - 140px)) - 64px)",
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            <FormGroup sx={{ gap: 0.25 }}>
              <FormControlLabel
                control={
                  <CustomCheckbox
                    size="small"
                    checked={allColumnsSelected}
                    indeterminate={!allColumnsSelected && someColumnsSelected}
                    disabled={filteredColumnToggles.length === 0}
                    onChange={(e) => {
                      filteredColumnToggles.forEach((column) => {
                        column.toggleVisibility(e.target.checked);
                      });
                    }}
                    sx={{ p: 0.5, mr: 1 }}
                  />
                }
                sx={{ m: 0, px: 0.75, py: 0.375 }}
                label="Select All"
              />
              {filteredColumnToggles.map((column) => (
                <FormControlLabel
                  key={column.id}
                  control={
                    <CustomCheckbox
                      size="small"
                      checked={column.visible}
                      onChange={() => column.toggleVisibility(!column.visible)}
                      sx={{ p: 0.5, mr: 1 }}
                    />
                  }
                  sx={{ m: 0, px: 0.75, py: 0.375 }}
                  label={column.label}
                />
              ))}
            </FormGroup>
          </Box>
        </Popover>

        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
          <Table stickyHeader aria-label="project internal orders">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = header.column.getIsSorted() === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell key={header.id}>
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          p={0}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "flex-start",
                            alignItems: "center",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
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
              {loading ? (
                <SkeletonLoader columns={skeletonColumns} rowCount={8} />
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(visibleColCount, 1)}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(50vh - 100px)",
                        gap: 1,
                      }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No internal orders"
                        width={200}
                        height={200}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                      <Typography color="text.secondary" className="f-14">
                        No internal orders found for this project
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover>
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
      </Box>

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative" }}>
          Filters
          <IconButton
            aria-label="close"
            onClick={() => setFilterOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Type"
              value={tempFilters.type}
              onChange={(e) =>
                setTempFilters({
                  ...tempFilters,
                  type: e.target.value as "all" | "store" | "collect",
                })
              }
              fullWidth
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="store">Store</MenuItem>
              <MenuItem value="collect">Collect</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setTempFilters(defaultFilters);
              setFilters(defaultFilters);
              setFilterOpen(false);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setFilterOpen(false);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <TablePaginationFooter table={table} totalRows={totalRows} />
    </Box>
  );
};

export default InternalOrders;
