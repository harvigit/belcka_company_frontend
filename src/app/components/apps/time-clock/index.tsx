'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Avatar,
    Box,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Drawer,
    InputAdornment,
    Snackbar,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button,
    Chip,
    Menu,
    ListItemIcon, Tooltip,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    FormControl,
    Autocomplete,
} from '@mui/material';
import {
    IconSearch,
    IconLock,
    IconLockOpen,
    IconChevronUp,
    IconChevronDown,
    IconDotsVertical,
    IconNotes, IconExclamationCircle, IconX,
    IconSettings, IconRestore, IconTrash,
    IconClock,
    IconFilter,
} from '@tabler/icons-react';
import {
    createColumnHelper,
    flexRender,
    VisibilityState
} from '@tanstack/react-table';
import {
    addDays,
    endOfMonth,
    endOfWeek,
    format,
    startOfMonth,
    startOfWeek,
} from 'date-fns';
import {AxiosResponse} from 'axios';
import Cookies from 'js-cookie';

import api from '@/utils/axios';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';
import TimeClockDetails from './time-clock-details';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import AddLeave from './time-clock-details/leaves/add-leave';

import 'react-day-picker/dist/style.css';
import '@/app/global.css';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import AddExpense from './time-clock-details/expenses/add-expense';
import AddWorklog from './time-clock-details/worklog/add-worklog';
import AddPricework from './time-clock-details/pricework/add-pricework';
import Image from 'next/image';
import SkeletonLoader from '@/app/components/SkeletonLoader';
import Link from 'next/link';
import { getUserDetailsHref } from '@/utils/userDetailsRoute';
import LeaveLists from './time-clock-details/leaves';
import Conflicts from '@/app/components/apps/time-clock/time-clock-details/conflicts/conflicts';
import {ConflictDetail} from '@/app/components/apps/time-clock/types/timeClock';
import ConfirmationDialog from './components/ConfirmationDialog';
import {IconEye} from '@tabler/icons-react';
import Settings from './setting/inex';
import BookkeeperHistory from './history';
import RecoverWorklogs from './recover-worklogs';
import {useServerTable} from '@/hooks/useServerTable';
import TablePaginationFooter from '../../common/TablePaginationFooter';
import {usePersistentColumnVisibility} from '@/hooks/usePersistentColumnVisibility';
import PenaltyHistory from './penalty';
import UserRequests from '../requests/list';
import {useTranslation} from 'react-i18next';

const columnHelper = createColumnHelper<Index>();

const TIME_CLOCK_PAGE = 'time-clock-page';
const TIME_CLOCK_DETAILS_PAGE = 'time-clock-details-page';
const TIME_CLOCK_COLUMNS_COOKIE = 'time-clock-column-visibility';
const TIME_CLOCK_FILTERS_COOKIE_PREFIX = 'time-clock-filters';
const TIME_CLOCK_AMOUNT_COLUMNS = [
    'daylog_payable_amount',
    // 'net_worklog_amount',
    'pricework_total_amount',
    'cis_amount',
    'gross_amount',
    'net_payable_amount',
    'total_adjustment_amount',
    'total_payable_amount',
] as const;

const TIME_CLOCK_DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
    name_on_account: false,
    sort_code: false,
    account_number: false,
    utr_name: false,
    utr_number: false,
    nin_number: false,
};

interface ExportResponse {
    IsSuccess: boolean;
    message: string;
    data: {
        file: string;
        filename: string;
        contentType: string;
    };
}

interface StoredTimeClockState {
    startDate: string | null;
    endDate: string | null;
    columnVisibility?: VisibilityState;
    pagination?: {
        pageIndex: number;
        pageSize: number;
    };
}

const saveDateRangeToStorage = (
    startDate: Date | null,
    endDate: Date | null,
    columnVisibility?: VisibilityState,
    pagination?: { pageIndex: number; pageSize: number }
) => {
    try {
        const existingPageState = loadDateRangeFromStorage();
        const existingDetailsState = loadDetailsStateFromStorage();
        const dateRange: StoredTimeClockState = {
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            columnVisibility: columnVisibility ?? existingPageState?.columnVisibility ?? {},
            pagination: pagination ?? existingPageState?.pagination ?? {pageIndex: 0, pageSize: 500},
        };
        const detailsRange: StoredTimeClockState = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            columnVisibility: existingDetailsState?.columnVisibility ?? {},
        };

        localStorage.setItem(TIME_CLOCK_PAGE, JSON.stringify(dateRange));
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(detailsRange));
    } catch (error) {
        console.error('Error saving date range to localStorage:', error);
    }
};

const loadDateRangeFromStorage = () => {
    try {
        const stored = localStorage.getItem(TIME_CLOCK_PAGE);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                columnVisibility: parsed.columnVisibility || {},
                pagination: parsed.pagination &&
                    Number.isInteger(parsed.pagination.pageIndex) &&
                    parsed.pagination.pageIndex >= 0 &&
                    [50, 100, 250, 500].includes(parsed.pagination.pageSize)
                    ? parsed.pagination
                    : undefined,
            };
        }
    } catch (error) {
        console.error('Error loading date range from localStorage:', error);
    }
    return null;
};

const loadDetailsStateFromStorage = () => {
    try {
        const stored = localStorage.getItem(TIME_CLOCK_DETAILS_PAGE);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                startDate: parsed.startDate ? new Date(parsed.startDate) : null,
                endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                columnVisibility: parsed.columnVisibility || {},
            };
        }
    } catch (error) {
        console.error('Error loading details state from localStorage:', error);
    }
    return null;
};

const getRangeForCycle = (cycle: string): { from: Date; to: Date } => {
    const today = new Date();
    const normalized = cycle.replace(/s$/, '');

    if (normalized === '1_month') {
        return {from: startOfMonth(today), to: endOfMonth(today)};
    }
    if (normalized === '2_week') {
        const weekStart = startOfWeek(today, {weekStartsOn: 1});
        const daysSinceEpochMonday = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));
        const blockOffset = daysSinceEpochMonday % 2 === 0 ? 0 : 7;
        const from = addDays(weekStart, -blockOffset);
        return {from, to: addDays(from, 13)};
    }
    if (normalized === '3_month') {
        const from = startOfMonth(today);
        return {from, to: endOfMonth(addDays(from, 89))};
    }

    return {
        from: startOfWeek(today, {weekStartsOn: 1}),
        to: endOfWeek(today, {weekStartsOn: 1}),
    };
};

export type Index = {
    company_id: string;
    week_range: any;
    user_id: any;
    conflicts: string;
    user_name: string;
    user_code: string;
    account_id: string;
    name_on_account: string;
    sort_code: string;
    account_number: string;
    utr_name: string;
    utr_number: string;
    nin_number: string;
    trade_name: string;
    type: string;
    user_thumb_image: string;
    start_date: string;
    end_date: string;
    days: Record<string, any>;
    payable_total_hours: string;
    total_hours?: string | number;
    total_break_hours?: string | number;
    weekly_total_hours: string | number;
    daylog_payable_amount: number;
    // net_worklog_amount?: number | string;
    pricework_total_amount: number;
    total_expense_amount: number;
    cis_amount: number;
    gross_amount: number;
    check_ins?: number | string;
    checkIns?: number | string;
    check_in?: number | string;
    net_payable_amount: number;
    total_adjustment_amount: number;
    total_payable_amount: number;
    status_text: string;
    status_color?: string;

    timesheet_light_ids: string;
    weekly_payable_amount: number;

    has_leave_request?: boolean;
    has_expense_request?: boolean;
    has_worklog_request?: boolean;
    has_penalty_appeal_request?: boolean;
    bookkeeper_notification?: {
        has_green_dot?: boolean;
        tooltip?: string | null;
    };

    user_status_color: string;
};

type TimeClockResponse = {
    user_rate_permission: boolean;
    conflicts: any[];
    company_id: number;
    IsSuccess: boolean;
    info: Index[];
    currency: string;
    data?: {
        totalItems: number;
        itemCount: number;
        itemsPerPage: number;
        totalPages: number;
        currentPage: number;
    };
};

type FilterOption = {
    id: number | string;
    name: string;
    user_code?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
};

type TimeClockFilterState = {
    teams: number[];
    statuses: string[];
    users: number[];
    projects: number[];
};

const EMPTY_TIME_CLOCK_FILTERS: TimeClockFilterState = {
    teams: [],
    statuses: [],
    users: [],
    projects: [],
};

const TIME_CLOCK_TYPE_OPTIONS = [
    {value: 'day_work', label: 'Day Work'},
    {value: 'expense', label: 'Expense'},
    {value: 'pricework', label: 'Pricework'},
    {value: 'all_data', label: 'All Data'},
];

type TimeClockStoredFilters = {
    filters?: Partial<TimeClockFilterState>;
    typeFilter?: string;
};

const TIME_CLOCK_FILTER_COOKIE_OPTIONS = {
    expires: 365,
    path: '/',
};

type QueryParams = {
    user_id: string | null;
    is_removed_user: boolean;
    is_archived_user: boolean;
    start_date: string | null;
    end_date: string | null;
    open: string | null;
    type: string | null;
    recordId: string | null;
};

const EMPTY_QUERY_PARAMS: QueryParams = {
    user_id: null,
    is_removed_user: false,
    is_archived_user: false,
    start_date: null,
    end_date: null,
    open: null,
    type: null,
    recordId: null,
};

const isValidTimeClockTypeFilter = (value: unknown): value is string =>
    typeof value === 'string' && TIME_CLOCK_TYPE_OPTIONS.some((option) => option.value === value);

const normalizeStoredNumberFilter = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0);
};

const normalizeStoredStringFilter = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => String(item))
        .filter(Boolean);
};

interface Props {
    queryParams?: Partial<QueryParams>;
}

const saveDateToStorage = (startDate: Date | null, endDate: Date | null) => {
    try {
        const existingDetailsState = loadDetailsStateFromStorage();
        const dateRange: StoredTimeClockState = {
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            columnVisibility: existingDetailsState?.columnVisibility ?? {},
        };
        localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
    } catch (error) {
        console.log('Error saving date range to localStorage:', error);
    }
};

