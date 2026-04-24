'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Avatar,
    CircularProgress,
    Chip,
    Button,
} from '@mui/material';
import {
    IconUsers,
    IconShoppingCart,
    IconClock,
    IconCalendar,
    IconAlertCircle,
    IconLogin,
    IconTrash,
    IconPencil,
    IconPlus,
    IconEye,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Actor {
    id: number;
    name: string;
    image: string | null;
}

interface ActivityItem {
    id: number;
    title: string;
    module: string;
    record_id: number | null;
    note: string | null;
    date_of_action: string;
    created_at: string;
    time: string;
    company: { id: number; name: string; image: string | null } | null;
    added_by: Actor | null;
    edited_by: Actor | null;
}

interface ActivityGroup {
    label: string;
    date: string;
    items: ActivityItem[];
}

interface ActivityInfo {
    total: number;
    activities: ActivityGroup[];
    start: string;
    end: string;
}

interface UserActivityProps {
    companyId: number;
    userId: number;
    active: boolean;
}

// ─── Module config ────────────────────────────────────────────────────────────

type ModuleCfg = {
    label: string;
    icon: React.ElementType;
    chipBg: string;
    chipColor: string;
    chipBorder: string;
    dotBg: string;
    dotColor: string;
};

const MODULE_CONFIG: Record<string, ModuleCfg> = {
    users: {
        label: 'User',
        icon: IconUsers,
        chipBg: '#EEF2FF',
        chipColor: '#4338CA',
        chipBorder: '#C7D2FE',
        dotBg: '#EEF2FF',
        dotColor: '#4338CA',
    },
    employee_orders: {
        label: 'Orders',
        icon: IconShoppingCart,
        chipBg: '#FFF7ED',
        chipColor: '#C2410C',
        chipBorder: '#FED7AA',
        dotBg: '#FFF7ED',
        dotColor: '#C2410C',
    },
    user_worklogs: {
        label: 'Worklogs',
        icon: IconClock,
        chipBg: '#F0FDF4',
        chipColor: '#15803D',
        chipBorder: '#BBF7D0',
        dotBg: '#F0FDF4',
        dotColor: '#15803D',
    },
    user_leaves: {
        label: 'Leaves',
        icon: IconCalendar,
        chipBg: '#FDF4FF',
        chipColor: '#9333EA',
        chipBorder: '#E9D5FF',
        dotBg: '#FDF4FF',
        dotColor: '#9333EA',
    },
};

const FALLBACK_MODULE: ModuleCfg = {
    label: 'Activity',
    icon: IconEye,
    chipBg: '#F1F5F9',
    chipColor: '#475569',
    chipBorder: '#CBD5E1',
    dotBg: '#F1F5F9',
    dotColor: '#475569',
};

// ─── Action config ────────────────────────────────────────────────────────────

type ActionCfg = { bg: string; color: string; icon: React.ElementType };

const ACTION_CONFIG: Record<string, ActionCfg> = {
    'Logged In':  { bg: '#EFF6FF', color: '#1D4ED8', icon: IconLogin },
    'Deleted':    { bg: '#FEF2F2', color: '#B91C1C', icon: IconTrash },
    'Created':    { bg: '#F0FDF4', color: '#15803D', icon: IconPlus },
    'Updated':    { bg: '#FFFBEB', color: '#B45309', icon: IconPencil },
    'Logged Out': { bg: '#F8FAFC', color: '#64748B', icon: IconLogin },
};

const FALLBACK_ACTION: ActionCfg = { bg: '#F1F5F9', color: '#475569', icon: IconEye };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDefaultWeekDates = (): { start: Date; end: Date } => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon, end: sun };
};

const toApiDate = (d: Date): string =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const getInitials = (name: string): string =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

// ─── Actor Footer ─────────────────────────────────────────────────────────────

