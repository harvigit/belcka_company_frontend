'use client';

import React from 'react';
import {
    Avatar,
    Box,
    Chip,
    CircularProgress,
    Drawer,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
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
import Link from 'next/link';
import { getUserDetailsHref } from '@/utils/userDetailsRoute';

export const LEAVE_TYPE_COLOR: Record<string, string> = {
    paid: '#4CBC6D',
    unpaid: '#2196F3',
};

export const LEAVE_STATUS_COLOR: Record<string, string> = {
    pending: '#FFCC80',
};

export const parseLeaveDate = (value?: string | null) => {
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
        statusText.includes('pending')
    );
};

const isApprovedLeave = (leave: any) =>
    Number(leave?.status) === 5 ||
    Number(leave?.request_status) === 5 ||
    getLeaveStatusText(leave) === 'approved';

const isCalendarLeave = (leave: any) => isApprovedLeave(leave) || isPendingLeave(leave);

const isAllDayLeave = (leave: any) => {
    const value = leave?.is_allday_leave;

    return !(value === false || value === 0 || value === '0' || value === 'false');
};

const getLeaveColor = (leave: any) => {
    if (isPendingLeave(leave)) return LEAVE_STATUS_COLOR.pending;

    return LEAVE_TYPE_COLOR[getLeaveType(leave)] || leave?.color || '#4CBC6D';
};

const getLeaveDurationText = (leave: any) =>
    String(leave?.duration ?? '').trim().replace(/^\((.*)\)$/, '$1');

const getCalendarLeaveLabel = (leave: any) => {
    const label = leave.user_name || leave.leave_name || 'Leave';
    const duration = getLeaveDurationText(leave);

    return !isAllDayLeave(leave) && duration ? `${label} ${duration}` : label;
};

export const getMonthDays = (month: Date) => {
    const gridStart = startOfWeek(startOfMonth(month));
    const gridEnd = endOfWeek(endOfMonth(month));
    const days: Date[] = [];

    for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
        days.push(date);
    }

    return days;
};

type LeaveCalendarDrawerProps = {
    open: boolean;
    onClose: () => void;
    leaves: any[];
    loading?: boolean;
    month: Date;
    onMonthChange: (month: Date) => void;
    selectedDate: Date;
    onSelectedDateChange: (date: Date) => void;
};

