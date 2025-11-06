"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
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
        if (!loading) {
            let authorized = false;

            if (permission) {
                authorized = hasPermission(permissions, permission);
            } else if (requiredPermissions && requiredPermissions.length > 0) {
                if (requireAll) {
                    authorized = requiredPermissions.every((perm) =>
                        hasPermission(permissions, perm)
                    );
                } else {
                    authorized = hasAnyPermission(permissions, requiredPermissions);
                }
            }

            setIsAuthorized(authorized);

            if (!authorized && redirectTo) {
                router.push(redirectTo);
            }
        }
    }, [loading, permissions, permission, requiredPermissions, requireAll, redirectTo, router]);

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="400px"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthorized) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="400px"
                flexDirection="column"
                gap={2}
            >
                <Typography variant="h4">Access Denied</Typography>
                <Typography variant="body1" color="text.secondary">
                    You don't have permission to access this page.
                </Typography>
                <Button component={Link} href="/dashboard" variant="contained">
                    Go to Dashboard
                </Button>
            </Box>
        );
    }

    return <>{children}</>;
}
