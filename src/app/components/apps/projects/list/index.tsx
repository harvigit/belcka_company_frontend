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
  MenuItem,
  DialogActions,
  DialogTitle,
  DialogContent,
  Dialog,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
  Drawer,
  CircularProgress,
} from "@mui/material";
import {
  IconChartPie,
  IconDotsVertical,
  IconFilter,
  IconLocation,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Link from "next/link";
import { IconNotes } from "@tabler/icons-react";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconArrowLeft } from "@tabler/icons-react";
import AddressesList from "./addresses-list";
import TasksList from "./tasks-list";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Cookies from "js-cookie";
import CreateProjectTask from "../tasks";
import "react-day-picker/dist/style.css";
import "../../../../global.css";
import DynamicGantt from "@/app/components/DynamicGantt";
import { IconTrash } from "@tabler/icons-react";
import ArchiveAddress from "./archive-address-list";

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
};
interface ProjectListingProps {
  projectId: number | null;
  onProjectUpdated?: () => void;
}
export interface TradeList {
  id: number;
  name: string;
}

type Task = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  status: "Pending" | "In Progress" | "Completed";
  type: "project" | "task";
  parentId?: string;
  created_at?: Date;
};
// const ProjectListing: React.FC<ProjectListingProps> = ({ projectId, onProjectUpdated }) => {
const TablePagination: React.FC<ProjectListingProps> = ({
  projectId,
  onProjectUpdated,
}) => {
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

  const [trade, setTrade] = useState<TradeList[]>([]);
  const [data, setData] = useState<ProjectList[]>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const openMenu = Boolean(anchorEl);
  const status = ["Completed", "To Do", "In Progress"];
  const [isSaving, setIsSaving] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const COOKIE_PREFIX = "project_";
  const projectID = Cookies.get(COOKIE_PREFIX + user.id);
  const [formData, setFormData] = useState<any>({
    project_id: Number(projectID),
    company_id: user.company_id,
    name: "",
  });

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

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user.company_id}`
        );
        if (res.data) setTrade(res.data.info);
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  useEffect(() => {
    if (projectId) {
      setFormData((prev: any) => ({
        ...prev,
        project_id: projectId,
      }));
    }
  }, [projectId]);
  const fetchAddresses = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`address/get?project_id=${projectId}`);
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
    fetchAddresses();
  }, [projectId]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: FormData) => ({
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
      is_attchment: false,
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
        onProjectUpdated?.();
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
          is_attchment: false,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      setFormData({
        project_id: Number(projectID),
        company_id: user.company_id,
        name: "",
      });
      const payload = {
        ...formData,
        project_id: projectId,
      };
      const result = await api.post("address/create", payload);
      if (result.data.IsSuccess === true) {
        toast.success(result.data.message);
        setSidebar(false);
        setLoading(true);
        onProjectUpdated?.();
        setTimeout(() => {
          setLoading(false);
        }, 100);
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

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Scroll active tab into view whenever value changes
  useEffect(() => {
    if (tabRefs.current[value]) {
      tabRefs.current[value]?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
      });
    }
  }, [value]);

  if (loading == true) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box>
      <Stack
        mb={2}
        display={"flex"}
        justifyContent="space-between"
        direction={{ xs: "row", xl: "row" }}
        gap={1}
      >
        <Grid
          display="flex"
          width="80%"
          gap={1}
          alignItems="center"
          justifyContent="flex-start"
          flexWrap="wrap"
          className="project_wrapper"
        >
          <Box display="flex" alignItems="center">
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
            sx={{ width: { xs: "100%", sm: "60%", md: "40%", lg: "30%" } }}
          />

          <Button variant="contained" onClick={() => setOpen(true)}>
            <IconFilter width={18} />
          </Button>
          <IconButton onClick={() => handleRowClick()}>
            <IconChartPie size={24}></IconChartPie>
          </IconButton>
        </Grid>
        <Stack
          width="20%"
          display="flex"
          justifyContent="flex-end"
          direction={{ xs: "row", sm: "row" }}
          gap={1}
          alignItems="center"
          flexWrap="wrap"
        >
          {selectedIds.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<IconTrash width={18} />}
              onClick={() => {
                setOpenDialog(true);
              }}
            >
              Archive
            </Button>
          )}

          <IconButton onClick={handleClick} size="small">
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
                Project detail
              </Link>
            </MenuItem>
          </Menu>
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

      {/* Add task */}
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
      <Drawer
        anchor="right"
        open={sidebar}
        onClose={() => setSidebar(false)}
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
              {" "}
              <Grid container mt={3}>
                <Grid size={{ lg: 12, xs: 12 }}>
                  <Box
                    display={"flex"}
                    alignContent={"center"}
                    alignItems={"center"}
                    flexWrap={"wrap"}
                  >
                    <IconButton onClick={() => setSidebar(false)}>
                      <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h5" fontWeight={700}>
                      Add Address
                    </Typography>
                  </Box>
                  <Typography variant="h5" mt={3}>
                    Name
                  </Typography>
                  <CustomTextField
                    id="name"
                    name="name"
                    placeholder="Enter address name.."
                    value={formData.name}
                    onChange={handleChange}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Button
                  color="error"
                  onClick={() => setSidebar(false)}
                  variant="contained"
                  size="medium"
                  fullWidth
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  size="medium"
                  type="submit"
                  disabled={isSaving}
                  fullWidth
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>

      {value === 0 && (
        <AddressesList
          projectId={projectId}
          searchTerm={searchTerm}
          filters={filters}
          onSelectionChange={handleSelectedRows}
        />
      )}
      {value === 1 && (
        <TasksList
          projectId={projectId}
          searchTerm={searchTerm}
          filters={filters}
        />
      )}
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

      {/* archive address */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Archive</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Are you sure you want to archive addresses?
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
                  address_ids: selectedIds.join(" ,"),
                };
                const response = await api.post(
                  "address/archive-addresses",
                  payload
                );
                toast.success(response.data.message);
                setSelectedIds([]);
                await fetchAddresses();
              } catch (error) {
                toast.error("Failed to archive client");
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

      <ArchiveAddress
        open={archiveList}
        projectId={Number(projectID)}
        onClose={() => setArchiveList(false)}
        onWorkUpdated={fetchAddresses}
      />
    </Box>
  );
};

export default TablePagination;
