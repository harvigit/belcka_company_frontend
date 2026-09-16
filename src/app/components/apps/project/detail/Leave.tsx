"use client";

import React, { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { IconEye, IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import dayjs from "dayjs";
import Image from "next/image";
import api from "@/utils/axios";
import { tableFilterOptions } from "@/utils/uniqueFilterOptions";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

type LeaveRow = {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  leave_name?: string | null;
  leave_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration?: string | null;
  is_allday_leave?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  total_time_of_days?: string | null;
  status?: number | string | null;
  request_status?: number | string | null;
  status_text?: string | null;
  manager_note?: string | null;
};

type FilterOption = {
  id: number | string;
  name: string;
};

type LeaveFilterState = {
  users: number[];
  leaveTypes: string[];
  statuses: string[];
};

const EMPTY_LEAVE_FILTERS: LeaveFilterState = {
  users: [],
  leaveTypes: [],
  statuses: [],
};

const COLUMN_LABELS: Record<string, string> = {
  user: "User",
  leave: "Leave",
  type: "Type",
  startDate: "Start date",
  endDate: "End date",
  duration: "Duration",
  status: "Status",
  note: "Note",
};

const columnHelper = createColumnHelper<LeaveRow>();

const getStatusText = (row: LeaveRow) =>
  String(row.status_text || "").trim() ||
  (Number(row.status ?? row.request_status) === 5
    ? "approved"
    : Number(row.status ?? row.request_status) === 12
      ? "rejected"
      : Number(row.status ?? row.request_status) === 3
        ? "pending"
        : "-");

const getStatusColor = (row: LeaveRow) => {
  const statusText = getStatusText(row).toLowerCase();
  if (Number(row.status ?? row.request_status) === 5 || statusText === "approved") {
    return "#008000";
  }
  if (Number(row.status ?? row.request_status) === 12 || statusText === "rejected") {
    return "#ff1744";
  }
  return "#f59e0b";
};

const getDurationText = (row: LeaveRow) => {
  const mapped = String(row.duration ?? "").trim().replace(/^\((.*)\)$/, "$1");
  if (mapped) return mapped;
  if (row.is_allday_leave) {
    return row.total_time_of_days ? `${row.total_time_of_days} day(s)` : "All day";
  }
  if (row.start_time && row.end_time) {
    return `${row.start_time} - ${row.end_time}`;
  }
  return "-";
};

const Leave = ({ projectId }: { projectId: number }) => {
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: string | number | null;
  };
  const [data, setData] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<LeaveFilterState>(EMPTY_LEAVE_FILTERS);
  const [tempFilters, setTempFilters] = useState<LeaveFilterState>(EMPTY_LEAVE_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{
    users: FilterOption[];
    leaveTypes: FilterOption[];
    statuses: FilterOption[];
  }>({
    users: [],
    leaveTypes: [],
    statuses: [],
  });
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [columnSearch, setColumnSearch] = useState("");

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id ?? "user"}_project_leave`,
      enabled: Boolean(user?.company_id),
    });

  const columns = useMemo(
    () => [
      columnHelper.accessor("user_name", {
        id: "user",
        header: () => <Typography variant="subtitle2">User</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("leave_name", {
        id: "leave",
        header: () => <Typography variant="subtitle2">Leave</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("leave_type", {
        id: "type",
        header: () => <Typography variant="subtitle2">Type</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue()
              ? String(getValue()).charAt(0).toUpperCase() +
                String(getValue()).slice(1)
              : "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("start_date", {
        id: "startDate",
        header: () => <Typography variant="subtitle2">Start date</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("end_date", {
        id: "endDate",
        header: () => <Typography variant="subtitle2">End date</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor((row) => getDurationText(row), {
        id: "duration",
        header: () => <Typography variant="subtitle2">Duration</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor((row) => getStatusText(row), {
        id: "status",
        header: () => <Typography variant="subtitle2">Status</Typography>,
        cell: ({ row }) => {
          const label = getStatusText(row.original);
          return (
            <Chip
              size="small"
              label={label === "-" ? "-" : label.charAt(0).toUpperCase() + label.slice(1)}
              sx={{
                height: 24,
                fontWeight: 600,
                textTransform: "capitalize",
                bgcolor: `${getStatusColor(row.original)}22`,
                color: getStatusColor(row.original),
              }}
            />
          );
        },
      }),
      columnHelper.accessor("manager_note", {
        id: "note",
        header: () => <Typography variant="subtitle2">Note</Typography>,
        cell: ({ getValue }) => (
          <Typography className="f-14" color="textPrimary" noWrap>
            {getValue() || "-"}
          </Typography>
        ),
      }),
    ],
    [],
  );

  const formattedStart = startDate ? dayjs(startDate).format("DD/MM/YYYY") : "";
  const formattedEnd = endDate ? dayjs(endDate).format("DD/MM/YYYY") : "";

  const fetchLeaves = async () => {
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
      if (formattedStart) params.set("start_date", formattedStart);
      if (formattedEnd) params.set("end_date", formattedEnd);
      if (filters.users.length) params.set("user_ids", filters.users.join(","));
      if (filters.leaveTypes.length) {
        params.set("leave_type", filters.leaveTypes.join(","));
      }
      if (filters.statuses.length) params.set("status", filters.statuses.join(","));

      const res = await api.get(`user-leaves/project-list?${params.toString()}`);
      const responseData = Array.isArray(res.data?.info) ? res.data.info : [];
      const apiFilterOptions = res.data?.filter_options || {};

      setData(responseData);
      setFilterOptions((prev) => ({
        users: tableFilterOptions(
          apiFilterOptions.users,
          responseData,
          "user_id",
          "user_name",
          prev.users,
        ),
        leaveTypes: tableFilterOptions(
          apiFilterOptions.leave_types,
          responseData,
          "leave_type",
          "leave_type",
          prev.leaveTypes,
        ),
        statuses: tableFilterOptions(
          apiFilterOptions.statuses,
          responseData,
          "request_status",
          "status_text",
          prev.statuses,
        ),
      }));

      const pagMeta =
        res.data?.data?.totalPages !== undefined ||
        res.data?.data?.totalItems !== undefined
          ? res.data.data
          : {};

      if (pagMeta.totalItems !== undefined) {
        setTotalRows(pagMeta.totalItems);
      } else {
        setTotalRows(responseData.length);
      }

      if (pagMeta.totalPages !== undefined) {
        setPageCount(pagMeta.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch project leave details", err);
      setData([]);
      setTotalRows(0);
      setPageCount(0);
    }
    setLoading(false);
  };

  const { table, pagination, setPagination, totalRows, setTotalRows, setPageCount } =
    useServerTable({
      data,
      columns,
      fetchData: fetchLeaves,
      debounceDependencies: [
        searchTerm,
        formattedStart,
        formattedEnd,
        user?.company_id,
        projectId,
        filters.users.join(","),
        filters.leaveTypes.join(","),
        filters.statuses.join(","),
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
  const activeFilterCount =
    filters.users.length + filters.leaveTypes.length + filters.statuses.length;
  const hasActiveFilters =
    activeFilterCount > 0 || Boolean(startDate || endDate);

  const handleOpenFilters = () => {
    setTempFilters(filters);
    setFilterOpen(true);
  };

  const handleCloseFilters = () => {
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_LEAVE_FILTERS);
    setTempFilters(EMPTY_LEAVE_FILTERS);
    setFilterOpen(false);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleClearAppliedFilters = (event: React.MouseEvent) => {
    event.stopPropagation();
    setFilters(EMPTY_LEAVE_FILTERS);
    setTempFilters(EMPTY_LEAVE_FILTERS);
    setStartDate(null);
    setEndDate(null);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setFilterOpen(false);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    setStartDate(range.from);
    setEndDate(range.to);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleFilterValueChange = (
    key: keyof LeaveFilterState,
    value: Array<number | string>,
    numeric = false,
  ) => {
    const normalizedValue = numeric
      ? value
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0)
      : value.map((item) => String(item)).filter(Boolean);

    setTempFilters((prev) => ({
      ...prev,
      [key]: normalizedValue,
    }));
  };

  const renderFilterSelect = (
    label: string,
    key: keyof LeaveFilterState,
    options: FilterOption[],
    numeric = false,
  ) => {
    const value = tempFilters[key] as Array<number | string>;
    const selectedValueStrings = value.map(String);
    const selectedOptions = options.filter((option) =>
      selectedValueStrings.includes(String(option.id)),
    );

    return (
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={options}
        value={selectedOptions}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, selectedOption) =>
          String(option.id) === String(selectedOption.id)
        }
        onChange={(_, selected) => {
          handleFilterValueChange(
            key,
            selected.map((option) => (numeric ? Number(option.id) : String(option.id))),
            numeric,
          );
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => {
            const { key: chipKey, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={chipKey}
                label={option.name}
                color="primary"
                size="small"
                {...tagProps}
                sx={{ borderRadius: "4px", height: 28 }}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            placeholder={selectedOptions.length ? "" : `Select ${label.toLowerCase()}`}
          />
        )}
      />
    );
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
              onChange={handleDateRangeChange}
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
              color="primary"
              variant="contained"
              size="small"
              onClick={handleOpenFilters}
              aria-label="Open filters"
              sx={{
                minHeight: 34,
                height: 34,
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
                minWidth: 64,
                px: 1.5,
              }}
            >
              <IconFilter size={18} />
            </Button>
            {hasActiveFilters && (
              <Button
                color="error"
                variant="outlined"
                size="small"
                onClick={handleClearAppliedFilters}
                aria-label="Clear filters"
                sx={{
                  minHeight: 34,
                  height: 34,
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 600,
                  minWidth: 64,
                  px: 1.5,
                }}
              >
                <IconX size={18} />
              </Button>
            )}
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
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            fullWidth
            sx={{ mb: 1 }}
          />
          <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
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
                  borderBottom: "1px solid #eef2f7",
                  mb: 0.25,
                  "& .MuiFormControlLabel-label": {
                    fontSize: "14px",
                    fontWeight: 600,
                  },
                }}
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
                    "& .MuiFormControlLabel-label": { fontSize: "14px" },
                  }}
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
          <Table stickyHeader aria-label="project leave details">
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
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          whiteSpace: "nowrap",
                          bgcolor: "background.paper",
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            display: "inline-flex",
                            alignItems: "center",
                            "&:hover": isSortable ? { color: "#888" } : undefined,
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
                        alt="No leave data"
                        width={200}
                        height={200}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                      <Typography color="text.secondary" className="f-14">
                        No leave found for this project
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
        onClose={handleCloseFilters}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: "100%" },
            maxWidth: 600,
            m: { xs: 1.5, sm: 4 },
            overflow: "visible",
          },
        }}
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
          Filters
          <IconButton
            aria-label="Close"
            onClick={handleCloseFilters}
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
        <DialogContent sx={{ overflowX: "hidden" }}>
          <Stack spacing={2} mt={1} sx={{ width: "100%", minWidth: 0 }}>
            {renderFilterSelect("Users", "users", filterOptions.users, true)}
            {renderFilterSelect("Leave type", "leaveTypes", filterOptions.leaveTypes)}
            {renderFilterSelect("Status", "statuses", filterOptions.statuses)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearFilters} color="inherit">
            Clear
          </Button>
          <Button variant="contained" onClick={handleApplyFilters}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <TablePaginationFooter table={table} totalRows={totalRows} />
    </Box>
  );
};

export default Leave;
