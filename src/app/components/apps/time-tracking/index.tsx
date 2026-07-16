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
    DialogActions,
    DialogContent,
    DialogTitle,
    Select,
    FormControl,
    InputLabel,
    MenuItem,
    Card,
    CardContent,
    IconButton,
    Drawer,
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
    Circle,
    Polygon,
    Polyline,
} from '@react-google-maps/api';

import { useSession } from 'next-auth/react';

import api from '@/utils/axios';
import TimeClockTable from './components/TimeClockTable';
import TimeClockStats from './components/TimeClockStats';
import PermissionGuard from '@/app/auth/PermissionGuard';
import { useTimeClockData } from './hooks/useTimeClockData';
import { useEditingState } from './hooks/useEditingState';
import { DailyBreakdown } from './types/timeClock';
import type { User } from 'next-auth';
import AddExpense from '@/app/components/apps/time-clock/time-clock-details/expenses/add-expense';
import AddWorklog from '@/app/components/apps/time-clock/time-clock-details/worklog/add-worklog';
import AddPricework from '@/app/components/apps/time-clock/time-clock-details/pricework/add-pricework';
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from '@/utils/googleMaps';

const TIME_TRACKING_PAGE = 'time-tracking-page';
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 13;

const WEEK_DAY_MAP: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
};

const AMOUNT_COLUMNS = [
    'priceWork', 'cis_amount', 'gross_amount', 'netPayableAmount',
    'adjustment', 'payableAmount', 'dailyTotal',
] as const;

const PIN_COLORS: Record<string, string> = {
    start: '#1976d2', end: '#fc4b6c',
    start_work: '#1976d2', stop_work: '#fc4b6c',
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

type ProjectResourceShift = Partial<ShiftApiResponse> & {
    id: number;
    name: string;
};

type ProjectOption = {
    id: number;
    name: string;
    shifts: ProjectResourceShift[];
};

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
    geofences?: WorklogGeofenceApi[];
    weekly_total_hours: string;
    weekly_payable_amount: string;
};

type WorklogLocationsResponse = {
    IsSuccess: boolean;
    message: string;
    info?: {
        locations?: LocationPoint[];
        geofences?: WorklogGeofenceApi[];
    };
};

type WorklogGeofenceType = 'circle' | 'polygon' | 'polyline';

interface WorklogGeofenceApi {
    id?: number | string;
    name?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    radius?: number | string | null;
    type?: string | null;
    color?: string | null;
    coordinates?: unknown;
    boundary?: string | null;
}

interface WorklogGeofence {
    id: string;
    name: string;
    type: WorklogGeofenceType;
    center: google.maps.LatLngLiteral;
    radius: number;
    color: string;
    path: google.maps.LatLngLiteral[];
}

type LocationCoords = {
    latitude: number;
    longitude: number;
    address?: string;
};

type LocationErrorType = 'denied' | 'unavailable' | 'timeout' | null;

type ToastState = {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
};

interface LocationPoint {
    id?: number;
    label?: string;
    address?: string;
    latitude: number | string;
    longitude: number | string;
    time?: string;
    type: 'start' | 'end' | 'start_work' | 'stop_work';
    date_time?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

const secondsToHHMMSS = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const toLatLng = (lat: number | string, lng: number | string) => ({
    lat: Number(lat),
    lng: Number(lng),
});

const isValidLatLng = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const hasLocationCoordinates = (
    point?: Pick<LocationPoint, 'latitude' | 'longitude'> | null
): point is Pick<LocationPoint, 'latitude' | 'longitude'> => {
    if (!point) return false;
    return isValidLatLng(Number(point.latitude), Number(point.longitude));
};

const normalizeLocations = (locations?: LocationPoint[]): LocationPoint[] =>
    (Array.isArray(locations) ? locations : []).filter(hasLocationCoordinates);

const parseGeofencePath = (coordinates: unknown): google.maps.LatLngLiteral[] => {
    let raw = coordinates;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch { return []; }
    }
    if (!Array.isArray(raw)) return [];
    return raw
        .map((point) => {
            if (!point || typeof point !== 'object') return null;
            const v = point as Record<string, unknown>;
            const lat = Number(v.lat ?? v.latitude);
            const lng = Number(v.lng ?? v.longitude);
            return isValidLatLng(lat, lng) ? { lat, lng } : null;
        })
        .filter((p): p is google.maps.LatLngLiteral => p !== null);
};

const normalizeGeofences = (geofences?: WorklogGeofenceApi[]): WorklogGeofence[] =>
    (Array.isArray(geofences) ? geofences : [])
        .map((zone, index) => {
            const zoneType: WorklogGeofenceType =
                zone?.type === 'polygon' || zone?.type === 'polyline' ? zone.type : 'circle';

            const lat = Number(zone?.latitude);
            const lng = Number(zone?.longitude);
            const center = isValidLatLng(lat, lng) ? { lat, lng } : null;

            let path: google.maps.LatLngLiteral[] = [];
            if (zone?.boundary && typeof zone.boundary === 'string') {
                try {
                    const bd = JSON.parse(zone.boundary);
                    if (bd.coordinates && Array.isArray(bd.coordinates)) {
                        path = parseGeofencePath(bd.coordinates);
                    }
                } catch {
                    path = parseGeofencePath(zone?.coordinates);
                }
            } else {
                path = parseGeofencePath(zone?.coordinates);
            }

            const radius = Number(zone?.radius);
            const validRadius = Number.isFinite(radius) && radius > 0 ? radius : 0;

            if (zoneType === 'circle' && (!center || validRadius <= 0)) return null;
            if (zoneType === 'polygon' && path.length < 3) return null;
            if (zoneType === 'polyline' && path.length < 2) return null;

            const fallbackCenter = center ?? path[0];
            if (!fallbackCenter) return null;

            return {
                id: String(zone?.id ?? `zone-${index}`),
                name: String(zone?.name ?? '').trim(),
                type: zoneType,
                center: fallbackCenter,
                radius: validRadius,
                color: typeof zone?.color === 'string' && zone.color.trim() ? zone.color : '#1976d2',
                path,
            };
        })
        .filter((z): z is WorklogGeofence => z !== null);

