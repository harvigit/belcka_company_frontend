'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Avatar, Badge,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    Popover,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconCalendar,
    IconCalendarOff,
    IconChevronLeft,
    IconChevronRight,
    IconDoorExit,
    IconEye,
    IconPlus,
    IconSearch,
    IconSettings,
    IconX,
} from '@tabler/icons-react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isValid,
    parse,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';

import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import api from '@/utils/axios';
import LeaveList from '@/app/components/apps/leaves/settings/leaves/list';
import HolidayList from '@/app/components/apps/leaves/settings/holidays/list';
import AddLeave from '@/app/components/apps/time-clock/time-clock-details/leaves/add-leave';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import GeneralSetting from '@/app/components/apps/leaves/settings/general';
import Link from 'next/link';
import { getUserDetailsHref } from '@/utils/userDetailsRoute';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Image from 'next/image';

const LEAVE_STORAGE_KEY = 'leave-module-range';

type LeaveOverviewRow = {
    user_id: number;
    user_name: string;
    trade_name?: string | null;
    role_name?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
    is_working: boolean;
    is_on_break: boolean;
    current_break?: { break_start_time: string; break_end_time: string } | null;
    user_status_color: string;
    paid?: number;
    unpaid?: number;
    holiday?: number;
    total_absence_days?: number;
    [key: string]: any;
};

const columnHelper = createColumnHelper<LeaveOverviewRow>();

const LEAVE_TYPE_COLOR: Record<string, string> = {
    paid: '#4CBC6D',
    unpaid: '#2196F3',
};

const LEAVE_STATUS_COLOR: Record<string, string> = {
    pending: '#FFCC80',
};

const SUMMARY_COLUMNS = [
    { key: 'paid', label: 'Paid', leaveType: 'paid' },
    { key: 'unpaid', label: 'Unpaid', leaveType: 'unpaid' },
    { key: 'holiday', label: 'Holiday', aliases: ['holiday', 'public holiday'] },
] as const;

const parseLeaveDate = (value?: string | null) => {
    if (!value) return null;

    const parsers = [
        () => parseISO(value),
        () => parse(value, 'dd/MM/yyyy', new Date()),
        () => parse(value, 'dd/MMM/yyyy', new Date()),
        () => parse(value, 'dd MMM yyyy', new Date()),
        () => parse(value, 'yyyy-MM-dd', new Date()),
    ];

    for (const parser of parsers) {
        const date = parser();
        if (isValid(date)) return date;
    }

    const fallbackDate = new Date(value);
    return isValid(fallbackDate) ? fallbackDate : null;
};

const toApiDate = (date: Date) => format(date, 'dd/MM/yyyy');

const getLeaveType = (leave: any) =>
    String(
        leave?.leave_type ??
        leave?.type ??
        leave?.paid_type ??
        leave?.companyLeave?.type ??
        leave?.company_leave?.type ??
        '',
    ).toLowerCase();

const getLeaveStatusText = (leave: any) =>
    String(leave?.status_text ?? leave?.request_status_text ?? '').toLowerCase();

const isPendingLeave = (leave: any) => {
    const statusText = getLeaveStatusText(leave);

    return (
        Number(leave?.status) === 3 ||
        Number(leave?.request_status) === 3 ||
        statusText === 'pending' ||
        statusText.includes('pending')
    );
};

const isApprovedLeave = (leave: any) => {
    const statusText = getLeaveStatusText(leave);

    return Number(leave?.status) === 5 || statusText === 'approved';
};

const isCalendarLeave = (leave: any) => isApprovedLeave(leave) || isPendingLeave(leave);

const isAllDayLeave = (leave: any) => {
    const value = leave?.is_allday_leave;

    return !(value === false || value === 0 || value === '0' || value === 'false');
};

const getLeaveColor = (leave: any) => {
    if (isPendingLeave(leave)) return LEAVE_STATUS_COLOR.pending;

    return LEAVE_TYPE_COLOR[getLeaveType(leave)] || leave?.color || '#4CBC6D';
};

const getStatusColor = (leave: any) => {
    const statusText = getLeaveStatusText(leave);

    if (Number(leave?.status) === 5 || statusText === 'approved') return '#008000';
    if (Number(leave?.status) === 12 || statusText === 'rejected') return '#ff1744';
    return leave?.color || '#f59e0b';
};

const getLeaveDurationText = (leave: any) =>
    String(leave?.duration ?? '').trim().replace(/^\((.*)\)$/, '$1');

const getCalendarLeaveLabel = (leave: any) => {
    const label = leave.user_name || leave.leave_name || 'Leave';
    const duration = getLeaveDurationText(leave);

    return !isAllDayLeave(leave) && duration ? `${label} ${duration}` : label;
};

const getMonthDays = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const days: Date[] = [];

    for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
        days.push(date);
    }

    return days;
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(LEAVE_STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        return {
            startDate: parsed.startDate ? new Date(parsed.startDate) : null,
            endDate: parsed.endDate ? new Date(parsed.endDate) : null,
            columnVisibility: parsed.columnVisibility || {},
        };
    } catch (error) {
        console.error('Error loading leave range:', error);
        return null;
    }
};

