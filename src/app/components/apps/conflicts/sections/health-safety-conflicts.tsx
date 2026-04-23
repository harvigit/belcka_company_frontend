'use client';

import {
    Avatar,
    Box,
    Chip,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import React from 'react';
import {
    IconShieldExclamation,
    IconX,
} from '@tabler/icons-react';

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

const UserAvatar = React.memo(({ name, image, size = 32, color = '#DC2626', bg = '#FEE2E2' }: {
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

export const HSConflictRow = React.memo(({ item }: { item: HealthSafetyConflict }) => (
    <Box sx={{ px: 2, py: 1.75, borderBottom: '1px solid #F3F4F6' }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <UserAvatar
                name={item.reported_by_name}
                image={item.reported_by_thumb_image}
                size={32}
                color="#DC2626"
                bg="#FEE2E2"
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
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

// Main Export
interface HealthSafetyConflictsProps {
    data: HealthSafetyConflict[];
    searchTerm?: string;
}

export default function HealthSafetyConflicts({ data, searchTerm = '' }: HealthSafetyConflictsProps) {
    const filtered = searchTerm
        ? data.filter((h) =>
            h.reported_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            h.hazard_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : data;

    return (
        <>
            {filtered.map((item, i) => (
                <HSConflictRow key={i} item={item} />
            ))}
        </>
    );
}
