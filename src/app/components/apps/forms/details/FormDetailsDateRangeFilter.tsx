import React, { useEffect, useState } from 'react';
import { Box, Button, Popover, Stack } from '@mui/material';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export type DateRangePreset =
    | 'today'
    | 'yesterday'
    | 'this_week'
    | 'this_month'
    | 'this_quarter'
    | 'this_year'
    | 'last_3_days'
    | 'last_7_days'
    | 'last_14_days'
    | 'last_30_days'
    | 'last_90_days'
    | 'last_180_days'
    | 'last_365_days'
    | 'previous_week'
    | 'previous_month'
    | 'previous_quarter'
    | 'previous_year'
    | 'show_all';

export type DateRangeFilterValue = {
    preset: DateRangePreset | null;
    from: Date | null;
    to: Date | null;
};

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_3_days', label: 'Last 3 days' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_14_days', label: 'Last 14 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'last_180_days', label: 'Last 180 Days' },
    { value: 'last_365_days', label: 'Last 365 Days' },
    { value: 'previous_week', label: 'Previous Week' },
    { value: 'previous_month', label: 'Previous Month' },
    { value: 'previous_quarter', label: 'Previous Quarter' },
    { value: 'previous_year', label: 'Previous Year' },
    { value: 'show_all', label: 'Show all' },
];

const getQuarterRange = (date: dayjs.Dayjs) => {
    const startMonth = Math.floor(date.month() / 3) * 3;
    const start = date.month(startMonth).startOf('month');
    return {
        start,
        end: start.add(2, 'month').endOf('month'),
    };
};

const getMondayWeekRange = (date: dayjs.Dayjs) => {
    const daysFromMonday = (date.day() + 6) % 7;
    const start = date.subtract(daysFromMonday, 'day').startOf('day');
    return {
        start,
        end: start.add(6, 'day').endOf('day'),
    };
};

