"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  Drawer,
  CircularProgress,
  MenuItem,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Modal,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import {
  IconFilter,
  IconSearch,
  IconX,
  IconTrash,
  IconEye,
  IconFileImport,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Cookies from "js-cookie";
import "react-day-picker/dist/style.css";
import "../../../../global.css";
import { useJsApiLoader } from "@react-google-maps/api";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Link from "next/link";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import { FileDownload } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { IconFileExport } from "@tabler/icons-react";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { createColumnHelper, flexRender } from "@tanstack/react-table";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import { useServerTable } from "@/hooks/useServerTable";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { IconExclamationCircle } from "@tabler/icons-react";
import AddressesList from "./addresses-list";

dayjs.extend(customParseFormat);
const columnHelper = createColumnHelper<any>();

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
}

export interface TradeList {
  id: number;
  name: string;
}

interface Boundary {
  lat: number;
  lng: number;
  radius: number;
}

type PostcoderAddress = {
  summaryline: string;
  addressline1: string;
  addressline2: string;
  posttown: string;
  postcode: string;
};

type GooglePrediction = google.maps.places.AutocompletePrediction;

type UnifiedPrediction =
  | ({ source: "google" } & GooglePrediction)
  | ({ source: "postcoder" } & PostcoderAddress);

