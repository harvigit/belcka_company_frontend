"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  InputAdornment,
  Typography,
  Divider,
  Drawer,
  Grid,
  Popover,
  FormControlLabel,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  DialogActions,
} from "@mui/material";
import {
  IconSearch,
  IconEye,
  IconX,
  IconFilter,
  IconArrowLeft,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { useServerTable } from "@/hooks/useServerTable";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";
import Image from "next/image";
import CustomCheckbox from "../../forms/theme-elements/CustomCheckbox";

const columnHelper = createColumnHelper<any>();

const CheckinsList = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } =
    usePersistentColumnVisibility({
      storageKey: `cv_${user?.company_id}_${user?.id}_checkins`,
      enabled: !!user?.id,
    });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerImages, setDrawerImages] = useState<any[]>([]);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [openFilter, setOpenFilter] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  const [filters, setFilters] = useState({ project: "All", trade: "All" });
  const [tempFilters, setTempFilters] = useState({
    project: "All",
    trade: "All",
  });

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `user-checklog/get-resources?company_id=${user.company_id}`,
      );
      if (res.data) {
        setProjects(res.data.projects || []);
        setTrades(res.data.trades || []);
      }
    } catch (err) {
      console.error("Failed to fetch checklog resources", err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const fetchChecklogs = async () => {
    if (!user?.company_id) return;
    try {
      setLoading(true);
      let url = `user-checklog/company-checklogs?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }

      if (filters.project && filters.project !== "All") {
        url += `&project_id=${filters.project}`;
      }
      if (filters.trade && filters.trade !== "All") {
        url += `&trade_id=${filters.trade}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData = res.data.info || [];
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
    } catch (err) {
      console.error("Failed to fetch checklogs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (images: any[]) => {
    setDrawerImages(images || []);
    setDrawerOpen(true);
  };

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

      columnHelper.accessor("project_name", {
        header: "Project",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.project_name || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("start_time", {
        header: "Start",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.formatted_check_in_time || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("end_time", {
        header: "End",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.formatted_check_out_time || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.type || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("trade", {
        header: "Trade",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.trade_name || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("date_added", {
        header: "Create",
        cell: ({ row }: any) => (
          <Typography variant="body2" sx={{ px: 1.5 }}>
            {row.original.date_added || "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("total", {
        header: "Total",
        cell: ({ row }: any) => {
          const secs = row.original.total_work_seconds || 0;
          const hrs = Math.floor(secs / 3600);
          const mins = Math.floor((secs % 3600) / 60);
          return (
            <Typography variant="body2" sx={{ px: 1.5 }}>
              {hrs}h {mins}m
            </Typography>
          );
        },
      }),
      columnHelper.accessor("photo_before", {
        header: "Photo Before",
        cell: ({ row }: any) => {
          const count = row.original.before_attachments_count || 0;
          return (
            <Typography
              variant="body2"
              sx={{
                px: 1.5,
                cursor: count > 0 ? "pointer" : "default",
                color: "inherit",
                "&:hover": {
                  color: count > 0 ? "primary.main" : "inherit",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (count > 0) {
                  handleOpenDrawer(row.original.before_attachments);
                }
              }}
            >
              {count ? count : 0}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("photo_after", {
        header: "Photo After",
        cell: ({ row }: any) => {
          const count = row.original.after_attachments_count || 0;
          return (
            <Typography
              variant="body2"
              sx={{
                px: 1.5,
                cursor: count > 0 ? "pointer" : "default",
                color: "inherit",
                "&:hover": {
                  color: count > 0 ? "primary.main" : "inherit",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (count > 0) {
                  handleOpenDrawer(row.original.after_attachments);
                }
              }}
            >
              {count ? count : 0}
            </Typography>
          );
        },
      }),
    ],
    [data, selectedRowIds, hoveredRow],
  );

  useEffect(() => {
    fetchChecklogs();
  }, [user?.company_id]);

  useEffect(() => {
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

  const {
    table,
    pagination,
    setPagination,
    totalRows,
    setTotalRows,
    pageCount,
    setPageCount,
  } = useServerTable({
    data: data,
    columns,
    fetchData: fetchChecklogs,
    debounceDependencies: [searchTerm, filters, user.company_id],
    state: { columnVisibility },
    onColumnVisibilityChange,
    getRowId: (row) => String(row.id),
  });

  table.setOptions((prev: any) => ({
    ...prev,
    columns,
  }));

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Check ins">
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
          <Box display="flex" gap={1} alignItems="center">
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
            />
            <Button
              variant="contained"
              onClick={() => setOpenFilter(true)}
              sx={{ minWidth: "40px", px: 1 }}
            >
              <IconFilter width={18} />
            </Button>
          </Box>

          <Box display="flex" alignItems="center">
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
                    const excludedColumns = ["select"];
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
        {data.length > 0 && (
          <TablePaginationFooter
            table={table}
            totalRows={totalRows}
            selectedCount={
              typeof selectedRowIds !== "undefined"
                ? selectedRowIds.size
                : undefined
            }
          />
        )}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 450 },
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={2}
            py={1.5}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <IconArrowLeft size={20} />
              </IconButton>

              <Typography variant="h6" fontWeight={600}>
                Images
              </Typography>
            </Box>

            <IconButton onClick={() => setDrawerOpen(false)}>
              <IconX size={20} />
            </IconButton>
          </Box>

          <Divider />

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
            }}
          >
            <Grid container spacing={2}>
              {drawerImages.map((item, i) => (
                <Grid size={{ xs: 6 }} key={item.id ?? i}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 2,
                      overflow: "hidden",
                      cursor: "pointer",
                      bgcolor: "grey.100",
                      transition: "0.2s",
                      "&:hover": {
                        transform: "scale(1.03)",
                      },
                    }}
                  >
                    <Image
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(item.image || "/images/products/product.svg");
                        setOpenPreview(true);
                      }}
                      src={item.image || "/images/products/product.svg"}
                      alt={`Image ${i + 1}`}
                      fill
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>

            {drawerImages.length === 0 && (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height={250}
              >
                <Typography color="text.secondary">
                  No images available
                </Typography>
              </Box>
            )}
          </Box>
        </Drawer>
        <Dialog
          open={openFilter}
          onClose={() => setOpenFilter(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
            Filters
            <IconButton
              aria-label="close"
              onClick={() => setOpenFilter(false)}
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
                label="Project"
                value={tempFilters.project}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, project: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="All">All</MenuItem>
                {projects.map((p, i) => (
                  <MenuItem key={i} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Trade"
                value={tempFilters.trade}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, trade: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="All">All</MenuItem>
                {trades.map((p, i) => (
                  <MenuItem key={i} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => {
                setTempFilters({
                  project: "All",
                  trade: "All",
                });
                setFilters({
                  project: "All",
                  trade: "All",
                });
                setOpenFilter(false);
              }}
              color="inherit"
            >
              Clear
            </Button>

            <Button
              variant="contained"
              onClick={() => {
                setFilters(tempFilters);
                setOpenFilter(false);
              }}
            >
              Apply
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={openPreview}
          onClose={() => setOpenPreview(false)}
          fullScreen
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        >
          <IconButton
            onClick={() => setOpenPreview(false)}
            color="primary"
            sx={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 1301,
              backgroundColor: "#fff",
              "&:hover": {
                backgroundColor: "#eee",
                color: "#1e4db7",
              },
            }}
          >
            <IconX />
          </IconButton>

          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setOpenPreview(false)}
          >
            <img
              src={previewImage || ""}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "90% !important",
                height: "50%",
                objectFit: "contain",
              }}
            />
          </Box>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default CheckinsList;
