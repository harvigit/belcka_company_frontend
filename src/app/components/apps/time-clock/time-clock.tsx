"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Drawer,
  InputAdornment,
  Snackbar,
  Alert,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Chip,
  Menu,
} from "@mui/material";
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconTableColumn,
  IconLock,
  IconLockOpen,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { AxiosResponse } from "axios";

import api from "@/utils/axios";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import TimeClockDetails from "./time-clock-details";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";
import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import AddLeave from "./time-clock-details/leaves/add-leave";

import "react-day-picker/dist/style.css";
import "@/app/global.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import AddExpense from "./time-clock-details/expenses/add-expense";
import AddWorklog from "./time-clock-details/worklog/add-worklog";
import Image from "next/image";
import SkeletonLoader from "../../SkeletonLoader";

const columnHelper = createColumnHelper<TimeClock>();

const TIME_CLOCK_PAGE = "time-clock-page";
const TIME_CLOCK_DETAILS_PAGE = "time-clock-details-page";

interface ExportResponse {
  IsSuccess: boolean;
  message: string;
  data: {
    file: string;
    filename: string;
    contentType: string;
  };
}

const saveDateRangeToStorage = (
  startDate: Date | null,
  endDate: Date | null
) => {
  try {
    const dateRange = {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    };
    localStorage.setItem(TIME_CLOCK_PAGE, JSON.stringify(dateRange));
    localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
};

const saveDateToStorage = (startDate: Date | null, endDate: Date | null) => {
  try {
    const dateRange = {
      startDate: startDate ? startDate.toDateString() : null,
      endDate: endDate ? endDate.toDateString() : null,
      columnVisibility: {},
    };
    localStorage.setItem(TIME_CLOCK_DETAILS_PAGE, JSON.stringify(dateRange));
  } catch (error) {
    console.log("Error saving date range to localStorage:", error);
  }
};

const loadDateRangeFromStorage = () => {
  try {
    const stored = localStorage.getItem(TIME_CLOCK_PAGE);
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

export type TimeClock = {
  company_id: string;
  week_range: any;
  user_id: any;
  user_name: string;
  trade_name: string;
  type: string;
  user_thumb_image: string;
  start_date: string;
  end_date: string;
  days: Record<string, any>;
  payable_total_hours: string;
  total_hours?: string | number;
  total_break_hours?: string | number;
  weekly_total_hours: string | number;
  daylog_payable_amount: number;
  pricework_total_amount: number;
  total_expense_amount: number;
  total_payable_amount: number;
  status_text: string;
  status_color?: string;

  timesheet_light_ids: string;
  weekly_payable_amount: number;

  // Newly added fields from API
  has_leave_request?: boolean;
  has_expense_request?: boolean;
  has_worklog_request?: boolean;
};

type TimeClockResponse = {
  company_id: number;
  IsSuccess: boolean;
  info: TimeClock[];
  currency: string;
};

const TimeClock = () => {
  // Initialize default date range (current week)
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

  // Load from localStorage or use defaults
  const getInitialDates = () => {
    const stored = loadDateRangeFromStorage();

    if (stored && stored.startDate && stored.endDate) {
      return {
        startDate: stored.startDate,
        endDate: stored.endDate,
      };
    } else {
      return {
        startDate: defaultStart,
        endDate: defaultEnd,
      };
    }
  };

  const initialDates = getInitialDates();

  // State management
  const [data, setData] = useState<TimeClock[]>([]);
  const [currency, setCurrency] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [selectedTimeClock, setSelectedTimeClock] = useState<TimeClock | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [hasDataChanged, setHasDataChanged] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdParam = searchParams?.get("user_id");
  const startParam = searchParams?.get("start_date");
  const endParam = searchParams?.get("end_date");
  const openParam = searchParams?.get("open");
  const [anchorEl2, setAnchorEl2] = React.useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const session = useSession();
  const user = session.data?.user as User & { company_id: number } & {
    user_role_id: number;
  };

  const [addDropDown, setAddDropDown] = useState<null | HTMLElement>(null);
  const openAddleave = Boolean(addDropDown);
  const [addLeaveSidebar, setAddLeaveSidebar] = useState<boolean>(false);
  const [addExpenseSidebar, setAddExpenseSidebar] = useState<boolean>(false);
  const [addWorklogSidebar, setAddWorklogSidebar] = useState<boolean>(false);

  const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAddDropDown(event.currentTarget);
  };

  const handleAddClose = () => {
    setAddDropDown(null);
  };

  const handleAddLeaveClick = () => {
    setAddDropDown(null);
    setAddLeaveSidebar(true);
  };

  const handleExpenseClick = () => {
    setAddDropDown(null);
    setAddExpenseSidebar(true);
  };

  const handleWorklogClick = () => {
    setAddDropDown(null);
    setAddWorklogSidebar(true);
  };

  const closeAddLeaveSidebar = async () => {
    setAddLeaveSidebar(false);
    try {
      const defaultStartDate = startDate || defaultStart;
      const defaultEndDate = endDate || defaultEnd;
      await fetchData(defaultStartDate, defaultEndDate);
    } catch (error) {
      console.error(
        "Error fetching time clock data after closing add leave sidebar:",
        error
      );
    }
  };

  const closeAddWorklogSidebar = async () => {
    setAddWorklogSidebar(false);
    try {
      const defaultStartDate = startDate || defaultStart;
      const defaultEndDate = endDate || defaultEnd;
      await fetchData(defaultStartDate, defaultEndDate);
    } catch (error) {
      console.error(
        "Error fetching time clock data after closing add leave sidebar:",
        error
      );
    }
  };
  const closeAddExpenseSidebar = async () => {
    setAddExpenseSidebar(false);
    try {
      const defaultStartDate = startDate || defaultStart;
      const defaultEndDate = endDate || defaultEnd;
      await fetchData(defaultStartDate, defaultEndDate);
    } catch (error) {
      console.error(
        "Error fetching time clock data after closing add leave sidebar:",
        error
      );
    }
  };

  const fetchData = async (start: Date, end: Date): Promise<TimeClock[]> => {
    try {
      setFetchTimesheet(true);
      const params: Record<string, string> = {
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
      };

      const response: AxiosResponse<TimeClockResponse> = await api.get(
        "/time-clock/get",
        {
          params,
        }
      );

      if (response.data.IsSuccess) {
        setData(response.data.info);
        setCompanyId(response.data.company_id);
        if (response.data.currency !== null) {
          setCurrency(response.data.currency);
          setFetchTimesheet(false);
        }
        return response.data.info;
      }
    } catch (error) {
      setErrorMessage("Failed to fetch timesheet data. Please try again.");
      setFetchTimesheet(false);
    }
    return [];
  };

  useEffect(() => {
    if (startDate && endDate) fetchData(startDate, endDate);
  }, [startDate, endDate]);
  const [fetchTimesheet, setFetchTimesheet] = useState<boolean>(false);

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

  const handleRowClick = (timeClock: TimeClock) => {
    setSelectedTimeClock(timeClock);
    setDetailsOpen(true);
  };

  const handleUserChange = (newUser: TimeClock) => {
    const updatedUser = {
      ...newUser,
      start_date:
        selectedTimeClock?.start_date || startDate?.toISOString() || "",
      end_date: selectedTimeClock?.end_date || endDate?.toISOString() || "",
    };
    setSelectedTimeClock(updatedUser);
  };

  const closeDetails = async () => {
    setDetailsOpen(false);
    setSelectedTimeClock(null);

    const initialDates = getInitialDates();

    if (initialDates) {
      try {
        handleDateRangeChange({
          from: initialDates.startDate,
          to: initialDates.endDate,
        });
        await fetchData(initialDates.startDate, initialDates.endDate);
        setHasDataChanged(false);
      } catch (error) {
        setErrorMessage("Failed to refresh data. Please try again.");
      }
    }
  };

  const handleDataChange = () => {
    setHasDataChanged(true);
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.trade_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [data, searchTerm]);

  const formatHour = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "-";
    const num = parseFloat(val.toString());
    if (isNaN(num)) return "-";
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Stack direction="row" alignItems="center" ml={0.5}>
          <CustomCheckbox
            checked={
              selectedRowIds.size === filteredData.length &&
              filteredData.length > 0
            }
            indeterminate={
              selectedRowIds.size > 0 &&
              selectedRowIds.size < filteredData.length
            }
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const isChecked = e.target.checked;

              if (isChecked) {
                setSelectedRowIds(
                  new Set(filteredData.map((row) => row.user_id))
                );
              } else {
                setSelectedRowIds(new Set());
              }
            }}
          />
        </Stack>
      ),
      cell: ({ row }: any) => {
        const item = row.original;
        const isChecked = selectedRowIds.has(item.user_id);
        const isHovered = hoveredRow === item.user_id;
        const showCheckbox = isChecked || isHovered;

        return (
          <Stack
            direction="row"
            alignItems="center"
            onMouseEnter={() => setHoveredRow(item.user_id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CustomCheckbox
              checked={isChecked}
              onClick={(e) => e.stopPropagation()}
              onChange={() => {
                const newSet = new Set(selectedRowIds);
                isChecked
                  ? newSet.delete(item.user_id)
                  : newSet.add(item.user_id);
                setSelectedRowIds(newSet);
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

    columnHelper.accessor("user_name", {
      id: "user_name",
      header: "Name",
      cell: (info: any) => {
        const row = info.row.original;
        return (
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={row.user_thumb_image ? row.user_thumb_image : ""}
              alt={row.user_name}
              sx={{ width: 36, height: 36 }}
            />
            <Box textAlign="left" sx={{ flex: 1, minWidth: 0 }}>
              <Typography className="f-14" noWrap>
                {row.user_name}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {row.trade_name}
              </Typography>
            </Box>
          </Stack>
        );
      },
    }),

    columnHelper.accessor("total_hours", {
      id: "total_hours",
      header: "Total Hours",
      cell: (info: any) => {
        const row = info.row.original;
        const value = info.getValue();
        const formatted = formatHour(value) || "-";

        const hasPendingRequest =
          row.has_leave_request === true ||
          row.has_expense_request === true ||
          row.has_worklog_request === true;

        return (
          <Typography
            variant="h6"
            sx={{
              color: hasPendingRequest ? "#f97316" : "inherit",
            }}
          >
            {formatted}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("payable_total_hours", {
      id: "payable_total_hours",
      header: "Payable Hours",
      cell: (info: any) => formatHour(info.getValue()) || "-",
    }),

    columnHelper.accessor("daylog_payable_amount", {
      id: "daylog_payable_amount",
      header: "Daywork Total",
      cell: (info: any) => {
        const value = info.getValue();
        return value === 0 ? "0" : value ? `${currency}${value}` : "-";
      },
    }),

    columnHelper.accessor("pricework_total_amount", {
      id: "pricework_total_amount",
      header: "Pricework",
      cell: (info: any) => {
        const row = info.row.original;
        const value = info.getValue();
        const displayValue =
          value === 0 ? "0" : value ? `${currency}${value}` : "-";

        const hasPendingRequest =
          row.has_leave_request === true ||
          row.has_expense_request === true ||
          row.has_worklog_request === true;

        return (
          <Typography
            variant="h6"
            sx={{
              color: hasPendingRequest ? "#f97316" : "inherit",
            }}
          >
            {displayValue}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("total_expense_amount", {
      id: "total_expense_amount",
      header: "Expense",
      cell: (info: any) => {
        const row = info.row.original;
        const value = info.getValue();
        const displayValue =
          value === 0 ? "0" : value ? `${currency}${value}` : "-";

        const hasPendingRequest =
          row.has_leave_request === true ||
          row.has_expense_request === true ||
          row.has_worklog_request === true;

        return (
          <Typography
            variant="h6"
            sx={{
              color: hasPendingRequest ? "#f97316" : "inherit",
            }}
          >
            {displayValue}
          </Typography>
        );
      },
    }),

    columnHelper.accessor("total_payable_amount", {
      id: "total_payable_amount",
      header: "Total Payable Amount",
      cell: (info: any) => {
        const value = info.getValue();
        return value === 0 ? "0" : value ? `${currency}${value}` : "-";
      },
    }),

    columnHelper.accessor("status_text", {
      id: "status_text",
      header: "Status",
      cell: (info) => {
        const statusText = info.getValue() as string;
        const statusColorFromApi = (info.row.original as TimeClock)
          .status_color;

        if (!statusText || !statusColorFromApi) {
          return (
            <Typography color="textSecondary" variant="body2">
              -
            </Typography>
          );
        }

        const muiColors = [
          "success",
          "error",
          "warning",
          "primary",
          "info",
          "secondary",
        ] as const;

        if (muiColors.includes(statusColorFromApi as any)) {
          return (
            <Chip
              label={statusText}
              color={statusColorFromApi as any}
              size="small"
              sx={{
                height: 28,
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "capitalize",
              }}
            />
          );
        }

        return (
          <Chip
            label={statusColorFromApi}
            size="small"
            sx={{
              height: 28,
              fontWeight: 600,
              fontSize: "0.75rem",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #cbd5e1",
              textTransform: "capitalize",
            }}
          />
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
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
    if (!userIdParam || !startParam || !endParam) return;
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    (async () => {
      try {
        const fetchedData = await fetchData(startDateObj, endDateObj);
        const foundUser = fetchedData.find(
          (item) => Number(item.user_id) === Number(userIdParam)
        );
        if (foundUser) {
          saveDateToStorage(startDateObj, endDateObj);
          setSelectedTimeClock(foundUser);
          setDetailsOpen(true);
          router.replace("/apps/timesheet/list", { scroll: false });
        }

        setTimeout(() => {
          router.replace("/apps/timesheet/list", { scroll: false });
        }, 500);
      } catch (err) {
        console.error("Failed to load data from query params:", err);
      }
      router.replace("/apps/timesheet/list", { scroll: false });
    })();
  }, [searchParams]);

  const handleLock = async () => {
    const timesheetIds: (number | string)[] = [];

    // Only get timesheet IDs for SELECTED rows
    filteredData.forEach((item) => {
      if (selectedRowIds.has(item.user_id)) {
        timesheetIds.push(item.timesheet_light_ids);
      }
    });

    if (timesheetIds.length === 0) {
      setErrorMessage("No valid timesheets selected for locking.");
      return;
    }

    await toggleWeeklyTimesheetStatus(timesheetIds, "approve");
  };

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = (option: string) => {
    if (option) {
      handleExport(option);
    }
    setAnchorEl(null);
  };

  const handleExport = async (option: string) => {
    try {
      const timesheetIds: (number | string)[] = [];

      filteredData.forEach((item) => {
        if (selectedRowIds.has(item.user_id)) {
          timesheetIds.push(item.timesheet_light_ids);
        }
      });

      if (timesheetIds.length === 0) {
        setErrorMessage("No valid timesheets selected for exporting.");
        return;
      }

      const ids = timesheetIds.join(",");
      const response: AxiosResponse<ExportResponse> = await api.post(
        "/time-clock/export",
        { ids, format: option }
      );

      if (response.data.IsSuccess) {
        const { file, filename, contentType } = response.data.data;

        const binaryString = atob(file);
        const binaryLen = binaryString.length;
        const bytes = new Uint8Array(binaryLen);
        for (let i = 0; i < binaryLen; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: contentType });

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download =
          filename || `timeclock_export_${new Date().toISOString()}.${option}`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSelectedRowIds(new Set());

        if (startDate && endDate) {
          await fetchData(startDate, endDate);
        }
      } else {
        throw new Error(response.data.message || "Export request failed");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  };

  const handleUnlock = async () => {
    const timesheetIds: (number | string)[] = [];

    // Only get timesheet IDs for SELECTED rows
    filteredData.forEach((item) => {
      if (selectedRowIds.has(item.user_id)) {
        timesheetIds.push(item.timesheet_light_ids);
      }
    });

    if (timesheetIds.length === 0) {
      setErrorMessage("No valid timesheets selected for unlocking.");
      return;
    }

    await toggleWeeklyTimesheetStatus(timesheetIds, "unapprove");
  };

  const handleMarkAsPaid = async () => {
    const timesheetIds: (number | string)[] = [];

    // Only get timesheet IDs for SELECTED rows
    filteredData.forEach((item) => {
      if (selectedRowIds.has(item.user_id)) {
        timesheetIds.push(item.timesheet_light_ids);
      }
    });

    if (timesheetIds.length === 0) {
      setErrorMessage("No valid timesheets selected for marking as paid.");
      return;
    }

    try {
      const ids = timesheetIds.join(",");
      const response = await api.post("/timesheet/paid", { ids });
      if (response.data.IsSuccess) {
        if (startDate && endDate) {
          await fetchData(startDate, endDate);
        }
        setSelectedRowIds(new Set());
        setHasDataChanged(true);
      }
    } catch (error) {
      // setErrorMessage('Failed to mark timesheets as paid.');
    }
  };

  const toggleWeeklyTimesheetStatus = async (
    timesheetIds: (number | string)[],
    action: "approve" | "unapprove"
  ) => {
    if (timesheetIds.length === 0) return;

    try {
      const ids = timesheetIds.join(",");
      const endpoint =
        action === "approve" ? "/timesheet/approve" : "/timesheet/unapprove";

      const response = await api.post(endpoint, { ids });

      if (response.data.IsSuccess) {
        if (startDate && endDate) {
          await fetchData(startDate, endDate);
        }
        setSelectedRowIds(new Set());
        setHasDataChanged(true);
      } else {
        setErrorMessage(`Failed to ${action} timesheet(s).`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing weekly timesheets:`, error);
      setErrorMessage(`An error occurred while ${action}ing timesheet(s).`);
    }
  };

  const isAnyRowSelected = selectedRowIds.size > 0;

  const simpleColumns = columns.map((column) => ({
    name: column.id ?? "Unnamed Column",
    width: "auto",
  }));

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "calc(93vh - 100px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          transition: "height 0.3s ease-in-out",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <Box
          display={"flex"}
          justifyContent={"space-between"}
          alignItems="center"
          mb={2}
        >
          <Stack
            mx={2}
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1.5, sm: 2 }}
            alignItems="center"
            flexWrap="wrap"
          >
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              onChange={handleDateRangeChange}
            />
            <TextField
              placeholder="Search..."
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {isAnyRowSelected && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ textTransform: "none", fontWeight: 600 }}
                  onClick={handleExportClick}
                  endIcon={
                    open ? (
                      <IconChevronUp size={20} />
                    ) : (
                      <IconChevronDown size={20} />
                    )
                  }
                >
                  Export
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={() => handleExportClose("")}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                >
                  <MenuItem onClick={() => handleExportClose("summary")}>
                    Export Summary
                  </MenuItem>
                  <MenuItem onClick={() => handleExportClose("details")}>
                    Export Timeclock Details
                  </MenuItem>
                </Menu>

                <Button
                  startIcon={<IconLock size={16} />}
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={handleLock}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Lock
                </Button>

                <Button
                  startIcon={<IconLockOpen size={16} />}
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleUnlock}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Unlock
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={handleMarkAsPaid}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Paid
                </Button>
              </>
            )}
            <Button
              size="small"
              variant="outlined"
              color="primary"
              sx={{ textTransform: "none", fontWeight: 600 }}
              onClick={handleAddClick}
              endIcon={
                openAddleave ? (
                  <IconChevronUp size={20} />
                ) : (
                  <IconChevronDown size={20} />
                )
              }
            >
              <Typography sx={{ fontWeight: 600 }}>Add</Typography>
            </Button>
            <Menu
              anchorEl={addDropDown}
              open={openAddleave}
              onClose={handleAddClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem onClick={handleAddLeaveClick}>Add Leave</MenuItem>
              <MenuItem onClick={handleExpenseClick}>Add Expense</MenuItem>
              <MenuItem onClick={handleWorklogClick}>Add Worklog</MenuItem>
            </Menu>

            <IconButton onClick={(e) => setAnchorEl2(e.currentTarget)}>
              <IconTableColumn />
            </IconButton>
          </Stack>
        </Box>

        <Popover
          open={Boolean(anchorEl2)}
          anchorEl={anchorEl2}
          onClose={() => setAnchorEl2(null)}
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
                const excludedColumns = ["select"];
                if (excludedColumns.includes(col.id)) return false;
                return col.id.toLowerCase().includes(search.toLowerCase());
              })
              .map((col: any) => (
                <FormControlLabel
                  key={col.id}
                  control={
                    <Checkbox
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
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

        <Divider />

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table stickyHeader>
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
                        align="left"
                        sx={{
                          position: "sticky",
                          top: 0,
                          zIndex: 11,
                          // backgroundColor: '#fff',
                          p: 0,
                        }}
                      >
                        <Box
                          onClick={header.column.getToggleSortingHandler()}
                          sx={{
                            cursor: isSortable ? "pointer" : "default",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            py: 1.5,
                            ml: 0.5,
                            fontWeight: isActive ? 600 : 500,
                            // color: '#000',
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            "&:hover": { color: "#888" },
                            "&:hover .hoverIcon": { opacity: 1 },
                          }}
                        >
                          <Typography variant="body2">
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
                                transition: "opacity 0.2s",
                                opacity: isActive ? 1 : 0,
                                fontSize: "0.9rem",
                                color: isActive ? "#000" : "#888",
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
              {fetchTimesheet ? (
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
                  <TableRow
                    hover
                    key={row.id}
                    onMouseEnter={() => {
                      setHoveredRow(Number(row.original.user_id));
                    }}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => handleRowClick(row.original)}
                    sx={{
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        sx={{ padding: "10px" }}
                        align="left"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
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

      <Stack
        gap={1}
        pr={3}
        pt={2}
        pl={3}
        alignItems="center"
        direction={{ xs: "column", sm: "row" }}
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
              xs: "block",
              sm: "flex",
            },
          }}
          alignItems="center"
        >
          <Stack direction="row" alignItems="center">
            <Typography color="textSecondary">Page</Typography>
            <Typography color="textSecondary" fontWeight={600} ml={1}>
              {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </Typography>
            <Typography color="textSecondary" ml={"3px"}>
              {" "}
              | Entries :{" "}
            </Typography>
          </Stack>
          <Stack
            ml={"5px"}
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
              sx={{ width: "30px" }}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              size="small"
              sx={{ width: "30px" }}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight />
            </IconButton>
          </Stack>
        </Box>
      </Stack>

      <Drawer
        anchor="bottom"
        open={detailsOpen}
        onClose={closeDetails}
        PaperProps={{
          sx: {
            borderRadius: 0,
            height: "90vh",
            boxShadow: "none",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            overflow: "hidden",
          },
        }}
      >
        <TimeClockDetails
          open={detailsOpen}
          timeClock={selectedTimeClock}
          user_id={selectedTimeClock?.user_id}
          companyId={companyId}
          currency={currency}
          allUsers={filteredData}
          onClose={closeDetails}
          onUserChange={handleUserChange}
          onDataChange={handleDataChange}
          queryParams={{
            start_date: startParam,
            end_date: endParam,
            open: openParam,
          }}
        />
      </Drawer>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErrorMessage(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      {/*  Add Leave */}
      <Drawer
        anchor="right"
        open={addLeaveSidebar}
        onClose={closeAddLeaveSidebar}
        PaperProps={{
          sx: {
            borderRadius: 0,
            boxShadow: "none",
            overflow: "hidden",
            width: "504px",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          },
        }}
      >
        <AddLeave
          onClose={closeAddLeaveSidebar}
          userId={selectedTimeClock?.user_id}
          companyId={user.company_id}
        />
      </Drawer>

      {/* Add Expense */}
      <Drawer
        anchor="right"
        open={addExpenseSidebar}
        onClose={closeAddExpenseSidebar}
        PaperProps={{
          sx: {
            borderRadius: 0,
            boxShadow: "none",
            overflow: "hidden",
            width: "504px",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          },
        }}
      >
        <AddExpense
          onClose={closeAddExpenseSidebar}
          userId={selectedTimeClock?.user_id}
          selecteUser={true}
          companyId={user.company_id}
        />
      </Drawer>

      {/*  Add Worklog */}
      <Drawer
        anchor="right"
        open={addWorklogSidebar}
        onClose={closeAddWorklogSidebar}
        PaperProps={{
          sx: {
            borderRadius: 0,
            boxShadow: "none",
            overflow: "hidden",
            width: "504px",
            borderTopLeftRadius: 18,
            borderBottomLeftRadius: 18,
          },
        }}
      >
        <AddWorklog
          onClose={closeAddWorklogSidebar}
          userId={selectedTimeClock?.user_id}
          companyId={user.company_id}
        />
      </Drawer>
    </Box>
  );
};

export default TimeClock;
