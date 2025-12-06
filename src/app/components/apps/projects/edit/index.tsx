import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Grid,
  IconButton,
  Typography,
  Button,
  Autocomplete,
  TextField,
} from "@mui/material";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface FormData {
  id?: number;
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

interface Shift {
  id: number | null;
  name: string;
}

interface Team {
  id: number | null;
  name: string;
}

interface Geofence {
  id: number;
  name: string;
}

interface EditProjectProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  project: any;
}

const EditProject: React.FC<EditProjectProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  project,
  isSaving,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "budget" && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  useEffect(() => {
    if (project) {
      setFormData({
        id: project.id,
        name: project.name || "",
        address: project.address || "",
        budget: String(project.budget || ""),
        description: project.description || "",
        code: project.code || "",
        company_id: project.company_id || 0,
        shift_ids: (project.shifts || []).map((s: any) => s.id).join(","),
        team_ids: (project.teams || []).map((t: any) => t.id).join(","),
        workzone_ids: (project.project_address || []).map((g: any) => g.workzone_id).join(","),
      });
    }
  }, [project]);

  const [shift, setShift] = useState<Shift[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [geofence, setGeofence] = useState<Geofence[]>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  useEffect(() => {
    const getShifts = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=shiftList&company_id=${user.company_id}`
        );
        if (res.data?.info) {
          setShift(res.data.info);
        }
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };
    if (open == true) {
      getShifts();
    }
  }, [open]);

  useEffect(() => {
    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`
        );
        if (res.data?.info) {
          setTeam(res.data.info);
        }
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };
    if (open == true) {
      getTeams();
    }
  }, [open]);

  useEffect(() => {
    const getGeofence = async () => {
      try {
        const res = await api.get(
          `work-zone/get?company_id=${user.company_id}`
        );
        if (res.data?.info) {
          const zones: Geofence[] = res.data.info.map((z: any) => ({
            id: z.id,
            name: z.name,
          }));
          setGeofence(zones);
        }
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };
    if (open == true) {
      getGeofence();
    }
  }, [open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 450,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 450,
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
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>
                    Edit Project
                  </Typography>
                </Box>
                <Typography variant="h5" mt={2}>
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
                <Typography variant="h5" mt={2}>
                  Select Shifts
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="shift_ids"
                  options={shift}
                  value={shift.filter((item) =>
                    formData.shift_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      shift_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Shifts" />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Select Teams
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="team_ids"
                  options={team}
                  value={team.filter((item) =>
                    formData.team_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      team_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Teams" />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Select Geofence
                </Typography>
                <Autocomplete
                  fullWidth
                  multiple
                  id="workzone_ids"
                  options={geofence}
                  value={geofence.filter((item) =>
                    formData.workzone_ids?.split(",").includes(String(item.id))
                  )}
                  onChange={(event, newValue) => {
                    const selectedIds = newValue
                      .map((item) => item.id)
                      .filter(Boolean);
                    setFormData({
                      ...formData,
                      workzone_ids: selectedIds.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder="Select Geofences"
                    />
                  )}
                />
                <Typography variant="h5" mt={2}>
                  Site Address
                </Typography>
                <CustomTextField
                  id="address"
                  name="address"
                  placeholder="Site Address.."
                  value={formData.address}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Budget
                </Typography>
                <CustomTextField
                  id="budget"
                  name="budget"
                  type="text"
                  placeholder="Enter Budget.."
                  value={formData.budget}
                  onChange={handleChange}
                  inputProps={{
                    inputMode: "decimal",
                    pattern: "^[0-9]+(\\.[0-9]{0,2})?$",
                  }}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Project Code
                </Typography>
                <CustomTextField
                  id="code"
                  name="code"
                  placeholder="Project Code.."
                  value={formData.code}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
                <Typography variant="h5" mt={2}>
                  Description
                </Typography>
                <TextField
                  id="description"
                  name="description"
                  multiline
                  placeholder="Enter Description.."
                  value={formData.description}
                  onChange={handleChange}
                  variant="outlined"
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                gap: 2,
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
                onClick={onClose}
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
  );
};

export default EditProject;
