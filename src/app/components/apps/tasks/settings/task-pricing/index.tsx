'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
    price: string;
};

type PricingRow = {
    id: string;
    user_id: string;
    trade_id: string;
    category_id: string;
    sub_category_id: string;
    task_id: string;
    base_active: boolean;
    base_price: string;
    project_prices: Record<string, CellState>;
};

const TASKS_PAGE_SIZE = 500;
const DEFAULT_PROJECT_COLUMNS_PER_PAGE = 8;
const PROJECT_COLUMNS_PER_PAGE_OPTIONS = [8, 12, 20];

const getTaskBasePrice = (task: any) =>
    task?.base_cost != null && task.base_cost !== '' ? String(task.base_cost) : '0.00';

const getTaskTradeId = (task: any) =>
    task?.trade_id != null && task.trade_id !== '' ? String(task.trade_id) : '';

const getUserDisplayName = (user: any) =>
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    '-';

const getProjectName = (project: any) =>
    project?.name || project?.project_name || project?.address || '-';

const isPriceworkTask = (task: any) =>
    task?.shift_is_pricework === true ||
    String(task?.shift_name || '').trim().toLowerCase() === 'pricework' ||
    String(task?.shift_name || '').trim().toLowerCase() === 'price work';

const getCategoryId = (task: any) =>
    task?.category_id != null && task.category_id !== '' ? String(task.category_id) : '';

const getSubCategoryId = (task: any) =>
    task?.sub_category_id != null && task.sub_category_id !== '' ? String(task.sub_category_id) : '';

