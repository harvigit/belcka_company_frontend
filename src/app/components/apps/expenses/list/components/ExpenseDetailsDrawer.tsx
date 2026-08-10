'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    FormControl,
    IconButton,
    InputAdornment,
    MenuItem,
    Popover,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    IconCheck,
    IconCalendar,
    IconExternalLink,
    IconPencil,
    IconSearch,
    IconX,
} from '@tabler/icons-react';
import {DayPicker} from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {
    ExpenseActivityLog,
    ExpenseDetail,
    ExpenseListItem,
    capitalizeExpenseValue,
    getInitials,
    normalizeExpenseStatus,
} from '../types';
import ExpenseStatusBadge from './ExpenseStatusBadge';

type Option = {
    id: number;
    name?: string;
    title?: string;
    project_id?: number | null;
    is_transport_category?: boolean;
};

type Props = {
    open: boolean;
    onClose: () => void;
    expense: ExpenseListItem | null;
    projects?: Option[];
    addresses?: Option[];
    categories?: Option[];
    onViewReceipt?: (id: number) => void;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onSaved?: () => void | Promise<void>;
};

const formatAmount = (currency: string, amount: number) =>
    `${currency}${Number(amount || 0).toFixed(2)}`;

const parseReceiptDate = (value?: string | null) => {
    if (!value) return undefined;
    const parts = value.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return undefined;
    return new Date(year, month - 1, day);
};

const formatReceiptDate = (date?: Date) => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getOptionLabel = (option: Option | null) =>
    option?.name || option?.title || '';

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

const EditFieldRow = ({label, children, alignItems = 'center'}: { label: string; children: React.ReactNode; alignItems?: 'center' | 'flex-start'; }) => (
    <Box
        display="grid"
        gridTemplateColumns={{xs: '1fr', sm: '150px 1fr'}}
        alignItems={alignItems}
        gap={1.5}
    >
        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
            {label}
        </Typography>
        {children}
    </Box>
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
                <Typography sx={{fontSize: 12, color: 'text.secondary', mt: 0.25}}>
                    Action by: {actionUserName}
                </Typography>
            </Box>
        </Stack>
    );
};

