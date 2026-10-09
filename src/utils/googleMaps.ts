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

export type GeofenceShape = {
    type: 'circle' | 'polygon' | 'polyline';
    center: google.maps.LatLngLiteral;
    radius: number;
    path: google.maps.LatLngLiteral[];
};

// Returns the first zone the point falls in (needs the maps "geometry" library loaded)
export const findZoneForPoint = <T extends GeofenceShape>(
    point: google.maps.LatLngLiteral,
    zones: T[],
): T | null => {
    const geometry = typeof google !== 'undefined' ? google.maps?.geometry : undefined;
    if (!geometry) return null;

    const latLng = new google.maps.LatLng(point.lat, point.lng);

    return zones.find((zone) => {
        if (zone.type === 'circle') {
            const center = new google.maps.LatLng(zone.center.lat, zone.center.lng);
            return geometry.spherical.computeDistanceBetween(latLng, center) <= zone.radius;
        }
        if (zone.type === 'polygon') {
            return geometry.poly.containsLocation(latLng, new google.maps.Polygon({ paths: zone.path }));
        }
        // ~20m tolerance for polyline zones
        return geometry.poly.isLocationOnEdge(latLng, new google.maps.Polyline({ path: zone.path }), 2e-4);
    }) ?? null;
};

const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LNG = 111320;

// Distance (m) from a point to the zone's edge, plus the closest edge point.
// Uses a local flat projection around the point — accurate enough at work-zone scale.
export const getDistanceToZone = (
    point: google.maps.LatLngLiteral,
    zone: GeofenceShape,
): { distance: number; nearest: google.maps.LatLngLiteral } => {
    const lngScale = METERS_PER_DEG_LNG * Math.cos((point.lat * Math.PI) / 180);
    const project = (p: google.maps.LatLngLiteral) => ({
        x: (p.lng - point.lng) * lngScale,
        y: (p.lat - point.lat) * METERS_PER_DEG_LAT,
    });
    const unproject = (p: { x: number; y: number }) => ({
        lat: point.lat + p.y / METERS_PER_DEG_LAT,
        lng: point.lng + p.x / lngScale,
    });

    if (zone.type === 'circle') {
        const c = project(zone.center);
        const toCenter = Math.hypot(c.x, c.y);
        if (toCenter === 0) return { distance: 0, nearest: point };
        const ratio = (toCenter - zone.radius) / toCenter;
        return {
            distance: Math.max(0, toCenter - zone.radius),
            nearest: unproject({ x: c.x * ratio, y: c.y * ratio }),
        };
    }

    const path = zone.path.map(project);
    if (zone.type === 'polygon' && path.length > 2) path.push(path[0]);

    let best = { distance: Infinity, nearest: point };
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = dx * dx + dy * dy;
        const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSq));
        const closest = { x: a.x + t * dx, y: a.y + t * dy };
        const distance = Math.hypot(closest.x, closest.y);
        if (distance < best.distance) best = { distance, nearest: unproject(closest) };
    }
    return best;
};
