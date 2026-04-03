'use client';

import React, { useCallback, useRef, useState } from 'react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {
    Box, Button, FormControl, InputLabel, List, ListItem, ListItemButton,
    MenuItem, Select, Slider, TextField, Tooltip, Typography,
} from '@mui/material';
import { Circle as GCircle, GoogleMap, Marker, Polygon, Polyline } from '@react-google-maps/api';

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
);

const PolygonSvg = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 3 21 9 18 20 6 20 3 9" />
    </svg>
);

const CircleSvg = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
    </svg>
);

interface ToolbarProps {
    drawMode: DrawMode;
    onMode: (m: DrawMode) => void;
    pointCount: number;
    isActive: boolean;
}

// FIX 4: Toolbar centered horizontally (left: '50%' + transform)
const MapToolbar = ({ drawMode, onMode, pointCount, isActive }: ToolbarProps) => {
    const tools: { mode: DrawMode; icon: React.ReactNode; tip: string }[] = [
        { mode: 'pan', icon: <HandSvg />, tip: 'Pan / Move map' },
        { mode: 'polygon', icon: <PolygonSvg />, tip: 'Draw polygon' },
        { mode: 'circle', icon: <CircleSvg />, tip: 'Circle zone' },
    ];

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
            left: '50%',                    // FIX 4: center horizontally
            transform: 'translateX(-50%)',  // FIX 4: pull back by half own width
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
            {tools.map(({ mode, icon, tip }) => {
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
                                '&:hover': { backgroundColor: active ? '#dbeafe' : '#f0f4ff', color: '#1976d2' },
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
    return { x: (pt.x - sw.x) * scale, y: (pt.y - ne.y) * scale };
}

function pixelDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

const EditZone = ({ zone, onSaved, onCancel, projectId, companyId, addresses, activeTab }: EditZoneProps) => {
    const [name, setName] = useState(zone.name);
    const [color, setColor] = useState(zone.color || '#1976d2');
    const [address, setAddress] = useState(zone.address);
    const [radius, setRadius] = useState(Number(zone.radius || 10000));
    const [isSaving, setIsSaving] = useState(false);
    const [addressId, setAddressId] = useState<number | null>(zone.address_id || null);

    const initType: ZoneType = zone.type === 'polyline' ? 'polygon' : (zone.type || 'circle');
    const [zoneType, setZoneType] = useState<ZoneType>(initType);
    const [drawMode, setDrawMode] = useState<DrawMode>(initType === 'circle' ? 'circle' : 'pan');
    const [location, setLocation] = useState({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
    const [drawPath, setDrawPath] = useState<{ lat: number; lng: number }[]>(zone.coordinates || []);
    const [isClosed, setIsClosed] = useState(initType === 'polygon' && (zone.coordinates?.length ?? 0) >= 3);
    const [cursorLatLng, setCursorLatLng] = useState<{ lat: number; lng: number } | null>(null);
    const [nearStart, setNearStart] = useState(false);
    const [typedAddress, setTypedAddress] = useState(false);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

    const mapRef = useRef<google.maps.Map | null>(null);
    const circleRef = useRef<google.maps.Circle | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);

    // FIX 3: Single stateRef object so the map click handler always reads
    // the latest values without stale closures — same pattern as AddZone fix.
    const stateRef = useRef({
        drawMode: (initType === 'circle' ? 'circle' : 'pan') as DrawMode,
        drawPath: (zone.coordinates || []) as { lat: number; lng: number }[],
        isClosed: initType === 'polygon' && (zone.coordinates?.length ?? 0) >= 3,
    });

    // Keep stateRef in sync on every render
    stateRef.current.drawMode = drawMode;
    stateRef.current.drawPath = drawPath;
    stateRef.current.isClosed = isClosed;

    const isDrawingActive = drawMode === 'polygon';

    const getCenter = (pts: { lat: number; lng: number }[]) =>
        pts.length
            ? { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length }
            : location;

    // ── Circle handlers ──────────────────────────────────────────────────────
    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const nl = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setLocation(nl);
        circleRef.current?.setCenter(nl);
    };

    // FIX 1: Math.round so radius is always a whole integer — no decimals
    const onRadiusChanged = () => {
        if (!circleRef.current) return;
        const r = circleRef.current.getRadius();
        if (r > 10000) {
            circleRef.current.setRadius(10000);
            setRadius(10000);
        } else {
            setRadius(Math.round(r));
        }
    };

    const syncFromPolygon = () => {
        if (!polygonRef.current) return;
        setDrawPath(
            polygonRef.current.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() }))
        );
    };

    // ── Search helpers ───────────────────────────────────────────────────────
    const fetchPredictions = (input: string) => {
        if (!input) return setPredictions([]);
        new google.maps.places.AutocompleteService().getPlacePredictions({ input }, (p) =>
            setPredictions(p || [])
        );
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(e.target.value);
        setTypedAddress(true);
        fetchPredictions(e.target.value);
    };

    const selectPrediction = (placeId: string) => {
        new google.maps.places.PlacesService(document.createElement('div')).getDetails(
            { placeId },
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
                    setAddress(place.formatted_address || '');
                    const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    setLocation(loc);
                    mapRef.current?.panTo(loc);
                    mapRef.current?.setZoom(15);
                }
                setTypedAddress(false);
                setPredictions([]);
            }
        );
    };

    // ── Mode switch ──────────────────────────────────────────────────────────
    const handleModeChange = (mode: DrawMode) => {
        setDrawMode(mode);
        setCursorLatLng(null);
        setNearStart(false);
        setIsClosed(false);
        // FIX 3: also update stateRef immediately so click handler sees new mode
        stateRef.current.drawMode = mode;
        stateRef.current.isClosed = false;
        stateRef.current.drawPath = [];
        mapRef.current?.setOptions({ draggableCursor: mode === 'polygon' ? 'crosshair' : '' });
        if (mode === 'circle') {
            setZoneType('circle');
            setDrawPath([]);
        }
        if (mode === 'polygon') {
            setZoneType('polygon');
            setDrawPath([]);
        }
    };

    // ── Mouse move for live preview and near-start snap ──────────────────────
    const handleMouseMove = useCallback((e: google.maps.MapMouseEvent) => {
        // FIX 3: read from stateRef — never stale
        if (stateRef.current.drawMode !== 'polygon' || stateRef.current.isClosed) return;
        if (!e.latLng) return;
        const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setCursorLatLng(pos);
        if (stateRef.current.drawPath.length >= 3 && mapRef.current) {
            const sp = latLngToPixel(mapRef.current, stateRef.current.drawPath[0]);
            const cp = latLngToPixel(mapRef.current, pos);
            if (sp && cp) setNearStart(pixelDistance(sp, cp) < CLOSE_THRESHOLD_PX);
        } else {
            setNearStart(false);
        }
    }, []);

    // FIX 3: Click handler uses stateRef (never stale) and is passed via
    // GoogleMap's onClick prop — NOT addListener inside onLoad.
    // addListener captures a stale closure; onClick re-binds on every render.
    const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (stateRef.current.drawMode !== 'polygon') return;
        if (stateRef.current.isClosed) return;
        if (!e.latLng) return;
        if ((e as any).placeId) { e.stop?.(); return; }

        const pt = { lat: e.latLng.lat(), lng: e.latLng.lng() };
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

        // Update stateRef synchronously so the very next click sees the new point
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
                boundary = { lat, lng, radius };
            } else {
                boundary = drawPath;
                const c = getCenter(drawPath);
                lat = c.lat;
                lng = c.lng;
            }
            const res = await api.put('work-zone/update', {
                id: zone.id,
                company_id: companyId,
                project_id: projectId,
                name,
                address,
                address_id: activeTab === 1 ? addressId : null,
                lat,
                lng,
                type: zoneType,
                boundary: JSON.stringify(boundary),
                color,
            });
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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <Typography variant="h6" mb={2}>Edit Zone</Typography>

                {activeTab === 1 && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Address title</InputLabel>
                        <Select
                            value={addressId || ''}
                            label="Address title"
                            onChange={(e) => setAddressId(Number(e.target.value))}
                        >
                            {addresses.map((a: any) => (
                                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* FIX 2: InputLabelProps shrink:true + legend span override prevents
                    MUI's outlined notch from clipping the "Name" label text */}
                {activeTab === 0 && (
                    <TextField
                        fullWidth
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                            mb: 2,
                            '& .MuiInputLabel-root': { overflow: 'visible' },
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

                <Box sx={{ position: 'relative', mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Search location"
                        value={address}
                        onChange={handleInputChange}
                        placeholder="Search location..."
                        InputLabelProps={{ shrink: true }}
                        sx={{
                            '& .MuiInputLabel-root': { overflow: 'visible' },
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
                            {predictions.map((p) => (
                                <ListItem key={p.place_id} disablePadding>
                                    <ListItemButton onClick={() => selectPrediction(p.place_id)}>
                                        {p.description}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                {/* FIX 1: Math.round(radius) — no decimal point, whole number only */}
                {drawMode === 'circle' && (
                    <>
                        <Typography fontWeight={600} mb={1}>Area size [{Math.round(radius)} Meter]</Typography>
                        <Slider
                            min={0}
                            max={10000}
                            value={radius}
                            onChange={(_, v) => setRadius(v as number)}
                            sx={{ mb: 2, width: '98%' }}
                        />
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
                            backgroundColor: isClosed ? '#43a047' : '#1976d2',
                        }} />
                        <Typography
                            variant="caption"
                            color={isClosed ? 'success.main' : 'primary'}
                            fontWeight={600}
                        >
                            {isClosed
                                ? `Zone closed · ${drawPath.length} points · ready to save ✓`
                                : `Click to add points${drawPath.length >= 3 ? ' · click near start to close' : ''}${drawPath.length > 0 ? ` · ${drawPath.length} pt${drawPath.length !== 1 ? 's' : ''}` : ''}`}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                    <GoogleMap
                        zoom={17}
                        center={location}
                        mapContainerStyle={{ height: 400, width: '100%' }}
                        onMouseMove={handleMouseMove}
                        // FIX 3: Use onClick prop instead of addListener inside onLoad.
                        // addListener captures a stale closure on mount and never updates.
                        // The onClick prop re-binds on every render → always reads fresh stateRef.
                        onClick={handleMapClick}
                        onLoad={(map) => { mapRef.current = map; }}
                        options={{
                            clickableIcons: false,
                            disableDoubleClickZoom: true,
                            draggableCursor: isDrawingActive ? 'crosshair' : '',
                        }}
                    >
                        {(drawMode === 'circle' || (drawMode === 'pan' && zoneType === 'circle')) && (
                            <>
                                <Marker position={location} draggable onDragEnd={onMarkerDragEnd} />
                                <GCircle
                                    center={location}
                                    radius={radius}
                                    options={{
                                        fillColor: color + '33',
                                        strokeColor: color,
                                        editable: true,
                                        draggable: true,
                                    }}
                                    onLoad={(c) => { circleRef.current = c; }}
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
                                    draggable: true,
                                }}
                                onLoad={(p) => { polygonRef.current = p; }}
                                onMouseUp={syncFromPolygon}
                                onDragEnd={syncFromPolygon}
                            />
                        )}

                        {/* FIX 3: clickable:false so Polyline never swallows map clicks.
                            This was the root cause — after first line segment rendered,
                            the Polyline absorbed all subsequent clicks silently. */}
                        {drawMode === 'polygon' && !isClosed && previewPath.length >= 2 && (
                            <Polyline
                                path={previewPath}
                                options={{
                                    strokeColor: nearStart ? '#ff5722' : color,
                                    strokeWeight: 2.5,
                                    strokeOpacity: 0.85,
                                    clickable: false,
                                    zIndex: 0,
                                }}
                            />
                        )}

                        {/* FIX 3: clickable={canClose} — only the first marker (to close
                            the polygon) is clickable. All other markers get clickable:false
                            so clicks pass through to the map and register immediately. */}
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
                                    onClick={canClose
                                        ? () => {
                                            setIsClosed(true);
                                            stateRef.current.isClosed = true;
                                            setNearStart(false);
                                            setCursorLatLng(null);
                                        }
                                        : undefined}
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
                                    clickable: false,
                                }}
                            />
                        )}
                    </GoogleMap>

                    <MapToolbar
                        drawMode={drawMode}
                        onMode={handleModeChange}
                        pointCount={drawPath.length}
                        isActive={isDrawingActive}
                    />
                </Box>

                <Box mt={2}>
                    <Typography mb={0.5}>Zone Color</Typography>
                    <input
                        type="color"
                        value={color || '#000000'}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '100%', height: 40, border: 'none' }}
                    />
                </Box>

                <Box display="flex" gap={2} mt={2}>
                    <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outlined" onClick={onCancel}>Cancel</Button>
                </Box>
            </Box>
        </Box>
    );
};

export default EditZone;
