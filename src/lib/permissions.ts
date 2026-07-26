import { fetchUserPermissions } from "@/utils/userPermissions";

export interface Permission {
    id: number;
    name: string;
    is_web: boolean;
    status: number;
}

export interface UserPermissions {
    permissions: Permission[];
}

export async function getUserPermissions(
    userId: number,
    companyId: number
): Promise<Permission[]> {
    try {
        const response = await fetchUserPermissions(userId, companyId);
        return response.data.permissions || [];
    } catch (error) {
        console.error("Error fetching permissions:", error);
        return [];
    }
}

export function hasPermission(
    permissions: Permission[],
    permissionName: string
): boolean {
    return permissions.some(
        (perm) => perm.name === permissionName && perm.is_web === true && (perm.status === 1 || perm.status === 2)
    );
}

export function hasAnyPermission(
    permissions: Permission[],
    permissionNames: string[]
): boolean {
    return permissionNames.some((name) => hasPermission(permissions, name));
}
