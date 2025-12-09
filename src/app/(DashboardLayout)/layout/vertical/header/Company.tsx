import React, { useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import { Box, Grid } from "@mui/system";
import {
  Avatar,
  Badge,
  Button,
  CircularProgress,
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
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconBell,
  IconNotes,
  IconSpeakerphone,
  IconX,
} from "@tabler/icons-react";
import { getFcmToken, onForegroundMessage } from "@/utils/firebase";
import AnnouncementsList from "@/app/components/apps/settings/announcement";
import UserRequests from "@/app/components/apps/requests/list";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AxiosResponse } from "axios";

const STORAGE_KEY = "feed-date-range";
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

  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
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
    initialDates.startDate
  );
  const [endDate, setEndDate] = useState<Date | null>(initialDates.endDate);

  // Fetch user companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response: AxiosResponse<any> = await api.get(
          `user/switch-company-list?user_id=${user.id}`
        );
        setCompanies(response.data.info);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, [user?.company_id,user?.id]);

  const fetchFeeds = useCallback(async () => {
    if (!user?.company_id || !user?.id) return;

    try {
      const res: AxiosResponse<any> = await api.get(
        `get-feeds?company_id=${user.company_id}&user_id=${user.id}`
      );

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
  }, [user.company_id, user.id]);

  useEffect(() => {
    if (!user?.company_id || !user?.id) return;
    fetchFeeds();
  }, [user?.company_id, user?.id]);

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
        payload
      );
      if (response.data.IsSuccess == true) {
        toast.success(response.data.message);
        setTimeout(() => {
          window.location.reload();
        }, 500);
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
          payload
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
  }, [count, unreedFeed, fetchFeeds, loading]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res: AxiosResponse<any> = await api.get(
        `announcements/get-announcements?company_id=${user.company_id}&user_id=${user.id}`
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
  }, [openannouncementDrawer, fetchList]);

  const filteredFeeds = feed?.filter((item) => {
    if (filterRequest === "all") return true;
    return item.request_name === filterRequest;
  });

  const paginatedFeeds = filteredFeeds?.slice(0, page * limit) || [];

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
    Timesheet: (recordId, startDate, endDate) => {
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
    Comapny: (id) => `/apps/users/${id}?tab=billing`,
    Project: (id) => `/apps/projects/index?id=${id}`,
    Team: (id) => `/apps/teams/team?team_id=${id}`,
    // Leave: (recordId, startDate, endDate) => {
    //   let url = `/apps/timesheet/list`;
    //   const params: any[] = [];

    //   if (recordId) params.push(`user_id=${recordId}`);
    //   if (startDate) params.push(`start_date=${startDate}`);
    //   if (endDate) params.push(`end_date=${endDate}`);

    //   if (params.length > 0) {
    //     url += `?${params.join("&")}`;
    //   }

    //   return url;
    // },
  };

  useEffect(() => {
    if (!user?.id) return;

    getFcmToken();
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("📩 New FCM message:", payload);
      if (Notification.permission === "granted") {
        new Notification(payload?.notification?.title || "Notification", {
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
        <MenuItem value="" disabled>
          Switch company
        </MenuItem>
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

                    <Typography variant="h5" fontWeight={700}>
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
                      <MenuItem value="Team">Team</MenuItem>
                      <MenuItem value="Project">Project</MenuItem>
                      <MenuItem value="Timesheet">Timesheet</MenuItem>
                      <MenuItem value="Comapny">Comapny</MenuItem>
                      <MenuItem value="Company">Comapny Rate</MenuItem>
                      <MenuItem value="Shift">Worklog</MenuItem>
                    </TextField>
                  </Box>
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
                            p: 2,
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
                                item.request_name === "Shift" ||
                                (item.request_name === "Timesheet" &&
                                  item.action !== "stop")
                              ) {
                                const start = startDate
                                  ? format(startDate, "yyyy-MM-dd")
                                  : undefined;
                                const end = endDate
                                  ? format(endDate, "yyyy-MM-dd")
                                  : undefined;
                                router.push(routeFn(item.user_id, start, end));
                              } else if (item.request_name === "Team") {
                                router.push(routeFn(item.team_id));
                              } else if (item.request_name === "Project") {
                                router.push(
                                  routeFn(item.project_id ?? item.record_id)
                                );
                              } else {
                                router.push(routeFn(item.user_id));
                              }

                              setOpenDrawer(false);
                            }
                          }}
                        >
                          <Box
                            p={2}
                            ml={1}
                            display="flex"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                            gap={2}
                          >
                            <Avatar
                              src={item.user_image}
                              alt={item.user_name || ""}
                              sx={{ width: 40, height: 40 }}
                            />
                            <Box display={"block"}>
                              <Typography
                                variant="subtitle1"
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
                                {item.date_added}
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
                      onClick={() => setOpenAnnouncementDrawer(false)}
                    >
                      <IconArrowLeft />
                    </IconButton>

                    <Typography variant="h5" fontWeight={700}>
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
    </Box>
  );
};

export default Company;
