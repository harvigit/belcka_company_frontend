import React, { useCallback, useState } from "react";
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
  IconSpeakerphone,
  IconX,
} from "@tabler/icons-react";
import { getFcmToken, onForegroundMessage } from "@/utils/firebase";
import AnnouncementsList from "@/app/components/apps/settings/announcement";

export interface Feed {
  id: number;
  message: string;
  user_image?: string;
  date_added: string;
  user_name: string;
  unread_feeds: number;
  request_name: string;
  request_type: number;
}

const Company = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [unreedFeed, setUnreedFeed] = useState<Set<number>>(new Set());
  const [count, setCount] = useState<number>(0);
  const session = useSession();
  const [filterRequest, setFilterRequest] = useState<string>("all");
  const [announcemntCount, setAnnouncemntCount] = useState<number>(0);
  const [openannouncementDrawer, setOpenAnnouncementDrawer] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
  } & { id: number };

  // Fetch user companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await api.get(
          `user/switch-company-list?user_id=${user.id}`
        );
        setCompanies(response.data.info);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    getFcmToken();
    const unsubscribe = onForegroundMessage((payload) => {
      console.log("📩 New FCM message:", payload);
      if (Notification.permission === "granted") {
        new Notification(payload?.notification?.title || "Notification", {
          body: payload?.notification?.body || "",
          icon: "/images/logos/belcka_logo.png",
        });
      }

      fetchFeeds();
      fetchList();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchFeeds = async () => {
    setLoading(true);

    try {
      const res = await api.get(
        `get-feeds?company_id=${user.company_id}&user_id=${user.id}`
      );
      if (res.data) {
        const feeds = res.data.info;
        setFeed(feeds);
        setCount(feeds?.[0]?.unread_feeds);

        if (feeds) {
          const unreadIds = feeds
            .filter((feed: any) => feed.status === false)
            .map((feed: any) => feed.id)
            .join(",");
          setUnreedFeed(unreadIds);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch feeds", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchFeeds();
  }, []);

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
      const response = await api.post("company/switch-company", payload);
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

  const unreedFeeds = async () => {
    setLoading(true);
    if (count > 0) {
      try {
        const payload = {
          feed_ids: unreedFeed,
        };
        const res = await api.post("feed/mark-as-read", payload);
        if (res.data) {
          fetchFeeds();
          setLoading(true);
        } else {
          toast.error(res.data.message);
        }
      } catch (error) {
        console.error("Failed to save data:", error);
      }
      setOpenDrawer(false);
    }
    setOpenDrawer(false);
    setPage(1);
    setLoading(false);
  };

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(
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
  }, [user.company_id, user.id]);

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

  return (
    <Box display={"flex"} alignItems={"center"} gap={1}>
      {user.id && (
        <Tooltip title={user.company_name || "Select Company"}>
          <Avatar
            src={user?.company_image ? `${user.company_image}` : ""}
            alt={user.company_name || ""}
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
                  companyId={Number(user.company_id)}
                  userId={user.id}
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
