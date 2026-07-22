"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Avatar,
  Drawer,
} from "@mui/material";
import {
  flexRender,
  getCoreRowModel,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { useServerTable } from "@/hooks/useServerTable";
import {
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import SkeletonLoader from "@/app/components/SkeletonLoader";
import Image from "next/image";
import { IconEye } from "@tabler/icons-react";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { format } from "date-fns";
import IconArrowLeft from "@mui/icons-material/ArrowBack";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import { usePersistentColumnVisibility } from "@/hooks/usePersistentColumnVisibility";

dayjs.extend(customParseFormat);

interface Props {
  userId: number;
  isShow: boolean;
    disableDateFilter?: boolean;
}
const STORAGE_KEY = "payment-date-range";
const loadDateRangeFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      };
    }
  } catch (error) {
    console.error("Error loading date range from localStorage:", error);
  }
  return null;
};

const saveDateRangeToStorage = (
  startDate: Date | null,
  endDate: Date | null,
) => {
  try {
    const dateRange = {
      startDate: startDate ? startDate.toDateString() : null,
      endDate: endDate ? endDate.toDateString() : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dateRange));
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
};
const PaymentsList: React.FC<Props> = ({ userId, isShow, disableDateFilter = false }) => {
  const [data, setData] = useState<any[]>([]);
  const [payment, setPayment] = useState<any>([]);
  const [fetchPayslip, setFetchPayslip] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((item: any) => item.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const { columnVisibility, onColumnVisibilityChange } = usePersistentColumnVisibility({
    storageKey: `cv_${user?.company_id}_${user?.id}_payments_payments`,
    enabled: !!user?.id,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - today.getDay() + 1);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() - today.getDay() + 7);

    // Load from localStorage or use defaults
    const getInitialDates = () => {
        if (disableDateFilter) {
            return { startDate: null, endDate: null };
        }

        const stored = loadDateRangeFromStorage();
        if (stored && stored.startDate && stored.endDate) {
            return { startDate: stored.startDate, endDate: stored.endDate };
        }
        return { startDate: defaultStart, endDate: defaultEnd };
    };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  const handleDateRangeChange = (range: {
    from: Date | null;
    to: Date | null;
  }) => {
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
      saveDateRangeToStorage(range.from, range.to);
    }
  };

  // Fetch data
    const fetchPayments = async (start: Date | null, end: Date | null, restorePage?: number): Promise<void> => {
        setFetchPayslip(true);
        try {
            const activeStart = start !== undefined ? start : startDate;
            const activeEnd = end !== undefined ? end : endDate;
            const startParam = activeStart ? format(activeStart, "dd/MM/yyyy") : "";
            const endParam = activeEnd ? format(activeEnd, "dd/MM/yyyy") : "";

            const params = {
                company_id: user.company_id,
                start_date: startParam,
                end_date: endParam,
                ...(userId ? { user_id: userId } : {}),
                page: pagination.pageIndex + 1,
                limit: pagination.pageSize,
                ...(searchTerm ? { search: searchTerm } : {})
            };

            const res = await api.get(`payslips/get-bookkeeper-payments`, { params });
            if (res.data) {
                const responseData = res.data.info?.data || res.data.info || res.data.data || [];
                setData(responseData);

                const pagMeta =
                    res.data.data?.totalPages !== undefined || res.data.data?.totalItems !== undefined
                        ? res.data.data
                        : res.data.info && res.data.info.totalPages !== undefined
                        ? res.data.info
                        : res.data.data || {};

                if (pagMeta.totalItems !== undefined) {
                    setTotalRows(pagMeta.totalItems);
                } else if (pagMeta.total !== undefined) {
                    setTotalRows(pagMeta.total);
                } else {
                    setTotalRows(responseData.length);
                }

                if (pagMeta.totalPages !== undefined) {
                    setPageCount(pagMeta.totalPages);
                } else if (pagMeta.last_page !== undefined) {
                    setPageCount(pagMeta.last_page);
                }

                if (restorePage !== undefined) {
                    setTimeout(() => {
                        setPagination((prev: any) => ({ ...prev, pageIndex: restorePage }));
                    }, 0);
                }
            }
        } catch (err) {
            console.error("Failed to fetch payments", err);
        }
        setFetchPayslip(false);
    };

    useEffect(() => {
        if (user?.company_id) {
            fetchPayments(startDate, endDate);
        }
    }, [user?.company_id, startDate, endDate]);

    const handleOpenDrawer = (item: any) => {
    setDrawerOpen(true);
    setPayment(item);
  };
  const handleCloseDrawer = () => setDrawerOpen(false);



  
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (tableContainerRef.current) {
        setIsScrollable(
          tableContainerRef.current.scrollWidth > tableContainerRef.current.clientWidth
        );
      }
    };
    checkScroll();
    window.addEventListener("resize", checkScroll);
    
    const observer = new MutationObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current, { childList: true, subtree: true, characterData: true });
    }
    
    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, []);

  const columnHelper = createColumnHelper<any>();
  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center">
          <CustomCheckbox
            className="header-checkbox"
            checked={
              selectedRowIds.size === data.length &&
              data.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < data.length
            }
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); e.preventDefault(); handleSelectAllRows(e.target.checked); }}
          />
        </Stack>
      ),
      cell: ({ row }: any) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.id);
        const isHovered = hoveredRow === item.id;
        const showCheckbox = isChecked || isHovered;

        return (
          <Stack
            direction="row"
            alignItems="center"
            onMouseEnter={() => setHoveredRow(item.id)}
            onMouseLeave={() => setHoveredRow(null)}
            sx={{ pl: 0.3 }}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const newSelected = new Set(selectedRowIds);
                if (isChecked) {
                  newSelected.delete(item.id);
                } else {
                  newSelected.add(item.id);
                }
                setSelectedRowIds(newSelected);
              }}
              sx={{
                opacity: showCheckbox ? 1 : 0,
                pointerEvents: showCheckbox ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            />
          </Stack>
        );
      },
    },
    columnHelper.accessor("week_range", {
      id: "dateRange",
      header: () => (
        <Stack direction="row" alignItems="center">
          <Typography variant="subtitle2" fontWeight="inherit">
            Date Range
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center">
            <Typography variant="subtitle2" fontWeight="inherit">
              {item.week_range}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("user_name", {
      id: "Name",
      header: () => (
        <Stack direction="row" alignItems="center" spacing={4}>
          <Typography variant="subtitle2" fontWeight="inherit">
            Name
          </Typography>
        </Stack>
      ),
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ cursor: "pointer" }}
          >
            <Avatar
              src={user.user_image ? user.user_image : ""}
              alt={user.name}
              sx={{ width: 36, height: 36 }}
            />
            <Box>
              <Typography
                className="f-14"
                color="textPrimary"
                sx={{
                  width: 190,
                }}
              >
                {user.user_name ?? "-"}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor((row) => row?.total_payable_amount, {
      id: "amount",
      header: () => "Amount",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography textTransform="capitalize" className="f-14">
              {item.total_payable_amount
                ? `${item.currency}${formatAmount(item.total_payable_amount)}`
                : `${item.currency}0`}
            </Typography>
          </Stack>
        );
      },
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title="View">
              <IconButton
                color="primary"
                onClick={() => handleOpenDrawer(item)}
              >
                <IconEye size={20} />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    }),
  ];

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handlePopoverClose = () => setAnchorEl2(null);
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
    data,
    columns,
    fetchData: () => fetchPayments(startDate, endDate),
    debounceDependencies: [searchTerm],
    state: { columnVisibility },
    onColumnVisibilityChange,
  });

  // Reset to first page when search term changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, table]);

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

    const formatAmount = (value: any): string => {
        const num = parseFloat(value);
        if (isNaN(num)) return "0.00";
        return num.toFixed(2);
    };

  return (
    <Box
      sx={{
        height: `${isShow ? "calc(91vh - 100px)" : "calc(73vh - 100px)"}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Render the search and table */}
      <Stack
        mx={2}
        mb={2}
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <Box className={isShow ? "" : "date_range_picker"}>
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
            />
          </Box>

          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={"16"} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>

        <Stack
          direction="row"
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
          alignItems="center"
          sx={{ flexShrink: 0 }}
        >
          <IconButton
            onClick={handlePopoverOpen}
            sx={{ ml: 1 }}
            color="primary"
          >
            <IconEye />
          </IconButton>
          <Popover
            open={Boolean(anchorEl2)}
            anchorEl={anchorEl2}
            onClose={handlePopoverClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ sx: { width: 220, p: 1, borderRadius: 2 } }}
          >
            <TextField
              size="small"
              placeholder="Search"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 1 }}
            />
            <FormGroup>
              {table
                .getAllLeafColumns()
                .filter((col: any) => {
                  const excludedColumns = ["conflicts", "select"];
                  if (excludedColumns.includes(col.id)) return false;

                  return col.id.toLowerCase().includes(search.toLowerCase());
                })
                .map((col: any) => (
                  <FormControlLabel
                    key={col.id}
                    control={
                      <CustomCheckbox
                          checked={col.getIsVisible()}
                        onChange={col.getToggleVisibilityHandler()}
                        disabled={col.id === "conflicts"}
                      />
                    }
                    sx={{ textTransform: "none" }}
                    label={
                      col.columnDef.meta?.label ||
                      (typeof col.columnDef.header === "string" &&
                      col.columnDef.header.trim() !== ""
                        ? col.columnDef.header
                        : col.id
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str: string) => str.toUpperCase())
                            .trim())
                    }
                  />
                ))}
            </FormGroup>
          </Popover>
        </Stack>
      </Stack>
      <Divider />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <TableContainer ref={tableContainerRef}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActive = header.column.getIsSorted();
                    const isAsc = header.column.getIsSorted() === "asc";
                    const isSortable = header.column.getCanSort();

                    return (
                      <TableCell
                        key={header.id}
                        sx={{
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          width:
                            header.column.id === "actions" ||
                            header.column.id === "price" ||
                            header.column.id === "barcode"
                              ? 80
                              : header.column.id === "QrCode"
                                ? 120
                                : header.column.id === "supplierCode"
                                  ? 140
                                  : header.column.id === "select"
                                    ? 30
                                    : "auto",
                        
                            ...(header.column.id === "actions" && {
                              position: "sticky",
                              right: 0,
                              backgroundColor: "background.paper",
                              zIndex: 3,
                              boxShadow: isScrollable ? "-2px 0 4px -2px rgba(0,0,0,0.1)" : "none",
                            }),}}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          p={0}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "flex-start",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          <Typography variant="subtitle2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </Typography>
                          {isSortable && (
                            <Box
                              component="span"
                              className="hoverIcon"
                              ml={0.5}
                              sx={{
                                transition: "opacity 0.2s",
                                opacity: isActive ? 1 : 0,
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              {isActive ? (isAsc ? "↑" : "↓") : "↑"}
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
              {fetchPayslip ? (
                <SkeletonLoader
                  columns={simpleColumns}
                  rowCount={simpleColumns.length}
                />
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "calc(50vh - 100px)",
                      }}
                    >
                      <Image
                        src="/images/no-data.png"
                        alt="No data"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                        }}
                        width={200}
                        height={200}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: "pointer" }}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
      key={cell.id}
      sx={{
        ...(cell.column.id === "actions" && {
          position: "sticky",
          right: 0,
          backgroundColor: "background.paper",
          zIndex: 1,
          boxShadow: isScrollable ? "-2px 0 4px -2px rgba(0,0,0,0.1)" : "none",
        }),
      }}
    >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data.length ? <Divider /> : <></>}
      </Box>
      <Divider />
      <TablePaginationFooter selectedCount={typeof selectedRowIds !== "undefined" ? selectedRowIds.size : undefined}
        table={table}
        totalRows={table.getPrePaginationRowModel().rows.length}
      />

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => handleCloseDrawer()}
        sx={{
          width: 400,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 400,
            padding: 2,
            backgroundColor: "#f9f9f9",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
          }}
        >
            <Box className="task-form">
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>

                        {/* Header */}
                        <Box display="flex" alignItems="center" mb={2} gap={1}>
                            <IconButton onClick={() => handleCloseDrawer()} size="small">
                                <IconArrowLeft />
                            </IconButton>
                            <Typography variant="h6" fontWeight={700}>
                                {payment?.week_range}
                            </Typography>
                        </Box>

                        {/* ── Net Amounts ── */}
                        <Box
                            mt={2} p={2}
                            display="flex" flexDirection="column" gap={1}
                            sx={{ backgroundColor: "rgb(238,238,238)", borderRadius: "5px" }}
                        >
                            {/* Net Timesheet (Leave including) */}
                            {payment?.net_timeclock_amount !== null &&
                                Number(payment?.net_timeclock_amount) !== 0 && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                                Net Timesheet
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                (Leave including)
                                            </Typography>
                                        </Box>
                                        <Typography color="success" variant="subtitle1" fontWeight={600}>
                                            {payment.currency}{formatAmount(parseFloat(payment.net_timeclock_amount || 0) + parseFloat(payment.net_paid_leave_amount || 0))}
                                        </Typography>
                                    </Box>
                                )}

                            {/* Penalty */}
                            {payment?.net_penalty_amount !== null &&
                                Number(payment?.net_penalty_amount) !== 0 && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                            Penalty
                                        </Typography>
                                        <Typography color="error" variant="subtitle1" fontWeight={600}>
                                            -{payment.currency}{formatAmount(payment.net_penalty_amount)}
                                        </Typography>
                                    </Box>
                                )}

                            {/* Price Work */}
                            {payment?.net_pricework_amount !== null &&
                                Number(payment?.net_pricework_amount) !== 0 && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                            Price Work
                                        </Typography>
                                        <Typography color="success" variant="subtitle1" fontWeight={600}>
                                            {payment.currency}{formatAmount(payment.net_pricework_amount)}
                                        </Typography>
                                    </Box>
                                )}

                            {/* Expense */}
                            {payment?.net_expense_amount !== null &&
                                Number(payment?.net_expense_amount) !== 0 && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                            Expense
                                        </Typography>
                                        <Typography color="success" variant="subtitle1" fontWeight={600}>
                                            {payment.currency}{formatAmount(payment.net_expense_amount)}
                                        </Typography>
                                    </Box>
                                )}
                        </Box>

                        {/* ── Gross / CIS / Net Payable ── */}
                        <Box
                            mt={2} p={2}
                            display="flex" flexDirection="column" gap={1}
                            sx={{ backgroundColor: "rgb(238,238,238)", borderRadius: "5px" }}
                        >
                            {/* Gross Total */}
                            {payment?.gross_amount !== null && (
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                        Gross Total
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        {payment.currency}{formatAmount(payment.gross_amount) ?? "0"}
                                    </Typography>
                                </Box>
                            )}

                            {/* CIS */}
                            {payment?.cis_amount !== null &&
                                Number(payment?.cis_amount) !== 0 && (
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                            CIS
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {payment.currency}{formatAmount(payment.cis_amount)}
                                        </Typography>
                                    </Box>
                                )}

                            {/* Net Payable = Net amount + Expense */}
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                        Net Payable
                                    </Typography>
                                </Box>
                                <Typography color={Number(payment.net_payable_amount) >= 0 ? "success" : "error"} variant="subtitle1" fontWeight={600}>
                                    {payment.currency}{formatAmount(payment.net_payable_amount)}
                                </Typography>
                            </Box>

                            {/* Adjustment */}
                            {payment?.net_adjustment_amount !== null && Number(payment?.net_adjustment_amount) !== 0 && (
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="subtitle1" color="textSecondary" fontWeight={500}>
                                        Adjustment
                                    </Typography>

                                    <Typography
                                        color={payment.net_adjustment_amount >= 0 ? 'success' : 'error'}
                                        variant="subtitle1"
                                        fontWeight={600}
                                    >
                                        {payment.net_adjustment_amount >= 0
                                            ? `${payment.currency}${formatAmount(payment.net_adjustment_amount)}`
                                            : `-${payment.currency}${formatAmount(Math.abs(payment.net_adjustment_amount))}`}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* ── Section 4: Total Payable ── */}
                        {payment?.total_payable_amount !== null && (
                            <Box
                                mt={2} p={2}
                                display="flex" justifyContent="space-between" alignItems="center"
                                sx={{ backgroundColor: "rgb(238,238,238)", borderRadius: "5px" }}
                            >
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Total Payable
                                    </Typography>
                                </Box>
                                <Typography color="success" variant="h6" fontWeight={700}>
                                    {payment.currency}{formatAmount(payment.total_payable_amount)}
                                </Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </Box>
        </Box>

        <Box mt={2}>
          <Button
            color="inherit"
            onClick={() => handleCloseDrawer()}
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              color: "GrayText",
            }}
          >
            Close
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default PaymentsList;
