"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import {
  IconFilter,
  IconSearch,
  IconTrash,
  IconEye,
  IconEdit,
  IconFileImport,
  IconDotsVertical,
  IconNotes,
  IconPlus,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Cookies from "js-cookie";
import "../../../../global.css";
import Link from "next/link";
import ArchiveParentAddress from "./archive-parent-address-list";
import AllocateAddressesDrawer from "./allocate-addresses-drawer";
import { IconFileExport } from "@tabler/icons-react";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import { useServerTable } from "@/hooks/useServerTable";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconExclamationCircle } from "@tabler/icons-react";
import ColumnVisibilityPopover from "@/app/components/common/ColumnVisibilityPopover";
import ExcelImportModal from "@/app/components/common/ExcelImportModal";
import ListConfirmDialog from "@/app/components/common/ListConfirmDialog";
import AddressFiltersDialog from "./filters-dialog";
import ChildAddressesDrawer from "./child-addresses-drawer";
import ParentAddressFormDrawer from "./parent-address-form-drawer";
import AddressConflictDialog from "./conflict-dialog";
import PermissionGuard from "@/app/auth/PermissionGuard";

const columnHelper = createColumnHelper<any>();

type AddressListFilters = {
  status: string;
  has_cases: string;
};

const DEFAULT_ADDRESS_FILTERS: AddressListFilters = {
  status: "",
  has_cases: "",
};

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
};

interface ProjectListingProps {
  projectId: number | null;
  embedded?: boolean;
}

