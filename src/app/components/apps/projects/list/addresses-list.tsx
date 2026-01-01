"use client";
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
  Divider,
  IconButton,
  Stack,
  MenuItem,
  Drawer,
  Tab,
  Tabs,
  ListItemIcon,
  Menu,
  Badge,
  Button,
  TextField,
  Slider,
  List,
  ListItem,
  ListItemButton,
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
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconEdit,
  IconProgress,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { ProjectList } from "./index";

import { WorksTab } from "./address-sidebar-tab/works-tab";
import { DocumentsTab } from "./address-sidebar-tab/documents-tab";
import { TradesTab } from "./address-sidebar-tab/trades-tab";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CreateProjectTask from "../tasks";
import toast from "react-hot-toast";
import { IconDownload } from "@tabler/icons-react";
import { Circle, GoogleMap, Marker } from "@react-google-maps/api";
import CustomRangeSlider from "@/app/components/forms/theme-elements/CustomRangeSlider";

dayjs.extend(customParseFormat);

interface AddressesListProps {
  projectId: number | null;
  searchTerm: string;
  filters: {
    status: string;
    sortOrder: string;
  };
  onProjectUpdated?: () => void;
  onSelectionChange: (ids: number[]) => void;
  processedIds: number[];
  // onParentActionPerformed?: (fetchAddresses: Function) => void;
  shouldRefresh: boolean;
  onTableReady: any;
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

const AddressesList = ({
  projectId,
  searchTerm,
  filters,
  onProjectUpdated,
  onSelectionChange,
  onTableReady,
  processedIds,
  shouldRefresh,
}: AddressesListProps) => {
  const [data, setData] = useState<ProjectList[]>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sorting, setSorting] = useState<SortingState>([]);
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [value, setValue] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [addressEdit, setAddressEdit] = useState(false);
  const [address, setAddress] = useState<any>(null);
  const [radius, setRadius] = useState(0);
  const fetched = useRef(false);
  const isIEPostcode = (value: string) =>
    /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(value.trim());

  const isAUPostcode = (value: string) => /^\d{4}$/.test(value.trim());

