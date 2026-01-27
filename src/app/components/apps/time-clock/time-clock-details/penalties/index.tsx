"use client";

import React, { useEffect, useState } from "react";
import api from "@/utils/axios";
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Button,
    Divider,
    Chip,
} from "@mui/material";
import { IconArrowLeft, IconClock, IconAlertTriangle } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ChecklogsPageProps {
    worklogId: number;
    onClose: () => void;
}

interface PenaltyItem {
    penalty_id?: number;
    payable_hours?: string | number | null;
    formatted_start_time?: string;
    formatted_end_time?: string;
    penalty_type?: string | null;
    penalty_minutes?: string | null;
}

export default function Penalties({ worklogId, onClose }: ChecklogsPageProps) {
    const [loading, setLoading] = useState(false);
    const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
    const [day, setDay] = useState("");
    const [date, setDate] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (worklogId > 0) fetchPenalties();
    }, [worklogId]);

    const fetchPenalties = async () => {
        setLoading(true);
        try {
            const res = await api.get(`get-worklog-penalties?worklog_id=${worklogId}`);
            if (res.data?.IsSuccess) {
                setPenalties(res.data.info || []);
                setDay(res.data.worklog_day || "");
                setDate(res.data.worklog_date || "");
            }
        } catch (err) {
            toast.error("Failed to fetch penalties");
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePenaltyAppeal = async (penalty: PenaltyItem) => {
        // try {
        //     setIsDeleting(true);
        //     const res = await api.post("remove-penalty-appeal", {
        //         worklog_id: worklogId,
        //         penalty_id: penalty.penalty_id,
        //     });
        //
        //     if (res.data?.IsSuccess) {
        //         toast.success("Penalty appeal removed");
        //         fetchPenalties();
        //     } else {
        //         toast.error(res.data?.message || "Failed");
        //     }
        // } catch {
        //     toast.error("Something went wrong");
        // } finally {
        //     setIsDeleting(false);
        // }
    };
    
    const handleDeletePenalty = async (penalty: PenaltyItem) => {
        try {
            setIsDeleting(true);
            const res = await api.post("time-clock/delete-penalty", {
                penalty_id: penalty.penalty_id,
            });

            if (res.data?.IsSuccess) {
                fetchPenalties();
                onClose()
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsDeleting(false);
        }
    };

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return "-";
        const num = parseFloat(val.toString());
        if (isNaN(num)) return "-";

        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };
    
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={2}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton onClick={onClose}>
                    <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={700}>
                    {date} {day}
                </Typography>
            </Box>

            {/* Penalty Cards */}
            {penalties.length > 0 ? (
                penalties.map((penalty, idx) => (
                    <Box
                        key={idx}
                        mb={2}
                        sx={{
                            borderRadius: 1,
                            p: 2,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                    >
                        {/* Top Row */}
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography fontWeight={700}>
                                    {penalty.penalty_type || "Penalty"}
                                </Typography>
                            </Box>

                            {/*<Button*/}
                            {/*    variant="outlined"*/}
                            {/*    color="error"*/}
                            {/*    size="small"*/}
                            {/*    disabled={isDeleting}*/}
                            {/*    onClick={() => handleRemovePenaltyAppeal(penalty)}*/}
                            {/*    sx={{ borderRadius: 2, textTransform: "none" }}*/}
                            {/*>*/}
                            {/*    Remove Appeal*/}
                            {/*</Button>*/}

                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                disabled={isDeleting}
                                onClick={() => handleDeletePenalty(penalty)}
                                sx={{ borderRadius: 2, textTransform: "none" }}
                            >
                                Delete
                            </Button>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Info Section */}
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                    Worklog Time:{" "}
                                    {formatHour(penalty.payable_hours)} H
                                    ({penalty.formatted_start_time || "-"}-{penalty.formatted_end_time || "-"})
                                </Typography>
                            </Box>

                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">
                                    Penalty Minute:{" "}
                                    <strong>{penalty.penalty_minutes || 0} Minutes</strong>
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                ))
            ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <Typography color="text.secondary">No penalties found.</Typography>
                </Box>
            )}
        </Box>
    );
}
