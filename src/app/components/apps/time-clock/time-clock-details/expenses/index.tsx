'use client';

import React, {useEffect, useState} from 'react';
import api from '@/utils/axios';
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Divider,
    Card,
    CardMedia,
} from '@mui/material';
import {
    IconArrowLeft, IconTrash, IconFileText, IconCalendar, IconUser, IconBuilding, IconTag, IconCamper, IconDownload,
    IconX
} from '@tabler/icons-react';
import {Stack} from '@mui/system';
import toast from 'react-hot-toast';

interface ExpensesPageProps {
    expenseId: number;
    onClose: () => void;
    onDataRefresh?: () => Promise<void> | void;
}

interface Attachment {
    id: number;
    expense_id: number;
    image_url: string;
    thumb_url: string;
    type: string;
}

interface ExpenseDetail {
    id: number;
    company_id: number;
    currency: string;
    user_id: number;
    user_name: string;
    user_image: string;
    user_thumb_image: string;
    project_id: number;
    project_name: string;
    team_id: number;
    team_name: string;
    address_id: number;
    address_name: string;
    trade_id: number;
    trade_name: string;
    category_id: number;
    category_name: string;
    car_register_number: string;
    total_amount: number;
    receipt_date: string;
    date_added: string;
    note: string;
    status: number;
    is_requested: boolean;
    is_archive: boolean;
    request_status: string | null;
    timesheet_id: number;
    worklog_id: number | null;
    added_by: number;
    added_by_user_name: string;
    added_by_user_image: string;
    added_by_user_thumb_image: string;
    attachments: Attachment[];
}

