"use client";

import React, {useEffect, useMemo, useState} from 'react';
import api from "@/utils/axios";
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, Autocomplete, DialogActions, Tooltip,
} from '@mui/material';
import {IconArrowLeft, IconFilter, IconSearch, IconTrash, IconX} from '@tabler/icons-react';
import {Stack} from '@mui/system';
import ChecklogDetailPage from './checklog-details';
import toast from 'react-hot-toast';

interface ChecklogsPageProps {
    worklogId: number;
    onClose: () => void;
}

type FilterState = {
    type: string;
};

interface ChecklogItem {
    checklog_id: number;
    trade_id?: number;
    name?: string;
    trade_name?: string;
    address_name?: string;
    task_count?: number;
    total_hours?: string | number | null;
    checkin_time?: string;
    checkout_time?: string;
}

interface FilterOption {
    id: number;
    name: string;
}

export default function Checklogs({worklogId, onClose}: ChecklogsPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [checklogs, setChecklogs] = useState<ChecklogItem[]>([]);
    const [day, setDay] = useState<string>("");
    const [date, setDate] = useState<string>("");
    const [searchWork, setSearchWork] = useState<string>("");
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<number>(0);
    const [open, setOpen] = useState<boolean>(false);
    const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
    const [filters, setFilters] = useState<FilterState>({ type: "" });
    const [tempFilters, setTempFilters] = useState<FilterState>(filters);
    const [openSidebar, setOpenSidebar] = useState(false);
    const [selectedChecklogId, setSelectedChecklogId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    useEffect(() => {
        if (worklogId > 0) {
            fetchChecklogs();
        }
    }, [worklogId]);

    const fetchChecklogs = async () => {
        setLoading(true);
        try {
            const res = await api.get(
                `get-worklog-checklogs?worklog_id=${worklogId}`
            );
            if (res.data?.IsSuccess) {
                setChecklogs(res.data.info || []);
                setDay(res.data.worklog_day || "");
                setDate(res.data.worklog_date || "");

                // Extract unique trade types for filter options
                const uniqueTrades = Array.from(
                    new Map(
                        res.data.info
                            .filter((item: ChecklogItem) => item.trade_id && item.trade_name)
                            .map((item: ChecklogItem) => [
                                item.trade_id,
                                { id: item.trade_id!, name: item.trade_name! }
                            ])
                    ).values()
                );
                setFilterOptions(uniqueTrades as FilterOption[]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch checklogs");
        }
        setLoading(false);
    };

    const filteredData = useMemo(() => {
        let data = [...checklogs];

        if (filters.type) {
            data = data.filter((item) => item.trade_id?.toString() === filters.type);
        }

        if (searchWork.trim()) {
            const search = searchWork.trim().toLowerCase();
            data = data.filter(
                (item) =>
                    item.name?.toLowerCase().includes(search) ||
                    item.trade_name?.toLowerCase().includes(search) ||
                    item.address_name?.toLowerCase().includes(search)
            );
        }

        return data;
    }, [searchWork, checklogs, filters]);

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return "-";
        const num = parseFloat(val.toString());
        if (isNaN(num)) return "-";

        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    const truncateText = (text: string, maxLength: number = 12) => {
        if (!text) return "";
        return text.length > maxLength
            ? `${text.substring(0, maxLength)}...`
            : text;
    };

    const handleWorkClick = (checklogId: number) => {
        setSelectedChecklogId(checklogId);
        setOpenSidebar(true);
    };

    const handleChecklogDelete = async () => {
        if (!selectedId) {
            toast.error("Invalid checklog ID");
            setOpenDialog(false);
            return;
        }

        setIsDeleting(true);
        const previousChecklogs = checklogs;
        setChecklogs(checklogs.filter((item) => item.checklog_id !== selectedId));

        try {
            const response = await api.post('user-checklog/delete', { checklog_id: selectedId });
            if (response.data && typeof response.data === 'object' && response.data.IsSuccess) {
                toast.success(response.data.message || 'Checklog deleted successfully');
            } else {
                setChecklogs(previousChecklogs); // Revert on failure
                toast.error(response.data?.message || 'Failed to delete checklog');
            }
        } catch (error: any) {
            setChecklogs(previousChecklogs); // Revert on error
            console.error(error);
            toast.error(error.response?.data?.message || 'An error occurred while deleting the checklog');
        } finally {
            setIsDeleting(false);
            setOpenDialog(false);
            setSelectedId(0);
        }
    };

    if (loading) {
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
    }

    return (
        <Box p={2}>
            <Box
                display={"flex"}
                alignContent={"center"}
                alignItems={"center"}
                flexWrap={"wrap"}
                mb={2}
            >
                <IconButton onClick={() => onClose()}>
                    <IconArrowLeft />
                </IconButton>
                <Typography variant="h5" fontWeight={700}>
                    {date} {day}
                </Typography>
            </Box>

            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
                sx={{ flexWrap: "wrap" }}
            >
                <TextField
                    placeholder="Search..."
                    size="small"
                    value={searchWork}
                    onChange={(e) => setSearchWork(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconSearch size={16} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: { xs: "100%", sm: "80%" }, mb: { xs: 2, sm: 0 } }}
                />
                <Button variant="contained" onClick={() => setOpen(true)}>
                    <IconFilter width={18} />
                </Button>
            </Stack>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ m: 0, position: "relative", overflow: "visible" }}>
                    Filters
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        size="large"
                        sx={{
                            position: "absolute",
                            right: 12,
                            top: 8,
                            color: (theme) => theme.palette.grey[900],
                            backgroundColor: "transparent",
                            zIndex: 10,
                            width: 50,
                            height: 50,
                        }}
                    >
                        <IconX size={40} style={{ width: 40, height: 40 }} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Autocomplete
                            options={filterOptions}
                            getOptionLabel={(opt: FilterOption) => opt.name || ""}
                            value={
                                filterOptions.find(
                                    (opt) => opt.id.toString() === tempFilters.type
                                ) || null
                            }
                            onChange={(_, newValue) => {
                                setTempFilters({
                                    ...tempFilters,
                                    type: newValue ? newValue.id.toString() : "",
                                });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Trade Type"
                                    placeholder="Search trade type..."
                                    fullWidth
                                />
                            )}
                            clearOnEscape
                            fullWidth
                        />
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => {
                            setFilters({ type: "" });
                            setTempFilters({ type: "" });
                            setOpen(false);
                        }}
                        color="inherit"
                    >
                        Clear
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilters(tempFilters);
                            setOpen(false);
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            {selectedChecklogId && (
                <ChecklogDetailPage
                    checklogId={selectedChecklogId}
                    open={openSidebar}
                    onClose={() => {
                        setOpenSidebar(false);
                        setSelectedChecklogId(null);
                    }}
                />
            )}

            {/* List of works */}
            {filteredData.length > 0 ? (
                filteredData.map((record, idx) => (
                    <Box
                        key={record.checklog_id || idx}
                        mb={2}
                        sx={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
                        onClick={() => handleWorkClick(record.checklog_id)}
                    >
                        <Box
                            sx={{
                                position: "relative",
                                border: "1px solid #ccc",
                                borderRadius: 2,
                                p: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                "&:hover": {
                                    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                                },
                            }}
                        >
                            {/* Labels */}
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: -10,
                                    left: 16,
                                    right: 16,
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                    zIndex: 1,
                                }}
                            >
                                {record.trade_name && (
                                    <Tooltip title={record.trade_name} arrow>
                                        <Box
                                            sx={{
                                                backgroundColor: "#FF7A00",
                                                border: "1px solid #FF7A00",
                                                color: "#fff",
                                                fontSize: "11px",
                                                fontWeight: 500,
                                                px: 1,
                                                py: 0.2,
                                                borderRadius: "999px",
                                                maxWidth: "80px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {truncateText(record.trade_name)}
                                        </Box>
                                    </Tooltip>
                                )}
                            </Box>

                            {/* Work row */}
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                justifyContent="space-between"
                                sx={{ width: "100%", mt: 1 }}
                            >
                                <Box>
                                    <Typography
                                        fontWeight="bold"
                                        sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
                                    >
                                        {record.address_name || "N/A"}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="#777e89"
                                        sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                                    >
                                        {record.task_count || 0} Tasks
                                    </Typography>
                                </Box>

                                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1 }}>
                                    <Box>
                                        <Typography fontWeight="bold" fontSize="1.25rem">
                                            {formatHour(record.total_hours)} H
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="#777e89"
                                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                                        >
                                            ({record.checkin_time || "-"}-{record.checkout_time || "-"})
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        color="error"
                                        aria-label="Delete checklog"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDialog(true);
                                            setSelectedId(record.checklog_id);
                                        }}
                                    >
                                        <IconTrash width={18} />
                                    </IconButton>
                                </Box>
                            </Stack>
                        </Box>
                    </Box>
                ))
            ) : (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <Typography variant="body2" color="text.secondary">
                        {checklogs.length === 0 ? "No checklogs found." : "No works found matching your search."}
                    </Typography>
                </Box>
            )}

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                        Are you sure you want to delete this checklog?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpenDialog(false)}
                        variant="outlined"
                        color="primary"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleChecklogDelete}
                        variant="outlined"
                        color="error"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