const TimeClock = ({queryParams}: Props) => {
    const {t} = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [resolvedQueryParams, setResolvedQueryParams] = useState<QueryParams>({
        ...EMPTY_QUERY_PARAMS,
        ...queryParams,
    });
    const [queryParamsInitialized, setQueryParamsInitialized] = useState(Boolean(queryParams));

    // Initialize default date range (current week)
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);
    const initialStoredState = useMemo(() => loadDateRangeFromStorage(), []);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [cycleReady, setCycleReady] = useState<boolean>(false);

    // State management
    const [data, setData] = useState<Index[]>([]);
    const [currency, setCurrency] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    // Keep timesheet IDs for selected users across pages (export/lock use this, not only current page data).
    const [selectedTimesheetIdsByUser, setSelectedTimesheetIdsByUser] = useState<Map<number, string>>(new Map());

    const clearSelectedRows = () => {
        setSelectedRowIds(new Set());
        setSelectedTimesheetIdsByUser(new Map());
    };

    const getSelectedTimesheetIds = (): (number | string)[] => {
        return Array.from(selectedTimesheetIdsByUser.values()).filter(
            (ids) => ids != null && String(ids).trim() !== '',
        );
    };

    const handleSelectAllRows = (checked: boolean) => {
        const nextIds = new Set(selectedRowIds);
        const nextMap = new Map(selectedTimesheetIdsByUser);

        data.forEach((item: Index) => {
            if (checked) {
                nextIds.add(item.user_id);
                if (item.timesheet_light_ids) {
                    nextMap.set(item.user_id, String(item.timesheet_light_ids));
                }
            } else {
                nextIds.delete(item.user_id);
                nextMap.delete(item.user_id);
            }
        });

        setSelectedRowIds(nextIds);
        setSelectedTimesheetIdsByUser(nextMap);
    };

    const [selectedTimeClock, setSelectedTimeClock] = useState<Index | null>(null);
    const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
    const [hasDataChanged, setHasDataChanged] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
    const [search, setSearch] = useState('');
    const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
    const [filters, setFilters] = useState<TimeClockFilterState>(EMPTY_TIME_CLOCK_FILTERS);
    const [tempFilters, setTempFilters] = useState<TimeClockFilterState>(EMPTY_TIME_CLOCK_FILTERS);
    const [typeFilterOpen, setTypeFilterOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all_data');
    const [tempTypeFilter, setTempTypeFilter] = useState('all_data');
    const [filtersHydrated, setFiltersHydrated] = useState(false);
    const [filterOptions, setFilterOptions] = useState<{
        teams: FilterOption[];
        statuses: FilterOption[];
        users: FilterOption[];
        projects: FilterOption[];
    }>({
        teams: [],
        statuses: [],
        users: [],
        projects: []
    });
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [anchorEl3, setAnchorEl3] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const session = useSession();
    const user = session.data?.user as User & { company_id: number; id?: string } & { user_role_id: number; };
    const timeClockFiltersCookieKey = useMemo(() => {
        if (!user?.id || !user?.company_id) return null;

        return `${TIME_CLOCK_FILTERS_COOKIE_PREFIX}_${user.id}_${user.company_id}`;
    }, [user?.id, user?.company_id]);

    const {
        columnVisibility,
        onColumnVisibilityChange: setColumnVisibility
    } = usePersistentColumnVisibility({
        storageKey: `cv_${user?.company_id}_${user?.id}_time_clock`,
        defaultVisibility: TIME_CLOCK_DEFAULT_COLUMN_VISIBILITY,
        enabled: !!user?.id,
    });
    const openMenu = Boolean(anchorEl3);
    const [addDropDown, setAddDropDown] = useState<null | HTMLElement>(null);
    const openAddleave = Boolean(addDropDown);
    const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);
    const [addExpenseSidebar, setAddExpenseSidebar] = useState<boolean>(false);
    const [addWorklogSidebar, setAddWorklogSidebar] = useState<boolean>(false);
    const [addPriceworkSidebar, setAddPriceworkSidebar] = useState<boolean>(false);
    const [openLeaves, setOpenLeaves] = useState(false);
    const [requestList ,setRequestList] = useState(false);

    // Conflict sidebar
    const [conflictSidebar, setConflictSidebar] = useState<boolean>(false);
    const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
    const [settingOpen, setSettingOpen] = useState(false);
    const [settingsInitialMenu, setSettingsInitialMenu] = useState<string | null>(null);
    const [settingsInitialProjectId, setSettingsInitialProjectId] = useState<number | null>(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    const [fetchTimesheet, setFetchTimesheet] = useState<boolean>(false);
    const [openRecoverWorklogs, setOpenRecoverWorklogs] = useState(false);
    const [openPenaltyHistory, setOpenPenaltyHistory] = useState(false);

    const [selectedConflictUserId, setSelectedConflictUserId] = useState<any>(null);

    // Pay Rate Permission
    const [userHasRatePermission, setUserHasRatePermission] = useState<boolean>(false);
    const [ratePermissionLoaded, setRatePermissionLoaded] = useState<boolean>(false);

    const queryParamsRef = useRef<QueryParams>(resolvedQueryParams);
    const dataRequestsRef = useRef<Map<string, Promise<Index[]>>>(new Map());
    const conflictRequestsRef = useRef<Map<string, Promise<void>>>(new Map());
    const hasInitializedFilterResetRef = useRef(false);
    const filterPopoverOpen = Boolean(filterAnchorEl);
    const activeFilterCount = filters.teams.length + filters.statuses.length + filters.users.length;
    const activeTypeFilter = typeFilter !== 'all_data';
    const toolbarButtonSx = {
        minHeight: 34,
        height: 34,
        whiteSpace: 'nowrap',
        textTransform: 'none',
        fontWeight: 600,
    };
    useEffect(() => {
        if (queryParams) {
            setResolvedQueryParams({
                ...EMPTY_QUERY_PARAMS,
                ...queryParams,
                is_removed_user: queryParams.is_removed_user === true,
                is_archived_user: queryParams.is_archived_user === true,
            });
            setQueryParamsInitialized(true);
        }
    }, [queryParams]);

    useEffect(() => {
        if (queryParams || !searchParams) return;

        const urlUserId = searchParams.get('user_id');
        const isRemovedUserParam = searchParams.get('is_removed_user');
        const isArchivedUserParam = searchParams.get('is_archived_user') || searchParams.get('is_archive_user');
        const hasSensitiveUserParams = Boolean(urlUserId || isRemovedUserParam || isArchivedUserParam);

        let userId: string | null = null;
        let isRemoved = false;
        let isArchived = false;

        if (hasSensitiveUserParams) {
            isRemoved = isRemovedUserParam === 'true' || isRemovedUserParam === '1';
            isArchived = isArchivedUserParam === 'true' || isArchivedUserParam === '1';
            userId = urlUserId;

            sessionStorage.setItem(
                'timesheet_sensitive_params',
                JSON.stringify({
                    user_id: userId,
                    is_removed_user: isRemoved,
                    is_archived_user: isArchived,
                })
            );

            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('user_id');
            newSearchParams.delete('is_removed_user');
            newSearchParams.delete('is_archived_user');
            newSearchParams.delete('is_archive_user');

            const currentPath = pathname || '/apps/time-clock/list';
            const newUrl = newSearchParams.toString()
                ? `${currentPath}?${newSearchParams.toString()}`
                : currentPath;

            router.replace(newUrl);
        } else {
            const stored = sessionStorage.getItem('timesheet_sensitive_params');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    userId = parsed.user_id || null;
                    isRemoved = parsed.is_removed_user || false;
                    isArchived = parsed.is_archived_user || false;
                } catch {
                    sessionStorage.removeItem('timesheet_sensitive_params');
                }
            }
        }

        setResolvedQueryParams({
            user_id: userId,
            is_removed_user: isRemoved,
            is_archived_user: isArchived,
            start_date: searchParams.get('start_date'),
            end_date: searchParams.get('end_date'),
            open: searchParams.get('open'),
            type: searchParams.get('type'),
            recordId: searchParams.get('id'),
        });
        setQueryParamsInitialized(true);
    }, [queryParams, searchParams, router, pathname]);

    useEffect(() => {
        queryParamsRef.current = resolvedQueryParams;
    }, [resolvedQueryParams]);

    const saveTimeClockFiltersCookie = useCallback((
        nextFilters: TimeClockFilterState,
        nextTypeFilter: string,
    ) => {
        if (!timeClockFiltersCookieKey) return;

        Cookies.set(
            timeClockFiltersCookieKey,
            JSON.stringify({
                filters: nextFilters,
                typeFilter: nextTypeFilter,
            }),
            TIME_CLOCK_FILTER_COOKIE_OPTIONS,
        );
    }, [timeClockFiltersCookieKey]);

    useEffect(() => {
        if (!timeClockFiltersCookieKey) return;

        try {
            const stored = Cookies.get(timeClockFiltersCookieKey);
            if (stored) {
                const parsed = JSON.parse(stored) as TimeClockStoredFilters;
                const nextFilters: TimeClockFilterState = {
                    teams: normalizeStoredNumberFilter(parsed.filters?.teams),
                    statuses: normalizeStoredStringFilter(parsed.filters?.statuses),
                    users: normalizeStoredNumberFilter(parsed.filters?.users),
                    projects: normalizeStoredNumberFilter(parsed.filters?.projects),
                };
                const nextTypeFilter = isValidTimeClockTypeFilter(parsed.typeFilter)
                    ? parsed.typeFilter
                    : 'all_data';

                setFilters(nextFilters);
                setTempFilters(nextFilters);
                setTypeFilter(nextTypeFilter);
                setTempTypeFilter(nextTypeFilter);
            }
        } catch (error) {
            console.error('Failed to load time-clock filters cookie:', error);
            Cookies.remove(timeClockFiltersCookieKey, {path: '/'});
        } finally {
            setFiltersHydrated(true);
        }
    }, [timeClockFiltersCookieKey]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchFilterOptions = async () => {
            try {
                const response = await api.get('/time-clock/resources');
                if (!response.data?.IsSuccess) return;

                setFilterOptions({
                    teams: response.data.teams || [],
                    statuses: response.data.statuses || [],
                    users: response.data.users || [],
                    projects: response.data.projects || [],
                });
            } catch (error) {
                console.error('Failed to fetch time-clock filter options:', error);
            }
        };

        fetchFilterOptions();
    }, [user?.id]);

    const [isFilteredView, setIsFilteredView] = useState(false);
    useEffect(() => {
        const hasUserFilter = Boolean(resolvedQueryParams.user_id);
        setIsFilteredView(hasUserFilter);
    }, [resolvedQueryParams.user_id]);

    useEffect(() => {
        if (!ratePermissionLoaded) return;

        setColumnVisibility((prev: any) => ({
            ...prev,
            ...Object.fromEntries(
                TIME_CLOCK_AMOUNT_COLUMNS.map((col) => [
                    col,
                    userHasRatePermission ? (prev[col] ?? true) : false,
                ])
            ),
        }));
    }, [userHasRatePermission, ratePermissionLoaded]);

    useEffect(() => {
        if (!startDate || !endDate) return;
        saveDateRangeToStorage(startDate, endDate, columnVisibility);
    }, [startDate, endDate, columnVisibility]);


    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        actionType: 'lock' | 'unlock' | 'paid' | 'delete';
        conflictCount: number;
    } | null>(null);

    const fetchData = async (start: Date, end: Date): Promise<Index[]> => {
        const params: Record<string, string> = {
            start_date: format(start, 'dd/MM/yyyy'),
            end_date: format(end, 'dd/MM/yyyy'),
            page: String(pagination.pageIndex + 1),
            limit: String(pagination.pageSize),
        };

        if (searchTerm) {
            params.search = searchTerm;
        }

        if (filters.teams.length > 0) {
            params.teams = filters.teams.join(',');
        }

        if (filters.statuses.length > 0) {
            params.statuses = filters.statuses.join(',');
        }

        if (filters.users.length > 0) {
            params.users = filters.users.join(',');
        }

        if (filters.projects.length > 0) {
            params.projects = filters.projects.join(',');
        }

        if (activeTypeFilter) {
            params.data_type = typeFilter;
        }

        const currentParams = queryParamsRef.current;

        if (currentParams?.user_id) {
            const userId = String(currentParams.user_id).trim();
            if (userId && !isNaN(Number(userId))) {
                params.user_id = userId;
                if (currentParams.is_removed_user === true) {
                    params.is_removed_user = '1';
                } else if (currentParams.is_archived_user === true) {
                    params.is_archived_user = '1';
                }
            }
        }

        const requestKey = JSON.stringify(params);
        const pendingRequest = dataRequestsRef.current.get(requestKey);
        if (pendingRequest) return pendingRequest;

        const request = (async (): Promise<Index[]> => {
            try {
                setFetchTimesheet(true);
                const response: AxiosResponse<TimeClockResponse> = await api.get('/time-clock/get', {params});
                if (response.data.IsSuccess) {
                    setData(response.data.info);
                    setCompanyId(response.data.company_id);
                    setUserHasRatePermission(response.data.user_rate_permission);
                    setRatePermissionLoaded(true);
                    if (response.data.currency !== null) {
                        setCurrency(response.data.currency);
                        setFetchTimesheet(false);
                    }

                    // Fetch conflicts separately
                    await fetchConflictsData();
                    const pagMeta = response.data.data;
                    setTotalRows(pagMeta?.totalItems ?? response.data.info.length);
                    setPageCount(pagMeta?.totalPages ?? 1);
                    return response.data.info;
                }
            } catch (error) {
                setErrorMessage('Failed to fetch timesheet data. Please try again.');
                setFetchTimesheet(false);
            }
            return [];
        })();

        dataRequestsRef.current.set(requestKey, request);
        try {
            return await request;
        } finally {
            if (dataRequestsRef.current.get(requestKey) === request) {
                dataRequestsRef.current.delete(requestKey);
            }
        }
    };

    const fetchConflictsData = async () => {
        const params: Record<string, string> = {};
        const requestKey = JSON.stringify(params);
        const pendingRequest = conflictRequestsRef.current.get(requestKey);
        if (pendingRequest) return pendingRequest;

        const request = (async () => {
            try {
                const response = await api.get('/time-clock/conflicts', {params});
                if (response.data.IsSuccess) {
                    setConflictDetails(response.data.conflicts || []);
                }
            } catch (error) {
                setConflictDetails([]);
            }
        })();

        conflictRequestsRef.current.set(requestKey, request);
        try {
            await request;
        } finally {
            if (conflictRequestsRef.current.get(requestKey) === request) {
                conflictRequestsRef.current.delete(requestKey);
            }
        }
    };

    const refreshTimeClockData = useCallback(async (fullRefresh: boolean = true) => {
        try {
            const s = startDate || defaultStart;
            const e = endDate || defaultEnd;
            if (fullRefresh) {
                await fetchData(s, e);
            } else {
                await fetchConflictsData();
            }
        } catch (error) {
            setErrorMessage('Failed to refresh data.');
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (!hasDataChanged) return;

        const timer = setTimeout(async () => {
            try {
                const s = startDate || defaultStart;
                const e = endDate || defaultEnd;
                await fetchData(s, e);
            } catch (error) {
                console.error('Background refresh failed:', error);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [hasDataChanged, startDate, endDate]);

    const handleClearSessionFilter = () => {
        sessionStorage.removeItem('timesheet_sensitive_params');

        const nextQueryParams = {
            ...resolvedQueryParams,
            user_id: null,
            is_removed_user: false,
            is_archived_user: false,
        };

        queryParamsRef.current = nextQueryParams;
        setResolvedQueryParams(nextQueryParams);

        const s = startDate || defaultStart;
        const e = endDate || defaultEnd;
        fetchData(s, e);
    };

    const isRemovedUser = useMemo(() => {
        return Boolean(resolvedQueryParams.is_removed_user === true || queryParamsRef.current?.is_removed_user === true);
    }, [resolvedQueryParams.is_removed_user]);

    const isArchivedUser = useMemo(() => {
        return Boolean(resolvedQueryParams.is_archived_user === true || queryParamsRef.current?.is_archived_user === true);
    }, [resolvedQueryParams.is_archived_user]);

    const isReadOnlyUser = isRemovedUser || isArchivedUser;

    const [payrollCycle, setPayrollCycle] = useState<string>('');

    useEffect(() => {
        (async () => {
            try {
                const response = await api.get('/setting/get-payroll-settings');
                const cycle = response.data?.IsSuccess
                    ? (response.data.data?.payroll_cycle || '')
                    : '';

                setPayrollCycle(cycle);

                let from: Date;
                let to: Date;
                const stored = loadDateRangeFromStorage();

                if (stored?.startDate && stored?.endDate) {
                    from = stored.startDate;
                    to = stored.endDate;
                } else if (cycle) {
                    const range = getRangeForCycle(cycle);
                    from = range.from;
                    to = range.to;
                } else {
                    from = defaultStart;
                    to = defaultEnd;
                }

                setStartDate(from);
                setEndDate(to);
                saveDateRangeToStorage(from, to, stored?.columnVisibility ?? columnVisibility);
            } catch (error) {
                console.error('Error fetching payroll cycle:', error);
                setStartDate(defaultStart);
                setEndDate(defaultEnd);
            } finally {
                setCycleReady(true);
            }
        })();
    }, []);

    useEffect(() => {
        if (!filtersHydrated) return;
        if (!resolvedQueryParams.user_id || !resolvedQueryParams.start_date || !resolvedQueryParams.end_date) return;

        const startDateObj = new Date(resolvedQueryParams.start_date);
        const endDateObj = new Date(resolvedQueryParams.end_date);

        setStartDate(startDateObj);
        setEndDate(endDateObj);

        (async () => {
            try {
                const fetchedData = await fetchData(startDateObj, endDateObj);

                const foundUser = fetchedData.find(
                    (item) =>
                        Number(item.user_id) === Number(resolvedQueryParams.user_id)
                );

                if (!foundUser) return;

                saveDateToStorage(startDateObj, endDateObj);
                setSelectedTimeClock(foundUser);

                if (resolvedQueryParams.type) {
                    setDetailsOpen(true);
                }
            } catch (err) {
                console.error('Failed to load data from query params:', err);
            }
        })();
    }, [
        resolvedQueryParams.user_id,
        resolvedQueryParams.start_date,
        resolvedQueryParams.end_date,
        resolvedQueryParams.type,
        filtersHydrated,
    ]);

    // Conflicts count
    const totalConflictsCount = useMemo(() => {
        return conflictDetails.reduce((count, item) => {
            return item ? count + 1 : count;
        }, 0);
    }, [conflictDetails]);


    const hasAnyConflicts = totalConflictsCount > 0;

    const handleConflicts = async () => {
        setConflictSidebar(true);
        setSelectedConflictUserId(null);
    };

    const closeConflictSidebar = async () => {
        setConflictSidebar(false);
        setSelectedConflictUserId(null);
        try {
            await fetchConflictsData();
        } catch (error) {
            console.error('Error fetching time clock data after closing conflict sidebar:', error);
        }
    };

    const handleSettingOpen = () => {
        setSettingsInitialMenu(null);
        setSettingsInitialProjectId(null);
        setSettingOpen(true);
    };

    const handleSettingClose = async () => {
        setSettingOpen(false);

        try {
            const response = await api.get('/setting/get-payroll-settings');
            const cycle = response.data?.IsSuccess
                ? (response.data.data?.payroll_cycle || '')
                : '';

            setPayrollCycle(cycle);

            const from = startDate || defaultStart;
            const to = endDate || defaultEnd;

            setStartDate(from);
            setEndDate(to);
            saveDateRangeToStorage(from, to, columnVisibility);

            await fetchData(from, to);
        } catch (error) {
            console.error('Error refreshing data after settings close:', error);
            setErrorMessage('Failed to refresh data after saving settings.');
        }
    };

    useEffect(() => {
        const pendingShiftManagementProject = sessionStorage.getItem('shift_management_project');
        if (!pendingShiftManagementProject) return;

        try {
            const parsed = JSON.parse(pendingShiftManagementProject);
            const projectId = Number(parsed?.project_id);

            if (projectId) {
                setSettingsInitialMenu('Shift Management');
                setSettingsInitialProjectId(projectId);
                setSettingOpen(true);
            }
        } catch (error) {
            console.error('Failed to open shift management from project edit', error);
        } finally {
            sessionStorage.removeItem('shift_management_project');
        }
    }, []);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl3(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl3(null);
    };

    const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAddDropDown(event.currentTarget);
    };

    const handleAddClose = () => {
        setAddDropDown(null);
    };

    const handleAddLeaveClick = () => {
        setAddDropDown(null);
        setAddLeaveSidebar(true);
    };

    const handleExpenseClick = () => {
        setAddDropDown(null);
        setAddExpenseSidebar(true);
    };

    const handleWorklogClick = () => {
        setAddDropDown(null);
        setAddWorklogSidebar(true);
    };

    const handlePriceworkClick = () => {
        setAddDropDown(null);
        setAddPriceworkSidebar(true);
    };

    const closeAddLeaveSidebar = async () => {
        setAddLeaveSidebar(false);
    };

    const closeAddWorklogSidebar = async () => {
        setAddWorklogSidebar(false);
    };

    const closeAddExpenseSidebar = async () => {
        setAddExpenseSidebar(false);
    };

    const closeAddPriceworkSidebar = async () => {
        setAddPriceworkSidebar(false);
    };


    const handleDateRangeChange = (range: {
        from: Date | null;
        to: Date | null;
    }) => {
        if (range.from && range.to) {
            setStartDate(range.from);
            setEndDate(range.to);
            saveDateRangeToStorage(range.from, range.to, columnVisibility);
        }
    };

    const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTempFilters(filters);
        setFilterAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setFilterAnchorEl(null);
    };

    const handleFilterValueChange = (
        key: keyof TimeClockFilterState,
        value: string[] | number[],
        numeric: boolean = true
    ) => {
        const rawValue = value as Array<string | number>;

        const normalizedValue = numeric
            ? rawValue.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
            : rawValue.map((item) => String(item)).filter(Boolean);

        setTempFilters((prev) => ({
            ...prev,
            [key]: normalizedValue,
        }));
    };

    const handleClearFilters = () => {
        setTempFilters(EMPTY_TIME_CLOCK_FILTERS);
        setFilters(EMPTY_TIME_CLOCK_FILTERS);
        saveTimeClockFiltersCookie(EMPTY_TIME_CLOCK_FILTERS, typeFilter);
        clearSelectedRows();
        setFilterAnchorEl(null);
    };

    const handleClearAppliedFilters = (event: React.MouseEvent) => {
        event.stopPropagation();
        setTempFilters(EMPTY_TIME_CLOCK_FILTERS);
        setFilters(EMPTY_TIME_CLOCK_FILTERS);
        saveTimeClockFiltersCookie(EMPTY_TIME_CLOCK_FILTERS, typeFilter);
        clearSelectedRows();
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        saveTimeClockFiltersCookie(tempFilters, typeFilter);
        clearSelectedRows();
        setFilterAnchorEl(null);
    };

    const handleTypeFilterOpen = () => {
        setTempTypeFilter(typeFilter);
        setTypeFilterOpen(true);
    };

    const handleTypeFilterClose = () => {
        setTypeFilterOpen(false);
        setTempTypeFilter(typeFilter);
    };

    const handleClearTypeFilter = () => {
        setTempTypeFilter('all_data');
        setTypeFilter('all_data');
        saveTimeClockFiltersCookie(filters, 'all_data');
        clearSelectedRows();
        setTypeFilterOpen(false);
    };

    const handleApplyTypeFilter = () => {
        setTypeFilter(tempTypeFilter);
        saveTimeClockFiltersCookie(filters, tempTypeFilter);
        clearSelectedRows();
        setTypeFilterOpen(false);
    };

    const renderFilterSelect = (
        label: string,
        key: keyof TimeClockFilterState,
        options: FilterOption[],
        numeric: boolean = true
    ) => {
        const value = tempFilters[key] as Array<number | string>;
        const selectedValueStrings = value.map(String);
        const selectedOptions = options.filter((option) =>
            selectedValueStrings.includes(String(option.id))
        );
        const allSelected = options.length > 0 && options.every((option) =>
            selectedValueStrings.includes(String(option.id))
        );

        return (
            <Stack
                direction="row"
                spacing={0}
                alignItems="stretch"
                sx={{width: '100%', minWidth: 0}}
            >
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={options}
                    value={selectedOptions}
                    getOptionLabel={(option) => option.user_code ? `${option.name} (${option.user_code})` : option.name}
                    isOptionEqualToValue={(option, selectedOption) => String(option.id) === String(selectedOption.id)}
                    filterOptions={(list, state) => {
                        const query = state.inputValue.trim().toLowerCase();
                        if (!query) return list;

                        return list.filter((option) =>
                            `${option.name} ${option.user_code ?? ''}`.toLowerCase().includes(query)
                        );
                    }}
                    onChange={(_, selected) => {
                        const selectedIds = selected.map((option) =>
                            numeric ? Number(option.id) : String(option.id)
                        );
                        handleFilterValueChange(key, selectedIds as any, numeric);
                    }}
                    renderTags={(tagValue, getTagProps) =>
                        tagValue.map((option, index) => {
                            const {key: chipKey, ...tagProps} = getTagProps({index});

                            return (
                                <Chip
                                    key={chipKey}
                                    label={option.name}
                                    color="primary"
                                    size="small"
                                    {...tagProps}
                                    sx={{
                                        borderRadius: '4px',
                                        fontSize: '0.9rem',
                                        height: 32,
                                        '& .MuiChip-deleteIcon': {
                                            color: 'rgba(255,255,255,0.85)',
                                            '&:hover': {color: '#fff'},
                                        },
                                    }}
                                />
                            );
                        })
                    }
                    renderOption={(props, option, {selected}) => {
                        const {key: optionKey, ...optionProps} = props;

                        return (
                            <Box
                                component="li"
                                key={optionKey}
                                {...optionProps}
                                sx={{
                                    color: selected ? '#fff' : 'inherit',
                                    bgcolor: selected ? '#0b57d0 !important' : 'transparent',
                                    '&.Mui-focused': {
                                        bgcolor: selected ? '#0b57d0 !important' : '#f5f5f5',
                                    },
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1.5} minWidth={0} width="100%">
                                    {key === 'users' && (
                                        <Avatar
                                            src={option.user_thumb_image || option.user_image || undefined}
                                            alt={option.name}
                                            sx={{width: 32, height: 32, fontSize: '14px'}}
                                        >
                                            {option.name?.[0]?.toUpperCase()}
                                        </Avatar>
                                    )}
                                    <Typography
                                        component="span"
                                        variant="body1"
                                        className="f-14"
                                        sx={{
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {option.name}
                                        {option.user_code ? ` (${option.user_code})` : ''}
                                    </Typography>
                                    {selected && (
                                        <Typography component="span" sx={{fontSize: 22, lineHeight: 1}}>
                                            ✓
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        );
                    }}
                    noOptionsText={`No ${label.toLowerCase()} found`}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                            },
                        },
                        listbox: {
                            sx: {
                                maxHeight: 360,
                                py: 0,
                                '& .MuiAutocomplete-option': {
                                    minHeight: 54,
                                    fontSize: '1rem',
                                },
                            },
                        },
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder={selectedOptions.length ? '' : label}
                            size="small"
                        />
                    )}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': {
                            minHeight: 56,
                            alignItems: 'center',
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                            '& fieldset': {borderColor: '#e0e0e0'},
                            '&:hover fieldset': {borderColor: '#0d5ef4'},
                            '&.Mui-focused fieldset': {borderColor: '#0d5ef4'},
                        },
                    }}
                />
                <Box
                    onClick={() => {
                        const allOptionValues = options.map((option) =>
                            numeric ? Number(option.id) : String(option.id)
                        );

                        handleFilterValueChange(key, allSelected ? [] : allOptionValues as any, numeric);
                    }}
                    sx={{
                        width: {xs: 100, sm: 110},
                        minHeight: 56,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2,
                        border: '1px solid',
                        borderColor: allSelected || value.length > 0 ? '#0d5ef4' : '#e0e0e0',
                        borderLeft: 0,
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderTopRightRadius: '6px',
                        borderBottomRightRadius: '6px',
                        cursor: 'pointer',
                        color: '#6b687d',
                        userSelect: 'none',
                        transition: 'border-color 150ms ease',
                        '&:hover': {
                            borderColor: '#0d5ef4',
                        },
                    }}
                >
                    <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && value.length > 0}
                        size="small"
                        sx={{
                            p: 0,
                            pointerEvents: 'none',
                        }}
                    />
                    <Typography component="span" variant="body1">
                        All
                    </Typography>
                </Box>
            </Stack>
        );
    };

    const handleRowClick = (timeClock: Index) => {
        setSelectedTimeClock(timeClock);
        setDetailsOpen(true);
    };

    const handleUserChange = (newUser: Index) => {
        const updatedUser = {
            ...newUser,
            start_date: selectedTimeClock?.start_date || startDate?.toISOString() || '',
            end_date: selectedTimeClock?.end_date || endDate?.toISOString() || '',
        };
        setSelectedTimeClock(updatedUser);
    };

    const closeDetails = async () => {
        setDetailsOpen(false);
        setSelectedTimeClock(null);

        const s = startDate || defaultStart;
        const e = endDate || defaultEnd;
        try {
            await fetchData(s, e);
            setHasDataChanged(false);
        } catch (error) {
            setErrorMessage('Failed to refresh data. Please try again.');
        }
    };

    const handleDataChange = () => {
        setHasDataChanged(true);
    };

    const filteredData = useMemo(() => {
        return data;
    }, [data]);

    // Refresh stored timesheet IDs for selected users when the current page data updates.
    useEffect(() => {
        if (!data.length || selectedRowIds.size === 0) return;

        setSelectedTimesheetIdsByUser((prev) => {
            const next = new Map(prev);
            let changed = false;

            data.forEach((item) => {
                if (!selectedRowIds.has(item.user_id) || !item.timesheet_light_ids) return;
                const value = String(item.timesheet_light_ids);
                if (next.get(item.user_id) !== value) {
                    next.set(item.user_id, value);
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [data, selectedRowIds]);

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '-';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '-';
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const hasPendingRequest = (row: Index): boolean =>
        row.has_leave_request === true ||
        row.has_expense_request === true ||
        row.has_worklog_request === true ||
        row.has_penalty_appeal_request === true;

    const columns = [
        {
            id: 'select',
            header: ({table}: any) => (
                <Stack direction="row" alignItems="center" ml={0.5}>
                    <CustomCheckbox
                        className="header-checkbox"
                        checked={
                            filteredData.length > 0 &&
                            filteredData.every((item) => selectedRowIds.has(item.user_id))
                        }
                        indeterminate={
                            filteredData.some((item) => selectedRowIds.has(item.user_id)) &&
                            !filteredData.every((item) => selectedRowIds.has(item.user_id))
                        }
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
                const isChecked = selectedRowIds.has(item.user_id);

                return (
                    <Stack
                        direction="row"
                        alignItems="center"
                        onMouseEnter={() => setHoveredRow(item.user_id)}
                        onMouseLeave={() => setHoveredRow(null)}
                    >
                        <CustomCheckbox
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => {
                                const newSet = new Set(selectedRowIds);
                                const newMap = new Map(selectedTimesheetIdsByUser);
                                if (isChecked) {
                                    newSet.delete(item.user_id);
                                    newMap.delete(item.user_id);
                                } else {
                                    newSet.add(item.user_id);
                                    if (item.timesheet_light_ids) {
                                        newMap.set(item.user_id, String(item.timesheet_light_ids));
                                    }
                                }
                                setSelectedRowIds(newSet);
                                setSelectedTimesheetIdsByUser(newMap);
                            }}
                            sx={{
                                opacity: 1,
                                pointerEvents: 'auto',
                                transition: 'opacity 0.2s ease',
                            }}
                        />
                    </Stack>
                );
            },
        },

        columnHelper.accessor('conflicts', {
            id: 'conflicts',
            header: () => (
                <span style={{display: 'block', textAlign: 'center'}}/>
            ),
            cell: ({row}) => {
                const userId = row.original.user_id;

                const rowConflicts = (conflictDetails || []).filter(
                    (conflict) => conflict.user_id === userId
                );

                const conflictCount = rowConflicts.length;

                if (conflictCount === 0) {
                    return null;
                }

                return (
                    <Stack direction="row" alignItems="center" justifyContent="center">
                        <Tooltip
                            title={`${conflictCount} Conflict${conflictCount !== 1 ? 's' : ''}`}
                            arrow
                            placement="top"
                        >
                            <IconButton
                                size="small"
                                color="error"
                                aria-label={`${conflictCount} scheduling conflict${conflictCount !== 1 ? 's' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConflictSidebar(true);
                                    setSelectedConflictUserId(userId);
                                }}
                                sx={{
                                    p: 0.5,
                                    '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'error.dark',
                                        opacity: 0.9,
                                    },
                                }}
                            >
                                <IconExclamationCircle size={20}/>
                            </IconButton>
                        </Tooltip>
                    </Stack>
                );
            },
            size: 10,
            enableSorting: false,
            enableHiding: false,
            meta: {align: 'center'},
        }),

        columnHelper.accessor('user_name', {
            id: 'user_name',
            header: 'Name',
            cell: (info: any) => {
                const row = info.row.original;

                return (
                    <Stack direction="row" alignItems="center" spacing={4}>
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={4}
                            sx={{cursor: 'pointer'}}
                        >
                            <Link
                                href={getUserDetailsHref(row?.user_id, {
                                    tab: 'billing',
                                    ...(isReadOnlyUser
                                        ? (isRemovedUser
                                            ? {is_removed_user: 'true'}
                                            : {is_archived_user: 'true'})
                                        : {}),
                                })}
                                passHref
                                onClick={(e) => e.stopPropagation()}
                                style={{textDecoration: 'none', color: 'inherit'}}
                            >
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                                    variant="dot"
                                    sx={{
                                        '& .MuiBadge-badge': {
                                            backgroundColor: row?.user_status_color,
                                            color: row?.user_status_color,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            boxShadow: '0 0 0 2px white',
                                            cursor: 'pointer',
                                        },
                                    }}
                                >
                                    <Avatar
                                        src={row?.user_thumb_image || '/images/users/user.png'}
                                        alt={row?.user_name}
                                        sx={{width: 36, height: 36, cursor: 'pointer'}}
                                    />
                                </Badge>
                            </Link>
                            <Box>
                                <Link
                                    href={getUserDetailsHref(row?.user_id, {
                                        tab: 'billing',
                                        ...(isReadOnlyUser
                                            ? (isRemovedUser
                                                ? {is_removed_user: 'true'}
                                                : {is_archived_user: 'true'})
                                            : {}),
                                    })}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{textDecoration: 'none', color: 'inherit'}}
                                >
                                    <Typography
                                        className="f-14"
                                        color="textPrimary"
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { color: '#173f98' },
                                            width: 150,
                                        }}
                                    >
                                        {row.user_name}
                                    </Typography>
                                </Link>
                                <Tooltip title={row.trade_name ? t(row.trade_name) : '-'} placement="top" arrow>
                                    <Typography color="textSecondary" variant="subtitle1" width={150} noWrap>
                                        {row.trade_name ? t(row.trade_name) : '-'}
                                    </Typography>
                                </Tooltip>
                            </Box>
                        </Stack>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('user_code', {
            id: 'company_code',
            header: 'Company Code',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.user_code}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('account_id', {
            id: 'account_id',
            header: 'Account ID',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.account_id}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('name_on_account', {
            id: 'name_on_account',
            header: 'NOA',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.name_on_account}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('sort_code', {
            id: 'sort_code',
            header: 'Sort Code',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.sort_code}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('account_number', {
            id: 'account_number',
            header: 'Account Number',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.account_number}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('utr_name', {
            id: 'utr_name',
            header: 'NOU',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.utr_name}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('utr_number', {
            id: 'utr_number',
            header: 'UTR',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.utr_number}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('nin_number', {
            id: 'nin_number',
            header: 'NIN',
            cell: (info: any) => {
                const row = info.row.original;
                return (
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box textAlign="left" sx={{flex: 1, minWidth: 0}}>
                            <Typography sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word',
                            }} className="f-14">
                                {row.nin_number}
                            </Typography>
                        </Box>
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('total_hours', {
            id: 'total_hours',
            header: 'Total',
            cell: (info: any) => {
                const row = info.row.original;
                const value = info.getValue();
                const formatted = formatHour(value) || '-';

                return (
                    <Typography
                        variant="h6"
                        sx={{
                            color: hasPendingRequest(row) ? '#f97316' : 'inherit',
                        }}
                    >
                        {formatted}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor('payable_total_hours', {
            id: 'payable_total_hours',
            header: 'Payable',
            cell: (info: any) => formatHour(info.getValue()) || '-',
        }),

        columnHelper.accessor('daylog_payable_amount', {
            id: 'daylog_payable_amount',
            header: 'Daywork',
            cell: (info: any) => {
                const value = info.getValue();
                return value === 0 ? '0' : value ? `${currency}${value}` : '-';
            },
        }),

        // columnHelper.accessor((row) => row.net_worklog_amount ?? row.daylog_payable_amount, {
        //     id: 'net_worklog_amount',
        //     header: 'Net Worklog',
        //     cell: (info: any) => {
        //         const value = info.getValue();
        //         return value === 0 ? `${currency}0` : value ? `${currency}${value}` : '-';
        //     },
        // }),

        columnHelper.accessor('pricework_total_amount', {
            id: 'pricework_total_amount',
            header: 'Pricework',
            cell: (info: any) => {
                const row = info.row.original;
                const value = info.getValue();
                const displayValue =
                    value === 0 ? '0' : value ? `${currency}${value}` : '-';

                return (
                    <Typography
                        variant="h6"
                        sx={{
                            color: hasPendingRequest(row) ? '#f97316' : 'inherit',
                        }}
                    >
                        {displayValue}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor('total_expense_amount', {
            id: 'total_expense_amount',
            header: 'Expense',
            cell: (info: any) => {
                const row = info.row.original;
                const value = info.getValue();
                const displayValue = value === 0 ? '0' : value ? `${currency}${value}` : '-';
                const hasBookkeeperDot = Boolean(row.bookkeeper_notification?.has_green_dot);

                return (
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: hasPendingRequest(row) ? '#f97316' : 'inherit',
                            }}
                        >
                            {displayValue}
                        </Typography>
                        {hasBookkeeperDot && (
                            <Tooltip title={row.bookkeeper_notification?.tooltip || ''} arrow>
                                <Box
                                    component="span"
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: '#2fb344',
                                        display: 'inline-block',
                                        flexShrink: 0,
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Stack>
                );
            },
        }),

        columnHelper.accessor('cis_amount', {
            id: 'cis_amount',
            header: 'CIS',
            cell: (info: any) => {
                const value = info.getValue();
                return value === 0 ? '0' : value ? `${currency}${value}` : '-';
            },
        }),

        columnHelper.accessor('gross_amount', {
            id: 'gross_amount',
            header: 'Gross',
            cell: (info: any) => {
                const value = info.getValue();
                return value === 0 ? '0' : value ? `${currency}${value}` : '-';
            },
        }),

        columnHelper.accessor((row) => row.check_ins ?? row.checkIns ?? row.check_in ?? 0, {
            id: 'checkIns',
            header: 'Check Ins',
            cell: (info: any) => {
                const value = info.getValue();
                return value === 0 || value ? String(value) : '-';
            },
            meta: {align: 'center'},
        }),

        columnHelper.accessor('net_payable_amount', {
            id: 'net_payable_amount',
            header: 'Net',
            cell: (info: any) => {
                const value = info.getValue();
                return value === 0 ? `${currency}0` : value ? `${currency}${value}` : '-';
            },
        }),

        columnHelper.accessor('total_adjustment_amount', {
            id: 'total_adjustment_amount',
            header: 'Adjustment',
            cell: (info: any) => {
                const value = info.getValue();
                if (value === null || value === undefined) return '-';

                const numericValue = Number(value);
                if (!Number.isFinite(numericValue)) return '-';
                if (Object.is(numericValue, -0) || numericValue === 0) return `${currency}0`;

                return numericValue > 0 ? `${currency}${Math.abs(numericValue)}` : `-${currency}${Math.abs(numericValue)}`;
            },
        }),

        columnHelper.accessor('total_payable_amount', {
            id: 'total_payable_amount',
            header: 'Total',
            cell: (info: any) => {
                const value = info.getValue();
                const displayValue = value === 0 ? '0' : value ? `${currency}${value}` : '-';

                return (
                    <Typography variant="h6" sx={{fontWeight: 700}}>
                        {displayValue}
                    </Typography>
                );
            },
        }),

        columnHelper.accessor('status_text', {
            id: 'status_text',
            header: 'Status',
            cell: (info) => {
                const statusText = info.getValue() as string;
                const statusColorFromApi = (info.row.original as Index).status_color;

                if (!statusText || !statusColorFromApi) {
                    return (
                        <Typography color="textSecondary" variant="body2">-</Typography>
                    );
                }

                const muiColors = ['success', 'error', 'warning', 'primary', 'info', 'secondary',] as const;
                if (muiColors.includes(statusColorFromApi as any)) {
                    return (
                        <Chip
                            label={t(statusText)}
                            color={statusColorFromApi as any}
                            size="small"
                            sx={{
                                width: 80,
                                height: 28,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'capitalize',
                            }}
                        />
                    );
                }

                return (
                    <Chip
                        label={t(statusColorFromApi)}
                        size="small"
                        sx={{
                            width: 80,
                            height: 28,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            textTransform: 'capitalize',
                        }}
                    />
                );
            },
        }),
    ];

    const handleFetchData = () => {
        if (!queryParamsInitialized || !filtersHydrated || !cycleReady || !startDate || !endDate) return;

        const start = startDate || defaultStart;
        const end = endDate || defaultEnd;
        fetchData(start, end);
    };

    const {
        table,
        pagination,
        setPagination,
        pageCount,
        setPageCount,
        totalRows,
        setTotalRows,
        sorting,
        setSorting,
        columnFilters,
        setColumnFilters,
    } = useServerTable({
        data: filteredData,
        columns,
        fetchData: handleFetchData,
        initialPagination: initialStoredState?.pagination ?? {pageIndex: 0, pageSize: 500},
        debounceDependencies: [
            searchTerm,
            filters,
            typeFilter,
            resolvedQueryParams.user_id,
            resolvedQueryParams.is_removed_user,
            resolvedQueryParams.is_archived_user,
            startDate,
            endDate,
            cycleReady,
            filtersHydrated,
            queryParamsInitialized,
        ],
        state: {columnVisibility},
        onColumnVisibilityChange: setColumnVisibility,
    });

    useEffect(() => {
        if (!startDate || !endDate) return;
        saveDateRangeToStorage(startDate, endDate, columnVisibility, pagination);
    }, [startDate, endDate, columnVisibility, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        if (!cycleReady) return;
        if (!hasInitializedFilterResetRef.current) {
            hasInitializedFilterResetRef.current = true;
            return;
        }

        setPagination((prev) => ({...prev, pageIndex: 0}));
    }, [
        searchTerm,
        filters,
        typeFilter,
        startDate,
        endDate,
        resolvedQueryParams.user_id,
        resolvedQueryParams.is_removed_user,
        resolvedQueryParams.is_archived_user,
        cycleReady,
    ]);

    useEffect(() => {
        if (resolvedQueryParams.open && resolvedQueryParams.type == null) {
            setOpenLeaves(true);
        }
    }, [resolvedQueryParams.open, resolvedQueryParams.type]);

    const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleExportClose = (option: string) => {
        if (option) {
            handleExport(option);
        }
        setAnchorEl(null);
    };

    const handleExport = async (option: string) => {
        try {
            const timesheetIds = getSelectedTimesheetIds();

            if (timesheetIds.length === 0) {
                setErrorMessage('No valid timesheets selected for exporting.');
                return;
            }

            const ids = timesheetIds.join(',');

            // Map option to format + file extension
            const formatMap: Record<string, { format: string; ext: string }> = {
                summary: {format: 'summary', ext: 'xlsx'},
                details: {format: 'details', ext: 'xlsx'},
                summary_pdf: {format: 'summary_pdf', ext: 'pdf'},
                details_pdf: {format: 'details_pdf', ext: 'pdf'},
            };

            const selected = formatMap[option] ?? {format: option, ext: 'xlsx'};
            const exportStartDate = startDate || defaultStart;
            const exportEndDate = endDate || defaultEnd;

            const response: AxiosResponse<ExportResponse> = await api.post('/time-clock/export', {
                ids,
                format: selected.format,
                start_date: format(exportStartDate, 'yyyy-MM-dd'),
                end_date: format(exportEndDate, 'yyyy-MM-dd'),
            });

            if (response.data.IsSuccess) {
                const {file, filename, contentType} = response.data.data;

                const binaryString = atob(file);
                const binaryLen = binaryString.length;
                const bytes = new Uint8Array(binaryLen);
                for (let i = 0; i < binaryLen; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                const blob = new Blob([bytes], {type: contentType});
                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = filename || `timeclock_export_${new Date().toISOString()}.${selected.ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                clearSelectedRows();

                if (startDate && endDate) {
                    await fetchData(startDate, endDate);
                }
            } else {
                throw new Error(response.data.message || 'Export request failed');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog) return;

        const timesheetIds = getSelectedTimesheetIds();

        setConfirmDialog(null);

        switch (confirmDialog.actionType) {
            case 'lock':
                await toggleWeeklyTimesheetStatus(timesheetIds, 'approve');
                break;
            case 'unlock':
                await toggleWeeklyTimesheetStatus(timesheetIds, 'unapprove');
                break;
            case 'paid':
                await proceedWithMarkAsPaid(timesheetIds);
                break;
            case 'delete':
                await proceedWithDeleteSelectedUsers();
                break;
        }
    };

    const getConflictsInSelectedRows = () => {
        return (conflictDetails || []).filter(
            (conflict) => selectedRowIds.has(conflict.user_id)
        ).length;
    };

    const handleLock = async () => {
        const timesheetIds = getSelectedTimesheetIds();

        if (timesheetIds.length === 0) {
            setErrorMessage('No valid timesheets selected for locking.');
            return;
        }

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({
                open: true,
                actionType: 'lock',
                conflictCount,
            });
        } else {
            await toggleWeeklyTimesheetStatus(timesheetIds, 'approve');
        }
    };

    const handleUnlock = async () => {
        const timesheetIds = getSelectedTimesheetIds();

        if (timesheetIds.length === 0) {
            setErrorMessage('No valid timesheets selected for unlocking.');
            return;
        }

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({
                open: true,
                actionType: 'unlock',
                conflictCount,
            });
        } else {
            await toggleWeeklyTimesheetStatus(timesheetIds, 'unapprove');
        }
    };

    const handleMarkAsPaid = async () => {
        const timesheetIds = getSelectedTimesheetIds();

        if (timesheetIds.length === 0) {
            setErrorMessage('No valid timesheets selected for marking as paid.');
            return;
        }

        const conflictCount = getConflictsInSelectedRows();

        if (conflictCount > 0) {
            setConfirmDialog({
                open: true,
                actionType: 'paid',
                conflictCount,
            });
        } else {
            await proceedWithMarkAsPaid(timesheetIds);
        }
    };

    const handleDeleteSelectedUsers = async () => {
        setConfirmDialog({
            open: true,
            actionType: 'delete',
            conflictCount: getConflictsInSelectedRows(),
        });
    };

    const proceedWithDeleteSelectedUsers = async () => {
        const from = startDate || defaultStart;
        const to = endDate || defaultEnd;
        const userIds = Array.from(selectedRowIds);

        if (!userIds.length) return;

        try {
            const response = await api.post('/time-clock/users-range-delete', {
                user_ids: userIds,
                start_date: format(from, 'yyyy-MM-dd'),
                end_date: format(to, 'yyyy-MM-dd'),
            });
            if (response.data.IsSuccess) {
                setSuccessMessage(response.data.message);
                clearSelectedRows();
                await fetchData(from, to);
            }
        } catch (error: any) {
            setErrorMessage(error?.response?.data?.message || 'Failed to delete selected users\' time-clock records.');
        }
    };

    const proceedWithMarkAsPaid = async (timesheetIds: (number | string)[]) => {
        try {
            const ids = timesheetIds.join(',');
            const response = await api.post('/timesheet/paid', {ids});
            if (response.data.IsSuccess) {
                setSuccessMessage(response.data.message);
                clearSelectedRows();
                setHasDataChanged(true);

                const s = startDate || defaultStart;
                const e = endDate || defaultEnd;
                await fetchData(s, e);
            }
        } catch (error) {
            setErrorMessage('Failed to mark timesheets as paid.');
        }
    };

    const toggleWeeklyTimesheetStatus = async (timesheetIds: (number | string)[], action: 'approve' | 'unapprove') => {
        if (timesheetIds.length === 0) return;

        try {
            const ids = timesheetIds.join(',');
            const endpoint = action === 'approve' ? '/timesheet/approve' : '/timesheet/unapprove';

            const response = await api.post(endpoint, {ids});
            if (response.data.IsSuccess) {
                setSuccessMessage(response.data.message);
                clearSelectedRows();
                setHasDataChanged(true);

                const s = startDate || defaultStart;
                const e = endDate || defaultEnd;
                await fetchData(s, e);
            } else {
                setErrorMessage(`Failed to ${action} timesheet(s).`);
            }
        } catch (error: any) {
        }
    };

    const isAnyRowSelected = selectedRowIds.size > 0;

    const simpleColumns = columns.map((column) => ({
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
                {/* ── TOOLBAR ── */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        p: 1,
                    }}
                >
                    {/* Left controls */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexWrap: 'wrap',
                            flex: 1,
                            minWidth: 0
                        }}>
                            {cycleReady && (
                                <DateRangePickerBox
                                    from={startDate}
                                    to={endDate}
                                    onChange={handleDateRangeChange}
                                    payrollCycle={payrollCycle}
                                />
                            )}
                            <TextField
                                placeholder={t('Search...')}
                                size="small"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{width: 180}}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconSearch size={16}/>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Button
                                color="primary"
                                variant="contained"
                                size="small"
                                onClick={handleFilterClick}
                                sx={{
                                    ...toolbarButtonSx,
                                    minWidth: 40,
                                    px: 1.5,
                                    mt: { xs: 1, sm: 0 }
                                }}
                                aria-label={t('Open filters')}
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
                                        ...toolbarButtonSx,
                                        minWidth: 64,
                                        px: 1.5,
                                    }}
                                    aria-label={t('Clear filters')}
                                >
                                    <IconX size={18}/>
                                </Button>
                            )}

                            <Button
                                color="primary"
                                variant='outlined'
                                size="small"
                                onClick={handleTypeFilterOpen}
                                sx={toolbarButtonSx}
                            >
                                {t('Types')}
                            </Button>

                            {isFilteredView && (
                                <Button
                                    color="error"
                                    variant="outlined"
                                    onClick={handleClearSessionFilter}
                                >
                                    <IconX size={24}/>
                                </Button>
                            )}

                            <Button
                                color="primary"
                                variant="outlined"
                                size="small"
                                onClick={() => setOpenDrawer(true)}
                                sx={toolbarButtonSx}
                            >
                                {t('Activity')}
                            </Button>
                        </Box>

                        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0}}>
                            <Button
                                color="primary"
                                variant="outlined"
                                size="small"
                                onClick={() => setRequestList(true)}
                                sx={{
                                    ...toolbarButtonSx,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {t('Requests')}
                            </Button>

                            {!isReadOnlyUser && (
                                <>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap'}}
                                        onClick={handleAddClick}
                                        endIcon={openAddleave ? <IconChevronUp size={18}/> :
                                            <IconChevronDown size={18}/>}
                                    >
                                        {t('Add')}
                                    </Button>
                                    <Menu
                                        anchorEl={addDropDown}
                                        open={openAddleave}
                                        onClose={handleAddClose}
                                        anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                                        transformOrigin={{vertical: 'top', horizontal: 'left'}}
                                    >
                                        <MenuItem onClick={handleWorklogClick}>{t('Add Worklog')}</MenuItem>
                                        <MenuItem onClick={handlePriceworkClick}>{t('Add Pricework')}</MenuItem>
                                        <MenuItem onClick={handleExpenseClick}>{t('Add Expense')}</MenuItem>
                                        <MenuItem onClick={handleAddLeaveClick}>{t('Add Leave')}</MenuItem>
                                    </Menu>
                                </>
                            )}

                            {hasAnyConflicts && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleConflicts}
                                    sx={{
                                        borderColor: '#f28b82',
                                        px: 1,
                                        py: 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        textTransform: 'none',
                                        whiteSpace: 'nowrap',
                                        minWidth: 'unset',
                                        '&:hover': {backgroundColor: 'transparent', borderColor: '#f28b82'},
                                    }}
                                >
                                    <Box
                                        sx={{
                                            backgroundColor: '#e53935',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            width: 18,
                                            height: 18,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {totalConflictsCount}
                                    </Box>
                                    <Typography sx={{fontWeight: 600, color: '#e53935', fontSize: '13px'}}>
                                        {t('Conflicts')}
                                    </Typography>
                                </Button>
                            )}

                            <Tooltip title={t('Column visibility')}>
                                <IconButton onClick={(e) => setAnchorEl2(e.currentTarget)} color="primary" size="small">
                                    <IconEye size={20}/>
                                </IconButton>
                            </Tooltip>

                            {user.user_role_id === 1 && (
                            <Tooltip title={t('Settings')}>
                                <IconButton onClick={handleSettingOpen} color="primary" size="small">
                                    <IconSettings size={20}/>
                                </IconButton>
                            </Tooltip>
                            )}

                            <Settings
                                settingOpen={settingOpen}
                                onClose={handleSettingClose}
                                initialActiveMenuItem={settingsInitialMenu}
                                initialProjectId={settingsInitialProjectId}
                            />

                            <IconButton
                                size="small"
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
                                anchorEl={anchorEl3}
                                open={openMenu}
                                onClose={handleClose}
                                slotProps={{list: {'aria-labelledby': 'basic-button'}}}
                            >
                                <MenuItem onClick={handleClose}>
                                    <Link
                                        color="body1"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setOpenLeaves(true);
                                        }}
                                        style={{
                                            width: '100%',
                                            color: '#11142D',
                                            textTransform: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconNotes width={18}/>
                                        </ListItemIcon>
                                        Leaves List
                                    </Link>
                                </MenuItem>
                                <MenuItem onClick={handleClose}>
                                    <Link
                                        color="body1"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setOpenRecoverWorklogs(true);
                                            handleClose();
                                        }}
                                        style={{
                                            width: '100%',
                                            color: '#11142D',
                                            textTransform: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconRestore width={18}/>
                                        </ListItemIcon>
                                        Recover worklogs
                                    </Link>
                                </MenuItem>
                                <MenuItem onClick={handleClose}>
                                    <Link
                                        color="body1"
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setOpenPenaltyHistory(true);
                                            handleClose();
                                        }}
                                        style={{
                                            width: '100%',
                                            color: '#11142D',
                                            textTransform: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <ListItemIcon>
                                            <IconClock width={18}/>
                                        </ListItemIcon>
                                        Penalty History
                                    </Link>
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Box>

                </Box>

                <Dialog
                    open={filterPopoverOpen}
                    onClose={handleFilterClose}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        sx: {
                            width: {xs: 'calc(100vw - 24px)', sm: '100%'},
                            maxWidth: 600,
                            m: {xs: 1.5, sm: 4},
                            overflow: 'visible',
                        },
                    }}
                >
                    <DialogTitle
                        sx={{m: 0, position: 'relative', overflow: 'visible'}}
                    >
                        {t('Filters')}
                        <IconButton
                            aria-label={t('Close')}
                            onClick={handleFilterClose}
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
                    <DialogContent sx={{overflowX: 'hidden'}}>
                        <Stack spacing={2} mt={1} sx={{width: '100%', minWidth: 0}}>
                            {renderFilterSelect('Projects', 'projects', filterOptions.projects)}
                            {renderFilterSelect('Teams', 'teams', filterOptions.teams)}
                            {renderFilterSelect('Status', 'statuses', filterOptions.statuses, false)}
                            {renderFilterSelect('Users', 'users', filterOptions.users)}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={handleClearFilters}
                            color="inherit"
                        >
                            {t('Clear')}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyFilters}
                        >
                            {t('Apply')}
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog
                    open={typeFilterOpen}
                    onClose={handleTypeFilterClose}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        sx: {
                            width: {xs: 'calc(100vw - 24px)', sm: '100%'},
                            maxWidth: 600,
                            m: {xs: 1.5, sm: 4},
                        },
                    }}
                >
                    <DialogTitle sx={{m: 0, position: 'relative'}}>
                                {t('Types')}
                        <IconButton
                            aria-label={t('Close')}
                            onClick={handleTypeFilterClose}
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
                    <DialogContent sx={{overflowX: 'hidden'}}>
                        <Stack spacing={1.5} mt={1} sx={{width: '100%', minWidth: 0}}>
                            <FormControl fullWidth>
                                <Select
                                    value={tempTypeFilter}
                                    onChange={(event) => setTempTypeFilter(String(event.target.value))}
                                    size="small"
                                    sx={{
                                        minHeight: 56,
                                        '& .MuiSelect-select': {
                                            display: 'flex',
                                            alignItems: 'center',
                                            minHeight: '39px !important',
                                        },
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#e0e0e0'
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#bdbdbd',
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#50ABFF',
                                        },
                                    }}
                                >
                                    {TIME_CLOCK_TYPE_OPTIONS.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {t(option.label)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            onClick={handleClearTypeFilter}
                            color="inherit"
                        >
                            {t('Clear')}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyTypeFilter}
                        >
                            {t('Apply')}
                        </Button>
                    </DialogActions>
                </Dialog>

                <BookkeeperHistory
                    open={openDrawer}
                    onClose={() => setOpenDrawer(false)}
                    startDate={startDate}
                    endDate={endDate}
                />

                {isAnyRowSelected && (
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
                            minWidth: '420px',
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <IconButton
                                size="small"
                                onClick={clearSelectedRows}
                                sx={{color: '#666', '&:hover': {bgcolor: 'grey.100'}}}
                            >
                                <IconX size={16}/>
                            </IconButton>

                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                {t('selected.count', {count: selectedRowIds.size})}
                            </Typography>

                            <Box sx={{flexGrow: 1}}/>

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    startIcon={<IconLock size={15}/>}
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    onClick={handleLock}
                                    sx={{px: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px'}}
                                >
                                    {t('Lock')}
                                </Button>

                                <Button
                                    startIcon={<IconLockOpen size={15}/>}
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={handleUnlock}
                                    sx={{px: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px'}}
                                >
                                    {t('Unlock')}
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    onClick={handleMarkAsPaid}
                                    sx={{
                                        px: 2.5,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '8px',
                                        boxShadow: 'none',
                                        '&:hover': {boxShadow: 'none'}
                                    }}
                                >
                                    {t('Paid')}
                                </Button>

                                <Button
                                    startIcon={<IconTrash size={15}/>}
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={handleDeleteSelectedUsers}
                                    sx={{px: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px'}}
                                >
                                    {t('Delete')}
                                </Button>

                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    sx={{px: 2.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px'}}
                                    onClick={handleExportClick}
                                    endIcon={open ? <IconChevronUp size={18}/> : <IconChevronDown size={18}/>}
                                >
                                    {t('Export')}
                                </Button>
                                <Menu
                                    anchorEl={anchorEl}
                                    open={open}
                                    onClose={() => handleExportClose('')}
                                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                                    transformOrigin={{vertical: 'bottom', horizontal: 'center'}}
                                >
                                    <MenuItem onClick={() => handleExportClose('summary')}>{t('Export Summary')}
                                        (Excel)</MenuItem>
                                    <MenuItem onClick={() => handleExportClose('details')}>{t('Export Timeclock Details')}
                                        (Excel)</MenuItem>
                                    <Divider/>
                                    <MenuItem onClick={() => handleExportClose('summary_pdf')}>{t('Export Summary')}
                                        (PDF)</MenuItem>
                                    <MenuItem onClick={() => handleExportClose('details_pdf')}>{t('Export Timeclock Details')}
                                        (PDF)</MenuItem>
                                </Menu>
                            </Stack>
                        </Stack>
                    </Box>
                )}

                <Popover
                    open={Boolean(anchorEl2)}
                    anchorEl={anchorEl2}
                    onClose={() => {
                        setAnchorEl2(null);
                        setSearch('');
                    }}
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
                        }
                    }}
                >
                    <TextField
                        size="small"
                        placeholder={t('Search columns...')}
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
                                    const excludedColumns = ['select'];
                                    if (excludedColumns.includes(col.id)) return false;

                                    if (!userHasRatePermission && TIME_CLOCK_AMOUNT_COLUMNS.includes(col.id as typeof TIME_CLOCK_AMOUNT_COLUMNS[number])) return false;

                                    return col.id.toLowerCase().includes(search.toLowerCase());
                                    });
                                const allSelected = columnOptions.length > 0 && columnOptions.every((col: any) => col.getIsVisible());
                                const someSelected = columnOptions.some((col: any) => col.getIsVisible());

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
                                                        columnOptions.forEach((col: any) => col.toggleVisibility(e.target.checked));
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
                                            label={t('Select All')}
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
                                                    t(
                                                        col.columnDef.meta?.label ||
                                                        (typeof col.columnDef.header === 'string' &&
                                                        col.columnDef.header.trim() !== ''
                                                            ? col.columnDef.header
                                                            : col.id
                                                                .replace(/([A-Z])/g, ' $1')
                                                                .replace(/^./, (str: string) => str.toUpperCase())
                                                                .trim())
                                                    )
                                                }
                                            />
                                        ))}
                                    </>
                                );
                            })()}
                        </FormGroup>
                    </Box>
                </Popover>

                <Divider/>

                <TableContainer
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'auto',
                        overflowY: 'auto',
                    }}
                >
                    <Table
                        stickyHeader
                        sx={{
                            minWidth: 1600,
                            tableLayout: 'auto',
                        }}
                    >
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
                                                align="left"
                                                sx={{
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 11,
                                                    p: 0,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <Box
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    sx={{
                                                        cursor: isSortable ? 'pointer' : 'default',
                                                        border: '2px solid transparent',
                                                        borderRadius: '6px',
                                                        py: 1.5,
                                                        ml: 0.5,
                                                        fontWeight: isActive ? 600 : 500,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        '&:hover': {color: '#888'},
                                                        '&:hover .hoverIcon': {opacity: 1},
                                                    }}
                                                >
                                                    <Typography variant="body2" component="span">
                                                        {typeof header.column.columnDef.header === 'string'
                                                            ? t(header.column.columnDef.header)
                                                            : flexRender(header.column.columnDef.header, header.getContext())}
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
                            {fetchTimesheet ? (
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
                                    <TableRow
                                        hover
                                        key={row.id}
                                        onMouseEnter={() => {
                                            setHoveredRow(Number(row.original.user_id));
                                        }}
                                        onMouseLeave={() => setHoveredRow(null)}
                                        onClick={() => handleRowClick(row.original)}
                                        sx={{
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s ease',
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                sx={{padding: '10px'}}
                                                align="left"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
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

            <TablePaginationFooter
                selectedCount={typeof selectedRowIds !== 'undefined' ? selectedRowIds.size : undefined} table={table}
                totalRows={totalRows}/>

            <Drawer
                anchor="bottom"
                open={detailsOpen}
                onClose={closeDetails}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        height: '90vh',
                        boxShadow: 'none',
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        overflow: 'hidden',
                    },
                }}
            >
                <TimeClockDetails
                    open={detailsOpen}
                    timeClock={selectedTimeClock}
                    user_id={selectedTimeClock?.user_id}
                    companyId={companyId}
                    currency={currency}
                    allUsers={filteredData}
                    onClose={closeDetails}
                    onUserChange={handleUserChange}
                    onDataChange={handleDataChange}
                    isRemovedUser={isRemovedUser}
                    isArchivedUser={isArchivedUser}
                    queryParams={resolvedQueryParams}
                />
            </Drawer>

            <Snackbar
                open={Boolean(successMessage || errorMessage)}
                autoHideDuration={4000}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    setSuccessMessage(null);
                    setErrorMessage(null);
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        backgroundColor: errorMessage ? '#FEE2E2' : '#EEF2FF',
                        color: errorMessage ? '#DC2626' : '#4F46E5',
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
                    }}
                >
                    <Typography variant="body2">
                        {errorMessage || successMessage}
                    </Typography>

                    <IconButton
                        size="small"
                        onClick={() => {
                            setSuccessMessage(null);
                            setErrorMessage(null);
                        }}
                        sx={{color: 'inherit'}}
                    >
                        <IconX size={14}/>
                    </IconButton>
                </Box>
            </Snackbar>

            {/*  Add Leave */}
            <Drawer
                anchor="right"
                open={addLeaveSidebar}
                onClose={closeAddLeaveSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddLeave
                    onClose={closeAddLeaveSidebar}
                    userId={selectedTimeClock?.user_id}
                    companyId={user.company_id}
                    onDataRefresh={refreshTimeClockData}
                />
            </Drawer>

            {/* Add Expense */}
            <Drawer
                anchor="right"
                open={addExpenseSidebar}
                onClose={closeAddExpenseSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddExpense
                    onClose={closeAddExpenseSidebar}
                    userId={selectedTimeClock?.user_id}
                    selectUser={true}
                    companyId={user.company_id}
                    onDataRefresh={refreshTimeClockData}
                />
            </Drawer>

            {/*  Add Worklog */}
            <Drawer
                anchor="right"
                open={addWorklogSidebar}
                onClose={closeAddWorklogSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddWorklog
                    onClose={closeAddWorklogSidebar}
                    userId={selectedTimeClock?.user_id}
                    companyId={user.company_id}
                    onDataRefresh={refreshTimeClockData}
                />
            </Drawer>

            {/* Add Pricework */}
            <Drawer
                anchor="right"
                open={addPriceworkSidebar}
                onClose={closeAddPriceworkSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <AddPricework
                    onClose={closeAddPriceworkSidebar}
                    companyId={user.company_id}
                    selectUser={true}
                    onDataRefresh={refreshTimeClockData}
                />
            </Drawer>

            {/*  Leave list */}
            <LeaveLists open={openLeaves} onClose={() => setOpenLeaves(false)} queryParams={resolvedQueryParams}/>
            
            {/* Request list */}
            <UserRequests open={requestList} onRequestCountChange={() => {}} onClose={() => setRequestList(false)} isAdmin={true}/>

            {/*  Recover Worklogs list */}
            <RecoverWorklogs
                open={openRecoverWorklogs}
                onClose={() => setOpenRecoverWorklogs(false)}
                startDate={startDate}
                endDate={endDate}
            />
            
            {/*  Penalty history */}
            <PenaltyHistory
                open={openPenaltyHistory}
                onClose={() => setOpenPenaltyHistory(false)}
            />

            {/* Conflicts */}
            <Drawer
                anchor="right"
                open={conflictSidebar}
                onClose={closeConflictSidebar}
                PaperProps={{
                    sx: {
                        borderRadius: 0,
                        boxShadow: 'none',
                        overflow: 'hidden',
                        width: '504px',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                    },
                }}
            >
                <Conflicts
                    conflictDetails={
                        selectedConflictUserId
                            ? conflictDetails.filter(
                                (conflict: any) => conflict.user_id === selectedConflictUserId
                            )
                            : conflictDetails
                    }
                    totalConflicts={
                        selectedConflictUserId
                            ? conflictDetails.filter(
                                (conflict: any) => conflict.user_id === selectedConflictUserId
                            ).length
                            : totalConflictsCount
                    }
                    onClose={() => {
                        closeConflictSidebar();
                        setSelectedConflictUserId(null);
                    }}
                    startDate={startDate ? format(startDate, 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd')}
                    endDate={endDate ? format(endDate, 'yyyy-MM-dd') : format(defaultEnd, 'yyyy-MM-dd')}
                    selectedUserId={selectedConflictUserId}
                />
            </Drawer>

            {confirmDialog && (
                <ConfirmationDialog
                    open={confirmDialog.open}
                    onClose={() => setConfirmDialog(null)}
                    onConfirm={handleConfirmAction}
                    title={confirmDialog.actionType === 'lock' ? 'Lock Timesheets' : confirmDialog.actionType === 'unlock' ? 'Unlock Timesheets' : confirmDialog.actionType === 'delete' ? 'Delete Time-clock Records' : 'Mark as Paid'}
                    message={confirmDialog.actionType === 'lock' ? 'Are you sure you want to lock the selected timesheets?' : confirmDialog.actionType === 'unlock' ? 'Are you sure you want to unlock the selected timesheets?' : confirmDialog.actionType === 'delete' ? `Are you sure you want to delete all worklogs, leave, penalties, pricework and expenses for ${selectedRowIds.size} selected user(s) from ${format(startDate || defaultStart, 'dd MMM yyyy')} to ${format(endDate || defaultEnd, 'dd MMM yyyy')}? This action cannot be undone.` : 'Are you sure you want to mark the selected timesheets as paid?'}
                    conflictCount={confirmDialog.conflictCount}
                    actionType={confirmDialog.actionType}
                />
            )}
        </Box>
    );
};

export default TimeClock;
