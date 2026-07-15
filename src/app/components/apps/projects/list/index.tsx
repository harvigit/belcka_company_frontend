"use client";
export type ProjectList = {
  id: number;
  company_id: number;
  project_id: number;
  name: string;
  currency: string | null;
  address: string;
  budget: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  progress: string;
  status_int: number;
  status_text: string;
  check_ins: number;
  image_count: number;
  edited_by?: string | null;
  edited_at?: string | null;
  editedBy?: string | null;
  project_name: string | null;
  case_id: string | null;
  ref: string | null;
};

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Grid,
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
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Popover,
  FormGroup,
  Chip,
  Divider,
} from "@mui/material";
import {
  IconMapPin,
  IconPlus,
  IconSearch,
  IconDotsVertical,
  IconNotes,
  IconTrash,
  IconX,
  IconEdit,
  IconEye,
  IconBookmark,
} from "@tabler/icons-react";
import Autocomplete from "@mui/material/Autocomplete";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import { useServerTable } from "@/hooks/useServerTable";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import CreateProject from "../create";
import EditProject from "../edit";

// Drawers
import DynamicGantt from "@/app/components/DynamicGantt";

import Setting from "@/app/components/apps/projects/setting";
import ArchiveProject from "../../addresses/list/archive-project-list";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PermissionGuard from "@/app/auth/PermissionGuard";
import AddressesList from "../../addresses/list/addresses-list";
import { IconSettings } from "@tabler/icons-react";
dayjs.extend(customParseFormat);

const columnHelper = createColumnHelper<any>();

