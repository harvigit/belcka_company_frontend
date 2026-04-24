'use client';

import {
    Avatar,
    Box,
    Button,
    Drawer,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import {
    IconAlertTriangle,
    IconChevronRight,
    IconX,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

import api from '@/utils/axios';

// Types
export interface HealthSafetyConflict {
    record_id: number;
    conflict_type: string;
    message: string;
    reported_by_id: number;
    reported_by_name: string;
    reported_by_thumb_image: string;
    hazard_id: number;
    hazard_name: string;
    description: string;
}

// Helpers
const mkInitials = (name: string) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

// Atoms
const LabelPill = React.memo(({ label, color, bg, border }: {
    label: string; color: string; bg: string; border: string;
}) => (
    <Box sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.25,
        borderRadius: '20px',
        fontSize: '0.68rem',
        fontWeight: 700,
        color,
        bgcolor: bg,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
    }}>
        {label}
    </Box>
));
LabelPill.displayName = 'LabelPill';

const UserAvatar = React.memo(({ name, image, size = 32, color = '#DC2626', bg = '#FEE2E2' }: {
    name: string; image?: string; size?: number; color?: string; bg?: string;
}) => (
    <Avatar 
        src={image || ''} 
        alt={name}
        sx={{
            width: size,
            height: size,
            fontSize: `${size * 0.022}rem`,
            fontWeight: 700,
            bgcolor: bg, color,
            border: `2px solid ${bg}`,
            flexShrink: 0
    }}>
        {!image && mkInitials(name)}
    </Avatar>
));
UserAvatar.displayName = 'UserAvatar';