const extendBoundsWithGeofence = (bounds: google.maps.LatLngBounds, geofence: WorklogGeofence): boolean => {
    if (geofence.type === 'circle') {
        const center = new google.maps.LatLng(geofence.center.lat, geofence.center.lng);
        const computeOffset = google.maps.geometry?.spherical?.computeOffset;
        if (computeOffset && geofence.radius > 0) {
            [0, 90, 180, 270].forEach((deg) => bounds.extend(computeOffset(center, geofence.radius, deg)));
            return true;
        }
        bounds.extend(center);
        return true;
    }
    if (geofence.path.length === 0) return false;
    geofence.path.forEach((p) => bounds.extend(p));
    return true;
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

const getTodayDayName = () => WEEK_DAY_MAP[new Date().getDay()];

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
    columnVisibility: VisibilityState
) => {
    try {
        localStorage.setItem(TIME_TRACKING_PAGE, JSON.stringify({
            startDate: startDate?.toDateString() ?? null,
            endDate: endDate?.toDateString() ?? null,
            columnVisibility,
        }));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

const getIPAddress = async (): Promise<string | null> => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) throw new Error('Failed to fetch IP');
        const data = await res.json();
        return data.ip ?? null;
    } catch {
        return null;
    }
};

const getAddressFromCoordinates = (latitude: number, longitude: number): Promise<string | null> => {
    return new Promise((resolve) => {
        if (typeof google === 'undefined' || !google.maps?.Geocoder) {
            console.warn('Google Maps Geocoder not available');
            resolve(null);
            return;
        }

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const address = results[0].formatted_address;
                    console.log('✅ Address resolved:', address);
                    resolve(address);
                } else {
                    console.warn('Geocoder returned no results, status:', status);
                    resolve(null);
                }
            }
        );
    });
};

const flyToZone = (map: google.maps.Map, zone: WorklogGeofence) => {
    if (zone.type === 'circle') {
        map.panTo(zone.center);
        map.setZoom(DEFAULT_ZOOM);
    } else if (zone.path.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        zone.path.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds);
    }
};

const useGeolocation = (
    lastKnownLocation: LocationCoords | null,
    setLastKnownLocation: (loc: LocationCoords | null) => void
) => {
    const getLocation = useCallback(
        async (onError: (type: LocationErrorType) => void): Promise<LocationCoords | null> => {
            if (!navigator.geolocation) {
                onError('unavailable');
                return lastKnownLocation ?? null;
            }

            const toErrorType = (err: GeolocationPositionError): LocationErrorType =>
                err.code === err.PERMISSION_DENIED ? 'denied'
                    : err.code === err.POSITION_UNAVAILABLE ? 'unavailable'
                        : 'timeout';

            const requestPosition = (timeout: number): Promise<GeolocationPosition> =>
                new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout,
                        enableHighAccuracy: true,
                        maximumAge: 0,
                    })
                );

            if (navigator.permissions) {
                try {
                    const result = await navigator.permissions.query({ name: 'geolocation' });
                    if (result.state === 'denied') {
                        onError('denied');
                        return null;
                    }
                } catch { /* fall through */ }
            }

            let best: (LocationCoords & { accuracy: number }) | null = null;
            let lastError: LocationErrorType = 'unavailable';

            for (let i = 0; i < 3; i++) {
                try {
                    const timeout = 30000 + i * 10000;
                    console.log(`⏳ GPS attempt ${i + 1} (${timeout / 1000}s timeout)…`);
                    const pos = await requestPosition(timeout);
                    const candidate = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy ?? Infinity,
                    };
                    console.log(`📍 Attempt ${i + 1} — accuracy: ${candidate.accuracy.toFixed(2)}m`);
                    if (!best || candidate.accuracy < best.accuracy) best = candidate;
                    if (candidate.accuracy <= 30) break;
                    if (i < 2) await new Promise((r) => setTimeout(r, 3000));
                } catch (err) {
                    lastError = toErrorType(err as GeolocationPositionError);
                    if (lastError === 'denied') {
                        onError('denied');
                        return null;
                    }
                }
            }

            if (!best) {
                onError(lastError);
                return lastKnownLocation ?? null;
            }

            // ✅ Use Maps JS Geocoder (reliable, same credential scope as the loaded map)
            const address = await getAddressFromCoordinates(best.latitude, best.longitude);

            const result: LocationCoords = {
                latitude: best.latitude,
                longitude: best.longitude,
                address: address ?? undefined,
            };

            setLastKnownLocation(result);
            console.log('✅ Location cached:', {
                lat: result.latitude.toFixed(6),
                lng: result.longitude.toFixed(6),
                address: result.address ?? '(none)',
                accuracy: best.accuracy.toFixed(2) + 'm',
            });

            return result;
        },
        [lastKnownLocation, setLastKnownLocation]
    );

    return { getLocation };
};

interface LocationPermissionDialogProps {
    open: boolean;
    onClose: () => void;
    onRetry: () => void;
    errorType: LocationErrorType;
}