  const isNZPostcode = (value: string) => /^\d{4}$/.test(value.trim());

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);
  useEffect(() => {
    onSelectionChange(Array.from(selectedRowIds));
  }, [selectedRowIds]);

  const [typedAddress, setTypedAddress] = useState(false);

  const openMenu = Boolean(anchorEl);

  const [formData, setFormData] = useState<any>({});
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id: number;
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [progressDrawerOpen, setProgressDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=tradeList&company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };

    if (drawerOpen == true) {
      fetchTrades();
    }
  }, [drawerOpen]);

  const handleOpenCreateDrawer = () => {
    setFormData({
      address_id: null,
      type_of_work_id: 0,
      location_id: null,
      trade_id: null,
      company_id: user?.company_id || 0,
      duration: 0,
      rate: 0,
      is_attchment: true,
    });
    setDrawerOpen(true);
  };

  const fetchAddresses = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `address/get?project_id=${projectId}&company_id=${user.company_id}`
      );
      if (res.data) {
        setData(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch addresses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAddresses();
    }
  }, [projectId, processedIds, shouldRefresh]);

  useEffect(() => {
    if (sidebarData !== null) {
      setValue(0);
    }
  }, [sidebarData]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        project_id: projectId,
      };
      const result = await api.post("company-tasks/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setDrawerOpen(false);
        setTypedAddress(false);
        setLoading(true);
        onProjectUpdated?.();
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          address_id: null,
          type_of_work_id: 0,
          location_id: null,
          trade_id: null,
          company_id: user?.company_id || 0,
          duration: 0,
          rate: 0,
          is_attchment: true,
          tasks: [],
        });
      } else {
        toast.error(result.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating address:", error);
      setLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const currentFilteredData = useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesStatus = filters.status
        ? item.status_text === filters.status
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        item.progress.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });

    if (filters.sortOrder === "asc") {
      filtered = filtered.sort((a, b) => a.name?.localeCompare(b.name));
    } else if (filters.sortOrder === "desc") {
      filtered = filtered.sort((a, b) => b.name?.localeCompare(a.name));
    }

    return filtered;
  }, [data, filters, searchTerm]);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  useEffect(() => {
    // remove processed IDs from selectedRowIds
    setSelectedRowIds((prev) => {
      const updated = new Set(
        [...prev].filter((id) => !processedIds.includes(id))
      );
      return updated;
    });
  }, [processedIds]);

  const handleDownloadZip = async (addressId: number) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${addressId}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tasks_address_${addressId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };
  const getAddressDetail = async () => {
    try {
      const response = await api.get(
        `address/address-detail?address_id=${sidebarData?.addressId}`
      );
      if (response.data.IsSuccess) {
        setAddress(response.data.info);
        const numericValue = Number(
          response.data.info.progress.replace("%", "")
        );
        setRadius(numericValue ?? 0);
      }
    } catch (error) {
      console.log("error in get address detail");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: sidebarData?.addressId,
        progress: radius,
      };
      const response = await api.put(
        "address/change-address-progress",
        payload
      );
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        setProgressDrawerOpen(false);
        fetchAddresses();
      }
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  useEffect(() => {
    if (sidebarData?.addressId) {
      getAddressDetail();
    }
  }, [sidebarData?.addressId]);

  const handleAddressClose = () => {
    setAddressEdit(false);
    setTypedAddress(false);
  };
  const handleEdit = useCallback((task: any) => {
    setSelectedTask(task);

    setFormData({
      id: task.id,
      name: task.name,
      lat: task.latitude,
      lng: task.longitude,
      radius: task.radius ?? 100,
      boundary: task.boundary,
      type: task.type,
      color: task.color,
    });

    setSelectedLocation({
      lat: task.latitude,
      lng: task.longitude,
    });

    setAddressEdit(true);
  }, []);

  const handleAddressEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let payload = {
        id: selectedTask.id,
        ...formData,
        project_id: projectId,
        type: "circle",
      };

      if (!payload.boundary && selectedLocation) {
        payload.boundary = JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: formData.radius,
        });
      }

      const result = await api.put("address/update", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setAddressEdit(false);
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          project_id: Number(projectId),
          company_id: user.company_id,
          name: "",
        });
        fetchAddresses();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error creating address:", error);
      setLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSearchClick = async () => {
    const query = formData.name.trim();
    if (!query) {
      setPredictions([]);
      return;
    }

    setTypedAddress(true);

    try {
      let country = "UK";

      if (isIEPostcode(query)) country = "IE";
      else if (isAUPostcode(query)) country = "AU";
      else if (isNZPostcode(query)) country = "NZ";

      const res = await fetch(
        `https://ws.postcoder.com/pcw/${
          process.env.NEXT_PUBLIC_POSTCODER_KEY
        }/address/${country}/${encodeURIComponent(query)}?format=json`
      );

      const data = await res.json();
      setPredictions(data || []);
      return;
    } catch (err) {
      console.error("Postcoder failed, falling back to Google", err);
    }

    const service = new google.maps.places.AutocompleteService();

    service.getPlacePredictions({ input: query }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(
          results.map((r) => ({
            ...r,
            source: "google",
          }))
        );
      } else {
        setPredictions([]);
      }
    });
  };

  const selectGooglePrediction = (
    item: { source: "google" } & google.maps.places.AutocompletePrediction
  ) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );

    service.getDetails({ placeId: item.place_id }, (place, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place?.geometry?.location
      ) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        const boundary: Boundary = {
          lat,
          lng,
          radius: formData.radius ?? 50,
        };

        setFormData((prev: any) => ({
          ...prev,
          name: place.formatted_address || "",
          lat,
          lng,
          boundary: JSON.stringify(boundary),
        }));

        setSelectedLocation({ lat, lng });
        setPredictions([]);
      }
    });
  };

  const selectPostcoderPrediction = (
    item: { source: "postcoder" } & PostcoderAddress
  ) => {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: item.postcode }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();

        const boundary: Boundary = {
          lat,
          lng,
          radius: formData.radius ?? 50,
        };

        setFormData((prev: any) => ({
          ...prev,
          name: item.summaryline,
          lat,
          lng,
          boundary: JSON.stringify(boundary),
        }));

        setSelectedLocation({ lat, lng });
        setPredictions([]);
      }
    });
  };

  const handleRadiusChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;

    if (!selectedLocation) return;

    const newBoundary: Boundary = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      radius: value,
    };

    setFormData((prev: any) => ({
      ...prev,
      radius: value,
      boundary: JSON.stringify(newBoundary),
    }));
  };

  const columnHelper = createColumnHelper<ProjectList>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "name",
        header: () => (
          <Stack direction="row" alignItems="center" spacing={4}>
            <CustomCheckbox
              checked={
                selectedRowIds.size === currentFilteredData.length &&
                currentFilteredData.length > 0
              }
              indeterminate={
                selectedRowIds.size > 0 &&
                selectedRowIds.size < currentFilteredData.length
              }
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const isChecked = e.target.checked;

                setShowAllCheckboxes(isChecked);

                if (isChecked) {
                  setSelectedRowIds(
                    new Set(currentFilteredData.map((r) => r.id))
                  );
                } else {
                  setSelectedRowIds(new Set());
                }
              }}
            />
            <Typography variant="subtitle2" fontWeight="inherit">
              Address
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isProcessed = processedIds.includes(item.id);
          const isChecked = selectedRowIds.has(item.id);

          const showCheckbox =
            showAllCheckboxes || hoveredRow === item.id || isChecked;

          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={4}
              sx={{ pl: 1 }}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() =>
                setHoveredRow((prev) => (prev === item.id ? null : prev))
              }
            >
              <CustomCheckbox
                checked={isChecked}
                disabled={isProcessed}
                onClick={(e) => e.stopPropagation()}
                onChange={() => {
                  if (isProcessed) return;

                  setSelectedRowIds((prev) => {
                    const next = new Set(prev);
                    isChecked ? next.delete(item.id) : next.add(item.id);
                    return next;
                  });
                }}
                sx={{
                  opacity: showCheckbox ? 1 : 0,
                  pointerEvents: showCheckbox ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              />

              <Typography
                onClick={() =>
                  setSidebarData({
                    addressName: item.name,
                    companyId: item.company_id,
                    projectId: item.project_id,
                    addressId: item.id,
                    info: [true],
                  })
                }
                className="f-14"
                sx={{ cursor: "pointer", "&:hover": { color: "#173f98" } }}
              >
                {item.name}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("progress", {
        id: "progress",
        header: () => "Progress",
        cell: (info) => {
          const statusInt = info.row.original.status_int;
          let color = "textPrimary";
          if (statusInt === 13) color = "#999999";
          else if (statusInt === 4) color = "#32A852";
          else if (statusInt === 3) color = "#FF7F00";

          return (
            <Typography
              className="f-14"
              color={color}
              fontWeight={700}
              sx={{ px: 1.5 }}
            >
              {info.getValue() ?? "-"}
            </Typography>
          );
        },
      }),
      columnHelper.accessor("check_ins", {
        id: "checkIns",
        header: () => "Check-ins",
        cell: (info) => (
          <Typography
            className="f-14"
            color={"#007AFF"}
            fontWeight={700}
            sx={{ px: 1.5 }}
          >
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),
      columnHelper.accessor("start_date", {
        id: "startDate",
        header: () => "Start date",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {formatDate(info.getValue())}
          </Typography>
        ),
      }),
      columnHelper.accessor("end_date", {
        id: "endDate",
        header: () => "End date",
        cell: (info) => {
          const rowIndex = info.row.index;

          return (
            <Box
              display="flex"
              alignItems="center"
              gap={6}
              justifyContent={"space-between"}
            >
              <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                {formatDate(info.getValue())}
              </Typography>
              <Box display={"flex"} gap={2}>
                <IconButton
                  onClick={() => handleEdit(info.row.original)}
                  color="primary"
                >
                  <IconEdit size={18} />
                </IconButton>
                <Badge
                  badgeContent={info.row.original.image_count}
                  color="error"
                  overlap="circular"
                >
                  <IconButton
                    color="error"
                    onClick={() => handleDownloadZip(info.row.original.id)}
                  >
                    <IconDownload size={20} />
                  </IconButton>
                </Badge>
              </Box>
            </Box>
          );
        },
      }),
    ],
    [data, selectedRowIds, hoveredRow, showAllCheckboxes, processedIds]
  );

  const table = useReactTable({
    data: currentFilteredData,
    columns,
    state: { columnFilters, sorting },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  useEffect(() => {
    if (onTableReady) onTableReady(table);
    table.setPageIndex(0);
  }, [table]);

  return (
    <Box
      sx={{
        height: "calc(95vh - 130px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
                          width: header.column.id === "actions" ? 120 : "auto",
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
                              header.getContext()
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
              {
                // table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      cursor: "pointer",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} sx={{ padding: "10px" }}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
                // ) : (
                //   <TableRow>
                //     <TableCell colSpan={columns.length} align="center">
                //       No records found
                //     </TableCell>
                //   </TableRow>
                // )
              }
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
      </Box>
      <Divider />

      <Stack
        gap={1}
        pr={3}
        pt={1}
        pl={3}
        alignItems="center"
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography color="textSecondary">
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
            <Typography color="textSecondary">Page</Typography>
            <Typography color="textSecondary" fontWeight={600} ml={1}>
              {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </Typography>
            <Typography color="textSecondary" ml={"3px"}>
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

      <Drawer
        anchor="right"
        open={sidebarData !== null}
        onClose={() => setSidebarData(null)}
        sx={{
          width: { xs: "100%", sm: 500 },
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 500 },
            padding: 2,
            backgroundColor: "#fff",
            boxSizing: "border-box",
          },
        }}
      >
        <Box>
          {Array.isArray(sidebarData?.info) && sidebarData.info.length > 0 ? (
            <>
              {/* Header */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Box display="flex" alignItems="center">
                  <IconButton onClick={() => setSidebarData(null)}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h6" fontWeight={700}>
                    {sidebarData.addressName}
                  </Typography>
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
                    <MenuItem onClick={handleClose}>
                      <Link
                        color="body1"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenCreateDrawer();
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
                          <IconPlus width={18} />
                        </ListItemIcon>
                        Add Task
                      </Link>
                    </MenuItem>
                    {user.user_role_id == 1 && (
                      <MenuItem onClick={handleClose}>
                        <Link
                          color="body1"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setProgressDrawerOpen(true);
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
                            <IconProgress width={18} />
                          </ListItemIcon>
                          Change Progress
                        </Link>
                      </MenuItem>
                    )}
                  </Menu>
                </Box>
                <Box display="flex">
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
                </Box>
              </Box>
              {/* Add task */}
              <CreateProjectTask
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                formData={formData}
                setFormData={setFormData}
                handleTaskSubmit={handleTaskSubmit}
                trade={trade}
                isSaving={isSaving}
                address_id={sidebarData.addressId}
                projectId={projectId}
              />
              {/* Tabs */}
              <Tabs
                className="address-sidebar-tabs"
                value={value}
                onChange={handleTabChange}
                aria-label="Sidebar Tabs"
                variant="fullWidth"
                TabIndicatorProps={{ style: { display: "none" } }}
                sx={{
                  backgroundColor: "#E0E0E0",
                  borderRadius: "12px",
                  minHeight: "40px",
                  padding: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                {["Works", "Documents", "Trades"].map((label, index) => (
                  <Tab
                    key={label}
                    label={label}
                    sx={{
                      textTransform: "none",
                      borderRadius: "10px",
                      minHeight: "32px",
                      minWidth: "auto",
                      px: 3,
                      py: 0.5,
                      fontSize: "14px",
                      fontWeight: value === index ? "600" : "400",
                      color: value === index ? "#000 !important" : "#888",
                      backgroundColor: value === index ? "#fff" : "transparent",
                      boxShadow:
                        value === index
                          ? "0px 2px 4px rgba(0,0,0,0.1)"
                          : "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </Tabs>

              {value === 0 && (
                <WorksTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                />
              )}
              {value === 1 && (
                <DocumentsTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                  projectId={sidebarData.projectId}
                />
              )}
              {value === 2 && (
                <TradesTab
                  companyId={sidebarData.companyId}
                  addressId={sidebarData.addressId}
                  projectId={sidebarData.projectId}
                />
              )}
            </>
          ) : (
            <Typography variant="body1" color="text.secondary" mt={2}>
              No work logs available.
            </Typography>
          )}
        </Box>
      </Drawer>
      <Drawer
        anchor="right"
        open={progressDrawerOpen}
        onClose={() => setProgressDrawerOpen(false)}
        sx={{
          width: 350,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 350,
            padding: 2,
            backgroundColor: "#f9f9f9",
          },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box height={"100%"}>
            <form onSubmit={handleSubmit} className="address-form">
              <Grid container>
                <Grid size={{ lg: 12, xs: 12 }}>
                  <Box
                    display={"flex"}
                    alignContent={"center"}
                    alignItems={"center"}
                    flexWrap={"wrap"}
                  >
                    <IconButton onClick={() => setProgressDrawerOpen(false)}>
                      <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" color="inherit" fontWeight={700}>
                      Change Address progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ lg: 12, xs: 12 }} mt={2}>
                  <Typography variant="h6" color="inherit" ml={1}>
                    Progress
                  </Typography>
                  <Box display={"flex"} gap={2}>
                    <Slider
                      min={0}
                      max={100}
                      value={radius}
                      onChange={(e, v) => setRadius(v as number)}
                      sx={{ mb: 2, ml: 1 }}
                    />
                    <Typography>{radius}%</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  gap: 2,
                  mt: 3,
                }}
              >
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={isSaving}
                  sx={{ borderRadius: 3 }}
                  className="drawer_buttons"
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setProgressDrawerOpen(false)}
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: "transparent",
                    borderRadius: 3,
                    color: "GrayText",
                  }}
                >
                  Close
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>

      {/* Edit Address Drawer */}
      <Drawer
        anchor="right"
        open={addressEdit}
        onClose={() => handleAddressClose()}
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 2,
            backgroundColor: "#f9f9f9",
          },
        }}
      >
        <Box display="flex" flexDirection="column" height="100%">
          <Box height={"100%"}>
            <form onSubmit={handleAddressEdit} className="address-form">
              <Grid container>
                <Grid size={{ xs: 12 }}>
                  <Box
                    display={"flex"}
                    alignContent={"center"}
                    alignItems={"center"}
                    flexWrap={"wrap"}
                  >
                    <IconButton onClick={() => handleAddressClose()}>
                      <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" color="inherit" fontWeight={700}>
                      Edit Address
                    </Typography>
                  </Box>

                  <Typography variant="h5" mt={3}></Typography>
                  <Box
                    display={"flex"}
                    justifyContent={"space-between"}
                    gap={3}
                  >
                    <TextField
                      label="Enter address"
                      id="name"
                      name="name"
                      placeholder="Search for address.."
                      value={formData.name}
                      onChange={handleInputChange}
                      variant="outlined"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSearchClick}
                    >
                      Search
                    </Button>
                  </Box>

                  {typedAddress && predictions.length > 0 && (
                    <List
                      sx={{
                        border: "1px solid #ccc",
                        maxHeight: 200,
                        overflow: "auto",
                        mt: 1,
                      }}
                    >
                      {predictions.map((item, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemButton
                            onClick={() =>
                              item.source === "google"
                                ? selectGooglePrediction(item)
                                : selectPostcoderPrediction(item)
                            }
                          >
                            {item.source === "google"
                              ? item.description
                              : item.summaryline}
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  )}

                  {selectedLocation && (
                    <Box
                      sx={{ marginTop: 3 }}
                      width={"98%"}
                      className="slider_wrapper"
                    >
                      <Typography variant="h6">
                        Area size [{formData.radius} Meter]
                      </Typography>
                      <CustomRangeSlider
                        value={formData.radius}
                        onChange={handleRadiusChange}
                        min={0}
                        max={100}
                        step={1}
                        sx={{ height: "1px" }}
                      />

                      <GoogleMap
                        zoom={17}
                        center={selectedLocation}
                        mapContainerStyle={{
                          width: "100%",
                          height: "400px",
                          marginTop: "20px",
                        }}
                      >
                        <Marker position={selectedLocation} />
                        <Circle
                          center={selectedLocation}
                          radius={formData.radius}
                          options={{
                            fillColor: ` ${formData?.color ?? "#FF0000"}`,
                            fillOpacity: 0.3,
                            strokeColor: ` ${formData?.color ?? "#FF0000"}`,
                            strokeOpacity: 1,
                            strokeWeight: 1,
                          }}
                        />
                      </GoogleMap>
                      <Box mt={2}>
                        <Typography>Zone Color</Typography>
                        <input
                          type="color"
                          value={formData.color || "#000000"}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          style={{
                            width: "100%",
                            height: "40px",
                            border: "none",
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Grid>
              </Grid>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  gap: 2,
                  marginTop: 3,
                }}
              >
                <Button
                  color="primary"
                  variant="contained"
                  size="large"
                  type="submit"
                  sx={{ borderRadius: 3 }}
                  className="drawer_buttons"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  color="inherit"
                  onClick={() => handleAddressClose()}
                  variant="contained"
                  size="large"
                  sx={{
                    backgroundColor: "transparent",
                    borderRadius: 3,
                    color: "GrayText",
                  }}
                >
                  Close
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default AddressesList;
