'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    MenuItem,
    Stack,
    Typography,
    IconButton,
    TextField,
    Paper,
} from '@mui/material';

import {IconChevronLeft, IconChevronRight, IconSearch} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import { useSession } from 'next-auth/react';
import { User } from "next-auth";
import PermissionGuard from '@/app/auth/PermissionGuard';
import { AxiosResponse } from 'axios';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import toast from 'react-hot-toast';

// Every request type an admin can give view / approve permission for.
const REQUEST_TYPES = [
    { name: 'Add Timesheet', slug: 'timesheet_request' },
    { name: 'Edit Timesheet', slug: 'timesheet_approve' },
    { name: 'Leave request', slug: 'leave_request' },
    { name: 'Pricework request', slug: 'pricework_request' },
    { name: 'Adjustment request', slug: 'adjustment_request' },
    { name: 'Personal detail request', slug: 'personal_detail_request' },
    { name: 'Billing Info Request', slug: 'billing_info_request' },
    { name: 'Rate request', slug: 'rate_request' },
    { name: 'Expense request', slug: 'expense_request' },
    { name: 'Penalty request', slug: 'penalty_request' },
    { name: 'Penalty appeal request', slug: 'penalty_appeal_request' },
    { name: 'Team cap increase request', slug: 'team_cap_request' },
    { name: 'Project limit increase request', slug: 'project_cap_request' },
];

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

const PAGE_SIZE_OPTIONS = [50, 100, 250, 500];

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
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);

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

    useEffect(() => { setPageIndex(0); }, [searchTerm]);

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const paginatedRows = filteredRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

    const handleEditClick = (row: RequestRow) => {
        setEditingRow(row);
        setSearchFilter('');
        const approveUserIds = parseSelectedUserIds(row.saved?.selected_users);
        const viewOnlyUserIds = parseSelectedUserIds(row.saved?.view_users);

        setEditFormData({
            request_name: row.request_name,
            slug: row.slug,
            view_users: [...new Set([...approveUserIds, ...viewOnlyUserIds])],
            selected_users: approveUserIds,
        });
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
    // A type without its own setting needs at least one user; a saved setting can be cleared.
    const canSave = editFormData.view_users.length > 0 || savedId > 0;

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

    return (
        <PermissionGuard permission="RequestActions">
            <Box px={1} sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
                {/* Column header */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        px: 2,
                        py: 1.2,
                        backgroundColor: '#e8eef7',
                        borderBottom: '2px solid #d0d7eb',
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={600}>Request</Typography>
                    <Typography variant="subtitle2" fontWeight={600}>Can View</Typography>
                    <Typography variant="subtitle2" fontWeight={600}>Can Approve / Reject</Typography>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ minWidth: 80, textAlign: 'right' }}>Action</Typography>
                </Box>

                {/* List body */}
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {fetchLoading ? (
                        <Box sx={{ p: 2 }}>
                            <SkeletonLoader
                                columns={[{ name: 'request_name'}, { name: 'view_users'}, { name: 'selected_users'}, { name: 'actions'}]}
                                rowCount={6}
                            />
                        </Box>
                    ) : (
                        paginatedRows.map((row) => {
                            const approveIds = parseSelectedUserIds(row.saved?.selected_users);
                            const viewOnlyIds = parseSelectedUserIds(row.saved?.view_users).filter((id) => !approveIds.includes(id));
                            const inheritedFrom = row.saved?.inherited_from
                                ? REQUEST_TYPES.find((type) => type.slug === row.saved?.inherited_from)?.name
                                : null;
                            const userNamesSx = {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                pr: 2,
                            };
                            return (
                                <Box key={row.slug}>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr auto',
                                            alignItems: 'center',
                                            px: 2,
                                            py: 1.5,
                                            '&:hover': { backgroundColor: '#f8f9fc' },
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="body2" color="textPrimary">
                                                {row.request_name}
                                            </Typography>
                                            {inheritedFrom && (
                                                <Typography variant="caption" color="textSecondary">
                                                    Same users as {inheritedFrom} until saved
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* View-only users (approve users can view as well) */}
                                        <Typography variant="body2" color={viewOnlyIds.length ? 'textPrimary' : 'textSecondary'} sx={userNamesSx}>
                                            {getSelectedUserNames(viewOnlyIds) || '—'}
                                        </Typography>

                                        <Typography variant="body2" color={approveIds.length ? 'textPrimary' : 'textSecondary'} sx={userNamesSx}>
                                            {getSelectedUserNames(approveIds) || 'Admins only'}
                                        </Typography>

                                        <Button
                                            size="small"
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleEditClick(row)}
                                            sx={{
                                                px: 3,
                                                py: 0.75,
                                                textTransform: 'capitalize',
                                                fontWeight: 600,
                                                minWidth: 80,
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    </Box>
                                    <Divider />
                                </Box>
                            );
                        })
                    )}
                </Box>

                <Divider />

                {/* Pagination */}
                <Box sx={{ padding: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography color="textSecondary" className="f-14">Entries:</Typography>
                        <CustomSelect
                            className="custom-select"
                            value={pageSize}
                            onChange={(e: { target: { value: any } }) => {
                                setPageSize(Number(e.target.value));
                                setPageIndex(0);
                            }}
                            sx={{ minWidth: '80px' }}
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <MenuItem key={size} value={size}>{size}</MenuItem>
                            ))}
                        </CustomSelect>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography color="textSecondary" className="f-14">
                            Page {pageIndex + 1} of {pageCount}
                        </Typography>
                        <IconButton size="small" onClick={() => setPageIndex((p) => p - 1)} disabled={pageIndex === 0}>
                            <IconChevronLeft size={18} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setPageIndex((p) => p + 1)} disabled={pageIndex >= pageCount - 1}>
                            <IconChevronRight size={18} />
                        </IconButton>
                    </Stack>
                </Box>

                <Divider />

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
                            {editLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Box>
        </PermissionGuard>
    );
};

export default RequestActionList;
