'use client';

import React from 'react';
import {Box, Typography} from '@mui/material';
import {PriceworkStatus} from '../types';

const STATUS_STYLES: Record<
    PriceworkStatus,
    {bg: string; color: string; label: string}
> = {
    approved: {
        bg: '#E8F8EF',
        color: '#1B7A45',
        label: 'Approved',
    },
    pending: {
        bg: '#FFF4E5',
        color: '#C47A00',
        label: 'Pending',
    },
    rejected: {
        bg: '#FDECEC',
        color: '#C62828',
        label: 'Rejected',
    },
    sent: {
        bg: '#E8F1FC',
        color: '#1E4DB7',
        label: 'Sent',
    },
};

type Props = {
    status: PriceworkStatus;
    date?: string | null;
};

const formatSendDate = (value?: string | null) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const dmy = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})/);
    if (dmy) return dmy[1];
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return null;
};

const PriceworkStatusBadge = ({status, date}: Props) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
    const sendDate = status === 'sent' ? formatSendDate(date) : null;

    return (
        <Box
            sx={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
            }}
        >
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
            {sendDate && (
                <Typography
                    sx={{
                        fontSize: 12,
                        fontWeight: 400,
                        lineHeight: 1.25,
                        color: '#6B7280',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {sendDate}
                </Typography>
            )}
        </Box>
    );
};

export default PriceworkStatusBadge;
