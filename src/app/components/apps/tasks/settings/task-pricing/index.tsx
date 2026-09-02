'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Autocomplete,
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
import {IconDeviceFloppy, IconPlus, IconSearch, IconTrash} from '@tabler/icons-react';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

interface TaskPricingMatrixProps {
    onSaveSuccess?: () => void;
}

type CellState = {
    is_active: boolean;
    original_is_active?: boolean;
    price: string;
};

type PricingRow = {
    id: string;
    user_id: string;
    user_name?: string;
    original_user_id?: string | null;
    trade_id: string;
    trade_name?: string;
    category_id: string;
    category_name?: string;
    sub_category_id: string;
    sub_category_name?: string;
    task_id: string;
    original_task_id?: string;
    base_active: boolean;
    original_base_active: boolean;
    base_price: string;
    original_base_price: string;
    project_prices: Record<string, CellState>;
};

type DeletedPricingRow = {
    task_id: number;
    user_id: number | null;
    project_id?: number;
};

const TASKS_PAGE_SIZE = 500;
const DEFAULT_PROJECT_COLUMNS_PER_PAGE = 8;
const PROJECT_COLUMNS_PER_PAGE_OPTIONS = [8, 12, 20];

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

const filterOptionsByWordStart = <T,>(
    options: T[],
    inputValue: string,
    getLabel: (option: T) => string,
) => {
    const searchWords = inputValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!searchWords.length) return options;

    return options.filter((option) =>
        searchWords.every((searchWord) =>
            getLabel(option)
                .toLowerCase()
                .split(/\s+/)
                .some((word) => word.startsWith(searchWord)),
        ),
    );
};

const getProjectName = (project: any) =>
    project?.name || project?.project_name || project?.address || '-';

const isPriceworkTask = (task: any) =>
    task?.shift_is_pricework === true ||
    task?.shift_is_pricework === 1 ||
    String(task?.shift_is_pricework || '').trim().toLowerCase() === 'true' ||
    String(task?.shift_name || '').trim().toLowerCase() === 'pricework' ||
    String(task?.shift_name || '').trim().toLowerCase() === 'price work';

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

        row.project_prices[projectId] = {
            is_active: getSavedPriceProjectActive(priceItem),
            original_is_active: getSavedPriceProjectActive(priceItem),
            price: priceItem?.price != null ? String(priceItem.price) : '0.00',
        };
    });

    return Array.from(groupedRows.values());
};

