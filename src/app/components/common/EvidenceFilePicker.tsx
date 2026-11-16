'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { IconFileTypePdf, IconPlayerPlayFilled, IconUpload, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';

// Same rules as the backend upload APIs (user-worklog/add-request-files and the leave/penalty file APIs).
export const EVIDENCE_MAX_FILES = 20;
export const EVIDENCE_MAX_FILE_SIZE = 100 * 1024 * 1024;
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const VIDEO_EXT = ['.mp4', '.mov', '.mkv', '.webm'];
const ALLOWED_EXT = [...IMAGE_EXT, '.pdf', ...VIDEO_EXT];

const getExt = (name: string) => {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot).toLowerCase() : '';
};

type Props = {
    files: File[];
    onChange: (files: File[]) => void;
    disabled?: boolean;
};

/** Pick evidence files before upload: images, PDFs and videos, up to 20, with a small preview and remove. */
const EvidenceFilePicker: React.FC<Props> = ({ files, onChange, disabled = false }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Object URLs for image/video previews, revoked when the list changes or the picker unmounts.
    const previews = useMemo(
        () => files.map((file) => {
            const ext = getExt(file.name);
            const kind = IMAGE_EXT.includes(ext) ? 'image' : VIDEO_EXT.includes(ext) ? 'video' : 'pdf';
            return { file, kind, url: kind === 'pdf' ? null : URL.createObjectURL(file) };
        }),
        [files],
    );
    useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews]);

    const addFiles = (picked: FileList | null) => {
        if (!picked?.length) return;
        const next = [...files];
        const rejected: string[] = [];
        let overLimit = false;

        Array.from(picked).forEach((file) => {
            if (!ALLOWED_EXT.includes(getExt(file.name))) {
                rejected.push(`${file.name}: only images, PDF and videos are allowed`);
            } else if (file.size > EVIDENCE_MAX_FILE_SIZE) {
                rejected.push(`${file.name}: file is larger than 100 MB`);
            } else if (next.some((f) => f.name === file.name && f.size === file.size)) {
                // same file picked twice: keep one
            } else if (next.length >= EVIDENCE_MAX_FILES) {
                overLimit = true;
            } else {
                next.push(file);
            }
        });

        if (overLimit) toast.error(`You can add up to ${EVIDENCE_MAX_FILES} files.`);
        rejected.slice(0, 3).forEach((message) => toast.error(message));
        onChange(next);
        if (inputRef.current) inputRef.current.value = '';
    };

    const removeFile = (index: number) => onChange(files.filter((_, i) => i !== index));
    const isFull = files.length >= EVIDENCE_MAX_FILES;

    return (
        <Box>
            <input
                ref={inputRef}
                type="file"
                multiple
                hidden
                accept={ALLOWED_EXT.join(',')}
                onChange={(e) => addFiles(e.target.files)}
            />

            <ButtonBase
                onClick={() => inputRef.current?.click()}
                disabled={disabled || isFull}
                sx={{
                    width: '100%',
                    py: 1.5,
                    px: 2,
                    border: '1px dashed #bdbdbd',
                    borderRadius: 2,
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'center',
                    color: isFull ? 'text.disabled' : '#1e4db7',
                    bgcolor: '#fafbff',
                    '&:hover': { borderColor: '#1e4db7' },
                }}
            >
                <IconUpload size={18} />
                <Typography fontSize={14} fontWeight={500}>
                    {isFull ? 'Maximum files added' : 'Add files'}
                </Typography>
            </ButtonBase>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Images, PDF or videos · {files.length}/{EVIDENCE_MAX_FILES}
            </Typography>

            {previews.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 72px)', gap: 1, mt: 1.5 }}>
                    {previews.map((preview, index) => (
                        <Tooltip key={`${preview.file.name}-${preview.file.size}-${index}`} title={preview.file.name} placement="top">
                            <Box
                                sx={{
                                    position: 'relative',
                                    aspectRatio: '1 / 1',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    bgcolor: preview.kind === 'pdf' ? '#FDECEC' : '#263238',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {preview.kind === 'image' && (
                                    <Box component="img" src={preview.url!} alt={preview.file.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                                {preview.kind === 'video' && (
                                    <>
                                        <Box component="video" src={`${preview.url}#t=0.1`} muted playsInline preload="metadata" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconPlayerPlayFilled size={18} color="#fff" />
                                        </Box>
                                    </>
                                )}
                                {preview.kind === 'pdf' && <IconFileTypePdf size={26} color="#e53935" />}

                                {/* Small fixed-size remove button in the corner (ButtonBase so theme
                                    IconButton sizes don't stretch it over the preview). */}
                                <ButtonBase
                                    aria-label={`Remove ${preview.file.name}`}
                                    disabled={disabled}
                                    onClick={() => removeFile(index)}
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        width: 20,
                                        height: 20,
                                        minWidth: 20,
                                        p: 0,
                                        borderRadius: '50%',
                                        bgcolor: '#fff',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        transition: 'background-color 0.15s, color 0.15s',
                                        '&:hover, &.Mui-focusVisible': { bgcolor: '#ef4444', color: '#fff', borderColor: '#ef4444' },
                                    }}
                                >
                                    <IconX size={12} stroke={2.5} />
                                </ButtonBase>
                            </Box>
                        </Tooltip>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default EvidenceFilePicker;
