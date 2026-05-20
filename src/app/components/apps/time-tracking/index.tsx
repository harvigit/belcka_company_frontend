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
    Card,
    CardContent,
    IconButton,
    Menu, Drawer,
} from '@mui/material';

import {
    IconClockPlay,
    IconPlayerStop,
    IconMapPin,
    IconMapPinOff,
    IconClock,
    IconCurrencyDollar,
    IconSparkles,
    IconEye,
    IconEyeOff,
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

import {
    GoogleMap,
    OverlayView,
    useJsApiLoader,
} from '@react-google-maps/api';

import { useSession } from 'next-auth/react';

import api from '@/utils/axios';
import TimeClockTable from './components/TimeClockTable';
import TimeClockStats from './components/TimeClockStats';
import PermissionGuard from '@/app/auth/PermissionGuard';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import { useTimeClockData } from './hooks/useTimeClockData';
import { useEditingState } from './hooks/useEditingState';
import { DailyBreakdown } from './types/timeClock';
import type { User } from 'next-auth';
import AddExpense from '@/app/components/apps/time-clock/time-clock-details/expenses/add-expense';

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

const GOOGLE_MAP_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 13;

const PIN_COLORS: Record<string, string> = {
    start: '#1976d2',
    end: '#fc4b6c',
    start_work: '#1976d2',
    stop_work: '#fc4b6c',
};

const CHROME_STEPS = [
    'Click the lock icon 🔒 in the address bar',
    'Select "Site settings"',
    'Set Location to "Allow"',
    'Refresh and try again',
];

type TodayClockInfo = {
    user_is_working: boolean;
    user_worklog_id: number | null;
    clock_in_time: string | null;
    total_work_hours_today: string;
    current_shift_name: string | null;
    current_project_name: string | null;
    weekly_total_hours: string;
    weekly_payable_amount: string;
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

interface ShiftApiResponse {
    id: number;
    name: string;
    start_time: string | null;
    end_time: string | null;
    is_pricework: boolean;
    week_days: WeekDay[] | null;
}

type ProjectOption = { id: number; name: string };

type ApiResponse<T = unknown> = {
    IsSuccess: boolean;
    message: string;
    data?: T;
};

type ActiveWorklogResponse = {
    company_id: number;
    currency: string;
    IsSuccess: boolean;
    message: string;
    is_working: boolean;
    worklog_id: number | null;
    clock_in_time: string | null;
    shift_name: string | null;
    project_name: string | null;
    total_work_hours_today: string;
    locations?: LocationPoint[];
    weekly_total_hours: string;
    weekly_payable_amount: string;
};

type LocationCoords = { latitude: number; longitude: number };

type LocationErrorType = 'denied' | 'unavailable' | 'timeout' | null;

type ToastState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

interface LocationPoint {
    label: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
    time?: string;
    type: 'start' | 'end';
}

interface LocationPermissionDialogProps {
    open: boolean;
    onClose: () => void;
    onRetry: () => void;
    errorType: LocationErrorType;
}

interface ClockButtonProps {
    isWorking: boolean;
    elapsed: number;
    currentShift: string | null;
    currentProject: string | null;
    onClick: () => void;
    loading: boolean;
}

interface PinOverlayProps {
    position: google.maps.LatLngLiteral;
    color: string;
    userName?: string;
    userImage?: string | null;
    userInitials?: string;
}

interface StartWorkDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (shiftId: number, projectId: number | null, coords: LocationCoords) => void;
    loading: boolean;
    companyId?: number;
}

interface Props {
    queryParams?: Record<string, string | null>;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const secondsToHHMMSS = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const toLatLng = (lat: number | string, lng: number | string) => ({
    lat: Number(lat),
    lng: Number(lng),
});

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
    } catch (error) {
        console.error('Error loading settings:', error);
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
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

const getIPAddress = async (): Promise<string | null> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Failed to fetch IP');

        const data = await response.json();
        return data.ip || null;
    } catch (error) {
        console.warn('Could not fetch IP address:', error);
        return null;
    }
};

