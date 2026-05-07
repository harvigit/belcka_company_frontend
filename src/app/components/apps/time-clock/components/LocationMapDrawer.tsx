'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Avatar,
    Box,
    Stack,
    IconButton,
    Typography,
    Drawer,
} from '@mui/material';
import {
    GoogleMap,
    OverlayView,
    useJsApiLoader,
    Circle,
} from '@react-google-maps/api';
import {
    IconX,
    IconClock,
    IconMapPin, IconUsers,
} from '@tabler/icons-react';
import { AxiosResponse } from 'axios';
import api from '@/utils/axios';

export interface LocationPoint {
    label: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
    time?: string;
    type: 'start' | 'end';
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GOOGLE_MAP_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];
const DEFAULT_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 16;

const toLatLng = (lat: number | string, lng: number | string) => ({
    lat: Number(lat),
    lng: Number(lng),
});

const PIN_COLORS: Record<'start' | 'end', string> = {
    start: '#1976d2',
    end: '#fc4b6c',
};

// ─── API Response Types ───────────────────────────────────────────────────────

interface ApiLocationItem {
    id: number;
    worklog_id: number;
    type: 'start_work' | 'stop_work';
    location: string;
    latitude: string;
    longitude: string;
    date_time: string;
}

interface ApiInfo {
    user_id: number;
    user_first_name: string;
    user_last_name: string;
    user_image: string;
    user_thumbnail: string;
    user_is_working: boolean;
    locations: ApiLocationItem[];
}

interface ApiResponse {
    IsSuccess: boolean;
    message: string;
    info: ApiInfo;
}

