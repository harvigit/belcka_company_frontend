'use client';
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
import { useTranslation } from 'react-i18next';

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
    old_data?: any;
    new_data?: any;
    date_of_action: string;
    created_at: string;
    time: string;
    company: { id: number; name: string; image: string | null } | null;
    added_by: Actor | null;
    edited_by: Actor | null;
    deleted_by?: Actor | null;
}

type ActorRole =
    | 'added by'
    | 'edited by'
    | 'requested by'
    | 'approved by'
    | 'rejected by';

const getActivityActor = (
    item: ActivityItem,
): { actor: Actor | null; role: ActorRole } => {
    const title = (item.title || '').toLowerCase();
    const isApproved = /approved by|has been approved/.test(title);
    const isRejected = /rejected by|has been rejected/.test(title);
    const isRequested = /^requested\b|requested to\b/.test(title);

    if (isRejected) {
        return {
            actor: item.deleted_by || item.edited_by || item.added_by,
            role: 'rejected by',
        };
    }

    if (isApproved) {
        return {
            actor: item.added_by || item.edited_by,
            role: 'approved by',
        };
    }

    if (isRequested) {
        return {
            actor: item.edited_by || item.added_by,
            role: 'requested by',
        };
    }

    if (item.edited_by) {
        return { actor: item.edited_by, role: 'edited by' };
    }

    if (item.added_by) {
        return { actor: item.added_by, role: 'added by' };
    }

    return { actor: null, role: 'added by' };
};

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
    isRemoveUser?: boolean;
    isArchivedUser?: boolean;
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

const ActorRow: React.FC<{ actor: Actor; role: ActorRole }> = ({ actor, role }) => {
    const isEdit = role === 'edited by';
    const isRequested = role === 'requested by';
    const isApproved = role === 'approved by';
    const isRejected = role === 'rejected by';
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
                    bgcolor: isRejected
                        ? '#FEE2E2'
                        : isApproved
                          ? '#DCFCE7'
                          : isRequested || isEdit
                            ? '#FEF9C3'
                            : '#DBEAFE',
                    color: isRejected
                        ? '#991B1B'
                        : isApproved
                          ? '#166534'
                          : isRequested || isEdit
                            ? '#92400E'
                            : '#1E40AF',
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

const getDiffs = (oldData: any, newData: any, moduleName: string) => {
    const diffs: { key: string; old: any; new: any }[] = [];
    if (!newData) return diffs;
    if (!moduleName || !moduleName.toLowerCase().includes('billing')) return diffs;

    const IGNORED_KEYS = ['id', 'created_at', 'updated_at', 'deleted_at', 'user_id', 'company_id'];

    try {
        let oldObj = typeof oldData === 'string' ? JSON.parse(oldData) : oldData || {};
        let newObj = typeof newData === 'string' ? JSON.parse(newData) : newData || {};

        const safeParse = (val: any) => {
            if (typeof val === 'string') {
                if (val === '[object Object]') return {};
                try { return JSON.parse(val); } catch (e) { return val; }
            }
            return val;
        };

        if (newObj.billing_info) {
            newObj = safeParse(newObj.billing_info);
            oldObj = safeParse(oldObj.billing_info) || safeParse(oldObj) || {};
        } else if (newObj.billin_info) {
            newObj = safeParse(newObj.billin_info);
            oldObj = safeParse(oldObj.billin_info) || safeParse(oldObj) || {};
        }

        const isDiffObject = Object.values(newObj).some((val: any) => val && typeof val === 'object' && ('old' in val || 'new' in val));

        if (isDiffObject) {
            for (const [key, val] of Object.entries(newObj)) {
                if (IGNORED_KEYS.includes(key)) continue;
                const v = val as any;
                if (v.old !== v.new) {
                    diffs.push({ key, old: v.old, new: v.new });
                }
            }
            return diffs;
        }

        for (const [key, val] of Object.entries(newObj)) {
            if (IGNORED_KEYS.includes(key)) continue;
            if (oldObj[key] !== val) {
                diffs.push({ key, old: oldObj[key], new: val });
            }
        }
    } catch (e) {
        // ignore parse errors
    }
    return diffs;
};

const ActivityCard: React.FC<{ item: ActivityItem; isLast: boolean }> = ({ item, isLast }) => {
    const { t } = useTranslation();
    const mc = MODULE_CONFIG[item.module] ?? FALLBACK_MODULE;
    const ModuleIcon = mc.icon;
    const { actor, role: actorRole } = getActivityActor(item);
    const diffs = getDiffs(item.old_data, item.new_data, item.module);

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
                                label={t(mc.label)}
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

                        {/* Note & Diffs */}
                        {item.note && (
                            <Typography fontSize={12} color="text.secondary" mt={0.5} fontWeight={500}>
                                NOTE : {item.note}
                            </Typography>
                        )}

                        {diffs.length > 0 && (
                            <Box mt={0.5}>
                                {diffs.map((diff, i) => (
                                    <Typography
                                        key={i}
                                        component="div"
                                        fontSize={11}
                                        color="text.secondary"
                                        mt={0.5}
                                        sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
                                    >
                                        <Typography component="span" fontSize={11} fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                                            {diff.key.replace(/_/g, ' ')}
                                        </Typography>
                                        {(!diff.old || diff.old === '') && diff.new && diff.new !== '' ? (
                                            <>
                                                {' - added as '}
                                                <Chip size="small" label={String(diff.new)} sx={{ height: 18, fontSize: 10, bgcolor: '#E8F5E9', color: '#2E7D32', '& .MuiChip-label': { px: 1 } }} />
                                            </>
                                        ) : (
                                            <>
                                                {' - changed from '}
                                                <Chip size="small" label={String(diff.old || 'none')} sx={{ height: 18, fontSize: 10, bgcolor: '#E8F5E9', color: '#2E7D32', '& .MuiChip-label': { px: 1 } }} />
                                                {' to '}
                                                <Chip size="small" label={String(diff.new || 'none')} sx={{ height: 18, fontSize: 10, bgcolor: '#E8F5E9', color: '#2E7D32', '& .MuiChip-label': { px: 1 } }} />
                                            </>
                                        )}
                                    </Typography>
                                ))}
                            </Box>
                        )}
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
                {actor && <ActorRow actor={actor} role={actorRole} />}
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
                                                                                                   }) => {
    const { t } = useTranslation();

    return (
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
            {t('No activity found')}
        </Typography>
        <Typography fontSize={12} color="text.disabled" textAlign="center" maxWidth={240}>
            {t('No events recorded')}
            {dateRange ? ` ${t('from')} ${dateRange.start} ${t('to')} ${dateRange.end}` : ` ${t('for this period')}`}
        </Typography>
        <Button
            size="small"
            onClick={onReset}
            sx={{ textTransform: 'none', fontSize: 12, color: 'primary.main', mt: 0.5 }}
        >
            {t('Reset to current week')}
        </Button>
    </Box>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserActivity: React.FC<UserActivityProps> = ({
    companyId,
    userId,
    active,
    isRemoveUser = false,
    isArchivedUser = false,
}) => {
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
                        ...(isRemoveUser ? { is_remove_user: 1 } : {}),
                        ...(isArchivedUser ? { is_archived_user: 1 } : {}),
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
        [userId, companyId, isRemoveUser, isArchivedUser]
    );

    useEffect(() => {
        if (!userId || !active) return;
        const w = getDefaultWeekDates();
        setStartDate(w.start);
        setEndDate(w.end);
        fetchActivity(w.start, w.end);
    }, [active, userId, fetchActivity]); // ← FIX: Added fetchActivity to dependency array

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
