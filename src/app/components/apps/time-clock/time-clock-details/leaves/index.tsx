'use client';
import React, {useEffect, useState, useMemo} from 'react';
import api from '@/utils/axios';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {
    Box,
    Grid,
    Stack,
    Drawer,
    IconButton,
    Typography,
    TextField,
    Avatar,
    CircularProgress,
    Chip,
} from '@mui/material';
import {
    IconArrowLeft,
    IconCalendar,
    IconChevronLeft,
    IconChevronRight,
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
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import {useRouter} from 'next/navigation';
import {capitalize} from 'lodash';
import {useSearchParams} from 'next/navigation';

dayjs.extend(customParseFormat);

interface Props {
    open: boolean;
    onClose: () => void;
    queryParams?: {
        user_id?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        open?: string | null;
    };
}

const TIME_CLOCK_DETAILS_PAGE = 'time-clock-details-page';
const STORAGE_KEY = 'request-date-range';
const LEAVE_STORAGE_KEY = 'leave-range';

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
            };
        }
    } catch (error) {
        console.error('Error loading date range from localStorage:', error);
    }
    return null;
};

const saveDateToStorage = (startDate: Date | null, endDate: Date | null) => {
    try {
        const dateRange = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
            columnVisibility: {},
        };
        
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
    } catch (error) {
        console.log('Error saving date range to localStorage:', error);
    }
};

const LEAVE_TYPE_COLOR: Record<string, string> = {
    paid: '#4CBC6D',
    unpaid: '#2196F3',
};

const LEAVE_STATUS_COLOR: Record<string, string> = {
    pending: '#FFCC80',
};

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

const getLeaveType = (leave: any) =>
    String(leave?.leave_type ?? leave?.type ?? leave?.paid_type ?? '').toLowerCase();

const getLeaveStatusText = (leave: any) =>
    String(leave?.status_text ?? leave?.request_status_text ?? '').toLowerCase();

