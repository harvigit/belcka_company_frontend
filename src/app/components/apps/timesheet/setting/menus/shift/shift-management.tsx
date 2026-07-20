import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Collapse,
  IconButton,
  Avatar,
  CircularProgress,
  Stack,
  Button,
} from "@mui/material";
import { IconChevronDown, IconChevronUp, IconCheck } from "@tabler/icons-react";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";

interface Shift {
  id: number;
  name: string;
  days: string;
  time: string;
  enabled: boolean;
}

interface UserMember {
  id: number;
  name: string;
  email: string;
  image: string;
  avatar?: string;
  user_id?: number; // Depending on backend
  first_name?: string;
  last_name?: string;
}

interface Team {
  team_id: number;
  name: string;
  users: UserMember[];
}

interface Project {
  id: number;
  name: string;
}

const ShiftManagement = () => {
  const { data: session } = useSession();
  const user = session?.user as User & { company_id?: number | null };

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);

  // Matrix state mapping: shiftId -> Set of userIds assigned
  const [shiftAssignments, setShiftAssignments] = useState<
    Record<number, Set<number>>
  >({});

  // Prime shift state mapping: userId -> shiftId
  const [primeShifts, setPrimeShifts] = useState<Record<number, number>>({});
  // Prime shift state mapping: teamId -> shiftId
  const [teamPrimeShifts, setTeamPrimeShifts] = useState<
    Record<number, number>
  >({});

  // UI state for team row collapse
  const [openTeams, setOpenTeams] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (user?.company_id) {
      fetchProjects();
      fetchShifts();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (selectedProject) {
      fetchTeams(selectedProject.id);
    } else {
      setTeams([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const res = await api.get(`project/get?company_id=${user?.company_id}`);
      if (res.data?.info) {
        setProjects(res.data.info);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchShifts = async () => {
    try {
      setLoadingShifts(true);
      const response = await api.get("/setting/get-shift-settings");
      if (response.data?.IsSuccess) {
        const fetchedShifts: Shift[] = response.data.info.map((shift: any) => ({
          id: shift.id,
          name: shift.name,
          days: shift.days
            .filter((d: any) => d.status)
            .map((d: any) => d.name.substring(0, 3))
            .join(", "),
          time: `${shift.start_time} - ${shift.end_time}`,
          enabled: shift.status,
        }));
        setShifts(fetchedShifts);

        // Fetch assigned users for each shift to prefill the matrix
        const initialAssignments: Record<number, Set<number>> = {};
        for (const shift of fetchedShifts) {
          try {
            const assignedRes = await api.get(
              `/setting/shift-users/${shift.id}`,
            );
            const assignedIds = (assignedRes.data?.info || []).map((u: any) =>
              Number(u.id ?? u.user_id),
            );
            initialAssignments[shift.id] = new Set(assignedIds);
          } catch (e) {
            initialAssignments[shift.id] = new Set();
          }
        }
        setShiftAssignments(initialAssignments);
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoadingShifts(false);
    }
  };

  const fetchTeams = async (projectId: number) => {
    try {
      setLoadingTeams(true);
      const res = await api.get(
        `team/get-team-member-list?project_id=${projectId}`,
      );
      if (res.data?.info) {
        const fetchedTeams =
          res.data.info?.data || res.data.info || res.data.data || [];
        setTeams(fetchedTeams);
        // Open all teams by default
        const openState: Record<number, boolean> = {};
        fetchedTeams.forEach((t: Team) => {
          openState[t.team_id] = true;
        });
        setOpenTeams(openState);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const toggleTeamOpen = (teamId: number) => {
    setOpenTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Toggle a single user's prime shift
  const handleToggleUserPrime = (shiftId: number, userId: number) => {
    setPrimeShifts((prev) => {
      if (prev[userId] === shiftId) {
        // un-prime
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      }
      return { ...prev, [userId]: shiftId };
    });
    // Also ensure it's assigned if they make it prime
    setShiftAssignments((prev) => {
      const currentSet = new Set(prev[shiftId] || []);
      if (!currentSet.has(userId)) {
        currentSet.add(userId);
        return { ...prev, [shiftId]: currentSet };
      }
      return prev;
    });
  };

  // Toggle a team's prime shift (applies to all users in team)
  const handleToggleTeamPrime = (shiftId: number, team: Team) => {
    const teamUserIds = team.users?.map((u) => Number(u.id || u.user_id)) || [];
    if (teamUserIds.length === 0) return;

    setTeamPrimeShifts((prev) => {
      const isCurrentlyPrime = prev[team.team_id] === shiftId;

      // Update individual users
      setPrimeShifts((userPrev) => {
        const newUserState = { ...userPrev };
        teamUserIds.forEach((id) => {
          if (isCurrentlyPrime) {
            delete newUserState[id];
          } else {
            newUserState[id] = shiftId;
          }
        });
        return newUserState;
      });

      // Ensure they are assigned
      if (!isCurrentlyPrime) {
        setShiftAssignments((shiftPrev) => {
          const currentSet = new Set(shiftPrev[shiftId] || []);
          teamUserIds.forEach((id) => currentSet.add(id));
          return { ...shiftPrev, [shiftId]: currentSet };
        });
      }

      if (isCurrentlyPrime) {
        const newState = { ...prev };
        delete newState[team.team_id];
        return newState;
      }
      return { ...prev, [team.team_id]: shiftId };
    });
  };

  // Toggle a single user for a specific shift
  const handleToggleUserShift = (shiftId: number, userId: number) => {
    setShiftAssignments((prev) => {
      const currentSet = new Set(prev[shiftId] || []);
      if (currentSet.has(userId)) {
        currentSet.delete(userId);
      } else {
        currentSet.add(userId);
      }
      return { ...prev, [shiftId]: currentSet };
    });
  };

  // Toggle all users in a team for a specific shift
  const handleToggleTeamShift = (shiftId: number, team: Team) => {
    const teamUserIds = team.users?.map((u) => Number(u.id || u.user_id)) || [];
    if (teamUserIds.length === 0) return;

    setShiftAssignments((prev) => {
      const currentSet = new Set(prev[shiftId] || []);
      // Check if all team members are already assigned
      const allAssigned = teamUserIds.every((id) => currentSet.has(id));

      if (allAssigned) {
        // Unassign all
        teamUserIds.forEach((id) => currentSet.delete(id));
      } else {
        // Assign all
        teamUserIds.forEach((id) => currentSet.add(id));
      }
      return { ...prev, [shiftId]: currentSet };
    });
  };

  const isTeamFullyAssigned = (shiftId: number, team: Team) => {
    const teamUserIds = team.users?.map((u) => Number(u.id || u.user_id)) || [];
    if (teamUserIds.length === 0) return false;
    const currentSet = shiftAssignments[shiftId] || new Set();
    return teamUserIds.every((id) => currentSet.has(id));
  };

  const isTeamPartiallyAssigned = (shiftId: number, team: Team) => {
    const teamUserIds = team.users?.map((u) => Number(u.id || u.user_id)) || [];
    if (teamUserIds.length === 0) return false;
    const currentSet = shiftAssignments[shiftId] || new Set();
    const assignedCount = teamUserIds.filter((id) => currentSet.has(id)).length;
    return assignedCount > 0 && assignedCount < teamUserIds.length;
  };

  const isTeamFullyPrime = (shiftId: number, team: Team) => {
    const teamUserIds = team.users?.map((u) => Number(u.id || u.user_id)) || [];
    if (teamUserIds.length === 0) return false;
    return teamUserIds.every((id) => primeShifts[id] === shiftId);
  };

  const handleSaveAssignments = async () => {
    let success = true;
    for (const shiftId of Object.keys(shiftAssignments)) {
      const userIds = Array.from(shiftAssignments[Number(shiftId)]);
      try {
        await api.post("/setting/assign-shift-users", {
          shift_id: Number(shiftId),
          user_ids: userIds,
        });
      } catch (err) {
        success = false;
        console.error(`Error saving shift ${shiftId}:`, err);
      }
    }
    if (success) {
      toast.success("Shift assignments saved successfully!");
    } else {
      toast.error("Some assignments failed to save.");
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Card
        sx={{
          borderRadius: 2,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          flexShrink: 0,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <Box sx={{ width: "300px" }}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1, fontWeight: 600, color: "text.secondary" }}
              >
                Select Project
              </Typography>
              <Autocomplete
                options={projects}
                getOptionLabel={(option) => option.name}
                value={selectedProject}
                onChange={(_, newValue) => setSelectedProject(newValue)}
                loading={loadingProjects}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Choose a project"
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <React.Fragment>
                          {loadingProjects ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </React.Fragment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                      },
                    }}
                  />
                )}
              />
            </Box>

            <Button
              variant="contained"
              color="primary"
              startIcon={<IconCheck size={18} />}
              onClick={handleSaveAssignments}
              sx={{
                borderRadius: "10px",
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              Save Changes
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!selectedProject ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography color="text.secondary">
              Please select a project to manage shifts.
            </Typography>
          </Box>
        ) : loadingTeams || loadingShifts ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            sx={{
              flex: 1,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
              "&::-webkit-scrollbar": { height: "8px", width: "8px" },
              "&::-webkit-scrollbar-track": {
                background: "#f1f1f1",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#c1c1c1",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": { background: "#a8a8a8" },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      minWidth: 250,
                      fontWeight: 600,
                      bgcolor: "#f8faff",
                      borderBottom: "2px solid #e0e0e0",
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                    }}
                  >
                    Teams & Users
                  </TableCell>
                  {shifts.map((shift) => (
                    <TableCell
                      key={shift.id}
                      align="center"
                      sx={{
                        minWidth: 120,
                        bgcolor: "#f8faff",
                        borderBottom: "2px solid #e0e0e0",
                        p: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shift.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 10, lineHeight: 1 }}
                        >
                          {shift.time}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            mt: 0.5,
                            width: "100%",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: 9 }}
                          >
                            Prime
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: 9 }}
                          >
                            Assign
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {teams.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={shifts.length + 1}
                      align="center"
                      sx={{ py: 5 }}
                    >
                      <Typography color="text.secondary">
                        No teams assigned to this project.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => (
                    <React.Fragment key={team.team_id}>
                      {/* Team Row (Parent) */}
                      <TableRow
                        sx={{
                          "& > *": { borderBottom: "unset" },
                          bgcolor: "#fafafa",
                        }}
                      >
                        <TableCell
                          sx={{
                            position: "sticky",
                            left: 0,
                            bgcolor: "#fafafa",
                            zIndex: 2,
                            borderRight: "1px solid #f0f0f0",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => toggleTeamOpen(team.team_id)}
                            >
                              {openTeams[team.team_id] ? (
                                <IconChevronUp size={18} />
                              ) : (
                                <IconChevronDown size={18} />
                              )}
                            </IconButton>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {team.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ ml: "auto" }}
                            >
                              {team.users?.length || 0} members
                            </Typography>
                          </Box>
                        </TableCell>
                        {shifts.map((shift) => (
                          <TableCell key={shift.id} align="center">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <IOSSwitch
                                checked={isTeamFullyPrime(shift.id, team)}
                                onChange={() =>
                                  handleToggleTeamPrime(shift.id, team)
                                }
                                color="primary"
                                sx={{ transform: "scale(0.8)" }}
                              />
                              <Checkbox
                                size="small"
                                checked={isTeamFullyAssigned(shift.id, team)}
                                indeterminate={
                                  !isTeamFullyAssigned(shift.id, team) &&
                                  isTeamPartiallyAssigned(shift.id, team)
                                }
                                onChange={() =>
                                  handleToggleTeamShift(shift.id, team)
                                }
                                color="primary"
                                sx={{ p: 0 }}
                              />
                            </Box>
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* User Rows (Children) */}
                      {openTeams[team.team_id] &&
                        team.users?.map((user: UserMember) => {
                          const userId = Number(user.id || user.user_id);
                          const userName =
                            user.name ||
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                            "Unknown User";

                          return (
                            <TableRow
                              key={`user-${userId}`}
                              sx={{ "&:hover": { bgcolor: "#f5f8ff" } }}
                            >
                              <TableCell
                                sx={{
                                  position: "sticky",
                                  left: 0,
                                  bgcolor: "inherit",
                                  zIndex: 1,
                                  pl: 6, // Indent users
                                  borderRight: "1px solid #f0f0f0",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                  }}
                                >
                                  <Avatar
                                    src={user.image || user.avatar}
                                    sx={{ width: 24, height: 24, fontSize: 11 }}
                                  >
                                    {userName.charAt(0)}
                                  </Avatar>
                                  <Typography
                                    variant="body2"
                                    color="text.primary"
                                  >
                                    {userName}
                                  </Typography>
                                </Box>
                              </TableCell>
                              {shifts.map((shift) => (
                                <TableCell key={shift.id} align="center">
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      gap: 1.5,
                                    }}
                                  >
                                    <IOSSwitch
                                      checked={primeShifts[userId] === shift.id}
                                      onChange={() =>
                                        handleToggleUserPrime(shift.id, userId)
                                      }
                                      color="primary"
                                      sx={{ transform: "scale(0.8)" }}
                                    />
                                    <Checkbox
                                      size="small"
                                      checked={
                                        shiftAssignments[shift.id]?.has(
                                          userId,
                                        ) || false
                                      }
                                      onChange={() =>
                                        handleToggleUserShift(shift.id, userId)
                                      }
                                      color="primary"
                                      sx={{ p: 0 }}
                                    />
                                  </Box>
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default ShiftManagement;
