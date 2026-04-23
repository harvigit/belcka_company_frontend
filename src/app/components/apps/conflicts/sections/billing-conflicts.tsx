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
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';

import api from '@/utils/axios';

// Types 
export interface ConflictItem {
    user_id: number;
    date: string;
    start: string;
    end: string;
    shift_name: string;
    shift_id: string | number;
    worklog_id?: number;
    conflict_type?: string;
    message?: string;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
}

export interface BillingConflict {
    user_id: number;
    user_name: string;
    user_thumb_image: string;
    formatted_date: string;
    date: string;
    items: ConflictItem[];
}

// Helpers
const mkInitials = (name: string) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const formatFieldLabel = (key: string) =>
    key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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

// BillingDiff 
const BillingDiff = React.memo(({ item }: { item: ConflictItem }) => (
    <Box>
        {item.message && (
            <Box sx={{
                display: 'flex', alignItems: 'flex-start', gap: 1,
                mb: 1.25, p: 1.25, borderRadius: '8px', bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
            }}>
                <IconAlertTriangle size={13} color="#F97316" style={{ marginTop: 1, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#9A3412' }}>{item.message}</Typography>
            </Box>
        )}
        {Object.keys({ ...item.old_data, ...item.new_data }).map((key) => {
            const oldVal = item.old_data?.[key], newVal = item.new_data?.[key];
            if ([null, undefined, ''].includes(oldVal) && [null, undefined, ''].includes(newVal)) return null;

            return (
                <Box key={key} sx={{ mb: 0.75, borderRadius: '8px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    <Box sx={{ px: 1.25, py: 0.4, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <Typography sx={{
                            fontSize: '0.65rem', fontWeight: 700, color: '#374151',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                            {formatFieldLabel(key)}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <Box sx={{ px: 1.25, py: 0.6, borderRight: '1px solid #E5E7EB', bgcolor: '#FEF2F2' }}>
                            <Typography sx={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, mb: 0.25 }}>BEFORE</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#374151', wordBreak: 'break-word' }}>
                                {String(oldVal ?? '—')}
                            </Typography>
                        </Box>
                        <Box sx={{ px: 1.25, py: 0.6, bgcolor: '#F0FDF4' }}>
                            <Typography sx={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 700, mb: 0.25 }}>AFTER</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#374151', wordBreak: 'break-word' }}>
                                {String(newVal ?? '—')}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            );
        })}
    </Box>
));
BillingDiff.displayName = 'BillingDiff';

// Row
export const BillingConflictRow = React.memo(({ conflict, onClick }: {
    conflict: BillingConflict; onClick: () => void;
}) => (
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
                <LabelPill label="Billing Info" color="#1D4ED8" bg="#EFF6FF" border="#BFDBFE" />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                <IconCalendarEvent size={11} color="#9CA3AF" />
                <Typography sx={{ fontSize: '0.72rem', color: '#6B7280' }}>{conflict.formatted_date}</Typography>
                {conflict.items[0]?.message && (
                    <>
                        <Typography sx={{ fontSize: '0.72rem', color: '#D1D5DB' }}>·</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#9A3412' }} noWrap>
                            {conflict.items[0].message}
                        </Typography>
                    </>
                )}
            </Stack>
        </Box>
        <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Box>
));
BillingConflictRow.displayName = 'BillingConflictRow';

// Detail Panel 
const BillingDetailPanel = React.memo(({ 
    conflict, isLoading, onClose, onResolved, onApprove, onReject
}: {
    conflict: BillingConflict;
    isLoading: boolean;
    onClose: () => void;
    onResolved: () => void;
    onApprove: (userId: number, logId?: number | null) => void;
    onReject: (userId: number, logId?: number | null) => void;
}) => {
    const renderActions = () => {
        const item = conflict.items[0];
        const hasData =
            item.old_data && item.new_data &&
            Object.keys(item.new_data).length > 0 &&
            item.worklog_id !== 0;

        return (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {hasData ? (
                    <>
                        <Button
                            variant="contained" size="small" disabled={isLoading}
                            onClick={() => onApprove(item.user_id, item.worklog_id)}
                            sx={{ flex: 1, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                            Keep Changes
                        </Button>
                        <Button
                            variant="outlined" size="small" color="error" disabled={isLoading}
                            onClick={() => onReject(item.user_id, item.worklog_id)}
                            sx={{ flex: 1, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                            Discard
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outlined" size="small" color="error"
                        onClick={() => onReject(item.user_id, null)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                        Discard
                    </Button>
                )}
            </Stack>
        );
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
                        label="Billing"
                        size="small"
                        sx={{
                            height: 22, fontSize: '0.68rem', fontWeight: 700,
                            bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                            '& .MuiChip-icon': { color: '#3B82F6', ml: 0.75 },
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
                    Billing Info Changes
                </Typography>
                {conflict.items.map((item, i) => <BillingDiff key={i} item={item} />)}

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
BillingDetailPanel.displayName = 'BillingDetailPanel';

// Main
interface BillingConflictsProps {
    data: BillingConflict[];
    searchTerm?: string;
    onResolved: () => void;
}

export default function BillingConflicts({ data, searchTerm = '', onResolved }: BillingConflictsProps) {
    const [openConflict, setOpenConflict] = useState<BillingConflict | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const session = useSession();
    const user = session?.data?.user as User & { company_id: number };

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

    const handleApprove = useCallback(async (userId: number, logId?: number | null) => {
        if (!logId) return;
        setIsActionLoading(true);
        try {
            const res = await api.post('/requests/approve-request', { log_id: logId, user_id: userId });
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                await handleResolved();
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setIsActionLoading(false);
        }
    }, [handleResolved]);

    const handleReject = useCallback(async (userId: number, logId?: number | null) => {
        setIsActionLoading(true);
        try {
            if (!logId) {
                const res = await api.post('user-billing/resolve-conflict', {
                    user_id: userId,
                    company_id: user?.company_id,
                });
                if (res.data.IsSuccess) {
                    toast.success(res.data.message);
                    await handleResolved();
                }
                return;
            }
            const res = await api.post('/requests/reject-request', { log_id: logId, user_id: userId });
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                await handleResolved();
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setIsActionLoading(false);
        }
    }, [handleResolved, user?.company_id]);

    return (
        <>
            {filtered.map((conflict, i) => (
                <BillingConflictRow
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
                    <BillingDetailPanel
                        conflict={openConflict}
                        isLoading={isActionLoading}
                        onClose={() => setOpenConflict(null)}
                        onResolved={handleResolved}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                )}
            </Drawer>
        </>
    );
}