const useGeolocation = () => {
    const getLocation = useCallback(
        (onError: (type: LocationErrorType) => void): Promise<LocationCoords | null> =>
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
                            Your browser has blocked location access. Please enable it to proceed with clocking
                            in.
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
                                        <Typography
                                            sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}
                                        >
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

const ClockButton: React.FC<ClockButtonProps> = ({
                                                     isWorking,
                                                     onClick,
                                                     loading
                                                 }) => {
    const gradient = isWorking ? 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)' : 'linear-gradient(135deg, #4ecdc4 0%, #44a5c2 100%)';
    const shadow = isWorking ? '0 12px 32px rgba(255, 107, 107, 0.35)' : '0 12px 32px rgba(78, 205, 196, 0.35)';

    return (
        <Box
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-label={isWorking ? 'Stop Work' : 'Start Work'}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            sx={{
                width: { xs: 108, sm: 124, md: 140 },
                height: { xs: 108, sm: 124, md: 140 },
                borderRadius: '50%',
                background: gradient,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: shadow,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                userSelect: 'none',
                gap: 0.5,
                '&:hover': loading
                    ? {}
                    : {
                        transform: 'scale(1.08)',
                        boxShadow: `${shadow.replace('0.35', '0.45')}`,
                    },
                '&:active': loading ? {} : { transform: 'scale(0.96)' },
                '&:focus-visible': { outline: '3px solid #3b82f6', outlineOffset: 4 },
                opacity: loading ? 0.7 : 1,
            }}
        >
            {loading ? (
                <CircularProgress size={32} color="inherit" sx={{ color: 'white' }} />
            ) : isWorking ? (
                <IconPlayerStop size={32} color="#fff" stroke={2.5} />
            ) : (
                <IconClockPlay size={32} color="#fff" stroke={2.5} />
            )}
            <Typography
                sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: { xs: 11, md: 12 },
                    letterSpacing: 0.5,
                    mt: 0.25,
                    textTransform: 'uppercase',
                }}
            >
                {isWorking ? 'Stop' : 'Start'}
            </Typography>
        </Box>
    );
};

