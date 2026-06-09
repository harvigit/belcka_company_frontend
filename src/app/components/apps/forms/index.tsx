'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { IconArchive, IconFilter, IconPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import PermissionGuard from '@/app/auth/PermissionGuard';
import AddFormDialog from './AddFormDialog';
import TemplateLibraryDialog from './TemplateLibraryDialog';
import FormBuilder from './FormBuilder';
import { FormRecord, FormTemplate } from './common';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

const statusChip = (status: FormRecord['status']) => {
    if (status === 'PUBLISHED')
        return <Chip label="Published" size="small" color="success" variant="outlined" />;
    if (status === 'SCHEDULED')
        return <Chip label="Scheduled" size="small" color="warning" variant="outlined" />;
    if (status === 'ARCHIVED')
        return <Chip label="Archived" size="small" color="default" variant="outlined" />;
    return <Chip label="Draft" size="small" color="default" />;
};

const getName = (form: FormRecord) => {
    const first = form.createdBy?.first_name || '';
    const last = form.createdBy?.last_name || '';
    return `${first} ${last}`.trim() || form.createdBy?.email || '-';
};

const getUserName = (user?: { first_name?: string; last_name?: string; email?: string }) => {
    const first = user?.first_name || '';
    const last = user?.last_name || '';
    return `${first} ${last}`.trim() || user?.email || '-';
};

const getAssignedToLabel = (assignedTo?: string | null) => {
    if (!assignedTo) return 'Everyone';
    return assignedTo.replace(/\bgroups\b/gi, (match) => match.charAt(0) === 'G' ? 'Teams' : 'teams');
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as any).response;
        return response?.data?.message || fallback;
    }

    return fallback;
};

