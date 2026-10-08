'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    Box,
    Stack,
    IconButton,
    Typography,
    Drawer, Badge,
} from '@mui/material';
import {
    GoogleMap,
    OverlayView,
    useJsApiLoader,
    Circle,
    Polygon,
    Polyline,
} from '@react-google-maps/api';
import {
    IconX,
    IconClock,
    IconMapPin, IconUsers,
    IconMapPinCheck,
    IconMapPinOff,
    IconLogin,
    IconLogout,
    IconPlayerPlay,
    IconPlayerStop,
} from '@tabler/icons-react';
import { AxiosResponse } from 'axios';
import api from '@/utils/axios';
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from '@/utils/googleMaps';

export type LocationPointType = 'start' | 'end' | 'check_in' | 'check_out';

export interface LocationPoint {
    label: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
    time?: string;
    type: LocationPointType;
    color?: string;
}

export interface LocationMapDrawerProps {
    open: boolean;
    onClose: () => void;
    worklogId?: number;
    userName?: string;
    userImage?: string;
    initials?: string;
    date?: string;
    shiftName?: string;
    locations?: LocationPoint[];
    isWorking?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 16;

const toLatLng = (lat: number | string, lng: number | string) => ({
    lat: Number(lat),
    lng: Number(lng),
});

const isValidLatLng = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const toCoordinateKey = (lat: number | string, lng: number | string) =>
    `${Number(lat)},${Number(lng)}`;

const withVisibleDuplicatePinOffsets = (items: LocationPoint[]) => {
    const groups = new Map<string, LocationPoint[]>();

    items
        .filter((item) => item.latitude && item.longitude)
        .forEach((item) => {
            const key = toCoordinateKey(item.latitude, item.longitude);
            groups.set(key, [...(groups.get(key) ?? []), item]);
        });

    return items.map((item) => {
        if (!item.latitude || !item.longitude) {
            return {...item, displayPosition: null, pixelOffset: {x: 0, y: 0}};
        }

        const key = toCoordinateKey(item.latitude, item.longitude);
        const group = groups.get(key) ?? [];
        const index = group.indexOf(item);
        const spacing = 18;
        const centerOffset = ((group.length - 1) * spacing) / 2;

        return {
            ...item,
            displayPosition: toLatLng(item.latitude, item.longitude),
            pixelOffset: {
                x: group.length > 1 ? index * spacing - centerOffset : 0,
                y: 0,
            },
        };
    });
};

const TYPE_META: Record<LocationPointType, { label: string; color: string; Icon: typeof IconMapPin }> = {
    start: { label: 'START WORK', color: '#22a447', Icon: IconPlayerPlay },
    check_in: { label: 'CHECK IN', color: '#1976d2', Icon: IconLogin },
    check_out: { label: 'CHECK OUT', color: '#f59e0b', Icon: IconLogout },
    end: { label: 'STOP WORK', color: '#e53935', Icon: IconPlayerStop },
};

const LEGEND_ORDER: LocationPointType[] = ['start', 'check_in', 'check_out', 'end'];

const API_TYPE_MAP: Record<string, LocationPointType> = {
    start_work: 'start',
    stop_work: 'end',
    check_in: 'check_in',
    check_out: 'check_out',
};

// ─── API Response Types ───────────────────────────────────────────────────────

interface ApiLocationItem {
    id: number;
    worklog_id: number;
    type: 'start_work' | 'stop_work' | 'check_in' | 'check_out';
    location: string;
    latitude: string;
    longitude: string;
    date_time: string | null;
}

interface ApiGeofence {
    id?: number | string;
    name?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    radius?: number | string | null;
    type?: string | null;
    color?: string | null;
    coordinates?: unknown;
    boundary?: unknown;
}

interface ApiInfo {
    user_id: number;
    user_first_name: string;
    user_last_name: string;
    user_image: string;
    user_thumbnail: string;
    user_is_working: boolean;
    locations: ApiLocationItem[];
    geofences?: ApiGeofence[];
}

interface ApiResponse {
    IsSuccess: boolean;
    message: string;
    info: ApiInfo;
}

interface Geofence {
    id: string;
    name: string;
    type: 'circle' | 'polygon' | 'polyline';
    center: google.maps.LatLngLiteral;
    radius: number;
    color: string;
    path: google.maps.LatLngLiteral[];
}

// API sends date_time as "dd/MM/yyyy HH:mm:ss" (not parseable by new Date)
const parseApiDateTime = (value: string | null): { time?: string; sortKey: number } => {
    const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return { sortKey: Number.MAX_SAFE_INTEGER };

    const [, dd, mm, yyyy, hh, min, ss = '00'] = match;
    return {
        time: `${hh}:${min}`,
        sortKey: Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min, +ss),
    };
};

