"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import {
    Box,
    Typography,
    Button,
    Skeleton,
} from "@mui/material";
import Link from "next/link";

interface PermissionGuardProps {
    children: React.ReactNode;
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    fallback?: React.ReactNode;
    redirectTo?: string;
}

export default function PermissionGuard({
                                            children,
                                            permission,
                                            permissions: requiredPermissions,
                                            requireAll = false,
                                            fallback,
                                            redirectTo = "/dashboard",
                                        }: PermissionGuardProps) {
    const router = useRouter();
    const { permissions, loading } = usePermissions();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (loading) return;

        const webPermissions = permissions.filter((p) => p.is_web === true);
        if (webPermissions.length === 0) {
            router.push("/");
            return;
        }

        let authorized = false;

        if (permission) {
            authorized = hasPermission(permissions, permission);
        } else if (requiredPermissions && requiredPermissions.length > 0) {
            authorized = requireAll
                ? requiredPermissions.every((p) => hasPermission(permissions, p))
                : hasAnyPermission(permissions, requiredPermissions);
        } else {
            authorized = true;
        }

        setIsAuthorized(authorized);

        if (!authorized && redirectTo) {
            router.push(redirectTo);
        }
    }, [
        loading,
        permissions,
        permission,
        requiredPermissions,
        requireAll,
        redirectTo,
        router,
    ]);
    
    if (loading) {
        return <PermissionSkeleton />;
    }
    
    if (!isAuthorized) {
        if (fallback) return <>{fallback}</>;

        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "60vh",
                    textAlign: "center",
                    p: 3,
                    gap: 2,
                }}
            >
                <Typography variant="h4" component="h1" fontWeight={600}>
                    Access Denied
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    You don&apos;t have permission to access this page.
                </Typography>
                <Button component={Link} href="/dashboard" variant="contained" size="large">
                    Go to Dashboard
                </Button>
            </Box>
        );
    }
    
    return <>{children}</>;
}

function PermissionSkeleton() {
    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3 },
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
            }}
        >
            <Skeleton variant="text" width="40%" height={50} sx={{ maxWidth: 300 }} />

            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />

            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />

            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mt: 1 }} />
        </Box>
    );
}
