'use client';

import React from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { IconX } from '@tabler/icons-react';

type Props = {
    open: boolean;
    onClose: () => void;
    onScratch: () => void;
    onTemplate: () => void;
};

/* ─── SVG Illustrations ─── */

const ScratchIllustration = () => (
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
        <rect x="11" y="8" width="42" height="54" rx="5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
        <rect x="19" y="21" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="19" y="29" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="19" y="37" width="23" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="19" y="45" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        {/* Pencil */}
        <rect
            x="44" y="42" width="7" height="20" rx="2"
            transform="rotate(-45 44 42)"
            fill="currentColor"
        />
        <path d="M56 30l6 6-2.5 1L55 32l1-2z" fill="currentColor" opacity="0.8" />
        <path d="M49 54l3 3-4 1 1-4z" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.8" />
        {/* Sparkles */}
        <circle cx="62" cy="16" r="2.5" fill="currentColor" opacity="0.35" />
        <path d="M66 26v4M64 28h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        <circle cx="12" cy="66" r="2" fill="currentColor" opacity="0.25" />
    </svg>
);

const TemplateIllustration = () => (
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
        {/* Back paper */}
        <rect x="7" y="14" width="38" height="50" rx="5" fill="currentColor" stroke="currentColor" strokeWidth="1.2" opacity="0.18" />
        <rect x="13" y="26" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.35" />
        <rect x="13" y="33" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        {/* Front paper */}
        <rect x="19" y="8" width="40" height="52" rx="5" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.5" />
        {/* Header bar */}
        <rect x="19" y="8" width="40" height="14" rx="5" fill="currentColor" opacity="0.12" />
        <rect x="19" y="16" width="40" height="6" fill="currentColor" opacity="0.12" />
        {/* Lines */}
        <rect x="26" y="28" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="26" y="35" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="26" y="42" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="26" y="49" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
        {/* Star */}
        <circle cx="60" cy="20" r="10" fill="currentColor" opacity="0.12" />
        <path d="M60 13l1.8 3.6 4 .58-2.9 2.83.68 3.98L60 22.04l-3.58 1.95.68-3.98-2.9-2.83 4-.58L60 13z" fill="currentColor" />
    </svg>
);

const FileIllustration = () => (
    <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
        <rect x="9" y="9" width="40" height="52" rx="5" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
        <path d="M35 9L49 9L49 23Z" fill="currentColor" opacity="0.18" />
        <path d="M35 9L35 23L49 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="16" y="31" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
        <rect x="16" y="38" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        <rect x="16" y="45" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.3" />
        {/* Upload badge */}
        <circle cx="57" cy="57" r="14" fill="currentColor" />
        <path d="M57 51v10M52 56l5-5 5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Sparkle */}
        <path d="M66 36v3M64.5 37.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <circle cx="66" cy="28" r="2" fill="currentColor" opacity="0.4" />
    </svg>
);

/* ─── Option card ─── */

type OptionProps = {
    illustration: React.ReactNode;
    title: string;
    subtitle?: string;
    badge?: string;
    tone?: 'primary' | 'secondary';
    onClick?: () => void;
};

const AddOption = ({
                       illustration,
                       title,
                       subtitle,
                       badge,
                       tone = 'primary',
                       onClick,
                   }: OptionProps) => (
    <Paper
        elevation={0}
        onClick={onClick}
        sx={{
            p: 3,
            height: 220,
            border: '1px solid #F1F5F9',
            borderRadius: 3,
            backgroundColor: '#FAFAFA',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            userSelect: 'none',

            '&:hover': onClick
                ? {
                    borderColor: '#E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    transform: 'translateY(-2px)',
                }
                : {},
        }}
    >
        <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            height="100%"
        >
            <Box
                sx={{
                    width: 100,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    backgroundColor: '#F8FAFC',
                    color: `${tone}.main`,
                }}
            >
                {illustration}
            </Box>

            <Stack alignItems="center" spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                        sx={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: '#374151',
                        }}
                    >
                        {title}
                    </Typography>

                    {badge && (
                        <Chip
                            label={badge}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 500,
                                bgcolor: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE',

                                '& .MuiChip-label': {
                                    px: 1,
                                },
                            }}
                        />
                    )}
                </Stack>

                {subtitle && (
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: '#9CA3AF',
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Stack>
        </Stack>
    </Paper>
);

/* ─── Dialog ─── */
const AddFormDialog = ({ open, onClose, onScratch, onTemplate }: Props) => (
    <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
            elevation: 0,
            sx: {
                borderRadius: 4,
                maxWidth: 560,
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            },
        }}
    >
        <DialogContent sx={{p: {xs: 2.5, sm: 3}}}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'minmax(0, 1fr)',
                        sm: 'repeat(2, minmax(0, 220px))',
                    },
                    gap: 3,
                    justifyContent: 'center',
                }}
            >
                <AddOption
                    illustration={<ScratchIllustration />}
                    title="Start from scratch"
                    onClick={onScratch}
                />

                <AddOption
                    illustration={<TemplateIllustration />}
                    title="Use a template"
                    tone="secondary"
                    onClick={onTemplate}
                />

                {/*
                <AddOption
                    illustration={<FileIllustration />}
                    title="Create from file"
                    subtitle="AI-powered"
                    badge="Beta"
                />
                */}
            </Box>
        </DialogContent>
    </Dialog>
);

export default AddFormDialog;
