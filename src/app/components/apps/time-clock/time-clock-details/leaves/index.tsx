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
    Button,
} from '@mui/material';
import {
    IconArrowLeft,
    IconX,
} from '@tabler/icons-react';
import {
    format,
    parse,
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
        const existingDetailsState = localStorage.getItem(TIME_CLOCK_DETAILS_PAGE);
        let existingColumnVisibility = {};

        if (existingDetailsState) {
            const parsed = JSON.parse(existingDetailsState);
            existingColumnVisibility = parsed.columnVisibility || {};
        }

        const dateRange = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
            columnVisibility: existingColumnVisibility,
        };
        
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
    } catch (error) {
        console.log('Error saving date range to localStorage:', error);
    }
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
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [summaryRows, setSummaryRows] = useState<any[]>([]);
    const [selectedSummaryFilter, setSelectedSummaryFilter] = useState<{
        userId: number;
        leaveId?: number;
    } | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [startDate, setStartDate] = useState<Date | null>(initialDates.startDate,);
    const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
    
    const fetchRequests = async (start: Date, end: Date, id?: string | null): Promise<any> => {
        try {
            setLoading(true);
            const payload = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
                user_id: Number(id),
            };

            const res = await api.post(`user-leaves/get-list`, payload);
            if (res.data?.data) {
                setData(res.data.data);
                setLeaveTypes(res.data.leave_types || []);
                setSummaryRows(res.data.summary || []);
                return res.data.data;
            }
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
        return [];
    };

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

    const formatCount = (value: any) => {
        const numberValue = Number(value ?? 0);
        if (!numberValue) return '0';
        return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
    };

    const openUserLeaveDetails = (userId: number) => {
        if (startDate && endDate) {
            saveDateRangeToStorage(startDate, endDate);
        }
        router.push(`/apps/users/${userId}?tab=leave`);
        onClose();
    };

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            if (selectedSummaryFilter) {
                const sameUser = Number(item.user_id) === Number(selectedSummaryFilter.userId);
                const sameLeave = !selectedSummaryFilter.leaveId || Number(item.leave_id) === Number(selectedSummaryFilter.leaveId);

                if (!sameUser || !sameLeave) return false;
            }

            return [
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
                );
        });
    }, [data, searchTerm, selectedSummaryFilter]);

    const filteredSummaryRows = useMemo(() => {
        return summaryRows.filter((item) => {
            const search = searchTerm.toLowerCase();

            if (!search) return true;

            return [item.user_name, item.role_name]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(search));
        });
    }, [summaryRows, searchTerm]);
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
                {selectedSummaryFilter && (
                    <Button
                        variant="outlined"
                        onClick={() => setSelectedSummaryFilter(null)}
                        sx={{whiteSpace: 'nowrap'}}
                    >
                        Clear filter
                    </Button>
                )}
            </Box>

            {summaryRows.length > 0 && (
                <Box
                    sx={{
                        mb: 2,
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 2,
                        overflow: 'auto',
                        maxHeight: {xs: 260, md: 320},
                        flexShrink: 0,
                    }}
                >
                    <Box
                        sx={{
                            minWidth: Math.max(720, 280 + (leaveTypes.length + 1) * 130),
                        }}
                    >
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: `280px repeat(${leaveTypes.length}, minmax(120px, 1fr)) 130px`,
                                position: 'sticky',
                                top: 0,
                                zIndex: 1,
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #e5e7eb',
                            }}
                        >
                            <Box sx={{px: 2, py: 1.25}}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Name
                                </Typography>
                            </Box>
                            {leaveTypes.map((leaveType) => (
                                <Box key={leaveType.id} sx={{px: 2, py: 1.25, textAlign: 'center'}}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                                        {leaveType.name}
                                    </Typography>
                                </Box>
                            ))}
                            <Box sx={{px: 2, py: 1.25, textAlign: 'center'}}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Absence
                                </Typography>
                            </Box>
                        </Box>

                        {filteredSummaryRows.map((row) => (
                            <Box
                                key={row.user_id}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: `280px repeat(${leaveTypes.length}, minmax(120px, 1fr)) 130px`,
                                    borderBottom: '1px solid #eef2f7',
                                    '&:hover': {backgroundColor: '#fafafa'},
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                    onClick={() => openUserLeaveDetails(row.user_id)}
                                    sx={{px: 2, py: 1.25, minWidth: 0, cursor: 'pointer'}}
                                >
                                    <Avatar
                                        src={row.user_thumb_image || row.user_image || '/images/users/user.png'}
                                        alt={row.user_name || 'User'}
                                        sx={{width: 36, height: 36, flexShrink: 0}}
                                    />
                                    <Box sx={{minWidth: 0}}>
                                        <Typography fontWeight={800} noWrap>
                                            {row.user_name || 'User'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                                            {row.role_name || '-'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {leaveTypes.map((leaveType) => {
                                    const count = Number(row.leave_counts?.[String(leaveType.id)] ?? 0);

                                    return (
                                        <Box
                                            key={`${row.user_id}-${leaveType.id}`}
                                            onClick={() => {
                                                if (count > 0) {
                                                    setSelectedSummaryFilter({
                                                        userId: row.user_id,
                                                        leaveId: leaveType.id,
                                                    });
                                                }
                                            }}
                                            sx={{
                                                px: 2,
                                                py: 1.25,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: count > 0 ? '#0b63ce' : '#64748b',
                                                fontWeight: 800,
                                                cursor: count > 0 ? 'pointer' : 'default',
                                            }}
                                        >
                                            {formatCount(count)}
                                        </Box>
                                    );
                                })}

                                <Box
                                    onClick={() => {
                                        if (Number(row.total_absence_days) > 0) {
                                            setSelectedSummaryFilter({userId: row.user_id});
                                        }
                                    }}
                                    sx={{
                                        px: 2,
                                        py: 1.25,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: Number(row.total_absence_days) > 0 ? '#0b63ce' : '#64748b',
                                        fontWeight: 900,
                                        cursor: Number(row.total_absence_days) > 0 ? 'pointer' : 'default',
                                    }}
                                >
                                    {formatCount(row.total_absence_days)}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

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

        </Drawer>
    );
}
