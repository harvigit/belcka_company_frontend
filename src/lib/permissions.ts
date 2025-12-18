import api from "@/utils/axios";

export interface Permission {
    id: number;
    name: string;
    is_web: boolean;
    status: boolean;
}

export interface UserPermissions {
    permissions: Permission[];
}

export async function getUserPermissions(
    userId: number,
    companyId: number
): Promise<Permission[]> {
    try {
        const payload = {
            user_id: userId,
            company_id: companyId,
        };

        const response = await api.post("/dashboard/user/permissions", payload);
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
        (perm) => perm.name === permissionName && perm.is_web === true && perm.status === true
    );
}

export function hasAnyPermission(
    permissions: Permission[],
    permissionNames: string[]
): boolean {
    return permissionNames.some((name) => hasPermission(permissions, name));
}
