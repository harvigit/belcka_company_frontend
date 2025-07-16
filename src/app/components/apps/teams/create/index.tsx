"use client";
import React, { useState, useContext, useEffect, ChangeEvent } from "react";
import {
  Button,
  Typography,
  Box,
  Stack,
  Grid,
  MenuItem,
  Select,
  Paper,
} from "@mui/material";
import { useRouter } from "next/navigation";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";
import { TeamContext } from "@/app/context/TeamContext";
import { TeamList } from "../list";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

const CreateTeam = () => {
  const { addTeam, teams } = useContext(TeamContext);
  const router = useRouter();
  const [data, setData] = useState<TeamList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
 const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null } ;
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
        const res = await api.get(`team/user-list?company_id=${user.company_id}`);
        if (res.data) {
          setData(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
      setLoading(false);
    };
    fetchTrades();
  }, []);

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
  }, []);

  useEffect(() => {
    const lastId = teams.length > 0 ? teams[teams.length - 1].id + 1 : 1;
    setFormData((prevData: FormData) => ({
      ...prevData,
      id: lastId,
    }));
  }, [teams]);

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
      let result = await addTeam(formData);
      setFormData({
        id: 0,
        name: "",
        supervisor_id: 0,
        team_member_ids: formData.team_member_ids.join(","),
      });
      const message = (result as any).message;
      toast.success(message);
      router.push("/apps/teams/list");
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="h5">#Create</Typography>
        </Stack>
        {/* <Divider /> */}

        <Grid container spacing={3}>
          {/* 1 */}
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
              id="name"
              name="name"
              placeholder="Enter Team name.."
              value={formData.name}
              onChange={handleChange}
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
              htmlFor="bl-name"
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
              <MenuItem value={0} disabled>
                Select Supervisor
              </MenuItem>
              {data.map((users) => (
                <MenuItem key={users.id} value={users.id}>
                  {users.name}
                </MenuItem>
              ))}
            </Select>
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
              Team Member's
            </CustomFormLabel>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 9,
            }}
          >
            <Select
              multiple
              name="team_member_ids"
              value={
                Array.isArray(formData.team_member_ids)
                  ? formData.team_member_ids
                  : []
              }
              onChange={(e) => {
                const { value } = e.target;

                setFormData({
                  ...formData,
                  team_member_ids:
                    typeof value === "string"
                      ? value.split(",").map(Number)
                      : value,
                });
              }}
              fullWidth
              displayEmpty
              renderValue={(selected) => {
                if (!Array.isArray(selected) || selected.length === 0) {
                  return "Select Team Members";
                }

                const selectedNames = data
                  .filter((user) => selected.includes(user.id))
                  .map((user) => user.name);

                return selectedNames.join(", ");
              }}
            >
              <MenuItem disabled value="">
                Select Team Members
              </MenuItem>
              {data.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
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
              size="medium"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Creating Team..." : "Save"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
};

export default CreateTeam;
