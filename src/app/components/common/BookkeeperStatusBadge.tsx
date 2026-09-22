'use client';

import React from 'react';
import {Box, Typography} from '@mui/material';

export type BookkeeperStatus = 'pending' | 'unlocked' | 'locked' | 'paid';

const STATUS_STYLES: Record<
    BookkeeperStatus,
    {bg: string; color: string; label: string}
> = {
    pending: {
        bg: '#FFF4E5',
        color: '#C47A00',
        label: 'Pending',
    },
    unlocked: {
        bg: '#FDECEC',
        color: '#C62828',
        label: 'Unlocked',
    },
    locked: {
        bg: '#E8F8EF',
        color: '#1B7A45',
        label: 'Locked',
    },
    paid: {
        bg: '#E8F1FC',
        color: '#1E4DB7',
        label: 'Paid',
    },
};

export const normalizeBookkeeperStatus = (
    value?: string | number | null,
): BookkeeperStatus | null => {
    if (value === null || value === undefined || value === '') return null;

    const key = String(value).trim().toLowerCase();
    if (key === '0' || key === 'pending') return 'pending';
    if (key === '6' || key === 'locked') return 'locked';
    if (key === '7' || key === 'unlocked') return 'unlocked';
    if (key === '9' || key === 'paid') return 'paid';

    return null;
};

type Props = {
    status?: string | number | null;
};

const BookkeeperStatusBadge = ({status}: Props) => {
    const normalized = normalizeBookkeeperStatus(status);

    if (!normalized) {
        return (
            <Typography className="f-14" color="text.secondary">
                —
            </Typography>
        );
    }

    const style = STATUS_STYLES[normalized];

    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 1.25,
                py: 0.35,
                borderRadius: '999px',
                bgcolor: style.bg,
            }}
        >
            <Typography
                component="span"
                sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: style.color,
                    whiteSpace: 'nowrap',
                }}
            >
                {style.label}
            </Typography>
        </Box>
    );
};

export default BookkeeperStatusBadge;
