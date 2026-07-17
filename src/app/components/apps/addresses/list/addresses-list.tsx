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
  List,
  ListItem,
  ListItemButton,
  Tooltip,
  Autocomplete,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { flexRender, createColumnHelper } from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import {
  IconArrowLeft,
  IconDotsVertical,
  IconEdit,
  IconNote,
  IconPointFilled,
  IconProgress,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CreateProjectTask from "../../projects/tasks";
import toast from "react-hot-toast";
import { IconDownload } from "@tabler/icons-react";
import CustomRangeSlider from "@/app/components/forms/theme-elements/CustomRangeSlider";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import ArchiveAddress from "./archive-address-list";
import { WorksTab } from "./address-sidebar-tab/works-tab";
import { DocumentsTab } from "./address-sidebar-tab/documents-tab";
import { TradesTab } from "./address-sidebar-tab/trades-tab";
import { IconX } from "@tabler/icons-react";
import { IconFilter } from "@tabler/icons-react";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { IconNotes } from "@tabler/icons-react";
dayjs.extend(customParseFormat);

interface AddressesListProps {
  projectId: number | null;
  onProjectUpdated?: () => void;
  onSelectionChange: (ids: number[]) => void;
  processedIds: number[];
  // onParentActionPerformed?: (fetchAddresses: Function) => void;
  shouldRefresh: boolean;
  onTableReady: any;
  projects?: any[];
  parentAddressId?: number | null;
  onClose: any;
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

interface ClickToEditProgressProps {
  value: string | number | null | undefined;
  rowId: number;
  statusInt: number;
  editedBy?: string | null;
  editedAt?: string | null;
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
  onProjectUpdated,
  onSelectionChange,
  onTableReady,
  processedIds,
  shouldRefresh,
  projects,
  parentAddressId,
  onClose,
}: AddressesListProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchAddress, setFetchAddress] = useState<boolean>(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [value, setValue] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [anchorEl1, setAnchorEl1] = useState<null | HTMLElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [showAllCheckboxes, setShowAllCheckboxes] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [addressEdit, setAddressEdit] = useState(false);
  const [parentAddresses, setParentAddresses] = useState<any[]>([]);
  const [addCaseDrawerOpen, setAddCaseDrawerOpen] = useState(false);
  const [archiveList, setArchiveList] = useState(false);
  const [address, setAddress] = useState<any>(null);
  const [radius, setRadius] = useState(0);
  const [defaultRadius, setDefaultRadius] = useState<number>(100);
  const fetched = useRef(false);
  const [progress, setProgress] = useState(false);
  const status = ["Completed", "To Do", "In Progress"];
  const [open, setOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
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
  const circleRef = useRef<google.maps.Circle | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRadiusRef = useRef<number | null>(null);

  const [typedAddress, setTypedAddress] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const openMenu = Boolean(anchorEl);
  const openMenu1 = Boolean(anchorEl1);
  const [filters, setFilters] = useState({
    status: "",
    project: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);

  const [formData, setFormData] = useState<any>({});
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id: number;
  };

  useEffect(() => {
    const fetchParentAddresses = async () => {
      try {
        const res = await api.get(
          `get-modules?company_id=${user.company_id}&is_web=true`,
        );
        if (res.data) {
          setParentAddresses(res.data.parent_addresses);
        }
      } catch (err) {
        console.error("Failed to fetch parent addresses", err);
      }
    };
    const fetchGeneralSettings = async () => {
      try {
        const res = await api.get("setting/general-settings");
        if (
          res.data?.IsSuccess &&
          res.data.data?.location_radius !== undefined
        ) {
          setDefaultRadius(res.data.data.location_radius);
        }
      } catch (err) {
        console.error("Failed to fetch general settings", err);
      }
    };
    if (user?.company_id) {
      fetchParentAddresses();
      fetchGeneralSettings();
    }
  }, [user?.company_id]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [progressDrawerOpen, setProgressDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setAnchorEl1(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
    setAnchorEl1(null);
  };

  const handleClick1 = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl1(event.currentTarget);
  };
  const handleClose1 = () => {
    setAnchorEl1(null);
  };
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
  }, [drawerOpen]);

  const fetchAddresses = async (restorePage?: number) => {
    if (!projectId) return;
    setFetchAddress(true);
    try {
      let url = `address/get?&company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
      if (parentAddressId) {
        url += `&parent_address_id=${parentAddressId}`;
      } else {
        url += `&project_id=${projectId}`;
      }
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
        } else {
          setTotalRows(responseData.length);
        }

        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        } else if (pagMeta.last_page !== undefined) {
          setPageCount(pagMeta.last_page);
        }

        if (restorePage !== undefined) {
          setTimeout(() => {
            setPagination((prev: any) => ({ ...prev, pageIndex: restorePage }));
          }, 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch addresses", err);
    } finally {
      setFetchAddress(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAddresses();
    }
  }, [projectId, processedIds, shouldRefresh, parentAddressId, searchTerm]);

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
      const matchesProject = filters.project
        ? item?.project_names.includes(filters.project)
        : true;
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        item.progress.toLowerCase().includes(search);
      return matchesStatus && matchesSearch && matchesProject;
    });

    return filtered;
  }, [data, filters, searchTerm]);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  useEffect(() => {
    // remove processed IDs from selectedRowIds
    setSelectedRowIds((prev) => {
      const filtered = [...prev].filter((id) => !processedIds.includes(id));
      if (filtered.length === prev.size) {
        return prev;
      }
      return new Set(filtered);
    });
  }, [processedIds]);

  const handleDownloadZip = async (address: any) => {
    try {
      const response = await api.get(
        `address/download-tasks-zip/${address?.id}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `task_${address?.name}.zip`);
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
        `address/address-detail?address_id=${sidebarData?.addressId}`,
      );
      if (response.data.IsSuccess) {
        setAddress(response.data.info);
        const numericValue = Number(
          response.data.info.progress.replace("%", ""),
        );
        setRadius(numericValue ?? 0);
      }
    } catch (error) {
      console.log("error in get address detail");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgress(true);
    try {
      const payload = {
        id: sidebarData?.addressId,
        progress: radius,
      };
      const response = await api.put(
        "address/change-address-progress",
        payload,
      );
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        setProgressDrawerOpen(false);
        fetchAddresses();
      }
    } catch (error) {
      console.error("Download failed", error);
    }
    setProgress(false);
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
  const handleEdit = async (task: any) => {
    setSelectedTask(task);

    let taskProjectId = task.project_id;
    try {
      const res = await api.get(`address/address-detail?address_id=${task.id}`);
      if (res.data?.info && res.data.info.project_id) {
        taskProjectId = res.data.info.project_id;
      }
    } catch (err) {
      console.error("Failed to fetch address details for project ID");
    }

    const currentProject = projects?.find(
      (p: any) => p.id === Number(projectId) || p.id === task.project_id,
    );
    let initialRadius = task.radius || currentProject?.radius || 100;

    let initialLat = task.latitude;
    let initialLng = task.longitude;

    if (!initialLat || !initialLng) {
      const currentParent = parentAddresses
        ?.filter((item) => !item.is_conflict)
        .find((p: any) => p.id === Number(task.parent_address_id));
      if (currentParent?.lat && currentParent?.lng) {
        initialLat = currentParent.lat;
        initialLng = currentParent.lng;
      } else if (currentParent) {
        const query =
          `${currentParent?.name ?? ""} ${currentParent?.pin_code ?? ""}`.trim();
        if (query && window.google) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            const results = await new Promise<any>((resolve, reject) => {
              geocoder.geocode({ address: query }, (res, status) => {
                if (status === "OK") resolve(res);
                else reject(status);
              });
            });
            if (results?.[0]?.geometry?.location) {
              initialLat = results[0].geometry.location.lat();
              initialLng = results[0].geometry.location.lng();
            }
          } catch (err) {
            console.error("Geocoding failed", err);
          }
        }
      }
    }

    setFormData({
      id: task.id,
      name: task.name,
      lat: initialLat,
      lng: initialLng,
      radius: initialRadius,
      boundary: task.boundary,
      type: task.type,
      color: task.color,
      project_id: taskProjectId,
      parent_address_id: task.parent_address_id,
      ref: task.ref,
    });

    if (initialLat && initialLng) {
      const parsedLat = Number(initialLat);
      const parsedLng = Number(initialLng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setSelectedLocation({
          lat: parsedLat,
          lng: parsedLng,
        });
      } else {
        setSelectedLocation(null);
      }
    } else {
      setSelectedLocation(null);
    }

    setAddressEdit(true);
  };

  const handleAddCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let payload = {
        ...formData,
        type: "circle",
      };
      if (!payload.boundary && selectedLocation) {
        payload.boundary = JSON.stringify({
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          radius: formData.radius ?? defaultRadius,
        });
      }

      const result = await api.post("address/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setAddCaseDrawerOpen(false);
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          project_id: Number(projectId),
          company_id: user.company_id,
          name: "",
          radius: 0,
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

  const { isLoaded } = useJsApiLoader({
    ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const handleAddressEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let payload = {
        id: selectedTask.id,
        ...formData,
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
          radius: 0,
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
        }/address/${country}/${encodeURIComponent(query)}?format=json`,
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
          })),
        );
      } else {
        setPredictions([]);
      }
    });
  };

  const selectGooglePrediction = (
    item: { source: "google" } & google.maps.places.AutocompletePrediction,
  ) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div"),
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
          radius: formData.radius ?? defaultRadius,
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
    item: { source: "postcoder" } & PostcoderAddress,
  ) => {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode(
      { address: `${item.summaryline}, ${item.postcode}` },
      (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();

          const boundary: Boundary = {
            lat,
            lng,
            radius: formData.radius ?? defaultRadius,
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
      },
    );
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

  const parseProgress = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return Number(value.replace("%", ""));
  };

  const ClickToEditProgress: React.FC<ClickToEditProgressProps> = ({
    value,
    rowId,
    statusInt,
    editedBy,
    editedAt,
  }) => {
    const numericValue = value ? parseProgress(value) : 0;

    const [localValue, setLocalValue] = React.useState(numericValue);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    // const canEdit = user.user_role_id === 1;

    let color = "textPrimary";
    if (statusInt === 13) color = "#999999";
    else if (statusInt === 4) color = "#32A852";
    else if (statusInt === 3) color = "#FF7F00";

    const saveProgress = async () => {
      const clampedValue = Math.min(100, Math.max(0, localValue));

      if (clampedValue === numericValue) {
        setIsEditing(false);
        setIsHovering(false);
        return;
      }

      try {
        setLoading(true);
        await api.put("address/change-address-progress", {
          id: rowId,
          progress: clampedValue,
        });
        fetchAddresses();
      } catch {
        setLocalValue(numericValue);
      } finally {
        setLoading(false);
        setIsEditing(false);
        setIsHovering(false);
      }
    };

    return (
      <Box
        sx={{ display: "flex", alignItems: "center", position: "relative" }}
        // onMouseEnter={() => canEdit && setIsHovering(true)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          if (!isEditing) setIsHovering(false);
        }}
      >
        {editedBy && editedAt && (
          <Tooltip
            title={`Modified by ${editedBy} on ${editedAt.slice(0, 16)}`}
            arrow
            placement="top"
          >
            <Box
              onMouseEnter={() => {
                if (!isEditing) setIsHovering(false);
              }}
              onMouseLeave={() => {
                if (!isEditing) setIsHovering(false);
              }}
              sx={{
                position: "absolute",
                left: "-15px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <IconPointFilled size={16} style={{ color: "#ff9800" }} />
            </Box>
          </Tooltip>
        )}

        {/*{canEdit && (isHovering || isEditing) ? (*/}
        {isHovering || isEditing ? (
          <TextField
            type="text"
            size="small"
            inputProps={{
              maxLength: 3,
              min: 0,
              max: 100,
              inputMode: "numeric",
              pattern: "[0-9]*",
            }}
            value={localValue}
            autoFocus={isEditing}
            disabled={loading}
            onChange={(e) => setLocalValue(Number(e.target.value) || 0)}
            onFocus={() => setIsEditing(true)}
            onBlur={saveProgress}
            onKeyDown={(e) => e.key === "Enter" && saveProgress()}
            sx={{
              width: 56,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isEditing ? "#1976d2" : "transparent",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1976d2",
              },
              "& .MuiInputBase-input": {
                textAlign: "center",
                p: "6px",
              },
            }}
          />
        ) : (
          <Typography
            fontWeight={700}
            color={color}
            // sx={{ px: 1.5, cursor: canEdit ? "pointer" : "default" }}
            sx={{ px: 1.5, cursor: "pointer" }}
            // onMouseEnter={() => canEdit && setIsHovering(true)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => !isEditing && setIsHovering(false)}
            // onClick={() => canEdit && setIsEditing(true)}
            onClick={() => setIsEditing(true)}
          >
            {value}
          </Typography>
        )}
      </Box>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress < 25) return "#FF0000";
    if (progress < 50) return "#FF7A00";
    if (progress < 75) return "#FFD700";
    return "#32A852";
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
                selectedRowIds.size === currentFilteredData.length &&
                currentFilteredData.length > 0
              }
              indeterminate={
                selectedRowIds.size > 0 &&
                selectedRowIds.size < currentFilteredData.length
              }
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const isChecked = e.target.checked;

                if (isChecked) {
                  setSelectedRowIds(
                    new Set(currentFilteredData.map((row) => row.id)),
                  );
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
            <Typography variant="subtitle2" fontWeight="inherit">
              Title
            </Typography>
          </Stack>
        ),
        enableSorting: true,
        cell: ({ row }) => {
          const item = row.original;
          const isProcessed = processedIds.includes(item.id);
          const isChecked = selectedRowIds.has(item.id);

          return (
            <Stack direction="row" alignItems="center" spacing={4}>
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
                {item.parent_addresses_name}
              </Typography>
            </Stack>
          );
        },
      }),

      columnHelper.accessor("project_name", {
        id: "project",
        header: () => "Project",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue()}
          </Typography>
        ),
      }),

      columnHelper.accessor("progress", {
        id: "progress",
        header: () => "Progress",
        cell: (info) => {
          const item = info.row.original;

          return (
            <ClickToEditProgress
              value={info.getValue() as string}
              rowId={item.id}
              statusInt={item.status_int}
              editedBy={item.editedBy ?? undefined}
              editedAt={item.edited_at ?? undefined}
            />
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

      columnHelper.accessor("case_id", {
        id: "caseID",
        header: () => "Case Id",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
            {info.getValue() ?? "-"}
          </Typography>
        ),
      }),

      columnHelper.accessor("ref", {
        id: "reference",
        header: () => "Reference",
        cell: (info) => (
          <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
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
                    onClick={() => handleDownloadZip(info.row.original)}
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
    [data, selectedRowIds, hoveredRow, showAllCheckboxes, processedIds],
  );

  const {
    table,
    pagination,
    setPagination,
    totalRows,
    setTotalRows,
    pageCount,
    setPageCount,
  } = useServerTable({
    data: currentFilteredData,
    columns,
    fetchData: fetchAddresses,
  });

  useEffect(() => {
    if (onTableReady) onTableReady(table);
    table.setPageIndex(0);
  }, [table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems={"center"}
        >
          <Box display={"flex"} gap={1} alignItems={"center"}>
            <IconButton onClick={() => onClose()}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              Cases
            </Typography>
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
                      <IconSearch size={"16"} />
                    </InputAdornment>
                  ),
                },
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
          <Box>
            {selectedRowIds.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrash width={18} />}
                onClick={() => setOpenDialog(true)}
              >
                Archive
              </Button>
            )}
            <IconButton onClick={handleClick} size="small">
              <IconDotsVertical width={18} />
            </IconButton>
            <IconButton onClick={() => onClose()}>
              <IconX />
            </IconButton>
          </Box>
        </Stack>
        <Box display="flex" justifyContent="flex-end" mb={1} pr={2}>
          <Menu
            id="basic-menu-cases"
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleClose}
          >
            <MenuItem
              onClick={async () => {
                handleClose();
                const currentParent = parentAddresses
                  .filter((item) => !item.is_conflict)
                  .find((p: any) => p.id === Number(parentAddressId));
                const currentProject = projects?.find(
                  (p: any) => p.id === Number(projectId),
                );

                let initialLat: any = undefined;
                let initialLng: any = undefined;
                let initialRadius = currentProject?.radius ?? 100;
                let initialColor: string | undefined = undefined;
                let initialName = "";

                if (parentAddressId) {
                  if (data && data.length > 0) {
                    // Use first case's data
                    const firstCase = data[0];
                    initialName = firstCase.parent_addresses_name || "";
                    initialLat = firstCase.lat || firstCase.latitude;
                    initialLng = firstCase.lng || firstCase.longitude;
                    initialRadius = firstCase.radius || 100;
                    initialColor = firstCase.color;
                  } else {
                    if (currentParent?.lat && currentParent?.lng) {
                      initialLat = currentParent.lat;
                      initialLng = currentParent.lng;
                      initialName = currentParent.name || "";
                    } else {
                      const query =
                        `${currentParent?.name ?? ""} ${currentParent?.pin_code ?? ""}`.trim();
                      initialName = currentParent?.name || "";
                      if (query && window.google) {
                        try {
                          const geocoder = new window.google.maps.Geocoder();
                          const results = await new Promise<any>(
                            (resolve, reject) => {
                              geocoder.geocode(
                                { address: query },
                                (res, status) => {
                                  if (status === "OK") resolve(res);
                                  else reject(status);
                                },
                              );
                            },
                          );
                          if (results?.[0]?.geometry?.location) {
                            initialLat = results[0].geometry.location.lat();
                            initialLng = results[0].geometry.location.lng();
                          }
                        } catch (err) {
                          console.error("Geocoding failed", err);
                        }
                      }
                    }
                  }
                }

                setFormData({
                  project_id: parentAddressId
                    ? null
                    : projectId
                      ? Number(projectId)
                      : null,
                  parent_address_id: parentAddressId ? parentAddressId : null,
                  company_id: user.company_id,
                  name: initialName,
                  radius: initialRadius,
                  color: initialColor,
                  lat: initialLat,
                  lng: initialLng,
                });

                if (
                  initialLat !== undefined &&
                  initialLng !== undefined &&
                  initialLat !== null &&
                  initialLng !== null
                ) {
                  setSelectedLocation({
                    lat: parseFloat(String(initialLat)),
                    lng: parseFloat(String(initialLng)),
                  });
                } else {
                  setSelectedLocation(null);
                }

                setAddCaseDrawerOpen(true);
              }}
            >
              <ListItemIcon>
                <IconPlus width={18} />
              </ListItemIcon>
              Add Case
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleClose();
                setArchiveList(true);
              }}
            >
              <ListItemIcon>
                <IconNotes width={18} />
              </ListItemIcon>
              Archive Case List
            </MenuItem>
          </Menu>
        </Box>
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
              {fetchAddress ? (
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
        {data.length ? <Divider /> : <></>}
      </Box>
      <Divider />

      <TablePaginationFooter
        selectedCount={
          typeof selectedRowIds !== "undefined"
            ? selectedRowIds.size
            : undefined
        }
        table={table}
        totalRows={table.getPrePaginationRowModel().rows.length}
      />

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
                    anchorEl={anchorEl1}
                    open={openMenu1}
                    onClose={handleClose1}
                    slotProps={{
                      list: {
                        "aria-labelledby": "basic-button",
                      },
                    }}
                  >
                    {/* <MenuItem onClick={handleClose}>
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
                    </MenuItem> */}
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
                    aria-controls={openMenu1 ? "basic-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu1 ? "true" : undefined}
                    onClick={handleClick1}
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
                  addressName={sidebarData.addressName}
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

      {/* Filter Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
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

            {projects && (
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
                {projects?.map((p, i) => (
                  <MenuItem key={i} value={p.name}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setTempFilters({
                project: "",
                status: "",
              });
              setFilters({
                project: "",
                status: "",
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
                      Change Progress
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ lg: 12, xs: 12 }} mt={2}>
                  <Typography variant="h6" color="inherit" ml={1}>
                    Progress
                  </Typography>
                  <Box display={"flex"} gap={2}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      style={{
                        width: "100%",
                        height: "10px",
                        appearance: "none",
                        background: `linear-gradient(
                                      to right,
                                      ${getProgressColor(radius ?? 0)} ${radius ?? 0}%,
                                      #eee ${radius ?? 0}%
                                      )`,
                        borderRadius: "5px",
                        outline: "none",
                        cursor: "pointer",
                        marginBottom: 2,
                        marginLeft: 1,
                      }}
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
                  disabled={progress}
                  sx={{ borderRadius: 3 }}
                  className="drawer_buttons"
                >
                  {progress ? "Saving..." : "Save"}
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
                      Edit Case
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Autocomplete
                      fullWidth
                      options={projects || []}
                      value={
                        (projects || []).find(
                          (p: any) => p.id === formData.project_id,
                        ) || null
                      }
                      onChange={(e, newVal: any) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          project_id: newVal ? newVal.id : null,
                        }))
                      }
                      getOptionLabel={(option: any) => option.name}
                      isOptionEqualToValue={(option: any, value: any) =>
                        option.id === value.id
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Project"
                          placeholder="Project"
                        />
                      )}
                    />
                  </Box>

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
                        Area size [{formData?.radius} Meter]
                      </Typography>
                      <CustomRangeSlider
                        value={formData?.radius || 0}
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
                        <Marker
                          position={selectedLocation}
                          draggable
                          onDragEnd={(e) => {
                            const lat = e.latLng?.lat();
                            const lng = e.latLng?.lng();
                            if (!lat || !lng) return;

                            setSelectedLocation({ lat, lng });

                            setFormData((prev: any) => ({
                              ...prev,
                              lat,
                              lng,
                              boundary: JSON.stringify({
                                lat,
                                lng,
                                radius: prev.radius,
                              }),
                            }));
                          }}
                        />

                        <Circle
                          center={selectedLocation}
                          radius={formData.radius}
                          options={{
                            draggable: true,
                            editable: true,
                            fillColor: formData.color ?? "#FF0000",
                            fillOpacity: 0.3,
                            strokeColor: formData.color ?? "#FF0000",
                            strokeOpacity: 1,
                            strokeWeight: 1,
                          }}
                          onLoad={(circle) => {
                            circleRef.current = circle;
                          }}
                          onCenterChanged={() => {
                            if (!circleRef.current) return;

                            const center = circleRef.current.getCenter();
                            if (!center) return;

                            const lat = center.lat();
                            const lng = center.lng();

                            if (
                              lastCenterRef.current &&
                              lastCenterRef.current.lat === lat &&
                              lastCenterRef.current.lng === lng
                            ) {
                              return;
                            }

                            lastCenterRef.current = { lat, lng };

                            setSelectedLocation({ lat, lng });

                            setFormData((prev: any) => ({
                              ...prev,
                              lat,
                              lng,
                              boundary: JSON.stringify({
                                lat,
                                lng,
                                radius: prev.radius,
                              }),
                            }));
                          }}
                          onRadiusChanged={() => {
                            if (!circleRef.current) return;

                            const newRadius = Math.round(
                              circleRef.current.getRadius(),
                            );

                            if (lastRadiusRef.current === newRadius) return;

                            lastRadiusRef.current = newRadius;

                            setFormData((prev: any) => ({
                              ...prev,
                              radius: newRadius,
                              boundary: JSON.stringify({
                                lat: selectedLocation.lat,
                                lng: selectedLocation.lng,
                                radius: newRadius,
                              }),
                            }));
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
                      <Box mt={2}>
                        <CustomTextField
                          fullWidth
                          label="Reference"
                          value={formData.ref || ""}
                          onChange={(e: any) =>
                            setFormData((prev: any) => ({
                              ...prev,
                              ref: e.target.value,
                            }))
                          }
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

      <Drawer
        anchor="right"
        open={addCaseDrawerOpen}
        onClose={() => setAddCaseDrawerOpen(false)}
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
            <form onSubmit={handleAddCaseSubmit} className="address-form">
              <Grid container>
                <Grid size={{ xs: 12 }}>
                  <Box
                    display={"flex"}
                    alignContent={"center"}
                    alignItems={"center"}
                    flexWrap={"wrap"}
                  >
                    <IconButton onClick={() => setAddCaseDrawerOpen(false)}>
                      <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" color="inherit" fontWeight={700}>
                      Add Case
                    </Typography>
                  </Box>

                  {parentAddressId && (
                    <Box mb={2} mt={2}>
                      <Autocomplete
                        fullWidth
                        options={projects || []}
                        value={
                          (projects || []).find(
                            (p: any) => p.id === formData.project_id,
                          ) || null
                        }
                        onChange={(e, newVal: any) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            project_id: newVal ? newVal.id : null,
                          }))
                        }
                        getOptionLabel={(option: any) => option.name}
                        isOptionEqualToValue={(option: any, value: any) =>
                          option.id === value.id
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Project"
                            placeholder="Project"
                          />
                        )}
                      />
                    </Box>
                  )}

                  {!parentAddressId && (
                    <Box mb={2} mt={2}>
                      <Autocomplete
                        fullWidth
                        options={
                          parentAddresses.filter((item) => !item.is_conflict) ||
                          []
                        }
                        value={
                          parentAddresses
                            ?.filter((item) => !item.is_conflict)
                            .find(
                              (p: any) => p.id === formData.parent_address_id,
                            ) || null
                        }
                        onChange={async (e, newVal: any) => {
                          if (!newVal) {
                            setFormData((prev: any) => ({
                              ...prev,
                              parent_address_id: null,
                              name: "",
                              lat: null,
                              lng: null,
                            }));
                            setSelectedLocation(null);
                            return;
                          }

                          let newLat: any = undefined;
                          let newLng: any = undefined;
                          const currentProject = projects?.find(
                            (p: any) => p.id === Number(projectId),
                          );
                          let newRadius = currentProject?.radius ?? 100;
                          let newColor: string | undefined = undefined;
                          let newName = "";

                          const existingCases = data.filter(
                            (c: any) => c.parent_address_id === newVal.id,
                          );

                          if (existingCases && existingCases.length > 0) {
                            const firstCase = existingCases[0];
                            newName =
                              firstCase.parent_addresses_name ||
                              newVal.name ||
                              "";
                            newLat = firstCase.lat || firstCase.latitude;
                            newLng = firstCase.lng || firstCase.longitude;
                            newRadius = firstCase.radius || 100;
                            newColor = firstCase.color;
                          } else {
                            if (newVal.lat && newVal.lng) {
                              newLat = newVal.lat;
                              newLng = newVal.lng;
                              newName = newVal.name || "";
                            } else {
                              const query =
                                `${newVal.name ?? ""} ${newVal.pin_code ?? ""}`.trim();
                              newName = newVal.name || "";
                              if (query && window.google) {
                                try {
                                  const geocoder =
                                    new window.google.maps.Geocoder();
                                  const results = await new Promise<any>(
                                    (resolve, reject) => {
                                      geocoder.geocode(
                                        { address: query },
                                        (res, status) => {
                                          if (status === "OK") resolve(res);
                                          else reject(status);
                                        },
                                      );
                                    },
                                  );
                                  if (results?.[0]?.geometry?.location) {
                                    newLat = results[0].geometry.location.lat();
                                    newLng = results[0].geometry.location.lng();
                                  }
                                } catch (err) {
                                  console.error("Geocoding failed", err);
                                }
                              }
                            }
                          }

                          setFormData((prev: any) => ({
                            ...prev,
                            parent_address_id: newVal.id,
                            name: newName,
                            radius: newRadius,
                            lat: newLat !== undefined ? newLat : null,
                            lng: newLng !== undefined ? newLng : null,
                            ...(newColor ? { color: newColor } : {}),
                          }));

                          if (
                            newLat !== undefined &&
                            newLng !== undefined &&
                            newLat !== null &&
                            newLng !== null
                          ) {
                            setSelectedLocation({
                              lat: parseFloat(String(newLat)),
                              lng: parseFloat(String(newLng)),
                            });
                          } else {
                            setSelectedLocation(null);
                          }
                        }}
                        getOptionLabel={(option: any) => option.name || ""}
                        isOptionEqualToValue={(option: any, value: any) =>
                          option.id === value?.id
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Address"
                            placeholder="Address"
                          />
                        )}
                      />
                    </Box>
                  )}
                  {parentAddressId && (
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      gap={1}
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
                  )}

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
                        Area size [{formData?.radius} Meter]
                      </Typography>
                      <CustomRangeSlider
                        value={formData?.radius || 0}
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
                        <Marker
                          position={selectedLocation}
                          draggable
                          onDragEnd={(e) => {
                            const lat = e.latLng?.lat();
                            const lng = e.latLng?.lng();
                            if (!lat || !lng) return;

                            setSelectedLocation({ lat, lng });

                            setFormData((prev: any) => ({
                              ...prev,
                              lat,
                              lng,
                              boundary: JSON.stringify({
                                lat,
                                lng,
                                radius: prev.radius,
                              }),
                            }));
                          }}
                        />

                        <Circle
                          center={selectedLocation}
                          radius={formData.radius}
                          options={{
                            draggable: true,
                            editable: true,
                            fillColor: formData.color ?? "#FF0000",
                            fillOpacity: 0.3,
                            strokeColor: formData.color ?? "#FF0000",
                            strokeOpacity: 1,
                            strokeWeight: 1,
                          }}
                          onLoad={(circle) => {
                            circleRef.current = circle;
                          }}
                          onCenterChanged={() => {
                            if (!circleRef.current) return;

                            const center = circleRef.current.getCenter();
                            if (!center) return;

                            const lat = center.lat();
                            const lng = center.lng();

                            if (
                              lastCenterRef.current &&
                              lastCenterRef.current.lat === lat &&
                              lastCenterRef.current.lng === lng
                            ) {
                              return;
                            }

                            lastCenterRef.current = { lat, lng };

                            setSelectedLocation({ lat, lng });

                            setFormData((prev: any) => ({
                              ...prev,
                              lat,
                              lng,
                              boundary: JSON.stringify({
                                lat,
                                lng,
                                radius: prev.radius,
                              }),
                            }));
                          }}
                          onRadiusChanged={() => {
                            if (!circleRef.current) return;

                            const newRadius = Math.round(
                              circleRef.current.getRadius(),
                            );

                            if (lastRadiusRef.current === newRadius) return;

                            lastRadiusRef.current = newRadius;

                            setFormData((prev: any) => ({
                              ...prev,
                              radius: newRadius,
                              boundary: JSON.stringify({
                                lat: selectedLocation.lat,
                                lng: selectedLocation.lng,
                                radius: newRadius,
                              }),
                            }));
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
                  onClick={() => setAddCaseDrawerOpen(false)}
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

      <ArchiveAddress
        open={archiveList}
        parentAddressId={parentAddressId}
        onClose={() => setArchiveList(false)}
        onWorkUpdated={fetchAddresses}
      />

      {/* Dialogs and Drawers */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to archive {selectedRowIds.size} case?
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
                const payload = {
                  address_ids: Array.from(selectedRowIds).join(","),
                };
                const res = await api.post(
                  "address/archive-addresses",
                  payload,
                );

                if (res.data.IsSuccess) {
                  toast.success("Cases archived successfully.");
                }
                fetchAddresses();
                setSelectedRowIds(new Set());
              } catch (error) {
                console.error(error);
                toast.error("Error archiving addresses.");
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
    </Box>
  );
};

export default AddressesList;
