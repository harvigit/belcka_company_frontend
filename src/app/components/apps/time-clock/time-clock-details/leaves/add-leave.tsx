"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    CircularProgress,
    IconButton,
    Typography,
    Select,
    MenuItem,
    TextField,
    Button,
    FormControl,
    Avatar,
    InputAdornment,
    Divider,
    SelectChangeEvent,
    Switch,
    Alert,
    Popover,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { IconX } from '@tabler/icons-react';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import {format, parseISO, differenceInDays, parse, differenceInCalendarDays} from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import api from '@/utils/axios';
import { AxiosResponse } from 'axios';

interface User {
    id: number;
    first_name?: string;
    last_name?: string;
    name?: string;
    user_image?: string;
    image?: string;
}

interface Leave {
    id: number;
    name: string;
    type: string;
}

interface FormData {
    leaveId: string;
    userId: string;
    managerNote: string;
    isAllDay: boolean;
}

interface LeaveData {
    user_leave_id?: number;
    user_id: number;
    leave_id?: number;
    leave_type?: string;
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    is_allday_leave?: boolean;
    manager_note?: string;
    note?: string;
    total_time_of_days?: string;
}

interface AddLeaveProps {
    onClose: () => void;
    userId: number;
    companyId: number;
    leaveData?: LeaveData;
}

const today = new Date();

const minSelectableDate = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate()
);

const maxSelectableDate = new Date(
    today.getFullYear() + 1,
    today.getMonth(),
    today.getDate()
);

const MAX_RANGE_DAYS = 31;

const IOSSwitch = styled(Switch)(({ theme }) => ({
    width: 42,
    height: 26,
    padding: 0,
    '& .MuiSwitch-switchBase': {
        padding: 0,
        margin: 2,
        transitionDuration: '300ms',
        '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
                backgroundColor: '#50ABFF',
                opacity: 1,
                border: 0,
            },
            '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
            },
        },
        '&.Mui-focusVisible .MuiSwitch-thumb': {
            color: '#50ABFF',
            border: '6px solid #fff',
        },
        '&.Mui-disabled .MuiSwitch-thumb': {
            color: theme.palette.grey[100],
        },
        '&.Mui-disabled + .MuiSwitch-track': {
            opacity: 0.7,
        },
    },
    '& .MuiSwitch-thumb': {
        boxSizing: 'border-box',
        width: 22,
        height: 22,
    },
    '& .MuiSwitch-track': {
        borderRadius: 13,
        backgroundColor: '#E9E9EA',
        opacity: 1,
        transition: theme.transitions.create(['background-color'], {
            duration: 500,
        }),
    },
}));

const StyledDayPicker = styled(Box)(({ theme }) => ({
    '& .rdp': {
        '--rdp-cell-size': '36px',
        '--rdp-accent-color': '#50ABFF',
        '--rdp-background-color': '#e6f3ff',
        '--rdp-selected-color': '#fff',
        '--rdp-selected-background': '#50ABFF',
        '--rdp-today-background': '#f0f0f0',
        fontSize: '14px',
        padding: theme.spacing(1),
        backgroundColor: '#fff',
    },
    '& .rdp-day': {
        borderRadius: '4px',
    },
    '& .rdp-day_selected': {
        backgroundColor: '#50ABFF',
        color: '#fff',
    },
    '& .rdp-day:hover': {
        backgroundColor: '#e6f3ff',
    },
}));