const TaskPricingMatrix: React.FC<TaskPricingMatrixProps> = ({onSaveSuccess}) => {
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null};

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [trades, setTrades] = useState<any[]>([]);
    const [rows, setRows] = useState<PricingRow[]>([]);
    const [pendingDeletedRows, setPendingDeletedRows] = useState<DeletedPricingRow[]>([]);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
    const [projectPage, setProjectPage] = useState(0);
    const [projectColumnsPerPage, setProjectColumnsPerPage] = useState(DEFAULT_PROJECT_COLUMNS_PER_PAGE);

    const fetchAllTasks = useCallback(async (companyId: number) => {
        const firstResponse = await api.get(
            `/tasks/get?company_id=${companyId}&page=1&limit=${TASKS_PAGE_SIZE}`,
        );
        const firstTasks = firstResponse.data?.info || [];
        const totalPages = Number(firstResponse.data?.data?.totalPages) || 1;

        if (totalPages <= 1) return firstTasks;

        const remainingResponses = await Promise.all(
            Array.from({length: totalPages - 1}, (_, index) =>
                api.get(`/tasks/get?company_id=${companyId}&page=${index + 2}&limit=${TASKS_PAGE_SIZE}`),
            ),
        );

        return remainingResponses.reduce(
            (allTasks: any[], response) => allTasks.concat(response.data?.info || []),
            firstTasks,
        );
    }, []);

    const fetchData = useCallback(async () => {
        if (!user?.company_id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [resResources, resTasks, resSavedPrices] = await Promise.all([
                api.get('/pricework/get-resources').catch((err) => {
                    console.error('Error fetching pricework resources', err);
                    return {data: {projects: [], trades: [], users: []}};
                }),
                fetchAllTasks(user.company_id).catch((err) => {
                    console.error('Error fetching tasks', err);
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

            setProjects(resResources.data?.projects || []);
            setTrades(resResources.data?.trades || []);
            setTasks(priceworkTasks);
            setUsers(resResources.data?.users || []);
            setRows(buildRowsFromSavedPrices(savedPrices, priceworkTasks));
            setPendingDeletedRows([]);
            setSelectedRowIds(new Set());
        } catch (err) {
            console.error('Failed to load price work settings:', err);
            toast.error('Failed to load price work settings');
        } finally {
            setLoading(false);
        }
    }, [fetchAllTasks, user?.company_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        return trades
            .map((trade) => ({
                id: String(trade.id),
                name: trade.name || 'Trade',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [trades]);

    const userOptions = useMemo(() => {
        return users
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
        const term = searchTerm.trim().toLowerCase();
        if (!term) return rows;

        return rows.filter((row) => {
            const selectedTask = taskMap[row.task_id];
            const selectedUser = users.find((item) => String(item.id) === row.user_id);
            const searchable = [
                getUserDisplayName(selectedUser || {}),
                selectedTask?.trade_name,
                selectedTask?.category_name,
                selectedTask?.sub_category_name,
            ].join(' ').toLowerCase();

            return searchable.includes(term);
        });
    }, [rows, searchTerm, taskMap, users]);

    const selectedVisibleRowIds = useMemo(
        () => filteredRows.filter((row) => selectedRowIds.has(row.id)).map((row) => row.id),
        [filteredRows, selectedRowIds],
    );

    const isAllVisibleSelected = filteredRows.length > 0 && selectedVisibleRowIds.length === filteredRows.length;
    const isSomeVisibleSelected = selectedVisibleRowIds.length > 0 && selectedVisibleRowIds.length < filteredRows.length;

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

    const tableAutocompleteSlotProps = {
        paper: {
            sx: {
                mt: 0.5,
                border: '1px solid #d9e2ef',
                borderRadius: '8px',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
                '& .MuiAutocomplete-option': {
                    minHeight: 36,
                    px: 1.5,
                    fontSize: '0.8rem',
                    whiteSpace: 'normal',
                },
            },
        },
        listbox: {
            sx: {
                py: 0.5,
                maxHeight: 260,
            },
        },
    };

    const tableAutocompleteSx = {
        '& .MuiOutlinedInput-root': {
            minHeight: 36,
            bgcolor: '#fff',
            fontSize: '0.8rem',
            py: 0,
            borderRadius: '8px',
        },
        '& .MuiAutocomplete-input': {
            minWidth: '0 !important',
            fontSize: '0.8rem',
        },
    };

    const updateRow = (rowId: string, changes: Partial<PricingRow>) => {
        setRows((prev) => prev.map((row) => (row.id === rowId ? {...row, ...changes} : row)));
    };

    const getCategoryOptions = (tradeId: string) => {
        const categoryMap = new Map<string, {id: string; name: string}>();

        tasks
            .filter((task) => getTaskTradeId(task) === tradeId)
            .forEach((task) => {
                const categoryId = getCategoryId(task);
                if (!categoryId || categoryMap.has(categoryId)) return;
                categoryMap.set(categoryId, {id: categoryId, name: task.category_name || 'Category'});
            });

        return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const getSubCategoryOptions = (tradeId: string, categoryId: string) => {
        const subCategoryMap = new Map<string, {id: string; name: string; task_id: string}>();

        tasks
            .filter((task) => getTaskTradeId(task) === tradeId && getCategoryId(task) === categoryId)
            .forEach((task) => {
                const subCategoryId = getSubCategoryId(task);
                if (!subCategoryId) return;

                if (subCategoryMap.has(subCategoryId)) return;
                subCategoryMap.set(subCategoryId, {
                    id: subCategoryId,
                    name: task.sub_category_name || 'Subcategory',
                    task_id: String(task.id),
                });
            });

        return Array.from(subCategoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const findTaskForSelection = (tradeId: string, categoryId: string, subCategoryId: string) => {
        return tasks.find((task) =>
            getTaskTradeId(task) === tradeId &&
            getCategoryId(task) === categoryId &&
            getSubCategoryId(task) === subCategoryId,
        );
    };

    const handleTradeChange = (row: PricingRow, tradeId: string) => {
        updateRow(row.id, {
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
    };

    const handleUserChange = (row: PricingRow, userId: string) => {
        const selectedUserTradeId = users.find((item) => String(item.id) === userId)?.trade_id;
        const selectedUser = users.find((item) => String(item.id) === userId);
        handleTradeChange(row, selectedUserTradeId ? String(selectedUserTradeId) : '');
        updateRow(row.id, {
            user_id: userId,
            user_name: selectedUser ? getUserDisplayName(selectedUser) : '',
            trade_id: selectedUserTradeId ? String(selectedUserTradeId) : '',
            trade_name: selectedUserTradeId
                ? trades.find((trade) => String(trade.id) === String(selectedUserTradeId))?.name || ''
                : '',
        });
    };

    const handleCategoryChange = (row: PricingRow, categoryId: string) => {
        const matchedTask = findTaskForSelection(row.trade_id, categoryId, '');
        const isNewRow = !row.original_task_id;
        updateRow(row.id, {
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
        });
    };

    const handleSubCategoryChange = (row: PricingRow, subCategoryId: string, taskId: string) => {
        const matchedTask = taskMap[taskId] || findTaskForSelection(row.trade_id, row.category_id, subCategoryId);
        const isNewRow = !row.original_task_id;
        updateRow(row.id, {
            sub_category_id: subCategoryId,
            sub_category_name: matchedTask?.sub_category_name || '',
            task_id: matchedTask ? String(matchedTask.id) : '',
            base_active: isNewRow ? false : matchedTask ? Number(getTaskBasePrice(matchedTask)) > 0 : false,
            original_base_active: isNewRow ? false : row.original_base_active,
            base_price: isNewRow ? '0.00' : matchedTask ? getTaskBasePrice(matchedTask) : '0.00',
            original_base_price: isNewRow ? '0.00' : row.original_base_price,
            project_prices: {},
        });
    };

    const updateProjectPrice = (row: PricingRow, projectId: number, changes: Partial<CellState>) => {
        const projectKey = String(projectId);
        updateRow(row.id, {
            project_prices: {
                ...row.project_prices,
                [projectKey]: {
                    is_active: row.project_prices[projectKey]?.is_active ?? false,
                    price: row.project_prices[projectKey]?.price ?? row.base_price ?? '0.00',
                    ...changes,
                },
            },
        });
    };

    const addRow = () => {
        setRows((prev) => [...prev, createRow()]);
    };

    const removeRow = (rowId: string) => {
        const rowToRemove = rows.find((row) => row.id === rowId);

        if (rowToRemove?.original_task_id) {
            setPendingDeletedRows((prev) => {
                const deletedRow = {
                    task_id: Number(rowToRemove.original_task_id),
                    user_id: rowToRemove.original_user_id ? Number(rowToRemove.original_user_id) : null,
                };
                const alreadyQueued = prev.some((row) =>
                    row.task_id === deletedRow.task_id &&
                    row.user_id === deletedRow.user_id,
                );

                return alreadyQueued ? prev : [...prev, deletedRow];
            });
        }

        setRows((prev) => prev.filter((row) => row.id !== rowId));
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            next.delete(rowId);
            return next;
        });
    };

    const toggleRowSelection = (rowId: string) => {
        setSelectedRowIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowId)) next.delete(rowId);
            else next.add(rowId);
            return next;
        });
    };

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

            setRows((prev) => prev.filter((row) => !selectedRowIds.has(row.id)));
            setSelectedRowIds(new Set());
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete selected settings');
        } finally {
            setDeleting(false);
        }
    };

    const handleSave = async () => {
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
                await fetchData();
                onSaveSuccess?.();
            } else {
                toast.error(res.data?.message || 'Failed to save settings');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8}}>
                <CircularProgress/>
            </Box>
        );
    }

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

                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? null : <IconDeviceFloppy size={18}/>}
                        sx={{
                            bgcolor: '#1976d2',
                            color: '#fff',
                            textTransform: 'none',
                            borderRadius: '8px',
                            px: 3,
                            py: 0.8,
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(25, 118, 210, 0.3)',
                            '&:hover': {bgcolor: '#1565c0'},
                        }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit"/> : 'Save Changes'}
                    </Button>
                </Box>
            </Box>

            <TableContainer
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
                                ['', 52],
                                ['User', 230],
                                ['Trade', 210],
                                ['Category', 230],
                                ['Subcategory', 230],
                                ['Base price', 150],
                            ].map(([label, width]) => (
                                <TableCell
                                    key={label}
                                    align={label ? 'left' : 'center'}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        fontWeight: 700,
                                        borderRight: '1px solid #e2e8f0',
                                        minWidth: width,
                                        color: '#1e293b',
                                    }}
                                >
                                    {label || (
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

                    <TableBody>
                        {filteredRows.length > 0 && (
                            filteredRows.map((row) => {
                                const categoryOptions = getCategoryOptions(row.trade_id);
                                const subCategoryOptions = getSubCategoryOptions(row.trade_id, row.category_id);
                                const hasSubCategoryOptions = subCategoryOptions.length > 0;
                                const selectedTask = taskMap[row.task_id];
                                const selectedTrade = tradeOptions.find((trade) => trade.id === row.trade_id) ||
                                    (
                                        row.trade_id
                                            ? {
                                                id: row.trade_id,
                                                name: row.trade_name || selectedTask?.trade_name || 'Select trade',
                                            }
                                            : null
                                    );
                                const selectedUser = userOptions.find((user) => user.id === row.user_id) ||
                                    (
                                        row.user_id
                                            ? {
                                                id: row.user_id,
                                                name: row.user_name || 'Select user',
                                            }
                                            : null
                                    );
                                return (
                                    <TableRow key={row.id} hover>
                                        <TableCell align="center" sx={{borderRight: '1px solid #e2e8f0', minWidth: 52, py: 1}}>
                                            <CustomCheckbox
                                                checked={selectedRowIds.has(row.id)}
                                                onChange={() => toggleRowSelection(row.id)}
                                            />
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                                            <Autocomplete
                                                size="small"
                                                fullWidth
                                                options={userOptions}
                                                value={selectedUser}
                                                getOptionLabel={(option) => option.name || 'User'}
                                                filterOptions={(options, state) =>
                                                    filterOptionsByWordStart(options, state.inputValue, (option) => option.name || '')
                                                }
                                                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                                                onChange={(_, value) => {
                                                    handleUserChange(row, value ? String(value.id) : '');
                                                }}
                                                autoHighlight
                                                noOptionsText="No users found"
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        placeholder="Select user"
                                                    />
                                                )}
                                                slotProps={tableAutocompleteSlotProps}
                                                sx={tableAutocompleteSx}
                                            />
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 210, py: 1}}>
                                            <Autocomplete
                                                size="small"
                                                fullWidth
                                                options={tradeOptions}
                                                value={selectedTrade}
                                                getOptionLabel={(option) => option.name || 'Trade'}
                                                filterOptions={(options, state) =>
                                                    filterOptionsByWordStart(options, state.inputValue, (option) => option.name || '')
                                                }
                                                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                                                onChange={(_, value) => {
                                                    handleTradeChange(row, value ? String(value.id) : '');
                                                }}
                                                autoHighlight
                                                noOptionsText="No trades found"
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        placeholder="Select trade"
                                                    />
                                                )}
                                                slotProps={tableAutocompleteSlotProps}
                                                sx={tableAutocompleteSx}
                                            />
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value={row.category_id}
                                                    displayEmpty
                                                    disabled={!row.trade_id}
                                                    onChange={(event) => handleCategoryChange(row, String(event.target.value))}
                                                    renderValue={(selected) => {
                                                        if (!selected) return 'Select category';

                                                        return categoryOptions.find((category) => category.id === String(selected))?.name ||
                                                            row.category_name ||
                                                            selectedTask?.category_name ||
                                                            'Select category';
                                                    }}
                                                    MenuProps={selectMenuProps}
                                                    sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                                                >
                                                    <MenuItem value="">Select category</MenuItem>
                                                    {categoryOptions.map((category) => (
                                                        <MenuItem key={category.id} value={category.id}>
                                                            {category.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value={row.sub_category_id}
                                                    displayEmpty
                                                    disabled={!row.category_id || !hasSubCategoryOptions}
                                                    onChange={(event) => {
                                                        const selected = subCategoryOptions.find((item) => item.id === String(event.target.value));
                                                        handleSubCategoryChange(row, String(event.target.value), selected?.task_id || '');
                                                    }}
                                                    renderValue={(selected) => {
                                                        const selectedSubCategory = subCategoryOptions.find((item) =>
                                                            item.id === String(selected) &&
                                                            (!row.task_id || item.task_id === row.task_id),
                                                        );

                                                        if (selectedSubCategory) return selectedSubCategory.name;
                                                        if (!selected && row.task_id && row.category_id) return row.sub_category_name || selectedTask?.sub_category_name || '-';
                                                        if (!selected) return 'Select subcategory';

                                                        return row.sub_category_name || selectedTask?.sub_category_name || 'Select subcategory';
                                                    }}
                                                    MenuProps={selectMenuProps}
                                                    sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                                                >
                                                    <MenuItem value="">Select subcategory</MenuItem>
                                                    {subCategoryOptions.map((subCategory) => (
                                                        <MenuItem key={`${subCategory.id}-${subCategory.task_id}`} value={subCategory.id}>
                                                            {subCategory.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', px: 1, py: 1, minWidth: 150}}>
                                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
                                                <IOSSwitch
                                                    checked={row.base_active}
                                                    disabled={!row.task_id}
                                                    onChange={() => updateRow(row.id, {base_active: !row.base_active})}
                                                />

                                                <TextField
                                                    size="small"
                                                    value={row.base_active ? row.base_price : '0.00'}
                                                    disabled={!row.task_id || !row.base_active}
                                                    onChange={(event) => {
                                                        if (/^\d*(?:\.\d{0,2})?$/.test(event.target.value)) {
                                                            updateRow(row.id, {base_price: event.target.value});
                                                        }
                                                    }}
                                                    placeholder="0.00"
                                                    sx={{
                                                        width: 90,
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '0.825rem',
                                                            py: 0.5,
                                                            px: 0.5,
                                                            fontWeight: row.base_active ? 700 : 400,
                                                            color: row.base_active ? '#0f172a' : '#94a3b8',
                                                            textAlign: 'center',
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>

                                        {displayedProjects.map((project) => {
                                            const projectKey = String(project.id);
                                            const projectPrice = row.project_prices[projectKey];
                                            const isProjectActive = projectPrice?.is_active ?? false;

                                            return (
                                                <TableCell
                                                    key={project.id}
                                                    align="center"
                                                    sx={{borderRight: '1px solid #e2e8f0', px: 1, py: 1, minWidth: 165}}
                                                >
                                                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1}}>
                                                        <IOSSwitch
                                                            checked={isProjectActive}
                                                            disabled={!row.task_id}
                                                            onChange={() => updateProjectPrice(row, Number(project.id), {
                                                                is_active: !isProjectActive,
                                                                price: projectPrice?.price ?? row.base_price ?? getTaskBasePrice(selectedTask),
                                                            })}
                                                        />

                                                        <TextField
                                                            size="small"
                                                            value={projectPrice?.price ?? row.base_price ?? '0.00'}
                                                            disabled={!row.task_id || !isProjectActive}
                                                            onChange={(event) => {
                                                                if (/^\d*(?:\.\d{0,2})?$/.test(event.target.value)) {
                                                                    updateProjectPrice(row, Number(project.id), {price: event.target.value});
                                                                }
                                                            }}
                                                            placeholder="0.00"
                                                            sx={{
                                                                width: 90,
                                                                '& .MuiInputBase-input': {
                                                                    fontSize: '0.825rem',
                                                                    py: 0.5,
                                                                    px: 0.5,
                                                                    fontWeight: isProjectActive ? 700 : 400,
                                                                    color: isProjectActive ? '#0f172a' : '#94a3b8',
                                                                    textAlign: 'center',
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell align="center" sx={{py: 1, minWidth: 80}}>
                                            <Tooltip title="Remove row">
                                                <IconButton
                                                    color="error"
                                                    size="small"
                                                    onClick={() => removeRow(row.id)}
                                                    aria-label="Remove price work row"
                                                >
                                                    <IconTrash size={18}/>
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}

                        <TableRow hover>
                            <TableCell sx={{borderRight: '1px solid #e2e8f0', py: 1}}/>
                            <TableCell sx={{borderRight: '1px solid #e2e8f0', py: 1}}>
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
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography sx={{fontSize: '0.8rem', color: '#64748b', pl: 1}}>
                {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'}
            </Typography>
        </Box>
    );
};

export default TaskPricingMatrix;
