'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    Stack,
    Autocomplete,
    CircularProgress,
    Drawer,
    Divider,
} from '@mui/material';
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import api from '@/utils/axios';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import toast from 'react-hot-toast';
import IOSSwitch from '@/app/components/common/IOSSwitch';

interface UserLimitEntry {
    user_id: number | null;
    user_name?: string;
    user_image?: string;
    limit: number | string;
}

interface LeaveLimitSetting {
    is_leave_limit: boolean;
    leave_limit: number | string;
    user_limits: UserLimitEntry[];
}

interface LeaveSettingProps {
    open: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void;
}

const LeaveSetting: React.FC<LeaveSettingProps> = ({ open, onClose, onSaveSuccess }) => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    const [setting, setSetting] = useState<LeaveLimitSetting>({
        is_leave_limit: false,
        leave_limit: 20,
        user_limits: [],
    });

    useEffect(() => {
        if (open) {
            fetchSettings();
            fetchUsers();
        }
    }, [open]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await api.get(`setting/get-leave-settings`, {
                params: { company_id: user.company_id },
            });
            if (res.data?.IsSuccess && res.data?.data) {
                setSetting({
                    ...res.data.data,
                    user_limits: res.data.data.user_limits ?? [],  // ← guard here
                });
            }


        } catch (err) {
            console.error('Failed to fetch leave settings:', err);
            toast.error('Failed to load leave settings');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get(`user/list`, {
                params: { company_id: user.company_id },
            });
            if (res.data?.IsSuccess) {
                const rawUsers = res.data.info || [];
                const normalized = rawUsers.map((u: any) => ({
                    ...u,
                    name: u.name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
                }));
                setUsers(normalized);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const handleToggle = (checked: boolean) => {
        setSetting((prev) => ({ ...prev, is_leave_limit: checked }));
    };

    const handleLimitChange = (value: string) => {
        setSetting((prev) => ({ ...prev, leave_limit: value }));
    };

    const clampLimit = (value: string): number => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) return 0;
        if (num > 365) return 365;
        return num;
    };

    const handleLeaveLimitBlur = () => {
        setSetting((prev) => ({
            ...prev,
            leave_limit: clampLimit(String(prev.leave_limit)),
        }));
    };

    const handleUserLimitBlur = (index: number) => {
        setSetting((prev) => {
            const updated = [...prev.user_limits];
            updated[index] = {
                ...updated[index],
                limit: clampLimit(String(updated[index].limit)),
            };
            return { ...prev, user_limits: updated };
        });
    };

    const handleAddUserLimit = () => {
        setSetting((prev) => ({
            ...prev,
            user_limits: [...prev.user_limits, { user_id: null, limit: 20 }],
        }));
    };

    const handleRemoveUserLimit = (index: number) => {
        setSetting((prev) => ({
            ...prev,
            user_limits: prev.user_limits.filter((_, i) => i !== index),
        }));
    };

    const handleUserLimitChange = (index: number, field: 'user_id' | 'limit', value: any) => {
        setSetting((prev) => {
            const updated = [...prev.user_limits];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, user_limits: updated };
        });
    };

    // Guard: no duplicate users in the list
    const getAvailableUsers = (currentIndex: number) => {
        const selectedIds = setting.user_limits
            .map((u, i) => (i !== currentIndex ? u.user_id : null))
            .filter(Boolean);
        return users.filter((u) => !selectedIds.includes(u.id));
    };

    const handleSave = async () => {
        const hasInvalidLimit =
            setting.user_limits.some((u) => u.user_id === null);

        const hasOutOfRangeLimit =
            Number(setting.leave_limit) < 0 ||
            Number(setting.leave_limit) > 365 ||
            setting.user_limits.some((u) => Number(u.limit) < 0 || Number(u.limit) > 365);

        if (hasInvalidLimit) {
            toast.error('Please select a user for every custom limit row');
            return;
        }

        if (hasOutOfRangeLimit) {
            toast.error('Leave limits must be between 0 and 365');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                is_leave_limit: setting.is_leave_limit,
                leave_limit: Number(setting.leave_limit),
                user_limits: setting.user_limits.map((u) => ({
                    user_id: u.user_id,
                    limit: Number(u.limit),
                })),
            };

            const res = await api.post(`setting/save-leave-settings`, payload);
            if (res.data?.IsSuccess) {
                toast.success('Leave settings saved!');
                onSaveSuccess?.();
                onClose();
            } else {
                toast.error(res.data?.message || 'Failed to save settings');
            }
        } catch (err) {
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    height: '85vh',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                },
            }}
        >
            {/* ── Top Header Bar ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    px: 3,
                    py: 1.8,
                    borderBottom: '1px solid #e8ecf0',
                    bgcolor: '#fff',
                    flexShrink: 0,
                }}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography fontWeight={600} fontSize={15} color="text.primary">
                        ⚙ Settings
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <IconX size={18} />
                </IconButton>
            </Box>

            {/* ── Body ── */}
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', bgcolor: '#f5f7fa' }}>
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        justifyContent: 'center',
                        px: { xs: 2, sm: 4 },
                        py: 4,
                    }}
                >
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" width="100%">
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%', maxWidth: 720 }}>

                            {/* ── Company-level toggle ── */}
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={3}
                            >
                                <Box>
                                    <Typography fontWeight={500} fontSize={14} color="text.primary">
                                        Enable leave limit
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        You&apos;ll be notified when a limit is exceeded
                                    </Typography>
                                </Box>

                                <IOSSwitch
                                    disabled={loading}
                                    checked={setting.is_leave_limit}
                                    onChange={(e) => handleToggle(e.target.checked)}
                                    color="primary"
                                />
                            </Box>

                            <Divider sx={{ borderWidth: 1 }} />

                            {/* ── Company-level default limit ── */}
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                mt={2}
                                mb={2}
                                sx={{
                                    opacity: setting.is_leave_limit ? 1 : 0.4,
                                    pointerEvents: setting.is_leave_limit ? 'auto' : 'none',
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                <Box>
                                    <Typography fontWeight={500} fontSize={14} color="text.primary">
                                        Default limit (all employees)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Applies to users without a custom limit
                                    </Typography>
                                </Box>

                                <Box display="flex" alignItems="center">
                                    <TextField
                                        type="text"
                                        value={setting.leave_limit}
                                        onChange={(e) => handleLimitChange(e.target.value)}
                                        onBlur={handleLeaveLimitBlur}
                                        inputProps={{
                                            min: 0,
                                            max: 365,
                                            step: 1,
                                            inputMode: "numeric",
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                        placeholder="Enter leave limit"
                                    />
                                    <Typography pl={2} fontSize={13} color="text.secondary" whiteSpace="nowrap">
                                        Per Year
                                    </Typography>
                                </Box>
                            </Box>

                            <Divider sx={{ borderWidth: 1 }} />

                            {/* ── Per-user limits ── */}
                            <Box
                                sx={{
                                    py: 2.5,
                                    opacity: setting.is_leave_limit ? 1 : 0.4,
                                    pointerEvents: setting.is_leave_limit ? 'auto' : 'none',
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Box>
                                        <Typography fontWeight={500} fontSize={14} color="text.primary">
                                            Custom limits per employee
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Overrides the default limit for selected users
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        startIcon={<IconPlus size={15} />}
                                        onClick={handleAddUserLimit}
                                        size="small"
                                        sx={{
                                            borderRadius: '20px',
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            px: 2,
                                            flexShrink: 0,
                                        }}
                                    >
                                        Add
                                    </Button>
                                </Box>

                                {setting.user_limits.length === 0 ? (
                                    <Box
                                        sx={{
                                            textAlign: 'center',
                                            py: 4,
                                            color: 'text.disabled',
                                            border: '1.5px dashed #e0e0e0',
                                            borderRadius: 2,
                                            bgcolor: '#fafafa',
                                        }}
                                    >
                                        <Typography fontSize={13}>No individual limits set yet</Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {setting.user_limits.map((entry, index) => {
                                            const selectedUser =
                                                users.find((u) => u.id === entry.user_id) || null;

                                            return (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1.5,
                                                        p: 1.5,
                                                        bgcolor: '#f9fafb',
                                                        borderRadius: 2,
                                                        border: '1px solid #eaedf0',
                                                    }}
                                                >
                                                    <Autocomplete
                                                        size="small"
                                                        options={getAvailableUsers(index)}
                                                        value={selectedUser}
                                                        getOptionLabel={(opt) => opt.name || ''}
                                                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                                        onChange={(_, val) =>
                                                            handleUserLimitChange(index, 'user_id', val?.id ?? null)
                                                        }
                                                        renderOption={(props, opt) => (
                                                            <Box
                                                                component="li"
                                                                {...props}
                                                                display="flex"
                                                                alignItems="center"
                                                                gap={1}
                                                            >
                                                                <Avatar
                                                                    src={opt.user_image || ''}
                                                                    sx={{ width: 26, height: 26 }}
                                                                />
                                                                <Typography fontSize={13}>{opt.name}</Typography>
                                                            </Box>
                                                        )}
                                                        renderInput={(params) => (
                                                            <TextField {...params} placeholder="Select user" />
                                                        )}
                                                        sx={{ flex: 1, minWidth: 160 }}
                                                    />
                                                    <TextField
                                                        size="small"
                                                        type="text"
                                                        value={entry.limit}
                                                        onChange={(e) => handleUserLimitChange(index, 'limit', e.target.value)}
                                                        onBlur={() => handleUserLimitBlur(index)}
                                                        inputProps={{
                                                            min: 0,
                                                            max: 365,
                                                            style: { textAlign: 'center', width: 50 },
                                                        }}
                                                        sx={{
                                                            width: 85,
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: '8px',
                                                                bgcolor: '#fff',
                                                            },
                                                        }}
                                                    />
                                                    <Typography
                                                        fontSize={13}
                                                        color="text.disabled"
                                                        whiteSpace="nowrap"
                                                    >
                                                        Per Year
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleRemoveUserLimit(index)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </IconButton>
                                                </Box>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* ── Fixed Bottom Bar ── */}
            <Box
                sx={{
                    flexShrink: 0,
                    borderTop: '1px solid #e8ecf0',
                    bgcolor: '#fff',
                    px: 3,
                    py: 1.5,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}
            >
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' },
                    }}
                >
                    {saving ? 'Saving...' : 'Save changes'}
                </Button>
            </Box>
        </Drawer>
    );
};

export default LeaveSetting;
