"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Autocomplete,
  Drawer,
  IconButton,
} from "@mui/material";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { IconArrowLeft } from "@tabler/icons-react";

interface User {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
  teamId: number | null;
  teams: any;
}

export interface UserList {
  id: number;
  name: string;
}

const EditTeam: React.FC<Props> = ({
  open,
  onClose,
  onWorkUpdated,
  teamId,
  teams,
}) => {
  const [formData, setFormData] = useState<any>({
    id: teamId,
    name: "",
    supervisor_id: 0,
    team_member_ids: [],
    team_members: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [userList, setUserList] = useState<UserList[]>([]);
  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const fetchUniqueUsers = async () => {
    try {
      if (!teamId || !id?.company_id) return;

      const res = await api.get(
        `team/user-list?team_id=${teamId}&company_id=${id.company_id}`
      );

      if (res.data) {
        const users = res.data.info;
        setFormData((prev: any) => {
          if (!prev) {
            return {
              team_members: users,
              team_member_ids: [],
              supervisor_id: 0,
              name: "",
              id: teamId,
            };
          }
          return {
            ...prev,
            team_members: users,
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  // Fetch all users list for supervisor dropdown
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(`user/get-user-lists`);
        if (res.data) {
          setUserList(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  // Fetch team data and members info
  const fetchTeamData = async () => {
    if (!teamId) return;
    if (teams.length > 0 && teamId) {
      try {
        const res = await api.get(
          `team/get-team-member-list?team_id=${teamId}`
        );

        if (res.data?.info) {
          const flattened = res.data.info.flatMap((team: any) => {
            if (team.users.length === 0) {
              return [
                {
                  supervisor_id: team.supervisor_id,
                  supervisor_name: team.supervisor_name,
                  supervisor_image: team.supervisor_image,
                  supervisor_email: team.supervisor_email,
                  supervisor_phone: team.supervisor_phone,
                  company_id: team.company_id,
                  subcontractor_company_id: team.subcontractor_company_id,
                  is_subcontractor: team.is_subcontractor,
                  team_id: team.team_id,
                  team_name: team.team_name,
                  id: null,
                  name: null,
                  image: null,
                  is_active: null,
                  trade_id: null,
                  trade_name: null,
                },
              ];
            }

            return team.users.map((user: any) => ({
              supervisor_id: team.supervisor_id,
              supervisor_name: team.supervisor_name,
              supervisor_image: team.supervisor_image,
              supervisor_email: team.supervisor_email,
              supervisor_phone: team.supervisor_phone,
              team_id: team.team_id,
              team_name: team.team_name,
              id: user.id,
              name: user.name,
              image: user.image,
              is_active: user.is_active,
              trade_id: user.trade_id,
              trade_name: user.trade_name,
              is_subcontractor: team.is_subcontractor,
              company_id: team.company_id,
              subcontractor_company_id: team.subcontractor_company_id,
            }));
          });

          // Use string comparison to avoid type mismatch
          const team = flattened.find(
            (item: any) => String(item.team_id) === String(teamId)
          );

          if (team) {
            const memberIds = flattened
              .filter((u: any) => String(u.team_id) === String(teamId) && u.id)
              .map((u: any) => u.id);

            setFormData({
              id: team.team_id,
              name: team.team_name,
              supervisor_id: team.supervisor_id,
              team_member_ids: memberIds,
              team_members: flattened.filter((u: any) => u.id),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [teams, teamId, id?.company_id]);

  useEffect(() => {
    if (teamId) {
      fetchUniqueUsers();
    }
  }, [teamId]);

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);

    try {
      const payload = {
        id: formData.id,
        name: formData.name,
        supervisor_id: formData.supervisor_id,
        company_id: id.company_id,
        team_member_ids: formData.team_member_ids.join(",") ?? [],
      };
      const res = await api.put(`team/update-team`, payload);

      if (res.data.IsSuccess === true) {
        toast.success(res.data.message);
        onWorkUpdated?.();
        onClose();
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
      console.error("Error updating team:", error);
    } finally {
      setIsSaving(false);
    }
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
                  Edit Team
                </Typography>
              </Box>
              <Typography variant="h5" mt={3}>
                Name
              </Typography>

              <CustomTextField
                name="name"
                placeholder="Enter team name..."
                value={formData?.name || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
              />
              <Typography variant="h5" mt={3}>
                Supervisor
              </Typography>

              <Autocomplete
                id="supervisor_id"
                fullWidth
                options={userList}
                value={
                  userList.find((u) => u.id === formData?.supervisor_id) || null
                }
                onChange={(event, newValue) => {
                  setFormData((prev: any) =>
                    prev ? { ...prev, supervisor_id: newValue?.id ?? 0 } : prev
                  );
                }}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <CustomTextField
                    {...params}
                    placeholder="Select supervisor..."
                  />
                )}
              />
              <Typography variant="h5" mt={3}>
                Team Member&apos;s
              </Typography>

              <Autocomplete
                multiple
                fullWidth
                disableCloseOnSelect
                options={formData?.team_members || []}
                value={(formData?.team_members || []).filter((u: any) =>
                  (formData?.team_member_ids || []).includes(Number(u.id))
                )}
                onChange={(event, newValue) => {
                  setFormData((prev: any) => ({
                    ...prev,
                    team_member_ids: newValue.map((u) => Number(u.id)),
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
                    className="team_selection"
                    placeholder="Select team members..."
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
          onClick={handleSave}
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

export default EditTeam;
