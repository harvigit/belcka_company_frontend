'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Card,
    CardMedia,
    CircularProgress,
    Drawer,
    IconButton,
    Typography,
} from '@mui/material';
import {IconX, IconPdf} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import AttachmentLightbox from '@/app/components/common/AttachmentLightbox';
import {ExpenseDetail} from '../types';

type Props = {
    open: boolean;
    expenseId: number | null;
    onClose: () => void;
};

const isPdfAttachment = (attachment: any) =>
    attachment.type === 'application/pdf' ||
    attachment.image_url?.toLowerCase().includes('.pdf');

const ExpenseAttachmentsDrawer = ({open, expenseId, onClose}: Props) => {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<ExpenseDetail | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const attachments = detail?.attachments || [];

    const imageAttachments = useMemo(
        () =>
            attachments.filter(
                (attachment) => !isPdfAttachment(attachment) && Boolean(attachment.image_url),
            ),
        [attachments],
    );

    const lightboxSlides = useMemo(
        () =>
            imageAttachments.map((attachment) => {
                const filename =
                    attachment.image_url?.split('?')[0].split('/').pop() ||
                    `expense-attachment-${attachment.id}.jpg`;
                return {
                    src: attachment.image_url || '',
                    alt: `Attachment ${attachment.id}`,
                    downloadFilename: filename,
                };
            }),
        [imageAttachments],
    );

    const loadDetail = async () => {
        if (!expenseId) return;
        setLoading(true);
        try {
            const res = await api.get(`expense/detail?expense_id=${expenseId}`);
            setDetail(res.data?.info || null);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load attachments');
            setDetail(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setDetail(null);
            setLightboxOpen(false);
            setLightboxIndex(0);
            return;
        }
        void loadDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, expenseId]);

    const openAttachment = (attachment: any) => {
        if (isPdfAttachment(attachment)) {
            if (attachment.image_url) {
                window.open(attachment.image_url, '_blank');
            }
            return;
        }

        const index = imageAttachments.findIndex((item) => item.id === attachment.id);
        if (index < 0) return;
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    return (
        <>
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
                    <Typography sx={{fontSize: 18, fontWeight: 700}}>Attachments</Typography>
                    <IconButton size="small" onClick={onClose} aria-label="Close">
                        <IconX size={20} />
                    </IconButton>
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
                        {attachments.length > 0 ? (
                            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 2}}>
                                {attachments.map((attachment) => (
                                    <Box
                                        key={attachment.id}
                                        sx={{
                                            width: {
                                                xs: 'calc(50% - 8px)',
                                                sm: 'calc(33.33% - 11px)',
                                            },
                                        }}
                                    >
                                        <Card
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    boxShadow: 3,
                                                    transform: 'scale(1.02)',
                                                    transition: 'transform 0.2s ease-in-out',
                                                },
                                            }}
                                            onClick={() => openAttachment(attachment)}
                                        >
                                            {isPdfAttachment(attachment) ? (
                                                <Box
                                                    sx={{
                                                        height: 140,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: '#fcfcfc',
                                                        borderBottom: '1px solid',
                                                        borderColor: 'divider',
                                                        color: 'error.main',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    <IconPdf size={40} stroke={1.5} />
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            mt: 1,
                                                            px: 1.5,
                                                            color: 'text.secondary',
                                                            fontWeight: 600,
                                                            textAlign: 'center',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {attachment.image_url?.split('?')[0].split('/').pop() || 'document.pdf'}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <CardMedia
                                                    component="img"
                                                    height="140"
                                                    image={attachment.image_url || '/images/users/user.png'}
                                                    alt={`Attachment ${attachment.id}`}
                                                    sx={{objectFit: 'cover'}}
                                                />
                                            )}
                                        </Card>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary" py={2}>
                                No attachments found
                            </Typography>
                        )}
                    </Box>
                )}
            </Drawer>

            <AttachmentLightbox
                open={lightboxOpen}
                index={lightboxIndex}
                slides={lightboxSlides}
                onClose={() => setLightboxOpen(false)}
            />
        </>
    );
};

export default ExpenseAttachmentsDrawer;
