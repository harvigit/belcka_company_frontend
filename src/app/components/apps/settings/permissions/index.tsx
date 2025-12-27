import React, { useEffect, useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    CircularProgress,
    Button,
} from '@mui/material';
import { Box } from '@mui/system';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import IOSSwitch from '@/app/components/common/IOSSwitch';

const statusToFlags = (status: number) => ({
    is_web_enabled: status === 1 || status === 2,
    is_app_enabled: status === 1 || status === 3,
});

const flagsToStatus = (is_web_enabled: boolean, is_app_enabled: boolean) => {
    if (is_web_enabled && is_app_enabled) return 1;
    if (is_web_enabled && !is_app_enabled) return 2;
    if (!is_web_enabled && is_app_enabled) return 3;
    return 0;
};

interface PermissionItem {
    id: number;
    permission_id: number;
    name: string;
    status: number;
    is_web: boolean;
    is_app: boolean;
    is_web_enabled: boolean;
    is_app_enabled: boolean;
}

export default function PermissionSettings() {
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [originalPermissions, setOriginalPermissions] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const columnVisibility = useMemo(() => {
        const hasWebSupport = originalPermissions.some(p => p.is_web);
        const hasAppSupport = originalPermissions.some(p => p.is_app);

        return {
            showWebColumn: hasWebSupport,
            showAppColumn: hasAppSupport,
        };
    }, [originalPermissions]);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await api.get('dashboard/company/permissions', {
                params: { is_web: true },
            });

            if (res.data?.IsSuccess) {
                const normalizedPermissions = res.data.permissions.map((perm: any) => {
                    const { is_web_enabled, is_app_enabled } = statusToFlags(perm.status);

                    return {
                        id: perm.id,
                        permission_id: perm.permission_id,
                        name: perm.name,
                        status: perm.status,
                        is_web: perm.is_web,           // From API - controls visibility
                        is_app: perm.is_app,           // From API - controls visibility
                        is_web_enabled,                // From status - controls switch state
                        is_app_enabled,                // From status - controls switch state
                    };
                });

                setPermissions(normalizedPermissions);
                setOriginalPermissions(normalizedPermissions);
                setHasChanges(false);
            }
        } catch (err: any) {
            console.error('Failed to fetch permissions', err);
            if (err?.response?.status !== 401 && err?.response?.status !== 403) {
                toast.error('Failed to fetch permissions');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, []);

    const updatePermissionState = (
        permissionId: number,
        field: 'is_web_enabled' | 'is_app_enabled',
        value: boolean
    ) => {
        setPermissions((prev) => {
            const updated = prev.map((perm) =>
                perm.id === permissionId ? { ...perm, [field]: value } : perm
            );

            // Check if there are actual changes compared to original
            const hasModifications = updated.some((updatedPerm) => {
                const original = originalPermissions.find(o => o.id === updatedPerm.id);
                if (!original) return false;
                return updatedPerm.is_web_enabled !== original.is_web_enabled ||
                    updatedPerm.is_app_enabled !== original.is_app_enabled;
            });

            setHasChanges(hasModifications);
            return updated;
        });
    };

    const savePermissions = async () => {
        setLoading(true);
        try {
            console.log(permissions, 'permissionspermissionspermissions')
            const payload = {
                permissions: permissions
                    .filter(perm => perm.is_web || perm.is_app)
                    .map((perm) => ({
                        permission_id: perm.permission_id,
                        status: flagsToStatus(perm.is_web_enabled, perm.is_app_enabled),
                    })),
            };

            const response = await api.post(
                'dashboard/company/change-bulk-permission-status',
                payload
            );

            if (response.data?.IsSuccess) {
                toast.success(response.data.message || 'Permissions updated successfully');
                setOriginalPermissions(permissions.map(p => ({ ...p })));
                setHasChanges(false);
            } else {
                toast.error(response.data.message || 'Update failed');
                fetchPermissions();
            }
        } catch (err: any) {
            console.error('Failed to update permissions', err);
            toast.error(err?.response?.data?.message || 'Failed to update permissions');
            fetchPermissions();
        } finally {
            setLoading(false);
        }
    };

    if (loading && permissions.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" mb={1} p={2} pb={0}>
                <Typography fontWeight={500} ml={2}>Permission Settings</Typography>
                {permissions.length > 0 && (
                    <Button
                        onClick={savePermissions}
                        disabled={loading || !hasChanges}
                        variant="contained"
                    >
                        {loading ? 'Updating...' : 'Update'}
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}  sx={{ p: 2, pt: 0}}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ background: '#e5e8ed' }}>
                            <TableCell>
                                <Typography variant="subtitle1">Titles</Typography>
                            </TableCell>
                            {columnVisibility.showWebColumn && (
                                <TableCell align="center">
                                    <Typography variant="subtitle1">Web</Typography>
                                </TableCell>
                            )}
                            {columnVisibility.showAppColumn && (
                                <TableCell align="center">
                                    <Typography variant="subtitle1">App</Typography>
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {permissions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={
                                        1 +
                                        (columnVisibility.showWebColumn ? 1 : 0) +
                                        (columnVisibility.showAppColumn ? 1 : 0)
                                    }
                                >
                                    <Typography m={3} textAlign="center">
                                        No permissions are found for this company!!
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            permissions.map((permission) => {
                                const originalPerm = originalPermissions.find(p => p.id === permission.id);
                                const canToggleWeb = originalPerm?.is_web === true;
                                const canToggleApp = originalPerm?.is_app === true;

                                return (
                                    <TableRow key={permission.id}>
                                        <TableCell sx={{ padding: '10px' }}>
                                            {permission.name}
                                        </TableCell>

                                        {columnVisibility.showWebColumn && (
                                            <TableCell align="center" sx={{ padding: '10px' }}>
                                                {canToggleWeb ? (
                                                    <IOSSwitch
                                                        checked={permission.is_web_enabled}
                                                        onChange={(e) =>
                                                            updatePermissionState(
                                                                permission.id,
                                                                'is_web_enabled',
                                                                e.target.checked
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                ) : (
                                                    <Typography color="text.disabled">-</Typography>
                                                )}
                                            </TableCell>
                                        )}

                                        {columnVisibility.showAppColumn && (
                                            <TableCell align="center" sx={{ padding: '10px' }}>
                                                {canToggleApp ? (
                                                    <IOSSwitch
                                                        checked={permission.is_app_enabled}
                                                        onChange={(e) =>
                                                            updatePermissionState(
                                                                permission.id,
                                                                'is_app_enabled',
                                                                e.target.checked
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                ) : (
                                                    <Typography color="text.disabled">-</Typography>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
