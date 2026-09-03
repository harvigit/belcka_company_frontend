import { useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import api from '@/utils/axios';
import {
  axiosRequestHasPagination,
  axiosRequestHasSort,
  applyFetchAllPaginationToAxiosConfig,
} from '@/utils/tableSort';

interface UseServerTableOptions<TData> {
  data: TData[];
  columns: any[];
  fetchData: (...args: any[]) => Promise<void> | void;
  initialPagination?: { pageIndex: number; pageSize: number };
  debounceDependencies?: any[];
  debounceTimeMs?: number;
  onSortingChange?: (updater: any) => void;
  onColumnVisibilityChange?: (updater: any) => void;
  manualSorting?: boolean;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  shouldResetPageOnDebounce?: () => boolean;
  state?: any;
  getRowId?: (originalRow: TData, index: number, parent?: any) => string;
}

export function useServerTable<TData>({
  data,
  columns,
  fetchData,
  initialPagination,
  debounceDependencies = [],
  debounceTimeMs = 300,
  onSortingChange: controlledOnSortingChange,
  onColumnVisibilityChange,
  manualSorting = true,
  manualPagination = true,
  manualFiltering = true,
  shouldResetPageOnDebounce,
  state: controlledState,
  getRowId,
}: UseServerTableOptions<TData>) {
  const [pagination, setPagination] = useState(initialPagination ?? { pageIndex: 0, pageSize: 50 });
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<any>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<any>({});

  const sorting = controlledState?.sorting !== undefined ? controlledState.sorting : internalSorting;
  const setSorting = controlledOnSortingChange || setInternalSorting;
  
  const rowSelection = controlledState?.rowSelection !== undefined ? controlledState.rowSelection : internalRowSelection;
  const setRowSelection = controlledState?.onRowSelectionChange || setInternalRowSelection;

  const columnVisibility = controlledState?.columnVisibility !== undefined ? controlledState.columnVisibility : internalColumnVisibility;
  const setColumnVisibility = onColumnVisibilityChange || setInternalColumnVisibility;

  // Use a ref to keep track of the latest fetch function to avoid stale closures
  const fetchRef = useRef(fetchData);
  const shouldResetPageOnDebounceRef = useRef(shouldResetPageOnDebounce);
  const paginationRef = useRef(pagination);
  const injectingSortRef = useRef(false);
  const sortingRef = useRef(sorting);
  const dataLenRef = useRef(Array.isArray(data) ? data.length : 0);
  const totalRowsRef = useRef(totalRows);
  const clientFullSortRef = useRef(false);
  const fetchAllUsedRef = useRef(false);

  const dataLen = Array.isArray(data) ? data.length : 0;
  const hasFullDataset = totalRows > 0 && dataLen >= totalRows;
  const useClientFullSort =
    sorting.length > 0 && (hasFullDataset || fetchAllUsedRef.current);

  useEffect(() => {
    fetchRef.current = fetchData;
  }, [fetchData]);
  useEffect(() => {
    shouldResetPageOnDebounceRef.current = shouldResetPageOnDebounce;
  }, [shouldResetPageOnDebounce]);
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);
  useEffect(() => {
    sortingRef.current = sorting;
  }, [sorting]);
  useEffect(() => {
    dataLenRef.current = dataLen;
  }, [dataLen]);
  useEffect(() => {
    totalRowsRef.current = totalRows;
  }, [totalRows]);
  useEffect(() => {
    clientFullSortRef.current = useClientFullSort;
  }, [useClientFullSort]);

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (!injectingSortRef.current) return config;
      if ((config.method || "get").toLowerCase() !== "get") return config;
      if (!sortingRef.current?.length) return config;
      if (!axiosRequestHasPagination(config)) return config;
      // List fetchers that already send sort_by keep server pagination.
      if (axiosRequestHasSort(config)) return config;
      applyFetchAllPaginationToAxiosConfig(config);
      fetchAllUsedRef.current = true;
      return config;
    });
    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, []);

  const skipNextPaginationFetchRef = useRef(false);

  const runFetch = async () => {
    fetchAllUsedRef.current = false;
    injectingSortRef.current = true;
    try {
      await fetchRef.current();
    } finally {
      injectingSortRef.current = false;
    }
  };

  // Handle debounced fetch when dependencies like search or filters change
  // Skip the initial mount run — the pagination effect already fetches once on mount.
  const isFirstDebounceRun = useRef(true);
  useEffect(() => {
    if (isFirstDebounceRun.current) {
      isFirstDebounceRun.current = false;
      return;
    }

    const handler = setTimeout(() => {
      const currentPageIndex = paginationRef.current.pageIndex;
      // If we're not on page 1, reset to page 1, which will trigger the pageIndex effect below
      if (
        currentPageIndex !== 0 &&
        (shouldResetPageOnDebounceRef.current?.() ?? true)
      ) {
        skipNextPaginationFetchRef.current = true;
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }
      runFetch();
    }, debounceTimeMs);

    return () => clearTimeout(handler);
  }, [...debounceDependencies]);

  const isFirstSortRun = useRef(true);
  useEffect(() => {
    if (isFirstSortRun.current) {
      isFirstSortRun.current = false;
      return;
    }

    const alreadyHasAllRows =
      dataLenRef.current >= totalRowsRef.current && totalRowsRef.current > 0;
    // Full dataset is already loaded — sort client-side without refetching.
    if (sorting.length > 0 && (alreadyHasAllRows || fetchAllUsedRef.current)) {
      if (paginationRef.current.pageIndex !== 0) {
        skipNextPaginationFetchRef.current = true;
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }
      return;
    }

    const currentPageIndex = paginationRef.current.pageIndex;
    if (
      currentPageIndex !== 0 &&
      (shouldResetPageOnDebounceRef.current?.() ?? true)
    ) {
      skipNextPaginationFetchRef.current = true;
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
    runFetch();
  }, [JSON.stringify(sorting)]);

  // Handle fetching when page changes
  useEffect(() => {
    if (skipNextPaginationFetchRef.current) {
      skipNextPaginationFetchRef.current = false;
      return;
    }
    if (clientFullSortRef.current) {
      return;
    }
    runFetch();
  }, [pagination.pageIndex, pagination.pageSize]);

  const tablePageCount = useClientFullSort
    ? Math.max(1, Math.ceil(dataLen / Math.max(pagination.pageSize, 1)))
    : pageCount;

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, sorting, pagination, rowSelection, columnVisibility, ...controlledState },
    pageCount: tablePageCount,
    rowCount: useClientFullSort ? dataLen : totalRows,
    manualPagination: useClientFullSort ? false : manualPagination,
    manualFiltering: manualFiltering,
    manualSorting: useClientFullSort ? false : manualSorting,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
  });

  return {
    table,
    pagination,
    setPagination,
    pageCount: tablePageCount,
    setPageCount,
    totalRows: useClientFullSort ? dataLen : totalRows,
    setTotalRows,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
  };
}
