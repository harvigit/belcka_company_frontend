"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { Box, Grid, Stack } from "@mui/system";
import {
  Avatar,
  Badge,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { fetchCompanyResources } from "@/utils/companyResources";
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconBell,
  IconFilter,
  IconNotes,
  IconPlus,
  IconSpeakerphone,
  IconX,
} from "@tabler/icons-react";
import { getFcmToken, onForegroundMessage } from "@/utils/firebase";
import AnnouncementsList from "@/app/components/apps/settings/announcement";
import UserRequests from "@/app/components/apps/requests/list";
import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { AxiosResponse } from "axios";
import CompanyRegistration from "@/app/components/apps/modals/register-company";

const STORAGE_KEY = "feed-date-range";
const LEAVE_STORAGE_KEY = "leave-range";
const REQUEST_KEY = "request-date-range";

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
  startDate: string | undefined,
  endDate: string | undefined,
) => {
  try {
    const dateRange = {
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    };
    localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(dateRange));
  } catch (error) {
    console.error("Error saving date range to localStorage:", error);
  }
};

const loadRequestDateRange = () => {
  try {
    const stored = localStorage.getItem(REQUEST_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        startDate: parsed.startDate
          ? format(new Date(parsed.startDate), "dd/MM/yyyy")
          : null,
        endDate: parsed.endDate
          ? format(new Date(parsed.endDate), "dd/MM/yyyy")
          : null,
      };
    }
  } catch (error) {
    console.error("Error loading request date range:", error);
  }
  return null;
};

