"use client";

import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Typography,
    Grid,
    Autocomplete,
    Drawer,
    IconButton,
    TextField,
    InputAdornment,
} from "@mui/material";
import toast from "react-hot-toast";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";

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

// ── NEW: Trade interface ──
interface Trade {
    id: number;
    name: string;
}

// ── NEW: Trade max limit entry ──
interface TradeMaxLimit {
    trade_id: number;
    trade_name: string;
    max_limit: string;
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
        max_members: "",
    });

    const [isSaving, setIsSaving] = useState(false);
    const [userList, setUserList] = useState<UserList[]>([]);

    // ── NEW states ──
    const [tradeData, setTradeData] = useState<Trade[]>([]);
    const [tradeMaxLimits, setTradeMaxLimits] = useState<TradeMaxLimit[]>([]);
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [tradeMaxInput, setTradeMaxInput] = useState<string>("");

    const session = useSession();
    const id = session.data?.user as User & { company_id?: number | null };

    const getUniqueUsersById = (users: any[]) => {
        const idMap = new Map();
        const nameMap = new Map();
        const uniqueUsers: any[] = [];

        users.forEach((user) => {
            if (!user) return;
            const hasId = user.id !== undefined && user.id !== null;
            const idKey = hasId ? Number(user.id) : null;
            const nameKey = user.name ? String(user.name).trim().toLowerCase() : null;

            if (idKey !== null && idMap.has(idKey)) return;
            if (nameKey !== null && nameMap.has(nameKey)) return;

            if (idKey !== null) idMap.set(idKey, true);
            if (nameKey !== null) nameMap.set(nameKey, true);
            
            uniqueUsers.push(user);
        });
        return uniqueUsers;
    };

    const fetchUniqueUsers = async () => {
        try {
            if (!teamId || !id?.company_id) return;
            const res = await api.get(
                `team/user-list-web?team_id=${teamId}&company_id=${id.company_id}`
            );
            if (!res.data?.info) return;
            setFormData((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    team_members: getUniqueUsersById([
                        ...prev.team_members,
                        ...res.data.info,
                    ]),
                };
            });
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(`user/user-options-web`);
            if (res.data?.info) setUserList(res.data.info);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchTrades = async () => {
        try {
            if (!id?.company_id) return;
            const res = await api.get(`trade/get-trades-web?company_id=${id.company_id}`);
            if (res.data?.info) setTradeData(res.data.info);
        } catch (err) {
            console.error("Failed to fetch trades", err);
        }
    };

    useEffect(() => {
        if (open) fetchUsers();
    }, [open]);

    useEffect(() => {
        if (open && id?.company_id) fetchTrades();
    }, [open, id?.company_id]);

    const fetchTeamData = async () => {
        if (!teamId) return;
        try {
            const res = await api.get(`team/get-team-detail-web?team_id=${teamId}`);
            if (!res.data?.info) return;

            const flattened = res.data.info.flatMap(
                (team: any) =>
                    team.users?.map((user: any) => ({
                        supervisor_id: team.supervisor_id,
                        team_id: team.team_id,
                        team_name: team.team_name,
                        id: user.id,
                        name: user.name,
                        image: user.image,
                    })) || []
            );

            const uniqueMembers = getUniqueUsersById(flattened);
            const team = res.data.info.find(
                (item: any) => String(item.team_id) === String(teamId)
            );
            if (!team) return;

            setFormData((prev: any) => ({
                ...prev,
                id: team.team_id,
                name: team.team_name,
                supervisor_id: team.supervisor_id,
                team_member_ids: uniqueMembers.map((u) => u.id),
                team_members: uniqueMembers,
                max_members: team.max_members ?? "",
            }));

            if (Array.isArray(team.trade_max_limits) && team.trade_max_limits.length > 0) {
                setTradeMaxLimits(
                    team.trade_max_limits.map((t: any) => ({
                        trade_id: t.trade_id,
                        trade_name: t.trade_name ?? "",
                        max_limit: String(t.max_members ?? ""),
                    }))
                );
            } else {
                setTradeMaxLimits([]);
            }
        } catch (error) {
            console.error("Error fetching team data:", error);
        }
    };

    useEffect(() => {
        if (!open || !teamId) return;
        const loadData = async () => {
            await fetchTeamData();
            await fetchUniqueUsers();
        };
        loadData();
    }, [open, teamId]);

    const hanleClose = () => {
        setFormData({
            id: teamId,
            name: "",
            supervisor_id: 0,
            team_member_ids: [],
            team_members: [],
            max_members: "",
        });
        // ── NEW: reset trade fields ──
        setTradeMaxLimits([]);
        setSelectedTrade(null);
        setTradeMaxInput("");
        onClose();
    };

    // ── NEW: add trade + max limit row ──
    const handleAddTradeLimit = () => {
        if (!selectedTrade || tradeMaxInput === "") return;

        const exists = tradeMaxLimits.find((t) => t.trade_id === selectedTrade.id);
        if (exists) {
            // update existing
            setTradeMaxLimits((prev) =>
                prev.map((t) =>
                    t.trade_id === selectedTrade.id
                        ? { ...t, max_limit: tradeMaxInput }
                        : t
                )
            );
        } else {
            setTradeMaxLimits((prev) => [
                ...prev,
                {
                    trade_id: selectedTrade.id,
                    trade_name: selectedTrade.name,
                    max_limit: tradeMaxInput,
                },
            ]);
        }
        setSelectedTrade(null);
        setTradeMaxInput("");
    };

    // ── NEW: remove a trade row ──
    const handleRemoveTradeLimit = (trade_id: number) => {
        setTradeMaxLimits((prev) => prev.filter((t) => t.trade_id !== trade_id));
    };

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
                max_members:
                    formData.max_members !== ""
                        ? parseInt(formData.max_members)
                        : null,
                // ── NEW: include trade max limits in payload ──
                trade_max_limits: tradeMaxLimits.map((t) => ({
                    trade_id: t.trade_id,
                    max_limit: parseInt(t.max_limit),
                })),
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
            onClose={hanleClose}
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
            <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
                <Box className="task-form">
                    <Grid container>
                        <Grid size={{ xs: 12, lg: 12 }}>

                            {/* ── Header ── */}
                            <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                                <IconButton onClick={hanleClose}>
                                    <IconArrowLeft />
                                </IconButton>
                                <Typography variant="h6" color="inherit" fontWeight={700}>
                                    Edit Team
                                </Typography>
                            </Box>

                            {/* ── Name ── */}
                            <Typography variant="body2" mt={3}>Name</Typography>
                            <CustomTextField
                                name="name"
                                placeholder="Enter team name..."
                                value={formData?.name || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                inputProps={{ maxLength: 50 }}
                                fullWidth
                            />

                            {/* ── Supervisor ── */}
                            <Typography variant="body2" mt={3}>Supervisor</Typography>
                            <Autocomplete
                                fullWidth
                                disableCloseOnSelect
                                options={userList}
                                value={userList.find((u) => u.id === formData?.supervisor_id) || null}
                                onChange={(event, newValue) => {
                                    setFormData((prev: any) =>
                                        prev ? { ...prev, supervisor_id: newValue?.id ?? 0 } : prev
                                    );
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
                                                minHeight: 40,
                                                paddingTop: "10px",
                                                paddingBottom: "10px",
                                                paddingRight: "30px",
                                            },
                                            "& .MuiAutocomplete-tag": { margin: "4px", maxWidth: "100%" },
                                            "& .MuiAutocomplete-endAdornment": {
                                                right: "8px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                            },
                                        }}
                                        placeholder="Select supervisor..."
                                        className="team_selection"
                                    />
                                )}
                            />

                            {/* ── Team Members ── */}
                            <Typography variant="body2" mt={3}>Team Member&apos;s</Typography>
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
                                                minHeight: 40,
                                                paddingTop: "10px",
                                                paddingBottom: "10px",
                                                paddingRight: "30px",
                                            },
                                            "& .MuiAutocomplete-tag": { margin: "4px", maxWidth: "100%" },
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

                            {/* ── Max Members ── */}
                            <Typography variant="body2" mt={3}>Max Members</Typography>
                            <TextField
                                name="max_members"
                                type="number"
                                placeholder="Enter max members limit..."
                                fullWidth
                                size="small"
                                value={formData?.max_members ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        max_members:
                                            val === ""
                                                ? ""
                                                : Math.min(1000, Math.max(1, parseInt(val))),
                                    }));
                                }}
                                inputProps={{ min: 1, max: 1000 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconUsers size={16} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            
                            <Typography variant="body2" mt={3} mb={1}>
                                Trade-wise Max Members
                            </Typography>

                            {tradeData.length > 0 ? (
                                <Box display="flex" flexDirection="column" gap={1}>
                                    {tradeData.map((trade) => {
                                        const current = tradeMaxLimits.find((t) => t.trade_id === trade.id);
                                        return (
                                            <Box
                                                key={trade.id}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                gap={2}
                                                sx={{
                                                    px: 1.5,
                                                    py: 1,
                                                    borderRadius: 2,
                                                    backgroundColor: "#fff",
                                                    border: "1px solid #e0e0e0",
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={500} 
                                                sx={{ flex: 1, display: "-webkit-box",
                                                    WebkitBoxOrient: "vertical",
                                                    WebkitLineClamp: 3,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    lineHeight: 1.25,
                                                    wordBreak: "break-word"
                                                }}>
                                                    {trade.name}
                                                </Typography>
                                                <TextField
                                                    type="number"
                                                    placeholder="Max"
                                                    size="small"
                                                    value={current?.max_limit ?? ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const limit = val === "" ? "" : String(Math.min(1000, Math.max(1, parseInt(val))));
                                                        setTradeMaxLimits((prev) => {
                                                            const exists = prev.find((t) => t.trade_id === trade.id);
                                                            if (val === "") {
                                                                return prev.filter((t) => t.trade_id !== trade.id);
                                                            }
                                                            if (exists) {
                                                                return prev.map((t) =>
                                                                    t.trade_id === trade.id ? { ...t, max_limit: limit } : t
                                                                );
                                                            }
                                                            return [...prev, { trade_id: trade.id, trade_name: trade.name, max_limit: limit }];
                                                        });
                                                    }}
                                                    inputProps={{ min: 1, max: 1000 }}
                                                    sx={{ width: 120 }}
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <IconUsers size={14} />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No trades found.
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Box>
            </Box>

            {/* ── Footer ── */}
            <Box sx={{ display: "flex", justifyContent: "start", gap: 2, marginTop: 3 }}>
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
                    onClick={hanleClose}
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
