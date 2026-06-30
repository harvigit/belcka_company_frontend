import { useState, useEffect, useRef } from 'react';
import { SortingState } from '@tanstack/react-table';

interface UseServerPaginationOptions {
  fetchData: () => Promise<void> | void;
  debounceDependencies?: any[];
  debounceTimeMs?: number;
}

export function useServerPagination({
  fetchData,
  debounceDependencies = [],
  debounceTimeMs = 300,
}: UseServerPaginationOptions) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);

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
  }, debounceDependencies);

  // Handle fetching when page changes
  useEffect(() => {
    fetchRef.current();
  }, [pagination.pageIndex, pagination.pageSize]);

  return {
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
  };
}
