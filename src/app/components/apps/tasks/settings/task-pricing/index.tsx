'use client';

import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    IconButton,
    InputAdornment,
    ListSubheader,
    MenuItem,
    Paper,
    Select,
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
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {useVirtualizer} from '@tanstack/react-virtual';
import {IconDeviceFloppy, IconPlus, IconRefresh, IconSearch, IconTrash} from '@tabler/icons-react';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import PriceWorkMatrixRow from './PriceWorkMatrixRow';
import type {CellState, NamedOption, PricingRow, SubCategoryOption} from './types';

interface TaskPricingMatrixProps {
    onSaveSuccess?: () => void;
}

type DeletedPricingRow = {
    task_id: number;
    user_id: number | null;
    project_id?: number;
};

type PriceWorkSettingsCache = {
    loaded: boolean;
    companyId: number | null;
    fetchedAt: number;
    tasks: any[];
    projects: any[];
    users: any[];
    trades: any[];
    rows: PricingRow[];
};

const DEFAULT_PROJECT_COLUMNS_PER_PAGE = 8;
const PROJECT_COLUMNS_PER_PAGE_OPTIONS = [8, 12, 20];
const PRICE_WORK_ROW_ORDER_STORAGE_KEY_PREFIX = 'price-work-settings-row-order';
const PRICE_WORK_CACHE_TTL_MS = 5 * 60 * 1000;
const PRICE_WORK_SEARCH_DEBOUNCE_MS = 300;
const PRICE_WORK_ROW_HEIGHT = 52;
const EMPTY_NAMED_OPTIONS: NamedOption[] = [];
const EMPTY_SUB_CATEGORY_OPTIONS: SubCategoryOption[] = [];

let priceWorkSettingsCache: PriceWorkSettingsCache = {
    loaded: false,
    companyId: null,
    fetchedAt: 0,
    tasks: [],
    projects: [],
    users: [],
    trades: [],
    rows: [],
};

const isPriceWorkCacheWarm = (companyId: number) =>
    priceWorkSettingsCache.loaded &&
    priceWorkSettingsCache.companyId === companyId &&
    Date.now() - priceWorkSettingsCache.fetchedAt < PRICE_WORK_CACHE_TTL_MS;

const isDirtyActiveProjectCell = (value: CellState) => {
    if (!value.is_active) return false;
    if (value.original_is_active === undefined || value.original_price === undefined) return true;

    return (
        value.original_is_active !== value.is_active ||
        String(value.original_price) !== String(value.price)
    );
};

const getTaskBasePrice = (_task: any) => '0.00';

const getSavedPriceBasePrice = (priceItem: any) =>
    priceItem?.base_cost != null && priceItem.base_cost !== '' ? String(priceItem.base_cost) : '0.00';

const getSavedPriceBaseActive = (priceItem: any) =>
    priceItem?.base_active === true ||
    priceItem?.base_active === 1 ||
    String(priceItem?.base_active || '').trim().toLowerCase() === 'true';

const getSavedPriceProjectActive = (priceItem: any) =>
    priceItem?.project_active === true ||
    priceItem?.project_active === 1 ||
    String(priceItem?.project_active || '').trim().toLowerCase() === 'true';

const getTaskTradeId = (task: any) =>
    task?.trade_id != null && task.trade_id !== '' ? String(task.trade_id) : '';

const getSavedPriceTradeId = (priceItem: any) =>
    priceItem?.trade_id != null && priceItem.trade_id !== '' ? String(priceItem.trade_id) : '';

const getSavedPriceUserName = (priceItem: any) =>
    priceItem?.user_name && priceItem.user_name !== '-' ? String(priceItem.user_name) : '';

const getSavedPriceTradeName = (priceItem: any) =>
    priceItem?.trade_name && priceItem.trade_name !== '-' ? String(priceItem.trade_name) : '';

const getUserDisplayName = (user: any) =>
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    '-';

const getProjectName = (project: any) =>
    project?.name || project?.project_name || project?.address || '-';

const isPriceworkTask = (task: any) => {
    const shiftType = String(task?.shift_type || '').trim().toLowerCase();
    if (shiftType) return shiftType === 'pricework' || shiftType === 'both';

    return (
        task?.shift_is_pricework === true ||
        task?.shift_is_pricework === 1 ||
        String(task?.shift_is_pricework || '').trim().toLowerCase() === 'true' ||
        String(task?.shift_name || '').trim().toLowerCase() === 'pricework' ||
        String(task?.shift_name || '').trim().toLowerCase() === 'price work'
    );
};

const getCategoryId = (task: any) =>
    task?.category_id != null && task.category_id !== '' ? String(task.category_id) : '';

const getSubCategoryId = (task: any) =>
    task?.sub_category_id != null && task.sub_category_id !== '' ? String(task.sub_category_id) : '';

const getSavedPriceCategoryId = (priceItem: any) =>
    priceItem?.category_id != null && priceItem.category_id !== '' ? String(priceItem.category_id) : '';

const getSavedPriceSubCategoryId = (priceItem: any) =>
    priceItem?.sub_category_id != null && priceItem.sub_category_id !== '' ? String(priceItem.sub_category_id) : '';

const getSavedPriceCategoryName = (priceItem: any) =>
    priceItem?.category_name && priceItem.category_name !== '-' ? String(priceItem.category_name) : '';

const getSavedPriceSubCategoryName = (priceItem: any) =>
    priceItem?.sub_category_name && priceItem.sub_category_name !== '-' ? String(priceItem.sub_category_name) : '';

const createRow = (): PricingRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: '',
    user_name: '',
    original_user_id: undefined,
    trade_id: '',
    trade_name: '',
    category_id: '',
    category_name: '',
    sub_category_id: '',
    sub_category_name: '',
    task_id: '',
    original_task_id: '',
    base_active: false,
    original_base_active: false,
    base_price: '0.00',
    original_base_price: '0.00',
    project_prices: {},
});

const isCompletePricingRow = (row: PricingRow) =>
    Boolean(row.trade_id && row.category_id && row.task_id);

const isEmptyPricingRow = (row: PricingRow) =>
    !row.user_id &&
    !row.trade_id &&
    !row.category_id &&
    !row.sub_category_id &&
    !row.task_id &&
    !row.base_active &&
    Object.keys(row.project_prices).length === 0;

