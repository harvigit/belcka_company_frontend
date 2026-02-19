"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  DialogContent,
  IconButton,
  Divider,
  Drawer,
  Avatar,
  Tooltip,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Popover,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogActions,
  Chip,
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
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { Grid, Stack } from "@mui/system";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconEye,
  IconHistory,
  IconNotes,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomCheckbox from "../../forms/theme-elements/CustomCheckbox";
import { format } from "date-fns";
import CustomSelect from "../../forms/theme-elements/CustomSelect";
import SkeletonLoader from "../../SkeletonLoader";
import Image from "next/image";
import DateRangePickerBox from "../../common/DateRangePickerBox";
import AddLeave from "../time-clock/time-clock-details/leaves/add-leave";

interface UserLeaveProps {
  active: boolean;
  name: string | null;
  userId: any;
  companyId: number;
}

const STORAGE_KEY = "leave-range";
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

const saveDateRangeToStorage = (
  startDate: Date | null,
  endDate: Date | null,
) => {
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

const UserLeaves: React.FC<UserLeaveProps> = ({
  active,
  name,
  userId,
  companyId,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id?: number | null;
  };
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [fetchLeave, setFetchLeave] = useState<boolean>(true);
  const [openActionModal, setOpenActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);
  const [editLeaveRequest, setEditLeaveRequest] = useState<any | undefined>();
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), 0, 1);
  const defaultEnd = new Date(today.getFullYear(), 11, 31);

  // Load from localStorage or use defaults
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
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

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

  const handleOpen = () => {
    setOpen(true);
    if (startDate && endDate) fetchLeaveHistory(startDate, endDate);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleEdit = (request: any) => {
    const updatedRequest = {
      ...request,
      user_leave_id: request.id,
    };

    delete updatedRequest.id;

    setEditLeaveRequest(updatedRequest);
    setAddLeaveSidebar(true);
  };

  const closeAddLeaveSidebar = () => {
    setAddLeaveSidebar(false);
    setEditLeaveRequest(undefined);
    if (startDate && endDate) fetchLeaves(startDate, endDate);
  };

  const fetchLeaveHistory = async (start: Date, end: Date) => {
    try {
      const startDate = format(start, "dd/MM/yyyy");
      const endDate = format(end, "dd/MM/yyyy");
      const payload = {
        company_id: user.company_id,
        start_date: startDate,
        end_date: endDate,
        user_id: userId,
      };

      const res = await api.post(`user-leaves/get-list`, payload);
      if (res.data?.IsSuccess) setHistory(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    if (active) {
      if (startDate && endDate) fetchLeaveHistory(startDate, endDate);
    }
  }, []);

  // Fetch data
  const fetchLeaves = async (start: Date, end: Date): Promise<void> => {
    setFetchLeave(true);
    try {
      const startDate = format(start, "dd/MM/yyyy");
      const endDate = format(end, "dd/MM/yyyy");

      const payload = {
        company_id: user.company_id,
        start_date: startDate,
        end_date: endDate,
        user_id: userId,
      };

      const res = await api.post(`user-leaves/get-list`, payload);
      if (res.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    }
    setFetchLeave(false);
  };
  useEffect(() => {
    if (startDate && endDate) fetchLeaves(startDate, endDate);
  }, [api, startDate, endDate, active]);

  const handleSubmitAction = async () => {
    if (!selectedId || !actionType) return;

    if (actionType === "reject" && !note.trim()) {
      return toast.error("Rejection note is required");
    }

    try {
      setLoading(true);

      const url =
        actionType === "approve" ? "user-leaves/approve" : "user-leaves/reject";

      const res = await api.post(
        `${url}?user_leave_id=${selectedId}&note=${encodeURIComponent(note)}`,
      );

      toast.success(res.data.message);

      setOpenActionModal(false);
      if (startDate && endDate) fetchLeaves(startDate, endDate);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const TYPE_COLOR: Record<string, string> = {
    unpaid: "#FF7F00",
    paid: "#4CBC6D",
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.user_name?.toLowerCase().includes(search) ||
        item.total_payable_amount?.toLowerCase().includes(search);

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
            sx={{ pl: 0.3 }}
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
    columnHelper.accessor("start_date", {
      id: "leaveDate",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Leave Date
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              {item.leave_date}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.duration ? `${item.duration}` : ""}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("user_name", {
      id: "Name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ cursor: "pointer" }}
          >
            <Avatar
              src={user.user_image ? user.user_image : ""}
              alt={user.name}
              sx={{ width: 36, height: 36 }}
            />
            <Box>
              <Typography
                className="f-14"
                color="textPrimary"
                sx={{
                  width: 190,
                }}
              >
                {user.user_name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.leave_name, {
      id: "leaveType",
      header: () => "Leave type",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.leave_name}
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
          <Stack direction="row" spacing={1} alignItems="center">
            {item.status === 3  && user.user_role_id == 1 ? (
              <>
                <Tooltip title="Approve">
                  <IconButton
                    color="success"
                    onClick={() => {
                      setSelectedId(item.id);
                      setActionType("approve");
                      setNote("");
                      setOpenActionModal(true);
                    }}
                  >
                    <IconCheck size={16} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Reject">
                  <IconButton
                    color="error"
                    onClick={() => {
                      setSelectedId(item.id);
                      setActionType("reject");
                      setNote("");
                      setOpenActionModal(true);
                    }}
                  >
                    <IconX size={16} />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Box display={"flex"} gap={1} alignItems={"center"}>
                <Tooltip title="Edit">
                  <IconButton onClick={() => handleEdit(item)} color="primary">
                    <IconEdit size={16} />
                  </IconButton>
                </Tooltip>

                {item.status_text && (
                  <Chip
                    label={item.status_text}
                    color={
                      item.status == 5
                        ? "success"
                        : item.status == 12
                          ? "error"
                          : "warning"
                    }
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
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
    <Box
      sx={{
        height: `calc(85vh - 100px)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {user.id === userId || user.user_role_id === 1 ? (
        <Box
          mt={3}
          sx={{
            height: `calc(80vh - 100px)`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Render the search and table */}
          <Stack
            mx={2}
            mb={2}
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ flex: 1, minWidth: 0 }}
            >
              <Button
                variant="contained"
                color="primary"
                sx={{ flexShrink: 0 }}
              >
                LEAVES ({table.getPrePaginationRowModel().rows.length})
              </Button>

              <Box className="date_range_picker">
                <DateRangePickerBox
                  from={startDate}
                  to={endDate}
                  onChange={handleDateRangeChange}
                />
              </Box>

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
              />
            </Stack>

            <Stack
              direction="row"
              justifyContent={{ xs: "flex-start", md: "flex-end" }}
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
              <Button
                color="inherit"
                startIcon={<IconHistory />}
                variant="contained"
                sx={{
                  backgroundColor: "transparent",
                  borderRadius: 3,
                  color: "#047bff",
                  float: "inline-end",
                }}
                onClick={handleOpen}
              >
                Leave History
              </Button>

              <IconButton onClick={handlePopoverOpen} color="primary">
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
                      return col.id
                        .toLowerCase()
                        .includes(search.toLowerCase());
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
                        label={
                          col.columnDef.meta?.label ||
                          (typeof col.columnDef.header === "string"
                            ? col.columnDef.header
                            : col.id
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str: string) =>
                                  str.toUpperCase(),
                                ))
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
                            sx={{
                              paddingTop: "10px",
                              paddingBottom: "10px",
                              width: header.column.id == "select" ? 30 : "auto",
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
                  {fetchLeave ? (
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
            pb={1}
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

          <Dialog
            open={openActionModal}
            onClose={() => !loading && setOpenActionModal(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>
              <Box display={"flex"} justifyContent={"space-between"}>
                {actionType === "approve" ? "Approve Leave" : "Reject Leave"}
                <IconX
                  onClick={() => setOpenActionModal(false)}
                  style={{ cursor: "pointer" }}
                />
              </Box>
            </DialogTitle>

            <DialogContent>
              <Typography mb={1}>
                {actionType === "approve"
                  ? "Add approval note (optional)"
                  : "Rejection reason (required)"}
              </Typography>

              <TextField
                autoFocus
                multiline
                minRows={3}
                fullWidth
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Enter approval note..."
                    : "Enter rejection reason..."
                }
                error={actionType === "reject" && !note.trim()}
                helperText={
                  actionType === "reject" && !note.trim()
                    ? "Rejection note is required"
                    : ""
                }
              />
            </DialogContent>

            <DialogActions>
              <Button
                onClick={() => setOpenActionModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                color={actionType === "approve" ? "success" : "error"}
                disabled={loading || (actionType === "reject" && !note.trim())}
                onClick={handleSubmitAction}
              >
                {loading
                  ? "Saving..."
                  : actionType === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* leave history */}
          <Drawer
            anchor="right"
            open={open}
            onClose={handleClose}
            sx={{
              width: 500,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 500,
                padding: 2,
                backgroundColor: "#f9f9f9",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <Box textAlign={"center"} color="textSecondary" mb={2}>
              <Typography color="textSecondary">
                {name ? `${name}'s Leave history` : ""}
              </Typography>

              <IconButton
                aria-label="close"
                onClick={handleClose}
                size="large"
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 6,
                  color: (theme) => theme.palette.grey[900],
                  backgroundColor: "transparent",
                  zIndex: 10,
                  width: 45,
                  height: 45,
                }}
              >
                <IconX size={40} style={{ width: 40, height: 40 }} />
              </IconButton>
            </Box>
            <DialogContent dividers sx={{ padding: 0 }}>
              {loading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  p={4}
                >
                  <CircularProgress />
                </Box>
              ) : history.length > 0 ? (
                <>
                  <Box
                    sx={{
                      position: "relative",
                      mt: 2,
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: "2px",
                        top: 0,
                        bottom: 0,
                        width: "2px",
                      },
                    }}
                  >
                    {history?.map((item: any, index: number) => (
                      <Box
                        key={index}
                        sx={{
                          position: "relative",
                          mb: 3,
                          bgcolor: "white",
                          transition: "0.2s",
                          cursor: "pointer",
                        }}
                      >
                        {item.message && (
                          <>
                            <Box
                              mb={1}
                              ml={2}
                              sx={{ top: -8, position: "absolute" }}
                              flexWrap="wrap"
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  px: 1.2,
                                  py: 0.2,
                                  borderRadius: "12px",
                                  bgcolor:
                                    TYPE_COLOR[item.leave_type] || "#757575",
                                  color: "#fff",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  textTransform: "capitalize",
                                }}
                              >
                                {item.leave_type}
                              </Typography>
                            </Box>
                            {/* Card box */}

                            <Box
                              sx={{
                                border: 1,
                                p: { xs: 1.5, sm: 2 },
                                borderColor: "#c5c3c3ff",
                                borderRadius: 2,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                maxWidth: "100%",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "block",
                                  gap: 0.5,
                                  alignItems: "baseline",
                                }}
                              >
                                <Box
                                  display={"flex"}
                                  justifyContent={"space-between"}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    fontSize={16}
                                    color="text.primary"
                                  >
                                    {item.user_name}:
                                  </Typography>
                                  {item.note && (
                                    <Tooltip title={item.note}>
                                      <IconNotes
                                        style={{ color: "red" }}
                                        size={16}
                                      />
                                    </Tooltip>
                                  )}
                                  {item.comment && (
                                    <Tooltip title={item.comment}>
                                      <IconNotes
                                        style={{ color: "green" }}
                                        size={16}
                                      />
                                    </Tooltip>
                                  )}
                                </Box>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  fontSize={16}
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    lineHeight: 1.25,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {item.message}
                                </Typography>
                              </Box>

                              {/* Date */}
                              {item.user_name && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  {item.date}
                                </Typography>
                              )}
                            </Box>
                          </>
                        )}
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <Box sx={{ height: "150px !important" }}>
                  <Typography align="center" color="textSecondary">
                    No leave history found.
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </Drawer>

          <Drawer
            anchor="right"
            open={addLeaveSidebar}
            onClose={closeAddLeaveSidebar}
            PaperProps={{
              sx: {
                borderRadius: 0,
                boxShadow: "none",
                overflow: "hidden",
                width: "504px",
                borderTopLeftRadius: 18,
                borderBottomLeftRadius: 18,
              },
            }}
          >
            <AddLeave
              onClose={closeAddLeaveSidebar}
              leaveData={editLeaveRequest}
              userId={userId}
              companyId={companyId}
            />
          </Drawer>
        </Box>
      ) : (
        <Box mt={4} display={"flex"} height={"450px"} justifyContent={"center"}>
          <Typography color="textSecondary" className="f-18">
            You do not have permission to view this information.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default UserLeaves;