// Helper to transform API locations array
const transformApiLocations = (locations: ApiLocationItem[]): LocationPoint[] => {
    return locations
        .filter((item) => item.latitude && item.longitude)
        .map((item, index) => {
            const type = API_TYPE_MAP[item.type] ?? 'end';
            const { time, sortKey } = parseApiDateTime(item.date_time);

            return {
                point: {
                    label: TYPE_META[type].label,
                    address: item.location || 'Location unavailable',
                    latitude: item.latitude,
                    longitude: item.longitude,
                    time,
                    type,
                },
                sortKey,
                index,
            };
        })
        .sort((a, b) => a.sortKey - b.sortKey || a.index - b.index)
        .map(({ point }) => point);
};

const parsePath = (coordinates: unknown): google.maps.LatLngLiteral[] => {
    let raw = coordinates;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return [];
        }
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

const transformApiGeofences = (geofences?: ApiGeofence[]): Geofence[] =>
    (Array.isArray(geofences) ? geofences : [])
        .map((zone, index): Geofence | null => {
            const type = zone.type === 'polygon' || zone.type === 'polyline' ? zone.type : 'circle';

            let boundary: any = zone.boundary;
            if (typeof boundary === 'string') {
                try {
                    boundary = JSON.parse(boundary);
                } catch {
                    boundary = null;
                }
            }

            const path = boundary?.coordinates ? parsePath(boundary.coordinates) : parsePath(zone.coordinates);
            const radius = Number(zone.radius ?? boundary?.radius);
            const validRadius = Number.isFinite(radius) && radius > 0 ? radius : 0;

            const lat = Number(zone.latitude);
            const lng = Number(zone.longitude);
            const center = isValidLatLng(lat, lng) ? { lat, lng } : path[0];

            if (!center) return null;
            if (type === 'circle' && validRadius <= 0) return null;
            if (type === 'polygon' && path.length < 3) return null;
            if (type === 'polyline' && path.length < 2) return null;

            return {
                id: String(zone.id ?? `zone-${index}`),
                name: String(zone.name ?? '').trim() || 'Work zone',
                type,
                center,
                radius: validRadius,
                color: typeof zone.color === 'string' && zone.color.trim() ? zone.color : '#1976d2',
                path,
            };
        })
        .filter((z): z is Geofence => z !== null);

// Returns the first geofence the point falls in (needs the maps geometry library)
const findZoneForPoint = (point: LocationPoint, zones: Geofence[]): Geofence | null => {
    const geometry = typeof google !== 'undefined' ? google.maps?.geometry : undefined;
    if (!geometry) return null;

    const latLng = new google.maps.LatLng(Number(point.latitude), Number(point.longitude));

    return zones.find((zone) => {
        if (zone.type === 'circle') {
            const center = new google.maps.LatLng(zone.center.lat, zone.center.lng);
            return geometry.spherical.computeDistanceBetween(latLng, center) <= zone.radius;
        }
        if (zone.type === 'polygon') {
            return geometry.poly.containsLocation(latLng, new google.maps.Polygon({ paths: zone.path }));
        }
        // ~20m tolerance for polyline zones
        return geometry.poly.isLocationOnEdge(latLng, new google.maps.Polyline({ path: zone.path }), 2e-4);
    }) ?? null;
};

const getPointColor = (point: LocationPoint) => point.color ?? TYPE_META[point.type]?.color ?? TYPE_META.end.color;

// ─── PinOverlay Props ─────────────────────────────────────────────────────────

