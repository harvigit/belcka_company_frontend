"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import {
    Button,
    Typography,
    Box,
    Grid,
    Autocomplete,
    Drawer,
    IconButton,
    TextField,
    InputAdornment,
} from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";
import { TeamList, UserList } from "../list";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

const CreateTeam: React.FC<Props> = ({ open, onClose, onWorkUpdated }) => {
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
        max_members: "",
    });

    // ── Fetch company-level default limit and pre-fill ──
    const fetchCompanyLimit = async () => {
        try {
            const res = await api.get('team/company-team-members-limit');
            const limit = res.data?.info;
            if (limit !== null && limit !== undefined && Number(limit) >= 0) {
                setFormData((prev: any) => ({
                    ...prev,
                    max_members: Number(limit),
                }));
            }
        } catch {
            // silently fail — field stays empty
        }
    };

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const res = await api.get(`team/user-list?company_id=${user.company_id}`);
            if (res.data) setUsers(res.data.info);
        } catch (err) {
            console.error("Failed to fetch trades", err);
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`user/get-user-lists`);
            if (res.data) setData(res.data.info);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (open) {
            fetchTrades();
        }
    }, [user?.company_id, open]);

    useEffect(() => {
        if (open) {
            fetchUsers();
            // Reset form first, then fetch and apply the company default
            setFormData({
                id: 0,
                name: "",
                supervisor_id: 0,
                team_member_ids: [],
                max_members: "",
            });
            fetchCompanyLimit();
        }
    }, [user?.id, open]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prevData: any) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                team_member_ids: formData.team_member_ids.join(","),
                company_id: user.company_id,
                max_members: formData.max_members !== "" ? parseInt(formData.max_members) : null,
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
            <Box sx={{ flex: 1, overflowY: "auto", paddingRight: 1 }}>
                <Box className="task-form">
                    <Grid container>
                        <Grid size={{ xs: 12, lg: 12 }}>

                            {/* ── Header ── */}
                            <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                                <IconButton onClick={onClose}>
                                    <IconArrowLeft />
                                </IconButton>
                                <Typography variant="h6" color="inherit" fontWeight={700}>
                                    Add Team
                                </Typography>
                            </Box>

                            {/* ── Name ── */}
                            <Typography variant="h5" mt={3}>
                                Name
                            </Typography>
                            <CustomTextField
                                id="name"
                                name="name"
                                placeholder="Enter team name.."
                                value={formData.name}
                                onChange={handleChange}
                                inputProps={{ maxLength: 50 }}
                                fullWidth
                            />

                            {/* ── Supervisor ── */}
                            <Typography variant="h5" mt={3}>
                                Supervisor
                            </Typography>
                            <Autocomplete
                                fullWidth
                                disableCloseOnSelect
                                options={data || []}
                                value={
                                    data?.find((item: any) => item.id === formData.supervisor_id) || null
                                }
                                onChange={(event, newValue) => {
                                    setFormData({
                                        ...formData,
                                        supervisor_id: newValue ? newValue.id : null,
                                    });
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
                            <Typography variant="h5" mt={3}>
                                Team Member&apos;s
                            </Typography>
                            <Autocomplete
                                multiple
                                fullWidth
                                disableCloseOnSelect
                                options={users || []}
                                value={users.filter((u) =>
                                    formData.team_member_ids.includes(Number(u.id))
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
                                        placeholder="Select team members..."
                                        className="team_selection"
                                    />
                                )}
                            />

                            {/* ── Max Members ── */}
                            <Typography variant="h5" mt={3}>
                                Max Members
                            </Typography>
                            <TextField
                                name="max_members"
                                type="number"
                                placeholder="Enter max members limit..."
                                fullWidth
                                size="small"
                                value={formData.max_members}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev: any) => ({
                                        ...prev,
                                        max_members: val === "" ? "" : Math.max(1, parseInt(val)),
                                    }));
                                }}
                                inputProps={{ min: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconUsers size={16} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
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
