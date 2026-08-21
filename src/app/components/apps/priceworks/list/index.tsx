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
    Tab,
    Tabs,
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
import PriceworkStatusBadge from './components/PriceworkStatusBadge';
import PriceworkDetailsDrawer from './components/PriceworkDetailsDrawer';
import PriceworkAttachmentsDrawer from './components/PriceworkAttachmentsDrawer';
import AddPricework from '@/app/components/apps/time-clock/time-clock-details/pricework/add-pricework';
import {
    PriceworkApiRow,
    PriceworkTabItem,
    PriceworkTabKey,
    normalizePriceworkStatus,
} from './types';

type PriceworkRow = PriceworkApiRow;

const columnHelper = createColumnHelper<PriceworkRow>();

const COLUMN_LABELS: Record<string, string> = {
    user_name: 'User',
    project_name: 'Project',
    address_name: 'Address',
    team_name: 'Team',
    work_type: 'Work Type',
    pricework_date: 'Pricework Date',
    category_name: 'Category',
    sub_category_name: 'Sub Category',
    unit_name: 'Unit',
    amount_per_unit: 'Amount Per Unit',
    work_complete: 'Work Complete',
    pricework_amount: 'Pricework Amount',
    note: 'Note',
    attachment_count: 'Attachments',
    status: 'Status',
    actions: 'Actions',
};

const defaultFilters = {
    user_id: '' as string | number,
    project_id: '' as string | number,
    address_id: '' as string | number,
    trade_id: '' as string | number,
    team_id: '' as string | number,
};

const formatAmount = (currency: string | null | undefined, amount: number | string | null | undefined) =>
    `${currency || '£'}${Number(amount || 0).toFixed(2)}`;

const BULK_BUTTON_SX = {
    px: 2.5,
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: '8px',
};

const isStandalonePriceworkRow = (row: PriceworkRow) => row.record_type !== 'timesheet_light';

const isActionableTimesheetLightRow = (row: PriceworkRow) =>
    row.record_type === 'timesheet_light' && Boolean(row.timesheet_light_id);

const isOrphanedTimesheetLightRow = (row: PriceworkRow) =>
    row.record_type === 'timesheet_light' && !row.timesheet_light_id;

const getPriceworkRowKey = (row: PriceworkRow) => {
    if (row.record_type === 'timesheet_light') {
        return `timesheet_light:${row.timesheet_light_id ?? row.id}:checklog:${row.user_checklog_id ?? row.user_worklog_id ?? 'summary'}`;
    }

    return `pricework:${row.pricework_id ?? row.id}`;
};

