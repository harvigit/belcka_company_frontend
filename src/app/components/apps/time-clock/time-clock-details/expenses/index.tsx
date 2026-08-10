'use client';

import React, {useEffect, useMemo, useState} from 'react';
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
    Card,
    CardMedia,
    Divider,
    Avatar,
    TextField,
    FormControl,
    Select,
    MenuItem,
    Popover,
    InputAdornment,
} from '@mui/material';
import {
    IconArrowLeft, IconFileText, IconCalendar, IconUser, IconBuilding, IconTag, IconCamper, IconPencil,
} from '@tabler/icons-react';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {Stack} from '@mui/system';
import toast from 'react-hot-toast';
import AttachmentLightbox from '@/app/components/common/AttachmentLightbox';
import {getInitials} from '@/app/components/apps/expenses/list/types';

interface ExpensesPageProps {
    expenseId: number;
    onClose: () => void;
    /** When true, only the attachments section is shown (Expense list page). */
    attachmentsOnly?: boolean;
}

interface Attachment {
    id: number;
    expense_id: number;
    image_url: string;
    thumb_url: string;
    type: string;
}

interface Option {
    id: number;
    name?: string;
    title?: string;
    project_id?: number | null;
    is_transport_category?: boolean;
}

interface ExpenseActivityLog {
    id: number;
    title?: string | null;
    action?: string | null;
    date_time?: string | null;
    expense_user_id?: number | null;
    expense_user_name?: string | null;
    expense_user_image?: string | null;
    expense_user_thumb_image?: string | null;
    action_user_id?: number | null;
    action_user_name?: string | null;
    action_user_image?: string | null;
    action_user_thumb_image?: string | null;
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
    timesheet_status?: string | number | null;
    can_edit?: boolean;
    worklog_id: number | null;
    added_by: number;
    added_by_user_name: string;
    added_by_user_image: string;
    added_by_user_thumb_image: string;
    attachments: Attachment[];
    activity_logs?: ExpenseActivityLog[];
}

const isPdfAttachment = (attachment: Attachment) =>
    attachment.type === 'application/pdf' ||
    attachment.image_url?.toLowerCase().includes('.pdf');

const userAvatar = (
    name?: string | null,
    image?: string | null,
    size = 32,
) => (
    <Avatar
        src={image || undefined}
        alt={name || 'User'}
        sx={{width: size, height: size, fontSize: 12, fontWeight: 600}}
    >
        {getInitials(name)}
    </Avatar>
);

const ActivityLogItem = ({item}: { item: ExpenseActivityLog }) => {
    const expenseUserName = item.expense_user_name || 'Expense user';
    const actionUserName = item.action_user_name || 'System';

    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            {userAvatar(
                expenseUserName,
                item.expense_user_thumb_image || item.expense_user_image,
            )}
            <Box minWidth={0} flex={1}>
                <Typography sx={{fontSize: 14, fontWeight: 700}}>
                    {item.action || item.title || 'Expense updated'}
                </Typography>
                <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                    {item.date_time || '-'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{mt: 1}}>
                    {userAvatar(
                        actionUserName,
                        item.action_user_thumb_image || item.action_user_image,
                        24,
                    )}
                    <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                        Action by: {actionUserName}
                    </Typography>
                </Stack>
            </Box>
        </Stack>
    );
};

const getOptionLabel = (option: Option | null) =>
    option?.name || option?.title || '';

const parseReceiptDate = (value?: string | null) => {
    if (!value) return undefined;

    const parts = value.split('/');
    if (parts.length !== 3) return undefined;

    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return undefined;

    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return undefined;
    }

    return date;
};