const ActorRow: React.FC<{ actor: Actor; role: 'added by' | 'edited by' }> = ({ actor, role }) => {
    const isEdit = role === 'edited by';
    return (
        <Box
            display="flex"
            alignItems="center"
            gap={0.75}
            mt={1}
            pt={1}
            sx={{ borderTop: '0.5px solid', borderColor: 'divider' }}
        >
            <Avatar
                sx={{
                    width: 20,
                    height: 20,
                    fontSize: 9,
                    fontWeight: 600,
                    bgcolor: isEdit ? '#FEF9C3' : '#DBEAFE',
                    color: isEdit ? '#92400E' : '#1E40AF',
                }}
            >
                {getInitials(actor.name)}
            </Avatar>
            <Typography fontSize={11} color="text.disabled">
                {role}
            </Typography>
            <Typography fontSize={11} color="text.secondary" fontWeight={500}>
                {actor.name}
            </Typography>
        </Box>
    );
};

// ─── Single Activity Card ─────────────────────────────────────────────────────

const ActivityCard: React.FC<{ item: ActivityItem; isLast: boolean }> = ({ item, isLast }) => {
    const mc = MODULE_CONFIG[item.module] ?? FALLBACK_MODULE;
    const ModuleIcon = mc.icon;
    const actor = item.edited_by || item.added_by;
    const actorRole = item.edited_by ? 'edited by' : 'added by';

    return (
        <Box display="flex" gap={0}>
            {/* Timeline axis */}
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                sx={{ width: 36, flexShrink: 0, pt: 0.25 }}
            >
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: mc.dotBg,
                        border: `1px solid ${mc.chipBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 1,
                    }}
                >
                    <ModuleIcon size={13} color={mc.dotColor} stroke={2} />
                </Box>
                {!isLast && (
                    <Box
                        sx={{
                            width: '1px',
                            flex: 1,
                            minHeight: 16,
                            bgcolor: 'divider',
                            mt: '3px',
                        }}
                    />
                )}
            </Box>

            {/* Card */}
            <Box
                sx={{
                    flex: 1,
                    ml: 1.25,
                    mb: isLast ? 0 : 1.25,
                    p: '10px 14px',
                    bgcolor: 'background.paper',
                    border: '0.5px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    '&:hover': {
                        borderColor: 'action.selected',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    },
                }}
            >
                {/* Top row */}
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Box flex={1} minWidth={0}>
                        {/* Chips */}
                        <Box display="flex" alignItems="center" gap={0.75} mb={0.75} flexWrap="wrap">
                            <Chip
                                label={mc.label}
                                size="small"
                                sx={{
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    bgcolor: mc.chipBg,
                                    color: mc.chipColor,
                                    border: `0.5px solid ${mc.chipBorder}`,
                                    borderRadius: '4px',
                                    letterSpacing: 0.2,
                                    '& .MuiChip-label': { px: '6px' },
                                }}
                            />
                        </Box>

                        {/* Title */}
                        <Typography
                            fontSize={13}
                            color="text.primary"
                            lineHeight={1.5}
                            sx={{ wordBreak: 'break-word' }}
                        >
                            {item.title}
                        </Typography>
                    </Box>

                    {/* Time */}
                    <Typography
                        fontSize={11}
                        color="text.disabled"
                        whiteSpace="nowrap"
                        flexShrink={0}
                        mt={0.25}
                    >
                        {item.time}
                    </Typography>
                </Box>

                {/* Actor */}
                {actor && <ActorRow actor={actor} role={actorRole as any} />}
            </Box>
        </Box>
    );
};

// ─── Day Group Header ─────────────────────────────────────────────────────────

const DayHeader: React.FC<{ label: string; count: number }> = ({ label, count }) => (
    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
        <Typography
            fontSize={11}
            fontWeight={700}
            color="text.disabled"
            letterSpacing={0.6}
            textTransform="uppercase"
            whiteSpace="nowrap"
        >
            {label}
        </Typography>
        <Box sx={{ flex: 1, height: '0.5px', bgcolor: 'divider' }} />
        <Chip
            label={count}
            size="small"
            sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                borderRadius: '4px',
                minWidth: 24,
                '& .MuiChip-label': { px: '6px' },
            }}
        />
    </Box>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ dateRange?: { start: string; end: string }; onReset: () => void }> = ({
                                                                                                       dateRange,
                                                                                                       onReset,
                                                                                                   }) => (
    <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="60%"
        gap={1.5}
        minHeight={300}
    >
        <Box
            sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <IconAlertCircle size={24} color="#94a3b8" />
        </Box>
        <Typography fontWeight={600} fontSize={14} color="text.secondary">
            No activity found
        </Typography>
        <Typography fontSize={12} color="text.disabled" textAlign="center" maxWidth={240}>
            No events recorded
            {dateRange ? ` from ${dateRange.start} to ${dateRange.end}` : ' for this period'}
        </Typography>
        <Button
            size="small"
            onClick={onReset}
            sx={{ textTransform: 'none', fontSize: 12, color: 'primary.main', mt: 0.5 }}
        >
            Reset to current week
        </Button>
    </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const UserActivity: React.FC<UserActivityProps> = ({ companyId, userId, active }) => {
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState<ActivityInfo | null>(null);

    const defaultWeek = getDefaultWeekDates();
    const [startDate, setStartDate] = useState<Date>(defaultWeek.start);
    const [endDate, setEndDate] = useState<Date>(defaultWeek.end);

    const fetchActivity = useCallback(
        async (start: Date, end: Date) => {
            if (!userId || !companyId) return;
            setLoading(true);
            try {
                const res = await api.get('user/get-activity', {
                    params: {
                        user_id: Number(userId),
                        company_id: Number(companyId),
                        start_date: toApiDate(start),
                        end_date: toApiDate(end),
                    },
                });
                if (res.data?.IsSuccess) {
                    setInfo(res.data.info ?? null);
                } else {
                    toast.error(res.data?.message || 'Failed to load activity');
                }
            } catch {
                toast.error('Failed to load activity');
            } finally {
                setLoading(false);
            }
        },
        [userId, companyId]
    );

    useEffect(() => {
        if (!userId || !active) return;
        const w = getDefaultWeekDates();
        setStartDate(w.start);
        setEndDate(w.end);
        fetchActivity(w.start, w.end);
    }, [active, userId]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            fetchActivity(range.from, range.to);
        }
    };

    const handleReset = () => {
        const w = getDefaultWeekDates();
        setStartDate(w.start);
        setEndDate(w.end);
        fetchActivity(w.start, w.end);
    };

    const groups = info?.activities ?? [];
    const total = info?.total ?? 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 750, overflow: 'hidden' }}>

            {/* ── Top bar ── */}
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: 'background.paper',
                    borderBottom: '0.5px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    flexWrap: 'wrap',
                }}
            >
                <Box className="date_range_picker">
                    <DateRangePickerBox
                        from={startDate}
                        to={endDate}
                        onChange={handleDateRangeChange}
                    />
                </Box>
            </Box>

            {/* ── Body ── */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2.5, minHeight: 0 }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                        <CircularProgress size={30} thickness={4} />
                    </Box>
                ) : total === 0 ? (
                    <EmptyState
                        dateRange={info ? { start: info.start, end: info.end } : undefined}
                        onReset={handleReset}
                    />
                ) : (
                    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
                        {groups.map((group) => (
                            <Box key={group.date} mb={3}>
                                <DayHeader label={group.label} count={group.items.length} />
                                <Box pl={0.5}>
                                    {group.items.map((item, idx) => (
                                        <ActivityCard
                                            key={item.id}
                                            item={item}
                                            isLast={idx === group.items.length - 1}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}

                        {/* Date range footer */}
                        {info && (
                            <Typography
                                fontSize={11}
                                color="text.disabled"
                                textAlign="center"
                                mt={1}
                                pb={2}
                            >
                                Showing activity from {info.start} to {info.end}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default UserActivity;