const PriceworkList = () => {
    const {data: session} = useSession();
    const user = session?.user as User | undefined;

    const [data, setData] = useState<PriceworkRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(defaultFilters);
    const [tempFilters, setTempFilters] = useState(defaultFilters);
    const [filterOpen, setFilterOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 6));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [sorting, setSorting] = useState<SortingState>([
        {id: 'pricework_date', desc: true},
    ]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        Object.fromEntries(Object.keys(COLUMN_LABELS).map((id) => [id, true])),
    );
    const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
    const [columnSearch, setColumnSearch] = useState('');
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [activeTab, setActiveTab] = useState<PriceworkTabKey>('all');
    const [tabCounts, setTabCounts] = useState({
        all: 0,
        pending: 0,
        approved: 0,
        sent: 0,
        rejected: 0,
    });
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsPricework, setDetailsPricework] = useState<PriceworkRow | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editPricework, setEditPricework] = useState<any>(null);
    const [attachmentsOpen, setAttachmentsOpen] = useState(false);
    const [attachmentsPricework, setAttachmentsPricework] = useState<PriceworkRow | null>(null);
    const [sendDateDialogOpen, setSendDateDialogOpen] = useState(false);
    const [sendDate, setSendDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectPriceworkIds, setRejectPriceworkIds] = useState<number[]>([]);
    const [rejectTimesheetLightIds, setRejectTimesheetLightIds] = useState<number[]>([]);
    const [rejectNote, setRejectNote] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const loadedFilterCompanyIdRef = useRef<number | null>(null);

    const clearSelection = () => {
        setIsSelectAll(false);
        setSelectedRowIds(new Set());
    };

    const handleTabChange = (tab: PriceworkTabKey) => {
        setActiveTab(tab);
        clearSelection();
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const openPriceworkDetails = (row: PriceworkRow) => {
        setDetailsPricework(row);
        setDetailsOpen(true);
    };

    const closePriceworkDetails = () => {
        setDetailsOpen(false);
        setDetailsPricework(null);
    };

    const openEditPricework = (pricework: any) => {
        if (!pricework?.id) return;
        setEditPricework({
            ...pricework,
            pricework_id: pricework.pricework_id ?? pricework.id,
        });
        setDetailsOpen(false);
        setEditOpen(true);
    };

    const closeEditPricework = async () => {
        setEditOpen(false);
        setEditPricework(null);
    };

    const refreshAfterEditPricework = async () => {
        await fetchPriceworks();
    };

    const openPriceworkAttachments = (pricework: PriceworkRow) => {
        setAttachmentsPricework(pricework);
        setAttachmentsOpen(true);
    };

    const closePriceworkAttachments = () => {
        setAttachmentsOpen(false);
        setAttachmentsPricework(null);
    };

    useEffect(() => {
        const fetchFilterOptions = async () => {
            if (!user?.company_id) return;
            if (loadedFilterCompanyIdRef.current === Number(user.company_id)) return;

            loadedFilterCompanyIdRef.current = Number(user.company_id);
            try {
                const res = await api.get('pricework/list-filters');
                const info = res.data?.info || {};
                setProjects(info.projects || []);
                setAddresses(info.addresses || []);
                setUsers(info.users || []);
                setTeams(info.teams || []);
                setTrades(info.trades || []);
            } catch (error) {
                loadedFilterCompanyIdRef.current = null;
                console.error('Failed to load pricework filter options', error);
            }
        };

        fetchFilterOptions();
    }, [user?.company_id]);

    const handleToggleSelect = (row: PriceworkRow) => {
        const rowKey = getPriceworkRowKey(row);

        if (isSelectAll) {
            setIsSelectAll(false);
            const next = new Set(data.map(getPriceworkRowKey));
            next.delete(rowKey);
            setSelectedRowIds(next);
            return;
        }
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setIsSelectAll(checked);
        setSelectedRowIds(new Set());
    };

    const selectedCount = isSelectAll ? data.length : selectedRowIds.size;

    const selectedTotal = useMemo(() => {
        if (isSelectAll) {
            return data.reduce((sum, item) => sum + Number(item.pricework_amount || 0), 0);
        }
        return data
            .filter((item) => selectedRowIds.has(getPriceworkRowKey(item)))
            .reduce((sum, item) => sum + Number(item.pricework_amount || 0), 0);
    }, [data, isSelectAll, selectedRowIds]);

    const selectedCurrency = data.find((item) => selectedRowIds.has(getPriceworkRowKey(item)))?.currency || data[0]?.currency || '£';
    
    const getSelectedRows = (): PriceworkRow[] => {
        if (isSelectAll) return data;
        return data.filter((item) => selectedRowIds.has(getPriceworkRowKey(item)));
    };

    const getActionPriceworkIds = () => getSelectedRows().filter(isStandalonePriceworkRow).map((item) => item.id);

    const getActionTimesheetLightIds = () => {
        const selectedRows = getSelectedRows();
        
        const orphanedRows = selectedRows.filter(isOrphanedTimesheetLightRow);
        if (orphanedRows.length > 0) {
            console.warn(
                '[Pricework] Selected timesheet_light row(s) missing timesheet_light_id — they will be skipped from bulk actions:',
                orphanedRows,
            );
        }

        return [...new Set(selectedRows
            .filter(isActionableTimesheetLightRow)
            .map((item) => Number(item.timesheet_light_id)))];
    };
    
    const hasOnlyUnactionableSelection = () => {
        const selectedRows = getSelectedRows();

        if (selectedRows.length === 0) return false;
        const actionableCount = selectedRows.filter(
            (item) => isStandalonePriceworkRow(item) || isActionableTimesheetLightRow(item),
        ).length;

        return actionableCount === 0;
    };

    const guardEmptySelection = (ids: number[], timesheetLightIds: number[]) => {
        if (ids.length > 0 || timesheetLightIds.length > 0) return true;

        if (hasOnlyUnactionableSelection()) {
            toast.error('Selected record is missing data required to perform this action. Please refresh and try again.');
        } else {
            toast.error('Please select at least one pricework');
        }
        return false;
    };

    const getApprovedActionPriceworkIds = () => {
        const selectedIds = getActionPriceworkIds();
        const selectedIdSet = new Set(selectedIds);
        return data
            .filter((item) => selectedIdSet.has(item.id) && isStandalonePriceworkRow(item) && normalizePriceworkStatus(item.status) === 'approved')
            .map((item) => item.id);
    };

    const getApprovedActionTimesheetLightIds = () =>
        getSelectedRows()
            .filter((item) => isActionableTimesheetLightRow(item) && normalizePriceworkStatus(item.status) === 'approved')
            .map((item) => Number(item.timesheet_light_id));

    const refreshAfterAction = async () => {
        clearSelection();
        closePriceworkDetails();
        await fetchPriceworks();
    };

    const handleApprovePriceworks = async (ids: number[], timesheetLightIds: number[] = []) => {
        if (!guardEmptySelection(ids, timesheetLightIds)) return;

        try {
            const res = await api.post('pricework/approve', {ids, timesheet_light_ids: timesheetLightIds});
            toast.success(res.data?.message || 'Pricework approved successfully');
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to approve pricework');
        }
    };

    const handleRejectPriceworks = async (ids: number[], timesheetLightIds: number[] = [], note?: string) => {
        if (!guardEmptySelection(ids, timesheetLightIds)) return;

        setIsRejecting(true);
        try {
            const res = await api.post('pricework/reject', {
                ids,
                timesheet_light_ids: timesheetLightIds,
                reject_note: note,
            });
            toast.success(res.data?.message || 'Pricework rejected successfully');
            setRejectDialogOpen(false);
            setRejectPriceworkIds([]);
            setRejectTimesheetLightIds([]);
            setRejectNote('');
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reject pricework');
        } finally {
            setIsRejecting(false);
        }
    };

    const openRejectDialog = (ids: number[], timesheetLightIds: number[] = []) => {
        if (ids.length === 0 && timesheetLightIds.length === 0) {
            toast.error('Please select at least one pricework');
            return;
        }
        setRejectPriceworkIds(ids);
        setRejectTimesheetLightIds(timesheetLightIds);
        setRejectNote('');
        setRejectDialogOpen(true);
    };

    const closeRejectDialog = () => {
        if (isRejecting) return;
        setRejectDialogOpen(false);
        setRejectPriceworkIds([]);
        setRejectTimesheetLightIds([]);
        setRejectNote('');
    };

    const confirmRejectPriceworks = () => {
        void handleRejectPriceworks(rejectPriceworkIds, rejectTimesheetLightIds, rejectNote);
    };

    const openSendDateDialog = () => {
        const ids = getApprovedActionPriceworkIds();
        const timesheetLightIds = getApprovedActionTimesheetLightIds();
        if (ids.length === 0 && timesheetLightIds.length === 0) {
            toast.error('Please select at least one approved pricework');
            return;
        }
        setSendDate(format(new Date(), 'yyyy-MM-dd'));
        setSendDateDialogOpen(true);
    };

    const handleSendToBookkeeper = async () => {
        const ids = getApprovedActionPriceworkIds();
        const timesheetLightIds = getApprovedActionTimesheetLightIds();
        if (ids.length === 0 && timesheetLightIds.length === 0) {
            toast.error('Please select at least one approved pricework');
            return;
        }

        try {
            const res = await api.post('pricework/send-to-bookkeeper', {
                ids,
                timesheet_light_ids: timesheetLightIds,
                send_date: sendDate,
            });
            toast.success(res.data?.message || 'Pricework sent to bookkeeper successfully');
            setSendDateDialogOpen(false);
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to send priceworks to bookkeeper');
        }
    };

    const openDeleteDialog = () => {
        const ids = getActionPriceworkIds();
        const timesheetLightIds = getActionTimesheetLightIds();
        if (!guardEmptySelection(ids, timesheetLightIds)) return;
        setDeleteDialogOpen(true);
    };

    const handleDeletePriceworks = async () => {
        const ids = getActionPriceworkIds();
        if (ids.length === 0) {
            toast.error(
                hasOnlyUnactionableSelection()
                    ? 'Selected record is missing data required to perform this action. Please refresh and try again.'
                    : 'Please select at least one pricework',
            );
            setDeleteDialogOpen(false);
            return;
        }

        setIsDeleting(true);
        try {
            const res = await api.post('pricework/bulk-delete', {ids});
            if (res.data?.IsSuccess === false) {
                toast.error(res.data?.message || 'Failed to delete priceworks');
                return;
            }

            toast.success(res.data?.message || 'Pricework deleted successfully');
            setDeleteDialogOpen(false);
            await refreshAfterAction();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'An error occurred while deleting priceworks');
        } finally {
            setIsDeleting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                id: 'select',
                header: () => (
                    <Stack direction="row" alignItems="center">
                        <CustomCheckbox
                            className="header-checkbox"
                            checked={
                                isSelectAll ||
                                (data.length > 0 && data.every((row) => selectedRowIds.has(getPriceworkRowKey(row))))
                            }
                            indeterminate={
                                !isSelectAll &&
                                selectedRowIds.size > 0 &&
                                selectedRowIds.size < data.length
                            }
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleToggleSelectAll(e.target.checked);
                            }}
                        />
                    </Stack>
                ),
                cell: ({row}: {row: {original: PriceworkRow}}) => {
                    const item = row.original;
                    const isChecked = isSelectAll || selectedRowIds.has(getPriceworkRowKey(item));
                    return (
                        <Stack direction="row" alignItems="center">
                            <CustomCheckbox
                                checked={isChecked}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleToggleSelect(item);
                                }}
                            />
                        </Stack>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
            columnHelper.accessor('user_name', {
                id: 'user_name',
                header: () => 'User',
                cell: (info) => {
                    const row = info.row.original;
                    const name = row.user_name?.trim() || 'Unknown';
                    const role = row.trade_name?.trim() || '—';

                    return (
                        <Stack direction="row" alignItems="center" spacing={4} sx={{px: 1.5}}>
                            <Avatar
                                src={row.user_thumb_image || '/images/users/user.png'}
                                alt={name}
                                sx={{width: 36, height: 36}}
                                imgProps={{
                                    onError: (e) => {
                                        const target = e.currentTarget;
                                        if (target.src.includes('/images/users/user.png')) return;
                                        target.src = '/images/users/user.png';
                                    },
                                }}
                            />
                            <Box>
                                <Typography
                                    className="f-14"
                                    color="textPrimary"
                                    sx={{width: 150}}
                                >
                                    {name}
                                </Typography>
                                <Typography
                                    color="textSecondary"
                                    variant="subtitle1"
                                    width={150}
                                    noWrap
                                >
                                    {role}
                                </Typography>
                            </Box>
                        </Stack>
                    );
                },
                enableSorting: false,
            }),
            columnHelper.accessor('project_name', {
                id: 'project_name',
                header: () => 'Project',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('address_name', {
                id: 'address_name',
                header: () => 'Address',
                cell: (info) => (
                    <Typography
                        className="f-14"
                        sx={{
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={info.getValue() || undefined}
                    >
                        {info.getValue() || '—'}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('team_name', {
                id: 'team_name',
                header: () => 'Team',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('work_type', {
                id: 'work_type',
                header: () => 'Work Type',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('pricework_date', {
                id: 'pricework_date',
                header: () => 'Pricework Date',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('category_name', {
                id: 'category_name',
                header: () => 'Category',
                cell: (info) => (
                    <Tooltip title={info.getValue() || ''}>
                        <Typography
                            className="f-14"
                            sx={{
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {info.getValue() || '—'}
                        </Typography>
                    </Tooltip>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('sub_category_name', {
                id: 'sub_category_name',
                header: () => 'Sub Category',
                cell: (info) => (
                    <Tooltip title={info.getValue() || ''}>
                        <Typography
                            className="f-14"
                            sx={{
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {info.getValue() || '—'}
                        </Typography>
                    </Tooltip>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('unit_name', {
                id: 'unit_name',
                header: () => 'Unit',
                cell: (info) => (
                    <Typography className="f-14">{info.getValue() || '—'}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('amount_per_unit', {
                id: 'amount_per_unit',
                header: () => 'Amount Per Unit',
                cell: (info) => (
                    <Typography className="f-14">
                        {formatAmount(info.row.original.currency, info.getValue())}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('work_complete', {
                id: 'work_complete',
                header: () => 'Work Complete',
                cell: (info) => (
                    <Typography className="f-14">{Number(info.getValue() || 0)}</Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('pricework_amount', {
                id: 'pricework_amount',
                header: () => 'Pricework Amount',
                cell: (info) => (
                    <Typography className="f-14" fontWeight={600}>
                        {formatAmount(info.row.original.currency, info.getValue())}
                    </Typography>
                ),
                enableSorting: true,
            }),
            columnHelper.accessor('note', {
                id: 'note',
                header: () => 'Note',
                cell: (info) => (
                    <Typography
                        className="f-14"
                        sx={{
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                        title={info.getValue() || undefined}
                    >
                        {info.getValue() || '—'}
                    </Typography>
                ),
                enableSorting: false,
            }),
            columnHelper.accessor('attachment_count', {
                id: 'attachment_count',
                header: () => 'Attachments',
                cell: (info) => {
                    const count = Number(info.getValue() || 0);
                    const row = info.row.original;
                    return count > 0 ? (
                        <Typography
                            className="f-14"
                            sx={{
                                color: 'primary.main',
                                fontWeight: 500,
                                cursor: 'pointer',
                                '&:hover': {textDecoration: 'underline'},
                            }}
                            onClick={() => openPriceworkAttachments(row)}
                        >
                            View ({count})
                        </Typography>
                    ) : (
                        <Typography className="f-14" color="text.secondary">
                            —
                        </Typography>
                    );
                },
                enableSorting: false,
            }),
            columnHelper.accessor('status', {
                id: 'status',
                header: () => 'Status',
                cell: (info) => (
                    <PriceworkStatusBadge status={normalizePriceworkStatus(info.getValue())} />
                ),
                enableSorting: true,
            }),
            columnHelper.display({
                id: 'actions',
                header: () => 'Actions',
                cell: (info) => (
                    <Tooltip title="View details">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openPriceworkDetails(info.row.original)}
                        >
                            <IconEye size={18} />
                        </IconButton>
                    </Tooltip>
                ),
                enableSorting: false,
                enableHiding: false,
            }),
        ],
        [data, isSelectAll, selectedRowIds],
    );

    const fetchPriceworks = async () => {
        if (!user?.company_id) return;
        setLoading(true);
        try {
            let url = `pricework/list-web?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (startDate) url += `&start_date=${format(startDate, 'dd/MM/yyyy')}`;
            if (endDate) url += `&end_date=${format(endDate, 'dd/MM/yyyy')}`;
            if (filters.user_id) url += `&user_id=${filters.user_id}`;
            if (filters.project_id) url += `&project_id=${filters.project_id}`;
            if (filters.address_id) url += `&address_id=${filters.address_id}`;
            if (filters.trade_id) url += `&trade_id=${filters.trade_id}`;
            if (filters.team_id) url += `&team_id=${filters.team_id}`;
            if (activeTab !== 'all') url += `&status=${activeTab}`;

            if (sorting.length > 0) {
                const sortId =
                    sorting[0].id === 'status' ? 'approval_status' : sorting[0].id;
                url += `&sort_by=${sortId}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}`;
            }

            const res = await api.get(url);
            if (res.data) {
                const responseData = Array.isArray(res.data.info) ? res.data.info : [];

                // Dev-time sanity check: flag rows that will be unselectable
                // for bulk actions (timesheet_light rows missing an id) as
                // soon as they arrive, instead of only discovering it when a
                // user clicks a bulk-action button.
                if (process.env.NODE_ENV !== 'production') {
                    const orphaned = responseData.filter(isOrphanedTimesheetLightRow);
                    if (orphaned.length > 0) {
                        console.warn(
                            '[Pricework] API returned timesheet_light row(s) without timesheet_light_id — these rows cannot be bulk actioned:',
                            orphaned,
                        );
                    }
                }

                setData(responseData);
                clearSelection();

                const pagMeta = res.data.data || {};
                setTotalRows(
                    pagMeta.totalItems !== undefined ? pagMeta.totalItems : responseData.length,
                );
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
            console.error('Failed to fetch priceworks', error);
            setData([]);
            setTotalRows(0);
            setPageCount(0);
            clearSelection();
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
        fetchData: fetchPriceworks,
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

    const tabs: PriceworkTabItem[] = useMemo(
        () => [
            {key: 'all', label: 'All', count: tabCounts.all},
            {key: 'pending', label: 'Pending', count: tabCounts.pending},
            {key: 'approved', label: 'Approved', count: tabCounts.approved},
            {key: 'sent', label: 'Sent', count: tabCounts.sent},
            {key: 'rejected', label: 'Rejected', count: tabCounts.rejected},
        ],
        [tabCounts],
    );

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleDateRangeChange = (range: {from: Date | null; to: Date | null}) => {
        setStartDate(range.from);
        setEndDate(range.to);
        clearSelection();
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        clearSelection();
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
    };

    const handleClearAppliedFilters = (event: React.MouseEvent) => {
        event.stopPropagation();
        setTempFilters(defaultFilters);
        setFilters(defaultFilters);
        clearSelection();
        setPagination((prev: any) => ({...prev, pageIndex: 0}));
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
                    src={option.user_thumb_image || '/images/users/user.png'}
                    alt={getUserLabel(option)}
                    sx={{width: 36, height: 36}}
                />
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

    const visibleColCount = table.getVisibleLeafColumns().length;
    const simpleColumns = table
        .getAllLeafColumns()
        .filter((col) => col.getIsVisible())
        .map((col) => ({name: col.id}));

    const filteredColumnToggles = Object.keys(COLUMN_LABELS).filter(
        (id) =>
            id !== 'actions' &&
            COLUMN_LABELS[id].toLowerCase().includes(columnSearch.trim().toLowerCase()),
    );

    const allColumnsSelected =
        filteredColumnToggles.length > 0 &&
        filteredColumnToggles.every((id) => columnVisibility[id] !== false);
    const someColumnsSelected = filteredColumnToggles.some(
        (id) => columnVisibility[id] !== false,
    );

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
                                        <IconSearch size={16} />
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
                                <IconEye size={20} />
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
                                        onChange={(e) => {
                                            const next = {...columnVisibility};
                                            filteredColumnToggles.forEach((id) => {
                                                next[id] = e.target.checked;
                                            });
                                            setColumnVisibility(next);
                                        }}
                                        sx={{p: 0.5, mr: 1}}
                                    />
                                }
                                sx={{
                                    m: 0,
                                    px: 0.75,
                                    py: 0.375,
                                    width: '100%',
                                    borderRadius: 1.5,
                                    borderBottom: '1px solid #eef2f7',
                                    mb: 0.25,
                                    '&:hover': {backgroundColor: '#f8fafc'},
                                    '& .MuiFormControlLabel-label': {
                                        fontSize: '14px',
                                        fontWeight: 600,
                                    },
                                }}
                                label="Select All"
                            />
                            {filteredColumnToggles.map((id) => (
                                <FormControlLabel
                                    key={id}
                                    control={
                                        <CustomCheckbox
                                            size="small"
                                            checked={columnVisibility[id] !== false}
                                            onChange={() =>
                                                setColumnVisibility((prev) => ({
                                                    ...prev,
                                                    [id]: !(prev[id] !== false),
                                                }))
                                            }
                                            sx={{p: 0.5, mr: 1}}
                                        />
                                    }
                                    sx={{
                                        m: 0,
                                        px: 0.75,
                                        py: 0.375,
                                        width: '100%',
                                        borderRadius: 1.5,
                                        '&:hover': {backgroundColor: '#f8fafc'},
                                        '& .MuiFormControlLabel-label': {
                                            fontSize: '14px',
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                    label={COLUMN_LABELS[id]}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                <Box sx={{mx: 2, borderBottom: '1px solid', borderColor: 'divider'}}>
                    <Tabs
                        value={activeTab}
                        onChange={(_, value: PriceworkTabKey) => handleTabChange(value)}
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
                    <Table stickyHeader aria-label="priceworks sticky table">
                        <TableHead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        const isSortable = header.column.getCanSort();
                                        const isActive = header.column.getIsSorted();
                                        const isAsc = isActive === 'asc';
                                        return (
                                            <TableCell
                                                key={header.id}
                                                padding={
                                                    header.column.id === 'select'
                                                        ? 'checkbox'
                                                        : 'normal'
                                                }
                                                sx={{
                                                    whiteSpace: 'nowrap',
                                                    bgcolor: 'background.paper',
                                                    py: 1.25,
                                                    cursor: isSortable ? 'pointer' : 'default',
                                                }}
                                                onClick={
                                                    isSortable
                                                        ? header.column.getToggleSortingHandler()
                                                        : undefined
                                                }
                                            >
                                                <Box
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent={
                                                        header.column.id === 'actions'
                                                            ? 'flex-end'
                                                            : 'flex-start'
                                                    }
                                                    sx={{
                                                        ...(isSortable && {
                                                            '&:hover': {color: '#888'},
                                                        }),
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
                                <SkeletonLoader columns={simpleColumns} rowCount={8} />
                            ) : table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={Math.max(visibleColCount, 1)}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: 'calc(50vh - 100px)',
                                                gap: 1,
                                            }}
                                        >
                                            <Image
                                                src="/images/no-data.png"
                                                alt="No pricework data"
                                                style={{maxWidth: '100%', maxHeight: '100%'}}
                                                width={200}
                                                height={200}
                                            />
                                            <Typography color="text.secondary" className="f-14">
                                                No pricework records found
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        hover
                                        key={getPriceworkRowKey(row.original)}
                                        selected={
                                            isSelectAll || selectedRowIds.has(getPriceworkRowKey(row.original))
                                        }
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                align={
                                                    cell.column.id === 'actions' ? 'right' : 'left'
                                                }
                                                padding={
                                                    cell.column.id === 'select'
                                                        ? 'checkbox'
                                                        : 'normal'
                                                }
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
                            onClick={clearSelection}
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
                                onClick={() => handleApprovePriceworks(getActionPriceworkIds(), getActionTimesheetLightIds())}
                                sx={BULK_BUTTON_SX}
                            >
                                Approve Selected
                            </Button>

                            <Button
                                startIcon={<IconX size={15}/>}
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => openRejectDialog(getActionPriceworkIds(), getActionTimesheetLightIds())}
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
                open={rejectDialogOpen}
                onClose={closeRejectDialog}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{m: 0, position: 'relative'}}>
                    Reject Pricework{rejectPriceworkIds.length + rejectTimesheetLightIds.length === 1 ? '' : 's'}
                    <IconButton
                        aria-label="close"
                        onClick={closeRejectDialog}
                        disabled={isRejecting}
                        sx={{position: 'absolute', right: 12, top: 8}}
                    >
                        <IconX size={24}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <Typography>
                            Add a note for rejecting {rejectPriceworkIds.length + rejectTimesheetLightIds.length} pricework
                            {rejectPriceworkIds.length + rejectTimesheetLightIds.length === 1 ? '' : 's'}.
                        </Typography>
                        <TextField
                            label="Note"
                            placeholder="Write a reject note..."
                            value={rejectNote}
                            onChange={(event) => setRejectNote(event.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                            disabled={isRejecting}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button
                        color="inherit"
                        onClick={closeRejectDialog}
                        disabled={isRejecting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmRejectPriceworks}
                        disabled={isRejecting}
                    >
                        {isRejecting ? 'Rejecting…' : 'Reject'}
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
                        pricework{selectedCount === 1 ? '' : 's'}? This action cannot be undone.
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
                        onClick={handleDeletePriceworks}
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
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            value={users.find((u) => String(u.id) === String(tempFilters.user_id)) || null}
                            onChange={(_, value) => setTempFilters({...tempFilters, user_id: value ? value.id : ''})}
                            renderInput={(params) => <TextField {...params} label="User" fullWidth/>}
                        />
                        <Autocomplete
                            options={projects}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            value={projects.find((p) => String(p.id) === String(tempFilters.project_id)) || null}
                            onChange={(_, value) => setTempFilters({...tempFilters, project_id: value ? value.id : ''})}
                            renderInput={(params) => <TextField {...params} label="Project" fullWidth/>}
                        />
                        <Autocomplete
                            options={addresses}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            value={addresses.find((a) => String(a.id) === String(tempFilters.address_id)) || null}
                            onChange={(_, value) => setTempFilters({...tempFilters, address_id: value ? value.id : ''})}
                            renderInput={(params) => <TextField {...params} label="Address" fullWidth/>}
                        />
                        <Autocomplete
                            options={trades}
                            getOptionLabel={(option) => option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            value={trades.find((t) => String(t.id) === String(tempFilters.trade_id)) || null}
                            onChange={(_, value) => setTempFilters({...tempFilters, trade_id: value ? value.id : ''})}
                            renderInput={(params) => <TextField {...params} label="Trade" fullWidth/>}
                        />
                        <Autocomplete
                            options={teams}
                            getOptionLabel={(option) => option.title || option.name || ''}
                            getOptionKey={(option) => String(option.id)}
                            isOptionEqualToValue={(option, value) => String(option.id) === String(value?.id)}
                            value={teams.find((t) => String(t.id) === String(tempFilters.team_id)) || null}
                            onChange={(_, value) => setTempFilters({...tempFilters, team_id: value ? value.id : ''})}
                            renderInput={(params) => <TextField {...params} label="Team" fullWidth/>}
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
                            clearSelection();
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
                            clearSelection();
                            setPagination((prev: any) => ({...prev, pageIndex: 0}));
                        }}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>

            <PriceworkDetailsDrawer
                open={detailsOpen}
                onClose={closePriceworkDetails}
                pricework={detailsPricework}
                onViewAttachments={() => {
                    if (detailsPricework) openPriceworkAttachments(detailsPricework);
                }}
                onEdit={openEditPricework}
                onApprove={(id) => {
                    const row = detailsPricework;
                    if (row?.record_type === 'timesheet_light' && row.timesheet_light_id) {
                        void handleApprovePriceworks([], [Number(row.timesheet_light_id)]);
                        return;
                    }
                    void handleApprovePriceworks([id]);
                }}
                onReject={(id) => {
                    const row = detailsPricework;
                    if (row?.record_type === 'timesheet_light' && row.timesheet_light_id) {
                        openRejectDialog([], [Number(row.timesheet_light_id)]);
                        return;
                    }
                    openRejectDialog([id]);
                }}
            />

            <PriceworkAttachmentsDrawer
                open={attachmentsOpen}
                pricework={attachmentsPricework}
                onClose={closePriceworkAttachments}
            />

            <Drawer
                anchor="right"
                open={editOpen}
                onClose={closeEditPricework}
                PaperProps={{
                    sx: {
                        width: {xs: '100%', sm: 520},
                        maxWidth: '100%',
                    },
                }}
            >
                {editPricework && (
                    <AddPricework
                        onClose={closeEditPricework}
                        userId={editPricework.user_id ?? undefined}
                        companyId={Number(user?.company_id || 0)}
                        selectUser
                        onDataRefresh={refreshAfterEditPricework}
                        pricework={editPricework}
                    />
                )}
            </Drawer>
        </Box>
    );
};

export default PriceworkList;
