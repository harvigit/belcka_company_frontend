"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
    TableContainer,
    Table,
    TableRow,
    TableCell,
    TableBody,
    TableHead,
    Typography,
    Box,
    Button,
    Divider,
    IconButton,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Menu,
    MenuItem,
    ListItemIcon,
    Slider,
    Tooltip,
} from '@mui/material';
import { IconDotsVertical, IconPlus, IconX } from '@tabler/icons-react';
import { createColumnHelper } from '@tanstack/react-table';
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import Image from "next/image";
import SkeletonLoader from '@/app/components/SkeletonLoader';

interface ScoreRange {
    key: string;
    label: string;
    color: string;
    min_score: number;
    max_score: number;
}

interface ScoreSetting {
    id?: number;
    ranges: ScoreRange[];
}

const FIXED_RANGES: ScoreRange[] = [
    { key: "excellent",      label: "Excellent",      color: "#16a34a", min_score: 90, max_score: 100 },
    { key: "good",           label: "Good",           color: "#84cc16", min_score: 50, max_score: 89  },
    { key: "fair",           label: "Fair",           color: "#f59e0b", min_score: 30, max_score: 49  },
    { key: "need_attention", label: "Need Attention", color: "#f97316", min_score: 20, max_score: 29  },
    { key: "contact_hr",    label: "Contact to HR",  color: "#ef4444", min_score: 0,  max_score: 19  },
];

const validateRanges = (ranges: ScoreRange[]): string | null => {
    for (let i = 0; i < ranges.length; i++) {
        const current = ranges[i];

        if (current.min_score >= current.max_score) {
            return `"${current.label}": Min score must be less than max score.`;
        }

        for (let j = 0; j < ranges.length; j++) {
            if (i === j) continue;
            const other = ranges[j];
            const overlaps =
                current.min_score <= other.max_score &&
                current.max_score >= other.min_score;
            if (overlaps) {
                return `"${current.label}" overlaps with "${other.label}". Please adjust the ranges.`;
            }
        }
    }
    return null;
};

const columnHelper = createColumnHelper<ScoreRange>();

