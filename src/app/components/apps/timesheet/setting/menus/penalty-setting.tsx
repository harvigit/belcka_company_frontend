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

  const [swEnabled, setSwEnabled] = useState<boolean>(false);
  const [swValue, setSwValue] = useState<Dayjs | null>(dayjs());
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
        setValue(
          res.data.data.outside_boundary_penalty_minute
            ? dayjs(res.data.data.outside_boundary_penalty_minute, "HH:mm")
            : null
        );

        setSwEnabled(res.data.data.is_autostop_work_penalty);
        setSwValue(
          res.data.data.autostop_work_penalty_minute
            ? dayjs(res.data.data.autostop_work_penalty_minute, "HH:mm")
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
    };

    try {
      const res = await api.post("setting/save-general-setting", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
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
      const res = await api.post("setting/save-stop-work-setting", {
        is_autostop_work_penalty_penalty: newStatus,
      });
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        fetchUsers();
        fetchTeams();
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
    <Box display={"flex"} overflow="auto">
      <Box sx={{ p: 3 }} m="auto" width={"60%"}>
        <Box>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h1" fontSize={"20px !important"}>
              Enable outside working Penalty
            </Typography>
            <IOSSwitch checked={enabled} onChange={handleToggle} />
          </Box>

          <Divider sx={{ my: 2 }} />

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
                alignItems="center"
                mt={2}
                justifyContent="space-between"
                p={2}
                pt={0}
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
                    />
                  </LocalizationProvider>
                </Grid>

                <Box display={"flex"} gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconUserPlus size={16} />}
                    onClick={() => {
                      setShowTeamsList(!showTeamsList);
                      setShowUsersList(false);
                    }}
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
                  >
                    Users
                  </Button>
                </Box>
              </Grid>

              {/* === Team list */}
              {showTeamsList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    ml={2}
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
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2}
                    sx={{ border: "1px solid #ccc", background: "#fafafa" }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
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

                    {filteredData.map((team) => (
                      <Box key={team.id} p={2} border="1px solid #eee" mt={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <input
                              type="checkbox"
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

              {/* === users list */}
              {showUsersList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    ml={2}
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
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2}
                    sx={{ border: "1px solid #ccc", background: "#fafafa" }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
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

                    {filteredUserData.map((user) => (
                      <Box key={user.id} p={2} mt={2} border="1px solid #eee">
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <input
                              type="checkbox"
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

                            <Typography fontWeight={600}>
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

        {/* stop work penalty*/}
        <Box mt={6}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h1" fontSize={"20px !important"}>
              Enable Stop Work Penalty
            </Typography>
            <IOSSwitch checked={swEnabled} onChange={handleToggleStopWork} />
          </Box>

          <Divider sx={{ my: 2 }} />

          {swEnabled && (
            <Box sx={{ border: "1px solid #ebe9f1" }} mt={2}>
              <Typography
                p={1}
                sx={{ backgroundColor: "#e3e3e3", fontSize: "15px !important" }}
                fontWeight={500}
              >
                Automatic stop work
              </Typography>
              <Grid
                container
                alignItems="center"
                mt={2}
                justifyContent="space-between"
                p={2}
                pt={0}
              >
                <Grid size={{ sm: 2 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      format="HH:mm"
                      ampm={false}
                      value={swValue}
                      onChange={(val) => setSwValue(val ? dayjs(val) : null)}
                    />
                  </LocalizationProvider>
                </Grid>

                <Box display={"flex"} gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<IconUserPlus size={16} />}
                    onClick={() => {
                      setShowSwTeamsList(!showSwTeamsList);
                      setShowSwUsersList(false);
                    }}
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
                  >
                    Users
                  </Button>
                </Box>
              </Grid>

              {/* team list */}
              {showSwTeamsList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    ml={2}
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
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2}
                    sx={{ border: "1px solid #ccc", background: "#fafafa" }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
                        <input
                          type="checkbox"
                          checked={
                            filteredSwTeams.length > 0 &&
                            filteredSwTeams.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSwTeams((prev) =>
                              prev.map((t) => ({
                                ...t,
                                selected: checked,
                              }))
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

                    {filteredSwTeams.map((team) => (
                      <Box key={team.id} p={2} mt={2} border="1px solid #eee">
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <input
                              type="checkbox"
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
                                    ? { ...t, is_autostop_work_penalty: ch, selected: true }
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

              {/* user list */}
              {showSwUsersList && (
                <>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    mt={2}
                    ml={2}
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
                      >
                        Update
                      </Button>
                    )}
                  </Box>

                  <Box
                    m={2}
                    p={2}
                    sx={{ border: "1px solid #ccc", background: "#fafafa" }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      ml={2}
                      mr={2}
                    >
                      <Box display="flex" gap={2} alignItems="center">
                        <input
                          type="checkbox"
                          checked={
                            filteredSwUsers.length > 0 &&
                            filteredSwUsers.every((t) => t.selected)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSwUsers((prev) =>
                              prev.map((t) => ({
                                ...t,
                                selected: checked,
                              }))
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

                    {filteredSwUsers.map((user) => (
                      <Box key={user.id} p={2} mt={2} border="1px solid #eee">
                        <Box display="flex" justifyContent="space-between">
                          <Box display="flex" gap={2} alignItems="center">
                            <input
                              type="checkbox"
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

                            <Typography fontWeight={600}>
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
