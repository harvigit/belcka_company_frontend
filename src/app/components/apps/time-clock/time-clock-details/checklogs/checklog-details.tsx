"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState} from 'react';
import api from '@/utils/axios';
import {
    Box,
    Typography,
    CircularProgress,
    LinearProgress,
    IconButton,
    Drawer,
    Tooltip,
    Collapse,
    Button,
} from '@mui/material';
import Image from 'next/image';
import {IconArrowLeft, IconChevronDown, IconChevronUp} from '@tabler/icons-react';
import {Stack} from '@mui/system';
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

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
    name?: string;
    trade_name?: string;
    status_text?: string;
    status_color?: string;
    progress?: number;
    before_attachments: Attachment[];
    after_attachments: Attachment[];
}

export default function ChecklogDetailPage({checklogId, open, onClose}: ChecklogDetailPageProps) {
    const [loading, setLoading] = useState<boolean>(false);
    const [checklogTasks, setChecklogTasks] = useState<ChecklogTask[]>([]);
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    const [editableProgress, setEditableProgress] = useState<Record<number, number>>({});
    const [originalProgress, setOriginalProgress] = useState<Record<number, number>>({});
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null } & {
    user_role_id: number;
    };

    useEffect(() => {
        if (checklogId && open) {
            fetchChecklogDetail();
        }
    }, [checklogId, open]);

    const fetchChecklogDetail = async () => {
        if (!checklogId) return;

        setLoading(true);
        try {
            const res = await api.get(`user-checklog/details?checklog_id=${checklogId}`);
            if (res.data?.IsSuccess && Array.isArray(res.data.info.task_list)) {
                setChecklogTasks(res.data.info.task_list);
            } else {
                setChecklogTasks([]);
            }
        } catch (err) {
            console.error('Error fetching checklog details:', err);
            setChecklogTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const hasProgressChanged = (taskId: number) =>
    editableProgress[taskId] !== originalProgress[taskId];


    useEffect(() => {
    if (checklogTasks.length > 0) {
        const initialProgress: Record<number, number> = {};
        const original: Record<number, number> = {};

        checklogTasks.forEach((task: any) => {
        initialProgress[task.id] = task.progress ?? 0;
        original[task.id] = task.progress ?? 0;
        });

        setEditableProgress(initialProgress);
        setOriginalProgress(original);
    }
    }, [checklogTasks]);

    const handleUpdateProgress = async (taskId: number) => {
    try {
        console.log(taskId)
        const res = await api.put("company-tasks/update", {
            id: taskId,
            progress: String(editableProgress[taskId]),
            company_id: user.company_id,
        });

        if (res.data?.IsSuccess) {
            toast.success(res.data.message);
            await fetchChecklogDetail();
            onClose?.();
        }

        setOriginalProgress((prev) => ({
        ...prev,
        [taskId]: editableProgress[taskId],
        }));
    } catch (err) {
        console.error(err);
    }
    };


    const toggleExpand = (index: number) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const getProgressColor = (progress: number) => {
        if (progress < 25) return '#FF0000';
        if (progress < 50) return '#FF7A00';
        if (progress < 75) return '#FFD700';
        return '#32A852';
    };

    const truncateText = (text: string, maxLength: number = 12) => {
        if (!text) return "";
        return text.length > maxLength
            ? `${text.substring(0, maxLength)}...`
            : text;
    };

    const hasAttachments = (checklog: ChecklogTask) => {
        return (checklog.before_attachments && checklog.before_attachments.length > 0) ||
            (checklog.after_attachments && checklog.after_attachments.length > 0);
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{
                width: { xs: '100%', sm: 500 },
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: { xs: '100%', sm: 500 },
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
                    <Typography variant="h5" fontWeight={700}>
                        Checklog Task Details
                    </Typography>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <CircularProgress/>
                    </Box>
                ) : checklogTasks.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <Typography className="f-18">No detail found for this checklog!</Typography>
                    </Box>
                ) : (
                    checklogTasks.map((checklog: any, index) => (
                        <Box key={checklog.id || index} mb={3}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    border: '1px solid #ccc',
                                    borderRadius: 2,
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    '&:hover': {
                                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                    },
                                }}
                            >
                                {/* Labels */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -10,
                                        left: 16,
                                        right: 16,
                                        display: 'flex',
                                        gap: 1,
                                        flexWrap: 'wrap',
                                        zIndex: 1,
                                    }}
                                >
                                    {checklog.trade_name && (
                                        <Tooltip title={checklog.trade_name} arrow>
                                            <Box
                                                sx={{
                                                    backgroundColor: '#FF7A00',
                                                    border: '1px solid #FF7A00',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 500,
                                                    px: 1,
                                                    py: 0.2,
                                                    borderRadius: '999px',
                                                    maxWidth: '80px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {truncateText(checklog.trade_name)}
                                            </Box>
                                        </Tooltip>
                                    )}

                                    {checklog.status_text && (
                                        <Box
                                            sx={{
                                                backgroundColor: checklog.status_color || '#777',
                                                border: `1px solid ${checklog.status_color || '#777'}`,
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 500,
                                                px: 1,
                                                py: 0.2,
                                                borderRadius: '999px',
                                            }}
                                        >
                                            {checklog.status_text}
                                        </Box>
                                    )}
                                </Box>

                                {/* Work row */}
                                <Stack
                                    spacing={2}
                                    sx={{width: '100%', mt: 1}}
                                >
                                    <Typography
                                        variant="h6"
                                        mb={1}
                                        className="f-18"
                                    >
                                        {checklog.name || "Untitled Task"}
                                    </Typography>

                                    {/* Progress bar with expand button */}
                                    {checklog.progress !== undefined && (
                                        <Box sx={{ position: 'relative' }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                                                <Typography
                                                    variant="body1"
                                                    className="f-16"
                                                >
                                                    Progress: {editableProgress[checklog.id] ?? 0}%
                                                </Typography>
                                                {hasAttachments(checklog) && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleExpand(index)}
                                                        sx={{
                                                            padding: 0.5,
                                                        }}
                                                    >
                                                        {expandedTasks.has(index) ? (
                                                            <IconChevronUp size={20} />
                                                        ) : (
                                                            <IconChevronDown size={20} />
                                                        )}
                                                    </IconButton>
                                                )}
                                            </Stack>
                                            {checklog.status_int !== 4 ? (
                                                <>
                                                <input
                                                type="range"
                                                min={0}
                                                max={99}
                                                value={editableProgress[checklog.id] ?? 0}
                                                onChange={(e) =>
                                                    setEditableProgress((prev) => ({
                                                    ...prev,
                                                    [checklog.id]: Number(e.target.value),
                                                    }))
                                                }
                                                style={{
                                                    width: "100%",
                                                    height: "10px",
                                                    appearance: "none",
                                                    background: `linear-gradient(
                                                    to right,
                                                    ${getProgressColor(editableProgress[checklog.id] ?? 0)} ${editableProgress[checklog.id] ?? 0}%,
                                                    #eee ${editableProgress[checklog.id] ?? 0}%
                                                    )`,
                                                    borderRadius: "5px",
                                                    outline: "none",
                                                    cursor: "pointer",
                                                }}
                                                />

                                                </>
                                            ) : (
                                                <LinearProgress
                                                variant="determinate"
                                                value={checklog.progress}
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 5,
                                                    "& .MuiLinearProgress-bar": {
                                                    backgroundColor: getProgressColor(checklog.progress),
                                                    },
                                                    backgroundColor: "#eee",
                                                }}
                                                />
                                            )}
                                        </Box>
                                    )}
                                </Stack>
                            </Box>

                            {/* Collapsible Attachments Section */}
                            <Collapse in={expandedTasks.has(index)} timeout="auto" unmountOnExit>
                                <Box mt={2}>
                                    {/* Photos Before */}
                                    {checklog.before_attachments && checklog.before_attachments.length > 0 && (
                                        <Box mb={2} p={2} sx={{ backgroundColor: '#fff', borderRadius: 2 }}>
                                            <Typography mb={2} fontWeight="bold" variant="subtitle1">
                                                Photos Before
                                            </Typography>
                                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                                {checklog.before_attachments.map((img: any, idx: any) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            transition: 'transform .2s',
                                                            cursor: 'pointer',
                                                            width: 'calc(50% - 8px)',
                                                            '&:hover': {
                                                                transform: 'scale(1.05)',
                                                            },
                                                        }}
                                                        onMouseEnter={() => setHoveredImage(img.image_url)}
                                                        onMouseLeave={() => setHoveredImage(null)}
                                                    >
                                                        <Image
                                                            width={200}
                                                            height={200}
                                                            src={img.image_url}
                                                            alt={`Before image ${idx + 1}`}
                                                            style={{
                                                                borderRadius: 8,
                                                                objectFit: 'cover',
                                                                width: '100%',
                                                                height: 'auto',
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}

                                    {/* Photos After */}
                                    {checklog.after_attachments && checklog.after_attachments.length > 0 && (
                                        <Box mb={2} p={2} sx={{ backgroundColor: '#fff', borderRadius: 2 }}>
                                            <Typography mb={2} fontWeight="bold" variant="subtitle1">
                                                Photos After
                                            </Typography>
                                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                                {checklog.after_attachments.map((img: any, idx : any) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            transition: 'transform .2s',
                                                            cursor: 'pointer',
                                                            width: 'calc(50% - 8px)',
                                                            '&:hover': {
                                                                transform: 'scale(1.05)',
                                                            },
                                                        }}
                                                        onMouseEnter={() => setHoveredImage(img.image_url)}
                                                        onMouseLeave={() => setHoveredImage(null)}
                                                    >
                                                        <Image
                                                            width={200}
                                                            height={200}
                                                            src={img.image_url}
                                                            alt={`After image ${idx + 1}`}
                                                            style={{
                                                                borderRadius: 8,
                                                                objectFit: 'cover',
                                                                width: '100%',
                                                                height: 'auto',
                                                            }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>

                            {hasProgressChanged(checklog.id) && (
                            <Button  color="primary" variant="contained" size="large" onClick={() => handleUpdateProgress(checklog.id)} sx={{ mt: 2 ,borderRadius: 3, width: "50%"}}>
                                Update Progress
                            </Button>
                            )}
                        </Box>
                    ))
                )}

                {/* Hover Preview */}
                {hoveredImage && (
                    <Box
                        sx={{
                            position: "fixed",
                            top: "30%",
                            left: "35%",
                            width: "25%",
                            maxHeight: "80vh",
                            zIndex: 2000,
                            border: "1px solid #ccc",
                            borderRadius: 2,
                            overflow: "hidden",
                            backgroundColor: "#fff",
                            boxShadow: 3,
                        }}
                    >
                        <Box
                            component="img"
                            src={hoveredImage}
                            alt="Preview"
                            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}
