"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
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

dayjs.extend(customParseFormat);

export type ProjectList = {
  id: number;
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

const TablePagination = ({ projectId }: { projectId: number | null }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ status: "", sortOrder: "" });
  const [tempFilters, setTempFilters] = useState(filters);
  const [value, setValue] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const openMenu = Boolean(anchorEl);
  const status = ["Completed", "Pending", "In Progress"];
  const [isSaving, setIsSaving] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const COOKIE_PREFIX = "project_";
  const projectID = Cookies.get(COOKIE_PREFIX + user.id);
  const [formData, setFormData] = useState<any>({
    project_id: Number(projectID),
    company_id: user.company_id,
    name: "",
  });

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
    if (projectId) {
      setFormData((prev: any) => ({
        ...prev,
        project_id: projectId,
      }));
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
        ml={2}
        mb={2}
        justifyContent="space-between"
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1, sm: 2, md: 4 }}
      >
        <Grid display="flex" gap={1} alignItems={"center"}>
          <Tabs
            className="project-tabs"
            value={value}
            sx={{
              backgroundColor: "#ECECEC !important",
              borderRadius: "12px",
              width: "43%",
              height: "48px",
            }}
            onChange={handleTabChange}
            aria-label="simple tabs example"
          >
            <Tab
              label="Addresses"
              className="address-tab"
              sx={{
                fontWeight: "normal",
                color: value === 0 ? "black" : "gray",
                textTransform: "none",
                borderRadius: "12px",
                marginTop: "2%",
                marginLeft: "2%",
                width: "50%",
                height: "20px",
                backgroundColor: value === 0 ? "white" : "transparent",
                "&.MuiTab-root": {
                  borderRadius: "12px",
                },
              }}
            />
            <Tab
              label="Tasks"
              className="task-tab"
              sx={{
                fontWeight: "normal",
                color: value === 1 ? "black" : "gray",
                textTransform: "none",
                borderRadius: "12px",
                marginTop: "2%",
                marginRight: "2%",
                width: "45%",
                height: "20px",
                backgroundColor: value === 1 ? "white" : "transparent",
                "&.MuiTab-root": {
                  borderRadius: "12px",
                },
              }}
            />
          </Tabs>
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
          <Button variant="contained" onClick={() => setOpen(true)}>
            <IconFilter width={18} />
          </Button>
          {projectId && (
            <>
              <Link href={`/apps/teams/list?project_id=${projectId}`} passHref>
                <Typography variant="h5" color="#FF7F00">
                  <Image
                    src={"/images/svgs/teams.svg"}
                    alt="logo"
                    height={30}
                    width={30}
                  />
                </Typography>
              </Link>
              <Link href={`/apps/users/list?project_id=${projectId}`} passHref>
                <Typography variant="h5" color="#FF7F00">
                  <Image
                    src={"/images/svgs/user.svg"}
                    alt="logo"
                    height={30}
                    width={30}
                  />
                </Typography>
              </Link>
            </>
          )}
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
        </Grid>
        <Stack
          mb={2}
          justifyContent="end"
          direction={{ xs: "column", sm: "row" }}
        >
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
            <MenuItem onClick={handleClose}>
              <Link
                color="body1"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setSidebar(true);
                }}
                style={{
                  width: "100%",
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
        </Stack>
      </Stack>
      <Divider />
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
              {/* form includes the submit button */}
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
                      Add Address {projectId}
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
                  {isSaving ? "Creating Address..." : "Save"}
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Drawer>
      {value === 0 ? (
        <Box mt={2}>
          <AddressesList
            projectId={projectId}
            searchTerm={searchTerm}
            filters={filters}
          />
        </Box>
      ) : (
        <Box mt={2}>
          <TasksList
            projectId={projectId}
            searchTerm={searchTerm}
            filters={filters}
          />
        </Box>
      )}
    </Box>
  );
};

export default TablePagination;
