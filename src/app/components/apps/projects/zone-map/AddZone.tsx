'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {
    Box,
    Button,
    Drawer,
    FormControl,
    IconButton,
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
import { IconX } from '@tabler/icons-react';
import { Grid } from '@mui/system';
import { Circle as GCircle, GoogleMap, Marker } from '@react-google-maps/api';

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

interface AddZoneProps {
    projectId: number | null;
    companyId: number | null;
    addresses: any[];
    activeTab: number;
    onAdded: () => void;
    onCancel: () => void;
}

const AddZone = ({ onAdded, onCancel, projectId, companyId, addresses, activeTab }: AddZoneProps) => {
    const [addressId, setAddressId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [color, setColor] = useState('#000000');
    const [radius, setRadius] = useState(10);
    const [isSaving, setIsSaving] = useState(false);
    const [location, setLocation] = useState(LONDON_CENTER);
    const [typedAddress, setTypedAddress] = useState(false);
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const mapRef = useRef<google.maps.Map | null>(null);
    const circleRef = useRef<google.maps.Circle | null>(null);
    const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

    const handleAddressChange = (id: number) => {
        setAddressId(id);
        const addr = addresses.find((a: any) => a.id === id);
        if (addr) {
            setLocation({ lat: Number(addr.latitude), lng: Number(addr.longitude) });
            setRadius(addr.radius || 10);
        }
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
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    setAddress(place.formatted_address || place.name || '');
                    if (place.geometry?.location)
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

    const onMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const newLoc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setLocation(newLoc);
        circleRef.current?.setCenter(newLoc);
    };

    const onRadiusChanged = () => {
        if (!circleRef.current) return;
        const nr = circleRef.current.getRadius();
        if (nr > 10000) {
            circleRef.current.setRadius(10000);
            setRadius(10000);
        } else {
            setRadius(nr);
        }
    };

    const handleSave = async () => {
        try {
            if (activeTab === 1 && !addressId) {
                toast.error('Please select address!');
                return;
            }
            setIsSaving(true);
            const payload: any = {
                company_id: companyId,
                name: activeTab === 0 ? name : address,
                address,
                lat: location.lat,
                lng: location.lng,
                type: 'circle',
                color: '#1976d2',
                boundary: JSON.stringify({ lat: location.lat, lng: location.lng, radius }),
                project_id: projectId,
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
        <Drawer
            anchor="right"
            open={true}
            onClose={onCancel}
            sx={{
                '& .MuiDrawer-paper': {
                    width: 500,
                    padding: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#f9f9f9',
                },
            }}
        >
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                    Add Zone
                </Typography>
                <IconButton onClick={onCancel}>
                    <IconX />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                <Grid container>
                    <Grid size={{ lg: 12, xs: 12 }}>
                        {/* Address selector (Address tab only) */}
                        {activeTab === 1 && (
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Select Address</InputLabel>
                                <Select
                                    value={addressId || ''}
                                    label="Select Address"
                                    onChange={(e) => handleAddressChange(Number(e.target.value))}
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
                            placeholder="Search location..."
                            sx={{ mb: 2 }}
                        />

                        {/* Autocomplete predictions */}
                        {typedAddress && predictions.length > 0 && (
                            <List sx={{ border: '1px solid #ccc', maxHeight: 200, overflow: 'auto', mb: 2 }}>
                                {predictions.map((p) => (
                                    <ListItem key={p.place_id} disablePadding>
                                        <ListItemButton onClick={() => selectPrediction(p.place_id)}>
                                            {p.description}
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}

                        {/* Radius slider */}
                        <Typography fontWeight={600} mb={1}>
                            Area Radius [{radius} Meter]
                        </Typography>
                        <Slider
                            min={0}
                            max={10000}
                            value={radius}
                            onChange={(_, v) => setRadius(v as number)}
                            sx={{ mb: 2, width: '98%' }}
                        />

                        {/* Map */}
                        <Box sx={{ height: 400, mb: 2, mt: 1 }}>
                            <GoogleMap
                                zoom={13}
                                center={location}
                                mapContainerStyle={{ width: '100%', height: '400px' }}
                                onLoad={(map) => {
                                    mapRef.current = map;
                                }}
                            >
                                <Marker position={location} draggable onDragEnd={onMarkerDragEnd} />
                                <GCircle
                                    center={location}
                                    radius={radius}
                                    options={{
                                        strokeColor: '#1976d2',
                                        fillColor: '#1976d233',
                                        editable: true,
                                        draggable: true,
                                    }}
                                    onRadiusChanged={onRadiusChanged}
                                    onLoad={(circle) => {
                                        circleRef.current = circle;
                                        circle.addListener('center_changed', () => {
                                            const c = circle.getCenter();
                                            if (!c) return;
                                            if (circleRef.current) {
                                                const nr = circleRef.current.getRadius();
                                                if (nr > 10000) {
                                                    circleRef.current.setRadius(10000);
                                                    setRadius(10000);
                                                } else {
                                                    setRadius(nr);
                                                }
                                            }
                                            const newLoc = { lat: c.lat(), lng: c.lng() };
                                            if (
                                                lastCenterRef.current &&
                                                lastCenterRef.current.lat === newLoc.lat &&
                                                lastCenterRef.current.lng === newLoc.lng
                                            )
                                                return;
                                            lastCenterRef.current = newLoc;
                                            setLocation(newLoc);
                                        });
                                    }}
                                />
                            </GoogleMap>
                        </Box>

                        {/* Color picker */}
                        <Typography mb={0.5}>Zone Color</Typography>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            style={{ width: '100%', height: 40, border: 'none', cursor: 'pointer' }}
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Footer actions */}
            <Box display="flex" gap={2} mt={2}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSave}
                    disabled={isSaving}
                    sx={{ borderRadius: 3 }}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                    variant="contained"
                    color="inherit"
                    size="large"
                    onClick={onCancel}
                    sx={{ borderRadius: 3, backgroundColor: 'transparent', color: 'GrayText' }}
                >
                    Cancel
                </Button>
            </Box>
        </Drawer>
    );
};

export default AddZone;
