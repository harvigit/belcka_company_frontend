'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Autocomplete,
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    FormControlLabel,
    FormGroup,
    IconButton,
    InputAdornment,
    Popover,
    Stack,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    IconCheck,
    IconExternalLink,
    IconEye,
    IconFilter,
    IconSearch,
    IconSend,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {format, subDays} from 'date-fns';
import {
    createColumnHelper,
    flexRender,
    SortingState,
    VisibilityState,
} from '@tanstack/react-table';
import Image from 'next/image';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {useServerTable} from '@/hooks/useServerTable';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Expenses from '@/app/components/apps/time-clock/time-clock-details/expenses';
import {
    ExpenseApiRow,
    ExpenseListItem,
    ExpenseTabItem,
    ExpenseTabKey,
    capitalizeExpenseValue,
    getInitials,
    normalizeExpenseStatus,
} from './types';
import ExpenseDetailsDrawer from './components/ExpenseDetailsDrawer';
import ExpenseStatusBadge from './components/ExpenseStatusBadge';

type ExpenseRow = ExpenseApiRow;

const columnHelper = createColumnHelper<ExpenseRow>();

const COLUMN_LABELS: Record<string, string> = {
    date_added: 'Date',
    user_name: 'Submitted By',
    project_name: 'Project',
    address_name: 'Address',
    category_name: 'Category',
    receipt_date: 'Receipt Date',
    note: 'Description',
    total_amount: 'Amount',
    attachment_count: 'Receipt',
    status: 'Status',
    actions: 'Actions',
};

const defaultFilters = {
    user_id: '' as string | number,
    project_id: '' as string | number,
    category_id: '' as string | number,
    trade_id: '' as string | number,
    team_id: '' as string | number,
};

const BULK_BUTTON_SX = {
    px: 2.5,
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: '8px',
};

const formatAmount = (currency: string, amount: number) =>
    `${currency}${Number(amount || 0).toFixed(2)}`;

const mapApiRowToListItem = (row: ExpenseRow): ExpenseListItem => {
    const name = row.user_name?.trim() || 'Unknown';
    const apiStatus = normalizeExpenseStatus(row.status);

    return {
        id: row.id,
        date: row.date_added || '-',
        submittedBy: {
            name,
            role: row.trade_name?.trim() || '—',
            initials: getInitials(name),
            avatarUrl: row.user_thumb_image || row.user_image || null,
        },
        project: row.project_name?.trim() || '-',
        address: row.address_name?.trim() || '-',
        category: capitalizeExpenseValue(row.category_name),
        receiptDate: row.receipt_date || '-',
        description: row.note?.trim() || '-',
        amount: Number(row.total_amount || 0),
        currency: row.currency || '£',
        status: apiStatus ?? 'pending',
        canReject: Boolean(row.can_reject),
        attachmentCount: Number(row.attachment_count || 0),
        statusUpdatedBy: row.status_updated_by ?? null,
        statusUpdatedByName: row.status_updated_by_name ?? null,
        statusUpdatedAt: row.status_updated_at ?? null,
        sentBy: row.sent_by ?? null,
        sentByName: row.sent_by_name ?? null,
        sentAt: row.sent_at ?? null,
    };
};

