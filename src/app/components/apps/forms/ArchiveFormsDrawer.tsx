"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    IconButton,
    InputAdornment,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconArrowBackUp, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { FormRecord } from "./types";
import { normalizeFormRecord } from "./common/formStatusUtils";
import FormUserIdentity from "./common/FormUserIdentity";

type ArchiveFormsDrawerProps = {
    open: boolean;
    onClose: () => void;
    onUpdated?: () => void;
};

type ArchiveAction = "unarchive" | "delete" | null;

const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
        const response = (err as any).response;
        return response?.data?.message || fallback;
    }

    return fallback;
};

const ArchiveFormsDrawer = ({ open, onClose, onUpdated }: ArchiveFormsDrawerProps) => {
    const [forms, setForms] = useState<FormRecord[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [confirmAction, setConfirmAction] = useState<ArchiveAction>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchArchivedForms = useCallback(async () => {
        setFetching(true);
        try {
            const res = await api.get("forms/archive-list");
            const archivedForms = Array.isArray(res.data?.info) ? res.data.info : [];
            setForms(archivedForms.map(normalizeFormRecord));
        } catch (err) {
            toast.error(getApiErrorMessage(err, "Failed to fetch archived forms"));
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        setSelectedIds(new Set());
        setSearch("");
        fetchArchivedForms();
    }, [open, fetchArchivedForms]);

    const filteredForms = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return forms;

        return forms.filter((form) =>
            [form.name, form.status, form.created_by?.first_name, form.created_by?.last_name]
                .some((value) => String(value || "").toLowerCase().includes(query))
        );
    }, [forms, search]);

    const selectedFormIds = useMemo(() => Array.from(selectedIds), [selectedIds]);
    const allSelected = filteredForms.length > 0 && filteredForms.every((form) => selectedIds.has(form.id));
    const someSelected = filteredForms.some((form) => selectedIds.has(form.id)) && !allSelected;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
            return;
        }

        setSelectedIds(new Set(filteredForms.map((form) => form.id)));
    };

    const toggleSelect = (formId: number) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(formId)) {
                next.delete(formId);
            } else {
                next.add(formId);
            }
            return next;
        });
    };

    const runAction = async () => {
        if (!confirmAction || !selectedFormIds.length) return;

        setLoading(true);
        try {
            if (confirmAction === "unarchive") {
                const response = await api.post("forms/unarchive", {
                    form_ids: selectedFormIds.join(","),
                }, {
                    skipToast: true,
                } as any);
                toast.success(response.data?.message || "Forms unarchived successfully");
            } else {
                const response = await api.delete("forms/delete", {
                    data: {
                        form_ids: selectedFormIds.join(","),
                    },
                    skipToast: true,
                } as any);
                toast.success(response.data?.message || "Forms deleted successfully");
            }

            setSelectedIds(new Set());
            await fetchArchivedForms();
            onUpdated?.();
            onClose();
        } catch (err) {
            toast.error(
                getApiErrorMessage(
                    err,
                    confirmAction === "unarchive" ? "Failed to unarchive forms" : "Failed to delete forms",
                ),
            );
        } finally {
            setLoading(false);
            setConfirmAction(null);
        }
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                sx={{
                    "& .MuiDrawer-paper": {
                        width: { xs: "100%", sm: 460 },
                        maxWidth: "100%",
                        p: 2,
                    },
                }}
            >
                <Stack spacing={2} sx={{ height: "100%" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconButton onClick={onClose}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" fontWeight={700}>
                                Archived Forms
                            </Typography>
                        </Stack>
                        {filteredForms.length > 0 && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" color="text.secondary">
                                    Select all
                                </Typography>
                                <CustomCheckbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={toggleSelectAll}
                                />
                            </Stack>
                        )}
                    </Stack>

                    <CustomTextField
                        size="small"
                        placeholder="Search archived forms"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box sx={{ flex: 1, overflowY: "auto" }}>
                        <Stack spacing={1}>
                            {fetching ? (
                                <Typography color="text.secondary">Loading archived forms...</Typography>
                            ) : filteredForms.length === 0 ? (
                                <Typography color="text.secondary">No archived forms found.</Typography>
                            ) : (
                                filteredForms.map((form) => (
                                    <Box
                                        key={form.id}
                                        sx={{
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 2,
                                            p: 1.5,
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                            <CustomCheckbox
                                                checked={selectedIds.has(form.id)}
                                                onChange={() => toggleSelect(form.id)}
                                            />
                                            <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography fontWeight={600} sx={{ wordBreak: "break-word" }}>
                                                    {form.name}
                                                </Typography>
                                                <FormUserIdentity user={form.created_by} />
                                            </Stack>
                                        </Stack>
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Unarchive selected">
                            <span style={{ flex: 1 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<IconArrowBackUp size={18} />}
                                    disabled={!selectedIds.size || loading}
                                    onClick={() => setConfirmAction("unarchive")}
                                >
                                    Unarchive
                                </Button>
                            </span>
                        </Tooltip>
                        <Tooltip title="Permanently delete selected">
                            <span style={{ flex: 1 }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="error"
                                    startIcon={<IconTrash size={18} />}
                                    disabled={!selectedIds.size || loading}
                                    onClick={() => setConfirmAction("delete")}
                                >
                                    Delete
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Drawer>

            <Dialog open={Boolean(confirmAction)} onClose={() => !loading && setConfirmAction(null)}>
                <DialogTitle sx={{ pr: 6 }}>
                    {confirmAction === "unarchive" ? "Confirm Unarchive" : "Confirm Delete"}
                    <IconButton
                        aria-label="close"
                        onClick={() => setConfirmAction(null)}
                        disabled={loading}
                        sx={{
                            position: "absolute",
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <IconX />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" fontWeight={500}>
                        {confirmAction === "unarchive"
                            ? `Are you sure you want to unarchive ${selectedIds.size} form${selectedIds.size > 1 ? "s" : ""}?`
                            : `Are you sure you want to permanently delete ${selectedIds.size} form${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmAction(null)} color="inherit" disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={runAction}
                        variant="contained"
                        color={confirmAction === "delete" ? "error" : "primary"}
                        disabled={loading}
                    >
                        {confirmAction === "delete" ? "Delete" : "Unarchive"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ArchiveFormsDrawer;
