'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import {
    Circle,
    GoogleMap,
    OverlayView,
    Polygon,
    Polyline,
    useJsApiLoader,
} from '@react-google-maps/api';
import {
    IconAlertTriangle,
    IconClock,
    IconMapPin,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';

import api from '@/utils/axios';
import {GOOGLE_MAPS_SHARED_LOADER_OPTIONS} from '@/utils/googleMaps';

const CONFLICT_TYPE = 'checklog_checkout_location';
const DEFAULT_CENTER = {lat: 51.5074, lng: -0.1278};
const EXPECTED_ZONE_COLOR = '#2563EB';
const CHECKOUT_COLOR = '#DC2626';

type LatLng = { lat: number; lng: number };
type ExpectedZone = NonNullable<CheckoutLocationConflictItem['expected_zones']>[number];

export type CheckoutLocationConflictItem = {
    user_id: number;
    date?: string;
    start?: string;
    end?: string;
    checkout_at?: string;
    checklog_id?: number;
    worklog_id?: number;
    conflict_type?: string;
    message?: string;
    checkout_location?: {
        latitude?: string | number | null;
        longitude?: string | number | null;
        location?: string | null;
    } | null;
    expected_zones?: Array<{
        id?: number | null;
        name?: string | null;
        address?: string | null;
        latitude?: string | number | null;
        longitude?: string | number | null;
        radius?: number | string | null;
        type?: string | null;
        color?: string | null;
        coordinates?: LatLng[] | null;
        boundary?: any;
    }>;
    map?: {
        checkout_location?: CheckoutLocationConflictItem['checkout_location'];
        expected_zones?: CheckoutLocationConflictItem['expected_zones'];
    };
};

type CheckoutLocationConflictProps = {
    conflict: {
        user_name?: string;
        user_thumb_image?: string;
        user_image?: string;
        formatted_date?: string;
        date?: string;
        items: CheckoutLocationConflictItem[];
    };
    onResolved?: () => void | Promise<void>;
};

const toPoint = (latitude?: string | number | null, longitude?: string | number | null): LatLng | null => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
};

const getZoneCoordinates = (zone: ExpectedZone): LatLng[] => {
    if (Array.isArray(zone.coordinates) && zone.coordinates.length > 0) {
        return zone.coordinates
            .map((point: any) => toPoint(point?.lat ?? point?.latitude, point?.lng ?? point?.longitude))
            .filter((point): point is LatLng => Boolean(point));
    }

    if (Array.isArray(zone.boundary)) {
        return zone.boundary
            .map((point: any) => toPoint(point?.lat ?? point?.latitude, point?.lng ?? point?.longitude))
            .filter((point): point is LatLng => Boolean(point));
    }

    return [];
};

const getZoneCenter = (zone: ExpectedZone): LatLng | null => {
    const direct = toPoint(zone.latitude, zone.longitude);
    if (direct) return direct;

    const boundary = zone.boundary;
    if (boundary && typeof boundary === 'object' && !Array.isArray(boundary)) {
        return toPoint(boundary.lat ?? boundary.latitude, boundary.lng ?? boundary.longitude);
    }

    const coordinates = getZoneCoordinates(zone);
    if (!coordinates.length) return null;

    const totals = coordinates.reduce((acc, point) => ({
        lat: acc.lat + point.lat,
        lng: acc.lng + point.lng,
    }), {lat: 0, lng: 0});

    return {
        lat: totals.lat / coordinates.length,
        lng: totals.lng / coordinates.length,
    };
};

const getZoneRadius = (zone: ExpectedZone): number | null => {
    const radius = Number(zone.radius ?? zone.boundary?.radius);
    return Number.isFinite(radius) && radius >= 0 ? radius : null;
};

export const isCheckoutLocationConflict = (items: Array<{conflict_type?: string}> = []) =>
    items.some((item) => item.conflict_type === CONFLICT_TYPE);

const mkInitials = (name?: string) =>
    (name || '?').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