const AnalyticsScore = () => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const [row, setRow] = useState<ScoreSetting | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [ranges, setRanges] = useState<ScoreRange[]>(FIXED_RANGES);
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`analytics/get-score-settings`, {
                params: { company_id: user?.company_id },
            });
            if (res.data?.IsSuccess && res.data?.data) {
                setRow(res.data.data);
            } else {
                setRow(null);
            }
        } catch {
            setRow(null);
        } finally {
            setLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        if (user?.company_id) fetchSettings();
    }, [user?.company_id]);

    const handleOpenDialog = () => {
        setRanges(row?.ranges?.length ? row.ranges : FIXED_RANGES);
        setRangeError(null);
        setOpenDialog(true);
        setAnchorEl(null);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setRangeError(null);
    };

    const handleSliderChange = (key: string, newValue: number[]) => {
        const updated = ranges.map((r) =>
            r.key === key ? { ...r, min_score: newValue[0], max_score: newValue[1] } : r
        );
        setRanges(updated);
        setRangeError(validateRanges(updated));
    };

    const handleSave = async () => {
        const error = validateRanges(ranges);
        if (error) {
            setRangeError(error);
            return;
        }
        setSaving(true);
        try {
            const res = await api.post(`analytics/store-score-settings`, { ranges });
            if (res.data?.IsSuccess) {
                toast.success("Score settings saved successfully");
                handleCloseDialog();
                fetchSettings();
            } else {
                toast.error(res.data?.message || "Failed to save");
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        columnHelper.display({
            id: 'label',
            header: () => <Typography variant="subtitle2">Label</Typography>,
            cell: ({ row }) => (
                <Stack direction="row" alignItems="center" gap={1}>
                    <Box
                        width={10}
                        height={10}
                        borderRadius="50%"
                        flexShrink={0}
                        sx={{ background: row.original.color }}
                    />
                    <Typography className="f-14">{row.original.label}</Typography>
                </Stack>
            ),
        }),
        columnHelper.accessor('min_score', {
            id: 'min_score',
            header: () => <Typography variant="subtitle2">Min Score</Typography>,
            cell: ({ row }) => (
                <Typography className="f-14">{row.original.min_score}</Typography>
            ),
        }),
        columnHelper.accessor('max_score', {
            id: 'max_score',
            header: () => <Typography variant="subtitle2">Max Score</Typography>,
            cell: ({ row }) => (
                <Typography className="f-14">{row.original.max_score}</Typography>
            ),
        }),
        columnHelper.display({
            id: 'color',
            header: () => <Typography variant="subtitle2">Color</Typography>,
            cell: ({ row }) => (
                <Stack direction="row" alignItems="center" gap={1}>
                    <Box
                        width={20}
                        height={20}
                        borderRadius={1}
                        border="1px solid"
                        borderColor="divider"
                        sx={{ background: row.original.color, flexShrink: 0 }}
                    />
                    <Typography className="f-14">{row.original.color}</Typography>
                </Stack>
            ),
        }),
    ];

    const simpleColumns = columns.map((col) => ({
        name: col.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <Box sx={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>

            {/* Top toolbar */}
            <Stack
                mr={2} ml={2} mb={2} mt={1}
                justifyContent="space-between"
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 2, md: 4 }}
            >
                <Box />
                <Stack mb={2} justifyContent="end" direction={{ xs: "column", sm: "row" }} alignItems="center">
                    <IconButton sx={{ margin: "0px" }} onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <IconDotsVertical width={18} />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={openMenu} onClose={() => setAnchorEl(null)}>
                        <MenuItem onClick={handleOpenDialog}>
                            <ListItemIcon><IconPlus width={18} /></ListItemIcon>
                            {row ? "Edit Score Settings" : "Add Score Settings"}
                        </MenuItem>
                    </Menu>
                </Stack>
            </Stack>

            <Divider />

            {/* Table */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <TableContainer>
                    <Table stickyHeader aria-label="score settings table">

                        <TableHead>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableCell key={col.id} sx={{ paddingTop: "10px", paddingBottom: "10px" }}>
                                        {typeof col.header === 'function'
                                            ? col.header({} as any)
                                            : <Typography variant="subtitle2">{col.id}</Typography>}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {loading ? (
                                <SkeletonLoader columns={simpleColumns} rowCount={5} />
                            ) : !row?.ranges?.length ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            height="calc(50vh - 100px)"
                                        >
                                            <Image
                                                src="/images/no-data.png"
                                                alt="No data"
                                                width={200}
                                                height={200}
                                                style={{ maxWidth: "100%", maxHeight: "100%" }}
                                            />
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                row.ranges.map((range) => (
                                    <TableRow key={range.key} hover sx={{ cursor: "pointer" }}>
                                        {columns.map((col) => (
                                            <TableCell key={col.id} sx={{ padding: "10px" }}>
                                                {typeof col.cell === 'function'
                                                    ? col.cell({ row: { original: range } } as any)
                                                    : null}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                    </Table>
                </TableContainer>
                {row && <Divider />}
            </Box>

            <Divider />

            {/* Footer */}
            <Stack
                gap={1} pr={3} pt={1} pl={3} pb={1}
                alignItems="center"
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
            >
                <Typography color="textSecondary" className="f-14">
                    {row?.ranges?.length ? `${row.ranges.length} Rows` : "0 Rows"}
                </Typography>
            </Stack>

            {/* ── Score Range Dialog ───────────────────────────────────────── */}
            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">

                {rangeError && (
                    <Box
                        sx={{
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: 1,
                            px: 2,
                            py: 1.5,
                            mx: 3,
                            mt: 2,
                        }}
                    >
                        <Typography variant="caption" color="error" fontWeight={600}>
                            {rangeError}
                        </Typography>
                    </Box>
                )}

                <DialogTitle>
                    <Typography color="GrayText" fontWeight={700}>
                        Score Range Setting
                    </Typography>
                    <IconButton
                        onClick={handleCloseDialog}
                        sx={{ position: "absolute", right: 12, top: 8, backgroundColor: "transparent" }}
                    >
                        <IconX size={40} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={1} mt={1}>
                        {ranges.map((range) => (
                            <Box key={range.key}>
                                <Stack direction="row" alignItems="center" gap={1} mb={3}>
                                    <Box
                                        width={12}
                                        height={12}
                                        borderRadius="50%"
                                        flexShrink={0}
                                        sx={{ background: range.color }}
                                    />
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {range.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" ml="auto">
                                        {range.min_score}% – {range.max_score}%
                                    </Typography>
                                </Stack>

                                <Box px={1}>
                                    <Slider
                                        value={[range.min_score, range.max_score]}
                                        onChange={(_, newValue) =>
                                            handleSliderChange(range.key, newValue as number[])
                                        }
                                        valueLabelDisplay="on"
                                        valueLabelFormat={(value) => `${value}%`}
                                        min={0}
                                        max={100}
                                        sx={{
                                            color: range.color,
                                            height: 6,
                                            mt: 2,
                                            width: "100%",
                                            "& .MuiSlider-thumb": {
                                                width: 22,
                                                height: 22,
                                                backgroundColor: range.color,
                                                "&:hover, &.Mui-focusVisible": {
                                                    boxShadow: `0px 0px 0px 8px ${range.color}22`,
                                                },
                                            },
                                            "& .MuiSlider-track": {
                                                height: 6,
                                                backgroundColor: range.color,
                                                border: "none",
                                            },
                                            "& .MuiSlider-rail": {
                                                height: 6,
                                                opacity: 0.2,
                                            },
                                            "& .MuiSlider-valueLabel": {
                                                backgroundColor: "#424242",
                                                borderRadius: "6px",
                                                fontSize: 12,
                                                fontWeight: 600,
                                                padding: "3px 8px",
                                            },
                                        }}
                                    />
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">0%</Typography>
                                        <Typography variant="caption" color="text.secondary">100%</Typography>
                                    </Stack>
                                </Box>

                                <Divider sx={{ mt: 2 }} />
                            </Box>
                        ))}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} variant="outlined" color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        color="primary"
                        disabled={saving || !!rangeError}
                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                    >
                        {saving ? "Saving..." : row ? "Update" : "Save"}
                    </Button>
                </DialogActions>

            </Dialog>
        </Box>
    );
};

export default AnalyticsScore;
