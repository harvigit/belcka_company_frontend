'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    IconPlus,
    IconArchive,
    IconSettings,
    IconTrash,
    IconUserCog,
    IconNetwork,
    IconPencil,
    IconX,
} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
import {debounce} from 'lodash';
import api from '@/utils/axios';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import {useTranslation} from 'react-i18next';

interface UserSettingDrawerProps {
    open: boolean;
    onClose: () => void;
}

interface CompanyUser {
    id: number;
    name: string;
}

interface PermissionUser {
    id: number;
    user_id: number;
    name: string;
    user_image?: string | null;
    permission: 'view' | 'view_edit';
}

interface AllowedIpRow {
    id: number;
    user_id: number;
    company_id: number;
    ip_address: string;
    user_name?: string;
    user_image?: string | null;
    user_thumb_image?: string | null;
    shared_users?: { user_id: number; user_name: string }[];
    shared_user_count?: number;
}

type UserPermission = 'view' | 'view_edit';

const IPV4_REGEX =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

const isValidIpInput = (value: string) => {
    const ip = value.trim();
    return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
};

const UserSettingDrawer: React.FC<UserSettingDrawerProps> = ({
                                                                 open,
                                                                 onClose
}) => {
    const {t} = useTranslation();
    const {data: session} = useSession();
    const authUser = session?.user as User & { company_id?: string | null };
    const companyId = authUser?.company_id;

    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [permissionUsers, setPermissionUsers] = useState<PermissionUser[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [permission, setPermission] = useState<UserPermission>('view');
    const [loading, setLoading] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [archiveInactiveEnabled, setArchiveInactiveEnabled] = useState(false);
    const [archiveAfterDays, setArchiveAfterDays] = useState(60);
    const [deleteArchivedEnabled, setDeleteArchivedEnabled] = useState(false);
    const [deleteAfterDays, setDeleteAfterDays] = useState(60);
    const [activeTab, setActiveTab] = useState<'permissions' | 'archive' | 'ip'>('permissions');
    const [ipFilterUser, setIpFilterUser] = useState<CompanyUser | null>(null);
    const [dialogIpUser, setDialogIpUser] = useState<CompanyUser | null>(null);
    const [allowedIps, setAllowedIps] = useState<AllowedIpRow[]>([]);
    const [ipLoading, setIpLoading] = useState(false);
    const [ipDialogOpen, setIpDialogOpen] = useState(false);
    const [editingIp, setEditingIp] = useState<AllowedIpRow | null>(null);
    const [ipAddressInput, setIpAddressInput] = useState('');
    const [ipSearchInput, setIpSearchInput] = useState('');
    const [ipSearch, setIpSearch] = useState('');
    const [ipPage, setIpPage] = useState(0);
    const [ipRowsPerPage, setIpRowsPerPage] = useState(10);
    const [ipTotalItems, setIpTotalItems] = useState(0);

    const debouncedSetIpSearch = useMemo(
        () =>
            debounce((value: string) => {
                setIpPage(0);
                setIpSearch(value.trim());
            }, 400),
        [],
    );

    useEffect(() => {
        return () => {
            debouncedSetIpSearch.cancel();
        };
    }, [debouncedSetIpSearch]);

    const handleIpSearchChange = useCallback(
        (value: string) => {
            setIpSearchInput(value);
            debouncedSetIpSearch(value);
        },
        [debouncedSetIpSearch],
    );

    const fetchCompanyUsers = async () => {
        if (!companyId) return;

        try {
            const response = await api.get(
                `get-company-resources?company_id=${companyId}&flag=usersList`,
            );
            setCompanyUsers(response.data?.info || []);
        } catch (error) {
            console.error('Failed to fetch company users', error);
            toast.error(t('Failed to load company users'));
        }
    };

    const fetchPermissionUsers = async () => {
        if (!companyId) return;

        setLoading(true);
        try {
            const response = await api.get(
                `setting/permission-setting-users?company_id=${companyId}&permission_for=users`,
            );
            if (response.data?.IsSuccess) {
                setPermissionUsers(response.data.info || []);
                setEnabled(!!response.data.enabled);
                const archiveSettings = response.data.archive_settings;
                setArchiveInactiveEnabled(!!archiveSettings?.auto_archive_inactive_users);
                setArchiveAfterDays(Number(archiveSettings?.inactive_archive_after_days) || 60);
                setDeleteArchivedEnabled(!!archiveSettings?.auto_delete_archived_users);
                setDeleteAfterDays(Number(archiveSettings?.archive_delete_after_days) || 60);
            } else {
                toast.error(response.data?.message || t('Failed to load permissions'));
            }
        } catch (error) {
            console.error('Failed to fetch permission users', error);
            toast.error(t('Failed to load permissions'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && companyId) {
            fetchCompanyUsers();
            fetchPermissionUsers();
        }
    }, [open, companyId]);

    const fetchAllowedIps = async () => {
        if (!companyId) {
            setAllowedIps([]);
            setIpTotalItems(0);
            return;
        }

        setIpLoading(true);
        try {
            const response = await api.get('user/get-allowed-ips', {
                params: {
                    company_id: Number(companyId),
                    page: ipPage + 1,
                    limit: ipRowsPerPage,
                    ...(ipFilterUser ? {user_id: Number(ipFilterUser.id)} : {}),
                    ...(ipSearch.trim() ? {search: ipSearch.trim()} : {}),
                },
            });
            if (response.data?.IsSuccess) {
                setAllowedIps(response.data.info || []);
                setIpTotalItems(Number(response.data.data?.totalItems) || 0);
            } else {
                setAllowedIps([]);
                setIpTotalItems(0);
                toast.error(response.data?.message || t('Failed to load allowed IP addresses'));
            }
        } catch (error) {
            console.error('Failed to fetch allowed IPs', error);
            setAllowedIps([]);
            setIpTotalItems(0);
            toast.error(t('Failed to load allowed IP addresses'));
        } finally {
            setIpLoading(false);
        }
    };

    useEffect(() => {
        if (open && activeTab === 'ip') {
            fetchAllowedIps();
        }
        if (activeTab !== 'ip') {
            setIpDialogOpen(false);
            setEditingIp(null);
            setIpAddressInput('');
            setDialogIpUser(null);
            debouncedSetIpSearch.cancel();
            setIpSearchInput('');
            setIpSearch('');
            setIpPage(0);
        }
    }, [open, activeTab, ipPage, ipRowsPerPage, ipFilterUser, ipSearch]);

    const resolveUserName = (row: AllowedIpRow) => {
        if (row.user_name) return row.user_name;
        return companyUsers.find((u) => Number(u.id) === Number(row.user_id))?.name || `User #${row.user_id}`;
    };

    const openAddDialog = () => {
        setSelectedUserId('');
        setPermission('view');
        setDialogOpen(true);
    };

    const openAddIpDialog = () => {
        setEditingIp(null);
        setIpAddressInput('');
        setDialogIpUser(ipFilterUser);
        setIpDialogOpen(true);
    };

    const openEditIpDialog = (row: AllowedIpRow) => {
        setEditingIp(row);
        setIpAddressInput(row.ip_address);
        setDialogIpUser(
            companyUsers.find((u) => Number(u.id) === Number(row.user_id)) || {
                id: row.user_id,
                name: resolveUserName(row),
            },
        );
        setIpDialogOpen(true);
    };

    const saveAllowedIp = async () => {
        if (!companyId || !dialogIpUser) {
            toast.error(t('Please select a user'));
            return;
        }
        const ipAddress = ipAddressInput.trim();
        if (!isValidIpInput(ipAddress)) {
            toast.error(t('Invalid IP address'));
            return;
        }

        setIpLoading(true);
        try {
            const response = editingIp
                ? await api.post('user/update-allowed-ip', {
                    id: editingIp.id,
                    user_id: Number(dialogIpUser.id),
                    company_id: Number(companyId),
                    ip_address: ipAddress,
                })
                : await api.post('user/add-allowed-ip', {
                    user_id: Number(dialogIpUser.id),
                    company_id: Number(companyId),
                    ip_address: ipAddress,
                });

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                setIpDialogOpen(false);
                setEditingIp(null);
                setIpAddressInput('');
                setDialogIpUser(null);
                await fetchAllowedIps();
            } else {
                toast.error(response.data?.message || t('Failed to save IP address'));
            }
        } catch (error: any) {
            console.error('Failed to save allowed IP', error);
            toast.error(error?.response?.data?.message || t('Failed to save IP address'));
        } finally {
            setIpLoading(false);
        }
    };

    const deleteAllowedIp = async (row: AllowedIpRow) => {
        if (!companyId) return;
        setIpLoading(true);
        try {
            const response = await api.post('user/delete-allowed-ip', {
                id: row.id,
                user_id: Number(row.user_id),
                company_id: Number(companyId),
            });
            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                await fetchAllowedIps();
            } else {
                toast.error(response.data?.message || t('Failed to delete IP address'));
            }
        } catch (error: any) {
            console.error('Failed to delete allowed IP', error);
            toast.error(error?.response?.data?.message || t('Failed to delete IP address'));
        } finally {
            setIpLoading(false);
        }
    };

    const togglePermissions = async () => {
        const nextEnabled = !enabled;
        setLoading(true);
        try {
            const response = await api.post('setting/toggle-user-permissions', {
                enabled: nextEnabled,
            });
            if (response.data?.IsSuccess) {
                setEnabled(!!response.data.enabled);
                toast.success(response.data.message);
            } else {
                toast.error(response.data?.message || t('Failed to update setting'));
            }
        } catch (error) {
            console.error('Failed to toggle user permissions', error);
            toast.error(t('Failed to update user permission setting'));
        } finally {
            setLoading(false);
        }
    };

    const saveArchiveSettings = async () => {
        if ((archiveInactiveEnabled && archiveAfterDays < 1) ||
            (deleteArchivedEnabled && deleteAfterDays < 1)) {
            toast.error(t('Archive periods must be at least one day'));
            return;
        }
        setLoading(true);
        try {
            const response = await api.post('setting/user-archive-settings', {
                auto_archive_inactive_users: archiveInactiveEnabled,
                inactive_archive_after_days: archiveAfterDays,
                auto_delete_archived_users: deleteArchivedEnabled,
                archive_delete_after_days: deleteAfterDays,
            });
            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
            } else {
                toast.error(response.data?.message || t('Failed to save archive settings'));
            }
        } catch (error) {
            console.error('Failed to save archive settings', error);
            toast.error(t('Failed to save archive settings'));
        } finally {
            setLoading(false);
        }
    };

    const savePermission = async () => {
        if (!selectedUserId || !companyId) return;

        setLoading(true);
        try {
            const response = await api.post('setting/user-permission-setting', {
                user_id: Number(selectedUserId),
                company_id: Number(companyId),
                user_permission: permission,
                permission_for: 'users',
            });

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                setDialogOpen(false);
                await fetchPermissionUsers();
            } else {
                toast.error(response.data?.message || t('Failed to save permission'));
            }
        } catch (error) {
            console.error('Failed to save user permission', error);
            toast.error(t('Failed to save permission'));
        } finally {
            setLoading(false);
        }
    };

    const updatePermission = async (
        userId: number,
        newPermission: UserPermission,
    ) => {
        if (!companyId) return;

        const previousUsers = permissionUsers;
        setPermissionUsers((users) =>
            users.map((item) =>
                item.user_id === userId
                    ? {...item, permission: newPermission}
                    : item,
            ),
        );

        try {
            const response = await api.post('setting/user-permission-setting', {
                user_id: userId,
                company_id: Number(companyId),
                user_permission: newPermission,
                permission_for: 'users',
            });

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
            } else {
                setPermissionUsers(previousUsers);
                toast.error(response.data?.message || t('Failed to update permission'));
            }
        } catch (error) {
            setPermissionUsers(previousUsers);
            console.error('Failed to update user permission', error);
            toast.error(t('Failed to update permission'));
        }
    };

    const deletePermission = async (permissionId: number) => {
        setLoading(true);
        try {
            const response = await api.post('setting/delete-permission-user', {
                id: permissionId,
                permission_for: 'users',
            });

            if (response.data?.IsSuccess) {
                toast.success(response.data.message);
                await fetchPermissionUsers();
            } else {
                toast.error(response.data?.message || t('Failed to remove permission'));
            }
        } catch (error) {
            console.error('Failed to delete user permission', error);
            toast.error(t('Failed to remove permission'));
        } finally {
            setLoading(false);
        }
    };

    const assignedUserIds = new Set(
        permissionUsers.map((item) => Number(item.user_id)),
    );
    const availableUsers = companyUsers.filter(
        (item) => !assignedUserIds.has(Number(item.id)),
    );

    return (
        <>
            <Drawer
                anchor="bottom"
                open={open}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        height: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                }}
            >
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        borderBottom: '1px solid #e0e0e0',
                        p: 2,
                        gap: 1,
                        color: '#7D92A9',
                        bgcolor: '#fff',
                    }}
                >
                    <IconSettings size={24}/>
                    <Typography>{t('Settings')}</Typography>
                </Box>

                <Box display="flex" flex="1" sx={{overflow: 'hidden'}}>
                    <Box
                        sx={{
                            width: 240,
                            borderRight: '1px solid #e0e0e0',
                            p: 1,
                            bgcolor: '#fff',
                        }}
                    >
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: activeTab === 'permissions' ? '#eaf5ff' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontSize: 14,
                                color: activeTab === 'permissions' ? '#203040' : '#7D92A9',
                                cursor: 'pointer',
                                '&:hover': {bgcolor: '#f6f7f7'},
                            }}
                            onClick={() => setActiveTab('permissions')}
                        >
                            <IconUserCog size={18}/>
                            {t('User Permissions')}
                        </Box>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: activeTab === 'archive' ? '#eaf5ff' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontSize: 14,
                                color: activeTab === 'archive' ? '#203040' : '#7D92A9',
                                cursor: 'pointer',
                                '&:hover': {bgcolor: '#f6f7f7'},
                            }}
                            onClick={() => setActiveTab('archive')}
                        >
                            <IconArchive size={18}/>
                            {t('Archive Settings')}
                        </Box>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                bgcolor: activeTab === 'ip' ? '#eaf5ff' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontSize: 14,
                                color: activeTab === 'ip' ? '#203040' : '#7D92A9',
                                cursor: 'pointer',
                                '&:hover': {bgcolor: '#f6f7f7'},
                            }}
                            onClick={() => setActiveTab('ip')}
                        >
                            <IconNetwork size={18}/>
                            {t('IP Address')}
                        </Box>
                    </Box>

                    <Box sx={{flex: 1, overflow: 'auto'}}>
                        <Box sx={{p: 3}} mx="auto" width={activeTab === 'ip' ? '92%' : '60%'}>
                            {activeTab === 'permissions' && (
                                <>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                        <Box>
                                            <Typography fontWeight={600}>{t('Enable user management')}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('Assigned users can access user details only while this is enabled.')}
                                            </Typography>
                                        </Box>
                                        <IOSSwitch
                                            checked={enabled}
                                            disabled={loading}
                                            onChange={togglePermissions}
                                        />
                                    </Box>
                                    <Divider sx={{borderWidth: 1}}/>

                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        mt={3}
                                    >
                                        <Typography variant="h1" fontSize="20px !important">
                                            {t('Access List')}
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            startIcon={<IconPlus size={16}/>}
                                            sx={{borderRadius: 30}}
                                            onClick={openAddDialog}
                                            disabled={!enabled || loading || availableUsers.length === 0}
                                        >
                                            {t('Add')}
                                        </Button>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" mt={1} mb={3}>
                                        {t('Choose who can access user details and whether they have view-only or view and edit access.')}
                                    </Typography>

                                    <List sx={{mb: 4}}>
                                        {permissionUsers.map((item) => (
                                            <Box key={item.id}>
                                                <ListItem sx={{py: 2, pr: 22}}>
                                                    <ListItemAvatar>
                                                        <Avatar alt={item.name} src={item.user_image || undefined}>
                                                            {item.name?.charAt(0)}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText primary={item.name}/>
                                                    <ListItemSecondaryAction>
                                                        <Select
                                                            size="small"
                                                            value={item.permission}
                                                            disabled={!enabled || loading}
                                                            onChange={(event) =>
                                                                updatePermission(
                                                                    item.user_id,
                                                                    event.target.value as UserPermission,
                                                                )
                                                            }
                                                        >
                                                            <MenuItem value="view">{t('View only')}</MenuItem>
                                                            <MenuItem value="view_edit">{t('View & Edit')}</MenuItem>
                                                        </Select>
                                                        <IconButton
                                                            edge="end"
                                                            disabled={!enabled || loading}
                                                            aria-label={t('Remove user permission', {name: item.name})}
                                                            onClick={() => deletePermission(item.id)}
                                                        >
                                                            <IconTrash/>
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                                <Divider sx={{borderWidth: 1}}/>
                                            </Box>
                                        ))}
                                    </List>
                                </>
                            )}
                            
                            {activeTab === 'archive' && (
                                <>
                                    <Typography variant="h1" fontSize="20px !important" mb={1}>
                                        {t('Archive Settings')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mb={3}>
                                        {t('Automate archive cleanup while permanently retaining payroll, payslip, salary, timesheet and worklog data.')}
                                    </Typography>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Box>
                                            <Typography fontWeight={600}>{t('Archive inactive users')}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('Move eligible inactive users to the archive automatically.')}
                                            </Typography>
                                        </Box>
                                        <IOSSwitch
                                            checked={archiveInactiveEnabled} 
                                            disabled={loading}
                                            onChange={() => setArchiveInactiveEnabled((value) => !value)}
                                        />
                                    </Box>
                                    
                                    <TextField
                                        type="number"
                                        label={t('Archive after days of inactivity')}
                                        fullWidth disabled={!archiveInactiveEnabled || loading}
                                        value={archiveAfterDays} inputProps={{min: 1}}
                                        onChange={(event) => setArchiveAfterDays(Number(event.target.value))}
                                        sx={{mb: 4}}
                                    />
                                    
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Box>
                                            <Typography fontWeight={600}>{t('Delete users from archive')}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {t('Remove archived company access after the selected period.')}
                                            </Typography>
                                        </Box>
                                        <IOSSwitch 
                                            checked={deleteArchivedEnabled} 
                                            disabled={loading}
                                            onChange={() => setDeleteArchivedEnabled((value) => !value)}
                                        />
                                    </Box>
                                    <TextField 
                                        type="number" 
                                        label={t('Delete from archive after days')}
                                        fullWidth disabled={!deleteArchivedEnabled || loading}
                                        value={deleteAfterDays} inputProps={{min: 1}}
                                        onChange={(event) => setDeleteAfterDays(Number(event.target.value))}
                                        sx={{mb: 3}}
                                    />
                                    <Button variant="contained" disabled={loading} onClick={saveArchiveSettings}>
                                        {loading ? t('Saving...') : t('Save Archive Settings')}
                                    </Button>
                                </>
                            )}

                            {activeTab === 'ip' && (
                                <>
                                    <Typography variant="h1" fontSize="20px !important" mb={1}>
                                        {t('IP Address')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mb={3}>
                                        {t('Configure which IP addresses are allowed when a user starts work from the web application. Mobile app access is not restricted by these IPs.')}
                                    </Typography>

                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        gap={2}
                                        mb={2}
                                        flexWrap="wrap"
                                    >
                                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} flex={1} minWidth={0}>
                                            <Autocomplete
                                                options={companyUsers}
                                                value={ipFilterUser}
                                                onChange={(_, value) => {
                                                    setIpFilterUser(value);
                                                    setIpPage(0);
                                                }}
                                                getOptionLabel={(option) => option.name || ''}
                                                getOptionKey={(option) => String(option.id)}
                                                isOptionEqualToValue={(option, value) =>
                                                    Number(option.id) === Number(value.id)
                                                }
                                                filterOptions={(list, state) => {
                                                    const query = state.inputValue.trim().toLowerCase();
                                                    if (!query) return list;
                                                    return list.filter((option) =>
                                                        option.name.toLowerCase().includes(query),
                                                    );
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label={t('Search user')}
                                                        placeholder={t('Type to search users')}
                                                    />
                                                )}
                                                sx={{minWidth: 220, flex: 1}}
                                            />
                                            <TextField
                                                label={t('Search IP or user')}
                                                placeholder={t('Search IP or user')}
                                                value={ipSearchInput}
                                                onChange={(event) => handleIpSearchChange(event.target.value)}
                                                sx={{minWidth: 200, flex: 1}}
                                            />
                                        </Stack>
                                        <Button
                                            variant="contained"
                                            startIcon={<IconPlus size={16}/>}
                                            sx={{borderRadius: 30, whiteSpace: 'nowrap'}}
                                            onClick={openAddIpDialog}
                                            disabled={ipLoading}
                                        >
                                            {t('Add IP Address')}
                                        </Button>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        {t('If no IP addresses are configured for a user, web Start Work is allowed from any IP.')}
                                    </Typography>

                                    <TableContainer sx={{border: '1px solid #e6ebf1', borderRadius: 2, mb: 1}}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{bgcolor: '#f6f8fb'}}>
                                                    <TableCell sx={{fontWeight: 600}}>{t('IP Address')}</TableCell>
                                                    <TableCell sx={{fontWeight: 600}}>{t('User')}</TableCell>
                                                    <TableCell sx={{fontWeight: 600}}>{t('Also assigned to')}</TableCell>
                                                    <TableCell sx={{fontWeight: 600}} align="right">{t('Actions')}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {ipLoading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4}>
                                                            <Typography variant="body2" color="text.secondary" py={2}>
                                                                {t('Loading...')}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : allowedIps.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4}>
                                                            <Typography variant="body2" color="text.secondary" py={2}>
                                                                {ipFilterUser || ipSearchInput.trim()
                                                                    ? t('No allowed IP addresses found.')
                                                                    : t('No allowed IP addresses configured yet.')}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    allowedIps.map((row) => {
                                                        const name = resolveUserName(row);
                                                        const sharedUsers = row.shared_users || [];
                                                        return (
                                                            <TableRow key={row.id} hover>
                                                                <TableCell>
                                                                    <Typography fontWeight={600}>
                                                                        {row.ip_address}
                                                                    </Typography>
                                                                    {sharedUsers.length > 0 && (
                                                                        <Typography variant="caption" color="primary.main">
                                                                            {t('{{count}} users share this IP', {
                                                                                count: sharedUsers.length + 1,
                                                                            })}
                                                                        </Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                                        <Avatar
                                                                            alt={name}
                                                                            src={
                                                                                row.user_thumb_image ||
                                                                                row.user_image ||
                                                                                undefined
                                                                            }
                                                                            sx={{width: 32, height: 32}}
                                                                        >
                                                                            {name.charAt(0)}
                                                                        </Avatar>
                                                                        <Typography>{name}</Typography>
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {sharedUsers.length === 0 ? (
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            —
                                                                        </Typography>
                                                                    ) : (
                                                                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                                            {sharedUsers.map((shared) => (
                                                                                <Chip
                                                                                    key={`${row.id}-${shared.user_id}`}
                                                                                    size="small"
                                                                                    label={shared.user_name || `User #${shared.user_id}`}
                                                                                    sx={{borderRadius: '4px'}}
                                                                                />
                                                                            ))}
                                                                        </Stack>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <IconButton
                                                                        disabled={ipLoading}
                                                                        aria-label={t('Edit IP address')}
                                                                        onClick={() => openEditIpDialog(row)}
                                                                    >
                                                                        <IconPencil size={18}/>
                                                                    </IconButton>
                                                                    <IconButton
                                                                        disabled={ipLoading}
                                                                        aria-label={t('Delete IP address')}
                                                                        onClick={() => deleteAllowedIp(row)}
                                                                    >
                                                                        <IconTrash size={18}/>
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    <TablePagination
                                        component="div"
                                        count={ipTotalItems}
                                        page={ipPage}
                                        onPageChange={(_, nextPage) => setIpPage(nextPage)}
                                        rowsPerPage={ipRowsPerPage}
                                        onRowsPerPageChange={(event) => {
                                            setIpRowsPerPage(Number(event.target.value));
                                            setIpPage(0);
                                        }}
                                        rowsPerPageOptions={[10, 25, 50]}
                                        labelRowsPerPage={t('Rows per page')}
                                    />
                                </>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Drawer>

            <Dialog
                open={ipDialogOpen}
                onClose={() => !ipLoading && setIpDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{display: 'flex', justifyContent: 'space-between'}}>
                    <Typography>
                        {editingIp ? t('Edit IP Address') : t('Add IP Address')}
                    </Typography>
                    <IconButton
                        aria-label={t('Close')}
                        disabled={ipLoading}
                        onClick={() => setIpDialogOpen(false)}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Autocomplete
                        options={companyUsers}
                        value={dialogIpUser}
                        onChange={(_, value) => setDialogIpUser(value)}
                        getOptionLabel={(option) => option.name || ''}
                        getOptionKey={(option) => String(option.id)}
                        isOptionEqualToValue={(option, value) =>
                            Number(option.id) === Number(value.id)
                        }
                        disabled={ipLoading || !!editingIp}
                        filterOptions={(list, state) => {
                            const query = state.inputValue.trim().toLowerCase();
                            if (!query) return list;
                            return list.filter((option) =>
                                option.name.toLowerCase().includes(query),
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                margin="normal"
                                label={t('Select User')}
                                placeholder={t('Type to search users')}
                            />
                        )}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label={t('IP Address')}
                        placeholder="86.17.116.132"
                        value={ipAddressInput}
                        disabled={ipLoading}
                        onChange={(event) => setIpAddressInput(event.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button disabled={ipLoading} onClick={() => setIpDialogOpen(false)}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        disabled={ipLoading || !ipAddressInput.trim() || !dialogIpUser}
                        onClick={saveAllowedIp}
                    >
                        {ipLoading ? t('Saving...') : t('Save')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={dialogOpen}
                onClose={() => !loading && setDialogOpen(false)}
                className="permission_dialog"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{display: 'flex', justifyContent: 'space-between'}}>
                    <Typography>{t('Select User and Permission')}</Typography>
                    <IconButton
                        aria-label={t('Close')}
                        disabled={loading}
                        onClick={() => setDialogOpen(false)}
                    >
                        <IconX/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('Select User')}</InputLabel>
                        <Select
                            value={selectedUserId}
                            label={t('Select User')}
                            onChange={(event) => setSelectedUserId(event.target.value)}
                        >
                            {availableUsers.map((item) => (
                                <MenuItem key={item.id} value={String(item.id)}>
                                    {item.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('Permission')}</InputLabel>
                        <Select
                            value={permission}
                            label={t('Permission')}
                            onChange={(event) =>
                                setPermission(event.target.value as UserPermission)
                            }
                        >
                            <MenuItem value="view">{t('View only')}</MenuItem>
                            <MenuItem value="view_edit">{t('View & Edit')}</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button disabled={loading} onClick={() => setDialogOpen(false)}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        disabled={loading || !selectedUserId}
                        onClick={savePermission}
                    >
                        {loading ? t('Saving...') : t('Save')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default UserSettingDrawer;
