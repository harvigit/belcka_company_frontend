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
import { IconArrowLeft, IconSettings, IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { useRouter } from "next/navigation";
import { capitalize } from "lodash";
import { useSearchParams } from "next/navigation";
import LeavesSetting from "../../../timesheet/setting/menus/leaves";

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
    initialDates.startDate
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);
  const session = useSession();
  const [openLeaves, setOpenLeaves] = useState(false);

  const user = session.data?.user as User & {
    company_id?: string | null;
    id: number;
    user_role_id: number;
  };

  const fetchRequests = async (
    start: Date,
    end: Date,
    id?: string | null
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
          queryParams?.user_id as string
        );

        const foundUser = fetchedData.find(
          (item: any) => Number(item.user_id) === Number(queryParams?.user_id)
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
        .some((field) => field.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [data, searchTerm]);

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
        {user.user_role_id == 1 ? (
          <IconButton onClick={() => setOpenLeaves(true)}>
            <IconSettings />
          </IconButton>
        ) : (
          <IconButton onClick={onClose}>
            <IconX />
          </IconButton>
        )}
      </Box>

      {/* Search */}
      <Box mb={2} display={"flex"} gap={1} alignContent={"center"}>
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
        sx={{ maxHeight: "calc(95vh - 120px)" }}
      >
        {loading ? (
          <></>
        ) : filteredData.length > 0 ? (
          <Grid container spacing={2}>
            {filteredData.map((work, idx) => (
              <Grid size={{ xs: 12, md: 12 }} mt={1} key={idx}>
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

      {/*  Leave setting */}
      <LeavesSetting open={openLeaves} onClose={() => setOpenLeaves(false)} />
    </Drawer>
  );
}
