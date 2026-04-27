'use client';

import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from 'react';
import {
    Box,
    Typography,
    Stack,
    Button,
    Skeleton,
    Snackbar,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    FormControl,
    InputLabel,
    MenuItem,
} from '@mui/material';
import {
    IconClockPlay,
    IconPlayerStop,
    IconMapPin,
    IconMapPinOff,
} from '@tabler/icons-react';
import { AxiosResponse } from 'axios';
import { parse } from 'date-fns';
import {
    useReactTable,
    getCoreRowModel,
    getExpandedRowModel,
    ColumnDef,
    VisibilityState,
    ExpandedState,
} from '@tanstack/react-table';

import api from '@/utils/axios';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';

import TimeClockTable from './components/TimeClockTable';
import { useTimeClockData } from './hooks/useTimeClockData';
import { useEditingState } from './hooks/useEditingState';
import { DailyBreakdown } from './types/timeClock';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import TimeClockStats from './components/TimeClockStats';

const TIME_TRACKING_PAGE = 'time-tracking-page';

const WEEK_DAY_MAP: Record<number, string> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
};

const AMOUNT_COLUMNS = [
    'priceWork',
    'cis_amount',
    'gross_amount',
    'netPayableAmount',
    'adjustment',
    'payableAmount',
    'dailyTotal',
] as const;

type TodayClockInfo = {
    user_is_working: boolean;
    user_worklog_id: number | null;
    clock_in_time: string | null;
    total_work_hours_today: string;
    current_shift_name: string | null;
    current_project_name: string | null;
};

type WeekDay = { name: string; status: boolean };

type ShiftOption = {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    is_pricework: boolean;
    week_days: WeekDay[];
};

type ProjectOption = { id: number; name: string };

type ApiResponse<T = unknown> = {
    IsSuccess: boolean;
    message: string;
    data?: T;
};

type ActiveWorklogResponse = {
    IsSuccess: boolean;
    message: string;
    is_working: boolean;
    worklog_id: number | null;
    clock_in_time: string | null;
    shift_name: string | null;
    project_name: string | null;
    total_work_hours_today: string;
};

type LocationCoords = { latitude: number; longitude: number };

type ToastState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

type LocationErrorType = 'denied' | 'unavailable' | 'timeout' | null;

const pad = (n: number) => String(n).padStart(2, '0');

const secondsToHHMMSS = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const loadStoredSettings = (): {
    startDate: Date | null;
    endDate: Date | null;
    columnVisibility: VisibilityState;
} => {
    try {
        const stored = localStorage.getItem(TIME_TRACKING_PAGE);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                columnVisibility: parsed.columnVisibility ?? {},
            };
        }
    } catch {
    }
    return { startDate: null, endDate: null, columnVisibility: {} };
};

const saveSettingsToStorage = (
    startDate: Date | null,
    endDate: Date | null,
    columnVisibility: VisibilityState,
): void => {
    try {
        localStorage.setItem(
            TIME_TRACKING_PAGE,
            JSON.stringify({
                startDate: startDate?.toDateString() ?? null,
                endDate: endDate?.toDateString() ?? null,
                columnVisibility,
            }),
        );
    } catch {
    }
};

const getCurrentWeekRange = (): { start: Date; end: Date } => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;

    const start = new Date(today);
    start.setDate(today.getDate() + diffToMon);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const getTodayDayName = (): string => WEEK_DAY_MAP[new Date().getDay()];

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);


interface LocationPermissionDialogProps {
    open: boolean;
    onClose: () => void;
    onRetry: () => void;
    errorType: LocationErrorType;
}

const CHROME_STEPS = [
    'Click the lock icon 🔒 in the address bar',
    'Select "Site settings"',
    'Set Location to "Allow"',
    'Refresh and try again',
];

