'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar, Box, Chip, Divider, IconButton, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
    Drawer, InputAdornment, Snackbar, Button, Autocomplete, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress,
} from '@mui/material';
import {
    IconSearch, IconX, IconPlus,
    IconPencil, IconTrash,
    IconPhoto, IconVideo, IconMusic, IconFileText, IconFile,
    IconCloudUpload, IconPaperclip, IconDownload, IconExternalLink,
} from '@tabler/icons-react';
import Image from 'next/image';
import { flexRender,
} from '@tanstack/react-table';

import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import { useServerTable } from '@/hooks/useServerTable';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';

export type IncidentRow = {
    id: number;
    added_by: string;
    user_thumb_image?: string;
    title: string;
    incident_type: string;
    incident_type_id: number | null;
    threat_level: string;
    threat_level_id: number | null;
    notify_to_id: number | null;
    attachment: string;
    files?: any[];
    date: string;
};

type FormatKey = 'image' | 'video' | 'audio' | 'pdf' | 'doc';

interface AttachmentFile {
    uid: string;
    source: 'new' | 'existing';
    file?: File;
    existing?: any;
    previewUrl: string;
    name: string;
    size?: number;
    mimeType: string;
    formatKey: FormatKey;
    downloadUrl?: string;
}

interface FormState {
    title: string;
    incidentType: string;
    threatLevel: string;
    notifyTo: string;
}

type FormErrors = Partial<Record<keyof FormState | 'files', string>>;

interface Props {
    companyId: number;
}

const FORMAT_META: Record<FormatKey, { bg: string; color: string; label: string }> = {
    image: { bg: '#E6F1FB', color: '#185FA5', label: 'Image' },
    video: { bg: '#FAECE7', color: '#993C1D', label: 'Video' },
    audio: { bg: '#EEEDFE', color: '#534AB7', label: 'Audio' },
    pdf:   { bg: '#FCEBEB', color: '#A32D2D', label: 'PDF' },
    doc:   { bg: '#F1EFE8', color: '#5F5E5A', label: 'Document' },
};

const PAGE_SIZES = [50, 100, 250, 500];

const INITIAL_FORM: FormState = { title: '', incidentType: '', threatLevel: '', notifyTo: '' };

const mkUid = (): string => Math.random().toString(36).slice(2);

const resolveFormatKey = (mime: string): FormatKey => {
    if (!mime) return 'doc';
    const m = mime.toLowerCase();
    if (m.startsWith('image/') || m.includes('image')) return 'image';
    if (m.startsWith('video/') || m.includes('video')) return 'video';
    if (m.startsWith('audio/') || m.includes('audio')) return 'audio';
    if (m === 'application/pdf' || m.includes('pdf'))   return 'pdf';
    return 'doc';
};

const formatSize = (bytes?: number): string => {
    if (!bytes) return '';
    return bytes >= 1_048_576
        ? `${(bytes / 1_048_576).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`;
};

const fromExisting = (raw: any): AttachmentFile => {
    const docType = raw?.doc_type || raw?.type || raw?.mime_type || '';
    const fk = resolveFormatKey(docType);
    const url = fk === 'image'
        ? (raw?.image_url || raw?.image_thumb_url || raw?.file || '')
        : (raw?.file || raw?.image_url || '');
    const name = raw?.original_name
        || url.split('/').pop()?.split('?')[0]
        || `attachment-${raw?.id ?? ''}`;
    return {
        uid: mkUid(), source: 'existing', existing: raw,
        previewUrl: url, downloadUrl: url,
        name, size: raw?.size, mimeType: docType, formatKey: fk,
    };
};

const fromNewFile = (f: File): AttachmentFile => ({
    uid: mkUid(), source: 'new', file: f,
    previewUrl: URL.createObjectURL(f),
    name: f.name, size: f.size, mimeType: f.type,
    formatKey: resolveFormatKey(f.type),
});

const revokeNew = (af: AttachmentFile) => {
    if (af.source === 'new' && af.previewUrl) URL.revokeObjectURL(af.previewUrl);
};

const getThreatColor = (level: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (level?.toLowerCase()) {
        case 'low':      return 'success';
        case 'medium':   return 'warning';
        case 'high':
        case 'critical': return 'error';
        default:         return 'default';
    }
};

const downloadAttachment = async (af: AttachmentFile, onError: (msg: string) => void) => {
    const url = af.downloadUrl || af.previewUrl;
    if (!url) { onError('Download URL not available'); return; }

    const triggerLink = (href: string, download?: string, newTab = false) => {
        const a = document.createElement('a');
        a.href = href;
        if (download) a.download = download;
        if (newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (af.formatKey === 'pdf') {
        triggerLink(url, af.name || 'file.pdf', true);
        return;
    }

    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        triggerLink(blobUrl, af.name || 'attachment');
        URL.revokeObjectURL(blobUrl);
    } catch {
        try {
            triggerLink(url, undefined, true);
        } catch {
            onError('Failed to download file.');
        }
    }
};

const useSnackbar = () => {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage]     = useState<string | null>(null);
    const showSuccess = useCallback((msg: string) => setSuccessMessage(msg), []);
    const showError   = useCallback((msg: string) => setErrorMessage(msg), []);
    const clear       = useCallback(() => { setSuccessMessage(null); setErrorMessage(null); }, []);
    return { successMessage, errorMessage, showSuccess, showError, clear };
};

