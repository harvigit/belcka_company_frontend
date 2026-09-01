"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  Typography,
} from "@mui/material";
import { IconEye, IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Image from "next/image";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import toast from "react-hot-toast";
import PermissionGuard from "@/app/auth/PermissionGuard";

dayjs.extend(customParseFormat);

export type ProjectDashboardRow = {
  id: number;
  name: string;
  uuid: string;
  status: number;
  status_text: string;
  assigned_teams: number;
  total_working_users: number;
  limit: number;
  checkins_7_days: number;
  checkins_30_days: number;
  total_checkins: number;
  checking_hour: number;
  shift_hour: number;
  risk: number;
  risk_percent: string;
  last_activity: string | null;
  last_activity_date: string | null;
  last_activity_action: "start" | "stop" | null;
  cases: number;
  open: number;
  close: number;
  in_amount: number;
  out_amount: number;
  in_amount_formatted: string;
  out_amount_formatted: string;
  currency: string;
};

const columnHelper = createColumnHelper<ProjectDashboardRow>();

const formatActivityDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(
    value,
    ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY", "DD-MM-YYYY HH:mm", "YYYY-MM-DD"],
    true,
  );
  if (parsed.isValid()) return parsed.format("DD/MM/YYYY");
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format("DD/MM/YYYY") : "-";
};

const NumberCell = ({ value }: { value: number | string }) => (
  <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
    {value ?? 0}
  </Typography>
);

const HeaderLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="subtitle2"
    sx={{ whiteSpace: "nowrap", lineHeight: 1.2 }}
  >
    {children}
  </Typography>
);

const StackedHeader = ({ top, bottom }: { top: string; bottom: string }) => (
  <Box>
    <Typography
      variant="subtitle2"
      sx={{ whiteSpace: "nowrap", lineHeight: 1.15 }}
    >
      {top}
    </Typography>
    <Typography
      variant="subtitle2"
      sx={{ whiteSpace: "nowrap", lineHeight: 1.15 }}
    >
      {bottom}
    </Typography>
  </Box>
);

