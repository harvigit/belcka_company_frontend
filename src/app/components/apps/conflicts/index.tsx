'use client';

import {
    Box,
    CircularProgress,
    InputAdornment,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    IconButton,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    IconBuildingStore,
    IconClock,
    IconCreditCard,
    IconSearch,
    IconShieldExclamation,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

// Sub-components
import TimesheetConflicts from './sections/timesheet-conflicts';
import BillingConflicts from './sections/billing-conflicts';
import TeamConflicts from './sections/team-conflicts';
import StoreConflicts from './sections/store-conflicts';
import HealthSafetyConflicts from './sections/health-safety-conflicts';

// Types
import type { TimesheetConflict } from './sections/timesheet-conflicts';
import type { BillingConflict } from './sections/billing-conflicts';
import type { TeamConflict } from './sections/team-conflicts';
import type { StoreConflict } from './sections/store-conflicts';
import type { HealthSafetyConflict } from './sections/health-safety-conflicts';

export interface ConflictsApiResponse {
    total_conflicts: number;
    timesheet_conflicts: { count: number; data: TimesheetConflict[] };
    billing_conflicts: { count: number; data: BillingConflict[] };
    team_conflicts: { count: number; data: TeamConflict[] };
    health_safety_conflicts: { count: number; data: HealthSafetyConflict[] };
    store_conflicts: {
        qty_conflicts: { count: number; data: StoreConflict[] };
        amount_conflicts: { count: number; data: StoreConflict[] };
    };
}

const TabLabel = React.memo(({ label, count, color }: { label: string; count: number; color: string }) => (
    <Stack direction="row" alignItems="center" spacing={0.75}>
        <span>{label}</span>
        {count > 0 && (
            <Box sx={{
                minWidth: 18, height: 18, borderRadius: '9px', bgcolor: color,
                color: '#fff', fontSize: '0.62rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.75,
            }}>
                {count}
            </Box>
        )}
    </Stack>
));
TabLabel.displayName = 'TabLabel';

const SectionShell = React.memo(({ icon, title, count, accent, children }: {
    icon: React.ReactNode; title: string; count: number; accent: string; children: React.ReactNode;
}) => (
    <Box sx={{ mb: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}
               sx={{ px: 2, py: 1.25, bgcolor: '#FAFAFA', borderBottom: '1px solid #F0F0F4' }}>
            <Box sx={{
                width: 30, height: 30, borderRadius: '8px', bgcolor: `${accent}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {icon}
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', flex: 1 }}>{title}</Typography>
            <Box sx={{
                minWidth: 24, height: 22, borderRadius: '11px', bgcolor: accent,
                color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1,
            }}>
                {count}
            </Box>
        </Stack>
        {count === 0
            ? (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }}>No conflicts in this category</Typography>
                </Box>
            )
            : children
        }
    </Box>
));
SectionShell.displayName = 'SectionShell';

export interface ConflictsProps {
    onClose?: () => void;
}

export default function Conflicts({ onClose }: ConflictsProps) {
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    const [isFetching, setIsFetching] = useState(false);
    const [data, setData] = useState<ConflictsApiResponse | null>(null);
    const [startDate, setStartDate] = useState<Date>(defaultStart);
    const [endDate, setEndDate] = useState<Date>(defaultEnd);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const fetchConflicts = useCallback(async (from?: Date, to?: Date) => {
        setIsFetching(true);
        try {
            const s = from ?? startDate;
            const e = to ?? endDate;
            const res = await api.get('/company/conflicts', {
                params: { start_date: format(s, 'dd/MM/yyyy'), end_date: format(e, 'dd/MM/yyyy') },
            });
            if (res.data.IsSuccess) setData(res.data.info);
        } catch (err) {
            console.error('Failed to fetch conflicts', err);
        } finally {
            setIsFetching(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchConflicts(); }, []);

    const handleDateRangeChange = useCallback((range: { from: Date | null; to: Date | null }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            fetchConflicts(range.from, range.to);
        }
    }, [fetchConflicts]);

    const handleResolved = useCallback(async () => {
        await fetchConflicts();
    }, [fetchConflicts]);

    const counts = useMemo(() => ({
        timesheet: data?.timesheet_conflicts.count ?? 0,
        billing: data?.billing_conflicts.count ?? 0,
        team: data?.team_conflicts.count ?? 0,
        health: data?.health_safety_conflicts.count ?? 0,
        store: (data?.store_conflicts.qty_conflicts.count ?? 0) + (data?.store_conflicts.amount_conflicts.count ?? 0),
        total: data?.total_conflicts ?? 0,
    }), [data]);

    const tabs = useMemo(() => [
        { label: 'All', count: counts.total, color: '#6366F1' },
        { label: 'Timesheet', count: counts.timesheet, color: '#F59E0B' },
        { label: 'Billing', count: counts.billing, color: '#6366F1' },
        { label: 'Team', count: counts.team, color: '#8B5CF6' },
        { label: 'H&S', count: counts.health, color: '#EF4444' },
        { label: 'Store', count: counts.store, color: '#0891B2' },
    ], [counts]);

    const allStoreConflicts = useMemo(() => [
        ...(data?.store_conflicts.qty_conflicts.data ?? []),
        ...(data?.store_conflicts.amount_conflicts.data ?? []),
    ], [data]);

    const showSection = (idx: number) => activeTab === 0 || activeTab === idx;

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>

            {/* Toolbar */}
            <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid #E5E7EB' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                    <DateRangePickerBox from={startDate} to={endDate} onChange={handleDateRangeChange} />
                    <TextField
                        placeholder="Search…" size="small" value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ width: 180 }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end"><IconSearch size={15} /></InputAdornment>,
                        }}
                    />
                    <Box sx={{ flex: 1 }} />
                    {onClose && (
                        <Tooltip title="Close">
                            <IconButton size="small" onClick={onClose}
                                        sx={{ bgcolor: '#F3F4F6', borderRadius: '8px', '&:hover': { bgcolor: '#E5E7EB' } }}>
                                <IconX size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: '1px solid #E5E7EB', px: 1 }}>
                <Tabs
                    value={activeTab} onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable" scrollButtons="auto"
                    sx={{
                        minHeight: 40,
                        '& .MuiTab-root': {
                            minHeight: 40, py: 0, textTransform: 'none',
                            fontSize: '0.8rem', fontWeight: 600, color: '#6B7280',
                            '&.Mui-selected': { color: '#111827' },
                        },
                        '& .MuiTabs-indicator': { bgcolor: '#6366F1', height: 2 },
                    }}
                >
                    {tabs.map((t, i) => (
                        <Tab key={i} label={<TabLabel label={t.label} count={t.count} color={t.color} />} />
                    ))}
                </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {isFetching ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 8 }}>
                        <CircularProgress size={22} thickness={4} sx={{ color: '#6366F1' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Loading conflicts…</Typography>
                    </Box>
                ) : !data ? null : (
                    <>
                        {showSection(1) && (
                            <SectionShell
                                icon={<IconClock size={16} color="#F59E0B" />}
                                title="Timesheet Conflicts"
                                count={counts.timesheet}
                                accent="#F59E0B"
                            >
                                <TimesheetConflicts
                                    data={data.timesheet_conflicts.data}
                                    startDate={startStr}
                                    endDate={endStr}
                                    searchTerm={searchTerm}
                                    onResolved={handleResolved}
                                />
                            </SectionShell>
                        )}

                        {showSection(2) && (
                            <SectionShell
                                icon={<IconCreditCard size={16} color="#6366F1" />}
                                title="Billing Conflicts"
                                count={counts.billing}
                                accent="#6366F1"
                            >
                                <BillingConflicts
                                    data={data.billing_conflicts.data}
                                    searchTerm={searchTerm}
                                    onResolved={handleResolved}
                                />
                            </SectionShell>
                        )}

                        {showSection(3) && (
                            <SectionShell
                                icon={<IconUsers size={16} color="#8B5CF6" />}
                                title="Team Conflicts"
                                count={counts.team}
                                accent="#8B5CF6"
                            >
                                <TeamConflicts
                                    data={data.team_conflicts.data}
                                    onResolved={handleResolved}
                                />
                            </SectionShell>
                        )}

                        {showSection(4) && (
                            <SectionShell
                                icon={<IconShieldExclamation size={16} color="#EF4444" />}
                                title="Health & Safety Conflicts"
                                count={counts.health}
                                accent="#EF4444"
                            >
                                <HealthSafetyConflicts
                                    data={data.health_safety_conflicts.data}
                                    searchTerm={searchTerm}
                                />
                            </SectionShell>
                        )}

                        {showSection(5) && (
                            <SectionShell
                                icon={<IconBuildingStore size={16} color="#0891B2" />}
                                title="Store Conflicts"
                                count={counts.store}
                                accent="#0891B2"
                            >
                                <StoreConflicts
                                    data={allStoreConflicts}
                                    onResolved={handleResolved}
                                />
                            </SectionShell>
                        )}

                        {counts.total === 0 && (
                            <Box sx={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', py: 10, gap: 1.5,
                            }}>
                                <Box sx={{
                                    width: 52, height: 52, borderRadius: '14px', bgcolor: '#F0FDF4',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <IconShieldExclamation size={24} color="#10B981" />
                                </Box>
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                                    No conflicts found
                                </Typography>
                                <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                                    Everything looks clean across all categories.
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}
