import React, { useEffect, useState, useMemo } from "react";
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

interface CreateProjectProps {
  open: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const CreateProject: React.FC<CreateProjectProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isSaving,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    const key = name as keyof FormData;

    // Prevent unnecessary re-renders
    if (formData[key] === value) return;

    // Numeric validation for budget
    if (key === "budget" && !/^\d*$/.test(value)) return;
setFormData(prev => {
  if (prev[key] === value) return prev;
  return { ...prev, [key]: value };
});

  };

  // =====================
  // FETCH DATA
  // =====================

  const [shift, setShift] = useState<Shift[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
  const [geofence, setGeofence] = useState<Geofence[]>([]);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number };

  useEffect(() => {
    if (!open || !user?.company_id) return;

    const getShifts = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=shiftList&company_id=${user.company_id}`
        );
        if (res.data?.info) setShift(res.data.info);
      } catch (err) {
        console.error("Failed loading shifts:", err);
      }
    };

    getShifts();
  }, [open, user?.company_id]);

  useEffect(() => {
    if (!open || !user?.company_id) return;

    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`
        );
        if (res.data?.info) setTeam(res.data.info);
      } catch (err) {
        console.error("Failed loading teams:", err);
      }
    };

    getTeams();
  }, [open, user?.company_id]);

  useEffect(() => {
    if (!open || !user?.company_id) return;

    const getGeofence = async () => {
      try {
        const res = await api.get(
          `work-zone/get?company_id=${user.company_id}`
        );
        if (res.data?.info) {
          const zones = res.data.info.map((z: any) => ({
            id: z.id,
            name: z.name,
          }));
          setGeofence(zones);
        }
      } catch (err) {
        console.error("Failed loading geofences:", err);
      }
    };

    getGeofence();
  }, [open, user?.company_id]);

  // =====================
  // MEMOIZED VALUES (performance)
  // =====================

  const memoShiftOptions = useMemo(() => shift, [shift]);
  const memoTeamOptions = useMemo(() => team, [team]);
  const memoGeofenceOptions = useMemo(() => geofence, [geofence]);

  const memoSelectedShifts = useMemo(() => {
    const ids = formData.shift_ids?.split(",") ?? [];
    return memoShiftOptions.filter((item) => ids.includes(String(item.id)));
  }, [formData.shift_ids, memoShiftOptions]);

  const memoSelectedTeams = useMemo(() => {
    const ids = formData.team_ids?.split(",") ?? [];
    return memoTeamOptions.filter((item) => ids.includes(String(item.id)));
  }, [formData.team_ids, memoTeamOptions]);

  const memoSelectedGeofence = useMemo(() => {
    const ids = formData.workzone_ids?.split(",") ?? [];
    return memoGeofenceOptions.filter((item) => ids.includes(String(item.id)));
  }, [formData.workzone_ids, memoGeofenceOptions]);

  // =====================
  // COMPONENT RENDER
  // =====================

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
        <Box height="100%">
          <form onSubmit={handleSubmit}>
            <Grid container mt={3}>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" alignItems="center">
                  <IconButton onClick={onClose}>
                    <IconArrowLeft />
                  </IconButton>

                  <Typography variant="h5" fontWeight={700}>
                    Add Project
                  </Typography>
                </Box>

                {/* NAME */}
                <Typography variant="h5" mt={2}>
                  Name
                </Typography>
                <CustomTextField
                  id="name"
                  name="name"
                  placeholder="Enter project name..."
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                />

                {/* SHIFTS */}
                <Typography variant="h5" mt={2}>
                  Select Shifts
                </Typography>
                <Autocomplete
                  multiple
                  options={memoShiftOptions}
                  value={memoSelectedShifts}
                  onChange={(e, newValue) => {
                    const ids = newValue.map((i) => i.id).filter(Boolean);
                    setFormData({
                      ...formData,
                      shift_ids: ids.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Shifts" />
                  )}
                />

                {/* TEAMS */}
                <Typography variant="h5" mt={2}>
                  Select Teams
                </Typography>
                <Autocomplete
                  multiple
                  options={memoTeamOptions}
                  value={memoSelectedTeams}
                  onChange={(e, newValue) => {
                    const ids = newValue.map((i) => i.id).filter(Boolean);
                    setFormData({
                      ...formData,
                      team_ids: ids.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  renderInput={(params) => (
                    <CustomTextField {...params} placeholder="Select Teams" />
                  )}
                />

                {/* GEOFENCE */}
                <Typography variant="h5" mt={2}>
                  Add Geofence
                </Typography>
                <Autocomplete
                  multiple
                  options={memoGeofenceOptions}
                  value={memoSelectedGeofence}
                  onChange={(e, newValue) => {
                    const ids = newValue.map((i) => i.id).filter(Boolean);
                    setFormData({
                      ...formData,
                      workzone_ids: ids.join(","),
                    });
                  }}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
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

                {/* ADDRESS */}
                <Typography variant="h5" mt={2}>
                  Site Address
                </Typography>
                <CustomTextField
                  id="address"
                  name="address"
                  placeholder="Enter address..."
                  value={formData.address}
                  onChange={handleChange}
                  fullWidth
                />

                {/* BUDGET */}
                <Typography variant="h5" mt={2}>
                  Budget
                </Typography>
                <CustomTextField
                  id="budget"
                  name="budget"
                  placeholder="Enter Budget..."
                  value={formData.budget}
                  onChange={handleChange}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  fullWidth
                />

                {/* CODE */}
                <Typography variant="h5" mt={2}>
                  Project Code
                </Typography>
                <CustomTextField
                  id="code"
                  name="code"
                  placeholder="Project Code..."
                  value={formData.code}
                  onChange={handleChange}
                  fullWidth
                />

                {/* DESCRIPTION */}
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
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* ACTION BUTTONS */}
            <Box display="flex" gap={2} mt={3}>
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={isSaving}
                sx={{ borderRadius: 3 }}
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

export default CreateProject;
