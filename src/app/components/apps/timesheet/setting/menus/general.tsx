'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box,
    Checkbox,
    Select,
    MenuItem,
    TextField,
    Typography,
    Divider,
    Tooltip,
    InputAdornment,
    ListSubheader,
    FormControl,
    Button,
    SelectChangeEvent,
    CircularProgress,
} from '@mui/material';
import { IconHelp } from '@tabler/icons-react';
import SearchIcon from '@mui/icons-material/Search';
import api from '@/utils/axios';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { TimePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';

interface Timezone {
    id: string | number;
    value: string;
    name?: string;
}

interface CompanyUser {
    id: string;
    name: string;
}

interface CompanySettings {
    dayLength: number[];
    dailyLimit: string;
    autoClockOut: string;
    showDiff: boolean;
    workDays: boolean[];
    timeZone: string;
    users: string[];
    highlightMore: boolean;
    highlightLess: boolean;
    moreThanMinutes: number;
    lessThanMinutes: number;
    roundingIncrement: number;
    showTimesheetRound: boolean;
    isDayLimit: boolean;
    isAutoClock: boolean;
    startTime: string | null;
    endTime: string | null;
}

interface GeneralSettingProps {
    onSaveSuccess: () => void;
}

interface WorkDaySelectorProps {
    workDays: boolean[];
    dayLength: number[];
    onDayClick: (index: number) => void;
    onDayLengthChange: (index: number, value: string) => void;
}

interface SettingsState extends CompanySettings {
    isSaving: boolean;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

const ROUNDING_OPTIONS = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
] as const;

const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hours = 2; hours <= 16; hours++) {
        for (let minutes = 0; minutes < 60; minutes += 30) {
            const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} Hours`;
            options.push(time);
        }
    }
    return options;
};

const parseTimeString = (timeString: string | null): Dayjs | null => {
    if (!timeString) return null;
    const parsed = dayjs(timeString, 'HH:mm');
    return parsed.isValid() ? parsed : null;
};

const getDefaultSettings = (): Omit<SettingsState, 'isSaving'> => ({
    dayLength: [8, 8, 8, 8, 8, 8, 8],
    dailyLimit: '12:00 Hours',
    autoClockOut: '13:00 Hours',
    showDiff: false,
    workDays: [false, true, true, true, true, true, false],
    timeZone: '',
    users: [],
    highlightMore: false,
    highlightLess: false,
    moreThanMinutes: 10,
    lessThanMinutes: 0,
    roundingIncrement: 5,
    showTimesheetRound: false,
    isDayLimit: false,
    isAutoClock: false,
    startTime: '09:00',
    endTime: '17:00',
});

const WorkDaySelector = React.memo<WorkDaySelectorProps>(({ workDays, dayLength, onDayClick, onDayLengthChange }) => {
    const selectedCount = useMemo(() => workDays.filter(Boolean).length, [workDays]);

    return (
        <Box display="flex" gap={3} sx={{ height: 90 }}>
            {DAYS.map((day, index) => {
                const isSelected = workDays[index];
                const canToggle = selectedCount > 1 || !isSelected;

                return (
                    <Box
                        key={index}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ width: 32 }}
                    >
                        <Box
                            onClick={() => canToggle && onDayClick(index)}
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#1976d2' : '#e0e0e0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isSelected ? 'white' : '#666',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                cursor: canToggle ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    backgroundColor: isSelected
                                        ? '#1565c0'
                                        : canToggle ? '#d5d5d5' : '#e0e0e0',
                                },
                            }}
                            title={canToggle
                                ? `Click to toggle ${DAY_NAMES[index]}`
                                : 'At least one day must be selected'
                            }
                        >
                            {day}
                        </Box>
                        <Typography sx={{ backgroundColor: '#d3d3d3', width: '1px', height: '26px' }} />
                        <TextField
                            type="text"
                            value={dayLength[index]}
                            onChange={(e) => onDayLengthChange(index, e.target.value)}
                            size="small"
                            disabled={!isSelected}
                            sx={{
                                width: 32,
                                '& .MuiOutlinedInput-root': { height: 32, fontSize: '0.75rem' },
                                '& .MuiOutlinedInput-input': { textAlign: 'center', padding: '4px 2px' },
                                '& .MuiInputBase-input.Mui-disabled': {
                                    WebkitTextFillColor: '#666',
                                    backgroundColor: '#f5f5f5',
                                },
                            }}
                            inputProps={{ min: 0, max: 24 }}
                        />
                    </Box>
                );
            })}
        </Box>
    );
});

WorkDaySelector.displayName = 'WorkDaySelector';

const useSettingsState = (defaultSettings: Partial<CompanySettings> = {}): [SettingsState, (updates: Partial<SettingsState>) => void] => {
    const [state, setState] = useState<SettingsState>({
        ...getDefaultSettings(),
        ...defaultSettings,
        isSaving: false,
    });

    const updateState = useCallback((updates: Partial<SettingsState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    return [state, updateState];
};

const useApiData = (payRateUsers: CompanyUser[] = []) => {
    const [allTimezones, setAllTimezones] = useState<Timezone[]>([]);
    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchResources = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            const response = await api.get('/setting/resources');
            if (response.data?.IsSuccess) {
                const transformedTimezones: Timezone[] = response.data.timezones.map((tz: any) => ({
                    ...tz,
                    id: String(tz.id),
                }));
                const apiUsers: CompanyUser[] = (response.data.company_users || []).map((user: any) => ({
                    id: String(user.id),
                    name: user.name,
                }));
                const payRateUsersMapped: CompanyUser[] = payRateUsers.map((user: any) => ({
                    id: String(user.user_id),
                    name: user.user_name,
                }));
                const combinedUsers = [
                    ...apiUsers,
                    ...payRateUsersMapped.filter(
                        (payUser) => !apiUsers.some((apiUser) => apiUser.id === payUser.id)
                    ),
                ];
                setAllTimezones(transformedTimezones);
                setCompanyUsers(combinedUsers);
            }
        } catch (error) {
            console.error('Error fetching timesheet data:', error);
        } finally {
            setLoading(false);
        }
    }, [payRateUsers]);

    useEffect(() => {
        if (!loading && allTimezones.length === 0 && companyUsers.length === 0) {
            fetchResources();
        }
    }, [fetchResources, loading, allTimezones.length, companyUsers.length]);

    return { allTimezones, companyUsers, loading };
};

const useCompanySettings = (): { settings: CompanySettings | null; loading: boolean; error: string | null } => {
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCompanySettings = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/setting/get-company-settings');
            if (response.data?.IsSuccess) {
                const apiSettings: CompanySettings = {
                    dayLength: response.data.dayLength || getDefaultSettings().dayLength,
                    dailyLimit: response.data.dailyLimit || getDefaultSettings().dailyLimit,
                    autoClockOut: response.data.autoClockOut || getDefaultSettings().autoClockOut,
                    showDiff: response.data.showDiff ?? getDefaultSettings().showDiff,
                    workDays: response.data.workDays || getDefaultSettings().workDays,
                    timeZone: response.data.timeZone || getDefaultSettings().timeZone,
                    users: response.data.pay_rate_users
                        ? response.data.pay_rate_users.map((user: any) => String(user.user_id))
                        : getDefaultSettings().users,
                    highlightMore: response.data.highlightMore ?? getDefaultSettings().highlightMore,
                    highlightLess: response.data.highlightLess ?? getDefaultSettings().highlightLess,
                    moreThanMinutes: response.data.moreThanMinutes ?? getDefaultSettings().moreThanMinutes,
                    lessThanMinutes: response.data.lessThanMinutes ?? getDefaultSettings().lessThanMinutes,
                    roundingIncrement: response.data.roundingIncrement ?? getDefaultSettings().roundingIncrement,
                    showTimesheetRound: response.data.showTimesheetRound ?? getDefaultSettings().showTimesheetRound,
                    isDayLimit: response.data.isDayLimit ?? getDefaultSettings().isDayLimit,
                    isAutoClock: response.data.isAutoClock ?? getDefaultSettings().isAutoClock,
                    startTime: response.data.startTime || null,
                    endTime: response.data.endTime || null,
                };
                setSettings(apiSettings);
            } else {
                setSettings(getDefaultSettings() as CompanySettings);
            }
        } catch (error) {
            console.error('Error fetching company settings:', error);
            setError('Failed to load company settings');
            setSettings(getDefaultSettings() as CompanySettings);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCompanySettings();
    }, [fetchCompanySettings]);

    return { settings, loading, error };
};

const useSearchableDropdown = () => {
    const [searchText, setSearchText] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    }, []);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setSearchText('');
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setSearchText('');
    }, []);

    return {
        searchText,
        isOpen,
        handleSearchChange,
        handleOpen,
        handleClose,
    };
};

const GeneralSetting: React.FC<GeneralSettingProps> = ({ onSaveSuccess }) => {
    const { settings: companySettings, loading: settingsLoading, error: settingsError } = useCompanySettings();
    const { allTimezones, companyUsers, loading: resourcesLoading } = useApiData(companySettings?.users.map(id => ({
        id,
        name: companySettings?.users.includes(id) ? (companySettings as any).pay_rate_users?.find((u: any) => String(u.user_id) === id)?.user_name || '' : '',
    })) || []);
    const [settings, updateSettings] = useSettingsState(companySettings || undefined);

    const timezoneDropdown = useSearchableDropdown();
    const userDropdown = useSearchableDropdown();

    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const response = await api.get('/setting/get-company-settings');
                if (response.data?.IsSuccess) {
                    const fetchedSettings = response.data.data || {};
                    const payRateUsers = response.data.pay_rate_users || [];

                    updateSettings({
                        dayLength: fetchedSettings.day_length || [8, 8, 8, 8, 8, 8, 8],
                        dailyLimit: fetchedSettings.daily_limit || '12:00 Hours',
                        autoClockOut: fetchedSettings.auto_clock_out || '13:00 Hours',
                        showDiff: fetchedSettings.show_diff || false,
                        workDays: fetchedSettings.work_days || [true, true, true, true, true, true, true],
                        timeZone: fetchedSettings.timezone_id ? String(fetchedSettings.timezone_id) : '',
                        users: payRateUsers.map((user: any) => String(user.user_id)),
                        highlightMore: fetchedSettings.highlight_more || false,
                        highlightLess: fetchedSettings.highlight_less || false,
                        moreThanMinutes: fetchedSettings.more_than_minutes || 10,
                        lessThanMinutes: fetchedSettings.less_than_minutes || 0,
                        roundingIncrement: fetchedSettings.rounding_increment || 5,
                        showTimesheetRound: fetchedSettings.show_timesheet_round || false,
                        isDayLimit: fetchedSettings.is_day_limit || false,
                        isAutoClock: fetchedSettings.is_auto_clock || false,
                        startTime: fetchedSettings.start_time || null,
                        endTime: fetchedSettings.end_time || null,
                        isSaving: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching company general settings:', error);
            }
        };

        fetchCompanySettings();
    }, [updateSettings]);

    const isLoading = settingsLoading || resourcesLoading;
    
    const timeOptions = useMemo(() => generateTimeOptions(), []);

    const filteredTimezones = useMemo(() => {
        if (!timezoneDropdown.searchText) return allTimezones;
        return allTimezones.filter(tz =>
            tz.value.toLowerCase().includes(timezoneDropdown.searchText.toLowerCase())
        );
    }, [allTimezones, timezoneDropdown.searchText]);

    const filteredUsers = useMemo(() => {
        if (!userDropdown.searchText) return companyUsers;
        return companyUsers.filter(cu =>
            cu.name.toLowerCase().includes(userDropdown.searchText.toLowerCase())
        );
    }, [companyUsers, userDropdown.searchText]);

    const startTimeObj = useMemo(() => parseTimeString(settings.startTime), [settings.startTime]);
    const endTimeObj = useMemo(() => parseTimeString(settings.endTime), [settings.endTime]);
    
    const styles = useMemo(() => ({
        sharedSelectStyles: {
            minWidth: 100,
            height: 32,
            fontSize: '0.875rem',
        },
        dropdownMenuProps: {
            PaperProps: {
                style: {
                    maxHeight: 300,
                    minWidth: 120,
                },
            },
            anchorOrigin: {
                vertical: 'bottom' as const,
                horizontal: 'left' as const,
            },
            transformOrigin: {
                vertical: 'top' as const,
                horizontal: 'left' as const,
            },
        },
        tooltipStyles: {
            tooltip: {
                sx: {
                    backgroundColor: '#1a1f29',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    maxWidth: 320,
                    p: '10px 14px',
                    borderRadius: '6px',
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.25)',
                    whiteSpace: 'normal',
                },
            },
            arrow: { sx: { color: '#1a1f29' } },
        },
        selectMenuProps: {
            PaperProps: {
                sx: {
                    maxHeight: 300,
                    minWidth: 250,
                    mt: -0.5,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                },
            },
            anchorOrigin: {
                vertical: 'top' as const,
                horizontal: 'left' as const,
            },
            transformOrigin: {
                vertical: 'bottom' as const,
                horizontal: 'left' as const,
            },
            autoFocus: false,
        },
    }), []);
    
    const createCheckboxHandler = useCallback((field: keyof SettingsState) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            updateSettings({ [field]: event.target.checked });
        }, [updateSettings]);

    const createNumberInputHandler = useCallback((field: keyof SettingsState) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(event.target.value) || 0;
            updateSettings({ [field]: Math.max(0, value) });
        }, [updateSettings]);

    const createSelectHandler = useCallback((field: keyof SettingsState) =>
        (event: SelectChangeEvent<any>) => {
            updateSettings({ [field]: event.target.value });
        }, [updateSettings]);

    const handleDayClick = useCallback((index: number) => {
        const selectedCount = settings.workDays.filter(Boolean).length;
        if (selectedCount === 1 && settings.workDays[index]) return;

        const updatedWorkDays = [...settings.workDays];
        updatedWorkDays[index] = !updatedWorkDays[index];
        updateSettings({ workDays: updatedWorkDays });
    }, [settings.workDays, updateSettings]);

    const handleDayLengthChange = useCallback((index: number, value: string) => {
        const newValue = Math.max(0, Math.min(24, parseInt(value) || 0));
        const updatedDayLength = [...settings.dayLength];
        updatedDayLength[index] = newValue;
        updateSettings({ dayLength: updatedDayLength });
    }, [settings.dayLength, updateSettings]);

    const handleTimeChange = useCallback((field: 'startTime' | 'endTime') =>
        (newValue: Dayjs | null) => {
            updateSettings({ [field]: newValue ? newValue.format('HH:mm') : null });
        }, [updateSettings]);

    const handleUserChange = useCallback((event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        updateSettings({ users: typeof value === 'string' ? [value] : value });
    }, [updateSettings]);

    const handleSave = useCallback(async () => {
        try {
            updateSettings({ isSaving: true });

            const payload = {
                workDays: settings.workDays,
                dayLength: settings.dayLength,
                startTime: settings.startTime,
                endTime: settings.endTime,
                isDayLimit: settings.isDayLimit,
                dailyLimit: settings.dailyLimit,
                isAutoClock: settings.isAutoClock,
                autoClockOut: settings.autoClockOut,
                showDiff: settings.showDiff,
                highlightMore: settings.highlightMore,
                highlightLess: settings.highlightLess,
                moreThanMinutes: settings.moreThanMinutes,
                lessThanMinutes: settings.lessThanMinutes,
                showTimesheetRound: settings.showTimesheetRound,
                roundingIncrement: settings.roundingIncrement,
                timeZone: settings.timeZone,
                users: settings.users,
            };

            const response = await api.post('/setting/save-general-setting', payload);

            if (response.data?.IsSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            updateSettings({ isSaving: false });
        }
    }, [settings, onSaveSuccess, updateSettings]);

    useEffect(() => {
        if (allTimezones.length > 0 && !allTimezones.some(tz => String(tz.id) === String(settings.timeZone))) {
            updateSettings({ timeZone: String(allTimezones[0].id) });
        }
    }, [allTimezones, settings.timeZone, updateSettings]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
            </Box>
        );
    }

    if (settingsError) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="error">{settingsError}</Typography>
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Scrollable Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: 'white' }}>
                    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                        {/* Work Days Section */}
                        <Box mb={4}>
                            <Box display="flex" gap={4} alignItems="stretch">
                                <Box display="flex" flexDirection="column" justifyContent="space-between" sx={{ width: 120 }}>
                                    <Typography variant="body2" color="text.primary"
                                                sx={{ height: 32, display: 'flex', alignItems: 'center' }}>
                                        Work days:
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1} sx={{ height: 32 }}>
                                        <Typography variant="body2" color="text.primary">Day length:</Typography>
                                        <Tooltip
                                            componentsProps={styles.tooltipStyles}
                                            title={
                                                <>
                                                    Determine how many hours each work day equals by default,
                                                    while the longest day represents a full work day. <br />
                                                    For example, if a full work day (the longest day) is 8 hours
                                                    and the day length for Friday is 4 hours, a time off on Friday
                                                    will be displayed as half a day (4 divided by 8).
                                                </>
                                            }
                                            arrow
                                            placement="top"
                                        >
                                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <IconHelp size={16} color="#9e9e9e" />
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                </Box>
                                <WorkDaySelector
                                    workDays={settings.workDays}
                                    dayLength={settings.dayLength}
                                    onDayClick={handleDayClick}
                                    onDayLengthChange={handleDayLengthChange}
                                />
                            </Box>
                        </Box>

                        {/* Default Work Day Hours */}
                        <Box mb={4}>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Typography variant="body2" color="text.primary">Default work day hours:</Typography>
                                <Tooltip componentsProps={styles.tooltipStyles} title="Set the default work hours when adding new shifts"
                                         arrow placement="top">
                                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <IconHelp size={16} color="#9e9e9e" />
                                    </Box>
                                </Tooltip>
                            </Box>
                            <Box display="flex" alignItems="center" gap={3}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" color="text.secondary">From:</Typography>
                                    <TimePicker
                                        value={startTimeObj}
                                        onChange={handleTimeChange('startTime')}
                                        ampm={false}
                                        format="HH:mm"
                                        viewRenderers={{
                                            hours: renderTimeViewClock,
                                            minutes: renderTimeViewClock,
                                            seconds: renderTimeViewClock,
                                        }}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: {
                                                    '& .MuiSvgIcon-root': {
                                                        width: '18px',
                                                        height: '18px',
                                                    },
                                                    '& .MuiFormHelperText-root': {
                                                        display: 'none',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" color="text.secondary">To:</Typography>
                                    <TimePicker
                                        value={endTimeObj}
                                        onChange={handleTimeChange('endTime')}
                                        ampm={false}
                                        format="HH:mm"
                                        viewRenderers={{
                                            hours: renderTimeViewClock,
                                            minutes: renderTimeViewClock,
                                            seconds: renderTimeViewClock,
                                        }}
                                        slotProps={{
                                            textField: {
                                                size: 'small',
                                                sx: {
                                                    '& .MuiSvgIcon-root': {
                                                        width: '18px',
                                                        height: '18px',
                                                    },
                                                    '& .MuiFormHelperText-root': {
                                                        display: 'none',
                                                    },
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Overtime & Pay Rules */}
                        <Box py={4}>
                            <Typography variant="body1" color="text.primary" mb={1}>Overtime & Pay rules</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ensure fair compensation by setting up overtime rules and policies.
                            </Typography>
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Daily Limit & Auto Clock Out */}
                        <Box py={3}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                                <Box display="flex" alignItems="center">
                                    <Checkbox
                                        checked={settings.isDayLimit}
                                        onChange={createCheckboxHandler('isDayLimit')}
                                        sx={{ p: 0, mr: 1 }}
                                        size="small"
                                    />
                                    <Box>
                                        <Typography variant="body2">Daily limit</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            You'll be notified when a limit is exceeded
                                        </Typography>
                                    </Box>
                                </Box>
                                <Select
                                    value={settings.dailyLimit}
                                    onChange={createSelectHandler('dailyLimit')}
                                    size="small"
                                    sx={styles.sharedSelectStyles}
                                    MenuProps={styles.dropdownMenuProps}
                                    disabled={!settings.isDayLimit}
                                >
                                    {timeOptions.map((option) => (
                                        <MenuItem key={option} value={option} sx={{ fontSize: 14 }}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </Box>

                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
                                <Box display="flex" alignItems="center">
                                    <Checkbox
                                        checked={settings.isAutoClock}
                                        onChange={createCheckboxHandler('isAutoClock')}
                                        sx={{ p: 0, mr: 1 }}
                                        size="small"
                                    />
                                    <Box>
                                        <Typography variant="body2">Auto clock out</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Employees exceeding daily limit, will be automatically clocked out
                                        </Typography>
                                    </Box>
                                </Box>
                                <Select
                                    value={settings.autoClockOut}
                                    onChange={createSelectHandler('autoClockOut')}
                                    size="small"
                                    sx={styles.sharedSelectStyles}
                                    MenuProps={styles.dropdownMenuProps}
                                    disabled={!settings.isAutoClock}
                                >
                                    {timeOptions.map((option) => (
                                        <MenuItem key={option} value={option} sx={{ fontSize: 14 }}>{option}</MenuItem>
                                    ))}
                                </Select>
                            </Box>

                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Checkbox
                                    checked={settings.showDiff}
                                    onChange={createCheckboxHandler('showDiff')}
                                    sx={{ p: 0, mr: 1 }}
                                    size="small"
                                />
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="body2">
                                        Show the difference between scheduled and actual work time
                                    </Typography>
                                    <IconHelp size={16} color="#9e9e9e" />
                                </Box>
                            </Box>

                            {settings.showDiff && (
                                <Box sx={{ backgroundColor: '#f6f7f7', padding: 1 }} width="max-content">
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <Checkbox
                                            checked={settings.highlightMore}
                                            onChange={createCheckboxHandler('highlightMore')}
                                            sx={{ p: 0, mr: 1 }}
                                            size="small"
                                        />
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Typography variant="body2">Highlight if employee worked</Typography>
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                type="number"
                                                value={settings.moreThanMinutes}
                                                onChange={createNumberInputHandler('moreThanMinutes')}
                                                disabled={!settings.highlightMore}
                                                inputProps={{
                                                    style: { width: '40px', backgroundColor: '#fff' },
                                                    min: 0
                                                }}
                                            />
                                            <Typography variant="body2">minutes more than scheduled</Typography>
                                        </Box>
                                    </Box>
                                    <Box display="flex" alignItems="center" mb={2}>
                                        <Checkbox
                                            checked={settings.highlightLess}
                                            onChange={createCheckboxHandler('highlightLess')}
                                            sx={{ p: 0, mr: 1 }}
                                            size="small"
                                        />
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <Typography variant="body2">Highlight if employee worked</Typography>
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                type="number"
                                                value={settings.lessThanMinutes}
                                                onChange={createNumberInputHandler('lessThanMinutes')}
                                                disabled={!settings.highlightLess}
                                                inputProps={{
                                                    style: { width: '40px', backgroundColor: '#fff' },
                                                    min: 0
                                                }}
                                            />
                                            <Typography variant="body2">minutes less than scheduled</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Timesheet Rounding */}
                        <Box py={3}>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Checkbox
                                    checked={settings.showTimesheetRound}
                                    onChange={createCheckboxHandler('showTimesheetRound')}
                                    sx={{ p: 0, mr: 1 }}
                                    size="small"
                                />
                                <Box>
                                    <Typography variant="body2">Timesheets rounding</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        We recommend you consult a labor or employment attorney in your country to ensure that you comply with rounding regulations.
                                    </Typography>
                                </Box>
                            </Box>

                            {settings.showTimesheetRound && (
                                <Box width="max-content">
                                    <Box display="flex" alignItems="center" mb={1}>
                                        <Typography variant="body2">Automatically round start & end times to the nearest</Typography>
                                        <FormControl sx={{ m: 1, minWidth: 80 }} size="small">
                                            <Select
                                                value={settings.roundingIncrement}
                                                onChange={createSelectHandler('roundingIncrement')}
                                                sx={{ backgroundColor: '#fff' }}
                                            >
                                                {ROUNDING_OPTIONS.map(({ value, label }) => (
                                                    <MenuItem key={value} value={value}>{label}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Typography variant="body2">increment</Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" sx={{ backgroundColor: '#fff1b8', padding: 1 }}>
                                        <IconHelp size={18} />
                                        <Typography ml={1} variant="body2">
                                            Changes will apply to all current and past timesheets
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Show Pay Rates & Export Format */}
                        <Box mb={4}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="body2">Show pay rates</Typography>
                                <Select
                                    multiple
                                    value={settings.users}
                                    onChange={handleUserChange}
                                    open={userDropdown.isOpen}
                                    onOpen={userDropdown.handleOpen}
                                    onClose={userDropdown.handleClose}
                                    size="small"
                                    displayEmpty
                                    renderValue={(selected) => {
                                        if (selected.length === 0) {
                                            return 'Select Users';
                                        }
                                        return selected
                                            .map((id) => companyUsers.find((cu) => cu.id === id)?.name || '')
                                            .filter(Boolean)
                                            .join(', ');
                                    }}
                                    sx={{
                                        width: 200,
                                        '& .MuiOutlinedInput-root': {
                                            height: 40,
                                            fontSize: '0.875rem',
                                        },
                                        '& .MuiSelect-select': {
                                            padding: '8px 12px',
                                        },
                                    }}
                                    MenuProps={styles.selectMenuProps}
                                >
                                    <ListSubheader
                                        sx={{
                                            bgcolor: 'background.paper',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            padding: '8px 16px',
                                            borderBottom: '1px solid #e0e0e0',
                                        }}
                                    >
                                        <TextField
                                            size="small"
                                            placeholder="Search user..."
                                            fullWidth
                                            value={userDropdown.searchText}
                                            onChange={userDropdown.handleSearchChange}
                                            variant="outlined"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ color: 'action.active', fontSize: 20 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    height: 36,
                                                    fontSize: '0.875rem',
                                                    '& fieldset': {
                                                        borderColor: '#e0e0e0',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: '#bdbdbd',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#1976d2',
                                                        borderWidth: 1,
                                                    },
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    padding: '8px 12px',
                                                },
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </ListSubheader>

                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((cu) => (
                                            <MenuItem
                                                key={cu.id}
                                                value={cu.id}
                                                sx={{
                                                    fontSize: '0.875rem',
                                                    padding: '10px 16px',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                    },
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(25, 118, 210, 0.16)',
                                                        },
                                                    },
                                                }}
                                            >
                                                {cu.name}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled sx={{ fontSize: '0.875rem', padding: '10px 16px' }}>
                                            No user found
                                        </MenuItem>
                                    )}
                                </Select>
                            </Box>

                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="body2" color="text.primary">Timesheet & payroll export format</Typography>
                                <Select value="time" size="small" sx={{ width: 150, ...styles.sharedSelectStyles }}>
                                    <MenuItem value="time">Time 04:30</MenuItem>
                                    <MenuItem value="decimal">Decimal 4.5</MenuItem>
                                </Select>
                            </Box>

                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="body2" color="text.primary">Time zone</Typography>
                                <Select
                                    value={settings.timeZone}
                                    onChange={createSelectHandler('timeZone')}
                                    open={timezoneDropdown.isOpen}
                                    onOpen={timezoneDropdown.handleOpen}
                                    onClose={timezoneDropdown.handleClose}
                                    size="small"
                                    displayEmpty
                                    sx={{
                                        width: 200,
                                        '& .MuiOutlinedInput-root': {
                                            height: 40,
                                            fontSize: '0.875rem',
                                        },
                                        '& .MuiSelect-select': {
                                            padding: '8px 12px',
                                        },
                                    }}
                                    MenuProps={styles.selectMenuProps}
                                >
                                    <MenuItem value="" disabled sx={{ display: 'none' }}>
                                        Select Timezone
                                    </MenuItem>

                                    <ListSubheader
                                        sx={{
                                            bgcolor: 'background.paper',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 1,
                                            padding: '8px 16px',
                                            borderBottom: '1px solid #e0e0e0',
                                        }}
                                    >
                                        <TextField
                                            size="small"
                                            placeholder="Search timezone..."
                                            fullWidth
                                            value={timezoneDropdown.searchText}
                                            onChange={timezoneDropdown.handleSearchChange}
                                            variant="outlined"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ color: 'action.active', fontSize: 20 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    height: 36,
                                                    fontSize: '0.875rem',
                                                    '& fieldset': {
                                                        borderColor: '#e0e0e0',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: '#bdbdbd',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#1976d2',
                                                        borderWidth: 1,
                                                    },
                                                },
                                                '& .MuiOutlinedInput-input': {
                                                    padding: '8px 12px',
                                                },
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </ListSubheader>

                                    {filteredTimezones.length > 0 ? (
                                        filteredTimezones.map((tz) => (
                                            <MenuItem
                                                key={tz.id}
                                                value={tz.id}
                                                sx={{
                                                    fontSize: '0.875rem',
                                                    padding: '10px 16px',
                                                    '&:hover': {
                                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                                    },
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(25, 118, 210, 0.16)',
                                                        },
                                                    },
                                                }}
                                            >
                                                {tz.value}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled sx={{ fontSize: '0.875rem', padding: '10px 16px' }}>
                                            No timezones found
                                        </MenuItem>
                                    )}
                                </Select>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Fixed Footer with Save Button */}
                <Box
                    sx={{
                        borderTop: '1px solid #e0e0e0',
                        p: 2,
                        bgcolor: '#fff',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 1000,
                        textAlign: 'right',
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={settings.isSaving || isLoading}
                        sx={{
                            bgcolor: '#1976d2',
                            color: '#fff',
                            '&:hover': {
                                bgcolor: '#1565c0',
                            },
                            '&:disabled': {
                                bgcolor: '#ccc',
                            },
                        }}
                    >
                        {settings.isSaving ? (
                            <>
                                <CircularProgress size={16} sx={{ mr: 1, color: 'inherit' }} />
                                Saving...
                            </>
                        ) : (
                            'Save changes'
                        )}
                    </Button>
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default GeneralSetting;
