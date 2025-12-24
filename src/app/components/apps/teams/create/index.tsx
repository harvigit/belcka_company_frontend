"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import {
  Button,
  Typography,
  Box,
  Grid,
  MenuItem,
  Select,
  Autocomplete,
  Drawer,
  IconButton,
} from "@mui/material";
import { useRouter } from "next/navigation";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";
import { TeamList, UserList } from "../list";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconArrowLeft } from "@tabler/icons-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
}

const CreateTeam: React.FC<Props> = ({ open, onClose, onWorkUpdated }) => {
  const router = useRouter();
  const [data, setData] = useState<TeamList[]>([]);
  const [users, setUsers] = useState<UserList[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: 0,
    name: "",
    supervisor_id: 0,
    team_member_ids: [],
  });

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `team/user-list?company_id=${user.company_id}`
        );
        if (res.data) {
          setUsers(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
      setLoading(false);
    };
    fetchTrades();
  }, [user?.company_id, open]);

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(`user/get-user-lists`);
        if (res.data) {
          setData(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
      setLoading(false);
    };
    fetchTrades();
  }, [user.id, open]);

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
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        team_member_ids: formData.team_member_ids.join(","),
        company_id: user.company_id,
      };
      const response = await api.post(`team/add`, payload);
      if (response.data.IsSuccess) {
        toast.success(response.data.message);
        onWorkUpdated?.();
        onClose();
      }
      return response.data;
    } catch (error) {
      console.log(error);
    }
    setIsSaving(false);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 400,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 400,
          padding: 2,
          backgroundColor: "#f9f9f9",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 1,
        }}
      >
        <Box className="task-form">
          <Grid container>
            <Grid size={{ xs: 12, lg: 12 }}>
              <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" color="inherit" fontWeight={700}>
                  Add Team
                </Typography>
              </Box>
              <Typography variant="h5" mt={3}>
                Name
              </Typography>

              <CustomTextField
                id="name"
                name="name"
                placeholder="Enter Team name.."
                value={formData.name}
                onChange={handleChange}
                fullWidth
              />
              <Typography variant="h5" mt={3}>
                Supervisor
              </Typography>

              <Select
                name="supervisor_id"
                value={formData.supervisor_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    supervisor_id: Number(e.target.value),
                  })
                }
                fullWidth
                displayEmpty
              >
                <MenuItem value={0}>Select Supervisor</MenuItem>
                {data.map((users) => (
                  <MenuItem key={users.id} value={users.id}>
                    {users.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="h5" mt={3}>
                Team Member&apos;s
              </Typography>

              <Autocomplete
                multiple
                fullWidth
                disableCloseOnSelect
                options={users || []}
                value={users.filter((user) =>
                  formData.team_member_ids.includes(Number(user.id))
                )}
                onChange={(event, newValue) => {
                  setFormData((prev: any) => ({
                    ...prev,
                    team_member_ids: newValue.map((user) => Number(user.id)),
                  }));
                }}
                getOptionLabel={(option) => option.name || ""}
                isOptionEqualToValue={(option, value) =>
                  Number(option.id) === Number(value.id)
                }
                filterSelectedOptions
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    sx={{
                      "& .MuiAutocomplete-inputRoot": {
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                        minHeight: 56,
                        paddingTop: "10px",
                        paddingBottom: "10px",
                        paddingRight: "30px",
                      },
                      "& .MuiAutocomplete-tag": {
                        margin: "4px",
                        maxWidth: "100%",
                      },
                      "& .MuiAutocomplete-endAdornment": {
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      },
                    }}
                    placeholder="Select team members..."
                    className="team_selection"
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>

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
          onClick={handleSubmit}
          sx={{ borderRadius: 3 }}
          className="drawer_buttons"
          disabled={isSaving}
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
    </Drawer>
  );
};

export default CreateTeam;
