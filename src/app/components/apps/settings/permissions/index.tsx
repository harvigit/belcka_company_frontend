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
    is_web: status === 1 || status === 2,
    is_app: status === 1 || status === 3,
});

const flagsToStatus = (is_web: boolean, is_app: boolean) => {
    if (is_web && is_app) return 1;
    if (is_web && !is_app) return 2;
    if (!is_web && is_app) return 3;
    return 0;
};

interface PermissionItem {
    id: number;
    permission_id: number;
    name: string;
    status: number;
    is_web: boolean;
    is_app: boolean;
}

export default function PermissionSettings() {
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [originalPermissions, setOriginalPermissions] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const columnVisibility = useMemo(() => ({
        showWebColumn: permissions.some(p => p.is_web === true),
        showAppColumn: permissions.some(p => p.is_app === true),
    }), [permissions]);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await api.get('dashboard/company/permissions', {
                params: { is_web: true },
            });

            if (res.data?.IsSuccess) {
                const normalizedPermissions = res.data.permissions.map((perm: any) => {
                    const flags = statusToFlags(perm.status);

                    return {
                        ...perm,
                        is_web: perm.is_web === true,
                        is_app: perm.is_app === true,
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
        field: 'is_web' | 'is_app',
        value: boolean
    ) => {
        setPermissions((prev) => {
            const updated = prev.map((perm) => {
                if (perm.id === permissionId) {
                    const permission = permissions.find(p => p.id === permissionId);

                    if (field === 'is_web' && !permission?.is_web && originalPermissions.find(p => p.id === permissionId)?.is_web === false) {
                        return perm; 
                    }
                    if (field === 'is_app' && !permission?.is_app && originalPermissions.find(p => p.id === permissionId)?.is_app === false) {
                        return perm;
                    }

                    return { ...perm, [field]: value };
                }
                return perm;
            });

            const hasModifications = updated.some((perm, idx) => {
                const orig = originalPermissions[idx];
                return (
                    (orig?.is_web === true && perm.is_web !== orig.is_web) ||
                    (orig?.is_app === true && perm.is_app !== orig.is_app)
                );
            });

            setHasChanges(hasModifications);
            return updated;
        });
    };

    const savePermissions = async () => {
        setLoading(true);
        try {
            const payload = {
                permissions: permissions
                    .filter(perm => perm.is_web || perm.is_app)
                    .map((perm) => ({
                        permission_id: perm.permission_id,
                        status: flagsToStatus(perm.is_web, perm.is_app),
                    })),
            };

            const response = await api.post(
                'dashboard/company/change-bulk-permission-status',
                payload
            );

            if (response.data?.IsSuccess) {
                toast.success(response.data.message || 'Permissions updated successfully');
                setOriginalPermissions(permissions);
                setHasChanges(false);
            } else {
                toast.error(response.data.message || 'Update failed');
                fetchPermissions();
            }
        } catch (err: any) {
            console.error('Failed to update permission', err);
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
            <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography fontWeight={500}>Permission Settings</Typography>
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

            <TableContainer component={Paper}>
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
                                <TableCell colSpan={
                                    1 +
                                    (columnVisibility.showWebColumn ? 1 : 0) +
                                    (columnVisibility.showAppColumn ? 1 : 0)
                                }>
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

                                        {/* Web Column */}
                                        {columnVisibility.showWebColumn && (
                                            <TableCell align="center" sx={{ padding: '10px' }}>
                                                {canToggleWeb && (
                                                    <IOSSwitch
                                                        checked={permission.is_web}
                                                        onChange={(e) =>
                                                            updatePermissionState(
                                                                permission.id,
                                                                'is_web',
                                                                e.target.checked
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                )}
                                            </TableCell>
                                        )}

                                        {/* App Column */}
                                        {columnVisibility.showAppColumn && (
                                            <TableCell align="center" sx={{ padding: '10px' }}>
                                                {canToggleApp && (
                                                    <IOSSwitch
                                                        checked={permission.is_app}
                                                        onChange={(e) =>
                                                            updatePermissionState(
                                                                permission.id,
                                                                'is_app',
                                                                e.target.checked
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
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
