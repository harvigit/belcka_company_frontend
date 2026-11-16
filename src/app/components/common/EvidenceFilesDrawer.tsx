'use client';

import React, { useMemo, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, Dialog, Drawer, IconButton, Tooltip, Typography } from '@mui/material';
import { IconFileTypePdf, IconPaperclip, IconPlayerPlayFilled, IconX } from '@tabler/icons-react';
import AttachmentLightbox from '@/app/components/common/AttachmentLightbox';

// One uploaded evidence file (worklog request, leave, ...) as returned by the API:
// thumb_url is null for PDFs and videos.
export interface EvidenceFile {
    id: number;
    image_url: string;
    thumb_url: string | null;
}

export interface EvidenceFilesDrawerProps {
    open: boolean;
    onClose: () => void;
    files: EvidenceFile[];
    userName?: string | null;
    userImage?: string | null;
    date?: string;
}

type FileKind = 'image' | 'video' | 'pdf' | 'other';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'];
const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'webm', '3gp', 'avi', 'mkv'];

const KIND_LABEL: Record<FileKind, string> = { image: 'IMG', video: 'VIDEO', pdf: 'PDF', other: 'FILE' };

const getExtension = (url: string) => url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
const getFileName = (url: string) => decodeURIComponent(url.split('?')[0].split('/').pop() ?? 'File');

const getFileKind = (file: EvidenceFile): FileKind => {
    const ext = getExtension(file.image_url);
    if (IMAGE_EXT.includes(ext)) return 'image';
    if (VIDEO_EXT.includes(ext)) return 'video';
    if (ext === 'pdf') return 'pdf';
    return 'other';
};

const THUMB_SIZE = 56;

