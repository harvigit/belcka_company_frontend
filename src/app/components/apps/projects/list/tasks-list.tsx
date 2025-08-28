'use client';
import React, { useEffect, useState, useMemo } from 'react';
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
    Divider,
    IconButton,
    Stack,
    MenuItem,
    CircularProgress,
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
} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';

dayjs.extend(customParseFormat);

export type TaskList = {
    id: number;
    company_task_name: string;
    address_name: string;
    start_date?: string;
    end_date?: string;
    status_int: number;
    status_text: string;
    progress: string;
};

interface TasksListProps {
    projectId: number | null;
    searchTerm: string;
    filters: {
        status: string;
        sortOrder: string;
    };
}

const TasksList = ({ projectId, searchTerm, filters }: TasksListProps) => {
    const [data, setData] = useState<TaskList[]>([]);
    const [columnFilters, setColumnFilters] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
    const [sorting, setSorting] = useState<SortingState>([]);

    useEffect(() => {
        if (projectId) {
            const fetchTasks = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`project/get-tasks?project_id=${projectId}`);
                    if (res.data) {
                        setData(res.data.info);
                    }
                } catch (err) {
                    console.error('Failed to fetch tasks', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchTasks();
        }
    }, [projectId]);

    const formatDate = (date?: string) => {
        return dayjs(date ?? '').isValid() ? dayjs(date).format('DD/MM/YYYY') : '-';
    };

    const currentFilteredData = useMemo(() => {
        let filtered = data.filter((item) => {
            // Filter by status if specified
            const matchesStatus = filters.status ? item.status_text === filters.status : true;

            // Filter by search term
            const search = searchTerm.toLowerCase();
            const matchesSearch =
                item.company_task_name.toLowerCase().includes(search) ||
                item.address_name.toLowerCase().includes(search);

            return matchesStatus && matchesSearch;
        });

        // Apply sorting
        if (filters.sortOrder === 'asc') {
            filtered = filtered.sort((a, b) => a.company_task_name?.localeCompare(b.company_task_name));
        } else if (filters.sortOrder === 'desc') {
            filtered = filtered.sort((a, b) => b.company_task_name?.localeCompare(a.company_task_name));
        }

        return filtered;
    }, [data, searchTerm, filters]);

    const columnHelper = createColumnHelper<TaskList>();

    const columns = useMemo(() => {
        return [
            columnHelper.accessor('company_task_name', {
                id: 'company_task_name',
                header: () => (
                    <Stack direction="row" alignItems="center" spacing={4}>
                        <CustomCheckbox
                            checked={
                                selectedRowIds.size === data.length && data.length > 0
                            }
                            // indeterminate={
                            //     selectedRowIds.size > 0 && selectedRowIds.size < data.length
                            // }
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedRowIds(new Set(data.map((_, i) => i)));
                                } else {
                                    setSelectedRowIds(new Set());
                                }
                            }}
                        />
                        <Typography variant="subtitle2" fontWeight="inherit">
                            Tasks
                        </Typography>
                    </Stack>
                ),
                enableSorting: true,
                cell: ({ row }) => {
                    const item = row.original;
                    const isChecked = selectedRowIds.has(row.index);
                    return (
                        <Stack direction="row" alignItems="center" spacing={4} sx={{ pl: 0.2 }}>
                            <CustomCheckbox
                                checked={isChecked}
                                onChange={() => {
                                    const newSelected = new Set(selectedRowIds);
                                    isChecked ? newSelected.delete(row.index) : newSelected.add(row.index);
                                    setSelectedRowIds(newSelected);
                                }}
                            />
                            <Typography variant="h5">{item.company_task_name ?? '-'}</Typography>
                        </Stack>
                    );
                },
            }),

            columnHelper.accessor('address_name', {
                id: 'address_name',
                header: () => 'Address',
                cell: (info) => (
                    <Typography variant="h5" fontWeight={500}>
                        {info.getValue() ?? '-'}
                    </Typography>
                ),
            }),

            columnHelper.accessor('status_text', {
                id: 'status_text',
                header: () => 'Status',
                cell: (info) => {
                    const statusInt = info.row.original.status_int;
                    let color = 'textPrimary';
                    if (statusInt === 13) color = '#999999';
                    else if (statusInt === 4) color = '#32A852';
                    else if (statusInt === 3) color = '#FF7F00';

                    return (
                        <Typography variant="h5" color={color} fontWeight={700}>
                            {info.getValue() ?? '-'}
                        </Typography>
                    );
                },
            }),

            columnHelper.accessor('progress', {
                id: 'progress',
                header: () => 'Progress',
                cell: (info) => {
                    const statusInt = info.row.original.status_int;
                    let color = 'textPrimary';
                    if (statusInt === 13 || statusInt === 14 ) color = '#999999';
                    else if (statusInt === 4) color = '#32A852';
                    else if (statusInt === 3) color = '#FF7F00';

                    return (
                        <Typography variant="h5" color={color} fontWeight={700}>
                            {info.getValue() ?? '-'}
                        </Typography>
                    );
                },
            }),

            columnHelper.accessor('start_date', {
                id: 'start_date',
                header: () => 'Start date',
                cell: (info) => (
                    <Typography variant="h5" color="textPrimary">
                        {info.getValue()}
                    </Typography>
                ),
            }),

            columnHelper.accessor('end_date', {
                id: 'end_date',
                header: () => 'End date',
                cell: (info) => (
                    <Typography variant="h5" color="textPrimary">
                        {info.getValue()}
                    </Typography>
                ),
            }),
        ];
    }, [data, selectedRowIds]);

    const table = useReactTable<TaskList>({
        data: currentFilteredData,
        columns,
        state: { columnFilters, sorting },
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

    useEffect(() => {
        table.setPageIndex(0);
    }, [searchTerm, table]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            <Grid size={12}>
                <Box>
                    <TableContainer sx={{ maxHeight: 600 }}>
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
                                                        width:
                                                            header.column.id === 'actions' ? 120 : 'auto',
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
                                                            '&:hover': { color: '#888' },
                                                            '&:hover .hoverIcon': { opacity: 1 },
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight="inherit"
                                                        >
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
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
                                {table.getRowModel().rows.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} align="center">
                                            No records found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                <Divider />

                {/* PAGINATION */}
                <Stack
                    gap={1}
                    pr={3}
                    pt={1}
                    pl={3}
                    pb={3}
                    alignItems="center"
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                >
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography color="textSecondary">
                            {table.getPrePaginationRowModel().rows.length} Rows
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
                            <Typography color="textSecondary">Page</Typography>
                            <Typography color="textSecondary" fontWeight={600} ml={1}>
                                {table.getState().pagination.pageIndex + 1} of{' '}
                                {Math.max(1, table.getPageCount())}
                            </Typography>
                            <Typography color="textSecondary" ml={'3px'}>
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
                                sx={{ width: '30px' }}
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <IconChevronLeft />
                            </IconButton>
                            <IconButton
                                size="small"
                                sx={{ width: '30px' }}
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <IconChevronRight />
                            </IconButton>
                        </Stack>
                    </Box>
                </Stack>
            </Grid>
        </Grid>
    );
};

export default TasksList;
