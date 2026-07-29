'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import api from '@/utils/axios';
import {
    Box,
    Typography,
    CircularProgress,
    Card,
    CardMedia,
    IconButton,
    Drawer,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    Alert,
    FormControl,
    TextField,
} from '@mui/material';
import {
    IconArrowLeft,
    IconArrowRight,
    IconBuilding,
    IconCalendar,
    IconDownload,
    IconEdit,
    IconFileText,
    IconTag,
    IconUser,
    IconX,
    IconZoomIn,
    IconZoomOut,
} from '@tabler/icons-react';
import {Stack} from '@mui/system';

interface ChecklogDetailPageProps {
    checklogId: number | null;
    open: boolean;
    onClose: () => void;
    onUpdated?: () => void | Promise<void>;
}

interface Attachment {
    image_url?: string | null;
    thumb_url?: string | null;
    image_thumb_url?: string | null;
    url?: string | null;
    file?: string | null;
    file_url?: string | null;
    preview?: string | null;
}

interface ChecklogTask {
    id?: number;
    address_id?: number | null;
    address_name?: string | null;
    address?: string | null;
    trade_id?: number | null;
    company_task_id?: number | null;
    unit_id?: number | null;
    comment?: string | null;
    note?: string | null;
    checkin_note?: string | null;
    checkout_note?: string | null;
    work_done?: string | number | null;
    work_complete?: string | number | null;
    work_type?: string | null;
    company_task_name?: string | null;
    trade_name?: string | null;
    date_added?: string | null;
    status?: string | number | null;
    status_text?: string | null;
    progress?: string | number | null;
    amount_per_unit?: string | number | null;
    unit_name?: string | null;
    currency?: string | null;
    total_pricework_amount?: string | number | null;
    pricework_total_amount?: string | number | null;
    pricework_amount?: string | number | null;
    before_attachments?: Attachment[];
    after_attachments?: Attachment[];
}

const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const rawValue = String(value);

    if (/^\d{2}\/\d{2}\/\d{4}/.test(rawValue)) return rawValue.slice(0, 10);

    const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}/${month}/${year}`;
    }

    return rawValue;
};

const formatCurrencyValue = (currency: string, value?: string | number | null) => {
    const amount = Number(value ?? 0);
    return `${currency}${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
};

const checklogStatusText: Record<string, string> = {
    '0': 'Default',
    '1': 'Pending',
    '2': 'In Progress',
    '3': 'Completed',
    '4': 'Approved',
    '5': 'Rejected',
};

const getStatusText = (checklog: ChecklogTask, data: any) => {
    if (checklog.status_text || data?.status_text) return checklog.status_text || data?.status_text;

    const status = String(checklog.status ?? data?.status ?? '');
    return checklogStatusText[status] || (status ? status : '-');
};

const shouldShowStatus = (checklog: ChecklogTask, data: any) => {
    const status = String(checklog.status ?? data?.status ?? '');

    return ['6', '7', '9'].includes(status);
};

