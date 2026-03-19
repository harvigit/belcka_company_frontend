'use client';

import React, { useRef, useState } from 'react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemButton,
    MenuItem,
    Select,
    Slider,
    TextField,
    Typography,
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

const EditZone = ({ zone, onSaved, onCancel, projectId, companyId, addresses, activeTab }: EditZoneProps) => {
    const [name, setName] = useState(zone.name);
    const [color, setColor] = useState(zone.color);
    const [address, setAddress] = useState(zone.address);
    const [radius, setRadius] = useState(Number(zone.radius || 100));
    const [isSaving, setIsSaving] = useState(false);
    const [zoneType, setZoneType] = useState<'circle' | 'polygon' | 'polyline'>(zone.type || 'circle');
    const [location, setLocation] = useState({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
    const [path, setPath] = useState<any[]>(zone.coordinates || []);
    const [typedAddress, setTypedAddress] = useState(false);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [addressId, setAddressId] = useState<number | null>(zone.address_id || null);

    const circleRef = useRef<google.maps.Circle | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    const getPolylineCenter = (pts: any[]) => {
        if (!pts?.length) return location;
        return {
            lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
            lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
        };
    };

    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const nl = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setLocation(nl);
        circleRef.current?.setCenter(nl);
    };

    const handleRadiusChange = (r: number) => {
        if (!r) return;
        setRadius(r > 100 ? 100 : r);
    };

    const onRadiusChanged = () => {
        if (!circleRef.current) return;
        const r = circleRef.current.getRadius();
        setRadius(r > 100 ? 100 : r);
    };

    const syncFromPolygon = () => {
        if (!polygonRef.current) return;
        setPath(polygonRef.current.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() })));
    };

    const syncFromPolyline = () => {
        if (!polylineRef.current) return;
        setPath(polylineRef.current.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() })));
    };

    const fetchPredictions = (input: string) => {
        if (!input) return setPredictions([]);
        new google.maps.places.AutocompleteService().getPlacePredictions(
            { input },
            (preds) => setPredictions(preds || []),
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
                    setLocation({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    });
                }
                setTypedAddress(false);
                setPredictions([]);
            },
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const boundary = zoneType === 'circle' ? { lat: location.lat, lng: location.lng, radius } : path;
            const payload = {
                id: zone.id,
                company_id: companyId,
                project_id: projectId,
                name,
                address,
                address_id: activeTab === 1 ? addressId : null,
                lat: location.lat,
                lng: location.lng,
                type: zoneType,
                boundary: JSON.stringify(boundary),
                color,
            };
            const res = await api.put('work-zone/update', payload);
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
                <Typography variant="h6" mb={2}>
                    Edit Zone
                </Typography>

                {/* Address selector (Address tab only) */}
                {activeTab === 1 && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Address title</InputLabel>
                        <Select
                            value={addressId || ''}
                            label="Address title"
                            onChange={(e) => setAddressId(Number(e.target.value))}
                        >
                            {addresses.map((a: any) => (
                                <MenuItem key={a.id} value={a.id}>
                                    {a.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {/* Name field (Project tab only) */}
                {activeTab === 0 && (
                    <TextField
                        fullWidth
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                )}

                {/* Location search */}
                <TextField
                    fullWidth
                    label="Search location"
                    value={address}
                    onChange={handleInputChange}
                    sx={{ mb: 2 }}
                />

                {/* Autocomplete predictions */}
                {typedAddress && predictions.length > 0 && (
                    <List sx={{ border: '1px solid #ccc', maxHeight: 200, mb: 2 }}>
                        {predictions.map((p) => (
                            <ListItem key={p.place_id} disablePadding>
                                <ListItemButton onClick={() => selectPrediction(p.place_id)}>
                                    {p.description}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                )}

                {/* Radius slider (circle only) */}
                {zoneType === 'circle' && (
                    <>
                        <Typography fontWeight={600} mb={1}>
                            Area size [{Math.round(radius)} Meter]
                        </Typography>
                        <Slider
                            min={0}
                            max={100}
                            value={radius}
                            onChange={(_, v) => handleRadiusChange(v as number)}
                            sx={{ mb: 2, width: '98%' }}
                        />
                    </>
                )}

                {/* Map */}
                <GoogleMap zoom={17} center={location} mapContainerStyle={{ height: 400, width: '100%' }}>
                    {zoneType === 'circle' && (
                        <GCircle
                            center={location}
                            radius={radius}
                            options={{
                                fillColor: color + '33',
                                strokeColor: color,
                                editable: true,
                                draggable: true,
                            }}
                            onLoad={(c) => (circleRef.current = c)}
                            onRadiusChanged={onRadiusChanged}
                            onDragEnd={onMarkerDragEnd}
                        />
                    )}

                    {zoneType === 'polygon' && (
                        <Polygon
                            paths={path}
                            options={{
                                fillColor: color + '33',
                                strokeColor: color,
                                editable: true,
                                draggable: true,
                            }}
                            onLoad={(p) => (polygonRef.current = p)}
                            onMouseUp={syncFromPolygon}
                            onDragEnd={syncFromPolygon}
                        />
                    )}

                    {zoneType === 'polyline' && path.length >= 2 && (
                        <>
                            <Polyline
                                path={path}
                                options={{ strokeColor: color, strokeWeight: 3, editable: true }}
                                onLoad={(p) => (polylineRef.current = p)}
                                onMouseUp={syncFromPolyline}
                            />
                            <Marker
                                position={getPolylineCenter(path)}
                                draggable
                                icon={{
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 6,
                                    fillColor: color,
                                    fillOpacity: 1,
                                    strokeWeight: 0,
                                }}
                                onDragEnd={(e) => {
                                    if (!e.latLng) return;
                                    const nc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                                    const oc = getPolylineCenter(path);
                                    setPath(
                                        path.map((p) => ({
                                            lat: p.lat + (nc.lat - oc.lat),
                                            lng: p.lng + (nc.lng - oc.lng),
                                        })),
                                    );
                                }}
                            />
                        </>
                    )}
                </GoogleMap>

                {/* Color picker */}
                <Box mt={2}>
                    <Typography mb={0.5}>Zone Color</Typography>
                    <input
                        type="color"
                        value={color || '#000000'}
                        onChange={(e) => setColor(e.target.value)}
                        style={{ width: '100%', height: 40, border: 'none' }}
                    />
                </Box>

                {/* Footer actions */}
                <Box display="flex" gap={2} mt={2}>
                    <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outlined" onClick={onCancel}>
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default EditZone;
