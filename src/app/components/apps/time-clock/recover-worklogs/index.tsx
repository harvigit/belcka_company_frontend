'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
    Avatar,
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
    Snackbar,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import {
    IconX,
    IconSearch,
    IconRotateClockwise,
    IconTrash,
    IconClock,
    IconCalendar,
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Image from 'next/image';

import api from '@/utils/axios';

dayjs.extend(customParseFormat);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeletedWorklog {
    id: number;
    user_id: number;
    user_name: string;
    user_image: string | null;
    shift_id: number | null;
    shift_name: string | null;
    project_id: number | null;
    project_name: string | null;
    team_id: number | null;
    team_name: string | null;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    total_work_seconds: number;
    payable_work_seconds: number;
    deleted_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const secondsToHHMM = (sec: number): string => {
    if (!sec || sec <= 0) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatTime = (timeStr: string | null): string => {
    if (!timeStr) return '--';
    const parts = timeStr.split(' ');
    if (parts[1]) return parts[1].slice(0, 5);
    return '--';
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecoverWorklogsProps {
    open: boolean;
    onClose: () => void;
    startDate: Date | null;   // passed from TimeClock parent
    endDate: Date | null;     // passed from TimeClock parent
}

// ─── Component ────────────────────────────────────────────────────────────────

const RecoverWorklogs = ({ open, onClose, startDate, endDate }: RecoverWorklogsProps) => {
    const session  = useSession();
    const authUser = session.data?.user as User & {
        company_id?: number | null;
    };

    const [data,        setData]        = useState<DeletedWorklog[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [searchTerm,  setSearchTerm]  = useState('');
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const fetchDeletedWorklogs = async () => {
        if (!startDate || !endDate || !authUser?.company_id) return;

        setLoading(true);
        try {
            const start = dayjs(startDate).format('DD/MM/YYYY');
            const end   = dayjs(endDate).format('DD/MM/YYYY');

            const res = await api.get(
                `user-worklog/get-deleted-worklogs?company_id=${authUser.company_id}&start_date=${start}&end_date=${end}`,
            );
            if (res.data?.IsSuccess) {
                setData(res.data.info ?? []);
            } else {
                setData([]);
            }
        } catch {
            setData([]);
        }
        setLoading(false);
    };

    // ── API: restore ──────────────────────────────────────────────────────────

    const handleRestore = async (id: number) => {
        setRestoringId(id);
        try {
            const res = await api.post('user-worklog/restore-worklogs', {
                ids:        [id],
                company_id: authUser?.company_id,
            });
            if (res.data?.IsSuccess) {
                setData((prev) => prev.filter((row) => row.id !== id));
                setSuccessMessage(res.data?.message ?? 'Worklog restored successfully.');
            }
        } catch {}
        setRestoringId(null);
    };

    // ── Re-fetch whenever drawer opens or date range changes ─────────────────

    useEffect(() => {
        if (open) {
            setSearchTerm('');
            fetchDeletedWorklogs();
        }
    }, [open, startDate, endDate]);

    // ── Filter ────────────────────────────────────────────────────────────────

    const filteredData = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return data;
        return data.filter(
            (item) =>
                item.user_name?.toLowerCase().includes(s)    ||
                item.project_name?.toLowerCase().includes(s) ||
                item.shift_name?.toLowerCase().includes(s)   ||
                item.team_name?.toLowerCase().includes(s),
        );
    }, [data, searchTerm]);
    
    const dateRangeLabel = useMemo(() => {
        if (!startDate || !endDate) return '';
        return `${dayjs(startDate).format('DD MMM YYYY')} ~ ${dayjs(endDate).format('DD MMM YYYY')}`;
    }, [startDate, endDate]);
    
    return (
        <>
            <Drawer
                anchor="right"
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        width: '420px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                {/* ── Header ── */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    px={2.5}
                    py={2}
                    sx={{ flexShrink: 0 }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton size="small" onClick={onClose} sx={{ mr: 0.5 }}>
                            <IconX size={18} />
                        </IconButton>
                        <Typography variant="h6" fontWeight={700}>
                            Recover Worklogs
                        </Typography>
                    </Stack>
                </Stack>

                {/* ── Search ── */}
                <Box px={2.5} pb={1.5} sx={{ flexShrink: 0 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search worklogs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={16} color="#9e9e9e" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'grey.50',
                            },
                        }}
                    />
                </Box>

                <Divider />

                {/* ── Card list ── */}
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
                    {loading ? (
                        <Stack alignItems="center" justifyContent="center" height="200px" spacing={1}>
                            <CircularProgress size={32} />
                            <Typography variant="body2" color="textSecondary">
                                Loading deleted worklogs...
                            </Typography>
                        </Stack>
                    ) : filteredData.length === 0 ? (
                        <Stack alignItems="center" justifyContent="center" height="300px" spacing={1}>
                            <Image
                                src="/images/no-data.png"
                                alt="No deleted worklogs"
                                width={140}
                                height={140}
                                style={{ opacity: 0.65 }}
                            />
                            <Typography variant="body2" color="textSecondary" textAlign="center">
                                No deleted worklogs found
                                <br />
                                for the selected period.
                            </Typography>
                        </Stack>
                    ) : (
                        <Stack spacing={1.5}>
                            {filteredData.map((item) => (
                                <WorklogCard
                                    key={item.id}
                                    item={item}
                                    onRestore={handleRestore}
                                    isRestoring={restoringId === item.id}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>

                {/* ── Footer ── */}
                {!loading && filteredData.length > 0 && (
                    <>
                        <Divider />
                        <Box px={2.5} py={1.5} sx={{ flexShrink: 0 }}>
                            <Typography variant="caption" color="textSecondary">
                                {filteredData.length} deleted worklog{filteredData.length !== 1 ? 's' : ''} found
                            </Typography>
                        </Box>
                    </>
                )}
            </Drawer>

            {/* ── Toast — same style as TimeClock.tsx ── */}
            <Snackbar
                open={Boolean(successMessage)}
                autoHideDuration={4000}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setSuccessMessage(null);
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                    }}
                >
                    <Typography variant="body2">
                        {successMessage}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setSuccessMessage(null);
                        }}
                        sx={{ color: 'inherit' }}
                    >
                        <IconX size={14} />
                    </IconButton>
                </Box>
            </Snackbar>
        </>
    );
};

interface WorklogCardProps {
    item: DeletedWorklog;
    onRestore: (id: number) => void;
    isRestoring: boolean;
}

const WorklogCard = ({ item, onRestore, isRestoring }: WorklogCardProps) => {
    const startTime = formatTime(item.start_time);
    const endTime   = formatTime(item.end_time);
    const duration  = secondsToHHMM(item.total_work_seconds);

    return (
        <Box
            sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.5,
                p: 2,
                backgroundColor: 'background.paper',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
            }}
        >
            {/* Top row: chips + restore button */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {item.shift_name && (
                        <Chip
                            label={item.shift_name}
                            size="small"
                            sx={{ fontSize: 11, fontWeight: 700, height: 22, backgroundColor: '#e8f4fd', color: '#1565c0' }}
                        />
                    )}
                    {item.project_name && (
                        <Chip
                            label={item.project_name}
                            size="small"
                            sx={{ fontSize: 11, fontWeight: 600, height: 22, backgroundColor: '#f3e8fd', color: '#7b1fa2' }}
                        />
                    )}
                </Stack>

                <Box>
                    <IconButton
                        size="small"
                        color="primary"
                        disabled={isRestoring}
                        onClick={() => onRestore(item.id)}
                        sx={{
                            border: '1px solid',
                            borderColor: 'primary.light',
                            borderRadius: 1.5,
                            width: 30,
                            height: 30,
                            '&:hover': { backgroundColor: 'primary.main', color: 'white' },
                        }}
                    >
                        {isRestoring ? (
                            <CircularProgress size={14} color="inherit" />
                        ) : (
                            <IconRotateClockwise size={15} />
                        )}
                    </IconButton>
                </Box>
            </Stack>

            {/* User row */}
            <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
                <Avatar src={item.user_image ?? ''} alt={item.user_name} sx={{ width: 30, height: 30, fontSize: 12 }} />
                <Typography variant="body2" fontWeight={600} noWrap>
                    {item.user_name || '-'}
                </Typography>
                {item.team_name && (
                    <Typography variant="caption" color="textSecondary" noWrap>
                        · {item.team_name}
                    </Typography>
                )}
            </Stack>

            {/* Date + Time + Duration */}
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconCalendar size={13} color="#9e9e9e" />
                    <Typography variant="caption" color="textSecondary" fontWeight={500}>
                        {item.date ?? '--'}
                    </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconClock size={13} color="#9e9e9e" />
                    <Typography variant="caption" color="textSecondary" fontWeight={500}>
                        {startTime !== '--' && endTime !== '--' ? `${startTime} – ${endTime}` : '--'}
                    </Typography>
                </Stack>
                <Chip
                    label={duration}
                    size="small"
                    sx={{ fontSize: 11, fontWeight: 700, height: 20, backgroundColor: '#f1f5f9', color: '#475569', ml: 'auto' }}
                />
            </Stack>

            {/* Deleted at */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconTrash size={12} color="#ef5350" />
                <Typography variant="caption" sx={{ color: '#ef5350', fontWeight: 500 }}>
                    Deleted {item.deleted_at ?? '--'}
                </Typography>
            </Stack>
        </Box>
    );
};

export default RecoverWorklogs;