const ExpenseDetailsDrawer = ({open, onClose, expense, projects = [], addresses = [], categories = [], onViewReceipt, onApprove, onReject, onSaved}: Props) => {
    const [detail, setDetail] = useState<ExpenseDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [addressSearch, setAddressSearch] = useState('');
    const [receiptDateAnchorEl, setReceiptDateAnchorEl] =
        useState<HTMLElement | null>(null);
    const [form, setForm] = useState({
        total_amount: '',
        project_id: '',
        address_id: '',
        expense_category_id: '',
        receipt_date: '',
        note: '',
        car_register_number: '',
    });

    const selectedCategory = useMemo(
        () => categories.find((item) => String(item.id) === String(form.expense_category_id)) || null,
        [categories, form.expense_category_id],
    );
    const isTransportCategory = selectedCategory?.is_transport_category === true;
    const filteredAddresses = useMemo(() => {
        if (!form.project_id) return [];

        return addresses.filter((address) => {
            const matchesProject = Number(address.project_id) === Number(form.project_id);
            const matchesSearch = getOptionLabel(address)
                .toLowerCase()
                .includes(addressSearch.trim().toLowerCase());
            return matchesProject && matchesSearch;
        });
    }, [addresses, addressSearch, form.project_id]);

    const activityLogs = detail?.activity_logs || [];
    const status = normalizeExpenseStatus(detail?.status_text || detail?.status) || expense?.status || 'pending';
    const currency = detail?.currency || expense?.currency || '£';
    const amount = Number(detail?.total_amount ?? expense?.amount ?? 0);
    const hasReceipt = Number(detail?.attachments?.length || expense?.attachmentCount || 0) > 0;
    const canReject = Boolean(detail?.can_reject ?? expense?.canReject);
    const showApproveButton = status === 'pending' || status === 'rejected';
    const showRejectButton = status === 'pending' || (status === 'sent' && canReject);
    const receiptDatePickerOpen = Boolean(receiptDateAnchorEl);

    const setFormFromDetail = (item: ExpenseDetail) => {
        setForm({
            total_amount: String(item.total_amount ?? ''),
            project_id: String(item.project_id ?? ''),
            address_id: String(item.address_id ?? ''),
            expense_category_id: String(item.category_id ?? ''),
            receipt_date: item.receipt_date || '',
            note: item.note || '',
            car_register_number: item.car_register_number || '',
        });
    };

    const handleCancelEdit = () => {
        if (detail) setFormFromDetail(detail);
        setEditing(false);
        setAddressSearch('');
        setReceiptDateAnchorEl(null);
    };

    const handleClose = () => {
        if (editing) {
            handleCancelEdit();
            return;
        }

        onClose();
    };

    const loadDetail = async () => {
        if (!expense?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`expense/detail?expense_id=${expense.id}`);
            const info = res.data?.info || null;
            setDetail(info);
            if (info) setFormFromDetail(info);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load expense details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setDetail(null);
            setEditing(false);
            setAddressSearch('');
            setReceiptDateAnchorEl(null);
            return;
        }
        loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, expense?.id]);

    const handleSave = async () => {
        if (!detail && !expense) return;
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
            payload.append('expense_id', String(detail?.id || expense?.id));
            payload.append('user_id', String(detail?.user_id || ''));
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
            await loadDetail();
            await onSaved?.();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update expense');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: 520,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: {xs: '100%', sm: 520},
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#fff',
                },
            }}
        >
            {!expense ? null : (
                <>
                    <Box
                        sx={{
                            px: 2.5,
                            py: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography sx={{fontSize: 18, fontWeight: 700}}>
                            Expense Details
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    if (editing) {
                                        handleCancelEdit();
                                        return;
                                    }
                                    setEditing(true);
                                }}
                                aria-label="Edit expense"
                            >
                                <IconPencil size={20}/>
                            </IconButton>
                            <IconButton size="small" onClick={handleClose} aria-label={editing ? 'Cancel editing' : 'Close'}>
                                <IconX size={20}/>
                            </IconButton>
                        </Stack>
                    </Box>

                    {loading ? (
                        <Box sx={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <CircularProgress size={26}/>
                        </Box>
                    ) : (
                        <Box sx={{flex: 1, overflow: 'auto', px: 2.5, py: 2.5}}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                                <Typography sx={{fontSize: 28, fontWeight: 700, lineHeight: 1.2}}>
                                    {formatAmount(currency, amount)}
                                </Typography>
                                <ExpenseStatusBadge status={status}/>
                            </Stack>

                            <Stack spacing={2.25}>
                                <Box>
                                    <Typography sx={{fontSize: 12, color: 'text.secondary', mb: 0.75}}>
                                        Submitted by
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1.25}>
                                        {userAvatar(
                                            detail?.user_name || expense.submittedBy.name,
                                            detail?.user_thumb_image || detail?.user_image || expense.submittedBy.avatarUrl,
                                            36,
                                        )}
                                        <Box>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.user_name || expense.submittedBy.name}
                                            </Typography>
                                            <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                                                {detail?.trade_name || expense.submittedBy.role}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>

                                {editing ? (
                                    <Stack spacing={2}>
                                        <EditFieldRow label="Amount">
                                            <TextField
                                                value={form.total_amount}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                                                        setForm((prev) => ({...prev, total_amount: value}));
                                                    }
                                                }}
                                                fullWidth
                                                size="small"
                                                placeholder="0.00"
                                                inputProps={{
                                                    inputMode: 'decimal',
                                                    style: {textAlign: 'left'},
                                                }}
                                            />
                                        </EditFieldRow>

                                        <EditFieldRow label="Project">
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={form.project_id}
                                                    displayEmpty
                                                    MenuProps={selectMenuProps}
                                                    onChange={(e) => {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            project_id: String(e.target.value),
                                                            address_id: '',
                                                        }));
                                                        setAddressSearch('');
                                                    }}
                                                    renderValue={(selected) => {
                                                        if (!selected) {
                                                            return <Typography color="#999">Select Project</Typography>;
                                                        }
                                                        const project = projects.find((item) => item.id === Number(selected));
                                                        return getOptionLabel(project || null);
                                                    }}
                                                >
                                                    {projects.map((project) => (
                                                        <MenuItem key={project.id} value={String(project.id)}>
                                                            {getOptionLabel(project)}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </EditFieldRow>

                                        <EditFieldRow label="Select address">
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={form.address_id}
                                                    displayEmpty
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            address_id: String(e.target.value)
                                                        }))
                                                    }
                                                    MenuProps={{
                                                        ...selectMenuProps,
                                                        autoFocus: false,
                                                    }}
                                                    renderValue={(selected) => {
                                                        if (!selected) {
                                                            return <Typography color="#999">Select Address</Typography>;
                                                        }
                                                        const address = addresses.find((item) => item.id === Number(selected));
                                                        return getOptionLabel(address || null);
                                                    }}
                                                >
                                                    <Box px={2} py={1.5} position="sticky" top={0} bgcolor="white"
                                                         zIndex={1}>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            placeholder="Search address"
                                                            value={addressSearch}
                                                            onChange={(e) => setAddressSearch(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <IconSearch size={18} color="#999"/>
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                        />
                                                    </Box>
                                                    {filteredAddresses.length === 0 ? (
                                                        <MenuItem disabled>
                                                            <Typography color="text.secondary">
                                                                No address found
                                                            </Typography>
                                                        </MenuItem>
                                                    ) : (
                                                        filteredAddresses.map((address) => (
                                                            <MenuItem key={address.id} value={String(address.id)}>
                                                                {getOptionLabel(address)}
                                                            </MenuItem>
                                                        ))
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </EditFieldRow>

                                        <EditFieldRow label="Category">
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={form.expense_category_id}
                                                    displayEmpty
                                                    MenuProps={selectMenuProps}
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            expense_category_id: String(e.target.value),
                                                            car_register_number: '',
                                                        }))
                                                    }
                                                    renderValue={(selected) => {
                                                        if (!selected) {
                                                            return <Typography color="#999">Select
                                                                Category</Typography>;
                                                        }
                                                        const category = categories.find((item) => item.id === Number(selected));
                                                        return capitalizeExpenseValue(getOptionLabel(category || null));
                                                    }}
                                                >
                                                    {categories.map((category) => (
                                                        <MenuItem key={category.id} value={String(category.id)}>
                                                            {capitalizeExpenseValue(getOptionLabel(category))}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </EditFieldRow>

                                        <EditFieldRow label="Date of receipt">
                                            <Box>
                                                <TextField
                                                    value={form.receipt_date}
                                                    onClick={(event) => setReceiptDateAnchorEl(event.currentTarget)}
                                                    fullWidth
                                                    size="small"
                                                    placeholder="dd/mm/yyyy"
                                                    InputProps={{
                                                        readOnly: true,
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <IconCalendar size={18}/>
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '& .MuiInputBase-input': {
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                        },
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
                                        </EditFieldRow>

                                        <EditFieldRow label="Notes" alignItems="flex-start">
                                            <TextField
                                                value={form.note}
                                                onChange={(e) => setForm((prev) => ({...prev, note: e.target.value}))}
                                                fullWidth
                                                multiline
                                                minRows={3}
                                                size="small"
                                                placeholder="Notes about the expense..."
                                                sx={{
                                                    padding: 0,
                                                    '& .MuiInputBase-input': {textAlign: 'left'},
                                                }}
                                            />
                                        </EditFieldRow>

                                        {isTransportCategory && (
                                            <EditFieldRow label="Car Register Number">
                                                <TextField
                                                    value={form.car_register_number}
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            car_register_number: e.target.value,
                                                        }))
                                                    }
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{
                                                        inputMode: 'decimal',
                                                        style: {textAlign: 'left'},
                                                    }}
                                                    placeholder="Car registration number"
                                                />
                                            </EditFieldRow>
                                        )}
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                onClick={handleSave}
                                                disabled={saving}
                                                startIcon={saving ? <CircularProgress size={14}/> :
                                                    <IconCheck size={15}/>}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                color="inherit"
                                                onClick={handleCancelEdit}
                                            >
                                                Cancel
                                            </Button>
                                        </Stack>
                                    </Stack>
                                ) : (
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}>Project</Typography>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.project_name || expense.project}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}>Address</Typography>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.address_name || expense.address}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}>Category</Typography>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {capitalizeExpenseValue(detail?.category_name || expense.category)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography sx={{fontSize: 12, color: 'text.secondary'}}>Receipt
                                                Date</Typography>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.receipt_date || expense.receiptDate || '-'}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}>Description</Typography>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.note || expense.description}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}>Receipt</Typography>
                                            {hasReceipt ? (
                                                <Box
                                                    component="button"
                                                    type="button"
                                                    onClick={() => onViewReceipt?.(expense.id)}
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        border: 'none',
                                                        background: 'none',
                                                        p: 0,
                                                        cursor: 'pointer',
                                                        color: 'primary.main',
                                                        fontSize: 14,
                                                        fontWeight: 500,
                                                        fontFamily: 'inherit',
                                                        '&:hover': {textDecoration: 'underline'},
                                                    }}
                                                >
                                                    View receipt
                                                    <IconExternalLink size={14}/>
                                                </Box>
                                            ) : (
                                                <Typography sx={{fontSize: 14, color: 'text.secondary'}}>
                                                    No receipt
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                )}
                            </Stack>

                            <Divider sx={{my: 2.5}}/>

                            <Typography sx={{fontSize: 15, fontWeight: 700, mb: 2}}>
                                Activity Log
                            </Typography>
                            <Stack spacing={2.25}>
                                {activityLogs.length > 0 ? (
                                    activityLogs.map((item) => <ActivityLogItem key={item.id} item={item}/>)
                                ) : (
                                    <Typography sx={{fontSize: 14, color: 'text.secondary'}}>
                                        No activity found
                                    </Typography>
                                )}
                            </Stack>
                        </Box>
                    )}

                    {(showApproveButton || showRejectButton) && (
                        <Box
                            sx={{
                                px: 2.5,
                                py: 2,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                gap: 1.5,
                            }}
                        >
                            {showApproveButton && (
                                <Button
                                    fullWidth
                                    startIcon={<IconCheck size={15}/>}
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    onClick={() => onApprove?.(expense.id)}
                                >
                                    Approve
                                </Button>
                            )}
                            {showRejectButton && (
                                <Button
                                    fullWidth
                                    startIcon={<IconX size={15}/>}
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => onReject?.(expense.id)}
                                >
                                    Reject
                                </Button>
                            )}
                        </Box>
                    )}
                </>
            )}
        </Drawer>
    );
};

export default ExpenseDetailsDrawer;
