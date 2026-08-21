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
import {IconX} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import AttachmentLightbox from '@/app/components/common/AttachmentLightbox';
import {PriceworkAttachment, PriceworkDetail} from '../types';

type Props = {
    open: boolean;
    pricework: PriceworkDetail | null;
    onClose: () => void;
};

const PriceworkAttachmentsDrawer = ({open, pricework, onClose}: Props) => {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<PriceworkDetail | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const attachments = detail?.attachments || [];

    const lightboxSlides = useMemo(
        () =>
            attachments
                .filter((item) => Boolean(item.image_url))
                .map((attachment, index) => ({
                    src: attachment.image_url as string,
                    alt: `Attachment ${attachment.id}`,
                    downloadFilename:
                        attachment.image_url?.split('?')[0].split('/').pop() ||
                        `pricework-${index + 1}.jpg`,
                })),
        [attachments],
    );

    const loadDetail = async () => {
        if (!pricework?.id) return;
        setLoading(true);
        try {
            const params =
                pricework.record_type === 'timesheet_light'
                    ? {
                        pricework_id: pricework.timesheet_light_id ?? pricework.id,
                        record_type: 'timesheet_light',
                        checklog_id: pricework.user_checklog_id ?? pricework.id,
                    }
                    : {pricework_id: pricework.pricework_id ?? pricework.id};
            const res = await api.get('pricework/detail', {params});
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
    }, [open, pricework?.id, pricework?.timesheet_light_id, pricework?.user_checklog_id, pricework?.record_type]);

    const openAttachment = (attachment: PriceworkAttachment) => {
        const index = attachments.findIndex((item) => item.id === attachment.id);
        if (index < 0 || !attachment.image_url) return;
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
                                                '&:hover': {boxShadow: 3},
                                            }}
                                            onClick={() => openAttachment(attachment)}
                                        >
                                            <CardMedia
                                                component="img"
                                                height="140"
                                                image={
                                                    attachment.thumb_url ||
                                                    attachment.image_url ||
                                                    '/images/users/user.png'
                                                }
                                                alt={`Attachment ${attachment.id}`}
                                                sx={{objectFit: 'cover'}}
                                            />
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

export default PriceworkAttachmentsDrawer;
