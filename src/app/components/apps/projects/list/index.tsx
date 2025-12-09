"use client";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
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
  Tabs,
  Tab,
  Drawer,
  Autocomplete,
  CircularProgress,
  ListItem,
  ListItemButton,
  List,
  MenuItem,
  Menu,
  ListItemIcon,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  IconChartPie,
  IconChevronRight,
  IconDotsVertical,
  IconFilter,
  IconPencil,
  IconPlus,
  IconSearch,
  IconX,
  IconArrowLeft,
  IconTrash,
  IconLocation,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import AddressesList from "./addresses-list";
import TasksList from "./tasks-list";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Cookies from "js-cookie";
import CreateProjectTask from "../tasks";
import "react-day-picker/dist/style.css";
import "../../../../global.css";
import DynamicGantt from "@/app/components/DynamicGantt";
import ArchiveAddress from "./archive-address-list";
import CreateProject from "../create";
import {
  Circle,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import CustomRangeSlider from "@/app/components/forms/theme-elements/CustomRangeSlider";
import EditProject from "../edit";
import ArchiveProject from "./archive-project-list";
import PermissionGuard from "@/app/auth/PermissionGuard";
import MapGantt from "@/app/components/MapGantt";
import { IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import { IconNotes } from "@tabler/icons-react";
import { IconTableColumn } from "@tabler/icons-react";

dayjs.extend(customParseFormat);

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
};

interface ProjectListingProps {
  projectId: number | null;
}

export interface TradeList {
  id: number;
  name: string;
}

const GOOGLE_MAP_LIBRARIES: (
  | "places"
  | "drawing"
  | "geometry"
  | "visualization"
)[] = ["places", "drawing"];

interface Boundary {
  lat: number;
  lng: number;
  radius: number;
}

interface ProjectFormData {
  name: string;
  address: string;
  budget: string;
  description?: string;
  code: number;
  shift_ids: string;
  team_ids: string;
  company_id: number;
  workzone_ids?: string;
}

interface FormData {
  name: string;
  address: string;
  budget: string;
  description?: string;
  code: number;
  shift_ids: string;
  team_ids: string;
  company_id: number;
  workzone_ids?: string;
}

const TablePagination: React.FC<ProjectListingProps> = ({}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectedRows = (ids: number[]) => {
    setSelectedIds(ids);
  };

  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "", sortOrder: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiveList, setArchiveList] = useState<boolean>(false);
  const [archiveProjectList, setArchiveProjectList] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectList | null>(
    null
  );
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [data, setData] = useState<ProjectList[]>([]);
  const [project, setProject] = useState<ProjectList[]>([]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [mapOpen, setMapOpen] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [processedIds, setProcessedIds] = useState<number[]>([]);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const openMenu = Boolean(anchorEl);
  const status = ["Completed", "To Do", "In Progress"];
  const [isSaving, setIsSaving] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const COOKIE_PREFIX = "project_";
  const projectID = Cookies.get(COOKIE_PREFIX + user.id + user.company_id);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [columnVisibility, setColumnVisibilityState] = useState<
    Record<string, boolean>
  >({});
  const [update, setUpdate] = useState(0);
  const [currentTable, setCurrentTable] = useState<any>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [radius, setRadius] = useState(100);
  const [typedAddress, setTypedAddress] = useState(false);
  const [formData, setFormData] = useState<any>({
    project_id: Number(projectID),
    company_id: user.company_id,
    name: "",
  });

  // For create
  const initialCreateState: ProjectFormData = {
    name: "",
    address: "",
    budget: "",
    description: "",
    code: 0,
    shift_ids: "",
    team_ids: "",
    company_id: user.company_id || 0,
    workzone_ids: "",
  };

  // For edit
  const initialEditState: ProjectFormData = {
    ...initialCreateState,
  };

  const [createFormData, setCreateFormData] =
    useState<ProjectFormData>(initialCreateState);
  const [editFormData, setEditFormData] =
    useState<ProjectFormData>(initialEditState);

  const triggerRefresh = () => {
    setShouldRefresh((prev) => !prev);
  };

  const handleRowClick = () => {
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
  };

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

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
  }, [drawerOpen,user?.company_id]);

  useEffect(() => {
    if (projectId) {
      setFormData((prev: any) => ({
        ...prev,
        project_id: projectId,
      }));
    }
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        setProject(res.data.info);
        const cookieProjectId = Cookies.get(
          COOKIE_PREFIX + user.id + user.company_id
        );
        const validProjectId = res.data.info.some(
          (p: any) => p.id === Number(cookieProjectId)
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
    }
  }, [projectID,fetchProjects]);

  useEffect(() => {
    if (projectId && user?.id) {
      Cookies.set(
        COOKIE_PREFIX + user.id + user.company_id,
        projectId.toString(),
        { expires: 30 }
      );
    }
  }, [projectId, user?.id, user.company_id]);

  const fetchAddresses = async () => {
    if (!projectID) return;
    setLoading(true);
    try {
      const res = await api.get(`address/get?project_id=${Number(projectID)}`);
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
    if (projectID) {
      fetchAddresses();
    }
  }, [value,fetchAddresses]);

  // const fetchArchiveAddress = async () => {
  //   if (!projectId) return;
  //   try {
  //     const res = await api.get(`address/archive-list?project_id=${projectId}`);
  //     if (res.data) {
  //       setData(res.data.info);
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch archive addresses", err);
  //   }
  // };

  // useEffect(() => {
  //   if (projectId) {
  //     fetchArchiveAddress();
  //   }
  // }, [archiveList]);

  const fetchHistories = async () => {
    try {
      const res = await api.get(
        `project/get-history?project_id=${Number(projectID)}`
      );
      if (res.data?.info) {
        setHistory(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  useEffect(() => {
    if (!Number.isNaN(projectID) && projectID !== null && openDrawer == true) {
      fetchHistories();
    }
  }, [openDrawer == true && !Number.isNaN(projectID)]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleOpenCreateDrawer = () => {
    setFormData({
      address_id: null,
      type_of_work_id: null,
      location_id: null,
      trade_id: null,
      company_id: user?.company_id || 0,
      duration: 0,
      rate: 0,
      is_attchment: true,
      tasks: [],
    });
    setDrawerOpen(true);
  };

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
        setLoading(true);
        triggerRefresh();
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          address_id: null,
          type_of_work_id: null,
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
      console.error("Error creating task:", error);
      setLoading(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        project_id: projectId,
        type: "circle",
      };
      const result = await api.post("address/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setSidebar(false);
        setLoading(true);
        triggerRefresh();
        setTimeout(() => {
          setLoading(false);
        }, 100);
        setFormData({
          project_id: Number(projectID),
          company_id: user.company_id,
          name: "",
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

  async function archiveProjectApi(id: number) {
    try {
      const payload = { id: id };
      const result = await api.post("project/archive", payload);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...createFormData,
        company_id: user.company_id,
        budget: Number(createFormData.budget),
      };

      const result = await api.post("project/create", payload);

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setCreateFormData({
          ...initialCreateState,
          company_id: user.company_id ?? 0,
        });
        fetchProjects();
        setProjectOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...editFormData,
        company_id: user.company_id,
        budget: Number(editFormData.budget),
      };

      const result = await api.put("project/update", payload);

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setEditFormData({
          ...initialEditState,
          company_id: user.company_id ?? 0,
        });
        fetchProjects();
        setProjectEditOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (projectOpen) {
      setFormData({
        name: "",
        address: "",
        budget: "",
        description: "",
        code: "",
        shift_ids: "",
        team_ids: "",
        company_id: user.company_id,
        is_pricework: false,
        repeatable_job: false,
      });
    }
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

  useEffect(() => {
    if (projectId && archiveList == false) {
      triggerRefresh();
    }
  }, [project, archiveList, projectId]);

  const formatDate = (date: string | undefined) => {
    return dayjs(date ?? "").isValid() ? dayjs(date).format("DD/MM/YYYY") : "-";
  };

  const paginatedFeeds = history?.slice(0, page * limit) || [];

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: GOOGLE_MAP_LIBRARIES,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
  };

  const handleSearchClick = () => {
    if (formData.name.trim() === "") {
      setPredictions([]);
      return;
    }
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: formData.name }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
    setTypedAddress(true);
  };

  const selectPrediction = (placeId: string) => {
    const service = new google.maps.places.PlacesService(
      document.createElement("div")
    );
    service.getDetails({ placeId }, (place, status) => {
      if (
        status === google.maps.places.PlacesServiceStatus.OK &&
        place?.geometry?.location
      ) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setFormData({ ...formData, lat: lat, lng: lng });
        const newBoundary: Boundary = { lat, lng, radius };
        setSelectedLocation({ lat, lng });
        setFormData({
          ...formData,
          name: place.formatted_address || "",
          lat,
          lng,
          boundary: JSON.stringify(newBoundary),
        });
        setPredictions([]);
      }
    });
  };

  const handleRadiusChange = (event: Event, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setRadius(value);
    if (selectedLocation) {
      const newBoundary: Boundary = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        radius: value,
      };
      setFormData({
        ...formData,
        boundary: JSON.stringify(newBoundary),
      });
    }
  };

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

  return (
    <PermissionGuard permission="Projects">
      <Box>
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
            <Autocomplete
              id="project_id"
              options={[]}
              open={false}
              onOpen={() => setDialogOpen(true)}
              value={
                project.find((project) => project.id === projectId) ?? null
              }
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              sx={{ flex: { xs: "1 1 100%", sm: "0 0 auto" }, minWidth: 150 }}
              renderInput={(params) => (
                <CustomTextField
                  {...params}
                  InputProps={{
                    ...params.InputProps,
                    readOnly: true,
                    style: { caretColor: "transparent" },
                  }}
                  placeholder="Projects"
                  className="project-selection"
                  onClick={() => setDialogOpen(true)}
                />
              )}
            />

            <Box
              sx={{
                display: "flex",
                flex: { xs: "1 1 100%", sm: "0 0 auto" },
                mt: { xs: 1, sm: 0 },
              }}
            >
              <Tabs
                value={value}
                onChange={handleTabChange}
                aria-label="minimal-tabs"
                sx={{
                  minHeight: 36,
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#007bff",
                    height: 2,
                  },
                  "& .MuiTab-root": {
                    minHeight: 36,
                    textTransform: "none",
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#555",
                    padding: "0 8px",
                  },
                  "& .Mui-selected": {
                    color: "#007bff",
                    fontWeight: 600,
                  },
                  flexWrap: "wrap",
                }}
              >
                <Tab label="Addresses" />
                <Tab label="Tasks" />
              </Tabs>
            </Box>

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
              sx={{ width: { xs: "90%", sm: "50%", md: "30%", lg: "25%" } }}
            />

            <Button
              variant="contained"
              onClick={() => setOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconFilter width={18} />
            </Button>

            <Button
              color="primary"
              variant="outlined"
              onClick={() => setOpenDrawer(true)}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              Activity
            </Button>

            <IconButton
              onClick={() => handleRowClick()}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconChartPie size={24} />
            </IconButton>

            <IconButton
              onClick={() => setMapOpen(true)}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              <IconMapPin size={24} />
            </IconButton>
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
              <IconButton onClick={handlePopoverOpen} sx={{ ml: 1 }}>
                <IconTableColumn />
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
                  {currentTable
                    ?.getAllLeafColumns()
                    .filter((col: any) => !["conflicts"].includes(col.id)) // Exclude conflicts
                    .filter(
                      (col: any) =>
                        col.id.toLowerCase().includes(search.toLowerCase()) // Filter by search term
                    )
                    .map((col: any) => (
                      <FormControlLabel
                        key={col.id}
                        control={
                          <Checkbox
                            checked={
                              columnVisibility[col.id] ?? col.getIsVisible()
                            } // Bind checkbox state to local visibility state
                            onChange={(e) => {
                              if (!currentTable) return;

                              const newVisibility = {
                                ...columnVisibility,
                                [col.id]: e.target.checked, // Update the visibility of this column
                              };

                              setColumnVisibilityState(newVisibility); // Update the local visibility state
                              currentTable.setColumnVisibility(newVisibility); // Apply it to the table
                              setUpdate((u) => u + 1); // Trigger re-render to update the UI
                            }}
                            disabled={col.id === "conflicts"} // Optionally disable some columns
                          />
                        }
                        label={
                          col.columnDef.meta?.label ||
                          (typeof col.columnDef.header === "string"
                            ? col.columnDef.header
                            : col.id
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str: string) =>
                                  str.toUpperCase()
                                )
                                .trim())
                        }
                      />
                    ))}
                </FormGroup>
              </Popover>

              <IconButton onClick={handleClick} size="small">
                <IconDotsVertical width={18} />
              </IconButton>
            </Box>

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
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSidebar(true);
                  }}
                  style={{
                    color: "#11142D",
                    textTransform: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ListItemIcon>
                    <IconLocation width={18} />
                  </ListItemIcon>
                  Add Address
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchiveList(true);
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
                  Archive address list
                </Link>
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <Link
                  color="body1"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setArchiveProjectList(true);
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
                  Archive project list
                </Link>
              </MenuItem>
            </Menu>

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
                    <MenuItem value="">All</MenuItem>
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
                      status: "",
                      sortOrder: "",
                    });
                    setFilters({
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

        <Divider />

        {/* Add task drawer */}
        <CreateProjectTask
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleTaskSubmit={handleTaskSubmit}
          trade={trade}
          isSaving={isSaving}
          address_id={null}
          projectId={projectId}
        />

        {/* Add Address Drawer */}
        <Drawer
          anchor="right"
          open={sidebar}
          onClose={() => setSidebar(false)}
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
              <form onSubmit={handleSubmit} className="address-form">
                <Grid container mt={3}>
                  <Grid size={{ xs: 12 }}>
                    <Box
                      display={"flex"}
                      alignContent={"center"}
                      alignItems={"center"}
                      flexWrap={"wrap"}
                    >
                      <IconButton onClick={() => setSidebar(false)}>
                        <IconArrowLeft />
                      </IconButton>
                      <Typography variant="h6" color="inherit" fontWeight={700}>
                        Add Address
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

                    {/* Display address predictions */}
                    {typedAddress && predictions.length > 0 && (
                      <List
                        sx={{
                          border: "1px solid #ccc",
                          maxHeight: 200,
                          overflow: "auto",
                          marginTop: 1,
                        }}
                      >
                        {predictions.map((prediction) => (
                          <ListItem key={prediction.place_id} disablePadding>
                            <ListItemButton
                              onClick={() =>
                                selectPrediction(prediction.place_id)
                              }
                            >
                              {prediction.description}
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
                          Area size [{radius} Meter]
                        </Typography>
                        <CustomRangeSlider
                          value={radius}
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
                            radius={radius}
                            options={{
                              fillColor: "#FF0000",
                              fillOpacity: 0.3,
                              strokeColor: "#FF0000",
                              strokeOpacity: 1,
                              strokeWeight: 1,
                            }}
                          />
                        </GoogleMap>
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
                    onClick={() => setSidebar(false)}
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

        {/* Tab Content - Addresses and Tasks */}
        {value === 0 && (
          <AddressesList
            projectId={Number(projectID)}
            searchTerm={searchTerm}
            filters={filters}
            onSelectionChange={handleSelectedRows}
            processedIds={processedIds}
            shouldRefresh={shouldRefresh}
            onTableReady={(tableInstance: any) =>
              setCurrentTable(tableInstance)
            }
          />
        )}
        {value === 1 && (
          <TasksList
            projectId={projectId}
            searchTerm={searchTerm}
            filters={filters}
            shouldRefresh={shouldRefresh}
            onUpdate={triggerRefresh}
            onTableReady={(tableInstance: any) =>
              setCurrentTable(tableInstance)
            }
          />
        )}

        {/* Gantt Chart Drawer */}
        <Drawer
          anchor="bottom"
          open={detailsOpen}
          onClose={closeDetails}
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
            onClose={closeDetails}
            projectId={projectId}
            companyId={user.company_id ?? null}
          />
        </Drawer>

        {/* Location Drawer */}
        <Drawer
          anchor="bottom"
          open={mapOpen}
          onClose={() => setMapOpen(false)}
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
          <MapGantt
            open={mapOpen}
            onClose={() => setMapOpen(false)}
            projectId={projectId}
            companyId={user.company_id ?? null}
          />
        </Drawer>

        {/* Archive Address Confirmation Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>Confirm Archive</DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              Are you sure you want to archive selected addresses?
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
                    address_ids: selectedIds.join(","),
                  };
                  const response = await api.post(
                    "address/archive-addresses",
                    payload
                  );
                  toast.success(response.data.message);
                  setProcessedIds((prev) => [...prev, ...selectedIds]);
                  setSelectedIds([]);
                  await fetchAddresses();
                } catch (error) {
                } finally {
                  setOpenDialog(false);
                }
              }}
              variant="outlined"
              color="error"
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>

        {/* Archive Address List */}
        <ArchiveAddress
          open={archiveList}
          projectId={projectId}
          onClose={() => setArchiveList(false)}
          onWorkUpdated={fetchAddresses}
        />

        {/* Archive Project List */}
        <ArchiveProject
          open={archiveProjectList}
          companyId={Number(user.company_id)}
          onClose={() => setArchiveProjectList(false)}
          onWorkUpdated={fetchProjects}
        />

        {/* Project Selection Drawer */}
        <Drawer
          anchor="left"
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          PaperProps={{
            sx: {
              width: 350,
              maxWidth: "100%",
            },
          }}
        >
          <Box sx={{ position: "relative", p: 2 }}>
            {/* Add Project Button */}
            <Button
              color="primary"
              variant="outlined"
              onClick={() => {
                setProjectOpen(true);
              }}
              startIcon={<IconPlus size={18} />}
              sx={{ mb: 1, ml: 2 }}
            >
              Add Project
            </Button>

            {/* Delete Project Confirmation Dialog */}
            <Dialog
              open={deleteDialogOpen}
              onClose={() => setDeleteDialogOpen(false)}
            >
              <DialogTitle>
                <Typography>Archive Project</Typography>
                <IconButton
                  onClick={() => setDeleteDialogOpen(false)}
                  sx={{
                    position: "absolute",
                    right: 12,
                    top: 8,
                  }}
                >
                  <IconX size={40} />
                </IconButton>
              </DialogTitle>
              <DialogContent>
                <Typography color="textSecondary">
                  Are you sure you want to archive{" "}
                  <b>{projectToDelete?.name}</b>?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={async () => {
                    if (projectToDelete) {
                      try {
                        await archiveProjectApi(projectToDelete.id);
                        setProject((prev: any) =>
                          prev.filter((p: any) => p.id !== projectToDelete.id)
                        );
                      } catch (err) {
                        console.error("Archive failed", err);
                      }
                    }
                    setDeleteDialogOpen(false);
                  }}
                >
                  Archive
                </Button>
              </DialogActions>
            </Dialog>

            {/* Project List */}
            <Grid container spacing={2} display="block">
              {project.map((project) => (
                <Grid
                  mt={2}
                  key={project.id}
                  display="flex"
                  textAlign="start"
                  alignItems="center"
                >
                  <Box
                    onClick={() => {
                      setProjectId(project.id);
                      setDialogOpen(false);
                    }}
                    sx={{
                      boxShadow: "0px 1px 4px 0px #00000040",
                      borderRadius: "9px",
                      height: "42px",
                      width: "100%",
                      "&:hover": {
                        cursor: "pointer",
                      },
                    }}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      variant="subtitle1"
                      ml={2}
                      className="multi-ellipsis"
                      maxWidth={"110px"}
                    >
                      {project.name}
                    </Typography>
                    <IconChevronRight style={{ color: "GrayText" }} />
                  </Box>
                  <IconButton
                    color="primary"
                    sx={{ ml: 2 }}
                    onClick={() => {
                      setEditingProject(project);
                      setProjectEditOpen(true);
                    }}
                  >
                    <IconPencil size={18} />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      setProjectToDelete(project);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Grid>
              ))}
            </Grid>
            <CreateProject
              open={projectOpen}
              onClose={() => setProjectOpen(false)}
              formData={createFormData}
              setFormData={setCreateFormData}
              handleSubmit={handleProjectSubmit}
              isSaving={isSaving}
            />

            <EditProject
              open={projectEditOpen}
              onClose={() => setProjectEditOpen(false)}
              formData={editFormData}
              setFormData={setEditFormData}
              project={editingProject}
              handleSubmit={handleEditProject}
              isSaving={isSaving}
            />
          </Box>
        </Drawer>

        {/* Project Activity History Drawer */}
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
            {/* Close Button */}
            <IconButton
              aria-label="close"
              onClick={() => setOpenDrawer(false)}
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

            {/* Activity History List */}
            <Grid container spacing={2} display="block">
              <Box
                display={"flex"}
                alignContent={"center"}
                alignItems={"center"}
                flexWrap={"wrap"}
              >
                <IconButton onClick={() => setOpenDrawer(false)}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h5" fontWeight={700}>
                  Project Activities
                </Typography>
              </Box>

              {history.length > 0 ? (
                <Box mt={3}>
                  <Box
                    sx={{
                      maxHeight: history.length > 3 ? "auto" : "auto",
                      overflow: history.length > 3 ? "auto" : "visible",
                      pr: 0,
                    }}
                  >
                    {paginatedFeeds.map((addr, index) => {
                      let color = "";

                      switch (addr.status_int) {
                        case 13:
                          color = "#A600FF";
                          break;
                        case 14:
                          color = "#A600FF";
                          break;
                        case 3:
                          color = "#FF7F00";
                          break;
                        case 4:
                          color = "#32A852";
                          break;
                        default:
                          color = "#999";
                      }

                      return (
                        <Box
                          key={addr.id ?? index}
                          mb={index === data.length - 1 ? 0 : 2}
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
                            bgcolor={color}
                            px={1.5}
                            borderRadius="10px"
                            zIndex={1}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              fontSize={"12px !important"}
                              color="#fff"
                            >
                              {addr.status_text}
                            </Typography>
                          </Box>
                          <Box
                            display="initial"
                            width="100%"
                            textAlign="start"
                            mt={1}
                          >
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
                              color="textSecondary"
                            >
                              {formatDate(addr.date_added)}
                            </p>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  {paginatedFeeds.length < history.length && (
                    <Box display="flex" justifyContent="center" my={2}>
                      <Button
                        variant="outlined"
                        startIcon={
                          loading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : null
                        }
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={loading}
                      >
                        See More
                      </Button>
                    </Box>
                  )}
                </Box>
              ) : (
                <>
                  <Typography mt={2} ml={2} variant="h5">
                    No activities are found for this project!!
                  </Typography>
                </>
              )}
            </Grid>
          </Box>
        </Drawer>
      </Box>
    </PermissionGuard>
  );
};

export default TablePagination;
