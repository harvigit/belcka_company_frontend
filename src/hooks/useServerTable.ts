import { useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';

interface UseServerTableOptions<TData> {
  data: TData[];
  columns: any[];
  fetchData: (...args: any[]) => Promise<void> | void;
  debounceDependencies?: any[];
  debounceTimeMs?: number;
  onSortingChange?: (updater: any) => void;
  onColumnVisibilityChange?: (updater: any) => void;
  manualSorting?: boolean;
  state?: any;
  getRowId?: (originalRow: TData, index: number, parent?: any) => string;
}

export function useServerTable<TData>({
  data,
  columns,
  fetchData,
  debounceDependencies = [],
  debounceTimeMs = 300,
  onSortingChange: controlledOnSortingChange,
  onColumnVisibilityChange,
  manualSorting = false,
  state: controlledState,
  getRowId,
}: UseServerTableOptions<TData>) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<any>({});

  const sorting = controlledState?.sorting !== undefined ? controlledState.sorting : internalSorting;
  const setSorting = controlledOnSortingChange || setInternalSorting;
  
  const rowSelection = controlledState?.rowSelection !== undefined ? controlledState.rowSelection : internalRowSelection;
  const setRowSelection = controlledState?.onRowSelectionChange || setInternalRowSelection;

  // Use a ref to keep track of the latest fetch function to avoid stale closures
  const fetchRef = useRef(fetchData);
  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);

  // Handle debounced fetch when dependencies like search or filters change
  useEffect(() => {
    const handler = setTimeout(() => {
      // If we're not on page 1, reset to page 1, which will trigger the pageIndex effect below
      if (pagination.pageIndex !== 0) {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      } else {
        // Otherwise fetch immediately
        fetchRef.current();
      }
    }, debounceTimeMs);

    return () => clearTimeout(handler);
  }, [...debounceDependencies, JSON.stringify(sorting)]);

  // Handle fetching when page changes
  useEffect(() => {
    fetchRef.current();
  }, [pagination.pageIndex, pagination.pageSize]);

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, sorting, pagination, rowSelection, ...controlledState },
    pageCount: pageCount,
    rowCount: totalRows,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: manualSorting,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  return {
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
    rowSelection,
    setRowSelection,
  };
}
