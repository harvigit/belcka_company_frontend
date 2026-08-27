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
  Collapse,
  Chip,
} from "@mui/material";

const DiffView = ({ diffs }: { diffs: any[] }) => {
  const IGNORED_KEYS = [
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "user_id",
    "company_id",
    "expired_at",
  ];
  const filteredDiffs = diffs?.filter(
    (diff) => !IGNORED_KEYS.includes(diff.key),
  );
  const [open, setOpen] = useState(false);

  if (!filteredDiffs?.length) return null;

  return (
    <Box width="100%">
      <Box
        display="flex"
        alignItems="center"
        sx={{ cursor: "pointer", width: "fit-content" }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <Typography fontSize={12} color="primary" fontWeight={600}>
          {open ? "Hide Changes" : "View Changes"}
        </Typography>
      </Box>
      <Collapse in={open}>
        <Box
          mt={0.5}
          p={1}
          bgcolor="#f8fafc"
          borderRadius={2}
          border="1px solid #e2e8f0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {filteredDiffs.map((diff: any, i: number) => (
            <Typography
              key={i}
              fontSize={11}
              color="text.secondary"
              mt={i > 0 ? 0.75 : 0}
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 0.5,
              }}
            >
              <Typography
                component="span"
                fontSize={11}
                fontWeight={600}
                sx={{ textTransform: "uppercase" }}
              >
                {diff.key.replace(/_/g, " ")}
              </Typography>
              {(!diff.old || diff.old === "") && diff.new && diff.new !== "" ? (
                <>
                  {" - added as "}
                  <Chip
                    size="small"
                    label={String(diff.new)}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </>
              ) : (
                <>
                  {" - changed from "}
                  <Chip
                    size="small"
                    label={String(diff.old || "none")}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                  {" to "}
                  <Chip
                    size="small"
                    label={String(diff.new || "none")}
                    sx={{
                      height: 18,
                      fontSize: 10,
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      "& .MuiChip-label": { px: 1 },
                    }}
                  />
                </>
              )}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};
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
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: 0,
            height: "95vh",
            boxShadow: "none",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: 3,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box display={"flex"} gap={3} alignItems="end">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={onClose}>
                  <IconArrowLeft />
                </IconButton>
                <Typography variant="h6" fontWeight={600}>
                  {isAdmin || user?.user_role_id == 1
                    ? t("Requests")
                    : t("My Requests")}
                </Typography>
              </Box>
              {/* Filters Row */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems="center"
                spacing={2}
              >
                <TextField
                  placeholder={t("Search...")}
                  size="small"
                  sx={{ width: { xs: "100%", md: 300 } }}
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

                <Box sx={{ width: { xs: "100%", md: "auto" } }}>
                  <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={handleDateRangeChange}
                  />
                </Box>

                <Tooltip title="Filter requests" arrow>
                  <Button
                    variant={
                      Object.values(filters).some(Boolean)
                        ? "contained"
                        : "outlined"
                    }
                    color="primary"
                    onClick={() => {
                      setTempFilters(filters);
                      setFilterOpen(true);
                    }}
                    startIcon={<IconFilter size={18} />}
                    sx={{
                      minWidth: 120,
                      height: 40,
                      width: { xs: "100%", md: "auto" },
                    }}
                  >
                    Filters
                  </Button>
                </Tooltip>
              </Stack>
            </Box>

            <IconButton onClick={onClose}>
              <IconX />
            </IconButton>
          </Box>

          {/* Content Area */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 2 }}>
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
              <Grid container spacing={3} marginTop={2}>
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
                      return routeFn(
                        work.user_id,
                        formattedDate,
                        formattedDate,
                      );
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
                    <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                      <Link
                        href={href}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                          height: "100%",
                        }}
                        onClick={() => onClose()}
                      >
                        <Box
                          position="relative"
                          display="flex"
                          flexDirection="column"
                          p={1.5}
                          pt={2.5}
                          sx={{
                            width: "100%",
                            height: "fit-content",
                            borderRadius: "16px",
                            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
                            border: "1px solid #eaeaea",
                            background: "#fff",
                          }}
                        >
                          <Box
                            position="absolute"
                            top="-12px"
                            left="12px"
                            display="flex"
                            gap={1}
                          >
                            <Box
                              bgcolor={TYPE_COLOR[work.type_name] || "#757575"}
                              px={1.5}
                              py={0.5}
                              borderRadius="8px"
                              boxShadow={`0px 4px 10px ${TYPE_COLOR[work.type_name] || "#757575"}40`}
                            >
                              <Typography
                                color="#fff"
                                fontSize={11}
                                fontWeight={700}
                                textTransform="uppercase"
                                letterSpacing={0.5}
                              >
                                {t(work.type_name)}
                              </Typography>
                            </Box>
                            {work.project_name && (
                              <Box
                                bgcolor="#fff"
                                border="1px solid"
                                borderColor="primary.main"
                                px={1.5}
                                py={0.5}
                                borderRadius="8px"
                              >
                                <Typography
                                  color="primary.main"
                                  fontSize={11}
                                  fontWeight={700}
                                  textTransform="uppercase"
                                  letterSpacing={0.5}
                                >
                                  {t(work.project_name)}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <Box display="flex" gap={1} mb={0.5}>
                            <Avatar
                              src={work.user_image}
                              alt={work.user_name}
                              sx={{ width: 36, height: 36 }}
                            />
                            <Box flex={1}>
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                gap={1}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight={700}
                                >
                                  {work.user_name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: "12px",
                                    border: "1px solid",
                                    borderColor:
                                      STATUS_COLOR[
                                        work.status_text.toLowerCase()
                                      ] || "#757575",
                                    color:
                                      STATUS_COLOR[
                                        work.status_text.toLowerCase()
                                      ] || "#757575",
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {t(work.status_text)}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25, lineHeight: 1.2 }}
                              >
                                {translateRequestText(work.message)}
                              </Typography>
                            </Box>
                          </Box>

                          {work.diff_data && work.diff_data.length > 0 && (
                            <Box ml={5.5}>
                              <DiffView diffs={work.diff_data} />
                            </Box>
                          )}
                          {work.request_note && (
                            <Box
                              bgcolor="#f8fafc"
                              p={1}
                              borderRadius={2}
                              my={0.5}
                              ml={5.5}
                              sx={{ border: "1px solid #f1f5f9" }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                                display="block"
                              >
                                {t("NOTE")}:
                              </Typography>
                              <Typography variant="caption" color="text.primary">
                                {work.request_note}
                              </Typography>
                            </Box>
                          )}
                          <Box
                            mt="auto"
                            display="flex"
                            justifyContent="end"
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
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
              getOptionLabel={(option) => (option.name ? t(option.name) : "")}
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
              getOptionLabel={(option) => (option.name ? t(option.name) : "")}
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
              getOptionLabel={(option) => (option.name ? t(option.name) : "")}
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