const useAttachments = () => {
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [removedIds, setRemovedIds]   = useState<number[]>([]);

    const reset = useCallback(() => {
        setAttachments(prev => { prev.forEach(revokeNew); return []; });
        setRemovedIds([]);
    }, []);

    const addFiles = useCallback((files: File[]) => {
        setAttachments(prev => [...prev, ...files.map(fromNewFile)]);
    }, []);

    const remove = useCallback((uid: string) => {
        setAttachments(prev => {
            const target = prev.find(a => a.uid === uid);
            if (!target) return prev;
            if (target.source === 'existing' && target.existing?.id) {
                setRemovedIds(ids => ids.includes(target.existing.id) ? ids : [...ids, target.existing.id]);
            }
            if (target.source === 'new') revokeNew(target);
            return prev.filter(a => a.uid !== uid);
        });
    }, []);

    const loadExisting = useCallback((files: any[]) => {
        setAttachments(files.map(fromExisting));
        setRemovedIds([]);
    }, []);

    const existingCount = useMemo(() => attachments.filter(a => a.source === 'existing').length, [attachments]);
    const newCount      = useMemo(() => attachments.filter(a => a.source === 'new').length, [attachments]);

    return { attachments, removedIds, existingCount, newCount, reset, addFiles, remove, loadExisting };
};

const FormatIcon = ({ fk, size = 18 }: { fk: FormatKey; size?: number }) => {
    const color = FORMAT_META[fk].color;
    const p = { size, color };
    if (fk === 'image') return <IconPhoto {...p} />;
    if (fk === 'video') return <IconVideo {...p} />;
    if (fk === 'audio') return <IconMusic {...p} />;
    if (fk === 'pdf')   return <IconFileText {...p} />;
    return <IconFile {...p} />;
};

const FormatChip = ({ fk, small = true }: { fk: FormatKey; small?: boolean }) => {
    const meta = FORMAT_META[fk];
    return (
        <Chip
            label={meta.label}
            size="small"
            sx={{
                height: small ? 18 : undefined,
                fontSize: small ? 10 : '0.75rem',
                bgcolor: meta.bg, color: meta.color,
                fontWeight: 600, px: 0.5,
            }}
        />
    );
};

const Thumbnail = ({ af }: { af: AttachmentFile }) => {
    const { formatKey: fk, previewUrl } = af;
    const meta = FORMAT_META[fk];
    if (fk === 'image' && previewUrl) {
        return (
            <Box component="img" src={previewUrl} alt={af.name}
                 sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                 onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
            />
        );
    }
    if (fk === 'video' && previewUrl) {
        return (
            <Box component="video" src={previewUrl} preload="metadata" muted
                 sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
            />
        );
    }
    return (
        <Box sx={{
            width: 48, height: 48, borderRadius: '10px', flexShrink: 0,
            bgcolor: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <FormatIcon fk={fk} size={22} />
        </Box>
    );
};

const AttachmentCard = React.memo(({ af, onRemove }: { af: AttachmentFile; onRemove: () => void }) => (
    <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px',
        bgcolor: 'background.paper', transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': { borderColor: 'primary.main', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }}>
        <Thumbnail af={af} />
        <Box flex={1} minWidth={0}>
            <Typography variant="body2" fontWeight={500} noWrap title={af.name}>{af.name}</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" mt={0.3} flexWrap="wrap">
                <FormatChip fk={af.formatKey} />
                {af.size ? <Typography variant="caption" color="text.secondary">{formatSize(af.size)}</Typography> : null}
                {af.source === 'existing' && (
                    <Chip label="Saved" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, px: 0.5 }} />
                )}
                {af.source === 'new' && (
                    <Chip label="New" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 600, px: 0.5 }} />
                )}
            </Stack>
        </Box>
        <Tooltip title="Remove">
            <IconButton size="small" onClick={onRemove} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                <IconX size={16} />
            </IconButton>
        </Tooltip>
    </Box>
));
AttachmentCard.displayName = 'AttachmentCard';

