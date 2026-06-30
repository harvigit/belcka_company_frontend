'use client';
import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
    TableContainer,
    Table,
    TableRow,
    TableCell,
    TableBody,
    TableHead,
    Typography,
    Box,
    Grid,
    Button,
    Divider,
    IconButton,
    Stack,
    TextField,
    InputAdornment,
    MenuItem,
    DialogActions,
    DialogTitle,
    DialogContent,
    Dialog,
    Menu,
    ListItemIcon,
    Tooltip,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Avatar,
} from '@mui/material';
import {
    flexRender,
    getCoreRowModel,
    createColumnHelper,
} from '@tanstack/react-table';
import { useServerTable } from "@/hooks/useServerTable";
import {
    IconChevronLeft,
    IconChevronRight,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Link from 'next/link';
import {IconDotsVertical} from '@tabler/icons-react';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import {IconPlus} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {IconEdit} from '@tabler/icons-react';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Image from 'next/image';
import {IconEye} from '@tabler/icons-react';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import {format} from 'date-fns';
import CreatePayslip from '../create';
import EditPayslip from '../edit';
import {DateTime} from 'luxon';
import {PictureAsPdf} from '@mui/icons-material';
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";

dayjs.extend(customParseFormat);

interface Props {
    userId: number,
    isShow: boolean,
    disableDateFilter?: boolean;
}

const STORAGE_KEY = 'payslip-date-range';
const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
            };
        }
    } catch (error) {
        console.error('Error loading date range from localStorage:', error);
    }
    return null;
};

const saveDateRangeToStorage = (
    startDate: Date | null,
    endDate: Date | null,
) => {
    try {
        const dateRange = {
            startDate: startDate ? startDate.toDateString() : null,
            endDate: endDate ? endDate.toDateString() : null,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
    } catch (error) {
        console.error('Error saving date range to localStorage:', error);
    }
};

// Add this OUTSIDE PayslipsList component (above it)
const AmountCell = ({
                        item,
                        startDate,
                        endDate,
                        fetchPayslips,
                    }: {
    item: any;
    startDate: Date | null;
    endDate: Date | null;
    fetchPayslips: (start: Date, end: Date) => Promise<void>;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.amount ?? '');

    const handleSave = async () => {
        if (editValue === item.amount) {
            setIsEditing(false);
            return;
        }

        try {
            const payload = new FormData();
            payload.append('id', String(item.id));
            payload.append('user_id', String(item.user_id));
            payload.append('company_id', String(item.company_id));
            payload.append('amount', String(editValue));

            payload.append('from_date', item.fromDate ?? '');
            payload.append('to_date', item.toDate ?? '');
            payload.append('payment_date', item.payment_date ?? '');
            payload.append('payslip_number', item.payslip_number ?? '');

            const result = await api.post('payslips/update', payload, {
                headers: {'Content-Type': 'multipart/form-data'},
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                if (startDate && endDate) fetchPayslips(startDate, endDate);
            } else {
                toast.error(result.data.message);
                setEditValue(item.amount); // revert
            }
        } catch (error) {
            console.error('Failed to update amount:', error);
            setEditValue(item.amount);
        }

        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <TextField
                autoFocus
                size="small"
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                        setEditValue(item.amount);
                        setIsEditing(false);
                    }
                }}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">{item.currency}</InputAdornment>
                        ),
                    },
                }}
                sx={{width: 140}}
            />
        );
    }

    return (
        <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            onClick={() => setIsEditing(true)}
            sx={{
                cursor: 'pointer',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                '&:hover': {
                    backgroundColor: 'action.hover',
                    outline: '1px dashed',
                    outlineColor: 'primary.main',
                },
            }}
        >
            <Typography className="f-14">
                {item.currency} {item.amount ?? '-'}
            </Typography>
        </Stack>
    );
};

