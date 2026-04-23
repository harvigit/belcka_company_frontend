'use client';

import {
    Box,
    Button,
    Divider,
    Drawer,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import {
    IconExternalLink,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import api from '@/utils/axios';

// Types
export interface TeamConflict {
    team_id: number;
    team_name: string;
    supervisor_id: number;
    supervisor_name: string;
    supervisor_thumb_image: string;
    current_member_count: number;
    max_member_limit: number;
    conflict_type: string;
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

import { Avatar } from '@mui/material';

const UserAvatar = React.memo(({ name, image, size = 36, color = '#7C3AED', bg = '#EDE9FE' }: {
    name: string; image?: string; size?: number; color?: string; bg?: string;
}) => (
    <Avatar src={image || ''} alt={name} sx={{
        width: size, height: size,
        fontSize: `${size * 0.022}rem`, fontWeight: 700,
        bgcolor: bg, color,
        border: `2px solid ${bg}`, flexShrink: 0,
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
import { IconChevronRight } from '@tabler/icons-react';

export const TeamConflictRow = React.memo(({ item, onClick }: {
    item: TeamConflict; onClick: () => void;
}) => {
    const overBy = item.current_member_count - item.max_member_limit;
    const pct = Math.min(100, (item.current_member_count / Math.max(item.max_member_limit, 1)) * 100);

    return (
        <Box onClick={onClick} sx={{
            display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5,
            borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.15s',
            '&:hover': { bgcolor: '#F9FAFB' },
        }}>
            <UserAvatar name={item.team_name} image={item.supervisor_thumb_image} color="#7C3AED" bg="#EDE9FE" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                        {item.team_name}
                    </Typography>
                    <LabelPill label={`+${overBy} over limit`} color="#7C3AED" bg="#EDE9FE" border="#DDD6FE" />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ flex: 1 }}>
                        <LinearProgress variant="determinate" value={pct} sx={{
                            height: 5, borderRadius: 3, bgcolor: '#F3F4F6',
                            '& .MuiLinearProgress-bar': { bgcolor: '#EF4444', borderRadius: 3 },
                        }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                        {item.current_member_count}/{item.max_member_limit}
                    </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.7rem', color: '#6B7280', mt: 0.3 }}>
                    Supervisor: {item.supervisor_name}
                </Typography>
            </Box>
            <IconChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
        </Box>
    );
});
TeamConflictRow.displayName = 'TeamConflictRow';

// Detail Panel
const TeamDetailPanel = React.memo(({ conflict, isLoading, onClose, onResolved }: {
    conflict: TeamConflict; isLoading: boolean; onClose: () => void; onResolved: () => void;
}) => {
    const router = useRouter();
    const overBy = conflict.current_member_count - conflict.max_member_limit;
    const pct = Math.min(100, (conflict.current_member_count / Math.max(conflict.max_member_limit, 1)) * 100);

    const handleMarkResolved = useCallback(async () => {
        try {
            const res = await api.post('/company/resolve-team-conflict', { team_id: conflict.team_id });
            if (res.data.IsSuccess) {
                toast.success(res.data.message ?? 'Team conflict resolved');
                onResolved();
            }
        } catch {
            toast.error('Something went wrong');
        }
    }, [conflict.team_id, onResolved]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
            <DrawerHeader
                title={conflict.team_name}
                image={conflict.supervisor_thumb_image}
                subtitle={`Supervisor: ${conflict.supervisor_name}`}
                onClose={onClose}
                badge={<LabelPill label="Team Limit" color="#7C3AED" bg="#EDE9FE" border="#DDD6FE" />}
            />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
                <Typography sx={{
                    fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                    Member Usage
                </Typography>

                {/* Usage card */}
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#FEF2F2', border: '1px solid #FECACA', mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1.25 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, mb: 0.25 }}>
                                CURRENT
                            </Typography>
                            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', lineHeight: 1 }}>
                                {conflict.current_member_count}
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, mb: 0.25 }}>
                                MAX ALLOWED
                            </Typography>
                            <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#374151', lineHeight: 1 }}>
                                {conflict.max_member_limit}
                            </Typography>
                        </Box>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                            height: 8, borderRadius: 4, bgcolor: '#FECACA',
                            '& .MuiLinearProgress-bar': { bgcolor: '#EF4444', borderRadius: 4 },
                        }}
                    />
                    <Typography sx={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: 600, mt: 1 }}>
                        {overBy} member{overBy > 1 ? 's' : ''} over the limit — reduce team size to resolve
                    </Typography>
                </Box>

                {/* Details */}
                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', mb: 2 }}>
                    <Typography sx={{
                        fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, mb: 0.75,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                        Team Details
                    </Typography>
                    {[
                        { label: 'Team Name', value: conflict.team_name },
                        { label: 'Supervisor', value: conflict.supervisor_name },
                        { label: 'Conflict Type', value: 'Member Limit Exceeded' },
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
                        onClick={() => router.push(`/apps/teams/team?team_id=${conflict.team_id}`)}
                        sx={{
                            textTransform: 'none', fontWeight: 600, borderRadius: '8px',
                            justifyContent: 'flex-start', px: 2,
                        }}
                    >
                        View Team
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
TeamDetailPanel.displayName = 'TeamDetailPanel';

// Main Export 
interface TeamConflictsProps {
    data: TeamConflict[];
    onResolved: () => void;
}

export default function TeamConflicts({ data, onResolved }: TeamConflictsProps) {
    const [openConflict, setOpenConflict] = useState<TeamConflict | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const handleResolved = useCallback(async () => {
        setOpenConflict(null);
        onResolved();
    }, [onResolved]);

    return (
        <>
            {data.map((item, i) => (
                <TeamConflictRow
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
                    <TeamDetailPanel
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