const getPresetDateRange = (preset: DateRangePreset) => {
    const today = dayjs();

    switch (preset) {
        case 'today':
            return { start: today.startOf('day'), end: today.endOf('day') };
        case 'yesterday': {
            const yesterday = today.subtract(1, 'day');
            return { start: yesterday.startOf('day'), end: yesterday.endOf('day') };
        }
        case 'this_week':
            return getMondayWeekRange(today);
        case 'this_month':
            return { start: today.startOf('month'), end: today.endOf('month') };
        case 'this_quarter':
            return getQuarterRange(today);
        case 'this_year':
            return { start: today.startOf('year'), end: today.endOf('year') };
        case 'last_3_days':
            return { start: today.subtract(2, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_7_days':
            return { start: today.subtract(6, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_14_days':
            return { start: today.subtract(13, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_30_days':
            return { start: today.subtract(29, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_90_days':
            return { start: today.subtract(89, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_180_days':
            return { start: today.subtract(179, 'day').startOf('day'), end: today.endOf('day') };
        case 'last_365_days':
            return { start: today.subtract(364, 'day').startOf('day'), end: today.endOf('day') };
        case 'previous_week':
            return getMondayWeekRange(today.subtract(1, 'week'));
        case 'previous_month': {
            const previousMonth = today.subtract(1, 'month');
            return { start: previousMonth.startOf('month'), end: previousMonth.endOf('month') };
        }
        case 'previous_quarter':
            return getQuarterRange(today.subtract(3, 'month'));
        case 'previous_year': {
            const previousYear = today.subtract(1, 'year');
            return { start: previousYear.startOf('year'), end: previousYear.endOf('year') };
        }
        case 'show_all':
        default:
            return null;
    }
};

export const getPresetFilterValue = (preset: DateRangePreset): DateRangeFilterValue => {
    const range = getPresetDateRange(preset);
    return {
        preset,
        from: range?.start.toDate() || null,
        to: range?.end.toDate() || null,
    };
};

const formatDateRangeLabel = (value: DateRangeFilterValue) => {
    if (!value.from || !value.to) return 'Show all';
    return `${dayjs(value.from).format('DD/MM/YYYY')} - ${dayjs(value.to).format('DD/MM/YYYY')}`;
};

export const isDateInFilterRange = (value: string | null | undefined, filter: DateRangeFilterValue) => {
    if (!filter.from || !filter.to) return true;
    if (!value) return false;

    const date = dayjs(value);
    if (!date.isValid()) return false;
    return !date.isBefore(dayjs(filter.from).startOf('day')) && !date.isAfter(dayjs(filter.to).endOf('day'));
};

const FormDetailsDateRangeFilter = ({
    value,
    onChange,
}: {
    value: DateRangeFilterValue;
    onChange: (value: DateRangeFilterValue) => void;
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [tempRange, setTempRange] = useState<DateRange>({
        from: value.from || undefined,
        to: value.to || undefined,
    });
    const [tempPreset, setTempPreset] = useState<DateRangePreset | null>(value.preset);
    const [calendarMonth, setCalendarMonth] = useState<Date>(value.from || new Date());

    useEffect(() => {
        setTempRange({ from: value.from || undefined, to: value.to || undefined });
        setTempPreset(value.preset);
        setCalendarMonth(value.from || new Date());
    }, [value]);

    const handleCancel = () => {
        setTempRange({ from: value.from || undefined, to: value.to || undefined });
        setTempPreset(value.preset);
        setCalendarMonth(value.from || new Date());
        setAnchorEl(null);
    };

    const handleOk = () => {
        onChange({
            preset: tempPreset,
            from: tempRange.from || null,
            to: tempRange.to || tempRange.from || null,
        });
        setAnchorEl(null);
    };

    const handlePresetClick = (preset: DateRangePreset) => {
        const nextValue = getPresetFilterValue(preset);
        setTempPreset(preset);
        setTempRange({ from: nextValue.from || undefined, to: nextValue.to || undefined });
        if (nextValue.from) setCalendarMonth(nextValue.from);
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<IconCalendar size={17} />}
                endIcon={<IconChevronDown size={16} />}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                sx={{
                    minHeight: 40,
                    width: { xs: '100%', md: 250 },
                    justifyContent: 'space-between',
                    textTransform: 'none',
                    color: 'text.primary',
                    borderColor: 'divider',
                    '& .MuiButton-startIcon': { mr: 1 },
                    '& .MuiButton-endIcon': { ml: 'auto' },
                }}
            >
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDateRangeLabel(value)}
                </Box>
            </Button>
            
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleCancel}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        mt: 1,
                        width: { xs: 'calc(100vw - 32px)', md: 900 },
                        maxWidth: 'calc(100vw - 32px)',
                        overflow: 'hidden',
                        borderRadius: '12px',
                        boxShadow: '0 16px 42px rgba(15, 23, 42, 0.16)',
                    },
                }}
            >
                <Box sx={{ display: 'flex' }}>
                    <Stack
                        sx={{
                            width: { xs: 190, md: 220 },
                            flexShrink: 0,
                            py: 1,
                            maxHeight: 390,
                            overflowY: 'auto',
                            borderRight: '1px solid',
                            borderColor: '#e5e7eb',
                            '&::-webkit-scrollbar': { width: '4px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { background: '#d1d5db', borderRadius: '4px' },
                        }}
                    >
                        {DATE_RANGE_OPTIONS.map((option) => (
                            <Box
                                key={option.value}
                                onClick={() => handlePresetClick(option.value)}
                                sx={{
                                    px: 2,
                                    py: 1.2,
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: option.value === tempPreset ? 600 : 400,
                                    color: option.value === tempPreset ? '#1976d2' : '#374151',
                                    bgcolor: option.value === tempPreset ? '#eaf5ff' : 'transparent',
                                    borderLeft: option.value === tempPreset ? '3px solid #1976d2' : '3px solid transparent',
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                        bgcolor: option.value === tempPreset ? '#eaf5ff' : '#f9fafb',
                                        color: option.value === tempPreset ? '#1976d2' : '#111827',
                                    },
                                }}
                            >
                                {option.label}
                            </Box>
                        ))}
                    </Stack>

                    <Box sx={{ p: 2, overflow: 'auto' }}>
                        <DayPicker
                            mode="range"
                            selected={tempRange}
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            onSelect={(range) => {
                                setTempRange(range || { from: undefined, to: undefined });
                                setTempPreset(null);
                            }}
                            numberOfMonths={2}
                            className="custom-day-picker"
                            weekStartsOn={1}
                        />
                        <Stack direction="row" justifyContent="flex-end" spacing={1} mt={2}>
                            <Button onClick={handleCancel}>Cancel</Button>
                            <Button variant="contained" onClick={handleOk}>OK</Button>
                        </Stack>
                    </Box>
                </Box>
            </Popover>
        </>
    );
};

export default FormDetailsDateRangeFilter;
