'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Avatar,
    Box,
    IconButton,
    Stack,
    Typography,
    Button,
    Card,
    CardContent,
    Alert,
    Snackbar,
    CircularProgress,
    Chip,
    Dialog,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    IconX,
    IconCheck,
    IconClock,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { AxiosResponse } from 'axios';
import { TimeClock } from '../time-clock';
import api from '@/utils/axios';
import { DateTime } from 'luxon';

// Move interfaces to top for better organization
interface RequestItem {
    old_payable_hour: string | null;
    new_payable_hour: string | null;
    id: number;
    user_id: number;
    date: string;
    status: number;
    status_text: string;
    action_by: number | null;
    approved_at: string | null;
    rejected_at: string | null;
    reject_reason: string | null;
    message: string;
    user_name: string;
    user_image: string;
    user_thumb_image: string;
    week_start: string | null;
    week_end: string | null;
    start_time: string | null;
    end_time: string | null;
    note: string;
    request_type: number;
    type_name: string;
    table_name: string;
    trade_name?: string;
    shift_name?: string;
    old_data?: {
        start_time: string;
        end_time: string;
    };
    new_data?: {
        start_time: string;
        end_time: string;
    };
}

interface RequestListResponse {
    IsSuccess: boolean;
    message: string;
    info: RequestItem[];
}

interface RequestDetailsProps {
    open: boolean;
    timeClock: TimeClock | null;
    user_id: any;
    currency: string;
    allUsers: TimeClock[];
    onClose: () => void;
    onUserChange?: (user: TimeClock) => void;
}

interface AlertState {
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
}

interface RejectDialogState {
    open: boolean;
    requestId: number | null;
    comment: string;
    loading: boolean;
    isBulk?: boolean;
}

// Constants moved outside component to prevent recreation
const STATUS_LABELS = {
    5: 'Approved',
    12: 'Rejected',
    3: 'Pending',
} as const;

const STATUS_COLORS = {
    5: 'success',
    12: 'error',
    3: 'warning',
} as const;

