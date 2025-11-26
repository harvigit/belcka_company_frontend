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
import IOSSwitch from "@/app/components/common/IOSSwitch";
import { IconUser, IconUserPlus } from "@tabler/icons-react";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";

export default function PenaltySettings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [value, setValue] = React.useState<Dayjs | null>(dayjs());
  const [temp, setTemp] = useState<string>(value?.format("HH:mm") ?? "");
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

  const [swEnabled, setSwEnabled] = useState<boolean>(false);
  const [swValue, setSwValue] = useState<Dayjs | null>(dayjs());
  const [swTemp, setSwTemp] = useState<string>(swValue?.format("HH:mm") ?? "");
  const [swTeams, setSwTeams] = useState<any[]>([]);
  const [swUsers, setSwUsers] = useState<any[]>([]);
  const [showSwTeamsList, setShowSwTeamsList] = useState(false);
  const [showSwUsersList, setShowSwUsersList] = useState(false);
  const [swTeamsDirty, setSwTeamsDirty] = useState(false);
  const [swUsersDirty, setSwUsersDirty] = useState(false);
  const [searchSwTeam, setSearchSwTeam] = useState("");
  const [searchSwUser, setSearchSwUser] = useState("");

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchCompanySetting = async () => {
    setLoading(true);
    try {
      const res = await api.get("/setting/get-company-settings");
      if (res.data?.data) {
        setEnabled(res.data.data.is_outside_boundary_penalty);
        setTimeZone(res.data.data.timezone_id);
        const dbTime = res.data.data.outside_boundary_penalty_minute
          ? dayjs(res.data.data.outside_boundary_penalty_minute, "HH:mm")
          : null;

        setValue(dbTime);
        setTemp(dbTime ? dbTime.format("HH:mm") : "");

        setSwEnabled(res.data.data.is_autostop_work_penalty);
        const swDbTime = res.data.data.autostop_work_penalty_minute
          ? dayjs(res.data.data.autostop_work_penalty_minute, "HH:mm")
          : null;

        setSwValue(swDbTime);
        setSwTemp(swDbTime ? swDbTime.format("HH:mm") : "");
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
        setSwTeams(JSON.parse(JSON.stringify(res.data.info)));
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("user/get-user-lists");
      if (res.data?.info) {
        setUsers(res.data.info);
        setSwUsers(JSON.parse(JSON.stringify(res.data.info)));
      }
    } catch (err) {
      console.error(err);
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
      is_outside_boundary_penalty: newStatus,
      timeZone,
      outside_penalty: value ? value.format("HH:mm") : null,
    };

    try {
      const res = await api.post("setting/save-general-setting", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchCompanySetting();
        fetchTeams();
        fetchUsers();
      }
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
            is_outside_boundary_penalty: u.is_outside_boundary_penalty,
          })),
      };

      const res = await api.post(
        "user/change-bulk-outside-penalty-status",
        payload
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchUsers();
        fetchTeams();
      }
    } catch (err) {}
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
            is_outside_boundary_penalty: t.is_outside_boundary_penalty,
          })),
      };

      const res = await api.post(
        "team/change-bulk-outside-penalty-status",
        payload
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchUsers();
        fetchTeams();
      }
    } catch (err) {}
  };

  const handleToggleStopWork = async () => {
    const newStatus = !swEnabled;
    if (!newStatus) {
      setShowSwTeamsList(false);
      setShowSwUsersList(false);
    }

    setSwEnabled(newStatus);
    setLoading(true);

    try {
      const payload = {
        is_autostop_work_penalty: newStatus,
        timeZone,
        penalty_time: swValue ? swValue.format("HH:mm") : null,
      };

      const res = await api.post("setting/save-general-setting", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchCompanySetting();
        fetchTeams();
        fetchUsers();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStopWorkTeams = async () => {
    try {
      const payload = {
        company_id: user.company_id,
        stop_work_time: swValue ? swValue.format("HH:mm") : null,
        teams: swTeams
          .filter((t) => t.selected)
          .map((t) => ({
            id: t.id,
            is_autostop_work_penalty: t.is_autostop_work_penalty,
          })),
      };

      const res = await api.post(
        "team/change-bulk-auto-stop-penalty-status",
        payload
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchUsers();
        fetchTeams();
      }
    } catch (err) {}
  };

  const handleUpdateStopWorkUsers = async () => {
    try {
      const payload = {
        company_id: user.company_id,
        stop_work_time: swValue ? swValue.format("HH:mm") : null,
        users: swUsers
          .filter((u) => u.selected)
          .map((u) => ({
            id: u.id,
            is_autostop_work_penalty: u.is_autostop_work_penalty,
          })),
      };

      const res = await api.post(
        "user/change-bulk-auto-stop-penalty-status",
        payload
      );
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchUsers();
        fetchTeams();
      }
    } catch (err) {}
  };

  const filteredData = useMemo(() => {
    const s = searchTeam.toLowerCase();
    if (!s) return teams;
    return teams.filter((t) => t.name?.toLowerCase().includes(s));
  }, [teams, searchTeam]);

  const filteredUserData = useMemo(() => {
    const s = searchUser.toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(s) ||
        u.team_name?.toLowerCase().includes(s)
    );
  }, [users, searchUser]);

  const filteredSwTeams = useMemo(() => {
    const s = searchSwTeam.toLowerCase();
    if (!s) return swTeams;
    return swTeams.filter((t) => t.name?.toLowerCase().includes(s));
  }, [swTeams, searchSwTeam]);

  const filteredSwUsers = useMemo(() => {
    const s = searchSwUser.toLowerCase();
    if (!s) return swUsers;
    return swUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(s) ||
        u.team_name?.toLowerCase().includes(s)
    );
  }, [swUsers, searchSwUser]);

  const parseDigitsToTime = (digits: string): string | null => {
    let formatted = "";

    if (digits.length === 1) {
      formatted = `0${digits}:00`;
    } else if (digits.length === 2) {
      formatted = `${digits}:00`;
    } else if (digits.length === 3) {
      formatted = `${digits.slice(0, 2)}:${digits[2]}0`;
    } else if (digits.length === 4) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    } else {
      return null;
    }

    const [h, m] = formatted.split(":").map(Number);
    if (h > 23 || m > 59) return null;

    return formatted;
  };

  if (loading)
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

  return (
    <Box display="flex" overflow="auto">
      <Box sx={{ p: 3 }} m="auto" width="60%">
        {/* ------------------------------------------------------------ */}
        {/* OUTSIDE WORKING AREA PENALTY */}
        {/* ------------------------------------------------------------ */}
        <Box>
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography
              variant="h1"
              fontSize="20px !important"
              fontWeight={500}
            >
              Enable Outside Working Penalty
            </Typography>

            <IOSSwitch checked={enabled} onChange={handleToggle} />
          </Box>

          <Divider sx={{ my: 2 }} />

          {enabled && (
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid #e5e5e5",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}
              mt={2}
            >
              {/* Small Section Header */}
              <Typography
                p={2}
                sx={{
                  backgroundColor: "#f7f7f7",
                  fontSize: "15px !important",
                  borderBottom: "1px solid #e5e5e5",
                  fontWeight: 500,
                }}
              >
                Stop work outside of working area penalty
              </Typography>

              {/* TIME + TEAMS/USERS BUTTON ROW */}
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                p={2.5}
              >
                <Grid size={{ sm: 2 }}>
                  <TextField
                    type="text"
                    value={temp}
                    placeholder="HH:MM"
                    size="small"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setTemp(raw);
                    }}
                    onBlur={() => {
                      const formatted = parseDigitsToTime(temp);
                      if (formatted) {
                        setTemp(formatted);
                        setValue(dayjs(formatted, "HH:mm"));
                      } else {
                        setTemp(value ? value.format("HH:mm") : "");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const formatted = parseDigitsToTime(temp);
                        if (formatted) {
                          setTemp(formatted);
                          setValue(dayjs(formatted, "HH:mm"));
                        } else {
                          setTemp(value ? value.format("HH:mm") : "");
                        }
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setTemp(value ? value.format("HH:mm") : "");
                      }
                    }}
                    sx={{
                      width: "90px",
                      "& input": {
                        textAlign: "center",
                        fontWeight: 400,
                      },
                    }}
                  />
                </Grid>

                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconUserPlus size={16} />}
                    onClick={() => {
                      setShowTeamsList(!showTeamsList);
                      setShowUsersList(false);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Teams
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<IconUser size={16} />}
                    onClick={() => {
                      setShowUsersList(!showUsersList);
                      setShowTeamsList(false);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Users
                  </Button>
                </Box>
              </Grid>

              {/* ---------------- TEAM LIST ---------------- */}
              {showTeamsList && (
                <>
                  {/* Search + Update Row */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    mx={2}
                  >
                    <TextField
                      placeholder="Search"
                      value={searchTeam}
                      onChange={(e) => setSerachTeam(e.target.value)}
                      sx={{ width: "40%" }}
                    />

                    {(filteredData.some((t) => t.selected) || isTeamsDirty) && (
                      <Button
                        variant="contained"
                        onClick={handleUpdateSelectedTeams}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 3,
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  {/* Modern Card List */}
                  <Box
                    m={2}
                    p={2.5}
                    sx={{
                      border: "1px solid #ececec",
                      background: "#fafafa",
                      borderRadius: 2,
                    }}
                  >
                    {/* SELECT ALL */}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <CustomCheckbox
                          checked={
                            filteredData.length > 0 &&
                            filteredData.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setTeams((prev) =>
                              prev.map((t) => ({ ...t, selected: checked }))
                            );
                          }}
                        />
                        <Typography fontWeight={600} ml={1}>
                          Select All Teams
                        </Typography>
                      </Box>

                      <IOSSwitch
                        onChange={(e) => {
                          const value = e.target.checked;
                          setTeams((prev) =>
                            prev.map((t) => ({
                              ...t,
                              selected: true,
                              is_outside_boundary_penalty: value,
                            }))
                          );
                          setIsTeamsDirty(true);
                        }}
                      />
                    </Box>

                    {/* Team Cards */}
                    {filteredData.map((team) => (
                      <Box
                        key={team.id}
                        p={2}
                        mt={2}
                        sx={{
                          border: "1px solid #eee",
                          borderRadius: 1.5,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <CustomCheckbox
                              checked={team.selected}
                              onChange={() => {
                                setTeams((prev) =>
                                  prev.map((t) =>
                                    t.id === team.id
                                      ? { ...t, selected: !t.selected }
                                      : t
                                  )
                                );
                                setIsTeamsDirty(true);
                              }}
                            />
                            <Typography>{team.name}</Typography>
                          </Box>

                          <IOSSwitch
                            checked={team.is_outside_boundary_penalty || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setTeams((prev) =>
                                prev.map((t) =>
                                  t.id === team.id
                                    ? {
                                        ...t,
                                        is_outside_boundary_penalty: checked,
                                        selected: true,
                                      }
                                    : t
                                )
                              );
                              setIsTeamsDirty(true);
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* ---------------- USERS LIST ---------------- */}
              {showUsersList && (
                <>
                  {/* Search + Update Row */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    mx={2}
                  >
                    <TextField
                      placeholder="Search name or team name"
                      value={searchUser}
                      onChange={(e) => setSerachUser(e.target.value)}
                      sx={{ width: "40%" }}
                    />

                    {(filteredUserData.some((t) => t.selected) ||
                      isUsersDirty) && (
                      <Button
                        variant="contained"
                        onClick={handleUpdateSelectedUsers}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 3,
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  {/* Modern Users List */}
                  <Box
                    m={2}
                    p={2.5}
                    sx={{
                      border: "1px solid #ececec",
                      background: "#fafafa",
                      borderRadius: 2,
                    }}
                  >
                    {/* SELECT ALL USERS */}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
                        <CustomCheckbox
                          checked={
                            filteredUserData.length > 0 &&
                            filteredUserData.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUsers((prev) =>
                              prev.map((t) => ({ ...t, selected: checked }))
                            );
                          }}
                        />
                        <Typography fontWeight={600} ml={1}>
                          Select All Users
                        </Typography>
                      </Box>

                      <IOSSwitch
                        onChange={(e) => {
                          const value = e.target.checked;
                          setUsers((prev) =>
                            prev.map((u) => ({
                              ...u,
                              selected: true,
                              is_outside_boundary_penalty: value,
                            }))
                          );
                          setIsUsersDirty(true);
                        }}
                      />
                    </Box>

                    {/* USER CARDS */}
                    {filteredUserData.map((user) => (
                      <Box
                        key={user.id}
                        p={2}
                        mt={2}
                        sx={{
                          border: "1px solid #eee",
                          borderRadius: 1.5,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <CustomCheckbox
                              checked={user.selected}
                              onChange={() => {
                                setUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id
                                      ? { ...u, selected: !u.selected }
                                      : u
                                  )
                                );
                                setIsUsersDirty(true);
                              }}
                            />
                            <Typography>
                              {user.first_name} {user.last_name}
                            </Typography>
                          </Box>

                          <IOSSwitch
                            checked={user.is_outside_boundary_penalty || false}
                            onChange={(e) => {
                              const value = e.target.checked;
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u.id === user.id
                                    ? {
                                        ...u,
                                        is_outside_boundary_penalty: value,
                                        selected: true,
                                      }
                                    : u
                                )
                              );
                              setIsUsersDirty(true);
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>

        {/* ------------------------------------------------------------ */}
        {/* STOP WORK PENALTY */}
        {/* ------------------------------------------------------------ */}
        <Box mt={6}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography
              variant="h1"
              fontSize="20px !important"
              fontWeight={500}
            >
              Enable Stop Work Penalty
            </Typography>

            <IOSSwitch checked={swEnabled} onChange={handleToggleStopWork} />
          </Box>

          <Divider sx={{ my: 2 }} />

          {swEnabled && (
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid #e5e5e5",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}
              mt={2}
            >
              {/* Small Header */}
              <Typography
                p={2}
                sx={{
                  backgroundColor: "#f7f7f7",
                  fontSize: "15px !important",
                  borderBottom: "1px solid #e5e5e5",
                  fontWeight: 500,
                }}
              >
                Automatic stop work
              </Typography>

              {/* TIME + BUTTON ROW */}
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                p={2.5}
              >
                <Grid size={{ sm: 2 }}>
                  <TextField
                    type="text"
                    value={swTemp}
                    placeholder="HH:MM"
                    size="small"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setSwTemp(raw);
                    }}
                    onBlur={() => {
                      const formatted = parseDigitsToTime(swTemp);
                      if (formatted) {
                        setSwTemp(formatted);
                        setSwValue(dayjs(formatted, "HH:mm"));
                      } else {
                        setSwTemp(swValue ? swValue.format("HH:mm") : "");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const formatted = parseDigitsToTime(swTemp);
                        if (formatted) {
                          setSwTemp(formatted);
                          setSwValue(dayjs(formatted, "HH:mm"));
                        } else {
                          setSwTemp(swValue ? swValue.format("HH:mm") : "");
                        }
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setSwTemp(swValue ? swValue.format("HH:mm") : "");
                      }
                    }}
                    sx={{
                      width: "90px",
                      "& input": {
                        textAlign: "center",
                        fontWeight: 400,
                      },
                    }}
                  />
                </Grid>

                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconUserPlus size={16} />}
                    onClick={() => {
                      setShowSwTeamsList(!showSwTeamsList);
                      setShowSwUsersList(false);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Teams
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<IconUser size={16} />}
                    onClick={() => {
                      setShowSwUsersList(!showSwUsersList);
                      setShowSwTeamsList(false);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Users
                  </Button>
                </Box>
              </Grid>

              {/* ==================== STOPWORK TEAMS ==================== */}
              {showSwTeamsList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    mx={2}
                  >
                    <TextField
                      placeholder="Search"
                      value={searchSwTeam}
                      onChange={(e) => setSearchSwTeam(e.target.value)}
                      sx={{ width: "40%" }}
                    />

                    {(filteredSwTeams.some((t) => t.selected) ||
                      swTeamsDirty) && (
                      <Button
                        variant="contained"
                        onClick={handleUpdateStopWorkTeams}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 3,
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2.5}
                    sx={{
                      border: "1px solid #ececec",
                      background: "#fafafa",
                      borderRadius: 2,
                    }}
                  >
                    {/* SELECT ALL TEAMS */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      mb={1}
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
                        <CustomCheckbox
                          checked={
                            filteredSwTeams.length > 0 &&
                            filteredSwTeams.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSwTeams((prev) =>
                              prev.map((t) => ({ ...t, selected: checked }))
                            );
                          }}
                        />

                        <Typography fontWeight={600} ml={1}>
                          Select All Teams
                        </Typography>
                      </Box>

                      <IOSSwitch
                        onChange={(e) => {
                          const chk = e.target.checked;
                          setSwTeams((prev) =>
                            prev.map((t) => ({
                              ...t,
                              selected: true,
                              is_autostop_work_penalty: chk,
                            }))
                          );
                          setSwTeamsDirty(true);
                        }}
                      />
                    </Box>

                    {/* TEAM CARDS */}
                    {filteredSwTeams.map((team) => (
                      <Box
                        key={team.id}
                        p={2}
                        mt={2}
                        sx={{
                          border: "1px solid #eee",
                          borderRadius: 1.5,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <CustomCheckbox
                              checked={team.selected}
                              onChange={() => {
                                setSwTeams((prev) =>
                                  prev.map((t) =>
                                    t.id === team.id
                                      ? { ...t, selected: !t.selected }
                                      : t
                                  )
                                );
                                setSwTeamsDirty(true);
                              }}
                            />
                            <Typography>{team.name}</Typography>
                          </Box>

                          <IOSSwitch
                            checked={team.is_autostop_work_penalty || false}
                            onChange={(e) => {
                              const ch = e.target.checked;
                              setSwTeams((prev) =>
                                prev.map((t) =>
                                  t.id === team.id
                                    ? {
                                        ...t,
                                        is_autostop_work_penalty: ch,
                                        selected: true,
                                      }
                                    : t
                                )
                              );
                              setSwTeamsDirty(true);
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* ==================== STOPWORK USERS ==================== */}
              {showSwUsersList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    mx={2}
                  >
                    <TextField
                      placeholder="Search"
                      value={searchSwUser}
                      onChange={(e) => setSearchSwUser(e.target.value)}
                      sx={{ width: "40%" }}
                    />

                    {(filteredSwUsers.some((t) => t.selected) ||
                      swUsersDirty) && (
                      <Button
                        variant="contained"
                        onClick={handleUpdateStopWorkUsers}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          px: 3,
                        }}
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2.5}
                    sx={{
                      border: "1px solid #ececec",
                      background: "#fafafa",
                      borderRadius: 2,
                    }}
                  >
                    {/* SELECT ALL USERS */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      mb={1}
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
                        <CustomCheckbox
                          checked={
                            filteredSwUsers.length > 0 &&
                            filteredSwUsers.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSwUsers((prev) =>
                              prev.map((t) => ({ ...t, selected: checked }))
                            );
                          }}
                        />

                        <Typography fontWeight={600} ml={1}>
                          Select All Users
                        </Typography>
                      </Box>

                      <IOSSwitch
                        onChange={(e) => {
                          const value = e.target.checked;
                          setSwUsers((prev) =>
                            prev.map((u) => ({
                              ...u,
                              selected: true,
                              is_autostop_work_penalty: value,
                            }))
                          );
                          setSwUsersDirty(true);
                        }}
                      />
                    </Box>

                    {/* USER CARDS */}
                    {filteredSwUsers.map((user) => (
                      <Box
                        key={user.id}
                        p={2}
                        mt={2}
                        sx={{
                          border: "1px solid #eee",
                          borderRadius: 1.5,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <CustomCheckbox
                              checked={user.selected}
                              onChange={() => {
                                setSwUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id
                                      ? { ...u, selected: !u.selected }
                                      : u
                                  )
                                );
                                setSwUsersDirty(true);
                              }}
                            />

                            <Typography>
                              {user.first_name} {user.last_name}
                            </Typography>
                          </Box>

                          <IOSSwitch
                            checked={user.is_autostop_work_penalty || false}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setSwUsers((prev) =>
                                prev.map((u) =>
                                  u.id === user.id
                                    ? {
                                        ...u,
                                        is_autostop_work_penalty: val,
                                        selected: true,
                                      }
                                    : u
                                )
                              );
                              setSwUsersDirty(true);
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