const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
                                                                               open,
                                                                               onClose,
                                                                               onRetry,
                                                                               errorType
}) => {
    const isDenied = errorType === 'denied';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
            <Box sx={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />

            <DialogTitle sx={{ pt: 2.5, pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            background: 'rgba(239,68,68,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <IconMapPinOff size={20} color="#ef4444" />
                    </Box>
                    <Box>
                        <Typography fontWeight={700} fontSize={15} lineHeight={1.2}>
                            {isDenied ? 'Location Access Blocked' : 'Location Unavailable'}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary" mt={0.25}>
                            Location is required to start work!
                        </Typography>
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: 1, pb: 2 }}>
                {isDenied ? (
                    <Stack spacing={2}>
                        <Typography fontSize={13} color="text.secondary" lineHeight={1.6}>
                            Your browser has blocked location access. Please enable it to proceed
                            with clocking in.
                        </Typography>
                        <Box
                            sx={{
                                background: '#fafafa',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                                p: 1.5,
                            }}
                        >
                            <Typography fontSize={12} fontWeight={700} mb={1}>
                                How to enable in Chrome:
                            </Typography>
                            {CHROME_STEPS.map((step, i) => (
                                <Stack
                                    key={i}
                                    direction="row"
                                    spacing={1}
                                    mb={0.5}
                                    alignItems="flex-start"
                                >
                                    <Box
                                        sx={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            mt: 0.1,
                                        }}
                                    >
                                        <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                            {i + 1}
                                        </Typography>
                                    </Box>
                                    <Typography fontSize={12} color="text.secondary" lineHeight={1.5}>
                                        {step}
                                    </Typography>
                                </Stack>
                            ))}
                        </Box>
                    </Stack>
                ) : (
                    <Typography fontSize={13} color="text.secondary" lineHeight={1.6}>
                        {errorType === 'timeout'
                            ? 'Location timed out. Please ensure GPS is enabled and try again.'
                            : 'Location unavailable. Please check your device settings.'}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                    Cancel
                </Button>

                {isDenied ? (
                    <Button
                        onClick={onClose}
                        variant="contained"
                        size="small"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg,#ef4444,#f97316)',
                        }}
                    >
                        Got it
                    </Button>
                ) : (
                    <Button
                        onClick={onRetry}
                        variant="contained"
                        size="small"
                        startIcon={<IconMapPin size={14} />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                        }}
                    >
                        Try Again
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

interface ClockButtonProps {
    isWorking: boolean;
    elapsed: number;
    currentShift: string | null;
    currentProject: string | null;
    onClick: () => void;
}

const ClockButton: React.FC<ClockButtonProps> = ({
                                                     isWorking,
                                                     elapsed,
                                                     currentShift,
                                                     currentProject,
                                                     onClick
}) => {
    const gradient = isWorking
        ? 'linear-gradient(135deg,#f97316,#fb923c)'
        : 'linear-gradient(135deg,#06b6d4,#0ea5e9 50%,#3b82f6)';

    const shadow = isWorking
        ? '0 8px 32px rgba(249,115,22,0.4)'
        : '0 8px 32px rgba(6,182,212,0.4)';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ position: 'relative', width: 140, height: 140 }}>
                {isWorking && (
                    <Box
                        onClick={onClick}
                        sx={{
                            position: 'absolute',
                            inset: -8,
                            borderRadius: '50%',
                            border: '2px solid #f97316',
                            opacity: 0.4,
                            animation: 'pulse 2s ease-in-out infinite',
                            cursor: 'pointer',
                            '@keyframes pulse': {
                                '0%,100%': { transform: 'scale(1)', opacity: 0.4 },
                                '50%': { transform: 'scale(1.08)', opacity: 0.1 },
                            },
                        }}
                    />
                )}
                <Box
                    onClick={onClick}
                    role="button"
                    tabIndex={0}
                    aria-label={isWorking ? 'Stop Work' : 'Start Work'}
                    onKeyDown={(e) => e.key === 'Enter' && onClick()}
                    sx={{
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        background: gradient,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: shadow,
                        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                        userSelect: 'none',
                        gap: 0.5,
                        '&:focus-visible': { outline: '3px solid #3b82f6', outlineOffset: 4 },
                    }}
                >
                    {isWorking ? (
                        <IconPlayerStop size={30} color="#fff" />
                    ) : (
                        <IconClockPlay size={30} color="#fff" />
                    )}
                    <Typography
                        sx={{
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 15,
                            letterSpacing: 0.3,
                            mt: 0.25,
                        }}
                    >
                        {isWorking ? 'Stop Work' : 'Start Work'}
                    </Typography>
                </Box>
            </Box>

            {isWorking && elapsed > 0 && (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography
                        sx={{
                            fontSize: 22,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            color: '#f97316',
                            letterSpacing: 1,
                        }}
                    >
                        {secondsToHHMMSS(elapsed)}
                    </Typography>
                    {currentShift && (
                        <Typography fontSize={12} color="text.secondary">
                            {currentShift}
                            {currentProject ? ` · ${currentProject}` : ''}
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};

const useGeolocation = () => {
    const getLocation = useCallback(
        (
            onError: (type: LocationErrorType) => void,
        ): Promise<LocationCoords | null> =>
            new Promise((resolve) => {
                if (!navigator.geolocation) {
                    onError('unavailable');
                    resolve(null);
                    return;
                }

                const requestPosition = () =>
                    navigator.geolocation.getCurrentPosition(
                        (pos) =>
                            resolve({
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            }),
                        (err) => {
                            const type: LocationErrorType =
                                err.code === err.PERMISSION_DENIED
                                    ? 'denied'
                                    : err.code === err.POSITION_UNAVAILABLE
                                        ? 'unavailable'
                                        : 'timeout';
                            onError(type);
                            resolve(null);
                        },
                        { timeout: 8000, enableHighAccuracy: true },
                    );

                if (navigator.permissions) {
                    navigator.permissions
                        .query({ name: 'geolocation' })
                        .then((result) => {
                            if (result.state === 'denied') {
                                onError('denied');
                                resolve(null);
                            } else {
                                requestPosition();
                            }
                        })
                        .catch(requestPosition);
                } else {
                    requestPosition();
                }
            }),
        [],
    );

    return { getLocation };
};

interface StartWorkDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (shiftId: number, projectId: number | null, coords: LocationCoords) => void;
    loading: boolean;
    companyId?: number;
}

const StartWorkDialog: React.FC<StartWorkDialogProps> = ({
                                                             open,
                                                             onClose,
                                                             onConfirm,
                                                             loading,
                                                             companyId
}) => {
    const { getLocation } = useGeolocation();

    const [shifts, setShifts] = useState<ShiftOption[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedShift, setSelectedShift] = useState<number | ''>('');
    const [selectedProject, setSelectedProject] = useState<number | ''>('');
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [shiftDayError, setShiftDayError] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<LocationErrorType>(null);
    const [locationDialogOpen, setLocationDialogOpen] = useState(false);

    useEffect(() => {
        if (!open) return;

        setSelectedShift('');
        setSelectedProject('');
        setShifts([]);
        setShiftDayError(null);
        setLocationError(null);
        setLoadingOptions(true);

        const params: Record<string, unknown> = {};
        if (companyId) params.company_id = companyId;

        api.get('/project/get', { params })
            .then((res) =>
                setProjects(
                    (res.data?.info ?? []).map((p: { id: number; name: string }) => ({
                        id: p.id,
                        name: p.name,
                    })),
                ),
            )
            .catch(() => setProjects([]))
            .finally(() => setLoadingOptions(false));
    }, [open, companyId]);

    useEffect(() => {
        if (!open) return;

        setSelectedShift('');
        setShiftDayError(null);
        setShifts([]);
        setLoadingShifts(true);

        const params: Record<string, unknown> = {};
        if (selectedProject) params.project_id = selectedProject;
        if (companyId) params.company_id = companyId;

        api.get('/shift/list', { params })
            .then((res) =>
                setShifts(
                    (res.data?.info ?? []).map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        is_pricework: s.is_pricework,
                        week_days: s.week_days ?? [],
                    })),
                ),
            )
            .catch(() => setShifts([]))
            .finally(() => setLoadingShifts(false));
    }, [open, selectedProject, companyId]);

    const handleShiftChange = useCallback(
        (shiftId: number | '') => {
            setSelectedShift(shiftId);
            setShiftDayError(null);

            if (!shiftId) return;

            const shift = shifts.find((s) => s.id === shiftId);
            if (!shift) return;

            const todayName = getTodayDayName();
            const dayEntry = shift.week_days.find(
                (d) => d.name.toLowerCase() === todayName,
            );

            if (!dayEntry?.status) {
                setShiftDayError(
                    `"${shift.name}" is not scheduled for ${capitalize(todayName)}.`,
                );
            }
        },
        [shifts],
    );

    const requestLocationAndConfirm = useCallback(async () => {
        setLocationLoading(true);

        const coords = await getLocation((type) => {
            setLocationError(type);
            setLocationDialogOpen(true);
        });

        setLocationLoading(false);

        if (!coords) return;

        onConfirm(
            Number(selectedShift),
            selectedProject ? Number(selectedProject) : null,
            coords,
        );
    }, [getLocation, onConfirm, selectedShift, selectedProject]);

    const handleConfirm = () => {
        if (!selectedShift || shiftDayError) return;
        requestLocationAndConfirm();
    };

    const handleLocationDialogClose = () => {
        setLocationDialogOpen(false);
        setLocationError(null);
    };

    const isShiftUnavailable = (shift: ShiftOption): boolean => {
        const todayName = getTodayDayName();
        return !shift.week_days.find((d) => d.name.toLowerCase() === todayName)?.status;
    };

    const isConfirmDisabled =
        !selectedShift || !!shiftDayError || loading || loadingShifts || locationLoading;

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>
                    Start Work
                </DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    {loadingOptions ? (
                        <Stack spacing={1}>
                            <Skeleton height={56} />
                            <Skeleton height={56} />
                        </Stack>
                    ) : (
                        <Stack spacing={2} mt={1}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Select Project (optional)</InputLabel>
                                <Select
                                    label="Select Project (optional)"
                                    value={selectedProject}
                                    onChange={(e) =>
                                        setSelectedProject(e.target.value as number)
                                    }
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {projects.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small" required error={!!shiftDayError}>
                                <InputLabel>Select Shift *</InputLabel>
                                {loadingShifts ? (
                                    <Skeleton height={40} sx={{ mt: 0.5 }} />
                                ) : (
                                    <Select
                                        label="Select Shift *"
                                        value={selectedShift}
                                        onChange={(e) =>
                                            handleShiftChange(e.target.value as number)
                                        }
                                    >
                                        {shifts.map((s) => {
                                            const unavailable = isShiftUnavailable(s);
                                            return (
                                                <MenuItem
                                                    key={s.id}
                                                    value={s.id}
                                                    sx={{ opacity: unavailable ? 0.45 : 1 }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1}
                                                        width="100%"
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 7,
                                                                height: 7,
                                                                borderRadius: '50%',
                                                                flexShrink: 0,
                                                                background: unavailable
                                                                    ? '#ef4444'
                                                                    : '#22c55e',
                                                            }}
                                                        />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography
                                                                fontSize={13}
                                                                fontWeight={600}
                                                                lineHeight={1.2}
                                                            >
                                                                {s.name}
                                                            </Typography>
                                                            {s.start_time && s.end_time && (
                                                                <Typography
                                                                    fontSize={11}
                                                                    color="text.secondary"
                                                                >
                                                                    {s.start_time} – {s.end_time}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        {unavailable && (
                                                            <Typography
                                                                fontSize={10}
                                                                color="error"
                                                                sx={{ flexShrink: 0 }}
                                                            >
                                                                Not today
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                )}
                                {shiftDayError && (
                                    <Typography fontSize={11} color="error" mt={0.5} ml={1.5}>
                                        {shiftDayError}
                                    </Typography>
                                )}
                            </FormControl>
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        size="small"
                        disabled={isConfirmDisabled}
                        startIcon={
                            loading || locationLoading ? (
                                <CircularProgress size={14} color="inherit" />
                            ) : (
                                <IconClockPlay size={16} />
                            )
                        }
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                            '&:hover': {
                                background: 'linear-gradient(135deg,#0891b2,#2563eb)',
                            },
                        }}
                    >
                        {locationLoading ? 'Getting location…' : loading ? 'Starting…' : 'Start Work'}
                    </Button>
                </DialogActions>
            </Dialog>

            <LocationPermissionDialog
                open={locationDialogOpen}
                errorType={locationError}
                onClose={handleLocationDialogClose}
                onRetry={() => {
                    setLocationDialogOpen(false);
                    setLocationError(null);
                    requestLocationAndConfirm();
                }}
            />
        </>
    );
};

interface Props {
    queryParams?: Record<string, string | null>;
}

const TimeTracking: React.FC<Props> = ({ queryParams: _queryParams }) => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number };
    const userId: string = (user as any)?.user_id ?? (user as any)?.id ?? '';

    const initialSettings = useMemo(() => {
        const stored = loadStoredSettings();
        if (stored.startDate && stored.endDate) return stored;

        const { start, end } = getCurrentWeekRange();
        return {
            startDate: start,
            endDate: end,
            columnVisibility: {} as VisibilityState,
        };
    }, []);

    const [startDate, setStartDate] = useState<Date | null>(initialSettings.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialSettings.endDate);
    const [currency, setCurrency] = useState<string>('');

    const [clockInfo, setClockInfo] = useState<TodayClockInfo>({
        user_is_working: false,
        user_worklog_id: null,
        clock_in_time: null,
        total_work_hours_today: '00:00',
        current_shift_name: null,
        current_project_name: null,
    });
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [startDialogOpen, setStartDialogOpen] = useState(false);
    const [clockLoading, setClockLoading] = useState(false);
    const [todayLoading, setTodayLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>({
        open: false,
        message: '',
        severity: 'success',
    });
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        ...initialSettings.columnVisibility,
    });
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const showToast = useCallback(
        (message: string, severity: 'success' | 'error' = 'success') =>
            setToast({ open: true, message, severity }),
        [],
    );

    const closeToast = useCallback(
        () => setToast((t) => ({ ...t, open: false })),
        [],
    );

    const {
        data,
        setData,
        fetchTimeClockData,
        userHasRatePermission,
        payrollCycle,
        fetchPayrollCycle,
        headerDetail,
    } = useTimeClockData(userId, currency);

    const {
        editingWorklogs,
        savingWorklogs,
        setSavingWorklogs,
        startEditingField,
        cancelEditingField,
        updateEditingField,
    } = useEditingState();
    
    useEffect(() => {
        fetchPayrollCycle();
    }, []);

    useEffect(() => {
        setColumnVisibility((prev) => ({
            ...prev,
            ...Object.fromEntries(
                AMOUNT_COLUMNS.map((col) => [col, userHasRatePermission]),
            ),
        }));
    }, [userHasRatePermission]);

    useEffect(() => {
        if (clockInfo.user_is_working) {
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsed(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [clockInfo.user_is_working]);

    const fetchTodayClock = useCallback(async () => {
        setTodayLoading(true);
        try {
            const res: AxiosResponse<ActiveWorklogResponse> =
                await api.get('/get-active-worklog');
            const d = res.data;

            if (d.IsSuccess) {
                setElapsed(
                    d.is_working && d.clock_in_time
                        ? Math.max(
                            0,
                            Math.floor(
                                (Date.now() - new Date(d.clock_in_time).getTime()) / 1000,
                            ),
                        )
                        : 0,
                );
                setClockInfo({
                    user_is_working: d.is_working,
                    user_worklog_id: d.worklog_id,
                    clock_in_time: d.clock_in_time,
                    total_work_hours_today: d.total_work_hours_today ?? '00:00',
                    current_shift_name: d.shift_name,
                    current_project_name: d.project_name,
                });
            }
        } catch {
        } finally {
            setTodayLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTodayClock();
    }, [fetchTodayClock]);

    useEffect(() => {
        if (userId) fetchTimeClockData(startDate, endDate);
    }, [userId]); 
    
    const formatHour = useCallback(
        (val: string | number | null | undefined, isPricework = false): string => {
            if (val == null) return isPricework ? '--' : '00:00';
            if (isPricework) return '--';

            const str = val.toString().trim();

            if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
                const [h, m] = str.split(':');
                return `${h.padStart(2, '0')}:${Math.floor(parseFloat(m) || 0)
                    .toString()
                    .padStart(2, '0')}`;
            }

            const num = parseFloat(str);
            if (!isNaN(num)) {
                const h = Math.floor(num);
                return `${h.toString().padStart(2, '0')}:${Math.round((num - h) * 60)
                    .toString()
                    .padStart(2, '0')}`;
            }

            return isPricework ? '--' : '00:00';
        },
        [],
    );

    const parseDate = useCallback((dateString: string): Date | null => {
        if (!dateString) return null;
        try {
            return parse(dateString, 'EEE d/M', new Date());
        } catch {
            return null;
        }
    }, []);

    const sanitizeDateTime = useCallback(
        (dt: string): string => (dt && dt !== 'Invalid DateTime' ? dt : '--'),
        [],
    );

    const isRecordLocked = useCallback(
        (log: any): boolean => ['6', 6, '9', 9].includes(log?.status),
        [],
    );

    const hasValidWorklogData = useCallback(
        (row: DailyBreakdown): boolean =>
            !!row.worklog_id &&
            row.start !== '--' &&
            row.end !== '--' &&
            row.start != null &&
            row.end != null,
        [],
    );

    const validateAndFormatTime = useCallback((value: string): string => {
        if (!value?.trim()) return '';

        const digits = value.replace(/\D/g, '');
        if (!digits.length) return '';

        let h = 0;
        let m = 0;

        if (digits.length === 1) {
            h = parseInt(digits);
        } else if (digits.length === 2) {
            const n = parseInt(digits);
            if (n <= 23) {
                h = n;
            } else {
                h = parseInt(digits[0]);
                m = parseInt(digits[1]) * 10;
            }
        } else if (digits.length === 3) {
            const firstTwo = parseInt(digits.slice(0, 2));
            if (firstTwo <= 23) {
                h = firstTwo;
                m = parseInt(digits[2]) * 10;
            } else {
                h = parseInt(digits[0]);
                m = parseInt(digits.slice(1, 3));
            }
        } else {
            h = parseInt(digits.slice(0, 2));
            m = parseInt(digits.slice(2, 4));
        }

        return `${Math.min(h, 23).toString().padStart(2, '0')}:${Math.min(m, 59)
            .toString()
            .padStart(2, '0')}`;
    }, []);
    
    const dailyData = useMemo<DailyBreakdown[]>(() => {
        if (!data?.length) return [];

        return data.flatMap((week: any) => {
            const dayRows: DailyBreakdown[] = (week.days ?? []).map((day: any) => {
                const worklogs = day.worklogs ?? [];
                const base = {
                    rowType: 'day' as const,
                    date: day.date ?? '--',
                    has_pending_leave_request: day.has_pending_leave_request ?? false,
                    is_timesheet_paid: ['9', 9].includes(day.status),
                    timesheet_ids: day.timesheet_ids ?? null,
                    shift: '--',
                    project: '--',
                    start: '--',
                    end: '--',
                    priceWork: '--',
                    expense: '--',
                    cis_amount: '--',
                    gross_amount: '--',
                    checkIns: '--',
                    totalHours: '--',
                    penaltyHours: '--',
                    regular: '--',
                    address: '--',
                    check_in: '--',
                    check_out: '--',
                    rowSpan: 1,
                    status_text: '--',
                    is_requested: false,
                    is_edited: false,
                    isMoreThanWork: day.isMoreThanWork ?? false,
                    isLessThanWork: day.isLessThanWork ?? false,
                    weekLabel: week.week_range,
                    weeklyTotalHours: formatHour(week.weekly_total_hours),
                    weeklyPayableAmount: `${currency}${week.weekly_payable_amount || 0}`,
                    parsedDate: parseDate(day.date),
                    adjustment_id: day.adjustment_id ?? null,
                    adjustment_added_by_name: day.adjustment_added_by_name ?? '',
                    employeeNotes: day.employee_notes || '--',
                    managerNotes: day.manager_notes || '--',
                };

                if (worklogs.length > 0) {
                    return {
                        ...base,
                        dailyTotal: formatHour(day.daily_total),
                        netPayableAmount: `${currency}${day.daily_net_payable_amount}`,
                        daily_adjustment_amount: day.daily_adjustment_amount ?? 0,
                        payableAmount: `${currency}${day.daily_payable_amount}`,
                        rowsData: worklogs,
                    };
                }

                return {
                    ...base,
                    dailyTotal: '--',
                    netPayableAmount: '--',
                    daily_adjustment_amount: '--',
                    payableAmount: '--',
                };
            });

            return [...dayRows];
        });
    }, [data, currency, formatHour, parseDate]);
    
    const selectableRowIds = useMemo(
        () =>
            dailyData
                .map((row, index) => (row.rowType === 'day' ? `row-${index}` : null))
                .filter(Boolean) as string[],
        [dailyData],
    );

    const isAllSelected =
        selectableRowIds.length > 0 && selectedRows.size === selectableRowIds.length;
    const isIndeterminate =
        selectedRows.size > 0 && selectedRows.size < selectableRowIds.length;

    const handleSelectAll = useCallback(
        (checked: boolean) => {
            setSelectedRows(checked ? new Set(selectableRowIds) : new Set());
        },
        [selectableRowIds],
    );

    const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            checked ? next.add(rowId) : next.delete(rowId);
            return next;
        });
    }, []);
    
    const headerStyle: React.CSSProperties = {
        display: 'block',
        textAlign: 'center',
        color: '#203040',
    };

    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
            {
                id: 'select',
                header: () => (
                    <Box
                        className="select-icon"
                        sx={{ height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <CustomCheckbox
                            checked={isAllSelected}
                            indeterminate={isIndeterminate}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                    </Box>
                ),
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    const rowId = `row-${row.index}`;
                    return (
                        <CustomCheckbox
                            checked={selectedRows.has(rowId)}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                        />
                    );
                },
                enableSorting: false,
                size: 50,
                meta: { align: 'center' },
            },
            {
                id: 'date',
                header: () => <span style={headerStyle}>Date</span>,
                cell: ({ row }) => (
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                        <Box textAlign="left" sx={{ flex: 1, minWidth: 0 }}>
                            <Typography className="f-14" noWrap>
                                {row.original.date}
                            </Typography>
                        </Box>
                    </Stack>
                ),
                size: 150,
            },
            {
                id: 'project',
                accessorKey: 'project',
                header: () => <span style={headerStyle}>Project</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.project : null,
                size: 120,
            },
            {
                id: 'shift',
                accessorKey: 'shift',
                header: () => <span style={headerStyle}>Shift</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.shift : null,
                size: 120,
            },
            {
                id: 'start',
                accessorKey: 'start',
                header: () => <span style={headerStyle}>Start</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.start : null,
                size: 80,
            },
            {
                id: 'end',
                accessorKey: 'end',
                header: () => <span style={headerStyle}>End</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.end : null,
                size: 80,
            },
            {
                id: 'totalHours',
                accessorKey: 'totalHours',
                header: () => <span style={headerStyle}>Total hours</span>,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    const isPricework = row.original.rowsData?.some(
                        (log: any) => log.is_pricework,
                    ) ?? false;
                    return (
                        <span style={{ color: row.original.is_edited ? '#ff0000' : 'inherit' }}>
                            {isPricework ? '--' : row.original.totalHours}
                        </span>
                    );
                },
                size: 120,
            },
            {
                id: 'penaltyHours',
                accessorKey: 'penaltyHours',
                header: () => <span style={headerStyle}>Penalty hours</span>,
                cell: ({ row }) => {
                    if (row.original.rowType !== 'day') return null;
                    const isPricework = row.original.rowsData?.some(
                        (log: any) => log.is_pricework,
                    ) ?? false;
                    return (
                        <span style={{ color: row.original.is_edited ? '#ff0000' : 'inherit' }}>
                            {isPricework ? '--' : row.original.penaltyHours}
                        </span>
                    );
                },
                size: 120,
            },
            {
                id: 'priceWork',
                accessorKey: 'priceWork',
                header: () => <span style={headerStyle}>Pricework</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.priceWork : null,
                size: 120,
            },
            {
                id: 'expense',
                accessorKey: 'expense',
                header: () => <span style={headerStyle}>Expense</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.expense : null,
                size: 120,
            },
            {
                id: 'cis_amount',
                accessorKey: 'cis_amount',
                meta: { label: 'CIS' },
                header: () => <span style={headerStyle}>CIS</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.cis_amount : null,
                size: 120,
            },
            {
                id: 'gross_amount',
                accessorKey: 'gross_amount',
                meta: { label: 'Gross' },
                header: () => <span style={headerStyle}>Gross</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.gross_amount : null,
                size: 120,
            },
            {
                id: 'checkIns',
                accessorKey: 'checkIns',
                header: () => <span style={headerStyle}>Check Ins</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.check_in : null,
                size: 100,
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: () => <span style={headerStyle}>Status</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.status_text : null,
                size: 100,
            },
            {
                id: 'dailyTotal',
                header: () => <span style={headerStyle}>Daily total</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.dailyTotal : null,
                size: 100,
            },
            {
                id: 'netPayableAmount',
                accessorKey: 'netPayableAmount',
                header: () => <span style={headerStyle}>Net Payable</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day'
                        ? (row.original.netPayableAmount ?? '--')
                        : null,
                size: 130,
            },
            {
                id: 'adjustment',
                accessorKey: 'adjustment',
                header: () => <span style={headerStyle}>Adjustment</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day'
                        ? (row.original.adjustment ?? '--')
                        : null,
                size: 130,
            },
            {
                id: 'payableAmount',
                accessorKey: 'payableAmount',
                header: () => <span style={headerStyle}>Payable Amount</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.payableAmount : null,
                size: 150,
            },
            {
                id: 'employeeNotes',
                header: () => <span style={headerStyle}>Employee notes</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day' ? row.original.employeeNotes : null,
                size: 150,
            },
            {
                id: 'action',
                header: () => <span style={headerStyle}>Action</span>,
                cell: () => null,
                size: 100,
            },
        ],
        [isAllSelected, isIndeterminate, selectedRows, handleSelectAll, handleRowSelect],
    );

    const table = useReactTable({
        data: dailyData,
        columns: mainTableColumns,
        state: { columnVisibility, expanded },
        onColumnVisibilityChange: setColumnVisibility,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: (row) => row.original.rowType === 'day',
    });
    
    const saveFieldChanges = useCallback(
        async (worklogId: string, originalLog: any) => {
            const editedData = editingWorklogs[worklogId];

            if (!editedData || isRecordLocked(originalLog)) {
                cancelEditingField(worklogId);
                return;
            }

            const newStart = validateAndFormatTime(editedData.start ?? '');
            const newEnd = validateAndFormatTime(editedData.end ?? '');

            if (
                sanitizeDateTime(originalLog.start) === newStart &&
                sanitizeDateTime(originalLog.end) === newEnd
            ) {
                cancelEditingField(worklogId);
                return;
            }

            setSavingWorklogs((p) => new Set(p).add(worklogId));

            try {
                await api.post('/time-clock/edit-worklog', {
                    user_worklog_id: originalLog.worklog_id,
                    date: originalLog.date_added,
                    start_time: newStart,
                    end_time: newEnd,
                });
                await fetchTimeClockData(startDate, endDate);
            } catch (e) {
                console.error(e);
            } finally {
                setSavingWorklogs((p) => {
                    const s = new Set(p);
                    s.delete(worklogId);
                    return s;
                });
                cancelEditingField(worklogId);
            }
        },
        [
            editingWorklogs,
            isRecordLocked,
            cancelEditingField,
            validateAndFormatTime,
            sanitizeDateTime,
            setSavingWorklogs,
            fetchTimeClockData,
            startDate,
            endDate,
        ],
    );

    const handleDeleteRecord = useCallback(
        async (id: string, type: string) => {
            const endpoints: Record<string, string> = {
                worklog: '/time-clock/worklogs-bulk-delete',
                expense: '/expense/bulk-delete',
                leave: '/user-leaves/delete-leave',
            };

            const endpoint = endpoints[type];
            if (!endpoint) return;

            try {
                const res: AxiosResponse<{ IsSuccess: boolean }> = await api.post(
                    endpoint,
                    type === 'leave' ? { user_leave_id: id } : { ids: id },
                );
                if (res.data.IsSuccess) await fetchTimeClockData(startDate, endDate);
            } catch (e) {
                console.error(e);
            }
        },
        [fetchTimeClockData, startDate, endDate],
    );
    
    const handleClockButtonClick = useCallback(() => {
        if (clockInfo.user_is_working) handleStopWork();
        else setStartDialogOpen(true);
    }, [clockInfo.user_is_working]);

    const handleStartWork = useCallback(
        async (shiftId: number, projectId: number | null, coords: LocationCoords) => {
            setClockLoading(true);
            try {
                const payload: Record<string, unknown> = {
                    shift_id: shiftId,
                    device_type: 'web',
                    device_model_type: navigator.userAgent.substring(0, 50),
                    latitude: String(coords.latitude),
                    longitude: String(coords.longitude),
                    ...(user?.company_id ? { company_id: user.company_id } : {}),
                };
                if (projectId) payload.project_id = projectId;

                const res: AxiosResponse<ApiResponse> = await api.post(
                    '/user-start-work',
                    payload,
                );

                if (res.data.IsSuccess) {
                    showToast(res.data.message || 'Work started!', 'success');
                    setStartDialogOpen(false);
                    await fetchTodayClock();
                    await fetchTimeClockData(startDate, endDate);
                }
            } catch (err: any) {
                showToast(
                    err?.response?.data?.message || 'Failed to start work',
                    'error',
                );
            } finally {
                setClockLoading(false);
            }
        },
        [user?.company_id, showToast, fetchTodayClock, fetchTimeClockData, startDate, endDate],
    );

    const handleStopWork = useCallback(async () => {
        if (!clockInfo.user_worklog_id) return;
        setClockLoading(true);

        try {
            const payload: Record<string, unknown> = {
                user_worklog_id: clockInfo.user_worklog_id,
                device_type: 'web',
                device_model_type: navigator.userAgent.substring(0, 50),
                ...(user?.company_id ? { company_id: user.company_id } : {}),
            };

            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                    }),
                );
                payload.latitude = String(pos.coords.latitude);
                payload.longitude = String(pos.coords.longitude);
            } catch {
            }

            const res: AxiosResponse<ApiResponse> = await api.post(
                '/user-stop-work',
                payload,
            );

            if (res.data.IsSuccess) {
                showToast(res.data.message || 'Work stopped!', 'success');
                await fetchTodayClock();
                await fetchTimeClockData(startDate, endDate);
            } else {
                showToast(res.data.message || 'Failed to stop work', 'error');
            }
        } catch (err: any) {
            showToast(
                err?.response?.data?.message || 'Failed to stop work',
                'error',
            );
        } finally {
            setClockLoading(false);
        }
    }, [
        clockInfo.user_worklog_id,
        user?.company_id,
        showToast,
        fetchTodayClock,
        fetchTimeClockData,
        startDate,
        endDate,
    ]);
    
    const handleDateRangeChange = useCallback(
        (range: { from: Date | null; to: Date | null }) => {
            if (!range.from || !range.to) return;

            setStartDate(range.from);
            setEndDate(range.to);
            setData([]);
            fetchTimeClockData(range.from, range.to);
            saveSettingsToStorage(range.from, range.to, columnVisibility);
        },
        [fetchTimeClockData, columnVisibility, setData],
    );
    
    const handlePopoverOpen = useCallback(
        (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
        [],
    );

    const handlePopoverClose = useCallback(() => setAnchorEl(null), []);
    
    return (
        <Box sx={{ width: '100%' }}>
                <Stack spacing={2}>
                    <Box
                        sx={{
                            width: '50%',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            p: { xs: 2, sm: 2.5, md: 3 },
                            background: '#fff',
                        }}
                    >
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            mb={2}
                        >
                            <Typography fontWeight={700} fontSize={15}>
                                Today&apos;s TimeClock
                            </Typography>
                        </Stack>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems="center"
                        >
                            <Box
                                sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}
                            >
                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 450,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        p: 2,
                                        minHeight: 130,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fafafa',
                                        textAlign: 'center',
                                    }}
                                >
                                    {todayLoading ? (
                                        <CircularProgress size={24} />
                                    ) : clockInfo.user_is_working ? (
                                        <Stack alignItems="center" spacing={0.5}>
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: '#22c55e',
                                                    animation: 'blink 1.2s ease-in-out infinite',
                                                    '@keyframes blink': {
                                                        '0%,100%': { opacity: 1 },
                                                        '50%': { opacity: 0.3 },
                                                    },
                                                }}
                                            />
                                            <Typography
                                                fontSize={13}
                                                fontWeight={600}
                                                color="#22c55e"
                                            >
                                                Currently working
                                            </Typography>
                                            {clockInfo.current_shift_name && (
                                                <Typography fontSize={12} color="text.secondary">
                                                    Shift: {clockInfo.current_shift_name}
                                                </Typography>
                                            )}
                                            {clockInfo.current_project_name && (
                                                <Typography fontSize={12} color="text.secondary">
                                                    Project: {clockInfo.current_project_name}
                                                </Typography>
                                            )}
                                        </Stack>
                                    ) : (
                                        <Typography color="text.secondary" fontSize={13}>
                                            Nothing&apos;s scheduled for today
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ flexShrink: 0 }}>
                                <ClockButton
                                    isWorking={clockInfo.user_is_working}
                                    elapsed={elapsed}
                                    currentShift={clockInfo.current_shift_name}
                                    currentProject={clockInfo.current_project_name}
                                    onClick={handleClockButtonClick}
                                />
                            </Box>
                        </Stack>
                    </Box>

                    <Box
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            background: '#fff',
                            overflow: 'hidden',
                        }}
                    >
                        <TimeClockStats
                            startDate={startDate}
                            endDate={endDate}
                            onDateRangeChange={handleDateRangeChange}
                            payrollCycle={payrollCycle}
                            headerDetail={headerDetail}
                            currency={currency}
                            formatHour={formatHour}
                            table={table}
                            search={search}
                            setSearch={setSearch}
                            anchorEl={anchorEl}
                            handlePopoverOpen={handlePopoverOpen}
                            handlePopoverClose={handlePopoverClose}
                            userHasRatePermission={userHasRatePermission}
                            amountColumns={AMOUNT_COLUMNS as unknown as string[]}
                        />

                        <TimeClockTable
                            table={table}
                            currency={currency}
                            selectedRows={selectedRows}
                            expandedWorklogsIds={[]}
                            editingWorklogs={editingWorklogs}
                            savingWorklogs={savingWorklogs}
                            formatHour={formatHour}
                            sanitizeDateTime={sanitizeDateTime}
                            validateAndFormatTime={validateAndFormatTime}
                            hasValidWorklogData={hasValidWorklogData}
                            isRecordLocked={isRecordLocked}
                            handleRowSelect={handleRowSelect}
                            startEditingField={startEditingField}
                            updateEditingField={updateEditingField}
                            cancelEditingField={cancelEditingField}
                            saveFieldChanges={saveFieldChanges}
                            onDeleteClick={handleDeleteRecord}
                        />
                    </Box>
                </Stack>

                <StartWorkDialog
                    open={startDialogOpen}
                    onClose={() => setStartDialogOpen(false)}
                    onConfirm={handleStartWork}
                    loading={clockLoading}
                    companyId={user?.company_id}
                />

                <Snackbar
                    open={toast.open}
                    autoHideDuration={4000}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    onClose={closeToast}
                >
                    <Alert
                        onClose={closeToast}
                        severity={toast.severity}
                        variant="filled"
                        sx={{ borderRadius: 2, fontSize: 13 }}
                    >
                        {toast.message}
                    </Alert>
                </Snackbar>
            </Box>
    );
};

export default TimeTracking;
