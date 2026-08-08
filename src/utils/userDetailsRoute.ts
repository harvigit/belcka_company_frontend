const USER_DETAILS_STORAGE_KEY = 'belcka_user_details_refs';

type StoredUserRefs = Record<string, number>;

const readRefs = (): StoredUserRefs => {
    if (typeof window === 'undefined') return {};

    try {
        const stored = window.sessionStorage.getItem(USER_DETAILS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const writeRefs = (refs: StoredUserRefs) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(refs));
};

export const getUserDetailsHref = (
    userId: number | string | null | undefined,
    query: Record<string, string | number | boolean | null | undefined> = {},
) => {
    const numericUserId = Number(userId);
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value));
        }
    });

    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
        const suffix = params.toString();
        return `/apps/users/details${suffix ? `?${suffix}` : ''}`;
    }

    const existingRefs = readRefs();
    const existingRef = Object.entries(existingRefs).find(([, storedUserId]) => storedUserId === numericUserId)?.[0];
    if (existingRef) {
        params.set('user_ref', existingRef);
        return `/apps/users/details?${params.toString()}`;
    }

    let ref = '';
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        ref = window.crypto.randomUUID();
    } else {
        ref = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    existingRefs[ref] = numericUserId;
    writeRefs(existingRefs);

    params.set('user_ref', ref);

    return `/apps/users/details?${params.toString()}`;
};

export const resolveUserDetailsId = (routeId: string | string[] | undefined) => {
    const id = Array.isArray(routeId) ? routeId[0] : routeId;

    if (!id || id === 'details') {
        if (typeof window === 'undefined') return null;
        const ref = new URLSearchParams(window.location.search).get('user_ref');
        if (!ref) return null;
        const userId = readRefs()[ref];
        return userId ? String(userId) : null;
    }

    return null;
};
