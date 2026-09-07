"use client";

import React, { useMemo, useState } from "react";
import {
  Box,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
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
import {
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { IconEye, IconSearch } from "@tabler/icons-react";
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

type StockHistoryRow = {
  id: number;
  date?: string | null;
  uuid?: string | null;
  name?: string | null;
  user_name?: string | null;
  address_name?: string | null;
  note?: string | null;
  currency?: string | null;
  total_amount?: number | string | null;
  qty?: number | string | null;
  qty_in_pack?: string | null;
  new_qty?: number | string | null;
  new_qty_in_pack?: string | null;
  is_sub_qty?: boolean;
};

const NUMERIC_COLUMNS = new Set(["amount", "adjustedStock", "stockInHand"]);
const COLUMN_LABELS: Record<string, string> = {
  Date: "Date",
  code: "Code",
  name: "Name",
  user: "User",
  address: "Address",
  note: "Note",
  amount: "Amount",
  adjustedStock: "Adjusted stock",
  stockInHand: "Stock in Hand",
};
const columnHelper = createColumnHelper<StockHistoryRow>();

const Materials = ({ projectId }: { projectId: number }) => {
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: string | number | null;
  };
  const [data, setData] = useState<StockHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "Date", desc: true },
  ]);
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    return start;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [columnSearch, setColumnSearch] = useState("");
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id ?? "user"}_project_materials`,
      enabled: Boolean(user?.company_id),
      alwaysVisibleColumns: ["select"],
    });

  const handleToggleSelect = (id: number) => {
    if (isSelectAll) {
      setIsSelectAll(false);
      const next = new Set(data.map((row) => row.id));
      next.delete(id);
      setSelectedRowIds(next);
      return;
    }
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setIsSelectAll(checked);
    setSelectedRowIds(new Set());
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: () => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={
                isSelectAll ||
                (data.length > 0 &&
                  data.every((row) => selectedRowIds.has(row.id)))
              }
              indeterminate={
                !isSelectAll &&
                selectedRowIds.size > 0 &&
                selectedRowIds.size < data.length
              }
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.stopPropagation();
                e.preventDefault();
                handleToggleSelectAll(e.target.checked);
              }}
            />
          </Stack>
        ),
        cell: ({ row }: { row: { original: StockHistoryRow } }) => {
          const item = row.original;
          const isChecked = isSelectAll || selectedRowIds.has(item.id);
          const showCheckbox = isChecked || hoveredRow === item.id;

          return (
            <Stack direction="row" alignItems="center">
              <CustomCheckbox
                className="row-checkbox"
                checked={isChecked}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleToggleSelect(item.id);
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
      columnHelper.accessor("date", {
        id: "Date",
        header: () => <Typography variant="subtitle2">Date</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("uuid", {
        id: "code",
        header: () => <Typography variant="subtitle2">Code</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary">
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("name", {
        id: "name",
        header: () => <Typography variant="subtitle2">Name</Typography>,
        cell: ({ getValue }) => (
          <Tooltip title={getValue() ?? ""}>
            <Typography
              className="f-14"
              color="textPrimary"
              sx={{
                px: 1.5,
                maxWidth: 200,
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
      columnHelper.accessor("user_name", {
        id: "user",
        header: () => <Typography variant="subtitle2">User</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("address_name", {
        id: "address",
        header: () => <Typography variant="subtitle2">Address</Typography>,
        cell: ({ getValue }) => (
          <Tooltip title={getValue() ?? ""}>
            <Typography
              className="f-14"
              color="textPrimary"
              sx={{
                px: 1.5,
                maxWidth: 200,
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
      columnHelper.accessor("note", {
        id: "note",
        header: () => <Typography variant="subtitle2">Note</Typography>,
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{
              maxWidth: 280,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={getValue() || ""}
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("total_amount", {
        id: "amount",
        header: () => <Typography variant="subtitle2">Amount</Typography>,
        cell: ({ row, getValue }) => (
          <Typography className="f-14" fontWeight={500} color="textPrimary">
            {row.original.currency || ""}
            {Number(getValue() || 0).toFixed(2)}
          </Typography>
        ),
      }),
      columnHelper.accessor("qty", {
        id: "adjustedStock",
        header: () => (
          <Typography variant="subtitle2">Adjusted stock</Typography>
        ),
        cell: ({ row, getValue }) => {
          const qty = Number(getValue());
          return (
            <Typography
              className="f-14"
              fontWeight={600}
              sx={{
                color:
                  qty > 0
                    ? "success.main"
                    : qty < 0
                      ? "error.main"
                      : "text.primary",
              }}
            >
              {row.original.is_sub_qty && row.original.qty_in_pack
                ? `${row.original.qty_in_pack} (${getValue() ?? "-"} nos)`
                : (getValue() ?? "-")}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("new_qty", {
        id: "stockInHand",
        header: () => (
          <Typography variant="subtitle2">Stock in Hand</Typography>
        ),
        cell: ({ row, getValue }) => (
          <Typography className="f-14" fontWeight={500} color="textPrimary">
            {row.original.is_sub_qty && row.original.new_qty_in_pack
              ? `${row.original.new_qty_in_pack} (${getValue() ?? "-"} nos)`
              : (getValue() ?? "-")}
          </Typography>
        ),
      }),
    ],
    [data, hoveredRow, isSelectAll, selectedRowIds],
  );

  const formattedStart = startDate ? dayjs(startDate).format("DD/MM/YYYY") : "";
  const formattedEnd = endDate ? dayjs(endDate).format("DD/MM/YYYY") : "";

  const fetchHistories = async () => {
    if (!user?.company_id || !projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(user.company_id),
        project_ids: String(projectId),
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (searchTerm) params.set("search", searchTerm);
      if (formattedStart) params.set("start_date", formattedStart);
      if (formattedEnd) params.set("end_date", formattedEnd);

      const res = await api.get(`stocks/stock-history?${params.toString()}`);
      const responseData = res.data?.info || [];
      setData(Array.isArray(responseData) ? responseData : []);
      setIsSelectAll(false);
      setSelectedRowIds(new Set());

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
      } else if (pagMeta.last_page !== undefined) {
        setPageCount(pagMeta.last_page);
      }
    } catch (err) {
      console.error("Failed to fetch project stock history", err);
      setData([]);
      setTotalRows(0);
      setPageCount(0);
    }
    setLoading(false);
  };

  const { table, pagination, totalRows, setTotalRows, setPageCount } =
    useServerTable({
      data,
      columns,
      fetchData: fetchHistories,
      debounceDependencies: [
        searchTerm,
        formattedStart,
        formattedEnd,
        user?.company_id,
        projectId,
      ],
      state: { sorting, columnVisibility },
      onSortingChange: setSorting,
      onColumnVisibilityChange,
      manualSorting: true,
      getRowId: (row) => String(row.id),
    });

  const visibleColCount =
    table.getVisibleLeafColumns().length || columns.length;
  const skeletonColumns = table.getVisibleLeafColumns().map((column) => ({
    name: column.id ?? "Column",
  }));
  const selectedCount = isSelectAll ? data.length : selectedRowIds.size;

  const columnToggles = table
    .getAllLeafColumns()
    .filter((column) => column.id !== "select")
    .map((column) => ({
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
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconSearch size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
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
              <FormControlLabel
                control={
                  <CustomCheckbox
                    size="small"
                    checked={allColumnsSelected}
                    indeterminate={!allColumnsSelected && someColumnsSelected}
                    disabled={filteredColumnToggles.length === 0}
                    onChange={(e) => {
                      e.stopPropagation();
                      filteredColumnToggles.forEach((column) => {
                        column.toggleVisibility(e.target.checked);
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ p: 0.5, mr: 1 }}
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
                  "&:hover": { backgroundColor: "#f8fafc" },
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
              {filteredColumnToggles.map((column) => (
                <FormControlLabel
                  key={column.id}
                  control={
                    <CustomCheckbox
                      size="small"
                      checked={column.visible}
                      onChange={(e) => {
                        e.stopPropagation();
                        column.toggleVisibility(!column.visible);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0.5, mr: 1 }}
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
                    "&:hover": { backgroundColor: "#f8fafc" },
                    "& .MuiFormControlLabel-label": {
                      fontSize: "14px",
                      lineHeight: 1.35,
                      whiteSpace: "nowrap",
                    },
                  }}
                  onClick={(e) => e.stopPropagation()}
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
          <Table stickyHeader aria-label="project materials stock history">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = isActive === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        align={
                          NUMERIC_COLUMNS.has(header.column.id)
                            ? "right"
                            : "left"
                        }
                        padding={
                          header.column.id === "select" ? "checkbox" : "normal"
                        }
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          whiteSpace: "nowrap",
                          bgcolor: "background.paper",
                          width: header.column.id === "select" ? 42 : "auto",
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: NUMERIC_COLUMNS.has(
                              header.column.id,
                            )
                              ? "flex-end"
                              : "flex-start",
                            "&:hover": isSortable
                              ? { color: "#888" }
                              : undefined,
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
                        alt="No materials data"
                        width={200}
                        height={200}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                      <Typography color="text.secondary" className="f-14">
                        No stock history found for this project
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    selected={
                      isSelectAll || selectedRowIds.has(row.original.id)
                    }
                    onMouseEnter={() => setHoveredRow(row.original.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    sx={{
                      "&:hover .row-checkbox": {
                        opacity: "1 !important",
                        pointerEvents: "auto",
                      },
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        align={
                          NUMERIC_COLUMNS.has(cell.column.id) ? "right" : "left"
                        }
                        padding={
                          cell.column.id === "select" ? "checkbox" : "normal"
                        }
                      >
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

      <TablePaginationFooter
        table={table}
        totalRows={totalRows}
        selectedCount={selectedCount}
      />
    </Box>
  );
};

export default Materials;
