"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
} from "@mui/material";
import { IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { format, subDays } from "date-fns";
import { SortingState, createColumnHelper } from "@tanstack/react-table";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useServerTable } from "@/hooks/useServerTable";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import Expenses from "@/app/components/apps/time-clock/time-clock-details/expenses";
import {
  ExpenseApiRow,
  ExpenseListItem,
  ExpenseTabKey,
  getAvatarColor,
  getInitials,
  normalizeExpenseStatus,
} from "./types";
import { getMockExpenseStatus, MOCK_EXPENSE_TAB_COUNTS } from "./mockStatus";
import { MOCK_EXPENSES } from "./mockData";
import ExpenseSearchHeader from "./components/ExpenseSearchHeader";
import ExpenseTabs from "./components/ExpenseTabs";
import ExpenseTable from "./components/ExpenseTable";
import ExpenseBulkActionBar from "./components/ExpenseBulkActionBar";
import ExpenseDetailsDrawer from "./components/ExpenseDetailsDrawer";

const defaultFilters = {
  user_id: "" as string | number,
  project_id: "" as string | number,
  category_id: "" as string | number,
  trade_id: "" as string | number,
  team_id: "" as string | number,
};

const COLUMN_LABELS: Record<string, string> = {
  date: "Date",
  submitted_by: "Submitted By",
  project: "Project",
  category: "Category",
  description: "Description",
  amount: "Amount",
  receipt: "Receipt",
  status: "Status",
  actions: "Actions",
};

const columnHelper = createColumnHelper<ExpenseApiRow>();

const mapApiRowToListItem = (row: ExpenseApiRow): ExpenseListItem => {
  const name = row.user_name?.trim() || "Unknown";
  const apiStatus = normalizeExpenseStatus(row.status);
  return {
    id: row.id,
    date: row.receipt_date || row.date_added || "-",
    submittedBy: {
      name,
      role: row.trade_name?.trim() || "—",
      initials: getInitials(name),
      avatarColor: getAvatarColor(row.user_id ?? name),
    },
    project: row.project_name?.trim() || "-",
    category: row.category_name?.trim() || "-",
    description: row.note?.trim() || "-",
    amount: Number(row.total_amount || 0),
    currency: row.currency || "£",
    status: apiStatus ?? getMockExpenseStatus(row.id),
    attachmentCount: Number(row.attachment_count || 0),
  };
};