const createRow = (): PricingRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: '',
    trade_id: '',
    category_id: '',
    sub_category_id: '',
    task_id: '',
    base_active: false,
    base_price: '0.00',
    project_prices: {},
});

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
            const [resResources, resTasks] = await Promise.all([
                api.get('/pricework/get-resources').catch((err) => {
                    console.error('Error fetching pricework resources', err);
                    return {data: {projects: [], trades: [], users: []}};
                }),
                fetchAllTasks(user.company_id).catch((err) => {
                    console.error('Error fetching tasks', err);
                    return [];
                }),
            ]);

            const taskList = Array.isArray(resTasks) ? resTasks : resTasks.data?.info || [];

            setProjects(resResources.data?.projects || []);
            setTrades(resResources.data?.trades || []);
            setTasks(taskList.filter(isPriceworkTask));
            setUsers(resResources.data?.users || []);
            setRows([]);
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
                if (!subCategoryId) {
                    subCategoryMap.set(`task-${task.id}`, {
                        id: '',
                        name: '-',
                        task_id: String(task.id),
                    });
                    return;
                }

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
            category_id: '',
            sub_category_id: '',
            task_id: '',
            base_active: false,
            base_price: '0.00',
            project_prices: {},
        });
    };

    const handleUserChange = (row: PricingRow, userId: string) => {
        const selectedUserTradeId = users.find((item) => String(item.id) === userId)?.trade_id;
        handleTradeChange(row, selectedUserTradeId ? String(selectedUserTradeId) : '');
        updateRow(row.id, {
            user_id: userId,
            trade_id: selectedUserTradeId ? String(selectedUserTradeId) : '',
        });
    };

    const handleCategoryChange = (row: PricingRow, categoryId: string) => {
        const matchedTask = findTaskForSelection(row.trade_id, categoryId, '');
        updateRow(row.id, {
            category_id: categoryId,
            sub_category_id: '',
            task_id: matchedTask ? String(matchedTask.id) : '',
            base_active: matchedTask ? Number(getTaskBasePrice(matchedTask)) > 0 : false,
            base_price: matchedTask ? getTaskBasePrice(matchedTask) : '0.00',
            project_prices: {},
        });
    };

    const handleSubCategoryChange = (row: PricingRow, subCategoryId: string, taskId: string) => {
        const matchedTask = taskMap[taskId] || findTaskForSelection(row.trade_id, row.category_id, subCategoryId);
        updateRow(row.id, {
            sub_category_id: subCategoryId,
            task_id: matchedTask ? String(matchedTask.id) : '',
            base_active: matchedTask ? Number(getTaskBasePrice(matchedTask)) > 0 : false,
            base_price: matchedTask ? getTaskBasePrice(matchedTask) : '0.00',
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
                user_id: row.user_id ? Number(row.user_id) : null,
                task_id: Number(row.task_id),
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
        const incompleteRows = rows
            .filter((row) =>
                row.category_id ||
                row.sub_category_id ||
                row.task_id ||
                row.base_active ||
                Object.keys(row.project_prices).length > 0
            )
            .filter((row) => !row.user_id || !row.trade_id || !row.category_id || !row.task_id);

        if (incompleteRows.length > 0) {
            toast.error('Select user, trade, category, and subcategory before saving price settings.');
            return;
        }

        const items: Array<{
            project_id: number;
            task_id: number;
            user_id: number | null;
            price: number;
            is_active: boolean;
        }> = [];

        const userTradeItems = Array.from(
            rows.reduce<Map<string, {user_id: number; trade_id: number}>>((map, row) => {
                if (!row.user_id || !row.trade_id) return map;

                map.set(row.user_id, {
                    user_id: Number(row.user_id),
                    trade_id: Number(row.trade_id),
                });

                return map;
            }, new Map()).values(),
        );

        rows.forEach((row) => {
            if (!row.task_id || !row.user_id) return;

            Object.entries(row.project_prices).forEach(([projectId, value]) => {
                items.push({
                    task_id: Number(row.task_id),
                    project_id: Number(projectId),
                    user_id: Number(row.user_id),
                    price: Number(value.price) || 0,
                    is_active: value.is_active,
                });
            });
        });

        setSaving(true);
        try {
            const basePriceUpdates = rows
                .filter((row) => row.task_id)
                .map((row) => {
                    const selectedTask = taskMap[row.task_id];
                    const originalPrice = getTaskBasePrice(selectedTask);
                    const currentPrice = row.base_active ? row.base_price : '0.00';

                    if (Number(currentPrice || 0) === Number(originalPrice || 0)) return null;

                    return api.post('/tasks/update', {
                        id: Number(row.task_id),
                        company_id: user?.company_id,
                        base_cost: Number(currentPrice) || 0,
                    });
                })
                .filter(Boolean);

            const [res] = await Promise.all([
                api.post('/pricework/settings/prices/batch', {items, user_trade_items: userTradeItems}),
                ...basePriceUpdates,
            ]);

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
                                const selectedTask = taskMap[row.task_id];

                                return (
                                    <TableRow key={row.id} hover>
                                        <TableCell align="center" sx={{borderRight: '1px solid #e2e8f0', minWidth: 52, py: 1}}>
                                            <CustomCheckbox
                                                checked={selectedRowIds.has(row.id)}
                                                onChange={() => toggleRowSelection(row.id)}
                                            />
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value={row.user_id}
                                                    displayEmpty
                                                    onChange={(event) => handleUserChange(row, String(event.target.value))}
                                                    MenuProps={selectMenuProps}
                                                    sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                                                >
                                                    <MenuItem value="">Select user</MenuItem>
                                                    {users.map((item) => (
                                                        <MenuItem key={item.id} value={String(item.id)}>
                                                            {getUserDisplayName(item)}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 210, py: 1}}>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value={row.trade_id}
                                                    displayEmpty
                                                    onChange={(event) => handleTradeChange(row, String(event.target.value))}
                                                    MenuProps={selectMenuProps}
                                                    sx={{height: 36, fontSize: '0.8rem', bgcolor: '#fff'}}
                                                >
                                                    <MenuItem value="">Select trade</MenuItem>
                                                    {tradeOptions.map((trade) => (
                                                        <MenuItem key={trade.id} value={trade.id}>
                                                            {trade.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        <TableCell sx={{borderRight: '1px solid #e2e8f0', minWidth: 230, py: 1}}>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value={row.category_id}
                                                    displayEmpty
                                                    disabled={!row.trade_id}
                                                    onChange={(event) => handleCategoryChange(row, String(event.target.value))}
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
                                                    disabled={!row.category_id}
                                                    onChange={(event) => {
                                                        const selected = subCategoryOptions.find((item) => item.id === String(event.target.value));
                                                        handleSubCategoryChange(row, String(event.target.value), selected?.task_id || '');
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
                                                            disabled={!row.task_id || !row.user_id}
                                                            onChange={() => updateProjectPrice(row, Number(project.id), {
                                                                is_active: !isProjectActive,
                                                                price: projectPrice?.price ?? row.base_price ?? getTaskBasePrice(selectedTask),
                                                            })}
                                                        />

                                                        <TextField
                                                            size="small"
                                                            value={projectPrice?.price ?? row.base_price ?? '0.00'}
                                                            disabled={!row.task_id || !row.user_id || !isProjectActive}
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