export default function Expenses({expenseId, onClose, onDataRefresh}: ExpensesPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [expenseDetail, setExpenseDetail] = useState<ExpenseDetail | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (expenseId > 0) {
            fetchExpenseDetail();
        }
    }, [expenseId]);

    const fetchExpenseDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`expense/detail?expense_id=${expenseId}`);
            if (res.data?.IsSuccess) {
                setExpenseDetail(res.data.info || null);
            } else {
                toast.error(res.data?.message || 'Failed to fetch expense details');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch expense details');
        }
        setLoading(false);
    };

    const handleExpenseDelete = async () => {
        if (!expenseDetail) {
            toast.error('Invalid expense ID');
            setOpenDialog(false);
            return;
        }

        setIsDeleting(true);
        try {
            const response = await api.post('expense/delete', {expense_id: expenseDetail.id});
            if (response.data && typeof response.data === 'object' && response.data.IsSuccess) {
                toast.success(response.data.message || 'Expense deleted successfully');
                onClose(); // Close the detail view after successful deletion
                await onDataRefresh?.();
            } else {
                toast.error(response.data?.message || 'Failed to delete expense');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'An error occurred while deleting the expense');
        } finally {
            setIsDeleting(false);
            setOpenDialog(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!selectedImage) return;

        const imageName = selectedImage.split('?')[0].split('/').pop() || 'expense-attachment.jpg';

        try {
            const response = await fetch(selectedImage);
            if (!response.ok) throw new Error('Failed to fetch attachment');

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = imageName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            const link = document.createElement('a');
            link.href = selectedImage;
            link.download = imageName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    };

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0:
                return {label: 'Pending', color: 'warning'};
            case 1:
                return {label: 'Approved', color: 'success'};
            case 2:
                return {label: 'Rejected', color: 'error'};
            default:
                return {label: 'Unknown', color: 'default'};
        }
    };

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
            >
                <CircularProgress/>
            </Box>
        );
    }

    if (!expenseDetail) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
            >
                <Typography variant="body2" color="text.secondary">
                    No expense details found.
                </Typography>
            </Box>
        );
    }

    // const statusInfo = getStatusLabel(expenseDetail.status);

    return (
        <Box p={2}>
            {/* Header */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={3}
            >
                <Box display="flex" alignItems="center">
                    <IconButton onClick={onClose}>
                        <IconArrowLeft/>
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} ml={1}>
                        Expense Details
                    </Typography>
                </Box>
                {/*<IconButton*/}
                {/*    color="error"*/}
                {/*    aria-label="Delete expense"*/}
                {/*    onClick={() => setOpenDialog(true)}*/}
                {/*>*/}
                {/*    <IconTrash width={20}/>*/}
                {/*</IconButton>*/}
            </Box>

            {/* Status Badge */}
            {/*<Box mb={2}>*/}
            {/*    <Chip*/}
            {/*        label={statusInfo.label}*/}
            {/*        color={statusInfo.color as any}*/}
            {/*        size="small"*/}
            {/*    />*/}
            {/*</Box>*/}

            {/* Amount */}
            <Box mb={3}>
                <Typography variant="h4" fontWeight={700} color="primary">
                    {expenseDetail.currency}{expenseDetail.total_amount.toFixed(2)}
                </Typography>
            </Box>

            <Divider sx={{my: 2}}/>

            {/* Details Grid */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: {xs: 'column', sm: 'row'},
                    gap: 2,
                    mb: 3
                }}
            >
                <Box sx={{flex: 1}}>
                    <Stack spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconCalendar size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Receipt Date
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.receipt_date}
                            </Typography>
                        </Box>

                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconTag size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Category
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.category_name}
                            </Typography>
                        </Box>

                        {(expenseDetail.car_register_number) && (
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                    <IconCamper size={18} color="#666"/>
                                    <Typography variant="caption" color="text.secondary">
                                        Car Register Number
                                    </Typography>
                                </Stack>
                                <Typography variant="body1" fontWeight={500}>
                                    {expenseDetail.car_register_number}
                                </Typography>
                            </Box>
                        )}

                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconBuilding size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Trade
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.trade_name}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <Box sx={{flex: 1}}>
                    <Stack spacing={2}>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconFileText size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Project
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.project_name}
                            </Typography>
                        </Box>
                        
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconUser size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Team
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.team_name}
                            </Typography>
                        </Box>

                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconUser size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Added By
                                </Typography>
                            </Stack>
                            <Typography variant="body1" fontWeight={500}>
                                {expenseDetail.added_by_user_name}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            </Box>

            <Divider sx={{my: 2}}/>

            {/* Address */}
            <Box mb={3}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                    Address
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                    {expenseDetail.address_name}
                </Typography>
            </Box>

            {/* Note */}
            {expenseDetail.note && (
                <Box mb={3}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                        Note
                    </Typography>
                    <Typography variant="body2">
                        {expenseDetail.note}
                    </Typography>
                </Box>
            )}

            {/* Attachments */}
            {expenseDetail.attachments && expenseDetail.attachments.length > 0 && (
                <Box>
                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                        Attachments ({expenseDetail.attachments.length})
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2
                        }}
                    >
                        {expenseDetail.attachments.map((attachment) => (
                            <Box
                                key={attachment.id}
                                sx={{
                                    width: {xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)'}
                                }}
                            >
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': {
                                            boxShadow: 3,
                                        },
                                    }}
                                    onClick={() => setSelectedImage(attachment.image_url)}
                                >
                                    <CardMedia
                                        component="img"
                                        height="140"
                                        image={attachment.thumb_url}
                                        alt={`Attachment ${attachment.id}`}
                                        sx={{objectFit: 'cover'}}
                                    />
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">
                        Are you sure you want to delete this expense? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpenDialog(false)}
                        variant="outlined"
                        color="primary"
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExpenseDelete}
                        variant="outlined"
                        color="error"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <CircularProgress size={20}/> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Image Preview
                    <IconButton
                        aria-label="close"
                        onClick={() => setSelectedImage(null)}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                        }}
                    >
                        <IconX />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {selectedImage && (
                        <Box
                            component="img"
                            src={selectedImage}
                            alt="Full size attachment"
                            sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '70vh',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        startIcon={<IconDownload size={18}/>}
                        onClick={handleDownloadImage}
                    >
                        Download
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