const ExpenseListUI = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [data, setData] = useState<ExpenseApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "receipt_date", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [activeTab, setActiveTab] = useState<ExpenseTabKey>("all");

  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 6));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<number | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsExpense, setDetailsExpense] = useState<ExpenseListItem | null>(
    null,
  );

  const openExpenseDetail = (expenseId: number) => {
    setSelectedExpenseId(expenseId);
    setDetailOpen(true);
  };

  const closeExpenseDetail = () => {
    setDetailOpen(false);
    setSelectedExpenseId(null);
  };

  const openExpenseDetailsDrawer = (expense: ExpenseListItem) => {
    setDetailsExpense(expense);
    setDetailsOpen(true);
  };

  const closeExpenseDetailsDrawer = () => {
    setDetailsOpen(false);
    setDetailsExpense(null);
  };

  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!user?.company_id) return;
      try {
        const res = await api.get("expense/list-filters");
        const info = res.data?.info || {};
        setProjects(info.projects || []);
        setCategories(info.categories || []);
        setUsers(info.users || []);
        setTeams(info.teams || []);
        setTrades(info.trades || []);
      } catch (error) {
        console.error("Failed to load expense filter options", error);
      }
    };

    fetchFilterOptions();
  }, [user?.company_id]);

  // Minimal columns for useServerTable / pagination / sorting state
  const columns = useMemo(
    () => [
      columnHelper.accessor("receipt_date", { id: "receipt_date", header: "Date" }),
      columnHelper.accessor("date_added", { id: "date_added", header: "Date Added" }),
      columnHelper.accessor("user_name", {
        id: "user_name",
        header: "Submitted By",
        enableSorting: false,
      }),
      columnHelper.accessor("project_name", {
        id: "project_name",
        header: "Project",
        enableSorting: false,
      }),
      columnHelper.accessor("category_name", {
        id: "category_name",
        header: "Category",
        enableSorting: false,
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Description",
        enableSorting: false,
      }),
      columnHelper.accessor("total_amount", { id: "total_amount", header: "Amount" }),
      columnHelper.accessor("attachment_count", {
        id: "attachment_count",
        header: "Receipt",
        enableSorting: false,
      }),
    ],
    [],
  );

  const fetchExpenses = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      let url = `expense/list-web?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`;

      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (startDate) {
        url += `&start_date=${format(startDate, "dd/MM/yyyy")}`;
      }
      if (endDate) {
        url += `&end_date=${format(endDate, "dd/MM/yyyy")}`;
      }
      if (filters.user_id) url += `&user_id=${filters.user_id}`;
      if (filters.project_id) url += `&project_id=${filters.project_id}`;
      if (filters.category_id) url += `&category_id=${filters.category_id}`;
      if (filters.trade_id) url += `&trade_id=${filters.trade_id}`;
      if (filters.team_id) url += `&team_id=${filters.team_id}`;

      if (sorting.length > 0) {
        url += `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? "desc" : "asc"}`;
      }

      const res = await api.get(url);
      if (res.data) {
        const responseData = Array.isArray(res.data.info) ? res.data.info : [];
        setData(responseData);

        const pagMeta = res.data.data || {};
        if (pagMeta.totalItems !== undefined) {
          setTotalRows(pagMeta.totalItems);
        } else {
          setTotalRows(responseData.length);
        }
        if (pagMeta.totalPages !== undefined) {
          setPageCount(pagMeta.totalPages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch expenses", error);
      setData([]);
      setTotalRows(0);
      setPageCount(0);
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
    fetchData: fetchExpenses,
    debounceDependencies: [
      user?.company_id,
      search,
      startDate ? format(startDate, "yyyy-MM-dd") : "",
      endDate ? format(endDate, "yyyy-MM-dd") : "",
      JSON.stringify(filters),
    ],
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
  });

  const usingMockData = !loading && data.length === 0;

  const listItems = useMemo(() => {
    if (usingMockData) return MOCK_EXPENSES;
    return data.map(mapApiRowToListItem);
  }, [data, usingMockData]);

  // Tab filter is UI-only over the current page until list-web supports status.
  const visibleItems = useMemo(() => {
    let items = listItems;

    if (activeTab !== "all") {
      items = items.filter((item) => item.status === activeTab);
    }

    if (usingMockData && search.trim()) {
      const query = search.trim().toLowerCase();
      items = items.filter((item) =>
        [
          item.submittedBy.name,
          item.submittedBy.role,
          item.project,
          item.category,
          item.description,
          item.status,
          item.date,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    return items;
  }, [listItems, activeTab, usingMockData, search]);

  const displayTotalRows = usingMockData ? visibleItems.length : totalRows;
  const selectedCount = isSelectAll
    ? displayTotalRows
    : selectedRowIds.size;

  const selectedTotal = useMemo(() => {
    if (isSelectAll) {
      return listItems.reduce((sum, item) => sum + item.amount, 0);
    }
    return listItems
      .filter((item) => selectedRowIds.has(item.id))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [isSelectAll, listItems, selectedRowIds]);

  const selectedCurrency =
    listItems.find((item) => selectedRowIds.has(item.id))?.currency ||
    listItems[0]?.currency ||
    "£";

  const dateSortDir =
    sorting[0]?.id === "receipt_date"
      ? sorting[0].desc
        ? "desc"
        : "asc"
      : false;

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    setStartDate(range.from);
    setEndDate(range.to);
    setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
  };

  const handleToggleDateSort = () => {
    setSorting((prev) => {
      if (prev[0]?.id === "receipt_date" && !prev[0].desc) {
        return [{ id: "receipt_date", desc: true }];
      }
      if (prev[0]?.id === "receipt_date" && prev[0].desc) {
        return [{ id: "receipt_date", desc: false }];
      }
      return [{ id: "receipt_date", desc: true }];
    });
  };

  const handleToggleSelect = (id: number) => {
    if (isSelectAll) {
      setIsSelectAll(false);
      const next = new Set(listItems.map((r) => r.id));
      next.delete(id);
      setSelectedRowIds(next);
      return;
    }
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setIsSelectAll(checked);
    setSelectedRowIds(new Set());
  };

  const handleTabChange = (tab: ExpenseTabKey) => {
    setActiveTab(tab);
  };

  const parseBlobError = async (blob: Blob) => {
    try {
      const text = await blob.text();
      const json = JSON.parse(text);
      const message = json?.message ?? json?.Message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string" && message.trim()) return message;
      return "Failed to download attachments";
    } catch {
      return "Failed to download attachments";
    }
  };

  const handleDownloadAttachments = async () => {
    if (!isSelectAll && selectedRowIds.size === 0) {
      toast.error("Please select at least one expense");
      return;
    }

    setDownloading(true);
    try {
      const payload: Record<string, any> = {
        select_all: isSelectAll,
      };

      if (isSelectAll) {
        if (search) payload.search = search;
        if (startDate) payload.start_date = format(startDate, "dd/MM/yyyy");
        if (endDate) payload.end_date = format(endDate, "dd/MM/yyyy");
        if (filters.user_id) payload.user_id = filters.user_id;
        if (filters.project_id) payload.project_id = filters.project_id;
        if (filters.category_id) payload.category_id = filters.category_id;
        if (filters.trade_id) payload.trade_id = filters.trade_id;
        if (filters.team_id) payload.team_id = filters.team_id;
      } else {
        payload.ids = Array.from(selectedRowIds);
      }

      const response = await api.post(
        "expense/download-attachments-zip",
        payload,
        { responseType: "blob" },
      );

      const contentType = String(
        response.headers?.["content-type"] || "",
      ).toLowerCase();
      if (contentType.includes("application/json")) {
        toast.error(await parseBlobError(response.data));
        return;
      }

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expense-attachments.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      const blob = error?.response?.data;
      if (blob instanceof Blob) {
        toast.error(await parseBlobError(blob));
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to download attachments",
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  const getUserLabel = (option: any) => {
    if (!option) return "";
    if (option.name) return option.name;
    return `${option.first_name || ""} ${option.last_name || ""}`.trim();
  };

  const columnToggles = Object.keys(COLUMN_LABELS).map((id) => ({
    id,
    label: COLUMN_LABELS[id],
    visible: columnVisibility[id] !== false,
    onToggle: () =>
      setColumnVisibility((prev) => ({
        ...prev,
        [id]: prev[id] === false,
      })),
  }));

  const skeletonColumns = [
    { name: "select", width: "40px" },
    { name: "Date", width: "140px" },
    { name: "Submitted By", width: "180px" },
    { name: "Project", width: "140px" },
    { name: "Category", width: "100px" },
    { name: "Description", width: "160px" },
    { name: "Amount", width: "90px" },
    { name: "Receipt", width: "120px" },
    { name: "Status", width: "100px" },
    { name: "Actions", width: "60px" },
  ];

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ExpenseSearchHeader
          search={search}
          onSearchChange={handleSearchChange}
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          onFiltersClick={() => {
            setTempFilters(filters);
            setFilterOpen(true);
          }}
          columnToggles={columnToggles}
        />

        <ExpenseTabs
          tabs={MOCK_EXPENSE_TAB_COUNTS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        <ExpenseTable
          expenses={visibleItems}
          selectedIds={selectedRowIds}
          isSelectAll={isSelectAll}
          loading={loading}
          skeletonColumns={skeletonColumns}
          dateSort={dateSortDir}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleDateSort={handleToggleDateSort}
          onViewReceipt={(id) => {
            if (usingMockData) {
              toast("Receipt preview — connect API data to open attachments");
              return;
            }
            openExpenseDetail(id);
          }}
          onOpenDetails={openExpenseDetailsDrawer}
          columnVisibility={columnVisibility}
        />
      </Box>

      <TablePaginationFooter
        table={table}
        totalRows={displayTotalRows}
        selectedCount={selectedCount}
      />

      <ExpenseBulkActionBar
        selectedCount={selectedCount}
        selectedTotalLabel={
          isSelectAll
            ? `${selectedCurrency}${selectedTotal.toFixed(2)} (this page)`
            : `${selectedCurrency}${selectedTotal.toFixed(2)}`
        }
        onClearSelection={() => {
          setIsSelectAll(false);
          setSelectedRowIds(new Set());
        }}
        onApprove={() => toast("Approve Selected — coming soon")}
        onSendToBookkeeper={() =>
          toast("Send to Bookkeeper — coming soon")
        }
        onExport={handleDownloadAttachments}
        onDelete={() => toast("Delete Selected — coming soon")}
      />

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative" }}>
          Filters
          <IconButton
            aria-label="close"
            onClick={() => setFilterOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={users}
              getOptionLabel={getUserLabel}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                users.find((u) => String(u.id) === String(tempFilters.user_id)) ||
                null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  user_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="User" fullWidth />
              )}
            />
            <Autocomplete
              options={projects}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                projects.find(
                  (p) => String(p.id) === String(tempFilters.project_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  project_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Project" fullWidth />
              )}
            />
            <Autocomplete
              options={categories}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                categories.find(
                  (c) => String(c.id) === String(tempFilters.category_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  category_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Category" fullWidth />
              )}
            />
            <Autocomplete
              options={trades}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                trades.find(
                  (t) => String(t.id) === String(tempFilters.trade_id),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  trade_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Trade" fullWidth />
              )}
            />
            <Autocomplete
              options={teams}
              getOptionLabel={(option) => option.title || option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                teams.find((t) => String(t.id) === String(tempFilters.team_id)) ||
                null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  team_id: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Team" fullWidth />
              )}
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
              setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setFilterOpen(false);
              setPagination((prev: any) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>

      <ExpenseDetailsDrawer
        open={detailsOpen}
        onClose={closeExpenseDetailsDrawer}
        expense={detailsExpense}
      />

      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={closeExpenseDetail}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 420 } },
        }}
      >
        {selectedExpenseId ? (
          <Expenses
            expenseId={selectedExpenseId}
            attachmentsOnly
            onClose={() => {
              closeExpenseDetail();
              fetchExpenses();
            }}
          />
        ) : null}
      </Drawer>
    </Box>
  );
};

export default ExpenseListUI;
