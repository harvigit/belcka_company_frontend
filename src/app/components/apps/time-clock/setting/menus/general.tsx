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
    InputAdornment,
    ListSubheader,
    FormControl,
    Button,
    SelectChangeEvent,
    CircularProgress,
    Tooltip,
    Avatar,
    ListItemText,
} from '@mui/material';
import { IconHelp } from '@tabler/icons-react';
import SearchIcon from '@mui/icons-material/Search';
import api from '@/utils/axios';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs, { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { normalizeStartWorkAllowedFrom } from '@/app/components/apps/time-tracking/startWorkWindow';

interface Timezone {
    id: string | number;
    value: string;
    name?: string;
}

interface CompanyUser {
    id: string;
    name: string;
    user_image?: string | null;
    user_thumb_image?: string | null;
}

interface CompanySettings {
    dailyLimit: string;
    autoClockOut: number;
    showDiff: boolean;
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
    payRatePermission: boolean;
    exportFormat: string;
    leave_limit: number;
    isStartWorkAllowedFrom: boolean;
    startWorkAllowedFrom: string;
    startWorkExemptUserIds: string[];
}

interface GeneralSettingProps {
    onSaveSuccess: () => void;
}

interface SettingsState extends CompanySettings {
    isSaving: boolean;
}

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

const getDefaultSettings = (): Omit<SettingsState, 'isSaving'> => ({
    dailyLimit: '12:00 Hours',
    autoClockOut: 1,
    showDiff: false,
    timeZone: '',
    users: [],
    highlightMore: false,
    highlightLess: false,
    moreThanMinutes: 0,
    lessThanMinutes: 0,
    roundingIncrement: 5,
    showTimesheetRound: false,
    isDayLimit: false,
    isAutoClock: false,
    payRatePermission: true,
    exportFormat: 'time',
    leave_limit: 0,
    isStartWorkAllowedFrom: false,
    startWorkAllowedFrom: '07:00',
    startWorkExemptUserIds: [],
});

const toUserIdStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((id) => String(id)) : [];

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
                    user_image: user.user_image || null
                }));
                const payRateUsersMapped: CompanyUser[] = payRateUsers.map((user: any) => ({
                    id: String(user.user_id),
                    name: user.user_name,
                    user_image: user.user_image || null
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
                    dailyLimit: response.data.dailyLimit || getDefaultSettings().dailyLimit,
                    autoClockOut: Number(response.data.autoClockOut) || getDefaultSettings().autoClockOut,
                    showDiff: response.data.showDiff ?? getDefaultSettings().showDiff,
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
                    payRatePermission: response.data.pay_rate_permission || 'view',
                    exportFormat: response.data.export_format || 'time',
                    leave_limit: response.data?.data?.leave_limit ?? 0,
                    isStartWorkAllowedFrom: normalizeStartWorkAllowedFrom(response.data?.data?.start_work_allowed_from) != null,
                    startWorkAllowedFrom: normalizeStartWorkAllowedFrom(response.data?.data?.start_work_allowed_from)
                        ?? getDefaultSettings().startWorkAllowedFrom,
                    startWorkExemptUserIds: toUserIdStrings(response.data?.data?.start_work_exempt_user_ids),
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
    const { t } = useTranslation();
    const { settings: companySettings, loading: settingsLoading, error: settingsError } = useCompanySettings();
    const { allTimezones, companyUsers, loading: resourcesLoading } = useApiData(companySettings?.users.map(id => ({
        id,
        name: companySettings?.users.includes(id) ? (companySettings as any).pay_rate_users?.find((u: any) => String(u.user_id) === id)?.user_name || '' : '',
    })) || []);
    const [settings, updateSettings] = useSettingsState(companySettings || undefined);
    const session = useSession();
    const user = session.data?.user as User & { user_role_id?: number | null } & {id: number } & { company_id: number};

    const timezoneDropdown = useSearchableDropdown();
    const userDropdown = useSearchableDropdown();

    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const response = await api.get('/setting/get-company-settings');
                if (response.data?.IsSuccess) {
                    const fetchedSettings = response.data.data || {};
                    const payRateUsers = response.data.pay_rate_users || [];
                    const defaults = getDefaultSettings();

                    updateSettings({
                        dailyLimit: fetchedSettings.daily_limit || defaults.dailyLimit,
                        autoClockOut: Number(fetchedSettings.auto_clock_out) || defaults.autoClockOut,
                        showDiff: fetchedSettings.show_diff ?? defaults.showDiff,
                        timeZone: fetchedSettings.timezone_id ? String(fetchedSettings.timezone_id) : defaults.timeZone,
                        users: payRateUsers.map((user: any) => String(user.user_id)),
                        highlightMore: fetchedSettings.highlight_more ?? defaults.highlightMore,
                        highlightLess: fetchedSettings.highlight_less ?? defaults.highlightLess,
                        moreThanMinutes: fetchedSettings.more_than_minutes ?? defaults.moreThanMinutes,
                        lessThanMinutes: fetchedSettings.less_than_minutes ?? defaults.lessThanMinutes,
                        roundingIncrement: fetchedSettings.rounding_increment ?? defaults.roundingIncrement,
                        showTimesheetRound: fetchedSettings.show_timesheet_round ?? defaults.showTimesheetRound,
                        isDayLimit: fetchedSettings.is_day_limit ?? defaults.isDayLimit,
                        isAutoClock: fetchedSettings.is_auto_clock ?? defaults.isAutoClock,
                        payRatePermission: true,
                        exportFormat: fetchedSettings.export_format || 'time',
                        isSaving: false,
                        leave_limit: fetchedSettings.leave_limit ?? 0,
                        isStartWorkAllowedFrom: normalizeStartWorkAllowedFrom(fetchedSettings.start_work_allowed_from) != null,
                        startWorkAllowedFrom: normalizeStartWorkAllowedFrom(fetchedSettings.start_work_allowed_from)
                            ?? defaults.startWorkAllowedFrom,
                        startWorkExemptUserIds: toUserIdStrings(fetchedSettings.start_work_exempt_user_ids),
                    });
                } else {
                    updateSettings(getDefaultSettings());
                }
            } catch (error) {
                console.error('Error fetching company general settings:', error);
                updateSettings(getDefaultSettings());
            }
        };

        fetchCompanySettings();
    }, [updateSettings]);

    const isLoading = settingsLoading || resourcesLoading;

    const timeOptions = useMemo(() => generateTimeOptions(), []);

    const filteredExemptUsers = useMemo(() => {
        const search = userDropdown.searchText.toLowerCase();
        if (!search) return companyUsers;
        return companyUsers.filter(user => user.name.toLowerCase().includes(search));
    }, [companyUsers, userDropdown.searchText]);

    const filteredTimezones = useMemo(() => {
        if (!timezoneDropdown.searchText) return allTimezones;
        return allTimezones.filter(tz =>
            tz.value.toLowerCase().includes(timezoneDropdown.searchText.toLowerCase())
        );
    }, [allTimezones, timezoneDropdown.searchText]);

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

    const handleAutoClockOutChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        if (inputValue === '') {
            updateSettings({ autoClockOut: 0 as any });
            return;
        }

        const numValue = parseInt(inputValue);

        if (isNaN(numValue)) {
            return;
        }

        let clampedValue = numValue;
        if (numValue < 1) {
            clampedValue = Number(settings.autoClockOut) || 1;
        } else if (numValue > 24) {
            clampedValue = 24;
        }

        updateSettings({ autoClockOut: clampedValue });
    }, [updateSettings, settings.autoClockOut]);

    const handleAutoClockOutBlur = useCallback(() => {
        const currentValue = Number(settings.autoClockOut);
        if (!currentValue || currentValue < 1) {
            updateSettings({ autoClockOut: 1 });
        } else if (currentValue > 24) {
            updateSettings({ autoClockOut: 24 });
        }
    }, [settings.autoClockOut, updateSettings]);

    const handleLeaveLimitChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        if (inputValue === "") {
        updateSettings({ leave_limit: 0 as any });
        return;
        }

        const numValue = parseInt(inputValue, 10);

        if (isNaN(numValue)) return;

        let clampedValue = numValue;

        if (numValue < 0) {
        clampedValue = 0;
        } else if (numValue > 365) {
        clampedValue = 365;
        }

        updateSettings({ leave_limit: clampedValue });
    },
    [updateSettings]
    );

    const handleLeaveLimitBlur = useCallback(() => {
        const currentValue = Number(settings.leave_limit);
    
        if (isNaN(currentValue) || currentValue < 0) {
            updateSettings({ leave_limit: 0 });
        } else if (currentValue > 365) {
            updateSettings({ leave_limit: 365 });
        }
    }, [settings.leave_limit, updateSettings]);


    const createSelectHandler = useCallback((field: keyof SettingsState) =>
        (event: SelectChangeEvent<any>) => {
            updateSettings({ [field]: event.target.value });
        }, [updateSettings]);

    const handleSave = useCallback(async () => {
        try {
            updateSettings({ isSaving: true });

            const payload = {
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
                pay_rate_permission: true,
                export_format: settings.exportFormat,
                leave_limit: settings.leave_limit,
                start_work_allowed_from: settings.isStartWorkAllowedFrom
                    ? normalizeStartWorkAllowedFrom(settings.startWorkAllowedFrom)
                    : null,
                start_work_exempt_user_ids: settings.startWorkExemptUserIds.map(Number),
            };

            const response = await api.post('/setting/save-general-setting', payload);

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                onSaveSuccess();
            }
        } catch (error: any) {
            console.error('Error saving settings:', error);
            if (error?.response?.data?.message) toast.error(error.response.data.message);
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

                        {/* Daily Limit & Auto Clock Out */}
                        <Box pb={3}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                                <Box display="flex" alignItems="center">
                                    <Checkbox
                                        checked={settings.isDayLimit}
                                        onChange={createCheckboxHandler('isDayLimit')}
                                        sx={{ p: 0, mr: 1 }}
                                        size="small"
                                    />
                                    <Box>
                                        <Typography variant="body2">{t('Daily limit')}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t("You'll be notified when a limit is exceeded")}
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
                                        <Typography variant="body2">{t('Auto clock out')}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('Employees will be automatically clocked out once they exceed their daily working limit.')}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        type="text"
                                        value={settings.autoClockOut}
                                        onChange={handleAutoClockOutChange}
                                        onBlur={handleAutoClockOutBlur}
                                        disabled={!settings.isAutoClock}
                                        inputProps={{
                                            style: { width: '20px', backgroundColor: '#fff' },
                                            min: 1,
                                            max: 24
                                        }}
                                    />
                                    {t('Hours')}
                                </Box>
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
                                        {t('Show the difference between scheduled and actual work time')}
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
                                            <Typography variant="body2">{t('Highlight if employee worked')}</Typography>
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                type="text"
                                                value={settings.moreThanMinutes}
                                                onChange={createNumberInputHandler('moreThanMinutes')}
                                                disabled={!settings.highlightMore}
                                                inputProps={{
                                                    style: { width: '40px', backgroundColor: '#fff' },
                                                    min: 0
                                                }}
                                            />
                                            <Typography variant="body2">{t('minutes more than scheduled')}</Typography>
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
                                            <Typography variant="body2">{t('Highlight if employee worked')}</Typography>
                                            <TextField
                                                variant="outlined"
                                                size="small"
                                                type="text"
                                                value={settings.lessThanMinutes}
                                                onChange={createNumberInputHandler('lessThanMinutes')}
                                                disabled={!settings.highlightLess}
                                                inputProps={{
                                                    style: { width: '40px', backgroundColor: '#fff' },
                                                    min: 0
                                                }}
                                            />
                                            <Typography variant="body2">{t('minutes less than scheduled')}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={3}>
                                <Box display="flex" alignItems="center">
                                    <Checkbox
                                        checked={settings.isStartWorkAllowedFrom}
                                        onChange={createCheckboxHandler('isStartWorkAllowedFrom')}
                                        sx={{ p: 0, mr: 1 }}
                                        size="small"
                                    />
                                    <Box>
                                        <Typography variant="body2">{t('Start Work Allowed From')}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {t('Employees in this company cannot start work before this time.')}
                                        </Typography>
                                    </Box>
                                </Box>
                                <TimePicker
                                    value={dayjs(settings.startWorkAllowedFrom, 'HH:mm')}
                                    onChange={(newValue: Dayjs | null) => {
                                        if (newValue && newValue.isValid()) {
                                            updateSettings({ startWorkAllowedFrom: newValue.format('HH:mm') });
                                        }
                                    }}
                                    disabled={!settings.isStartWorkAllowedFrom}
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
                                            sx: { width: 150 },
                                        },
                                    }}
                                />
                            </Box>

                            <Box display="flex" alignItems="center" justifyContent="space-between" mt={3}>
                                <Box>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="body2">{t('Start work time exceptions')}</Typography>
                                        <Tooltip
                                            arrow
                                            title={t('Selected users can press Start Work at any time. Both the company Start Work Allowed From time and the shift Start Work Allowed From time are skipped for them.')}
                                        >
                                            <Box component="span" display="flex"><IconHelp size={16} color="#9e9e9e" /></Box>
                                        </Tooltip>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('Start Work time limits are not checked for these users.')}
                                    </Typography>
                                </Box>
                                <Select<string[]>
                                    multiple
                                    value={settings.startWorkExemptUserIds}
                                    onChange={(event: SelectChangeEvent<string[]>) => {
                                        const value = event.target.value;
                                        updateSettings({ startWorkExemptUserIds: typeof value === 'string' ? value.split(',') : value });
                                    }}
                                    open={userDropdown.isOpen}
                                    onOpen={userDropdown.handleOpen}
                                    onClose={userDropdown.handleClose}
                                    size="small"
                                    displayEmpty
                                    renderValue={(selected) => selected.length === 0
                                        ? <Typography variant="body2" color="text.secondary">{t('Select users')}</Typography>
                                        : `${selected.length} ${t(selected.length === 1 ? 'user selected' : 'users selected')}`}
                                    sx={{ width: 200, '& .MuiSelect-select': { padding: '8px 12px', fontSize: '0.875rem' } }}
                                    MenuProps={styles.selectMenuProps}
                                >
                                    <ListSubheader sx={{ bgcolor: 'background.paper', padding: '8px 16px', borderBottom: '1px solid #e0e0e0' }}>
                                        <TextField
                                            size="small"
                                            placeholder={t('Search users...')}
                                            fullWidth
                                            value={userDropdown.searchText}
                                            onChange={userDropdown.handleSearchChange}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ color: 'action.active', fontSize: 20 }} />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </ListSubheader>
                                    {filteredExemptUsers.length > 0 ? (
                                        filteredExemptUsers.map((user) => (
                                            <MenuItem key={user.id} value={user.id} sx={{ fontSize: '0.875rem' }}>
                                                <Checkbox
                                                    size="small"
                                                    checked={settings.startWorkExemptUserIds.includes(user.id)}
                                                    sx={{ p: 0, mr: 1 }}
                                                />
                                                <Avatar src={user.user_image || undefined} sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                                                    {user.name.charAt(0)}
                                                </Avatar>
                                                <ListItemText primary={user.name} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled sx={{ fontSize: '0.875rem' }}>{t('No users found')}</MenuItem>
                                    )}
                                </Select>
                            </Box>
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
                                    <Typography variant="body2">{t('Timesheets rounding')}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('We recommend you consult a labor or employment attorney in your country to ensure that you comply with rounding regulations.')}
                                    </Typography>
                                </Box>
                            </Box>

                            {settings.showTimesheetRound && (
                                <Box width="max-content">
                                    <Box display="flex" alignItems="center" mb={1}>
                                        <Typography variant="body2">{t('Automatically round start & end times to the nearest')}</Typography>
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
                                        <Typography variant="body2">{t('increment')}</Typography>
                                    </Box>
                                    <Box display="flex" alignItems="center" sx={{ backgroundColor: '#fff1b8', padding: 1 }}>
                                        <IconHelp size={18} />
                                        <Typography ml={1} variant="body2">
                                            {t('Changes will apply to all new timesheets')}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Show Pay Rates & Export Format */}
                        <Box mb={4}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="body2" color="text.primary">{t('Timesheet & payroll export format')}</Typography>
                                <Select
                                    value={settings.exportFormat}
                                    onChange={createSelectHandler('exportFormat')}
                                    size="small"
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
                                >
                                    <MenuItem value="time">{t('Time 04:30')}</MenuItem>
                                    <MenuItem value="decimal">{t('Decimal 4.5')}</MenuItem>
                                </Select>
                            </Box>

                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography variant="body2" color="text.primary">{t('Time zone')}</Typography>
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
                                            placeholder={t('Search timezone...')}
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

                            {/*<Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>*/}
                            {/*    <Typography variant="body2" mb={1}>*/}
                            {/*        Maximum leaves allowed per year*/}
                            {/*    </Typography>*/}
                            
                            {/*    <TextField*/}
                            {/*        type="text"*/}
                            {/*        value={settings.leave_limit}*/}
                            {/*        onChange={handleLeaveLimitChange}*/}
                            {/*        onBlur={handleLeaveLimitBlur}*/}
                            {/*        inputProps={{*/}
                            {/*            min: 0,*/}
                            {/*            max: 365,*/}
                            {/*            step: 1,*/}
                            {/*            inputMode: "numeric",*/}
                            {/*        }}*/}
                            {/*        sx={{ width: "22%" }}*/}
                            {/*        placeholder="Enter leave limit"*/}
                            {/*    />*/}
                            {/*</Box>*/}
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
                                {t('Saving...')}
                            </>
                        ) : (
                            t('Save changes')
                        )}
                    </Button>
                </Box>
            </Box>
        </LocalizationProvider>
    );
};

export default GeneralSetting;
