"use client";
import React, { useEffect, useState, useMemo } from "react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  Box,
  Grid,
  Stack,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Avatar,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  IconArrowLeft,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { useRouter } from "next/navigation";
import { capitalize } from "lodash";
import { useSearchParams } from "next/navigation";

dayjs.extend(customParseFormat);

interface Props {
  open: boolean;
  onClose: () => void;
  queryParams?: {
    user_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    open?: string | null;
  };
}

const TIME_CLOCK_PAGE = "time-clock-page";
const TIME_CLOCK_DETAILS_PAGE = "time-clock-details-page";
const STORAGE_KEY = "request-date-range";
const LEAVE_STORAGE_KEY = "leave-range";

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

const LEAVE_TYPE_COLOR: Record<string, string> = {
  paid: "#4CBC6D",
  unpaid: "#FF9800",
};

const parseLeaveDate = (value?: string | null) => {
  if (!value) return null;

  const parsers = [
    () => parseISO(value),
    () => parse(value, "dd/MM/yyyy", new Date()),
    () => parse(value, "dd/MMM/yyyy", new Date()),
    () => parse(value, "dd MMM yyyy", new Date()),
    () => parse(value, "yyyy-MM-dd", new Date()),
  ];

  for (const parser of parsers) {
    const date = parser();
    if (isValid(date)) return date;
  }

  const fallbackDate = new Date(value);
  return isValid(fallbackDate) ? fallbackDate : null;
};

const getLeaveType = (leave: any) =>
  String(leave?.leave_type ?? leave?.type ?? leave?.paid_type ?? "").toLowerCase();

const getLeaveColor = (leave: any) =>
  LEAVE_TYPE_COLOR[getLeaveType(leave)] || leave?.color || "#4CBC6D";

const getStatusColor = (leave: any) => {
  const statusText = String(leave?.status_text ?? "").toLowerCase();

  if (Number(leave?.status) === 5 || statusText === "approved") return "#008000";
  if (Number(leave?.status) === 12 || statusText === "rejected") return "#ff1744";
  return leave?.color || "#f59e0b";
};

const getMonthDays = (month: Date) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days: Date[] = [];

  for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
    days.push(date);
  }

  return days;
};