const saveDateRangeToStorage = (
    startDate: Date | null,
    endDate: Date | null,
    columnVisibility?: VisibilityState,
) => {
    try {
        localStorage.setItem(
            LEAVE_STORAGE_KEY,
            JSON.stringify({
                startDate: startDate ? startDate.toISOString() : null,
                endDate: endDate ? endDate.toISOString() : null,
                columnVisibility: columnVisibility ?? loadDateRangeFromStorage()?.columnVisibility ?? {},
            }),
        );
    } catch (error) {
        console.error('Error saving leave range:', error);
    }
};

const formatCount = (value: any) => {
    const numberValue = Number(value ?? 0);
    if (!numberValue) return '0';
    return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
};

const normalizeLabel = (value?: string | null) =>
    String(value || '').trim().toLowerCase();

const getLeaveUnitCount = (leave: any) => {
    const rawValue =
        leave.total_leave_days_raw ??
        leave.total_days_raw ??
        leave.total_day_raw ??
        leave.total_leave_days ??
        leave.total_days ??
        leave.total_day ??
        leave.days ??
        leave.day_count ??
        leave.count;

    const numericValue = Number(rawValue);
    if (!Number.isNaN(numericValue) && numericValue > 0) return numericValue;

    const start = parseLeaveDate(leave.start_date || leave.leave_date);
    const end = parseLeaveDate(leave.end_date || leave.start_date || leave.leave_date);
    if (start && end) {
        const diff = Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1;
        return diff > 0 ? diff : 1;
    }

    return 1;
};

function LeaveSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [activeMenuItem, setActiveMenuItem] = useState<'General' | 'Leaves' | 'Holidays'>('General');

    const menuItems = [
        { icon: <IconSettings size={18} />, label: 'General' },
        { icon: <IconDoorExit size={18} />, label: 'Leaves' },
        { icon: <IconCalendarOff size={18} />, label: 'Holidays' },
    ] as const;

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{
                    borderBottom: '1px solid #e0e0e0',
                    p: 2,
                    gap: 1,
                    color: '#7D92A9',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    bgcolor: '#fff',
                }}
            >
                <IconSettings size={24} />
                <Typography>Leave Settings</Typography>
                <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 16 }}>
                    <IconX size={18} />
                </IconButton>
            </Box>

            <Box display="flex" flex="1" sx={{ overflow: 'hidden' }}>
                <Box sx={{ width: 240, borderRight: '1px solid #e0e0e0', p: 1, overflowY: 'auto', bgcolor: '#fff' }}>
                    {menuItems.map((item) => (
                        <Box
                            key={item.label}
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                cursor: 'pointer',
                                bgcolor: activeMenuItem === item.label ? '#eaf5ff' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                '&:hover': { bgcolor: '#f6f7f7' },
                                fontSize: 14,
                                color: activeMenuItem === item.label ? '#203040' : '#7D92A9',
                            }}
                            onClick={() => setActiveMenuItem(item.label)}
                        >
                            {item.icon}
                            {item.label}
                        </Box>
                    ))}
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeMenuItem === 'Leaves' && <LeaveList />}
                    {activeMenuItem === 'Holidays' && <HolidayList />}
                    {activeMenuItem === 'General' && <GeneralSetting />}
                </Box>
            </Box>
        </Drawer>
    );
}

