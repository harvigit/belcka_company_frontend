'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {
    Box,
    Button,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    ListItemIcon,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    FormControlLabel,
    Popover,
    FormGroup,
    Divider,
    Modal,
    LinearProgress,
    Drawer,
    Grid,
} from '@mui/material';
import {
    IconPlus,
    IconSearch,
    IconDotsVertical,
    IconNotes,
    IconTrash,
    IconX,
    IconEdit,
    IconEye,
    IconFileImport,
    IconFileExport,
    IconFilter,
    IconArrowLeft,
    IconZoomIn,
    IconZoomOut,
    IconDownload,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
import {useServerTable} from '@/hooks/useServerTable';
import {flexRender, createColumnHelper} from '@tanstack/react-table';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Image from 'next/image';
import {useDropzone} from 'react-dropzone';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import PermissionGuard from '@/app/auth/PermissionGuard';
import {IconSettings} from '@tabler/icons-react';
import {usePersistentColumnVisibility} from '@/hooks/usePersistentColumnVisibility';
import Settings from './settings';
import Link from 'next/link';
import {FileDownload} from '@mui/icons-material';
import TaskAddEdit from './create-edit';
import IOSSwitch from '../../common/IOSSwitch';
import ArchiveTasks from './archive';

dayjs.extend(customParseFormat);

const columnHelper = createColumnHelper<any>();

const TaskLists = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [isScrollable, setIsScrollable] = React.useState(false);
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };
    const {columnVisibility, onColumnVisibilityChange} =
        usePersistentColumnVisibility({
            storageKey: `cv_${user?.company_id}_${user?.id}_tasks`,
            enabled: !!user?.id,
        });
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useState({
        trade: '',
        shift: '',
        category: '',
        subCategory: '',
    });
    const [tempFilters, setTempFilters] = useState(filters);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [settingOpen, setSettingOpen] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [isImport, setIsImport] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [file, setFile] = useState<any | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [openModel, setOpenModel] = useState(false);
    const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [archiveTaskList, setArchiveTaskList] = useState(false);
    const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [categories, setCategories] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const [shifts, setShifts] = useState<any[]>([]);

    const [drawerImages, setDrawerImages] = useState<any[]>([]);
    const [imagesDrawerOpen, setImagesDrawerOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewIndex, setPreviewIndex] = useState<number>(0);
    const [zoomScale, setZoomScale] = useState<number>(1);
    const [openPreview, setOpenPreview] = useState(false);

    const handleOpenDrawer = (images: any[]) => {
        setDrawerImages(images || []);
        setImagesDrawerOpen(true);
    };

    React.useEffect(() => {
        const checkScroll = () => {
            if (tableContainerRef.current) {
                setIsScrollable(
                    tableContainerRef.current.scrollWidth >
                    tableContainerRef.current.clientWidth,
                );
            }
        };
        checkScroll();
        window.addEventListener('resize', checkScroll);

        const observer = new MutationObserver(checkScroll);
        if (tableContainerRef.current) {
            observer.observe(tableContainerRef.current, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        return () => {
            window.removeEventListener('resize', checkScroll);
            observer.disconnect();
        };
    }, []);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleSelectAllRows = (checked: boolean) => {
        if (checked) {
            const allIds = data.map((item: any) => item.id);
            setSelectedRowIds(new Set(allIds));
        } else {
            setSelectedRowIds(new Set());
        }
    };
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl2(event.currentTarget);
    };
    const handlePopoverClose = () => setAnchorEl2(null);

    const fetchResources = async () => {
        try {
            let url = `tasks/get-resources?company_id=${user.company_id}`;
            const res = await api.get(url);
            if (res.data) {
                setCategories(res.data.categories);
                setSubCategories(res.data.subCategories);
                setShifts(res.data.shifts);
                setTrades(res.data.trades);
            }
        } catch (err) {
            console.error('Failed to fetch inventory resources', err);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [api]);

    const initialFormData = {
        id: 0,
        company_id: user.company_id,
        trade_id: 0,
        category_id: 0,
        sub_category_id: 0,
        shift_type: null,
        duration: '',
        project: 'All',
        project_ids: [],
        note: '',
        is_show: false,
    };

    const [formData, setFormData] = useState<any>(initialFormData);

    const fetchTasks = async () => {
        if (!user?.company_id) return;
        try {
            setLoading(true);
            let url = `tasks/get?company_id=${user.company_id}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
            if (searchTerm) {
                url += `&search=${searchTerm}`;
            }
            if (filters.category && filters.category !== 'All') {
                const categoryId = categories.find(
                    (c) => c.name === filters.category,
                )?.id;
                if (categoryId) {
                    url += `&category_ids=${categoryId}`;
                }
            }
            if (filters.trade && filters.trade !== 'All') {
                const tradeObj = trades.find((s) => s.name === filters.trade);
                if (tradeObj) {
                    url += `&trade_ids=${tradeObj.id}`;
                }
            }
            if (filters.shift && filters.shift !== 'All') {
                const shiftObj = shifts.find((s) => s.name === filters.shift);
                if (shiftObj) {
                    url += `&shift_ids=${shiftObj.id}`;
                }
            }
            if (filters.subCategory && filters.subCategory !== 'All') {
                const subCategoryObj = subCategories.find(
                    (s) => s.name === filters.subCategory,
                );
                if (subCategoryObj) {
                    url += `&subcategory_ids=${subCategoryObj.id}`;
                }
            }

            const res = await api.get(url);
            if (res.data) {
                const responseData = res.data.info || [];
                setData(responseData);

                const pagMeta =
                    res.data.data?.totalPages !== undefined ||
                    res.data.data?.totalItems !== undefined
                        ? res.data.data
                        : res.data.info && res.data.info.totalPages !== undefined
                            ? res.data.info
                            : res.data.data || {};

                if (pagMeta.totalItems !== undefined) {
                    setTotalRows(pagMeta.totalItems);
                } else if (pagMeta.total !== undefined) {
                    setTotalRows(pagMeta.total);
                } else {
                    setTotalRows(responseData.length);
                }

                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                } else if (pagMeta.last_page !== undefined) {
                    setPageCount(pagMeta.last_page);
                }
            }
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (id: any) => {
        setSelectedTaskId(id);
        setEditDrawerOpen(true);
    };

    useEffect(() => {
        fetchTasks();
    }, [user.company_id]);

    const handleSubmit = async (e: React.FormEvent, galleryFiles: File[]) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const formPayload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'shift_id') return;
                if (value === undefined || value === null) return;

                if (key === 'image') return;

                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        formPayload.append(`${key}[]`, String(v));
                    });
                    return;
                }

                if (typeof value === 'boolean') {
                    formPayload.append(key, value ? '1' : '0');
                    return;
                }

                formPayload.append(key, String(value));
            });

            galleryFiles.forEach((file) => {
                formPayload.append('files', file);
            });

            const result = await api.post('tasks/create', formPayload, {
                headers: {
                    'Content-Type': undefined,
                },
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                setDrawerOpen(false);
                fetchTasks();
            } else {
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsSaving(false);
        }
        setIsSaving(false);
    };

    const editTask = async (
        e: React.FormEvent,
        galleryFiles: File[],
        removedImageIds: number[],
    ) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formPayload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'shift_id') return;
                if (value === undefined || value === null) return;

                if (key === 'image') return;

                if (Array.isArray(value)) {
                    value.forEach((v) => {
                        formPayload.append(`${key}[]`, String(v));
                    });
                    return;
                }

                if (typeof value === 'boolean') {
                    formPayload.append(key, value ? '1' : '0');
                    return;
                }

                formPayload.append(key, String(value));
            });

            removedImageIds.forEach((id) =>
                formPayload.append('removed_image_ids[]', String(id)),
            );

            galleryFiles.forEach((file) => {
                formPayload.append('files', file);
            });

            const result = await api.post('tasks/update', formPayload, {
                headers: {'Content-Type': 'multipart/form-data'},
            });
            if (result.data.IsSuccess == true) {
                toast.success(result.data.message);
                setFormData({
                    id: 0,
                    company_id: user.company_id,
                    trade_id: 0,
                    category_id: 0,
                    sub_category_id: 0,
                    shift_type: null,
                    duration: '',
                    project: 'All',
                    project_ids: [],
                    note: '',
                    is_show: false,
                });
                setEditDrawerOpen(false);
                fetchTasks();
            }
        } catch (error) {
            console.log(error, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleModelOpen = () => {
        setPreview(null);
        setOpenModel(true);
    };

    const handleModelClose = () => setOpenModel(false);

    const importAddresses = async () => {
        if (!file) {
            toast.error('Please select a file');
            return;
        }

        setIsImport(true);
        setUploadProgress(0);
        setIsProcessing(false);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('tasks/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent: any) => {
                    if (progressEvent.total) {
                        const percent = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total,
                        );

                        setUploadProgress(percent);

                        if (percent === 100) {
                            setIsProcessing(true);
                        }
                    }
                },
            });

            toast.success(res.data.message);

            fetchTasks();

            setTimeout(() => {
                handleModelClose();
                setUploadProgress(0);
                setIsProcessing(false);
            }, 1000);
        } catch (err: any) {
        } finally {
            setIsImport(false);
        }
    };
    const handleFileChange = (acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        setPreview(selectedFile.name);
    };

    const {getRootProps: getExcelRootProps, getInputProps: getExcelInputProps} =
        useDropzone({
            accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                    '.xlsx',
                ],
                'application/vnd.ms-excel': ['.xls'],
            },
            onDrop: handleFileChange,
        });

    const exportTasks = async () => {
        try {
            const selectedIds = Array.from(selectedRowIds);
            const ids = selectedIds.join(',');
            const payload = {
                company_id: user.company_id,
                ids: ids,
            };
            const res = await api.post(`tasks/export`, payload, {
                responseType: 'blob',
            });

            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `task_export.xlsx`;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            fetchTasks();
            setSelectedRowIds(new Set());
        } catch (err) {
            console.error('Failed to export task', err);
        }
    };

    const downloadSampleFile = () => {
        const link = document.createElement('a');
        link.href = '/files/task_import.xlsx';
        link.download = 'sample-file.xlsx';
        link.click();
    };

    const changeIsShow = async (id: string, is_show: boolean) => {
        try {
            const payload = {
                id: Number(id),
                is_show,
            };

            const res = await api.post('/pricework/settings/tasks/show', payload);

            if (res.data?.IsSuccess) {
                toast.success(res.data.message);
                setData((prev: any[]) =>
                    prev.map((p) =>
                        p.id === Number(id)
                            ? {
                                ...p,
                                is_show,
                            }
                            : p,
                    ),
                );
            } else {
                toast.error(res.data?.message || 'Failed to update show setting');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Failed to update show setting');
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: ({table}: any) => (
                    <Stack direction="row" alignItems="center">
                        <CustomCheckbox
                            className="header-checkbox"
                            checked={
                                selectedRowIds.size > 0 && selectedRowIds.size >= data.length
                            }
                            indeterminate={
                                selectedRowIds.size > 0 && selectedRowIds.size < data.length
                            }
                            onClick={(e: any) => e.stopPropagation()}
                            onChange={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSelectAllRows(e.target.checked);
                            }}
                        />
                    </Stack>
                ),
                cell: ({row}: any) => {
                    const item = row.original;
                    const isChecked = selectedRowIds.has(item.id);
                    const isHovered = hoveredRow === item.id;
                    const showCheckbox = isChecked || isHovered;

                    return (
                        <Stack direction="row" alignItems="center" sx={{pl: 1}}>
                            <CustomCheckbox
                                checked={isChecked}
                                onClick={(e: any) => e.stopPropagation()}
                                onChange={(e: any) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const newSelected = new Set(selectedRowIds);
                                    if (isChecked) {
                                        newSelected.delete(item.id);
                                    } else {
                                        newSelected.add(item.id);
                                    }
                                    setSelectedRowIds(newSelected);
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
            },

            columnHelper.accessor('uuid', {
                header: 'ID',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Box display="flex" alignItems="center" sx={{px: 0.5}}>
                            <Typography variant="body2">{item.uuid}</Typography>
                        </Box>
                    );
                },
            }),

            columnHelper.accessor((row) => row?.trade_name, {
                id: 'trade',
                header: () => 'Trade',
                cell: ({row}) => {
                    const item = row.original;
                    return (
                        <Tooltip title={item.trade_name ?? ''}>
                            <Typography
                                textTransform="capitalize"
                                className="f-14"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                    minWidth: '100px',
                                    width: '100%',
                                    maxWidth: '200px',
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    px: 0.5,
                                }}
                            >
                                {item.trade_name}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),

            columnHelper.accessor((row) => row?.shift_name, {
                id: 'shift',
                header: () => 'Shift',
                cell: ({row}) => {
                    const item = row.original;
                    return (
                        <Tooltip title={item.shift_name ?? ''}>
                            <Typography
                                textTransform="capitalize"
                                className="f-14"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                    minWidth: '100px',
                                    width: '100%',
                                    maxWidth: '200px',
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    px: 0.5,
                                }}
                            >
                                {item.shift_name ?? '-'}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),

            columnHelper.accessor((row) => row?.category_name, {
                id: 'category',
                header: () => 'Category',
                cell: ({row}) => {
                    const item = row.original;
                    return (
                        <Tooltip title={item.category_name ?? ''}>
                            <Typography
                                textTransform="capitalize"
                                className="f-14"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                    minWidth: '100px',
                                    width: '100%',
                                    maxWidth: '200px',
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    px: 0.5,
                                }}
                            >
                                {item.category_name ?? '-'}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),
            columnHelper.accessor((row) => row?.sub_category_name, {
                id: 'sub-cat',
                header: () => 'Sub-cat',
                cell: ({row}) => {
                    const item = row.original;
                    return (
                        <Tooltip title={item.sub_category_name ?? ''}>
                            <Typography
                                textTransform="capitalize"
                                className="f-14"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                    minWidth: '100px',
                                    width: '100%',
                                    maxWidth: '200px',
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    px: 0.5,
                                }}
                            >
                                {item.sub_category_name ?? '-'}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),

            columnHelper.accessor('note', {
                header: 'Note',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Tooltip title={item.note ?? ''}>
                            <Typography
                                variant="body2"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                    minWidth: '100px',
                                    width: '100%',
                                    maxWidth: '100px',
                                    borderRadius: 1,
                                    border: '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    px: 0.5,
                                }}
                            >
                                {item.note ?? '-'}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),

            columnHelper.accessor('duration', {
                header: 'Duration',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Box display="flex" alignItems="center" sx={{px: 1.5}}>
                            <Typography variant="body2">
                                {item.duration ?? '-'}
                                {item.duration ? 'm' : ''}
                            </Typography>
                        </Box>
                    );
                },
            }),

            columnHelper.accessor('project', {
                header: 'Project',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Box display="flex" alignItems="center" sx={{px: 1.5}}>
                            <Typography variant="body2" textTransform={'capitalize'}>
                                {item.project ?? '-'}
                            </Typography>
                        </Box>
                    );
                },
            }),

            columnHelper.accessor('complete', {
                header: 'Complete',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Box display="flex" alignItems="center" sx={{px: 1.5}}>
                            <Typography variant="body2">{item.complete ?? 0}</Typography>
                        </Box>
                    );
                },
            }),

            columnHelper.accessor('created_at', {
                header: 'Create',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Box display="flex" alignItems="center" sx={{px: 1.5}}>
                            <Typography variant="body2">{item.created_at ?? '-'}</Typography>
                        </Box>
                    );
                },
            }),

            columnHelper.accessor('completed_by_short_name', {
                header: 'By',
                cell: ({row}: any) => {
                    const item = row.original;

                    return (
                        <Tooltip
                            title={item.completed_by_name ? item.completed_by_name : ''}
                        >
                            <Typography variant="body2" sx={{px: 1.5}}>
                                {item.completed_by_short_name ?? '-'}
                            </Typography>
                        </Tooltip>
                    );
                },
            }),
            columnHelper.accessor('task_images', {
                header: 'File',
                cell: ({row}: any) => {
                    const item = row.original;
                    const count = item.task_images?.length || 0;

                    return (
                        <Typography
                            variant="body2"
                            sx={{
                                px: 1.5,
                                cursor: count > 0 ? 'pointer' : 'default',
                                color: 'inherit',
                                '&:hover': {
                                    color: count > 0 ? 'primary.main' : 'inherit',
                                },
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (count > 0) {
                                    handleOpenDrawer(item.task_images);
                                }
                            }}
                        >
                            {count > 0 ? count : 0}
                        </Typography>
                    );
                },
            }),

            columnHelper.accessor((row) => row?.is_show, {
                id: 'show',
                header: () => 'Show',
                cell: ({row}) => {
                    const item = row.original;

                    return (
                        <Stack
                            direction="row"
                            alignItems="center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IOSSwitch
                                checked={Boolean(item.is_show)}
                                onChange={async (e) => {
                                    const checked = e.target.checked;
                                    await changeIsShow(item.id, checked);
                                }}
                            />
                        </Stack>
                    );
                },
            }),
            columnHelper.display({
                id: 'actions',
                header: 'Actions',
                cell: ({row}) => {
                    const item = row.original;
                    return (
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Edit">
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(item.id);
                                    }}
                                    color="primary"
                                >
                                    <IconEdit size={18}/>
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    );
                },
            }),
        ],
        [data, selectedRowIds, hoveredRow],
    );

    const {
        table,
        pagination,
        setPagination,
        pageCount,
        setPageCount,
        totalRows,
        setTotalRows,
    } = useServerTable({
        data: data,
        columns,
        fetchData: fetchTasks,
        debounceDependencies: [searchTerm, filters, user.company_id],
        state: {columnVisibility},
        onColumnVisibilityChange,
    });

    useEffect(() => {
        setPagination((prev) => ({...prev, pageIndex: 0}));
    }, [searchTerm]);

    const simpleColumns = columns.map((column: any) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <PermissionGuard permission="Tasks">
            <Box
                sx={{
                    height: 'calc(100vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Stack
                    mr={2}
                    ml={2}
                    mb={2}
                    justifyContent="space-between"
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={{xs: 1, sm: 2, md: 4}}
                >
                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={() => setOpen(true)}
                            sx={{mt: {xs: 1, sm: 0}, minWidth: '40px', px: 1}}
                        >
                            <IconFilter width={18}/>
                        </Button>
                    </Box>

                    <Box display="flex" alignItems="center">
                        {selectedRowIds.size > 0 && (
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<IconTrash width={18}/>}
                                sx={{marginRight: '5px', marginLeft: 1}}
                                onClick={() => {
                                    const selectedIds = Array.from(selectedRowIds);
                                    setUsersToDelete(selectedIds);
                                    setOpenDialog(true);
                                }}
                            >
                                Archive
                            </Button>
                        )}
                        <Tooltip title="Settings">
                            <IconButton
                                color="primary"
                                sx={{ml: 1}}
                                onClick={() => setSettingOpen(true)}
                            >
                                <IconSettings/>
                            </IconButton>
                        </Tooltip>
                        <IconButton
                            onClick={handlePopoverOpen}
                            sx={{ml: 1}}
                            color="primary"
                        >
                            <IconEye/>
                        </IconButton>
                        <Popover
                            open={Boolean(anchorEl2)}
                            anchorEl={anchorEl2}
                            onClose={handlePopoverClose}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}
                            PaperProps={{
                                sx: {
                                    width: 280,
                                    mt: 1,
                                    p: 1,
                                    borderRadius: 2,
                                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                                    border: '1px solid #e5e7eb',
                                    maxHeight: 'min(420px, calc(100vh - 140px))',
                                    overflow: 'hidden',
                                },
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Search columns..."
                                fullWidth
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{
                                    mb: 1,
                                    '& .MuiInputBase-root': {
                                        borderRadius: 1.5,
                                        backgroundColor: '#fff',
                                    },
                                }}
                            />
                            <Box
                                sx={{
                                    maxHeight: 'calc(min(420px, calc(100vh - 140px)) - 64px)',
                                    overflowY: 'auto',
                                    pr: 0.5,
                                }}
                            >
                                <FormGroup sx={{gap: 0.25}}>
                                    {(() => {
                                        const columnOptions = table
                                            .getAllLeafColumns()
                                            .filter((col: any) => {
                                                const excludedColumns = ['conflicts', 'select'];
                                                if (excludedColumns.includes(col.id)) return false;

                                                return col.id
                                                    .toLowerCase()
                                                    .includes(search.toLowerCase());
                                            });
                                        const allSelected =
                                            columnOptions.length > 0 &&
                                            columnOptions.every((col: any) => col.getIsVisible());
                                        const someSelected = columnOptions.some((col: any) =>
                                            col.getIsVisible(),
                                        );

                                        return (
                                            <>
                                                <FormControlLabel
                                                    control={
                                                        <CustomCheckbox
                                                            size="small"
                                                            checked={allSelected}
                                                            indeterminate={!allSelected && someSelected}
                                                            disabled={columnOptions.length === 0}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                columnOptions.forEach((col: any) =>
                                                                    col.toggleVisibility(e.target.checked),
                                                                );
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            sx={{
                                                                p: 0.5,
                                                                mr: 1,
                                                            }}
                                                        />
                                                    }
                                                    sx={{
                                                        m: 0,
                                                        px: 0.75,
                                                        py: 0.375,
                                                        width: '100%',
                                                        borderRadius: 1.5,
                                                        alignItems: 'center',
                                                        textTransform: 'none',
                                                        borderBottom: '1px solid #eef2f7',
                                                        mb: 0.25,
                                                        '&:hover': {
                                                            backgroundColor: '#f8fafc',
                                                        },
                                                        '& .MuiFormControlLabel-label': {
                                                            fontSize: '14px',
                                                            lineHeight: 1.35,
                                                            whiteSpace: 'nowrap',
                                                            fontWeight: 600,
                                                        },
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    label="Select All"
                                                />
                                                {columnOptions.map((col: any) => (
                                                    <FormControlLabel
                                                        key={col.id}
                                                        control={
                                                            <CustomCheckbox
                                                                size="small"
                                                                checked={col.getIsVisible()}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    col.getToggleVisibilityHandler()(e);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                sx={{
                                                                    p: 0.5,
                                                                    mr: 1,
                                                                }}
                                                            />
                                                        }
                                                        sx={{
                                                            m: 0,
                                                            px: 0.75,
                                                            py: 0.375,
                                                            width: '100%',
                                                            borderRadius: 1.5,
                                                            alignItems: 'center',
                                                            textTransform: 'none',
                                                            '&:hover': {
                                                                backgroundColor: '#f8fafc',
                                                            },
                                                            '& .MuiFormControlLabel-label': {
                                                                fontSize: '14px',
                                                                lineHeight: 1.35,
                                                                whiteSpace: 'nowrap',
                                                            },
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        label={
                                                            col.columnDef.meta?.label ||
                                                            (typeof col.columnDef.header === 'string' &&
                                                            col.columnDef.header.trim() !== ''
                                                                ? col.columnDef.header
                                                                : col.id
                                                                    .replace(/([A-Z])/g, ' $1')
                                                                    .replace(/^./, (str: string) =>
                                                                        str.toUpperCase(),
                                                                    )
                                                                    .trim())
                                                        }
                                                    />
                                                ))}
                                            </>
                                        );
                                    })()}
                                </FormGroup>
                            </Box>
                        </Popover>

                        <IconButton onClick={handleClick} size="small">
                            <IconDotsVertical width={20}/>
                        </IconButton>
                        <Menu anchorEl={anchorEl} open={openMenu} onClose={handleClose}>
                            <MenuItem onClick={handleClose}>
                                <Link
                                    color="body1"
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setDrawerOpen(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        color: '#11142D',
                                        textTransform: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyItems: 'center',
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconPlus width={18}/>
                                    </ListItemIcon>
                                    Add Task
                                </Link>
                            </MenuItem>

                            <MenuItem
                                onClick={() => {
                                    handleClose();
                                    setArchiveTaskList(true);
                                }}
                            >
                                <ListItemIcon>
                                    <IconNotes width={18}/>
                                </ListItemIcon>
                                Archived task list
                            </MenuItem>
                            <MenuItem onClick={handleClose}>
                                <Link
                                    color="body1"
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleModelOpen();
                                    }}
                                    style={{
                                        width: '100%',
                                        color: '#11142D',
                                        textTransform: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyItems: 'center',
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconFileImport width={18}/>
                                    </ListItemIcon>
                                    Import
                                </Link>
                            </MenuItem>

                            <MenuItem onClick={handleClose}>
                                <Link
                                    color="body1"
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        exportTasks();
                                    }}
                                    style={{
                                        width: '100%',
                                        color: '#11142D',
                                        textTransform: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyItems: 'center',
                                    }}
                                >
                                    <ListItemIcon>
                                        <IconFileExport width={18}/>
                                    </ListItemIcon>
                                    Export
                                </Link>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Stack>
                <Divider/>

                <Box sx={{flex: 1, minHeight: 0, overflow: 'auto'}}>
                    <TableContainer ref={tableContainerRef}>
                        <Table stickyHeader aria-label="sticky table">
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

                                                        ...(header.column.id === 'actions' && {
                                                            position: 'sticky',
                                                            right: 0,
                                                            backgroundColor: 'background.paper',
                                                            zIndex: 3,
                                                            boxShadow: isScrollable
                                                                ? '-2px 0 4px -2px rgba(0,0,0,0.1)'
                                                                : 'none',
                                                        }),
                                                    }}
                                                >
                                                    <Box
                                                        onClick={
                                                            isSortable
                                                                ? header.column.getToggleSortingHandler()
                                                                : undefined
                                                        }
                                                        sx={{
                                                            cursor: isSortable ? 'pointer' : 'default',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            '&:hover': {
                                                                color: isSortable ? '#888' : 'inherit',
                                                            },
                                                            '&:hover .hoverIcon': {opacity: 1},
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
                                {loading ? (
                                    <SkeletonLoader
                                        columns={simpleColumns}
                                        rowCount={simpleColumns.length}
                                    />
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: 'calc(50vh - 100px)',
                                                }}
                                            >
                                                <Image
                                                    src="/images/no-data.png"
                                                    alt="No data"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                    }}
                                                    width={200}
                                                    height={200}
                                                />
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            hover
                                            sx={{cursor: 'pointer'}}
                                            onMouseEnter={() => setHoveredRow(row.original.id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            onClick={() => {
                                                const newSelected = new Set(selectedRowIds);
                                                if (newSelected.has(row.original.id)) {
                                                    newSelected.delete(row.original.id);
                                                } else {
                                                    newSelected.add(row.original.id);
                                                }
                                                setSelectedRowIds(newSelected);
                                            }}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    sx={{
                                                        padding: '10px',
                                                        ...(cell.column.id === 'actions' && {
                                                            position: 'sticky',
                                                            right: 0,
                                                            backgroundColor: 'background.paper',
                                                            zIndex: 1,
                                                            boxShadow: isScrollable
                                                                ? '-2px 0 4px -2px rgba(0,0,0,0.1)'
                                                                : 'none',
                                                        }),
                                                    }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
                <Divider/>
                <TablePaginationFooter
                    selectedCount={
                        typeof selectedRowIds !== 'undefined'
                            ? selectedRowIds.size
                            : undefined
                    }
                    table={table}
                    totalRows={totalRows}
                />
                {/* Modal for File Upload */}
                <Modal open={openModel} onClose={handleModelClose} disableEscapeKeyDown>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'background.paper',
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 24,
                            width: 400,
                        }}
                    >
                        <DialogTitle sx={{p: 0}}>
                            <Typography color="GrayText" fontWeight={700}>
                                Upload Your File
                            </Typography>
                            <IconButton
                                onClick={() => handleModelClose()}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: 10,
                                    backgroundColor: 'transparent',
                                }}
                            >
                                <IconX size={40}/>
                            </IconButton>
                        </DialogTitle>
                        <Box
                            {...getExcelRootProps()}
                            sx={{
                                width: 350,
                                height: 100,
                                mt: 2,
                                border: '2px dashed',
                                borderColor: 'primary.main',
                                borderRadius: 1,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                },
                            }}
                        >
                            <input {...getExcelInputProps()} accept=".xls,.xlsx"/>
                            {preview ? (
                                preview
                            ) : (
                                <Typography fontSize="12px" color="primary.main">
                                    Click or Drag File
                                </Typography>
                            )}
                        </Box>
                        <Typography fontSize="12px" color="text.secondary">
                            Upload Excel Files
                        </Typography>
                        {isImport && (
                            <Box sx={{mt: 2}}>
                                {!isProcessing ? (
                                    <>
                                        <Typography variant="body2" mb={1}>
                                            Uploading... {uploadProgress}%
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={uploadProgress}
                                            sx={{height: 8, borderRadius: 5}}
                                        />
                                    </>
                                ) : (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <CircularProgress size={18}/>
                                        <Typography variant="body2">Processing file...</Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                        {/* Action buttons */}
                        <Box sx={{mt: 2, display: 'flex', justifyContent: 'end'}}>
                            <Link
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    downloadSampleFile();
                                }}
                                style={{
                                    width: '100%',
                                    color: '#1e4db7',
                                    textTransform: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyItems: 'center',
                                }}
                            >
                                <FileDownload/>
                                Download Sample File
                            </Link>
                            <Box sx={{display: 'flex', gap: 1}}>
                                <Button
                                    variant="contained"
                                    disabled={isImport}
                                    onClick={(e: any) => {
                                        importAddresses();
                                    }}
                                >
                                    {isImport ? 'Saving' : 'Save'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleModelClose}
                                    color="error"
                                >
                                    Cancel
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Modal>

                {/* Dialogs and Drawers */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                    <DialogTitle>Confirm Archive</DialogTitle>
                    <DialogContent>
                        <Typography color="textSecondary">
                            Are you sure you want to archive {usersToDelete.length} task
                            {usersToDelete.length > 1 ? 's' : ''} from the tasks?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={() => setOpenDialog(false)}
                            variant="outlined"
                            color="primary"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                try {
                                    const payload = {
                                        ids: usersToDelete.join(','),
                                    };
                                    const res = await api.post('tasks/archive', payload);

                                    if (res.data.IsSuccess) {
                                        toast.success(res.data.message);
                                    }
                                    setSelectedRowIds(new Set());
                                    fetchTasks();
                                } catch (error) {
                                    console.error(error);
                                }
                                setOpenDialog(false);
                            }}
                            variant="outlined"
                            color="error"
                        >
                            Archive
                        </Button>
                    </DialogActions>
                </Dialog>

                <Settings
                    settingOpen={settingOpen}
                    onClose={() => setSettingOpen(false)}
                />

                {/* Add task */}
                <TaskAddEdit
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    isSaving={isSaving}
                    companyId={user?.company_id ?? null}
                />

                <TaskAddEdit
                    open={editDrawerOpen}
                    onClose={() => setEditDrawerOpen(false)}
                    isEdit={true}
                    formData={formData}
                    taskId={selectedTaskId}
                    setFormData={setFormData}
                    handleSubmit={editTask}
                    isSaving={loading}
                    companyId={user?.company_id ?? null}
                />

                {/* Archive Task List */}
                <ArchiveTasks
                    open={archiveTaskList}
                    companyId={Number(user.company_id)}
                    onClose={() => setArchiveTaskList(false)}
                    onWorkUpdated={fetchTasks}
                />

                {/* Filter Dialog */}
                <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    fullWidth
                    maxWidth="sm"
                >
                    <DialogTitle sx={{m: 0, position: 'relative', overflow: 'visible'}}>
                        Filters
                        <IconButton
                            aria-label="close"
                            onClick={() => setOpen(false)}
                            size="large"
                            sx={{
                                position: 'absolute',
                                right: 12,
                                top: 8,
                                color: (theme) => theme.palette.grey[900],
                                backgroundColor: 'transparent',
                                zIndex: 10,
                                width: 50,
                                height: 50,
                            }}
                        >
                            <IconX size={40} style={{width: 40, height: 40}}/>
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} mt={1}>
                            <TextField
                                select
                                label="Trade"
                                value={tempFilters.trade}
                                onChange={(e) =>
                                    setTempFilters({...tempFilters, trade: e.target.value})
                                }
                                fullWidth
                            >
                                <MenuItem value="All">All</MenuItem>
                                {trades.map((p, i) => (
                                    <MenuItem key={i} value={p.name}>
                                        {p.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            {shifts && (
                                <TextField
                                    select
                                    label="Shift"
                                    value={tempFilters.shift}
                                    onChange={(e) =>
                                        setTempFilters({...tempFilters, shift: e.target.value})
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="All">All</MenuItem>
                                    {shifts?.map((p, i) => (
                                        <MenuItem key={i} value={p.name}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {categories && (
                                <TextField
                                    select
                                    label="Category"
                                    value={tempFilters.category}
                                    onChange={(e) =>
                                        setTempFilters({...tempFilters, category: e.target.value})
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="All">All</MenuItem>
                                    {categories?.map((p, i) => (
                                        <MenuItem key={i} value={p.name}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                            {subCategories && (
                                <TextField
                                    select
                                    label="Shift"
                                    value={tempFilters.subCategory}
                                    onChange={(e) =>
                                        setTempFilters({
                                            ...tempFilters,
                                            subCategory: e.target.value,
                                        })
                                    }
                                    fullWidth
                                >
                                    <MenuItem value="All">All</MenuItem>
                                    {subCategories?.map((p, i) => (
                                        <MenuItem key={i} value={p.name}>
                                            {p.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        </Stack>
                    </DialogContent>

                    <DialogActions>
                        <Button
                            onClick={() => {
                                setTempFilters({
                                    trade: '',
                                    shift: '',
                                    category: '',
                                    subCategory: '',
                                });
                                setFilters({
                                    trade: '',
                                    shift: '',
                                    category: '',
                                    subCategory: '',
                                });
                                setOpen(false);
                            }}
                            color="inherit"
                        >
                            Clear
                        </Button>

                        <Button
                            variant="contained"
                            onClick={() => {
                                setFilters(tempFilters);
                                setOpen(false);
                            }}
                        >
                            Apply
                        </Button>
                    </DialogActions>
                </Dialog>
                <Drawer
                    anchor="right"
                    open={imagesDrawerOpen}
                    onClose={() => setImagesDrawerOpen(false)}
                    PaperProps={{
                        sx: {
                            width: {xs: '100%', sm: 450},
                            display: 'flex',
                            flexDirection: 'column',
                        },
                    }}
                >
                    {/* Header */}
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        px={2}
                        py={1.5}
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconButton onClick={() => setImagesDrawerOpen(false)}>
                                <IconArrowLeft size={20}/>
                            </IconButton>

                            <Typography variant="h6" fontWeight={600}>
                                Attachments
                            </Typography>
                        </Box>

                        <IconButton onClick={() => setImagesDrawerOpen(false)}>
                            <IconX size={20}/>
                        </IconButton>
                    </Box>

                    <Divider/>

                    {/* Content */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            p: 2,
                        }}
                    >
                        <Grid container spacing={2}>
                            {drawerImages.map((item, i) => {
                                const isPdf = item.image_url?.toLowerCase().endsWith('.pdf');
                                return (
                                    <Grid size={{xs: 6}} key={item.id ?? i}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                width: '100%',
                                                aspectRatio: '1 / 1',
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                bgcolor: 'grey.100',
                                                transition: '0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.03)',
                                                },
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isPdf) {
                                                    window.open(item.image_url, '_blank');
                                                } else {
                                                    setPreviewImage(
                                                        item.image_url || '/images/products/product.svg',
                                                    );
                                                    setPreviewIndex(i);
                                                    setZoomScale(1);
                                                    setOpenPreview(true);
                                                }
                                            }}
                                        >
                                            {isPdf ? (
                                                <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    height="100%"
                                                    bgcolor="#f5f5f5"
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={600}
                                                        color="textSecondary"
                                                    >
                                                        PDF
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Image
                                                    src={item.image_url || '/images/products/product.svg'}
                                                    alt={`Image ${i + 1}`}
                                                    fill
                                                    style={{
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        {drawerImages.length === 0 && (
                            <Box
                                display="flex"
                                justifyContent="center"
                                alignItems="center"
                                height={250}
                            >
                                <Typography color="text.secondary">
                                    No files available
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Drawer>
                <Dialog
                    open={openPreview}
                    onClose={() => setOpenPreview(false)}
                    fullScreen
                    PaperProps={{
                        sx: {
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            boxShadow: 'none',
                        },
                    }}
                >
                    <IconButton
                        onClick={() => setOpenPreview(false)}
                        sx={{
                            position: 'fixed',
                            top: 16,
                            right: 16,
                            zIndex: 1301,
                            backgroundColor: '#fff',
                            '&:hover': {backgroundColor: '#eee', color: '#1e4db7'},
                        }}
                    >
                        <IconX/>
                    </IconButton>

                    <Box
                        sx={{
                            width: '100vw',
                            height: '100vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                        }}
                        onClick={() => setOpenPreview(false)}
                    >
                        {/* Prev Button */}
                        {drawerImages.length > 1 && (
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewIndex((prev) =>
                                        prev > 0 ? prev - 1 : drawerImages.length - 1,
                                    );
                                    setZoomScale(1);
                                }}
                                sx={{
                                    position: 'absolute',
                                    left: 20,
                                    zIndex: 1301,
                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                    '&:hover': {backgroundColor: '#fff'},
                                }}
                            >
                                <IconChevronLeft size={30}/>
                            </IconButton>
                        )}

                        {/* Image */}
                        <Box
                            sx={{
                                width: '80%',
                                height: '80%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {drawerImages[previewIndex]?.image_url
                                ?.toLowerCase()
                                .endsWith('.pdf') ||
                            previewImage?.toLowerCase().endsWith('.pdf') ? (
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    height="100%"
                                    width="100%"
                                    bgcolor="#f5f5f5"
                                >
                                    <Typography
                                        variant="h4"
                                        fontWeight={600}
                                        color="textSecondary"
                                    >
                                        PDF File
                                    </Typography>
                                </Box>
                            ) : (
                                <img
                                    src={
                                        drawerImages[previewIndex]?.image_url || previewImage || ''
                                    }
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        transform: `scale(${zoomScale})`,
                                        transition: 'transform 0.2s',
                                    }}
                                />
                            )}
                        </Box>

                        {/* Next Button */}
                        {drawerImages.length > 1 && (
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewIndex((prev) =>
                                        prev < drawerImages.length - 1 ? prev + 1 : 0,
                                    );
                                    setZoomScale(1);
                                }}
                                sx={{
                                    position: 'absolute',
                                    right: 20,
                                    zIndex: 1301,
                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                    '&:hover': {backgroundColor: '#fff'},
                                }}
                            >
                                <IconChevronRight size={30}/>
                            </IconButton>
                        )}

                        {/* Controls Toolbar */}
                        <Stack
                            direction="row"
                            spacing={2}
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                                position: 'absolute',
                                bottom: 20,
                                backgroundColor: 'rgba(255,255,255,0.8)',
                                padding: '8px 16px',
                                borderRadius: '30px',
                                zIndex: 1301,
                            }}
                        >
                            <IconButton
                                onClick={() => setZoomScale((prev) => Math.min(prev + 0.5, 5))}
                            >
                                <IconZoomIn/>
                            </IconButton>
                            <IconButton
                                onClick={() =>
                                    setZoomScale((prev) => Math.max(prev - 0.5, 0.5))
                                }
                            >
                                <IconZoomOut/>
                            </IconButton>
                            <IconButton
                                onClick={async () => {
                                    const url =
                                        drawerImages[previewIndex]?.image_url || previewImage || '';
                                    if (url) {
                                        try {
                                            const response = await fetch(url);
                                            const blob = await response.blob();
                                            const blobUrl = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = blobUrl;
                                            const isPdf = url.toLowerCase().endsWith('.pdf');
                                            link.download = isPdf
                                                ? `task_file_${previewIndex + 1}.pdf`
                                                : `task_image_${previewIndex + 1}.jpg`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(blobUrl);
                                        } catch (error) {
                                            console.error('Failed to download image', error);
                                        }
                                    }
                                }}
                            >
                                <IconDownload/>
                            </IconButton>
                        </Stack>
                    </Box>
                </Dialog>
            </Box>
        </PermissionGuard>
    );
};

export default TaskLists;
