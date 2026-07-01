import React, { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Button,
  TextField,
  InputAdornment,
  Avatar,
  Stack,
  Skeleton,
  MenuItem,
  Chip,
} from "@mui/material";
import { Box } from "@mui/system";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import IOSSwitch from "@/app/components/common/IOSSwitch";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

interface UserItem {
  id: number;
  name: string;
  user_image?: string | null;
  is_show_store: boolean;
}

interface TeamItem {
  team_id: number;
  name: string;
  users: {
    id: number;
    name: string;
    image?: string | null;
  }[];
}

export default function StoreSettings() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [originalUsers, setOriginalUsers] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [fetchUser, setFetchUser] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchData = async () => {
    setFetchUser(true);
    try {
      const teamsRes = await api.get("team/get-team-member-list");

      if (teamsRes.data?.info) {
        const uniqueUsersMap = new Map<number, UserItem>();
        const coreTeams = teamsRes.data.info.filter((t: any) => !t.subcontractor_company_id);
        const normalizedTeams = coreTeams.map((t: any) => {
          const teamUsers = Array.isArray(t.users)
            ? t.users.map((u: any) => {
              const uid = Number(u.id);
              const name = u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "-";
              const image = u.image || u.user_image || null;
              const isShowStore = Boolean(u.is_show_store);

              if (uid && !uniqueUsersMap.has(uid)) {
                uniqueUsersMap.set(uid, {
                  id: uid,
                  name,
                  user_image: image,
                  is_show_store: isShowStore,
                });
              }

              return {
                id: uid,
                name,
                image,
              };
            })
            : [];

          return {
            team_id: t.team_id || t.id,
            name: t.name || t.team_name || "Unnamed Team",
            users: teamUsers,
          };
        });

        const canonicalUsers = Array.from(uniqueUsersMap.values());

        setTeams(normalizedTeams);
        setUsers(canonicalUsers);
        setOriginalUsers(canonicalUsers.map((u) => ({ ...u })));
      }
    } catch (err) {
      console.error("Failed to fetch store settings data", err);
    } finally {
      setFetchUser(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.company_id]);

  const filteredTeamsData = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();

    return teams
      .filter((t) => selectedTeam === "All" || String(t.team_id) === selectedTeam)
      .map((t) => {
        const matchingUsers = t.users.filter((u) => {
          if (!s) return true;
          return u.name.toLowerCase().includes(s);
        });
        return {
          ...t,
          matchingUsers,
        };
      })
      .filter((t) => t.matchingUsers.length > 0);
  }, [teams, selectedTeam, searchTerm]);

  const hasChanges = useMemo(() => {
    return users.some((u) => {
      const orig = originalUsers.find((o) => o.id === u.id);
      if (!orig) return false;
      return orig.is_show_store !== u.is_show_store;
    });
  }, [users, originalUsers]);

  const handleToggleUser = (id: number, checked: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_show_store: checked } : u))
    );
  };

  // Determine if all matched users in a specific team have store settings enabled
  const isTeamFullySelected = (teamSection: typeof filteredTeamsData[0]) => {
    if (teamSection.matchingUsers.length === 0) return false;
    return teamSection.matchingUsers.every((u) => {
      const found = users.find((userObj) => userObj.id === u.id);
      return found ? found.is_show_store : false;
    });
  };

  // Bulk switch toggle handler for a specific team roster
  const handleTeamToggle = (teamSection: typeof filteredTeamsData[0], checked: boolean) => {
    const targetUserIds = teamSection.matchingUsers.map((u) => u.id);
    setUsers((prev) =>
      prev.map((u) => {
        if (targetUserIds.includes(u.id)) {
          return { ...u, is_show_store: checked };
        }
        return u;
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        company_id: user?.company_id,
        users: users.map((u) => ({
          id: u.id,
          is_show_store: u.is_show_store,
        })),
      };

      const res = await api.post("setting/change-bulk-user-store-status", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setOriginalUsers(users.map((u) => ({ ...u })));
      }
    } catch (err: any) {
      console.error("Failed to save store settings", err);
    } finally {
      setSaving(false);
      await fetchData();
    }
  };

  const getUserState = (userId: number, fallbackName: string, fallbackImage?: string | null) => {
    const found = users.find((u) => u.id === userId);
    return {
      name: found?.name || fallbackName,
      image: found?.user_image || fallbackImage || "",
      isShowStore: found ? found.is_show_store : false,
    };
  };

  const isListViewEmpty = filteredTeamsData.length === 0;

  return (
    <Box>
      {/* Top Controller Bar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
        p={2}
        pb={0}
        flexWrap="wrap"
        gap={2}
      >
        <Typography fontWeight={600} variant="h6" ml={1}>
          Store Settings
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Team Filter Dropdown */}
          <TextField
            select
            size="small"
            label="Filter Team"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="All">All Teams</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.team_id} value={String(t.team_id)}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          {/* User Search Input */}
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 200 }}
          />

          {users.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={fetchUser || saving || !hasChanges}
              variant="contained"
              color="primary"
              sx={{ borderRadius: 2, minWidth: 100 }}
            >
              {saving ? "Updating..." : "Update"}
            </Button>
          )}
        </Stack>
      </Box>

      {/* Scrollable Grouped Card List Container */}
      <Box
        mx={2}
        sx={{
          height: "calc(95vh - 160px)",
          overflowY: "auto",
          pr: 1,
        }}
      >
        {fetchUser ? (
          Array.from(new Array(4)).map((_, idx) => (
            <Box key={idx} mb={3}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1.5, mb: 1.5 }} />
              <Skeleton variant="rectangular" height={65} sx={{ borderRadius: 2, mb: 1 }} />
              <Skeleton variant="rectangular" height={65} sx={{ borderRadius: 2 }} />
            </Box>
          ))
        ) : isListViewEmpty ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: 300,
            }}
          >
            <Image
              src="/images/no-data.png"
              alt="No data found"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              width={200}
              height={200}
            />
          </Box>
        ) : (
          <Box
            sx={{
              columnCount: { xs: 1, md: 2 },
              columnGap: "24px",
              pb: 4,
            }}
          >
            {/* Render Assigned Teams */}
            {filteredTeamsData.map((teamSection) => (
              <Box 
                key={teamSection.team_id}
                sx={{
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                  mb: 3,
                  display: "inline-block",
                  width: "100%",
                }}
              >
                {/* Stunning Section Header */}
                <Box
                  mb={1.5}
                  p={1.5}
                  px={2}
                  sx={{
                    background: "linear-gradient(145deg, #f6f8fa 0%, #e9ecef 100%)",
                    borderRadius: 2,
                    borderLeft: "4px solid #1a73e8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>

                    <Typography variant="subtitle1" fontWeight={600} color="#1a73e8">
                      Team: {teamSection.name}
                    </Typography>

                    <Chip
                      label={`${teamSection.matchingUsers.length} Users`}
                      size="small"
                      sx={{ fontWeight: 500, bgcolor: "#ffffff", color: "#495057" }}
                    />
                  </Stack>

                  {/* Team-wise Main Control Switch */}
                  <IOSSwitch
                    checked={isTeamFullySelected(teamSection)}
                    onChange={(e) => handleTeamToggle(teamSection, e.target.checked)}
                    disabled={saving}
                  />
                </Box>

                {/* Team Users Array */}
                <Stack spacing={1.2} pl={1}>
                  {teamSection.matchingUsers.map((targetUser) => {
                    const uState = getUserState(targetUser.id, targetUser.name, targetUser.image);
                    return (
                      <Box
                        key={targetUser.id}
                        p={1.5}
                        px={2}
                        sx={{
                          border: "1px solid #eef2f6",
                          borderRadius: 2,
                          background: "#ffffff",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                            background: "#fafbfc",
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                              src={uState.image}
                              alt={uState.name}
                              sx={{ width: 38, height: 38 }}
                            />
                            <Typography fontWeight={500} color="textPrimary">
                              {uState.name}
                            </Typography>
                          </Stack>

                          {/* Individual User Switch */}
                          <IOSSwitch
                            checked={uState.isShowStore}
                            onChange={(e) => handleToggleUser(targetUser.id, e.target.checked)}
                            disabled={saving}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
