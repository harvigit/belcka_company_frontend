'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {
    Avatar,
    Badge,
    Box,
    Chip,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {IconArrowLeft, IconLock, IconSearch, IconX} from '@tabler/icons-react';
import {createColumnHelper, flexRender} from '@tanstack/react-table';
import Image from 'next/image';
import Link from 'next/link';
import {User} from 'next-auth';
import {useSession} from 'next-auth/react';
import {useTranslation} from 'react-i18next';
import toast from 'react-hot-toast';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import api from '@/utils/axios';
import {getUserDetailsHref} from '@/utils/userDetailsRoute';
import {useServerTable} from '@/hooks/useServerTable';

type Permission = {
    id: number;
    name: string;
    status: number;
    is_web?: boolean;
    is_app?: boolean;
};

type CheckinTaskUser = {
    id: number;
    name: string;
    trade_name?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
    status_color?: string | null;
    is_multi_task?: boolean;
    permissions: Permission[];
    permission_count: number;
};

const TaskUserCheckinSettings: React.FC = () => {
    const {t} = useTranslation();
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | string | null};
    const [loading, setLoading] = useState(true);
    const [savingUserId, setSavingUserId] = useState<number | null>(null);
    const [users, setUsers] = useState<CheckinTaskUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [totalUsersListCount, setTotalUsersListCount] = useState<number | undefined>();
    const [workingUsersListCount, setWorkingUsersListCount] = useState<number | undefined>();
    const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false);
    const [selectedUserPermissions, setSelectedUserPermissions] = useState<CheckinTaskUser | null>(null);
    const [permissionSearch, setPermissionSearch] = useState('');
    const [tempPermissions, setTempPermissions] = useState<{
        web: Set<number>;
        app: Set<number>;
    }>({
        web: new Set(),
        app: new Set(),
    });

    const fetchUsers = useCallback(async () => {
        if (!user?.company_id) return;

        setLoading(true);
        try {
            const res = await api.get('user/get-user-lists?page=1&limit=1000');
            const responseData = res.data?.info?.data || res.data?.info || res.data?.data || [];
            const nextUsers = Array.isArray(responseData) ? responseData : [];

            setUsers(nextUsers);
            setIsAdmin(Boolean(res.data?.is_admin));

            if (res.data?.total_users !== undefined) {
                setTotalUsersListCount(res.data.total_users);
            }
            if (res.data?.working_member_count !== undefined) {
                setWorkingUsersListCount(res.data.working_member_count);
            }
        } catch (error) {
            console.error('Failed to load check-in task users:', error);
            toast.error(t('Failed to load users'));
        } finally {
            setLoading(false);
        }
    }, [t, user?.company_id]);

    const searchedUsers = useMemo(() => {
        const searchWords = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (!searchWords.length) return users;

        return users.filter((item) => {
            const searchText = [item.name, item.trade_name].filter(Boolean).join(' ').toLowerCase();
            return searchWords.every((word) => searchText.includes(word));
        });
    }, [searchTerm, users]);

    const canAccessPermissions = () => isAdmin;
    const canEditPermissions = () => isAdmin;

    const handleOpenPermissionsDrawer = (userPermission: CheckinTaskUser) => {
        if (!canAccessPermissions()) return;

        setSelectedUserPermissions(userPermission);
        const web = new Set<number>();
        const app = new Set<number>();

        userPermission.permissions?.forEach((permission) => {
            if (permission.status === 1 || permission.status === 2) web.add(permission.id);
            if (permission.status === 1 || permission.status === 3) app.add(permission.id);
        });

        setTempPermissions({web, app});
        setPermissionSearch('');
        setPermissionsDrawerOpen(true);
    };

    const filteredPermissions = useMemo(() => {
        if (!selectedUserPermissions) return [];

        return Array.from(
            new Map(
                (selectedUserPermissions.permissions || [])
                    .filter((permission) =>
                        permission.name.toLowerCase().includes(permissionSearch.toLowerCase()),
                    )
                    .map((permission) => [permission.id, permission]),
            ).values(),
        );
    }, [permissionSearch, selectedUserPermissions]);

    const allWebSelected =
        filteredPermissions.length > 0 &&
        filteredPermissions.every((permission) => tempPermissions.web.has(permission.id));

    const allAppSelected =
        filteredPermissions.length > 0 &&
        filteredPermissions.every((permission) => tempPermissions.app.has(permission.id));

    const handlePermissionToggle = (permissionId: number, type: 'web' | 'app') => {
        if (!canEditPermissions()) return;

        setTempPermissions((prev) => {
            const updated = new Set(prev[type]);
            updated.has(permissionId) ? updated.delete(permissionId) : updated.add(permissionId);
            return {...prev, [type]: updated};
        });
    };

    const handleSelectAll = (type: 'web' | 'app') => {
        if (!canEditPermissions()) return;

        const allSelected = filteredPermissions.every((permission) => tempPermissions[type].has(permission.id));

        setTempPermissions((prev) => {
            const updated = new Set(prev[type]);
            if (allSelected) {
                filteredPermissions.forEach((permission) => updated.delete(permission.id));
            } else {
                filteredPermissions.forEach((permission) => updated.add(permission.id));
            }
            return {...prev, [type]: updated};
        });
    };

    const handleSavePermissions = async () => {
        if (!canEditPermissions()) {
            toast.error(t('You have view-only access and cannot edit user permissions.'));
            return;
        }

        if (!selectedUserPermissions || !user?.company_id) return;

        try {
            const permissions = selectedUserPermissions.permissions.map((permission) => {
                const hasWeb = tempPermissions.web.has(permission.id);
                const hasApp = tempPermissions.app.has(permission.id);

                let status = 0;
                if (hasWeb && hasApp) status = 1;
                else if (hasWeb) status = 2;
                else if (hasApp) status = 3;

                return {
                    permission_id: permission.id,
                    status,
                };
            });

            const response = await api.post('dashboard/company/change-user-permissions-status', {
                user_id: selectedUserPermissions.id,
                company_id: user.company_id,
                permissions,
            });

            if (response.data.IsSuccess === true) {
                toast.success(response.data.message || t('Permissions updated successfully'));

                const newPermissionCount = selectedUserPermissions.permissions.filter(
                    (permission) => tempPermissions.web.has(permission.id) || tempPermissions.app.has(permission.id),
                ).length;

                setUsers((prevUsers) =>
                    prevUsers.map((item) => {
                        if (item.id !== selectedUserPermissions.id) return item;

                        const updatedPermissions = item.permissions.map((permission) => {
                            const hasWeb = tempPermissions.web.has(permission.id);
                            const hasApp = tempPermissions.app.has(permission.id);
                            let status = 0;
                            if (hasWeb && hasApp) status = 1;
                            else if (hasWeb) status = 2;
                            else if (hasApp) status = 3;
                            return {...permission, status};
                        });

                        return {
                            ...item,
                            permissions: updatedPermissions,
                            permission_count: newPermissionCount,
                        };
                    }),
                );

                setPermissionsDrawerOpen(false);
                await fetchUsers();
            } else {
                toast.error(response.data?.message || t('Failed to update permissions'));
            }
        } catch (error) {
            console.error('Failed to update permissions', error);
            toast.error(t('Failed to update permissions'));
        }
    };

    const handleToggleUserCheckin = async (checkinUser: CheckinTaskUser, checked: boolean) => {
        if (!user?.company_id || savingUserId) return;

        const previousUsers = users;
        setSavingUserId(checkinUser.id);
        setUsers((prev) =>
            prev.map((item) =>
                item.id === checkinUser.id ? {...item, is_multi_task: checked} : item,
            ),
        );

        try {
            const res = await api.post('setting/change-bulk-multi-task', {
                company_id: Number(user.company_id),
                users: [
                    {
                        id: Number(checkinUser.id),
                        is_multi_task: checked,
                    },
                ],
            });

            if (!res.data?.IsSuccess) {
                setUsers(previousUsers);
                toast.error(res.data?.message || t('Failed to update user check-in permission'));
                return;
            }

            toast.success(res.data?.message || t('User check-in permission updated'));
        } catch (error: any) {
            setUsers(previousUsers);
            toast.error(error?.response?.data?.message || t('Failed to update user check-in permission'));
        } finally {
            setSavingUserId(null);
        }
    };

    const columnHelper = createColumnHelper<CheckinTaskUser>();

    const columns = useMemo(() => [
        columnHelper.accessor('name', {
            id: 'name',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Name')}
                </Typography>
            ),
            enableSorting: false,
            cell: ({row}: any) => {
                const item = row.original;

                return (
                    <Link href={getUserDetailsHref(item.id)} passHref>
                        <Stack direction="row" alignItems="center" spacing={4} sx={{cursor: 'pointer', width: 310}}>
                            <Badge
                                overlap="circular"
                                anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                                variant="dot"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        backgroundColor: item?.status_color || '#df2626',
                                        color: item?.status_color || '#df2626',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 2px white',
                                    },
                                }}
                            >
                                <Avatar
                                    src={item?.user_image || item?.user_thumb_image || '/images/users/user.png'}
                                    alt={item?.name}
                                    sx={{width: 36, height: 36}}
                                />
                            </Badge>
                            <Box>
                                <Typography
                                    className="f-14"
                                    color="textPrimary"
                                    sx={{
                                        '&:hover': {color: '#173f98'},
                                        width: 190,
                                    }}
                                >
                                    {item.name ?? '-'}
                                </Typography>
                                <Tooltip title={item.trade_name ? t(item.trade_name) : '-'} placement="top" arrow>
                                    <Typography
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                            WebkitLineClamp: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            wordBreak: 'break-word',
                                        }}
                                        color="textSecondary"
                                        variant="subtitle1"
                                        width={190}
                                    >
                                        {item.trade_name ? t(item.trade_name) : '-'}
                                    </Typography>
                                </Tooltip>
                            </Box>
                        </Stack>
                    </Link>
                );
            },
        }),
        columnHelper.accessor((row) => row.permissions, {
            id: 'permissions',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Permissions')}
                </Typography>
            ),
            enableSorting: false,
            cell: ({row}: any) => {
                const item = row.original;
                const canAccess = canAccessPermissions();

                return (
                    <Chip
                        size="small"
                        onClick={canAccess ? () => handleOpenPermissionsDrawer(item) : undefined}
                        label={
                            item.permission_count === 0
                                ? t('Select')
                                : t('permissions.count', {count: item.permission_count})
                        }
                        sx={{
                            backgroundColor: (theme) => theme.palette.primary.light,
                            color: (theme) => theme.palette.primary.main,
                            fontWeight: 500,
                            borderRadius: '10px',
                            px: 1.5,
                            cursor: canAccess ? 'pointer' : 'not-allowed',
                            opacity: canAccess ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                            minWidth: 120,
                            '&:hover': {
                                transform: canAccess ? 'translateY(-2px)' : 'none',
                                boxShadow: canAccess ? '0 4px 8px rgba(0,0,0,0.15)' : 'none',
                            },
                        }}
                    />
                );
            },
        }),
        columnHelper.accessor((row) => row.is_multi_task, {
            id: 'multipleCheckin',
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Multiple checkin')}
                </Typography>
            ),
            enableSorting: false,
            cell: ({row}: any) => {
                const item = row.original;

                return (
                    <IOSSwitch
                        checked={Boolean(item.is_multi_task)}
                        disabled={savingUserId === item.id}
                        onChange={(event) => handleToggleUserCheckin(item, event.target.checked)}
                    />
                );
            },
        }),
    ], [isAdmin, savingUserId, t, users]);

    const {
        table,
        setPagination,
    } = useServerTable({
        data: searchedUsers,
        columns,
        fetchData: fetchUsers,
        debounceDependencies: [user?.company_id],
        manualPagination: false,
        manualFiltering: false,
        getRowId: (row) => String(row.id),
    });

    const simpleColumns = useMemo(
        () => columns.map((column: any) => column.id || column.accessorKey),
        [columns],
    );

    return (
        <Box
            sx={{
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <Stack
                mr={2}
                ml={2}
                mb={2}
                justifyContent="space-between"
                direction={{xs: 'column', sm: 'row'}}
                spacing={{xs: 1, sm: 2, md: 4}}
            >
                <Box display="flex" alignItems="center" sx={{width: {xs: '100%', sm: 260}}}>
                    <TextField
                        id="search"
                        type="text"
                        size="small"
                        variant="outlined"
                        placeholder={t('Search...')}
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPagination((prev) =>
                                prev.pageIndex === 0 ? prev : {...prev, pageIndex: 0},
                            );
                        }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            },
                        }}
                        fullWidth
                    />
                </Box>
            </Stack>
            <Divider/>

            <TableContainer
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                    overflowY: 'auto',
                }}
            >
                <Table stickyHeader aria-label="sticky table" sx={{minWidth: 900}}>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableCell
                                        key={header.id}
                                        align={header.column.id === 'name' ? 'left' : 'center'}
                                        sx={{
                                            paddingTop: '10px',
                                            paddingBottom: '10px',
                                            width:
                                                header.column.id === 'name'
                                                    ? 340
                                                    : header.column.id === 'permissions'
                                                        ? 360
                                                        : 260,
                                            borderRight: header.column.id === 'name' ? '1px solid #e5e7eb' : 'none',
                                        }}
                                    >
                                        <Box
                                            p={0}
                                            sx={{
                                                border: '2px solid transparent',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                justifyContent: header.column.id === 'name' ? 'flex-start' : 'center',
                                                '&:hover': {color: '#888'},
                                            }}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext(),
                                            )}
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <SkeletonLoader columns={simpleColumns} rowCount={3}/>
                        ) : searchedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 'calc(50vh - 100px)',
                                        }}
                                    >
                                        <Image
                                            src="/images/no-data.png"
                                            alt={t('No data')}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                            }}
                                            width={200}
                                            height={200}
                                        />
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow hover sx={{cursor: 'pointer'}} key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            align={cell.column.id === 'name' ? 'left' : 'center'}
                                            sx={{
                                                padding: '10px',
                                                borderRight: cell.column.id === 'name' ? '1px solid #e5e7eb' : 'none',
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider/>
            <Box sx={{padding: '10px'}}>
                <TablePaginationFooter
                    table={table}
                    totalRows={searchedUsers.length}
                    totalUsers={totalUsersListCount}
                    workingMemberCount={workingUsersListCount}
                />
            </Box>

            <Drawer
                anchor="right"
                open={permissionsDrawerOpen}
                onClose={() => setPermissionsDrawerOpen(false)}
                sx={{
                    width: 450,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 450,
                        padding: 2,
                        backgroundColor: '#f9f9f9',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <Box display="flex" flexDirection="column" height="100%" sx={{overflow: 'hidden'}}>
                    <Box display="flex" alignContent="center" alignItems="center" flexWrap="wrap" sx={{mb: 2, flexShrink: 0}}>
                        <IconButton onClick={() => setPermissionsDrawerOpen(false)} sx={{p: 0, mr: 1}}>
                            <IconArrowLeft size={24}/>
                        </IconButton>
                        <Typography variant="h5" fontWeight={700}>
                            {t('Manage Permissions')} - {selectedUserPermissions?.name}
                        </Typography>
                        <IconButton
                            aria-label="close"
                            onClick={() => setPermissionsDrawerOpen(false)}
                            size="small"
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[900],
                                backgroundColor: 'transparent',
                                zIndex: 10,
                                width: 50,
                                height: 50,
                            }}
                        >
                            <IconX size={18}/>
                        </IconButton>
                    </Box>

                    {!canEditPermissions() && (
                        <Box
                            sx={{
                                mb: 2,
                                p: 1.5,
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <IconLock size={18} style={{color: '#ff6b6b'}}/>
                            <Typography variant="caption" color="textSecondary">
                                {t('View only - You cannot edit permissions')}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{mb: 2, flexShrink: 0}}>
                        <TextField
                            size="small"
                            placeholder={t('Search permissions...')}
                            value={permissionSearch}
                            onChange={(event) => setPermissionSearch(event.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            }}
                            fullWidth
                        />
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            width: '100%',
                            pr: 1.5,
                            '&::-webkit-scrollbar': {width: '8px'},
                            '&::-webkit-scrollbar-track': {background: 'transparent'},
                            '&::-webkit-scrollbar-thumb': {
                                background: '#ccc',
                                borderRadius: '4px',
                                '&:hover': {background: '#999'},
                            },
                        }}
                    >
                        <table style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed'}}>
                            <colgroup>
                                <col style={{width: 'auto'}}/>
                                <col style={{width: '120px'}}/>
                                <col style={{width: '120px'}}/>
                            </colgroup>
                            <thead>
                            <tr style={{position: 'sticky', top: 0, backgroundColor: '#f9f9f9', zIndex: 1}}>
                                <th style={{padding: '6px 8px', textAlign: 'left'}}/>
                                <th style={{padding: '6px 8px', textAlign: 'center'}}>
                                    <Typography variant="subtitle2" fontWeight={600}>{t('Web')}</Typography>
                                </th>
                                <th style={{padding: '6px 8px', textAlign: 'center'}}>
                                    <Typography variant="subtitle2" fontWeight={600}>{t('App')}</Typography>
                                </th>
                            </tr>
                            <tr
                                onMouseEnter={(event) => {
                                    event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                                }}
                                onMouseLeave={(event) => {
                                    event.currentTarget.style.backgroundColor = '#f9f9f9';
                                }}
                            >
                                <td style={{padding: '8px 8px'}}>
                                    <Typography fontWeight={500}>{t('Select All')}</Typography>
                                </td>
                                <td style={{padding: '8px 8px', textAlign: 'center'}}>
                                    <IOSSwitch
                                        checked={allWebSelected}
                                        onChange={() => handleSelectAll('web')}
                                        disabled={loading || !canEditPermissions()}
                                    />
                                </td>
                                <td style={{padding: '8px 8px', textAlign: 'center'}}>
                                    <IOSSwitch
                                        checked={allAppSelected}
                                        onChange={() => handleSelectAll('app')}
                                        disabled={loading || !canEditPermissions()}
                                    />
                                </td>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredPermissions.map((permission) => (
                                <tr
                                    key={permission.id}
                                    onMouseEnter={(event) => {
                                        event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                                    }}
                                    onMouseLeave={(event) => {
                                        event.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <td style={{padding: '8px 8px'}}>
                                        <Typography>{t(permission.name)}</Typography>
                                    </td>
                                    <td style={{padding: '8px 8px', textAlign: 'center'}}>
                                        {permission.is_web !== false && (
                                            <IOSSwitch
                                                checked={tempPermissions.web.has(permission.id)}
                                                onChange={() => handlePermissionToggle(permission.id, 'web')}
                                                disabled={loading || !canEditPermissions()}
                                            />
                                        )}
                                    </td>
                                    <td style={{padding: '8px 8px', textAlign: 'center'}}>
                                        {permission.is_app !== false && (
                                            <IOSSwitch
                                                checked={tempPermissions.app.has(permission.id)}
                                                onChange={() => handlePermissionToggle(permission.id, 'app')}
                                                disabled={loading || !canEditPermissions()}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </Box>

                    {canEditPermissions() && (
                        <Box mb={1} display="flex" justifyContent="flex-start" gap={2} sx={{flexShrink: 0, paddingTop: 2}}>
                            <Box
                                component="button"
                                onClick={handleSavePermissions}
                                className="drawer_buttons"
                                sx={{
                                    border: 0,
                                    bgcolor: 'primary.main',
                                    color: '#fff',
                                    borderRadius: 3,
                                    px: 3,
                                    py: 1.25,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {t('Save')}
                            </Box>
                            <Box
                                component="button"
                                onClick={() => setPermissionsDrawerOpen(false)}
                                sx={{
                                    border: 0,
                                    bgcolor: 'transparent',
                                    color: 'GrayText',
                                    borderRadius: 3,
                                    px: 3,
                                    py: 1.25,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {t('Cancel')}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Drawer>
        </Box>
    );
};

export default TaskUserCheckinSettings;
