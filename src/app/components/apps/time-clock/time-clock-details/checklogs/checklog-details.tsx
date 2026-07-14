'use client';

import React, {useCallback, useEffect, useState} from 'react';
import api from '@/utils/axios';
import {
    Box,
    Typography,
    CircularProgress,
    IconButton,
    Drawer,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
} from '@mui/material';
import {
    IconArrowLeft,
    IconArrowRight,
    IconDownload,
    IconX,
    IconZoomIn,
    IconZoomOut,
} from '@tabler/icons-react';
import {Stack} from '@mui/system';

interface ChecklogDetailPageProps {
    checklogId: number | null;
    open: boolean;
    onClose: () => void;
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
    address_name?: string | null;
    address?: string | null;
    comment?: string | null;
    note?: string | null;
    work_done?: string | number | null;
    work_complete?: string | number | null;
    unit_name?: string | null;
    currency?: string | null;
    total_pricework_amount?: string | number | null;
    pricework_total_amount?: string | number | null;
    pricework_amount?: string | number | null;
    before_attachments?: Attachment[];
    after_attachments?: Attachment[];
}

export default function ChecklogDetailPage({checklogId, open, onClose}: ChecklogDetailPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [checklogTasks, setChecklogTasks] = useState<ChecklogTask[]>([]);
    const [data, setData] = useState<any>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [zoom, setZoom] = useState(1);

    const selectedImage = previewImages[selectedImageIndex] ?? null;

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

    const getTaskId = (checklog: ChecklogTask, index: number) =>
        checklog.id ?? index;

    const getComment = (checklog: ChecklogTask) =>
        checklog.comment || checklog.note || data?.comment || data?.note || '-';

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

    const getPriceworkAmount = (checklog: ChecklogTask) => {
        const amount =
            checklog.total_pricework_amount ??
            checklog.pricework_total_amount ??
            checklog.pricework_amount ??
            data?.total_pricework_amount ??
            data?.pricework_total_amount ??
            data?.pricework_amount ??
            0;
        const currency = checklog.currency ?? data?.currency ?? '';
        const numericAmount = Number(amount);

        if (Number.isNaN(numericAmount)) {
            return `${currency}${amount}`;
        }

        return `${currency}${numericAmount.toFixed(2)}`;
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
            attachment.image_url ||
            attachment.url ||
            attachment.file_url ||
            attachment.file ||
            attachment.preview ||
            attachment.thumb_url ||
            attachment.image_thumb_url ||
            ''
        );
    };

    const hasDisplayableAttachments = (attachments: Attachment[]) =>
        attachments.some((attachment) => Boolean(getAttachmentUrl(attachment)));

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
                <Typography variant="body2" fontWeight={600} mb={1}>
                    {label}
                </Typography>
                <Stack
                    direction="row"
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    {visibleAttachments.map((img: Attachment, idx: number) => {
                        const previewUrl = getAttachmentUrl(img, true);
                        const imageUrl = getAttachmentUrl(img);

                        return (
                            <Box
                                key={`${label}-${imageUrl}-${idx}`}
                                sx={{
                                    width: 'calc(50% - 6px)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => openPreview(previewUrls, idx)}
                            >
                                <Box
                                    component="img"
                                    src={imageUrl}
                                    alt={`${label} ${idx + 1}`}
                                    sx={{
                                        borderRadius: 1,
                                        objectFit: 'cover',
                                        width: '100%',
                                        height: 130,
                                        display: 'block',
                                        border: '1px solid #e0e0e0',
                                        transition: 'transform .2s, box-shadow .2s',
                                        '&:hover': {
                                            transform: 'scale(1.02)',
                                            boxShadow: 2,
                                        },
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Stack>
            </Box>
        );
    };

    const DetailRow = ({label, value}: { label: string; value: React.ReactNode }) => (
        <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {label}
            </Typography>
            <Typography variant="body1" mt={0.5} sx={{wordBreak: 'break-word'}}>
                {value}
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
                <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                    <IconButton onClick={onClose}>
                        <IconArrowLeft/>
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                        Checklog Details
                    </Typography>
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
                        const hasAnyAttachment =
                            hasDisplayableAttachments(beforeAttachments) ||
                            hasDisplayableAttachments(afterAttachments);

                        return (
                            <Box key={taskId} mb={3}>
                                <Box
                                    sx={{
                                        border: '1px solid #ccc',
                                        borderRadius: 2,
                                        p: 2,
                                        backgroundColor: '#fff',
                                        '&:hover': {
                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                        },
                                    }}
                                >
                                    <Stack spacing={2}>
                                        <DetailRow label="Address" value={getAddress(checklog)}/>
                                        <Divider/>
                                        <DetailRow label="Comment" value={getComment(checklog)}/>
                                        <Divider/>
                                        <DetailRow label="Work Done" value={getWorkDone(checklog)}/>
                                        <Divider/>
                                        <DetailRow
                                            label="Total Pricework Amount"
                                            value={getPriceworkAmount(checklog)}
                                        />
                                        <Divider/>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                                Attachment
                                            </Typography>

                                            {hasAnyAttachment ? (
                                                <Stack spacing={2} mt={1}>
                                                    {renderAttachmentGrid(beforeAttachments, 'Before Attachments',)}
                                                    {renderAttachmentGrid(afterAttachments, 'After Attachments',)}
                                                </Stack>
                                            ) : (
                                                <Typography variant="body1" mt={0.5}>
                                                    -
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>
                                </Box>
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
            </Box>
        </Drawer>
    );
}
