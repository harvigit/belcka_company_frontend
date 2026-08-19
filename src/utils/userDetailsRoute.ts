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
    
    const XOR_KEY = 987654321;
    const ref = (numericUserId ^ XOR_KEY).toString(36);

    params.set('user_ref', ref);

    return `/apps/users/details?${params.toString()}`;
};

export const resolveUserDetailsId = (routeId: string | string[] | undefined) => {
    const id = Array.isArray(routeId) ? routeId[0] : routeId;

    if (!id || id === 'details') {
        if (typeof window === 'undefined') return null;
        const ref = new URLSearchParams(window.location.search).get('user_ref');
        if (!ref) return null;
        if (!/^[0-9a-z]+$/i.test(ref)) return null; // reject non-base36 refs
        const parsed = parseInt(ref, 36);
        if (!Number.isFinite(parsed)) return null;

        const XOR_KEY = 987654321;
        const userId = parsed ^ XOR_KEY;
        return userId > 0 ? String(userId) : null;
    }

    return null;
};
