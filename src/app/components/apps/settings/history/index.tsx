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
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  IconFilter,
  IconSearch,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconX } from "@tabler/icons-react";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { IconEye } from "@tabler/icons-react";

dayjs.extend(customParseFormat);

const STORAGE_KEY = "history-date-range";
const saveDateRangeToStorage = (startDate: Date, endDate: Date) => {
  try {
    const dateRange = {
      startDate: startDate ? startDate.toDateString() : null,
      endDate: endDate ? endDate.toDateString() : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
};

const loadDateRangeFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      };
    }
  } catch (error) {
    console.error("Error loading date range from localStorage:", error);
  }
  return null;
};

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

const HistoryList = () => {
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchHistory, setFetchHistory] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllAcrossPages = async (checked: boolean) => {
    if (!checked) {
      setSelectedRowIds(new Set());
      return;
    }
    try {
      (window as any).__isSelectingAll = true;
      await fetchHistories();
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

  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [filters, setFilters] = useState({ type: "", user: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; id?: string } & {
    user_role_id?: number | null;
  };

  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_settings_history`,
    enabled: !!user?.id,
  });
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);

  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  const getInitialDates = () => {
    const stored = loadDateRangeFromStorage();
    if (stored && stored.startDate && stored.endDate) {
      return {
        startDate: stored.startDate,
        endDate: stored.endDate,
      };
    }
    return {
      startDate: defaultStart,
      endDate: defaultEnd,
    };
  };

  const initialDates = getInitialDates();
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  // Fetch histories
  const fetchHistories = async (start?: string, end?: string) => {
    setFetchHistory(true);
    try {
      let url = `requests/get-history?company_id=${user.company_id}&start_date=${start}&end_date=${end}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (filters.type && filters.type !== "All") {
        url += `&type=${filters.type}`;
      }
      if (filters.user && filters.user !== "All") {
        url += `&user_id=${filters.user}`;
      }
      const res = await api.get(url);
      if (res.data) {
        setData(res.data.info);
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
    setFetchHistory(false);
  };

  const HISTORY_TYPES = [
    { value: "All", label: "All" },
    { value: "101", label: "Timesheet" },
    { value: "102", label: "Worklog" },
    { value: "103", label: "Billing Info" },
    { value: "104", label: "User" },
    { value: "105", label: "User Company" },
    { value: "106", label: "Project" },
    { value: "107", label: "Address" },
    { value: "108", label: "Company" },
    { value: "109", label: "Team" },
    { value: "110", label: "Leave" },
    { value: "111", label: "Expense" },
    { value: "112", label: "Zone" },
    { value: "113", label: "Shift" },
    { value: "114", label: "Supplier" },
    { value: "115", label: "Store" },
    { value: "117", label: "Product" },
    { value: "119", label: "Purchase Order" },
    { value: "120", label: "Stock" },
    { value: "121", label: "Pricework" },
    { value: "122", label: "Bookkeeper Invoice" },
    { value: "123", label: "Payslip" },
    { value: "124", label: "Penalty Appeal" },
    { value: "125", label: "Order" },
    { value: "126", label: "Adjustment" },
    { value: "127", label: "Zone Group" },
    { value: "128", label: "Near Miss Report" },
    { value: "129", label: "Product Trades" },
    { value: "130", label: "Trade Limits" },
    { value: "131", label: "Hired Product" },
    { value: "132", label: "Certificates" },
    { value: "136", label: "Form" },
    { value: "137", label: "System Permission" },
    { value: "138", label: "Company Permission" },
    { value: "139", label: "Permission" },
  ];

  const fetchUsers = async () => {
    try {
      const res = await api.get("user/get-user-lists");
      if (res.data) {
        setUsers(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
  };

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);

      saveDateRangeToStorage(range.from, range.to);
    }
  };
  useEffect(() => {
    if (user?.company_id) {
      fetchUsers();
    }
  }, [user?.company_id]);

  const uniqueUsers = useMemo(
    () =>
      users.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      ),
    [users],
  );

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

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
    columnHelper.accessor("name", {
      id: "userName",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2">User Name</Typography>
        </Stack>
      ),
      enableSorting: true,

      cell: ({ row }) => {
        const user = row.original;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ cursor: "pointer" }}
          >
            <Avatar
              src={user.user_image ? user.user_image : ""}
              alt={user.user_name}
              sx={{ width: 36, height: 36 }}
            />
            <Box>
              <Typography
                className="f-14"
                color="textPrimary"
                sx={{
                  cursor: "pointer",
                  width: 150,
                }}
              >
                {user.user_name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.message, {
      id: "details",
      header: () => "Details",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.type_name, {
      id: "historyType",
      header: () => "Type",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("date", {
      id: "date",
      header: () => "Date",
      cell: (info) => {
        const row = info.row.original;

        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue()} {row.time}
          </Typography>
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
    data: filteredData,
    columns,
    fetchData: () => {
      if (startDate && endDate && user?.company_id) {
        const formattedStart = dayjs(startDate).format("DD/MM/YYYY");
        const formattedEnd = dayjs(endDate).format("DD/MM/YYYY");
        fetchHistories(formattedStart, formattedEnd);
      }
    },
    debounceDependencies: [
      searchTerm,
      filters,
      startDate,
      endDate,
      user?.company_id,
    ],
  
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
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
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
          />
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
          <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}>
            <IconFilter width={18} />
          </Button>
        </Grid>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
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
                label="History Type"
                value={tempFilters.type}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, type: e.target.value })
                }
              >
                {HISTORY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>

              {uniqueUsers.length > 0 ? (
                <TextField
                  select
                  label="User"
                  value={tempFilters.user}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      user: e.target.value,
                    })
                  }
                  fullWidth
                >
                  <MenuItem value="All">All</MenuItem>
                  {uniqueUsers.map((u, i) => (
                    <MenuItem key={i} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <></>
              )}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => {
                setTempFilters({ type: "", user: "" });
                setFilters({ type: "", user: "" });
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
                      <CustomCheckbox
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
                            header.column.id === "actions"
                              ? 120
                              : header.column.id === "select"
                                ? 30
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
              {fetchHistory ? (
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
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredRow(row.original.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
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
      <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined} table={table} totalRows={totalRows} />
    </Box>
  );
};

export default HistoryList;
