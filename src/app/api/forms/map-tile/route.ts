import {NextRequest, NextResponse} from 'next/server';

const TILE_SIZE = 256;
const TILE_FETCH_TIMEOUT_MS = 2500;

const parseTileParam = (value: string | null) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
};

export async function GET(request: NextRequest) {
    const {searchParams} = request.nextUrl;
    const z = parseTileParam(searchParams.get('z'));
    const x = parseTileParam(searchParams.get('x'));
    const y = parseTileParam(searchParams.get('y'));

    if (z === null || x === null || y === null || z < 0 || z > 20) {
        return new NextResponse('Invalid tile coordinates', {status: 400});
    }

    const maxTile = (2 ** z) - 1;

    if (x < 0 || x > maxTile || y < 0 || y > maxTile) {
        return new NextResponse('Tile coordinates out of range', {status: 400});
    }

    const tileUrl = `https://mt.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}&scale=1&tileSize=${TILE_SIZE}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TILE_FETCH_TIMEOUT_MS);
    let tileResponse: Response;

    try {
        tileResponse = await fetch(tileUrl, {
            signal: controller.signal,
            next: {revalidate: 60 * 60 * 24 * 7},
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });
    } catch {
        return new NextResponse('Map tile unavailable', {status: 504});
    } finally {
        clearTimeout(timeout);
    }

    if (!tileResponse.ok) {
        return new NextResponse('Map tile unavailable', {status: tileResponse.status});
    }

    const tileBuffer = await tileResponse.arrayBuffer();

    return new NextResponse(tileBuffer, {
        status: 200,
        headers: {
            'Content-Type': tileResponse.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=604800, immutable',
        },
    });
}