const AddLeave: React.FC<AddLeaveProps> = ({ onClose, userId, companyId, leaveData = null }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<FormData>({
        userId: '',
        leaveId: '',
        managerNote: '',
        isAllDay: true,
    });
    const [startTime, setStartTime] = useState<string>('09:00');
    const [endTime, setEndTime] = useState<string>('17:00');
    const [singleDate, setSingleDate] = useState<Date | undefined>(new Date());
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    });
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const isEditMode = !!leaveData?.user_leave_id;

    const parseDateString = (dateStr: string): Date => {
        const formats = ['dd/MM/yyyy', 'd/M/yyyy', 'yyyy-MM-dd'];

        for (const fmt of formats) {
            try {
                const parsed = parse(dateStr, fmt, new Date());
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            } catch (e) {
                continue;
            }
        }

        return new Date();
    };

    useEffect(() => {
        if (leaveData) {
            setFormData({
                userId: leaveData.user_id.toString(),
                leaveId: leaveData.leave_id?.toString() || '',
                managerNote: leaveData.manager_note || leaveData.note || '',
                isAllDay: leaveData.is_allday_leave ?? true,
            });

            const startDate = parseDateString(leaveData.start_date);
            const endDate = parseDateString(leaveData.end_date);

            if (leaveData.is_allday_leave) {
                setDateRange({
                    from: startDate,
                    to: endDate,
                });
            } else {
                setSingleDate(startDate);
                if (leaveData.start_time) {
                    setStartTime(leaveData.start_time);
                }
                if (leaveData.end_time) {
                    setEndTime(leaveData.end_time);
                }
            }
        }
    }, [leaveData]);

    const validateAndFormatTime = (value: string): string | null => {
        if (!value) return null;

        const trimmed = value.trim();

        const match = trimmed.match(/^(\d{1,2})(?::?(\d{1,2}))?$/);
        if (!match) return null;

        let hours = Number(match[1]);
        let minutes = Number(match[2] ?? 0);

        if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };


    const getUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`user/list`);
            setUsers(res.data.info || []);
            if (userId && !leaveData) {
                setFormData((prev) => ({ ...prev, userId: userId.toString() }));
            }
        } catch (error) {
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [userId, leaveData]);

    const getLeaves = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`company-leaves/get?company_id=${companyId}`);
            setLeaves(res.data.info || []);
        } catch (error) {
            setError('Failed to load leaves. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        getUsers();
        getLeaves();
    }, [getUsers, getLeaves]);

    const handleSearchChange = useCallback(
        debounce((value: string) => {
            setSearchTerm(value);
        }, 300),
        []
    );

    const handleChange = useCallback(
        (field: keyof FormData) => (
            event: SelectChangeEvent<string> | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        ) => {
            const value = event.target.value;
            setFormData((prev) => ({ ...prev, [field]: value }));
        },
        []
    );

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isAllDay = event.target.checked;
        setFormData((prev) => ({ ...prev, isAllDay }));

        if (isAllDay) {
            if (!dateRange?.from) {
                setDateRange({
                    from: singleDate || new Date(),
                    to: singleDate || new Date(),
                });
            }
        } else {
            if (dateRange?.from) {
                setSingleDate(dateRange.from);
            }
        }
    };

    const handleDateButtonClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDatePopoverClose = () => {
        setAnchorEl(null);
    };

    const handleTimeChange = (
        setter: React.Dispatch<React.SetStateAction<string>>,
        value: string
    ) => {
        setter(value);
    };

    const handleSingleDateChange = (date: Date | undefined) => {
        setSingleDate(date);
    };

    const handleDateRangeChange = (range: DateRange | undefined) => {
        if (!range?.from) {
            setDateRange(range);
            return;
        }

        if (!range.to) {
            setDateRange(range);
            return;
        }

        const daysDiff = differenceInCalendarDays(range.to, range.from) + 1;

        if (daysDiff > MAX_RANGE_DAYS) {
            setError('You can select a maximum of 1 month only');
        }else{
            setError(null);
        }

        setDateRange(range);
    };

    const calculateTotalDays = () => {
        if (formData.isAllDay) {
            if (!dateRange?.from || !dateRange?.to) return '0.00';
            const diffDays = differenceInDays(dateRange.to, dateRange.from) + 1;
            return diffDays.toFixed(2);
        }
        if (!singleDate) return '0.00';
        const start = new Date(`${format(singleDate, 'yyyy-MM-dd')}T${startTime}:00`);
        const end = new Date(`${format(singleDate, 'yyyy-MM-dd')}T${endTime}:00`);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs < 0) return '0.00';
        const diffHours = diffMs / (1000 * 60 * 60);
        return (diffHours / 24).toFixed(2);
    };

    const getDateButtonText = () => {
        if (formData.isAllDay) {
            if (dateRange?.from && dateRange?.to) {
                if (format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')) {
                    return format(dateRange.from, 'dd/MM/yyyy');
                }
                return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
            }
            return format(new Date(), 'dd/MM/yyyy');
        }
        return singleDate ? format(singleDate, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.userId || !formData.leaveId) {
            setError('Please fill out all required fields');
            return;
        }
        if (formData.isAllDay && (!dateRange?.from || !dateRange?.to)) {
            setError('Please select a valid date range');
            return;
        }
        if (!formData.isAllDay && !singleDate) {
            setError('Please select a valid date');
            return;
        }
        if (!formData.isAllDay) {
            const start = new Date(`${format(singleDate!, 'yyyy-MM-dd')}T${startTime}:00`);
            const end = new Date(`${format(singleDate!, 'yyyy-MM-dd')}T${endTime}:00`);
            if (end <= start) {
                setError('End time must be after start time');
                return;
            }
        }

        const params: any = {
            user_id: Number(formData.userId),
            leave_id: Number(formData.leaveId),
            is_allday_leave: formData.isAllDay,
            start_date: formData.isAllDay
                ? dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : null
                : format(singleDate!, 'dd/MM/yyyy'),
            end_date: formData.isAllDay
                ? dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : null
                : format(singleDate!, 'dd/MM/yyyy'),
            start_time: formData.isAllDay ? null : startTime,
            end_time: formData.isAllDay ? null : endTime,
            total_time_of_days: calculateTotalDays(),
            manager_note: formData.managerNote,
        };

        if (isEditMode) {
            params.user_leave_id = leaveData.user_leave_id;
        }

        setLoading(true);
        setError(null);

        try {
            const endpoint = isEditMode ? '/user-leaves/update-leave' : '/user-leaves/add-leave';
            const response: AxiosResponse<any> = await api.post(endpoint, params);

            if (response.data.IsSuccess) {
                onClose();
            } else {
                setError(`Failed to ${isEditMode ? 'update' : 'add'} leave. Please try again.`);
            }
        } catch (error: any) {
            const errorMessage =
                error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} leave. Please try again.`;
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((user) =>
        (user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
    );

    const getUserName = (user: User) =>
        user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';

    const open = Boolean(anchorEl);

    if (loading && !users.length && !leaves.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                bgcolor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '550px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            <Box
                display="flex"
                alignItems="center"
                gap={1.5}
                px={3}
                py={2}
                borderBottom="1px solid #f0f0f0"
            >
                <IconButton onClick={onClose} size="small" sx={{ p: 0.5, color: '#666' }}>
                    <IconX size={20} />
                </IconButton>
                <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ fontSize: '18px', color: '#1a1a1a' }}
                    component="div"
                >
                    {isEditMode ? 'Edit Leave' : 'Add Leave'}
                </Typography>
            </Box>

            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {error && (
                    <Box px={3} pt={2}>
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </Box>
                )}

                <Box px={3} py={2.5}>
                    <Box
                        display="grid"
                        gridTemplateColumns="140px 1fr"
                        alignItems="center"
                        gap={2}
                        mb={2}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#1a1a1a"
                            component="div"
                        >
                            Select user
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                name="userId"
                                value={formData.userId}
                                onChange={handleChange('userId')}
                                displayEmpty
                                size="small"
                                disabled={isEditMode}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#bdbdbd',
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#50ABFF',
                                    },
                                }}
                                MenuProps={{
                                    PaperProps: { style: { maxHeight: 400 } },
                                    autoFocus: false,
                                }}
                                renderValue={(selected) => {
                                    if (!selected)
                                        return (
                                            <Typography color="#999" component="span">
                                                Select user
                                            </Typography>
                                        );
                                    const user = users.find((u) => u.id === Number(selected));
                                    return (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar
                                                src={user?.user_image || user?.image}
                                                sx={{ width: 24, height: 24, fontSize: '12px' }}
                                            >
                                                {user?.first_name?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Typography sx={{ fontSize: '14px' }} component="span">
                                                {getUserName(user || ({} as User))}
                                            </Typography>
                                        </Box>
                                    );
                                }}
                            >
                                <Box
                                    px={2}
                                    py={1.5}
                                    position="sticky"
                                    top={0}
                                    bgcolor="white"
                                    zIndex={1}
                                >
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Search user"
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <SearchIcon sx={{ color: '#999', fontSize: 20 }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e0e0e0' },
                                                '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                            },
                                        }}
                                    />
                                </Box>
                                {filteredUsers.length === 0 ? (
                                    <MenuItem disabled>
                                        <Typography color="text.secondary" component="span">
                                            No users found
                                        </Typography>
                                    </MenuItem>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <MenuItem key={user.id} value={user.id.toString()}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar
                                                    src={user.user_image || user.image}
                                                    sx={{ width: 32, height: 32, fontSize: '14px' }}
                                                >
                                                    {user.first_name?.[0]?.toUpperCase()}
                                                </Avatar>
                                                <Typography component="span">
                                                    {getUserName(user)}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box
                        display="grid"
                        gridTemplateColumns="140px 1fr"
                        alignItems="center"
                        gap={2}
                        mb={2}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#1a1a1a"
                            component="div"
                        >
                            Leave type
                        </Typography>
                        <FormControl fullWidth>
                            <Select
                                name="leaveId"
                                value={formData.leaveId}
                                onChange={handleChange('leaveId')}
                                displayEmpty
                                size="small"
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#bdbdbd',
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#50ABFF',
                                    },
                                }}
                                MenuProps={{
                                    PaperProps: { style: { maxHeight: 400 } },
                                    autoFocus: false,
                                }}
                                renderValue={(selected) => {
                                    if (!selected)
                                        return (
                                            <Typography color="#999" component="span">
                                                Select leave
                                            </Typography>
                                        );
                                    const leave = leaves.find((u) => u.id === Number(selected));
                                    return (
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography sx={{ fontSize: '14px' }} component="span">
                                                {leave?.name}
                                            </Typography>
                                        </Box>
                                    );
                                }}
                            >
                                {leaves.length === 0 ? (
                                    <MenuItem disabled>
                                        <Typography color="text.secondary" component="span">
                                            No leaves found
                                        </Typography>
                                    </MenuItem>
                                ) : (
                                    leaves.map((leave) => (
                                        <MenuItem key={leave.id} value={leave.id.toString()}>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Typography component="span">
                                                    {leave.name}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    {formData.leaveId && (
                        <>
                            <Divider sx={{ mb: 2 }} />

                            <Box
                                display="grid"
                                gridTemplateColumns="140px 1fr"
                                alignItems="center"
                                gap={2}
                                mb={2}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="#1a1a1a"
                                    component="div"
                                >
                                    All day time off
                                </Typography>
                                <Box textAlign="right">
                                    <IOSSwitch
                                        checked={formData.isAllDay}
                                        onChange={handleSwitchChange}
                                    />
                                </Box>
                            </Box>

                            <Divider sx={{ mb: 2 }} />

                            <Box
                                display="grid"
                                gridTemplateColumns="170px 1fr"
                                alignItems="center"
                                gap={2}
                                mb={2}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color="#1a1a1a"
                                    component="div"
                                >
                                    Date and time of time off
                                </Typography>
                                <Box textAlign="right">
                                    <Button
                                        onClick={handleDateButtonClick}
                                        variant="outlined"
                                        sx={{
                                            width: 'fit-content',
                                            justifyContent: 'space-between',
                                            textTransform: 'none',
                                            color: '#1a1a1a',
                                            borderColor: '#e0e0e0',
                                            bgcolor: 'white',
                                            '&:hover': {
                                                borderColor: '#e0e0e0',
                                                bgcolor: 'white',
                                                color: '#1a1a1a',
                                            },
                                            fontSize: '14px',
                                            fontWeight: 400,
                                        }}
                                    >
                                        {getDateButtonText()}
                                    </Button>
                                </Box>
                            </Box>

                            <Popover
                                open={open}
                                anchorEl={anchorEl}
                                onClose={handleDatePopoverClose}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'left',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'left',
                                }}
                                PaperProps={{
                                    sx: {
                                        mt: 1,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                        borderRadius: '8px',
                                    },
                                }}
                            >
                                <StyledDayPicker>
                                    {formData.isAllDay ? (
                                        <DayPicker
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={handleDateRangeChange}
                                            showOutsideDays
                                            defaultMonth={dateRange?.from || today}
                                            fromDate={minSelectableDate}
                                            toDate={maxSelectableDate}
                                            disabled={(day) => day < minSelectableDate || day > maxSelectableDate}
                                            modifiersClassNames={{
                                                selected: 'rdp-day_selected',
                                                range_start: 'rdp-day_selected',
                                                range_end: 'rdp-day_selected',
                                            }}
                                        />
                                    ) : (
                                        <DayPicker
                                            mode="single"
                                            selected={singleDate}
                                            onSelect={handleSingleDateChange}
                                            showOutsideDays
                                            defaultMonth={singleDate || new Date()}
                                            modifiersClassNames={{
                                                selected: 'rdp-day_selected',
                                            }}
                                        />
                                    )}
                                </StyledDayPicker>
                            </Popover>

                            {!formData.isAllDay && (
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={2}
                                    mb={2}
                                    justifyContent="center"
                                >
                                    {/* START TIME */}
                                    <TextField
                                        type="text"
                                        value={startTime}
                                        placeholder="HH:MM"
                                        size="small"
                                        onChange={(e) => {
                                            const cleanValue = e.target.value.replace(/[^0-9:]/g, '');
                                            setStartTime(cleanValue);
                                        }}
                                        onBlur={() => {
                                            const formatted = validateAndFormatTime(startTime);
                                            if (formatted) {
                                                setStartTime(formatted);
                                            } else {
                                                setStartTime(''); // or revert to previous value
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const formatted = validateAndFormatTime(startTime);
                                                if (formatted) setStartTime(formatted);
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setStartTime('');
                                            }
                                        }}
                                        sx={{
                                            width: '180px',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e0e0e0' },
                                                '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                            },
                                            '& .MuiInputBase-input': {
                                                textAlign: 'center',
                                            },
                                        }}
                                    />

                                    <Typography color="#666" sx={{ fontSize: '14px' }}>
                                        to
                                    </Typography>

                                    {/* END TIME */}
                                    <TextField
                                        type="text"
                                        value={endTime}
                                        placeholder="HH:MM"
                                        size="small"
                                        onChange={(e) => {
                                            const cleanValue = e.target.value.replace(/[^0-9:]/g, '');
                                            setEndTime(cleanValue);
                                        }}
                                        onBlur={() => {
                                            const formatted = validateAndFormatTime(endTime);
                                            if (formatted) {
                                                setEndTime(formatted);
                                            } else {
                                                setEndTime('');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const formatted = validateAndFormatTime(endTime);
                                                if (formatted) setEndTime(formatted);
                                            }
                                            if (e.key === 'Escape') {
                                                e.preventDefault();
                                                setEndTime('');
                                            }
                                        }}
                                        sx={{
                                            width: '180px',
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: '#e0e0e0' },
                                                '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                            },
                                            '& .MuiInputBase-input': {
                                                textAlign: 'center',
                                            },
                                        }}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </Box>

                {formData.leaveId && (
                    <Box
                        display="grid"
                        gridTemplateColumns="140px 1fr"
                        alignItems="center"
                        gap={2}
                        sx={{
                            backgroundColor: '#f6f6f6',
                            borderTop: '1px solid #e0e0e0',
                            borderBottom: '1px solid #e0e0e0',
                            paddingX: '24px',
                            paddingY: '16px',
                        }}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#1a1a1a"
                            component="div"
                        >
                            Total time off days
                        </Typography>
                        <Box textAlign="right">
                            <Typography
                                sx={{ fontSize: '14px', color: '#1a1a1a' }}
                                fontWeight={600}
                                component="span"
                            >
                                {calculateTotalDays()} work days
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Box
                    sx={{
                        paddingX: '24px',
                        paddingY: '16px',
                    }}
                >
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        name="managerNote"
                        placeholder="Add manager note"
                        value={formData.managerNote}
                        onChange={handleChange('managerNote')}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#e0e0e0' },
                                '&:hover fieldset': { borderColor: '#bdbdbd' },
                                '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                            },
                        }}
                    />
                </Box>
            </Box>

            <Box
                display="flex"
                gap={2}
                px={3}
                py={2.5}
                borderTop="1px solid #f0f0f0"
                sx={{
                    bgcolor: '#fafafa',
                    paddingX: '24px',
                    paddingY: '16px',
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
                }}
            >
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!formData.userId || !formData.leaveId || loading || error}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        bgcolor: !formData.userId || !formData.leaveId ? '#e0e0e0' : '#1e4db7',
                        color: 'white',
                        boxShadow: 'none',
                        px: 3,
                        '&:hover': {
                            bgcolor: !formData.userId || !formData.leaveId ? '#e0e0e0' : '#1e4db7',
                            boxShadow: 'none',
                        },
                        '&:disabled': {
                            bgcolor: '#e0e0e0',
                            color: '#999',
                        },
                    }}
                >
                    {loading ? <CircularProgress size={24} /> : isEditMode ? 'Update Leave' : 'Add Leave'}
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={onClose}
                    disabled={loading}
                >
                    Cancel
                </Button>
            </Box>
        </Box>
    );
};

export default AddLeave;
