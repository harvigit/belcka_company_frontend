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
} from '@mui/material';
import Image from 'next/image';
import {IconArrowLeft} from '@tabler/icons-react';
import {Stack} from '@mui/system';

interface ChecklogDetailPageProps {
    checklogId: number | null;
    open: boolean;
    onClose: () => void;
}

interface Attachment {
    image_url: string;
    thumb_url: string;
}

interface ChecklogTask {
    id?: number;
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
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);

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

    const renderAttachmentGrid = (
        attachments: Attachment[],
        label: string,
    ) => {
        if (attachments.length === 0) return null;

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
                    {attachments.map((img: Attachment, idx: number) => (
                        <Box
                            key={`${label}-${img.image_url}-${idx}`}
                            sx={{
                                width: 'calc(50% - 6px)',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={() => setHoveredImage(img.image_url)}
                            onMouseLeave={() => setHoveredImage(null)}
                        >
                            <Image
                                width={220}
                                height={160}
                                src={img.thumb_url || img.image_url}
                                alt={`${label} ${idx + 1}`}
                                style={{
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    width: '100%',
                                    height: 130,
                                }}
                            />
                        </Box>
                    ))}
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
                            beforeAttachments.length > 0 || afterAttachments.length > 0;

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
                                                    {renderAttachmentGrid(
                                                        beforeAttachments,
                                                        'Before Attachments',
                                                    )}
                                                    {renderAttachmentGrid(
                                                        afterAttachments,
                                                        'After Attachments',
                                                    )}
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

                {/* Hover Preview */}
                {hoveredImage && (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: '30%',
                            left: '35%',
                            width: '25%',
                            maxHeight: '80vh',
                            zIndex: 2000,
                            border: '1px solid #ccc',
                            borderRadius: 2,
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            boxShadow: 3,
                        }}
                    >
                        <Box
                            component="img"
                            src={hoveredImage}
                            alt="Preview"
                            sx={{width: '100%', height: '100%', objectFit: 'contain'}}
                        />
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
