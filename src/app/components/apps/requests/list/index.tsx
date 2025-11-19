"use client";
import React, { useEffect, useState, useMemo } from "react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import {
  Box,
  Grid,
  Stack,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Avatar,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { useRouter } from "next/navigation";
import { capitalize } from "lodash";

dayjs.extend(customParseFormat);

interface CompanyList {
  id: number;
  table_name: string;
  user_name: string;
  message: string;
  status_text: string;
  date: string;
  action: string;
  note: string;
  company: string;
  user_image: string;
  type_name: string;
  user_id: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}
const STORAGE_KEY = "request-date-range";
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
  endDate: Date | null
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
}: Props) {
  const router = useRouter();
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
    }
    return {
      startDate: defaultStart,
      endDate: defaultEnd,
    };
  };

  const initialDates = getInitialDates();

  const [data, setData] = useState<CompanyList[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const [requestCount, setRequestCount] = useState<number>(0);
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: string | null;
    company_name?: string | null;
    company_image?: number | null;
    id: number;
    user_role_id: number;
  };

  const fetchRequests = async (start: Date, end: Date): Promise<void> => {
    try {
      setLoading(true);
      const payload = {
        user_id: Number(user?.id),
        company_id: Number(user?.company_id),
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
      };
      const param = {
        company_id: Number(user?.company_id),
        start_date: format(start, "dd/MM/yyyy"),
        end_date: format(end, "dd/MM/yyyy"),
      };
      let res;
      if (user?.user_role_id === 1) {
        res = await api.post(`requests/get-all-request`, param);
      } else {
        res = await api.post(`requests/get-all-request`, payload);
      }
      if (res.data?.requests) setData(res.data.requests);
      setRequestCount(res.data.requests?.[0]?.count);
      // onRequestCountChange(requestCount);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (startDate && endDate) fetchRequests(startDate, endDate);
    // if (open) fetchRequests(startDate,endDate);
  }, [startDate && endDate, open]);

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

  const REQUEST_ROUTE_MAP: Record<
    string,
    (recordId?: number, startDate?: string, endDate?: string) => string
  > = {
    Shift: (recordId, startDate, endDate) => {
      let url = `/apps/timesheet/list`;
      const params: any[] = [];

      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
    "Billing Info": (id) => `/apps/users/${id}?tab=billing`,
    Company: (id) => `/apps/users/${id}?tab=rate`,
    Leave: (recordId, startDate, endDate) => {
      let url = `/apps/timesheet/list`;
      const params: any[] = [];

      if (recordId) params.push(`user_id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push(`open=true`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
  };

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      [
        item.table_name,
        item.date,
        item.status_text,
        item.message,
        item.company,
        item.action,
        item.user_name,
        item.type_name,
      ]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [data, searchTerm]);

  const STATUS_COLOR: Record<string, string> = {
    pending: "#FF7F00",
    approved: "#4CBC6D",
    rejected: "#FF484B",
  };

  const TYPE_COLOR: Record<string, string> = {
    Shift: "#FF7F00",
    "Billing Info": "#fc34b2d5",
    Company: "#f5c21bf8",
    Leave: "#FF484B",
    "Work log": "#FFFF7F00",
    Timesheet: "#FFFF7F00",
    "User Account": "#FF3F51B5",
  };

  return (
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
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        py={1.5}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {user?.user_role_id == 1 ? "Requests" : "My Requests"}
          </Typography>
        </Stack>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      {/* Search */}
      <Box mb={2} display={"flex"} gap={1} alignContent={"center"}>
        <TextField
          placeholder="Search requests..."
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
        px={2}
        pb={2}
        sx={{ maxHeight: "calc(95vh - 120px)" }}
      >
        {loading ? (
          <></>
        ) : filteredData.length > 0 ? (
          <Grid container spacing={2}>
            {filteredData.map((work, idx) => (
              <Grid size={{ xs: 12, md: 12 }} mt={1} key={idx}>
                <Box
                  onClick={() => {
                    const routeFn = REQUEST_ROUTE_MAP[work.type_name];
                    if (routeFn) {
                      if (work.type_name === "Shift") {
                        const start = startDate
                          ? format(startDate, "yyyy-MM-dd")
                          : undefined;
                        const end = endDate
                          ? format(endDate, "yyyy-MM-dd")
                          : undefined;
                        router.push(routeFn(work.user_id, start, end));
                      } else if (work.type_name === "Leave") {
                        const start = startDate
                          ? format(startDate, "yyyy-MM-dd")
                          : undefined;
                        const end = endDate
                          ? format(endDate, "yyyy-MM-dd")
                          : undefined;
                        router.push(routeFn(work.user_id, start, end));
                      } else {
                        router.push(routeFn(work.user_id));
                      }
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
                      {work.type_name}
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
                          {capitalize(work.user_name)}
                        </Typography>
                        <Typography variant="subtitle1">
                          {capitalize(work.message)}
                        </Typography>
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
                          {work.status_text}
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
    </Drawer>
  );
}
