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
  name: string;
  address: string;
  budget: string;
  description?: string;
  code: number;
  shift_ids: string;
  team_ids: string;
  company_id: number;
}

interface Shift {
  id: number | null;
  name: string;
}

interface Team {
  id: number | null;
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
    const { name, value } = e.target;

    if (name === "budget" && !/^\d*$/.test(value)) {
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const [shift, setShift] = useState<Shift[]>([]);
  const [team, setTeam] = useState<Team[]>([]);
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

    getShifts();
  }, []);

  useEffect(() => {
    const getTeams = async () => {
      try {
        const res = await api.get(
          `get-company-resources?flag=teamList&company_id=${user.company_id}`
        );
        if (res.data?.info) {
          setTeam(res.data.info);
        }
        console.log(res, "res.datares.data");
      } catch (err) {
        console.error("Failed to refresh project data", err);
      }
    };

    getTeams();
  }, []);

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
                    Add Project
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
                    formData.shift_ids
                      ?.split(",")
                      .map((id) => Number(id))
                      .includes(item.id ?? -1)
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
                    formData.team_ids
                      ?.split(",")
                      .map((id) => Number(id))
                      .includes(item.id ?? -1)
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
                    inputMode: "numeric",
                    pattern: "[0-9]*",
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
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Button
                color="error"
                onClick={onClose}
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
  );
};

export default CreateProject;