export default function ChecklogDetailPage({checklogId, open, onClose, onUpdated}: ChecklogDetailPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [checklogTasks, setChecklogTasks] = useState<ChecklogTask[]>([]);
    const [data, setData] = useState<any>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        address_name: '',
        trade_name: '',
        unit_name: '',
        work_type: '',
        amount_per_unit: '',
        work_complete: '',
        checkin_note: '',
        note: '',
    });

    const selectedImage = previewImages[selectedImageIndex] ?? null;

    const editTotalAmount = useMemo(() => {
        const amountPerUnit = Number(editForm.amount_per_unit || 0);
        const workDone = Number(editForm.work_complete || 0);
        const total = Number.isFinite(amountPerUnit) && Number.isFinite(workDone)
            ? amountPerUnit * workDone : 0;

        return formatCurrencyValue(data?.currency ?? '', total);
    }, [data?.currency, editForm.amount_per_unit, editForm.work_complete]);

    const readOnlyFieldSx = {
        textAlign: 'left',
        '& .MuiInputBase-root': {
            textAlign: 'left',
        },
        '& .MuiInputBase-input': {
            textAlign: 'left !important',
        },
        '& .MuiInputBase-inputMultiline': {
            textAlign: 'left !important',
        },
        '& .MuiInputBase-input.Mui-disabled': {
            WebkitTextFillColor: '#111827',
            backgroundColor: '#f8fafc',
            textAlign: 'left !important',
        },
        '& .MuiOutlinedInput-root.Mui-disabled': {
            backgroundColor: '#f8fafc',
        },
    };

    const editableFieldSx = {
        textAlign: 'left',
        '& .MuiOutlinedInput-root': {
            '& fieldset': {borderColor: '#e0e0e0'},
            '&:hover fieldset': {borderColor: '#bbb'},
            '&.Mui-focused fieldset': {borderColor: '#50ABFF'},
        },
        '& .MuiInputBase-input': {textAlign: 'left !important'},
    };

    const fetchChecklogDetail = useCallback(async () => {
        if (!checklogId) return;

        setLoading(true);
        try {
            const res = await api.get(
                `user-checklog/details?checklog_id=${checklogId}`,
            );
            const detail = res.data?.info;
            if (res.data?.IsSuccess && detail) {
                setData(detail);
                setChecklogTasks([detail]);
            } else {
                setData([]);
                setChecklogTasks([]);
            }
        } catch (err) {
            console.error('Error fetching checklog details:', err);
            setData([]);
            setChecklogTasks([]);
        } finally {
            setLoading(false);
        }
    }, [checklogId]);

    useEffect(() => {
        if (checklogId && open) {
            fetchChecklogDetail();
        }
    }, [checklogId, fetchChecklogDetail, open]);

    const handleOpenEdit = () => {
        const detail = checklogTasks[0] ?? data;
        setEditForm({
            address_name: detail?.address_name || detail?.address || '',
            trade_name: detail?.trade_name || '',
            unit_name: detail?.unit_name || '',
            work_type: detail?.work_type || '',
            amount_per_unit: detail?.amount_per_unit != null ? String(detail.amount_per_unit) : '',
            work_complete: detail?.work_complete != null ? String(detail.work_complete) : '',
            checkin_note: detail?.checkin_note || '',
            note: detail?.checkout_note || detail?.note || '',
        });
        setEditError(null);
        setEditOpen(true);
    };

    const updateEditField = (field: keyof typeof editForm, value: string) => {
        if (['amount_per_unit', 'work_complete'].includes(field) && !/^\d*(?:\.\d{0,2})?$/.test(value)) return;

        setEditForm((current) => ({...current, [field]: value}));
    };

    const handleSaveEdit = async () => {
        if (!checklogId) return;
        if (editForm.amount_per_unit === '' || Number(editForm.amount_per_unit) < 0) return setEditError('Valid amount per unit is required.');
        if (editForm.work_complete === '' || Number(editForm.work_complete) < 0) return setEditError('Valid work done is required.');

        setSaving(true);
        setEditError(null);
        try {
            const payload = {
                id: checklogId,
                amount_per_unit: editForm.amount_per_unit,
                work_complete: editForm.work_complete,
            };

            const response = await api.put('user-checklog/update', payload);
            if (!response.data?.IsSuccess) {
                throw new Error(response.data?.message || 'Failed to update checklog.');
            }

            setEditOpen(false);
            await fetchChecklogDetail();
            await onUpdated?.();
        } catch (error: any) {
            setEditError(error?.response?.data?.message || error?.message || 'Failed to update checklog.');
        } finally {
            setSaving(false);
        }
    };

    const getTaskId = (checklog: ChecklogTask, index: number) =>
        checklog.id ?? index;

    const getComment = (checklog: ChecklogTask) =>
        checklog.comment ||
        checklog.note ||
        checklog.checkout_note ||
        checklog.checkin_note ||
        data?.comment ||
        data?.note ||
        data?.checkout_note ||
        data?.checkin_note ||
        '-';

    const getAddress = (checklog: ChecklogTask) =>
        checklog.address_name || checklog.address || data?.address_name || data?.address || '-';

    const getWorkDone = (checklog: ChecklogTask) => {
        const workDone =
            checklog.work_done ??
            checklog.work_complete ??
            data?.work_done ??
            data?.work_complete;
        const unitName = checklog.unit_name ?? data?.unit_name;

        if (workDone === null || workDone === undefined || workDone === '') {
            return '-';
        }

        return unitName ? `${workDone} ${unitName}` : String(workDone);
    };

    const getPriceworkAmountValue = (checklog: ChecklogTask) => {
        const amount =
            checklog.total_pricework_amount ??
            checklog.pricework_total_amount ??
            checklog.pricework_amount ??
            data?.total_pricework_amount ??
            data?.pricework_total_amount ??
            data?.pricework_amount ??
            0;
        const currency = checklog.currency ?? data?.currency ?? '';

        return formatCurrencyValue(currency, amount);
    };

    const getAttachmentUrl = (attachment: Attachment, isPreview = false) => {
        if (isPreview) {
            return (
                attachment.image_url ||
                attachment.url ||
                attachment.file_url ||
                attachment.file ||
                attachment.preview ||
                attachment.thumb_url ||
                attachment.image_thumb_url ||
                ''
            );
        }

        return (
            attachment.thumb_url ||
            attachment.image_thumb_url ||
            attachment.image_url ||
            attachment.url ||
            attachment.file_url ||
            attachment.file ||
            attachment.preview ||
            ''
        );
    };

    const closePreview = () => {
        setPreviewImages([]);
        setSelectedImageIndex(0);
        setZoom(1);
    };

    const openPreview = (images: string[], index: number) => {
        setPreviewImages(images);
        setSelectedImageIndex(index);
        setZoom(1);
    };

    const showPreviousImage = () => {
        setSelectedImageIndex((current) =>
            (current - 1 + previewImages.length) % previewImages.length,
        );
        setZoom(1);
    };

    const showNextImage = () => {
        setSelectedImageIndex((current) =>
            (current + 1) % previewImages.length,
        );
        setZoom(1);
    };

    const handleDownloadImage = async () => {
        if (!selectedImage) return;

        const imageName =
            selectedImage
                .split('?')[0]
                .split('/')
                .pop() || 'checklog-attachment.jpg';

        try {
            const response = await fetch(selectedImage);
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

    const renderAttachmentGrid = (
        attachments: Attachment[],
        label: string,
    ) => {
        const visibleAttachments = attachments.filter((attachment) =>
            getAttachmentUrl(attachment),
        );
        const previewUrls = visibleAttachments.map((attachment) =>
            getAttachmentUrl(attachment, true),
        );

        if (visibleAttachments.length === 0) return null;

        return (
            <Box>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                    {label} ({visibleAttachments.length})
                </Typography>
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
                    {visibleAttachments.map((img: Attachment, idx: number) => {
                        const previewUrl = getAttachmentUrl(img, true);
                        const imageUrl = getAttachmentUrl(img);

                        return (
                            <Box
                                key={`${label}-${imageUrl}-${idx}`}
                                sx={{
                                    width: {xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)'},
                                }}
                            >
                                <Card
                                    sx={{
                                        cursor: previewUrl ? 'pointer' : 'default',
                                        '&:hover': previewUrl ? {boxShadow: 3} : {},
                                    }}
                                    onClick={() => previewUrl && openPreview(previewUrls, idx)}
                                >
                                    <CardMedia
                                        component="img"
                                        height="140"
                                        image={imageUrl}
                                        alt={`${label} ${idx + 1}`}
                                        sx={{objectFit: 'cover'}}
                                    />
                                </Card>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        );
    };

    const renderInfoBlock = (
        icon: React.ReactNode,
        label: string,
        value?: string | number | null,
    ) => (
        <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                {icon}
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
            </Stack>
            <Typography variant="body1" fontWeight={500} sx={{wordBreak: 'break-word'}}>
                {value || '-'}
            </Typography>
        </Box>
    );

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: {xs: '100%', sm: 500},
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: {xs: '100%', sm: 500},
                    padding: 2,
                    backgroundColor: '#f9f9f9',
                },
            }}
        >
            <Box className="checklog_detail_wrapper">
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2} gap={1}>
                    <Box display="flex" alignItems="center" flexWrap="wrap">
                        <IconButton onClick={onClose}>
                            <IconArrowLeft/>
                        </IconButton>
                        <Typography variant="h6" fontWeight={700}>
                            Checklog Details
                        </Typography>
                    </Box>
                    {checklogTasks.length > 0 && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<IconEdit size={18}/>}
                            onClick={handleOpenEdit}
                        >
                            Edit
                        </Button>
                    )}
                </Box>

                {loading ? (
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        minHeight="300px"
                    >
                        <CircularProgress/>
                    </Box>
                ) : checklogTasks.length === 0 ? (
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        minHeight="300px"
                    >
                        <Typography className="f-18">
                            No detail found for this checklog!
                        </Typography>
                    </Box>
                ) : (
                    checklogTasks.map((checklog: any, index) => {
                        const taskId = getTaskId(checklog, index);
                        const beforeAttachments = checklog.before_attachments ?? [];
                        const afterAttachments = checklog.after_attachments ?? [];

                        return (
                            <Box key={taskId} mb={3}>
                                <Box mb={3}>
                                    <Typography variant="h4" fontWeight={700} color="primary">
                                        {getPriceworkAmountValue(checklog)}
                                    </Typography>
                                </Box>

                                <Divider sx={{my: 2}}/>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: {xs: 'column', sm: 'row'},
                                        gap: 2,
                                        mb: 3,
                                    }}
                                >
                                    <Box sx={{flex: 1}}>
                                        <Stack spacing={2}>
                                            {renderInfoBlock(
                                                <IconCalendar size={18} color="#666"/>,
                                                'Checklog Date',
                                                formatDate(checklog.date_added ?? data?.date_added),
                                            )}
                                            {renderInfoBlock(
                                                <IconTag size={18} color="#666"/>,
                                                'Work Type',
                                                checklog.work_type || data?.work_type || checklog.company_task_name || data?.company_task_name,
                                            )}
                                            {renderInfoBlock(
                                                <IconBuilding size={18} color="#666"/>,
                                                'Unit',
                                                checklog.unit_name || data?.unit_name,
                                            )}
                                            {renderInfoBlock(
                                                <IconFileText size={18} color="#666"/>,
                                                'Work Done',
                                                getWorkDone(checklog),
                                            )}
                                            {shouldShowStatus(checklog, data) && (
                                                renderInfoBlock(
                                                    <IconFileText size={18} color="#666"/>,
                                                    'Status',
                                                    getStatusText(checklog, data),
                                                )
                                            )}
                                        </Stack>
                                    </Box>

                                    <Box sx={{flex: 1}}>
                                        <Stack spacing={2}>
                                            {renderInfoBlock(
                                                <IconFileText size={18} color="#666"/>,
                                                'Task',
                                                checklog.company_task_name || data?.company_task_name,
                                            )}
                                            {renderInfoBlock(
                                                <IconUser size={18} color="#666"/>,
                                                'Trade',
                                                checklog.trade_name || data?.trade_name,
                                            )}
                                            {renderInfoBlock(
                                                <IconTag size={18} color="#666"/>,
                                                'Amount Per Unit',
                                                formatCurrencyValue(checklog.currency ?? data?.currency ?? '', checklog.amount_per_unit ?? data?.amount_per_unit),
                                            )}
                                        </Stack>
                                    </Box>
                                </Box>

                                <Divider sx={{my: 2}}/>

                                <Box mb={3}>
                                    <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                                        Address
                                    </Typography>
                                    <Typography variant="body1" fontWeight={500} sx={{wordBreak: 'break-word'}}>
                                        {getAddress(checklog)}
                                    </Typography>
                                </Box>

                                {getComment(checklog) !== '-' && (
                                    <Box mb={3}>
                                        <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                                            Note
                                        </Typography>
                                        <Typography variant="body2" sx={{wordBreak: 'break-word'}}>
                                            {getComment(checklog)}
                                        </Typography>
                                    </Box>
                                )}

                                {(beforeAttachments.length > 0 || afterAttachments.length > 0) && (
                                    <Box>
                                        <Stack spacing={3}>
                                            {renderAttachmentGrid(beforeAttachments, 'Before Attachments')}
                                            {renderAttachmentGrid(afterAttachments, 'After Attachments')}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        );
                    })
                )}

                <Dialog
                    open={Boolean(selectedImage)}
                    onClose={closePreview}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                        }}
                    >
                        Attachment Preview
                        <IconButton onClick={closePreview} size="small" aria-label="Close preview">
                            <IconX size={20}/>
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{display: 'flex', flexDirection: 'column', gap: 1.5}}>
                        <Box
                            sx={{
                                height: {xs: '55vh', sm: '65vh'},
                                width: '100%',
                                backgroundColor: '#f5f5f5',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                overflow: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                            }}
                        >
                            <Box
                                component="img"
                                src={selectedImage || ''}
                                alt={`Attachment preview ${selectedImageIndex + 1}`}
                                sx={{
                                    maxWidth: zoom <= 1 ? `${zoom * 100}%` : 'none',
                                    maxHeight: zoom <= 1 ? `${zoom * 100}%` : 'none',
                                    width: zoom <= 1 ? 'auto' : `${zoom * 100}%`,
                                    height: 'auto',
                                    objectFit: 'contain',
                                    display: 'block',
                                    transition: 'width 150ms ease',
                                }}
                            />

                            {previewImages.length > 1 && (
                                <>
                                    <Tooltip title="Previous attachment">
                                        <IconButton
                                            onClick={showPreviousImage}
                                            aria-label="Previous attachment"
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: 12,
                                                transform: 'translateY(-50%)',
                                                color: '#fff',
                                                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                                                zIndex: 1,
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                                },
                                            }}
                                        >
                                            <IconArrowLeft size={24}/>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Next attachment">
                                        <IconButton
                                            onClick={showNextImage}
                                            aria-label="Next attachment"
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: 12,
                                                transform: 'translateY(-50%)',
                                                color: '#fff',
                                                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                                                zIndex: 1,
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                                },
                                            }}
                                        >
                                            <IconArrowRight size={24}/>
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Box>

                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Tooltip title="Zoom out">
                                <span>
                                    <IconButton
                                        onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))}
                                        disabled={zoom <= 0.5}
                                        aria-label="Zoom out"
                                    >
                                        <IconZoomOut size={22}/>
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Typography variant="body2" minWidth={48} textAlign="center">
                                {Math.round(zoom * 100)}%
                            </Typography>
                            <Tooltip title="Zoom in">
                                <span>
                                    <IconButton
                                        onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
                                        disabled={zoom >= 3}
                                        aria-label="Zoom in"
                                    >
                                        <IconZoomIn size={22}/>
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{justifyContent: 'space-between'}}>
                        <Box display="flex" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                {selectedImageIndex + 1} / {previewImages.length}
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<IconDownload size={18}/>}
                            onClick={handleDownloadImage}
                        >
                            Download
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={editOpen}
                    onClose={() => !saving && setEditOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Edit Checklog</DialogTitle>
                    <DialogContent>
                        {editError && <Alert severity="error" sx={{mb: 2}}>{editError}</Alert>}
                        <Stack spacing={2} mt={1}>
                            <FormControl fullWidth size="small">
                                <Typography variant="caption">Address</Typography>
                                <TextField
                                    fullWidth
                                    disabled
                                    size="small"
                                    value={editForm.address_name || '-'}
                                    sx={readOnlyFieldSx}
                                />
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <Typography variant="caption">Trade</Typography>
                                <TextField
                                    fullWidth
                                    disabled
                                    size="small"
                                    value={editForm.trade_name || '-'}
                                    sx={readOnlyFieldSx}
                                />
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <Typography variant="caption">Work Type</Typography>
                                <TextField
                                    fullWidth
                                    disabled
                                    size="small"
                                    value={editForm.work_type || '-'}
                                    sx={readOnlyFieldSx}
                                />
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <Typography variant="caption">Unit</Typography>
                                <TextField
                                    fullWidth
                                    disabled
                                    size="small"
                                    value={editForm.unit_name || '-'}
                                    sx={readOnlyFieldSx}
                                />
                            </FormControl>

                            <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                                <FormControl fullWidth size="small">
                                    <Typography variant="caption">Amount Per Unit</Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={editForm.amount_per_unit}
                                        onChange={(event) => updateEditField('amount_per_unit', event.target.value)}
                                        placeholder="0.00"
                                        inputProps={{
                                            inputMode: 'decimal',
                                            style: {textAlign: 'left'},
                                        }}
                                        sx={editableFieldSx}
                                    />
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <Typography variant="caption">Work Done</Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={editForm.work_complete}
                                        onChange={(event) => updateEditField('work_complete', event.target.value)}
                                        placeholder="0.00"
                                        inputProps={{
                                            inputMode: 'decimal',
                                            style: {textAlign: 'left'},
                                        }}
                                        sx={editableFieldSx}
                                    />
                                </FormControl>
                            </Stack>

                            <Box
                                sx={{
                                    border: '1px solid #d9e2ef',
                                    borderRadius: 1,
                                    p: 1.5,
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 2,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Total Checklog Amount
                                </Typography>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                    {editTotalAmount}
                                </Typography>
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveEdit}
                            disabled={saving}
                        >
                            {saving ? <CircularProgress size={20}/> : 'Save'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Drawer>
    );
}
