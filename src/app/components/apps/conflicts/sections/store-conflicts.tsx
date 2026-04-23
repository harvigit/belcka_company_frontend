'use client';

import {
    Avatar,
    Box,
    Button,
    Divider,
    Drawer,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import {
    IconAlertTriangle,
    IconBuildingStore,
    IconChevronRight,
    IconExternalLink,
    IconX,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import api from '@/utils/axios';

// Types
export interface StoreConflict {
    conflict_type: string;
    product_id: number;
    product_name: string | null;
    product_short_name: string;
    product_thumb_image: string;
    store_id: number;
    store_name: string;
    current_qty: number;
    price: string;
    total_amount: string;
    currency: string;
    message: string;
}

// Helpers
const mkInitials = (name: string) =>
    (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

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

// Row
export const StoreConflictRow = React.memo(({ item, onClick }: {
    item: StoreConflict; onClick: () => void;
}) => (
    <Box onClick={onClick} sx={{
        display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
        borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s',
        '&:hover': { bgcolor: '#F9FAFB' },
    }}>
        <Box sx={{
            width: 40, height: 40, borderRadius: '10px', bgcolor: '#F0FDF4',
            border: '1px solid #D1FAE5', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
        }}>
            <IconBuildingStore size={20} color="#059669" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                    {item.product_short_name}
                </Typography>
                <LabelPill label={item.store_name} color="#0E7490" bg="#ECFEFF" border="#A5F3FC" />
            </Stack>
            <Typography sx={{ fontSize: '0.72rem', color: '#6B7280' }} noWrap>
                {item.message}
            </Typography>
        </Box>
        <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Box>
));
StoreConflictRow.displayName = 'StoreConflictRow';

// Detail Panel
const StoreDetailPanel = React.memo(({ conflict, isLoading, onClose, onResolved }: {
    conflict: StoreConflict; isLoading: boolean; onClose: () => void; onResolved: () => void;
}) => {
    const router = useRouter();

    const handleMarkResolved = useCallback(async () => {
        try {
            const res = await api.post('/company/resolve-store-conflict', {
                product_id: conflict.product_id,
                store_id: conflict.store_id,
            });
            if (res.data.IsSuccess) {
                toast.success(res.data.message ?? 'Store conflict resolved');
                onResolved();
            }
        } catch {
            toast.error('Something went wrong');
        }
    }, [conflict.product_id, conflict.store_id, onResolved]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
            <DrawerHeader
                title={conflict.product_short_name}
                subtitle={conflict.store_name}
                onClose={onClose}
                badge={<LabelPill label="Amount Exceeded" color="#0E7490" bg="#ECFEFF" border="#A5F3FC" />}
            />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                    Stock Overview
                </Typography>

                {/* Warning */}
                <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: '#FFF7ED', border: '1px solid #FED7AA', mb: 2 }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <IconAlertTriangle size={15} color="#F97316" style={{ marginTop: 1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#9A3412' }}>
                            {conflict.message}
                        </Typography>
                    </Stack>
                </Box>

                {/* Stats grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2 }}>
                    {[
                        { label: 'QTY', value: String(conflict.current_qty), color: '#111827' },
                        { label: 'UNIT PRICE', value: `${conflict.currency}${conflict.price}`, color: '#111827' },
                        { label: 'TOTAL', value: `${conflict.currency}${conflict.total_amount}`, color: '#DC2626' },
                    ].map(({ label, value, color }) => (
                        <Box key={label} sx={{
                            p: 1.25, borderRadius: '8px', bgcolor: '#F9FAFB',
                            border: '1px solid #E5E7EB', textAlign: 'center',
                        }}>
                            <Typography sx={{
                                fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 700, mb: 0.5,
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                                {label}
                            </Typography>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color }}>{value}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* Details */}
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', mb: 2 }}>
                    <Typography sx={{
                        fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, mb: 0.75,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                        Product Details
                    </Typography>
                    {[
                        { label: 'Product', value: conflict.product_short_name },
                        { label: 'Store', value: conflict.store_name },
                        {
                            label: 'Conflict Type',
                            value: conflict.conflict_type === 'stock_amount_exceeded'
                                ? 'Amount Threshold Exceeded'
                                : 'Quantity Exceeded',
                        },
                    ].map(({ label, value }) => (
                        <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
                            <Typography sx={{ fontSize: '0.78rem', color: '#6B7280' }}>{label}</Typography>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{value}</Typography>
                        </Stack>
                    ))}
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                    Resolution
                </Typography>
                <Stack spacing={1.25}>
                    <Button
                        variant="outlined" fullWidth
                        startIcon={<IconExternalLink size={15} />}
                        onClick={() => router.push(`/apps/store?store_id=${conflict.store_id}`)}
                        sx={{
                            textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                            justifyContent: 'flex-start', px: 2,
                        }}
                    >
                        View Store
                    </Button>
                    <Button
                        variant="contained" color="error" fullWidth
                        disabled={isLoading}
                        onClick={handleMarkResolved}
                        sx={{
                            textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                            justifyContent: 'flex-start', px: 2,
                        }}
                    >
                        Mark as Resolved
                    </Button>
                </Stack>
            </Box>
        </Box>
    );
});
StoreDetailPanel.displayName = 'StoreDetailPanel';

// Main Export
interface StoreConflictsProps {
    data: StoreConflict[];
    onResolved: () => void;
}

export default function StoreConflicts({ data, onResolved }: StoreConflictsProps) {
    const [openConflict, setOpenConflict] = useState<StoreConflict | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleResolved = useCallback(async () => {
        setOpenConflict(null);
        onResolved();
    }, [onResolved]);

    return (
        <>
            {data.map((item, i) => (
                <StoreConflictRow
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
                    <StoreDetailPanel
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
