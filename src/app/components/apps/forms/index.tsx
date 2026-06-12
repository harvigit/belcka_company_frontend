'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { IconArchive, IconFilter, IconPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import PermissionGuard from '@/app/auth/PermissionGuard';
import AddFormDialogComponent from './AddFormDialog';
import TemplateLibraryDialogComponent from './TemplateLibraryDialog';
import FormBuilderComponent from './FormBuilder';
import { FormRecord, FormTemplate } from './common';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import SkeletonLoader from '@/app/components/SkeletonLoader';

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
    const [fetchForm, setFetchForm] = useState(false);
    const [columnFilters, setColumnFilters] = useState<any>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    /* Dialog / drawer state */
    const [addOpen, setAddOpen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingFormId, setEditingFormId] = useState<string | undefined>(undefined);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

    /* ── Data fetching ── */
    const fetchForms = useCallback(async () => {
        setFetchForm(true);
        try {
            const res = await api.get('forms/list');
            setForms(res.data.info || []);
        } catch (err) {
            console.error('Failed to fetch forms', err);
        } finally {
            setFetchForm(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchForms, 350);
        return () => clearTimeout(t);
    }, [fetchForms]);

    const visibleForms = useMemo(() => {
        const q = search.trim().toLowerCase();

        return forms.filter((form) => {
            if (form.status === 'ARCHIVED') return false;
            if (!q) return true;

            return [
                form.name,
                form.status,
                getAssignedToLabel(form.assigned_to ?? form.assignedTo),
                getName(form),
                dayjs((form as any).createdAt ?? (form as any).created_at).format('DD/MM/YYYY'),
            ].some((value) => String(value || '').toLowerCase().includes(q));
        });
    }, [forms, search]);
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

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            if (tableContainerRef.current) {
                setIsScrollable(tableContainerRef.current.scrollWidth > tableContainerRef.current.clientWidth);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);

        const observer = new MutationObserver(checkScroll);
        if (tableContainerRef.current) {
            observer.observe(tableContainerRef.current, { childList: true, subtree: true, characterData: true });
        }

        return () => {
            window.removeEventListener('resize', checkScroll);
            observer.disconnect();
        };
    }, []);

    const columnHelper = createColumnHelper<FormRecord>();
    const columns = useMemo(() => [
        {
            id: 'select',
            header: () => (
                <Stack direction="row" alignItems="center">
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
                </Stack>
            ),
            cell: ({ row }: any) => {
                const form = row.original as FormRecord;
                const isChecked = selectedRowIds.has(form.id);
                const isHovered = hoveredRow === form.id;
                const showCheckbox = isChecked || isHovered;

                return (
                    <Stack
                        direction="row"
                        alignItems="center"
                        onMouseEnter={() => setHoveredRow(form.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        sx={{ pl: 1 }}
                    >
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleSelectRow(form.id);
                            }}
                            sx={{
                                opacity: showCheckbox ? 1 : 0,
                                pointerEvents: showCheckbox ? 'auto' : 'none',
                                transition: 'opacity 0.2s ease',
                            }}
                        />
                    </Stack>
                );
            },
            enableSorting: false,
        },
        columnHelper.accessor('name', {
            id: 'name',
            header: () => 'Name',
            enableSorting: true,
            cell: ({ row }) => {
                const form = row.original;

                return (
                    <Typography
                        className="f-14"
                        fontWeight={600}
                        sx={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.15,
                            wordBreak: 'break-word',
                            maxWidth: { xs: 120, sm: 220, md: 260 },
                        }}
                    >
                        {form.name || '-'}
                    </Typography>
                );
            },
        }),
        columnHelper.accessor('status', {
            id: 'status',
            header: () => 'Status',
            enableSorting: true,
            cell: (info) => statusChip(info.getValue()),
        }),
        columnHelper.accessor('entries', {
            id: 'entries',
            header: () => 'Entries',
            enableSorting: true,
            cell: (info) => (
                <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                    {info.getValue() ?? 0}
                </Typography>
            ),
        }),
        columnHelper.accessor('views', {
            id: 'views',
            header: () => 'Views',
            enableSorting: true,
            cell: (info) => (
                <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                    {info.getValue() ?? 0}
                </Typography>
            ),
        }),
        columnHelper.accessor((row) => getAssignedToLabel(row.assigned_to ?? row.assignedTo), {
            id: 'assignedTo',
            header: () => 'Assigned to',
            enableSorting: true,
            cell: (info) => (
                <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                    {info.getValue()}
                </Typography>
            ),
        }),
        columnHelper.accessor((row) => getName(row), {
            id: 'createdBy',
            header: () => 'Created by',
            enableSorting: true,
            cell: ({ row }) => {
                const form = row.original;

                return (
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar
                            src={form.createdBy?.createdBy_thumb_image || undefined}
                            sx={{ width: 36, height: 36 }}
                        >
                            {getName(form).charAt(0)}
                        </Avatar>
                        {!isMobile && (
                            <Typography className="f-14" noWrap>
                                {getName(form)}
                            </Typography>
                        )}
                    </Stack>
                );
            },
        }),
        columnHelper.display({
            id: 'administrators',
            header: () => 'Administrated by',
            cell: ({ row }) => {
                const form = row.original;

                return (
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
                                        sx={{ width: 36, height: 36 }}
                                    >
                                        {getUserName(admin).charAt(0)}
                                    </Avatar>
                                </Tooltip>
                            ))}
                        </AvatarGroup>
                    </Stack>
                );
            },
        }),
        columnHelper.accessor((row) => (row as any).createdAt ?? (row as any).created_at, {
            id: 'createdAt',
            header: () => 'Date Created',
            enableSorting: true,
            cell: (info) => (
                <Typography className="f-14" color="textPrimary" sx={{ px: 1.5 }}>
                    {info.getValue() ? dayjs(info.getValue()).format('DD/MM/YYYY') : '-'}
                </Typography>
            ),
        }),
    ], [allVisibleSelected, someVisibleSelected, selectedRowIds, hoveredRow, isMobile, visibleForms]);

    const table = useReactTable({
        data: visibleForms,
        columns,
        state: { columnFilters, sorting },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 50,
            },
        },
    });

    useEffect(() => {
        table.setPageIndex(0);
    }, [search, table]);

    const simpleColumns = columns.map((column: any) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

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
                            {/*<Tooltip title="Filters">*/}
                            {/*    <IconButton*/}
                            {/*        color="primary"*/}
                            {/*        sx={{*/}
                            {/*            border: '1px solid',*/}
                            {/*            borderColor: 'divider',*/}
                            {/*            borderRadius: 1,*/}
                            {/*            alignSelf: { xs: 'flex-start', sm: 'unset' },*/}
                            {/*        }}*/}
                            {/*    >*/}
                            {/*        <IconFilter size={18} />*/}
                            {/*    </IconButton>*/}
                            {/*</Tooltip>*/}
                            
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
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflow: 'auto',
                        }}
                    >
                        <TableContainer ref={tableContainerRef}>
                        <Table stickyHeader aria-label="sticky table" size={isMobile ? 'small' : 'medium'}>
                            <TableHead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            const isActive = header.column.getIsSorted();
                                            const isAsc = header.column.getIsSorted() === 'asc';
                                            const isSortable = header.column.getCanSort();

                                            return (
                                                <TableCell
                                                    key={header.id}
                                                    align="center"
                                                    sx={{
                                                        paddingTop: '10px',
                                                        paddingBottom: '10px',
                                                        width: header.column.id === 'select' ? 30 : 'auto',
                                                        ...(header.column.id === 'createdAt' && {
                                                            position: 'sticky',
                                                            right: 0,
                                                            backgroundColor: 'background.paper',
                                                            zIndex: 3,
                                                            boxShadow: isScrollable ? '-2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
                                                        }),
                                                    }}
                                                >
                                                    <Box
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        p={0}
                                                        sx={{
                                                            cursor: isSortable ? 'pointer' : 'default',
                                                            border: '2px solid transparent',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            justifyContent: 'flex-start',
                                                            '&:hover': { color: '#888' },
                                                            '&:hover .hoverIcon': { opacity: 1 },
                                                        }}
                                                    >
                                                        <Typography variant="subtitle2">
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext(),
                                                            )}
                                                        </Typography>
                                                        {isSortable && (
                                                            <Box
                                                                component="span"
                                                                className="hoverIcon"
                                                                ml={0.5}
                                                                sx={{
                                                                    transition: 'opacity 0.2s',
                                                                    opacity: isActive ? 1 : 0,
                                                                    fontSize: '0.9rem',
                                                                    color: isActive ? '#000' : '#888',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                }}
                                                            >
                                                                {isActive ? (isAsc ? '↑' : '↓') : '↑'}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableHead>
                            <TableBody>
                                {fetchForm ? (
                                    <SkeletonLoader
                                        columns={simpleColumns}
                                        rowCount={simpleColumns.length}
                                    />
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length}>
                                            <Box sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
                                                <Typography color="text.secondary">No forms found.</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map((row) => {
                                        const form = row.original;

                                        return (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                sx={{ cursor: 'pointer' }}
                                                onMouseEnter={() => setHoveredRow(form.id)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                                onClick={() => openExistingFormEditor(String(form.id))}
                                            >
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell
                                                        key={cell.id}
                                                        align="center"
                                                        onClick={cell.column.id === 'select' ? (e) => e.stopPropagation() : undefined}
                                                        sx={{
                                                            ...(cell.column.id === 'createdAt' && {
                                                                position: 'sticky',
                                                                right: 0,
                                                                backgroundColor: 'background.paper',
                                                                zIndex: 2,
                                                                boxShadow: isScrollable ? '-2px 0 4px -2px rgba(0,0,0,0.1)' : 'none',
                                                            }),
                                                        }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    </Box>
                </Paper>
            </Box>

            {/* ── Dialogs / Drawer ── */}

            <AddFormDialogComponent
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onScratch={openNewFormEditor}
                onTemplate={() => {
                    setAddOpen(false);
                    setTemplateOpen(true);
                }}
            />

            <TemplateLibraryDialogComponent
                open={templateOpen}
                onClose={() => setTemplateOpen(false)}
                onScratch={openNewFormEditor}
                onSelected={openTemplateFormEditor}
            />

            <FormBuilderComponent
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
