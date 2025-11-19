import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  CircularProgress,
  Divider,
  Button,
  TextField,
} from "@mui/material";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import { Box, Grid } from "@mui/system";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import { IconUser, IconUserPlus } from "@tabler/icons-react";

export default function PenaltySettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [value, setValue] = React.useState<Dayjs | null>(dayjs());
  const [enabled, setEnabled] = useState<boolean>(true);
  const [timeZone, setTimeZone] = useState<any>(0);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showTeamsList, setShowTeamsList] = useState(false);
  const [showUsersList, setShowUsersList] = useState(false);
  const [isTeamsDirty, setIsTeamsDirty] = useState(false);
  const [isUsersDirty, setIsUsersDirty] = useState(false);
  const [searchTeam, setSerachTeam] = useState("");
  const [searchUser, setSerachUser] = useState("");

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchCompanySetting = async () => {
    setLoading(true);
    try {
      const res = await api.get("/setting/get-company-settings");
      if (res.data?.data) {
        setEnabled(res.data.data.is_outside_boundary_penalty);
        setTimeZone(res.data.data.timezone_id);
        setValue(
          res.data.data.outside_boundary_penalty_minute
            ? dayjs(res.data.data.outside_boundary_penalty_minute, "HH:mm")
            : null
        );
      }
    } catch (err) {
      console.error("Failed to fetch general setting", err);
    }
    setLoading(false);
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `get-company-resources?flag=teamList&company_id=${user.company_id}`
      );
      if (res.data?.info) {
        setTeams(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch general setting", err);
    }
    setLoading(false);
  };
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("user/get-user-lists");
      if (res.data?.info) {
        setUsers(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch general setting", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanySetting();
      fetchTeams();
      fetchUsers();
    }
  }, [user?.company_id]);

  const handleToggle = async () => {
    const newStatus = !enabled;
    if (!newStatus) {
      setShowTeamsList(false);
      setShowUsersList(false);
    }

    setEnabled(newStatus);
    setLoading(true);
    const payload = {
      is_penalty: newStatus,
      timeZone,
    };

    try {
      const res = await api.post("setting/save-general-setting", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setEnabled(res.data.info.is_outside_boundary_penalty);
        setIsTeamsDirty(false);
        setIsUsersDirty(false);
        setSerachTeam("");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSelectedUsers = async () => {
    try {
      const payload = {
        company_id: user.company_id,
        penalty_time: value ? value.format("HH:mm") : null,
        users: users
          .filter((u) => u.selected)
          .map((u) => ({
            id: u.id,
            is_penalty: u.is_penalty,
          })),
      };
      const res = await api.post("user/change-bulk-penalty-status", payload);
      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        fetchUsers();
        setIsUsersDirty(false);
        setSerachUser("");
      }
    } catch (error) {
      console.error("api error when store user penalty", error);
    }
  };

  const handleUpdateSelectedTeams = async () => {
    try {
      const payload = {
        company_id: user.company_id,
        penalty_time: value ? value.format("HH:mm") : null,
        teams: teams
          .filter((t) => t.selected)
          .map((t) => ({
            id: t.id,
            is_penalty: t.is_penalty,
          })),
      };

      const res = await api.post("team/change-bulk-penalty-status", payload);
      if (res.data.IsSuccess == true) {
        toast.success(res.data.message);
        fetchTeams();
        fetchUsers();
        setIsTeamsDirty(false);
      }
    } catch (error) {
      console.error("api error when store team penalty", error);
    }
  };

  const filteredData = useMemo(() => {
    const search = searchTeam.trim().toLowerCase();
    if (!search) return teams;

    return teams.filter((item) => item.name?.toLowerCase().includes(search));
  }, [teams, searchTeam]);

  const filteredUserData = useMemo(() => {
    const search = searchUser.trim().toLowerCase();
    if (!search) return users;

    return users.filter(
      (item) =>
        item.name?.toLowerCase().includes(search) ||
        item.team_name?.toLowerCase().includes(search)
    );
  }, [users, searchUser]);

  useEffect(() => {
    if (showTeamsList == false) {
      setSerachTeam("");
      setIsTeamsDirty(false);
    }
    if (showUsersList == false) {
      setSerachUser("");
      setIsUsersDirty(false);
    }
  });
  if (loading) {
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
    <Box display={"flex"} overflow="auto">
      <Box sx={{ p: 3 }} m="auto" width={"60%"}>
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          justifyContent={"space-between"}
          mb={3}
        >
          <Typography variant="h1" fontSize={"20px !important"}>
            Enable outside working Penalty
          </Typography>
          {enabled !== null && (
            <IOSSwitch
              color="primary"
              checked={enabled}
              onChange={handleToggle}
              disabled={loading}
            />
          )}
        </Box>
        <Divider sx={{ borderWidth: 1 }} />
        {enabled && (
          <Box sx={{ border: "1px solid #ebe9f1" }} mt={2}>
            <Typography
              p={1}
              sx={{ backgroundColor: "#e3e3e3", fontSize: "15px !important" }}
              fontWeight={500}
            >
              Stop work out side of working area penalty
            </Typography>
            <Grid
              container
              m={2}
              gap={2}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <Grid size={{ sm: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <TimePicker
                    format="HH:mm" 
                    ampm={false}
                    value={value}
                    onChange={(newValue) => {
                      setValue(newValue ? dayjs(newValue) : null);
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,

                        sx: {
                          "& .MuiSvgIcon-root": {
                            width: "18px",
                            height: "18px",
                          },
                          "& .MuiFormHelperText-root": {
                            display: "none",
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Box display={"flex"} gap={2}>
                <Button
                  startIcon={<IconUserPlus size={16} />}
                  variant="outlined"
                  onClick={() => {
                    setShowTeamsList(!showTeamsList);
                    setShowUsersList(false);
                  }}
                >
                  Teams
                </Button>
                <Button
                  startIcon={<IconUser size={16} />}
                  variant="outlined"
                  onClick={() => {
                    setShowUsersList(!showUsersList);
                    setShowTeamsList(false);
                  }}
                >
                  Users
                </Button>
              </Box>
            </Grid>
          </Box>
        )}
        <Box display="flex" justifyContent="space-between" mt={2}>
          {showTeamsList && (
            <TextField
              id="tb-search"
              sx={{ width: "40%" }}
              placeholder="Search"
              onChange={(e) => setSerachTeam(e.target.value)}
              slotProps={{
                htmlInput: { "aria-label": "Search here" },
              }}
            />
          )}
          {(filteredData.some((t) => t.selected) || isTeamsDirty) &&
            showTeamsList && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateSelectedTeams}
              >
                Update
              </Button>
            )}
        </Box>
        {showTeamsList && (
          <Box
            mt={2}
            p={2}
            sx={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
              mr={2}
            >
              {/* Select All */}
              <Box display="flex" alignItems="center" gap={1} ml={2}>
                <input
                  type="checkbox"
                  checked={
                    filteredData.length > 0 &&
                    filteredData.every((t) => t.selected)
                  }
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setTeams((prev) =>
                      prev.map((t) => ({
                        ...t,
                        selected: checked,
                      }))
                    );
                  }}
                />
                <Typography fontWeight={600} ml={2}>
                  Select All Teams
                </Typography>
              </Box>
              <IOSSwitch
                onChange={(e) => {
                  const value = e.target.checked;
                  setIsTeamsDirty(true);
                  setTeams((prev) =>
                    prev.map((u) => ({
                      ...u,
                      selected: true,
                      is_penalty: value,
                    }))
                  );
                }}
              />
            </Box>

            {filteredData.map((team) => (
              <Box
                key={team.id}
                sx={{
                  border: "1px solid #eee",
                  p: 2,
                  mb: 2,
                  borderRadius: "8px",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <input
                      type="checkbox"
                      checked={team.selected}
                      onChange={() => {
                        setIsTeamsDirty(true);
                        setTeams((prev) =>
                          prev.map((t) =>
                            t.id === team.id
                              ? { ...t, selected: !t.selected }
                              : t
                          )
                        );
                      }}
                    />

                    <Typography fontWeight={600}>{team.name}</Typography>
                  </Box>
                  <IOSSwitch
                    checked={team.is_penalty || false}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setIsTeamsDirty(true);

                      setTeams((prev) =>
                        prev.map((t) =>
                          t.id === team.id
                            ? { ...t, is_penalty: value, selected: true } // <-- FIXED
                            : t
                        )
                      );
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
        <Box display="flex" justifyContent="space-between" mt={2}>
          {showUsersList && (
            <TextField
              id="tb-search"
              sx={{ width: "40%" }}
              placeholder="Search name or team name"
              onChange={(e) => setSerachUser(e.target.value)}
              slotProps={{
                htmlInput: { "aria-label": "Search here" },
              }}
            />
          )}
          {(filteredUserData.some((u) => u.selected) || isUsersDirty) &&
            showUsersList && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpdateSelectedUsers}
              >
                Update
              </Button>
            )}
        </Box>
        {showUsersList && (
          <Box
            mt={2}
            p={2}
            sx={{
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#fafafa",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
              mr={2}
            >
              <Box display="flex" alignItems="center" gap={1} ml={2}>
                <input
                  type="checkbox"
                  checked={
                    filteredUserData.length > 0 &&
                    filteredUserData.every((t) => t.selected)
                  }
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setUsers((prev) =>
                      prev.map((t) => ({
                        ...t,
                        selected: checked,
                      }))
                    );
                  }}
                />
                <Typography fontWeight={600} ml={2}>
                  Select All Users
                </Typography>
              </Box>

              <IOSSwitch
                onChange={(e) => {
                  const value = e.target.checked;
                  setIsUsersDirty(true);

                  setUsers((prev) =>
                    prev.map((u) => ({
                      ...u,
                      selected: true, // <-- add this so all come in payload
                      is_penalty: value,
                    }))
                  );
                }}
              />
            </Box>

            {filteredUserData.map((user) => (
              <Box
                key={user.id}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  p: 2,
                  mb: 2,
                }}
              >
                <Box display={"flex"} alignItems="center" gap={2}>
                  <input
                    type="checkbox"
                    checked={user.selected}
                    onChange={() => {
                      setIsUsersDirty(true);
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.id === user.id ? { ...u, selected: !u.selected } : u
                        )
                      );
                    }}
                  />

                  <Typography fontWeight={600}>
                    {user.first_name} {user.last_name}
                  </Typography>
                </Box>

                <IOSSwitch
                  checked={user.is_penalty || false}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setIsUsersDirty(true);

                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === user.id
                          ? { ...u, is_penalty: value, selected: true } // <-- FIXED
                          : u
                      )
                    );
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
