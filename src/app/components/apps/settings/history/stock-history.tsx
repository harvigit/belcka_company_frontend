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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  IconFilter,
  IconSearch,
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
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import { IconEye } from "@tabler/icons-react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

dayjs.extend(customParseFormat);

const STORAGE_KEY = "stock-history-date-range";
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

interface Props {
  openDrawer: boolean;
  onClose: () => void;
}

const StockHistoryList: React.FC<Props> = ({
  openDrawer,
  onClose,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchHistory, setFetchHistory] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
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
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  // Fetch histories
  const fetchHistories = async (start?: string, end?: string) => {
    setFetchHistory(true);
    try {
      const res = await api.get(
        `stocks/stock-history?company_id=${user.company_id}&start_date=${start}&end_date=${end}`,
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch location", err);
    }
    setFetchHistory(false);
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
  }, [startDate, endDate, openDrawer]);

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
    [users],
  );

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      if (filters.user == "All") return data;
      const matchesUser = filters.user ? item.user_name === filters.user : true;
      const matchesSearch =
        item.short_name?.toLowerCase().includes(search) ||
        item.uuid?.toLowerCase().includes(search) ||
        item.note?.toLowerCase().includes(search);

      return matchesSearch && matchesUser;
    });
  }, [data, filters, searchTerm]);

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
    columnHelper.accessor("date", {
      id: "Date",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2">Date</Typography>
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
            sx={{ cursor: "pointer" }}
          >
            <Typography
              className="f-14"
              color="textPrimary"
              sx={{
                cursor: "pointer",
                width: 150,
              }}
            >
              {item.date ?? "-"}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.uuid, {
      id: "code",
      header: () => "Code",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.name, {
      id: "name",
      header: () => "Name",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("note", {
      id: "note",
      header: () => "Note",
      cell: (info) => {
        return (
          <Typography className="f-14" color="textPrimary">
            {info.getValue()}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.total_amount, {
      id: "amount",
      header: () => "Amount",
      cell: (info) => {
        const item = info.row.original;
        return (
          <Typography
            className="f-14"
            color="textSecondary"
            fontSize={16}
            fontWeight={500}
            ml={1}
          >
            {item.currency}
            {info.getValue() ?? "0"}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.qty, {
      id: "adjustedStock",
      header: () => "Adjusted stock",
      cell: (info) => {
        const item = info.row.original;
        return (
          <Typography
            fontSize={16}
            fontWeight={500}
            ml={2}
            sx={{
              color:
                Number(info.getValue()) > 0
                  ? "success.main"
                  : Number(info.getValue()) < 0
                    ? "error.main"
                    : "text.primary",
            }}
          >
            {info.getValue() ?? "-"}{" "}
            {item.is_sub_qty
              ? item.pack_off_qty && item.pack_off_name ? `(${item.pack_off_qty} ${item.pack_off_name})`
                : "" : ""}
          </Typography>
        );
      },
    }),

    columnHelper.accessor((row) => row?.new_qty, {
      id: "stockInHand",
      header: () => "Stock in Hand",
      cell: (info) => {
        return (
          <Typography
            className="f-14"
            color="textPrimary"
            fontSize={16}
            fontWeight={500}
            ml={2}
          >
            {info.getValue() ?? "-"}
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

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Drawer
      anchor="bottom"
      open={openDrawer}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 0,
          height: "95vh",
          boxShadow: "none",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent={"space-between"}
        ml={-2}
        mb={1}
        p={2}
        pb={0}
      >
        <Box display={"flex"} alignItems={"center"}>
          <IconButton onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Stock History
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>
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
                    <MenuItem value="All">All</MenuItem>
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

export default StockHistoryList;
