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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";
import { IconArrowLeft } from "@tabler/icons-react";
import toast from "react-hot-toast";

interface ChecklogsPageProps {
    worklogId: number;
    onClose: () => void;
}

interface PenaltyItem {
    appeal_note: string;
    penalty_id?: number;
    payable_hours?: string | number | null;
    formatted_start_time?: string;
    formatted_end_time?: string;
    penalty_type?: string | null;
    penalty_minutes?: string | null;
    is_penalty_appeal?: boolean;
    appeal_id?: number;
}

export default function Penalties({ worklogId, onClose }: ChecklogsPageProps) {
    const [loading, setLoading] = useState(false);
    const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
    const [day, setDay] = useState("");
    const [date, setDate] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [processingAppealId, setProcessingAppealId] = useState<number | null>(null);

    // Admin note dialog state
    const [openAdminNoteDialog, setOpenAdminNoteDialog] = useState(false);
    const [adminNote, setAdminNote] = useState("");
    const [selectedPenalty, setSelectedPenalty] = useState<PenaltyItem | null>(null);
    const [appealAction, setAppealAction] = useState<boolean>(false); // true = approve, false = reject

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

    const openAdminNotePrompt = (penalty: PenaltyItem, isApproved: boolean) => {
        setSelectedPenalty(penalty);
        setAppealAction(isApproved);
        setAdminNote("");
        setOpenAdminNoteDialog(true);
    };

    const handleAdminNoteSubmit = async () => {
        if (!selectedPenalty?.appeal_id) {
            toast.error("Appeal ID not found");
            return;
        }

        if (!adminNote.trim()) {
            toast.error("Please enter an admin note");
            return;
        }

        try {
            setProcessingAppealId(selectedPenalty.appeal_id);
            const res = await api.post("time-clock/appeal-action", {
                appeal_id: selectedPenalty.appeal_id,
                status: appealAction ? 5 : 12,
                admin_note: adminNote.trim(),
            });

            if (res.data?.IsSuccess) {
                toast.success(appealAction ? "Appeal approved" : "Appeal rejected");
                fetchPenalties();
                onClose();
                handleCloseDialog();
            } else {
                toast.error(res.data?.message || "Failed to process appeal");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setProcessingAppealId(null);
        }
    };

    const handleCloseDialog = () => {
        setOpenAdminNoteDialog(false);
        setAdminNote("");
        setSelectedPenalty(null);
    };

    const handleDeletePenalty = async (penalty: PenaltyItem) => {
        try {
            setIsDeleting(true);
            const res = await api.post("time-clock/delete-penalty", {
                penalty_id: penalty.penalty_id,
            });

            if (res.data?.IsSuccess) {
                fetchPenalties();
                onClose();
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
                                {penalty.is_penalty_appeal && (
                                    <Chip
                                        label="Appeal"
                                        size="small"
                                        color="warning"
                                    />
                                )}
                            </Box>

                            {/* Conditional Buttons */}
                            {penalty.is_penalty_appeal ? (
                                <Box display="flex" gap={1}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        disabled={processingAppealId === penalty.appeal_id}
                                        onClick={() => openAdminNotePrompt(penalty, true)}
                                        sx={{ borderRadius: 2, textTransform: "none" }}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        disabled={processingAppealId === penalty.appeal_id}
                                        onClick={() => openAdminNotePrompt(penalty, false)}
                                        sx={{ borderRadius: 2, textTransform: "none" }}
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            ) : (
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
                            )}
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
                            {penalty.appeal_note !== null && (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2">
                                        Appeal Note:{" "}
                                        <strong>{penalty.appeal_note}</strong>
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                ))
            ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <Typography color="text.secondary">No penalties found.</Typography>
                </Box>
            )}

            {/* Admin Note Dialog */}
            <Dialog
                open={openAdminNoteDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {appealAction ? "Approve Appeal" : "Reject Appeal"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Admin Note"
                        placeholder="Enter your note here..."
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{ textTransform: "none" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAdminNoteSubmit}
                        variant="contained"
                        color={appealAction ? "success" : "error"}
                        disabled={processingAppealId !== null}
                        sx={{ textTransform: "none" }}
                    >
                        {appealAction ? "Approve" : "Reject"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