const PayslipsList: React.FC<Props> = ({userId, isShow, disableDateFilter}) => {
    const [data, setData] = useState<any[]>([]);
    const [fetchPayslip, setFetchPayslip] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const [isSaving, setIsSaving] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [editPayslipData, setEditPayslipData] = useState<any>([]);
    const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [usersToDelete, setUsersToDelete] = useState<number[]>([]);
    const [openPreview, setOpenPreview] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    // Load from localStorage or use defaults
    const getInitialDates = () => {
        if (disableDateFilter) {
            return { startDate: null, endDate: null };
        }

        const stored = loadDateRangeFromStorage();
        if (stored && stored.startDate && stored.endDate) {
            return { startDate: stored.startDate, endDate: stored.endDate };
        }
        return { startDate: defaultStart, endDate: defaultEnd };
    };

    const initialDates = getInitialDates();
    const [startDate, setStartDate] = useState<Date | null>(
        initialDates.startDate,
    );
    const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
    const [formData, setFormData] = useState<any>({
        id: 0,
        company_id: user?.company_id,
        user_id: userId,
        from_date: '',
        to_date: '',
        payment_date: '',
        amount: '',
        payslip_number: '',
    });
    const handleDateRangeChange = (range: {
        from: Date | null;
        to: Date | null;
    }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            saveDateRangeToStorage(range.from, range.to);
        }
    };
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const fetchResources = async () => {
        try {
            const res = await api.get(
                `get-inventory-resources?company_id=${user.company_id}`,
            );
            if (res.data) {
                setUsers(res.data.users);
            }
        } catch (err) {
            console.error('Failed to fetch inventory resource', err);
        }
    };

    // Fetch data
    const fetchPayslips = async (start?: Date | null, end?: Date | null, restorePage?: number) => {
        setFetchPayslip(true);
        try {
            const activeStart = start !== undefined ? start : startDate;
            const activeEnd = end !== undefined ? end : endDate;
            const startParam = activeStart ? format(activeStart, 'dd/MM/yyyy') : '';
            const endParam = activeEnd ? format(activeEnd, 'dd/MM/yyyy') : '';
            let url = `payslips/get?company_id=${user.company_id}&user_id=${userId}&start_date=${startParam}&end_date=${endParam}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;
            
            if (searchTerm) url += `&search=${searchTerm}`;
            
            const res = await api.get(url);
            if (res.data) {
                const responseData = res.data.info?.data || res.data.info || res.data.data || [];
                setData(responseData);

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
                    setTotalRows(responseData.length);
                }

                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                } else if (pagMeta.last_page !== undefined) {
                    setPageCount(pagMeta.last_page);
                }

                if (restorePage !== undefined) {
                    setTimeout(() => {
                        setPagination((prev: any) => ({ ...prev, pageIndex: restorePage }));
                    }, 0);
                }
            }
        } catch (err) {
            console.error('Failed to fetch payslip', err);
        } finally {
            setFetchPayslip(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [api]);

    useEffect(() => {
        if (user?.company_id) {
            fetchPayslips();
        }
    }, [user?.company_id, startDate, endDate]);

    const handleZip = async () => {
        if (!selectedRowIds.size) {
            toast.error('Please select at least one payslip');
            return;
        }

        try {
            const res = await api.post('payslips/zip', {
                ids: Array.from(selectedRowIds),
            });

            if (!res.data?.IsSuccess) {
                toast.error(res.data?.message || 'Failed to create zip');
                return;
            }

            const zipUrl = res.data?.data?.url;
            if (!zipUrl) {
                toast.error('No zip URL returned from server');
                return;
            }

            const fileRes = await fetch(zipUrl);
            if (!fileRes.ok) {
                toast.error('Failed to download zip file');
                return;
            }

            const blob = await fileRes.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'payslips.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('Payslips downloaded!');
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        }
    };

    const viewPdf = (pdf: string) => {
        if (!pdf) return;
        const url = `${pdf}`;
        window.open(url, '_blank');
    };

    const handleOpenCreateDrawer = () => {
        setFormData({
            id: 0,
            company_id: user?.company_id,
            user_id: userId,
            from_date: '',
            to_date: '',
            payment_date: '',
            amount: '',
            payslip_number: '',
        });
        setDrawerOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const formatDateForBE = (date?: string) =>
                date ? DateTime.fromISO(date).toFormat('dd/MM/yyyy') : '';

            const payload = {
                ...formData,
                from_date: formatDateForBE(formData.from_date),
                to_date: formatDateForBE(formData.to_date),
                payment_date: formatDateForBE(formData.payment_date),
            };

            const result = await api.post('payslips/store', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                setDrawerOpen(false);
                if (startDate && endDate) {
                    fetchPayslips(startDate, endDate);
                }
            } else {
                toast.error(result.data.message);
            }
        } catch (error) {
            console.error('Payslip upload failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const editPayslip = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const formatDateForBE = (date?: string) =>
                date ? DateTime.fromISO(date).toFormat('dd/MM/yyyy') : '';

            const payload = {
                ...formData,
                from_date: formatDateForBE(formData.from_date),
                to_date: formatDateForBE(formData.to_date),
                payment_date: formatDateForBE(formData.payment_date),
            };

            const result = await api.post('payslips/update', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                setEditDrawerOpen(false);
                if (startDate && endDate) {
                    fetchPayslips(startDate, endDate);
                }
            } else {
                toast.error(result.data.message);
            }
        } catch (error) {
            console.error('Update payslip failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const flattenedData = useMemo(() => {
        if (!data) return [];

        return data.flatMap((group) =>
            group.data.map((item: any) => ({
                ...item,
                date: group.date,
            })),
        );
    }, [data]);

    const filteredData = flattenedData;

    // UseCallback to memoize these functions
    const handleEdit = useCallback((item: any) => {
        setSelectedTaskId(item.id);
        setEditPayslipData(item);
        setEditDrawerOpen(true);
    }, []);

    const columnHelper = createColumnHelper<any>();
    const columns = [
        {
            id: 'select',
            header: ({table}: any) => (
                <Stack direction="row" alignItems="center">
                    <CustomCheckbox
                        className="header-checkbox"
                        checked={
                            selectedRowIds.size === filteredData.length &&
                            filteredData.length > 0
                        }
                        indeterminate={
                            selectedRowIds.size > 0 &&
                            selectedRowIds.size < filteredData.length
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const isChecked = e.target.checked;

                            if (isChecked) {
                                setSelectedRowIds(new Set(filteredData.map((row) => row.id)));
                            } else {
                                setSelectedRowIds(new Set());
                            }
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
                    <Stack
                        direction="row"
                        alignItems="center"
                        onMouseEnter={() => setHoveredRow(item.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        sx={{pl: 0.3}}
                    >
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
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

        columnHelper.accessor('image_url', {
            id: 'Image',
            header: () => (
                <Stack direction="row" alignItems="center">
                    <Typography variant="subtitle2" fontWeight="inherit">
                        Image
                    </Typography>
                </Stack>
            ),
            enableSorting: false,
            cell: ({row}) => {
                const item = row.original;

                const isPdf = item.pdf_extension === '.pdf';
                const imageUrl = isPdf ? item.thumb_image_url : item.image_url;
                const fullUrl = isPdf ? item.pdf_url : item.image_url;

                return (
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {imageUrl ? (
                            <Box
                                component="div"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPdf) {
                                        viewPdf(fullUrl);
                                    } else {
                                        setPreviewImage(fullUrl);
                                        setOpenPreview(true);
                                    }
                                }}
                                sx={{
                                    cursor: 'pointer',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    '&:hover': {
                                        transform: 'scale(1.08)',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                    },
                                }}
                            >
                                <Image
                                    src={imageUrl}
                                    alt="Payslip document"
                                    width={50}
                                    height={50}
                                    style={{
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                    }}
                                    onError={(e) => {
                                        console.error('Image failed to load:', imageUrl);
                                    }}
                                />
                                {isPdf && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            backgroundColor: 'rgba(211, 0, 0, 0.8)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: 22,
                                            height: 22,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            bottom: -5,
                                            right: -5,
                                            border: '2px solid white',
                                        }}
                                    >
                                        PDF
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    width: 50,
                                    height: 50,
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#999',
                                    fontSize: '12px',
                                }}
                            >
                                No file
                            </Box>
                        )}
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('user_name', {
            id: 'Name',
            header: () => (
                <Stack direction="row" alignItems="center" spacing={4}>
                    <Typography variant="subtitle2" fontWeight="inherit">
                        Name
                    </Typography>
                </Stack>
            ),
            enableSorting: true,
            cell: ({row}) => {
                const user = row.original;
                return (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{cursor: 'pointer'}}
                    >
                        <Avatar
                            src={user.user_image ? user.user_image : ''}
                            alt={user.name}
                            sx={{width: 36, height: 36}}
                        />
                        <Box>
                            <Typography
                                className="f-14"
                                color="textPrimary"
                                sx={{
                                    width: 190,
                                }}
                            >
                                {user.user_name ?? '-'}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor((row) => row?.amount, {
            id: 'amount',
            header: () => 'Amount',
            cell: ({row}) => (
                <AmountCell
                    item={row.original}
                    startDate={startDate}
                    endDate={endDate}
                    fetchPayslips={fetchPayslips}
                />
            ),
        }),

        columnHelper.accessor((row) => row?.date, {
            id: 'uploadedDate',
            header: () => 'Uploaded Date',
            cell: ({row}) => {
                const item = row.original;
                return (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        textTransform={'capitalize'}
                        className="f-14"
                    >
                        {item.date ? item.date : '-'}
                        <Typography color="textSecondary">{item.name}</Typography>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor((row) => row?.from_date, {
            id: 'period',
            header: () => 'Period',
            cell: ({row}) => {
                const item = row.original;
                return (
                    <Typography textTransform="capitalize" className="f-14">
                        {item.from_date ? item.from_date : '-'} <b>To</b>{' '}
                        {item.to_date ? item.to_date : '-'}
                    </Typography>
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
                            <IconButton onClick={() => handleEdit(item)} color="primary">
                                <IconEdit size={18}/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
        }),
    ];

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl2(event.currentTarget);
    };
    const handlePopoverClose = () => setAnchorEl2(null);
    const { table, pagination, setPagination, totalRows, setTotalRows, pageCount, setPageCount } = useServerTable({
        data: filteredData,
        columns,
        fetchData: () => fetchPayslips(startDate, endDate),
        debounceDependencies: [searchTerm],
    });

    // Reset to first page when search term changes
    useEffect(() => {
        table.setPageIndex(0);
    }, [searchTerm, table]);

    const simpleColumns = columns.map((column) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <Box
            sx={{
                height: `${isShow ? 'calc(91vh - 100px)' : 'calc(73vh - 100px)'}`,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Render the search and table */}
            <Stack
                mx={2}
                mb={2}
                direction={{xs: 'column', md: 'row'}}
                alignItems={{xs: 'stretch', md: 'center'}}
            >
                <Stack
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={1.5}
                    alignItems={{xs: 'stretch', sm: 'center'}}
                    sx={{flex: 1, minWidth: 0}}
                >
                    <Box className={isShow ? '' : 'date_range_picker'}>
                        <DateRangePickerBox
                            from={startDate}
                            to={endDate}
                            onChange={handleDateRangeChange}
                        />
                    </Box>

                    <TextField
                        id="search"
                        type="text"
                        size="small"
                        variant="outlined"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={'16'}/>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleZip}
                        sx={{mt: {xs: 1, sm: 0}}}
                    >
                        {' '}
                        Zip
                    </Button>
                </Stack>
                <Stack
                    direction="row"
                    justifyContent={{xs: 'flex-start', md: 'flex-end'}}
                    alignItems="center"
                    sx={{flexShrink: 0}}
                >
                    {selectedRowIds.size > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<IconTrash width={18}/>}
                            sx={{marginRight: '5px'}}
                            onClick={() => {
                                const selectedIds = Array.from(selectedRowIds);
                                setUsersToDelete(selectedIds);
                                setConfirmOpen(true);
                            }}
                        >
                            Remove
                        </Button>
                    )}
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
                        PaperProps={{sx: {width: 220, p: 1, borderRadius: 2}}}
                    >
                        <TextField
                            size="small"
                            placeholder="Search"
                            fullWidth
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{mb: 1}}
                        />
                        <FormGroup>
                            {table
                                .getAllLeafColumns()
                                .filter((col: any) => {
                                    const excludedColumns = ['conflicts', 'select'];
                                    if (excludedColumns.includes(col.id)) return false;

                                    return col.id.toLowerCase().includes(search.toLowerCase());
                                })
                                .map((col: any) => (
                                    <FormControlLabel
                                        key={col.id}
                                        control={
                                            <Checkbox
                                                checked={col.getIsVisible()}
                                                onChange={col.getToggleVisibilityHandler()}
                                                disabled={col.id === 'conflicts'}
                                            />
                                        }
                                        sx={{textTransform: 'none'}}
                                        label={
                                            col.columnDef.meta?.label ||
                                            (typeof col.columnDef.header === 'string' &&
                                            col.columnDef.header.trim() !== ''
                                                ? col.columnDef.header
                                                : col.id
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, (str: string) => str.toUpperCase())
                                                    .trim())
                                        }
                                    />
                                ))}
                        </FormGroup>
                    </Popover>
                    <IconButton
                        sx={{margin: '0px'}}
                        id="basic-button"
                        aria-controls={openMenu ? 'basic-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={openMenu ? 'true' : undefined}
                        onClick={handleClick}
                    >
                        <IconDotsVertical width={18}/>
                    </IconButton>
                    <Menu
                        id="basic-menu"
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleClose}
                        slotProps={{
                            list: {
                                'aria-labelledby': 'basic-button',
                            },
                        }}
                    >
                        <MenuItem onClick={handleClose}>
                            <Link
                                color="body1"
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenCreateDrawer();
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
                                Add Payslip
                            </Link>
                        </MenuItem>
                    </Menu>

                    {/* Delete Payslip */}
                    <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogContent>
                            <Typography color="textSecondary">
                                Are you sure you want to delete {usersToDelete.length} payslip
                                {usersToDelete.length > 1 ? 's' : ''} for this user?
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => setConfirmOpen(false)}
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
                                        const response = await api.post('payslips/delete', payload);
                                        toast.success(response.data.message);
                                        setSelectedRowIds(new Set());
                                        if (startDate && endDate) {
                                            await fetchPayslips(startDate, endDate);
                                        }
                                    } catch (error) {
                                    } finally {
                                        setConfirmOpen(false);
                                    }
                                }}
                                variant="outlined"
                                color="error"
                            >
                                Remove
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Stack>
            </Stack>
            <Divider/>

            <Dialog
                open={openPreview}
                onClose={() => setOpenPreview(false)}
                fullScreen
                PaperProps={{
                    sx: {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                    },
                }}
            >
                <IconButton
                    onClick={() => setOpenPreview(false)}
                    color="primary"
                    sx={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        zIndex: 1301,
                        backgroundColor: '#fff',
                        '&:hover': {
                            backgroundColor: '#eee',
                            color: '#1e4db7',
                        },
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
                    }}
                    onClick={() => setOpenPreview(false)}
                >
                    <img
                        src={previewImage || ''}
                        alt="Preview"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90% !important',
                            height: '50%',
                            objectFit: 'contain',
                        }}
                    />
                </Box>
            </Dialog>

            {/* Add Payslip */}
            <CreatePayslip
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
                isSaving={isSaving}
                companyId={user?.company_id ?? null}
                isShow={isShow}
            />

            {/* Edit Payslip */}
            <EditPayslip
                open={editDrawerOpen}
                onClose={() => setEditDrawerOpen(false)}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={editPayslip}
                payslip={editPayslipData}
                isSaving={isSaving}
                companyId={user?.company_id ?? null}
                isShow={isShow}
            />

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                }}
            >
                <TableContainer>
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
                                                sx={{
                                                    paddingTop: '10px',
                                                    paddingBottom: '10px',
                                                    width:
                                                        header.column.id === 'actions' ||
                                                        header.column.id === 'price' ||
                                                        header.column.id === 'barcode'
                                                            ? 80
                                                            : header.column.id === 'QrCode'
                                                                ? 120
                                                                : header.column.id === 'supplierCode'
                                                                    ? 140
                                                                    : header.column.id === 'select'
                                                                        ? 30
                                                                        : 'auto',
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
                                                        '&:hover': {color: '#888'},
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
                            {fetchPayslip ? (
                                <SkeletonLoader
                                    columns={simpleColumns}
                                    rowCount={simpleColumns.length}
                                />
                            ) : data.length === 0 ? (
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
                                    <TableRow key={row.id} hover sx={{cursor: 'pointer'}}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
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
                {data.length ? <Divider/> : <></>}
            </Box>
            <Divider/>
            <TablePaginationFooter
                table={table}
                totalRows={table.getPrePaginationRowModel().rows.length}
            />
        </Box>
    );
};

export default PayslipsList;
