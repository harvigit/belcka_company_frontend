"use client";

import React, { useEffect, useState } from 'react';
import {
    Box,
    CircularProgress,
    IconButton,
    Typography,
    Select,
    MenuItem,
    TextField,
    Button,
    FormControl,
    Avatar,
    InputAdornment,
    Divider,
    SelectChangeEvent,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import SearchIcon from '@mui/icons-material/Search';
import api from '@/utils/axios';

interface AddLeaveProps {
    onClose: () => void;
}

interface User {
    id: number;
    first_name: string;
    last_name: string;
    name: string;
    user_image?: string;
    image?: string;
}

type LeaveTypeKey = 'non_paid' | 'sick' | 'vacation';

export default function AddLeave({ onClose }: AddLeaveProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        userId: '',
        leaveType: '',
        managerNote: '',
    });

    const getUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`user/list`);
            setUsers(res.data.info || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsers();
    }, []);

    const handleUserChange = (event: SelectChangeEvent<string>) => {
        setFormData((prev) => ({ ...prev, userId: event.target.value }));
    };

    const handleLeaveTypeChange = (event: SelectChangeEvent<string>) => {
        setFormData((prev) => ({ ...prev, leaveType: event.target.value }));
    };

    const handleManagerNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, managerNote: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.userId || !formData.leaveType) {
            alert('Please fill out all required fields');
            return;
        }
        console.log('Submitting leave request:', formData);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    const filteredUsers = users.filter((user) => {
        const fullName = user.name || `${user.first_name} ${user.last_name}`;
        return fullName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    const leaveTypeMap: Record<LeaveTypeKey, string> = {
        non_paid: 'Non Paid Absence',
        sick: 'Sick Leave',
        vacation: 'Vacation',
    };

    return (
        <Box
            sx={{
                bgcolor: 'white',
                borderRadius: '8px',
                width: '100%',
                height: '100vh',
                maxWidth: '600px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                p={1}
                borderBottom="1px solid #e0e0e0"
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton onClick={onClose} size="small" sx={{ p: 0.5 }}>
                        <IconX size={20} />
                    </IconButton>
                    <Typography variant="h6" fontWeight={600}>
                        Add Leave
                    </Typography>
                </Box>
            </Box>

            <Box
                component="form"
                onSubmit={handleSubmit}
                p={3}
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                }}
            >
                <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    mb={2}
                >
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ minWidth: '100px', flexShrink: 0 }}
                    >
                        Select user
                    </Typography>
                    <FormControl fullWidth>
                        <Select
                            name="userId"
                            value={formData.userId}
                            onChange={handleUserChange}
                            displayEmpty
                            MenuProps={{
                                PaperProps: {
                                    style: {
                                        maxHeight: 400,
                                    },
                                },
                                autoFocus: false,
                            }}
                            renderValue={(selected) => {
                                if (!selected) {
                                    return <span style={{ color: '#999' }}>Select user</span>;
                                }
                                const user = users.find(u => u.id === Number(selected));
                                const userImage = user?.user_image || user?.image;
                                const userName = user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

                                return (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar
                                            src={userImage}
                                            sx={{ width: 28, height: 28, fontSize: '14px' }}
                                        >
                                            {user?.first_name?.[0]?.toUpperCase()}
                                        </Avatar>
                                        <span>{userName}</span>
                                    </Box>
                                );
                            }}
                        >
                            {/* Search Box Inside Dropdown */}
                            <Box px={2} py={1.5} position="sticky" top={0} bgcolor="white" zIndex={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search user"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <SearchIcon sx={{ color: '#999' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#e0e0e0',
                                            },
                                        },
                                    }}
                                />
                            </Box>

                            {filteredUsers.length === 0 ? (
                                <MenuItem disabled>
                                    <Typography color="text.secondary">No users found</Typography>
                                </MenuItem>
                            ) : (
                                filteredUsers.map((user) => {
                                    const userImage = user.user_image || user.image;
                                    const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();

                                    return (
                                        <MenuItem key={user.id} value={user.id.toString()}>
                                            <Box display="flex" alignItems="center" gap={1.5} width="100%">
                                                <Avatar
                                                    src={userImage}
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    {user.first_name?.[0]?.toUpperCase()}
                                                </Avatar>
                                                <span>{userName}</span>
                                            </Box>
                                        </MenuItem>
                                    );
                                })
                            )}
                        </Select>
                    </FormControl>
                </Box>

                <Divider />

                <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    mt={2}
                    mb={2}
                >
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                        sx={{ minWidth: '100px', flexShrink: 0 }}
                    >
                        Leave type
                    </Typography>
                    <FormControl fullWidth>
                        <Select
                            name="leaveType"
                            value={formData.leaveType}
                            onChange={handleLeaveTypeChange}
                            displayEmpty
                            renderValue={(value) => {
                                if (!value) {
                                    return <span style={{ color: '#999' }}>Select leave type</span>;
                                }
                                return leaveTypeMap[value as LeaveTypeKey] || value;
                            }}
                        >
                            <MenuItem value="non_paid">Non Paid Absence</MenuItem>
                            <MenuItem value="sick">Sick Leave</MenuItem>
                            <MenuItem value="vacation">Vacation</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <Divider />

                {/* Manager Note */}
                <Box mt={2} mb={2}>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        name="managerNote"
                        placeholder="Add manager note"
                        value={formData.managerNote}
                        onChange={handleManagerNoteChange}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#e0e0e0',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#bdbdbd',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1976d2',
                                },
                            },
                        }}
                    />
                </Box>
            </Box>

            <Box
                display="flex"
                justifyContent="flex-start"
                gap={2}
                p={3}
                borderTop="1px solid #e0e0e0"
                sx={{
                    bgcolor: 'white',
                }}
            >
                <Button
                    variant="outlined"
                    onClick={handleSubmit}
                    disabled={!formData.userId || !formData.leaveType}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 500,
                        borderColor: !formData.userId || !formData.leaveType ? '#e0e0e0' : '#1976d2',
                        color: !formData.userId || !formData.leaveType ? '#999' : '#1976d2',
                        '&:hover': {
                            borderColor: !formData.userId || !formData.leaveType ? '#e0e0e0' : '#1565c0',
                            bgcolor: 'transparent',
                        },
                        '&.Mui-disabled': {
                            borderColor: '#e0e0e0',
                            color: '#999',
                        },
                    }}
                >
                    Add Leave
                </Button>
                <Button
                    variant="text"
                    onClick={handleCancel}
                    sx={{
                        color: '#666',
                        textTransform: 'none',
                        fontWeight: 500,
                    }}
                >
                    Cancel
                </Button>
            </Box>
        </Box>
    );
}
