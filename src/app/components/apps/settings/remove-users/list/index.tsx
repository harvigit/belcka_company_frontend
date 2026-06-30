"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconSearch,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Link from "next/link";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format } from "date-fns";
import "react-phone-input-2/lib/material.css";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { AxiosResponse } from "axios";
import Cookies from "js-cookie";
import Image from "next/image";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import toast from "react-hot-toast";

dayjs.extend(customParseFormat);

export interface UserList {
  id: number;
  name: string;
  user_code: string;
  supervisor_name: string;
  user_image: string;
  trade_name: string;
  email: string;
  phone: number;
  extension: string;
  team_name: string;
  company_id: number | null;
  user_role_id: number;
  joining_date: string;
  remove_on: string | null;
}

import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

const RemoveUsersList = () => {
  const [data, setData] = useState<UserList[]>([]);
  const [fetchUser, setFetchUser] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  // Rejoin state
  const [rejoinDialogOpen, setRejoinDialogOpen] = useState(false);
  const [rejoinLoading, setRejoinLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const session = useSession();
  const user = session.data?.user as User & { id: number } & {
    company_id?: string | null;
  } & { user_role_id: number };

  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasHorizontalScrollbar, setHasHorizontalScrollbar] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  const fetchUsers = async () => {
    setFetchUser(true);
    try {
      let url = `user/get-remove-users?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res: AxiosResponse<any> = await api.get(url);
      if (res.data) {
        setData(res.data.info);
        setPageCount(res.data.data?.totalPages || 0);
        setTotalRows(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch remove users", err);
    }
    setFetchUser(false);
  };

  const handleRejoinConfirm = async () => {
    setRejoinLoading(true);
    try {
      const selectedIds = Array.from(selectedRowIds);
      const res: AxiosResponse<any> = await api.post("user/rejoin-users", {
        user_ids: selectedIds,
      });
      if (res.data?.IsSuccess) {
        toast.success(res.data?.message || "Users rejoined successfully!");
        setData((prev) => prev.filter((u) => !selectedRowIds.has(u.id)));
        setSelectedRowIds(new Set());
      } else {
        toast.error(res.data?.message || "Rejoin failed!");
      }
    } catch (err) {
      console.error("Failed to rejoin users", err);
      toast.error("Something went wrong. Please try again.");
    }
    setRejoinLoading(false);
    setRejoinDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const selectedIds = Array.from(selectedRowIds);
      const res: AxiosResponse<any> = await api.post(
        "user/permanent-delete-users",
        {
          user_ids: selectedIds,
          company_id: user.company_id,
        },
      );
      if (res.data?.IsSuccess) {
        toast.success(res.data?.message || "Users permanently deleted!");
        setData((prev) => prev.filter((u) => !selectedRowIds.has(u.id)));
        setSelectedRowIds(new Set());
      } else {
        toast.error(res.data?.message || "Delete failed!");
      }
    } catch (err) {
      console.error("Failed to permanently delete users", err);
      toast.error("Something went wrong. Please try again.");
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  useEffect(() => {
    const handleResize = () => {
      if (tableContainerRef.current) {
        setHasHorizontalScrollbar(
          tableContainerRef.current.scrollWidth >
            tableContainerRef.current.clientWidth,
        );
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data]);

  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  const userId = user?.id;
  const getColumnVisibilityKey = (userId?: number | string) =>
    userId
      ? `columnVisibility_removeUsers_${userId}`
      : "columnVisibility_removeUsers";
  const columnVisibilityKey = getColumnVisibilityKey(userId);

  const columnHelper = createColumnHelper<UserList>();

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
              if (e.target.checked) {
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
    columnHelper.accessor("name", {
      id: "name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2">Name</Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;

        return (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Link href={`/apps/users/${user.id}?is_removed_user=true`} passHref>
              <Stack
                direction="row"
                alignItems="center"
                spacing={4}
                sx={{ cursor: "pointer" }}
              >
                <Avatar
                  src={user.user_image ?? ""}
                  alt={user.name}
                  sx={{ width: 36, height: 36 }}
                />
                <Box>
                  <Typography
                    className="f-14"
                    color="textPrimary"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { color: "#173f98" },
                      width: 190,
                    }}
                  >
                    {user.name ?? "-"}
                  </Typography>
                  <Tooltip title={user.trade_name ?? "-"} placement="top" arrow>
                    <Typography
                      color="textSecondary"
                      variant="subtitle1"
                      width={190}
                      noWrap
                    >
                      {user.trade_name}
                    </Typography>
                  </Tooltip>
                </Box>
              </Stack>
            </Link>
          </Stack>
        );
      },
    }),
    columnHelper.accessor((row) => row.team_name, {
      id: "teamName",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Team Name
        </Typography>
      ),
      cell: (info) => (
        <Typography
          className="f-14"
          color="textPrimary"
          sx={{ width: 100, ml: 2 }}
        >
          {info.getValue() ?? "-"}
        </Typography>
      ),
    }),
    columnHelper.accessor((row) => row.email, {
      id: "email",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Email
        </Typography>
      ),
      cell: (info) => (
        <Tooltip title={info.getValue() ?? ""} placement="top" arrow>
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ width: 100, ml: 2 }}
            noWrap
          >
            {info.getValue() ?? "-"}
          </Typography>
        </Tooltip>
      ),
    }),
    columnHelper.accessor((row) => row.user_code, {
      id: "userCode",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Company Code
        </Typography>
      ),
      cell: (info) => (
        <Tooltip title={info.getValue() ?? ""} placement="top" arrow>
          <Typography
            className="f-14"
            color="textPrimary"
            sx={{ width: 100, ml: 2 }}
            noWrap
          >
            {info.getValue() ?? "-"}
          </Typography>
        </Tooltip>
      ),
    }),
    columnHelper.accessor((row) => row.phone, {
      id: "phone",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Phone
        </Typography>
      ),
      cell: (info) => {
        const u = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {u.extension ?? "0"}
            {info.getValue() ?? "-"}
          </Typography>
        );
      },
    }),
    columnHelper.accessor((row) => row.joining_date, {
      id: "joiningDate",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Joining on
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.joining_date ? formatDate(row.joining_date) : "-"}
          </Typography>
        );
      },
    }),
    columnHelper.accessor((row) => row.remove_on, {
      id: "removeDate",
      header: () => (
        <Typography variant="subtitle2" noWrap>
          Remove on
        </Typography>
      ),
      cell: (info) => {
        const row = info.row.original;
        return (
          <Typography className="f-14" color="textPrimary">
            {row.remove_on ? formatDate(row.remove_on) : "-"}
          </Typography>
        );
      },
    }),
  ];

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
    fetchData: fetchUsers,
    debounceDependencies: [searchTerm, user?.company_id, user?.id],
  });

  useEffect(() => {
    if (!userId) return;
    const savedVisibility = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};
    table.setColumnVisibility(savedVisibility);
  }, [table, userId]);

  useEffect(() => {
    const eligibleColumns = table
      .getAllLeafColumns()
      .filter((col) => col.id !== "conflicts");
    const allSelected = eligibleColumns.every((col) => col.getIsVisible());
    const visibleCount = eligibleColumns.filter((col) =>
      col.getIsVisible(),
    ).length;
    setSelectAll(allSelected);
  }, [table.getState().columnVisibility]);

  const handleSelectAllChange = (e: any) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    const newVisibility: Record<string, boolean> = {};
    table.getAllLeafColumns().forEach((col) => {
      if (col.id !== "conflicts") newVisibility[col.id] = checked;
    });
    Cookies.set(
      columnVisibilityKey,
      JSON.stringify({ ...newVisibility, selectAll: checked }),
      { expires: 365 },
    );
    table.setColumnVisibility(newVisibility);
  };

  const handleColumnVisibilityChange = (colId: string, value: boolean) => {
    const currentVisibility = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};
    const updatedVisibility = { ...currentVisibility, [colId]: value };
    Cookies.set(columnVisibilityKey, JSON.stringify(updatedVisibility), {
      expires: 365,
    });
    table.setColumnVisibility((prev: any) => ({ ...prev, [colId]: value }));
  };

  useEffect(() => {
    if (!userId) return;
    const saved = Cookies.get(columnVisibilityKey)
      ? JSON.parse(Cookies.get(columnVisibilityKey)!)
      : {};
    if (saved.selectAll !== undefined) setSelectAll(saved.selectAll);
    table.setColumnVisibility(saved);
  }, [userId, table]);

  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.id !== "conflicts" && col.getIsVisible());
  const columnData = visibleColumns.length ? visibleColumns : columns;
  const simpleColumns = columnData.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Users">
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
          <Grid display="flex" gap={1} alignItems="center">
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
                      <IconSearch size="16" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            mb={1}
            mr={1}
            gap={1}
          >
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<IconUserPlus width={16} />}
                onClick={() => setRejoinDialogOpen(true)}
              >
                Rejoin Company ({selectedRowIds.size})
              </Button>
            )}

            {/*{selectedRowIds.size > 0 && (*/}
            {/*    <Button*/}
            {/*        variant="outlined"*/}
            {/*        color="error"*/}
            {/*        size="small"*/}
            {/*        startIcon={<IconTrash width={16} />}*/}
            {/*        onClick={() => setDeleteDialogOpen(true)}*/}
            {/*    >*/}
            {/*        Delete Permanently ({selectedRowIds.size})*/}
            {/*    </Button>*/}
            {/*)}*/}

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
                <FormControlLabel
                  control={
                    <Checkbox
                      id="select all"
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      sx={{ textTransform: "none" }}
                    />
                  }
                  label="Select All"
                />
                {table
                  .getAllLeafColumns()
                  .filter((col) => {
                    const excluded = ["conflicts", "select"];
                    if (excluded.includes(col.id)) return false;
                    return col.id.toLowerCase().includes(search.toLowerCase());
                  })
                  .map((col) => (
                    <FormControlLabel
                      key={col.id}
                      control={
                        <Checkbox
                          checked={col.getIsVisible()}
                          onChange={(e) =>
                            handleColumnVisibilityChange(
                              col.id,
                              e.target.checked,
                            )
                          }
                        />
                      }
                      sx={{ textTransform: "none" }}
                      label={
                        typeof col.columnDef.header === "string" &&
                        col.columnDef.header.trim() !== ""
                          ? col.columnDef.header
                          : col.id
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str) => str.toUpperCase())
                              .trim()
                      }
                    />
                  ))}
              </FormGroup>
            </Popover>
          </Stack>
        </Stack>

        <Divider />

        <TableContainer
          ref={tableContainerRef}
          sx={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}
        >
          <Table stickyHeader aria-label="remove users table">
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
              {fetchUser ? (
                <SkeletonLoader columns={simpleColumns} rowCount={10} />
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
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    hover
                    sx={{ cursor: "pointer" }}
                    key={row.id}
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

        <Divider />
        <Box
          sx={{
            position: hasHorizontalScrollbar ? "sticky" : "static",
            bottom: hasHorizontalScrollbar ? 0 : "auto",
            zIndex: 1,
            padding: "10px",
          }}
        >
          <TablePaginationFooter table={table} totalRows={totalRows} />
        </Box>

        <Divider />

        {/* ── Rejoin Confirmation Dialog ── */}
        <Dialog
          open={rejoinDialogOpen}
          onClose={() => !rejoinLoading && setRejoinDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Rejoin Company</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to rejoin{" "}
              <strong>
                {selectedRowIds.size} user{selectedRowIds.size > 1 ? "s" : ""}
              </strong>{" "}
              back to the company?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setRejoinDialogOpen(false)}
              disabled={rejoinLoading}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejoinConfirm}
              disabled={rejoinLoading}
              variant="contained"
              color="primary"
            >
              {rejoinLoading ? "Processing..." : "Confirm Rejoin"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Permanent Delete Confirmation Dialog ── */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ color: "error.main" }}>
            Delete Permanently
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete{" "}
              <strong>
                {selectedRowIds.size} user{selectedRowIds.size > 1 ? "s" : ""}
              </strong>
              ?
            </DialogContentText>
            {/* ── Warning box ── */}
            <Box
              mt={2}
              p={1.5}
              sx={{
                backgroundColor: "error.lighter",
                border: "1px solid",
                borderColor: "error.light",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="error.main" fontWeight={600}>
                ⚠ This action cannot be undone.
              </Typography>
              <Typography variant="body2" color="error.main" mt={0.5}>
                Once deleted, the user data will be permanently removed and
                cannot be recovered again.
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
              color="inherit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              variant="contained"
              color="error"
            >
              {deleteLoading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default RemoveUsersList;