// Small square preview, like the Evidence list in the mobile app.
const FileThumb: React.FC<{ file: EvidenceFile; kind: FileKind; size?: number | string }> = ({ file, kind, size = THUMB_SIZE }) => {
    const boxSx = {
        width: size,
        height: size,
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    if (kind === 'image') {
        return (
            <Box sx={boxSx}>
                <Box
                    component="img"
                    src={file.thumb_url || file.image_url}
                    alt={getFileName(file.image_url)}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </Box>
        );
    }

    if (kind === 'video') {
        return (
            <Box sx={{ ...boxSx, bgcolor: '#263238' }}>
                {/* First frame of the video as its thumbnail */}
                <Box
                    component="video"
                    src={`${file.image_url}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.25)' }}>
                    <IconPlayerPlayFilled size={20} color="#fff" />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ ...boxSx, bgcolor: kind === 'pdf' ? '#FDECEC' : '#EEF2FF' }}>
            {kind === 'pdf' ? <IconFileTypePdf size={28} color="#e53935" /> : <IconPaperclip size={26} color="#3949ab" />}
        </Box>
    );
};

type EvidenceItem = { file: EvidenceFile; kind: FileKind; name: string };

const TILE_SX = {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 2,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    '&:hover, &.Mui-focusVisible': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
};

// Compact tiles: about 4-5 per row; anything after maxVisible is folded into a "+N" tile.
const EvidenceGrid: React.FC<{
    items: EvidenceItem[];
    maxVisible: number;
    expanded: boolean;
    onToggle: () => void;
    onOpen: (item: EvidenceItem) => void;
}> = ({ items, maxVisible, expanded, onToggle, onOpen }) => {
    const hasMore = items.length > maxVisible;
    // Keep the last slot for the "+N" tile so the grid never grows past maxVisible tiles while collapsed.
    const visible = hasMore && !expanded ? items.slice(0, maxVisible - 1) : items;
    const hiddenCount = items.length - visible.length;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 1 }}>
            {visible.map((item) => (
                <Tooltip key={item.file.id} title={item.name} placement="top">
                    <ButtonBase onClick={() => onOpen(item)} aria-label={`Open ${item.name}`} sx={TILE_SX}>
                        <FileThumb file={item.file} kind={item.kind} size="100%" />
                        {item.kind !== 'image' && (
                            <Box
                                component="span"
                                sx={{
                                    position: 'absolute',
                                    left: 4,
                                    bottom: 4,
                                    px: 0.5,
                                    borderRadius: 0.75,
                                    fontSize: 9,
                                    fontWeight: 700,
                                    lineHeight: '14px',
                                    color: '#fff',
                                    bgcolor: 'rgba(15,23,42,0.7)',
                                }}
                            >
                                {KIND_LABEL[item.kind]}
                            </Box>
                        )}
                    </ButtonBase>
                </Tooltip>
            ))}
            {hasMore && (
                <ButtonBase
                    onClick={onToggle}
                    aria-label={expanded ? 'Show fewer files' : `Show ${hiddenCount} more files`}
                    sx={{ ...TILE_SX, bgcolor: '#F4F5F7', flexDirection: 'column', color: 'text.secondary' }}
                >
                    <Typography fontWeight={700} fontSize={16} color="text.primary">
                        {expanded ? 'Less' : `+${hiddenCount}`}
                    </Typography>
                    {!expanded && <Typography fontSize={10}>more</Typography>}
                </ButtonBase>
            )}
        </Box>
    );
};

/**
 * Evidence list like the mobile app: one row per file with a small preview, the file name and its type.
 * Images open in the shared lightbox, videos play in a dialog, PDFs and other files open in a new tab.
 * Used inside EvidenceFilesDrawer and inline (for example in the penalty sidebar).
 */
export const EvidenceFileList: React.FC<{
    files: EvidenceFile[];
    showTitle?: boolean;
    // 'list': one row per file (drawer). 'grid': small square tiles so many files stay short (inline sections).
    variant?: 'list' | 'grid';
    // grid only: tiles shown before a "+N" tile that expands the rest.
    maxVisible?: number;
}> = ({ files, showTitle = true, variant = 'list', maxVisible = 8 }) => {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const items: EvidenceItem[] = useMemo(
        () => (files ?? []).map((file) => ({ file, kind: getFileKind(file), name: getFileName(file.image_url) })),
        [files],
    );
    const imageItems = useMemo(() => items.filter((item) => item.kind === 'image'), [items]);
    const lightboxSlides = useMemo(
        () => imageItems.map((item) => ({ src: item.file.image_url, alt: item.name, downloadFilename: item.name })),
        [imageItems],
    );

    const openFile = (item: EvidenceItem) => {
        if (item.kind === 'image') {
            setLightboxIndex(imageItems.findIndex((image) => image.file.id === item.file.id));
        } else if (item.kind === 'video') {
            setVideoUrl(item.file.image_url);
        } else {
            window.open(item.file.image_url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <>
            {showTitle && (
                <Typography fontSize={16} fontWeight={600} mb={1.5}>
                    Evidence ({items.length})
                </Typography>
            )}

            {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={2}>
                    No files uploaded.
                </Typography>
            ) : variant === 'grid' ? (
                <EvidenceGrid items={items} maxVisible={maxVisible} expanded={expanded} onToggle={() => setExpanded((v) => !v)} onOpen={openFile} />
            ) : (
                <Box display="flex" flexDirection="column" gap={1}>
                    {items.map((item) => (
                        <Box
                            key={item.file.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => openFile(item)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openFile(item);
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.25,
                                borderRadius: 2.5,
                                bgcolor: '#F4F5F7',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'background-color 0.15s',
                                '&:hover, &:focus-visible': { bgcolor: '#E9ECF1' },
                            }}
                        >
                            <FileThumb file={item.file} kind={item.kind} />
                            <Box minWidth={0} flex={1}>
                                <Typography fontSize={14} fontWeight={500} noWrap title={item.name}>
                                    {item.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {KIND_LABEL[item.kind]}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            <AttachmentLightbox
                open={lightboxIndex !== null}
                index={lightboxIndex ?? 0}
                slides={lightboxSlides}
                onClose={() => setLightboxIndex(null)}
            />

            <Dialog
                open={Boolean(videoUrl)}
                onClose={() => setVideoUrl(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { bgcolor: '#000', position: 'relative' } }}
            >
                <IconButton
                    onClick={() => setVideoUrl(null)}
                    aria-label="Close video"
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                >
                    <IconX size={20} />
                </IconButton>
                {videoUrl && (
                    <Box component="video" src={videoUrl} controls autoPlay playsInline sx={{ width: '100%', maxHeight: '80vh', display: 'block' }} />
                )}
            </Dialog>
        </>
    );
};

/**
 * "📎 Evidence (n)" button. Renders nothing when there are no files. Safe inside a clickable card or a
 * Link: it renders as a span and stops the click, so only the evidence drawer opens.
 */
export const EvidenceButton: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => {
    if (!count) return null;
    return (
        <Tooltip title="View evidence">
            <Button
                component="span"
                size="small"
                variant="outlined"
                startIcon={<IconPaperclip size={16} />}
                onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick();
                }}
                sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2, whiteSpace: 'nowrap', minWidth: 0 }}
            >
                Evidence ({count})
            </Button>
        </Tooltip>
    );
};

const EvidenceFilesDrawer: React.FC<EvidenceFilesDrawerProps> = ({ open, onClose, files, userName, userImage, date }) => (
    <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
            '& .MuiDrawer-paper': {
                width: { xs: '100%', sm: 440 },
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff',
            },
        }}
    >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
                    <Avatar src={userImage || undefined} sx={{ width: 40, height: 40 }}>
                        {userName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box minWidth={0}>
                        <Typography fontWeight={600} noWrap>
                            {userName || 'Evidence'}
                        </Typography>
                        {date && (
                            <Typography variant="caption" color="text.secondary">
                                {date}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" aria-label="Close">
                    <IconX size={20} />
                </IconButton>
            </Box>
        </Box>

        {/* Evidence list (remounted on open so viewers start closed) */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
            {open && <EvidenceFileList files={files} />}
        </Box>
    </Drawer>
);

export default EvidenceFilesDrawer;
