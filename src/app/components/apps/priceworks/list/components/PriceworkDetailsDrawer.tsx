'use client';

import React, {useEffect, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {IconExternalLink, IconPencil, IconX} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {
    PriceworkActivityLog,
    PriceworkApiRow,
    PriceworkDetail,
    normalizePriceworkStatus,
} from '../types';
import PriceworkStatusBadge from './PriceworkStatusBadge';

type Props = {
    open: boolean;
    onClose: () => void;
    pricework: PriceworkApiRow | null;
    onViewAttachments?: () => void;
    onEdit?: (pricework: PriceworkApiRow | PriceworkDetail) => void;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onSaved?: () => void | Promise<void>;
};

const formatAmount = (currency: string, amount: number) =>
    `${currency}${Number(amount || 0).toFixed(2)}`;

const userAvatar = (name?: string | null, image?: string | null, size = 32) => (
    <Avatar
        src={image || '/images/users/user.png'}
        alt={name || 'User'}
        sx={{width: size, height: size}}
    />
);

const ActivityLogItem = ({item}: {item: PriceworkActivityLog}) => {
    const priceworkUserName = item.pricework_user_name || 'User';
    const actionUserName = item.action_user_name || 'System';
    const rejectNote = typeof item.new_data?.reject_note === 'string'
        ? item.new_data.reject_note.trim()
        : '';

    return (
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
            {userAvatar(
                priceworkUserName,
                item.pricework_user_thumb_image || item.pricework_user_image,
            )}
            <Box minWidth={0} flex={1}>
                <Typography sx={{fontSize: 14, fontWeight: 700}}>
                    {item.action || item.title || 'Pricework updated'}
                </Typography>
                <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                    {item.date_time || '-'}
                </Typography>
                <Typography sx={{fontSize: 12, color: 'text.secondary', mt: 0.25}}>
                    Action by: {actionUserName}
                </Typography>
                {rejectNote && (
                    <Typography sx={{fontSize: 12, color: 'text.secondary', mt: 0.5}}>
                        Note: {rejectNote}
                    </Typography>
                )}
            </Box>
        </Stack>
    );
};

const FieldBlock = ({label, value}: {label: string; value?: string | number | null}) => (
    <Box>
        <Typography sx={{fontSize: 12, color: 'text.secondary'}}>{label}</Typography>
        <Typography sx={{fontSize: 14, fontWeight: 700}}>{value || '—'}</Typography>
    </Box>
);

const editableValueSx = (canEdit: boolean) => ({
    fontSize: 14,
    fontWeight: 700,
    px: 0.75,
    py: 0.25,
    borderRadius: 1,
    border: '1px solid transparent',
    display: 'inline-block',
    cursor: canEdit ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...(canEdit
        ? {
            '&:hover': {
                border: '1px solid #1976d2',
            },
        }
        : {}),
});

const PriceworkDetailsDrawer = ({
    open,
    onClose,
    pricework,
    onViewAttachments,
    onEdit,
    onApprove,
    onReject,
    onSaved,
}: Props) => {
    const [detail, setDetail] = useState<PriceworkDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingField, setEditingField] = useState<'amount_per_unit' | 'work_complete' | null>(null);
    const [fieldValue, setFieldValue] = useState('');
    const [savingField, setSavingField] = useState(false);

    const loadDetail = async () => {
        if (!pricework?.id) return;
        setLoading(true);
        try {
            const isTimesheetLight =
                pricework.record_type === 'timesheet_light'
                || pricework.source_type === 'user_checklog'
                || Boolean(pricework.user_checklog_id);
            const params = isTimesheetLight
                ? {
                    pricework_id: pricework.timesheet_light_id ?? pricework.timesheet_id ?? pricework.id,
                    record_type: 'timesheet_light',
                    checklog_id: pricework.user_checklog_id ?? pricework.id,
                }
                : {pricework_id: pricework.pricework_id ?? pricework.id};
            const res = await api.get('pricework/detail', {params});
            setDetail(res.data?.info || null);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load pricework details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setDetail(null);
            setEditingField(null);
            setFieldValue('');
            return;
        }
        void loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, pricework?.id, pricework?.user_checklog_id]);

    const status = normalizePriceworkStatus(
        detail?.status_text || detail?.status || pricework?.status,
    );
    const currency = detail?.currency || pricework?.currency || '£';
    const amountPerUnit = Number(
        detail?.amount_per_unit ?? pricework?.amount_per_unit ?? 0,
    );
    const workComplete = Number(
        detail?.work_complete ?? pricework?.work_complete ?? 0,
    );
    const amount = Number(
        detail?.pricework_amount ?? pricework?.pricework_amount ?? amountPerUnit * workComplete,
    );
    const isTimesheetLightRow =
        pricework?.record_type === 'timesheet_light'
        || pricework?.source_type === 'user_checklog'
        || Boolean(pricework?.user_checklog_id);
    const canEditAmounts =
        status !== 'sent' &&
        (isTimesheetLightRow ? Boolean(pricework?.user_checklog_id) : Boolean(pricework?.id));
    const detailAttachmentCount = Number(
        (detail?.before_attachments?.length || 0)
        + (detail?.after_attachments?.length || 0)
        || detail?.attachments?.length
        || detail?.attachment_count
        || 0,
    );
    const listAttachmentCount = Number(
        (pricework?.before_attachments?.length || 0)
        + (pricework?.after_attachments?.length || 0)
        || pricework?.attachments?.length
        || pricework?.attachment_count
        || 0,
    );
    const attachmentCount = detailAttachmentCount > 0 ? detailAttachmentCount : listAttachmentCount;
    const hasAttachments = attachmentCount > 0;
    const activityLogs = detail?.activity_logs || [];
    const showEditButton = Boolean(pricework?.id) && !isTimesheetLightRow;
    const showApproveButton = status === 'pending' || status === 'rejected';
    const showRejectButton = status === 'pending' || status === 'approved' || status === 'sent';

    const startEditField = (field: 'amount_per_unit' | 'work_complete') => {
        if (!canEditAmounts || savingField) return;
        setEditingField(field);
        setFieldValue(
            String(field === 'amount_per_unit' ? amountPerUnit : workComplete),
        );
    };

    const cancelEditField = () => {
        setEditingField(null);
        setFieldValue('');
    };

    const saveAmountField = async (field: 'amount_per_unit' | 'work_complete') => {
        if (!pricework || !canEditAmounts) {
            cancelEditField();
            return;
        }

        const nextValue = Number(fieldValue);
        if (!Number.isFinite(nextValue) || nextValue < 0) {
            toast.error(
                field === 'amount_per_unit'
                    ? 'Please enter a valid amount per unit.'
                    : 'Please enter a valid work complete value.',
            );
            return;
        }

        const nextAmountPerUnit =
            field === 'amount_per_unit' ? nextValue : amountPerUnit;
        const nextWorkComplete =
            field === 'work_complete' ? nextValue : workComplete;

        if (
            Math.abs(nextAmountPerUnit - amountPerUnit) < 0.00001 &&
            Math.abs(nextWorkComplete - workComplete) < 0.00001
        ) {
            cancelEditField();
            return;
        }

        const isChecklogRow =
            pricework.record_type === 'timesheet_light' && Boolean(pricework.user_checklog_id);
        const payload = isChecklogRow
            ? {
                record_type: 'timesheet_light',
                user_checklog_id: pricework.user_checklog_id,
                amount_per_unit: nextAmountPerUnit,
                work_complete: nextWorkComplete,
            }
            : {
                record_type: 'pricework',
                pricework_id: pricework.pricework_id ?? pricework.id,
                amount_per_unit: nextAmountPerUnit,
                work_complete: nextWorkComplete,
            };

        setSavingField(true);
        try {
            const res = await api.post('/pricework/update-amounts', payload);
            toast.success(res.data?.message || 'Pricework amount updated successfully');
            setEditingField(null);
            setFieldValue('');
            const info = res.data?.info || {};
            setDetail((prev) =>
                prev
                    ? {
                        ...prev,
                        amount_per_unit: Number(info.amount_per_unit ?? nextAmountPerUnit),
                        work_complete: Number(info.work_complete ?? nextWorkComplete),
                        pricework_amount: Number(
                            info.pricework_amount ?? nextAmountPerUnit * nextWorkComplete,
                        ),
                    }
                    : prev,
            );
            await onSaved?.();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update pricework amount');
        } finally {
            setSavingField(false);
        }
    };

    const renderEditableNumberField = (
        label: string,
        field: 'amount_per_unit' | 'work_complete',
        displayValue: string | number,
        withCurrency = false,
    ) => (
        <Box>
            <Typography sx={{fontSize: 12, color: 'text.secondary'}}>{label}</Typography>
            {savingField && editingField === field ? (
                <CircularProgress size={16} sx={{mt: 0.5}}/>
            ) : editingField === field ? (
                <TextField
                    value={fieldValue}
                    autoFocus
                    size="small"
                    variant="standard"
                    inputMode="decimal"
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                            setFieldValue(value);
                        }
                    }}
                    onBlur={() => {
                        if (fieldValue === '') {
                            cancelEditField();
                            return;
                        }
                        void saveAmountField(field);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (fieldValue === '') return;
                            void saveAmountField(field);
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditField();
                        }
                    }}
                    InputProps={
                        withCurrency
                            ? {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                            {currency}
                                        </Typography>
                                    </InputAdornment>
                                ),
                            }
                            : undefined
                    }
                    sx={{mt: 0.25, maxWidth: 160}}
                />
            ) : (
                <Typography
                    sx={editableValueSx(canEditAmounts)}
                    onClick={() => startEditField(field)}
                >
                    {displayValue}
                </Typography>
            )}
        </Box>
    );

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
            {!pricework ? null : (
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
                            Pricework Details
                        </Typography>

                        <Stack direction="row" spacing={1}>
                            {showEditButton && (
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        onEdit?.({
                                            ...pricework,
                                            ...detail,
                                        })
                                    }
                                    aria-label="Edit pricework"
                                >
                                    <IconPencil size={20}/>
                                </IconButton>
                            )}
                            <IconButton size="small" onClick={onClose} aria-label="Close">
                                <IconX size={20} />
                            </IconButton>
                        </Stack>
                    </Box>

                    {loading ? (
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CircularProgress size={26} />
                        </Box>
                    ) : (
                        <Box sx={{flex: 1, overflow: 'auto', px: 2.5, py: 2.5}}>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={2}
                            >
                                <Typography sx={{fontSize: 28, fontWeight: 700, lineHeight: 1.2}}>
                                    {formatAmount(currency, amount)}
                                </Typography>
                                <PriceworkStatusBadge
                                    status={status}
                                    date={
                                        detail?.bookkeeper_date
                                        || detail?.timesheet_date
                                        || pricework?.bookkeeper_date
                                        || pricework?.timesheet_date
                                    }
                                />
                            </Stack>

                            <Stack spacing={2.25}>
                                <Box>
                                    <Typography sx={{fontSize: 12, color: 'text.secondary', mb: 0.75}}>
                                        Submitted by
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={1.25}>
                                        {userAvatar(
                                            detail?.user_name || pricework.user_name,
                                            detail?.user_thumb_image || pricework.user_thumb_image,
                                            36,
                                        )}
                                        <Box>
                                            <Typography sx={{fontSize: 14, fontWeight: 700}}>
                                                {detail?.user_name || pricework.user_name || '—'}
                                            </Typography>
                                            <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                                                {detail?.trade_name || pricework.trade_name || '—'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Box>

                                <FieldBlock
                                    label="Project"
                                    value={detail?.project_name || pricework.project_name}
                                />
                                <FieldBlock
                                    label="Address"
                                    value={detail?.address_name || pricework.address_name}
                                />
                                <FieldBlock
                                    label="Team"
                                    value={detail?.team_name || pricework.team_name}
                                />
                                <FieldBlock
                                    label="Pricework Date"
                                    value={detail?.pricework_date || pricework.pricework_date}
                                />
                                <FieldBlock
                                    label="Category"
                                    value={detail?.category_name || pricework.category_name}
                                />
                                <FieldBlock
                                    label="Sub Category"
                                    value={detail?.sub_category_name || pricework.sub_category_name}
                                />
                                <FieldBlock
                                    label="Unit"
                                    value={detail?.unit_name || pricework.unit_name}
                                />
                                {renderEditableNumberField(
                                    'Amount Per Unit',
                                    'amount_per_unit',
                                    formatAmount(currency, amountPerUnit),
                                    true,
                                )}
                                {renderEditableNumberField(
                                    'Work Complete',
                                    'work_complete',
                                    workComplete,
                                )}
                                <FieldBlock
                                    label="Pricework Amount"
                                    value={formatAmount(currency, amount)}
                                />
                                <FieldBlock
                                    label="Note"
                                    value={detail?.note || pricework.note}
                                />
                                <Box>
                                    <Typography sx={{fontSize: 12, color: 'text.secondary'}}>
                                        Attachments
                                    </Typography>
                                    {hasAttachments ? (
                                        <Box
                                            component="button"
                                            type="button"
                                            onClick={() => onViewAttachments?.()}
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
                                            View (
                                            {attachmentCount}
                                            )
                                            <IconExternalLink size={14} />
                                        </Box>
                                    ) : (
                                        <Typography sx={{fontSize: 14, color: 'text.secondary'}}>
                                            No attachments
                                        </Typography>
                                    )}
                                </Box>
                            </Stack>

                            <Divider sx={{my: 2.5}} />

                            <Typography sx={{fontSize: 15, fontWeight: 700, mb: 2}}>
                                Activity Log
                            </Typography>
                            <Stack spacing={2.25}>
                                {activityLogs.length > 0 ? (
                                    activityLogs.map((item) => (
                                        <ActivityLogItem key={item.id} item={item} />
                                    ))
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
                                p: 2,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                bgcolor: '#fff',
                            }}
                        >
                            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                                {showApproveButton && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        onClick={() => onApprove?.(pricework.id)}
                                    >
                                        Approve
                                    </Button>
                                )}
                                {showRejectButton && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => onReject?.(pricework.id)}
                                    >
                                        Reject
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                    )}
                </>
            )}
        </Drawer>
    );
};

export default PriceworkDetailsDrawer;
