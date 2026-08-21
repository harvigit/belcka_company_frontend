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
  Button,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Menu,
  ListItemIcon,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popover,
  FormGroup,
  FormControlLabel,
  Tabs,
  Tab,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import {
  IconSearch,
  IconDotsVertical,
  IconPlus,
  IconEdit,
  IconTrash,
  IconFilter,
  IconEye,
  IconSettings,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Image from "next/image";
import toast from "react-hot-toast";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { useServerTable } from "@/hooks/useServerTable";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import Link from "next/link";
import CollectAddEdit from "./create-edit";
import CollectViewDetails from "./view-details";
import PermissionGuard from "@/app/auth/PermissionGuard";

const CollectList = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState(""); // for column visibility

  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_collect`,
      enabled: !!user?.id,
    });

  const [open, setOpen] = useState(false); // filters dialog

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [collectsToDelete, setCollectsToDelete] = useState<number[]>([]);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedCollectId, setSelectedCollectId] = useState<number | null>(
    null,
  );

  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  const [activeTab, setActiveTab] = useState("All");
  const [tabCounts, setTabCounts] = useState({ All: 0, New: 0, Reviewed: 0 });

  // Filters
  const [filters, setFilters] = useState({
    projectId: "",
    supplierId: "",
    addressId: "",
    createdById: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);

  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.company_id) {
      fetchFilters();
    }
  }, [user?.company_id]);

  const fetchFilters = async () => {
    try {
      const res = await api.get(
        `po-invoices/get-resources?company_id=${user?.company_id}`,
      );
      if (res.data && res.data.info) {
        setProjects(res.data.info.projects || []);
        setSuppliers(res.data.info.suppliers || []);
        setAddresses(res.data.info.parentAddresses || []);
        setUsers(res.data.info.users || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCollects = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      let url = `po-collect/list?company_id=${user?.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) url += `&search=${searchTerm}`;
      if (filters.projectId) url += `&project_id=${filters.projectId}`;
      if (filters.supplierId) url += `&supplier_id=${filters.supplierId}`;
      if (filters.addressId) url += `&address_id=${filters.addressId}`;
      if (filters.createdById) url += `&created_by=${filters.createdById}`;
      if (activeTab !== "All") url += `&status=${activeTab}`;

      const res = await api.get(url);
      if (res.data) {
        const responseData = res.data.info || [];
        setData(responseData);

        if (res.data.status_counts) {
          setTabCounts({
            All: res.data.status_counts.All || res.data.status_counts.all || 0,
            New: res.data.status_counts.New || res.data.status_counts.new || 0,
            Reviewed:
              res.data.status_counts.Reviewed ||
              res.data.status_counts.reviewed ||
              0,
          });
        }

        const pagMeta = res.data.data;
        if (pagMeta) {
          setTotalRows(pagMeta.totalItems || responseData.length);
          setPageCount(pagMeta.totalPages || 1);
        } else {
          setTotalRows(responseData.length);
          setPageCount(1);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: any) => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={
                selectedRowIds.size > 0 && selectedRowIds.size >= data.length
              }
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
          const isHovered = hoveredRow === item.id;
          const showCheckbox = isChecked || isHovered;

          return (
            <Stack direction="row" alignItems="center" sx={{ pl: 1 }}>
              <CustomCheckbox
                checked={isChecked}
                onClick={(e: any) => e.stopPropagation()}
                onChange={(e: any) => {
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
      columnHelper.accessor("created_at", {
        id: "Date &Time",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Date & Time
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack direction="row" alignItems="center" px={1.5}>
              <Typography className="f-14">{item.created_at ?? "-"}</Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("project_name", {
        id: "Project",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Project
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack direction="row" alignItems="center" px={1.5}>
              <Typography className="f-14">
                {item.project_name ?? "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("supplier_name", {
        id: "Supplier",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Supplier
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack direction="row" alignItems="center" px={1.5}>
              <Typography className="f-14">
                {item.supplier_name ?? "-"}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("address_name", {
        id: "Address",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Address
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack direction="row" alignItems="center" px={1.5}>
              <Tooltip title={item.address_name ?? ""}>
                <Typography
                  className="f-14"
                  sx={{
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                    minWidth: "120px",
                    width: "150px",
                    maxWidth: "150px",
                  }}
                >
                  {item.address_name ?? "-"}
                </Typography>
              </Tooltip>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("order_by_name", {
        id: "createdBy",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <Typography variant="subtitle2" fontWeight="inherit">
              Created By
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;

          return (
            <Stack direction="row" alignItems="center" px={1.5}>
              <Typography className="f-14">
                {item.order_by_name ?? "-"}
              </Typography>
            </Stack>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
          <Typography
            variant="body2"
            sx={{
              bgcolor:
                row.original.status === "New"
                  ? "warning.light"
                  : "success.light",
              color:
                row.original.status === "New" ? "warning.main" : "success.main",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: "inline-block",
            }}
          >
            {row.original.status}
          </Typography>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="View">
              <IconButton
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedViewId(row.original.id);
                  setViewDrawerOpen(true);
                }}
              >
                <IconEye size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEdit(true);
                  setSelectedCollectId(row.original.id);
                  setEditDrawerOpen(true);
                }}
              >
                <IconEdit size={18} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      }),
    ],
    [data, selectedRowIds, hoveredRow],
  );

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data: data,
    columns,
    fetchData: fetchCollects,
    debounceDependencies: [searchTerm, filters, activeTab, user.company_id],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, filters, activeTab]);

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Collect">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
        mt={2}
      >
        <Stack
          mr={2}
          ml={2}
          mb={2}
          justifyContent="space-between"
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2, md: 4 }}
        >
          <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
            <Box sx={{ mr: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => {
                  setActiveTab(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 42,
                  "& .MuiTabs-indicator": {
                    height: 2,
                    bgcolor: "primary.main",
                  },
                  "& .MuiTab-root": {
                    minHeight: 42,
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: 14,
                    color: "text.secondary",
                    px: 1.5,
                    mr: 0.5,

                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 600,
                    },
                  },
                }}
              >
                {["All", "New", "Reviewed"].map((status) => {
                  const count = tabCounts[status as keyof typeof tabCounts];

                  return (
                    <Tab
                      key={status}
                      value={status}
                      disableRipple
                      label={`${status}${count > 0 ? ` (${count})` : ""}`}
                    />
                  );
                })}
              </Tabs>
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
            <Button
              variant="contained"
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 }, minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
          </Box>

          <Box display="flex" alignItems="center">
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                sx={{ marginRight: "5px" }}
                onClick={() => {
                  const selectedIds = Array.from(selectedRowIds);
                  setCollectsToDelete(selectedIds);
                  setConfirmOpen(true);
                }}
              >
                Remove
              </Button>
            )}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  {(() => {
                    const columnOptions = table
                      .getAllLeafColumns()
                      .filter((col: any) => {
                        const excludedColumns = ["select", "actions"];
                        if (excludedColumns.includes(col.id)) return false;

                        return col.id
                          .toLowerCase()
                          .includes(search.toLowerCase());
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
                                e.stopPropagation();
                                columnOptions.forEach((col: any) =>
                                  col.toggleVisibility(e.target.checked),
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                p: 0.5,
                                mr: 1,
                              }}
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
                          }}
                          label="Select All"
                        />
                        {columnOptions.map((col: any) => (
                          <FormControlLabel
                            key={col.id}
                            control={
                              <CustomCheckbox
                                size="small"
                                checked={col.getIsVisible()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  col.getToggleVisibilityHandler()(e);
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
                            }}
                            label={
                              col.columnDef.meta?.label ||
                              (typeof col.columnDef.header === "string" &&
                              col.columnDef.header.trim() !== ""
                                ? col.columnDef.header
                                : col.id
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str: string) =>
                                      str.toUpperCase(),
                                    )
                                    .trim())
                            }
                          />
                        ))}
                      </>
                    );
                  })()}
                </FormGroup>
              </Box>
            </Popover>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to delete {collectsToDelete.length} PO
                  collect{collectsToDelete.length > 1 ? "s" : ""} from the list?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => setConfirmOpen(false)}
                  variant="outlined"
                  color="primary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const payload = {
                        ids: collectsToDelete.join(","),
                      };
                      const response = await api.post(
                        "po-collect/delete",
                        payload,
                      );
                      toast.success(response.data.message);
                      setSelectedRowIds(new Set());
                      await fetchCollects();
                    } catch (error) {
                    } finally {
                      setConfirmOpen(false);
                    }
                  }}
                  variant="outlined"
                  color="error"
                >
                  Remove
                </Button>
              </DialogActions>
            </Dialog>

            <IconButton onClick={handleClick} size="small" sx={{ ml: 1 }}>
              <IconDotsVertical width={20} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleClose}>
              <MenuItem
                onClick={() => {
                  handleClose();
                  setIsEdit(false);
                  setSelectedCollectId(null);
                  setEditDrawerOpen(true);
                }}
              >
                <ListItemIcon>
                  <IconPlus width={18} />
                </ListItemIcon>
                Add Collect
              </MenuItem>
            </Menu>
          </Box>
        </Stack>
        <Divider />

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <TableContainer ref={tableContainerRef}>
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
                          align="left"
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
                            onClick={
                              isSortable
                                ? header.column.getToggleSortingHandler()
                                : undefined
                            }
                            sx={{
                              cursor: isSortable ? "pointer" : "default",
                              display: "flex",
                              alignItems: "center",
                              "&:hover": {
                                color: isSortable ? "#888" : "inherit",
                              },
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
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredRow(row.original.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => {
                        const newSelected = new Set(selectedRowIds);
                        if (newSelected.has(row.original.id)) {
                          newSelected.delete(row.original.id);
                        } else {
                          newSelected.add(row.original.id);
                        }
                        setSelectedRowIds(newSelected);
                      }}
                    >
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
        </Box>
        <Divider />
        <TablePaginationFooter
          selectedCount={
            typeof selectedRowIds !== "undefined"
              ? selectedRowIds.size
              : undefined
          }
          table={table}
          totalRows={totalRows}
        />

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Filters</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                size="small"
                value={tempFilters.projectId}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, projectId: e.target.value })
                }
                label="Project"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={tempFilters.supplierId}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, supplierId: e.target.value })
                }
                label="Supplier"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={tempFilters.addressId}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, addressId: e.target.value })
                }
                label="Address"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {addresses.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={tempFilters.createdById}
                onChange={(e) =>
                  setTempFilters({
                    ...tempFilters,
                    createdById: e.target.value,
                  })
                }
                label="Created By"
                fullWidth
              >
                <MenuItem value="">All</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setTempFilters({
                  projectId: "",
                  supplierId: "",
                  addressId: "",
                  createdById: "",
                });
                setFilters({
                  projectId: "",
                  supplierId: "",
                  addressId: "",
                  createdById: "",
                });
                setOpen(false);
              }}
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
              Apply Filters
            </Button>
          </DialogActions>
        </Dialog>

        <CollectAddEdit
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          companyId={user?.company_id || null}
          isEdit={isEdit}
          collectId={selectedCollectId}
          onSuccess={() => {
            fetchCollects();
          }}
        />

        <CollectViewDetails
          open={viewDrawerOpen}
          onClose={() => setViewDrawerOpen(false)}
          companyId={user?.company_id || null}
          collectId={selectedViewId}
          onSuccess={() => {
            fetchCollects();
          }}
        />
      </Box>
    </PermissionGuard>
  );
};

export default CollectList;