interface PinOverlayProps {
    position: google.maps.LatLngLiteral;
    label: string;
    color: string;
    time?: string;
    userName?: string;
    userImage?: string;
    userInitials?: string;
    isWorking?: boolean;
    pixelOffset?: { x: number; y: number };
    active?: boolean;
    onClick?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PinOverlay = ({
    position,
    label,
    color,
    time,
    userName,
    userImage,
    userInitials,
    isWorking = false,
    pixelOffset = { x: 0, y: 0 },
    active = false,
    onClick,
}: PinOverlayProps) => {
    const [hovered, setHovered] = useState(false);

    const pinColor = color;
    const highlighted = hovered || active;

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
            <div style={{ position: 'relative', width: 0, height: 0, zIndex: highlighted ? 10 : 1 }}>
                <Box
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    onClick={onClick}
                    title={[label, time].filter(Boolean).join(' · ')}
                    sx={{
                        position: 'absolute',
                        width: 48,
                        height: 58,
                        left: -24 + pixelOffset.x,
                        top: -58 + pixelOffset.y,
                        cursor: 'pointer',
                        transformOrigin: 'bottom center',
                        filter: highlighted
                            ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))'
                            : 'drop-shadow(0 3px 6px rgba(0,0,0,0.26))',
                        transform: highlighted ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                        transition: 'filter 0.15s ease, transform 0.15s ease',
                    }}
                >
                    <svg width="48" height="58" viewBox="0 0 48 58" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <path
                            d="M24 0C13.507 0 5 8.507 5 19c0 14.25 19 39 19 39S43 33.25 43 19C43 8.507 34.493 0 24 0z"
                            fill={pinColor}
                        />
                        <circle cx="24" cy="19" r="16" fill="white" />
                    </svg>

                    <Box
                        sx={{
                            position: 'absolute',
                            top: 3,
                            left: 8,
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isWorking ? '#1976d2' : '#bdbdbd',
                        }}
                    >
                        {userImage ? (
                            <img
                                src={userImage}
                                alt={userName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <Typography
                                sx={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1, userSelect: 'none' }}
                            >
                                {userInitials || <IconUsers size={16} color="white" />}
                            </Typography>
                        )}
                    </Box>

                </Box>
            </div>
        </OverlayView>
    );
};

const ZoneOverlay = ({ zone }: { zone: Geofence }) => {
    const shapeOptions = { strokeColor: zone.color, strokeWeight: 2, fillColor: zone.color, fillOpacity: 0.15, clickable: false };

    return (
        <>
            {zone.type === 'circle' && <Circle center={zone.center} radius={zone.radius} options={shapeOptions} />}
            {zone.type === 'polygon' && <Polygon paths={zone.path} options={shapeOptions} />}
            {zone.type === 'polyline' && (
                <Polyline path={zone.path} options={{ strokeColor: zone.color, strokeWeight: 4, clickable: false }} />
            )}
            <OverlayView position={zone.center} mapPaneName={OverlayView.OVERLAY_LAYER}>
                <Box
                    sx={{
                        position: 'absolute',
                        transform: 'translate(-50%, 6px)',
                        width: 'max-content',
                        maxWidth: 220,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        backgroundColor: '#fff',
                        border: `1.5px solid ${zone.color}`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}
                >
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: '#222' }}>{zone.name}</Typography>
                </Box>
            </OverlayView>
        </>
    );
};

