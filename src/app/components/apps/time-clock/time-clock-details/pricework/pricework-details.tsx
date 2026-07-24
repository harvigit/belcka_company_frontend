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
} from '@mui/material';
import {
    IconArrowLeft,
    IconBuilding,
    IconCalendar,
    IconDownload,
    IconEdit,
    IconFileText,
    IconTag,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import {Stack} from '@mui/system';
import api from '@/utils/axios';

type Attachment = {
    id: number;
    image?: string | null;
    image_url?: string | null;
    thumb_url?: string | null;
    url?: string | null;
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const priceworkId = pricework?.pricework_id || pricework?.id;

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
                    setError(fetchError?.response?.data?.message || 'Failed to load pricework details.');
                    setDetails(pricework);
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
    const hideEditAction = isLockedOrPaid(details);

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

                    {attachments.length > 0 && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                Attachments ({attachments.length})
                            </Typography>
                            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
                                {attachments.map((attachment) => {
                                    const thumbUrl = getAttachmentUrl(attachment);
                                    const fullUrl = getFullAttachmentUrl(attachment);

                                    return (
                                        <Box
                                            key={attachment.id}
                                            sx={{
                                                width: {xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)', md: 'calc(25% - 12px)'},
                                            }}
                                        >
                                            <Card
                                                sx={{
                                                    cursor: fullUrl ? 'pointer' : 'default',
                                                    '&:hover': fullUrl ? {boxShadow: 3} : {},
                                                }}
                                                onClick={() => fullUrl && setSelectedImage(fullUrl)}
                                            >
                                                <CardMedia
                                                    component="img"
                                                    height="140"
                                                    image={thumbUrl}
                                                    alt={`Attachment ${attachment.id}`}
                                                    sx={{objectFit: 'cover'}}
                                                />
                                            </Card>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

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
                                <IconX/>
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
                </>
            )}
        </Box>
    );
};

export default PriceworkDetails;
