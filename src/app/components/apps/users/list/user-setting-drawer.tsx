'use client';

import React, {useEffect, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
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
    TextField,
    Typography,
} from '@mui/material';
import {
    IconPlus,
    IconArchive,
    IconSettings,
    IconTrash,
    IconUserCog,
    IconX,
} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
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

type UserPermission = 'view' | 'view_edit';

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
    const [activeTab, setActiveTab] = useState<'permissions' | 'archive'>('permissions');

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

    const openAddDialog = () => {
        setSelectedUserId('');
        setPermission('view');
        setDialogOpen(true);
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
                    </Box>

                    <Box sx={{flex: 1, overflow: 'auto'}}>
                        <Box sx={{p: 3}} mx="auto" width="60%">
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
                        </Box>
                    </Box>
                </Box>
            </Drawer>

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