// Drawer Header
const DrawerHeader = React.memo(({ title, subtitle, image, onClose, badge }: {
    title: string; subtitle?: string; image?: string;
    onClose: () => void; badge?: React.ReactNode;
}) => (
    <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 2, borderBottom: '1px solid #E5E7EB', bgcolor: '#FAFAFA', flexShrink: 0,
    }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <UserAvatar name={title} image={image} size={36} />
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

// Row
export const HSConflictRow = React.memo(({ item, onClick }: {
    item: HealthSafetyConflict; onClick: () => void;
}) => (
    <Box onClick={onClick} sx={{
        px: 2, py: 1.75, borderBottom: '1px solid #F3F4F6',
        cursor: 'pointer', transition: 'background 0.15s',
        '&:hover': { bgcolor: '#F9FAFB' },
    }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <UserAvatar
                name={item.reported_by_name}
                image={item.reported_by_thumb_image}
                size={32}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.4, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827' }}>
                            {item.reported_by_name}
                        </Typography>
                        <LabelPill
                            label={item.hazard_name}
                            color="#DC2626"
                            bg="#FEE2E2"
                            border="#FECACA"
                        />
                    </Stack>
                    <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                </Stack>
                <Typography sx={{ fontSize: '0.72rem', color: '#6B7280', mb: item.description ? 0.75 : 0 }}>
                    {item.message}
                </Typography>
                {item.description && (
                    <Box sx={{
                        px: 1.25, py: 0.6, bgcolor: '#F9FAFB',
                        border: '1px solid #E5E7EB', borderRadius: '6px',
                    }}>
                        <Typography sx={{ fontSize: '0.72rem', color: '#374151', fontStyle: 'italic' }}>
                            "{item.description}"
                        </Typography>
                    </Box>
                )}
            </Box>
        </Stack>
    </Box>
));
HSConflictRow.displayName = 'HSConflictRow';

// Detail Panel
const HSDetailPanel = React.memo(({ conflict, onClose, onResolved }: {
    conflict: HealthSafetyConflict; isLoading: boolean; onClose: () => void; onResolved: () => void;
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleMarkResolved = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await api.post('/health-safety/resolve-conflict', {
                record_id: conflict.record_id,
                conflict_type: conflict.conflict_type,
            });
            if (res.data.IsSuccess) {
                toast.success(res.data.message ?? 'Conflict resolved');
                onResolved();
            } else {
                toast.error(res.data.message ?? 'Something went wrong');
            }
        } catch {
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }, [conflict.record_id, conflict.conflict_type, onResolved, isLoading])
    
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
            <DrawerHeader
                title={conflict.reported_by_name}
                subtitle={conflict.hazard_name}
                image={conflict.reported_by_thumb_image}
                onClose={onClose}
                badge={
                    <LabelPill
                        label="Health & Safety"
                        color="#DC2626"
                        bg="#FEE2E2"
                        border="#FECACA"
                    />
                }
            />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>

                {/* Warning */}
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                    Hazard Overview
                </Typography>
                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FFF7ED', border: '1px solid #FED7AA', mb: 2 }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <IconAlertTriangle size={15} color="#F97316" style={{ marginTop: 1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#9A3412' }}>
                            {conflict.message}
                        </Typography>
                    </Stack>
                </Box>

                {/* Description */}
                {conflict.description && (
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                            textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1,
                        }}>
                            Description
                        </Typography>
                        <Box sx={{
                            px: 1.5, py: 1, bgcolor: '#F9FAFB',
                            border: '1px solid #E5E7EB', borderRadius: '8px',
                        }}>
                            <Typography sx={{ fontSize: '0.78rem', color: '#374151', fontStyle: 'italic' }}>
                                "{conflict.description}"
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Details */}
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', mb: 2 }}>
                    <Typography sx={{
                        fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, mb: 0.75,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                        Report Details
                    </Typography>
                    {[
                        { label: 'Reported By', value: conflict.reported_by_name },
                        { label: 'Hazard', value: conflict.hazard_name },
                        { label: 'Conflict Type', value: conflict.conflict_type.replace(/_/g, ' ') },
                        { label: 'Record ID', value: `#${conflict.record_id}` },
                    ].map(({ label, value }) => (
                        <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
                            <Typography sx={{ fontSize: '0.78rem', color: '#6B7280' }}>{label}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                                {value}
                            </Typography>
                        </Stack>
                    ))}
                </Box>

                {/* Action */}
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                    Resolution
                </Typography>
                <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    disabled={isLoading}
                    onClick={handleMarkResolved}
                    sx={{
                        textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                        justifyContent: 'flex-start', px: 2,
                    }}
                >
                    Mark as Resolved
                </Button>
            </Box>
        </Box>
    );
});
HSDetailPanel.displayName = 'HSDetailPanel';

// Main Export
interface HealthSafetyConflictsProps {
    data: HealthSafetyConflict[];
    searchTerm?: string;
    onResolved: () => void;
}

export default function HealthSafetyConflicts({ data, searchTerm = '', onResolved }: HealthSafetyConflictsProps) {
    const [openConflict, setOpenConflict] = useState<HealthSafetyConflict | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleResolved = useCallback(async () => {
        setIsActionLoading(true);    
        setOpenConflict(null);
        onResolved();
        setIsActionLoading(false);     
    }, [onResolved]);

    const filtered = searchTerm
        ? data.filter((h) =>
            h.reported_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.hazard_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : data;

    return (
        <>
            {filtered.map((item, i) => (
                <HSConflictRow
                    key={i}
                    item={item}
                    onClick={() => setOpenConflict(item)}
                />
            ))}

            <Drawer
                anchor="right"
                open={!!openConflict}
                onClose={() => setOpenConflict(null)}
                PaperProps={{ sx: { width: 480, borderTopLeftRadius: 18, borderBottomLeftRadius: 18, overflow: 'hidden' } }}
            >
                {openConflict && (
                    <HSDetailPanel
                        conflict={openConflict}
                        isLoading={isActionLoading}
                        onClose={() => setOpenConflict(null)}
                        onResolved={handleResolved}
                    />
                )}
            </Drawer>
        </>
    );
}
