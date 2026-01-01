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
  Tooltip,
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
  IconFilter,
  IconSearch,
  IconTableColumn,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconX } from "@tabler/icons-react";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";

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

const HistoryList = () => {
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [filters, setFilters] = useState({ type: "", user: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [open, setOpen] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id?: number | null;
  };
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
    initialDates.startDate
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  // Fetch histories
  const fetchHistories = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const res = await api.get(
        `requests/get-history?company_id=${user.company_id}&start_date=${start}&end_date=${end}`
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
    setLoading(false);
  };

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

  useEffect(() => {
    if (startDate && endDate) {
      const formattedStart = dayjs(startDate).format("DD/MM/YYYY");
      const formattedEnd = dayjs(endDate).format("DD/MM/YYYY");
      fetchHistories(formattedStart, formattedEnd);
    }
  }, [startDate, endDate]);

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
    fetchUsers();
  }, [api]);

  const uniqueSupervisors = useMemo(
    () => [...new Set(users.map((item) => item.name).filter(Boolean))],
    [users]
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesType = filters.type
        ? item.request_type === Number(filters.type)
        : true;
      const matchesUser = filters.user ? item.user_name === filters.user : true;
      const matchesSearch =
        item.user_name?.toLowerCase().includes(search) ||
        item.type_name?.toLowerCase().includes(search) ||
        item.message?.toLowerCase().includes(search);

      return matchesSearch && matchesType && matchesUser;
    });
  }, [data, filters, searchTerm]);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    columnHelper.accessor("name", {
      id: "userName",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <CustomCheckbox
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
              const isChecked = e.target.checked;

              setShowAllCheckboxes(isChecked);

              if (isChecked) {
                setSelectedRowIds(new Set(filteredData.map((r) => r.id)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />

          <Typography variant="subtitle2">User Name</Typography>
        </Stack>
      ),
      enableSorting: true,

      cell: ({ row }) => {
        const user = row.original;

        const isChecked = selectedRowIds.has(user.id);

        const showCheckbox =
          showAllCheckboxes || hoveredRow === user.id || isChecked;

        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={4}
            sx={{ pl: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CustomCheckbox
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  const newSet = new Set(selectedRowIds);
                  if (newSet.has(user.id)) newSet.delete(user.id);
                  else newSet.add(user.id);
                  setSelectedRowIds(newSet);
                }}
                sx={{
                  opacity: showCheckbox ? 1 : 0,
                  pointerEvents: showCheckbox ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              />
            </Box>

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
          <Button variant="contained" color="primary">
            HISTORIES ({table.getPrePaginationRowModel().rows.length}){" "}
          </Button>
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
          <Button variant="contained" onClick={() => setOpen(true)}>
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
                <MenuItem value="">All</MenuItem>
                <MenuItem value="101">Timesheet</MenuItem>
                <MenuItem value="102">Worklog</MenuItem>
                <MenuItem value="103">Billing Info</MenuItem>
                <MenuItem value="104">User</MenuItem>
                <MenuItem value="105">User Company</MenuItem>
                <MenuItem value="106">Project</MenuItem>
                <MenuItem value="107">Address</MenuItem>
                <MenuItem value="108">Company</MenuItem>
                <MenuItem value="109">Team</MenuItem>
                <MenuItem value="110">Leave</MenuItem>
                <MenuItem value="111">Expense</MenuItem>
                <MenuItem value="112">Zone</MenuItem>
                <MenuItem value="113">Shift</MenuItem>
              </TextField>

              {uniqueSupervisors.length > 0 ? (
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
                  <MenuItem value="">All</MenuItem>
                  {uniqueSupervisors.map((supervisor, i) => (
                    <MenuItem key={i} value={supervisor}>
                      {supervisor}
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
          <IconButton onClick={handlePopoverOpen} sx={{ ml: 1 }}>
            <IconTableColumn />
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
                          width: header.column.id === "actions" ? 120 : "auto",
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
                              header.getContext()
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
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  hover
                  sx={{
                    cursor: "pointer",
                  }}
                  key={row.id}
                  onMouseEnter={() => setHoveredRow(row.original.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} sx={{ padding: "10px" }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
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
          <Typography color="textSecondary">
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
            <Typography color="textSecondary">Page</Typography>
            <Typography color="textSecondary" fontWeight={600} ml={1}>
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </Typography>
            <Typography color="textSecondary" ml={"3px"}>
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
  );
};

export default HistoryList;
