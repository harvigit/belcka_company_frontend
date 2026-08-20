'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputAdornment,
    ListSubheader,
    MenuItem,
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
    Paper,
} from '@mui/material';
import {IconSearch} from '@tabler/icons-react';
import IOSSwitch from '@/app/components/common/IOSSwitch';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import toast from 'react-hot-toast';

interface TaskPricingMatrixProps {
    onSaveSuccess?: () => void;
}

const TASKS_PAGE_SIZE = 500;
const DEFAULT_ROWS_PER_PAGE = 50;
const DEFAULT_PROJECT_COLUMNS_PER_PAGE = 8;
const PROJECT_COLUMNS_PER_PAGE_OPTIONS = [8, 12, 20];

const getTaskUserName = (task: any) =>
    task.completed_by_name ||
    task.user_name ||
    task.created_by_name ||
    task.user?.name ||
    [task.user?.first_name, task.user?.last_name].filter(Boolean).join(' ') ||
    '-';

const getTaskBasePrice = (task: any) =>
    task.base_cost != null && task.base_cost !== '' ? String(task.base_cost) : '0.00';

const isAllProjectsTask = (task: any) =>
    String(task.project || '').toLowerCase() === 'all' ||
    !Array.isArray(task.project_ids) ||
    task.project_ids.length === 0;

const isTaskAvailableForProject = (task: any, projectId: number) =>
    isAllProjectsTask(task) ||
    task.project_ids.some((id: any) => String(id) === String(projectId));

const getTaskTradeId = (task: any) =>
    task.trade_id != null && task.trade_id !== '' ? String(task.trade_id) : '';

const getUserTradeId = (user: any) =>
    user.trade_id != null && user.trade_id !== '' ? String(user.trade_id) : '';

const getUserDisplayName = (user: any) =>
    user.name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    '-';

const getRowUserId = (row: any) =>
    row.row_user_id != null && row.row_user_id !== '' ? String(row.row_user_id) : '0';

const getMatrixKey = (taskId: number | string, projectId: number | string, userId?: number | string | null) =>
    `${taskId}_${projectId}_${userId ?? '0'}`;