export default function LeaveLists({ open, onClose, queryParams }: Props) {
  const router = useRouter();
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);
  const searchParams = useSearchParams();
  const [selectedTimeClock, setSelectedTimeClock] = useState<any | null>(null);
  // Load from localStorage or use defaults
  const getInitialDates = () => {
    const stored = loadDateRangeFromStorage();
    if (stored && stored.startDate && stored.endDate) {
      return {
        startDate: stored.startDate,
        endDate: stored.endDate,
      };
    }
    return {
      startDate: defaultStart,
      endDate: defaultEnd,
    };
  };

  const initialDates = getInitialDates();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    startOfMonth(initialDates.startDate || new Date()),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(
    initialDates.startDate || new Date(),
  );
  const [calendarLeaves, setCalendarLeaves] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchRequests = async (
    start: Date,
    end: Date,
    id?: string | null,
  ): Promise<any> => {
    try {
      setLoading(true);
      const payload = {
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
        user_id: Number(id),
      };

      const res = await api.post(`user-leaves/get-list`, payload);
      if (res.data?.data) setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
    return [];
  };

  const fetchCalendarLeaves = async (month: Date): Promise<void> => {
    setCalendarLoading(true);
    try {
      const days = getMonthDays(month);
      const payload: Record<string, any> = {
        start_date: format(days[0], "dd/MM/yyyy"),
        end_date: format(days[days.length - 1], "dd/MM/yyyy"),
      };

      if (queryParams?.user_id) {
        payload.user_id = Number(queryParams.user_id);
      }

      const res = await api.post(`user-leaves/get-list`, payload);
      setCalendarLeaves(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch leave calendar", err);
      setCalendarLeaves([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  const openLeaveCalendar = () => {
    const baseDate = startDate || new Date();
    const month = startOfMonth(baseDate);
    setCalendarMonth(month);
    setSelectedCalendarDate(baseDate);
    setCalendarOpen(true);
    fetchCalendarLeaves(month);
  };

  const closeLeaveCalendar = () => setCalendarOpen(false);

  const changeCalendarMonth = (month: Date) => {
    const nextMonth = startOfMonth(month);
    setCalendarMonth(nextMonth);
    setSelectedCalendarDate(nextMonth);
    fetchCalendarLeaves(nextMonth);
  };

  const leavesForDate = (date: Date) =>
    calendarLeaves.filter((leave) => {
      const leaveStart = parseLeaveDate(leave.start_date || leave.leave_date);
      const leaveEnd = parseLeaveDate(
        leave.end_date || leave.start_date || leave.leave_date,
      );

      if (!leaveStart) return false;
      const normalizedEnd = leaveEnd || leaveStart;

      return date >= startOfDay(leaveStart) && date <= startOfDay(normalizedEnd);
    });

  useEffect(() => {
    if (startDate && endDate && open) fetchRequests(startDate, endDate);
  }, [startDate && endDate, open]);

  useEffect(() => {
    if (
      !queryParams?.user_id ||
      !queryParams?.start_date ||
      !queryParams?.end_date
    ) {
      return;
    }

    const startDateObj = new Date(queryParams?.start_date as string);
    const endDateObj = new Date(queryParams?.end_date as string);

    setStartDate(startDateObj);
    setEndDate(endDateObj);

    const fetchDataFromQueryParams = async () => {
      try {
        const fetchedData = await fetchRequests(
          startDateObj,
          endDateObj,
          queryParams?.user_id as string,
        );

        const foundUser = fetchedData.find(
          (item: any) => Number(item.user_id) === Number(queryParams?.user_id),
        );

        if (foundUser) {
          saveDateToStorage(startDateObj, endDateObj);
          setSelectedTimeClock(foundUser);
          router.replace("/apps/timesheet/list", { scroll: false });
        }
      } catch (err) {
        console.error("Failed to load data from query params:", err);
      }
      router.replace("/apps/timesheet/list", { scroll: false });
    };

    fetchDataFromQueryParams();
  }, [
    searchParams,
    queryParams?.user_id,
    queryParams?.start_date,
    queryParams?.end_date,
  ]);

  useEffect(() => {
    setSearchTerm("");
  }, [onClose]);
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

  const saveDateRangeToStorage = (
    startDate: Date | null,
    endDate: Date | null,
  ) => {
    try {
      const dateRange = {
        startDate: startDate ? startDate.toDateString() : null,
        endDate: endDate ? endDate.toDateString() : null,
      };
      localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(dateRange));
    } catch (error) {
      console.error("Error saving date range to localStorage:", error);
    }
  };

  const REQUEST_ROUTE_MAP: Record<
    string,
    (recordId?: number, startDate?: string, endDate?: string) => string
  > = {
    Leave: (id, startDate, endDate) => {
      if (startDate && endDate) {
        saveDateRangeToStorage(new Date(startDate), new Date(endDate));
      }
      return `/apps/users/${id}?tab=leave`;
    },
  };

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      [
        item.user_name,
        item.manager_note,
        item.leave_name,
        item.start_date,
        item.end_date,
        item.end_time,
        item.start_time,
        item.type,
      ]
        .filter(Boolean)
        .some((field) =>
          field.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );
  }, [data, searchTerm]);
  const calendarDays = getMonthDays(calendarMonth);
  const selectedDateLeaves = leavesForDate(selectedCalendarDate);

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: "100%",
          height: { xs: "92vh", md: "88vh" },
          maxHeight: "100vh",
          padding: { xs: 2, md: 3 },
          backgroundColor: "#f9f9f9",
          borderTopLeftRadius: { xs: 16, md: 24 },
          borderTopRightRadius: { xs: 16, md: 24 },
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Leaves
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={openLeaveCalendar} color="primary">
            <IconCalendar />
          </IconButton>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Stack>
      </Box>

      {/* Search */}
      <Box
        mb={2}
        display="flex"
        gap={1}
        alignContent="center"
        flexDirection={{ xs: "column", sm: "row" }}
        sx={{
          "& .MuiTextField-root": {
            width: { xs: "100%", sm: 320 },
          },
        }}
      >
        <TextField
          placeholder="Search leaves..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <DateRangePickerBox
          from={startDate}
          to={endDate}
          onChange={handleDateRangeChange}
        />
      </Box>

      {/* Content */}
      <Box
        flex={1}
        overflow="auto"
        pb={2}
        sx={{ minHeight: 0 }}
      >
        {loading ? (
          <></>
        ) : filteredData.length > 0 ? (
          <Grid container spacing={2}>
            {filteredData.map((work, idx) => (
              <Grid size={{ xs: 12, md: 6, xl: 4 }} mt={1} key={idx}>
                <Box
                  onClick={() => {
                    const routeFn = REQUEST_ROUTE_MAP["Leave"];
                    if (routeFn) {
                      const formattedDate = work.start_date
                        ? format(
                            parse(work.start_date, "dd/MM/yyyy", new Date()),
                            "yyyy-MM-dd",
                          )
                        : undefined;

                      const formattedEndDate = work.end_date
                        ? format(
                            parse(work.end_date, "dd/MM/yyyy", new Date()),
                            "yyyy-MM-dd",
                          )
                        : undefined;

                      router.push(
                        routeFn(work.user_id, formattedDate, formattedEndDate),
                      );
                      onClose();
                    }
                  }}
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 2,
                    position: "relative",
                    p: 2,
                    bgcolor: "white",
                    transition: "0.2s",
                    cursor: "pointer",
                    "&:hover": {
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  <Box
                    display={"flex"}
                    gap={2}
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                    sx={{ top: -8, position: "absolute" }}
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        px: 1.2,
                        py: 0.2,
                        borderRadius: "12px",
                        bgcolor: "gray",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {work.leave_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        px: 1.2,
                        py: 0.2,
                        borderRadius: "12px",
                        borderColor:
                          work.leave_type == "paid" ? "#39af43ff" : "orange",
                        bgcolor:
                          work.leave_type == "paid" ? "#39af43ff" : "orange",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {work.leave_type}
                    </Typography>
                  </Box>
                  <Box display={"flex"} gap={1} mt={1}>
                    <Avatar
                      src={work.user_image}
                      alt={work.user_name}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Box
                      display={"flex"}
                      justifyContent={"space-between"}
                      width={"100%"}
                    >
                      <Box>
                        <Typography variant="h1" fontSize={"16px !important"}>
                          {work.user_name}
                        </Typography>
                        <Typography>
                          {work.start_date
                            ? `Date: ${capitalize(work.start_date)} ${
                                work.is_allday_leave ? `- ${work.end_date}` : ""
                              }`
                            : ""}
                        </Typography>
                        <Typography>
                          {work.start_time
                            ? `Time: ${capitalize(work.start_time)} ${
                                !work.is_allday_leave
                                  ? `- ${work.end_time}`
                                  : ""
                              }`
                            : ""}
                        </Typography>
                      </Box>
                      {work.request_status !== 0 && (
                        <Box justifyContent={"flex-end"}>
                          <Typography
                            variant="body2"
                            sx={{
                              px: 1.6,
                              py: 0.7,
                              borderRadius: "18px",
                              border: 2,
                              borderColor: work?.color || "#757575",
                              color: work?.color || "#757575",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "capitalize",
                            }}
                          >
                            {work?.status_text}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {work.manager_note && (
                    <Box
                      display={"flex"}
                      justifyContent={"start"}
                      mt={0}
                      ml={5.5}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontSize={"14px !important"}
                        noWrap
                      >
                        Note: {work.manager_note}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mt={4}
          >
            No requests found.
          </Typography>
        )}
      </Box>

      <Drawer
        anchor="bottom"
        open={calendarOpen}
        onClose={closeLeaveCalendar}
        sx={{
          "& .MuiDrawer-paper": {
            width: "100%",
            height: { xs: "94vh", md: "90vh" },
            maxHeight: "100vh",
            p: { xs: 2, md: 3 },
            backgroundColor: "#f8fafc",
            borderTopLeftRadius: { xs: 16, md: 24 },
            borderTopRightRadius: { xs: 16, md: 24 },
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Leave Calendar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All users leave requests
            </Typography>
          </Box>
          <IconButton onClick={closeLeaveCalendar}>
            <IconX />
          </IconButton>
        </Box>

        <Stack direction="row" spacing={3} alignItems="center" mb={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: LEAVE_TYPE_COLOR.paid,
              }}
            />
            <Typography color="text.secondary">Paid</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: LEAVE_TYPE_COLOR.unpaid,
              }}
            />
            <Typography color="text.secondary">Unpaid</Typography>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: { md: 1 } }}>
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e5e7eb" }}
            >
              <IconButton onClick={() => changeCalendarMonth(subMonths(calendarMonth, 1))}>
                <IconChevronLeft />
              </IconButton>
              <Typography variant="h5" fontWeight={700}>
                {format(calendarMonth, "MMMM yyyy")}
              </Typography>
              <IconButton onClick={() => changeCalendarMonth(addMonths(calendarMonth, 1))}>
                <IconChevronRight />
              </IconButton>
            </Box>

            <Grid container columns={7}>
              {["SUN", "MON", "TUE", "WED", "THUR", "FRI", "SAT"].map((day) => (
                <Grid key={day} size={1}>
                  <Typography
                    sx={{
                      p: 1.25,
                      fontSize: 13,
                      fontWeight: 700,
                      color: day === "SUN" || day === "SAT" ? "#ff4d4f" : "text.primary",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}

              {calendarDays.map((day) => {
                const dayLeaves = leavesForDate(day);
                const selected = isSameDay(day, selectedCalendarDate);

                return (
                  <Grid key={day.toISOString()} size={1}>
                    <Box
                      onClick={() => setSelectedCalendarDate(day)}
                      sx={{
                        minHeight: { xs: 76, sm: 96 },
                        p: 1,
                        borderRight: "1px solid #e5e7eb",
                        borderBottom: "1px solid #e5e7eb",
                        cursor: "pointer",
                        bgcolor: selected ? "#e8f1ff" : "#fff",
                        opacity: isSameMonth(day, calendarMonth) ? 1 : 0.48,
                        "&:hover": { bgcolor: selected ? "#e8f1ff" : "#f8fafc" },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 16,
                          fontWeight: selected ? 700 : 500,
                          color:
                            day.getDay() === 0 || day.getDay() === 6
                              ? "#ff4d4f"
                              : "text.primary",
                        }}
                      >
                        {format(day, "d")}
                      </Typography>

                      <Stack spacing={0.5} mt={1}>
                        {dayLeaves.slice(0, 2).map((leave) => (
                          <Box
                            key={`${leave.id}-${day.toISOString()}`}
                            sx={{
                              height: 7,
                              borderRadius: 4,
                              bgcolor: getLeaveColor(leave),
                            }}
                          />
                        ))}
                        {dayLeaves.length > 2 && (
                          <Typography variant="caption" color="text.secondary">
                            +{dayLeaves.length - 2} more
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Box mt={3}>
            <Typography variant="h6" fontWeight={700} mb={1}>
              {format(selectedCalendarDate, "dd/MMM/yyyy")}
              {selectedDateLeaves.length
                ? ` (${selectedDateLeaves.length} Leave${
                    selectedDateLeaves.length > 1 ? "s" : ""
                  })`
                : ""}
            </Typography>

            {calendarLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : selectedDateLeaves.length ? (
              <Grid container spacing={2}>
                {selectedDateLeaves.map((leave) => (
                  <Grid key={leave.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <Box
                      sx={{
                        bgcolor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 3,
                        p: 2,
                        height: "100%",
                      }}
                    >
                      <Box display="flex" justifyContent="space-between" gap={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {leave.leave_name || "Leave"}
                          </Typography>
                          <Typography color="text.secondary">
                            {leave.user_name ? `${leave.user_name} | ` : ""}
                            Date: {leave.leave_date || leave.start_date}
                            {leave.end_date && leave.end_date !== leave.start_date
                              ? ` - ${leave.end_date}`
                              : ""}
                          </Typography>
                          {(leave.start_time || leave.end_time) && (
                            <Typography color="text.secondary">
                              Time: {leave.start_time || "-"} - {leave.end_time || "-"}
                            </Typography>
                          )}
                          <Typography color="text.secondary">
                            Duration: {leave.duration || "All Day"}
                          </Typography>
                        </Box>
                        <Stack spacing={1} alignItems="flex-end">
                          <Chip
                            label={getLeaveType(leave) || "Leave"}
                            sx={{
                              bgcolor: getLeaveColor(leave),
                              color: "#fff",
                              textTransform: "capitalize",
                              fontWeight: 600,
                            }}
                          />
                          {leave.status_text && (
                            <Chip
                              label={leave.status_text}
                              variant="outlined"
                              sx={{
                                borderColor: getStatusColor(leave),
                                color: getStatusColor(leave),
                                textTransform: "capitalize",
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box
                sx={{
                  bgcolor: "#fff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 3,
                  p: 3,
                  textAlign: "center",
                }}
              >
                <Typography color="text.secondary">No leave on this date.</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </Drawer>
  );
}
