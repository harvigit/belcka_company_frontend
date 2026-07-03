import type { Libraries, UseLoadScriptOptions } from '@react-google-maps/api';

export const GOOGLE_MAP_LIBRARIES: Libraries = ['places', 'drawing', 'geometry'];

export const GOOGLE_MAPS_SHARED_LOADER_OPTIONS: Pick<
    UseLoadScriptOptions,
    'id' | 'language' | 'region' | 'libraries'
> = {
    id: 'script-loader',
    language: 'en',
    region: 'US',
    libraries: GOOGLE_MAP_LIBRARIES,
};
