'use client';
import React, {useEffect, useRef, useState} from 'react';
import {
    Autocomplete,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {IconCurrentLocation, IconGasStation, IconMapPin, IconX} from '@tabler/icons-react';
import {useJsApiLoader} from '@react-google-maps/api';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import {
    consumePlacesSessionToken,
    getPlacesSessionToken,
    GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
    PLACES_AUTOCOMPLETE_DEBOUNCE_MS,
} from '@/utils/googleMaps';
import {StationPlace} from '../lib/types';

interface Option {
    place_id: string;
    name: string;
    address: string;
    is_station: boolean;
    // set for stations found near the user's location
    lat?: number;
    lng?: number;
    miles?: number;
}

interface StationFieldProps {
    // station name (saved as the record's supplier)
    name: string;
    place: StationPlace | null;
    onChange: (name: string, place: StationPlace | null) => void;
}

const HAS_KEY = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const NEARBY_COUNT = 5;

const toMiles = (from: google.maps.LatLngLiteral, to: google.maps.LatLng) => {
    const metres = google.maps.geometry?.spherical.computeDistanceBetween(new google.maps.LatLng(from), to);
    return metres === undefined ? undefined : metres / 1609.34;
};

/** Fuel station picker: Google search or nearby list; free text also works. */
const StationField: React.FC<StationFieldProps> = ({name, place, onChange}) => {
    const {isLoaded, loadError} = useJsApiLoader({
        ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS,
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    });
    const ready = HAS_KEY && isLoaded && !loadError;

    const [options, setOptions] = useState<Option[]>([]);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [nearbyMode, setNearbyMode] = useState(false);
    const [message, setMessage] = useState('');
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const search = (text: string) => {
        clearTimeout(timer.current);
        setNearbyMode(false);
        setMessage('');
        if (!ready || text.trim().length < 2) {
            setOptions([]);
            return;
        }
        timer.current = setTimeout(() => {
            setSearching(true);
            new google.maps.places.AutocompleteService().getPlacePredictions(
                {
                    input: text,
                    types: ['establishment'],
                    componentRestrictions: {country: ['gb', 'ie']},
                    sessionToken: getPlacesSessionToken(),
                },
                (results, status) => {
                    setSearching(false);
                    if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                        setOptions([]);
                        return;
                    }
                    const list = results.map((r) => ({
                        place_id: r.place_id,
                        name: r.structured_formatting.main_text,
                        address: r.structured_formatting.secondary_text ?? '',
                        is_station: r.types.includes('gas_station'),
                    }));
                    // fuel stations first, other places after (a station may be listed as a shop)
                    setOptions([...list.filter((o) => o.is_station), ...list.filter((o) => !o.is_station)]);
                },
            );
        }, PLACES_AUTOCOMPLETE_DEBOUNCE_MS);
    };

    const findNearby = () => {
        if (!ready) return;
        if (!navigator.geolocation) {
            setMessage("This browser can't share your location. Search by name instead.");
            return;
        }
        setLocating(true);
        setMessage('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const here = {lat: pos.coords.latitude, lng: pos.coords.longitude};
                new google.maps.places.PlacesService(document.createElement('div')).nearbySearch(
                    {location: here, rankBy: google.maps.places.RankBy.DISTANCE, type: 'gas_station'},
                    (results, status) => {
                        setLocating(false);
                        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
                            setOptions([]);
                            setMessage('No fuel stations found near you. Search by name instead.');
                            return;
                        }
                        setOptions(
                            results.slice(0, NEARBY_COUNT).map((r) => ({
                                place_id: r.place_id ?? '',
                                name: r.name ?? '',
                                address: r.vicinity ?? '',
                                is_station: true,
                                lat: r.geometry?.location?.lat(),
                                lng: r.geometry?.location?.lng(),
                                miles: r.geometry?.location ? toMiles(here, r.geometry.location) : undefined,
                            })),
                        );
                        setNearbyMode(true);
                        setOpen(true);
                    },
                );
            },
            (err) => {
                setLocating(false);
                setMessage(
                    err.code === err.PERMISSION_DENIED
                        ? 'Location is blocked in your browser. Allow it, or search by name.'
                        : "Couldn't get your location. Search by name instead.",
                );
            },
            {enableHighAccuracy: true, timeout: 10000, maximumAge: 60000},
        );
    };

    const pick = (option: Option) => {
        setOpen(false);
        setNearbyMode(false);
        // nearby results already have the position
        if (option.lat !== undefined && option.lng !== undefined) {
            onChange(option.name, {
                name: option.name,
                address: option.address,
                lat: option.lat,
                lng: option.lng,
                place_id: option.place_id,
            });
            return;
        }
        onChange(option.name, null);
        new google.maps.places.PlacesService(document.createElement('div')).getDetails(
            {
                placeId: option.place_id,
                fields: ['name', 'formatted_address', 'geometry', 'place_id'],
                sessionToken: consumePlacesSessionToken(),
            },
            (details, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK || !details?.geometry?.location) return;
                const stationName = details.name || option.name;
                onChange(stationName, {
                    name: stationName,
                    address: details.formatted_address || option.address,
                    lat: details.geometry.location.lat(),
                    lng: details.geometry.location.lng(),
                    place_id: details.place_id || option.place_id,
                });
            },
        );
    };

    // Without Google (no key / failed to load) it is a plain text field.
    if (!ready) {
        return (
            <CustomTextField
                value={name}
                onChange={(e: any) => onChange(e.target.value.slice(0, 80), null)}
                placeholder="Station name"
                fullWidth
            />
        );
    }

    const helper = message || (place ? place.address : 'Search by name, or use your location to list nearby stations.');

    return (
        <Autocomplete<Option, false, false, true>
            freeSolo
            fullWidth
            sx={{'& .MuiAutocomplete-inputRoot': {pr: '8px !important'}}}
            open={open && options.length > 0}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            options={options}
            filterOptions={(o) => o}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
            isOptionEqualToValue={(a, b) => a.place_id === b.place_id}
            value={
                place
                    ? {
                          place_id: place.place_id,
                          name: place.name,
                          address: place.address,
                          is_station: true,
                      }
                    : null
            }
            inputValue={name}
            onInputChange={(_, text, reason) => {
                if (reason === 'reset') return;
                // typing (or clearing) drops the picked place; it stays a hand-typed name
                onChange(text.slice(0, 80), null);
                if (reason === 'input') search(text);
                else setOptions([]);
            }}
            onChange={(_, value) => {
                if (value && typeof value !== 'string') pick(value);
            }}
            noOptionsText="No places found"
            groupBy={nearbyMode ? () => 'Near your location' : undefined}
            renderOption={({key, ...props}, o) => (
                <li key={o.place_id || key} {...props}>
                    <Stack direction="row" spacing={1.5} alignItems="center" width="100%">
                        {o.is_station ? <IconGasStation size={18} /> : <IconMapPin size={18} />}
                        <Box flex={1} minWidth={0}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                                {o.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" noWrap display="block">
                                {o.address}
                            </Typography>
                        </Box>
                        {o.miles !== undefined && (
                            <Typography variant="caption" color="textSecondary" whiteSpace="nowrap">
                                {o.miles.toFixed(1)} mi
                            </Typography>
                        )}
                    </Stack>
                </li>
            )}
            renderInput={(params) => (
                <CustomTextField
                    {...params}
                    placeholder="Search station or use your location"
                    helperText={helper}
                    FormHelperTextProps={{sx: {color: message ? 'warning.main' : undefined}}}
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <InputAdornment position="start">
                                <IconGasStation size={18} color={place ? '#2e7d32' : '#888'} />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <>
                                {searching && <CircularProgress size={16} sx={{mr: 1}} />}
                                <InputAdornment position="end">
                                    {name && (
                                        <Tooltip title="Clear">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    onChange('', null);
                                                    setOptions([]);
                                                    setMessage('');
                                                }}
                                            >
                                                <IconX size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Stations near my location">
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={findNearby}
                                                disabled={locating}
                                                color="primary"
                                            >
                                                {locating ? (
                                                    <CircularProgress size={16} />
                                                ) : (
                                                    <IconCurrentLocation size={18} />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </InputAdornment>
                            </>
                        ),
                    }}
                />
            )}
        />
    );
};

export default StationField;