const Company = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);
  const [unreedFeed, setUnreedFeed] = useState<Set<number>>(new Set());
  const [count, setCount] = useState<number>(0);
  const [requestCount, setRequestCount] = useState<number>(0);
  const session = useSession();
  const [filterRequest, setFilterRequest] = useState<string>("all");
  const [announcemntCount, setAnnouncemntCount] = useState<number>(0);
  const [openannouncementDrawer, setOpenAnnouncementDrawer] = useState(false);
  const [requestDrawer, setRequestDrawer] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const limit = 20;
  const [loadingFeeds, setLoadingFeeds] = useState(false);
  const [openCompanyDrawer, setOpenCompanyDrawer] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [trade, setTrade] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    team: "",
    trade: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);
  const user = session.data?.user as User & {
    company_id?: string | number | null;
  } & {
    company_name?: string | null;
  } & {
    company_image?: string | null;
  } & { id: number } & { user_role_id: number };

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
  const [startDate, setStartDate] = useState<Date | null>(
    initialDates.startDate,
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  // Fetch user companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response: AxiosResponse<any> = await api.get(
          `user/switch-company-list?user_id=${user.id}`,
        );
        setCompanies(response.data.info);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, [user?.company_id, user?.id]);

  useEffect(() => {
    if (!user?.company_id) return;

    const fetchTradeAndTeams = async () => {
      try {
        const res = await fetchCompanyResources(
          ["tradeList", "teamList"],
          user.company_id,
        );
        if (res.data?.info) {
          setTrade(res.data.info.tradeList || []);
          setTeams(res.data.info.teamList || []);
        }
      } catch (err) {
        console.error("Failed to fetch trades/teams", err);
      }
    };

    fetchTradeAndTeams();
  }, [user?.company_id]);

  const uniqueTeams = useMemo(
    () => [...new Set(teams.map((item) => item.name).filter(Boolean))],
    [teams],
  );

  const uniqueTrades = useMemo(
    () => [...new Set(trade.map((item) => item.name).filter(Boolean))],
    [trade],
  );

  const fetchFeeds = async () => {
    if (!user?.company_id || !user?.id) return;
    setLoadingFeeds(true);
    try {
      const dateRange = loadRequestDateRange();

      let url = `get-feeds?company_id=${user.company_id}&user_id=${user.id}`;

      if (filters.team && filters.team !== "All") {
        const teamsId = teams.find((c) => c.name === filters.team)?.id;
        if (teamsId) {
          url += `&team_ids=${teamsId}`;
        }
      }
      if (filters.trade && filters.trade !== "All") {
        const tradeId = trade.find((c) => c.name === filters.trade)?.id;
        if (tradeId) {
          url += `&trade_ids=${tradeId}`;
        }
      }
      // if (dateRange?.startDate && dateRange?.endDate) {
      //   url += `&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      // }
      const res = await api.get(url);

      const feeds = res.data?.info ?? [];
      setFeed(feeds);
      setCount(feeds?.[0]?.unread_feeds);
      setRequestCount(feeds?.[0]?.request_count);

      const unreadIds = feeds
        .filter((f: any) => !f.status)
        .map((f: any) => f.id)
        .join(",");

      setUnreedFeed(unreadIds);
    } catch (e) {
      console.error(e);
    }
    setLoadingFeeds(true);
  };

  useEffect(() => {
    if (!user?.company_id || !user?.id) return;
    fetchFeeds();
  }, [user?.company_id, user?.id, filters]);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCompanyChange = async (companyId: number) => {
    try {
      const payload = {
        company_id: companyId,
        user_id: user.id,
      };
      const response: AxiosResponse<any> = await api.post(
        "company/switch-company",
        payload,
      );
      if (response.data.IsSuccess == true) {
        toast.success(response.data.message);

        const updatedInfo = response.data.info;
        if (updatedInfo && updatedInfo.authToken) {
          await session.update({
            user: {
              ...session.data?.user,
              ...updatedInfo,
              token: updatedInfo.authToken,
            },
          });
        } else {
          await session.update();
        }

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to save data:", error);
    }
    handleClose();
  };

  const unreedFeeds = useCallback(async () => {
    if (count === 0 || loading) {
      setPage(1);
      setOpenDrawer(false);
      return;
    }
    setLoading(true);
    if (unreedFeed) {
      try {
        const payload = { feed_ids: unreedFeed };
        const res: AxiosResponse<any> = await api.post(
          "feed/mark-as-read",
          payload,
        );
        if (res.data) {
          await fetchFeeds();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setOpenDrawer(false);
        setLoading(false);
        setPage(1);
      }
    }
    setOpenDrawer(false);
    setLoading(false);
    setPage(1);
  }, [count, unreedFeed, loading]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res: AxiosResponse<any> = await api.get(
        `announcements/get-announcements?company_id=${user.company_id}&user_id=${user.id}`,
      );
      const data = res.data.info || [];
      setItems(data);
      setAnnouncemntCount(data[0]?.unread_count ?? 0);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, user?.id]);

  useEffect(() => {
    if (openannouncementDrawer) {
      fetchList();
    }
  }, [openannouncementDrawer]);

  const filteredFeeds = feed?.filter((item) => {
    if (filterRequest === "all") return true;
    return item.request_name === filterRequest;
  });

  const paginatedFeeds = filteredFeeds?.slice(0, page * limit) || [];

  const REQUEST_ROUTE_MAP: Record<
    string,
    (
      userId?: number,
      recordId?: number,
      startDate?: string,
      endDate?: string,
    ) => string
  > = {
    Shift: (userId, recordId, startDate, endDate) => {
      let url = `/apps/timesheet/list`;
      const params: any[] = [];

      if (userId) params.push(`user_id=${userId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push("type=shift");
      params.push(`open=true`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
    Expense: (userId, recordId, startDate, endDate) => {
      let url = `/apps/timesheet/list`;
      const params: any[] = [];

      if (userId) params.push(`user_id=${userId}`);
      if (recordId) params.push(`id=${recordId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      params.push(`open=true`);
      params.push(`type=expense`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
    Timesheet: (userId, recordId, startDate, endDate) => {
      let url = `/apps/timesheet/list`;
      const params: any[] = [];

      if (userId) params.push(`user_id=${userId}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      // params.push(`open=true`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
    "Billing Info": (id) => `/apps/users/${id}?tab=billing`,
    User: (id) => `/apps/users/${id}?tab=health_info`,
    Company: (id) => `/apps/users/${id}?tab=rate`,
    Comapny: (id) => `/apps/users/${id}?tab=billing`,
    Project: (id) => `/apps/projects/index?id=${id}`,
    Team: (id) => `/apps/teams/team?team_id=${id}`,
    Leave: (userId, recordId, startDate, endDate) => {
      let url = `/apps/users/${userId}?tab=leave`;
      if (startDate && endDate) {
        saveDateRangeToStorage(startDate, endDate);
      }
      return url;
    },
    Stock: (userId, recordId) => {
      let url = `/apps/stocks/list`;
      const params: any[] = [];

      if (userId) params.push(`store_id=${userId}`);
      if (recordId) params.push(`product_id=${recordId}`);

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      return url;
    },
  };

  useEffect(() => {
    if (!user?.id) return;

    getFcmToken();
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("📩 New FCM message:", payload);
      if (Notification.permission === "granted") {
        new Notification("", {
          body: payload?.notification?.body || "",
          icon: "/favicon.svg",
        });
      }
      if (payload) {
        fetchFeeds();
        fetchList();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  return (
    <Box display={"flex"} alignItems={"center"} gap={1}>
      {user?.id && (
        <Tooltip title={user.company_name || "Select Company"}>
          <Avatar
            src={user?.company_image ? `${user?.company_image}` : ""}
            alt={user?.company_name || ""}
            sx={{
              width: 30,
              height: 30,
              margin: "0 auto",
              cursor: "pointer",
            }}
            onClick={handleAvatarClick}
          />
        </Tooltip>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {/* <Button
          color="primary"
          fullWidth
          variant="outlined"
          sx={{ mb: 1 }}
          onClick={() => {
            setOpenCompanyDrawer(true);
            setAnchorEl(null);
          }}
          startIcon={<IconPlus size={18} />}
        >
          Register New
        </Button> */}
        {companies.map((company) => (
          <MenuItem
            key={company.id}
            selected={user.company_id == company.id}
            onClick={() => handleCompanyChange(company.id)}
          >
            <ListItemText primary={company.name} />
          </MenuItem>
        ))}
      </Menu>
      {loadingFeeds && (
        <Badge
          badgeContent={count > 0 ? count : null}
          color="error"
          overlap="circular"
        >
          <IconBell
            size={24}
            onClick={() => setOpenDrawer(true)}
            className="header-icons"
          />
        </Badge>
      )}

      <Badge
        badgeContent={announcemntCount > 0 ? announcemntCount : null}
        color="error"
        overlap="circular"
      >
        <IconSpeakerphone
          size={24}
          onClick={() => setOpenAnnouncementDrawer(true)}
          className="header-icons"
        />
      </Badge>
      <Badge
        badgeContent={requestCount > 0 ? requestCount : null}
        color="error"
        overlap="circular"
      >
        <IconNotes
          size={24}
          onClick={() => setRequestDrawer(true)}
          className="header-icons"
        />
      </Badge>
      <UserRequests
        open={requestDrawer}
        onRequestCountChange={fetchFeeds}
        onClose={() => setRequestDrawer(false)}
      />
      <Drawer
        anchor="bottom"
        open={openDrawer}
        onClose={() => {
          unreedFeeds();
          setPage(1);
        }}
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
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
          }}
        >
          <Box className="task-form">
            <Grid container mt={3}>
              <Grid size={{ xs: 12, lg: 12 }}>
                <Box
                  display={"flex"}
                  justifyContent={"space-between"}
                  width={"100%"}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    flexWrap="wrap"
                    width={"100%"}
                  >
                    <IconButton
                      onClick={() => {
                        unreedFeeds();
                        setPage(1);
                      }}
                    >
                      <IconArrowLeft />
                    </IconButton>

                    <Typography variant="h6" fontWeight={700}>
                      Feeds ({filteredFeeds ? filteredFeeds.length : 0})
                    </Typography>

                    <TextField
                      select
                      label="Status"
                      value={filterRequest}
                      onChange={(e: any) => setFilterRequest(e.target.value)}
                      sx={{ minWidth: 200, ml: 3 }}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="Timesheet">Timesheet</MenuItem>
                      <MenuItem value="Shift">Worklog</MenuItem>
                      <MenuItem value="Billing Info">Billing Info</MenuItem>
                      <MenuItem value="User">User</MenuItem>
                      <MenuItem value="Comapny">Company</MenuItem>
                      <MenuItem value="Project">Project</MenuItem>
                      <MenuItem value="Address">Address</MenuItem>
                      <MenuItem value="Company">Company Rate</MenuItem>
                      <MenuItem value="Team">Team</MenuItem>
                      <MenuItem value="Leave">Leave</MenuItem>
                      <MenuItem value="Expense">Expense</MenuItem>
                      <MenuItem value="Zone">Zone</MenuItem>
                      <MenuItem value="Order">Order</MenuItem>
                    </TextField>

                    <Button variant="contained" onClick={() => setOpen(true)}  sx={{ mt: { xs: 1, sm: 0 }, ml: 1, minWidth: "40px", px: 1 }}>
                      <IconFilter width={18} />
                    </Button>
                  </Box>

                  <Dialog
                    open={open}
                    onClose={() => setOpen(false)}
                    fullWidth
                    maxWidth="sm"
                  >
                    <DialogTitle
                      sx={{ m: 0, position: "relative", overflow: "visible" }}
                    >
                      Filters
                      <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        size="large"
                        sx={{
                          position: "absolute",
                          right: 12,
                          top: 8,
                          color: (theme) => theme.palette.grey[900],
                          backgroundColor: "transparent",
                          zIndex: 10,
                          width: 50,
                          height: 50,
                        }}
                      >
                        <IconX size={40} style={{ width: 40, height: 40 }} />
                      </IconButton>
                    </DialogTitle>

                    <DialogContent>
                      <Stack spacing={2} mt={1}>
                        <TextField
                          select
                          label="Team"
                          value={tempFilters.team}
                          onChange={(e) =>
                            setTempFilters({
                              ...tempFilters,
                              team: e.target.value,
                            })
                          }
                        >
                          <MenuItem value="All">All</MenuItem>
                          {uniqueTeams.map((team) => (
                            <MenuItem key={team} value={team}>
                              {team}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          select
                          label="Trade"
                          value={tempFilters.trade}
                          onChange={(e) =>
                            setTempFilters({
                              ...tempFilters,
                              trade: e.target.value,
                            })
                          }
                        >
                          <MenuItem value="All">All</MenuItem>
                          {uniqueTrades.map((team) => (
                            <MenuItem key={team} value={team}>
                              {team}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Stack>
                    </DialogContent>

                    <DialogActions>
                      <Button
                        onClick={() => {
                          setTempFilters({
                            team: "",
                            trade: "",
                          });
                          setFilters({ team: "", trade: "" });
                          setOpen(false);
                        }}
                        color="inherit"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setFilters(tempFilters);
                          setOpen(false);
                        }}
                      >
                        Apply
                      </Button>
                    </DialogActions>
                  </Dialog>

                  <Box
                    display="flex"
                    width={"100%"}
                    justifyContent={"flex-end"}
                  >
                    <IconButton onClick={() => unreedFeeds()}>
                      <IconX />
                    </IconButton>
                  </Box>
                </Box>

                {paginatedFeeds?.length > 0 ? (
                  <>
                    {paginatedFeeds.map((item, index) => (
                      <Box key={item.id}>
                        <Box
                          sx={{
                            px: 2,
                            py: 0.75,
                            bgcolor: "white",
                            transition: "0.2s",
                            cursor: "pointer",
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(80, 78, 78, 0.08)",
                              transform: "translateY(-1px)",
                            },
                          }}
                          key={item.id}
                          onClick={() => {
                            const routeFn =
                              REQUEST_ROUTE_MAP[item.request_name];

                            if (
                              (item.request_name === "Shift" ||
                                item.request_name === "Timesheet") &&
                              item.action === "stop"
                            ) {
                              return;
                            }

                            if (routeFn) {
                              if (
                                item.request_name === "Timesheet" &&
                                item.action !== "stop"
                              ) {
                                const start = startDate
                                  ? format(startDate, "yyyy-MM-dd")
                                  : undefined;
                                const end = endDate
                                  ? format(endDate, "yyyy-MM-dd")
                                  : undefined;
                                router.push(
                                  routeFn(
                                    item.user_id,
                                    item.record_id,
                                    start,
                                    end,
                                  ),
                                );
                              } else if (item.request_name === "Shift") {
                                const dateAdded = item.date
                                  ? parse(
                                      item.date,
                                      "d MMMM yyyy HH:mm",
                                      new Date(),
                                    )
                                  : undefined;

                                const formattedDate = dateAdded
                                  ? format(dateAdded, "yyyy-MM-dd")
                                  : undefined;

                                router.push(
                                  routeFn(
                                    item.user_id,
                                    item.record_id,
                                    formattedDate,
                                    formattedDate,
                                  ),
                                );
                              } else if (item.request_name === "Expense") {
                                const dateAdded = item.date_added
                                  ? parse(
                                      item.date_added,
                                      "d MMMM yyyy HH:mm",
                                      new Date(),
                                    )
                                  : undefined;

                                const formattedDate = dateAdded
                                  ? format(dateAdded, "yyyy-MM-dd")
                                  : undefined;

                                router.push(
                                  routeFn(
                                    item.user_id,
                                    item.record_id,
                                    formattedDate,
                                    formattedDate,
                                  ),
                                );
                              } else if (item.request_name === "Leave") {
                                const dateAdded = item.date_added
                                  ? parse(
                                      item.date_added,
                                      "d MMMM yyyy HH:mm",
                                      new Date(),
                                    )
                                  : undefined;

                                const formattedDate = dateAdded
                                  ? format(dateAdded, "yyyy-MM-dd")
                                  : undefined;

                                router.push(
                                  routeFn(
                                    item.user_id,
                                    item.record_id,
                                    formattedDate,
                                    formattedDate,
                                  ),
                                );
                              } else if (item.request_name === "Stock") {
                                router.push(
                                  routeFn(item.store_id, item.record_id),
                                );
                              } else if (item.request_name === "Team") {
                                router.push(routeFn(item.team_id));
                              } else if (item.request_name === "User") {
                                router.push(routeFn(item.user_id));
                              } else if (item.request_name === "Project") {
                                router.push(
                                  routeFn(item.project_id ?? item.record_id),
                                );
                              } else {
                                router.push(routeFn(item.user_id));
                              }

                              setOpenDrawer(false);
                            }
                          }}
                        >
                          <Box
                            // p={2}
                            // ml={1}
                            display="flex"
                            // justifyContent="flex-start"
                            // alignItems="flex-start"
                            alignContent="center"
                            gap={2}
                          >
                            <Avatar
                              src={item.user_image}
                              alt={item.user_name || ""}
                              sx={{ width: 35, height: 35 }}
                            />
                            <Box>
                              <Typography
                                variant="subtitle2"
                                color="textSecondary"
                                fontWeight={400}
                                className="multi-ellipsis"
                              >
                                <b>{item.user_name}</b>: {item.message}
                              </Typography>
                              <Typography
                                fontSize={"12px !important"}
                                variant="caption"
                                color="textSecondary"
                                fontWeight={500}
                                className="multi-ellipsis"
                              >
                                {item.request_type === 110
                                  ? item.date_added
                                  : item.date}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Divider />
                      </Box>
                    ))}

                    {paginatedFeeds.length < filteredFeeds.length && (
                      <Box display="flex" justifyContent="center" my={2}>
                        <Button
                          variant="outlined"
                          startIcon={
                            loading ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : null
                          }
                          onClick={() => setPage((prev) => prev + 1)}
                        >
                          See More
                        </Button>
                      </Box>
                    )}
                  </>
                ) : (
                  <Box sx={{ p: 6, pt: 3, textAlign: "center" }}>
                    <Typography variant="h4" color="text.secondary">
                      No records found for feeds.
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Drawer>

      <Drawer
        anchor="bottom"
        open={openannouncementDrawer}
        onClose={() => setOpenAnnouncementDrawer(false)}
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
            flex: 1,
            overflowY: "auto",
            paddingRight: 1,
          }}
        >
          <Box className="task-form">
            <Grid container mt={1}>
              <Grid size={{ xs: 12, lg: 12 }}>
                <Box
                  display={"flex"}
                  justifyContent={"space-between"}
                  width={"100%"}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    flexWrap="wrap"
                    width={"100%"}
                  >
                    <IconButton
                      onClick={() => setOpenAnnouncementDrawer(false)}
                    >
                      <IconArrowLeft />
                    </IconButton>

                    <Typography variant="h6" fontWeight={700}>
                      Announcement
                    </Typography>
                  </Box>
                  <Box
                    display="flex"
                    width={"100%"}
                    justifyContent={"flex-end"}
                  >
                    <IconButton
                      onClick={() => setOpenAnnouncementDrawer(false)}
                    >
                      <IconX />
                    </IconButton>
                  </Box>
                </Box>

                <AnnouncementsList
                  companyId={Number(user?.company_id)}
                  userId={user?.id}
                  roleId={user?.user_role_id}
                  announcement={items}
                  onUpdate={fetchList}
                  isDrawerOpen={openannouncementDrawer}
                  onDrawerClose={() => setOpenAnnouncementDrawer(false)}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Drawer>

      <CompanyRegistration
        open={openCompanyDrawer}
        onClose={() => setOpenCompanyDrawer(false)}
      />
    </Box>
  );
};

export default Company;
