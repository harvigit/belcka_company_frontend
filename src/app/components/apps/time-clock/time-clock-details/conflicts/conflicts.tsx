'use client';

import {
    Box,
    Typography,
    Card,
    CardContent,
    IconButton, Avatar,
} from '@mui/material';
import React from 'react';
import {
    IconX,
    IconInfoCircle,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';
import CutDeleteCase from './cut-delete-conflicts';
import SplitDeleteCase from './split-delete-conflicts';
import DeleteOnlyCase from './delete-conflicts';

export interface ConflictItem {
    user_id: number;
    user_name?: string;
    date: string;
    start: string;
    end: string;
    shift_name: string;
    shift_id: string;
    color?: string;
    worklog_id?: number;
    project?: string;
    is_leave?: boolean;
    leave_name?: string | null;
    user_leave_id?: number | null;
}

export interface Conflict {
    user_thumb_image: string;
    user_name: string;
    formatted_date: string;
    items: ConflictItem[];
}

export type ConflictType = 'cut-delete' | 'split-delete' | 'delete-only';

export const parseDT = (() => {
    const cache = new Map<string, DateTime>();
    return (s: string): DateTime => {
        if (cache.has(s)) {
            return cache.get(s)!;
        }
        const iso = DateTime.fromISO(s);
        if (iso.isValid) {
            cache.set(s, iso);
            return iso;
        }
        const hm = DateTime.fromFormat(s, 'HH:mm');
        const result = hm.isValid ? hm : DateTime.invalid('Invalid time');
        cache.set(s, result);
        return result;
    };
})();

export const formatHM = (dt: DateTime): string => dt.isValid ? dt.toFormat('HH:mm') : '';

export const calcDiffHM = (start: DateTime, end: DateTime): string => {
    if (!start.isValid || !end.isValid) return '';
    const diff = end.diff(start, ['minutes']);
    const mins = Math.max(0, Math.round(diff.as('minutes')));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const getConflictType = (items: ConflictItem[]): ConflictType => {
    if (items.some(item => item.is_leave)) {
        return 'delete-only';
    }

    if (items.length !== 2) return 'delete-only';

    const [item1, item2] = items;

    const times = {
        start1: parseDT(item1.start),
        end1: parseDT(item1.end),
        start2: parseDT(item2.start),
        end2: parseDT(item2.end),
    };

    if (!Object.values(times).every(dt => dt.isValid)) {
        return 'delete-only';
    }

    const { start1, end1, start2, end2 } = times;

    if (start1.equals(start2) && end1.equals(end2)) {
        return 'delete-only';
    }

    if (start1.equals(start2) || end1.equals(end2)) {
        return 'cut-delete';
    }

    const item1ContainsItem2 = start1 <= start2 && end1 >= end2;
    const item2ContainsItem1 = start2 <= start1 && end2 >= end1;

    return (item1ContainsItem2 || item2ContainsItem1) ? 'split-delete' : 'delete-only';
};

interface ConflictsProps {
    conflictDetails: Conflict[];
    totalConflicts: number;
    onClose: () => void;
    startDate: string;
    endDate: string;
}

const ConflictCaseRenderer = React.memo(({conflict, index, startDate, endDate, onClose}: {
    conflict: Conflict;
    index: number;
    startDate: string;
    endDate: string;
    onClose: () => void;
}) => {
    const conflictType = getConflictType(conflict.items);
    const commonProps = { conflict, index, onClose, startDate, endDate };

    switch (conflictType) {
        case 'cut-delete':
            return <CutDeleteCase {...commonProps} />;
        case 'split-delete':
            return <SplitDeleteCase {...commonProps} />;
        case 'delete-only':
        default:
            return <DeleteOnlyCase {...commonProps} />;
    }
});

ConflictCaseRenderer.displayName = 'ConflictCaseRenderer';

const ConflictItemDisplay = React.memo(({ items }: { items: ConflictItem[] }) => (
    <Box sx={{ mb: 2 }}>
        {items.map((item, i) => {
            const displayName =
                item.is_leave && item.leave_name
                    ? item.leave_name
                    : item.shift_name;

            const backgroundColor =
                item.is_leave ? '#FFE5E5' : (item.color || '#D8E3F2');

            return (
                <Box key={i} sx={{ position: 'relative', mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {item.start}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {item.end}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            borderRadius: 1,
                            bgcolor: backgroundColor,
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            textTransform: 'capitalize',
                            py: 1,
                            border: item.is_leave ? '1px solid #FFB3B3' : 'none',
                        }}
                    >
                        {displayName}
                    </Box>
                </Box>
            );
        })}
    </Box>
));

ConflictItemDisplay.displayName = 'ConflictItemDisplay';

const EmptyState = React.memo(() => (
    <Box sx={{ p: 3, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <IconInfoCircle size={16} color="#666" style={{ marginRight: '8px' }} />
            <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#666' }}>
                Learn about conflicts
            </Typography>
        </Box>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.4 }}>
            Conflicts occur when shifts overlap in time. Use the tools above to resolve them.
        </Typography>
    </Box>
));

EmptyState.displayName = 'EmptyState';

export default function Conflicts({conflictDetails, totalConflicts, onClose, startDate, endDate}: ConflictsProps) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#fff', borderLeft: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                <IconButton onClick={onClose} sx={{ mr: 1, p: 0.5 }}>
                    <IconX size={18} />
                </IconButton>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Conflicts ({totalConflicts})
                </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
                    {conflictDetails.map((conflict, idx) => {
                        const userName = conflict.user_name ?? '';
                        const userThumbImage = conflict.user_thumb_image ?? '';

                        return (
                            <Card
                                key={`conflict-${idx}`}
                                sx={{
                                    mb: 2,
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    border: '1px solid #e0e0e0',
                                    '&:hover': {
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                    }
                                }}
                                variant="outlined"
                            >
                                <CardContent>
                                    <Box sx={{ mb: 2 }}>
                                        {userName && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <Avatar
                                                    src={userThumbImage || ''}
                                                    alt={userName}
                                                    sx={{ width: 36, height: 36 }}
                                                />

                                                <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                    {userName}
                                                </Typography>
                                            </Box>
                                        )}

                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {conflict.formatted_date}
                                        </Typography>
                                    </Box>

                                    <ConflictItemDisplay items={conflict.items} />

                                    <ConflictCaseRenderer
                                        conflict={conflict}
                                        index={idx}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onClose={onClose}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            {conflictDetails.length === 0 && <EmptyState />}
        </Box>
    );
}
