'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Skeleton,
    Stack,
    Typography,
    TextField,
    Tooltip,
    Paper,
} from '@mui/material';

import {
    IconAdjustments,
    IconAlertTriangle,
    IconBeach,
    IconBriefcase,
    IconClockEdit,
    IconClockPlus,
    IconCoin,
    IconCreditCard,
    IconEdit,
    IconEye,
    IconGavel,
    IconHammer,
    IconInfoCircle,
    IconLink,
    IconReceipt,
    IconSearch,
    IconShieldCheck,
    IconUserEdit,
    IconUsersGroup,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import { useSession } from 'next-auth/react';
import { User } from "next-auth";
import PermissionGuard from '@/app/auth/PermissionGuard';
import { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Every request type an admin can give view / approve permission for.
const REQUEST_TYPES = [
    { name: 'Add Timesheet', slug: 'timesheet_request', icon: IconClockPlus },
    { name: 'Edit Timesheet', slug: 'timesheet_approve', icon: IconClockEdit },
    { name: 'Leave request', slug: 'leave_request', icon: IconBeach },
    { name: 'Pricework request', slug: 'pricework_request', icon: IconHammer },
    { name: 'Adjustment request', slug: 'adjustment_request', icon: IconAdjustments },
    { name: 'Personal detail request', slug: 'personal_detail_request', icon: IconUserEdit },
    { name: 'Billing Info Request', slug: 'billing_info_request', icon: IconCreditCard },
    { name: 'Rate request', slug: 'rate_request', icon: IconCoin },
    { name: 'Expense request', slug: 'expense_request', icon: IconReceipt },
    { name: 'Penalty request', slug: 'penalty_request', icon: IconAlertTriangle },
    { name: 'Penalty appeal request', slug: 'penalty_appeal_request', icon: IconGavel },
    { name: 'Team cap increase request', slug: 'team_cap_request', icon: IconUsersGroup },
    { name: 'Project limit increase request', slug: 'project_cap_request', icon: IconBriefcase },
];

const LIST_COLUMNS = { xs: '1fr', md: 'minmax(240px, 1fr) minmax(220px, 1.3fr) minmax(200px, 1fr) 48px' };

export interface RequestAction {
    id: number;
    request_name: string;
    slug: string;
    /** Users who can approve / reject (they can view too) */
    selected_users: string;
    /** Users who can only view */
    view_users: string;
    /** Set when the type still uses another type's users (no setting of its own yet) */
    inherited_from: string | null;
    created_at: string;
    updated_at: string;
    company_id: number | null;
}

interface RequestRow {
    request_name: string;
    slug: string;
    saved: RequestAction | null;
}

export interface UserData {
    id: number;
    name: string;
    email: string;
    user_image: string;
    can_approve: boolean;
    can_reject: boolean;
}

const toNumber = (value: unknown): number | null => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const parseSelectedUserIds = (selectedUsers: unknown): number[] => {
    if (Array.isArray(selectedUsers)) {
        return selectedUsers
            .map((value) => toNumber(value))
            .filter((id): id is number => id !== null);
    }

    if (selectedUsers === null || selectedUsers === undefined) return [];

    if (typeof selectedUsers === 'number') {
        return Number.isFinite(selectedUsers) ? [selectedUsers] : [];
    }

    if (typeof selectedUsers !== 'string') return [];

    const trimmed = selectedUsers.trim();
    if (!trimmed) return [];

    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed
                .map((value) => toNumber(value))
                .filter((id): id is number => id !== null);
        }
        const parsedNumber = toNumber(parsed);
        return parsedNumber === null ? [] : [parsedNumber];
    } catch {
        return trimmed
            .split(',')
            .map((id) => toNumber(id.trim()))
            .filter((id): id is number => id !== null);
    }
};