const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({open, onClose, onRetry, errorType}) => {
    const isDenied = errorType === 'denied';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
                PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <Box sx={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />

            <DialogTitle sx={{ pt: 2.5, pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{
                        width: 40, height: 40, borderRadius: 2,
                        background: 'rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
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
                            Your browser has blocked location access. Please enable it to proceed.
                        </Typography>
                        <Box sx={{
                            background: '#fafafa', border: '1px solid', borderColor: 'divider',
                            borderRadius: 2, p: 1.5,
                        }}>
                            <Typography fontSize={12} fontWeight={700} mb={1}>How to enable in Chrome:</Typography>
                            {CHROME_STEPS.map((step, i) => (
                                <Stack key={i} direction="row" spacing={1} mb={0.5} alignItems="flex-start">
                                    <Box sx={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, mt: 0.1,
                                    }}>
                                        <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{i + 1}</Typography>
                                    </Box>
                                    <Typography fontSize={12} color="text.secondary" lineHeight={1.5}>{step}</Typography>
                                </Stack>
                            ))}
                        </Box>
                    </Stack>
                ) : (
                    <Typography fontSize={13} color="text.secondary" lineHeight={1.6}>
                        {errorType === 'timeout'
                            ? 'Location timed out. Ensure GPS is enabled and try again.'
                            : 'Location unavailable. Please check your device settings.'}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button onClick={onClose} variant="outlined" size="small"
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                    Cancel
                </Button>
                {isDenied ? (
                    <Button onClick={onClose} variant="contained" size="small"
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, background: 'linear-gradient(135deg,#ef4444,#f97316)' }}>
                        Got it
                    </Button>
                ) : (
                    <Button onClick={onRetry} variant="contained" size="small"
                            startIcon={<IconMapPin size={14} />}
                            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
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
    loading: boolean;
}

const ClockButton: React.FC<ClockButtonProps> = ({ isWorking, onClick, loading }) => {
    const gradient = isWorking
        ? 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)'
        : 'linear-gradient(135deg, #4ecdc4 0%, #44a5c2 100%)';
    const shadow = isWorking
        ? '0 12px 32px rgba(255,107,107,0.35)'
        : '0 12px 32px rgba(78,205,196,0.35)';

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
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: shadow,
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                userSelect: 'none', gap: 0.5,
                '&:hover': loading ? {} : { transform: 'scale(1.08)' },
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
            <Typography sx={{
                color: '#fff', fontWeight: 800,
                fontSize: { xs: 11, md: 12 },
                letterSpacing: 0.5, mt: 0.25, textTransform: 'uppercase',
            }}>
                {isWorking ? 'Stop' : 'Start'}
            </Typography>
        </Box>
    );
};

interface PinOverlayProps {
    position: google.maps.LatLngLiteral;
    color: string;
    userName?: string;
    userImage?: string | null;
    userInitials?: string;
}

const PinOverlay: React.FC<PinOverlayProps> = ({ position, color, userName, userImage, userInitials }) => {
    const [hovered, setHovered] = useState(false);
    const pinColor = color || '#1976d2';
    const displayInitials =
        (userInitials?.slice(0, 2) || userName?.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2) || 'U').toUpperCase();

    return (
        <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                     getPixelPositionOffset={() => ({ x: -24, y: -58 })}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: 'relative', width: 48, height: 58, cursor: 'pointer',
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
                    width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pinColor, border: `2px solid ${pinColor}`, boxSizing: 'border-box',
                }}>
                    {userImage ? (
                        <img src={userImage} alt={userName || 'User'}
                             style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 11, userSelect: 'none', fontFamily: 'sans-serif' }}>
                            {displayInitials}
                        </span>
                    )}
                </div>
            </div>
        </OverlayView>
    );
};

interface StartWorkDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (shiftId: number, projectId: number | null, coords: LocationCoords) => void;
    loading: boolean;
    lastKnownLocation?: LocationCoords | null;
    setLastKnownLocation?: (loc: LocationCoords | null) => void;
}

const StartWorkDialog: React.FC<StartWorkDialogProps> = ({open, onClose, onConfirm, loading, lastKnownLocation, setLastKnownLocation}) => {
    const { getLocation } = useGeolocation(lastKnownLocation ?? null, setLastKnownLocation ?? (() => {}));

    const [shifts, setShifts] = useState<ShiftOption[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedShift, setSelectedShift] = useState<number | ''>('');
    const [selectedProject, setSelectedProject] = useState<number | ''>('');
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [shiftDayError, setShiftDayError] = useState<string | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<LocationErrorType>(null);
    const [locationDialogOpen, setLocationDialogOpen] = useState(false);

    const handleShiftChange = useCallback((shiftId: number | '', currentShifts: ShiftOption[]) => {
        setSelectedShift(shiftId);
        setShiftDayError(null);
        if (!shiftId) return;
        const shift = currentShifts.find((s) => s.id === shiftId);
        if (!shift) return;
        const todayName = getTodayDayName();
        const dayEntry = shift.week_days.find((d) => d.name.toLowerCase() === todayName);
        if (!dayEntry?.status) {
            setShiftDayError(`"${shift.name}" is not scheduled for ${capitalize(todayName)}.`);
        }
    }, []);

    // Fetch projects and their assigned shifts when dialog opens
    useEffect(() => {
        if (!open) return;
        setSelectedShift('');
        setSelectedProject('');
        setProjects([]);
        setShifts([]);
        setShiftDayError(null);
        setLocationError(null);
        setLoadingProjects(true);
        setLoadingShifts(false);

        api.get('/user-worklog/get-resources')
            .then((res) => {
                const mapped: ProjectOption[] = (res.data?.info ?? []).map((p: {
                    id: number;
                    name: string;
                    shifts?: ProjectResourceShift[];
                }) => ({
                    id: p.id,
                    name: p.name,
                    shifts: Array.isArray(p.shifts) ? p.shifts : [],
                }));
                setProjects(mapped);
                if (mapped.length === 1) setSelectedProject(mapped[0].id);
            })
            .catch(() => setProjects([]))
            .finally(() => setLoadingProjects(false));
    }, [open]);

    // Load shifts from selected project's resources
    useEffect(() => {
        if (!open) return;
        setSelectedShift('');
        setShiftDayError(null);
        setShifts([]);

        if (!selectedProject) return;

        const selectedProjectData = projects.find((p) => p.id === Number(selectedProject));
        const mapped: ShiftOption[] = (selectedProjectData?.shifts ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            start_time: s.start_time ?? '',
            end_time: s.end_time ?? '',
            is_pricework: s.is_pricework ?? false,
            week_days: s.week_days ?? [],
        }));

        setShifts(mapped);
        if (mapped.length === 1) handleShiftChange(mapped[0].id, mapped);
    }, [open, selectedProject, projects, handleShiftChange]);

    const requestLocationAndConfirm = useCallback(async () => {
        setLocationLoading(true);
        const coords = await getLocation((type) => {
            setLocationError(type);
            setLocationDialogOpen(true);
        });
        setLocationLoading(false);
        if (!coords) return;
        onConfirm(Number(selectedShift), selectedProject ? Number(selectedProject) : null, coords);
    }, [getLocation, onConfirm, selectedShift, selectedProject]);

    const handleConfirm = () => {
        if (!selectedShift || shiftDayError) return;
        requestLocationAndConfirm();
    };

    const handleLocationDialogClose = () => {
        setLocationDialogOpen(false);
        setLocationError(null);
    };

    const isShiftUnavailable = (shift: ShiftOption) => {
        if (!shift.week_days.length) return false;
        const todayName = getTodayDayName();
        return !shift.week_days.find((d) => d.name.toLowerCase() === todayName)?.status;
    };

    const isConfirmDisabled = !selectedProject || !selectedShift || !!shiftDayError || loading || loadingShifts || locationLoading;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pb: 1 }}>Start Work</DialogTitle>

                <DialogContent sx={{ pt: 1 }}>
                    <Stack spacing={2} mt={1}>
                        {/* Project */}
                        <FormControl fullWidth size="small" required>
                            <InputLabel>Select Project</InputLabel>
                            {loadingProjects ? (
                                <Skeleton height={40} sx={{ mt: 0.5 }} />
                            ) : (
                                <Select
                                    label="Select Project"
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value as number)}
                                    MenuProps={{ PaperProps: { sx: { maxHeight: 300, mt: 1 } } }}
                                    sx={{ '& .MuiSelect-select': { py: 1.2, display: 'flex', alignItems: 'center' } }}
                                >
                                    {projects.map((p) => (
                                        <MenuItem key={p.id} value={p.id} sx={{ minHeight: 42 }}>
                                            <Typography>{p.name}</Typography>
                                        </MenuItem>
                                    ))}
                                </Select>
                            )}
                        </FormControl>

                        {/* Shift */}
                        <FormControl fullWidth size="small" required error={!!shiftDayError}>
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
                                            <MenuItem key={s.id} value={s.id} sx={{ opacity: unavailable ? 0.45 : 1 }}>
                                                <Stack direction="row" alignItems="center" spacing={1} width="100%">
                                                    <Box sx={{
                                                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                                        background: unavailable ? '#ef4444' : '#22c55e',
                                                    }} />
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography fontSize={13} fontWeight={600} lineHeight={1.2}>{s.name}</Typography>
                                                        {s.start_time && s.end_time && (
                                                            <Typography fontSize={11} color="text.secondary">{s.start_time} – {s.end_time}</Typography>
                                                        )}
                                                    </Box>
                                                    {unavailable && (
                                                        <Typography fontSize={10} color="error" sx={{ flexShrink: 0 }}>Not today</Typography>
                                                    )}
                                                </Stack>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            )}
                            {shiftDayError && (
                                <Typography fontSize={11} color="error" mt={0.5} ml={1.5}>{shiftDayError}</Typography>
                            )}
                        </FormControl>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={onClose} variant="outlined" size="small"
                            sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        variant="contained"
                        size="small"
                        disabled={isConfirmDisabled}
                        startIcon={
                            loading || locationLoading
                                ? <CircularProgress size={14} color="inherit" />
                                : <IconClockPlay size={16} />
                        }
                        sx={{ textTransform: 'none', fontWeight: 600 }}
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

