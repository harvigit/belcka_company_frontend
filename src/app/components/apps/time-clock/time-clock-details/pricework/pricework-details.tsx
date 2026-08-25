'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardMedia,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Typography,
    Tooltip,
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
import api from '@/utils/axios';

type Attachment = {
    id: number;
    image?: string | null;
    image_url?: string | null;
    thumb_url?: string | null;
    url?: string | null;
    is_before?: boolean | number | string | null;
};

interface PriceworkDetailsProps {
    pricework: any;
    currency: string;
    onClose: () => void;
    onEdit: (pricework: any) => void;
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

const getAttachmentUrl = (attachment: Attachment) =>
    attachment.thumb_url || attachment.image_url || attachment.url || attachment.image || '';

const getFullAttachmentUrl = (attachment: Attachment) =>
    attachment.image_url || attachment.url || attachment.image || attachment.thumb_url || '';

const asAttachmentList = (value?: Attachment[] | null) =>
    Array.isArray(value) ? value : [];

const isBeforeAttachment = (attachment: Attachment) => {
    const value = attachment.is_before;
    return value === true || value === 1 || value === '1';
};

const isVisibleAttachment = (attachment: Attachment) =>
    Boolean(getAttachmentUrl(attachment) && getFullAttachmentUrl(attachment));

const timesheetStatusText: Record<string, string> = {
    '0': 'Default',
    '6': 'Locked',
    '7': 'Unlocked',
    '8': 'To be paid',
    '9': 'Paid',
    '10': 'Hold',
    '11': 'Reject',
    '12': 'Scheduled to pay',
    '13': 'Payment Schedule Approved',
    '14': 'Payment Schedule Rejected',
    '15': 'Payment Schedule Cancelled',
};

const getStatusText = (priceworkDetails: any) => {
    const statusText = priceworkDetails?.status_text || priceworkDetails?.timesheet_status_text;
    if (statusText) return statusText;

    const status = String(
        priceworkDetails?.timesheet_status ??
        priceworkDetails?.status ??
        priceworkDetails?.status_id ??
        '',
    );

    return timesheetStatusText[status] || '-';
};

const shouldShowStatus = (priceworkDetails: any) => {
    const status = String(
        priceworkDetails?.timesheet_status ??
        priceworkDetails?.status ??
        priceworkDetails?.status_id ??
        '',
    );

    return ['6', '7', '9'].includes(status);
};

const isLockedOrPaid = (priceworkDetails: any) => {
    const status = String(
        priceworkDetails?.timesheet_status ??
        priceworkDetails?.status ??
        priceworkDetails?.status_id ??
        '',
    );

    return status === '6' || status === '9';
};

const PriceworkDetails: React.FC<PriceworkDetailsProps> = ({
                                                               pricework,
                                                               currency,
                                                               onClose,
                                                               onEdit,
                                                           }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<any>(pricework);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);

    const priceworkId = pricework?.pricework_id || pricework?.id;
    const selectedImage = previewImages[selectedImageIndex] ?? null;

