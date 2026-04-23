'use client';

import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import {
    IconAlertTriangle,
    IconCalendarEvent,
    IconChevronRight,
    IconX,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';

import CutDeleteCase from '../resolution/cut-delete-conflicts';
import SplitDeleteCase from '../resolution/split-delete-conflicts';
import DeleteOnlyCase from '../resolution/delete-conflicts';

export interface Conflict {
    user_thumb_image: string;
    user_name: string;
    formatted_date: string;
    items: ConflictItem[];
}

export interface ConflictItem {
    user_id: number;
    date: string;
    start: string;
    end: string;
    shift_name: string;
    shift_id: string | number;
    color?: string;
    worklog_id?: number;
    is_leave?: boolean;
    leave_name?: string | null;
    user_leave_id?: number | null;
    conflict_type?: string;
    message?: string;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
}

export interface TimesheetConflict {
    user_id: number;
    user_name: string;
    user_thumb_image: string;
    formatted_date: string;
    date: string;
    items: ConflictItem[];
}

export type ShiftConflictType = 'cut-delete' | 'split-delete' | 'delete-only';

export const parseDT = (() => {
    const cache = new Map<string, DateTime>();
    return (s: string): DateTime => {
        if (cache.has(s)) return cache.get(s)!;
        const iso = DateTime.fromISO(s);
        if (iso.isValid) { cache.set(s, iso); return iso; }
        const hm = DateTime.fromFormat(s, 'HH:mm');
        const result = hm.isValid ? hm : DateTime.invalid('Invalid time');
        cache.set(s, result);
        return result;
    };
})();

const getShiftConflictType = (items: ConflictItem[]): ShiftConflictType => {
    if (items.some((i) => i.is_leave)){
        return 'delete-only';   
    }
    
    if (items.length !== 2){
        return 'delete-only';   
    }
    
    const [i1, i2] = items;
    const s1 = parseDT(i1.start), e1 = parseDT(i1.end), s2 = parseDT(i2.start), e2 = parseDT(i2.end);
    
    if (![s1, e1, s2, e2].every((d) => d.isValid)) {
        return 'delete-only';
    }
    
    if (s1.equals(s2) && e1.equals(e2)) {
        return 'delete-only';
    }
    
    if (s1.equals(s2) || e1.equals(e2)) {
        return 'cut-delete';
    }
    
    return (s1 <= s2 && e1 >= e2) || (s2 <= s1 && e2 >= e1) ? 'split-delete' : 'delete-only';
};

const mkInitials = (name: string) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const SHIFT_TYPE_CFG: Record<ShiftConflictType, { label: string; color: string; bg: string; border: string }> = {
    'cut-delete':    { label: 'Cut & Delete',   color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
    'split-delete':  { label: 'Split & Delete', color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
    'delete-only':   { label: 'Delete Only',    color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
};

// Shared Atoms
const LabelPill = React.memo(({ label, color, bg, border }: {
    label: string; color: string; bg: string; border: string;
}) => (
    <Box sx={{
        display: 'inline-flex', alignItems: 'center', px: 1.25, py: 0.25,
        borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
        color, bgcolor: bg, border: `1px solid ${border}`, whiteSpace: 'nowrap',
    }}>
        {label}
    </Box>
));
LabelPill.displayName = 'LabelPill';

const UserAvatar = React.memo(({ name, image, size = 36 }: {
    name: string; image?: string; size?: number;
}) => (
    <Avatar src={image || ''} alt={name} sx={{
        width: size, height: size,
        fontSize: `${size * 0.022}rem`, fontWeight: 700,
        bgcolor: '#EEF2FF', color: '#4F46E5',
        border: '2px solid #EEF2FF', flexShrink: 0,
    }}>
        {!image && mkInitials(name)}
    </Avatar>
));
UserAvatar.displayName = 'UserAvatar';

const DrawerHeader = React.memo(({ title, subtitle, image, onClose, badge }: {
    title: string; subtitle?: string; image?: string;
    onClose: () => void; badge?: React.ReactNode;
}) => (
    <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 2, borderBottom: '1px solid #E5E7EB', bgcolor: '#FAFAFA', flexShrink: 0,
    }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <UserAvatar name={title} image={image} />
            <Box>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>{subtitle}</Typography>}
            </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
            {badge}
            <Tooltip title="Close">
                <Box component="span" onClick={onClose} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, bgcolor: '#F3F4F6', borderRadius: '8px',
                    cursor: 'pointer', '&:hover': { bgcolor: '#E5E7EB' },
                }}>
                    <IconX size={15} />
                </Box>
            </Tooltip>
        </Stack>
    </Box>
));
DrawerHeader.displayName = 'DrawerHeader';

// ShiftBar
const ShiftBar = React.memo(({ item }: { item: ConflictItem }) => {
    const isLeave = item.is_leave;
    const label = isLeave && item.leave_name ? item.leave_name : item.shift_name;

    return (
        <Box sx={{ mb: 0.75 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3, px: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isLeave ? '#EF4444' : '#3B82F6' }} />
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>
                        {item.start}
                    </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>
                    {item.end}
                </Typography>
            </Stack>
            <Box sx={{
                borderRadius: '6px',
                bgcolor: isLeave ? '#FEE2E2' : (item.color || '#DBEAFE'),
                border: `1px solid ${isLeave ? '#FECACA' : '#BFDBFE'}`,
                px: 1.25, py: 0.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: isLeave ? '#991B1B' : '#1E40AF' }}>
                    {label}
                </Typography>
                {isLeave && (
                    <Chip label="Leave" size="small" sx={{
                        height: 16, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA',
                        '& .MuiChip-label': { px: 0.75 },
                    }} />
                )}
            </Box>
        </Box>
    );
});
ShiftBar.displayName = 'ShiftBar';