// Helper to transform API locations array
const transformApiLocations = (locations: ApiLocationItem[]): LocationPoint[] => {
    return locations
        .filter((item) => item.latitude && item.longitude)
        .map((item) => {
            const isStart = item.type === 'start_work';
            let timeStr = '';

            if (item.date_time && item.date_time !== 'Invalid DateTime') {
                timeStr = new Date(item.date_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }

            return {
                label: isStart ? 'START WORK' : 'STOP WORK',
                address: item.location || 'Location unavailable',
                latitude: item.latitude,
                longitude: item.longitude,
                time: timeStr || undefined,
                type: isStart ? 'start' : 'end',
            };
        });
};

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
    isWorking = false
}: PinOverlayProps) => {
    const [hovered, setHovered] = useState(false);

    const pinColor = color;
    const dotColor = isWorking ? '#4caf50' : '#fc4b6c';

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
            <div style={{ position: 'relative', width: 0, height: 0 }}>
                <Box
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    sx={{
                        position: 'absolute',
                        width: 48,
                        height: 58,
                        left: -24,
                        top: -58,
                        cursor: 'pointer',
                        filter: hovered
                            ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))'
                            : 'drop-shadow(0 3px 6px rgba(0,0,0,0.26))',
                        transform: hovered ? 'scale(1.12) translateY(-2px)' : 'scale(1)',
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

// Main Component
const LocationMapDrawer: React.FC<LocationMapDrawerProps> = ({
    open,
    onClose,
    worklogId,
    userName,
    userImage,
    initials = 'AP',
    date,
    shiftName
}) => {
    const [locations, setLocations] = useState<LocationPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [headerUserName, setHeaderUserName] = useState(userName);
    const [headerUserImage, setHeaderUserImage] = useState(userImage);
    const [headerUserInitials, setHeaderUserInitials] = useState(initials);
    const [isWorking, setIsWorking] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
        libraries: GOOGLE_MAP_LIBRARIES,
    });

    const fetchWorklogLocations = async (id: number) => {
        try {
            setIsLoading(true);
            const res: AxiosResponse<ApiResponse> = await api.get('user-worklog/get-worklog-locations', {
                params: { worklog_id: id },
            });
            
            if (res.data?.IsSuccess && res.data.info) {
                const { info } = res.data;

                const transformed = transformApiLocations(info.locations ?? []);
                setLocations(transformed);

                if (!userName) {
                    const firstName = info.user_first_name ?? '';
                    const lastName = info.user_last_name ?? '';
                    setHeaderUserName(`${firstName} ${lastName}`.trim() || 'Employee');
                    setHeaderUserInitials(
                        `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || initials
                    );
                    setHeaderUserImage(info.user_thumbnail || info.user_image || undefined);
                }

                setIsWorking(info.user_is_working ?? false);
            } else {
                setLocations([]);
            }
        } catch (error) {
            console.error('Failed to fetch locations', error);
            setLocations([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && worklogId) {
            fetchWorklogLocations(worklogId);
        }

        if (!open) {
            setLocations([]);
            setHeaderUserName(userName);
            setHeaderUserImage(userImage);
            setHeaderUserInitials(initials);
            setIsWorking(false);
        }
    }, [open, worklogId]);

    // Fit map bounds
    useEffect(() => {
        if (!open || !mapRef.current || locations.length === 0) return;

        const validPoints = locations.filter((l) => l.latitude && l.longitude);
        if (validPoints.length === 0) return;

        if (validPoints.length === 1) {
            mapRef.current.panTo(toLatLng(validPoints[0].latitude, validPoints[0].longitude));
            mapRef.current.setZoom(DEFAULT_ZOOM);
        } else {
            const bounds = new google.maps.LatLngBounds();
            validPoints.forEach((l) => bounds.extend(toLatLng(l.latitude, l.longitude)));
            mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    }, [open, locations]);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;

        const validPoints = locations.filter((l) => l.latitude && l.longitude);
        if (validPoints.length === 0) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(12);
            return;
        }

        if (validPoints.length === 1) {
            map.setCenter(toLatLng(validPoints[0].latitude, validPoints[0].longitude));
            map.setZoom(DEFAULT_ZOOM);
        } else {
            const bounds = new google.maps.LatLngBounds();
            validPoints.forEach((l) => bounds.extend(toLatLng(l.latitude, l.longitude)));
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
    };

    const hasAnyLocation = locations.some((l) => l.latitude && l.longitude);

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
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 1,
                                    right: 1,
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    border: '2px solid white',
                                }}
                            />
                        </Box>

                        <Box>
                            <Typography fontWeight={700} fontSize={15} color="#1a1a1a">
                                {headerUserName ?? 'Employee'}
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
            </Box>

            {/* Location Info Cards */}
            {locations.length > 0 && (
                <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
                    <Stack direction="column" spacing={1}>
                        {locations.map((loc) => {
                            const color = PIN_COLORS[loc.type];

                            return (
                                <Box
                                    key={loc.type}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1.25,
                                        p: 1.25,
                                        borderRadius: 2,
                                        border: `1px solid ${color}22`,
                                        backgroundColor: `${color}08`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            backgroundColor: `${color}18`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            mt: 0.25,
                                        }}
                                    >
                                        <IconMapPin size={16} color={color} />
                                    </Box>

                                    <Box flex={1} minWidth={0}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.25}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                sx={{ color, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}
                                            >
                                                {loc.label}
                                            </Typography>
                                            {loc.time && (
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <IconClock size={12} color="#888" />
                                                    <Typography variant="caption" color="textSecondary" fontWeight={600}>
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
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* Map Section */}
            <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
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
                            No location data available
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
                        {locations
                            .filter((l) => l.latitude && l.longitude)
                            .map((loc) => {
                                const pos = toLatLng(loc.latitude, loc.longitude);
                                const color = PIN_COLORS[loc.type];

                                return (
                                    <React.Fragment key={loc.type}>
                                        <PinOverlay
                                            position={pos}
                                            label={loc.label}
                                            color={color}
                                            time={loc.time}
                                            userName={headerUserName}
                                            userImage={headerUserImage}
                                            userInitials={headerUserInitials}
                                            isWorking={isWorking}
                                        />
                                    </React.Fragment>
                                );
                            })}
                    </GoogleMap>
                )}
            </Box>
        </Drawer>
    );
};

export default LocationMapDrawer;
