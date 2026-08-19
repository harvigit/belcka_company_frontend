"use client";
import React, { useEffect, useState } from "react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import {
  Autocomplete,
  Box,
  CircularProgress,
  Grid,
  Stack,
  Drawer,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  TextField,
  Avatar,
  Tooltip,
  Button,
  InputAdornment,
} from "@mui/material";
import {
  IconArrowLeft,
  IconX,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";
import { format, parse } from "date-fns";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { useRouter } from "next/navigation";
import { getUserDetailsHref } from "@/utils/userDetailsRoute";
import Link from "next/link";
import { useTranslation } from "react-i18next";

dayjs.extend(customParseFormat);

interface Props {
  open: boolean;
  onClose: () => void;
  onRequestCountChange: any;
  isAdmin?: boolean;
}

type FilterOption = { id: number; name?: string };

const defaultFilters = {
  users: "" as string | number,
  status: "" as string | number,
  types: "" as string | number,
};

const STORAGE_KEY = "request-date-range";

const REQUEST_MESSAGE_TRANSLATION_KEYS = [
  "Requested to add leave on",
  "Requested to change timesheet hours from",
  "hours to",
  "hours on",
  "Rate change has been requested",
  "User requested to create billing info",
  "Requested to update billing information",
];

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

export default function UserRequests({
  open,
  onClose,
  onRequestCountChange,
  isAdmin,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(today.getDate() - today.getDay() + 1);
  const defaultEnd = new Date(today);
  defaultEnd.setDate(today.getDate() - today.getDay() + 7);

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const [requestCount, setRequestCount] = useState<number>(0);
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<FilterOption[]>([]);
  const [userOptions, setUserOptions] = useState<FilterOption[]>([]);
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: string | null;
    company_name?: string | null;
    company_image?: number | null;
    id: number;
    user_role_id: number;
  };

  const buildFiltersPayload = (activeFilters = filters) => {
    const payload: { users?: string; status?: string; types?: string } = {};
    if (activeFilters.users !== "" && activeFilters.users != null) {
      payload.users = String(activeFilters.users);
    }
    if (activeFilters.status !== "" && activeFilters.status != null) {
      payload.status = String(activeFilters.status);
    }
    if (activeFilters.types !== "" && activeFilters.types != null) {
      payload.types = String(activeFilters.types);
    }
    return Object.keys(payload).length ? payload : undefined;
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get("requests/get-filters");
      const info = res.data?.info || [];
      const statusFilter = info.find((item: any) => item.key === "status");
      const typesFilter = info.find((item: any) => item.key === "types");
      const usersFilter = info.find((item: any) => item.key === "users");
      setStatusOptions(statusFilter?.data || []);
      setTypeOptions(typesFilter?.data || []);
      setUserOptions(usersFilter?.data || []);
    } catch (err) {
      console.error("Failed to fetch request filters", err);
    }
  };

  const fetchRequests = async (
    start: Date,
    end: Date,
    activeFilters = filters,
    search = debouncedSearch,
  ): Promise<void> => {
    try {
      setLoading(true);
      const filterPayload = buildFiltersPayload(activeFilters);
      const payload: any = {
        user_id: Number(user?.id),
        company_id: Number(user?.company_id),
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
      };
      const param: any = {
        company_id: Number(user?.company_id),
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
      };
      if (filterPayload) {
        payload.filters = filterPayload;
        param.filters = filterPayload;
      }
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        payload.search = trimmedSearch;
        param.search = trimmedSearch;
      }
      let res;
      if (isAdmin) {
        res = await api.post(`requests/get-all-request`, param);
      } else if (user?.user_role_id === 1) {
        res = await api.post(`requests/get-all-request`, param);
      } else {
        res = await api.post(`requests/get-all-request`, payload);
      }
      if (res.data?.requests) setData(res.data.requests);
      else setData([]);
      const pendingCount = res.data.requests?.[0]?.count ?? 0;
      setRequestCount(pendingCount);

      const hasActiveFilters = Boolean(buildFiltersPayload(activeFilters));
      const hasSearch = Boolean(trimmedSearch);
      if (!hasActiveFilters && !hasSearch) {
        onRequestCountChange?.(pendingCount);
      }
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchFilterOptions();
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (open && startDate && endDate) {
      fetchRequests(startDate, endDate, filters, debouncedSearch);
    }
  }, [startDate, endDate, open, filters, debouncedSearch]);

  useEffect(() => {
    setSearchTerm("");
    setDebouncedSearch("");
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

  // Helper to parse leave date from work record
  const getLeaveDate = (work: any): string | undefined => {
    // Try dedicated leave date fields first
    if (work.start_date) {
      try {
        // If already in yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(work.start_date)) {
          return work.start_date;
        }
        // If in dd/MM/yyyy format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(work.start_date)) {
          const parsed = parse(work.start_date, "dd/MM/yyyy", new Date());
          return format(parsed, "yyyy-MM-dd");
        }
      } catch {}
    }

    if (work.leave_date) {
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(work.leave_date)) {
          return work.leave_date;
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(work.leave_date)) {
          const parsed = parse(work.leave_date, "dd/MM/yyyy", new Date());
          return format(parsed, "yyyy-MM-dd");
        }
      } catch {}
    }

    // Fallback: parse from date_added (creation date - less accurate)
    if (work.date_added) {
      try {
        const parsed = parse(work.date_added, "d MMMM yyyy HH:mm", new Date());
        return format(parsed, "yyyy-MM-dd");
      } catch {}
    }

    return undefined;
  };

  const REQUEST_ROUTE_MAP: Record<
    string,
    (recordId?: number, startDate?: string, endDate?: string) => string
  > = {
    Shift: (recordId, startDate, endDate) => {
      let url = `/apps/time-clock/list`;
      const params: any[] = [];
      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push("type=shift");
      params.push(`open=true`);
      if (params.length > 0) url += `?${params.join("&")}`;
      return url;
    },
    "Billing Info": (id) => getUserDetailsHref(id, { tab: "billing" }),
    Company: (id) => getUserDetailsHref(id, { tab: "rate" }),
    Rate: (id) => getUserDetailsHref(id, { tab: "rate" }),
    Comapny: (id) => getUserDetailsHref(id, { tab: "billing" }),
    Project: (id) => `/apps/projects/index?id=${id}`,
    Team: (id) => `/apps/teams/team?team_id=${id}`,
    Penalty: (recordId, startDate, endDate) => {
      let url = `/apps/time-clock/list`;
      const params: any[] = [];
      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push("type=penalty");
      params.push(`open=true`);
      if (params.length > 0) url += `?${params.join("&")}`;
      return url;
    },
    "Work log": (recordId, startDate, endDate) => {
      let url = `/apps/time-clock/list`;
      const params: any[] = [];
      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push("type=worklog");
      params.push(`open=true`);
      if (params.length > 0) url += `?${params.join("&")}`;
      return url;
    },
    Worklog: (recordId, startDate, endDate) => {
      let url = `/apps/time-clock/list`;
      const params: any[] = [];
      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push("type=worklog");
      params.push(`open=true`);
      if (params.length > 0) url += `?${params.join("&")}`;
      return url;
    },
    // Pass leave dates directly in URL params - no localStorage needed
    Leave: (recordId, startDate, endDate) => {
      return getUserDetailsHref(recordId, {
        tab: "leave",
        leave_start: startDate,
        leave_end: endDate,
      });
    },
  };

  const STATUS_COLOR: Record<string, string> = {
    pending: "#FF7F00",
    approved: "#4CBC6D",
    rejected: "#FF484B",
  };

  const TYPE_COLOR: Record<string, string> = {
    Shift: "#FF7F00",
    "Billing Info": "#4CBC6D",
    Company: "#f5c21bf8",
    Rate: "#f5c21bf8",
    Leave: "#949090ff",
    "Work log": "#FF7F00",
    Worklog: "#FF7F00",
    Timesheet: "#FFFF7F00",
    "User Account": "#FF3F51B5",
    Penalty: "#ff3737ff",
    Adjustment: "#0066ffff",
  };

  const translateRequestText = (value?: string | null) => {
    if (!value) return "";

    return REQUEST_MESSAGE_TRANSLATION_KEYS.reduce(
      (message, key) => message.replaceAll(key, t(key)),
      value,
    );
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          width: 500,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 500,
            padding: 2,
            backgroundColor: "#f9f9f9",
          },
        }}
      >
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={onClose}>
              <IconArrowLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={700}>
              {isAdmin || user?.user_role_id == 1 ? t("Requests") : t("My Requests")}
            </Typography>
          </Stack>
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        </Box>

        {/* Search / filters */}
        <Box mb={2} display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <DateRangePickerBox
            from={startDate}
            to={endDate}
            onChange={handleDateRangeChange}
            buttonMinWidth={200}
          />
          <TextField
            size="small"
            placeholder={t("Search...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 140 }}
          />
          <Button
            variant="contained"
            onClick={() => {
              setTempFilters(filters);
              setFilterOpen(true);
            }}
            sx={{ minWidth: "40px", px: 1 }}
          >
            <IconFilter width={18} />
          </Button>
        </Box>

        {/* Content */}
        <Box
          flex={1}
          overflow="auto"
          px={2}
          pb={2}
          sx={{ maxHeight: "calc(95vh - 120px)" }}
        >
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={240}
            >
              <CircularProgress size={36} />
            </Box>
          ) : data.length > 0 ? (
            <Grid container spacing={2}>
                {data.map((work, idx) => {
                  const href = (() => {
                    const routeFn = REQUEST_ROUTE_MAP[work.type_name];
                    if (!routeFn) return "";
                    if (
                      ["Shift", "Penalty", "Work log", "Worklog"].includes(
                        work.type_name,
                      )
                    ) {
                      const dateAdded = work.date_added
                        ? parse(
                            work.date_added,
                            "d MMMM yyyy HH:mm",
                            new Date(),
                          )
                        : undefined;
                      const formattedDate = dateAdded
                        ? format(dateAdded, "yyyy-MM-dd")
                        : undefined;
                      return routeFn(work.user_id, formattedDate, formattedDate);
                    } else if (work.type_name === "Leave") {
                      const leaveDate = getLeaveDate(work);
                      return routeFn(work.user_id, leaveDate, leaveDate);
                    } else if (work.type_name === "Team") {
                      return routeFn(work.team_id);
                    } else if (work.type_name === "Project") {
                      return routeFn(work?.project_id ?? work?.record_id);
                    } else {
                      return routeFn(work.user_id);
                    }
                  })();

                  return (
                    <Grid size={{ xs: 12, md: 12 }} mt={1} key={idx}>
                      <Link
                        href={href}
                        style={{ textDecoration: "none", color: "inherit", display: "block" }}
                        onClick={() => onClose()}
                      >
                        <Box
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
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                    <Box
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
                          bgcolor: TYPE_COLOR[work.type_name] || "#757575",
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        {t(work.type_name)}
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
                            {work.user_name}:
                          </Typography>
                          <Typography variant="h5">{translateRequestText(work.message)}</Typography>
                          {work.request_note && (
                            <Box
                              display={"flex"}
                              alignItems={"center"}
                              gap={0.3}
                            >
                              <Typography
                                variant="subtitle1"
                                color="textSecondary"
                              >
                                {t("Note:")}
                              </Typography>
                              <Tooltip title={work.request_note ?? ""}>
                                <Typography
                                  variant="subtitle1"
                                  color="textSecondary"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 1,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    wordBreak: "break-word",
                                    maxWidth: "500px",
                                    borderRadius: 1,
                                    border: "1px solid transparent",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  {work.request_note}
                                </Typography>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                        <Box justifyContent={"flex-end"}>
                          <Typography
                            variant="body2"
                            sx={{
                              px: 1.6,
                              py: 0.7,
                              borderRadius: "18px",
                              border: 2,
                              borderColor:
                                STATUS_COLOR[work.status_text.toLowerCase()] ||
                                "#757575",
                              color:
                                STATUS_COLOR[work.status_text.toLowerCase()] ||
                                "#757575",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "capitalize",
                            }}
                          >
                            {t(work.status_text)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box display={"flex"} justifyContent={"flex-end"} mt={0}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontSize={"12px !important"}
                      >
                        {work.date}
                      </Typography>
                    </Box>
                        </Box>
                      </Link>
                    </Grid>
                  );
                })}
            </Grid>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              mt={4}
            >
              {t("No requests found.")}
            </Typography>
          )}
        </Box>
      </Drawer>

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative" }}>
          {t("Filters")}
          <IconButton
            aria-label={t("Close")}
            onClick={() => setFilterOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={userOptions}
              getOptionLabel={(option) => option.name ? t(option.name) : ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                userOptions.find(
                  (u) => String(u.id) === String(tempFilters.users),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  users: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label={t("User")} fullWidth />
              )}
            />
            <Autocomplete
              options={statusOptions}
              getOptionLabel={(option) => option.name ? t(option.name) : ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                statusOptions.find(
                  (s) => String(s.id) === String(tempFilters.status),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  status: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label={t("Status")} fullWidth />
              )}
            />
            <Autocomplete
              options={typeOptions}
              getOptionLabel={(option) => option.name ? t(option.name) : ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                typeOptions.find(
                  (t) => String(t.id) === String(tempFilters.types),
                ) || null
              }
              onChange={(_, value) =>
                setTempFilters({
                  ...tempFilters,
                  types: value ? value.id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} label={t("Types")} fullWidth />
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
            }}
          >
            {t("Clear")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setFilters(tempFilters);
              setFilterOpen(false);
            }}
          >
            {t("Apply")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
