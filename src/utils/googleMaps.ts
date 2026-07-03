import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAP_LIBRARIES: Libraries = ['places', 'drawing', 'geometry'];

export const GOOGLE_MAPS_SHARED_LOADER_OPTIONS: {
    id: string;
    language: string;
    region: string;
    libraries: Libraries;
} = {
    id: 'script-loader',
    language: 'en',
    region: 'US',
    libraries: GOOGLE_MAP_LIBRARIES,
};