const buildRowsFromSavedPrices = (savedPrices: any[], priceworkTasks: any[]): PricingRow[] => {
    const taskMap = priceworkTasks.reduce<Record<string, any>>((map, task) => {
        map[String(task.id)] = task;
        return map;
    }, {});
    const groupedRows = new Map<string, PricingRow>();

    savedPrices.forEach((priceItem) => {
        const taskId = priceItem?.task_id != null ? String(priceItem.task_id) : '';
        const userId = priceItem?.user_id != null ? String(priceItem.user_id) : '';
        const projectId = priceItem?.project_id != null ? String(priceItem.project_id) : '';

        if (!projectId) return;

        const rowKey = `${userId || 'unassigned'}-${taskId || priceItem.id || projectId}`;
        const task = taskMap[taskId];
        const tradeId = getTaskTradeId(task) || getSavedPriceTradeId(priceItem);
        const categoryId = getCategoryId(task) || getSavedPriceCategoryId(priceItem);

        if (!groupedRows.has(rowKey)) {
            const basePrice = getSavedPriceBasePrice(priceItem) || getTaskBasePrice(task);
            const baseActive = getSavedPriceBaseActive(priceItem);

            groupedRows.set(rowKey, {
                id: `saved-${rowKey}`,
                user_id: userId,
                user_name: getSavedPriceUserName(priceItem) || 'All users',
                original_user_id: userId || null,
                trade_id: tradeId,
                trade_name: task?.trade_name || getSavedPriceTradeName(priceItem),
                category_id: categoryId,
                category_name: task?.category_name || getSavedPriceCategoryName(priceItem),
                sub_category_id: getSubCategoryId(task) || getSavedPriceSubCategoryId(priceItem),
                sub_category_name: task?.sub_category_name || getSavedPriceSubCategoryName(priceItem),
                task_id: taskId,
                original_task_id: taskId,
                base_active: baseActive,
                original_base_active: baseActive,
                base_price: basePrice,
                original_base_price: basePrice,
                project_prices: {},
            });
        }

        const row = groupedRows.get(rowKey);
        if (!row) return;

        const savedPrice = priceItem?.price != null ? String(priceItem.price) : '0.00';
        row.project_prices[projectId] = {
            is_active: getSavedPriceProjectActive(priceItem),
            original_is_active: getSavedPriceProjectActive(priceItem),
            price: savedPrice,
            original_price: savedPrice,
        };
    });

    return Array.from(groupedRows.values());
};

const getPricingRowOrderKey = (row: PricingRow) => {
    if (row.task_id) return `${row.user_id || 'unassigned'}-${row.task_id}`;

    return row.id;
};

const getRowOrderStorageKey = (companyId?: number | null) =>
    companyId ? `${PRICE_WORK_ROW_ORDER_STORAGE_KEY_PREFIX}-${companyId}` : '';

const readStoredRowOrder = (companyId?: number | null) => {
    const storageKey = getRowOrderStorageKey(companyId);
    if (!storageKey || typeof window === 'undefined') return [];

    try {
        const storedOrder = window.localStorage.getItem(storageKey);
        const parsedOrder = storedOrder ? JSON.parse(storedOrder) : [];

        return Array.isArray(parsedOrder) ? parsedOrder.filter((item) => typeof item === 'string') : [];
    } catch {
        return [];
    }
};

const saveStoredRowOrder = (companyId: number | null | undefined, rowsToStore: PricingRow[]) => {
    const storageKey = getRowOrderStorageKey(companyId);
    if (!storageKey || typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            storageKey,
            JSON.stringify(rowsToStore.map(getPricingRowOrderKey)),
        );
    } catch {
        // Ignore storage failures; row order still updates for the current render.
    }
};

const preserveRowOrder = (nextRows: PricingRow[], orderedKeys: string[]) => {
    if (orderedKeys.length === 0 || nextRows.length === 0) return nextRows;

    const nextRowsByOrderKey = new Map(nextRows.map((row) => [getPricingRowOrderKey(row), row]));
    const orderedRows = orderedKeys
        .map((orderKey) => nextRowsByOrderKey.get(orderKey))
        .filter((row): row is PricingRow => Boolean(row));
    const orderedRowKeys = new Set(orderedRows.map(getPricingRowOrderKey));
    const newRows = nextRows.filter((row) => !orderedRowKeys.has(getPricingRowOrderKey(row)));

    return [...orderedRows, ...newRows];
};

