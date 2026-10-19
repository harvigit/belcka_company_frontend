'use client';

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    MenuItem,
    Popover,
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
import {IconArrowLeft, IconEye, IconHelpCircle, IconLock, IconSearch, IconX} from '@tabler/icons-react';
import {createColumnHelper} from '@tanstack/react-table';
import {flexRender} from '@/utils/flexRender';
import Image from 'next/image';
import Link from 'next/link';
import {User} from 'next-auth';
import {useSession} from 'next-auth/react';
import {useTranslation} from 'react-i18next';
import toast from 'react-hot-toast';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import api from '@/utils/axios';
import {getUserDetailsHref} from '@/utils/userDetailsRoute';
import {useServerTable} from '@/hooks/useServerTable';
import {readListingTableState, writeListingTableState} from '@/utils/listingTableStateStorage';

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
    user_role_id: number;
    is_check_in?: boolean;
    is_company_owner?: boolean;
    supervisor_team_id?: number | null;
    supervisor_team_name?: string | null;
    is_autostop_work_penalty?: boolean;
    is_outside_boundary_penalty?: boolean;
    is_location_restricted?: boolean;
    is_start_inside_boundary?: boolean;
    is_stop_inside_boundary?: boolean;
    permissions: Permission[];
    permission_count: number;
};

type GeofenceField =
    | 'is_autostop_work_penalty'
    | 'is_outside_boundary_penalty'
    | 'is_location_restricted'
    | 'is_start_inside_boundary'
    | 'is_stop_inside_boundary';

type SettingsSection = 'penalty' | 'geofence';

const SECTION_TITLES: Record<SettingsSection, string> = {
    penalty: 'Penalty Setting',
    geofence: 'Geofence Setting',
};

// `apiKey` is what user/update-geofence-penalty-settings expects, `field` is what user/get-user-lists returns.
// Start/stop within geofence only apply while the geofence main setting is on; turning main off clears them.
const GEOFENCE_SETTINGS: {
    id: string;
    section: SettingsSection;
    apiKey: string;
    field: GeofenceField;
    shortLabel: string;
    label: string;
    requiresMain?: boolean;
}[] = [
    {id: 'autoStopWorkPenalty', section: 'penalty', apiKey: 'auto_stop_work_penalty', field: 'is_autostop_work_penalty', shortLabel: 'Auto stop', label: 'Automatically stop work penalty'},
    {id: 'stopWorkOutsidePenalty', section: 'penalty', apiKey: 'stop_work_outside_penalty', field: 'is_outside_boundary_penalty', shortLabel: 'Outside area', label: 'Stop work outside of working area penalty'},
    {id: 'geofenceMainSetting', section: 'geofence', apiKey: 'geofence_main_setting', field: 'is_location_restricted', shortLabel: 'Geofence', label: 'Geofence main setting'},
    {id: 'startWorkWithinGeofence', section: 'geofence', apiKey: 'start_work_within_geofence', field: 'is_start_inside_boundary', shortLabel: 'Start work', label: 'Only allow to start work within geofence boundary', requiresMain: true},
    {id: 'stopWorkWithinGeofence', section: 'geofence', apiKey: 'stop_work_within_geofence', field: 'is_stop_inside_boundary', shortLabel: 'Stop work', label: 'Only allow to stop work within geofence boundary', requiresMain: true},
];

