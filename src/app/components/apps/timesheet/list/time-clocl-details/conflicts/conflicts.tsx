'use client';

import {
    Box,
    Typography,
    Card,
    CardContent,
    IconButton,
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
    date: string;
    start: string;
    end: string;
    shift_name: string;
    shift_id: string;
    color?: string;
    worklog_id?: number;
    project?: string;
}

export interface Conflict {
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
    fetchTimeClockData: () => Promise<void>;
    startDate: string;
    endDate: string;
}

const ConflictCaseRenderer = React.memo(({
                                             conflict,
                                             index,
                                             fetchTimeClockData,
                                             startDate,
                                             endDate
                                         }: {
    conflict: Conflict;
    index: number;
    fetchTimeClockData: () => Promise<void>;
    startDate: string;
    endDate: string;
}) => {
    const conflictType = getConflictType(conflict.items);
    const commonProps = { conflict, index, fetchTimeClockData, startDate, endDate };
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
        {items.map((item, i) => (
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
                        bgcolor: item.color || '#f0f0f0',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                        py: 1,
                    }}
                >
                    {item.shift_name}
                </Box>
            </Box>
        ))}
    </Box>
));

ConflictItemDisplay.displayName = 'ConflictItemDisplay';

const EmptyState = React.memo(() => (
    <Box sx={{
        p: 3,
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#fafafa'
    }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <IconInfoCircle size={16} color="#666" style={{ marginRight: '8px' }} />
            <Typography variant="body2" sx={{
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#666'
            }}>
                Learn about conflicts
            </Typography>
        </Box>
        <Typography variant="body2" sx={{
            fontSize: '0.8rem',
            color: '#666',
            lineHeight: 1.4
        }}>
            Conflicts occur when shifts overlap in time. Use the tools above to resolve them.
        </Typography>
    </Box>
));

EmptyState.displayName = 'EmptyState';

export default function Conflicts({
                                      conflictDetails,
                                      totalConflicts,
                                      onClose,
                                      fetchTimeClockData,
                                      startDate,
                                      endDate
                                  }: ConflictsProps) {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#fff',
            borderLeft: '1px solid #e0e0e0'
        }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                }}
            >
                <IconButton
                    sx={{
                        mr: 1,
                        p: 0.5,
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                    }}
                    onClick={onClose}
                >
                    <IconX size={18} />
                </IconButton>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Conflicts ({totalConflicts})
                </Typography>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
                    {conflictDetails.map((conflict, idx) => (
                        <Card
                            key={`conflict-${idx}-${conflict.formatted_date}`}
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
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2
                                }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                        {conflict.formatted_date}
                                    </Typography>
                                </Box>
                                <ConflictItemDisplay items={conflict.items} />
                                <ConflictCaseRenderer
                                    conflict={conflict}
                                    index={idx}
                                    fetchTimeClockData={fetchTimeClockData}
                                    startDate={startDate}
                                    endDate={endDate}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            </Box>
            {conflictDetails.length === 0 && <EmptyState />}
        </Box>
    );
}