    useEffect(() => {
        let mounted = true;

        const fetchDetails = async () => {
            if (!priceworkId) return;

            setLoading(true);
            setError(null);
            try {
                const response = await api.get('/timesheet/pricework-details', {
                    params: {pricework_id: priceworkId},
                });

                if (mounted) {
                    setDetails(response.data?.info || pricework);
                }
            } catch (fetchError: any) {
                if (mounted) {
                    const message =
                        fetchError?.response?.data?.message || 'Failed to load pricework details.';
                    setError(message);
                    setDetails(pricework);
                    // Don't keep an empty/broken details sidebar open for missing records.
                    if (String(message).toLowerCase().includes('not found')) {
                        onClose();
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        setDetails(pricework);
        fetchDetails();

        return () => {
            mounted = false;
        };
    }, [priceworkId, pricework]);

    const attachments: Attachment[] = useMemo(
        () => Array.isArray(details?.attachments) ? details.attachments : [],
        [details?.attachments],
    );
    const visibleAttachments = useMemo(
        () => attachments.filter(isVisibleAttachment),
        [attachments],
    );
    const beforeAttachments = useMemo(() => {
        const fromApi = asAttachmentList(details?.before_attachments).filter(isVisibleAttachment);
        const afterFromApi = asAttachmentList(details?.after_attachments).filter(isVisibleAttachment);
        if (fromApi.length > 0 || afterFromApi.length > 0) return fromApi;
        return visibleAttachments.filter(isBeforeAttachment);
    }, [details?.before_attachments, details?.after_attachments, visibleAttachments]);
    const afterAttachments = useMemo(() => {
        const fromApi = asAttachmentList(details?.before_attachments).filter(isVisibleAttachment);
        const afterFromApi = asAttachmentList(details?.after_attachments).filter(isVisibleAttachment);
        if (fromApi.length > 0 || afterFromApi.length > 0) return afterFromApi;
        const hasBeforeAfterFlag = visibleAttachments.some(
            (attachment) => attachment.is_before != null && attachment.is_before !== '',
        );
        if (!hasBeforeAfterFlag) return [];
        return visibleAttachments.filter((attachment) => !isBeforeAttachment(attachment));
    }, [details?.before_attachments, details?.after_attachments, visibleAttachments]);
    const hasSplitGroups = beforeAttachments.length > 0 || afterAttachments.length > 0;
    const hideEditAction = isLockedOrPaid(details);

    const renderAttachmentGrid = (items: Attachment[], label?: string) => {
        if (items.length === 0) return null;
        const groupPreviewUrls = items.map((attachment) => getFullAttachmentUrl(attachment));

        return (
            <Box>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                    {label ? `${label} (${items.length})` : `Attachments (${items.length})`}
                </Typography>
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
                    {items.map((attachment, index) => {
                        const thumbUrl = getAttachmentUrl(attachment);
                        const fullUrl = getFullAttachmentUrl(attachment);

                        return (
                            <Box
                                key={`${label || 'attachment'}-${attachment.id}-${index}`}
                                sx={{
                                    width: {xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)'},
                                }}
                            >
                                <Card
                                    sx={{
                                        cursor: fullUrl ? 'pointer' : 'default',
                                        '&:hover': fullUrl ? {boxShadow: 3} : {},
                                    }}
                                    onClick={() => fullUrl && openPreview(groupPreviewUrls, index)}
                                >
                                    <CardMedia
                                        component="img"
                                        height="140"
                                        image={thumbUrl}
                                        alt={`${label || 'Attachment'} ${index + 1}`}
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

        const imageName = selectedImage.split('?')[0].split('/').pop() || 'pricework-attachment.jpg';

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
            <Typography variant="body1" fontWeight={500}>
                {value || '-'}
            </Typography>
        </Box>
    );

    return (
        <Box
            sx={{
                height: '100%',
                overflowY: 'auto',
                p: 2,
            }}
        >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center">
                    <IconButton onClick={onClose}>
                        <IconArrowLeft/>
                    </IconButton>
                    <Typography variant="h6" fontWeight={700} ml={1}>
                        Pricework Details
                    </Typography>
                </Box>
                {!hideEditAction && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<IconEdit size={18}/>}
                        onClick={() => onEdit(details)}
                        disabled={loading || !details}
                    >
                        Edit
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <CircularProgress/>
                </Box>
            ) : !details ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                    <Typography variant="body2" color="text.secondary">
                        No pricework details found.
                    </Typography>
                </Box>
            ) : (
                <>
                    <Box mb={3}>
                        <Typography variant="h4" fontWeight={700} color="primary">
                            {formatCurrencyValue(currency, details?.pricework_amount || details?.pricework_total_amount)}
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
                                    'Pricework Date',
                                    formatDate(details?.pricework_date || details?.date_added),
                                )}
                                {renderInfoBlock(
                                    <IconTag size={18} color="#666"/>,
                                    'Work Type',
                                    details?.work_type || details?.type_of_work_name,
                                )}
                                {renderInfoBlock(
                                    <IconBuilding size={18} color="#666"/>,
                                    'Unit',
                                    details?.unit_name,
                                )}
                                {renderInfoBlock(
                                    <IconFileText size={18} color="#666"/>,
                                    'Work Complete',
                                    details?.work_complete != null ? `${details.work_complete}` : '-',
                                )}
                                {shouldShowStatus(details) && (
                                    renderInfoBlock(
                                        <IconFileText size={18} color="#666"/>,
                                        'Status',
                                        getStatusText(details),
                                    )
                                )}
                            </Stack>
                        </Box>

                        <Box sx={{flex: 1}}>
                            <Stack spacing={2}>
                                {renderInfoBlock(
                                    <IconFileText size={18} color="#666"/>,
                                    'Project',
                                    details?.project_name,
                                )}
                                {renderInfoBlock(
                                    <IconUser size={18} color="#666"/>,
                                    'Team',
                                    details?.team_name,
                                )}
                                {renderInfoBlock(
                                    <IconUser size={18} color="#666"/>,
                                    'User',
                                    details?.user_name,
                                )}
                                {renderInfoBlock(
                                    <IconTag size={18} color="#666"/>,
                                    'Amount Per Unit',
                                    formatCurrencyValue(currency, details?.amount_per_unit),
                                )}
                            </Stack>
                        </Box>
                    </Box>

                    <Divider sx={{my: 2}}/>

                    <Box mb={3}>
                        <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                            Address
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {details?.address_name || '-'}
                        </Typography>
                    </Box>

                    {details?.note && (
                        <Box mb={3}>
                            <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                                Note
                            </Typography>
                            <Typography variant="body2">
                                {details.note}
                            </Typography>
                        </Box>
                    )}

                    {hasSplitGroups ? (
                        <Stack spacing={3}>
                            {renderAttachmentGrid(beforeAttachments, 'Before Attachments')}
                            {renderAttachmentGrid(afterAttachments, 'After Attachments')}
                        </Stack>
                    ) : (
                        visibleAttachments.length > 0 && renderAttachmentGrid(visibleAttachments)
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
                </>
            )}
        </Box>
    );
};

export default PriceworkDetails;
