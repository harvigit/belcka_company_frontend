import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    TextField,
    InputAdornment,
    Avatar,
    Button,
    Chip,
    Paper,
    CircularProgress,
    Drawer,
} from '@mui/material';
import {
    Close as CloseIcon,
    Search as SearchIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { DateTime } from 'luxon';
import api from '@/utils/axios';
import AddLeave from '@/app/components/apps/time-clock/time-clock-details/leaves/add-leave';

interface LeaveRequestDetails {
    user_leave_id: number;
    user_id: number;
    first_name?: string;
    last_name?: string;
    user_thumb_image?: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    leave_id?: number;
    manager_note?: string;
    created_at?: string;
    display_date?: string;
    is_allday_leave?: boolean;
    start_time?: string | null;
    end_time?: string | null;
    request_status?: string;
    note?: string;
    total_time_of_days?: string;
    work_hours?: number;
}

interface LeaveRequestProps {
    leaveRequestDetails: LeaveRequestDetails[];
    onClose: () => void;
    onRefresh?: () => void;
    open: boolean;
    userId: number;
    companyId: number;
}

const LeaveRequest: React.FC<LeaveRequestProps> = ({
                                                       open,
                                                       leaveRequestDetails,
                                                       onClose,
                                                       onRefresh,
                                                       userId,
                                                       companyId,
                                                   }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [responseNotes, setResponseNotes] = useState<{ [key: number]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);
    const [editLeaveRequest, setEditLeaveRequest] = useState<LeaveRequestDetails | undefined>();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleNoteChange = (leave_id: number, value: string) => {
        setResponseNotes({ ...responseNotes, [leave_id]: value });
    };

    const handleApprove = async (user_leave_id: number) => {
        setIsLoading(true);
        try {
            const response = await api.post(`/user-leaves/approve?user_leave_id=${user_leave_id}`);

            if (response.data.IsSuccess) {
                onRefresh?.();
                onClose();
            }
        } catch (error) {
            console.error('Failed to approve leave:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (request: LeaveRequestDetails) => {
        setEditLeaveRequest(request);
        setAddLeaveSidebar(true);
    };

    const closeAddLeaveSidebar = () => {
        setAddLeaveSidebar(false);
        setEditLeaveRequest(undefined);
        onRefresh?.();
    };

    const handleReject = async (user_leave_id: number) => {
        setIsLoading(true);
        try {
            const response = await api.post(`/user-leaves/reject?user_leave_id=${user_leave_id}`);

            if (response.data.IsSuccess) {
                onRefresh?.();
                onClose();
            }
        } catch (error) {
            console.error('Failed to reject leave:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const parseDate = (dateStr: string): DateTime => {
        if (!dateStr) return DateTime.now();
        const formats = ['d/M/yyyy', 'yyyy-MM-dd', 'M/d/yyyy'];
        for (const format of formats) {
            const parsed = DateTime.fromFormat(dateStr, format);
            if (parsed.isValid) return parsed;
        }
        return DateTime.now();
    };

    const formatDateRange = (startStr: string, endStr: string) => {
        const start = parseDate(startStr);
        const end = parseDate(endStr);
        if (start.hasSame(end, 'day')) {
            return start.toFormat('d/M/yy');
        }
        return `${start.toFormat('d/M/yy')} → ${end.toFormat('d/M/yy')}`;
    };

    const filteredRequests = useMemo(() => {
        if (!leaveRequestDetails) return [];

        let filtered = leaveRequestDetails;

        if (activeTab === 0) {
            filtered = filtered.filter(req => req.request_status === '3');
        } else {
            filtered = filtered.filter(req =>
                req.request_status === 'approved' || req.request_status === 'rejected'
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req =>
                (req.first_name?.toLowerCase() || '').includes(query) ||
                (req.last_name?.toLowerCase() || '').includes(query) ||
                (req.leave_type?.toLowerCase() || '').includes(query) ||
                (req.manager_note?.toLowerCase() || '').includes(query) ||
                (req.note?.toLowerCase() || '').includes(query)
            );
        }

        return filtered;
    }, [leaveRequestDetails, activeTab, searchQuery]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight={600}>
                        Leave requests
                    </Typography>
                </Box>
            </Box>

            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
                <Tab label="Pending Approvals" sx={{ textTransform: 'none' }} />
            </Tabs>

            <Box sx={{ p: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search by name or leave type"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : filteredRequests.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            flexDirection: 'column',
                            gap: 1,
                        }}
                    >
                        <Typography variant="h6" color="text.secondary">
                            No leave requests
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {activeTab === 0
                                ? 'There are no pending leave requests'
                                : 'No leave request history available'}
                        </Typography>
                    </Box>
                ) : (
                    filteredRequests.map((request) => (
                        <Paper
                            key={request.user_leave_id}
                            elevation={0}
                            sx={{
                                mb: 2,
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 2,
                                '&:hover': {
                                    boxShadow: 2,
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 2,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        src={request.user_thumb_image}
                                        sx={{ width: 40, height: 40 }}
                                        alt={`${request.first_name || ''} ${request.last_name || ''}`.trim() || 'Unknown'}
                                    />
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {(request.first_name || request.last_name)
                                                ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                                                : 'Unknown'}
                                        </Typography>
                                        {request.created_at && (
                                            <Typography variant="caption" color="text.secondary">
                                                Requested on {parseDate(request.created_at).toFormat('dd/MM/yyyy')}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                {activeTab === 0 && (
                                    <Button
                                        onClick={() => handleEdit(request)}
                                        disabled={isLoading}
                                        startIcon={<EditIcon fontSize="small" />}
                                        size="small"
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    Leave type
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {request.leave_type && (
                                        <Chip
                                            label={request.leave_type}
                                            size="small"
                                            sx={{ bgcolor: 'grey.100' }}
                                        />
                                    )}
                                    {request.request_status && (
                                        <Chip
                                            label={request.request_status === '3' ? 'Pending' : request.request_status}
                                            size="small"
                                            color={request.request_status === 'Paid' ? 'success' : 'default'}
                                            sx={{ bgcolor: request.request_status === 'Paid' ? undefined : 'grey.100' }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    Dates
                                </Typography>
                                <Typography variant="body2">
                                    {formatDateRange(request.start_date, request.end_date)}{' '}
                                    <Typography component="span" variant="body2" color="text.secondary">
                                        ({Number(request.total_time_of_days)?.toFixed(2) || '0.00'} days - {Number(request.work_hours)?.toFixed(2) || '0.00'} work hours)
                                    </Typography>
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    Note
                                </Typography>
                                <Typography variant="body2">{request.note || request.manager_note || '-'}</Typography>
                            </Box>

                            {activeTab === 0 && (
                                <>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={3}
                                        placeholder="Add a note to your response (optional)"
                                        value={responseNotes[request.user_leave_id] || ''}
                                        onChange={(e) => handleNoteChange(request.user_leave_id, e.target.value)}
                                        sx={{ mb: 2 }}
                                        size="small"
                                    />

                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            startIcon={<CheckIcon />}
                                            onClick={() => handleApprove(request.user_leave_id)}
                                            disabled={isLoading}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            fullWidth
                                            startIcon={<ClearIcon />}
                                            onClick={() => handleReject(request.user_leave_id)}
                                            disabled={isLoading}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Reject
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Paper>
                    ))
                )}
            </Box>

            <Drawer
                anchor="right"
                open={addLeaveSidebar}
                onClose={closeAddLeaveSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddLeave
                    onClose={closeAddLeaveSidebar}
                    leaveData={editLeaveRequest}
                    userId={userId}
                    companyId={companyId}
                />
            </Drawer>
        </Box>
    );
};

export default LeaveRequest;