const DropZone = React.memo(({ onFiles, fileInputRef, hasError }: {
    onFiles: (files: File[]) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    hasError?: boolean;
}) => {
    const [dragOver, setDragOver] = useState(false);
    return (
        <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length) onFiles(files);
            }}
            sx={{
                border: '2px dashed',
                borderColor: hasError ? 'error.main' : dragOver ? 'primary.main' : 'divider',
                borderRadius: '12px', py: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', gap: 1,
                bgcolor: hasError
                    ? 'rgba(211,47,47,0.04)'
                    : dragOver ? 'action.selected' : 'background.default',
                transition: 'all 0.18s',
                '&:hover': {
                    borderColor: hasError ? 'error.dark' : 'primary.main',
                    bgcolor: hasError ? 'rgba(211,47,47,0.07)' : 'action.hover',
                },
            }}
        >
            <Box sx={{
                width: 44, height: 44, borderRadius: '12px',
                bgcolor: hasError ? '#FCEBEB' : '#E6F1FB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <IconCloudUpload size={22} color={hasError ? '#A32D2D' : '#185FA5'} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={600} color={hasError ? 'error.main' : 'primary.main'}>
                    Click to upload or drag & drop
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Images, Videos, Audio, PDF · Max 100 MB each
                </Typography>
            </Box>
        </Box>
    );
});
DropZone.displayName = 'DropZone';