const RequestActionList = () => {
    const [savedData, setSavedData] = useState<RequestAction[]>([]);
    const [fetchLoading, setFetchLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<RequestRow | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    // view_users = everyone who can view (approve users included); selected_users = who can approve / reject
    const [editFormData, setEditFormData] = useState({
        request_name: '',
        slug: '',
        view_users: [] as number[],
        selected_users: [] as number[],
    });
    const [searchFilter, setSearchFilter] = useState('');
    // Users when the dialog opened, to know whether anything changed.
    const [initialFormUsers, setInitialFormUsers] = useState({ view_users: [] as number[], selected_users: [] as number[] });

    const [users, setUsers] = useState<UserData[]>([]);

    const session = useSession();
    const user = session.data?.user as User & { id: number } & { company_id?: string | null } & { user_role_id: number };

    // Fetch saved request actions
    const fetchSavedData = async () => {
        setFetchLoading(true);
        try {
            const res: AxiosResponse<any> = await api.get('request-action/list');
            if (res.data) {
                const data = res.data.info || res.data;
                // Normalize API response variants (`request_slug`, `user_ids`, legacy fields)
                const normalizedData: RequestAction[] = Array.isArray(data)
                    ? data.map((item: any) => {
                        const slug = String(item.slug ?? item.request_slug ?? '').trim();
                        const requestType = REQUEST_TYPES.find((type) => type.slug === slug);
                        const selectedUsers = item.selected_users ?? item.user_ids ?? '';
                        const selectedUsersString = Array.isArray(selectedUsers)
                            ? selectedUsers.join(',')
                            : String(selectedUsers);
                        const viewUsers = item.view_user_ids ?? '';

                        return {
                            ...item,
                            id: toNumber(item.id) ?? 0,
                            company_id: toNumber(item.company_id),
                            slug,
                            request_name: item.request_name ?? requestType?.name ?? slug,
                            selected_users: selectedUsersString,
                            view_users: Array.isArray(viewUsers) ? viewUsers.join(',') : String(viewUsers),
                            inherited_from: item.inherited_from ?? null,
                        };
                    })
                    : [];
                setSavedData(normalizedData);
            }
        } catch (err) {
            console.error('Failed to fetch request actions', err);
            toast.error('Failed to load request actions');
        }
        setFetchLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(`user/list`, {
                params: { company_id: user.company_id },
            });
            if (res.data?.IsSuccess) {
                const rawUsers = res.data.info || [];
                const normalized: UserData[] = rawUsers
                    .map((u: any) => {
                        const userId = toNumber(u.id);
                        if (userId === null) return null;

                        return {
                            ...u,
                            id: userId,
                            name: u.name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
                        };
                    })
                    .filter((u: UserData | null): u is UserData => u !== null);
                setUsers(normalized);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    useEffect(() => {
        fetchSavedData();
        fetchUsers();
    }, [user?.company_id, user?.id]);

    const usersById = useMemo(() => {
        return new Map(users.map((u) => [u.id, u.name]));
    }, [users]);

    const userDetailsById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

    // Get display names for selected users
    const getSelectedUserNames = (selectedIds: number[] | string) => {
        const ids = Array.isArray(selectedIds) ? selectedIds : parseSelectedUserIds(selectedIds);
        return ids
            .map((id) => usersById.get(id))
            .filter(Boolean)
            .join(', ');
    };

    const mergedRows = useMemo((): RequestRow[] => {
        return REQUEST_TYPES.map((type) => ({
            request_name: type.name,
            slug: type.slug,
            saved: savedData.find(
                (d) =>
                    d?.slug?.trim().toLowerCase() === type.slug.trim().toLowerCase() ||
                    d?.request_name?.trim().toLowerCase() === type.name.trim().toLowerCase(),
            ) ?? null,
        }));
    }, [savedData]);

    const filteredRows = useMemo(() => {
        const s = searchTerm.toLowerCase();
        if (!s) return mergedRows;
        return mergedRows.filter(
            (row) =>
                row.request_name.toLowerCase().includes(s) ||
                getSelectedUserNames(row.saved?.selected_users ?? '').toLowerCase().includes(s) ||
                getSelectedUserNames(row.saved?.view_users ?? '').toLowerCase().includes(s)
        );
    }, [mergedRows, searchTerm, usersById]);


    const handleEditClick = (row: RequestRow) => {
        setEditingRow(row);
        setSearchFilter('');
        const approveUserIds = parseSelectedUserIds(row.saved?.selected_users);
        const viewOnlyUserIds = parseSelectedUserIds(row.saved?.view_users);

        const viewUsers = [...new Set([...approveUserIds, ...viewOnlyUserIds])];
        setEditFormData({
            request_name: row.request_name,
            slug: row.slug,
            view_users: viewUsers,
            selected_users: approveUserIds,
        });
        setInitialFormUsers({ view_users: viewUsers, selected_users: approveUserIds });
        setEditDialogOpen(true);
    };

    // Approve / Reject always comes with View; removing View removes Approve / Reject too.
    const toggleView = (userId: number) => {
        setEditFormData((prev) => {
            const canView = prev.view_users.includes(userId);
            return {
                ...prev,
                view_users: canView ? prev.view_users.filter((id) => id !== userId) : [...prev.view_users, userId],
                selected_users: canView ? prev.selected_users.filter((id) => id !== userId) : prev.selected_users,
            };
        });
    };

    const toggleApprove = (userId: number) => {
        setEditFormData((prev) => {
            const canApprove = prev.selected_users.includes(userId);
            return {
                ...prev,
                selected_users: canApprove
                    ? prev.selected_users.filter((id) => id !== userId)
                    : [...prev.selected_users, userId],
                view_users: canApprove || prev.view_users.includes(userId) ? prev.view_users : [...prev.view_users, userId],
            };
        });
    };

    const savedId = editingRow?.saved?.inherited_from ? 0 : editingRow?.saved?.id ?? 0;
    const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((id) => b.includes(id));
    // Saving without a change would only turn an inherited type into its own setting, so it is not allowed.
    const hasChanges =
        !sameIds(editFormData.view_users, initialFormUsers.view_users) ||
        !sameIds(editFormData.selected_users, initialFormUsers.selected_users);
    // A type without its own setting needs at least one user; a saved setting can be cleared.
    const canSave = hasChanges && (editFormData.view_users.length > 0 || savedId > 0);

    // (b) Inheritance notes for the dialog.
    const editingInheritedFrom = editingRow?.saved?.inherited_from
        ? REQUEST_TYPES.find((type) => type.slug === editingRow.saved?.inherited_from)?.name ?? null
        : null;
    const editingFollowers = editingRow
        ? REQUEST_TYPES.filter((type) =>
              savedData.some((d) => d.slug === type.slug && d.inherited_from === editingRow.slug),
          ).map((type) => type.name)
        : [];

    const handleSaveEdit = async () => {
        if (!canSave) {
            toast.error('Please select at least one user');
            return;
        }

        setEditLoading(true);
        try {
            if (editFormData.view_users.length === 0) {
                // No users left: only admins handle this request type.
                await api.delete(`request-action/${savedId}`);
            } else {
                const payload = {
                    request_slug: editFormData.slug,
                    selected_users: editFormData.selected_users.join(','),
                    view_users: editFormData.view_users.join(','),
                };

                if (savedId) {
                    await api.put(`request-action/edit/${savedId}`, payload);
                } else {
                    await api.post('request-action/create', payload);
                }
            }

            toast.success('Request settings updated successfully!');
            setEditDialogOpen(false);
            setSearchFilter('');
            fetchSavedData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Something went wrong. Please try again.');
        }
        setEditLoading(false);
    };

    // Filter users based on search input
    const filteredUsers = useMemo(() => {
        if (!searchFilter.trim()) return users;

        const query = searchFilter.toLowerCase();
        return users.filter((user) =>
            user.name.toLowerCase().includes(query)
        );
    }, [users, searchFilter]);

    // One line per column: a coloured count and the names; full list in the tooltip.
    const renderUsers = (ids: number[], tone: 'approve' | 'view') => {
        const names = ids
            .map((id) => userDetailsById.get(id)?.name)
            .filter((name): name is string => Boolean(name));
        if (names.length === 0) {
            return (
                <Typography variant="body2" color="text.disabled">
                    {tone === 'approve' ? 'Admins only' : 'None'}
                </Typography>
            );
        }
        const color = tone === 'approve' ? 'success' : 'info';
        return (
            <Tooltip
                arrow
                placement="top-start"
                title={
                    <Box sx={{ py: 0.5 }}>
                        {names.map((name) => (
                            <Typography key={name} variant="caption" display="block">
                                {name}
                            </Typography>
                        ))}
                    </Box>
                }
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, width: 'fit-content', maxWidth: '100%' }}>
                    <Box
                        component="span"
                        sx={{
                            minWidth: 24,
                            height: 22,
                            px: 0.75,
                            borderRadius: 11,
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            bgcolor: `${color}.light`,
                            color: `${color}.main`,
                        }}
                    >
                        {names.length}
                    </Box>
                    <Typography variant="body2" color="text.primary" noWrap sx={{ minWidth: 0 }}>
                        {names.join(', ')}
                    </Typography>
                </Stack>
            </Tooltip>
        );
    };

    return (
        <PermissionGuard permission="RequestActions">
            <Box px={1} sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Intro + search */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    justifyContent="space-between"
                    sx={{ pt: 1 }}
                >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={{ color: 'primary.main', display: 'flex', flexShrink: 0 }}>
                            <IconInfoCircle size={18} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Approvers can also view. Admins can always view and approve every request.
                        </Typography>
                    </Stack>
                    <TextField
                        size="small"
                        placeholder="Search request or user"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ minWidth: { md: 280 } }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>

                <Paper
                    variant="outlined"
                    sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}
                >
                    {/* Column header */}
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'grid' },
                            gridTemplateColumns: LIST_COLUMNS.md,
                            columnGap: 2,
                            px: 2.5,
                            py: 1.25,
                            bgcolor: 'grey.100',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={600}>Request type</Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <IconShieldCheck size={16} />
                            <Typography variant="subtitle2" fontWeight={600}>Can approve / reject</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <IconEye size={16} />
                            <Typography variant="subtitle2" fontWeight={600}>View only</Typography>
                        </Stack>
                        <Box />
                    </Box>

                    {/* List body */}
                    <Box sx={{ flex: 1, overflowY: 'auto' }}>
                        {fetchLoading ? (
                            // Placeholder rows in the same grid as the list (not table rows: this is not a table)
                            Array.from({ length: 6 }).map((_, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: LIST_COLUMNS,
                                        columnGap: 2,
                                        rowGap: 1,
                                        alignItems: 'center',
                                        px: 2.5,
                                        py: 1.5,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Skeleton variant="rounded" width={36} height={36} />
                                        <Skeleton variant="text" width="60%" />
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Skeleton variant="circular" width={28} height={28} />
                                        <Skeleton variant="text" width="50%" />
                                    </Stack>
                                    <Skeleton variant="text" width="55%" />
                                    <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                        <Skeleton variant="rounded" width={72} height={30} />
                                    </Box>
                                </Box>
                            ))
                        ) : filteredRows.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    No request types or users match &ldquo;{searchTerm}&rdquo;
                                </Typography>
                            </Box>
                        ) : (
                            filteredRows.map((row) => {
                                const approveIds = parseSelectedUserIds(row.saved?.selected_users);
                                const viewOnlyIds = parseSelectedUserIds(row.saved?.view_users).filter((id) => !approveIds.includes(id));
                                const inheritedFrom = row.saved?.inherited_from
                                    ? REQUEST_TYPES.find((type) => type.slug === row.saved?.inherited_from)?.name
                                    : null;
                                const TypeIcon = REQUEST_TYPES.find((type) => type.slug === row.slug)?.icon ?? IconInfoCircle;
                                return (
                                    <Box
                                        key={row.slug}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleEditClick(row)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleEditClick(row);
                                            }
                                        }}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: LIST_COLUMNS,
                                            columnGap: 2,
                                            rowGap: 1,
                                            alignItems: 'center',
                                            px: 2.5,
                                            py: 1.25,
                                            minHeight: 60,
                                            cursor: 'pointer',
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            transition: 'background-color 120ms',
                                            '&:last-of-type': { borderBottom: 'none' },
                                            '&:hover': { bgcolor: 'action.hover' },
                                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 1.5,
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: 'primary.light',
                                                    color: 'primary.main',
                                                }}
                                            >
                                                <TypeIcon size={18} />
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
                                                    {row.request_name}
                                                </Typography>
                                                {inheritedFrom && (
                                                    <Tooltip arrow title={`Uses the ${inheritedFrom} users until you save this request type.`}>
                                                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary', width: 'fit-content' }}>
                                                            <IconLink size={13} />
                                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                                Uses {inheritedFrom} users
                                                            </Typography>
                                                        </Stack>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </Stack>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                                                Can approve / reject
                                            </Typography>
                                            {renderUsers(approveIds, 'approve')}
                                        </Box>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                                                View only
                                            </Typography>
                                            {renderUsers(viewOnlyIds, 'view')}
                                        </Box>

                                        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                            <Tooltip arrow title={`Edit ${row.request_name}`}>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    aria-label={`Edit ${row.request_name}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(row);
                                                    }}
                                                >
                                                    <IconEdit size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Paper>

                {/* Edit Dialog */}
                <Dialog
                    open={editDialogOpen}
                    onClose={() => !editLoading && setEditDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle sx={{ fontWeight: 600, fontSize: '1.2rem', pb: 1 }}>
                        {editingRow?.request_name}
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2 }}>
                        <Stack spacing={2}>
                            <Typography variant="body2" color="textSecondary">
                                <b>Can View</b>: sees these requests and their details. <b>Can Approve / Reject</b>: can also
                                approve or reject them. Admins can always see and approve every request.
                            </Typography>

                            {editingInheritedFrom && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    {editingRow?.request_name} uses the <b>{editingInheritedFrom}</b> users right now. When you
                                    save, it gets its own users and will no longer change when {editingInheritedFrom} changes.
                                </Alert>
                            )}
                            {editingFollowers.length > 0 && (
                                <Alert severity="info" sx={{ py: 0.5 }}>
                                    Changes here also apply to <b>{editingFollowers.join(', ')}</b>, because they use these
                                    users until they are saved separately.
                                </Alert>
                            )}

                            {/* Search Box */}
                            <Box>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search users by name..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    InputProps={{
                                        startAdornment: <IconSearch size={18} style={{ marginRight: 8, color: '#999' }} />,
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: '#f5f7fa',
                                            '&:hover fieldset': {
                                                borderColor: '#d0d7eb',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#4f46e5',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Users List */}
                            <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 1,
                                        pr: 1.5,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color: '#666' }}>
                                        Users ({filteredUsers.length}) · {editFormData.view_users.length} can view ·{' '}
                                        {editFormData.selected_users.length} can approve / reject
                                    </Typography>
                                    <Typography variant="caption" sx={{ width: 64, textAlign: 'center', fontWeight: 600, color: '#666' }}>
                                        Can View
                                    </Typography>
                                    <Typography variant="caption" sx={{ width: 96, textAlign: 'center', fontWeight: 600, color: '#666' }}>
                                        Can Approve / Reject
                                    </Typography>
                                </Box>
                                <Paper
                                    sx={{
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                        backgroundColor: '#fff',
                                        border: '1px solid #e0e7ff',
                                    }}
                                >
                                    {filteredUsers.length > 0 ? (
                                        <Box>
                                            {filteredUsers.map((user) => {
                                                const canView = editFormData.view_users.includes(user.id);
                                                const canApprove = editFormData.selected_users.includes(user.id);
                                                return (
                                                    <Box
                                                        key={user.id}
                                                        sx={{
                                                            px: 1.5,
                                                            py: 1,
                                                            borderBottom: '1px solid #f0f0f0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            backgroundColor: canView ? '#f0f4ff' : 'transparent',
                                                            '&:last-child': {
                                                                borderBottom: 'none',
                                                            },
                                                        }}
                                                    >
                                                        <Avatar
                                                            src={user.user_image ?? ''}
                                                            alt={user.name}
                                                            sx={{ width: 36, height: 36, flexShrink: 0 }}
                                                        />
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 500,
                                                                    color: '#1a1a1a',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {user.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: '#666',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    display: 'block',
                                                                }}
                                                            >
                                                                {user.email}
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ width: 64, textAlign: 'center' }}>
                                                            <Checkbox
                                                                checked={canView}
                                                                onChange={() => toggleView(user.id)}
                                                                inputProps={{ 'aria-label': `${user.name} can view` }}
                                                            />
                                                        </Box>
                                                        <Box sx={{ width: 96, textAlign: 'center' }}>
                                                            <Checkbox
                                                                checked={canApprove}
                                                                onChange={() => toggleApprove(user.id)}
                                                                inputProps={{ 'aria-label': `${user.name} can approve or reject` }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center' }}>
                                            <Typography variant="body2" color="textSecondary">
                                                {searchFilter ? 'No users found matching your search' : 'No users available'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                        <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading} color="inherit">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={editLoading || !canSave}
                            variant="contained"
                            color="primary"
                        >
                            {editLoading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No changes'}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </PermissionGuard>
    );
};

export default RequestActionList;
