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
  Autocomplete,
} from "@mui/material";
import {
  IconChevronLeft,
  IconChevronRight,
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
import Image from "next/image";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { IconArrowLeft } from "@tabler/icons-react";
import AddressesList from "./addresses-list";
import TasksList from "./tasks-list";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import Cookies from "js-cookie";
import CreateProjectTask from "../tasks";
import TimelineList from "./timeline-list";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import "react-day-picker/dist/style.css";
import "../../../../global.css";

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

// const ProjectListing: React.FC<ProjectListingProps> = ({ projectId, onProjectUpdated }) => {
const TablePagination: React.FC<ProjectListingProps> = ({
  projectId,
  onProjectUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "", sortOrder: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trade, setTrade] = useState<TradeList[]>([]);
  const [data, setData] = useState<ProjectList[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

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

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);

  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);
  const [startDate, setStartDate] = useState<Date | null>(defaultStart);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
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

  useEffect(() => {
    if (projectId) {
      const fetchAddresses = async () => {
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
      fetchAddresses();
    }
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

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
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
        mt={1}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", xl: "row" }}
        gap={1}
      >
        <Grid
          display="flex"
          gap={1}
          alignItems="center"
          justifyContent="flex-start"
          flexWrap="wrap"
          className="project_wrapper"
        >
          <Box display="flex" alignItems="center">
            <Tabs
              className="project-tabs"
              value={value}
              onChange={handleTabChange}
              sx={{
                flex: 1,
                backgroundColor: "#ececec",
                color: "#000",
                minHeight: "44px",
                borderRadius: "15px",
              }}
            >
              {["Addresses", "Tasks", "Timeline"].map((label, index) => (
                <Tab
                  key={label}
                  label={label}
                  className="project_tabs"
                  color="#000"
                  sx={{
                    minHeight: "25px",
                    marginLeft: index === 0 ? "8px" : index === 2 ? "8px" : 0,
                    marginRight: index === 0 ? "8px" : index === 2 ? "8px" : 0,
                    "&.Mui-selected": {
                      borderRadius: "12px",
                      backgroundColor: "#fff",
                      color: "#000",
                      margin: "2%",
                      marginLeft: index === 0 ? "8px" : index === 2 ? "8px" : 0,
                      marginRight:
                        index === 0 ? "8px" : index === 2 ? "8px" : 0,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Box>

          {value === 2 && (
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
            />
          )}

          {value !== 2 && (
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
          )}

          <Button variant="contained" onClick={() => setOpen(true)}>
            <IconFilter width={18} />
          </Button>

          {projectId && value !== 2 && (
            <>
              <Link href={`/apps/teams/list?project_id=${projectId}`} passHref>
                <IconButton>
                  <Image
                    src="/images/svgs/teams.svg"
                    alt="Teams"
                    width={24}
                    height={24}
                  />
                </IconButton>
              </Link>
              <Link href={`/apps/users/list?project_id=${projectId}`} passHref>
                <IconButton>
                  <Image
                    src="/images/svgs/user.svg"
                    alt="Users"
                    width={24}
                    height={24}
                  />
                </IconButton>
              </Link>
            </>
          )}
        </Grid>

        <Stack
          mb={2}
          justifyContent="flex-end"
          direction={{ xs: "row", sm: "row" }}
          gap={1}
        >
          <IconButton onClick={handleClick} size="small">
            <IconDotsVertical width={18} />
          </IconButton>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleClose}
            slotProps={{
              list: { "aria-labelledby": "basic-button" },
            }}
          >
            <MenuItem
              onClick={handleClose}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <ListItemIcon>
                <IconLocation width={18} />
              </ListItemIcon>
              Add Address
            </MenuItem>
            <MenuItem
              onClick={handleClose}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <ListItemIcon>
                <IconPlus width={18} />
              </ListItemIcon>
              Add Task
            </MenuItem>
            <MenuItem
              onClick={handleClose}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <ListItemIcon>
                <IconNotes width={18} />
              </ListItemIcon>
              Project Detail
            </MenuItem>
          </Menu>
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
        />
      )}
      {value === 1 && (
        <TasksList
          projectId={projectId}
          searchTerm={searchTerm}
          filters={filters}
        />
      )}
      {value === 2 && (
        <TimelineList
          projectId={projectId}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </Box>
  );
};

export default TablePagination;