const TaskUserCheckinSettings: React.FC = () => {
    const {t} = useTranslation();
    const {data: session, update} = useSession();
    const user = session?.user as User & {
        id: number;
        company_id?: number | string | null;
        user_role_id?: number | null;
    };
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

    const [checkinSavingId, setCheckinSavingId] = useState<number | null>(null);
    const [adminSavingId, setAdminSavingId] = useState<number | null>(null);

    const [geofenceSavingKey, setGeofenceSavingKey] = useState<string | null>(null);
    const [bulkGeofence, setBulkGeofence] = useState<{
        setting: (typeof GEOFENCE_SETTINGS)[number];
        checked: boolean;
        userIds: number[];
    } | null>(null);
    const [bulkSaving, setBulkSaving] = useState(false);
    const firstHeaderRowRef = useRef<HTMLTableRowElement | null>(null);
    const [firstHeaderRowHeight, setFirstHeaderRowHeight] = useState(0);
    const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(null);
    const [columnSearch, setColumnSearch] = useState('');
    const columnVisibilityKey = `columnVisibility_userAccess_${user?.id ?? ''}`;
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
    const [removeAdminUser, setRemoveAdminUser] = useState<CheckinTaskUser | null>(null);
    const [userToArchive, setUserToArchive] = useState<CheckinTaskUser | null>(null);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [supervisorReplacementOpen, setSupervisorReplacementOpen] = useState(false);
    const [newSupervisorId, setNewSupervisorId] = useState<number | ''>('');

    const [otpModalOpen, setOtpModalOpen] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [otpMessage, setOtpMessage] = useState('Enter OTP');
    const [otpResolve, setOtpResolve] = useState<(otp: string | null) => void>();

    const isCompanyOwner = useMemo(
        () => Boolean(users.find((item) => Number(item.id) === Number(user?.id))?.is_company_owner),
        [users, user?.id],
    );

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

    const askOtp = (message = 'Enter OTP'): Promise<string | null> => {
        return new Promise((resolve) => {
            setOtpValue('');
            setOtpMessage(message);
            setOtpResolve(() => resolve);
            setOtpModalOpen(true);
        });
    };

    const closeOtpModal = (otp: string | null) => {
        setOtpModalOpen(false);
        otpResolve?.(otp);
        setOtpResolve(undefined);
    };

    const refreshLoggedInUserRole = async () => {
        try {
            const res = await api.get(`user/get-user-lists?user_id=${user.id}`);
            if (res.data?.info?.length) {
                await update({
                    user: {
                        ...session?.user,
                        user_role_id: res.data.info[0].user_role_id,
                    },
                });
            }
        } catch (err) {
            console.error('Failed to refresh logged in user role', err);
        }
    };

    const handleToggleCheckin = async (target: CheckinTaskUser, checked: boolean) => {
        if (!user?.company_id || checkinSavingId) return;

        const previousUsers = users;
        setCheckinSavingId(target.id);
        setUsers((prev) =>
            prev.map((item) => (item.id === target.id ? {...item, is_check_in: checked} : item)),
        );

        try {
            const res = await api.post('user/change-bulk-checkin', {
                company_id: Number(user.company_id),
                users: [{id: Number(target.id), is_check_in: checked}],
            });

            if (!res.data?.IsSuccess) {
                setUsers(previousUsers);
                toast.error(res.data?.message || t('Failed to update check-in'));
                return;
            }

            toast.success(res.data.message);
        } catch (error: any) {
            setUsers(previousUsers);
            console.error('Failed to update check-in', error);
        } finally {
            setCheckinSavingId(null);
        }
    };

    const handleMakeAdmin = async (target: CheckinTaskUser) => {
        if (!isAdmin || adminSavingId) return;

        setAdminSavingId(target.id);
        let shouldRefresh = false;
        try {
            const payload = {company_id: user.company_id, user_id: target.id};
            const res = await api.post('company/make-admin', payload);

            if (res.data?.requires_otp) {
                setAdminSavingId(null);
                const otp = await askOtp(
                    res.data.message ||
                    `Please verify OTP from ${res.data.company_created_by_name || 'Company Owner'}.`,
                );

                if (otp === null) return;
                if (!otp.trim()) {
                    toast.error('OTP is required');
                    return;
                }

                setAdminSavingId(target.id);
                const verifyRes = await api.post('company/make-admin', {...payload, otp: otp.trim()});

                if (!verifyRes.data.IsSuccess) {
                    toast.error(verifyRes.data.message || 'Invalid OTP');
                    return;
                }

                toast.success(verifyRes.data.message);
                await refreshLoggedInUserRole();
                shouldRefresh = true;
                return;
            }

            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                await refreshLoggedInUserRole();
                shouldRefresh = true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAdminSavingId(null);
            if (shouldRefresh) fetchUsers();
        }
    };

    const handleRemoveAdmin = async () => {
        if (!removeAdminUser) return;

        setAdminSavingId(removeAdminUser.id);
        try {
            const res = await api.post('company/remove-admin', {
                company_id: user.company_id,
                user_id: removeAdminUser.id,
            });
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                setRemoveAdminUser(null);
                await refreshLoggedInUserRole();
                fetchUsers();
            } else {
                toast.error(res.data.message);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Something went wrong!');
        } finally {
            setAdminSavingId(null);
        }
    };

    const handleArchive = async () => {
        if (!userToArchive) return;

        if (userToArchive.supervisor_team_id) {
            setSupervisorReplacementOpen(true);
            return;
        }

        setArchiveLoading(true);
        try {
            const response = await api.post('user/archive-user', {
                user_ids: String(userToArchive.id),
                company_id: user.company_id,
            });
            toast.success(response.data.message);
            setUserToArchive(null);
            fetchUsers();
        } catch (error) {
            console.error('Failed to archive user', error);
        } finally {
            setArchiveLoading(false);
        }
    };

    const handleArchiveWithSupervisor = async () => {
        if (!userToArchive) return;
        if (!newSupervisorId) {
            toast.error('Please select a new supervisor');
            return;
        }

        setArchiveLoading(true);
        try {
            const response = await api.post('user/archive-user', {
                user_ids: userToArchive.id,
                company_id: user.company_id,
                supervisor_id: newSupervisorId,
                supervisor_team_id: userToArchive.supervisor_team_id,
            });
            toast.success(response.data.message);
            setSupervisorReplacementOpen(false);
            setNewSupervisorId('');
            setUserToArchive(null);
            fetchUsers();
        } catch (error) {
            console.error('Failed to archive user with new supervisor', error);
        } finally {
            setArchiveLoading(false);
        }
    };

    const canRemoveAccount = user?.user_role_id === 1;

    const handleToggleGeofence = async (
        target: CheckinTaskUser,
        setting: (typeof GEOFENCE_SETTINGS)[number],
        checked: boolean,
    ) => {
        if (!user?.company_id || geofenceSavingKey) return;

        const clearsDependents = setting.field === 'is_location_restricted' && !checked;
        const previousUsers = users;
        setGeofenceSavingKey(`${target.id}-${setting.id}`);
        setUsers((prev) =>
            prev.map((item) =>
                item.id === target.id
                    ? {
                        ...item,
                        [setting.field]: checked,
                        ...(clearsDependents && {is_start_inside_boundary: false, is_stop_inside_boundary: false}),
                    }
                    : item,
            ),
        );

        try {
            const res = await api.post('user/update-geofence-penalty-settings', {
                user_id: Number(target.id),
                company_id: Number(user.company_id),
                [setting.apiKey]: checked,
                ...(clearsDependents && {start_work_within_geofence: false, stop_work_within_geofence: false}),
            });

            if (!res.data?.IsSuccess) {
                setUsers(previousUsers);
                toast.error(res.data?.message || t('Failed to update setting'));
                return;
            }

            toast.success(res.data.message || t('Setting updated'));
        } catch (error) {
            setUsers(previousUsers);
            console.error('Failed to update geofence setting', error);
        } finally {
            setGeofenceSavingKey(null);
        }
    };

    // Select-all scope is the searched list (all pages). Start/stop-within-geofence only
    // apply to users whose geofence main setting is on.
    const getBulkEligibleUsers = (setting: (typeof GEOFENCE_SETTINGS)[number]) =>
        searchedUsers.filter((item) => !setting.requiresMain || item.is_location_restricted);

    const openBulkGeofence = (setting: (typeof GEOFENCE_SETTINGS)[number], checked: boolean) => {
        const userIds = getBulkEligibleUsers(setting)
            .filter((item) => Boolean(item[setting.field]) !== checked)
            .map((item) => item.id);
        if (!userIds.length) return;
        setBulkGeofence({setting, checked, userIds});
    };

    const handleBulkGeofence = async () => {
        if (!bulkGeofence || !user?.company_id) return;

        const {setting, checked, userIds} = bulkGeofence;
        const idSet = new Set(userIds);
        const clearsDependents = setting.field === 'is_location_restricted' && !checked;
        const previousUsers = users;
        setBulkSaving(true);
        setUsers((prev) =>
            prev.map((item) =>
                idSet.has(item.id)
                    ? {
                        ...item,
                        [setting.field]: checked,
                        ...(clearsDependents && {is_start_inside_boundary: false, is_stop_inside_boundary: false}),
                    }
                    : item,
            ),
        );

        try {
            const res = await api.post('user/update-geofence-penalty-settings', {
                user_ids: userIds,
                company_id: Number(user.company_id),
                [setting.apiKey]: checked,
                ...(clearsDependents && {start_work_within_geofence: false, stop_work_within_geofence: false}),
            });

            if (!res.data?.IsSuccess) {
                setUsers(previousUsers);
                toast.error(res.data?.message || t('Failed to update setting'));
                return;
            }

            toast.success(res.data.message || t('Setting updated'));
            setBulkGeofence(null);
        } catch (error) {
            setUsers(previousUsers);
            console.error('Failed to bulk update geofence setting', error);
        } finally {
            setBulkSaving(false);
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
            meta: {label: 'Permissions'},
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
            meta: {label: 'Multiple checkin'},
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
        columnHelper.accessor((row) => row.is_check_in, {
            id: 'checkIn',
            meta: {label: 'Check-In'},
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Check-In')}
                </Typography>
            ),
            enableSorting: false,
            cell: ({row}: any) => {
                const item = row.original;

                return (
                    <IOSSwitch
                        checked={Boolean(item.is_check_in)}
                        disabled={!isAdmin || checkinSavingId === item.id}
                        onChange={(event) => handleToggleCheckin(item, event.target.checked)}
                    />
                );
            },
        }),
        columnHelper.accessor((row) => row.user_role_id, {
            id: 'admin',
            meta: {label: 'Admin'},
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Admin')}
                </Typography>
            ),
            enableSorting: false,
            cell: ({row}: any) => {
                const item = row.original;
                const isUserAdmin = Number(item.user_role_id) === 1;
                const canChange = isUserAdmin
                    ? !item.is_company_owner && isCompanyOwner
                    : isAdmin;

                const toggle = (
                    <IOSSwitch
                        checked={isUserAdmin}
                        disabled={!canChange || adminSavingId === item.id}
                        onChange={(event) =>
                            event.target.checked ? handleMakeAdmin(item) : setRemoveAdminUser(item)
                        }
                    />
                );

                return item.is_company_owner ? (
                    <Tooltip title={t('Company owner')} arrow>
                        <span>{toggle}</span>
                    </Tooltip>
                ) : toggle;
            },
        }),
        ...(['penalty', 'geofence'] as SettingsSection[]).map((section) =>
            columnHelper.group({
                id: `${section}Group`,
                header: () => (
                    <Typography variant="subtitle2" noWrap>
                        {t(SECTION_TITLES[section])}
                    </Typography>
                ),
                columns: GEOFENCE_SETTINGS.filter((setting) => setting.section === section).map((setting) =>
                    columnHelper.accessor((row) => row[setting.field], {
                        id: setting.id,
                        meta: {label: setting.label},
                        header: () => {
                            const eligible = getBulkEligibleUsers(setting);
                            const allOn = eligible.length > 0 && eligible.every((item) => item[setting.field]);

                            return (
                                <Stack alignItems="center" spacing={0.75}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Typography variant="subtitle2" noWrap>
                                            {t(setting.shortLabel)}
                                        </Typography>
                                        <Tooltip title={t(setting.label)} arrow placement="top">
                                            <Box component="span" sx={{display: 'flex', color: 'text.secondary', cursor: 'help'}}>
                                                <IconHelpCircle size={16}/>
                                            </Box>
                                        </Tooltip>
                                    </Stack>
                                    <Tooltip title={allOn ? t('Deselect All') : t('Select All')} arrow>
                                        <span>
                                            <IOSSwitch
                                                checked={allOn}
                                                disabled={!isAdmin || bulkSaving || eligible.length === 0}
                                                onChange={(event) => openBulkGeofence(setting, event.target.checked)}
                                            />
                                        </span>
                                    </Tooltip>
                                </Stack>
                            );
                        },
                        enableSorting: false,
                        cell: ({row}: any) => {
                            const item = row.original;
                            const locked = setting.requiresMain && !item.is_location_restricted;

                            return (
                                <IOSSwitch
                                    checked={Boolean(item[setting.field])}
                                    disabled={!isAdmin || locked || geofenceSavingKey === `${item.id}-${setting.id}`}
                                    onChange={(event) => handleToggleGeofence(item, setting, event.target.checked)}
                                />
                            );
                        },
                    }),
                ),
            }),
        ),
        columnHelper.display({
            id: 'removeAccount',
            meta: {label: 'Remove Account'},
            header: () => (
                <Typography variant="subtitle2" noWrap>
                    {t('Remove Account')}
                </Typography>
            ),
            cell: ({row}: any) => {
                const item = row.original;
                if (!canRemoveAccount || item.is_company_owner) return '-';

                return (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => setUserToArchive(item)}
                    >
                        {t('Remove')}
                    </Button>
                );
            },
        }),
    ], [isAdmin, isCompanyOwner, canRemoveAccount, checkinSavingId, adminSavingId, geofenceSavingKey, bulkSaving, savingUserId, searchedUsers, t, users]);

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
        state: {columnVisibility},
        onColumnVisibilityChange: setColumnVisibility,
    });

    useEffect(() => {
        if (!user?.id) return;
        try {
            const raw = readListingTableState(columnVisibilityKey);
            setColumnVisibility(raw ? JSON.parse(raw) : {});
        } catch {
            setColumnVisibility({});
        }
    }, [columnVisibilityKey, user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        writeListingTableState(columnVisibilityKey, JSON.stringify(columnVisibility));
    }, [columnVisibility, columnVisibilityKey, user?.id]);

    // The second (grouped) header row must stick right below the first one.
    useLayoutEffect(() => {
        const row = firstHeaderRowRef.current;
        if (!row) return;
        const measure = () => setFirstHeaderRowHeight(row.getBoundingClientRect().height);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        return () => observer.disconnect();
    }, [loading]);

    const visibleColumnIds = table.getVisibleLeafColumns().map((column) => column.id);
    const simpleColumns = visibleColumnIds.map((name) => ({name}));
    const toggleableColumns = table
        .getAllLeafColumns()
        .filter((column) => column.id !== 'name')
        .filter((column) => {
            const label = String((column.columnDef.meta as any)?.label ?? column.id);
            return t(label).toLowerCase().includes(columnSearch.trim().toLowerCase());
        });
    const allColumnsVisible = toggleableColumns.length > 0 && toggleableColumns.every((column) => column.getIsVisible());
    const someColumnsVisible = toggleableColumns.some((column) => column.getIsVisible());

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
                <Box display="flex" alignItems="center" justifyContent="flex-end">
                    <Tooltip title={t('Show / hide columns')} arrow>
                        <IconButton color="primary" onClick={(event) => setColumnsAnchorEl(event.currentTarget)}>
                            <IconEye/>
                        </IconButton>
                    </Tooltip>
                    <Popover
                        open={Boolean(columnsAnchorEl)}
                        anchorEl={columnsAnchorEl}
                        onClose={() => {
                            setColumnsAnchorEl(null);
                            setColumnSearch('');
                        }}
                        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                        transformOrigin={{vertical: 'top', horizontal: 'right'}}
                        PaperProps={{
                            sx: {
                                width: 340,
                                mt: 1,
                                p: 1,
                                borderRadius: 2,
                                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                                border: '1px solid #e5e7eb',
                                maxHeight: 'min(480px, calc(100vh - 140px))',
                                display: 'flex',
                                flexDirection: 'column',
                            },
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder={t('Search columns...')}
                            fullWidth
                            value={columnSearch}
                            onChange={(event) => setColumnSearch(event.target.value)}
                            sx={{mb: 1}}
                        />
                        <Box sx={{overflowY: 'auto', pr: 0.5}}>
                            <FormGroup sx={{gap: 0.25}}>
                                <FormControlLabel
                                    control={
                                        <CustomCheckbox
                                            size="small"
                                            checked={allColumnsVisible}
                                            indeterminate={!allColumnsVisible && someColumnsVisible}
                                            disabled={toggleableColumns.length === 0}
                                            onChange={(event) =>
                                                toggleableColumns.forEach((column) =>
                                                    column.toggleVisibility(event.target.checked),
                                                )
                                            }
                                            sx={{p: 0.5, mr: 1}}
                                        />
                                    }
                                    label={allColumnsVisible ? t('Deselect All') : t('Select All')}
                                    sx={{
                                        m: 0,
                                        px: 0.75,
                                        py: 0.375,
                                        borderBottom: '1px solid #eef2f7',
                                        mb: 0.25,
                                        '& .MuiFormControlLabel-label': {fontSize: '14px', fontWeight: 600},
                                    }}
                                />
                                {toggleableColumns.map((column) => (
                                    <FormControlLabel
                                        key={column.id}
                                        control={
                                            <CustomCheckbox
                                                size="small"
                                                checked={column.getIsVisible()}
                                                onChange={column.getToggleVisibilityHandler()}
                                                sx={{p: 0.5, mr: 1}}
                                            />
                                        }
                                        label={t(String((column.columnDef.meta as any)?.label ?? column.id))}
                                        sx={{
                                            m: 0,
                                            px: 0.75,
                                            py: 0.375,
                                            borderRadius: 1.5,
                                            '&:hover': {backgroundColor: '#f8fafc'},
                                            '& .MuiFormControlLabel-label': {fontSize: '14px', lineHeight: 1.35},
                                        }}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    </Popover>
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
                <Table stickyHeader aria-label="sticky table" sx={{minWidth: 340 + (visibleColumnIds.length - 1) * 150}}>
                    <TableHead>
                        {(() => {
                            const headerGroups = table.getHeaderGroups();
                            const hasGroups = headerGroups.length > 1;

                            return headerGroups.map((headerGroup, rowIndex) => (
                                <TableRow key={headerGroup.id} ref={rowIndex === 0 ? firstHeaderRowRef : undefined}>
                                    {headerGroup.headers.map((header) => {
                                        // Ungrouped columns span both header rows: render them once (in the
                                        // top row, where tanstack gives a placeholder) and skip them below.
                                        const isGroupChild = Boolean(header.column.parent);
                                        if (hasGroups && rowIndex > 0 && !isGroupChild) return null;

                                        const isGroupHeader = header.subHeaders.length > 0 && !header.isPlaceholder;
                                        const spansRows = hasGroups && rowIndex === 0 && !isGroupHeader;

                                        return (
                                            <TableCell
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                rowSpan={spansRows ? 2 : 1}
                                                align={header.column.id === 'name' ? 'left' : 'center'}
                                                sx={{
                                                    paddingTop: '10px',
                                                    paddingBottom: '10px',
                                                    width: isGroupHeader ? undefined : header.column.id === 'name' ? 340 : 150,
                                                    borderRight: header.column.id === 'name' ? '1px solid #e5e7eb' : 'none',
                                                    ...(isGroupHeader && {borderBottom: '1px solid #e5e7eb'}),
                                                    ...(hasGroups && rowIndex > 0 && {top: firstHeaderRowHeight}),
                                                }}
                                            >
                                                <Box
                                                    p={0}
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: header.column.id === 'name' ? 'flex-start' : 'center',
                                                    }}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </Box>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ));
                        })()}
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <SkeletonLoader columns={simpleColumns} rowCount={3}/>
                        ) : searchedUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={simpleColumns.length}>
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

            <Dialog open={Boolean(bulkGeofence)} onClose={() => !bulkSaving && setBulkGeofence(null)}>
                <DialogTitle>
                    {t('Confirmation')}
                    <IconButton
                        aria-label="close"
                        onClick={() => setBulkGeofence(null)}
                        disabled={bulkSaving}
                        sx={{position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500]}}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Turn <strong>{bulkGeofence?.checked ? 'ON' : 'OFF'}</strong> &quot;
                        {bulkGeofence ? t(bulkGeofence.setting.label) : ''}&quot; for{' '}
                        <strong>{bulkGeofence?.userIds.length}</strong> user(s)?
                    </Typography>
                    {bulkGeofence?.setting.field === 'is_location_restricted' && !bulkGeofence.checked && (
                        <Typography color="textSecondary" mt={1}>
                            Start work and Stop work within geofence will also be turned off for these users.
                        </Typography>
                    )}
                    {bulkGeofence?.setting.requiresMain && bulkGeofence.checked && (
                        <Typography color="textSecondary" mt={1}>
                            Only users with the Geofence main setting on are included.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkGeofence(null)} variant="outlined" color="error" disabled={bulkSaving}>
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleBulkGeofence} variant="contained" color="primary" disabled={bulkSaving}>
                        {bulkSaving ? t('Updating...') : t('Yes, Confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog fullWidth open={otpModalOpen} onClose={() => closeOtpModal(null)}>
                <DialogTitle>
                    <Typography color="GrayText" fontWeight={700}>
                        {t('Verify OTP')}
                    </Typography>
                    <IconButton
                        onClick={() => closeOtpModal(null)}
                        sx={{position: 'absolute', right: 12, top: 8, backgroundColor: 'transparent'}}
                    >
                        <IconX size={40}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary" mb={2}>
                        {t(otpMessage)}
                    </Typography>
                    <CustomTextField
                        fullWidth
                        value={otpValue}
                        onChange={(e: any) => setOtpValue(e.target.value)}
                        placeholder={t('Enter OTP')}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => closeOtpModal(null)}>{t('Cancel')}</Button>
                    <Button onClick={() => closeOtpModal(otpValue)} variant="contained" color="primary">
                        {t('Submit')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(removeAdminUser)} onClose={() => setRemoveAdminUser(null)}>
                <DialogTitle>
                    Confirmation
                    <IconButton
                        aria-label="close"
                        onClick={() => setRemoveAdminUser(null)}
                        sx={{position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500]}}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove {removeAdminUser?.name} as an admin?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRemoveAdminUser(null)} variant="outlined" color="error">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRemoveAdmin}
                        color="primary"
                        variant="contained"
                        disabled={adminSavingId === removeAdminUser?.id}
                    >
                        {adminSavingId === removeAdminUser?.id ? t('Updating...') : t('Yes, Confirm')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(userToArchive) && !supervisorReplacementOpen} onClose={() => setUserToArchive(null)}>
                <DialogTitle>
                    Confirm Deletion
                    <IconButton
                        aria-label="close"
                        onClick={() => setUserToArchive(null)}
                        sx={{position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500]}}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary" fontWeight={500}>
                        This will permanently erase all actions, history, and activity associated with{' '}
                        <strong>{userToArchive?.name}</strong>. Once deleted, the data cannot be recovered.
                        <br/>
                        <br/>
                        To remove the user without losing their information, please select the Remove option
                        instead.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button disabled={archiveLoading} onClick={handleArchive} variant="outlined" color="primary">
                        Archive
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={supervisorReplacementOpen}
                onClose={() => {
                    setSupervisorReplacementOpen(false);
                    setNewSupervisorId('');
                    setUserToArchive(null);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{m: 0, position: 'relative', overflow: 'visible'}}>
                    Assign New Supervisor
                    <IconButton
                        aria-label="close"
                        onClick={() => {
                            setSupervisorReplacementOpen(false);
                            setNewSupervisorId('');
                            setUserToArchive(null);
                        }}
                        sx={{position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500]}}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary" fontWeight={500} mb={2}>
                        The user you are archiving is currently the supervisor of{' '}
                        <strong>{userToArchive?.supervisor_team_name || 'a team'}</strong>. Please assign a new
                        supervisor for this team before archiving.
                    </Typography>
                    <CustomSelect
                        labelId="new-supervisor-label"
                        id="new-supervisor"
                        value={newSupervisorId}
                        onChange={(e: any) => setNewSupervisorId(e.target.value)}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            Select new supervisor
                        </MenuItem>
                        {users
                            .filter((item) => Number(item.id) !== Number(userToArchive?.id))
                            .map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                    {item.name}
                                </MenuItem>
                            ))}
                    </CustomSelect>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setSupervisorReplacementOpen(false);
                            setNewSupervisorId('');
                            setUserToArchive(null);
                        }}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleArchiveWithSupervisor}
                        disabled={archiveLoading}
                        variant="contained"
                        color="primary"
                    >
                        Confirm & Archive
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskUserCheckinSettings;