const Index = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [forms, setForms] = useState<FormRecord[]>([]);
    const [search, setSearch] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    /* Dialog / drawer state */
    const [addOpen, setAddOpen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingFormId, setEditingFormId] = useState<string | undefined>(undefined);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

    /* ── Data fetching ── */
    const fetchForms = useCallback(async () => {
        try {
            const res = await api.get('forms/list');
            setForms(res.data.info || []);
        } catch (err) {
            console.error('Failed to fetch forms', err);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchForms, 350);
        return () => clearTimeout(t);
    }, [fetchForms]);

    const visibleForms = useMemo(() => forms.filter((f) => f.status !== 'ARCHIVED'), [forms],);
    const selectedFormIds = useMemo(() => Array.from(selectedRowIds), [selectedRowIds]);
    const allVisibleSelected = visibleForms.length > 0 && selectedRowIds.size === visibleForms.length;
    const someVisibleSelected = selectedRowIds.size > 0 && selectedRowIds.size < visibleForms.length;

    useEffect(() => {
        setSelectedRowIds((current) => {
            const visibleIds = new Set(visibleForms.map((form) => form.id));
            const next = new Set(Array.from(current).filter((id) => visibleIds.has(id)));

            return next.size === current.size ? current : next;
        });
    }, [visibleForms]);
    /* ── Actions ── */

    /** Open the drawer for a brand-new form */
    const openNewFormEditor = () => {
        setAddOpen(false);
        setTemplateOpen(false);
        setEditingFormId(undefined);
        setSelectedTemplate(null);
        setEditorOpen(true);
    };

    /** Open the drawer to edit an existing form */
    const openExistingFormEditor = (formId: string) => {
        setEditingFormId(formId);
        setSelectedTemplate(null);
        setEditorOpen(true);
    };

    const openTemplateFormEditor = (template: FormTemplate) => {
        setTemplateOpen(false);
        setEditingFormId(undefined);
        setSelectedTemplate(template);
        setEditorOpen(true);
    };

    /** Called by FormBuilder after a successful save */
    const handleSaved = () => {
        fetchForms(); // refresh the list
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedRowIds(checked ? new Set(visibleForms.map((form) => form.id)) : new Set());
    };

    const handleSelectRow = (formId: number) => {
        setSelectedRowIds((current) => {
            const next = new Set(current);

            if (next.has(formId)) {
                next.delete(formId);
            } else {
                next.add(formId);
            }

            return next;
        });
    };

    const handleArchiveForms = async () => {
        if (!selectedFormIds.length) return;

        setBulkActionLoading(true);
        try {
            const response = await api.post('forms/archive', {
                form_ids: selectedFormIds.join(','),
            }, {
                skipToast: true,
            } as any);
            toast.success(response.data?.message || `Form${selectedFormIds.length > 1 ? 's' : ''} archived successfully`);
            setSelectedRowIds(new Set());
            await fetchForms();
        } catch (err) {
            console.error('Failed to archive forms', err);
            toast.error(getApiErrorMessage(err, 'Failed to archive forms'));
        } finally {
            setBulkActionLoading(false);
            setConfirmAction(null);
        }
    };

    const handleDeleteForms = async () => {
        if (!selectedFormIds.length) return;

        setBulkActionLoading(true);
        try {
            const response = await api.delete('forms/delete', {
                data: {
                    form_ids: selectedFormIds.join(','),
                },
                skipToast: true,
            } as any);
            toast.success(response.data?.message || `Form${selectedFormIds.length > 1 ? 's' : ''} deleted successfully`);
            setSelectedRowIds(new Set());
            await fetchForms();
        } catch (err) {
            console.error('Failed to delete forms', err);
            toast.error(getApiErrorMessage(err, 'Failed to delete forms'));
        } finally {
            setBulkActionLoading(false);
            setConfirmAction(null);
        }
    };

    const handleConfirmBulkAction = () => {
        if (confirmAction === 'archive') {
            handleArchiveForms();
            return;
        }

        if (confirmAction === 'delete') {
            handleDeleteForms();
        }
    };

    return (
        <PermissionGuard permission="Forms">
            <Box
                sx={{
                    height: { xs: 'auto', md: 'calc(100vh - 100px)' },
                    minHeight: { xs: '100vh', md: 'unset' },
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* ── Main card ── */}
                <Paper
                    elevation={0}
                    sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Search + filter */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ sm: 'center' }}
                        p={{ xs: 1.5, sm: 2 }}
                    >
                        <CustomTextField
                            size="small"
                            placeholder="Search forms"
                            value={search}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ maxWidth: { sm: 360 }, width: '100%' }}
                            fullWidth
                        />

                        <Stack direction="row" spacing={1} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
                            <Tooltip title="Filters">
                                <IconButton
                                    color="primary"
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        alignSelf: { xs: 'flex-start', sm: 'unset' },
                                    }}
                                >
                                    <IconFilter size={18} />
                                </IconButton>
                            </Tooltip>
                            
                            {selectedRowIds.size > 0 && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<IconArchive size={18} />}
                                        onClick={() => setConfirmAction('archive')}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Archive
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<IconTrash size={18} />}
                                        onClick={() => setConfirmAction('delete')}
                                        sx={{ whiteSpace: 'nowrap' }}
                                    >
                                        Delete
                                    </Button>
                                </>
                            )}

                            {selectedRowIds.size === 0 && (
                                <Button
                                    variant="contained"
                                    startIcon={<IconPlus size={18} />}
                                    onClick={() => setAddOpen(true)}
                                    fullWidth={isMobile}
                                    sx={{ borderRadius: 2 }}
                                >
                                    Add new
                                </Button>
                            )}
                        </Stack>
                    </Stack>

                    {/* Table */}
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                        <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <CustomCheckbox
                                            className="header-checkbox"
                                            checked={allVisibleSelected}
                                            indeterminate={someVisibleSelected}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleSelectAll(e.target.checked);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Entries</TableCell>
                                    <TableCell>Views</TableCell>
                                    <TableCell>Assigned to</TableCell>
                                    <TableCell>Created by</TableCell>
                                    <TableCell>Administrated by</TableCell>
                                    <TableCell>Date Created</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {visibleForms.map((form) => (
                                    <TableRow
                                        key={form.id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredRow(form.id)}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        onClick={() => openExistingFormEditor(String(form.id))}
                                    >
                                        <TableCell
                                            padding="checkbox"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <CustomCheckbox
                                                checked={selectedRowIds.has(form.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectRow(form.id);
                                                }}
                                                sx={{
                                                    opacity: selectedRowIds.has(form.id) || hoveredRow === form.id ? 1 : 0,
                                                    pointerEvents: selectedRowIds.has(form.id) || hoveredRow === form.id ? 'auto' : 'none',
                                                    transition: 'opacity 0.2s ease',
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography
                                                fontWeight={600}
                                                fontSize={{ xs: 13, sm: 14 }}
                                                noWrap
                                                sx={{ maxWidth: { xs: 120, sm: 220, md: 'none' } }}
                                            >
                                                {form.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{statusChip(form.status)}</TableCell>
                                       <TableCell>{form.entries}</TableCell>
                                       <TableCell>{form.views}</TableCell>
                                       <TableCell>{getAssignedToLabel(form.assigned_to ?? form.assignedTo)}</TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Avatar
                                                    src={form.createdBy?.createdBy_thumb_image || undefined}
                                                    sx={{width: 36, height: 36}}
                                                >
                                                    {getName(form).charAt(0)}
                                                </Avatar>
                                                {!isMobile && (
                                                    <Typography variant="body2" noWrap>
                                                        {getName(form)}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        
                                        <TableCell>
                                            <Stack direction="row" justifyContent="flex-start">
                                                <AvatarGroup
                                                    max={5}
                                                    sx={{
                                                        justifyContent: 'flex-end',
                                                        '& .MuiAvatar-root': {
                                                            width: 26,
                                                            height: 26,
                                                            fontSize: 11,
                                                            borderColor: '#fff',
                                                        },
                                                    }}
                                                >
                                                    {(form.administrators?.length ? form.administrators : form.createdBy ? [form.createdBy] : []).map((admin) => (
                                                        <Tooltip key={admin.id} title={getUserName(admin)}>
                                                            <Avatar 
                                                                src={(admin as any).admin_thumb_image || (admin as any).createdBy_thumb_image || undefined}
                                                                sx={{width: 36, height: 36}}
                                                            >
                                                                {getUserName(admin).charAt(0)}
                                                            </Avatar>
                                                        </Tooltip>
                                                    ))}
                                                </AvatarGroup>
                                            </Stack>
                                        </TableCell>
                                    
                                        <TableCell>
                                            {dayjs(form.createdAt).format('DD/MM/YYYY')}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {visibleForms.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9}>
                                            <Box sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
                                                <Typography color="text.secondary">No forms found.</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* ── Dialogs / Drawer ── */}

            <AddFormDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onScratch={openNewFormEditor}
                onTemplate={() => {
                    setAddOpen(false);
                    setTemplateOpen(true);
                }}
            />

            <TemplateLibraryDialog
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                onScratch={openNewFormEditor}
                onSelected={openTemplateFormEditor}
            />

            <FormBuilder
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                formId={editingFormId}
                initialTemplate={selectedTemplate}
                onSaved={handleSaved}
            />

            <Dialog open={Boolean(confirmAction)} onClose={() => !bulkActionLoading && setConfirmAction(null)}>
                <DialogTitle sx={{ pr: 6 }}>
                    {confirmAction === 'delete' ? 'Confirm Delete' : 'Confirm Archive'}
                    <IconButton
                        aria-label="close"
                        onClick={() => setConfirmAction(null)}
                        disabled={bulkActionLoading}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <IconX />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" fontWeight={500}>
                        {confirmAction === 'delete'
                            ? `Are you sure you want to permanently delete ${selectedRowIds.size} form${selectedRowIds.size > 1 ? 's' : ''}? This action cannot be undone.`
                            : `Are you sure you want to archive ${selectedRowIds.size} form${selectedRowIds.size > 1 ? 's' : ''}?`}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setConfirmAction(null)}
                        color="inherit"
                        disabled={bulkActionLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmBulkAction}
                        variant="contained"
                        color={confirmAction === 'delete' ? 'error' : 'primary'}
                        disabled={bulkActionLoading}
                    >
                        {confirmAction === 'delete' ? 'Delete' : 'Archive'}
                    </Button>
                </DialogActions>
            </Dialog>
        </PermissionGuard>
    );
};

export default Index;