function LeaveActivityDrawer({
    open,
    onClose,
    startDate,
    endDate
}: {
    open: boolean;
    onClose: () => void;
    startDate: Date | null;
    endDate: Date | null;
}) {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!open || !startDate || !endDate) return;

        const fetchActivity = async () => {
            setLoading(true);
            try {
                const res = await api.post('user-leaves/activity', {
                    start_date: toApiDate(startDate),
                    end_date: toApiDate(endDate),
                });

                setHistory(res.data?.data || []);
            } catch (err) {
                console.error('Failed to fetch leave activity', err);
                setHistory([]);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [endDate, open, startDate]);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 2 } }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                    <Typography variant="h6" fontWeight={800}>Activity</Typography>
                </Box>
                <IconButton onClick={onClose}><IconX /></IconButton>
            </Stack>

            {loading ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress size={28} /></Box>
            ) : history.length ? (
                <Stack spacing={1.25} sx={{ pb: 2 }}>
                    {history.map((item, index) => (
                        <Box key={`${item.id || index}`} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 1.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1.25} mb={1}>
                                <Avatar
                                    src={item.requested_user_thumb_image || item.requested_user_image || '/images/users/user.png'}
                                    alt={item.requested_user_name || 'User'}
                                    sx={{ width: 34, height: 34 }}
                                />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography
                                        fontWeight={800}
                                        noWrap
                                    >
                                        {item.requested_user_name || 'User'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                                        {[item.requested_user_trade_name, item.action_at].filter(Boolean).join(' · ')}
                                    </Typography>
                                </Box>
                                <Chip
                                    size="small"
                                    label={`${item.action || 'updated'}`}
                                    color={item.action === 'approved'
                                        ? 'success'
                                        : ['rejected', 'cancelled', 'deleted'].includes(item.action)
                                            ? 'error'
                                            : item.action === 'requested'
                                                ? 'primary'
                                                : 'default'}
                                    variant="outlined"
                                    sx={{ textTransform: 'capitalize', fontWeight: 700 }}
                                />
                            </Stack>
                            <Typography fontSize={13}>{item.message || 'Leave activity'}</Typography>
                            {item.action_by && item.action_by !== item.requested_user_name && (
                                <Typography color="text.secondary" fontSize={12} mt={0.5}>
                                    Action by: {item.action_by}
                                </Typography>
                            )}
                            {item.request_note && (
                                <Typography color="text.secondary" fontSize={12} mt={0.5}>
                                    Request note: {item.request_note}
                                </Typography>
                            )}
                            {item.action_note && item.action_note !== item.request_note && (
                                <Typography color="text.secondary" fontSize={12} mt={0.5}>
                                    {item.action === 'approved' ? 'Approval note'
                                        : item.action === 'rejected' ? 'Rejection note'
                                            : item.action === 'cancelled' ? 'Cancellation note'
                                                : item.action === 'deleted' ? 'Deletion note'
                                                    : 'Action note'}: {item.action_note}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 2, p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">No leave or holiday activity found.</Typography>
                </Box>
            )}
        </Drawer>
    );
}

function LeaveDetailsDrawer({
    open,
    onClose,
    title,
    leaves,
    loading = false,
    onOpenUser,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    leaves: any[];
    loading?: boolean;
    onOpenUser: (leave: any) => void;
}) {
    const sortedLeaves = [...leaves].sort((first, second) => {
        const firstDate = parseLeaveDate(first.start_date ?? first.date ?? first.date_formatted);
        const secondDate = parseLeaveDate(second.start_date ?? second.date ?? second.date_formatted);

        return (secondDate?.getTime() ?? 0) - (firstDate?.getTime() ?? 0);
    });

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 2 } }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800} noWrap>{title}</Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                    >
                        {leaves.length} record{leaves.length === 1 ? '' : 's'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose}><IconX /></IconButton>
            </Stack>

            {loading ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress size={28} /></Box>
            ) : sortedLeaves.length ? (
                <Stack spacing={1.25}>
                    {sortedLeaves.map((leave, index) => (
                        <Box
                            key={`${leave.id || leave.user_leave_id || index}`}
                            onClick={() => !leave.is_holiday && !leave.is_absence && onOpenUser(leave)}
                            sx={{
                                border: '1px solid #e5e7eb',
                                borderRadius: 2,
                                p: 1.5,
                                cursor: leave.is_holiday || leave.is_absence ? 'default' : 'pointer',
                                '&:hover': leave.is_holiday || leave.is_absence ? {} : { bgcolor: '#f8fafc' },
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1}>
                                {leave.is_holiday ? (
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography fontWeight={800} noWrap>{leave.title || 'Holiday'}</Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                                            Added by: {leave.added_by_name || '-'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <Avatar
                                            src={leave.user_thumb_image || leave.user_image || '/images/users/user.png'}
                                            alt={leave.user_name || 'User'} sx={{ width: 36, height: 36 }} />
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography fontWeight={800} noWrap>{leave.user_name || 'User'}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                                                {leave.is_absence ? leave.shift_name || 'Scheduled shift' : leave.leave_name || 'Leave'}
                                            </Typography>
                                        </Box>
                                    </>
                                )}
                                {leave.is_holiday ? (
                                    <Chip size="small" label="Holiday" color="primary" variant="outlined" />
                                ) : leave.is_absence ? (
                                    <Chip size="small" label="Absent" color="error" variant="outlined" />
                                ) : leave.status_text && (
                                    <Chip
                                        size="small"
                                        label={leave.status_text}
                                        variant="outlined"
                                        sx={{
                                            borderColor: getStatusColor(leave),
                                            color: getStatusColor(leave),
                                            textTransform: 'capitalize',
                                            fontWeight: 700
                                        }}
                                    />
                                )}
                            </Stack>

                            <Typography color="text.secondary" fontSize={13} mt={1}>
                                {leave.is_holiday ? 'Start date' : 'Date'}: {leave.start_date || leave.leave_date}
                                {!leave.is_holiday && leave.end_date && leave.end_date !== leave.start_date ? ` - ${leave.end_date}` : ''}
                            </Typography>
                            {leave.is_holiday && (
                                <>
                                    <Typography color="text.secondary" fontSize={13}>
                                        End date: {leave.end_date || leave.start_date || '-'}
                                    </Typography>
                                    <Typography color="text.secondary" fontSize={13}>
                                        Total days: {leave.total_day || 0}
                                    </Typography>
                                </>
                            )}
                            {(leave.is_absence || !isAllDayLeave(leave)) && (leave.start_time || leave.end_time) && (
                                <Typography color="text.secondary" fontSize={13}>
                                    {leave.is_absence ? 'Shift time' : 'Time'}: {leave.start_time || '-'} - {leave.end_time || '-'}
                                </Typography>
                            )}
                            {!leave.is_absence && !leave.is_holiday && (
                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eef2f7' }}>
                                    <Typography color="text.secondary" fontSize={12}>
                                        Requested: {leave.requested_at || '-'}
                                        {leave.requested_by_name ? ` by ${leave.requested_by_name}` : ''}
                                    </Typography>
                                    {leave.request_note && (
                                        <Typography color="text.secondary" fontSize={12}>
                                            Request note: {leave.request_note}
                                        </Typography>
                                    )}
                                    {leave.approved_at && (
                                        <Typography color="text.secondary" fontSize={12} mt={0.5}>
                                            Approved: {leave.approved_at}
                                            {leave.approved_by_name ? ` by ${leave.approved_by_name}` : ''}
                                        </Typography>
                                    )}
                                    {leave.approval_note && (
                                        <Typography color="text.secondary" fontSize={12}>
                                            Approval note: {leave.approval_note}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 2, p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">No leave records found.</Typography>
                </Box>
            )}
        </Drawer>
    );
}

const Leaves = () => {
    const router = useRouter();
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null } & { user_role_id: number; };
    const today = new Date();
    const storedRange = typeof window !== 'undefined' ? loadDateRangeFromStorage() : null;
    const defaultStart = startOfMonth(today);
    const defaultEnd = endOfMonth(today);

    const [data, setData] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [summaryRows, setSummaryRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(storedRange?.startDate || defaultStart);
    const [endDate, setEndDate] = useState<Date | null>(storedRange?.endDate || defaultEnd);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(today));
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(today);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);
    const [addLeaveOpen, setAddLeaveOpen] = useState(false);
    const [columnPopover, setColumnPopover] = useState<HTMLElement | null>(null);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        storedRange?.columnVisibility || {},
    );
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [detailDrawer, setDetailDrawer] = useState<{ title: string; leaves: any[]; loading?: boolean } | null>(null);

    const fetchLeaves = async (start: Date, end: Date) => {
        setLoading(true);
        try {
            const payload = {
                start_date: toApiDate(start),
                end_date: toApiDate(end),
            };
            const [leavesResponse, overviewResponse] = await Promise.all([
                api.get('user-leaves/get-list', { params: payload }),
                api.get('user-leaves/overview', { params: payload }),
            ]);

            setData(leavesResponse.data?.data || []);
            setLeaveTypes(leavesResponse.data?.leave_types || []);
            setSummaryRows(overviewResponse.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch leaves', err);
            setData([]);
            setLeaveTypes([]);
            setSummaryRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) fetchLeaves(startDate, endDate);
    }, [startDate, endDate]);

    useEffect(() => {
        saveDateRangeToStorage(startDate, endDate, columnVisibility);
    }, [startDate, endDate, columnVisibility]);

    useEffect(() => {
        setSelectedRowIds(new Set());
    }, [summaryRows, startDate, endDate, searchTerm]);

    const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
        if (!range.from || !range.to) return;

        setStartDate(range.from);
        setEndDate(range.to);
        saveDateRangeToStorage(range.from, range.to, columnVisibility);
    };

    const leavesForDate = (date: Date) =>
        data.filter((leave) => {
            if (!isCalendarLeave(leave)) return false;

            const normalizedDate = startOfDay(date);
            const leaveStart = parseLeaveDate(leave.start_date || leave.leave_date);
            const leaveEnd = parseLeaveDate(leave.end_date || leave.start_date || leave.leave_date);

            if (!leaveStart) return false;

            return normalizedDate >= startOfDay(leaveStart) && normalizedDate <= startOfDay(leaveEnd || leaveStart);
        });

    const matchesSummaryColumn = useCallback(
        (leave: any, column: (typeof SUMMARY_COLUMNS)[number]) => {
            const leaveName = normalizeLabel(leave.leave_name || leave.name);
            const isHoliday = ['holiday', 'public holiday'].includes(leaveName);

            if (column.key === 'holiday') return isHoliday;

            // Holidays have their own column, so keep these categories mutually exclusive.
            if (isHoliday) return false;

            if (getLeaveType(leave) === column.leaveType) return true;

            const leaveId = Number(leave.leave_id ?? leave.id);
            if (!leaveId) return false;

            return leaveTypes.some(
                (leaveType) =>
                    Number(leaveType.id) === leaveId &&
                    getLeaveType(leaveType) === column.leaveType,
            );
        },
        [leaveTypes],
    );

    const getLeaveColumnKey = useCallback((leave: any) => {
        return SUMMARY_COLUMNS.find((column) => matchesSummaryColumn(leave, column))?.key;
    }, [matchesSummaryColumn]);

    const fallbackSummaryRows = useMemo(() => {
        const rows = new Map<number, any>();

        data.forEach((leave) => {
            const userId = Number(leave.user_id);
            if (!userId) return;

            const existing = rows.get(userId) || {
                user_id: userId,
                user_name: leave.user_name || leave.name || 'User',
                role_name: leave.role_name || leave.user_role_name || leave.designation || '',
                user_image: leave.user_image,
                user_thumb_image: leave.user_thumb_image,
                leave_counts: {},
                total_absence_days: 0,
            };
            const count = getLeaveUnitCount(leave);
            const columnKey = getLeaveColumnKey(leave);

            if (columnKey) {
                existing[columnKey] = Number(existing[columnKey] || 0) + count;
            }

            if (leave.leave_id) {
                existing.leave_counts[String(leave.leave_id)] =
                    Number(existing.leave_counts[String(leave.leave_id)] || 0) + count;
            }

            existing.total_absence_days = Number(existing.total_absence_days || 0) + count;
            rows.set(userId, existing);
        });

        return Array.from(rows.values());
    }, [data, getLeaveColumnKey]);

    const tableRows = summaryRows.length ? summaryRows : fallbackSummaryRows;

    const filteredSummaryRows = useMemo(() => {
        const search = searchTerm.toLowerCase();
        if (!search) return tableRows;

        return tableRows.filter((item) =>
            [item.user_name, item.trade_name, item.role_name]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(search)),
        );
    }, [tableRows, searchTerm]);

    const openUserLeaveDetails = (userId: number, leave?: any) => {
        if (startDate && endDate) saveDateRangeToStorage(startDate, endDate, columnVisibility);

        const leaveDate = parseLeaveDate(leave?.start_date ?? leave?.date ?? leave?.date_formatted);
        router.push(getUserDetailsHref(userId, {
            tab: 'leave',
            leave_start: leaveDate ? format(startOfWeek(leaveDate), 'yyyy-MM-dd') : undefined,
            leave_end: leaveDate ? format(endOfWeek(leaveDate), 'yyyy-MM-dd') : undefined,
        }));
    };

    const getSummaryColumnCount = (row: any, column: (typeof SUMMARY_COLUMNS)[number]) => {
        const directValue = row[column.key];
        if (directValue !== undefined && directValue !== null) return Number(directValue);

        const matchingLeaveTypes = leaveTypes.filter((leaveType) =>
            matchesSummaryColumn(leaveType, column),
        );
        const matchingLeaveCount = matchingLeaveTypes.length
            ? matchingLeaveTypes.reduce(
                (total, leaveType) => total + Number(row.leave_counts?.[String(leaveType.id)] ?? 0),
                0,
            )
            : undefined;

        const fallbackValue =
            row[column.key] ??
            row[`${column.key}_days`] ??
            row[`${column.key}_count`] ??
            row[`total_${column.key}`] ??
            row[`total_${column.key}_days`];

        return Number(matchingLeaveCount ?? fallbackValue ?? 0);
    };

    const getRowLeaves = (userId: number, column?: (typeof SUMMARY_COLUMNS)[number]) =>
        data.filter((leave) => {
            const sameUser = Number(leave.user_id) === Number(userId);
            const sameLeave = !column || matchesSummaryColumn(leave, column);
            return sameUser && sameLeave;
        });

    const openLeaveDetails = async (row: any, column?: (typeof SUMMARY_COLUMNS)[number]) => {
        const buildAbsenceLeaves = () =>
            (row.absence_details || []).map((absence: any, index: number) => ({
                ...absence,
                id: `absence-${row.user_id}-${absence.date}-${absence.shift_id || index}`,
                is_absence: true,
                user_id: row.user_id,
                user_name: row.user_name,
                user_image: row.user_image,
                user_thumb_image: row.user_thumb_image,
                start_date: absence.date_formatted || absence.date,
                start_time: absence.shift_start_time,
                end_time: absence.shift_end_time,
            }));

        const rowLeaveDetails = column ? row[`${column.key}_details`] : null;

        let leaves = column?.key === 'holiday'
            ? (row.holiday_details || []).map((holiday: any) => ({
                ...holiday,
                is_holiday: true,
                user_id: row.user_id,
            }))
            : column
                ? Array.isArray(rowLeaveDetails) && rowLeaveDetails.length
                    ? rowLeaveDetails.map((leave: any) => ({
                        ...leave,
                        user_id: row.user_id,
                        user_name: leave.user_name || row.user_name,
                        user_image: leave.user_image || row.user_image,
                        user_thumb_image: leave.user_thumb_image || row.user_thumb_image,
                    }))
                    : getRowLeaves(row.user_id, column)
                : buildAbsenceLeaves();
        const title = column ? `${row.user_name || 'User'} - ${column.label}` : `${row.user_name || 'User'} - Absence`;

        const hasExpectedRecords = column && column.key !== 'holiday' && getSummaryColumnCount(row, column) > 0;
        if (hasExpectedRecords && leaves.length === 0 && startDate && endDate) {
            setDetailDrawer({ title, leaves: [], loading: true });

            try {
                const res = await api.get('user-leaves/get-list', {
                    params: {
                        start_date: toApiDate(startDate),
                        end_date: toApiDate(endDate),
                        user_id: row.user_id,
                    },
                });

                leaves = (res.data?.data || []).filter((leave: any) => matchesSummaryColumn(leave, column));
            } catch (err) {
                console.error('Failed to fetch user leave details', err);
            }
        }

        setDetailDrawer({ title, leaves });
    };

    const columns = [
        columnHelper.display({
            id: 'select',
            size: 56,
            header: () => (
                <Stack direction="row" alignItems="center" ml={0.5}>
                    <CustomCheckbox
                        className="header-checkbox"
                        checked={
                            selectedRowIds.size > 0 &&
                            selectedRowIds.size >= table.getRowModel().rows.length
                        }
                        indeterminate={
                            selectedRowIds.size > 0 &&
                            selectedRowIds.size < table.getRowModel().rows.length
                        }
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                            event.stopPropagation();
                            setSelectedRowIds(
                                event.target.checked
                                    ? new Set(table.getRowModel().rows.map((row) => row.original.user_id))
                                    : new Set(),
                            );
                        }}
                    />
                </Stack>
            ),
            cell: (info) => {
                const userId = info.row.original.user_id;
                const isChecked = selectedRowIds.has(userId);
                const showCheckbox = isChecked || hoveredRow === userId;

                return (
                    <Stack direction="row" alignItems="center">
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => {
                                setSelectedRowIds((current) => {
                                    const next = new Set(current);
                                    isChecked ? next.delete(userId) : next.add(userId);
                                    return next;
                                });
                            }}
                            sx={{
                                opacity: showCheckbox ? 1 : 0,
                                pointerEvents: showCheckbox ? 'auto' : 'none',
                                transition: 'opacity 0.2s ease',
                            }}
                        />
                    </Stack>
                );
            },
            enableSorting: false,
            enableHiding: false,
            meta: { label: 'Select' },
        }),
        columnHelper.accessor('user_name', {
            id: 'user_name',
            header: 'Name',
            meta: { label: 'Name' },
            cell: (info: any) => {
                const row = info.row.original;

                return (
                    <Stack direction="row" alignItems="center" spacing={4}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={4}
                            sx={{ cursor: 'pointer' }}
                        >
                            <Link
                                href={getUserDetailsHref(row?.user_id)}
                                passHref
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    variant="dot"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            backgroundColor:
                                                row?.user_status_color ??
                                                (row?.is_working ? '#22bf22' : '#df2626'),
                                            color:
                                                row?.user_status_color ??
                                                (row?.is_working ? '#22bf22' : '#df2626'),
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            boxShadow: '0 0 0 2px white',
                                            cursor: 'pointer',
                                        },
                                    }}
                                >
                                    <Avatar
                                        src={
                                            row?.user_thumb_image
                                                ? row.user_thumb_image
                                                : '/images/users/user.png'
                                        }
                                        alt={row?.user_name}
                                        sx={{ width: 36, height: 36, cursor: 'pointer' }}
                                    />
                                </Badge>
                            </Link>
                            <Box>
                                <Typography
                                    className="f-14"
                                    color="textPrimary"
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { color: '#173f98' },
                                        width: 150,
                                    }}
                                >
                                    {row.user_name}
                                </Typography>
                                <Tooltip title={row.trade_name ?? '-'} placement="top" arrow>
                                    <Typography sx={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 1, overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word", }} color="textSecondary" variant="subtitle1" width={150} >
                                        {row.trade_name}
                                    </Typography>
                                </Tooltip>
                            </Box>
                        </Stack>
                    </Stack>
                );
            },
        }),
        ...SUMMARY_COLUMNS.map((summaryColumn) =>
            columnHelper.accessor(
                (row) => getSummaryColumnCount(row, summaryColumn),
                {
                    id: summaryColumn.key,
                    size: 160,
                    header: summaryColumn.label,
                    meta: { label: summaryColumn.label },
                    cell: (info) => {
                        const count = Number(info.getValue() ?? 0);
                        return (
                            <Typography
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (count > 0) openLeaveDetails(info.row.original, summaryColumn);
                                }}
                                sx={{
                                    color: count > 0 ? '#0b63ce' : '#64748b',
                                    fontWeight: 800,
                                    cursor: count > 0 ? 'pointer' : 'default',
                                }}
                            >
                                {formatCount(count)}
                            </Typography>
                        );
                    },
                },
            ),
        ),
        columnHelper.accessor('total_absence_days', {
            id: 'total_absence_days',
            size: 160,
            header: 'Absence',
            meta: { label: 'Absence' },
            cell: (info) => {
                const count = Number(info.getValue() ?? 0);
                return (
                    <Typography
                        onClick={(event) => {
                            event.stopPropagation();
                            if (count > 0) openLeaveDetails(info.row.original);
                        }}
                        sx={{
                            color: count > 0 ? '#0b63ce' : '#64748b',
                            fontWeight: 900,
                            cursor: count > 0 ? 'pointer' : 'default',
                        }}
                    >
                        {formatCount(count)}
                    </Typography>
                );
            },
        }),
    ];

    const table = useReactTable({
        data: filteredSummaryRows,
        columns,
        state: { columnVisibility },
        onColumnVisibilityChange: setColumnVisibility,
        initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getRowId: (row) => String(row.user_id),
    });

    useEffect(() => {
        table.setPageIndex(0);
    }, [searchTerm, startDate, endDate]);

    const calendarDays = getMonthDays(calendarMonth);
    const selectedDateLeaves = leavesForDate(selectedCalendarDate);
    const calendarWeekCount = Math.ceil(calendarDays.length / 7);

    const simpleColumns = columns.map((column) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <Box sx={{
            // Keep scrolling inside the table, matching the Time Clock screen.
            // This lets MUI's sticky table header remain anchored while rows scroll.
            height: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fff',
            overflow: 'hidden',
        }}>
            <Box sx={{ px: 2, py: 1.5 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} justifyContent="space-between">
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ flex: 1 }}>
                        <DateRangePickerBox from={startDate} to={endDate} onChange={handleDateRangeChange} />
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ width: { xs: '100%', md: 260 } }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            color="primary"
                            variant="outlined"
                            size="small"
                            onClick={() => setActivityOpen(true)}
                            sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 700 }}
                        >
                            Activity
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                        <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<IconPlus size={17} />}
                            onClick={() => setAddLeaveOpen(true)}
                            sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                        >
                            Add
                        </Button>
                        <Tooltip title="General calendar">
                            <IconButton color="primary" onClick={() => setCalendarOpen(true)}>
                                <IconCalendar size={22} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Column visibility">
                            <IconButton color="primary" onClick={(event) => setColumnPopover(event.currentTarget)}>
                                <IconEye size={20} />
                            </IconButton>
                        </Tooltip>
                        { user.user_role_id === 1 && (
                        <Tooltip title="Settings">
                            <IconButton color="primary" onClick={() => setSettingsOpen(true)}>
                                <IconSettings size={20} />
                            </IconButton>
                        </Tooltip>
                        )}
                    </Stack>
                </Stack>
            </Box>

            <Divider />

            <Popover
                open={Boolean(columnPopover)}
                anchorEl={columnPopover}
                onClose={() => setColumnPopover(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { width: 240, p: 1.25, borderRadius: 2 } }}
            >
                <Typography fontWeight={800} fontSize={13} mb={1}>Show columns</Typography>
                <FormGroup>
                    {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
                        <FormControlLabel
                            key={column.id}
                            control={
                                <CustomCheckbox
                                    size="small"
                                    checked={column.getIsVisible()}
                                    onChange={column.getToggleVisibilityHandler()}
                                />
                            }
                            label={(column.columnDef.meta as any)?.label || column.id}
                        />
                    ))}
                </FormGroup>
            </Popover>

            <TableContainer
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                    overflowY: 'auto',
                }}
            >
                <Table
                    stickyHeader
                    sx={{
                        minWidth: 1600,
                        tableLayout: 'auto',
                    }}
                >
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const isActive = header.column.getIsSorted();
                                    const isAsc = header.column.getIsSorted() === 'asc';
                                    const isSortable = header.column.getCanSort();
                                    return (
                                        <TableCell
                                            key={header.id}
                                            align="left"
                                            sx={{
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 11,
                                                p: 0,
                                                width: header.getSize(),
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <Box
                                                onClick={header.column.getToggleSortingHandler()}
                                                sx={{
                                                    cursor: isSortable ? 'pointer' : 'default',
                                                    border: '2px solid transparent',
                                                    borderRadius: '6px',
                                                    py: 1.5,
                                                    ml: 0.5,
                                                    fontWeight: isActive ? 600 : 500,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    '&:hover': { color: '#888' },
                                                    '&:hover .hoverIcon': { opacity: 1 },
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </Typography>
                                                {isSortable && (
                                                    <Box
                                                        component="span"
                                                        className="hoverIcon"
                                                        ml={0.5}
                                                        sx={{
                                                            transition: 'opacity 0.2s',
                                                            opacity: isActive ? 1 : 0,
                                                            fontSize: '0.9rem',
                                                            color: isActive ? '#000' : '#888',
                                                        }}
                                                    >
                                                        {isActive ? (isAsc ? '↑' : '↓') : '↑'}
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <SkeletonLoader
                                columns={simpleColumns}
                                rowCount={simpleColumns.length}
                            />
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 'calc(50vh - 100px)',
                                        }}
                                    >
                                        <Image
                                            src="/images/no-data.png"
                                            alt="No data"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                            }}
                                            width={200}
                                            height={200}
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    hover
                                    key={row.id}
                                    onMouseEnter={() => setHoveredRow(row.original.user_id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    onClick={() => openUserLeaveDetails(row.original.user_id)}
                                    sx={{ cursor: 'pointer', transition: 'background-color 0.2s ease' }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            sx={{ padding: '10px' }}
                                            align="left"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            {filteredSummaryRows.length ? <Divider /> : <></>}

            <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined} table={table} totalRows={filteredSummaryRows.length} />

            <Drawer
                anchor="bottom"
                open={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        height: '90vh',
                        overflow: 'hidden',
                    },
                }}
            >
                <Box
                    sx={{
                        height: '100%',
                        p: 2,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' },
                        gridTemplateRows: { xs: 'auto minmax(0, 1fr) 220px', md: 'auto minmax(0, 1fr)' },
                        gap: 1.5,
                    }}
                >
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between" sx={{ gridColumn: '1 / -1' }} spacing={1}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: '50%',
                                    backgroundColor: LEAVE_TYPE_COLOR.paid
                                }} />
                                <Typography variant="caption" color="text.secondary">Paid</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: '50%',
                                    backgroundColor: LEAVE_TYPE_COLOR.unpaid
                                }} />
                                <Typography variant="caption" color="text.secondary">Unpaid</Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{
                                    width: 9,
                                    height: 9,
                                    borderRadius: '50%',
                                    backgroundColor: LEAVE_STATUS_COLOR.pending
                                }} />
                                <Typography variant="caption" color="text.secondary">Pending</Typography>
                            </Stack>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconButton
                                size="small"
                                onClick={() => setCalendarMonth(startOfMonth(subMonths(calendarMonth, 1)))}
                            >
                                <IconChevronLeft size={18} />
                            </IconButton>

                            <Typography fontWeight={800} sx={{ minWidth: 170, textAlign: 'center' }}>
                                {format(calendarMonth, 'MMMM yyyy')}
                            </Typography>

                            <IconButton
                                size="small"
                                onClick={() => setCalendarMonth(startOfMonth(addMonths(calendarMonth, 1)))}
                            >
                                <IconChevronRight size={18} />
                            </IconButton>
                            <Tooltip title="Close calendar">
                                <IconButton size="small" onClick={() => setCalendarOpen(false)} sx={{ ml: 1 }}>
                                    <IconX size={19} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>

                    <Box
                        sx={{
                            minWidth: 0,
                            minHeight: 0,
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 3,
                            overflow: 'hidden',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                            gridTemplateRows: `34px repeat(${calendarWeekCount}, minmax(0, 1fr))`,
                        }}
                    >
                        {['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'].map((day) => (
                            <Box key={day} sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                borderBottom: '1px solid #e5e7eb',
                                backgroundColor: '#f8fafc'
                            }}>
                                <Typography sx={{
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: day === 'SUN' || day === 'SAT' ? '#ff4d4f' : '#475569'
                                }}>
                                    {day}
                                </Typography>
                            </Box>
                        ))}

                        {calendarDays.map((day) => {
                            const dayLeaves = leavesForDate(day);
                            const selected = isSameDay(day, selectedCalendarDate);

                            return (
                                <Box
                                    key={day.toISOString()}
                                    onClick={() => setSelectedCalendarDate(day)}
                                    sx={{
                                        minWidth: 0,
                                        minHeight: 0,
                                        p: { xs: 0.6, md: 0.8 },
                                        borderRight: '1px solid #edf2f7',
                                        borderBottom: '1px solid #edf2f7',
                                        cursor: 'pointer',
                                        backgroundColor: selected ? '#e8f1ff' : '#fff',
                                        opacity: isSameMonth(day, calendarMonth) ? 1 : 0.42,
                                        boxShadow: selected ? 'inset 0 0 0 2px #0b63ce' : 'none',
                                        overflow: 'hidden',
                                        '&:hover': { backgroundColor: selected ? '#e8f1ff' : '#f8fafc' },
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        spacing={0.5} mb={0.5}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: { xs: 13, md: 15 },
                                                fontWeight: selected ? 900 : 700,
                                                color: day.getDay() === 0 || day.getDay() === 6 ? '#ff4d4f' : '#0f172a'
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </Typography>
                                        {dayLeaves.length > 0 && (
                                            <Typography variant="caption" sx={{
                                                color: '#64748b',
                                                fontWeight: 800
                                            }}>{dayLeaves.length}</Typography>
                                        )}
                                    </Stack>

                                    <Stack spacing={0.45} sx={{ minWidth: 0 }}>
                                        {dayLeaves.slice(0, 2).map((leave) => (
                                            <Box
                                                key={`${leave.id}-${day.toISOString()}`}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    minWidth: 0,
                                                    height: { xs: 16, md: 20 },
                                                    px: 0.7,
                                                    borderRadius: 1.2,
                                                    backgroundColor: `${getLeaveColor(leave)}22`,
                                                    borderLeft: `3px solid ${getLeaveColor(leave)}`,
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    noWrap
                                                    sx={{ color: '#0f172a', fontWeight: 700, lineHeight: 1 }}
                                                >
                                                    {getCalendarLeaveLabel(leave)}
                                                </Typography>
                                            </Box>
                                        ))}
                                        {dayLeaves.length > 2 && (
                                            <Typography
                                                variant="caption"
                                                noWrap
                                                sx={{ color: '#64748b', fontWeight: 700, pl: 0.5 }}
                                            >
                                                +{dayLeaves.length - 2} more
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box sx={{
                        minWidth: 0,
                        minHeight: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 3,
                        p: 2,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Typography
                            fontWeight={900}
                            noWrap
                        >
                            {format(selectedCalendarDate, 'dd MMM yyyy')}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap mb={1.25}
                        >
                            {selectedDateLeaves.length ? `${selectedDateLeaves.length} leave${selectedDateLeaves.length > 1 ? 's' : ''}` : 'No leave on this date'}
                        </Typography>

                        {selectedDateLeaves.length ? (
                            <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                                {selectedDateLeaves.map((leave) => (
                                    <Box
                                        key={leave.id}
                                        onClick={() => openUserLeaveDetails(leave.user_id, leave)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer'
                                        }}
                                    >

                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Avatar
                                                src={leave.user_thumb_image || leave.user_image || '/images/users/user.png'}
                                                alt={leave.user_name || 'User'} sx={{ width: 36, height: 36 }} />
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    fontWeight={900}
                                                    noWrap
                                                >
                                                    {leave.user_name || 'User'}
                                                </Typography>
                                                <Typography
                                                    variant="caption" color="text.secondary" display="block"
                                                    noWrap
                                                >
                                                    {leave.leave_name || 'Leave'}
                                                </Typography>
                                            </Box>
                                            <Chip size="small" label={getLeaveType(leave) || 'Leave'} sx={{
                                                backgroundColor: getLeaveColor(leave),
                                                color: '#fff',
                                                textTransform: 'capitalize',
                                                fontWeight: 700
                                            }} />
                                        </Stack>

                                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                            {leave.start_date || leave.leave_date}
                                            {leave.end_date && leave.end_date !== leave.start_date ? ` - ${leave.end_date}` : ''}
                                        </Typography>

                                        {!isAllDayLeave(leave) && getLeaveDurationText(leave) && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                display="block"
                                            >
                                                {getLeaveDurationText(leave)}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px dashed #cbd5e1',
                                borderRadius: 3
                            }}>
                                <Typography color="text.secondary">No leave on this date.</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Drawer>

            <Drawer
                anchor="right"
                open={addLeaveOpen}
                onClose={() => setAddLeaveOpen(false)}
                PaperProps={{
                    sx: {
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        overflow: 'hidden'
                    }
                }}
            >
                <AddLeave
                    onClose={() => setAddLeaveOpen(false)}
                    userId={0}
                    companyId={Number(user?.company_id || 0)}
                    onDataRefresh={() => startDate && endDate && fetchLeaves(startDate, endDate)}
                />
            </Drawer>

            <LeaveDetailsDrawer
                open={Boolean(detailDrawer)}
                onClose={() => setDetailDrawer(null)}
                title={detailDrawer?.title || 'Leave Details'}
                leaves={detailDrawer?.leaves || []}
                loading={detailDrawer?.loading}
                onOpenUser={(leave) => openUserLeaveDetails(leave.user_id, leave)}
            />

            <LeaveActivityDrawer
                open={activityOpen}
                onClose={() => setActivityOpen(false)}
                startDate={startDate} endDate={endDate}
            />

            <LeaveSettingsDrawer
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />
        </Box>
    );
};

export default Leaves;
