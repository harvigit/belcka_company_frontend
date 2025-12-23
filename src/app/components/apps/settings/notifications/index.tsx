import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Typography,
  CircularProgress,
  Button,
} from "@mui/material";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import { Box } from "@mui/system";
import IOSSwitch from '@/app/components/common/IOSSwitch';

interface NotificationItem {
  id: number;
  name: string;
  trade_category_id: number;
  is_push: boolean;
  is_feed: boolean;
}

interface NotificationCategory {
  id: number;
  name: string;
  notifications: NotificationItem[];
}

export default function NotificationSettings() {
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `notifications/company-notifications?company_id=${user.company_id}`
      );
      if (res.data?.info) {
        setCategories(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    if (user?.company_id) {
      fetchNotifications();
    }
  }, [user?.company_id]);

  const updateNotificationState = (
    categoryId: number,
    notificationId: number | "all",
    field: "is_push" | "is_feed",
    value: boolean
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            notifications: cat.notifications.map((n) =>
              notificationId === "all"
                ? { ...n, [field]: value }
                : n.id === notificationId
                ? { ...n, [field]: value }
                : n
            ),
          };
        }
        return cat;
      })
    );
  };

  const saveNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.post(
        `notifications/change-company-bulk-notifications`,
        {
          company_id: user.company_id,
          notifications: categories.flatMap((cat) =>
            cat.notifications.map((n) => ({
              notification_id: n.id,
              is_push: n.is_push,
              is_feed: n.is_feed,
            }))
          ),
        }
      );

      if (response.data.IsSuccess) {
        toast.success(response.data.message);
      } else {
        // toast.error("Update failed");
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to update notification", err);
      fetchNotifications();
    }
    setLoading(false);
  };

  const getCategorySwitchState = (
    category: NotificationCategory,
    field: "is_push" | "is_feed"
  ) => {
    const allOn = category.notifications.every((n) => n[field]);
    const allOff = category.notifications.every((n) => !n[field]);

    if (allOn) return "on";
    if (allOff) return "off";
    return "indeterminate";
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display={"flex"} justifyContent={"space-between"} mb={1}>
        <Typography fontWeight={500} ml={2}>Notification Settings</Typography>
        {categories.length > 0 && (
          <>
            <Button onClick={saveNotifications} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </>
        )}
      </Box>
      <TableContainer component={Paper}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow sx={{ background: "#e5e8ed" }}>
              <TableCell>
                <Typography
                  variant="subtitle1"
                >
                  Titles
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="subtitle1"
                >
                  Push
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="subtitle1"
                >
                  Feed
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length == 0 ? (
              <>
                <Typography m={3}>
                  No notifications are found for this company!!
                </Typography>
              </>
            ) : (
              <>
                {categories.map((category) => (
                  <React.Fragment key={category.id}>
                    <TableRow sx={{ background: "#f8f9fa" }}>
                      <TableCell colSpan={1} sx={{ padding: "10px" }}>
                        <Typography fontWeight="bold" color="#7D92A9">
                          {category.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "10px" }}>
                        <IOSSwitch
                          checked={
                            getCategorySwitchState(category, "is_push") === "on"
                          }
                          onChange={(e) =>
                            updateNotificationState(
                              category.id,
                              "all",
                              "is_push",
                              e.target.checked
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ padding: "10px" }}>
                        <IOSSwitch
                          checked={
                            getCategorySwitchState(category, "is_feed") === "on"
                          }
                          onChange={(e) =>
                            updateNotificationState(
                              category.id,
                              "all",
                              "is_feed",
                              e.target.checked
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>

                    {category.notifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell sx={{ padding: "10px" }}>
                          {notification.name}
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "10px" }}>
                          <IOSSwitch
                            checked={notification.is_push}
                            onChange={(e) =>
                              updateNotificationState(
                                category.id,
                                notification.id,
                                "is_push",
                                e.target.checked
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ padding: "10px" }}>
                          <IOSSwitch
                            checked={notification.is_feed}
                            onChange={(e) =>
                              updateNotificationState(
                                category.id,
                                notification.id,
                                "is_feed",
                                e.target.checked
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