const TaskPricingMatrix: React.FC<TaskPricingMatrixProps> = ({onSaveSuccess}) => {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [matrix, setMatrix] = useState<Record<string, { is_active: boolean; price: string }>>({});
    const [basePrices, setBasePrices] = useState<Record<string, string>>({});
    const [basePriceActive, setBasePriceActive] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
    const [projectPage, setProjectPage] = useState(0);
    const [projectColumnsPerPage, setProjectColumnsPerPage] = useState(DEFAULT_PROJECT_COLUMNS_PER_PAGE);

    const fetchAllTasks = async (companyId: number) => {
        const firstResponse = await api.get(
            `/tasks/get?company_id=${companyId}&page=1&limit=${TASKS_PAGE_SIZE}`,
        );
        const firstTasks = firstResponse.data?.info || [];
        const totalPages = Number(firstResponse.data?.data?.totalPages) || 1;

        if (totalPages <= 1) return firstTasks;

        const remainingResponses = await Promise.all(
            Array.from({length: totalPages - 1}, (_, index) =>
                api.get(
                    `/tasks/get?company_id=${companyId}&page=${index + 2}&limit=${TASKS_PAGE_SIZE}`,
                ),
            ),
        );

        return remainingResponses.reduce(
            (allTasks: any[], response) => allTasks.concat(response.data?.info || []),
            firstTasks,
        );
    };

    const fetchData = async () => {
        if (!user?.company_id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [resResources, resTasks, resPrices, resUsers] = await Promise.all([
                api.get('/pricework/get-resources').catch((err) => {
                    console.error('Error fetching pricework resources', err);
                    return {data: {projects: []}};
                }),
                fetchAllTasks(user.company_id).catch((err) => {
                    console.error('Error fetching tasks', err);
                    return [];
                }),
                api.get('/pricework/settings/prices?limit=2000').catch((err) => {
                    console.error('Error fetching project task prices', err);
                    return {data: {info: []}};
                }),
                api.get('/user/list').catch((err) => {
                    console.error('Error fetching users', err);
                    return {data: {info: []}};
                }),
            ]);

            const projectList = resResources.data?.projects || [];
            setProjects(projectList);

            const taskList = Array.isArray(resTasks) ? resTasks : resTasks.data?.info || [];
            setTasks(taskList);
            setUsers(resUsers.data?.info || []);
            setBasePrices(
                (taskList as any[]).reduce((prices: Record<string, string>, task: any) => {
                    prices[String(task.id)] = getTaskBasePrice(task);
                    return prices;
                }, {}),
            );
            setBasePriceActive(
                (taskList as any[]).reduce((active: Record<string, boolean>, task: any) => {
                    active[String(task.id)] = Number(getTaskBasePrice(task)) > 0;
                    return active;
                }, {}),
            );

            const priceList = resPrices.data?.info || [];
            const newMatrix: Record<string, { is_active: boolean; price: string }> = {};

            priceList.forEach((item: any) => {
                if (item.task_id && item.project_id) {
                    const key = getMatrixKey(item.task_id, item.project_id, item.user_id ?? 0);
                    newMatrix[key] = {
                        is_active: true,
                        price: item.price != null ? String(item.price) : '0.00',
                    };
                }
            });

            setMatrix(newMatrix);
        } catch (err) {
            console.error('Failed to load task pricing matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.company_id]);

    useEffect(() => {
        setPage(0);
        setProjectPage(0);
    }, [searchTerm, selectedProjectFilter]);

    const handleToggle = (taskId: number, projectId: number, userId: number | string | null, basePrice: string) => {
        const key = getMatrixKey(taskId, projectId, userId);
        setMatrix((prev) => {
            const current = prev[key];
            const nextIsActive = !current?.is_active;
            return {
                ...prev,
                [key]: {
                    is_active: nextIsActive,
                    price: current?.price || basePrice || '0.00',
                },
            };
        });
    };

    const handlePriceChange = (taskId: number, projectId: number, userId: number | string | null, val: string) => {
        if (/^\d*(?:\.\d{0,2})?$/.test(val)) {
            const key = getMatrixKey(taskId, projectId, userId);
            setMatrix((prev) => {
                const current = prev[key];
                return {
                    ...prev,
                    [key]: {
                        is_active: current?.is_active ?? true,
                        price: val,
                    },
                };
            });
        }
    };

    const handleBasePriceChange = (taskId: number, val: string) => {
        if (/^\d*(?:\.\d{0,2})?$/.test(val)) {
            setBasePrices((prev) => ({
                ...prev,
                [String(taskId)]: val,
            }));
        }
    };

    const handleBaseToggle = (taskId: number) => {
        setBasePriceActive((prev) => {
            const taskKey = String(taskId);
            const nextIsActive = !(prev[taskKey] ?? false);

            if (nextIsActive) {
                setBasePrices((currentPrices) => ({
                    ...currentPrices,
                    [taskKey]: currentPrices[taskKey] || '0.00',
                }));
            }

            return {
                ...prev,
                [taskKey]: nextIsActive,
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const items: Array<{
                project_id: number;
                task_id: number;
                user_id: number | null;
                price: number;
                is_active: boolean;
            }> = [];
            Object.entries(matrix).forEach(([key, val]) => {
                const [taskIdStr, projectIdStr, userIdStr] = key.split('_');
                const taskId = Number(taskIdStr);
                const projectId = Number(projectIdStr);
                const userId = Number(userIdStr);
                if (taskId && projectId) {
                    items.push({
                        task_id: taskId,
                        project_id: projectId,
                        user_id: userId > 0 ? userId : null,
                        price: Number(val.price) || 0,
                        is_active: val.is_active,
                    });
                }
            });

            const changedBasePrices = tasks.filter((task) => {
                const taskId = String(task.id);
                const originalPrice = getTaskBasePrice(task);
                const currentPrice = basePriceActive[taskId]
                    ? basePrices[taskId] ?? originalPrice
                    : '0.00';
                return Number(currentPrice || 0) !== Number(originalPrice || 0);
            });

            const [res] = await Promise.all([
                api.post('/pricework/settings/prices/batch', {items}),
                ...changedBasePrices.map((task) => {
                    const taskId = String(task.id);
                    const currentPrice = basePriceActive[taskId]
                        ? basePrices[taskId] ?? getTaskBasePrice(task)
                        : '0.00';
                    return api.post('/tasks/update', {
                        id: task.id,
                        company_id: user?.company_id,
                        base_cost: Number(currentPrice) || 0,
                    });
                }),
            ]);

            if (res.data?.IsSuccess) {
                toast.success(res.data?.message || 'Settings saved!');
                setTasks((prev) =>
                    prev.map((task) => ({
                        ...task,
                        base_cost: basePriceActive[String(task.id)]
                            ? basePrices[String(task.id)] ?? getTaskBasePrice(task)
                            : '0.00',
                    })),
                );
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

    const tradeUsersMap = useMemo(() => {
        return users.reduce<Record<string, any[]>>((map, companyUser) => {
            const tradeId = getUserTradeId(companyUser);
            if (!tradeId) return map;

            if (!map[tradeId]) map[tradeId] = [];
            if (!map[tradeId].some((item) => String(item.id) === String(companyUser.id))) {
                map[tradeId].push(companyUser);
            }
            return map;
        }, {});
    }, [users]);

    const getTaskTradeUsers = (task: any) => {
        const tradeId = getTaskTradeId(task);
        return tradeId ? tradeUsersMap[tradeId] || [] : [];
    };

    const taskUserRows = useMemo(() => {
        return tasks.flatMap((task) => {
            const tradeUsers = getTaskTradeUsers(task);
            if (tradeUsers.length === 0) {
                return [{...task, row_user_id: null, row_user_name: getTaskUserName(task)}];
            }

            return tradeUsers.map((tradeUser) => ({
                ...task,
                row_user_id: tradeUser.id,
                row_user_name: getUserDisplayName(tradeUser),
            }));
        });
    }, [tasks, tradeUsersMap]);

    const filteredTasks = useMemo(() => {
        if (!searchTerm.trim()) return taskUserRows;
        const term = searchTerm.toLowerCase();
        return taskUserRows.filter((t) => {
            const userStr = String(t.row_user_name || getTaskUserName(t)).toLowerCase();
            const tradeStr = String(t.trade_name || '').toLowerCase();
            const catStr = String(t.category_name || '').toLowerCase();
            const subCatStr = String(t.sub_category_name || '').toLowerCase();
            const projectStr = String(t.project || '').toLowerCase();
            const taskProjectStr = Array.isArray(t.projects)
                ? t.projects.map((project: any) => project.name).join(' ').toLowerCase()
                : '';
            return (
                userStr.includes(term) ||
                tradeStr.includes(term) ||
                catStr.includes(term) ||
                subCatStr.includes(term) ||
                projectStr.includes(term) ||
                taskProjectStr.includes(term)
            );
        });
    }, [taskUserRows, searchTerm]);

    const visibleTasks = useMemo(() => {
        if (!selectedProjectFilter) return filteredTasks;
        return filteredTasks.filter((task) =>
            isTaskAvailableForProject(task, Number(selectedProjectFilter)),
        );
    }, [filteredTasks, selectedProjectFilter]);

    const availableProjects = useMemo(() => {
        if (!selectedProjectFilter) return projects;
        return projects.filter((p) => String(p.id) === String(selectedProjectFilter));
    }, [projects, selectedProjectFilter]);

    const displayedProjects = useMemo(() => {
        if (selectedProjectFilter) return availableProjects;

        const start = projectPage * projectColumnsPerPage;
        return availableProjects.slice(start, start + projectColumnsPerPage);
    }, [availableProjects, projectColumnsPerPage, projectPage, selectedProjectFilter]);

    const projectColumnCount = availableProjects.length;
    const projectPageCount = Math.max(1, Math.ceil(projectColumnCount / projectColumnsPerPage));
    const projectColumnStart = projectColumnCount === 0 ? 0 : projectPage * projectColumnsPerPage + 1;
    const projectColumnEnd = Math.min(projectColumnCount, (projectPage + 1) * projectColumnsPerPage);

    const paginatedTasks = useMemo(() => {
        const start = page * rowsPerPage;
        return visibleTasks.slice(start, start + rowsPerPage);
    }, [visibleTasks, page, rowsPerPage]);

    const rowPageCount = Math.max(1, Math.ceil(visibleTasks.length / rowsPerPage));

    const handleCopyBasePriceToProject = (projectId: number) => {
        let copiedCount = 0;

        setMatrix((prev) => {
            const next = {...prev};

            visibleTasks.forEach((task) => {
                if (!isTaskAvailableForProject(task, projectId)) return;

                const taskId = String(task.id);
                const rowUserId = getRowUserId(task);
                const basePrice = basePriceActive[taskId]
                    ? basePrices[taskId] ?? getTaskBasePrice(task)
                    : '0.00';

                next[getMatrixKey(task.id, projectId, rowUserId)] = {
                    is_active: true,
                    price: basePrice || '0.00',
                };
                copiedCount += 1;
            });

            return next;
        });

        toast.success(`Copied base price to ${copiedCount} row${copiedCount === 1 ? '' : 's'}. Click Save Changes to store.`);
    };

    const paginationTable = useMemo(
        () => ({
            options: {manualPagination: false},
            getState: () => ({
                pagination: {
                    pageIndex: page,
                    pageSize: rowsPerPage,
                },
                rowSelection: {},
            }),
            getRowModel: () => ({rows: paginatedTasks}),
            getPageCount: () => rowPageCount,
            getCanPreviousPage: () => page > 0,
            getCanNextPage: () => page < rowPageCount - 1,
            setPageIndex: (nextPage: number) =>
                setPage(Math.max(0, Math.min(nextPage, rowPageCount - 1))),
            previousPage: () => setPage((prev) => Math.max(0, prev - 1)),
            nextPage: () => setPage((prev) => Math.min(rowPageCount - 1, prev + 1)),
            setPageSize: (nextPageSize: number) => {
                setRowsPerPage(nextPageSize);
                setPage(0);
            },
        }),
        [page, paginatedTasks, rowPageCount, rowsPerPage],
    );

    const handleProjectColumnsPerPageChange = (event: any) => {
        setProjectColumnsPerPage(Number(event.target.value));
        setProjectPage(0);
    };

    const projectSelectMenuProps = {
        disablePortal: true,
        anchorOrigin: {vertical: 'bottom', horizontal: 'left'} as const,
        transformOrigin: {vertical: 'top', horizontal: 'left'} as const,
        PaperProps: {
            sx: {
                mt: 0.5,
                maxHeight: 320,
                width: 260,
                maxWidth: 'calc(100vw - 48px)',
                border: '1px solid #d9e2ef',
                borderRadius: '8px',
                boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
                '& .MuiMenuItem-root': {
                    minHeight: 38,
                    px: 1.5,
                    fontSize: '0.875rem',
                    whiteSpace: 'normal',
                },
            },
        },
        MenuListProps: {
            dense: true,
            sx: {py: 0.5},
        },
    };

    if (loading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8}}>
                <CircularProgress/>
            </Box>
        );
    }

    return (
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
            {/* Top Filter and Save Bar */}
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap'}}>
                    <TextField
                        size="small"
                        placeholder="Search user, trade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18}/>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: 200,
                            bgcolor: '#fff',
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                            },
                        }}
                    />

                    <FormControl size="small" sx={{minWidth: 240, bgcolor: '#fff'}}>
                        <Select
                            value={selectedProjectFilter}
                            onChange={(e) => setSelectedProjectFilter(String(e.target.value))}
                            displayEmpty
                            MenuProps={projectSelectMenuProps}
                            sx={{
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                '& .MuiSelect-select': {
                                    py: 1,
                                },
                            }}
                        >
                            <MenuItem value="">All projects</MenuItem>
                            {projects.length > 0 && (
                                <ListSubheader sx={{bgcolor: '#fff', lineHeight: '32px', fontSize: '0.75rem'}}>
                                    Filter by project
                                </ListSubheader>
                            )}
                            {projects.map((project) => (
                                <MenuItem key={project.id} value={String(project.id)}>
                                    {project.name}
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
                                    onChange={handleProjectColumnsPerPageChange}
                                    sx={{
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        '& .MuiSelect-select': {py: 0.75},
                                    }}
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

                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    sx={{
                        bgcolor: '#1976d2',
                        color: '#fff',
                        textTransform: 'none',
                        borderRadius: '8px',
                        px: 3,
                        py: 0.8,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 6px rgba(25, 118, 210, 0.3)',
                        '&:hover': {bgcolor: '#1565c0'},
                    }}
                >
                    {saving ? <CircularProgress size={20} color="inherit"/> : 'Save Changes'}
                </Button>
            </Box>

            {/* Matrix Table Container */}
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
                            <TableCell
                                sx={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 3,
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    borderRight: '1px solid #e2e8f0',
                                    minWidth: 110,
                                    color: '#1e293b',
                                }}
                            >
                                User
                            </TableCell>
                            <TableCell
                                sx={{
                                    position: 'sticky',
                                    left: 110,
                                    zIndex: 3,
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    borderRight: '1px solid #e2e8f0',
                                    minWidth: 110,
                                    color: '#1e293b',
                                }}
                            >
                                Trade
                            </TableCell>
                            <TableCell
                                sx={{
                                    position: 'sticky',
                                    left: 220,
                                    zIndex: 3,
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    borderRight: '1px solid #e2e8f0',
                                    minWidth: 130,
                                    color: '#1e293b',
                                }}
                            >
                                Category
                            </TableCell>
                            <TableCell
                                sx={{
                                    position: 'sticky',
                                    left: 350,
                                    zIndex: 3,
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    borderRight: '1px solid #e2e8f0',
                                    minWidth: 140,
                                    color: '#1e293b',
                                }}
                            >
                                Subcatego
                            </TableCell>
                            <TableCell
                                sx={{
                                    position: 'sticky',
                                    left: 490,
                                    zIndex: 3,
                                    bgcolor: '#f8fafc',
                                    fontWeight: 700,
                                    borderRight: '2px solid #cbd5e1',
                                    minWidth: 100,
                                    color: '#1e293b',
                                }}
                            >
                                Base price
                            </TableCell>

                            {/* Dynamic Project Column Headers */}
                            {displayedProjects.map((project) => (
                                <TableCell
                                    key={project.id}
                                    align="center"
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        fontWeight: 700,
                                        minWidth: 160,
                                        color: '#1e293b',
                                        borderRight: '1px solid #e2e8f0',
                                        px: 1,
                                        py: 0.75,
                                    }}
                                >
                                    <Box
                                        sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5}}>
                                        <Tooltip title={project.name}>
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
                                                    maxWidth: 140,
                                                }}
                                            >
                                                {project.name}
                                            </Typography>
                                        </Tooltip>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleCopyBasePriceToProject(Number(project.id))}
                                            sx={{
                                                minWidth: 0,
                                                px: 0.75,
                                                py: 0.2,
                                                fontSize: '0.68rem',
                                                lineHeight: 1.2,
                                                textTransform: 'none',
                                                borderRadius: '6px',
                                            }}
                                        >
                                            Copy base price
                                        </Button>
                                    </Box>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {visibleTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5 + displayedProjects.length} align="center"
                                           sx={{py: 4, color: '#64748b'}}>
                                    No tasks found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedTasks.map((task) => {
                                const taskId = String(task.id);
                                const isBaseActive = basePriceActive[taskId] ?? false;
                                const basePriceFormatted = basePrices[taskId] ?? getTaskBasePrice(task);
                                const baseDisplayPrice = isBaseActive ? basePriceFormatted : '0.00';
                                const rowUserId = getRowUserId(task);
                                const displayUserName = task.row_user_name || getTaskUserName(task);

                                return (
                                    <TableRow
                                        key={`${task.id}_${rowUserId}`}
                                        hover
                                        sx={{'&:hover td': {bgcolor: '#f1f5f9'}}}
                                    >
                                        {/* Fixed Columns */}
                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 1,
                                                bgcolor: '#fff',
                                                borderRight: '1px solid #e2e8f0',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                                maxWidth: 180,
                                            }}
                                        >
                                            <Tooltip title={displayUserName}>
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                        WebkitLineClamp: 2,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {displayUserName}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 110,
                                                zIndex: 1,
                                                bgcolor: '#fff',
                                                borderRight: '1px solid #e2e8f0',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {task.trade_name || '-'}
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 220,
                                                zIndex: 1,
                                                bgcolor: '#fff',
                                                borderRight: '1px solid #e2e8f0',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {task.category_name || '-'}
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 350,
                                                zIndex: 1,
                                                bgcolor: '#fff',
                                                borderRight: '1px solid #e2e8f0',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            {task.sub_category_name || '-'}
                                        </TableCell>

                                        <TableCell
                                            sx={{
                                                position: 'sticky',
                                                left: 490,
                                                zIndex: 1,
                                                bgcolor: '#fff',
                                                borderRight: '2px solid #cbd5e1',
                                                px: 1,
                                                py: 1,
                                            }}
                                        >
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 1
                                            }}>
                                                <IOSSwitch
                                                    checked={isBaseActive}
                                                    onChange={() => handleBaseToggle(task.id)}
                                                />

                                                <TextField
                                                    size="small"
                                                    value={baseDisplayPrice}
                                                    onChange={(e) => handleBasePriceChange(task.id, e.target.value)}
                                                    disabled={!isBaseActive}
                                                    placeholder="0.00"

                                                    sx={{
                                                        width: 90,
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '0.825rem',
                                                            py: 0.5,
                                                            px: 0.5,
                                                            fontWeight: 700,
                                                            color: isBaseActive ? '#0f172a' : '#94a3b8',
                                                        },
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: '6px',
                                                            bgcolor: isBaseActive ? '#fff' : '#f8fafc',
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </TableCell>

                                        {/* Dynamic Project Cells */}
                                        {displayedProjects.map((project) => {
                                            const userKey = getMatrixKey(task.id, project.id, rowUserId);
                                            const fallbackKey = getMatrixKey(task.id, project.id, 0);
                                            const cellState = matrix[userKey] ?? matrix[fallbackKey];
                                            const isProjectAvailable = isTaskAvailableForProject(task, project.id);
                                            const isActive = isProjectAvailable && (cellState?.is_active ?? false);
                                            const priceVal = cellState?.price ?? baseDisplayPrice;

                                            return (
                                                <TableCell
                                                    key={project.id}
                                                    align="center"
                                                    sx={{borderRight: '1px solid #e2e8f0', px: 1.5, py: 1}}
                                                >
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 1
                                                    }}>
                                                        <IOSSwitch
                                                            checked={isActive}
                                                            disabled={!isProjectAvailable}
                                                            onChange={() => handleToggle(task.id, project.id, rowUserId, basePriceFormatted)}
                                                        />

                                                        <TextField
                                                            size="small"
                                                            value={isActive ? priceVal : baseDisplayPrice}
                                                            onChange={(e) => handlePriceChange(task.id, project.id, rowUserId, e.target.value)}
                                                            disabled={!isActive || !isProjectAvailable}
                                                            placeholder="0.00"
                                                            sx={{
                                                                width: 90,
                                                                '& .MuiInputBase-input': {
                                                                    fontSize: '0.825rem',
                                                                    py: 0.5,
                                                                    px: 0.5,
                                                                    fontWeight: isActive ? 600 : 400,
                                                                    color: isActive ? '#0f172a' : '#94a3b8',
                                                                },
                                                                '& .MuiOutlinedInput-root': {
                                                                    borderRadius: '6px',
                                                                    bgcolor: isActive ? '#fff' : '#f8fafc',
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePaginationFooter table={paginationTable} totalRows={visibleTasks.length}/>
        </Box>
    );
};

export default TaskPricingMatrix;
