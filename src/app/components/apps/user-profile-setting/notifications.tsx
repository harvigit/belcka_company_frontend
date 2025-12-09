"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import IOSSwitch from '@/app/components/common/IOSSwitch';

interface ProjectListingProps {
  companyId: number | null;
  active: boolean;
}

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

const Notifications: React.FC<ProjectListingProps> = ({
  companyId,
  active,
}) => {
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const params = useParams();
  const userId = Number(params?.id);
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `notifications/user-notifications?company_id=${companyId}&user_id=${userId}`
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
    if(!userId || !active) return
    if (companyId) {
      fetchNotifications();
    }
  }, [companyId, active,fetchNotifications,userId]);

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
    try {
      const response = await api.post(
        `notifications/change-user-bulk-notifications`,
        {
          company_id: companyId,
          user_id: userId,
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
        toast.error("Update failed");
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to update notification", err);
      fetchNotifications();
    }
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
        minHeight="370px"
      >
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box m={2} mt={0} ml={5}>
      <Box display={"flex"} justifyContent={"space-between"} mb={1}>
        <Typography fontWeight={500}></Typography>
        {categories.length > 0 && (
          <>
            <Button onClick={saveNotifications} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </>
        )}
      </Box>
      <TableContainer
        sx={{ maxHeight: 570, boxShadow: (theme) => theme.shadows[2] }}
        component={Paper}
      >
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow sx={{ background: "#e5e8ed" }}>
              <TableCell>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="#487bb3ff"
                >
                  Titles
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="#487bb3ff"
                >
                  Push
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  color="#487bb3ff"
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
                  No notifications are found for this user!!
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
                          <Typography color="textSecondary">
                            {notification.name}
                          </Typography>
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
};

export default Notifications;
