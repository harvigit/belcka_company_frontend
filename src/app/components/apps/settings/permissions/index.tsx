import React, { useEffect, useState } from 'react';
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
                        is_web: flags.is_web,
                        is_app: flags.is_app,
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
            const updated = prev.map((perm) =>
                perm.id === permissionId
                    ? { ...perm, [field]: value }
                    : perm
            );

            const hasModifications = updated.some((perm, idx) =>
                perm.is_web !== originalPermissions[idx]?.is_web ||
                perm.is_app !== originalPermissions[idx]?.is_app
            );

            setHasChanges(hasModifications);
            return updated;
        });
    };
    
    const savePermissions = async () => {
        setLoading(true);
        try {
            const payload = {
                permissions: permissions.map((perm) => ({
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

            <TableContainer sx={{ maxHeight: 700 }} component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow sx={{ background: '#e5e8ed' }}>
                            <TableCell>
                                <Typography variant="subtitle1">Titles</Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="subtitle1">Web</Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="subtitle1">App</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {permissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography m={3} textAlign="center">
                                        No permissions are found for this company!!
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            permissions.map((permission) => (
                                <TableRow key={permission.id}>
                                    <TableCell sx={{ padding: '10px' }}>
                                        {permission.name}
                                    </TableCell>

                                    <TableCell align="center" sx={{ padding: '10px' }}>
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
                                    </TableCell>

                                    <TableCell align="center" sx={{ padding: '10px' }}>
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