const ProjectList = ({ projectId }: { projectId?: number | null }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const [addressListDrawerOpen, setAddressListDrawerOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

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

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const limit = 10;

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [historyProjectId, setHistoryProjectId] = useState<number | "all">(
    "all",
  );
  const [allProjects, setAllProjects] = useState<any[]>([]);

  const [productDrawer, setProductDrawer] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isFetchingFavorites, setIsFetchingFavorites] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const productLimit = 50;

  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  const initialFormData = {
    name: "",
    address: "",
    budget: "",
    description: "",
    code: 0,
    shift_ids: "",
    team_ids: "",
    company_id: user?.company_id || 0,
    workzone_ids: "",
  };

  const [formData, setFormData] = useState<any>(initialFormData);

  const fetchProjects = async () => {
    if (!user?.company_id) return;
    try {
      setLoading(true);
      let url = `project/get?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      const res = await api.get(url);
      if (res.data) {
        const responseData = res.data.info || [];
        setData(responseData);

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
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project: any) => {
    setSelectedProject(project);
    setEditDrawerOpen(true);
  };

  const handleCreate = () => {
    setFormData({ ...initialFormData, company_id: user?.company_id || 0 });
    setDrawerOpen(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post("project/create", formData);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Project created successfully");
        setDrawerOpen(false);
        fetchProjects();
      } else {
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put("project/update", formData);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Project updated successfully");
        setEditDrawerOpen(false);
        fetchProjects();
      } else {
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchHistories = async (
    currentPage: number,
    projectId: number | "all",
  ) => {
    try {
      setHistoryLoading(true);
      let url = `project/get-history?page=${currentPage}&limit=${limit}&company_id=${user?.company_id}`;
      if (projectId !== "all") {
        url += `&project_id=${projectId}`;
      }
      const res = await api.get(url);
      if (res.data?.info) {
        const newData = res.data.info || [];
        setHistory((prev) =>
          currentPage === 1 ? newData : [...prev, ...newData],
        );
        setTotalItems(res.data.data?.totalItems || 0);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (openDrawer) {
      fetchHistories(page, historyProjectId);
    }
  }, [openDrawer, historyProjectId, page]);

  useEffect(() => {
    if (openDrawer && allProjects.length === 0) {
      api.get(`project/get?company_id=${user?.company_id}`).then((res) => {
        setAllProjects(res.data?.info || []);
      });
    }
  }, [openDrawer]);

  const handleSeeMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistories(nextPage, historyProjectId);
  };

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user?.company_id}&is_web=true`,
      );
      if (res.data) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

  const fetchFavoriteProducts = async () => {
    if (!activeProjectId) return;
    setIsFetchingFavorites(true);
    try {
      const response = await api.get(
        `project/get-favorite?company_id=${user?.company_id}&project_id=${activeProjectId}`,
      );
      if (response.data?.IsSuccess) {
        const savedIds =
          response.data?.info[0]?.products?.map(
            (item: any) => item.product_id,
          ) || [];
        setSelectedProducts(savedIds);
      }
    } catch (error) {
      console.error("Failed to fetch favorite products:", error);
    } finally {
      setIsFetchingFavorites(false);
    }
  };

  const handleSaveProducts = async () => {
    try {
      setIsSaving(true);
      const productIdsString = selectedProducts.join(",");
      const response = await api.post("project/favorite-products", {
        id: activeProjectId,
        product_ids: productIdsString,
      });
      if (response.data.IsSuccess) {
        toast.success(response.data.message || "Favorites saved.");
        setProductDrawer(false);
      } else {
        toast.error(response.data.message || "Failed to save favorites.");
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseProductDrawer = () => {
    setSearchProduct("");
    setSelectAll(false);
    setProductPage(1);
    setProductDrawer(false);
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchResources();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (productDrawer && activeProjectId) {
      fetchFavoriteProducts();
    }
  }, [productDrawer, activeProjectId]);

  const handleProductToggle = (id: any) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredData = useMemo(() => {
    let result = products.filter((item) => {
      const search = searchProduct.toLowerCase();
      let matchesSearch = true;
      if (search) {
        matchesSearch =
          item.short_name?.toLowerCase().includes(search) ||
          item.supplier_code?.toLowerCase().includes(search) ||
          item.supplier_name?.toLowerCase().includes(search) ||
          item.uuid?.toLowerCase().includes(search) ||
          item.name?.toLowerCase().includes(search);
      }
      return matchesSearch;
    });

    result.sort((a, b) => {
      const aSelected = selectedProducts.includes(a.id);
      const bSelected = selectedProducts.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    return result;
  }, [products, searchProduct, selectedProducts]);

  const paginatedProduct =
    filteredData?.slice(0, productPage * productLimit) || [];

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: any) => (
          <Stack direction="row" alignItems="center">
            <CustomCheckbox
              className="header-checkbox"
              checked={selectedRowIds.size === data.length && data.length > 0}
              indeterminate={
                selectedRowIds.size > 0 && selectedRowIds.size < data.length
              }
              onClick={(e: any) => e.stopPropagation()}
              onChange={(e: any) => {
                e.stopPropagation();
                e.preventDefault();
                const isChecked = e.target.checked;
                if (isChecked) {
                  setSelectedRowIds(new Set(data.map((row) => row.id)));
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

      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Box display="flex" alignItems="center">
              <Typography variant="body2">{item.name}</Typography>
            </Box>
          );
        },
      }),

      columnHelper.accessor((row) => row?.teams, {
        id: "teams",
        header: () => "Teams",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Typography textTransform="capitalize" className="f-14">
              {item.teams?.length
                ? item.teams.map((shift: any) => shift.name).join(", ")
                : "-"}
            </Typography>
          );
        },
      }),

      columnHelper.accessor((row) => row?.shifts, {
        id: "shifts",
        header: () => "Shifts",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Typography textTransform="capitalize" className="f-14">
              {item.shifts?.length
                ? item.shifts.map((shift: any) => shift.name).join(", ")
                : "-"}
            </Typography>
          );
        },
      }),

      columnHelper.accessor("budget", {
        header: "Budget",
        cell: (info) => info.getValue() || "-",
      }),

      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Edit">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item);
                  }}
                  color="primary"
                >
                  <IconEdit size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Favorite Products">
                <IconButton
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveProjectId(item.id);
                    setProductDrawer(true);
                  }}
                >
                  <IconBookmark size={18} />
                </IconButton>
              </Tooltip>

            </Stack>
          );
        },
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
    fetchData: fetchProjects,
    debounceDependencies: [searchTerm, user?.company_id],
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm]);

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Projects">
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              }}
            />
            {/* <Tooltip title="Chart">
            <IconButton color="primary" onClick={() => setDetailsOpen(true)}>
              <IconChartPie size={24} />
            </IconButton>
          </Tooltip> */}
          </Box>

          <Box display="flex" alignItems="center">
            <Button
              color="primary"
              variant="outlined"
              onClick={() => setOpenDrawer(true)}
            >
              Activity
            </Button>
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                onClick={() => setOpenDialog(true)}
                sx={{ ml: 2 }}
              >
                Archive
              </Button>
            )}

            <Tooltip title="Settings">
              <IconButton
                color="primary"
                sx={{ ml: 1 }}
                onClick={() => setSettingOpen(true)}
              >
                <IconSettings />
              </IconButton>
            </Tooltip>
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

            <IconButton onClick={handleClick} size="small">
              <IconDotsVertical width={20} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleClose}>
              <MenuItem onClick={handleCreate}>
                <ListItemIcon>
                  <IconPlus width={18} />
                </ListItemIcon>
                Add Project
              </MenuItem>

              <MenuItem
                onClick={() => {
                  handleClose();
                  setArchiveListOpen(true);
                }}
              >
                <ListItemIcon>
                  <IconNotes width={18} />
                </ListItemIcon>
                Archived project list
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProjectId(row.original.id);
                            setAddressListDrawerOpen(true);
                          }}
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
        <TablePaginationFooter table={table} totalRows={totalRows} />
        {/* Dialogs and Drawers */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to archive {selectedRowIds.size} project(s)?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  let allSuccess = true;
                  for (const id of Array.from(selectedRowIds)) {
                    const res = await api.post("project/archive", { id });
                    if (
                      !res.data.IsSuccess &&
                      !res.data.isSuccess &&
                      !res.data.success &&
                      !(res.status >= 200 && res.status < 300)
                    ) {
                      allSuccess = false;
                    }
                  }
                  if (allSuccess) {
                    toast.success("Projects archived successfully.");
                  } else {
                    toast.error("Some projects failed to archive.");
                  }
                  fetchProjects();
                  setSelectedRowIds(new Set());
                } catch (error) {
                  console.error(error);
                  toast.error("Error archiving projects.");
                }
                setOpenDialog(false);
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

        <ArchiveProject
          open={archiveListOpen}
          companyId={Number(user?.company_id)}
          onClose={() => setArchiveListOpen(false)}
          onWorkUpdated={fetchProjects}
        />

        <Setting
          settingOpen={settingOpen}
          onClose={() => setSettingOpen(false)}
        />

        <Drawer
          anchor="bottom"
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
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
          <DynamicGantt
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            projectId={activeProjectId}
            companyId={user?.company_id ?? null}
          />
        </Drawer>

        <Drawer
          anchor="right"
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          PaperProps={{
            sx: {
              width: 500,
              maxWidth: "100%",
              "& .MuiDrawer-paper": {
                width: 500,
                padding: 2,
                backgroundColor: "#f9f9f9",
              },
            },
          }}
        >
          <Box sx={{ position: "relative", p: 2 }}>
            <IconButton
              aria-label="close"
              onClick={() => {
                setOpenDrawer(false);
                setHistoryProjectId("all");
              }}
              size="small"
              sx={{
                position: "absolute",
                right: 0,
                top: 8,
                color: (theme) => theme.palette.grey[900],
                backgroundColor: "transparent",
                zIndex: 10,
                width: 50,
                height: 50,
              }}
            >
              <IconX size={18} />
            </IconButton>

            <Grid container spacing={2} display="block">
              <Box
                display="flex"
                alignContent="center"
                alignItems="center"
                flexWrap="wrap"
              >
                <IconButton
                  onClick={() => {
                    setOpenDrawer(false);
                    setHistoryProjectId("all");
                  }}
                >
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>
                  Project Activities
                </Typography>
              </Box>

              <Box px={2} mt={2}>
                <Autocomplete
                  size="small"
                  options={allProjects}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    historyProjectId === "all"
                      ? null
                      : allProjects.find((p) => p.id === historyProjectId) ||
                        null
                  }
                  onChange={(e, newValue) => {
                    setHistoryProjectId(newValue ? newValue.id : "all");
                    setPage(1);
                    setHistory([]);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Filter by Project"
                      variant="outlined"
                    />
                  )}
                />
              </Box>

              {historyLoading ? (
                <Box display="flex" justifyContent="center" mt={4}>
                  <CircularProgress />
                </Box>
              ) : history.length > 0 ? (
                <Box mt={1}>
                  <Box sx={{ maxHeight: "auto", overflow: "visible", pr: 0 }}>
                    {history.map((addr, index) => {
                      return (
                        <Box
                          key={addr.id ?? index}
                          mb={2}
                          pl={2}
                          pr={2}
                          mt={2}
                          position="relative"
                          display="flex"
                          alignItems="center"
                          sx={{
                            width: "100%",
                            lineHeight: "10px",
                            height: "100px",
                            borderRadius: "25px",
                            boxShadow: "rgb(33 33 33 / 12%) 0px 4px 4px 0px",
                            border: "1px solid rgb(240 240 240)",
                          }}
                        >
                          <Box
                            position="absolute"
                            top="-10px"
                            left="15px"
                            bgcolor={
                              addr.request_type === 102 && addr.status_int == 3
                                ? "#7d54f0ff"
                                : addr.request_type === 102 &&
                                    addr.status_int == 4
                                  ? "#f53c3cff"
                                  : "#FF7F00"
                            }
                            px={1.5}
                            borderRadius="10px"
                            zIndex={1}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              fontSize="12px !important"
                              color="#fff"
                            >
                              {addr.request_type === 102 && addr.status_int == 3
                                ? "Start shift"
                                : addr.request_type === 102 &&
                                    addr.status_int == 4
                                  ? "Stop shift"
                                  : addr.type_name}
                            </Typography>
                          </Box>
                          <Box display="initial" width="100%" textAlign="start">
                            <Typography
                              fontSize="14px"
                              className="multi-ellipsis"
                            >
                              <b>{addr.user_name}:</b> {addr.message}
                            </Typography>
                            <p
                              style={{
                                fontSize: "12px",
                                textAlign: "end",
                                color: "GrayText",
                                margin: 0,
                              }}
                            >
                              {formatDate(addr.date_added)}
                            </p>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                  {history.length < totalItems && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <Button
                        variant="outlined"
                        disabled={historyLoading}
                        onClick={handleSeeMore}
                        startIcon={
                          historyLoading && <CircularProgress size={16} />
                        }
                      >
                        See More
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography mt={2} ml={2} variant="h5">
                  No activities are found for this project!!
                </Typography>
              )}
            </Grid>
          </Box>
        </Drawer>

        <Drawer
          anchor="right"
          open={productDrawer}
          onClose={handleCloseProductDrawer}
          PaperProps={{
            sx: {
              width: 550,
              maxWidth: "100%",
              "& .MuiDrawer-paper": {
                width: 550,
                padding: 2,
                backgroundColor: "#f9f9f9",
                display: "flex",
                flexDirection: "column",
              },
            },
          }}
        >
          <Box
            display="flex"
            alignContent="center"
            alignItems="center"
            flexWrap="wrap"
            p={2}
            pb={0}
          >
            <Box display="flex" alignContent="center" alignItems="center">
              <IconButton onClick={handleCloseProductDrawer}>
                <IconArrowLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700}>
                Favorite products{" "}
                {selectedProducts.length > 0
                  ? `(${selectedProducts.length})`
                  : ""}
              </Typography>
            </Box>
            <IconButton
              aria-label="close"
              onClick={handleCloseProductDrawer}
              size="small"
              sx={{
                position: "absolute",
                right: 0,
                top: 8,
                color: (theme) => theme.palette.grey[900],
                backgroundColor: "transparent",
                zIndex: 10,
                width: 50,
                height: 50,
              }}
            >
              <IconX size={18} />
            </IconButton>
          </Box>

          <Grid display="flex" alignItems="center" mr={1}>
            <TextField
              id="search"
              type="text"
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchProduct}
              fullWidth
              sx={{ width: "90%", ml: 2 }}
              onChange={(e) => setSearchProduct(e.target.value)}
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
            {products.length > 0 && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={
                      filteredData.length > 0 &&
                      filteredData.every((p) => selectedProducts.includes(p.id))
                    }
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setSelectAll(isChecked);
                      if (isChecked) {
                        const newSelected = [...selectedProducts];
                        filteredData.forEach((p) => {
                          if (!newSelected.includes(p.id))
                            newSelected.push(p.id);
                        });
                        setSelectedProducts(newSelected);
                      } else {
                        const visibleIds = filteredData.map((p) => p.id);
                        setSelectedProducts(
                          selectedProducts.filter(
                            (id) => !visibleIds.includes(id),
                          ),
                        );
                      }
                    }}
                  />
                }
                label="Select All"
                sx={{ width: "30%", m: 0 }}
              />
            )}
          </Grid>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Grid container spacing={2} display="block" mt={1}>
              {isFetchingFavorites ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  my={5}
                >
                  <CircularProgress />
                </Box>
              ) : filteredData.length > 0 ? (
                <Box>
                  {paginatedProduct.map((product) => (
                    <Box
                      key={product.id}
                      mt={1}
                      p={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        border: "1px solid #e7e3e3ff",
                        borderRadius: "10px",
                        background: "#fff",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <CustomCheckbox
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleProductToggle(product.id)}
                        />
                        <Box
                          sx={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 2,
                            p: 1,
                            textAlign: "center",
                          }}
                        >
                          <Image
                            src={
                              product.image_url ||
                              "/images/products/product.svg"
                            }
                            alt="product"
                            width={50}
                            height={50}
                            style={{ objectFit: "contain" }}
                          />
                        </Box>
                        <Stack mt={2} spacing={1}>
                          <Typography
                            variant="body2"
                            sx={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.25,
                              maxWidth: 350,
                              wordBreak: "break-word",
                            }}
                          >
                            {product.short_name ?? product.name}{" "}
                            {product.uuid && (
                              <Chip
                                label={product.uuid}
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                            <br />
                            Supplier Code: {product.supplier_code}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  ))}
                  {paginatedProduct.length < filteredData.length && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <Button
                        variant="outlined"
                        onClick={() => setProductPage((prev) => prev + 1)}
                      >
                        See More
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography mt={2} textAlign="center">
                  No products found
                </Typography>
              )}
            </Grid>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              gap: 2,
              m: 2,
              pl: 2,
            }}
          >
            <Button
              color="primary"
              onClick={handleSaveProducts}
              variant="contained"
              size="large"
              sx={{ borderRadius: 3 }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              color="inherit"
              onClick={handleCloseProductDrawer}
              variant="contained"
              size="large"
              sx={{
                backgroundColor: "transparent",
                borderRadius: 3,
                color: "GrayText",
              }}
            >
              Cancel
            </Button>
          </Box>
        </Drawer>

        {drawerOpen && (
          <CreateProject
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleProjectSubmit}
            isSaving={isSaving}
          />
        )}

        {editDrawerOpen && (
          <EditProject
            open={editDrawerOpen}
            onClose={() => setEditDrawerOpen(false)}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleEditSubmit}
            isSaving={isSaving}
            project={selectedProject}
          />
        )}

        {/* Add Address Drawer */}
        <Drawer
          anchor="bottom"
          open={addressListDrawerOpen}
          onClose={() => setAddressListDrawerOpen(false)}
          PaperProps={{
            sx: {
              height: "90vh",
              backgroundColor: "#fff",
              borderRadius: "20px 20px 0 0",
            },
          }}
        >
          <Box p={3} sx={{ height: "100%", overflowY: "auto" }}>
            {activeProjectId && (
              <AddressesList
                projectId={activeProjectId}
                onSelectionChange={() => {}}
                processedIds={[]}
                shouldRefresh={false}
                onTableReady={() => {}}
                projects={data}
                onClose={() => {
                  setAddressListDrawerOpen(false);
                  fetchProjects();
                }}
              />
            )}
          </Box>
        </Drawer>
      </Box>
    </PermissionGuard>
  );
};

export default ProjectList;