const isPendingLeave = (leave: any) => {
    const statusText = getLeaveStatusText(leave);

    return Number(leave?.status) === 3 ||
        Number(leave?.request_status) === 3 ||
        statusText === 'pending' ||
        statusText.includes('pending');
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

const isApprovedLeave = (leave: any) => {
    const statusText = getLeaveStatusText(leave);

    return Number(leave?.status) === 5 || statusText === 'approved';
};

const isCalendarLeave = (leave: any) => isApprovedLeave(leave) || isPendingLeave(leave);

const isAllDayLeave = (leave: any) => {
    const value = leave?.is_allday_leave;

    return !(value === false || value === 0 || value === '0' || value === 'false');
};

const getCalendarLeaveLabel = (leave: any) => {
    const label = leave.user_name || leave.leave_name || 'Leave';
    const duration = String(leave?.duration ?? '').trim();

    return !isAllDayLeave(leave) && duration ? `${label} ${duration}` : label;
};

const getLeaveDurationText = (leave: any) => 
    String(leave?.duration ?? '').trim().replace(/^\((.*)\)$/, '$1');

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

export default function LeaveLists({open, onClose, queryParams}: Props) {
    const router = useRouter();
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);
    const searchParams = useSearchParams();
    const [selectedTimeClock, setSelectedTimeClock] = useState<any | null>(null);
    
    // Load from localStorage or use defaults
    const getInitialDates = () => {
        const stored = loadDateRangeFromStorage();
        if (stored && stored.startDate && stored.endDate) {
            return {
                startDate: stored.startDate,
                endDate: stored.endDate,
            };
        }
        return {
            startDate: defaultStart,
            endDate: defaultEnd,
        };
    };

    const initialDates = getInitialDates();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [startDate, setStartDate] = useState<Date | null>(initialDates.startDate,);
    const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
    
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()),);
    
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date(),);
    const [calendarStartDate, setCalendarStartDate] = useState<Date | null>(initialDates.startDate,);
    const [calendarEndDate, setCalendarEndDate] = useState<Date | null>(initialDates.endDate,);
    const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
    const [calendarLoading, setCalendarLoading] = useState(false);

    const fetchRequests = async (start: Date, end: Date, id?: string | null): Promise<any> => {
        try {
            setLoading(true);
            const payload = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
                user_id: Number(id),
            };

            const res = await api.post(`user-leaves/get-list`, payload);
            if (res.data?.data) setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
        return [];
    };

    const fetchCalendarLeaves = async (rangeStart: Date, rangeEnd: Date): Promise<void> => {
        setCalendarLoading(true);
        try {
            const payload: Record<string, any> = {
                start_date: format(rangeStart, 'dd/MM/yyyy'),
                end_date: format(rangeEnd, 'dd/MM/yyyy'),
            };

            if (queryParams?.user_id) {
                payload.user_id = Number(queryParams.user_id);
            }

            const res = await api.post(`user-leaves/get-list`, payload);
            setCalendarLeaves(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch leave calendar', err);
            setCalendarLeaves([]);
        } finally {
            setCalendarLoading(false);
        }
    };

    const openLeaveCalendar = () => {
        const today = startOfDay(new Date());
        const month = startOfMonth(today);
        const rangeStart = month;
        const rangeEnd = endOfMonth(today);
        
        setCalendarMonth(month);
        setSelectedCalendarDate(today);
        setCalendarStartDate(rangeStart);
        setCalendarEndDate(rangeEnd);
        setCalendarOpen(true);
        fetchCalendarLeaves(rangeStart, rangeEnd);
    };

    const closeLeaveCalendar = () => setCalendarOpen(false);

    const changeCalendarMonth = (month: Date) => {
        const nextMonth = startOfMonth(month);
        const rangeStart = nextMonth;
        const rangeEnd = endOfMonth(nextMonth);
        setCalendarMonth(nextMonth);
        setSelectedCalendarDate(nextMonth);
        setCalendarStartDate(rangeStart);
        setCalendarEndDate(rangeEnd);
        fetchCalendarLeaves(rangeStart, rangeEnd);
    };

    const leavesForDate = (date: Date) =>
        calendarLeaves.filter((leave) => {
            if (!isCalendarLeave(leave)) return false;

            const normalizedDate = startOfDay(date);
            const leaveStart = parseLeaveDate(leave.start_date || leave.leave_date);
            const leaveEnd = parseLeaveDate(
                leave.end_date || leave.start_date || leave.leave_date,
            );

            if (!leaveStart) return false;
            const normalizedEnd = leaveEnd || leaveStart;

            return normalizedDate >= startOfDay(leaveStart) && normalizedDate <= startOfDay(normalizedEnd);
        });

    useEffect(() => {
        if (startDate && endDate && open) fetchRequests(startDate, endDate);
    }, [startDate && endDate, open]);

    useEffect(() => {
        if (!queryParams?.user_id || !queryParams?.start_date || !queryParams?.end_date) {
            return;
        }

        const startDateObj = new Date(queryParams?.start_date as string);
        const endDateObj = new Date(queryParams?.end_date as string);

        setStartDate(startDateObj);
        setEndDate(endDateObj);

        const fetchDataFromQueryParams = async () => {
            try {
                const fetchedData = await fetchRequests(
                    startDateObj,
                    endDateObj,
                    queryParams?.user_id as string,
                );

                const foundUser = fetchedData.find(
                    (item: any) => Number(item.user_id) === Number(queryParams?.user_id),
                );

                if (foundUser) {
                    saveDateToStorage(startDateObj, endDateObj);
                    setSelectedTimeClock(foundUser);
                    router.replace('/apps/timesheet/list', {scroll: false});
                }
            } catch (err) {
                console.error('Failed to load data from query params:', err);
            }
            router.replace('/apps/timesheet/list', {scroll: false});
        };

        fetchDataFromQueryParams();
    }, [searchParams, queryParams?.user_id, queryParams?.start_date, queryParams?.end_date]);

    useEffect(() => {
        setSearchTerm('');
    }, [onClose]);
    
    const handleDateRangeChange = (range: { from: Date | null; to: Date | null; }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            saveDateRangeToStorage(range.from, range.to);
        }
    };

    const saveDateRangeToStorage = (startDate: Date | null, endDate: Date | null) => {
        try {
            const dateRange = {
                startDate: startDate ? startDate.toDateString() : null,
                endDate: endDate ? endDate.toDateString() : null,
            };
            localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(dateRange));
        } catch (error) {
            console.error('Error saving date range to localStorage:', error);
        }
    };

    const REQUEST_ROUTE_MAP: Record<string, (recordId?: number, startDate?: string, endDate?: string) => string> = {
        Leave: (id, startDate, endDate) => {
            if (startDate && endDate) {
                saveDateRangeToStorage(new Date(startDate), new Date(endDate));
            }
            return `/apps/users/${id}?tab=leave`;
        },
    };

    const filteredData = useMemo(() => {
        return data.filter((item) =>
            [
                item.user_name,
                item.manager_note,
                item.leave_name,
                item.start_date,
                item.end_date,
                item.end_time,
                item.start_time,
                item.type,
            ]
                .filter(Boolean)
                .some((field) =>
                    field.toLowerCase().includes(searchTerm.toLowerCase()),
                ),
        );
    }, [data, searchTerm]);
    const calendarDays = getMonthDays(calendarMonth);
    const selectedDateLeaves = leavesForDate(selectedCalendarDate);
    const calendarWeekCount = Math.ceil(calendarDays.length / 7);

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: '100%',
                    height: {xs: '92vh', md: '88vh'},
                    maxHeight: '100vh',
                    padding: {xs: 2, md: 3},
                    backgroundColor: '#f9f9f9',
                    borderTopLeftRadius: {xs: 16, md: 24},
                    borderTopRightRadius: {xs: 16, md: 24},
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
        >
            {/* Header */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton onClick={onClose}>
                        <IconArrowLeft/>
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                        Leaves
                    </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconButton onClick={openLeaveCalendar} color="primary">
                        <IconCalendar/>
                    </IconButton>
                    <IconButton onClick={onClose}>
                        <IconX/>
                    </IconButton>
                </Stack>
            </Box>

            {/* Search */}
            <Box
                mb={2}
                display="flex"
                gap={1}
                alignContent="center"
                flexDirection={{xs: 'column', sm: 'row'}}
                sx={{
                    '& .MuiTextField-root': {
                        width: {xs: '100%', sm: 320},
                    },
                }}
            >
                <TextField
                    placeholder="Search leaves..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={handleDateRangeChange}
                />
            </Box>

            {/* Content */}
            <Box
                flex={1}
                overflow="auto"
                pb={2}
                sx={{minHeight: 0}}
            >
                {loading ? (
                    <></>
                ) : filteredData.length > 0 ? (
                    <Grid container spacing={2}>
                        {filteredData.map((work, idx) => (
                            <Grid size={{xs: 12, md: 6, xl: 4}} mt={1} key={idx}>
                                <Box
                                    onClick={() => {
                                        const routeFn = REQUEST_ROUTE_MAP['Leave'];
                                        if (routeFn) {
                                            const formattedDate = work.start_date
                                                ? format(parse(work.start_date, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd')
                                                : undefined;

                                            const formattedEndDate = work.end_date
                                                ? format(parse(work.end_date, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd')
                                                : undefined;

                                            router.push(routeFn(work.user_id, formattedDate, formattedEndDate));
                                            onClose();
                                        }
                                    }}
                                    sx={{
                                        border: '1px solid #ddd',
                                        borderRadius: 2,
                                        position: 'relative',
                                        p: 2,
                                        backgroundColor: 'white',
                                        transition: '0.2s',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        },
                                    }}
                                >
                                    <Box
                                        display={'flex'}
                                        gap={2}
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mb={1}
                                        sx={{top: -8, position: 'absolute'}}
                                        flexWrap="wrap"
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                px: 1.2,
                                                py: 0.2,
                                                borderRadius: '12px',
                                                backgroundColor: 'gray',
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {work.leave_name}
                                        </Typography>
                                        
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                px: 1.2,
                                                py: 0.2,
                                                borderRadius: '12px',
                                                borderColor: work.leave_type == 'paid' ? '#39af43ff' : 'orange',
                                                backgroundColor: work.leave_type == 'paid' ? '#39af43ff' : 'orange',
                                                color: '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {work.leave_type}
                                        </Typography>
                                    </Box>
                                    
                                    <Box display={'flex'} gap={1} mt={1}>
                                        <Avatar
                                            src={work.user_image}
                                            alt={work.user_name}
                                            sx={{width: 36, height: 36}}
                                        />
                                        
                                        <Box display={'flex'} justifyContent={'space-between'} width={'100%'}>
                                            <Box>
                                                <Typography variant="h1" fontSize={'16px !important'}>
                                                    {work.user_name}
                                                </Typography>
                                                
                                                <Typography>
                                                    {work.start_date
                                                        ? `Date: ${capitalize(work.start_date)} ${
                                                            work.is_allday_leave ? `- ${work.end_date}` : ''
                                                        }` : ''}
                                                </Typography>
                                                
                                                <Typography>
                                                    {work.start_time
                                                        ? `Time: ${capitalize(work.start_time)} ${
                                                            !work.is_allday_leave ? `- ${work.end_time}` : ''
                                                        }` : ''}
                                                </Typography>
                                            </Box>
                                            
                                            {work.request_status !== 0 && (
                                                <Box justifyContent={'flex-end'}>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            px: 1.6,
                                                            py: 0.7,
                                                            borderRadius: '18px',
                                                            border: 2,
                                                            borderColor: work?.color || '#757575',
                                                            color: work?.color || '#757575',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {work?.status_text}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                    
                                    {work.manager_note && (
                                        <Box
                                            display={'flex'}
                                            justifyContent={'start'}
                                            mt={0}
                                            ml={5.5}
                                        >
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                fontSize={'14px !important'}
                                                noWrap
                                            >
                                                Note: {work.manager_note}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        mt={4}
                    >
                        No requests found.
                    </Typography>
                )}
            </Box>

            <Drawer
                anchor="bottom"
                open={calendarOpen}
                onClose={closeLeaveCalendar}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: '100%',
                        height: {xs: 'calc(100vh - 12px)', md: 'calc(100vh - 24px)'},
                        maxHeight: '100vh',
                        p: {xs: 1.5, md: 2},
                        background: 'linear-gradient(135deg, #f8fbff 0%, #f6f8f3 45%, #fff8f1 100%)',
                        borderTopLeftRadius: {xs: 14, md: 22},
                        borderTopRightRadius: {xs: 14, md: 22},
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr auto', md: 'minmax(0, 1fr) auto minmax(320px, 1fr)'},
                        alignItems: 'center',
                        gap: 1.5,
                        mb: 1.5,
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{minWidth: 0}}>
                        <Typography variant="h5" fontWeight={800} noWrap>
                            Leave Calendar
                        </Typography>
                        
                        <Stack direction="row" spacing={2} alignItems="center" mt={0.5}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{width: 9, height: 9, borderRadius: '50%', backgroundColor: LEAVE_TYPE_COLOR.paid}}/>
                                <Typography variant="caption" color="text.secondary">Paid</Typography>
                            </Stack>

                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{width: 9, height: 9, borderRadius: '50%', backgroundColor: LEAVE_TYPE_COLOR.unpaid}}/>
                                <Typography variant="caption" color="text.secondary">Unpaid</Typography>
                            </Stack>

                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{width: 9, height: 9, borderRadius: '50%', backgroundColor: LEAVE_STATUS_COLOR.pending}}/>
                                <Typography variant="caption" color="text.secondary">Pending</Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.86)',
                            border: '1px solid #e5e7eb',
                            borderRadius: 999,
                            px: 0.75,
                            py: 0.5,
                            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                        }}
                    >
                        <IconButton size="small" onClick={() => changeCalendarMonth(subMonths(calendarMonth, 1))}>
                            <IconChevronLeft size={18}/>
                        </IconButton>
                        
                        <Typography fontWeight={800} sx={{minWidth: {xs: 120, md: 170}, textAlign: 'center'}}>
                            {format(calendarMonth, 'MMMM yyyy')}
                        </Typography>
                        
                        <IconButton size="small" onClick={() => changeCalendarMonth(addMonths(calendarMonth, 1))}>
                            <IconChevronRight size={18}/>
                        </IconButton>
                    </Stack>

                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={1}
                        sx={{
                            gridColumn: {xs: '1 / -1', md: 'auto'},
                        }}
                    >
                        <IconButton onClick={closeLeaveCalendar}>
                            <IconX/>
                        </IconButton>
                    </Stack>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: 'minmax(0, 1fr) 360px'},
                        gridTemplateRows: {xs: 'minmax(0, 1fr) 178px', md: '1fr'},
                        gap: 1.5,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            minWidth: 0,
                            minHeight: 0,
                            backgroundColor: 'rgba(255,255,255,0.94)',
                            border: '1px solid #e5e7eb',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                            gridTemplateRows: `34px repeat(${calendarWeekCount}, minmax(0, 1fr))`,
                        }}
                    >
                        {['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'].map((day) => (
                            <Box
                                key={day}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 1,
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: 'rgba(248,250,252,0.8)',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        letterSpacing: 0.4,
                                        color: day === 'SUN' || day === 'SAT' ? '#ff4d4f' : '#475569',
                                    }}
                                >
                                    {day}
                                </Typography>
                            </Box>
                        ))}

                        {calendarDays.map((day) => {
                            const dayLeaves = leavesForDate(day);
                            const selected = isSameDay(day, selectedCalendarDate);
                            const inMonth = isSameMonth(day, calendarMonth);
                            
                            const inSelectedRange = calendarStartDate && calendarEndDate &&
                                startOfDay(day) >= startOfDay(calendarStartDate) &&
                                startOfDay(day) <= startOfDay(calendarEndDate);

                            return (
                                <Box
                                    key={day.toISOString()}
                                    onClick={() => setSelectedCalendarDate(day)}
                                    sx={{
                                        minWidth: 0,
                                        minHeight: 0,
                                        p: {xs: 0.6, md: 0.8},
                                        borderRight: '1px solid #edf2f7',
                                        borderBottom: '1px solid #edf2f7',
                                        cursor: 'pointer',
                                        backgroundColor: selected ? '#e8f1ff' : inSelectedRange ? 'rgba(232, 241, 255, 0.46)' : 'rgba(255,255,255,0.72)',
                                        opacity: inMonth ? 1 : 0.42,
                                        boxShadow: selected ? 'inset 0 0 0 2px #0b63ce' : 'none',
                                        overflow: 'hidden',
                                        '&:hover': {backgroundColor: selected ? '#e8f1ff' : '#f8fafc'},
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
                                                fontSize: {xs: 13, md: 15},
                                                fontWeight: selected ? 900 : 700,
                                                color: day.getDay() === 0 || day.getDay() === 6 ? '#ff4d4f' : '#0f172a',
                                            }}
                                        >
                                            {format(day, 'd')}
                                        </Typography>
                                        {dayLeaves.length > 0 && (
                                            <Typography variant="caption" sx={{color: '#64748b', fontWeight: 800}}>
                                                {dayLeaves.length}
                                            </Typography>
                                        )}
                                    </Stack>

                                    <Stack spacing={0.45} sx={{minWidth: 0}}>
                                        {dayLeaves.slice(0, 2).map((leave) => (
                                            <Box
                                                key={`${leave.id}-${day.toISOString()}`}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.6,
                                                    minWidth: 0,
                                                    height: {xs: 16, md: 20},
                                                    px: 0.7,
                                                    borderRadius: 1.2,
                                                    backgroundColor: `${getLeaveColor(leave)}22`,
                                                    borderLeft: `3px solid ${getLeaveColor(leave)}`,
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    noWrap
                                                    sx={{color: '#0f172a', fontWeight: 700, lineHeight: 1}}
                                                >
                                                    {getCalendarLeaveLabel(leave)}
                                                </Typography>
                                            </Box>
                                        ))}
                                        {dayLeaves.length > 2 && (
                                            <Typography 
                                                variant="caption" 
                                                noWrap
                                                sx={{color: '#64748b', fontWeight: 700, pl: 0.5}}
                                            >
                                                +{dayLeaves.length - 2} more
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Box>

                    <Box
                        sx={{
                            minWidth: 0,
                            minHeight: 0,
                            backgroundColor: 'rgba(255,255,255,0.94)',
                            border: '1px solid #e5e7eb',
                            borderRadius: 3,
                            p: {xs: 1.25, md: 2},
                            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} mb={1.25}>
                            <Box sx={{minWidth: 0}}>
                                <Typography fontWeight={900} noWrap>
                                    {format(selectedCalendarDate, 'dd MMM yyyy')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {selectedDateLeaves.length
                                        ? `${selectedDateLeaves.length} leave${selectedDateLeaves.length > 1 ? 's' : ''}`
                                        : 'No leave on this date'}
                                </Typography>
                            </Box>
                            {calendarLoading && <CircularProgress size={20}/>}
                        </Stack>

                        {selectedDateLeaves.length ? (
                            <Stack spacing={1.25} sx={{flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, pb: 1.5}}>
                                {selectedDateLeaves.map((leave) => (
                                    <Box
                                        key={leave.id}
                                        sx={{
                                            position: 'relative',
                                            minWidth: 0,
                                            px: 1.5,
                                            py: 1.75,
                                            borderRadius: 2,
                                            backgroundColor: 'rgba(255,255,255,0.96)',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                                        }}
                                    >
                                        <Stack spacing={1.25}>
                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                spacing={1}
                                                alignItems="flex-start"
                                                sx={{py: 0.25}}
                                            >
                                                <Stack direction="row" alignItems="center" spacing={1} sx={{minWidth: 0}}>
                                                    <Avatar
                                                        src={
                                                            leave?.user_thumb_image
                                                                ? leave.user_thumb_image
                                                                : '/images/users/user.png'
                                                        }
                                                        alt={leave.user_name || 'User'}
                                                        sx={{ width: 36, height: 36, flexShrink: 0 }}
                                                    />
                                                    <Box sx={{minWidth: 0}}>
                                                        <Typography fontWeight={900} noWrap>
                                                            {leave.user_name || 'User'}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            noWrap
                                                            display="block"
                                                        >
                                                            {leave.leave_name || 'Leave'}
                                                        </Typography>
                                                    </Box>
                                                </Stack>

                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexWrap: 'nowrap',
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-end',
                                                        gap: 0.5,
                                                        flexShrink: 0,
                                                        minWidth: 126,
                                                    }}
                                                >
                                                    <Chip
                                                        size="small"
                                                        label={getLeaveType(leave) || 'Leave'}
                                                        sx={{
                                                            height: 24,
                                                            backgroundColor: getLeaveColor(leave),
                                                            color: '#fff',
                                                            textTransform: 'capitalize',
                                                            fontWeight: 700,
                                                            '& .MuiChip-label': {
                                                                px: 1,
                                                            },
                                                        }}
                                                    />
                                                    {leave.status_text && (
                                                        <Chip
                                                            size="small"
                                                            label={leave.status_text}
                                                            variant="outlined"
                                                            sx={{
                                                                height: 24,
                                                                backgroundColor: '#fff',
                                                                borderColor: getStatusColor(leave),
                                                                color: getStatusColor(leave),
                                                                textTransform: 'capitalize',
                                                                fontWeight: 700,
                                                                '& .MuiChip-label': {
                                                                    px: 1,
                                                                },
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Stack>

                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    minHeight: !isAllDayLeave(leave) && getLeaveDurationText(leave) ? 62 : 44,
                                                    display: 'grid',
                                                    alignContent: 'center',
                                                    gap: 0.65,
                                                    px: 1.25,
                                                    py: 1,
                                                    borderRadius: 2.25,
                                                    backgroundColor: '#f8fafc',
                                                    border: '1px solid #edf2f7',
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" spacing={1} sx={{minWidth: 0}}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Date
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.primary"
                                                        fontWeight={700}
                                                        textAlign="right"
                                                        sx={{minWidth: 0}}
                                                        noWrap
                                                    >
                                                        {leave.start_date || leave.leave_date}
                                                        {leave.end_date && leave.end_date !== leave.start_date ? ` - ${leave.end_date}` : ''}
                                                    </Typography>
                                                </Stack>

                                                {!isAllDayLeave(leave) && getLeaveDurationText(leave) && (
                                                    <Stack direction="row" justifyContent="space-between" spacing={1} sx={{minWidth: 0}}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Time
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.primary"
                                                            fontWeight={700}
                                                            textAlign="right"
                                                            sx={{minWidth: 0}}
                                                            noWrap
                                                        >
                                                            {getLeaveDurationText(leave)}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </Box>
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px dashed #cbd5e1',
                                    borderRadius: 3,
                                    backgroundColor: '#fff',
                                }}
                            >
                                <Typography color="text.secondary">No leave on this date.</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Drawer>
        </Drawer>
    );
}
