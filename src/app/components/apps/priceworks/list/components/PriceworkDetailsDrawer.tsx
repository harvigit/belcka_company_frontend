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
    Stack,
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
    onViewAttachments?: (id: number) => void;
    onEdit?: (pricework: PriceworkApiRow | PriceworkDetail) => void;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
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

const PriceworkDetailsDrawer = ({open, onClose, pricework, onViewAttachments, onEdit, onApprove, onReject}: Props) => {
    const [detail, setDetail] = useState<PriceworkDetail | null>(null);
    const [loading, setLoading] = useState(false);

    const loadDetail = async () => {
        if (!pricework?.id) return;
        setLoading(true);
        try {
            const url = pricework.record_type === 'timesheet_light'
                ? `pricework/detail?pricework_id=${pricework.timesheet_light_id ?? pricework.id}&record_type=timesheet_light`
                : `pricework/detail?pricework_id=${pricework.id}`;
            const res = await api.get(url);
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
            return;
        }
        void loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, pricework?.id]);

    const status = normalizePriceworkStatus(
        detail?.status_text || detail?.status || pricework?.status,
    );
    const currency = detail?.currency || pricework?.currency || '£';
    const amount = Number(detail?.pricework_amount ?? pricework?.pricework_amount ?? 0);
    const isTimesheetLightRow = pricework?.record_type === 'timesheet_light';
    const hasAttachments =
        !isTimesheetLightRow &&
        Number(detail?.attachments?.length || pricework?.attachment_count || 0) > 0;
    const activityLogs = detail?.activity_logs || [];
    const showEditButton = Boolean(pricework?.id) && !isTimesheetLightRow;
    const showApproveButton = status === 'pending' || status === 'rejected';
    const showRejectButton = status === 'pending' || status === 'approved' || status === 'sent';

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
                                    onClick={() => onEdit?.({
                                        ...pricework,
                                        ...detail,
                                    })}
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
                                <PriceworkStatusBadge status={status} />
                            </Stack>

                            <Stack spacing={2.25}>
                                <Box>
                                    <Typography
                                        sx={{fontSize: 12, color: 'text.secondary', mb: 0.75}}
                                    >
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
                                            <Typography
                                                sx={{fontSize: 12, color: 'text.secondary'}}
                                            >
                                                {detail?.trade_name ||
                                                    pricework.trade_name ||
                                                    '—'}
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
                                <FieldBlock
                                    label="Amount Per Unit"
                                    value={formatAmount(
                                        currency,
                                        Number(
                                            detail?.amount_per_unit ??
                                                pricework.amount_per_unit ??
                                                0,
                                        ),
                                    )}
                                />
                                <FieldBlock
                                    label="Work Complete"
                                    value={Number(
                                        detail?.work_complete ?? pricework.work_complete ?? 0,
                                    )}
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
                                            onClick={() => onViewAttachments?.(pricework.id)}
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
                                            {detail?.attachments?.length ||
                                                pricework.attachment_count ||
                                                0}
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