const TablePagination: React.FC<ProjectListingProps> = ({}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    sortOrder: "",
    supplier: "",
    category: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [data, setData] = useState<ProjectList[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [project, setProject] = useState<ProjectList[]>([]);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [projectId, setProjectId] = useState<number | null>(null);
  const openMenu = Boolean(anchorEl);
  const status = ["Completed", "To Do", "In Progress"];
  const [sidebar, setSidebar] = useState(false);
  const COOKIE_PREFIX = "project_";
  const projectID = Cookies.get(COOKIE_PREFIX + user.id + user.company_id);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [columnVisibility, setColumnVisibilityState] = useState<
    Record<string, boolean>
  >({});
  const [update, setUpdate] = useState(0);

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);
  const [radius, setRadius] = useState(100);
  const [typedAddress, setTypedAddress] = useState(false);
  const [formData, setFormData] = useState<any>({
    project_ids: [Number(projectID)],
    company_id: user.company_id,
    name: "",
  });
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [isImport, setIsImport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openModel, setOpenModel] = useState(false);
  const [file, setFile] = useState<any | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);
  const [addressListDrawerOpen, setAddressListDrawerOpen] = useState(false);
  const [selectedParentAddressId, setSelectedParentAddressId] = useState<
    number | null
  >(null);

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

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`,
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    if (drawerOpen == true) {
      fetchTrades();
    }
  }, [drawerOpen !== false]);

  useEffect(() => {
    if (projectId) {
      setFormData((prev: any) => ({
        ...prev,
        project_ids: [projectId],
      }));
    }
  }, [projectId]);

  const fetchResources = async () => {
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}&is_web=true`,
      );
      if (res.data) {
        setProducts(res.data.products);
        setSuppliers(res.data.suppliers);
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
  };

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

  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
      fetchResources();
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
    if (!projectID) return;
    setLoading(true);
    try {
      let url = `address/get-parent?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (searchTerm) {
        url += `&search=${searchTerm}`;
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

  useEffect(() => {
    if (projectID) {
      fetchAddresses();
    }
  }, [value]);

  const handleModelOpen = () => {
    setPreview(null);
    setOpenModel(true);
  };
  const handleModelClose = () => setOpenModel(false);

  const handleFileChange = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setPreview(selectedFile.name);
  };

  const importAddresses = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsImport(true);
    setUploadProgress(0);
    setIsProcessing(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("address/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );

            setUploadProgress(percent);

            if (percent === 100) {
              setIsProcessing(true);
            }
          }
        },
      });

      toast.success(res.data.message);

      fetchAddresses();

      setTimeout(() => {
        handleModelClose();
        setUploadProgress(0);
        setIsProcessing(false);
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setIsImport(false);
    }
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
      a.download = `address_import.xlsx`;
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

  const downloadSampleFile = () => {
    const link = document.createElement("a");
    link.href = "/files/address_import.xlsx";
    link.download = "sample-file.xlsx";
    link.click();
  };

  const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps } =
    useDropzone({
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
      },
      onDrop: handleFileChange,
    });

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (tabRefs.current[value]) {
      tabRefs.current[value]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
      });
    }
  }, [value]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  useEffect(() => {
    if (!sidebar) {
      setFormData((prev: any) => ({
        ...prev,
        name: "",
        boundary: "",
        lat: null,
        lng: null,
      }));
      setSelectedLocation(null);
    }
  }, [sidebar]);

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
              {item.is_conflict ? (
                <Box gap={1} display={"flex"} alignItems={"center"}>
                  <IconButton
                    size="small"
                    color="error"
                    disableRipple
                    sx={{
                      p: 0,
                      width: 18,
                      height: 18,
                      "&:hover": {
                        backgroundColor: "transparent",
                      },
                    }}
                  >
                    <IconExclamationCircle size={18} stroke={2} />
                  </IconButton>
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: "pointer",
                      "&:hover": {
                        color: "primary.main",
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParentAddressId(item.id);
                      setAddressListDrawerOpen(true);
                    }}
                  >
                    {item.name}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  ml={3}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      color: "primary.main",
                    },
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
            </Box>
          );
        },
      }),

      columnHelper.accessor("pin_code", {
        header: "Pin Code",
        cell: (info) => info.getValue(),
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
    fetchData: fetchAddresses,
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
      <Box p={2} pt={1}>
        <Stack
          mb={2}
          direction={{ xs: "column", sm: "row", xl: "row" }}
          justifyContent="space-between"
          alignItems={"flex-start"}
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
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFilter width={18} />
            </Button>
            <Button
              variant="contained"
              onClick={() => handleModelOpen()}
              sx={{ mt: { xs: 1, sm: 0 }, mr: 1 }}
              startIcon={<IconFileImport width={18} />}
            >
              Import
            </Button>
            <Button
              variant="contained"
              onClick={exportProducts}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFileExport width={18} /> Export
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
              {selectedIds.length > 0 && (
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
                    ?.getAllLeafColumns()
                    .filter(
                      (col: any) => !["conflicts", "select"].includes(col.id),
                    )
                    .filter((col: any) =>
                      col.id.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((col: any) => (
                      <FormControlLabel
                        key={col.id}
                        control={
                          <Checkbox
                            checked={
                              columnVisibility[col.id] ?? col.getIsVisible()
                            }
                            onChange={(e) => {
                              if (!table) return;

                              const newVisibility = {
                                ...columnVisibility,
                                [col.id]: e.target.checked,
                              };

                              setColumnVisibilityState(newVisibility);
                              table.setColumnVisibility(newVisibility);
                              setUpdate((u) => u + 1);
                            }}
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
                                )
                                .trim())
                        }
                      />
                    ))}
                </FormGroup>
              </Popover>
            </Box>

            {/* Filter Dialog */}
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
                  <TextField
                    select
                    label="Status"
                    value={tempFilters.status}
                    onChange={(e) =>
                      setTempFilters({ ...tempFilters, status: e.target.value })
                    }
                    fullWidth
                  >
                    <MenuItem value="All">All</MenuItem>
                    {status.map((statusItem, i) => (
                      <MenuItem key={i} value={statusItem}>
                        {statusItem}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Sort A-Z"
                    value={tempFilters.sortOrder}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        sortOrder: e.target.value,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="asc">A-Z</MenuItem>
                    <MenuItem value="desc">Z-A</MenuItem>
                  </TextField>
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button
                  onClick={() => {
                    setTempFilters({
                      supplier: "",
                      category: "",
                      status: "",
                      sortOrder: "",
                    });
                    setFilters({
                      supplier: "",
                      category: "",
                      status: "",
                      sortOrder: "",
                    });
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
          </Stack>
        </Stack>

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
        <Box mt={2}>
          <TablePaginationFooter table={table} totalRows={totalRows} />
        </Box>
        {/* Modal for File Upload */}
        <Modal open={openModel} onClose={handleModelClose} disableEscapeKeyDown>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              p: 3,
              borderRadius: 2,
              boxShadow: 24,
              width: 400,
            }}
          >
            <DialogTitle sx={{ p: 0 }}>
              <Typography color="GrayText" fontWeight={700}>
                Upload Your File
              </Typography>
              <IconButton
                onClick={() => handleModelClose()}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: 10,
                  backgroundColor: "transparent",
                }}
              >
                <IconX size={40} />
              </IconButton>
            </DialogTitle>
            <Box
              {...getExcelRootProps()}
              sx={{
                width: 350,
                height: 100,
                mt: 2,
                border: "2px dashed",
                borderColor: "primary.main",
                borderRadius: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  backgroundColor: "primary.light",
                },
              }}
            >
              <input {...getExcelInputProps()} accept=".xls,.xlsx" />
              {preview ? (
                preview
              ) : (
                <Typography fontSize="12px" color="primary.main">
                  Click or Drag File
                </Typography>
              )}
            </Box>
            <Typography fontSize="12px" color="text.secondary">
              Upload Excel Files
            </Typography>
            {isImport && (
              <Box sx={{ mt: 2 }}>
                {!isProcessing ? (
                  <>
                    <Typography variant="body2" mb={1}>
                      Uploading... {uploadProgress}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Processing file...</Typography>
                  </Box>
                )}
              </Box>
            )}
            {/* Action buttons */}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "end" }}>
              <Link
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  downloadSampleFile();
                }}
                style={{
                  width: "100%",
                  color: "#1e4db7",
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyItems: "center",
                }}
              >
                <FileDownload />
                Download Sample File
              </Link>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  disabled={isImport}
                  onClick={(e: any) => {
                    importAddresses();
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleModelClose}
                  color="error"
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
        </Modal>

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
            {projectId && selectedParentAddressId && (
              <AddressesList
                projectId={projectId}
                searchTerm=""
                filters={{ status: "", sortOrder: "" }}
                onSelectionChange={() => {}}
                processedIds={[]}
                shouldRefresh={false}
                onTableReady={() => {}}
                parentAddressId={selectedParentAddressId}
                projects={project}
                onClose={() => setAddressListDrawerOpen(false)}
              />
            )}
          </Box>
        </Drawer>
      </Box>
    </PermissionGuard>
  );
};

export default TablePagination;
