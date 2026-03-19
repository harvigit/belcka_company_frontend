'use client';
import React, {useEffect, useState, useMemo} from 'react';
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
    Badge,
} from '@mui/material';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper,
    SortingState,
} from '@tanstack/react-table';
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
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Image from 'next/image';
import {IconEye} from '@tabler/icons-react';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import {format} from 'date-fns';
import CreateInvoice from '../create';
import {DateTime} from 'luxon';

dayjs.extend(customParseFormat);

interface Props {
    userId: number;
    isShow: boolean;
    disableDateFilter?: boolean;
}

const STORAGE_KEY = 'invoice-range';
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

const InvoiceAmountCell = ({item, startDate, endDate, fetchInvoices,}: {
    item: any;
    startDate: Date | null;
    endDate: Date | null;
    fetchInvoices: (start: Date, end: Date) => Promise<void>;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.amount ?? '');

    const handleSave = async () => {
        if (editValue === item.amount) {
            setIsEditing(false);
            return;
        }

        try {
            const formatToBackend = (dateStr: string | null | undefined): string => {
                if (!dateStr) return '';
                const dt = DateTime.fromFormat(dateStr, 'dd MMM yyyy');
                return dt.isValid ? dt.toFormat('dd/MM/yyyy') : '';
            };

            const payload = new FormData();
            payload.append('id', String(item.id));
            payload.append('user_id', String(item.user_id));
            payload.append('company_id', String(item.company_id));
            payload.append('amount', String(editValue));
            payload.append('from_date', formatToBackend(item.from_date));
            payload.append('to_date', formatToBackend(item.to_date));
            payload.append('invoice_date', formatToBackend(item.invoice_date));
            payload.append('invoice_number', item.invoice_number ?? '');
            payload.append('description', item.description ?? '');

            const result = await api.post('bookkeeper-invoices/update', payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                if (startDate && endDate) await fetchInvoices(startDate, endDate);
            } else {
                toast.error(result.data.message);
                setEditValue(item.amount);
            }
        } catch (error) {
            console.error('Failed to update invoice amount:', error);
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
                sx={{ width: 140 }}
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

const InvoicesList: React.FC<Props> = ({userId, isShow, disableDateFilter = false}) => {
    const [data, setData] = useState<any[]>([]);
    const [columnFilters, setColumnFilters] = useState<any>([]);
    const [fetchPayslip, setFetchPayslip] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [sorting, setSorting] = useState<SortingState>([]);
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const [isSaving, setIsSaving] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
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
        invoice_date: '',
        description: '',
        invoice_number: '',
        file: null,

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
    const fetchInvoices = async (start: Date | null, end: Date | null): Promise<void> => {
        setFetchPayslip(true);
        try {
            const startParam = start ? format(start, "dd/MM/yyyy") : "";
            const endParam = end ? format(end, "dd/MM/yyyy") : "";
            const res = await api.get(
                `bookkeeper-invoices/get?company_id=${user.company_id}&user_id=${userId}&start_date=${startParam}&end_date=${endParam}`,
            );
            if (res.data) {
                setData(res.data.info);
            }
        } catch (err) {
            console.error("Failed to fetch invoices", err);
        }
        setFetchPayslip(false);
    };

    useEffect(() => {
        fetchResources();
    }, [api]);

    useEffect(() => {
        if (user?.company_id) {
            fetchInvoices(startDate, endDate);
        }
    }, [user?.company_id, startDate, endDate]);


    const handleZip = async () => {
        if (!selectedRowIds.size) {
            toast.error('Please select at least one invoice');
            return;
        }

        try {
            const res = await api.post('bookkeeper-invoices/zip', {
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
            a.download = 'invoices.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success('Invoices downloaded!');
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        }
    };

    const viewPdf = (pdfPath: string) => {
        if (pdfPath) {
            window.open(pdfPath, '_blank');
        } else {
            console.error('PDF path is missing');
        }
    };

    const handleOpenCreateDrawer = () => {
        setFormData({
            id: 0,
            company_id: user?.company_id,
            user_id: userId,
            from_date: '',
            to_date: '',
            invoice_date: '',
            description: '',
            invoice_number: '',
            file: null,

        });
        setDrawerOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

            if (formData.file) {
                const ext = '.' + formData.file.name.split('.').pop()?.toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    toast.error('Only PDF, JPG, PNG, WEBP files are allowed');
                    setIsSaving(false);
                    return;
                }
            }

            const formatDateForBE = (date?: string) =>
                date ? DateTime.fromISO(date).toFormat('dd/MM/yyyy') : '';

            const payload = new FormData();
            payload.append('id', formData.id ?? 0);
            payload.append('company_id', formData.company_id ?? '');
            payload.append('user_id', formData.user_id ?? '');
            payload.append('invoice_number', formData.invoice_number ?? '');
            payload.append('description', formData.description ?? '');
            payload.append('from_date', formatDateForBE(formData.from_date));
            payload.append('to_date', formatDateForBE(formData.to_date));
            payload.append('invoice_date', formatDateForBE(formData.invoice_date));
            payload.append('amount', formData.amount ?? '0');

            if (formData.file) {
                payload.append('file', formData.file);
            }

            const result = await api.post('bookkeeper-invoices/store', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (result.data.IsSuccess) {
                toast.success(result.data.message);
                setDrawerOpen(false);
                if (startDate && endDate) {
                    fetchInvoices(startDate, endDate);
                }
            } else {
                toast.error(result.data.message);
            }
        } catch (error) {
            console.error('Invoice upload failed:', error);
            toast.error('Something went wrong');
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

    const filteredData = useMemo(() => {
        const search = searchTerm.toLowerCase();
        return flattenedData.filter(
            (item) =>
                item.user_name?.toLowerCase().includes(search) ||
                item.from_date?.toLowerCase().includes(search) ||
                item.date?.toLowerCase().includes(search) ||
                item.description?.toLowerCase().includes(search) ||
                item.invoice_number?.toLowerCase().includes(search) ||
                item.to_date?.toLowerCase().includes(search),
        );
    }, [flattenedData, searchTerm]);

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

        columnHelper.accessor('image', {
            id: 'Image',
            header: () => (
                <Stack direction="row" alignItems="center" spacing={4}>
                    <Typography variant="subtitle2" fontWeight="inherit">
                        Image
                    </Typography>
                </Stack>
            ),
            enableSorting: true,
            cell: ({row}) => {
                const item = row.original;

                const isPdf = item.extension === '.pdf';
                return (
                    <Stack direction="row" alignItems="center" spacing={4}>
                        {item.image && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPdf) {
                                        viewPdf(item.image);
                                    } else {
                                        setPreviewImage(item.image);
                                        setOpenPreview(true);
                                    }
                                }}
                            >
                                {isPdf ? (
                                    <Image
                                        src={item.thumb_image}
                                        alt={'Payslip'}
                                        width={50}
                                        height={50}
                                    />
                                ) : (
                                    <Image
                                        src={item.image}
                                        alt={'Payslip'}
                                        width={50}
                                        height={50}
                                    />
                                )}
                            </div>
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
                        <Badge
                            overlap="circular"
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                            variant="dot"
                            sx={{
                                '& .MuiBadge-badge': {
                                    backgroundColor: user?.is_working ? '#22bf22' : '#df2626',
                                    color: user?.is_working ? '#22bf22' : '#df2626',
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    boxShadow: '0 0 0 2px white',
                                    cursor: 'pointer',
                                },
                            }}
                        >
                            <Avatar
                                src={
                                    user?.user_image ? user.user_image : '/images/users/user.png'
                                }
                                alt={user?.first_name}
                                sx={{width: 36, height: 36}}
                            />
                        </Badge>
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
            cell: ({ row }) => (
                <InvoiceAmountCell
                    item={row.original}
                    startDate={startDate}
                    endDate={endDate}
                    fetchInvoices={fetchInvoices}
                />
            ),
        }),

        columnHelper.accessor((row) => row?.description, {
            id: 'description',
            header: () => 'Description',
            cell: ({row}) => {
                const item = row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Tooltip title={item.description || ''} placement="top" arrow>
                            <Typography
                                textTransform="capitalize"
                                className="f-14"
                                sx={{
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: 1.25,
                                    maxWidth: isShow ? 500 : 300,
                                    wordBreak: 'break-word',
                                }}
                            >
                                {item.description ? item.description : '-'}
                            </Typography>
                        </Tooltip>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor((row) => row?.invoice_number, {
            id: 'invoiceNumber',
            header: () => 'Number',
            cell: ({row}) => {
                const item = row.original;
                return (
                    <Typography textTransform="capitalize" className="f-14">
                        {item.invoice_number ? item.invoice_number : '-'}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor((row) => row?.date, {
            id: 'date',
            header: () => 'Invoice Date',
            cell: ({row}) => {
                const item = row.original;
                return (
                    <Typography textTransform="capitalize" className="f-14">
                        {item.date ? item.date : '-'}
                    </Typography>
                );
            },
        }),
    ];

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl2(event.currentTarget);
    };
    const handlePopoverClose = () => setAnchorEl2(null);
    const table = useReactTable({
        data: filteredData,
        columns,
        state: {columnFilters, sorting},
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
                    {/*<Button variant="contained" color="primary" sx={{ flexShrink: 0 }}>*/}
                    {/*  INVOICES ({table.getPrePaginationRowModel().rows.length}){" "}*/}
                    {/*</Button>*/}
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
                                Add Invoice
                            </Link>
                        </MenuItem>
                    </Menu>

                    {/* Delete Payslip */}
                    <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogContent>
                            <Typography color="textSecondary">
                                Are you sure you want to delete {usersToDelete.length} invoice
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
                                        const response = await api.post(
                                            'bookkeeper-invoices/delete',
                                            payload,
                                        );
                                        toast.success(response.data.message);
                                        setSelectedRowIds(new Set());
                                        if (startDate && endDate) {
                                            await fetchInvoices(startDate, endDate);
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

            {/* Add Invoice */}
            <CreateInvoice
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                formData={formData}
                setFormData={setFormData}
                handleSubmit={handleSubmit}
                isSaving={isSaving}
                isShow={isShow}
                companyId={user?.company_id ?? null}
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
            <Stack
                gap={1}
                pr={3}
                pt={1}
                pl={3}
                pb={2}
                alignItems="center"
                direction={{xs: 'column', sm: 'row'}}
                justifyContent="space-between"
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography color="textSecondary" className="f-14">
                        {table.getPrePaginationRowModel().rows.length} Records
                    </Typography>
                </Box>
                <Box
                    sx={{
                        display: {
                            xs: 'block',
                            sm: 'flex',
                        },
                    }}
                    alignItems="center"
                >
                    <Stack direction="row" alignItems="center">
                        <Typography color="textSecondary" className="f-14">
                            Page
                        </Typography>
                        <Typography
                            color="textSecondary"
                            className="f-14"
                            fontWeight={600}
                            ml={1}
                        >
                            {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </Typography>
                        <Typography color="textSecondary" ml={'3px'} className="f-14">
                            {' '}
                            | Entries :{' '}
                        </Typography>
                    </Stack>
                    <Stack
                        ml={'5px'}
                        direction="row"
                        alignItems="center"
                        color="textSecondary"
                    >
                        <CustomSelect
                            className="custom-select"
                            value={table.getState().pagination.pageSize}
                            onChange={(e: { target: { value: any } }) => {
                                table.setPageSize(Number(e.target.value));
                            }}
                        >
                            {[50, 100, 250, 500].map((pageSize) => (
                                <MenuItem key={pageSize} value={pageSize}>
                                    {pageSize}
                                </MenuItem>
                            ))}
                        </CustomSelect>
                        <IconButton
                            size="small"
                            sx={{width: '30px'}}
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <IconChevronLeft/>
                        </IconButton>
                        <IconButton
                            size="small"
                            sx={{width: '30px'}}
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <IconChevronRight/>
                        </IconButton>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};

export default InvoicesList;