const LeaveCalendarDrawer = ({
    open,
    onClose,
    leaves,
    loading = false,
    month,
    onMonthChange,
    selectedDate,
    onSelectedDateChange,
}: LeaveCalendarDrawerProps) => {
    const leavesForDate = (date: Date) =>
        leaves.filter((leave) => {
            if (!isCalendarLeave(leave)) return false;

            const normalizedDate = startOfDay(date);
            const leaveStart = parseLeaveDate(leave.start_date || leave.leave_date);
            const leaveEnd = parseLeaveDate(leave.end_date || leave.start_date || leave.leave_date);

            if (!leaveStart) return false;

            return normalizedDate >= startOfDay(leaveStart) && normalizedDate <= startOfDay(leaveEnd || leaveStart);
        });

    const calendarDays = getMonthDays(month);
    const selectedDateLeaves = leavesForDate(selectedDate);
    const calendarWeekCount = Math.ceil(calendarDays.length / 7);

    const legend = [
        { label: 'Paid', color: LEAVE_TYPE_COLOR.paid },
        { label: 'Unpaid', color: LEAVE_TYPE_COLOR.unpaid },
        { label: 'Pending', color: LEAVE_STATUS_COLOR.pending },
    ];

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
                        {legend.map((item) => (
                            <Stack key={item.label} direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: item.color }} />
                                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                            </Stack>
                        ))}
                        {loading && <CircularProgress size={16} />}
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton size="small" onClick={() => onMonthChange(startOfMonth(subMonths(month, 1)))}>
                            <IconChevronLeft size={18} />
                        </IconButton>

                        <Typography fontWeight={800} sx={{ minWidth: 170, textAlign: 'center' }}>
                            {format(month, 'MMMM yyyy')}
                        </Typography>

                        <IconButton size="small" onClick={() => onMonthChange(startOfMonth(addMonths(month, 1)))}>
                            <IconChevronRight size={18} />
                        </IconButton>
                        <Tooltip title="Close calendar">
                            <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
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
                            backgroundColor: '#f8fafc',
                        }}>
                            <Typography sx={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: day === 'SUN' || day === 'SAT' ? '#ff4d4f' : '#475569',
                            }}>
                                {day}
                            </Typography>
                        </Box>
                    ))}

                    {calendarDays.map((day) => {
                        const dayLeaves = leavesForDate(day);
                        const selected = isSameDay(day, selectedDate);

                        return (
                            <Box
                                key={day.toISOString()}
                                onClick={() => onSelectedDateChange(day)}
                                sx={{
                                    minWidth: 0,
                                    minHeight: 0,
                                    p: { xs: 0.6, md: 0.8 },
                                    borderRight: '1px solid #edf2f7',
                                    borderBottom: '1px solid #edf2f7',
                                    cursor: 'pointer',
                                    backgroundColor: selected ? '#e8f1ff' : '#fff',
                                    opacity: isSameMonth(day, month) ? 1 : 0.42,
                                    boxShadow: selected ? 'inset 0 0 0 2px #0b63ce' : 'none',
                                    overflow: 'hidden',
                                    '&:hover': { backgroundColor: selected ? '#e8f1ff' : '#f8fafc' },
                                }}
                            >
                                <Stack direction="row" alignItems="center" justifyContent="space-between"
                                    spacing={0.5} mb={0.5}>
                                    <Typography
                                        sx={{
                                            fontSize: { xs: 13, md: 15 },
                                            fontWeight: selected ? 900 : 700,
                                            color: day.getDay() === 0 || day.getDay() === 6 ? '#ff4d4f' : '#0f172a',
                                        }}
                                    >
                                        {format(day, 'd')}
                                    </Typography>
                                    {dayLeaves.length > 0 && (
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>
                                            {dayLeaves.length}
                                        </Typography>
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
                                            <Typography variant="caption" noWrap
                                                sx={{ color: '#0f172a', fontWeight: 700, lineHeight: 1 }}>
                                                {getCalendarLeaveLabel(leave)}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {dayLeaves.length > 2 && (
                                        <Typography variant="caption" noWrap
                                            sx={{ color: '#64748b', fontWeight: 700, pl: 0.5 }}>
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
                    flexDirection: 'column',
                }}>
                    <Typography fontWeight={900} noWrap>
                        {format(selectedDate, 'dd MMM yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap mb={1.25}>
                        {loading
                            ? 'Loading leaves...'
                            : selectedDateLeaves.length
                                ? `${selectedDateLeaves.length} leave${selectedDateLeaves.length > 1 ? 's' : ''}`
                                : 'No leave on this date'}
                    </Typography>

                    {loading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CircularProgress size={28} />
                        </Box>
                    ) : selectedDateLeaves.length ? (
                        <Stack spacing={1.25} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                            {selectedDateLeaves.map((leave) => {
                                const leaveStart = parseLeaveDate(leave.start_date ?? leave.leave_date);

                                return (
                                    <Link
                                        key={leave.id}
                                        href={getUserDetailsHref(leave.user_id, {
                                            tab: 'leave',
                                            leave_start: leaveStart ? format(startOfWeek(leaveStart), 'yyyy-MM-dd') : undefined,
                                            leave_end: leaveStart ? format(endOfWeek(leaveStart), 'yyyy-MM-dd') : undefined,
                                        })}
                                        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                    >
                                        <Box sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                                        }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar
                                                    src={leave.user_thumb_image || leave.user_image || '/images/users/user.png'}
                                                    alt={leave.user_name || 'User'} sx={{ width: 36, height: 36 }} />
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography fontWeight={900} noWrap>
                                                        {leave.user_name || 'User'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                                        {leave.leave_name || 'Leave'}
                                                    </Typography>
                                                </Box>
                                                <Chip size="small" label={getLeaveType(leave) || 'Leave'} sx={{
                                                    backgroundColor: getLeaveColor(leave),
                                                    color: '#fff',
                                                    textTransform: 'capitalize',
                                                    fontWeight: 700,
                                                }} />
                                            </Stack>

                                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                                {leave.start_date || leave.leave_date}
                                                {leave.end_date && leave.end_date !== leave.start_date ? ` - ${leave.end_date}` : ''}
                                            </Typography>

                                            {!isAllDayLeave(leave) && getLeaveDurationText(leave) && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {getLeaveDurationText(leave)}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Link>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed #cbd5e1',
                            borderRadius: 3,
                        }}>
                            <Typography color="text.secondary">No leave on this date.</Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Drawer>
    );
};

export default LeaveCalendarDrawer;
