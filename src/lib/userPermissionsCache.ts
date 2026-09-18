type CachedPermission = {
    id: number;
    name: string;
    slug?: string;
    is_web: boolean | number;
    status: number;
};

const STORAGE_KEY = "belcka_user_permissions_cache";
const TTL_MS = 45_000;

type CacheEntry = {
    key: string;
    permissions: CachedPermission[];
    expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<CachedPermission[]>>();

export function getUserPermissionsCacheKey(userId: number, companyId: number): string {
    return `${userId}:${companyId}`;
}

export function clearUserPermissionsCache(): void {
    memoryCache.clear();
    inflightRequests.clear();

    if (typeof window === "undefined") return;

    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage access errors.
    }
}

function isFresh(entry: CacheEntry | null | undefined): entry is CacheEntry {
    return Boolean(entry && entry.expiresAt > Date.now());
}

function readSessionCache(key: string): CacheEntry | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CacheEntry;
        if (!parsed || parsed.key !== key || !Array.isArray(parsed.permissions)) {
            return null;
        }

        return isFresh(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeSessionCache(entry: CacheEntry): void {
    if (typeof window === "undefined") return;

    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch {
        // Ignore quota / private-mode errors.
    }
}

export function readUserPermissionsCache(userId: number, companyId: number): CachedPermission[] | null {
    const key = getUserPermissionsCacheKey(userId, companyId);
    const memoryEntry = memoryCache.get(key);

    if (isFresh(memoryEntry) && memoryEntry.key === key) {
        return memoryEntry.permissions;
    }

    const sessionEntry = readSessionCache(key);
    if (sessionEntry) {
        memoryCache.set(key, sessionEntry);
        return sessionEntry.permissions;
    }

    return null;
}

export function writeUserPermissionsCache(
    userId: number,
    companyId: number,
    permissions: CachedPermission[],
): void {
    const entry: CacheEntry = {
        key: getUserPermissionsCacheKey(userId, companyId),
        permissions,
        expiresAt: Date.now() + TTL_MS,
    };

    memoryCache.set(entry.key, entry);
    writeSessionCache(entry);
}

export function getInflightUserPermissionsRequest(key: string): Promise<CachedPermission[]> | undefined {
    return inflightRequests.get(key);
}

export function setInflightUserPermissionsRequest(
    key: string,
    request: Promise<CachedPermission[]>,
): void {
    inflightRequests.set(key, request);
}

export function clearInflightUserPermissionsRequest(key: string): void {
    inflightRequests.delete(key);
}