const ProjectDashboard = () => {
  const [data, setData] = useState<ProjectDashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currency, setCurrency] = useState("£");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: "all" });
  const [tempFilters, setTempFilters] = useState({ status: "all" });
  const [columnSearch, setColumnSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [switchLoadingIds, setSwitchLoadingIds] = useState<Set<number>>(
    new Set(),
  );
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);

    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(data.map((item) => item.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    id: number;
  };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_project_dashboard`,
      enabled: !!user?.id,
      alwaysVisibleColumns: ["select", "actions"],
    });

  const fetchProjects = async () => {
    if (!user?.company_id) return;
    try {
      setLoading(true);
      let url = `project/dashboard?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filters.status && filters.status !== "all") {
        url += `&status=${filters.status}`;
      }
      const res = await api.get(url);
      if (res.data) {
        const responseData = Array.isArray(res.data.info)
          ? res.data.info
          : res.data.info?.data || [];
        setData(responseData);
        if (res.data.currency) setCurrency(res.data.currency);

        const pagMeta =
          res.data.data?.totalPages !== undefined ||
          res.data.data?.totalItems !== undefined
            ? res.data.data
            : res.data.info && res.data.info.totalPages !== undefined
              ? res.data.info
              : res.data.data || {};

        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else if (pagMeta.total !== undefined) {
          setTotalRows(pagMeta.total);
        } else {
          setTotalRows(responseData.length);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        } else {
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error("Failed to fetch project dashboard", err);
    } finally {
      setLoading(false);
    }
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
              checked={data.length > 0 && selectedRowIds.size === data.length}
              indeterminate={
                selectedRowIds.size > 0 && selectedRowIds.size < data.length
              }
              onClick={(e: any) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelectAllRows(e.target.checked);
              }}
            />
          </Stack>
        ),
        cell: ({ row }: any) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);
          const showCheckbox = isChecked || hoveredRow === item.id;

          return (
            <Stack direction="row" alignItems="center" sx={{ pl: 1 }}>
              <CustomCheckbox
                checked={isChecked}
                onClick={(e: any) => e.stopPropagation()}
                onChange={(e: any) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const next = new Set(selectedRowIds);
                  if (isChecked) next.delete(item.id);
                  else next.add(item.id);
                  setSelectedRowIds(next);
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
        header: () => <HeaderLabel>Name</HeaderLabel>,
        meta: { label: "Name" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            fontWeight={500}
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("uuid", {
        header: () => <HeaderLabel>ID</HeaderLabel>,
        meta: { label: "ID" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {getValue() || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("assigned_teams", {
        header: () => <HeaderLabel>Teams</HeaderLabel>,
        meta: { label: "Teams" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("total_working_users", {
        header: () => <HeaderLabel>On site</HeaderLabel>,
        meta: { label: "On site" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("limit", {
        header: () => <HeaderLabel>Limit</HeaderLabel>,
        meta: { label: "Limit" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checkins_7_days", {
        header: () => <StackedHeader top="Avrg" bottom="7 days" />,
        meta: { label: "Avrg 7 days" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checkins_30_days", {
        header: () => <StackedHeader top="Avrg" bottom="30 days" />,
        meta: { label: "Avrg 30 days" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("total_checkins", {
        header: () => <HeaderLabel>Total Check in</HeaderLabel>,
        meta: { label: "Total Check in" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("checking_hour", {
        header: () => <HeaderLabel>Check in Hours</HeaderLabel>,
        meta: { label: "Check in Hours" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("shift_hour", {
        header: () => <HeaderLabel>Shift Hours</HeaderLabel>,
        meta: { label: "Shift Hours" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("risk_percent", {
        header: () => <HeaderLabel>Risk</HeaderLabel>,
        meta: { label: "Risk" },
        cell: ({ row }) => (
          <Typography
            className="f-14"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
            color={
              row.original.risk < 0
                ? "error.main"
                : row.original.risk > 0
                  ? "success.main"
                  : "textPrimary"
            }
          >
            {row.original.risk_percent}
          </Typography>
        ),
      }),
      columnHelper.accessor("last_activity_date", {
        id: "activity",
        header: () => <HeaderLabel>Activity</HeaderLabel>,
        meta: { label: "Activity" },
        cell: ({ getValue }) => (
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ px: 1.5, whiteSpace: "nowrap" }}
          >
            {formatActivityDate(getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("cases", {
        header: () => <HeaderLabel>Case</HeaderLabel>,
        meta: { label: "Case" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("open", {
        header: () => <HeaderLabel>Open</HeaderLabel>,
        meta: { label: "Open" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("close", {
        header: () => <HeaderLabel>Close</HeaderLabel>,
        meta: { label: "Close" },
        cell: ({ getValue }) => <NumberCell value={getValue()} />,
      }),
      columnHelper.accessor("in_amount_formatted", {
        id: "in_amount",
        header: () => <HeaderLabel>{`In (${currency})`}</HeaderLabel>,
        meta: { label: `In ${currency}` },
        cell: ({ row }) => (
          <Typography className="f-14" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
            {row.original.in_amount_formatted}
          </Typography>
        ),
      }),
      columnHelper.accessor("out_amount_formatted", {
        id: "out_amount",
        header: () => <HeaderLabel>{`Out (${currency})`}</HeaderLabel>,
        meta: { label: `Out ${currency}` },
        cell: ({ row }) => (
          <Typography className="f-14" sx={{ px: 1.5, whiteSpace: "nowrap" }}>
            {row.original.out_amount_formatted}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: { label: "Actions" },
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original;
          const isActive = Number(item.status) === 1;
          const isSaving = switchLoadingIds.has(item.id);

          return (
            <Stack
              direction="row"
              alignItems="center"
              onClick={(e) => e.stopPropagation()}
              sx={{ px: 1 }}
            >
              <IOSSwitch
                checked={isActive}
                disabled={isSaving}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setSwitchLoadingIds((prev) => {
                    const next = new Set(prev);
                    next.add(item.id);
                    return next;
                  });
                  try {
                    const result = await api.post("project/change-status", {
                      id: item.id,
                      company_id: user.company_id,
                      status: checked,
                    });
                    if (result.data?.IsSuccess) {
                      setData((prev) => {
                        const updated = prev.map((rowItem) =>
                          rowItem.id === item.id
                            ? {
                                ...rowItem,
                                status: checked ? 1 : 0,
                                status_text: checked ? "Active" : "Closed",
                              }
                            : rowItem,
                        );
                        if (
                          (filters.status === "1" && !checked) ||
                          (filters.status === "0" && checked)
                        ) {
                          return updated.filter(
                            (rowItem) => rowItem.id !== item.id,
                          );
                        }
                        return updated;
                      });
                      toast.success(
                        result.data.message ||
                          (checked
                            ? "Project marked as active!"
                            : "Project marked as closed!"),
                      );
                    } else {
                      toast.error(
                        result.data?.message || "Failed to change status",
                      );
                    }
                  } catch (error) {
                    console.error(error);
                    toast.error("Failed to change status");
                  } finally {
                    setSwitchLoadingIds((prev) => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                  }
                }}
              />
            </Stack>
          );
        },
      }),
    ],
    [
      currency,
      data,
      hoveredRow,
      selectedRowIds,
      switchLoadingIds,
      user?.company_id,
      filters.status,
    ],
  );

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
    fetchData: fetchProjects,
    debounceDependencies: [searchTerm, user?.company_id, filters.status],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, filters.status]);

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Project">
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
          <Box display="flex" alignItems="center">
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", sm: 300 } }}
            />
            <Button
              variant="contained"
              onClick={() => {
                setTempFilters(filters);
                setFilterOpen(true);
              }}
              sx={{ ml: 1, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
          </Box>

          <Box display="flex" alignItems="center">
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 1 }}
              color="primary"
            >
              <IconEye />
            </IconButton>
            <Popover
              open={Boolean(anchorEl)}
              anchorEl={anchorEl}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: {
                  width: 280,
                  mt: 1,
                  p: 1,
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
                }}
              >
                <FormGroup sx={{ gap: 0.25 }}>
                  {(() => {
                    const columnOptions = table
                      .getAllLeafColumns()
                      .filter((col: any) => {
                        if (col.id === "select" || col.id === "actions")
                          return false;
                        const label = String(
                          col.columnDef.meta?.label ||
                            (typeof col.columnDef.header === "string"
                              ? col.columnDef.header
                              : col.id),
                        );
                        return label
                          .toLowerCase()
                          .includes(columnSearch.toLowerCase());
                      });
                    const allSelected =
                      columnOptions.length > 0 &&
                      columnOptions.every((col: any) => col.getIsVisible());
                    const someSelected = columnOptions.some((col: any) =>
                      col.getIsVisible(),
                    );

                    return (
                      <>
                        <FormControlLabel
                          control={
                            <CustomCheckbox
                              size="small"
                              checked={allSelected}
                              indeterminate={!allSelected && someSelected}
                              disabled={columnOptions.length === 0}
                              onChange={(e) => {
                                columnOptions.forEach((col: any) =>
                                  col.toggleVisibility(e.target.checked),
                                );
                              }}
                            />
                          }
                          label="Select All"
                          sx={{
                            m: 0,
                            px: 0.75,
                            py: 0.375,
                            borderBottom: "1px solid #eef2f7",
                            "& .MuiFormControlLabel-label": {
                              fontSize: "14px",
                              fontWeight: 600,
                            },
                          }}
                        />
                        {columnOptions.map((col: any) => (
                          <FormControlLabel
                            key={col.id}
                            control={
                              <CustomCheckbox
                                size="small"
                                checked={col.getIsVisible()}
                                onChange={col.getToggleVisibilityHandler()}
                              />
                            }
                            label={
                              col.columnDef.meta?.label ||
                              (typeof col.columnDef.header === "string"
                                ? col.columnDef.header
                                : col.id)
                            }
                            sx={{
                              m: 0,
                              px: 0.75,
                              py: 0.375,
                              "& .MuiFormControlLabel-label": {
                                fontSize: "14px",
                              },
                            }}
                          />
                        ))}
                      </>
                    );
                  })()}
                </FormGroup>
              </Box>
            </Popover>
          </Box>
        </Stack>

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
              <IconX />
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
                <MenuItem value="1">Active</MenuItem>
                <MenuItem value="0">Closed</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setTempFilters({ status: "all" });
                setFilters({ status: "all" });
                setFilterOpen(false);
              }}
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

        <TableContainer
          ref={tableContainerRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: "auto",
            overflowY: "auto",
          }}
        >
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
                        align="center"
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          width: header.column.id === "select" ? 30 : "auto",

                          ...(header.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 3,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
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
              {loading ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                />
              ) : table.getRowModel().rows.length === 0 ? (
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
                      <TableCell
                        key={cell.id}
                        sx={{
                          padding: "10px",
                          ...(cell.column.id === "actions" && {
                            position: "sticky",
                            right: 0,
                            backgroundColor: "background.paper",
                            zIndex: 1,
                            boxShadow: isScrollable
                              ? "-2px 0 4px -2px rgba(0,0,0,0.1)"
                              : "none",
                          }),
                        }}
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

        <TablePaginationFooter
          table={table}
          totalRows={totalRows}
          selectedCount={selectedRowIds.size}
        />
      </Box>
    </PermissionGuard>
  );
};

export default ProjectDashboard;
