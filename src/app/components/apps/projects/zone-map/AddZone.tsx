'use client';

import React, {useRef, useState, useCallback, useEffect} from 'react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {
    Box, Button, FormControl, IconButton, InputLabel,
    List, ListItem, ListItemButton, MenuItem, Select, Slider,
    TextField, Tooltip, Typography,
} from '@mui/material';
import {Grid} from '@mui/system';
import {Circle as GCircle, GoogleMap, Marker, Polygon, Polyline} from '@react-google-maps/api';

const LONDON_CENTER = {lat: 51.5074, lng: -0.1278};
const CLOSE_THRESHOLD_PX = 20;

interface AddZoneProps {
    projectId: number | null;
    companyId: number | null;
    addresses: any[];
    projects?: any[];
    activeTab: number;
    onAdded: () => void;
    onCancel: () => void;
}

type ZoneType = 'circle' | 'polygon';
type DrawMode = 'pan' | 'circle' | 'polygon';

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
}

const MapToolbar = ({drawMode, onMode, pointCount, isActive}: ToolbarProps) => {
    const tools: { mode: DrawMode; icon: React.ReactNode; tip: string }[] = [
        {mode: 'pan', icon: <HandSvg/>, tip: 'Pan / Move map'},
        {mode: 'polygon', icon: <PolygonSvg/>, tip: 'Draw polygon'},
        {mode: 'circle', icon: <CircleSvg/>, tip: 'Circle zone'},
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
            {tools.map(({mode, icon, tip}) => {
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

const AddZone = ({onAdded, onCancel, projectId, companyId, addresses, projects = [], activeTab}: AddZoneProps) => {
    const [addressId, setAddressId] = useState<number | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId);
    const [filteredAddresses, setFilteredAddresses] = useState<any[]>(addresses);

    useEffect(() => {
        if (selectedProjectId) {
            api.get('address/get', {params: {project_id: selectedProjectId}})
               .then(res => setFilteredAddresses(res.data.info || []))
               .catch(err => console.error(err));
        } else {
            setFilteredAddresses(addresses);
        }
    }, [selectedProjectId, addresses]);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [color, setColor] = useState('#1976d2');
    const [radius, setRadius] = useState(200);
    const [isSaving, setIsSaving] = useState(false);
    const [location, setLocation] = useState(LONDON_CENTER);
    const [typedAddress, setTypedAddress] = useState(false);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

    const [drawMode, setDrawMode] = useState<DrawMode>('pan');
    const [zoneType, setZoneType] = useState<ZoneType>('circle');
    const [drawPath, setDrawPath] = useState<{ lat: number; lng: number }[]>([]);
    const [cursorLatLng, setCursorLatLng] = useState<{ lat: number; lng: number } | null>(null);
    const [nearStart, setNearStart] = useState(false);
    const [isClosed, setIsClosed] = useState(false);

    const mapRef = useRef<google.maps.Map | null>(null);
    const circleRef = useRef<google.maps.Circle | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);
    const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

    const stateRef = useRef({
        drawMode: 'pan' as DrawMode,
        drawPath: [] as { lat: number; lng: number }[],
        isClosed: false,
    });

    const isDrawingActive = drawMode === 'polygon';

    stateRef.current.drawMode = drawMode;
    stateRef.current.drawPath = drawPath;
    stateRef.current.isClosed = isClosed;

    // ── Address helpers ──────────────────────────────────────────────────────
    const handleAddressChange = (id: number) => {
        setAddressId(id);
        const addr = addresses.find((a: any) => a.id === id);
        if (addr) {
            const loc = {lat: Number(addr.latitude), lng: Number(addr.longitude)};
            setLocation(loc);
            setRadius(addr.radius || 200);
            mapRef.current?.panTo(loc);
        }
    };

    const fetchPredictions = (input: string) => {
        if (!input) return setPredictions([]);
        new google.maps.places.AutocompleteService().getPlacePredictions({input}, (p) =>
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
            {placeId},
            (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    setAddress(place.formatted_address || place.name || '');
                    if (place.geometry?.location) {
                        const loc = {lat: place.geometry.location.lat(), lng: place.geometry.location.lng()};
                        setLocation(loc);
                        mapRef.current?.panTo(loc);
                        mapRef.current?.setZoom(15);
                    }
                }
                setTypedAddress(false);
                setPredictions([]);
            }
        );
    };

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
        } else {
            setRadius(Math.round(r));
        }
    };

    const syncFromPolygon = () => {
        if (!polygonRef.current) return;
        setDrawPath(
            polygonRef.current.getPath().getArray().map((p) => ({lat: p.lat(), lng: p.lng()}))
        );
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

    // ── Mouse move for live preview and near-start snap ──────────────────────
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
        if (activeTab === 1 && !addressId) {
            toast.error('Please select address!');
            return;
        }
        if (zoneType === 'polygon' && drawPath.length < 3) {
            toast.error('Please draw at least 3 points on the map!');
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
                lat = drawPath.reduce((s, p) => s + p.lat, 0) / drawPath.length;
                lng = drawPath.reduce((s, p) => s + p.lng, 0) / drawPath.length;
            }
            const payload: any = {
                company_id: companyId,
                name: activeTab === 0 ? name : address,
                address,
                lat,
                lng,
                type: zoneType,
                color,
                boundary: JSON.stringify(boundary),
                project_id: selectedProjectId,
            };
            if (activeTab === 1) payload.address_id = addressId;

            const res = await api.post('work-zone/create', payload);
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                onAdded();
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
                <Typography variant="h6" mb={1}>Add Zone</Typography>

                <Grid container>
                    <Grid size={{lg: 12, xs: 12}}>

                        <FormControl fullWidth sx={{mb: 2}}>
                            <InputLabel>Select Project</InputLabel>
                            <Select
                                value={selectedProjectId || ''}
                                label="Select Project"
                                onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                {projects.map((p: any) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {activeTab === 1 && (
                            <FormControl fullWidth sx={{mb: 2}}>
                                <InputLabel>Select Address</InputLabel>
                                <Select
                                    value={addressId || ''}
                                    label="Select Address"
                                    onChange={(e) => handleAddressChange(Number(e.target.value))}
                                >
                                    {filteredAddresses.map((a: any) => (
                                        <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                                    ))}
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
                                    my: 2,
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
                                <Typography variant="caption" color={isClosed ? 'success.main' : 'primary'}
                                            fontWeight={600}>
                                    {isClosed
                                        ? `Zone closed · ${drawPath.length} points · ready to save ✓`
                                        : `Click to add points${drawPath.length >= 3 ? ' · click near start to close' : ''}${drawPath.length > 0 ? ` · ${drawPath.length} pt${drawPath.length !== 1 ? 's' : ''}` : ''}`}
                                </Typography>
                            </Box>
                        )}

                        <Box
                            sx={{
                                height: {xs: 280, sm: 340, md: 400},
                                mb: 2,
                                mt: 1,
                                position: 'relative',
                                borderRadius: 1,
                                overflow: 'hidden',
                                backgroundColor: '#e8e8e8',
                            }}
                        >
                            <GoogleMap
                                zoom={13}
                                center={location}
                                mapContainerStyle={{width: '100%', height: '100%'}}
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
                                {drawMode === 'circle' && (
                                    <>
                                        <Marker position={location} draggable onDragEnd={onMarkerDragEnd}/>
                                        <GCircle
                                            center={location}
                                            radius={radius}
                                            options={{
                                                strokeColor: color,
                                                fillColor: color + '33',
                                                editable: true,
                                                draggable: true
                                            }}
                                            onRadiusChanged={onRadiusChanged}
                                            onLoad={(circle) => {
                                                circleRef.current = circle;
                                                circle.addListener('center_changed', () => {
                                                    const c = circle.getCenter();
                                                    if (!c) return;
                                                    const nl = {lat: c.lat(), lng: c.lng()};
                                                    if (lastCenterRef.current?.lat === nl.lat && lastCenterRef.current?.lng === nl.lng) return;
                                                    lastCenterRef.current = nl;
                                                    setLocation(nl);
                                                });
                                            }}
                                        />
                                    </>
                                )}

                                {((drawMode === 'polygon' && isClosed) || (drawMode === 'pan' && zoneType === 'polygon')) && drawPath.length >= 3 && (
                                    <Polygon
                                        paths={drawPath}
                                        options={{
                                            strokeColor: color,
                                            fillColor: color + '33',
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
                                            key={`pt-${i}`}
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
                            />
                        </Box>

                        <Typography mb={0.5}>Zone Color</Typography>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            style={{width: '100%', height: 40, border: 'none', cursor: 'pointer'}}
                        />

                    </Grid>
                </Grid>
            </Box>

            <Box
                display="flex"
                gap={2}
                mt={2}
                sx={{flexShrink: 0, pt: 1.5, borderTop: '1px solid #f0f0f0'}}
            >
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{borderRadius: 3}}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                    variant="contained"
                    color="inherit"
                    size="large"
                    onClick={onCancel}
                    sx={{borderRadius: 3, backgroundColor: 'transparent', color: 'GrayText'}}
                >
                    Cancel
                </Button>
            </Box>
        </Box>
    );
};

export default AddZone;