interface GeofenceOverlayProps {
    zone: WorklogGeofence;
    onZoneClick: (zone: WorklogGeofence) => void;
}

const ZoneLabel: React.FC<{ zone: WorklogGeofence; onClick: () => void }> = ({ zone, onClick }) => (
    <OverlayView position={zone.center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
        <Box
            onClick={onClick}
            sx={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', transform: 'translate(-50%, -100%)', width: 'max-content',
            }}
        >
            <Box sx={{
                backgroundColor: '#fff', border: `2px solid ${zone.color}`,
                borderRadius: '4px', px: 1.25, py: 0.35,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>
                    {zone.name}
                </Typography>
            </Box>
            <Box sx={{ width: '2px', height: '20px', backgroundColor: zone.color }} />
        </Box>
    </OverlayView>
);

const GeofenceOverlay: React.FC<GeofenceOverlayProps> = ({ zone, onZoneClick }) => {
    const handleClick = () => onZoneClick(zone);

    if (zone.type === 'circle') {
        return (
            <React.Fragment key={zone.id}>
                <Circle center={zone.center} radius={zone.radius}
                        options={{ strokeColor: zone.color, fillColor: zone.color + '33' }} />
                <ZoneLabel zone={zone} onClick={handleClick} />
            </React.Fragment>
        );
    }

    if (zone.type === 'polygon') {
        return (
            <React.Fragment key={zone.id}>
                <Polygon paths={zone.path}
                         options={{ strokeColor: zone.color, fillColor: zone.color + '33', strokeWeight: 2 }}
                         onClick={handleClick} />
                <ZoneLabel zone={zone} onClick={handleClick} />
            </React.Fragment>
        );
    }

    if (zone.type === 'polyline') {
        return (
            <React.Fragment key={zone.id}>
                <Polyline path={zone.path}
                          options={{ strokeColor: zone.color, strokeWeight: 3 }}
                          onClick={handleClick} />
                <ZoneLabel zone={zone} onClick={handleClick} />
            </React.Fragment>
        );
    }

    return null;
};

const DEFAULT_CLOCK_INFO: TodayClockInfo = {
    user_is_working: false,
    user_worklog_id: null,
    clock_in_time: null,
    total_work_hours_today: '00:00',
    current_shift_name: null,
    current_project_name: null,
    weekly_total_hours: '00:00',
    weekly_payable_amount: '0.00',
};

interface Props {
    queryParams?: Record<string, string | null>;
}

const TimeTracking: React.FC<Props> = () => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number };
    const userId: string = (user as any)?.user_id ?? (user as any)?.id ?? '';

    const [lastKnownLocation, setLastKnownLocation] = useState<LocationCoords | null>(null);

    const initialSettings = useMemo(() => {
        const stored = loadStoredSettings();
        if (stored.startDate && stored.endDate) return stored;
        const { start, end } = getCurrentWeekRange();
        return { startDate: start, endDate: end, columnVisibility: {} as VisibilityState };
    }, []);

    const [startDate, setStartDate] = useState<Date | null>(initialSettings.startDate);
    const [endDate, setEndDate] = useState<Date | null>(initialSettings.endDate);
    const [currency, setCurrency] = useState<string>('');
    const [clockInfo, setClockInfo] = useState<TodayClockInfo>(DEFAULT_CLOCK_INFO);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [startDialogOpen, setStartDialogOpen] = useState(false);
    const [clockLoading, setClockLoading] = useState(false);
    const [todayLoading, setTodayLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>({ open: false, message: '', severity: 'success' });
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ ...initialSettings.columnVisibility });
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [showPayableAmounts, setShowPayableAmounts] = useState(false);
    const [tableExpanded, setTableExpanded] = useState(false);
    const [locations, setLocations] = useState<LocationPoint[]>([]);
    const [geofences, setGeofences] = useState<WorklogGeofence[]>([]);
    const [addExpenseSidebar, setAddExpenseSidebar] = useState(false);
    const [addWorklogSidebar, setAddWorklogSidebar] = useState(false);
    const [addPriceworkSidebar, setAddPriceworkSidebar] = useState(false);

    const latestTodayClockRequestRef = useRef(0);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
        ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    });

    const { data, setData, fetchTimeClockData, payrollCycle, fetchPayrollCycle, headerDetail } = useTimeClockData(userId);
    const { editingWorklogs, savingWorklogs, setSavingWorklogs, startEditingField, cancelEditingField, updateEditingField } = useEditingState();

    // ── Toast ──
    const showToast = useCallback(
        (message: string, severity: 'success' | 'error' = 'success') =>
            setToast({ open: true, message, severity }),
        []
    );
    const closeToast = useCallback(() => setToast((t) => ({ ...t, open: false })), []);

    const fitMapToBounds = useCallback((map: google.maps.Map, locs: LocationPoint[], fences: WorklogGeofence[]) => {
        const validPoints = locs.filter(hasLocationCoordinates);
        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        validPoints.forEach((p) => { bounds.extend(toLatLng(p.latitude, p.longitude)); hasBounds = true; });
        fences.forEach((z) => { hasBounds = extendBoundsWithGeofence(bounds, z) || hasBounds; });

        if (!hasBounds) return;

        if (validPoints.length === 1 && fences.length === 0) {
            map.panTo(toLatLng(validPoints[0].latitude, validPoints[0].longitude));
            map.setZoom(DEFAULT_ZOOM);
        } else {
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    }, []);

    useEffect(() => {
        if (mapRef.current) fitMapToBounds(mapRef.current, locations, geofences);
    }, [locations, geofences, fitMapToBounds]);

    useEffect(() => { fetchPayrollCycle(); }, [fetchPayrollCycle]);

    useEffect(() => {
        setColumnVisibility((prev) => ({
            ...prev,
            ...Object.fromEntries(AMOUNT_COLUMNS.map((col) => [col, true])),
        }));
    }, []);

    useEffect(() => {
        if (clockInfo.user_is_working) {
            timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        } else {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            setElapsed(0);
        }
        return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    }, [clockInfo.user_is_working]);

    // Fetch worklog locations
    const fetchWorklogLocations = useCallback(async (worklogId: number) => {
        try {
            const res: AxiosResponse<WorklogLocationsResponse> = await api.get(
                'user-worklog/get-worklog-locations', { params: { worklog_id: worklogId } }
            );
            if (!res.data?.IsSuccess) return null;
            return {
                locations: normalizeLocations(res.data.info?.locations),
                geofences: normalizeGeofences(res.data.info?.geofences),
            };
        } catch {
            return null;
        }
    }, []);

    // Fetch today's clock status
    const fetchTodayClock = useCallback(async () => {
        const requestId = ++latestTodayClockRequestRef.current;
        setTodayLoading(true);
        try {
            const res: AxiosResponse<ActiveWorklogResponse> = await api.get('user-worklog/get-active-worklog');
            const d = res.data;
            if (requestId !== latestTodayClockRequestRef.current) return;

            if (d.IsSuccess) {
                setElapsed(
                    d.is_working && d.clock_in_time
                        ? Math.max(0, Math.floor((Date.now() - new Date(d.clock_in_time).getTime()) / 1000))
                        : 0
                );
                setClockInfo({
                    user_is_working: d.is_working,
                    user_worklog_id: d.worklog_id,
                    clock_in_time: d.clock_in_time,
                    total_work_hours_today: d.total_work_hours_today ?? '00:00',
                    current_shift_name: d.shift_name,
                    current_project_name: d.project_name,
                    weekly_total_hours: d.weekly_total_hours ?? '00:00',
                    weekly_payable_amount: d.weekly_payable_amount ?? '0.00',
                });
                if (d.currency) setCurrency(d.currency);

                let nextLocations = normalizeLocations(d.locations);
                let nextGeofences = normalizeGeofences(d.geofences);

                if (d.worklog_id) {
                    const wl = await fetchWorklogLocations(d.worklog_id);
                    if (requestId !== latestTodayClockRequestRef.current) return;
                    if (wl) { nextLocations = wl.locations; nextGeofences = wl.geofences; }
                }

                setLocations(nextLocations);
                setGeofences(nextGeofences);
            } else {
                setLocations([]);
                setGeofences([]);
            }
        } catch {
            if (requestId !== latestTodayClockRequestRef.current) return;
            setLocations([]);
            setGeofences([]);
        } finally {
            if (requestId !== latestTodayClockRequestRef.current) return;
            setTodayLoading(false);
        }
    }, [fetchWorklogLocations]);

    const handleMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
        fitMapToBounds(map, locations, geofences);
        if (!locations.length && !geofences.length) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(12);
        }
    }, [locations, geofences, fitMapToBounds]);

    useEffect(() => { fetchTodayClock(); }, [fetchTodayClock]);
    useEffect(() => { if (userId) fetchTimeClockData(startDate, endDate); }, [userId, fetchTimeClockData, startDate, endDate]);

    // Formatters
    const formatHour = useCallback((val: string | number | null | undefined, isPricework = false): string => {
        if (val == null) return isPricework ? '--' : '00:00';
        if (isPricework) return '--';
        const str = val.toString().trim();
        if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
            const [h, m] = str.split(':');
            return `${h.padStart(2, '0')}:${Math.floor(parseFloat(m) || 0).toString().padStart(2, '0')}`;
        }
        const num = parseFloat(str);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            return `${h.toString().padStart(2, '0')}:${Math.round((num - h) * 60).toString().padStart(2, '0')}`;
        }
        return isPricework ? '--' : '00:00';
    }, []);

    const parseDate = useCallback((dateString: string): Date | null => {
        if (!dateString) return null;
        try { return parse(dateString, 'EEE d/M', new Date()); } catch { return null; }
    }, []);

    const sanitizeDateTime = useCallback(
        (dt: string) => (dt && dt !== 'Invalid DateTime' ? dt : '--'),
        []
    );

    const isRecordLocked = useCallback(
        (log: any) => ['6', 6, '9', 9].includes(log?.status),
        []
    );

    const hasValidWorklogData = useCallback(
        (row: DailyBreakdown) =>
            !!row.worklog_id && row.start !== '--' && row.end !== '--' && row.start != null && row.end != null,
        []
    );

    const validateAndFormatTime = useCallback((value: string): string => {
        if (!value?.trim()) return '';
        const digits = value.replace(/\D/g, '');
        if (!digits.length) return '';
        let h = 0, m = 0;
        if (digits.length === 1) { h = parseInt(digits); }
        else if (digits.length === 2) {
            const n = parseInt(digits);
            if (n <= 23) { h = n; } else { h = parseInt(digits[0]); m = parseInt(digits[1]) * 10; }
        } else if (digits.length === 3) {
            const firstTwo = parseInt(digits.slice(0, 2));
            if (firstTwo <= 23) { h = firstTwo; m = parseInt(digits[2]) * 10; }
            else { h = parseInt(digits[0]); m = parseInt(digits.slice(1, 3)); }
        } else {
            h = parseInt(digits.slice(0, 2));
            m = parseInt(digits.slice(2, 4));
        }
        return `${Math.min(h, 23).toString().padStart(2, '0')}:${Math.min(m, 59).toString().padStart(2, '0')}`;
    }, []);

    // Daily data
    const dailyData = useMemo<DailyBreakdown[]>(() => {
        if (!data?.length) return [];
        const currencySymbol = currency || '';

        return data.flatMap((week: any) =>
            (week.days ?? []).map((day: any) => {
                const worklogs = day.worklogs ?? [];
                const base = {
                    rowType: 'day' as const,
                    date: day.date ?? '--',
                    has_pending_leave_request: day.has_pending_leave_request ?? false,
                    is_timesheet_paid: ['9', 9].includes(day.status),
                    timesheet_ids: day.timesheet_ids ?? null,
                    shift: '--', project: '--', start: '--', end: '--',
                    priceWork: '--', expense: '--', cis_amount: '--', gross_amount: '--',
                    checkIns: '--', totalHours: '--', penaltyHours: '--',
                    regular: '--', address: '--', check_in: '--', check_out: '--',
                    rowSpan: 1, status_text: '--', is_requested: false, is_edited: false,
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
                return { ...base, dailyTotal: '--', netPayableAmount: '--', daily_adjustment_amount: '--', payableAmount: '--' };
            })
        );
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

    // ── Handlers ──
    const saveFieldChanges = useCallback(async (worklogId: string, originalLog: any) => {
        const editedData = editingWorklogs[worklogId];
        if (!editedData || isRecordLocked(originalLog)) { cancelEditingField(worklogId); return; }

        const newStart = validateAndFormatTime(editedData.start ?? '');
        const newEnd = validateAndFormatTime(editedData.end ?? '');

        if (sanitizeDateTime(originalLog.start) === newStart && sanitizeDateTime(originalLog.end) === newEnd) {
            cancelEditingField(worklogId); return;
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
        } catch {
            showToast('Failed to save changes', 'error');
        } finally {
            setSavingWorklogs((p) => { const s = new Set(p); s.delete(worklogId); return s; });
            cancelEditingField(worklogId);
        }
    }, [editingWorklogs, isRecordLocked, cancelEditingField, validateAndFormatTime, sanitizeDateTime, setSavingWorklogs, fetchTimeClockData, startDate, endDate, showToast]);

    const handleDeleteRecord = useCallback(async (id: string, type: string) => {
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
        } catch {
            showToast('Failed to delete record', 'error');
        }
    }, [fetchTimeClockData, startDate, endDate, showToast]);

    const handleStopWork = useCallback(async () => {
        if (!clockInfo.user_worklog_id) return;
        setClockLoading(true);
        try {
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
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 })
                );
                payload.latitude = String(pos.coords.latitude);
                payload.longitude = String(pos.coords.longitude);
                const address = await getAddressFromCoordinates(pos.coords.latitude, pos.coords.longitude);
                if (address) payload.address = address;
            } catch { /* location not available */ }

            const res: AxiosResponse<ApiResponse> = await api.post('user-worklog/user-stop-work', payload);
            if (res.data.IsSuccess) {
                showToast(res.data.message || 'Work stopped!', 'success');
                await fetchTodayClock();
                await fetchTimeClockData(startDate, endDate);
            } else {
                showToast(res.data.message || 'Failed to stop work', 'error');
            }
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Failed to stop work', 'error');
        } finally {
            setClockLoading(false);
        }
    }, [clockInfo.user_worklog_id, user?.company_id, showToast, fetchTodayClock, fetchTimeClockData, startDate, endDate]);

    const handleStartWork = useCallback(async (shiftId: number, projectId: number | null, coords: LocationCoords) => {
        setClockLoading(true);
        try {
            const ipAddress = await getIPAddress();
            const payload: Record<string, unknown> = {
                shift_id: shiftId, device_type: 3,
                device_model_type: ipAddress
                    ? `${navigator.userAgent.substring(0, 50)} | IP: ${ipAddress}`
                    : navigator.userAgent.substring(0, 50),
                latitude: String(coords.latitude),
                longitude: String(coords.longitude),
                ...(coords.address ? { address: coords.address } : {}),
                ...(user?.company_id ? { company_id: user.company_id } : {}),
            };
            if (projectId) payload.project_id = projectId;

            const res: AxiosResponse<ApiResponse> = await api.post('user-worklog/user-start-work', payload);
            if (res.data.IsSuccess) {
                showToast(res.data.message || 'Work started!', 'success');
                setStartDialogOpen(false);
                await fetchTodayClock();
                await fetchTimeClockData(startDate, endDate);
            }
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Failed to start work', 'error');
        } finally {
            setClockLoading(false);
        }
    }, [user?.company_id, showToast, fetchTodayClock, fetchTimeClockData, startDate, endDate]);

    const handleClockButtonClick = useCallback(() => {
        if (clockInfo.user_is_working) handleStopWork();
        else setStartDialogOpen(true);
    }, [clockInfo.user_is_working, handleStopWork]);

    const handleDateRangeChange = useCallback((range: { from: Date | null; to: Date | null }) => {
        if (!range.from || !range.to || !userId) return;
        setStartDate(range.from);
        setEndDate(range.to);
        setData([]);
        fetchTimeClockData(range.from, range.to);
        saveSettingsToStorage(range.from, range.to, columnVisibility);
    }, [fetchTimeClockData, columnVisibility, setData, userId]);

    const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget), []);
    const handlePopoverClose = useCallback(() => setAnchorEl(null), []);

    const closeAddExpenseSidebar = useCallback(async () => {
        setAddExpenseSidebar(false);
        try { await fetchTimeClockData(startDate, endDate); } catch { /* ignore */ }
    }, [fetchTimeClockData, startDate, endDate]);

    const closeAddWorklogSidebar = useCallback(async () => {
        setAddWorklogSidebar(false);
        try { await fetchTimeClockData(startDate, endDate); } catch { /* ignore */ }
    }, [fetchTimeClockData, startDate, endDate]);

    const closeAddPriceworkSidebar = useCallback(() => {
        setAddPriceworkSidebar(false);
    }, []);

    const userImg = (user as any)?.user_image || (user as any)?.image || undefined;
    const userInitials = user?.name
        ? user.name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    return (
        <PermissionGuard permission="Time Tracking">
            <Box sx={{ width: '100%', background: '#f8f9fb' }}>
                <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>

                    <Typography sx={{ fontSize: { xs: 26, sm: 30, md: 32 }, fontWeight: 700, color: '#1a1a1a', my: 2 }}>
                        Time Tracking
                    </Typography>

                    {/* ── Stats Cards ── */}
                    <Box sx={{
                        display: 'grid', gap: 3, mb: 3,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: '2fr 1fr 1fr 1fr' },
                    }}>
                        {/* TimeClock Card */}
                        <Card sx={{ borderRadius: 3, border: '1px solid #e8eef7', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', background: '#fff' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, mb: 2 }}>
                                    TimeClock
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                                       alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        {todayLoading ? <Skeleton variant="text" height={40} /> : (
                                            <>
                                                <Typography sx={{ fontSize: { xs: 22, sm: 26 }, fontWeight: 700, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5, mb: 0.75 }}>
                                                    {secondsToHHMMSS(elapsed)}
                                                </Typography>
                                                {clockInfo.user_is_working ? (
                                                    <Stack spacing={0.5}>
                                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                                            <Box sx={{
                                                                width: 7, height: 7, borderRadius: '50%', background: '#4caf50',
                                                                animation: 'blink 1.2s ease-in-out infinite',
                                                                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                                                            }} />
                                                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#4caf50' }}>Active</Typography>
                                                        </Stack>
                                                        {clockInfo.current_shift_name && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                <IconClock size={12} color="#999" />
                                                                <Typography sx={{ fontSize: 11, color: '#666' }} noWrap>{clockInfo.current_shift_name}</Typography>
                                                            </Box>
                                                        )}
                                                        {clockInfo.current_project_name && (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                <IconMapPin size={12} color="#999" />
                                                                <Typography sx={{ fontSize: 11, color: '#666' }} noWrap>{clockInfo.current_project_name}</Typography>
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                ) : (
                                                    <Typography sx={{ fontSize: 12, color: '#999' }}>No active session</Typography>
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

                        {/* Week Total */}
                        <Card sx={{ borderRadius: 3, border: '1px solid #e8eef7', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, background: '#90caf9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconClock size={22} color="#1565c0" stroke={2} />
                                    </Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1565c0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Week Total
                                    </Typography>
                                </Box>
                                {todayLoading ? <Skeleton variant="text" height={44} width={120} /> : (
                                    <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: '#0d47a1', fontVariantNumeric: 'tabular-nums' }}>
                                        {clockInfo.weekly_total_hours}h
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        {/* Total Payable */}
                        <Card sx={{ borderRadius: 3, border: '1px solid #e8eef7', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Box sx={{ width: 40, height: 40, borderRadius: 2, background: '#a5d6a7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconCurrencyDollar size={22} color="#1b5e20" stroke={2} />
                                        </Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1b5e20', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Total Payable
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" onClick={() => setShowPayableAmounts(!showPayableAmounts)}
                                                sx={{ padding: '4px', color: '#1b5e20', '&:hover': { backgroundColor: 'rgba(27,94,32,0.08)' } }}>
                                        {showPayableAmounts ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                                    </IconButton>
                                </Box>
                                {todayLoading || !currency ? <Skeleton variant="text" height={44} width={120} /> : (
                                    <Typography sx={{
                                        fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: '#1b5e20',
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: showPayableAmounts ? 'normal' : '3px',
                                        fontFamily: showPayableAmounts ? 'inherit' : 'monospace',
                                    }}>
                                        {showPayableAmounts ? `${currency}${clockInfo.weekly_payable_amount}` : '••••••'}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Insight */}
                        <Card sx={{ borderRadius: 3, border: '1px solid #e8eef7', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                    <Box sx={{ width: 40, height: 40, borderRadius: 2, background: '#ce93d8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <IconSparkles size={22} color="#6a1b9a" stroke={2} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#6a1b9a', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
                                            AI Insight
                                        </Typography>
                                        <Typography sx={{ fontSize: 13, color: '#4a148c', lineHeight: 1.5, fontWeight: 500 }}>
                                            No insights available
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* ── Map + Table ── */}
                    <Box sx={{
                        display: 'grid', gap: 3, mb: 3,
                        gridTemplateColumns: { xs: '1fr', lg: tableExpanded ? '1fr' : '2fr 3fr' },
                    }}>
                        {/* Map */}
                        {!tableExpanded && (
                            <Card sx={{
                                borderRadius: 3, border: '1px solid #e8eef7',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.05)', background: '#fff',
                                overflow: 'hidden', height: '100%', minHeight: { xs: 320, sm: 380, md: 460 },
                            }}>
                                <Box sx={{ p: 2, borderBottom: '1px solid #e8eef7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Work Location
                                    </Typography>
                                </Box>

                                {!isGoogleMapsLoaded || googleMapsLoadError ? (
                                    <Box sx={{ height: { xs: 280, sm: 340, md: 450 }, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', flexDirection: 'column', gap: 2 }}>
                                        <Typography color="textSecondary" fontSize={14}>
                                            {googleMapsLoadError ? 'Failed to load map' : 'Loading map…'}
                                        </Typography>
                                        {googleMapsLoadError && (
                                            <Button size="small" onClick={() => window.location.reload()} variant="outlined">Retry</Button>
                                        )}
                                    </Box>
                                ) : (
                                    <Box sx={{ height: { xs: 280, sm: 340, md: 450 } }}>
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            zoom={DEFAULT_ZOOM}
                                            center={DEFAULT_CENTER}
                                            onLoad={handleMapLoad}
                                            options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
                                        >
                                            {/* Geofences */}
                                            {geofences.map((zone) => (
                                                <GeofenceOverlay key={zone.id} zone={zone} onZoneClick={(z) => mapRef.current && flyToZone(mapRef.current, z)} />
                                            ))}

                                            {/* Location pins */}
                                            {locations.filter(hasLocationCoordinates).map((loc, i) => (
                                                <React.Fragment key={`pin-${i}`}>
                                                    <PinOverlay
                                                        position={toLatLng(loc.latitude, loc.longitude)}
                                                        color={PIN_COLORS[loc.type] ?? '#1976d2'}
                                                        userName={user?.name ?? 'User'}
                                                        userImage={userImg}
                                                        userInitials={userInitials}
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </GoogleMap>
                                    </Box>
                                )}
                            </Card>
                        )}

                        {/* Table */}
                        <Box sx={{ border: '1px solid #e8eef7', borderRadius: 3, background: '#fff', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                            <TimeClockStats
                                startDate={startDate} endDate={endDate}
                                onDateRangeChange={handleDateRangeChange}
                                payrollCycle={payrollCycle} headerDetail={headerDetail}
                                currency={currency} formatHour={formatHour} table={table}
                                search={search} setSearch={setSearch}
                                anchorEl={anchorEl}
                                handlePopoverOpen={handlePopoverOpen}
                                handlePopoverClose={handlePopoverClose}
                                userHasRatePermission
                                amountColumns={AMOUNT_COLUMNS as unknown as string[]}
                                onAddExpense={() => setAddExpenseSidebar(true)}
                                onAddWorklog={() => setAddWorklogSidebar(true)}
                                onAddPricework={() => setAddPriceworkSidebar(true)}
                                tableExpanded={tableExpanded}
                                onToggleTableExpanded={() => setTableExpanded((prev) => !prev)}
                            />
                            <TimeClockTable
                                table={table} currency={currency}
                                expandedWorklogsIds={[]}
                                editingWorklogs={editingWorklogs} savingWorklogs={savingWorklogs}
                                formatHour={formatHour} sanitizeDateTime={sanitizeDateTime}
                                validateAndFormatTime={validateAndFormatTime}
                                hasValidWorklogData={hasValidWorklogData} isRecordLocked={isRecordLocked}
                                startEditingField={startEditingField} updateEditingField={updateEditingField}
                                cancelEditingField={cancelEditingField} saveFieldChanges={saveFieldChanges}
                                onDeleteClick={handleDeleteRecord}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Dialogs & Drawers */}
                <StartWorkDialog
                    open={startDialogOpen}
                    onClose={() => setStartDialogOpen(false)}
                    onConfirm={handleStartWork}
                    loading={clockLoading}
                    lastKnownLocation={lastKnownLocation}
                    setLastKnownLocation={setLastKnownLocation}
                />

                <Drawer anchor="right" open={addExpenseSidebar} onClose={closeAddExpenseSidebar}
                        PaperProps={{ sx: { width: '504px', borderTopLeftRadius: 18, borderBottomLeftRadius: 18, overflow: 'hidden' } }}>
                    <AddExpense
                        onClose={closeAddExpenseSidebar}
                        userId={Number(userId)}
                        selectUser={false}
                        companyId={Number(user.company_id)}
                    />
                </Drawer>

                <Drawer anchor="right" open={addWorklogSidebar} onClose={closeAddWorklogSidebar}
                        PaperProps={{ sx: { width: '504px', borderTopLeftRadius: 18, borderBottomLeftRadius: 18, overflow: 'hidden' } }}>
                    <AddWorklog
                        onClose={closeAddWorklogSidebar}
                        userId={Number(userId)}
                        selectUser={false}
                        companyId={Number(user.company_id)}
                        onDataRefresh={() => fetchTimeClockData(startDate, endDate)}
                    />
                </Drawer>

                <Drawer anchor="right" open={addPriceworkSidebar} onClose={closeAddPriceworkSidebar}
                        PaperProps={{ sx: { width: '504px', borderTopLeftRadius: 18, borderBottomLeftRadius: 18, overflow: 'hidden' } }}>
                    <AddPricework
                        onClose={closeAddPriceworkSidebar}
                        userId={Number(userId)}
                        selectUser={false}
                        companyId={Number(user.company_id)}
                        onDataRefresh={() => fetchTimeClockData(startDate, endDate)}
                    />
                </Drawer>

                <Snackbar open={toast.open} autoHideDuration={4000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} onClose={closeToast}>
                    <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ borderRadius: 2, fontSize: 13 }}>
                        {toast.message}
                    </Alert>
                </Snackbar>
            </Box>
        </PermissionGuard>
    );
};

export default TimeTracking;
