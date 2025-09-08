import React, { use, useState } from "react";
import { useEffect } from "react";
import { Box, Grid } from "@mui/system";
import {
  Avatar,
  Badge,
  Button,
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
import { IconArrowLeft, IconBell, IconX } from "@tabler/icons-react";
import { getFcmToken, onForegroundMessage } from "@/utils/firebase";

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

  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
  } & { id: number };

  // Fetch user companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `user/switch-company-list?user_id=${user.id}`
        );
        setCompanies(response.data.info);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
      setLoading(false);
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
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchFeeds = async () => {
    try {
      const res = await api.get(
        `get-feeds?company_id=${user.company_id}&user_id=${user.id}`
      );
      if (res.data) {
        const feeds = res.data.info;
        setFeed(feeds);
        setCount(feeds?.[0]?.unread_feeds);

        if(feeds){
          const unreadIds = feeds
          .filter((feed: any) => feed.status === false)
          .map((feed: any) => feed.id)
          .join(",");
          setUnreedFeed(unreadIds);
        }
      }
    } catch (err) {
      console.error("Failed to fetch feeds", err);
    }
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
    if (count > 0) {
      try {
        const payload = {
          feed_ids: unreedFeed,
        };
        const res = await api.post("feed/mark-as-read", payload);
        if (res.data) {
          fetchFeeds();
        } else {
          toast.error(res.data.message);
        }
      } catch (error) {
        console.error("Failed to save data:", error);
      }
      setOpenDrawer(false);
    }
    setOpenDrawer(false);
  };

  const filteredFeeds = feed?.filter((item) => {
    if (filterRequest === "all") return true;
    return item.request_name === filterRequest;
  });

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
        <IconButton onClick={() => setOpenDrawer(true)}>
          <IconBell size={24} />
        </IconButton>
      </Badge>
      <Drawer
        anchor="bottom"
        open={openDrawer}
        onClose={() => unreedFeeds()}
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
                    <IconButton onClick={() => unreedFeeds()}>
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
                {filteredFeeds?.length > 0 ? (
                  <>
                    {filteredFeeds.map((item, index) => (
                      <Box>
                        <Box
                          key={index}
                          p={2}
                          ml={1}
                          display="flex"
                          justifyContent="flex-start"
                          alignContent="center"
                          alignItems="flex-start"
                          gap={2}
                        >
                          <Box>
                            <Avatar
                              src={item.user_image}
                              alt={item.user_name || ""}
                              sx={{
                                width: 40,
                                height: 40,
                                // cursor: "pointer",
                              }}
                            />
                          </Box>
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
                  </>
                ) : (
                  <Box>
                    <Box
                      sx={{
                        p: 6,
                        pt: 3,
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h4" color="text.secondary">
                        No records found for feeds.
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Company;