const TaskPricingMatrix: React.FC<TaskPricingMatrixProps> = ({onSaveSuccess}) => {
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};
    const hasLoadedOnceRef = useRef(priceWorkSettingsCache.loaded);
    const savingRef = useRef(false);
    const [tableScrollEl, setTableScrollEl] = useState<HTMLDivElement | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [loading, setLoading] = useState(!priceWorkSettingsCache.loaded);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [tasks, setTasks] = useState<any[]>(priceWorkSettingsCache.tasks);
    const [projects, setProjects] = useState<any[]>(priceWorkSettingsCache.projects);
    const [users, setUsers] = useState<any[]>(priceWorkSettingsCache.users);
    const [trades, setTrades] = useState<any[]>(priceWorkSettingsCache.trades);
    const [rows, setRows] = useState<PricingRow[]>(priceWorkSettingsCache.rows);
    const [pendingDeletedRows, setPendingDeletedRows] = useState<DeletedPricingRow[]>([]);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [serverSearchRowKeys, setServerSearchRowKeys] = useState<Set<string> | null>(null);
    const searchRequestIdRef = useRef(0);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
    const [projectPage, setProjectPage] = useState(0);
    const [projectColumnsPerPage, setProjectColumnsPerPage] = useState(DEFAULT_PROJECT_COLUMNS_PER_PAGE);
    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor),
    );

    const fetchSettingsTasks = useCallback(async () => {
        const response = await api.get('/pricework/settings/tasks');
        return Array.isArray(response.data?.info) ? response.data.info : [];
    }, []);

    const hydrateFromCache = useCallback(() => {
        setProjects(priceWorkSettingsCache.projects);
        setTrades(priceWorkSettingsCache.trades);
        setTasks(priceWorkSettingsCache.tasks);
        setUsers(priceWorkSettingsCache.users);
        setRows(priceWorkSettingsCache.rows);
        setPendingDeletedRows([]);
        setSelectedRowIds(new Set());
        hasLoadedOnceRef.current = true;
        setLoading(false);
    }, []);

    const writePriceWorkCache = useCallback((
        next: Partial<Omit<PriceWorkSettingsCache, 'loaded' | 'companyId' | 'fetchedAt'>>,
    ) => {
        priceWorkSettingsCache = {
            ...priceWorkSettingsCache,
            ...next,
            loaded: true,
            companyId: user?.company_id ?? priceWorkSettingsCache.companyId,
            fetchedAt: Date.now(),
        };
    }, [user?.company_id]);

    const fetchData = useCallback(async (forceRefresh = false) => {
        if (!user?.company_id) {
            setLoading(false);
            return;
        }

        if (!forceRefresh && isPriceWorkCacheWarm(user.company_id)) {
            hydrateFromCache();
            return;
        }

        if (!hasLoadedOnceRef.current) {
            setLoading(true);
        }
        try {
            const [resResources, resTasks, resSavedPrices] = await Promise.all([
                api.get('/pricework/get-resources').catch((err) => {
                    console.error('Error fetching pricework resources', err);
                    return {data: {projects: [], trades: [], users: []}};
                }),
                fetchSettingsTasks().catch((err) => {
                    console.error('Error fetching price work tasks', err);
                    return [];
                }),
                api.get('/pricework/settings/prices').catch((err) => {
                    console.error('Error fetching saved price work settings', err);
                    return {data: {info: []}};
                }),
            ]);

            const taskList = Array.isArray(resTasks) ? resTasks : resTasks.data?.info || [];
            const priceworkTasks = taskList.filter(isPriceworkTask);
            const savedPrices = Array.isArray(resSavedPrices.data?.info) ? resSavedPrices.data.info : [];
            const nextProjects = resResources.data?.projects || [];
            const nextTrades = resResources.data?.trades || [];
            const nextUsers = resResources.data?.users || [];
            const storedRowOrder = readStoredRowOrder(user.company_id);
            const cachedRowOrder = priceWorkSettingsCache.rows.map(getPricingRowOrderKey);
            const nextRows = preserveRowOrder(
                buildRowsFromSavedPrices(savedPrices, priceworkTasks),
                storedRowOrder.length > 0 ? storedRowOrder : cachedRowOrder,
            );

            writePriceWorkCache({
                tasks: priceworkTasks,
                projects: nextProjects,
                users: nextUsers,
                trades: nextTrades,
                rows: nextRows,
            });

            setProjects(nextProjects);
            setTrades(nextTrades);
            setTasks(priceworkTasks);
            setUsers(nextUsers);
            setRows(nextRows);
            setPendingDeletedRows([]);
            setSelectedRowIds(new Set());
            hasLoadedOnceRef.current = true;
        } catch (err) {
            console.error('Failed to load price work settings:', err);
            toast.error('Failed to load price work settings');
        } finally {
            setLoading(false);
        }
    }, [fetchSettingsTasks, hydrateFromCache, user?.company_id, writePriceWorkCache]);

    const syncSavedRows = (savedRows: PricingRow[]) => {
        const savedRowIds = new Set(savedRows.map((row) => row.id));

        setRows((prev) => {
            const nextRows = prev
                .filter((row) => !isEmptyPricingRow(row))
                .map((row) => {
                    if (!savedRowIds.has(row.id)) return row;

                    const projectPrices = Object.entries(row.project_prices).reduce<Record<string, CellState>>(
                        (prices, [projectId, value]) => {
                            prices[projectId] = {
                                ...value,
                                original_is_active: value.is_active,
                                original_price: value.price,
                            };
                            return prices;
                        },
                        {},
                    );

                    return {
                        ...row,
                        original_user_id: row.user_id || null,
                        original_task_id: row.task_id,
                        original_base_active: row.base_active,
                        original_base_price: row.base_active ? row.base_price : '0.00',
                        project_prices: projectPrices,
                    };
                });

            writePriceWorkCache({
                tasks,
                projects,
                users,
                trades,
                rows: nextRows,
            });
            saveStoredRowOrder(user?.company_id, nextRows);

            return nextRows;
        });

        setPendingDeletedRows([]);
        setSelectedRowIds(new Set());
    };

    const isInitialLoading = loading && rows.length === 0 && projects.length === 0 && tasks.length === 0;

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, PRICE_WORK_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [searchTerm]);

    useEffect(() => {
        const requestId = ++searchRequestIdRef.current;
        const term = debouncedSearchTerm;
        const projectIds = selectedProjectFilter ? String(selectedProjectFilter) : '';

        if (!term && !projectIds) {
            setServerSearchRowKeys(null);
            return;
        }

        const params: {search?: string; project_ids?: string} = {};
        if (term) params.search = term;
        if (projectIds) params.project_ids = projectIds;

        let cancelled = false;

        (async () => {
            try {
                const res = await api.get('/pricework/settings/prices', {params});
                if (cancelled || requestId !== searchRequestIdRef.current) return;

                const savedPrices = Array.isArray(res.data?.info) ? res.data.info : [];
                const nextRows = buildRowsFromSavedPrices(savedPrices, tasks);
                setServerSearchRowKeys(new Set(nextRows.map(getPricingRowOrderKey)));
            } catch (err) {
                if (cancelled || requestId !== searchRequestIdRef.current) return;
                console.error('Error filtering price work settings', err);
                setServerSearchRowKeys(term ? new Set() : null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedSearchTerm, selectedProjectFilter, tasks]);

    useEffect(() => {
        setProjectPage(0);
    }, [selectedProjectFilter]);

    const taskMap = useMemo(() => {
        return tasks.reduce<Record<string, any>>((map, task) => {
            map[String(task.id)] = task;
            return map;
        }, {});
    }, [tasks]);

    const tradeOptions = useMemo(() => {
        const priceworkTradeIds = new Set(
            tasks
                .filter(isPriceworkTask)
                .map(getTaskTradeId)
                .filter(Boolean),
        );

        return trades
            .filter((trade) => priceworkTradeIds.has(String(trade.id)))
            .map((trade) => ({
                id: String(trade.id),
                name: trade.name || 'Trade',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [tasks, trades]);

    const userOptions = useMemo(() => {
        const uniqueUsers = Array.from(
            new Map(users.map((user) => [String(user.id), user])).values(),
        );

        return uniqueUsers
            .map((user) => ({
                ...user,
                id: String(user.id),
                name: getUserDisplayName(user),
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users]);

    const displayedProjects = useMemo(() => {
        const availableProjects = selectedProjectFilter
            ? projects.filter((project) => String(project.id) === selectedProjectFilter)
            : projects;

        if (selectedProjectFilter) return availableProjects;

        const start = projectPage * projectColumnsPerPage;
        return availableProjects.slice(start, start + projectColumnsPerPage);
    }, [projectColumnsPerPage, projectPage, projects, selectedProjectFilter]);

    const projectColumnCount = selectedProjectFilter ? displayedProjects.length : projects.length;
    const projectPageCount = Math.max(1, Math.ceil(projectColumnCount / projectColumnsPerPage));
    const projectColumnStart = projectColumnCount === 0 ? 0 : projectPage * projectColumnsPerPage + 1;
    const projectColumnEnd = Math.min(projectColumnCount, (projectPage + 1) * projectColumnsPerPage);

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        if (!serverSearchRowKeys) return rows;

        return rows.filter((row) => {
            if (!row.original_task_id) return true;

            return serverSearchRowKeys.has(getPricingRowOrderKey(row));
        });
    }, [rows, searchTerm, serverSearchRowKeys]);

    const selectedVisibleRowIds = useMemo(
        () => filteredRows.filter((row) => selectedRowIds.has(row.id)).map((row) => row.id),
        [filteredRows, selectedRowIds],
    );

    const rowVirtualizer = useVirtualizer({
        count: filteredRows.length,
        getScrollElement: () => tableScrollEl,
        estimateSize: () => PRICE_WORK_ROW_HEIGHT,
        overscan: isDragging ? filteredRows.length : 20,
        getItemKey: (index) => filteredRows[index]?.id ?? index,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();
    const firstVirtualIndex = virtualItems[0]?.index;
    const lastVirtualIndex = virtualItems[virtualItems.length - 1]?.index;
    const [keptRange, setKeptRange] = useState({start: 0, end: -1});

    useLayoutEffect(() => {
        setKeptRange({start: 0, end: -1});
    }, [searchTerm, selectedProjectFilter]);

    useLayoutEffect(() => {
        if (isDragging && filteredRows.length > 0) {
            setKeptRange({start: 0, end: filteredRows.length - 1});
        }
    }, [filteredRows.length, isDragging]);

    useLayoutEffect(() => {
        if (firstVirtualIndex == null || lastVirtualIndex == null) return;

        setKeptRange((prev) => {
            if (prev.end < 0) return {start: firstVirtualIndex, end: lastVirtualIndex};

            const nextStart = Math.min(prev.start, firstVirtualIndex);
            const nextEnd = Math.max(prev.end, lastVirtualIndex);
            if (nextStart === prev.start && nextEnd === prev.end) return prev;

            return {start: nextStart, end: nextEnd};
        });
    }, [firstVirtualIndex, lastVirtualIndex]);

    const renderStart = keptRange.end < 0
        ? (virtualItems[0]?.index ?? 0)
        : Math.max(0, Math.min(keptRange.start, filteredRows.length - 1));
    const renderEnd = keptRange.end < 0
        ? (virtualItems[virtualItems.length - 1]?.index ?? -1)
        : Math.min(keptRange.end, filteredRows.length - 1);
    const virtualRows = useMemo(
        () => (renderEnd < renderStart ? [] : filteredRows.slice(renderStart, renderEnd + 1)),
        [filteredRows, renderEnd, renderStart],
    );
    const virtualPaddingTop = renderStart > 0 ? renderStart * PRICE_WORK_ROW_HEIGHT : 0;
    const virtualPaddingBottom = renderEnd >= 0
        ? Math.max(0, (filteredRows.length - renderEnd - 1) * PRICE_WORK_ROW_HEIGHT)
        : 0;
    const matrixColumnCount = 8 + displayedProjects.length;
    const sortableRowIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);

    useEffect(() => {
        if (!tableScrollEl || filteredRows.length === 0) return;
        rowVirtualizer.scrollToIndex(0, {align: 'start'});
    }, [projectPage, searchTerm, selectedProjectFilter, tableScrollEl]);

    const isAllVisibleSelected = filteredRows.length > 0 && selectedVisibleRowIds.length === filteredRows.length;
    const isSomeVisibleSelected = selectedVisibleRowIds.length > 0 && selectedVisibleRowIds.length < filteredRows.length;

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        setIsDragging(false);

        if (!over || active.id === over.id) return;

        setRows((prev) => {
            const oldIndex = prev.findIndex((row) => row.id === String(active.id));
            const newIndex = prev.findIndex((row) => row.id === String(over.id));

            if (oldIndex === -1 || newIndex === -1) return prev;

            const nextRows = arrayMove(prev, oldIndex, newIndex);
            saveStoredRowOrder(user?.company_id, nextRows);

            return nextRows;
        });
    };

    const selectMenuProps = {
        disablePortal: true,
        PaperProps: {
            sx: {
                mt: 0.5,
                maxHeight: 320,
                border: '1px solid #d9e2ef',
                borderRadius: '8px',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
                '& .MuiMenuItem-root': {
                    minHeight: 36,
                    px: 1.5,
                    fontSize: '0.8rem',
                    whiteSpace: 'normal',
                },
            },
        },
        MenuListProps: {dense: true, sx: {py: 0.5}},
    };

    const updateRow = useCallback((rowId: string, changes: Partial<PricingRow>) => {
        setRows((prev) => prev.map((row) => (row.id === rowId ? {...row, ...changes} : row)));
    }, []);

    const categoriesByTrade = useMemo(() => {
        const optionsByTrade = new Map<string, Array<{id: string; name: string}>>();
        const seenByTrade = new Map<string, Set<string>>();

        tasks.forEach((task) => {
            const tradeId = getTaskTradeId(task);
            const categoryId = getCategoryId(task);
            if (!tradeId || !categoryId) return;

            if (!optionsByTrade.has(tradeId)) {
                optionsByTrade.set(tradeId, []);
                seenByTrade.set(tradeId, new Set());
            }

            const seen = seenByTrade.get(tradeId);
            if (!seen || seen.has(categoryId)) return;
            seen.add(categoryId);
            optionsByTrade.get(tradeId)?.push({
                id: categoryId,
                name: task.category_name || 'Category',
            });
        });

        optionsByTrade.forEach((options) => options.sort((a, b) => a.name.localeCompare(b.name)));
        return optionsByTrade;
    }, [tasks]);

    const subCategoriesByTradeCategory = useMemo(() => {
        const optionsByKey = new Map<string, Array<{id: string; name: string; task_id: string}>>();
        const seenByKey = new Map<string, Set<string>>();

        tasks.forEach((task) => {
            const tradeId = getTaskTradeId(task);
            const categoryId = getCategoryId(task);
            const subCategoryId = getSubCategoryId(task);
            if (!tradeId || !categoryId || !subCategoryId) return;

            const key = `${tradeId}::${categoryId}`;
            if (!optionsByKey.has(key)) {
                optionsByKey.set(key, []);
                seenByKey.set(key, new Set());
            }

            const seen = seenByKey.get(key);
            if (!seen || seen.has(subCategoryId)) return;
            seen.add(subCategoryId);
            optionsByKey.get(key)?.push({
                id: subCategoryId,
                name: task.sub_category_name || 'Subcategory',
                task_id: String(task.id),
            });
        });

        optionsByKey.forEach((options) => options.sort((a, b) => a.name.localeCompare(b.name)));
        return optionsByKey;
    }, [tasks]);

    const getCategoryOptions = useCallback((tradeId: string) => (
        categoriesByTrade.get(tradeId) || EMPTY_NAMED_OPTIONS
    ), [categoriesByTrade]);

    const getSubCategoryOptions = useCallback((tradeId: string, categoryId: string) => (
        subCategoriesByTradeCategory.get(`${tradeId}::${categoryId}`) || EMPTY_SUB_CATEGORY_OPTIONS
    ), [subCategoriesByTradeCategory]);

    const findTaskForSelection = useCallback((tradeId: string, categoryId: string, subCategoryId: string) => {
        return tasks.find((task) =>
            getTaskTradeId(task) === tradeId &&
            getCategoryId(task) === categoryId &&
            getSubCategoryId(task) === subCategoryId,
        );
    }, [tasks]);

    const handleTradeChange = useCallback((rowId: string, tradeId: string) => {
        updateRow(rowId, {
            trade_id: tradeId,
            trade_name: trades.find((trade) => String(trade.id) === tradeId)?.name || '',
            category_id: '',
            category_name: '',
            sub_category_id: '',
            sub_category_name: '',
            task_id: '',
            base_active: false,
            base_price: '0.00',
            project_prices: {},
        });
    }, [trades, updateRow]);

    const handleUserChange = useCallback((rowId: string, userId: string) => {
        const selectedUser = users.find((item) => String(item.id) === userId);
        const selectedUserTradeId = selectedUser?.trade_id ? String(selectedUser.trade_id) : '';
        updateRow(rowId, {
            user_id: userId,
            user_name: selectedUser ? getUserDisplayName(selectedUser) : '',
            trade_id: selectedUserTradeId,
            trade_name: selectedUserTradeId
                ? trades.find((trade) => String(trade.id) === selectedUserTradeId)?.name || ''
                : '',
            category_id: '',
            category_name: '',
            sub_category_id: '',
            sub_category_name: '',
            task_id: '',
            base_active: false,
            base_price: '0.00',
            project_prices: {},
        });
    }, [trades, updateRow, users]);

    const handleCategoryChange = useCallback((rowId: string, categoryId: string) => {
        setRows((prev) => prev.map((row) => {
            if (row.id !== rowId) return row;

            const matchedTask = findTaskForSelection(row.trade_id, categoryId, '');
            const isNewRow = !row.original_task_id;
            return {
                ...row,
                category_id: categoryId,
                category_name: matchedTask?.category_name || '',
                sub_category_id: '',
                sub_category_name: '',
                task_id: matchedTask ? String(matchedTask.id) : '',
                base_active: isNewRow ? false : matchedTask ? Number(getTaskBasePrice(matchedTask)) > 0 : false,
                original_base_active: isNewRow ? false : row.original_base_active,
                base_price: isNewRow ? '0.00' : matchedTask ? getTaskBasePrice(matchedTask) : '0.00',
                original_base_price: isNewRow ? '0.00' : row.original_base_price,
                project_prices: {},
            };
        }));
    }, [findTaskForSelection]);

    const handleSubCategoryChange = useCallback((rowId: string, subCategoryId: string, taskId: string) => {
        setRows((prev) => prev.map((row) => {
            if (row.id !== rowId) return row;

            const matchedTask = taskMap[taskId] || findTaskForSelection(row.trade_id, row.category_id, subCategoryId);
            const isNewRow = !row.original_task_id;
            return {
                ...row,
                sub_category_id: subCategoryId,
                sub_category_name: matchedTask?.sub_category_name || '',
                task_id: matchedTask ? String(matchedTask.id) : '',
                base_active: isNewRow ? false : matchedTask ? Number(getTaskBasePrice(matchedTask)) > 0 : false,
                original_base_active: isNewRow ? false : row.original_base_active,
                base_price: isNewRow ? '0.00' : matchedTask ? getTaskBasePrice(matchedTask) : '0.00',
                original_base_price: isNewRow ? '0.00' : row.original_base_price,
                project_prices: {},
            };
        }));
    }, [findTaskForSelection, taskMap]);

    const handleToggleBaseActive = useCallback((rowId: string) => {
        setRows((prev) => prev.map((row) => (
            row.id === rowId ? {...row, base_active: !row.base_active} : row
        )));
    }, []);

    const handleCommitBasePrice = useCallback((rowId: string, price: string) => {
        updateRow(rowId, {base_price: price});
    }, [updateRow]);

    const handleToggleProjectActive = useCallback((
        rowId: string,
        projectId: number,
        nextActive: boolean,
        fallbackPrice: string,
    ) => {
        const projectKey = String(projectId);
        setRows((prev) => prev.map((current) => {
            if (current.id !== rowId) return current;

            const existing = current.project_prices[projectKey];
            return {
                ...current,
                project_prices: {
                    ...current.project_prices,
                    [projectKey]: {
                        is_active: nextActive,
                        original_is_active: existing?.original_is_active,
                        original_price: existing?.original_price,
                        price: existing?.price ?? current.base_price ?? fallbackPrice,
                    },
                },
            };
        }));
    }, []);

    const handleCommitProjectPrice = useCallback((rowId: string, projectId: number, price: string) => {
        const projectKey = String(projectId);
        setRows((prev) => prev.map((current) => {
            if (current.id !== rowId) return current;

            const existing = current.project_prices[projectKey];
            return {
                ...current,
                project_prices: {
                    ...current.project_prices,
                    [projectKey]: {
                        is_active: existing?.is_active ?? false,
                        original_is_active: existing?.original_is_active,
                        original_price: existing?.original_price,
                        price,
                    },
                },
            };
        }));
    }, []);

    const handleAddBelow = useCallback((rowId: string) => {
        setRows((prev) => {
            const sourceRow = prev.find((row) => row.id === rowId);
            if (!sourceRow) return prev;

            const sourceIndex = prev.findIndex((row) => row.id === rowId);
            const selectedUser = users.find((item) => String(item.id) === sourceRow.user_id);
            const selectedUserTradeId = selectedUser?.trade_id ? String(selectedUser.trade_id) : sourceRow.trade_id;
            const newRow = {
                ...createRow(),
                user_id: sourceRow.user_id,
                user_name: selectedUser ? getUserDisplayName(selectedUser) : sourceRow.user_name,
                trade_id: selectedUserTradeId || '',
                trade_name: selectedUserTradeId
                    ? trades.find((trade) => String(trade.id) === selectedUserTradeId)?.name || sourceRow.trade_name || ''
                    : '',
            };
            const insertIndex = sourceIndex === -1 ? prev.length : sourceIndex + 1;
            const nextRows = [
                ...prev.slice(0, insertIndex),
                newRow,
                ...prev.slice(insertIndex),
            ];

            saveStoredRowOrder(user?.company_id, nextRows);

            return nextRows;
        });
    }, [trades, user?.company_id, users]);

    const handleRemoveRow = useCallback((rowId: string) => {
        setRows((prev) => {
            const rowToRemove = prev.find((row) => row.id === rowId);

            if (rowToRemove?.original_task_id) {
                setPendingDeletedRows((pending) => {
                    const deletedRow = {
                        task_id: Number(rowToRemove.original_task_id),
                        user_id: rowToRemove.original_user_id ? Number(rowToRemove.original_user_id) : null,
                    };
                    const alreadyQueued = pending.some((row) =>
                        row.task_id === deletedRow.task_id &&
                        row.user_id === deletedRow.user_id,
                    );

                    return alreadyQueued ? pending : [...pending, deletedRow];
                });
            }

            return prev.filter((row) => row.id !== rowId);
        });
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            next.delete(rowId);
            return next;
        });
    }, []);

    const addRow = () => {
        setRows((prev) => {
            const nextRows = [...prev, createRow()];
            saveStoredRowOrder(user?.company_id, nextRows);

            return nextRows;
        });
    };

    const toggleRowSelection = useCallback((rowId: string) => {
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) next.delete(rowId);
            else next.add(rowId);
            return next;
        });
    }, []);

    const toggleVisibleRowsSelection = (checked: boolean) => {
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            filteredRows.forEach((row) => {
                if (checked) next.add(row.id);
                else next.delete(row.id);
            });
            return next;
        });
    };

    const deleteSelectedRows = async () => {
        if (selectedRowIds.size === 0) return;

        const selectedRows = rows.filter((row) => selectedRowIds.has(row.id));
        const rowsForBackend = selectedRows
            .filter((row) => row.task_id)
            .map((row) => ({
                user_id: row.original_user_id || row.user_id ? Number(row.original_user_id || row.user_id) : null,
                task_id: Number(row.original_task_id || row.task_id),
            }));

        setDeleting(true);
        try {
            if (rowsForBackend.length > 0) {
                const res = await api.post('/pricework/settings/prices/bulk-delete', {rows: rowsForBackend});
                if (res.data?.IsSuccess === false) {
                    toast.error(res.data?.message || 'Failed to delete selected settings');
                    return;
                }
                toast.success(res.data?.message || 'Selected settings deleted successfully');
            }

            setRows((prev) => {
                const nextRows = prev.filter((row) => !selectedRowIds.has(row.id));
                writePriceWorkCache({
                    tasks,
                    projects,
                    users,
                    trades,
                    rows: nextRows,
                });
                return nextRows;
            });
            setSelectedRowIds(new Set());
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete selected settings');
        } finally {
            setDeleting(false);
        }
    };

    const handleSave = async () => {
        if (savingRef.current) return;

        const rowsToSave = rows.filter(isCompletePricingRow);
        const incompleteRows = rows
            .filter((row) => !isEmptyPricingRow(row) && !row.original_task_id)
            .filter((row) => !isCompletePricingRow(row));

        if (incompleteRows.length > 0) {
            toast.error('Select trade, category, and subcategory before saving price settings.');
            return;
        }

        const items: Array<{
            project_id: number;
            task_id: number;
            user_id: number | null;
            trade_id: number | null;
            category_id: number | null;
            sub_category_id: number | null;
            base_cost: number;
            base_active: boolean;
            project_active: boolean;
            price: number;
            is_active: boolean;
        }> = [];
        const basePriceItems = Array.from(
            rowsToSave.reduce<Map<string, {task_id: number; user_id: number | null; base_cost: number; base_active: boolean}>>((map, row) => {
                if (!row.task_id) return map;

                const originalPrice = row.original_base_price || getTaskBasePrice(taskMap[row.task_id]);
                const currentPrice = row.base_active ? row.base_price : '0.00';

                if (
                    row.base_active === row.original_base_active &&
                    Number(currentPrice || 0) === Number(originalPrice || 0)
                ) return map;

                map.set(`${row.user_id || 'unassigned'}-${row.task_id}`, {
                    task_id: Number(row.task_id),
                    user_id: row.user_id ? Number(row.user_id) : null,
                    base_cost: Number(currentPrice) || 0,
                    base_active: row.base_active,
                });

                return map;
            }, new Map()).values(),
        );

        const changedRows = rows
            .filter((row) =>
                row.original_task_id &&
                row.original_user_id !== undefined &&
                isCompletePricingRow(row) &&
                (
                    row.original_task_id !== row.task_id ||
                    row.original_user_id !== row.user_id
                ),
            )
            .map((row) => ({
                task_id: Number(row.original_task_id),
                user_id: row.original_user_id ? Number(row.original_user_id) : null,
            }));

        const deletedRows: DeletedPricingRow[] = [...pendingDeletedRows, ...changedRows].filter((row, index, allRows) =>
            allRows.findIndex((item) =>
                item.task_id === row.task_id &&
                item.user_id === row.user_id,
            ) === index,
        );

        // const userTradeItems = Array.from(
        //     rowsToSave.reduce<Map<string, {user_id: number; trade_id: number}>>((map, row) => {
        //         if (!row.user_id || !row.trade_id) return map;
        //
        //         map.set(row.user_id, {
        //             user_id: Number(row.user_id),
        //             trade_id: Number(row.trade_id),
        //         });
        //
        //         return map;
        //     }, new Map()).values(),
        // );

        rowsToSave.forEach((row) => {
            if (!row.task_id) return;

            Object.entries(row.project_prices).forEach(([projectId, value]) => {
                if (value.original_is_active && !value.is_active) {
                    deletedRows.push({
                        task_id: Number(row.task_id),
                        user_id: row.user_id ? Number(row.user_id) : null,
                        project_id: Number(projectId),
                    });
                    return;
                }

                if (!value.is_active) return;
                if (!isDirtyActiveProjectCell(value)) return;

                items.push({
                    task_id: Number(row.task_id),
                    project_id: Number(projectId),
                    user_id: row.user_id ? Number(row.user_id) : null,
                    trade_id: row.trade_id ? Number(row.trade_id) : null,
                    category_id: row.category_id ? Number(row.category_id) : null,
                    sub_category_id: row.sub_category_id ? Number(row.sub_category_id) : null,
                    base_cost: row.base_active ? Number(row.base_price) || 0 : 0,
                    base_active: row.base_active,
                    project_active: value.is_active,
                    price: Number(value.price) || 0,
                    is_active: value.is_active,
                });
            });

            const hasActiveProjectPrices = Object.values(row.project_prices).some((value) => value.is_active);

            if (row.base_active && !hasActiveProjectPrices && projects.length > 0) {
                const project = projects[0];
                items.push({
                    task_id: Number(row.task_id),
                    project_id: Number(project.id),
                    user_id: row.user_id ? Number(row.user_id) : null,
                    trade_id: row.trade_id ? Number(row.trade_id) : null,
                    category_id: row.category_id ? Number(row.category_id) : null,
                    sub_category_id: row.sub_category_id ? Number(row.sub_category_id) : null,
                    base_cost: Number(row.base_price) || 0,
                    base_active: true,
                    project_active: false,
                    price: Number(row.base_price) || 0,
                    is_active: false,
                });
            }
        });

        const uniqueDeletedRows = deletedRows.filter((row, index, allRows) =>
            allRows.findIndex((item) =>
                item.task_id === row.task_id &&
                item.user_id === row.user_id &&
                item.project_id === row.project_id,
            ) === index,
        );

        savingRef.current = true;
        setSaving(true);
        try {
            const res = await api.post('/pricework/settings/store-prices', {
                items,
                // user_trade_items: userTradeItems,
                deleted_rows: uniqueDeletedRows,
                base_price_items: basePriceItems,
            });

            if (res.data?.IsSuccess) {
                toast.success(res.data?.message || 'Settings saved!');
                syncSavedRows(rowsToSave);
                onSaveSuccess?.();
            } else {
                toast.error(res.data?.message || 'Failed to save settings');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save settings');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 2}}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap'}}>
                    <TextField
                        size="small"
                        placeholder="Search user, trade..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18}/>
                                </InputAdornment>
                            ),
                        }}
                        sx={{width: 220, bgcolor: '#fff', '& .MuiOutlinedInput-root': {borderRadius: '8px'}}}
                    />

                    <FormControl size="small" sx={{minWidth: 240, bgcolor: '#fff'}}>
                        <Select
                            value={selectedProjectFilter}
                            onChange={(event) => setSelectedProjectFilter(String(event.target.value))}
                            displayEmpty
                            MenuProps={selectMenuProps}
                            sx={{borderRadius: '8px', fontSize: '0.875rem', '& .MuiSelect-select': {py: 1}}}
                        >
                            <MenuItem value="">All projects</MenuItem>
                            {projects.length > 0 && (
                                <ListSubheader sx={{bgcolor: '#fff', lineHeight: '32px', fontSize: '0.75rem'}}>
                                    Filter by project
                                </ListSubheader>
                            )}
                            {projects.map((project) => (
                                <MenuItem key={project.id} value={String(project.id)}>
                                    {getProjectName(project)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {!selectedProjectFilter && projectColumnCount > DEFAULT_PROJECT_COLUMNS_PER_PAGE && (
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={projectPage === 0}
                                onClick={() => setProjectPage((prev) => Math.max(0, prev - 1))}
                                sx={{textTransform: 'none', minWidth: 70}}
                            >
                                Prev
                            </Button>

                            <Typography sx={{fontSize: '0.8rem', color: '#64748b', minWidth: 118, textAlign: 'center'}}>
                                Projects {projectColumnStart}-{projectColumnEnd} of {projectColumnCount}
                            </Typography>

                            <Button
                                size="small"
                                variant="outlined"
                                disabled={projectPage >= projectPageCount - 1}
                                onClick={() => setProjectPage((prev) => Math.min(projectPageCount - 1, prev + 1))}
                                sx={{textTransform: 'none', minWidth: 70}}
                            >
                                Next
                            </Button>

                            <FormControl size="small" sx={{minWidth: 88, bgcolor: '#fff'}}>
                                <Select
                                    value={String(projectColumnsPerPage)}
                                    onChange={(event) => {
                                        setProjectColumnsPerPage(Number(event.target.value));
                                        setProjectPage(0);
                                    }}
                                    sx={{borderRadius: '8px', fontSize: '0.8rem', '& .MuiSelect-select': {py: 0.75}}}
                                >
                                    {PROJECT_COLUMNS_PER_PAGE_OPTIONS.map((option) => (
                                        <MenuItem key={option} value={String(option)}>
                                            {option} cols
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </Box>

                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    {selectedRowIds.size > 0 && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={deleteSelectedRows}
                            disabled={deleting}
                            startIcon={<IconTrash size={18}/>}
                            sx={{textTransform: 'none', borderRadius: '8px', px: 2.25, py: 0.8, fontWeight: 700}}
                        >
                            {deleting ? 'Deleting...' : `Delete selected (${selectedRowIds.size})`}
                        </Button>
                    )}

                    <Tooltip title="Refresh price work settings">
                        <span>
                            <IconButton
                                color="primary"
                                onClick={() => fetchData(true)}
                                disabled={loading || saving || deleting}
                                aria-label="Refresh price work settings"
                            >
                                <IconRefresh size={18}/>
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Button
                        type="button"
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} color="inherit"/> : <IconDeviceFloppy size={18}/>}
                        sx={{
                            bgcolor: '#1976d2',
                            color: '#fff',
                            textTransform: 'none',
                            borderRadius: '8px',
                            minWidth: 146,
                            px: 3,
                            py: 0.8,
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(25, 118, 210, 0.3)',
                            '&:hover': {bgcolor: '#1565c0'},
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Box>
            </Box>

            <TableContainer
                ref={setTableScrollEl}
                component={Paper}
                elevation={0}
                sx={{
                    flex: 1,
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: 'calc(90vh - 160px)',
                }}
            >
                <Table stickyHeader size="small" sx={{borderCollapse: 'separate', borderSpacing: 0}}>
                    <TableHead>
                        <TableRow>
                            {[
                                ['drag-handle', '', 36],
                                ['select', '', 52],
                                ['user', 'User', 300],
                                ['trade', 'Trade', 210],
                                ['category', 'Category', 230],
                                ['subcategory', 'Subcategory', 230],
                                ['base-price', 'Base price', 150],
                            ].map(([key, label, width]) => (
                                <TableCell
                                    key={key}
                                    align={label ? 'left' : 'center'}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        fontWeight: 700,
                                        borderRight: '1px solid #e2e8f0',
                                        minWidth: width,
                                        color: '#1e293b',
                                    }}
                                >
                                    {key === 'select' && (
                                        <CustomCheckbox
                                            className="header-checkbox"
                                            checked={isAllVisibleSelected}
                                            indeterminate={isSomeVisibleSelected}
                                            disabled={filteredRows.length === 0}
                                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                toggleVisibleRowsSelection(event.target.checked);
                                            }}
                                        />
                                    )}
                                    {key !== 'select' && key !== 'drag-handle' ? label : null}
                                </TableCell>
                            ))}

                            {displayedProjects.map((project) => (
                                <TableCell
                                    key={project.id}
                                    align="center"
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        fontWeight: 700,
                                        minWidth: 165,
                                        color: '#1e293b',
                                        borderRight: '1px solid #e2e8f0',
                                        px: 1,
                                        py: 0.75,
                                    }}
                                >
                                    <Tooltip title={getProjectName(project)}>
                                        <Typography
                                            component="span"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                lineHeight: 1.2,
                                                maxWidth: 145,
                                                mx: 'auto',
                                            }}
                                        >
                                            {getProjectName(project)}
                                        </Typography>
                                    </Tooltip>
                                </TableCell>
                            ))}

                            <TableCell
                                align="center"
                                sx={{
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    minWidth: 80,
                                    color: '#1e293b',
                                }}
                            >
                                Action
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={() => setIsDragging(true)}
                        onDragCancel={() => setIsDragging(false)}
                        onDragEnd={handleDragEnd}
                    >
                    <TableBody>
                        {isInitialLoading && (
                            <TableRow>
                                <TableCell colSpan={8 + displayedProjects.length} align="center" sx={{py: 8}}>
                                    <CircularProgress/>
                                </TableCell>
                            </TableRow>
                        )}

                        {filteredRows.length > 0 && (
                            <SortableContext
                                items={sortableRowIds}
                                strategy={verticalListSortingStrategy}
                            >
                            <>
                                {virtualPaddingTop > 0 && (
                                    <TableRow sx={{height: virtualPaddingTop}}>
                                        <TableCell colSpan={matrixColumnCount} sx={{height: virtualPaddingTop, p: 0, border: 0}}/>
                                    </TableRow>
                                )}
                                {virtualRows.map((row) => (
                                    <PriceWorkMatrixRow
                                        key={row.id}
                                        row={row}
                                        displayedProjects={displayedProjects}
                                        userOptions={userOptions}
                                        tradeOptions={tradeOptions}
                                        categoryOptions={getCategoryOptions(row.trade_id)}
                                        subCategoryOptions={getSubCategoryOptions(row.trade_id, row.category_id)}
                                        selected={selectedRowIds.has(row.id)}
                                        selectedTaskName={taskMap[row.task_id]}
                                        onToggleSelect={toggleRowSelection}
                                        onUserChange={handleUserChange}
                                        onTradeChange={handleTradeChange}
                                        onCategoryChange={handleCategoryChange}
                                        onSubCategoryChange={handleSubCategoryChange}
                                        onToggleBaseActive={handleToggleBaseActive}
                                        onCommitBasePrice={handleCommitBasePrice}
                                        onToggleProjectActive={handleToggleProjectActive}
                                        onCommitProjectPrice={handleCommitProjectPrice}
                                        onAddBelow={handleAddBelow}
                                        onRemove={handleRemoveRow}
                                    />
                                ))}
                                {virtualPaddingBottom > 0 && (
                                    <TableRow sx={{height: virtualPaddingBottom}}>
                                        <TableCell colSpan={matrixColumnCount} sx={{height: virtualPaddingBottom, p: 0, border: 0}}/>
                                    </TableRow>
                                )}
                            </>
                            </SortableContext>
                        )}

                        {!isInitialLoading && (
                            <TableRow hover>
                                <TableCell sx={{borderRight: '1px solid #e2e8f0', py: 1, minWidth: 36}}/>
                                <TableCell sx={{borderRight: '1px solid #e2e8f0', py: 1, minWidth: 52}}/>
                                <TableCell sx={{borderRight: '1px solid #e2e8f0', py: 1, minWidth: 300}}>
                                    <Tooltip title="Add price work row">
                                        <IconButton
                                            size="small"
                                            onClick={addRow}
                                            sx={{width: 28, height: 28, '&:hover': {backgroundColor: 'transparent'}}}
                                        >
                                            <IconPlus size={18} color="#1976d2"/>
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                                <TableCell colSpan={5 + displayedProjects.length} sx={{py: 1}}/>
                            </TableRow>
                        )}
                    </TableBody>
                    </DndContext>
                </Table>
            </TableContainer>

            <Typography sx={{fontSize: '0.8rem', color: '#64748b', pl: 1}}>
                {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'}
            </Typography>
        </Box>
    );
};

export default TaskPricingMatrix;
