"use client";

/**
 * LEGACY Expense list (pre-redesign). Kept for reference.
 * Active UI: ./ExpenseListUI.tsx
 * Do not delete until the new UI is fully validated and this file is no longer needed.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
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
  Typography,
} from "@mui/material";
import {
  IconDownload,
  IconEye,
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format, subDays } from "date-fns";
import {
  createColumnHelper,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Expenses from "@/app/components/apps/time-clock/time-clock-details/expenses";

type ExpenseRow = {
  id: number;
  total_amount: number;
  currency?: string;
  receipt_date?: string | null;
  date_added?: string | null;
  user_id?: number;
  user_name?: string | null;
  project_id?: number;
  project_name?: string | null;
  category_id?: number;
  category_name?: string | null;
  trade_id?: number | null;
  trade_name?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  address_id?: number;
  address_name?: string | null;
  note?: string | null;
  attachment_count?: number;
};

const columnHelper = createColumnHelper<ExpenseRow>();

const defaultFilters = {
  user_id: "" as string | number,
  project_id: "" as string | number,
  category_id: "" as string | number,
  trade_id: "" as string | number,
  team_id: "" as string | number,
};

const ExpenseList = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [data, setData] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(
    new Set(),
  );
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(
    null,
  );

  const openExpenseDetail = (expenseId: number) => {
    setSelectedExpenseId(expenseId);
    setDetailOpen(true);
  };

  const closeExpenseDetail = () => {
    setDetailOpen(false);
    setSelectedExpenseId(null);
  };

  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!user?.company_id) return;
      try {
        const res = await api.get("expense/list-filters");
        const info = res.data?.info || {};
        setProjects(info.projects || []);
        setCategories(info.categories || []);
        setUsers(info.users || []);
        setTeams(info.teams || []);
        setTrades(info.trades || []);
      } catch (error) {
        console.error("Failed to load expense filter options", error);
      }
    };

    fetchFilterOptions();
  }, [user?.company_id]);

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
                (selectedRowIds.size === data.length && data.length > 0)
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
                const isChecked = e.target.checked;
                setIsSelectAll(isChecked);
                setSelectedRowIds(new Set());
              }}
            />
          </Stack>
        ),
        cell: ({ row }: any) => {
          const item = row.original as ExpenseRow;
          const isChecked = isSelectAll || selectedRowIds.has(item.id);
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
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  e.preventDefault();

                  if (isSelectAll) {
                    setIsSelectAll(false);
                    const newSelected = new Set(data.map((r) => r.id));
                    newSelected.delete(item.id);
                    setSelectedRowIds(newSelected);
                  } else {
                    const newSelected = new Set(selectedRowIds);
                    if (isChecked) {
                      newSelected.delete(item.id);
                    } else {
                      newSelected.add(item.id);
                    }
                    setSelectedRowIds(newSelected);
                  }
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
      columnHelper.accessor("receipt_date", {
        id: "receipt_date",
        header: "Receipt Date",
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("date_added", {
        id: "date_added",
        header: "Date Added",
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("user_name", {
        id: "user_name",
        header: "User Name",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("project_name", {
        id: "project_name",
        header: "Project",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("category_name", {
        id: "category_name",
        header: "Category",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("trade_name", {
        id: "trade_name",
        header: "Trade",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("team_name", {
        id: "team_name",
        header: "Team",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("total_amount", {
        id: "total_amount",
        header: "Amount",
        cell: ({ row }) => {
          const item = row.original;
          const currency = item.currency || "";
          const amount = Number(item.total_amount || 0).toFixed(2);
          return (
            <Typography className="f-14" fontWeight={600} sx={{ px: 1.5 }}>
              {currency}
              {amount}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("attachment_count", {
        id: "attachment_count",
        header: "Attachments",
        enableSorting: false,
        cell: ({ row }) => {
          const count = Number(row.original.attachment_count || 0);
          return (
            <Typography
              className="f-14"
              color={count > 0 ? "primary" : "textSecondary"}
              fontWeight={count > 0 ? 600 : 400}
              sx={{
                px: 1.5,
                cursor: count > 0 ? "pointer" : "default",
              }}
              onClick={() => {
                if (count > 0) openExpenseDetail(row.original.id);
              }}
            >
              {count}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Note",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            sx={{
              px: 1.5,
              maxWidth: 220,
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
      columnHelper.accessor("address_name", {
        id: "address_name",
        header: "Address",
        enableSorting: false,
        cell: ({ getValue }) => (
          <Typography className="f-14" sx={{ px: 1.5 }}>
            {getValue() || "-"}
          </Typography>
        ),
      }),
    ],
    [data, isSelectAll, selectedRowIds, hoveredRow],
  );

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  const fetchExpenses = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      let url = `expense/list-web?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) {
        url += `&start_date=${format(startDate, "dd/MM/yyyy")}`;
      }
      if (endDate) {
        url += `&end_date=${format(endDate, "dd/MM/yyyy")}`;
      }
      if (filters.user_id) url += `&user_id=${filters.user_id}`;
      if (filters.project_id) url += `&project_id=${filters.project_id}`;
      if (filters.category_id) url += `&category_id=${filters.category_id}`;
      if (filters.trade_id) url += `&trade_id=${filters.trade_id}`;
      if (filters.team_id) url += `&team_id=${filters.team_id}`;

      if (sorting.length > 0) {
        url += `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? "desc" : "asc"}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData = Array.isArray(res.data.info) ? res.data.info : [];
        setData(responseData);

        const pagMeta = res.data.data || {};
        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else {
          setTotalRows(responseData.length);
        }
        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch expenses", error);
      setData([]);
      setTotalRows(0);
      setPageCount(0);
    } finally {
      setLoading(false);
    }
  };

  const {
    table,
    pagination,
    setPagination,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data,
    columns,
    fetchData: fetchExpenses,
    debounceDependencies: [
      user?.company_id,
      search,
      startDate ? format(startDate, "yyyy-MM-dd") : "",
      endDate ? format(endDate, "yyyy-MM-dd") : "",
      JSON.stringify(filters),
    ],
    state: { columnVisibility, sorting },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    manualSorting: true,
  });

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    setStartDate(range.from);
    setEndDate(range.to);
    setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
  };

  const parseBlobError = async (blob: Blob) => {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      const message = json?.message ?? json?.Message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string" && message.trim()) return message;
      return "Failed to download attachments";
    } catch {
      return "Failed to download attachments";
    }
  };

  const handleDownloadAttachments = async () => {
    if (!isSelectAll && selectedRowIds.size === 0) {
      toast.error("Please select at least one expense");
      return;
    }

    setDownloading(true);
    try {
      const payload: Record<string, any> = {
        select_all: isSelectAll,
      };

      if (isSelectAll) {
        if (search) payload.search = search;
        if (startDate) payload.start_date = format(startDate, "dd/MM/yyyy");
        if (endDate) payload.end_date = format(endDate, "dd/MM/yyyy");
        if (filters.user_id) payload.user_id = filters.user_id;
        if (filters.project_id) payload.project_id = filters.project_id;
        if (filters.category_id) payload.category_id = filters.category_id;
        if (filters.trade_id) payload.trade_id = filters.trade_id;
        if (filters.team_id) payload.team_id = filters.team_id;
      } else {
        payload.ids = Array.from(selectedRowIds);
      }

      const response = await api.post(
        "expense/download-attachments-zip",
        payload,
        { responseType: "blob" },
      );

      const contentType = String(
        response.headers?.["content-type"] || "",
      ).toLowerCase();
      if (contentType.includes("application/json")) {
        toast.error(await parseBlobError(response.data));
        return;
      }

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expense-attachments.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const blob = error?.response?.data;
      if (blob instanceof Blob) {
        toast.error(await parseBlobError(blob));
      } else {
        toast.error(
          error?.response?.data?.message ||
            "Failed to download attachments",
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  const getUserLabel = (option: any) => {
    if (!option) return "";
    if (option.name) return option.name;
    return `${option.first_name || ""} ${option.last_name || ""}`.trim();
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        mr={2}
        ml={2}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
          />
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
          <Button
            variant="contained"
            onClick={() => {
              setTempFilters(filters);
              setFilterOpen(true);
            }}
            sx={{ minWidth: "40px", px: 1 }}
          >
            <IconFilter width={18} />
          </Button>
          <Button
            variant="outlined"
            startIcon={
              downloading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <IconDownload size={18} />
              )
            }
            onClick={handleDownloadAttachments}
            disabled={downloading}
            sx={{ whiteSpace: "nowrap" }}
          >
            Download Attachments
          </Button>
        </Box>

        <Box display="flex" justifyContent="flex-end">
          <IconButton
            onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
            color="primary"
          >
            <IconEye />
          </IconButton>
          <Popover
            open={Boolean(columnMenuAnchor)}
            anchorEl={columnMenuAnchor}
            onClose={() => setColumnMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <FormGroup sx={{ p: 2 }}>
              {table
                .getAllLeafColumns()
                .filter((column) => column.id !== "select")
                .map((column) => (
                <FormControlLabel
                  key={column.id}
                  control={
                    <CustomCheckbox
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                    />
                  }
                  label={
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id
                  }
                />
              ))}
            </FormGroup>
          </Popover>
        </Box>
      </Stack>

      <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <Table stickyHeader>
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
                      sx={{ whiteSpace: "nowrap", py: 1.5 }}
                    >
                      <Box
                        onClick={header.column.getToggleSortingHandler()}
                        sx={{
                          cursor: isSortable ? "pointer" : "default",
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: isActive ? 600 : 500,
                        }}
                      >
                        <Typography variant="body2" component="span">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Typography>
                        {isSortable && (
                          <Box
                            component="span"
                            ml={0.5}
                            sx={{ opacity: isActive ? 1 : 0.35 }}
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
              <SkeletonLoader columns={simpleColumns} rowCount={8} />
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant="body2" color="textSecondary" py={4}>
                    No expenses found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} sx={{ py: 1 }}>
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

      <TablePaginationFooter
        table={table}
        totalRows={totalRows}
        selectedCount={isSelectAll ? totalRows : selectedRowIds.size}
      />

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
            <Autocomplete
              options={users}
              getOptionLabel={getUserLabel}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                users.find(
                  (u) => String(u.id) === String(tempFilters.user_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  user_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="User" fullWidth />
              )}
            />
            <Autocomplete
              options={projects}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                projects.find(
                  (p) => String(p.id) === String(tempFilters.project_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  project_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Project" fullWidth />
              )}
            />
            <Autocomplete
              options={categories}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                categories.find(
                  (c) => String(c.id) === String(tempFilters.category_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  category_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Category" fullWidth />
              )}
            />
            <Autocomplete
              options={trades}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                trades.find(
                  (t) => String(t.id) === String(tempFilters.trade_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  trade_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Trade" fullWidth />
              )}
            />
            <Autocomplete
              options={teams}
              getOptionLabel={(option) => option.title || option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                teams.find(
                  (t) => String(t.id) === String(tempFilters.team_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  team_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Team" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setTempFilters(defaultFilters);
              setFilters(defaultFilters);
              setFilterOpen(false);
              setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setFilterOpen(false);
              setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={closeExpenseDetail}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 420 } },
        }}
      >
        {selectedExpenseId ? (
          <Expenses
            expenseId={selectedExpenseId}
            attachmentsOnly
            onClose={() => {
              closeExpenseDetail();
              fetchExpenses();
            }}
          />
        ) : null}
      </Drawer>
    </Box>
  );
};

export default ExpenseList;