const AttachmentViewerCard = React.memo(({ af, onDownload }: {
    af: AttachmentFile;
    onDownload: (af: AttachmentFile) => void;
}) => {
    const meta = FORMAT_META[af.formatKey];

    const renderPreview = () => {
        if (af.formatKey === 'image' && af.previewUrl) {
            return (
                <Box component="img" src={af.previewUrl} alt={af.name}
                     sx={{
                         width: '100%', maxHeight: 320, objectFit: 'contain',
                         borderRadius: '12px', cursor: 'pointer',
                         transition: 'transform 0.2s',
                         '&:hover': { transform: 'scale(1.02)' },
                     }}
                     onClick={() => window.open(af.previewUrl, '_blank')}
                />
            );
        }
        if (af.formatKey === 'video' && af.previewUrl) {
            return (
                <Box component="video" src={af.previewUrl} controls muted preload="metadata"
                     sx={{ width: '100%', maxHeight: 320, borderRadius: '12px', backgroundColor: '#000' }}
                />
            );
        }
        if (af.formatKey === 'audio' && af.previewUrl) {
            return (
                <Box sx={{
                    height: 120, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    bgcolor: meta.bg, borderRadius: '12px',
                }}>
                    <Box sx={{
                        width: 56, height: 56, borderRadius: '50%',
                        bgcolor: meta.color + '22', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <IconMusic size={28} color={meta.color} />
                    </Box>
                    <Box component="audio" src={af.previewUrl} controls sx={{ width: '90%', maxWidth: 340 }} />
                </Box>
            );
        }
        if (af.formatKey === 'pdf') {
            return (
                <Box sx={{
                    height: 200, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 1.5,
                    bgcolor: meta.bg, borderRadius: '12px', cursor: 'pointer',
                    transition: 'opacity 0.15s', '&:hover': { opacity: 0.85 },
                }} onClick={() => window.open(af.previewUrl || af.downloadUrl, '_blank')}>
                    <IconFileText size={64} color={meta.color} />
                    <Typography variant="caption" color={meta.color} fontWeight={600}>Click to open PDF</Typography>
                </Box>
            );
        }
        return (
            <Box sx={{
                height: 200, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 1.5,
                bgcolor: meta.bg, borderRadius: '12px',
            }}>
                <FormatIcon fk={af.formatKey} size={64} />
                <Typography variant="caption" color={meta.color} fontWeight={600}>{meta.label}</Typography>
            </Box>
        );
    };

    return (
        <Box sx={{
            bgcolor: 'background.paper', borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: '1px solid', borderColor: 'divider',
        }}>
            <Box sx={{ p: 2, bgcolor: '#fafafa' }}>{renderPreview()}</Box>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1} pr={2} minWidth={0}>
                        <Typography variant="body1" fontWeight={600} noWrap title={af.name}>{af.name}</Typography>
                        <Stack direction="row" spacing={1} mt={0.5} alignItems="center" flexWrap="wrap">
                            <FormatChip fk={af.formatKey} small={false} />
                            {af.size && (
                                <Typography variant="caption" color="text.secondary">{formatSize(af.size)}</Typography>
                            )}
                            {af.source === 'existing' && (
                                <Chip label="Saved" size="small" color="success" variant="outlined" />
                            )}
                        </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                        <Tooltip title="Download">
                            <IconButton size="small" onClick={() => onDownload(af)} sx={{ color: 'primary.main' }}>
                                <IconDownload size={20} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Open in new tab">
                            <IconButton size="small"
                                        onClick={() => window.open(af.previewUrl || af.downloadUrl, '_blank')}
                                        sx={{ color: 'text.secondary' }}>
                                <IconExternalLink size={20} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Box>
        </Box>
    );
});
AttachmentViewerCard.displayName = 'AttachmentViewerCard';

const ReportIncident = ({ companyId }: Props) => {
    const [data, setData]                 = useState<IncidentRow[]>([]);
    const [searchTerm, setSearchTerm]     = useState('');
    const [fetchLoading, setFetchLoading] = useState(false);
    const [incidentTypeOptions, setIncidentTypeOptions] = useState<any[]>([]);
    const [threatLevelOptions, setThreatLevelOptions]   = useState<any[]>([]);
    const [userOptions, setUserOptions]   = useState<any[]>([]);
    const [drawerOpen, setDrawerOpen]     = useState(false);
    const [isEditing, setIsEditing]       = useState(false);
    const [editingId, setEditingId]       = useState<number | null>(null);
    const [submitting, setSubmitting]     = useState(false);
    const [form, setForm]                 = useState<FormState>(INITIAL_FORM);
    const [formErrors, setFormErrors]     = useState<FormErrors>({});
    const [attachmentDrawerOpen, setAttachmentDrawerOpen] = useState(false);
    const [selectedAttachments, setSelectedAttachments]   = useState<AttachmentFile[]>([]);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllAcrossPages = async (checked: boolean) => {
    if (!checked) {
      setSelectedRowIds(new Set());
      return;
    }
    try {
      (window as any).__isSelectingAll = true;
      await fetchData();
      if ((window as any).__lastFetchedIds) {
        setSelectedRowIds(new Set((window as any).__lastFetchedIds));
      }
    } catch (err: any) {
      if (err.message !== 'SELECT_ALL_INTERCEPT') {
        console.error(err);
      }
    } finally {
      (window as any).__isSelectingAll = false;
      }
  }

    const [hoveredRow, setHoveredRow]     = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId]     = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { successMessage, errorMessage, showSuccess, showError, clear: clearMessages } = useSnackbar();
    const {
        attachments, removedIds, existingCount, newCount,
        reset: resetAttachments, addFiles, remove: removeAttachment, loadExisting,
    } = useAttachments();

    const fetchResources = useCallback(async () => {
        if (!companyId) return;
        try {
            const res = await api.get('/health-safety/get-resources', { params: { company_id: companyId } });
            if (res.data.IsSuccess) {
                setIncidentTypeOptions(res.data.incident_types || []);
                setThreatLevelOptions(res.data.threat_levels || []);
                setUserOptions(res.data.users || []);
            }
        } catch {}
    }, [companyId]);

    const fetchData = async () => {
        if (!companyId) return;
        try {
            setFetchLoading(true);
            const params: any = {
                company_id: companyId,
                page: pagination.pageIndex + 1,
                limit: pagination.pageSize,
            };
            if (searchTerm) params.search = searchTerm;

            const res = await api.get('/report-incidents/get', { params });
            if (res.data.IsSuccess) {
                const fetchedData = res.data.info?.data || res.data.info || res.data.data || [];
                setData(fetchedData.map((item: any) => ({
                    id: item.id,
                    added_by: item.user_name || '-',
                    user_thumb_image: item.user_thumb_image || '',
                    title: item.title || '-',
                    incident_type: item.incident_type || '-',
                    incident_type_id: item.incident_type_id ?? null,
                    threat_level: item.threat_level || '-',
                    threat_level_id: item.threat_level_id ?? null,
                    notify_to_id: item.notify_to ?? null,
                    attachment: item.files?.length
                        ? `${item.files.length} File${item.files.length > 1 ? 's' : ''}`
                        : 'No Attachment',
                    files: item.files || [],
                    date: item.date,
                })));
                
                const pagMeta =
                  res.data.data?.totalPages !== undefined || res.data.data?.totalItems !== undefined
                    ? res.data.data
                    : res.data.info && res.data.info.totalPages !== undefined
                      ? res.data.info
                      : res.data.data || {};

                if (pagMeta.totalItems !== undefined) {
                  setTotalRows(pagMeta.totalItems);
                } else if (pagMeta.total !== undefined) {
                  setTotalRows(pagMeta.total);
                } else {
                  setTotalRows(fetchedData.length);
                }

                if (pagMeta.totalPages !== undefined) {
                  setPageCount(pagMeta.totalPages);
                } else if (pagMeta.last_page !== undefined) {
                  setPageCount(pagMeta.last_page);
                }
            }
        } catch {
            showError('Failed to fetch incidents.');
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => { fetchResources(); }, [fetchResources]);

    // ── Validation ──────────────────────────────────────────────────────────
    const validateForm = useCallback((): boolean => {
        const errors: FormErrors = {};
        if (!form.title.trim())       errors.title        = 'Title is required.';
        if (!form.incidentType)       errors.incidentType = 'Incident type is required.';
        if (!form.threatLevel)        errors.threatLevel  = 'Threat level is required.';
        if (!form.notifyTo)           errors.notifyTo     = 'Notify-to user is required.';
        if (attachments.length === 0) errors.files        = 'At least one file is required.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [form, attachments]);

    // ── Drawer helpers ──────────────────────────────────────────────────────
    const resetAndClose = useCallback(() => {
        resetAttachments();
        setFormErrors({});
        setDrawerOpen(false);
        setIsEditing(false);
        setEditingId(null);
        setForm(INITIAL_FORM);
        setSubmitting(false);
    }, [resetAttachments]);

    const openCreateDrawer = useCallback(() => {
        resetAttachments();
        setFormErrors({});
        setIsEditing(false);
        setEditingId(null);
        setForm(INITIAL_FORM);
        setDrawerOpen(true);
    }, [resetAttachments]);

    const handleEdit = useCallback((row: IncidentRow) => {
        resetAttachments();
        setFormErrors({});
        setIsEditing(true);
        setEditingId(row.id);
        setForm({
            title:        row.title !== '-' ? row.title : '',
            incidentType: row.incident_type_id != null ? String(row.incident_type_id) : '',
            threatLevel:  row.threat_level_id  != null ? String(row.threat_level_id)  : '',
            notifyTo:     row.notify_to_id     != null ? String(row.notify_to_id)     : '',
        });
        loadExisting(row.files || []);
        setDrawerOpen(true);
    }, [resetAttachments, loadExisting]);

    const handleFilesAdded = useCallback((files: File[]) => {
        addFiles(files);
        if (files.length) setFormErrors(prev => ({ ...prev, files: undefined }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [addFiles]);

    const handleViewAttachments = useCallback((row: IncidentRow) => {
        if (!row.files?.length) return;
        setSelectedAttachments(row.files.map(fromExisting));
        setAttachmentDrawerOpen(true);
    }, []);

    const handleDownload = useCallback((af: AttachmentFile) => {
        downloadAttachment(af, showError);
    }, [showError]);

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('company_id',       String(companyId));
            formData.append('title',            form.title);
            formData.append('incident_type_id', String(form.incidentType));
            formData.append('threat_level_id',  String(form.threatLevel));
            formData.append('notify_to',        String(form.notifyTo));
            if (isEditing && editingId) {
                formData.append('report_incident_id', String(editingId));
                removedIds.forEach(id => formData.append('remove_attachment_ids[]', String(id)));
            }
            attachments
                .filter(a => a.source === 'new' && a.file)
                .forEach(a => formData.append('files', a.file!));

            const res = await api.post('/report-incidents/store', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.IsSuccess) {
                showSuccess(isEditing ? 'Incident updated successfully.' : 'Incident reported successfully.');
                resetAndClose();
                fetchData();
            } else {
                showError(res.data.message || 'Submission failed.');
            }
        } catch (err: any) {
            showError(err?.response?.data?.message || 'Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }, [
        form, companyId, isEditing, editingId, removedIds, attachments,
        validateForm, showError, showSuccess, resetAndClose, fetchData,
    ]);

    // ── Delete ──────────────────────────────────────────────────────────────
    const handleDeleteClick = useCallback((id: number) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!deletingId) return;
        setDeleteLoading(true);
        try {
            const res = await api.delete(`/report-incidents/delete/${deletingId}`);
            if (res.data.IsSuccess) {
                showSuccess('Incident deleted successfully.');
                fetchData();
            } else {
                showError(res.data.message || 'Failed to delete.');
            }
        } catch {
            showError('Failed to delete incident.');
        } finally {
            setDeleteLoading(false);
            setDeleteDialogOpen(false);
            setDeletingId(null);
        }
    }, [deletingId, showSuccess, showError, fetchData]);

    // ── Table data ──────────────────────────────────────────────────────────
    const filteredData = data;

    const columns = useMemo(() => [
        {
            id: 'select',
            header: () => (
                <Box sx={{ px: 1.5, py: 1.5 }}>
                    <CustomCheckbox
                        checked={selectedRowIds.size > 0 && selectedRowIds.size >= filteredData.length}
                        indeterminate={selectedRowIds.size > 0 && selectedRowIds.size < filteredData.length}
                        onChange={(e) => { e.stopPropagation(); e.preventDefault(); handleSelectAllAcrossPages(e.target.checked); }}
                    />
                </Box>
            ),
            cell: ({ row }: any) => {
                const item = row.original as IncidentRow;
                const isChecked = selectedRowIds.has(item.id);
                const show = isChecked || hoveredRow === item.id;
                return (
                    <Box sx={{ px: 1.5, py: 1.5 }}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            onMouseEnter={() => setHoveredRow(item.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                        >
                            <CustomCheckbox
                                checked={isChecked}
                                onClick={(e: any) => e.stopPropagation()}
                                onChange={() => {
                                    const s = new Set(selectedRowIds);
                                    isChecked ? s.delete(item.id) : s.add(item.id);
                                    setSelectedRowIds(s);
                                }}
                                sx={{ opacity: show ? 1 : 0, transition: 'opacity 0.2s' }}
                            />
                        </Stack>
                    </Box>
                );
            },
        },
        {
            id: 'added_by',
            header: 'Added By',
            cell: ({ row }: any) => {
                const r = row.original as IncidentRow;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar src={r.user_thumb_image || ''} sx={{ width: 36, height: 36 }} />
                        <Typography className="f-14" noWrap>{r.added_by}</Typography>
                    </Stack>
                );
            },
        },

        {
            id: 'date',
            header: 'Date',
            accessorKey: 'date',
            cell: ({ getValue }: any) => {
                const val = getValue();
                return (
                    <Tooltip title={val && val !== '-' ? val : ''} placement="top">
                        <Typography className="f-14" noWrap sx={{ maxWidth: 200 }}>
                            {val || '-'}
                        </Typography>
                    </Tooltip>
                );
            },
        },
        
        {
            id: 'title',
            header: 'Title',
            accessorKey: 'title',
            cell: ({ getValue }: any) => {
                const val = getValue();
                return (
                    <Tooltip title={val && val !== '-' ? val : ''} placement="top">
                        <Typography className="f-14" noWrap sx={{ maxWidth: 200 }}>
                            {val || '-'}
                        </Typography>
                    </Tooltip>
                );
            },
        },
        
        {
            id: 'incident_type',
            header: 'Incident Type',
            accessorKey: 'incident_type',
            cell: ({ getValue }: any) => (
                <Typography className="f-14" sx={{ verticalAlign: 'middle' }}>
                    {getValue() || '-'}
                </Typography>
            ),
        },
        
        {
            id: 'threat_level',
            header: 'Threat Level',
            accessorKey: 'threat_level',
            cell: ({ getValue }: any) => {
                const val = getValue();
                return val && val !== '-' ? (
                    <Chip
                        label={val}
                        color={getThreatColor(val)}
                        size="small"
                        sx={{ width: 80, height: 26, fontWeight: 600, fontSize: '0.75rem', textTransform: 'capitalize' }}
                    />
                ) : (
                    <Typography color="textSecondary" className="f-14">-</Typography>
                );
            },
        },
        
        {
            id: 'attachment',
            header: 'Attachment',
            cell: ({ row }: any) => {
                const item = row.original as IncidentRow;
                return (
                    <Box display="flex" justifyContent="start" alignItems="center" width="100%">
                        {item.files?.length ? (
                            <Tooltip title="View Attachments">
                                <IconButton size="small" color="primary" onClick={() => handleViewAttachments(item)}>
                                    <IconPaperclip size={18} />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Typography color="text.secondary">-</Typography>
                        )}
                    </Box>
                );
            },
        },
        
        {
            id: 'action',
            header: 'Action',
            cell: ({ row }: any) => {
                const item = row.original as IncidentRow;
                return (
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                            <IconButton size="small" color="primary" onClick={() => handleEdit(item)}>
                                <IconPencil size={18} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(item.id)}>
                                <IconTrash size={18} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
        },
    ], [filteredData, selectedRowIds, hoveredRow, handleViewAttachments, handleEdit, handleDeleteClick]);

    
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth > tableContainerRef.current.clientWidth
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);
    
    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, { childList: true, subtree: true, characterData: true });
    }
    
    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

    const {
        table,
        pagination,
        setPagination,
        pageCount,
        setPageCount,
        totalRows,
        setTotalRows,
    } = useServerTable({
        data: filteredData,
        columns,
        fetchData,
        debounceDependencies: [searchTerm],
    });

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <TextField
                        placeholder="Search..."
                        size="small"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        sx={{ width: 220 }}
                        InputProps={{ endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> }}
                    />
                </Box>
                <Button size="small" variant="contained" color="primary"
                        startIcon={<IconPlus size={16} />} onClick={openCreateDrawer}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>
                    Report Incident
                </Button>
            </Box>

            <Divider />

            {/* Table */}
            <TableContainer ref={tableContainerRef} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Table stickyHeader sx={{ minWidth: 850 }}>
                    <TableHead>
                        {table.getHeaderGroups().map(hg => (
                            <TableRow key={hg.id}>
                                {hg.headers.map(header => (
                                    <TableCell key={header.id} sx={{ p: 0, whiteSpace: 'nowrap' ,
                                            ...(header.column.id === 'actions' || header.column.id === 'action' ? {
                                                position: 'sticky',
                                                right: 0,
                                                backgroundColor: 'background.paper',
                                                zIndex: 3,
                                                boxShadow: isScrollable ? '-2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
                                            } : {}),}}>
                                        <Box
                                            onClick={header.column.getToggleSortingHandler()}
                                            sx={{
                                                cursor: header.column.getCanSort() ? 'pointer' : 'default',
                                                py: 1.5, px: 1.5,
                                                fontWeight: header.column.getIsSorted() ? 600 : 500,
                                            }}
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {fetchLoading ? (
                            <SkeletonLoader columns={columns.map(c => ({ name: c.id, width: 'auto' }))} rowCount={8} />
                        ) : filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center">
                                    <Box sx={{ py: 8 }}>
                                        <Image src="/images/no-data.png" alt="No data" width={180} height={180} />
                                        <Typography mt={2} color="text.secondary">No incidents found</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <TableRow hover key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id} sx={{ py: 1.5, px: 1.5 ,
                                                ...(cell.column.id === 'actions' || cell.column.id === 'action' ? {
                                                    position: 'sticky',
                                                    right: 0,
                                                    backgroundColor: 'background.paper',
                                                    zIndex: 1,
                                                    boxShadow: isScrollable ? '-2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
                                                } : {}),}}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined}
                table={table}
                totalRows={table.getPrePaginationRowModel().rows.length}
            />

            {/* Create / Edit Drawer */}
            <Drawer anchor="right" open={drawerOpen} onClose={resetAndClose}
                    PaperProps={{ sx: { width: 520, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                    {/* Drawer header */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider',
                    }}>
                        <Typography fontWeight={700} fontSize="1.05rem">
                            {isEditing ? 'Edit Report Incident' : 'Add Report Incident'}
                        </Typography>
                        <IconButton size="small" onClick={resetAndClose} disabled={submitting}>
                            <IconX size={18} />
                        </IconButton>
                    </Box>

                    {submitting && <LinearProgress sx={{ height: 2 }} />}

                    {/* Drawer body */}
                    <Box flex={1} overflow="auto" px={3} py={3}>
                        <Stack spacing={3}>

                            {/* Title */}
                            <Box>
                                <Typography variant="subtitle2" mb={0.75} fontWeight={600}>
                                    Title <Box component="span" color="error.main">*</Box>
                                </Typography>
                                <CustomTextField
                                    placeholder="Enter report title..."
                                    value={form.title}
                                    onChange={(e: any) => {
                                        setForm(f => ({ ...f, title: e.target.value }));
                                        if (e.target.value.trim()) setFormErrors(p => ({ ...p, title: undefined }));
                                    }}
                                    fullWidth
                                    error={Boolean(formErrors.title)}
                                    helperText={formErrors.title}
                                    inputProps={{ maxLength: 50 }}
                                />
                            </Box>

                            {/* Incident Type */}
                            <Box>
                                <Typography variant="subtitle2" mb={0.75} fontWeight={600}>
                                    Incident Type <Box component="span" color="error.main">*</Box>
                                </Typography>
                                <Autocomplete
                                    options={incidentTypeOptions}
                                    value={incidentTypeOptions.find(o => String(o.id) === form.incidentType) || null}
                                    onChange={(_, v) => {
                                        setForm(f => ({ ...f, incidentType: v?.id ? String(v.id) : '' }));
                                        if (v?.id) setFormErrors(p => ({ ...p, incidentType: undefined }));
                                    }}
                                    getOptionLabel={o => o.title || ''}
                                    isOptionEqualToValue={(o, v) => String(o.id) === String(v?.id)}
                                    renderInput={params => (
                                        <CustomTextField
                                            {...params}
                                            placeholder="Select Incident Type"
                                            fullWidth
                                            error={Boolean(formErrors.incidentType)}
                                            helperText={formErrors.incidentType}
                                        />
                                    )}
                                />
                            </Box>

                            {/* Threat Level */}
                            <Box>
                                <Typography variant="subtitle2" mb={0.75} fontWeight={600}>
                                    Threat Level <Box component="span" color="error.main">*</Box>
                                </Typography>
                                <Autocomplete
                                    options={threatLevelOptions}
                                    value={threatLevelOptions.find(o => String(o.id) === form.threatLevel) || null}
                                    onChange={(_, v) => {
                                        setForm(f => ({ ...f, threatLevel: v?.id ? String(v.id) : '' }));
                                        if (v?.id) setFormErrors(p => ({ ...p, threatLevel: undefined }));
                                    }}
                                    getOptionLabel={o => o.title || ''}
                                    isOptionEqualToValue={(o, v) => String(o.id) === String(v?.id)}
                                    renderInput={params => (
                                        <CustomTextField
                                            {...params}
                                            placeholder="Select Threat Level"
                                            fullWidth
                                            error={Boolean(formErrors.threatLevel)}
                                            helperText={formErrors.threatLevel}
                                        />
                                    )}
                                />
                            </Box>

                            {/* Notify To */}
                            <Box>
                                <Typography variant="subtitle2" mb={0.75} fontWeight={600}>
                                    Notify To <Box component="span" color="error.main">*</Box>
                                </Typography>
                                <Autocomplete
                                    options={userOptions}
                                    value={userOptions.find(u => String(u.id) === form.notifyTo) || null}
                                    onChange={(_, v) => {
                                        setForm(f => ({ ...f, notifyTo: v?.id ? String(v.id) : '' }));
                                        if (v?.id) setFormErrors(p => ({ ...p, notifyTo: undefined }));
                                    }}
                                    getOptionLabel={o => o.name || ''}
                                    isOptionEqualToValue={(o, v) => String(o.id) === String(v?.id)}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar src={option.user_thumb_image || ''} sx={{ width: 28, height: 28 }}>
                                                    {option.name?.charAt(0)}
                                                </Avatar>
                                                <Typography variant="body2">{option.name}</Typography>
                                            </Stack>
                                        </li>
                                    )}
                                    renderInput={params => (
                                        <CustomTextField
                                            {...params}
                                            placeholder="Select User"
                                            fullWidth
                                            error={Boolean(formErrors.notifyTo)}
                                            helperText={formErrors.notifyTo}
                                        />
                                    )}
                                />
                            </Box>

                            {/* Attachments */}
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600} mb={1.25}>
                                    Attachments <Box component="span" color="error.main">*</Box>
                                </Typography>
                                <DropZone
                                    onFiles={handleFilesAdded}
                                    fileInputRef={fileInputRef}
                                    hasError={Boolean(formErrors.files)}
                                />
                                {formErrors.files && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block', px: 0.5 }}>
                                        {formErrors.files}
                                    </Typography>
                                )}
                                <input
                                    ref={fileInputRef} type="file" hidden multiple
                                    accept="image/*,video/*,audio/*,.pdf"
                                    onChange={e => {
                                        if (!e.target.files) return;
                                        handleFilesAdded(Array.from(e.target.files));
                                    }}
                                />

                                {attachments.length > 0 && (
                                    <Stack spacing={1} mt={2}>
                                        {existingCount > 0 && (
                                            <>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}
                                                            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, px: 0.5 }}>
                                                    Saved Files ({existingCount})
                                                </Typography>
                                                {attachments.filter(a => a.source === 'existing').map(af => (
                                                    <AttachmentCard key={af.uid} af={af} onRemove={() => removeAttachment(af.uid)} />
                                                ))}
                                            </>
                                        )}
                                        {newCount > 0 && (
                                            <>
                                                <Typography variant="caption" color="text.secondary" fontWeight={700}
                                                            sx={{ textTransform: 'uppercase', letterSpacing: 0.5, px: 0.5, mt: existingCount > 0 ? 1 : 0 }}>
                                                    New Files ({newCount})
                                                </Typography>
                                                {attachments.filter(a => a.source === 'new').map(af => (
                                                    <AttachmentCard key={af.uid} af={af} onRemove={() => removeAttachment(af.uid)} />
                                                ))}
                                            </>
                                        )}
                                    </Stack>
                                )}
                                {attachments.length === 0 && !formErrors.files && (
                                    <Typography variant="caption" color="text.secondary"
                                                sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                                        No attachments added yet
                                    </Typography>
                                )}
                            </Box>
                        </Stack>
                    </Box>

                    {/* Drawer footer */}
                    <Box px={3} py={2} borderTop="1px solid" sx={{ borderColor: 'divider' }}>
                        <Stack direction="row" gap={1.5}>
                            <Button variant="contained" color="primary" onClick={handleSubmit}
                                    disabled={submitting} sx={{ flex: 1, textTransform: 'none', fontWeight: 600 }}>
                                {submitting
                                    ? (isEditing ? 'Updating…' : 'Submitting…')
                                    : (isEditing ? 'Update Incident' : 'Submit Incident')}
                            </Button>
                            <Button variant="outlined" onClick={resetAndClose} disabled={submitting}
                                    sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}>
                                Cancel
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Drawer>

            {/* Attachment Viewer Drawer */}
            <Drawer
                anchor="right"
                open={attachmentDrawerOpen}
                onClose={() => setAttachmentDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 } }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                    }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <IconPaperclip size={24} />
                            <Typography fontWeight={700} fontSize="1.15rem">
                                Attachments ({selectedAttachments.length})
                            </Typography>
                        </Stack>
                        <IconButton size="small" onClick={() => setAttachmentDrawerOpen(false)}>
                            <IconX size={22} />
                        </IconButton>
                    </Box>

                    <Box flex={1} overflow="auto" p={3} sx={{ bgcolor: '#f8fafc' }}>
                        {selectedAttachments.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 10 }}>
                                <Typography color="text.secondary" variant="h6">No attachments available</Typography>
                            </Box>
                        ) : (
                            <Stack spacing={3}>
                                {selectedAttachments.map(af => (
                                    <AttachmentViewerCard key={af.uid} af={af} onDownload={handleDownload} />
                                ))}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Button fullWidth variant="outlined" size="large"
                                onClick={() => setAttachmentDrawerOpen(false)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}>
                            Close
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
                    PaperProps={{ sx: { borderRadius: '14px' } }}>
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Incident Report?</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete this incident report? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="inherit"
                            disabled={deleteLoading} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button onClick={confirmDelete} color="error" variant="contained"
                            disabled={deleteLoading} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        {deleteLoading ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={Boolean(successMessage || errorMessage)}
                autoHideDuration={4000}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                onClose={clearMessages}
            >
                <Box sx={{
                    px: 3, py: 1.5,
                    bgcolor: errorMessage ? '#FEE2E2' : '#EEF2FF',
                    color: errorMessage ? '#DC2626' : '#4F46E5',
                    borderRadius: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', gap: 1,
                }}>
                    <Typography variant="body2">{errorMessage || successMessage}</Typography>
                    <IconButton size="small" onClick={clearMessages} sx={{ color: 'inherit' }}>
                        <IconX size={16} />
                    </IconButton>
                </Box>
            </Snackbar>
        </Box>
    );
};

export default ReportIncident;