const CheckoutPinOverlay = ({
    position,
    userName,
    userImage,
}: {
    position: google.maps.LatLngLiteral;
    userName?: string;
    userImage?: string;
}) => {
    const [hovered, setHovered] = useState(false);

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({x: 0, y: 0})}
        >
            <div style={{position: 'relative', width: 0, height: 0}}>
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
                    <svg width="48" height="58" viewBox="0 0 48 58" style={{position: 'absolute', top: 0, left: 0}}>
                        <path
                            d="M24 0C13.507 0 5 8.507 5 19c0 14.25 19 39 19 39S43 33.25 43 19C43 8.507 34.493 0 24 0z"
                            fill={CHECKOUT_COLOR}
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
                            backgroundColor: '#bdbdbd',
                        }}
                    >
                        {userImage ? (
                            <img
                                src={userImage}
                                alt={userName || 'Checkout location'}
                                style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
                            />
                        ) : (
                            <Typography sx={{color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1, userSelect: 'none'}}>
                                {mkInitials(userName)}
                            </Typography>
                        )}
                    </Box>
                </Box>
            </div>
        </OverlayView>
    );
};

const CheckoutLocationConflict = ({conflict, onResolved}: CheckoutLocationConflictProps) => {
    const [isResolving, setIsResolving] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const item = conflict.items.find((entry) => entry.conflict_type === CONFLICT_TYPE) ?? conflict.items[0];
    const checkoutLocation = item.map?.checkout_location ?? item.checkout_location ?? null;
    const expectedZones = item.map?.expected_zones ?? item.expected_zones ?? [];
    const checkoutPoint = toPoint(checkoutLocation?.latitude, checkoutLocation?.longitude);

    const {isLoaded} = useJsApiLoader({
        ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    });

    const zoneShapes = useMemo(() => expectedZones.map((zone) => ({
        zone,
        center: getZoneCenter(zone),
        radius: getZoneRadius(zone),
        coordinates: getZoneCoordinates(zone),
        color: zone.color || EXPECTED_ZONE_COLOR,
    })), [expectedZones]);

    const fitMap = (map: google.maps.Map) => {
        const bounds = new google.maps.LatLngBounds();
        let hasBounds = false;

        if (checkoutPoint) {
            bounds.extend(checkoutPoint);
            hasBounds = true;
        }

        zoneShapes.forEach((shape) => {
            if (shape.center) {
                bounds.extend(shape.center);
                hasBounds = true;
            }
            shape.coordinates.forEach((point) => {
                bounds.extend(point);
                hasBounds = true;
            });
        });

        if (!hasBounds) {
            map.setCenter(DEFAULT_CENTER);
            map.setZoom(12);
            return;
        }

        map.fitBounds(bounds, {top: 48, right: 48, bottom: 48, left: 48});
    };

    useEffect(() => {
        if (isLoaded && mapRef.current) {
            fitMap(mapRef.current);
        }
    }, [isLoaded, checkoutPoint, zoneShapes]);

    const resolveConflict = async () => {
        if (!item.checklog_id) {
            toast.error('Checklog ID missing for this conflict');
            return;
        }

        setIsResolving(true);
        try {
            const res = await api.post('/time-clock/resolve-worklog-conflict', {
                conflict_type: CONFLICT_TYPE,
                checklog_id: item.checklog_id,
            });

            if (res.data?.IsSuccess) {
                toast.success(res.data.message || 'Conflict resolved successfully');
                await onResolved?.();
            } else {
                toast.error(res.data?.message || 'Failed to resolve conflict');
            }
        } catch (error) {
            toast.error('Something went wrong while resolving conflict');
        } finally {
            setIsResolving(false);
        }
    };

    const reportConflict = async () => {
        if (!item.checklog_id) {
            toast.error('Checklog ID missing for this conflict');
            return;
        }

        setIsReporting(true);
        try {
            const res = await api.post('/time-clock/report-checkout-outside-zone', {
                checklog_id: item.checklog_id,
            });

            if (res.data?.IsSuccess) {
                toast.success(res.data.message || 'Checkout outside zone reported successfully');
                await onResolved?.();
            } else {
                toast.error(res.data?.message || 'Failed to report conflict');
            }
        } catch (error) {
            toast.error('Something went wrong while reporting conflict');
        } finally {
            setIsReporting(false);
        }
    };

    return (
        <Box sx={{mt: 1}}>
            <Stack spacing={1.25}>
                <Box sx={{p: 1.25, borderRadius: 1, bgcolor: '#FEF2F2', border: '1px solid #FECACA'}}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <IconAlertTriangle size={18} color={CHECKOUT_COLOR} />
                        <Box>
                            <Typography sx={{fontSize: '0.86rem', fontWeight: 700, color: '#991B1B'}}>
                                Checkout outside assigned work zone
                            </Typography>
                            <Typography sx={{fontSize: '0.78rem', color: '#7F1D1D', mt: 0.25}}>
                                {item.message || 'The user checked out from a location outside the expected zone.'}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <IconClock size={15} color="#6B7280" />
                        <Typography sx={{fontSize: '0.8rem', color: '#374151'}}>
                            {item.date || conflict.date || conflict.formatted_date || '-'} {item.end ? `at ${item.end}` : ''}
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="flex-start">
                        <IconMapPin size={15} color={CHECKOUT_COLOR} />
                        <Box>
                            <Typography sx={{fontSize: '0.72rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase'}}>
                                Checkout Location
                            </Typography>
                            <Typography sx={{fontSize: '0.8rem', color: '#374151'}}>
                                {checkoutLocation?.location || 'Location unavailable'}
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        {expectedZones.map((zone, index) => (
                            <Chip
                                key={`${zone.id ?? index}-${zone.name ?? 'zone'}`}
                                size="small"
                                label={zone.name || `Expected Zone ${index + 1}`}
                                sx={{
                                    height: 24,
                                    bgcolor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE',
                                    fontWeight: 700,
                                }}
                            />
                        ))}
                    </Stack>
                </Stack>

                <Box sx={{height: 280, borderRadius: 1.5, overflow: 'hidden', border: '1px solid #E5E7EB', bgcolor: '#F9FAFB'}}>
                    {!checkoutPoint ? (
                        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <Typography sx={{fontSize: '0.82rem', color: '#6B7280'}}>No checkout coordinates available</Typography>
                        </Box>
                    ) : !isLoaded ? (
                        <Box sx={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <CircularProgress size={22} />
                        </Box>
                    ) : (
                        <GoogleMap
                            mapContainerStyle={{width: '100%', height: '100%'}}
                            center={checkoutPoint}
                            zoom={15}
                            onLoad={(map) => {
                                mapRef.current = map;
                                fitMap(map);
                            }}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                                fullscreenControl: false,
                            }}
                        >
                            {zoneShapes.map((shape, index) => {
                                const type = String(shape.zone.type ?? '').toLowerCase();
                                if ((type === 'polygon' || type === 'polyline') && shape.coordinates.length > 0) {
                                    const commonOptions = {
                                        strokeColor: shape.color,
                                        strokeOpacity: 0.9,
                                        strokeWeight: 2,
                                    };

                                    return type === 'polyline' ? (
                                        <Polyline key={`zone-${index}`} path={shape.coordinates} options={commonOptions} />
                                    ) : (
                                        <Polygon
                                            key={`zone-${index}`}
                                            path={shape.coordinates}
                                            options={{
                                                ...commonOptions,
                                                fillColor: shape.color,
                                                fillOpacity: 0.14,
                                            }}
                                        />
                                    );
                                }

                                if (shape.center && shape.radius != null) {
                                    return (
                                        <Circle
                                            key={`zone-${index}`}
                                            center={shape.center}
                                            radius={shape.radius}
                                            options={{
                                                strokeColor: shape.color,
                                                strokeOpacity: 0.9,
                                                strokeWeight: 2,
                                                fillColor: shape.color,
                                                fillOpacity: 0.14,
                                            }}
                                        />
                                    );
                                }

                                return null;
                            })}
                            <CheckoutPinOverlay
                                position={checkoutPoint}
                                userName={conflict.user_name}
                                userImage={conflict.user_thumb_image || conflict.user_image}
                            />
                        </GoogleMap>
                    )}
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        color="error"
                        disabled={isReporting}
                        onClick={reportConflict}
                        sx={{
                            textTransform: "none",
                            fontSize: "0.74rem",
                            fontWeight: 500,
                            borderRadius: "6px",
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        {isReporting ? 'Reporting...' : 'Report'}
                    </Button>

                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        disabled={isResolving}
                        onClick={resolveConflict}
                        sx={{
                            textTransform: "none",
                            fontSize: "0.74rem",
                            fontWeight: 500,
                            borderRadius: "6px",
                            px: 1,
                            py: 0.5,
                        }}
                    >
                        {isResolving ? 'Resolving...' : 'Resolve'}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default CheckoutLocationConflict;