const formatReceiptDate = (date?: Date) => {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

const selectMenuProps = {
    anchorOrigin: {
        vertical: 'bottom' as const,
        horizontal: 'right' as const,
    },
    transformOrigin: {
        vertical: 'top' as const,
        horizontal: 'right' as const,
    },
    PaperProps: {
        sx: {
            maxHeight: 320,
            maxWidth: {xs: 'calc(100vw - 32px)', sm: 460},
            '& .MuiMenuItem-root': {
                whiteSpace: 'normal',
                wordBreak: 'break-word',
            },
        },
    },
};

export default function Expenses({expenseId, onClose, attachmentsOnly = false}: ExpensesPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [expenseDetail, setExpenseDetail] = useState<ExpenseDetail | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [receiptDateAnchorEl, setReceiptDateAnchorEl] =
        useState<HTMLElement | null>(null);
    const [projects, setProjects] = useState<Option[]>([]);
    const [addresses, setAddresses] = useState<Option[]>([]);
    const [categories, setCategories] = useState<Option[]>([]);
    const [form, setForm] = useState({
        total_amount: '',
        project_id: '',
        address_id: '',
        expense_category_id: '',
        receipt_date: '',
        note: '',
        car_register_number: '',
    });

    useEffect(() => {
        if (expenseId > 0) {
            fetchExpenseDetail();
        }
    }, [expenseId]);

    useEffect(() => {
        if (!attachmentsOnly) {
            fetchFilterOptions();
        }
    }, [attachmentsOnly]);

    const setFormFromDetail = (detail: ExpenseDetail) => {
        setForm({
            total_amount: String(detail.total_amount ?? ''),
            project_id: String(detail.project_id ?? ''),
            address_id: String(detail.address_id ?? ''),
            expense_category_id: String(detail.category_id ?? ''),
            receipt_date: detail.receipt_date || '',
            note: detail.note || '',
            car_register_number: detail.car_register_number || '',
        });
    };

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('expense/list-filters');
            const info = res.data?.info || {};
            setProjects(info.projects || []);
            setAddresses(info.addresses || []);
            setCategories(info.categories || []);
        } catch (error) {
            console.error('Failed to load expense filter options', error);
        }
    };

    const fetchExpenseDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`expense/detail?expense_id=${expenseId}`);
            if (res.data?.IsSuccess) {
                const detail = res.data.info || null;
                setExpenseDetail(detail);
                if (detail) setFormFromDetail(detail);
            } else {
                toast.error(res.data?.message || 'Failed to fetch expense details');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch expense details');
        }
        setLoading(false);
    };

    const canEdit = Boolean(expenseDetail?.can_edit) && !attachmentsOnly;
    const selectedCategory = categories.find(
        (category) => String(category.id) === String(form.expense_category_id),
    );
    const isTransportCategory = Boolean(selectedCategory?.is_transport_category);
    const filteredAddresses = addresses.filter(
        (address) =>
            !form.project_id ||
            !address.project_id ||
            String(address.project_id) === String(form.project_id),
    );
    const receiptDatePickerOpen = Boolean(receiptDateAnchorEl);

    const handleSaveExpense = async () => {
        if (!expenseDetail || !canEdit) return;

        if (!form.project_id || !form.address_id || !form.expense_category_id) {
            toast.error('Project, address and category are required');
            return;
        }
        if (isTransportCategory && !form.car_register_number.trim()) {
            toast.error('Please enter the car registration number');
            return;
        }

        setSaving(true);
        try {
            const payload = new FormData();
            payload.append('expense_id', String(expenseDetail.id));
            payload.append('user_id', String(expenseDetail.user_id));
            payload.append('project_id', form.project_id);
            payload.append('address_id', form.address_id);
            payload.append('expense_category_id', form.expense_category_id);
            payload.append('receipt_date', form.receipt_date);
            payload.append('total_amount', form.total_amount);
            payload.append('note', form.note);
            payload.append(
                'car_register_number',
                isTransportCategory ? form.car_register_number.trim() : '',
            );

            const res = await api.post('expense/edit-expense', payload, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            toast.success(res.data?.message || 'Expense updated successfully');
            setEditing(false);
            await fetchExpenseDetail();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update expense');
        } finally {
            setSaving(false);
        }
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
                onClose();
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

    const imageAttachments = useMemo(
        () =>
            (expenseDetail?.attachments || []).filter(
                (attachment) => !isPdfAttachment(attachment),
            ),
        [expenseDetail?.attachments],
    );

    const lightboxSlides = useMemo(
        () =>
            imageAttachments.map((attachment) => {
                const filename =
                    attachment.image_url.split('?')[0].split('/').pop() ||
                    `expense-attachment-${attachment.id}.jpg`;
                return {
                    src: attachment.image_url,
                    alt: `Attachment ${attachment.id}`,
                    downloadFilename: filename,
                };
            }),
        [imageAttachments],
    );
    const activityLogs = expenseDetail?.activity_logs || [];

    const handleCancelEdit = () => {
        if (expenseDetail) setFormFromDetail(expenseDetail);
        setEditing(false);
        setReceiptDateAnchorEl(null);
    };

    const handleBackClick = () => {
        if (editing) {
            handleCancelEdit();
            return;
        }

        onClose();
    };

    const openAttachment = (attachment: Attachment) => {
        if (isPdfAttachment(attachment)) {
            window.open(attachment.image_url, '_blank');
            return;
        }

        const index = imageAttachments.findIndex((item) => item.id === attachment.id);
        if (index < 0) return;
        setLightboxIndex(index);
        setLightboxOpen(true);
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

    return (
        <Box
            p={2}
            sx={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                bgcolor: '#fff',
            }}
        >
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={3}
            >
                <Box display="flex" alignItems="center">
                    <IconButton onClick={handleBackClick}>
                        <IconArrowLeft/>
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} ml={1}>
                        {editing ? 'Edit Expense' : attachmentsOnly ? 'Attachments' : 'Expense Details'}
                    </Typography>
                </Box>
                {!attachmentsOnly && canEdit && !editing && (
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconPencil size={16}/>}
                        onClick={() => setEditing(true)}
                    >
                        Edit
                    </Button>
                )}
            </Box>

            {!attachmentsOnly && (
            <Box mb={3}>
                {editing ? (
                    <TextField
                        label="Amount"
                        type="number"
                        size="small"
                        fullWidth
                        value={form.total_amount}
                        onChange={(event) =>
                            setForm((prev) => ({...prev, total_amount: event.target.value}))
                        }
                        inputProps={{
                            inputMode: 'decimal',
                            style: { textAlign: 'left' },
                        }}
                    />
                ) : (
                    <Typography variant="h4" fontWeight={700} color="primary">
                        {expenseDetail.currency}{expenseDetail.total_amount.toFixed(2)}
                    </Typography>
                )}
            </Box>
            )}

            {!attachmentsOnly && <Divider sx={{my: 2}}/>}

            {!attachmentsOnly && (
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
                            {editing ? (
                                <Box>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={form.receipt_date}
                                        placeholder="dd/mm/yyyy"
                                        onClick={(event) => setReceiptDateAnchorEl(event.currentTarget)}
                                        InputProps={{
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconCalendar size={18}/>
                                                </InputAdornment>
                                            ),
                                        }}
                                        inputProps={{
                                            style: {textAlign: 'left', cursor: 'pointer'},
                                        }}
                                        sx={{
                                            cursor: 'pointer',
                                            '& .MuiInputBase-root': {cursor: 'pointer'},
                                        }}
                                    />
                                    <Popover
                                        open={receiptDatePickerOpen}
                                        anchorEl={receiptDateAnchorEl}
                                        onClose={() => setReceiptDateAnchorEl(null)}
                                        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                                        transformOrigin={{vertical: 'top', horizontal: 'left'}}
                                    >
                                        <Box p={2}>
                                            <DayPicker
                                                mode="single"
                                                selected={parseReceiptDate(form.receipt_date)}
                                                onSelect={(selectedDate) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        receipt_date: formatReceiptDate(selectedDate),
                                                    }));
                                                    setReceiptDateAnchorEl(null);
                                                }}
                                                disabled={{after: new Date()}}
                                            />
                                        </Box>
                                    </Popover>
                                </Box>
                            ) : (
                                <Typography variant="body1" fontWeight={500}>
                                    {expenseDetail.receipt_date}
                                </Typography>
                            )}
                        </Box>

                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <IconTag size={18} color="#666"/>
                                <Typography variant="caption" color="text.secondary">
                                    Category
                                </Typography>
                            </Stack>
                            {editing ? (
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={form.expense_category_id}
                                        MenuProps={selectMenuProps}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                expense_category_id: String(event.target.value),
                                                car_register_number: categories.find((category) => String(category.id) === String(event.target.value))?.is_transport_category
                                                    ? prev.car_register_number
                                                    : '',
                                            }))
                                        }
                                    >
                                        {categories.map((category) => (
                                            <MenuItem key={category.id} value={String(category.id)}>
                                                {getOptionLabel(category)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Typography variant="body1" fontWeight={500}>
                                    {expenseDetail.category_name}
                                </Typography>
                            )}
                        </Box>

                        {(editing ? isTransportCategory : expenseDetail.car_register_number) && (
                            <Box>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                    <IconCamper size={18} color="#666"/>
                                    <Typography variant="caption" color="text.secondary">
                                        Car Register Number
                                    </Typography>
                                </Stack>
                                {editing ? (
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={form.car_register_number}
                                        onChange={(event) =>
                                            setForm((prev) => ({...prev, car_register_number: event.target.value}))
                                        }
                                        inputProps={{
                                            style: { textAlign: 'left' },
                                        }}
                                    />
                                ) : (
                                    <Typography variant="body1" fontWeight={500}>
                                        {expenseDetail.car_register_number}
                                    </Typography>
                                )}
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
                            {editing ? (
                                <FormControl fullWidth size="small">
                                    <Select
                                        value={form.project_id}
                                        MenuProps={selectMenuProps}
                                        onChange={(event) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                project_id: String(event.target.value),
                                                address_id: '',
                                            }))
                                        }
                                    >
                                        {projects.map((project) => (
                                            <MenuItem key={project.id} value={String(project.id)}>
                                                {getOptionLabel(project)}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Typography variant="body1" fontWeight={500}>
                                    {expenseDetail.project_name}
                                </Typography>
                            )}
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
            )}

            {!attachmentsOnly && <Divider sx={{my: 2}}/>}

            {!attachmentsOnly && (
            <Box mb={3}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                    Address
                </Typography>
                {editing ? (
                    <FormControl fullWidth size="small">
                        <Select
                            value={form.address_id}
                            MenuProps={selectMenuProps}
                            onChange={(event) =>
                                setForm((prev) => ({...prev, address_id: String(event.target.value)}))
                            }
                        >
                            {filteredAddresses.map((address) => (
                                <MenuItem key={address.id} value={String(address.id)}>
                                    {getOptionLabel(address)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body1" fontWeight={500}>
                        {expenseDetail.address_name}
                    </Typography>
                )}
            </Box>
            )}

            {!attachmentsOnly && (expenseDetail.note || editing) && (
                <Box mb={3}>
                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                        Note
                    </Typography>
                    {editing ? (
                        <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={3}
                            value={form.note}
                            onChange={(event) =>
                                setForm((prev) => ({...prev, note: event.target.value}))
                            }
                        />
                    ) : (
                        <Typography variant="body2">
                            {expenseDetail.note}
                        </Typography>
                    )}
                </Box>
            )}

            {editing && (
                <Stack direction="row" spacing={1.5} mb={3}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveExpense}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        color="inherit"
                        disabled={saving}
                        onClick={handleCancelEdit}
                    >
                        Cancel
                    </Button>
                </Stack>
            )}

            {expenseDetail.attachments && expenseDetail.attachments.length > 0 ? (
                <Box>
                    {!attachmentsOnly && (
                    <Typography variant="caption" color="text.secondary" mb={1} display="block">
                        Attachments ({expenseDetail.attachments.length})
                    </Typography>
                    )}
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
                                    onClick={() => openAttachment(attachment)}
                                >
                                    <CardMedia
                                        component="img"
                                        height="140"
                                        image={isPdfAttachment(attachment) ? attachment.thumb_url : attachment.image_url}
                                        alt={`Attachment ${attachment.id}`}
                                        sx={{objectFit: 'cover'}}
                                    />
                                </Card>
                            </Box>
                        ))}
                    </Box>
                </Box>
            ) : attachmentsOnly ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                    No attachments found
                </Typography>
            ) : null}

            {!attachmentsOnly && (
                <>
                    <Divider sx={{my: 2}}/>

                    <Box mb={3}>
                        <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
                            Activity Log
                        </Typography>
                        {activityLogs.length > 0 ? (
                            <Stack spacing={2.25}>
                                {activityLogs.map((item) => (
                                    <ActivityLogItem key={item.id} item={item}/>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No activity found
                            </Typography>
                        )}
                    </Box>
                </>
            )}

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

            <AttachmentLightbox
                open={lightboxOpen}
                index={lightboxIndex}
                slides={lightboxSlides}
                onClose={() => setLightboxOpen(false)}
            />
        </Box>
    );
}