const PinOverlay: React.FC<PinOverlayProps> = ({
                                                   position, color, userName, userImage, userInitials
                                               }) => {
    const [hovered, setHovered] = useState(false);
    const pinColor = color || '#1976d2';
    const displayInitials = userInitials?.slice(0, 2).toUpperCase()
        || userName?.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        || 'U';

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: -24, y: -58 })}
        >
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: 'relative',
                    width: 48,
                    height: 58,
                    cursor: 'pointer',
                    filter: hovered ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' : 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))',
                    transform: hovered ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                    transition: 'filter 0.15s ease, transform 0.15s ease',
                }}
            >
                <svg width="48" height="58" viewBox="0 0 48 58" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <path d="M24 0C13.507 0 5 8.507 5 19c0 14.25 19 39 19 39S43 33.25 43 19C43 8.507 34.493 0 24 0z" fill={pinColor} />
                    <circle cx="24" cy="19" r="15" fill="white" />
                    <circle cx="24" cy="19" r="15" fill={pinColor} fillOpacity="0.12" />
                </svg>
                <div style={{
                    position: 'absolute', top: 4, left: 9,
                    width: 30, height: 30, borderRadius: '50%',
                    overflow: 'hidden', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pinColor,
                    border: `2px solid ${pinColor}`,
                    boxSizing: 'border-box',
                }}>
                    {userImage ? (
                        <img
                            src={userImage}
                            alt={userName || 'User'}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    ) : (
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 11, lineHeight: 1, userSelect: 'none', fontFamily: 'sans-serif' }}>
                            {displayInitials}
                        </span>
                    )}
                </div>
            </div>
        </OverlayView>
    );
};

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

    const handleShiftChange = useCallback(
        (shiftId: number | '', currentShifts: ShiftOption[]) => {
            setSelectedShift(shiftId);
            setShiftDayError(null);

            if (!shiftId) return;

            const shift = currentShifts.find((s) => s.id === shiftId);
            if (!shift) return;

            const todayName = getTodayDayName();
            const dayEntry = shift.week_days.find(
                (d) => d.name.toLowerCase() === todayName
            );

            if (!dayEntry?.status) {
                setShiftDayError(
                    `"${shift.name}" is not scheduled for ${capitalize(todayName)}.`
                );
            }
        },
        []
    );

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

        api
            .get('/project/get', { params })
            .then((res) => {
                const mapped = (res.data?.info ?? []).map(
                    (p: { id: number; name: string }) => ({
                        id: p.id,
                        name: p.name,
                    })
                );
                setProjects(mapped);
                if (mapped.length === 1) {
                    setSelectedProject(mapped[0].id);
                }
            })
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

        api
            .get('/shift/list', { params })
            .then((res) => {
                const mapped: ShiftOption[] = (res.data?.info ?? []).map((s: ShiftApiResponse) => ({
                    id: s.id,
                    name: s.name,
                    start_time: s.start_time ?? '',
                    end_time: s.end_time ?? '',
                    is_pricework: s.is_pricework,
                    week_days: s.week_days ?? [],
                }));
                setShifts(mapped);
                if (mapped.length === 1) {
                    handleShiftChange(mapped[0].id, mapped);
                }
            })
            .catch(() => setShifts([]))
            .finally(() => setLoadingShifts(false));
    }, [open, selectedProject, companyId, handleShiftChange]);

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
            coords
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
                                    onChange={(e) => setSelectedProject(e.target.value as number)}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {projects.map((p) => (
                                        <MenuItem key={p.id} value={p.id}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl
                                fullWidth
                                size="small"
                                required
                                error={!!shiftDayError}
                            >
                                <InputLabel>Select Shift</InputLabel>
                                {loadingShifts ? (
                                    <Skeleton height={40} sx={{ mt: 0.5 }} />
                                ) : (
                                    <Select
                                        label="Select Shift"
                                        value={selectedShift}
                                        onChange={(e) => handleShiftChange(e.target.value as number, shifts)}
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

    const [startDate, setStartDate] = useState<Date | null>(
        initialSettings.startDate
    );
    const [endDate, setEndDate] = useState<Date | null>(initialSettings.endDate);
    const [currency, setCurrency] = useState<string>('');

    const [clockInfo, setClockInfo] = useState<TodayClockInfo>({
        user_is_working: false,
        user_worklog_id: null,
        clock_in_time: null,
        total_work_hours_today: '00:00',
        current_shift_name: null,
        current_project_name: null,
        weekly_total_hours: '00:00',
        weekly_payable_amount: '0.00',
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
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        ...initialSettings.columnVisibility,
    });
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [showPayableAmounts, setShowPayableAmounts] = useState(false);
    const [tableExpanded, setTableExpanded] = useState(false);
    const [locations, setLocations] = useState<LocationPoint[]>([]);
    const mapRef = useRef<google.maps.Map | null>(null);
    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
        libraries: GOOGLE_MAP_LIBRARIES,
    });

    const [addExpenseSidebar, setAddExpenseSidebar] = useState<boolean>(false);
    const [companyId, setCompanyId] = useState<number | null>(null);


    const {
        data,
        setData,
        fetchTimeClockData,
        userHasRatePermission,
        payrollCycle,
        fetchPayrollCycle,
        headerDetail,
    } = useTimeClockData(userId);

    const {
        editingWorklogs,
        savingWorklogs,
        setSavingWorklogs,
        startEditingField,
        cancelEditingField,
        updateEditingField,
    } = useEditingState();

    const showToast = useCallback(
        (message: string, severity: 'success' | 'error' = 'success') =>
            setToast({ open: true, message, severity }),
        []
    );

    const closeToast = useCallback(
        () => setToast((t) => ({ ...t, open: false })),
        []
    );

    useEffect(() => {
        if (!mapRef.current || locations.length === 0) return;

        const validPoints = locations.filter((l) => l.latitude && l.longitude);
        if (validPoints.length === 0) return;

        if (validPoints.length === 1) {
            mapRef.current.panTo(toLatLng(validPoints[0].latitude, validPoints[0].longitude));
            mapRef.current.setZoom(DEFAULT_ZOOM);
        } else {
            const bounds = new google.maps.LatLngBounds();
            validPoints.forEach((l) =>
                bounds.extend(toLatLng(l.latitude, l.longitude))
            );
            mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    }, [locations]);

    useEffect(() => {
        fetchPayrollCycle();
    }, [fetchPayrollCycle]);

    useEffect(() => {
        setColumnVisibility((prev) => ({
            ...prev,
            ...Object.fromEntries(
                AMOUNT_COLUMNS.map((col) => [
                    col,
                    userHasRatePermission && showPayableAmounts,
                ])
            ),
        }));
    }, [userHasRatePermission, showPayableAmounts]);

    useEffect(() => {
        if (clockInfo.user_is_working) {
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setElapsed(0);
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [clockInfo.user_is_working]);

    const fetchTodayClock = useCallback(async () => {
        setTodayLoading(true);
        try {
            const res: AxiosResponse<ActiveWorklogResponse> = await api.get(
                'user-worklog/get-active-worklog'
            );
            const data = res.data;

            if (data.IsSuccess) {
                setElapsed(
                    data.is_working && data.clock_in_time
                        ? Math.max(
                            0,
                            Math.floor(
                                (Date.now() - new Date(data.clock_in_time).getTime()) / 1000
                            )
                        )
                        : 0
                );
                setClockInfo({
                    user_is_working: data.is_working,
                    user_worklog_id: data.worklog_id,
                    clock_in_time: data.clock_in_time,
                    total_work_hours_today: data.total_work_hours_today ?? '00:00',
                    current_shift_name: data.shift_name,
                    current_project_name: data.project_name,
                    weekly_total_hours: data.weekly_total_hours ?? '00:00',
                    weekly_payable_amount: data.weekly_payable_amount ?? '0.00',
                });

                setCompanyId(data.company_id);
                if (data.currency !== null) {
                    setCurrency(data.currency);
                }
                if (data.locations) {
                    setLocations(data.locations);
                }
            }
        } catch (error) {
            console.error('Error fetching today clock:', error);
        } finally {
            setTodayLoading(false);
        }
    }, []);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;

        const validPoints = locations.filter((l) => l.latitude && l.longitude);
        if (validPoints.length === 0) {
            if (!clockInfo.user_is_working) {
                map.setCenter(DEFAULT_CENTER);
                map.setZoom(12);
            }
            return;
        }

        if (validPoints.length === 1) {
            map.setCenter(toLatLng(validPoints[0].latitude, validPoints[0].longitude));
            map.setZoom(DEFAULT_ZOOM);
        } else {
            const bounds = new google.maps.LatLngBounds();
            validPoints.forEach((l) =>
                bounds.extend(toLatLng(l.latitude, l.longitude))
            );
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    };

    // Initial Data Fetching
    useEffect(() => {
        fetchTodayClock();
    }, [fetchTodayClock]);

    useEffect(() => {
        if (userId) fetchTimeClockData(startDate, endDate);
    }, [userId, fetchTimeClockData, startDate, endDate]);

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
        []
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
        []
    );

    const isRecordLocked = useCallback(
        (log: any): boolean => ['6', 6, '9', 9].includes(log?.status),
        []
    );

    const hasValidWorklogData = useCallback(
        (row: DailyBreakdown): boolean =>
            !!row.worklog_id &&
            row.start !== '--' &&
            row.end !== '--' &&
            row.start != null &&
            row.end != null,
        []
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

        const currencySymbol = currency || '';

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
                    weeklyPayableAmount: `${currencySymbol}${week.weekly_payable_amount || 0}`,
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
                        netPayableAmount: `${currencySymbol}${day.daily_net_payable_amount}`,
                        daily_adjustment_amount: day.daily_adjustment_amount ?? 0,
                        payableAmount: `${currencySymbol}${day.daily_payable_amount}`,
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

    const headerStyle: React.CSSProperties = {
        display: 'block',
        textAlign: 'center',
        color: '#203040',
    };

    const mainTableColumns = useMemo<ColumnDef<DailyBreakdown, any>[]>(
        () => [
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
                id: 'break',
                accessorKey: 'break',
                header: () => <span style={headerStyle}>Break</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day'
                        ? row.original.total_break_hours
                        : null,
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
                        (log: any) => log.is_pricework
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
                        (log: any) => log.is_pricework
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
                        ? row.original.netPayableAmount ?? '--'
                        : null,
                size: 130,
            },
            {
                id: 'adjustment',
                accessorKey: 'adjustment',
                header: () => <span style={headerStyle}>Adjustment</span>,
                cell: ({ row }) =>
                    row.original.rowType === 'day'
                        ? row.original.adjustment ?? '--'
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
        []
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
                console.error('Error saving field changes:', e);
                showToast('Failed to save changes', 'error');
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
            showToast,
        ]
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
                    type === 'leave' ? { user_leave_id: id } : { ids: id }
                );
                if (res.data.IsSuccess) {
                    await fetchTimeClockData(startDate, endDate);
                    showToast('Record deleted successfully', 'success');
                }
            } catch (e) {
                console.error('Error deleting record:', e);
                showToast('Failed to delete record', 'error');
            }
        },
        [fetchTimeClockData, startDate, endDate, showToast]
    );

    const handleStopWork = useCallback(async () => {
        if (!clockInfo.user_worklog_id) return;
        setClockLoading(true);

        try {
            // Get IP address
            const ipAddress = await getIPAddress();

            const payload: Record<string, unknown> = {
                user_worklog_id: clockInfo.user_worklog_id,
                device_type: 3,
                device_model_type: ipAddress
                    ? `${navigator.userAgent.substring(0, 50)} | IP: ${ipAddress}`
                    : navigator.userAgent.substring(0, 50),
                ...(user?.company_id ? { company_id: user.company_id } : {}),
            };

            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                    })
                );
                payload.latitude = String(pos.coords.latitude);
                payload.longitude = String(pos.coords.longitude);
            } catch {
                // Location not available — proceed without coords
            }

            const res: AxiosResponse<ApiResponse> = await api.post(
                'user-worklog/user-stop-work',
                payload
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
                'error'
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

    const handleClockButtonClick = useCallback(() => {
        if (clockInfo.user_is_working) handleStopWork();
        else setStartDialogOpen(true);
    }, [clockInfo.user_is_working, handleStopWork]);

    const handleStartWork = useCallback(
        async (shiftId: number, projectId: number | null, coords: LocationCoords) => {
            setClockLoading(true);
            try {
                // Get IP address
                const ipAddress = await getIPAddress();

                const payload: Record<string, unknown> = {
                    shift_id: shiftId,
                    device_type: 3,
                    device_model_type: ipAddress
                        ? `${navigator.userAgent.substring(0, 50)} | IP: ${ipAddress}`
                        : navigator.userAgent.substring(0, 50),
                    latitude: String(coords.latitude),
                    longitude: String(coords.longitude),
                    ...(user?.company_id ? { company_id: user.company_id } : {}),
                };
                if (projectId) payload.project_id = projectId;

                const res: AxiosResponse<ApiResponse> = await api.post(
                    'user-worklog/user-start-work',
                    payload
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
                    'error'
                );
            } finally {
                setClockLoading(false);
            }
        },
        [user?.company_id, showToast, fetchTodayClock, fetchTimeClockData, startDate, endDate]
    );

    const handleDateRangeChange = useCallback(
        (range: { from: Date | null; to: Date | null }) => {
            if (!range.from || !range.to) return;
            if (!userId) return;

            setStartDate(range.from);
            setEndDate(range.to);
            setData([]);
            fetchTimeClockData(range.from, range.to);
            saveSettingsToStorage(range.from, range.to, columnVisibility);
        },
        [fetchTimeClockData, columnVisibility, setData, userId]
    );

    const handlePopoverOpen = useCallback(
        (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
        []
    );

    const handleAddExpense = async () => {
        setAddExpenseSidebar(true);
    };

    const closeAddExpenseSidebar = async () => {
        setAddExpenseSidebar(false);
        try {
            const defaultStartDate = startDate;
            const defaultEndDate = endDate;
            await fetchTimeClockData(defaultStartDate, defaultEndDate);
        } catch (error) {
            console.error('Error fetching time clock data after closing add expense sidebar:', error);
        }
    };

    const handlePopoverClose = useCallback(() => setAnchorEl(null), []);

    return (
        <PermissionGuard permission="Time Tracking">
            <Box sx={{ width: '100%', background: '#f8f9fb' }}>
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
                    {/* PAGE TITLE */}
                    <Typography
                        sx={{
                            fontSize: { xs: 26, sm: 30, md: 32 },
                            fontWeight: 700,
                            color: '#1a1a1a',
                            my: 2,
                            letterSpacing: 0,
                        }}
                    >
                        Time Tracking
                    </Typography>

                    {/* TOP STATS CARDS */}
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 3,
                            mb: 3,
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, minmax(0, 1fr))',
                                xl: '2fr 1fr 1fr 1fr',
                            },
                        }}
                    >
                        {/* TimeClock Card */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                border: '1px solid #e8eef7',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                background: '#fff',
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#666',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        mb: 2,
                                    }}
                                >
                                    TimeClock
                                </Typography>

                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    justifyContent="space-between"
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {todayLoading ? (
                                            <Skeleton variant="text" height={40} />
                                        ) : (
                                            <>
                                                <Typography
                                                    sx={{
                                                        fontSize: { xs: 22, sm: 26 },
                                                        fontWeight: 700,
                                                        color: '#1a1a1a',
                                                        fontVariantNumeric: 'tabular-nums',
                                                        letterSpacing: 0.5,
                                                        mb: 0.75,
                                                    }}
                                                >
                                                    {secondsToHHMMSS(elapsed)}
                                                </Typography>

                                                {clockInfo.user_is_working ? (
                                                    <Stack spacing={0.5}>
                                                        <Stack
                                                            direction="row"
                                                            alignItems="center"
                                                            spacing={0.75}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: 7,
                                                                    height: 7,
                                                                    borderRadius: '50%',
                                                                    background: '#4caf50',
                                                                    animation: 'blink 1.2s ease-in-out infinite',
                                                                    '@keyframes blink': {
                                                                        '0%,100%': { opacity: 1 },
                                                                        '50%': { opacity: 0.3 },
                                                                    },
                                                                }}
                                                            />
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    color: '#4caf50',
                                                                }}
                                                            >
                                                                Active
                                                            </Typography>
                                                        </Stack>
                                                        {clockInfo.current_shift_name && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.75,
                                                                }}
                                                            >
                                                                <IconClock size={12} color="#999" />
                                                                <Typography
                                                                    sx={{ fontSize: 11, color: '#666' }}
                                                                    noWrap
                                                                >
                                                                    {clockInfo.current_shift_name}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {clockInfo.current_project_name && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.75,
                                                                }}
                                                            >
                                                                <IconMapPin size={12} color="#999" />
                                                                <Typography
                                                                    sx={{ fontSize: 11, color: '#666' }}
                                                                    noWrap
                                                                >
                                                                    {clockInfo.current_project_name}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                ) : (
                                                    <Typography sx={{ fontSize: 12, color: '#999' }}>
                                                        No active session
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </Box>

                                    <Box sx={{ flexShrink: 0, alignSelf: { xs: 'center', sm: 'auto' } }}>
                                        <ClockButton
                                            isWorking={clockInfo.user_is_working}
                                            elapsed={elapsed}
                                            currentShift={clockInfo.current_shift_name}
                                            currentProject={clockInfo.current_project_name}
                                            onClick={handleClockButtonClick}
                                            loading={clockLoading}
                                        />
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>

                        {/* Week Total Card */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                border: '1px solid #e8eef7',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            background: '#90caf9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <IconClock size={22} color="#1565c0" stroke={2} />
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#1565c0',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Week Total
                                    </Typography>
                                </Box>
                                {todayLoading ? (
                                    <Skeleton variant="text" height={44} width={120} />
                                ) : (
                                    <Typography
                                        sx={{
                                            fontSize: { xs: 24, sm: 28 },
                                            fontWeight: 700,
                                            color: '#0d47a1',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {clockInfo.weekly_total_hours}h
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        {/* Total Payable Card */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                border: '1px solid #e8eef7',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                background: '#a5d6a7',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <IconCurrencyDollar size={22} color="#1b5e20" stroke={2} />
                                        </Box>
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#1b5e20',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                            }}
                                        >
                                            Total Payable
                                        </Typography>
                                    </Box>
                                    {userHasRatePermission && (
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowPayableAmounts(!showPayableAmounts)}
                                            sx={{
                                                padding: '4px',
                                                color: '#1b5e20',
                                                '&:hover': { backgroundColor: 'rgba(27, 94, 32, 0.08)' }
                                            }}
                                        >
                                            {showPayableAmounts ? (
                                                <IconEye size={18} />
                                            ) : (
                                                <IconEyeOff size={18} />
                                            )}
                                        </IconButton>
                                    )}
                                </Box>
                                {todayLoading || !currency ? (
                                    <Skeleton variant="text" height={44} width={120} />
                                ) : (
                                    <Typography
                                        sx={{
                                            fontSize: { xs: 24, sm: 28 },
                                            fontWeight: 700,
                                            color: '#1b5e20',
                                            fontVariantNumeric: 'tabular-nums',
                                            letterSpacing: showPayableAmounts ? 'normal' : '3px',
                                            fontFamily: showPayableAmounts ? 'inherit' : 'monospace',
                                        }}
                                    >
                                        {userHasRatePermission
                                            ? showPayableAmounts
                                                ? `${currency}${clockInfo.weekly_payable_amount}`
                                                : '••••••'
                                            : '0.00'}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Insight Card */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                border: '1px solid #e8eef7',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            }}
                        >
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            background: '#ce93d8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <IconSparkles size={22} color="#6a1b9a" stroke={2} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#6a1b9a',
                                                textTransform: 'uppercase',
                                                letterSpacing: 0.5,
                                                mb: 0.75,
                                            }}
                                        >
                                            AI Insight
                                        </Typography>
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                color: '#4a148c',
                                                lineHeight: 1.5,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {'No insights available'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* MAP + TABLE SECTION */}
                    <Box
                        sx={{
                            display: 'grid',
                            gap: 3,
                            mb: 3,
                            gridTemplateColumns: {
                                xs: '1fr',
                                lg: tableExpanded ? '1fr' : '2fr 3fr',
                            },
                        }}
                    >
                        {/* Map Card */}
                        {!tableExpanded && (
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    border: '1px solid #e8eef7',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                    background: '#fff',
                                    overflow: 'hidden',
                                    height: '100%',
                                    minHeight: { xs: 320, sm: 380, md: 460 },
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderBottom: '1px solid #e8eef7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: '#666',
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        Work Location
                                    </Typography>
                                </Box>
                                {!isGoogleMapsLoaded || googleMapsLoadError ? (
                                    <Box
                                        sx={{
                                            height: { xs: 280, sm: 340, md: 450 },
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#f5f5f5',
                                            borderRadius: 1,
                                            flexDirection: 'column',
                                            gap: 2,
                                        }}
                                    >
                                        <Typography color="textSecondary" fontSize={14}>
                                            {googleMapsLoadError ? 'Failed to load map' : 'Loading map…'}
                                        </Typography>
                                        {googleMapsLoadError && (
                                            <Button
                                                size="small"
                                                onClick={() => window.location.reload()}
                                                variant="outlined"
                                            >
                                                Retry
                                            </Button>
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{ height: { xs: 280, sm: 340, md: 450 } }}>
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            zoom={DEFAULT_ZOOM}
                                            center={
                                                locations.length > 0 && locations[0].latitude && locations[0].longitude
                                                    ? toLatLng(locations[0].latitude, locations[0].longitude)
                                                    : DEFAULT_CENTER
                                            }
                                            onLoad={handleMapLoad}
                                            options={{
                                                disableDefaultUI: false,
                                                zoomControl: true,
                                                streetViewControl: false,
                                                mapTypeControl: false,
                                                fullscreenControl: true,
                                            }}
                                        >
                                            {locations
                                                .filter((l) => l.latitude && l.longitude)
                                                .map((loc, index) => {
                                                    const pos = toLatLng(loc.latitude, loc.longitude);
                                                    const pinColor = PIN_COLORS[loc.type] ?? '#1976d2';

                                                    const initials = user?.name
                                                        ? user.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                                        : 'U';

                                                    const userImg = (user as any)?.user_image || (user as any)?.image || undefined;

                                                    return (
                                                        <PinOverlay
                                                            key={`pin-${index}`}
                                                            position={pos}
                                                            color={pinColor}
                                                            userName={user?.name ?? 'User'}
                                                            userImage={userImg}
                                                            userInitials={initials}
                                                        />
                                                    );
                                                })
                                            }
                                        </GoogleMap>
                                    </Box>
                                )}
                            </Card>
                        )}

                        {/* Table Section */}
                        <Box
                            sx={{
                                border: '1px solid #e8eef7',
                                borderRadius: 3,
                                background: '#fff',
                                overflow: 'hidden',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
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
                                onAddExpense={handleAddExpense}
                            />

                            <TimeClockTable
                                table={table}
                                currency={currency}
                                expandedWorklogsIds={[]}
                                editingWorklogs={editingWorklogs}
                                savingWorklogs={savingWorklogs}
                                formatHour={formatHour}
                                sanitizeDateTime={sanitizeDateTime}
                                validateAndFormatTime={validateAndFormatTime}
                                hasValidWorklogData={hasValidWorklogData}
                                isRecordLocked={isRecordLocked}
                                startEditingField={startEditingField}
                                updateEditingField={updateEditingField}
                                cancelEditingField={cancelEditingField}
                                saveFieldChanges={saveFieldChanges}
                                onDeleteClick={handleDeleteRecord}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* START WORK DIALOG */}
                <StartWorkDialog
                    open={startDialogOpen}
                    onClose={() => setStartDialogOpen(false)}
                    onConfirm={handleStartWork}
                    loading={clockLoading}
                    companyId={user?.company_id}
                />

                <Drawer
                    anchor="right"
                    open={addExpenseSidebar}
                    onClose={closeAddExpenseSidebar}
                    PaperProps={{
                        sx: {
                            borderRadius: 0,
                            boxShadow: 'none',
                            overflow: 'hidden',
                            width: '504px',
                            borderTopLeftRadius: 18,
                            borderBottomLeftRadius: 18,
                        },
                    }}
                >
                    <AddExpense
                        onClose={closeAddExpenseSidebar}
                        userId={Number(userId)}
                        selectUser={false}
                        companyId={Number(user.company_id)}
                    />
                </Drawer>

                {/* TOAST NOTIFICATION */}
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
        </PermissionGuard>
    );
};

export default TimeTracking;
