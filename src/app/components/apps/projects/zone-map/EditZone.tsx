'use client';

import React, {useCallback, useRef, useState} from 'react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {
    Box, Button, FormControl, InputLabel, List, ListItem, ListItemButton,
    MenuItem, Select, Slider, TextField, Tooltip, Typography,
} from '@mui/material';
import {Circle as GCircle, GoogleMap, Marker, Polygon, Polyline} from '@react-google-maps/api';

interface EditZoneProps {
    zone: any;
    onSaved: () => void;
    onCancel: () => void;
    projectId: number | null;
    companyId: number | null;
    addresses: any[];
    activeTab: number;
}

type ZoneType = 'circle' | 'polygon';
type DrawMode = 'pan' | 'circle' | 'polygon';

const CLOSE_THRESHOLD_PX = 20;

const HandSvg = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>
);

const PolygonSvg = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 3 21 9 18 20 6 20 3 9"/>
    </svg>
);

const CircleSvg = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
    </svg>
);

interface ToolbarProps {
    drawMode: DrawMode;
    onMode: (m: DrawMode) => void;
    pointCount: number;
    isActive: boolean;
    activeTab?: number;
}

const MapToolbar = ({drawMode, onMode, pointCount, isActive, activeTab}: ToolbarProps) => {
    const tools: { mode: DrawMode; icon: React.ReactNode; tip: string }[] = [
        {mode: 'pan', icon: <HandSvg/>, tip: 'Pan / Move map'},
        {mode: 'polygon', icon: <PolygonSvg/>, tip: 'Draw polygon'},
        {mode: 'circle', icon: <CircleSvg/>, tip: 'Circle zone'},
    ];

    const visibleTools = activeTab === 1 ? tools.filter(t => t.mode !== 'polygon') : tools;

    const btn = {
        width: 30,
        height: 30,
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.13s',
        userSelect: 'none' as const,
    };

    return (
        <Box sx={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: 'rgba(255,255,255,0.98)',
            border: '1px solid #d0d0d0',
            borderRadius: '8px',
            px: '6px',
            py: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            pointerEvents: 'all',
        }}>
            {visibleTools.map(({mode, icon, tip}) => {
                const active = drawMode === mode;
                return (
                    <Tooltip key={mode} title={tip} placement="bottom" arrow>
                        <Box
                            onClick={() => onMode(mode)}
                            sx={{
                                ...btn,
                                color: active ? '#1565c0' : '#555',
                                backgroundColor: active ? '#dbeafe' : 'transparent',
                                border: active ? '1.5px solid #1976d2' : '1.5px solid transparent',
                                '&:hover': {backgroundColor: active ? '#dbeafe' : '#f0f4ff', color: '#1976d2'},
                            }}
                        >
                            {icon}
                        </Box>
                    </Tooltip>
                );
            })}

            {isActive && pointCount > 0 && (
                <Box sx={{
                    ml: '3px',
                    px: '8px',
                    py: '2px',
                    borderRadius: '10px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1.6,
                    whiteSpace: 'nowrap',
                }}>
                    {pointCount} pts
                </Box>
            )}
        </Box>
    );
};

function latLngToPixel(map: google.maps.Map, latLng: { lat: number; lng: number }) {
    const proj = map.getProjection();
    const bounds = map.getBounds();
    if (!proj || !bounds) return null;
    const ne = proj.fromLatLngToPoint(bounds.getNorthEast());
    const sw = proj.fromLatLngToPoint(bounds.getSouthWest());
    if (!ne || !sw) return null;
    const scale = Math.pow(2, map.getZoom() ?? 10);
    const pt = proj.fromLatLngToPoint(new google.maps.LatLng(latLng.lat, latLng.lng));
    if (!pt) return null;
    return {x: (pt.x - sw.x) * scale, y: (pt.y - ne.y) * scale};
}

function pixelDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const EditZone = ({zone, onSaved, onCancel, projectId, companyId, addresses, activeTab}: EditZoneProps) => {
    const [name, setName] = useState(zone.name);
    const [color, setColor] = useState(zone.color || '#1976d2');
    const [address, setAddress] = useState(zone.address);
    const [radius, setRadius] = useState(Number(zone.radius || 10000));
    const [isSaving, setIsSaving] = useState(false);
    const [addressId, setAddressId] = useState<number | null>(zone.address_id || null);

    const initType: ZoneType = zone.type === 'polyline' ? 'polygon' : (zone.type || 'circle');
    const [zoneType, setZoneType] = useState<ZoneType>(initType);
    const [drawMode, setDrawMode] = useState<DrawMode>(initType === 'circle' ? 'circle' : 'pan');
    const [location, setLocation] = useState({lat: Number(zone.latitude), lng: Number(zone.longitude)});
    const [drawPath, setDrawPath] = useState<{ lat: number; lng: number }[]>(zone.coordinates || []);
    const [isClosed, setIsClosed] = useState(initType === 'polygon' && (zone.coordinates?.length ?? 0) >= 3);
    const [cursorLatLng, setCursorLatLng] = useState<{ lat: number; lng: number } | null>(null);
    const [nearStart, setNearStart] = useState(false);
    const [typedAddress, setTypedAddress] = useState(false);
    type PostcoderAddress = {
        summaryline: string;
        postcode: string;
    };

    type UnifiedPrediction =
        | ({ source: 'google' } & google.maps.places.AutocompletePrediction)
        | ({ source: 'postcoder' } & PostcoderAddress);

    const [predictions, setPredictions] = useState<UnifiedPrediction[]>([]);

    const mapRef = useRef<google.maps.Map | null>(null);
    const circleRef = useRef<google.maps.Circle | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);

    const stateRef = useRef({
        drawMode: (initType === 'circle' ? 'circle' : 'pan') as DrawMode,
        drawPath: (zone.coordinates || []) as { lat: number; lng: number }[],
        isClosed: initType === 'polygon' && (zone.coordinates?.length ?? 0) >= 3,
    });

    stateRef.current.drawMode = drawMode;
    stateRef.current.drawPath = drawPath;
    stateRef.current.isClosed = isClosed;

    const isDrawingActive = drawMode === 'polygon';

    const getCenter = (pts: { lat: number; lng: number }[]) =>
        pts.length
            ? {
                lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
                lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length
            }
            : location;

    // ── Circle handlers ──────────────────────────────────────────────────────
    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const nl = {lat: e.latLng.lat(), lng: e.latLng.lng()};
        setLocation(nl);
        circleRef.current?.setCenter(nl);
    };

    const onRadiusChanged = () => {
        if (!circleRef.current) return;
        const r = circleRef.current.getRadius();
        if (r > 10000) {
            circleRef.current.setRadius(10000);
            setRadius(10000);
        } else setRadius(Math.round(r));
    };

    const syncFromPolygon = () => {
        if (!polygonRef.current) return;
        setDrawPath(polygonRef.current.getPath().getArray().map((p) => ({lat: p.lat(), lng: p.lng()})));
    };

    // ── Search helpers ───────────────────────────────────────────────────────
    const isIEPostcode = (value: string) =>
        /^(D6W|[AC-FHKNPRTV-Y]\d{2})\s?[A-Z0-9]{4}$/i.test(value.trim());
    const isAUPostcode = (value: string) => /^\d{4}$/.test(value.trim());
    const isNZPostcode = (value: string) => /^\d{4}$/.test(value.trim());

    const fetchPredictions = async (input: string) => {
        if (!input) {
            setPredictions([]);
            return;
        }

        try {
            let country = "UK";
            if (isIEPostcode(input)) country = "IE";
            else if (isAUPostcode(input)) country = "AU";
            else if (isNZPostcode(input)) country = "NZ";

            const res = await fetch(
                `https://ws.postcoder.com/pcw/${
                    process.env.NEXT_PUBLIC_POSTCODER_KEY
                }/address/${country}/${encodeURIComponent(input)}?format=json`
            );

            const data = await res.json();
            if (data && data.length > 0) {
                setPredictions(data.map((item: any) => ({ ...item, source: "postcoder" })));
                return;
            } else {
                setPredictions([]);
            }
        } catch (err) {
            console.error("Postcoder search failed", err);
            setPredictions([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(e.target.value);
        setTypedAddress(true);
        fetchPredictions(e.target.value);
    };

    const selectPostcoderPrediction = (item: { source: "postcoder" } & PostcoderAddress) => {
        setAddress(item.summaryline);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
            { address: `${item.summaryline}, ${item.postcode}` },
            (results, status) => {
                if (status === "OK" && results?.[0]?.geometry?.location) {
                    const loc = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng(),
                    };
                    setLocation(loc);
                    mapRef.current?.panTo(loc);
                    mapRef.current?.setZoom(15);
                }
                setTypedAddress(false);
                setPredictions([]);
            }
        );
    };

    const selectPrediction = (p: UnifiedPrediction) => {
        selectPostcoderPrediction(p as { source: "postcoder" } & PostcoderAddress);
    };

    // ── Mode switch ──────────────────────────────────────────────────────────
    const handleModeChange = (mode: DrawMode) => {
        setDrawMode(mode);
        setCursorLatLng(null);
        setNearStart(false);
        setIsClosed(false);
        stateRef.current.drawMode = mode;
        stateRef.current.isClosed = false;
        stateRef.current.drawPath = [];
        mapRef.current?.setOptions({draggableCursor: mode === 'polygon' ? 'crosshair' : ''});
        if (mode === 'circle') {
            setZoneType('circle');
            setDrawPath([]);
        }
        if (mode === 'polygon') {
            setZoneType('polygon');
            setDrawPath([]);
        }
    };

    // ── Mouse move ───────────────────────────────────────────────────────────
    const handleMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
        if (stateRef.current.drawMode !== 'polygon' || stateRef.current.isClosed) return;
        if (!e.latLng) return;
        const pos = {lat: e.latLng.lat(), lng: e.latLng.lng()};
        setCursorLatLng(pos);
        if (stateRef.current.drawPath.length >= 3 && mapRef.current) {
            const sp = latLngToPixel(mapRef.current, stateRef.current.drawPath[0]);
            const cp = latLngToPixel(mapRef.current, pos);
            if (sp && cp) setNearStart(pixelDistance(sp, cp) < CLOSE_THRESHOLD_PX);
        } else {
            setNearStart(false);
        }
    }, []);

    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (stateRef.current.drawMode !== 'polygon') return;
        if (stateRef.current.isClosed) return;
        if (!e.latLng) return;
        if ((e as any).placeId) {
            e.stop?.();
            return;
        }

        const pt = {lat: e.latLng.lat(), lng: e.latLng.lng()};
        const currentPath = stateRef.current.drawPath;

        if (currentPath.length >= 3 && mapRef.current) {
            const sp = latLngToPixel(mapRef.current, currentPath[0]);
            const cp = latLngToPixel(mapRef.current, pt);
            if (sp && cp && pixelDistance(sp, cp) < CLOSE_THRESHOLD_PX) {
                setIsClosed(true);
                stateRef.current.isClosed = true;
                setNearStart(false);
                setCursorLatLng(null);
                setZoneType('polygon');
                return;
            }
        }

        const newPath = [...currentPath, pt];
        stateRef.current.drawPath = newPath;
        setDrawPath(newPath);
    }, []);

    const previewPath = !isClosed && cursorLatLng && drawPath.length > 0
        ? [...drawPath, cursorLatLng]
        : drawPath;

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (zoneType === 'polygon' && drawPath.length < 3) {
            toast.error('Please draw at least 3 points!');
            return;
        }
        setIsSaving(true);
        try {
            let boundary: any;
            let lat = location.lat, lng = location.lng;
            if (zoneType === 'circle') {
                boundary = {lat, lng, radius};
            } else {
                boundary = drawPath;
                const c = getCenter(drawPath);
                lat = c.lat;
                lng = c.lng;
            }
            let res;
            if (activeTab === 0) {
                res = await api.put('work-zone/update', {
                    id: zone.id,
                    company_id: companyId,
                    project_id: projectId,
                    name,
                    address,
                    address_id: zone.address_id || null,
                    lat,
                    lng,
                    type: zoneType,
                    boundary: JSON.stringify(boundary),
                    color,
                });
            } else {
                res = await api.put('address/parent-update', {
                    id: zone.id,
                    company_id: companyId,
                    name: zone.address_name || zone.name,
                    short_name: zone.short_name,
                    pin_code: zone.address || address,
                    type: zone.type || 'address',
                    latitude: lat,
                    longitude: lng,
                    boundary: JSON.stringify(boundary),
                });
            }
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                onSaved();
                onCancel();
            }
        } catch (err) {
            console.error(err);
        }
        setIsSaving(false);
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: {xs: 1, sm: 2},
                minHeight: 0,
            }}
        >
            <Box sx={{flex: 1, overflowY: 'auto', minHeight: 0, pr: {xs: 0, sm: 0.5}}}>
                <Typography variant="h6" mb={2}>Edit Zone</Typography>

                {activeTab === 1 && (
                    <FormControl fullWidth sx={{mb: 2}}>
                        <InputLabel>Address</InputLabel>
                        <Select
                            value={zone.id || ''}
                            label="Address"
                            disabled
                        >
                            <MenuItem value={zone.id}>{zone.name}</MenuItem>
                        </Select>
                    </FormControl>
                )}

                {activeTab === 0 && (
                    <TextField
                        fullWidth
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        InputLabelProps={{shrink: true}}
                        sx={{
                            mb: 2,
                            '& .MuiInputLabel-root': {overflow: 'visible'},
                            '& .MuiOutlinedInput-notchedOutline > legend > span': {
                                paddingRight: '6px',
                                paddingLeft: '2px',
                                maxWidth: 'unset',
                                overflow: 'visible',
                                display: 'inline-block',
                            },
                        }}
                    />
                )}

                {activeTab === 0 && (
                    <Box sx={{position: 'relative', mb: 2}}>
                        <TextField
                            fullWidth
                            label="Search location"
                            value={address}
                            onChange={handleInputChange}
                            placeholder="Search location..."
                            InputLabelProps={{shrink: true}}
                            sx={{
                                '& .MuiInputLabel-root': {overflow: 'visible'},
                                '& .MuiOutlinedInput-notchedOutline > legend > span': {
                                    paddingRight: '6px',
                                    paddingLeft: '2px',
                                    maxWidth: 'unset',
                                    overflow: 'visible',
                                    display: 'inline-block',
                                },
                            }}
                        />
                        {typedAddress && predictions.length > 0 && (
                            <List sx={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 9999,
                                border: '1px solid #ccc',
                                borderRadius: 1,
                                maxHeight: 200,
                                backgroundColor: '#fff',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                overflow: 'auto',
                            }}>
                                {predictions.map((p, idx) => (
                                    <ListItem key={idx} disablePadding>
                                        <ListItemButton onClick={() => selectPrediction(p)}>
                                            {p.source === 'google' ? p.description : p.summaryline}
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                )}

                {drawMode === 'circle' && (
                    <>
                        <Typography fontWeight={600} mb={1}>
                            Area size [{Math.round(radius)} Meter]
                        </Typography>
                        <Box sx={{px: 1.5, boxSizing: 'border-box', width: '100%', overflow: 'hidden'}}>
                            <Slider
                                min={0}
                                max={10000}
                                value={radius}
                                onChange={(_, v) => setRadius(v as number)}
                                sx={{width: '100%', display: 'block'}}
                            />
                        </Box>
                    </>
                )}

                {isDrawingActive && (
                    <Box sx={{
                        mb: 1.5,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 1.5,
                        backgroundColor: isClosed ? '#e8f5e9' : '#e3f2fd',
                        border: `1px solid ${isClosed ? '#a5d6a7' : '#90caf9'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}>
                        <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            flexShrink: 0,
                            backgroundColor: isClosed ? '#43a047' : '#1976d2'
                        }}/>
                        <Typography variant="caption" color={isClosed ? 'success.main' : 'primary'} fontWeight={600}>
                            {isClosed
                                ? `Zone closed · ${drawPath.length} points · ready to save ✓`
                                : `Click to add points${drawPath.length >= 3 ? ' · click near start to close' : ''}${drawPath.length > 0 ? ` · ${drawPath.length} pt${drawPath.length !== 1 ? 's' : ''}` : ''}`}
                        </Typography>
                    </Box>
                )}

                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: 1,
                        overflow: 'hidden',
                        height: {xs: 280, sm: 340, md: 400},
                    }}
                >
                    <GoogleMap
                        zoom={17}
                        center={location}
                        mapContainerStyle={{height: '100%', width: '100%'}}
                        onMouseMove={handleMouseMove}
                        onClick={handleMapClick}
                        onLoad={(map) => {
                            mapRef.current = map;
                        }}
                        options={{
                            clickableIcons: false,
                            disableDoubleClickZoom: true,
                            draggableCursor: isDrawingActive ? 'crosshair' : '',
                        }}
                    >
                        {(drawMode === 'circle' || (drawMode === 'pan' && zoneType === 'circle')) && (
                            <>
                                <Marker position={location} draggable onDragEnd={onMarkerDragEnd}/>
                                <GCircle
                                    center={location}
                                    radius={radius}
                                    options={{
                                        fillColor: color + '33',
                                        strokeColor: color,
                                        editable: true,
                                        draggable: true
                                    }}
                                    onLoad={(c) => {
                                        circleRef.current = c;
                                    }}
                                    onRadiusChanged={onRadiusChanged}
                                    onDragEnd={onMarkerDragEnd}
                                />
                            </>
                        )}

                        {((drawMode === 'polygon' && isClosed) || (drawMode === 'pan' && zoneType === 'polygon')) && drawPath.length >= 3 && (
                            <Polygon
                                paths={drawPath}
                                options={{
                                    fillColor: color + '33',
                                    strokeColor: color,
                                    strokeWeight: 2,
                                    editable: true,
                                    draggable: true
                                }}
                                onLoad={(p) => {
                                    polygonRef.current = p;
                                }}
                                onMouseUp={syncFromPolygon}
                                onDragEnd={syncFromPolygon}
                            />
                        )}

                        {drawMode === 'polygon' && !isClosed && previewPath.length >= 2 && (
                            <Polyline
                                path={previewPath}
                                options={{
                                    strokeColor: nearStart ? '#ff5722' : color,
                                    strokeWeight: 2.5,
                                    strokeOpacity: 0.85,
                                    clickable: false,
                                    zIndex: 0
                                }}
                            />
                        )}

                        {isDrawingActive && drawPath.map((pt, i) => {
                            const isFirst = i === 0;
                            const canClose = isFirst && drawPath.length >= 3 && !isClosed;
                            return (
                                <Marker
                                    key={`dp-${i}`}
                                    position={pt}
                                    clickable={canClose}
                                    icon={{
                                        path: google.maps.SymbolPath.CIRCLE,
                                        scale: isFirst ? 8 : i === drawPath.length - 1 ? 6 : 5,
                                        fillColor: isFirst ? '#ff5722' : color,
                                        fillOpacity: 1,
                                        strokeColor: '#fff',
                                        strokeWeight: 2,
                                    }}
                                    onClick={canClose ? () => {
                                        setIsClosed(true);
                                        stateRef.current.isClosed = true;
                                        setNearStart(false);
                                        setCursorLatLng(null);
                                    } : undefined}
                                    cursor={canClose ? 'pointer' : undefined}
                                />
                            );
                        })}

                        {nearStart && drawPath.length > 0 && (
                            <GCircle
                                center={drawPath[0]}
                                radius={30}
                                options={{
                                    strokeColor: '#ff5722',
                                    strokeWeight: 2,
                                    fillColor: '#ff572233',
                                    clickable: false
                                }}
                            />
                        )}
                    </GoogleMap>

                    <MapToolbar
                        drawMode={drawMode}
                        onMode={handleModeChange}
                        pointCount={drawPath.length}
                        isActive={isDrawingActive}
                        activeTab={activeTab}
                    />
                </Box>
                {activeTab === 0 && (
                <Box mt={2}>
                    <Typography mb={0.5}>Zone Color</Typography>
                    <input
                        type="color"
                        value={color || '#000000'}
                        onChange={(e) => setColor(e.target.value)}
                        style={{width: '100%', height: 40, border: 'none', cursor: 'pointer'}}
                    />
                </Box>
                )}
            </Box>

            <Box
                display="flex"
                gap={2}
                mt={2}
                sx={{flexShrink: 0, pt: 1.5, borderTop: '1px solid #f0f0f0'}}
            >
                <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outlined" onClick={onCancel}>Cancel</Button>
            </Box>
        </Box>
    );
};

export default EditZone;
