"use client";

import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Grid,
  CircularProgress,
  Autocomplete,
  Chip,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { TeamContext } from "@/app/context/TeamContext";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";

interface TeamList {
  id: number;
  name: string;
  supervisor_id: number;
  team_member_ids: number[];
  team_members: User[];
}

interface User {
  id: number;
  name: string;
}

export interface UserList {
  id: number;
  name: string;
}
const EditTeamPage = () => {
  const { teams, updateTeam } = useContext(TeamContext);
  const [formData, setFormData] = useState<TeamList | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const teamId = pathname?.split("/").pop();
  const [userList, setUserList] = useState<UserList[]>([]);
  const session = useSession();
  const id = session.data?.user as User & { company_id?: number | null };

  const fetchUniqueUsers = async () => {
    try {
      const res = await api.get(
        `team/user-list?team_id=${teamId}&company_id=${id.company_id}`
      );
      if (res.data) {
        const users = res.data.info;
        setFormData((prev) => {
          if (!prev) return null;
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
  }, [teamId]);

  useEffect(() => {
    const fetchTeamData = async () => {
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

            const team = flattened.find(
              (item: any) => item.team_id?.toString() === teamId
            );

            if (team) {
              const memberIds = flattened
                .filter((u: any) => u.team_id?.toString() === teamId && u.id)
                .map((u: any) => u.id);

              setFormData({
                id: team.team_id,
                name: team.team_name,
                supervisor_id: team.supervisor_id,
                team_member_ids: memberIds,
                team_members: flattened.filter((u: any) => u.id),
              });
            } else {
              // toast.error("Team not found.");
              router.push("/apps/teams/list");
            }
          }
        } catch (error) {
          console.error("Error fetching team data:", error);
          // toast.error("Failed to fetch team data.");
        }
      }
    };

    fetchTeamData();
    fetchUniqueUsers();
  }, [teams, teamId]);

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

      if (res.data.IsSuccess == true) {
        toast.success("Team updated successfully.");
        router.push("/apps/teams/list");
      } else {
        toast.error(res.data.message);
      }
    } catch (error: any) {
    } finally {
      setIsSaving(false);
    }
  };

  if (!formData) {
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
      <Stack direction="row" spacing={2} justifyContent="space-between" mb={3}>
        <Typography variant="h5">Edit Team</Typography>
      </Stack>
      <Grid container spacing={3}>
        <Grid
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3,
          }}
        >
          <CustomFormLabel
            htmlFor="bl-name"
            sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}
          >
            Name
          </CustomFormLabel>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 9,
          }}
        >
          <CustomTextField
            name="name"
            placeholder="Enter team name..."
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, name: e.target.value })
            }
            fullWidth
          />
        </Grid>
        <Grid
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3,
          }}
        >
          <CustomFormLabel
            htmlFor="supervisor_id"
            sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}
          >
            Supervisor
          </CustomFormLabel>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 9,
          }}
        >
          <Autocomplete
            id="supervisor_id"
            fullWidth
            options={userList}
            value={
              userList.find((u) => u.id === formData.supervisor_id) || null
            }
            onChange={(event, newValue) => {
              setFormData((prev) =>
                prev ? { ...prev, supervisor_id: newValue?.id ?? 0 } : prev
              );
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <CustomTextField {...params} placeholder="Select supervisor..." />
            )}
          />
        </Grid>

        <Grid
          display="flex"
          alignItems="center"
          size={{
            xs: 12,
            sm: 3,
          }}
        >
          <CustomFormLabel
            htmlFor="bl-name"
            sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}
          >
            Team Member&apos;s
          </CustomFormLabel>
        </Grid>

        <Grid
          size={{
            xs: 12,
            sm: 6,
          }}
        >
          <Autocomplete
            multiple
            fullWidth
            id="team_member_ids"
            options={formData.team_members}
            value={formData.team_members.filter((u) =>
              formData.team_member_ids?.includes(u.id)
            )}
            onChange={(event, newValue) => {
              setFormData({
                ...formData,
                team_member_ids: newValue.map((u) => u.id),
              });
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterSelectedOptions
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.name}
                  sx={{ margin: "2px" }}
                />
              ))
            }
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder="Select team members..."
              />
            )}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 12,
          }}
          display={"flex"}
          justifyContent={"end"}
        >
          <Button
            color="primary"
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Updating Team..." : "Save"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EditTeamPage;