// Main Component
const LocationMapDrawer: React.FC<LocationMapDrawerProps> = ({
    open,
    onClose,
    worklogId,
    userName,
    userImage,
    initials = 'AP',
    date,
    shiftName,
    locations: providedLocations,
    isWorking: providedIsWorking,
}) => {
    const [locations, setLocations] = useState<LocationPoint[]>([]);
    const [geofences, setGeofences] = useState<Geofence[]>([]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [headerUserName, setHeaderUserName] = useState(userName);
    const [headerUserImage, setHeaderUserImage] = useState(userImage);
    const [headerUserInitials, setHeaderUserInitials] = useState(initials);
    const [isWorking, setIsWorking] = useState(providedIsWorking ?? false);

    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded } = useJsApiLoader({
        ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    });

    const displayLocations = useMemo(() => withVisibleDuplicatePinOffsets(locations), [locations]);

    // Zone the start / stop work happened in (only computed for those two types)
    const pointZones = useMemo(
        () => locations.map((loc) =>
            isLoaded && (loc.type === 'start' || loc.type === 'end') ? findZoneForPoint(loc, geofences) : null
        ),
        [locations, geofences, isLoaded]
    );

    // Only the zones where work started / stopped are drawn on the map
    const visibleZones = useMemo(() => {
        const seen = new Set<string>();
        return pointZones.filter((zone): zone is Geofence => {
            if (!zone || seen.has(zone.id)) return false;
            seen.add(zone.id);
            return true;
        });
    }, [pointZones]);

    const typeCounts = useMemo(
        () => locations.reduce<Partial<Record<LocationPointType, number>>>((acc, loc) => {
            acc[loc.type] = (acc[loc.type] ?? 0) + 1;
            return acc;
        }, {}),
        [locations]
    );

    const fetchWorklogLocations = async (id: number) => {
        try {
            setIsLoading(true);
            const res: AxiosResponse<ApiResponse> = await api.get('user-worklog/get-worklog-locations', {
                params: { worklog_id: id },
            });
            
            if (res.data?.IsSuccess && res.data.info) {
                const { info } = res.data;

                setLocations(transformApiLocations(info.locations ?? []));
                setGeofences(transformApiGeofences(info.geofences));

                if (!userName) {
                    const firstName = info.user_first_name ?? '';
                    const lastName = info.user_last_name ?? '';
                    setHeaderUserName(`${firstName} ${lastName}`.trim() || 'Employee');
                    setHeaderUserInitials(`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || initials);
                    setHeaderUserImage(info.user_thumbnail || info.user_image || undefined);
                }

                setIsWorking(info.user_is_working ?? false);
            } else {
                setLocations([]);
                setGeofences([]);
            }
        } catch (error) {
            console.error('Failed to fetch locations', error);
            setLocations([]);
            setGeofences([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setActiveIndex(null);

        if (open && providedLocations) {
            setLocations(providedLocations);
            setGeofences([]);
            setHeaderUserName(userName);
            setHeaderUserImage(userImage);
            setHeaderUserInitials(initials);
            setIsWorking(providedIsWorking ?? false);
            return;
        }

        if (open && worklogId) {
            fetchWorklogLocations(worklogId);
        }

        if (!open) {
            setLocations([]);
            setGeofences([]);
            setHeaderUserName(userName);
            setHeaderUserImage(userImage);
            setHeaderUserInitials(initials);
            setIsWorking(false);
        }
    }, [open, worklogId, providedLocations, providedIsWorking, userName, userImage, initials]);

    const fitToPoints = (map: google.maps.Map) => {
        const validPoints = displayLocations
            .filter((location) => location.displayPosition)
            .map((location) => location.displayPosition!);
        if (validPoints.length === 0) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(12);
            return;
        }

        if (validPoints.length === 1) {
            map.setCenter(validPoints[0]);
            map.setZoom(DEFAULT_ZOOM);
        } else {
            const bounds = new google.maps.LatLngBounds();
            validPoints.forEach((position) => bounds.extend(position));
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    };

    // Fit map bounds
    useEffect(() => {
        if (!open || !mapRef.current || locations.length === 0) return;
        fitToPoints(mapRef.current);
    }, [open, displayLocations]);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
        fitToPoints(map);
    };

    const focusLocation = (index: number) => {
        const position = displayLocations[index]?.displayPosition;
        setActiveIndex(index);
        if (!position || !mapRef.current) return;
        mapRef.current.panTo(position);
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? DEFAULT_ZOOM, 17));
    };

    const hasAnyLocation = locations.some((l) => l.latitude && l.longitude);

    const statusColor = isWorking ? '#22bf22' : '#df2626';

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                '& .MuiDrawer-paper': {
                    width: { xs: '100%', sm: 480 },
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#fff',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box sx={{ position: 'relative' }}>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                variant="dot"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        backgroundColor: statusColor,
                                        color: statusColor,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 2px white',
                                        cursor: 'pointer',
                                    },
                                }}
                            >
                                <Avatar
                                    src={headerUserImage}
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        fontSize: 14,
                                        fontWeight: 700,
                                        backgroundColor: '#1976d2',
                                    }}
                                >
                                    {!headerUserImage && headerUserInitials}
                                </Avatar>
                            </Badge>
                        </Box>

                        <Box>
                            <Typography fontWeight={700} fontSize={15} color="#1a1a1a">
                                {headerUserName}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center" mt={0.25}>
                                {date && (
                                    <Typography variant="caption" color="textSecondary">
                                        {date}
                                    </Typography>
                                )}
                                {shiftName && (
                                    <>
                                        <Typography variant="caption" color="textSecondary">
                                            ·
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {shiftName}
                                        </Typography>
                                    </>
                                )}
                            </Stack>
                        </Box>
                    </Box>

                    <IconButton size="small" onClick={onClose}>
                        <IconX size={18} />
                    </IconButton>
                </Box>

                {/* Legend / counts */}
                {locations.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} mt={1.5}>
                        {LEGEND_ORDER.filter((type) => typeCounts[type]).map((type) => (
                            <Box
                                key={type}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: 5,
                                    backgroundColor: `${TYPE_META[type].color}14`,
                                }}
                            >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: TYPE_META[type].color }} />
                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#333' }}>
                                    {TYPE_META[type].label} · {typeCounts[type]}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Box>

            {/* Location timeline */}
            {isLoading && locations.length === 0 && (
                <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <Typography color="textSecondary" fontSize={13}>Loading locations…</Typography>
                </Box>
            )}

            {locations.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f0f0f0', flexShrink: 0, maxHeight: '45%', overflowY: 'auto' }}>
                    {locations.map((loc, index) => {
                        const color = getPointColor(loc);
                        const Icon = TYPE_META[loc.type]?.Icon ?? IconMapPin;
                        const isLast = index === locations.length - 1;
                        const isActive = activeIndex === index;
                        const showZone = loc.type === 'start' || loc.type === 'end';
                        const zone = pointZones[index];

                        return (
                            <Box
                                key={`${loc.label}-${loc.latitude}-${loc.longitude}-${index}`}
                                onClick={() => focusLocation(index)}
                                sx={{ display: 'flex', gap: 1.5, cursor: 'pointer' }}
                            >
                                {/* Marker + connector */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <Box
                                        sx={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: '50%',
                                            backgroundColor: isActive ? color : `${color}1f`,
                                            color: isActive ? '#fff' : color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            mt: 0.75,
                                            transition: 'background-color 0.15s ease',
                                        }}
                                    >
                                        <Icon size={15} />
                                    </Box>
                                    {!isLast && <Box sx={{ flex: 1, width: 2, minHeight: 12, backgroundColor: '#e8e8e8', my: 0.5 }} />}
                                </Box>

                                {/* Card */}
                                <Box
                                    flex={1}
                                    minWidth={0}
                                    sx={{
                                        p: 1.25,
                                        mb: isLast ? 0 : 1,
                                        borderRadius: 2,
                                        border: `1px solid ${isActive ? color : '#eee'}`,
                                        backgroundColor: isActive ? `${color}0d` : '#fff',
                                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                                        '&:hover': { borderColor: color },
                                    }}
                                >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.25}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={700}
                                            sx={{ color, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
                                        >
                                            {index + 1}. {loc.label}
                                        </Typography>
                                        {loc.time && (
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <IconClock size={13} color="#666" />
                                                <Typography variant="caption" sx={{ color: '#333', fontWeight: 700, fontSize: 12 }}>
                                                    {loc.time}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="textPrimary"
                                        sx={{ fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word' }}
                                    >
                                        {loc.address}
                                    </Typography>

                                    {showZone && geofences.length > 0 && isLoaded && (
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                mt: 0.75,
                                                px: 0.75,
                                                py: 0.25,
                                                borderRadius: 1,
                                                backgroundColor: zone ? `${zone.color}14` : '#fff4e5',
                                                color: zone ? zone.color : '#b76e00',
                                            }}
                                        >
                                            {zone ? <IconMapPinCheck size={13} /> : <IconMapPinOff size={13} />}
                                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'inherit' }}>
                                                {zone ? zone.name : 'Outside work zone'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Map Section */}
            <Box sx={{ flex: 1, position: 'relative', minHeight: 240 }}>
                {!hasAnyLocation ? (
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1.5,
                            color: '#bbb',
                        }}
                    >
                        <IconMapPin size={48} style={{ opacity: 0.3 }} />
                        <Typography color="textSecondary" fontSize={14}>
                            {isLoading ? 'Loading…' : 'No location data available'}
                        </Typography>
                    </Box>
                ) : !isLoaded ? (
                    <Box
                        sx={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography color="textSecondary" fontSize={14}>
                            Loading map…
                        </Typography>
                    </Box>
                ) : (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        zoom={DEFAULT_ZOOM}
                        center={DEFAULT_CENTER}
                        onLoad={handleMapLoad}
                        options={{
                            disableDefaultUI: false,
                            zoomControl: true,
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: true,
                        }}
                    >
                        {visibleZones.map((zone) => (
                            <ZoneOverlay key={zone.id} zone={zone} />
                        ))}

                        {displayLocations.map((location, index) => {
                            if (!location.displayPosition) return null;

                            return (
                                <PinOverlay
                                    key={`${location.label}-${location.latitude}-${location.longitude}-${index}`}
                                    position={location.displayPosition}
                                    label={location.label}
                                    color={getPointColor(location)}
                                    time={location.time}
                                    userName={headerUserName}
                                    userImage={headerUserImage}
                                    userInitials={headerUserInitials}
                                    isWorking={isWorking}
                                    pixelOffset={location.pixelOffset}
                                    active={activeIndex === index}
                                    onClick={() => setActiveIndex(index)}
                                />
                            );
                        })}
                    </GoogleMap>
                )}
            </Box>
        </Drawer>
    );
};

export default LocationMapDrawer;