const TablePagination: React.FC<ProjectListingProps> = ({
  embedded = false,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConflicts, setShowConflicts] = useState(false);
  const [filters, setFilters] = useState<AddressListFilters>(
    DEFAULT_ADDRESS_FILTERS,
  );
  const [tempFilters, setTempFilters] = useState<AddressListFilters>(
    DEFAULT_ADDRESS_FILTERS,
  );
  const [sorting, setSorting] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [project, setProject] = useState<ProjectList[]>([]);
  const [allProjects, SetAllProjects] = useState<any[]>([]);
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    id?: string | number | null;
  } & {
    user_role_id: number;
  };
  const [projectId, setProjectId] = useState<number | null>(null);
  const openMenu = Boolean(anchorEl);
  const status = ["Completed", "To Do", "In Progress"];
  const COOKIE_PREFIX = "project_";
  const projectID = Cookies.get(COOKIE_PREFIX + user.id + user.company_id);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const [openModel, setOpenModel] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);
  const [addressListDrawerOpen, setAddressListDrawerOpen] = useState(false);
  const [selectedParentAddressId, setSelectedParentAddressId] = useState<
    number | null
  >(null);
  const [archiveListOpen, setArchiveListOpen] = useState(false);
  const [allocateDrawerOpen, setAllocateDrawerOpen] = useState(false);
  const [parentAddressDrawerOpen, setParentAddressDrawerOpen] = useState(false);
  const [editingParentAddress, setEditingParentAddress] = useState<any>(null);
  const [conflictItem, setConflictItem] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);

  const handleOpenParentAddressDrawer = (address?: any) => {
    setEditingParentAddress(address?.id ? address : null);
    setParentAddressDrawerOpen(true);
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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        setProject(res.data.info);
        const cookieProjectId = Cookies.get(
          COOKIE_PREFIX + user.id + user.company_id,
        );
        const validProjectId = res.data.info.some(
          (p: any) => p.id === Number(cookieProjectId),
        )
          ? Number(cookieProjectId)
          : res.data.info[0]?.id;
        setProjectId(validProjectId);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
    setLoading(false);
  };

  const getData = async () => {
    try {
      const res = await api.get(
        `get-modules?company_id=${user.company_id}&is_web=true`,
      );
      if (res.data) {
        SetAllProjects(res.data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
      getData();
    }
  }, [projectID]);

  useEffect(() => {
    if (projectId && user?.id) {
      Cookies.set(
        COOKIE_PREFIX + user.id + user.company_id,
        projectId.toString(),
        { expires: 30 },
      );
    }
  }, [projectId, user?.id, user.company_id]);

  const fetchAddresses = async () => {
    if (!user?.company_id) {
      return;
    }

    setLoading(true);
    try {
      let url = `address/get-parent?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (sorting && sorting.length > 0) {
        url += `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? "desc" : "asc"}`;
      }

      if (showConflicts) {
        url += `&is_conflict=true`;
      }

      if (filters.has_cases === "with_cases") {
        url += `&has_cases=true`;
      } else if (filters.has_cases === "without_cases") {
        url += `&has_cases=false`;
      }

      if (filters.status) {
        url += `&status_text=${encodeURIComponent(filters.status)}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData =
          res.data.info?.data || res.data.info || res.data.data || [];
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
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }
      }
    } catch (err) {
      console.error("Failed to fetch addresses", err);
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedRowIds(new Set());
    setAllocateDrawerOpen(false);
  };

  const exportProducts = async () => {
    try {
      const selectedIds = Array.from(selectedRowIds);
      const ids = selectedIds.join(",");
      const payload = {
        company_id: user.company_id,
        ids: ids,
      };
      const res = await api.post(`address/export`, payload, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `address_export.xlsx`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      fetchAddresses();
      setSelectedRowIds(new Set());
    } catch (err) {
      console.error("Failed to export addresses", err);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }: any) => {
          const selectableData = currentFilteredData.filter(
            (item: any) => !item.is_conflict,
          );
          const isAllSelected =
            selectableData.length > 0 &&
            selectableData.every((item: any) => selectedRowIds.has(item.id));
          const isSomeSelected =
            selectableData.some((item: any) => selectedRowIds.has(item.id)) &&
            !isAllSelected;

          return (
            <Stack direction="row" alignItems="center">
              <CustomCheckbox
                className="header-checkbox"
                checked={isAllSelected}
                indeterminate={isSomeSelected}
                onClick={(e: any) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  const checked = e.target.checked;
                  const newSelected = new Set(selectedRowIds);
                  if (checked) {
                    selectableData.forEach((item: any) =>
                      newSelected.add(item.id),
                    );
                  } else {
                    selectableData.forEach((item: any) =>
                      newSelected.delete(item.id),
                    );
                  }
                  setSelectedRowIds(newSelected);
                }}
              />
            </Stack>
          );
        },
        cell: ({ row }: any) => {
          const item = row.original;
          const isChecked = selectedRowIds.has(item.id);
          const isHovered = hoveredRow === item.id;
          const showCheckbox = isChecked || isHovered;

          return (
            <Stack direction="row" alignItems="center" sx={{ pl: 1 }}>
              {!item.is_conflict && (
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
              )}
            </Stack>
          );
        },
      },

      columnHelper.accessor("conflicts", {
        id: "conflicts",
        header: () => (
          <span style={{ display: "block", textAlign: "center" }} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          if (!item.is_conflict) return;

          return (
            <Stack direction="row" alignItems="center" justifyContent="center">
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  setConflictItem(item);
                }}
                sx={{
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "error.light",
                    color: "error.dark",
                    opacity: 0.9,
                  },
                }}
              >
                <IconExclamationCircle size={20} />
              </IconButton>
            </Stack>
          );
        },
        size: 2,
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center" },
      }),

      columnHelper.accessor("short_name", {
        header: "Name",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Box display="flex" alignItems="center">
              <Tooltip title={item.short_name}>
                <Typography
                  variant="body2"
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      color: "primary.main",
                    },
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                    minWidth: "100px",
                    width: "100%",
                    maxWidth: "200px",
                    borderRadius: 1,
                    border: "1px solid transparent",
                    transition: "all 0.2s ease",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParentAddressId(item.id);
                    setAddressListDrawerOpen(true);
                  }}
                >
                  {item.short_name ?? "-"}
                </Typography>
              </Tooltip>
            </Box>
          );
        },
      }),

      columnHelper.accessor("name", {
        header: "Postcode Name",
        cell: ({ row }: any) => {
          const item = row.original;

          return (
            <Box display="flex" alignItems="center">
              <Tooltip title={item.name}>
                {item.is_conflict ? (
                  <Typography
                    variant="body2"
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                      minWidth: "100px",
                      width: "100%",
                      maxWidth: "200px",
                      borderRadius: 1,
                      border: "1px solid transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {item.name}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        color: "primary.main",
                      },
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      wordBreak: "break-word",
                      minWidth: "100px",
                      width: "100%",
                      maxWidth: "200px",
                      borderRadius: 1,
                      border: "1px solid transparent",
                      transition: "all 0.2s ease",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParentAddressId(item.id);
                      setAddressListDrawerOpen(true);
                    }}
                  >
                    {item.name}
                  </Typography>
                )}
              </Tooltip>
            </Box>
          );
        },
      }),

      columnHelper.accessor("cases", {
        header: "Cases",
        cell: (info) => <Typography px={1.5}>{info.getValue()}</Typography>,
      }),

      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const item = info.row.original;
          return (
            <>
              <Typography px={1.5} textTransform={"capitalize"}>
                {item.type ?? "-"}
              </Typography>
              {/* <TextField
                select
                size="small"
                value={item.type || "address"}
                onChange={async (e) => {
                  const newType = e.target.value;
                  const payload = {
                    id: item.id,
                    name: item.name,
                    pin_code: item.pin_code,
                    type: newType,
                  };
                  try {
                    const res = await api.put("address/parent-update", payload);
                    if (res.data.IsSuccess) {
                      toast.success(res.data.message);
                      fetchAddresses();
                    } else {
                      toast.error(res.data.message);
                    }
                  } catch (err) {
                    toast.error("Failed to update type");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  minWidth: 100,
                  "& .MuiSelect-select": {
                    padding: "4px 8px",
                    fontSize: "0.875rem",
                    textTransform: "capitalize",
                  },
                }}
              >
                <MenuItem value="address">Address</MenuItem>
                <MenuItem value="location">Location</MenuItem>
              </TextField> */}
            </>
          );
        },
      }),

      {
        header: "Progress",
        accessorKey: "progress",
        cell: ({ row }: any) => {
          const item = row.original.progress;
          const status_int = row.original.status;
          let color = "text.primary";

          if (status_int === 13) color = "#999999";
          else if (status_int === 4) color = "#32A852";
          else if (status_int === 3) color = "#FF7F00";
          return (
            <Typography
              className="f-14"
              sx={{ px: 1.5 }}
              color={color}
              fontWeight={500}
            >
              {item}%
            </Typography>
          );
        },
      },

      columnHelper.accessor("status_text", {
        id: "statusText",
        header: () => "Status",
        cell: (info) => {
          const statusInt = info.row.original.status;
          let color = "textPrimary";
          if (statusInt === 13) color = "#999999";
          else if (statusInt === 4) color = "#32A852";
          else if (statusInt === 3) color = "#FF7F00";

          return (
            <Typography
              className="f-14"
              color={color}
              fontWeight={500}
              sx={{ px: 1.5 }}
            >
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),

      columnHelper.accessor("pin_code", {
        header: "Post Code",
        cell: (info) => {
          return (
            <Typography className="f-14" sx={{ px: 1.5 }}>
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("id", {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => {
          if (row.original.is_conflict) {
            return (
              <Box display={"flex"} alignItems={"center"} gap={2}>
                <IconButton
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenParentAddressDrawer(row.original);
                  }}
                >
                  <IconEdit width={18} />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setAddressToDelete(row.original.id);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <IconTrash width={18} />
                </IconButton>
              </Box>
            );
          }
          return (
            <IconButton
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenParentAddressDrawer(row.original);
              }}
            >
              <IconEdit width={18} />
            </IconButton>
          );
        },
      }),
    ],
    [data, selectedRowIds, hoveredRow],
  );

  const currentFilteredData = useMemo(() => {
    return data;
  }, [data]);

  const {
    table,
    pagination,
    setPagination,
    pageCount,
    setPageCount,
    totalRows,
    setTotalRows,
  } = useServerTable({
    data: currentFilteredData,
    columns,
    fetchData: fetchAddresses,
    debounceDependencies: [
      searchTerm,
      user?.company_id,
      JSON.stringify(filters),
      showConflicts,
    ],
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    initialPagination: { pageIndex: 0, pageSize: 100 },
  });

  useEffect(() => {
    setPagination((prev) =>
      prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
    );
  }, [
    searchTerm,
    filters.status,
    filters.has_cases,
    showConflicts,
    setPagination,
  ]);

  const simpleColumns = columns.map((column: any) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <PermissionGuard permission="Project">
      <Box
        sx={{
          height: embedded ? "100%" : "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
          overflow: embedded ? "hidden" : undefined,
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
          <Grid
            container
            size={{ xs: 12, sm: 12 }}
            gap={1}
            alignItems="center"
            justifyContent={{ xs: "flex-start", sm: "flex-start" }}
            flexWrap="wrap"
            className="project_wrapper"
          >
            <TextField
              id="search"
              type="text"
              size="small"
              variant="outlined"
              placeholder="Search..."
              className="project_search"
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

            <Button
              variant="contained"
              color={showConflicts ? "primary" : "error"}
              onClick={() => setShowConflicts(!showConflicts)}
              sx={{
                mt: { xs: 1, sm: 0 },
                minWidth: "40px",
                px: 1,
              }}
            >
              <IconExclamationCircle width={18} />
            </Button>
          </Grid>
          <Stack
            display="flex"
            justifyContent="flex-end"
            direction="row"
            gap={1}
            flexWrap="wrap"
            mt={{ xs: 2, sm: 0 }}
          >
            <Box display={"flex"}>
              {selectedRowIds.size > 0 && (
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mr: 2 }}
                  onClick={() => setAllocateDrawerOpen(true)}
                >
                  Allocate
                </Button>
              )}

              {selectedRowIds.size > 0 && user.user_role_id == 1 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash width={18} />}
                  onClick={() => setOpenDialog(true)}
                >
                  Archive
                </Button>
              )}

              <IconButton
                onClick={(event) => setAnchorEl2(event.currentTarget)}
                sx={{ ml: 1 }}
                color="primary"
              >
                <IconEye />
              </IconButton>
              <ColumnVisibilityPopover
                open={Boolean(anchorEl2)}
                anchorEl={anchorEl2}
                onClose={() => setAnchorEl2(null)}
                table={table}
                excludedColumns={["select"]}
              />
              <IconButton
                sx={{ margin: "0px" }}
                id="basic-button"
                aria-controls={openMenu ? "basic-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? "true" : undefined}
                onClick={handleClick}
              >
                <IconDotsVertical width={18} />
              </IconButton>
              <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleClose}
                slotProps={{
                  list: {
                    "aria-labelledby": "basic-button",
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleClose();
                    handleOpenParentAddressDrawer();
                  }}
                >
                  <Box
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconPlus width={18} />
                    </ListItemIcon>
                    Add Address
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <Link
                    color="body1"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setArchiveListOpen(true);
                    }}
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconNotes width={18} />
                    </ListItemIcon>
                    Archive Address List
                  </Link>
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <Link
                    color="body1"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenModel(true);
                    }}
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconFileImport width={18} />
                    </ListItemIcon>
                    Import
                  </Link>
                </MenuItem>

                <MenuItem onClick={handleClose}>
                  <Link
                    color="body1"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      exportProducts();
                    }}
                    style={{
                      width: "100%",
                      color: "#11142D",
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                    }}
                  >
                    <ListItemIcon>
                      <IconFileExport width={18} />
                    </ListItemIcon>
                    Export
                  </Link>
                </MenuItem>
              </Menu>
            </Box>
            <AddressFiltersDialog
              open={open}
              onClose={() => setOpen(false)}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              statusOptions={status}
              onClear={() => {
                setTempFilters({
                  status: "",
                  has_cases: "",
                });
                setFilters({
                  status: "",
                  has_cases: "",
                });
                setOpen(false);
              }}
              onApply={() => {
                setFilters(tempFilters);
                setOpen(false);
              }}
            />
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
          <TableContainer ref={tableContainerRef}>
            <Table
              stickyHeader
              aria-label="sticky table"
              sx={{ whiteSpace: "nowrap" }}
            >
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
                            width:
                              header.column.id === "select"
                                ? 10
                                : header.column.id === "conflicts"
                                  ? 3
                                  : "auto",

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
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          align="left"
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
        <ExcelImportModal
          open={openModel}
          onClose={() => setOpenModel(false)}
          importUrl="address/import"
          sampleHref="/files/address_import.xlsx"
          saveLabel="Save"
          savingLabel="Saving"
          onSuccess={fetchAddresses}
        />
        <ChildAddressesDrawer
          open={addressListDrawerOpen}
          onClose={() => {
            setAddressListDrawerOpen(false);
            fetchAddresses();
          }}
          projectId={projectId}
          parentAddressId={selectedParentAddressId}
          projects={project}
        />
        <ListConfirmDialog
          open={openDialog}
          title="Confirm Archive"
          message={`Are you sure you want to archive ${selectedRowIds.size} parent addresses?`}
          confirmLabel="Archive"
          onClose={() => setOpenDialog(false)}
          onConfirm={async () => {
            try {
              const payload = {
                address_ids: Array.from(selectedRowIds).join(","),
              };
              const res = await api.post("address/parent-archive", payload);
              if (res.data.IsSuccess) {
                toast.success("Parent addresses archived successfully.");
              }
              fetchAddresses();
              setSelectedRowIds(new Set());
            } catch (error) {
              console.error(error);
              toast.error("Error archiving parent addresses.");
            }
            setOpenDialog(false);
          }}
        />
        <ParentAddressFormDrawer
          open={parentAddressDrawerOpen}
          onClose={() => setParentAddressDrawerOpen(false)}
          companyId={user.company_id}
          address={editingParentAddress}
          onSaved={fetchAddresses}
        />
        <ArchiveParentAddress
          open={archiveListOpen}
          onClose={() => setArchiveListOpen(false)}
          onWorkUpdated={fetchAddresses}
          companyId={user.company_id}
        />
        <AllocateAddressesDrawer
          open={allocateDrawerOpen}
          onClose={() => closeDrawer()}
          selectedAddresses={data.filter((item: any) =>
            selectedRowIds.has(item.id),
          )}
          projects={allProjects}
          companyId={user.company_id}
          onSuccess={() => {
            setSelectedRowIds(new Set());
            fetchAddresses();
          }}
        />
        <AddressConflictDialog
          open={Boolean(conflictItem)}
          postcode={conflictItem ? conflictItem.pin_code : ""}
          onClose={() => setConflictItem(null)}
          onVerify={() => {
            if (conflictItem) {
              handleOpenParentAddressDrawer(conflictItem);
            }
            setConflictItem(null);
          }}
        />
        <ListConfirmDialog
          open={deleteConfirmOpen}
          title="Confirm Deletion"
          message="Are you sure you want to delete this address?"
          confirmLabel="Confirm"
          confirmVariant="contained"
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={async () => {
            if (addressToDelete) {
              try {
                const payload = { address_ids: addressToDelete.toString() };
                const res = await api.post("address/parent-delete", payload);
                if (res.data.IsSuccess) {
                  toast.success(res.data.message);
                  fetchAddresses();
                }
              } catch (error) {}
            }
            setDeleteConfirmOpen(false);
            setAddressToDelete(null);
          }}
        />
      </Box>
    </PermissionGuard>
  );
};

export default TablePagination;