const ExpenseList = () => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const [data, setData] = useState<ExpenseRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(defaultFilters);
    const [tempFilters, setTempFilters] = useState(defaultFilters);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([
        {id: 'receipt_date', desc: true},
    ]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnMenuAnchor, setColumnMenuAnchor] =
        useState<null | HTMLElement>(null);
    const [columnSearch, setColumnSearch] = useState('');
    const [activeTab, setActiveTab] = useState<ExpenseTabKey>('all');
    const [tabCounts, setTabCounts] = useState<Record<ExpenseTabKey, number>>({
        all: 0,
        pending: 0,
        approved: 0,
        sent: 0,
        rejected: 0,
    });

    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 6));
    const [endDate, setEndDate] = useState<Date | null>(new Date());

    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);

    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [isSelectAll, setIsSelectAll] = useState(false);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(
        null,
    );
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsExpense, setDetailsExpense] = useState<ExpenseListItem | null>(
        null,
    );
    const [sendDateDialogOpen, setSendDateDialogOpen] = useState(false);
    const [sendDate, setSendDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const loadedFilterCompanyIdRef = useRef<number | null>(null);
    const openExpenseDetail = (expenseId: number) => {
        setSelectedExpenseId(expenseId);
        setDetailOpen(true);
    };

    const closeExpenseDetail = () => {
        setDetailOpen(false);
        setSelectedExpenseId(null);
    };

    const openExpenseDetailsDrawer = (expense: ExpenseListItem) => {
        setDetailsExpense(expense);
        setDetailsOpen(true);
    };

    const closeExpenseDetailsDrawer = () => {
        setDetailsOpen(false);
        setDetailsExpense(null);
    };

    useEffect(() => {
        const fetchFilterOptions = async () => {
            if (!user?.company_id) return;
            if (loadedFilterCompanyIdRef.current === Number(user.company_id)) return;

            loadedFilterCompanyIdRef.current = Number(user.company_id);
            try {
                const res = await api.get('expense/list-filters');
                const info = res.data?.info || {};
                setProjects(info.projects || []);
                setAddresses(info.addresses || []);
                setCategories(info.categories || []);
                setUsers(info.users || []);
                setTeams(info.teams || []);
                setTrades(info.trades || []);
            } catch (error) {
                loadedFilterCompanyIdRef.current = null;
                console.error('Failed to load expense filter options', error);
            }
        };

        fetchFilterOptions();
    }, [user?.company_id]);

    const columns = [
        {
            id: 'select',
            header: () => (
                <Stack direction="row" alignItems="center">
                    <CustomCheckbox
                        className="header-checkbox"
                        checked={isSelectAll || (data.length > 0 && data.every((row) => selectedRowIds.has(row.id)))}
                        indeterminate={!isSelectAll && selectedRowIds.size > 0 && selectedRowIds.size < data.length}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleSelectAll(e.target.checked);
                        }}
                    />
                </Stack>
            ),
            cell: ({row}: any) => {
                const item = row.original as ExpenseRow;
                const isChecked = isSelectAll || selectedRowIds.has(item.id);

                return (
                    <Stack direction="row" alignItems="center">
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleToggleSelect(item.id);
                            }}
                        />
                    </Stack>
                );
            },
            enableSorting: false,
            enableHiding: false,
        },

        columnHelper.accessor('date_added', {
            id: 'date_added',
            header: 'Date',
            cell: (info: any) => (
                <Typography className="f-14" sx={{px: 1.5}}>
                    {info.getValue() || '-'}
                </Typography>
            ),
        }),

        columnHelper.accessor('user_name', {
            id: 'user_name',
            header: 'Submitted By',
            cell: (info: any) => {
                const row = info.row.original as ExpenseRow;
                const name = row.user_name?.trim() || 'Unknown';

                return (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{px: 1.5}}>
                        <Avatar
                            src={row.user_thumb_image || row.user_image || undefined}
                            alt={name}
                            sx={{width: 32, height: 32, fontSize: 12, fontWeight: 600}}
                        >
                            {getInitials(name)}
                        </Avatar>
                        <Box>
                            <Typography className="f-14" fontWeight={600} lineHeight={1.3}>
                                {name}
                            </Typography>
                            <Typography sx={{fontSize: 12, color: 'text.secondary', lineHeight: 1.3}}>
                                {row.trade_name?.trim() || '—'}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
            enableSorting: false,
        }),

        columnHelper.accessor('project_name', {
            id: 'project_name',
            header: 'Project',
            cell: (info: any) => (
                <Typography className="f-14" sx={{px: 1.5}}>
                    {info.getValue() || '-'}
                </Typography>
            ),
            enableSorting: false,
        }),

        columnHelper.accessor('address_name', {
            id: 'address_name',
            header: 'Address',
            cell: (info: any) => (
                <Typography
                    className="f-14"
                    sx={{
                        px: 1.5,
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={info.getValue() || ''}
                >
                    {info.getValue() || '-'}
                </Typography>
            ),
            enableSorting: false,
        }),

        columnHelper.accessor('category_name', {
            id: 'category_name',
            header: 'Category',
            cell: (info: any) => {
                const value = info.getValue();

                return (
                    <Box sx={{px: 1.5}}>
                        {value ? (
                            <Typography
                                component="span"
                                sx={{
                                    lineHeight: 1.4,
                                    whiteSpace: "nowrap",
                                    textTransform: "capitalize",
                                }}
                            >
                                {value}
                            </Typography>
                        ) : (
                            <Typography className="f-14">-</Typography>
                        )}
                    </Box>
                );
            },
            enableSorting: false,
        }),

        columnHelper.accessor('receipt_date', {
            id: 'receipt_date',
            header: 'Receipt Date',
            cell: (info: any) => (
                <Typography className="f-14" sx={{px: 1.5}}>
                    {info.getValue() || '-'}
                </Typography>
            ),
        }),

        columnHelper.accessor('note', {
            id: 'note',
            header: 'Description',
            cell: (info: any) => (
                <Typography
                    className="f-14"
                    sx={{
                        px: 1.5,
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={info.getValue() || ''}
                >
                    {info.getValue() || '-'}
                </Typography>
            ),
            enableSorting: false,
        }),

        columnHelper.accessor('total_amount', {
            id: 'total_amount',
            header: 'Amount',
            cell: (info: any) => {
                const row = info.row.original as ExpenseRow;

                return (
                    <Typography className="f-14" fontWeight={600} sx={{px: 1.5}}>
                        {formatAmount(row.currency || '£', Number(info.getValue() || 0))}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor('attachment_count', {
            id: 'attachment_count',
            header: 'Receipt',
            cell: (info: any) => {
                const row = info.row.original as ExpenseRow;
                const count = Number(info.getValue() || 0);

                return (
                    <Box sx={{px: 1.5}}>
                        {count > 0 ? (
                            <Box
                                component="button"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openExpenseDetail(row.id);
                                }}
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    border: 'none',
                                    background: 'none',
                                    p: 0,
                                    cursor: 'pointer',
                                    color: 'primary.main',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    fontFamily: 'inherit',
                                    '&:hover': {textDecoration: 'underline'},
                                }}
                            >
                                View receipt
                                <IconExternalLink size={14}/>
                            </Box>
                        ) : (
                            <Typography className="f-14" color="text.secondary">
                                —
                            </Typography>
                        )}
                    </Box>
                );
            },
            enableSorting: false,
        }),

        columnHelper.accessor('status', {
            id: 'status',
            header: 'Status',
            cell: (info: any) => (
                <Box sx={{px: 1.5}}>
                    <ExpenseStatusBadge
                        status={normalizeExpenseStatus(info.getValue()) ?? 'pending'}
                    />
                </Box>
            ),
            enableSorting: false,
        }),

        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: (info: any) => {
                const expense = mapApiRowToListItem(info.row.original as ExpenseRow);

                return (
                    <Tooltip title="View details">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                openExpenseDetailsDrawer(expense);
                            }}
                        >
                            <IconEye size={18}/>
                        </IconButton>
                    </Tooltip>
                );
            },
            enableSorting: false,
            enableHiding: false,
        }),
    ];

    const fetchExpenses = async () => {
        if (!user?.company_id) return;
        setLoading(true);
        try {
            let url = `expense/list-web?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (startDate) {
                url += `&start_date=${format(startDate, 'dd/MM/yyyy')}`;
            }
            if (endDate) {
                url += `&end_date=${format(endDate, 'dd/MM/yyyy')}`;
            }
            if (filters.user_id) url += `&user_id=${filters.user_id}`;
            if (filters.project_id) url += `&project_id=${filters.project_id}`;
            if (filters.category_id) url += `&category_id=${filters.category_id}`;
            if (filters.trade_id) url += `&trade_id=${filters.trade_id}`;
            if (filters.team_id) url += `&team_id=${filters.team_id}`;
            if (activeTab !== 'all') url += `&status=${activeTab}`;

            if (sorting.length > 0) {
                url += `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}`;
            }

            const res = await api.get(url);
            if (res.data) {
                const responseData = Array.isArray(res.data.info) ? res.data.info : [];
                setData(responseData);

                const pagMeta = res.data.data || {};
                if (pagMeta.totalItems !== undefined) {
                    setTotalRows(pagMeta.totalItems);
                } else {
                    setTotalRows(responseData.length);
                }
                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                }

                if (res.data.status_counts) {
                    setTabCounts({
                        all: Number(res.data.status_counts.all || 0),
                        pending: Number(res.data.status_counts.pending || 0),
                        approved: Number(res.data.status_counts.approved || 0),
                        sent: Number(res.data.status_counts.sent || 0),
                        rejected: Number(res.data.status_counts.rejected || 0),
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch expenses', error);
            setData([]);
            setTotalRows(0);
            setPageCount(0);
        } finally {
            setLoading(false);
        }
    };

    const {
        table,
        pagination,
        setPagination,
        setPageCount,
        totalRows,
        setTotalRows,
    } = useServerTable({
        data,
        columns,
        fetchData: fetchExpenses,
        debounceDependencies: [
            user?.company_id,
            search,
            startDate ? format(startDate, 'yyyy-MM-dd') : '',
            endDate ? format(endDate, 'yyyy-MM-dd') : '',
            JSON.stringify(filters),
            activeTab,
        ],
        state: {sorting, columnVisibility},
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        manualSorting: true,
    });

    const listItems = useMemo(() => {
        return data.map(mapApiRowToListItem);
    }, [data]);

    const tabs: ExpenseTabItem[] = useMemo(() => {
        return [
            {key: 'all', label: 'All', count: tabCounts.all},
            {key: 'pending', label: 'Pending', count: tabCounts.pending},
            {key: 'approved', label: 'Approved', count: tabCounts.approved},
            {key: 'sent', label: 'Sent', count: tabCounts.sent},
            {key: 'rejected', label: 'Rejected', count: tabCounts.rejected},
        ];
    }, [tabCounts]);

    const selectedCount = isSelectAll
        ? listItems.length
        : selectedRowIds.size;

    const selectedTotal = useMemo(() => {
        if (isSelectAll) {
            return listItems.reduce((sum, item) => sum + item.amount, 0);
        }
        return listItems
            .filter((item) => selectedRowIds.has(item.id))
            .reduce((sum, item) => sum + item.amount, 0);
    }, [isSelectAll, listItems, selectedRowIds]);

    const selectedCurrency =
        listItems.find((item) => selectedRowIds.has(item.id))?.currency ||
        listItems[0]?.currency ||
        '£';

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleDateRangeChange = (range: {
        from: Date | null;
        to: Date | null;
    }) => {
        setStartDate(range.from);
        setEndDate(range.to);
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const handleClearAppliedFilters = (event: React.MouseEvent) => {
        event.stopPropagation();
        setTempFilters(defaultFilters);
        setFilters(defaultFilters);
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const handleToggleSelect = (id: number) => {
        if (isSelectAll) {
            setIsSelectAll(false);
            const next = new Set(listItems.map((r) => r.id));
            next.delete(id);
            setSelectedRowIds(next);
            return;
        }
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setIsSelectAll(checked);
        setSelectedRowIds(new Set());
    };

    const handleTabChange = (tab: ExpenseTabKey) => {
        setActiveTab(tab);
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const getActionExpenseIds = () => {
        if (isSelectAll) return listItems.map((item) => item.id);
        return Array.from(selectedRowIds);
    };

    const getApprovedActionExpenseIds = () => {
        const selectedIds = getActionExpenseIds();
        const selectedIdSet = new Set(selectedIds);
        return listItems
            .filter((item) => selectedIdSet.has(item.id) && item.status === 'approved')
            .map((item) => item.id);
    };

    const refreshAfterAction = async () => {
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
        closeExpenseDetailsDrawer();
        await fetchExpenses();
    };

    const handleApproveExpenses = async (ids: number[]) => {
        if (ids.length === 0) {
            toast.error('Please select at least one expense');
            return;
        }

        try {
            const res = await api.post('expense/approve', {ids});
            toast.success(res.data?.message || 'Expense approved successfully');
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to approve expense');
        }
    };

    const handleRejectExpenses = async (ids: number[]) => {
        if (ids.length === 0) {
            toast.error('Please select at least one expense');
            return;
        }

        try {
            const res = await api.post('expense/reject', {ids});
            toast.success(res.data?.message || 'Expense rejected successfully');
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reject expense');
        }
    };

    const openDeleteDialog = () => {
        const ids = getActionExpenseIds();
        if (ids.length === 0) {
            toast.error('Please select at least one expense');
            return;
        }
        setDeleteDialogOpen(true);
    };

    const handleDeleteExpenses = async () => {
        const ids = getActionExpenseIds();
        if (ids.length === 0) {
            toast.error('Please select at least one expense');
            setDeleteDialogOpen(false);
            return;
        }

        setIsDeleting(true);
        try {
            const res = await api.post('/expense/bulk-delete', {ids});
            if (res.data?.IsSuccess === false) {
                toast.error(res.data?.message || 'Failed to delete expenses');
                return;
            }

            toast.success(res.data?.message || 'Expense deleted successfully');
            setDeleteDialogOpen(false);
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'An error occurred while deleting expenses',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const openSendDateDialog = () => {
        const ids = getActionExpenseIds();
        if (ids.length === 0) {
            toast.error('Please select at least one expense');
            return;
        }
        setSendDate(format(new Date(), 'yyyy-MM-dd'));
        setSendDateDialogOpen(true);
    };

    const handleSendToBookkeeper = async () => {
        const ids = getApprovedActionExpenseIds();
        if (ids.length === 0) {
            toast.error('Please select at least one approved expense');
            return;
        }

        try {
            const res = await api.post('expense/send-to-bookkeeper', {
                ids,
                send_date: sendDate,
            });
            toast.success(res.data?.message || 'Expense sent to bookkeeper successfully');
            setSendDateDialogOpen(false);
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to send expenses to bookkeeper',
            );
        }
    };

    const parseBlobError = async (blob: Blob) => {
        try {
            const text = await blob.text();
            const json = JSON.parse(text);
            const message = json?.message ?? json?.Message;
            if (Array.isArray(message)) return message.join(', ');
            if (typeof message === 'string' && message.trim()) return message;
            return 'Failed to download attachments';
        } catch {
            return 'Failed to download attachments';
        }
    };

    const handleDownloadAttachments = async () => {
        if (!isSelectAll && selectedRowIds.size === 0) {
            toast.error('Please select at least one expense');
            return;
        }

        try {
            const payload: Record<string, any> = {
                select_all: isSelectAll,
            };

            if (isSelectAll) {
                if (search) payload.search = search;
                if (startDate) payload.start_date = format(startDate, 'dd/MM/yyyy');
                if (endDate) payload.end_date = format(endDate, 'dd/MM/yyyy');
                if (filters.user_id) payload.user_id = filters.user_id;
                if (filters.project_id) payload.project_id = filters.project_id;
                if (filters.category_id) payload.category_id = filters.category_id;
                if (filters.trade_id) payload.trade_id = filters.trade_id;
                if (filters.team_id) payload.team_id = filters.team_id;
                if (activeTab !== 'all') payload.status = activeTab;
            } else {
                payload.ids = Array.from(selectedRowIds);
            }

            const response = await api.post(
                'expense/download-attachments-zip',
                payload,
                {responseType: 'blob'},
            );

            const contentType = String(
                response.headers?.['content-type'] || '',
            ).toLowerCase();
            if (contentType.includes('application/json')) {
                toast.error(await parseBlobError(response.data));
                return;
            }

            const blob = new Blob([response.data], {type: 'application/zip'});
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'expense-attachments.zip');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            const blob = error?.response?.data;
            if (blob instanceof Blob) {
                toast.error(await parseBlobError(blob));
            } else {
                toast.error(
                    error?.response?.data?.message || 'Failed to download attachments',
                );
            }
        }
    };

    const getUserLabel = (option: any) => {
        if (!option) return '';
        if (option.name) return option.name;
        return `${option.first_name || ''} ${option.last_name || ''}`.trim();
    };

    const renderUserOption = (props: React.HTMLAttributes<HTMLLIElement>, option: any) => (
        <Box component="li" {...props} key={option.id}>
            <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
                <Avatar
                    src={option.user_thumb_image || option.user_image || undefined}
                    alt={getUserLabel(option)}
                    sx={{width: 32, height: 32, fontSize: 14}}
                >
                    {getInitials(getUserLabel(option))}
                </Avatar>
                <Typography
                    component="span"
                    className="f-14"
                    sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {getUserLabel(option)}
                </Typography>
            </Stack>
        </Box>
    );

    const columnToggles = table
        .getAllLeafColumns()
        .filter((column) => column.id !== 'select')
        .map((column) => ({
            id: column.id,
            label: COLUMN_LABELS[column.id] || column.id,
            visible: column.getIsVisible(),
            toggleVisibility: column.toggleVisibility,
        }));

    const filteredColumnToggles = columnToggles.filter((column) =>
        column.label.toLowerCase().includes(columnSearch.trim().toLowerCase()),
    );

    const allColumnsSelected =
        filteredColumnToggles.length > 0 &&
        filteredColumnToggles.every((column) => column.visible);

    const someColumnsSelected = filteredColumnToggles.some(
        (column) => column.visible,
    );

    const visibleColCount = table.getVisibleLeafColumns().length || columns.length;

    const simpleColumns = table.getVisibleLeafColumns().map((column) => ({
        name: column.id ?? 'Unnamed Column',
        width: 'auto',
    }));

    return (
        <Box
            sx={{
                height: 'calc(100vh - 100px)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <Stack
                    mr={2}
                    ml={2}
                    mb={1}
                    mt={1}
                    justifyContent="space-between"
                    direction={{xs: 'column', sm: 'row'}}
                    spacing={{xs: 1, sm: 2, md: 4}}
                    alignItems={{sm: 'center'}}
                >
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <DateRangePickerBox
                            from={startDate}
                            to={endDate}
                            onChange={handleDateRangeChange}
                        />
                        <TextField
                            size="small"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{width: {xs: '100%', sm: 180}}}
                        />
                        
                        <Button
                            color="primary"
                            variant="contained"
                            size="small"
                            onClick={() => {
                                setTempFilters(filters);
                                setFilterOpen(true);
                            }}
                            sx={{
                                minHeight: 34,
                                height: 34,
                                whiteSpace: 'nowrap',
                                textTransform: 'none',
                                fontWeight: 600,
                                minWidth: 64,
                                px: 1.5,
                            }}
                            aria-label="Open filters"
                        >
                            <IconFilter size={18}/>
                        </Button>

                        {activeFilterCount > 0 && (
                            <Button
                                color="error"
                                variant="outlined"
                                size="small"
                                onClick={handleClearAppliedFilters}
                                sx={{
                                    minHeight: 34,
                                    height: 34,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    minWidth: 64,
                                    px: 1.5,
                                }}
                                aria-label="Clear filters"
                            >
                                <IconX size={18}/>
                            </Button>
                        )}
                    </Box>

                    <Box display="flex" justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Column visibility">
                            <IconButton
                                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                                color="primary"
                                size="small"
                            >
                                <IconEye size={20}/>
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Stack>

                <Popover
                    open={Boolean(columnMenuAnchor)}
                    anchorEl={columnMenuAnchor}
                    onClose={() => {
                        setColumnMenuAnchor(null);
                        setColumnSearch('');
                    }}
                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                    transformOrigin={{vertical: 'top', horizontal: 'right'}}
                    PaperProps={{
                        sx: {
                            p: 1.25,
                            width: 280,
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
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
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
                            <FormControlLabel
                                control={
                                    <CustomCheckbox
                                        size="small"
                                        checked={allColumnsSelected}
                                        indeterminate={!allColumnsSelected && someColumnsSelected}
                                        disabled={filteredColumnToggles.length === 0}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            filteredColumnToggles.forEach((column) => {
                                                column.toggleVisibility(e.target.checked);
                                            });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{p: 0.5, mr: 1}}
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
                                    '&:hover': {backgroundColor: '#f8fafc'},
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
                            {filteredColumnToggles.map((column) => (
                                <FormControlLabel
                                    key={column.id}
                                    control={
                                        <CustomCheckbox
                                            size="small"
                                            checked={column.visible}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                column.toggleVisibility(!column.visible);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{p: 0.5, mr: 1}}
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
                                        '&:hover': {backgroundColor: '#f8fafc'},
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '14px',
                                            lineHeight: 1.35,
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    label={column.label}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                <Box sx={{mx: 2, borderBottom: '1px solid', borderColor: 'divider'}}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, value: ExpenseTabKey) => handleTabChange(value)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 42,
                            '& .MuiTabs-indicator': {height: 2, bgcolor: 'primary.main'},
                            '& .MuiTab-root': {
                                minHeight: 42,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: 14,
                                color: 'text.secondary',
                                px: 1.5,
                                mr: 0.5,
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                    fontWeight: 600,
                                },
                            },
                        }}
                    >
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.key}
                                value={tab.key}
                                label={`${tab.label} (${tab.count})`}
                                disableRipple
                            />
                        ))}
                    </Tabs>
                </Box>

                <TableContainer
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'auto',
                        overflowY: 'auto',
                    }}
                >
                    <Table stickyHeader aria-label="expenses sticky table">
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isActive = header.column.getIsSorted();
                                        const isAsc = isActive === 'asc';
                                        const isSortable = header.column.getCanSort();

                                        return (
                                            <TableCell
                                                key={header.id}
                                                align={header.column.id === 'actions' ? 'right' : 'left'}
                                                padding={header.column.id === 'select' ? 'checkbox' : 'normal'}
                                                sx={{
                                                    paddingTop: '10px',
                                                    paddingBottom: '10px',
                                                    whiteSpace: 'nowrap',
                                                    bgcolor: 'background.paper',
                                                }}
                                            >
                                                <Box
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    sx={{
                                                        cursor: isSortable ? 'pointer' : 'default',
                                                        border: '2px solid transparent',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            header.column.id === 'actions' ? 'flex-end' : 'flex-start',
                                                        '&:hover': isSortable ? {color: '#888'} : undefined,
                                                        '&:hover .hoverIcon': {opacity: 1},
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
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
                                <SkeletonLoader columns={simpleColumns} rowCount={8}/>
                            ) : table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColCount}>
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
                                                style={{maxWidth: '100%', maxHeight: '100%'}}
                                                width={200}
                                                height={200}
                                            />
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        hover
                                        selected={isSelectAll || selectedRowIds.has(row.original.id)}
                                        key={row.id}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                align={cell.column.id === 'actions' ? 'right' : 'left'}
                                                padding={cell.column.id === 'select' ? 'checkbox' : 'normal'}
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

            <TablePaginationFooter
                table={table}
                totalRows={totalRows}
                selectedCount={selectedCount}
            />

            {selectedCount > 0 && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        px: 3,
                        py: 1.5,
                        zIndex: 1000,
                        minWidth: 'fit-content',
                        width: 'max-content',
                        maxWidth: 'calc(100vw - 32px)',
                        border: '1px solid #e0e0e0',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{flexWrap: 'nowrap', whiteSpace: 'nowrap'}}
                    >
                        <IconButton
                            size="small"
                            onClick={() => {
                                setIsSelectAll(false);
                                setSelectedRowIds(new Set());
                            }}
                            sx={{
                                color: '#666',
                                '&:hover': {bgcolor: 'grey.100'},
                                flexShrink: 0,
                            }}
                        >
                            <IconX size={16}/>
                        </IconButton>

                        <Box sx={{flexShrink: 0}}>
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                {selectedCount} Selected
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {isSelectAll
                                    ? `${selectedCurrency}${selectedTotal.toFixed(2)} (this page)`
                                    : `${selectedCurrency}${selectedTotal.toFixed(2)}`}
                            </Typography>
                        </Box>

                        <Box sx={{flexGrow: 1, minWidth: 16}}/>

                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{flexWrap: 'nowrap', flexShrink: 0}}
                        >
                            <Button
                                startIcon={<IconCheck size={15}/>}
                                variant="outlined"
                                color="success"
                                size="small"
                                onClick={() => handleApproveExpenses(getActionExpenseIds())}
                                sx={BULK_BUTTON_SX}
                            >
                                Approve Selected
                            </Button>

                            <Button
                                startIcon={<IconX size={15}/>}
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleRejectExpenses(getActionExpenseIds())}
                                sx={BULK_BUTTON_SX}
                            >
                                Reject Selected
                            </Button>

                            <Button
                                startIcon={<IconSend size={15}/>}
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={openSendDateDialog}
                                sx={{
                                    ...BULK_BUTTON_SX,
                                    boxShadow: 'none',
                                    '&:hover': {boxShadow: 'none'},
                                }}
                            >
                                Send to Bookkeeper
                            </Button>

                            {/*<Button*/}
                            {/*    size="small"*/}
                            {/*    variant="outlined"*/}
                            {/*    color="primary"*/}
                            {/*    onClick={handleDownloadAttachments}*/}
                            {/*    endIcon={<IconChevronDown size={18}/>}*/}
                            {/*    sx={BULK_BUTTON_SX}*/}
                            {/*>*/}
                            {/*    Export Selected*/}
                            {/*</Button>*/}

                            <Button
                                startIcon={<IconTrash size={15}/>}
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={openDeleteDialog}
                                disabled={isDeleting}
                                sx={BULK_BUTTON_SX}
                            >
                                {isDeleting ? 'Deleting…' : 'Delete Selected'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}

            <Dialog
                open={sendDateDialogOpen}
                onClose={() => setSendDateDialogOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{m: 0, position: 'relative'}}>
                    Send to Bookkeeper
                    <IconButton
                        aria-label="close"
                        onClick={() => setSendDateDialogOpen(false)}
                        sx={{position: 'absolute', right: 12, top: 8}}
                    >
                        <IconX size={24}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <TextField
                            label="Timesheet Date"
                            type="date"
                            fullWidth
                            value={sendDate}
                            onChange={(event) => setSendDate(event.target.value)}
                            InputLabelProps={{shrink: true}}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setSendDateDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSendToBookkeeper}
                        disabled={!sendDate}
                    >
                        Send
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => !isDeleting && setDeleteDialogOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{m: 0, position: 'relative'}}>
                    Confirm Deletion
                    <IconButton
                        aria-label="close"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={isDeleting}
                        sx={{position: 'absolute', right: 12, top: 8}}
                    >
                        <IconX size={24}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selectedCount} selected
                        expense{selectedCount === 1 ? '' : 's'}? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteExpenses}
                        disabled={isDeleting}
                    >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{m: 0, position: 'relative'}}>
                    Filters
                    <IconButton
                        aria-label="close"
                        onClick={() => setFilterOpen(false)}
                        sx={{position: 'absolute', right: 12, top: 8}}
                    >
                        <IconX size={24}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Autocomplete
                            options={users}
                            getOptionLabel={getUserLabel}
                            getOptionKey={(option) => String(option.id)}
                            renderOption={renderUserOption}
                            isOptionEqualToValue={(option, value) =>
                                String(option.id) === String(value?.id)
                            }
                            value={
                                users.find((u) => String(u.id) === String(tempFilters.user_id)) ||
                                null
                            }
                            onChange={(_, value) =>
                                setTempFilters({
                                    ...tempFilters,
                                    user_id: value ? value.id : '',
                                })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="User" fullWidth/>
                            )}
                        />
                        <Autocomplete
                            options={projects}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) =>
                                String(option.id) === String(value?.id)
                            }
                            value={
                                projects.find(
                                    (p) => String(p.id) === String(tempFilters.project_id),
                                ) || null
                            }
                            onChange={(_, value) =>
                                setTempFilters({
                                    ...tempFilters,
                                    project_id: value ? value.id : '',
                                })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Project" fullWidth/>
                            )}
                        />
                        <Autocomplete
                            options={categories}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) =>
                                String(option.id) === String(value?.id)
                            }
                            value={
                                categories.find(
                                    (c) => String(c.id) === String(tempFilters.category_id),
                                ) || null
                            }
                            onChange={(_, value) =>
                                setTempFilters({
                                    ...tempFilters,
                                    category_id: value ? value.id : '',
                                })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Category" fullWidth/>
                            )}
                        />
                        <Autocomplete
                            options={trades}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) =>
                                String(option.id) === String(value?.id)
                            }
                            value={
                                trades.find(
                                    (t) => String(t.id) === String(tempFilters.trade_id),
                                ) || null
                            }
                            onChange={(_, value) =>
                                setTempFilters({
                                    ...tempFilters,
                                    trade_id: value ? value.id : '',
                                })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Trade" fullWidth/>
                            )}
                        />
                        <Autocomplete
                            options={teams}
                            getOptionLabel={(option) => option.title || option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) =>
                                String(option.id) === String(value?.id)
                            }
                            value={
                                teams.find((t) => String(t.id) === String(tempFilters.team_id)) ||
                                null
                            }
                            onChange={(_, value) =>
                                setTempFilters({
                                    ...tempFilters,
                                    team_id: value ? value.id : '',
                                })
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="Team" fullWidth/>
                            )}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={() => {
                            setTempFilters(defaultFilters);
                            setFilters(defaultFilters);
                            setFilterOpen(false);
                            setPagination((prev: any) => ({...prev, pageIndex: 0}));
                        }}
                    >
                        Clear
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilters(tempFilters);
                            setFilterOpen(false);
                            setPagination((prev: any) => ({...prev, pageIndex: 0}));
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            <ExpenseDetailsDrawer
                open={detailsOpen}
                onClose={closeExpenseDetailsDrawer}
                expense={detailsExpense}
                onViewReceipt={openExpenseDetail}
                onApprove={(id) => handleApproveExpenses([id])}
                onReject={(id) => handleRejectExpenses([id])}
                projects={projects}
                addresses={addresses}
                categories={categories}
                onSaved={refreshAfterAction}
            />

            <Drawer
                anchor="right"
                open={detailOpen}
                onClose={closeExpenseDetail}
                sx={{
                    width: 520,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: {xs: '100%', sm: 520},
                        maxWidth: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#fff',
                    },
                }}
            >
                {selectedExpenseId ? (
                    <Expenses
                        expenseId={selectedExpenseId}
                        attachmentsOnly
                        onClose={() => {
                            closeExpenseDetail();
                            fetchExpenses();
                        }}
                    />
                ) : null}
            </Drawer>
        </Box>
    );
};

export default ExpenseList;