// Row 
export const TimesheetConflictRow = React.memo(({ conflict, onClick }: {
    conflict: TimesheetConflict; onClick: () => void;
}) => {
    const type = getShiftConflictType(conflict.items);
    const cfg = SHIFT_TYPE_CFG[type];

    return (
        <Box onClick={onClick} sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
            borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s',
            '&:hover': { bgcolor: '#F9FAFB' },
        }}>
            <UserAvatar name={conflict.user_name} image={conflict.user_thumb_image} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                        {conflict.user_name}
                    </Typography>
                    <LabelPill label={cfg.label} color={cfg.color} bg={cfg.bg} border={cfg.border} />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                    <IconCalendarEvent size={11} color="#9CA3AF" />
                    <Typography sx={{ fontSize: '0.72rem', color: '#6B7280' }}>{conflict.formatted_date}</Typography>
                    {conflict.items.map((item, i) => (
                        <React.Fragment key={i}>
                            <Typography sx={{ fontSize: '0.72rem', color: '#D1D5DB' }}>·</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#6B7280', fontFamily: 'monospace' }}>
                                {item.start}–{item.end}
                            </Typography>
                        </React.Fragment>
                    ))}
                </Stack>
            </Box>
            <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
        </Box>
    );
});
TimesheetConflictRow.displayName = 'TimesheetConflictRow';

// Detail Panel
const TimesheetDetailPanel = React.memo(({ conflict, startDate, endDate, onClose, onResolved }: {
    conflict: TimesheetConflict;
    startDate: string;
    endDate: string;
    onClose: () => void;
    onResolved: () => void;
}) => {
    const conflictType = getShiftConflictType(conflict.items);
    const commonProps = { conflict: conflict as any, index: 0, startDate, endDate, onClose: onResolved };

    const renderActions = () => {
        if (conflictType === 'cut-delete') return <Box mt={2}><CutDeleteCase {...commonProps} /></Box>;
        if (conflictType === 'split-delete') return <Box mt={2}><SplitDeleteCase {...commonProps} /></Box>;
        return <Box mt={2}><DeleteOnlyCase {...commonProps} /></Box>;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
            <DrawerHeader
                title={conflict.user_name}
                image={conflict.user_thumb_image}
                subtitle={conflict.formatted_date}
                onClose={onClose}
                badge={
                    <Chip
                        icon={<IconAlertTriangle size={10} />}
                        label="Conflict"
                        size="small"
                        sx={{
                            height: 22, fontSize: '0.68rem', fontWeight: 700,
                            bgcolor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
                            '& .MuiChip-icon': { color: '#D97706', ml: 0.75 },
                            '& .MuiChip-label': { px: 0.75 },
                        }}
                    />
                }
            />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25,
                }}>
                    Overlapping Shifts
                </Typography>

                <Box>
                    {conflict.items.length === 2 && (
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.25 }}>
                            <Box sx={{ flex: 1, height: '1px', bgcolor: '#E5E7EB' }} />
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                px: 1, py: 0.3, borderRadius: '12px',
                                bgcolor: '#FEF3C7', border: '1px solid #FDE68A',
                            }}>
                                <IconAlertTriangle size={10} color="#D97706" />
                                <Typography sx={{
                                    fontSize: '0.62rem', fontWeight: 700, color: '#92400E',
                                    textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                    Overlap
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, height: '1px', bgcolor: '#E5E7EB' }} />
                        </Stack>
                    )}
                    {conflict.items.map((item, i) => <ShiftBar key={i} item={item} />)}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1,
                }}>
                    Resolution
                </Typography>
                {renderActions()}
            </Box>
        </Box>
    );
});
TimesheetDetailPanel.displayName = 'TimesheetDetailPanel';

// Main Export 
interface TimesheetConflictsProps {
    data: TimesheetConflict[];
    startDate: string;
    endDate: string;
    searchTerm?: string;
    onResolved: () => void;
}

export default function TimesheetConflicts({
   data,
   startDate,
   endDate,
   searchTerm = '',
   onResolved
}: TimesheetConflictsProps) {
    const [openConflict, setOpenConflict] = useState<TimesheetConflict | null>(null);

    const filtered = searchTerm
        ? data.filter((c) =>
            c.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.formatted_date?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : data;

    const handleResolved = useCallback(async () => {
        setOpenConflict(null);
        onResolved();
    }, [onResolved]);

    return (
        <>
            {filtered.map((conflict, i) => (
                <TimesheetConflictRow
                    key={i}
                    conflict={conflict}
                    onClick={() => setOpenConflict(conflict)}
                />
            ))}

            <Drawer
                anchor="right"
                open={!!openConflict}
                onClose={() => setOpenConflict(null)}
                PaperProps={{ sx: { width: 480, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, overflow: 'hidden' } }}
            >
                {openConflict && (
                    <TimesheetDetailPanel
                        conflict={openConflict}
                        startDate={startDate}
                        endDate={endDate}
                        onClose={() => setOpenConflict(null)}
                        onResolved={handleResolved}
                    />
                )}
            </Drawer>
        </>
    );
}
