import React, {useEffect, useState} from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Switch,
    Typography,
    CircularProgress,
    Button,
} from '@mui/material';
import api from '@/utils/axios';
import toast from 'react-hot-toast';
import {Box} from '@mui/system';
import IOSSwitch from '@/app/components/common/IOSSwitch';

interface PermissionItem {
    color: string
    company_id: number
    description: string
    icon: string
    id: number
    is_admin: boolean
    is_app: boolean
    is_web: boolean
    name: string
    permission_id: number
    sequence: number
    slug: string
    status: boolean
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
                params: { is_web: true }
            });

            if (res.data?.IsSuccess) {
                const permissions = res.data.permissions;
                setPermissions(permissions);
                setOriginalPermissions(permissions);
                setHasChanges(false);
            }

            console.log(res.data.permissions, 'permissions')
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
        value: boolean
    ) => {
        setPermissions((prev) => {
            const updated = prev.map((perm) => {
                if (perm.id === permissionId) {
                    return {
                        ...perm,
                        status: value,
                    };
                }
                return perm;
            });

            // Check if there are changes compared to original
            const hasModifications = updated.some((perm, idx) =>
                perm.status !== originalPermissions[idx]?.status
            );
            setHasChanges(hasModifications);

            return updated;
        });
    };

    const savePermissions = async () => {
        setLoading(true);
        try {
            // Create payload with proper structure - convert boolean to 0/1
            const payload = {
                permissions: permissions.map(perm => ({
                    permission_id: perm.permission_id,
                    status: perm.status ? 1 : 0,
                }))
            };
            
            const response = await api.post(
                `dashboard/company/change-bulk-permission-status`,
                payload
            );

            if (response.data.IsSuccess) {
                toast.success(response.data.message || 'Permissions updated successfully');
                setOriginalPermissions(permissions);
                setHasChanges(false);
            } else {
                toast.error(response.data.message || 'Update failed');
                await fetchPermissions();
            }
        } catch (err: any) {
            console.error('Failed to update permission', err);
            console.error('Error response:', err?.response?.data); // Debug log
            if (err?.response?.status !== 401 && err?.response?.status !== 403) {
                toast.error(err?.response?.data?.message || 'Failed to update permissions');
            }
            await fetchPermissions();
        } finally {
            setLoading(false);
        }
    };

    if (loading && permissions.length === 0) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
            >
                <CircularProgress/>
            </Box>
        );
    }

    return (
        <Box>
            <Box display={'flex'} justifyContent={'space-between'} mb={1}>
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
            <TableContainer sx={{maxHeight: 700}} component={Paper}>
                <Table stickyHeader aria-label="sticky table">
                    <TableHead>
                        <TableRow sx={{background: '#e5e8ed'}}>
                            <TableCell>
                                <Typography variant="subtitle1">
                                    Titles
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="subtitle1">
                                    Action
                                </Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {permissions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2}>
                                    <Typography m={3} textAlign="center">
                                        No permissions are found for this company!!
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            permissions.map((permission) => (
                                <TableRow key={permission.id}>
                                    <TableCell sx={{padding: '10px'}}>
                                        {permission.name}
                                    </TableCell>
                                    <TableCell align="center" sx={{padding: '10px'}}>
                                        <IOSSwitch
                                            checked={permission.status}
                                            onChange={(e) =>
                                                updatePermissionState(
                                                    permission.id,
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
