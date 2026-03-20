"use client";
import React, { useEffect, useState } from "react";
import {
    Button,
    Typography,
    Box,
    Drawer,
    IconButton,
    TextField,
    InputAdornment,
} from "@mui/material";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";

interface Props {
    open: boolean;
    onClose: () => void;
    onWorkUpdated?: () => void;
}

const TeamMembersLimit: React.FC<Props> = ({ open, onClose, onWorkUpdated }) => {
    const [globalMax, setGlobalMax] = useState<number | string>('');
    const [applying, setApplying] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch stored value
    const fetchCurrentLimit = async () => {
        try {
            setLoading(true);
            const res = await api.get('team/company-team-members-limit');
            setGlobalMax(res.data?.info ?? 0);
        } catch {
            toast.error('Failed to load current limit');
        } finally {
            setLoading(false);
        }
    };

    // Call when drawer opens
    useEffect(() => {
        if (open) {
            fetchCurrentLimit();
        }
    }, [open]);

    const handleApply = async () => {
        const parsed = parseInt(String(globalMax), 10);
        if (isNaN(parsed) || parsed < 0) {
            toast.error('Please enter a valid number (minimum 0).');
            return;
        }
        setApplying(true);
        try {
            await api.post('team/company-team-members-limit', { max_members: parsed });
            toast.success(`Max members set to ${parsed} for all teams.`);
            onWorkUpdated?.();
            onClose();
        } catch {
            toast.error('Failed to apply global setting.');
        } finally {
            setApplying(false);
        }
    };

    const isDisabled = applying || loading || globalMax === '' || isNaN(Number(globalMax));

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 400,
                "& .MuiDrawer-paper": {
                    width: 400,
                    padding: 2,
                },
            }}
        >
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Header */}
                <Box display="flex" alignItems="center" mb={2}>
                    <IconButton onClick={onClose} edge="start">
                        <IconArrowLeft />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} ml={1}>
                        Team Members Limit
                    </Typography>
                </Box>

                {/* Main content */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" mb={1}>
                        Max Members
                    </Typography>

                    <TextField
                        type="number"
                        placeholder="Enter max members..."
                        fullWidth
                        size="small"
                        value={globalMax}
                        disabled={loading}
                        onChange={(e) => {
                            const val = e.target.value;
                            setGlobalMax(val === '' ? '' : Math.min(1000, Math.max(1, parseInt(val) || 1)));
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
                </Box>

                {/* Footer buttons */}
                <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleApply}
                        sx={{ borderRadius: 3 }}
                        className="drawer_buttons"
                        disabled={isDisabled}
                    >
                        {applying ? "Saving..." : "Save"}
                    </Button>

                    <Button
                        variant="contained"
                        color="inherit"
                        onClick={onClose}
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
            </Box>
        </Drawer>
    );
};

export default TeamMembersLimit;