const PENDING_STATUS = 3;
const APPROVED_STATUS = 5;
const REJECTED_STATUS = 12;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Memoized components for better performance
const RequestCard = React.memo<{
    request: RequestItem;
    isProcessing: boolean;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string;
    formatDate: (val: string | number | null | undefined) => string;
}>(({ request, isProcessing, onApprove, onReject, formatHour, formatDate }) => {

    const formatPayableHour = (val: string | number | null | undefined, isPricework: boolean = false): string => {
        if (val === null || val === undefined) return isPricework ? '--' : '00:00';

        if (isPricework) return '--';

        const str = val.toString().trim();

        if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
            const [h, m] = str.split(':');
            const minutes = parseFloat(m) || 0;
            return `${h.padStart(2, '0')}:${Math.floor(minutes)
                .toString()
                .padStart(2, '0')}`;
        }

        const num = parseFloat(str);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        return isPricework ? '--' : '00:00';
    };

    const getStatusLabel = useCallback((status: number) => {
        return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || 'Unknown';
    }, []);

    const getStatusColor = useCallback((status: number): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
    }, []);

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 1,
                border: '1px solid #e0e0e0',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.2s ease-in-out',
            }}
        >
            <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {/* Left side - Avatar and user info */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 80
                    }}>
                        <Avatar
                            src={request.user_thumb_image}
                            alt={request.user_name}
                            sx={{
                                width: 40,
                                height: 40,
                                mb: 0.5,
                                bgcolor: 'primary.main'
                            }}
                        >
                            {request.user_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            textAlign="center"
                            sx={{ lineHeight: 1.1 }}
                        >
                            {request.user_name}
                        </Typography>
                        {request.trade_name && (
                            <Typography variant="caption" color="text.secondary" textAlign="center">
                                {request.trade_name}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', gap: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                Original Work Time:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {formatDate(request.date)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" fontWeight={600}>
                                    {formatHour(request.old_data?.start_time)}
                                </Typography>
                                <Typography variant="body2">→</Typography>
                                <Typography variant="h6" fontWeight={600} color="error.main">
                                    {formatHour(request.old_data?.end_time)}
                                </Typography>
                            </Box>

                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                                {formatPayableHour(request.old_payable_hour)}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                Requested Work Time:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {formatDate(request.date)}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h6" fontWeight={600}>
                                    {formatHour(request.new_data?.start_time)}
                                </Typography>
                                <Typography variant="body2">→</Typography>
                                <Typography variant="h6" fontWeight={600} color="success.main">
                                    {formatHour(request.new_data?.end_time)}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                                {formatPayableHour(request.new_payable_hour)}
                            </Typography>

                            {request.note && (
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        Request Note
                                    </Typography>
                                    <Typography variant="body2" color="primary.main">
                                        {request.note}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Right side - Actions */}
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        alignItems: 'flex-end',
                        minWidth: 100
                    }}>
                        {request.status === PENDING_STATUS ? (
                            <>
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => onApprove(request.id)}
                                    disabled={isProcessing}
                                    startIcon={isProcessing ? <CircularProgress size={14} /> : <IconCheck size={16} />}
                                    sx={{
                                        color: '#4caf50',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        '&:disabled': {
                                            color: 'rgba(33, 150, 243, 0.5)'
                                        }
                                    }}
                                >
                                    Approve
                                </Button>
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => onReject(request.id)}
                                    disabled={isProcessing}
                                    startIcon={isProcessing ? <CircularProgress size={14} /> : <IconX size={16} />}
                                    sx={{
                                        color: '#f44336',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        '&:disabled': {
                                            color: 'rgba(244, 67, 54, 0.5)'
                                        }
                                    }}
                                >
                                    Reject
                                </Button>
                            </>
                        ) : (
                            <>
                                <Chip
                                    label={getStatusLabel(request.status)}
                                    size="small"
                                    color={getStatusColor(request.status)}
                                    variant="outlined"
                                    sx={{ fontSize: '0.75rem' }}
                                />

                                {request.reject_reason && (
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                            Reject Reason
                                        </Typography>
                                        <Typography variant="body2" color="primary.main">
                                            {request.reject_reason}
                                        </Typography>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
});

RequestCard.displayName = 'RequestCard';

const RequestDetails: React.FC<RequestDetailsProps> = ({  open, timeClock, user_id, onClose }) => {
    // State management
    const [requestList, setRequestList] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
    const [alert, setAlert] = useState<AlertState>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [rejectDialog, setRejectDialog] = useState<RejectDialogState>({
        open: false,
        requestId: null,
        comment: '',
        loading: false,
        isBulk: false
    });

    // Memoized values
    const today = useMemo(() => new Date(), []);

    const defaultDateRange = useMemo(() => {
        const defaultStart = new Date(today);
        defaultStart.setDate(today.getDate() - today.getDay() + 1);
        const defaultEnd = new Date(today);
        defaultEnd.setDate(today.getDate() - today.getDay() + 7);
        return { defaultStart, defaultEnd };
    }, [today]);

    const pendingRequestsCount = useMemo(() =>
            requestList.filter(req => req.status === PENDING_STATUS).length,
        [requestList]
    );

    const pendingRequests = useMemo(() =>
            requestList.filter(req => req.status === PENDING_STATUS),
        [requestList]
    );

    // Memoized callbacks
    const showAlert = useCallback((message: string, severity: AlertState['severity'] = 'success') => {
        setAlert({ open: true, message, severity });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, open: false }));
    }, []);

    const openRejectDialog = useCallback((requestId: number | null, isBulk: boolean = false) => {
        setRejectDialog({
            open: true,
            requestId,
            comment: '',
            loading: false,
            isBulk
        });
    }, []);

    const closeRejectDialog = useCallback(() => {
        setRejectDialog({
            open: false,
            requestId: null,
            comment: '',
            loading: false,
            isBulk: false
        });
    }, []);

    const handleRejectCommentChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRejectDialog(prev => ({
            ...prev,
            comment: event.target.value
        }));
    }, []);

    const fetchRequests = useCallback(async (start?: Date, end?: Date, retryCount = 0) => {
        try {
            setLoading(true);

            const startDateToUse = start || defaultDateRange.defaultStart;
            const endDateToUse = end || defaultDateRange.defaultEnd;

            const params: Record<string, string> = {
                user_id: user_id?.toString() || '',
                start_date: format(startDateToUse, 'dd/MM/yyyy'),
                end_date: format(endDateToUse, 'dd/MM/yyyy'),
                _t: Date.now().toString()
            };

            const response: AxiosResponse<RequestListResponse> = await api.get(
                '/time-clock/request-details',
                {
                    params,
                    // Prevent axios from caching
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }
            );

            if (response.data.IsSuccess) {
                setRequestList(response.data.info || []);
            } else {
                showAlert(response.data.message || 'Failed to fetch requests', 'error');
                setRequestList([]);
            }
        } catch (error) {
            console.error('Error fetching requests data:', error);

            if (retryCount < 2) {
                await delay(1000);
                return fetchRequests(start, end, retryCount + 1);
            }

            showAlert('Error fetching requests data', 'error');
            setRequestList([]);
        } finally {
            setLoading(false);
        }
    }, [defaultDateRange, user_id, showAlert]);

    const handleSingleRequest = useCallback(
        async (requestId: number, action: 'approve' | 'reject', comment?: string) => {
            try {
                setProcessingIds(prev => new Set([...prev, requestId]));

                const endpoint = action === 'approve'
                    ? '/timesheet/web-request-approve'
                    : '/timesheet/web-request-reject';

                const payload: any = {
                    ids: requestId.toString(),
                    userId: user_id
                };

                if (action === 'reject') {
                    payload.reason = comment || '';
                }

                const response: AxiosResponse<{ IsSuccess: boolean; message?: string }> =
                    await api.post(endpoint, payload);

                if (response.data.IsSuccess) {
                    showAlert(`Request ${action}d successfully`, 'success');

                    await delay(1500);

                    if (timeClock?.start_date && timeClock?.end_date) {
                        await fetchRequests(
                            new Date(timeClock.start_date),
                            new Date(timeClock.end_date)
                        );
                    } else {
                        await fetchRequests();
                    }
                } else {
                    showAlert(response.data.message || `Error ${action}ing request`, 'error');
                }
            } catch (error) {
                console.error(`Error ${action}ing request:`, error);
                showAlert(`Error ${action}ing request`, 'error');
            } finally {
                setProcessingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(requestId);
                    return newSet;
                });
            }
        },
        [fetchRequests, showAlert, timeClock, user_id]
    );

    const handleBulkAction = useCallback(async (action: 'approve' | 'reject', reason?: string) => {
        try {
            setLoading(true);

            if (pendingRequests.length === 0) {
                showAlert('No pending requests to process', 'info');
                return;
            }

            const requestIds = pendingRequests.map(request => request.id.toString()).join(',');
            const endpoint = action === 'approve'
                ? '/timesheet/web-request-approve'
                : '/timesheet/web-request-reject';

            const payload: any = {
                ids: requestIds,
                userId: user_id
            };

            if (action === 'reject') {
                payload.reason = reason || '';
            }

            const response: AxiosResponse<{ IsSuccess: boolean; message?: string }> =
                await api.post(endpoint, payload);

            if (response.data.IsSuccess) {
                showAlert(`All requests ${action}d successfully`, 'success');

                await delay(2000);

                if (timeClock?.start_date && timeClock?.end_date) {
                    await fetchRequests(
                        new Date(timeClock.start_date),
                        new Date(timeClock.end_date)
                    );
                } else {
                    await fetchRequests();
                }
            } else {
                showAlert(response.data.message || `Error ${action}ing all requests`, 'error');
            }
        } catch (error) {
            console.error(`Error ${action}ing all requests:`, error);
            showAlert(`Error ${action}ing all requests`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pendingRequests, fetchRequests, showAlert, timeClock, user_id]);

    const handleApproveRequest = useCallback((requestId: number) => {
        return handleSingleRequest(requestId, 'approve');
    }, [handleSingleRequest]);

    const handleRejectRequest = useCallback((requestId: number) => {
        openRejectDialog(requestId, false);
    }, [openRejectDialog]);

    const handleApproveAll = useCallback(() =>
        handleBulkAction('approve'), [handleBulkAction]);

    const handleRejectAll = useCallback(() => {
        openRejectDialog(null, true);
    }, [openRejectDialog]);

    const confirmRejectRequest = useCallback(() => {
        if (rejectDialog.isBulk) {
            handleBulkAction('reject', rejectDialog.comment);
        } else if (rejectDialog.requestId) {
            handleSingleRequest(rejectDialog.requestId, 'reject', rejectDialog.comment);
        }
        closeRejectDialog();
    }, [handleBulkAction, handleSingleRequest, rejectDialog, closeRejectDialog]);

    // Utility functions - memoized to prevent recreation
    const formatHour = useCallback((val: string | number | null | undefined, isPricework: boolean = false): string => {
        if (val === null || val === undefined) return isPricework ? '--' : '00:00';
        if (isPricework) return '--';

        const str = val.toString().trim();

        // Handle full datetime format (e.g., "02/09/2025 16:00:00")
        if (str.includes(' ') && str.includes('/')) {
            const timePart = str.split(' ')[1];
            if (timePart) {
                const [h, m] = timePart.split(':');
                const hour = parseInt(h) || 0;
                const minute = parseInt(m) || 0;
                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            }
        }

        // Handle time-only format (e.g., "16:30" or "16:30.5")
        if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
            const [h, m] = str.split(':');
            const minutes = parseFloat(m) || 0;
            return `${h.padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;
        }

        // Handle numeric format (e.g., 16.5 for 16:30)
        const num = parseFloat(str);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        return isPricework ? '--' : '00:00';
    }, []);

    const formatDate = useCallback((val: string | number | null | undefined): string => {
        if (!val) return '';
        try {
            const date = DateTime.fromFormat(val.toString(), 'dd MMMM yyyy HH:mm');
            return date.isValid ? date.toFormat('dd/MM/yyyy') : val.toString();
        } catch {
            return val.toString();
        }
    }, []);

    // Effects
    useEffect(() => {
        if (open && timeClock?.start_date && timeClock?.end_date) {
            const start = new Date(timeClock.start_date);
            const end = new Date(timeClock.end_date);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                fetchRequests(start, end);
            }
        }
    }, [open, timeClock?.start_date, timeClock?.end_date, user_id, fetchRequests]);

    // Early return if not open
    if (!open) return null;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
            {/* Header */}
            <Box sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                textAlign: 'center',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'white'
            }}>
                <Typography variant="h6" fontWeight={600} color="text.primary">
                    Requests
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <IconX size={20} />
                </IconButton>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                        <CircularProgress size={40} />
                        <Typography color="text.secondary" sx={{ ml: 2 }}>
                            Loading requests...
                        </Typography>
                    </Box>
                ) : requestList.length === 0 ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 200,
                        textAlign: 'center'
                    }}>
                        <IconClock size={48} color="#9e9e9e" style={{ marginBottom: 16 }} />
                        <Typography color="text.secondary" variant="h6">
                            No requests found
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                            There are no timesheet requests for the selected criteria
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {requestList.map((request) => (
                            <RequestCard
                                key={request.id}
                                request={request}
                                isProcessing={processingIds.has(request.id)}
                                onApprove={handleApproveRequest}
                                onReject={handleRejectRequest}
                                formatHour={formatHour}
                                formatDate={formatDate}
                            />
                        ))}
                    </Stack>
                )}
            </Box>

            {/* Footer Actions */}
            {pendingRequestsCount > 0 && (
                <Box sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'white',
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'flex-end'
                }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleRejectAll}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem'
                        }}
                    >
                        Reject all
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                        onClick={handleApproveAll}
                        disabled={loading}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem'
                        }}
                    >
                        Approve all
                    </Button>
                </Box>
            )}

            {/* Alert Snackbar */}
            <Snackbar
                open={alert.open}
                autoHideDuration={6000}
                onClose={hideAlert}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={hideAlert}
                    severity={alert.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {alert.message}
                </Alert>
            </Snackbar>

            {/* Reject Confirmation Dialog */}
            <Dialog
                open={rejectDialog.open}
                onClose={closeRejectDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1
                    }
                }}
            >
                <DialogContent sx={{ p: 3, pb: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {rejectDialog.isBulk ? 'Reject All Requests' : 'Reject Request'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {rejectDialog.isBulk
                            ? 'Please provide a reason for rejecting all pending requests:'
                            : 'Please provide a reason for rejecting this request:'
                        }
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Reject reason"
                        value={rejectDialog.comment}
                        onChange={handleRejectCommentChange}
                        disabled={rejectDialog.loading}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: '#fafafa',
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
                            '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1,
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'flex-end' }}>
                    <Button
                        onClick={closeRejectDialog}
                        disabled={rejectDialog.loading}
                        sx={{
                            textTransform: 'none',
                            color: '#666',
                            fontWeight: 500,
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.04)'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmRejectRequest}
                        variant="contained"
                        disabled={rejectDialog.loading}
                        startIcon={rejectDialog.loading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 25,
                            px: 4,
                            py: 1,
                            fontWeight: 600,
                            backgroundColor: '#ff4757',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: '#ff3742',
                                boxShadow: '0 2px 8px rgba(255, 71, 87, 0.3)'
                            },
                            '&:disabled': {
                                backgroundColor: '#ffcdd2',
                                color: '#fff'
                            }
                        }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RequestDetails;
