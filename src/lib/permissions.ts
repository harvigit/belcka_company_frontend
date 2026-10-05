import api from "@/utils/axios";
import { setAccessToken } from "@/lib/authToken";
import MenuItems from "@/app/(DashboardLayout)/layout/vertical/sidebar/MenuItems";
import { NavGroup } from "@/app/(DashboardLayout)/types/layout/sidebar";
import {
    clearInflightUserPermissionsRequest,
    getInflightUserPermissionsRequest,
    getUserPermissionsCacheKey,
    readUserPermissionsCache,
    setInflightUserPermissionsRequest,
    writeUserPermissionsCache,
} from "@/lib/userPermissionsCache";

export { clearUserPermissionsCache } from "@/lib/userPermissionsCache";

export interface Permission {
    id: number;
    name: string;
    slug?: string;
    is_web: boolean | number;
    status: number;
}

export interface UserPermissions {
    permissions: Permission[];
}

type MenuAccessItem = {
    subheader?: string;
    navlabel?: boolean;
    slug?: string;
    title?: string;
    href?: string;
    children?: MenuAccessItem[];
};

export async function getUserPermissions(
    userId: number,
    companyId: number
): Promise<Permission[]> {
    const cached = readUserPermissionsCache(userId, companyId);
    if (cached) {
        return cached;
    }

    const cacheKey = getUserPermissionsCacheKey(userId, companyId);
    const inflight = getInflightUserPermissionsRequest(cacheKey);
    if (inflight) {
        return inflight;
    }

    const request = (async () => {
        try {
            const payload = {
                user_id: userId,
                company_id: companyId,
            };

            const response = await api.post("/dashboard/user-permissions", payload);
            const permissions = response.data.permissions || [];
            writeUserPermissionsCache(userId, companyId, permissions);
            return permissions;
        } catch (error) {
            console.error("Error fetching permissions:", error);
            return [];
        } finally {
            clearInflightUserPermissionsRequest(cacheKey);
        }
    })();

    setInflightUserPermissionsRequest(cacheKey, request);
    return request;
}

export function isWebPermissionGranted(perm?: Permission | null): boolean {
    if (!perm) return false;

    const isWeb = perm.is_web === true || perm.is_web === 1;
    const status = Number(perm.status);

    return Boolean(isWeb) && (status === 1 || status === 2);
}

function matchesPermission(perm: Permission, identifier: string): boolean {
    if (!identifier) return false;
    return perm.name === identifier || perm.slug === identifier;
}

export function hasPermission(
    permissions: Permission[] | null | undefined,
    permissionName: string
): boolean {
    if (!permissions?.length || !permissionName) return false;

    return permissions.some(
        (perm) => matchesPermission(perm, permissionName) && isWebPermissionGranted(perm)
    );
}

export function hasAnyPermission(
    permissions: Permission[] | null | undefined,
    permissionNames: string[]
): boolean {
    return permissionNames.some((name) => hasPermission(permissions, name));
}

export function canAccessMenuItem(
    item: MenuAccessItem | null | undefined,
    permissions: Permission[],
    isAdmin: boolean
): boolean {
    if (!item || item.subheader || item.navlabel) return false;
    if (isAdmin) return true;
    if (item.slug === "health_safety") return false;

    if (item.children && item.children.length > 0) {
        return item.children.some((child) => canAccessMenuItem(child, permissions, isAdmin))
            || hasPermission(permissions, item.slug || "")
            || hasPermission(permissions, item.title || "");
    }

    return hasPermission(permissions, item.slug || "")
        || hasPermission(permissions, item.title || "");
}

export function filterSidebarMenuItems<T extends MenuAccessItem>(
    items: T[],
    permissions: Permission[],
    isAdmin: boolean
): T[] {
    const withVisibleChildren = items.map((item) => {
        if (!isAdmin && item.children && item.children.length > 0) {
            return {
                ...item,
                children: item.children.filter((child) =>
                    canAccessMenuItem(child, permissions, isAdmin)
                ),
            };
        }
        return item;
    });

    const visibleItems = withVisibleChildren.filter((item) => {
        if (item.subheader || item.navlabel) return true;
        return canAccessMenuItem(item, permissions, isAdmin);
    });

    return visibleItems.filter((item, index, arr) => {
        if (!item.subheader && !item.navlabel) return true;

        for (let i = index + 1; i < arr.length; i++) {
            const next = arr[i];
            if (next.subheader || next.navlabel) return false;
            return true;
        }

        return false;
    });
}

export function getFirstAccessibleWebPath(
    permissions: Permission[],
    isAdmin: boolean
): string {
    if (isAdmin) return "/apps/users/list";

    for (const item of MenuItems as NavGroup[]) {
        if (item.subheader || item.navlabel || !item.href) continue;
        if (canAccessMenuItem(item, permissions, false)) {
            return item.href;
        }
    }

    return "/dashboard";
}

export async function resolvePostLoginPath(user?: {
    id?: number | string;
    company_id?: number | string | null;
    user_role_id?: number | string | null;
    token?: string | null;
} | null, accessToken?: string | null): Promise<string> {
    if (!user) return "/dashboard";

    const token = accessToken || user.token || null;
    if (token) {
        setAccessToken(token);
    }

    if (Number(user.user_role_id) === 1) {
        return "/apps/users/list";
    }

    if (!user.id || user.company_id === undefined || user.company_id === null) {
        return "/dashboard";
    }

    try {
        const permissions = await getUserPermissions(
            Number(user.id),
            Number(user.company_id)
        );
        return getFirstAccessibleWebPath(permissions, false);
    } catch (error) {
        console.error("Error resolving post-login path:", error);
        return "/dashboard";
    }
}
