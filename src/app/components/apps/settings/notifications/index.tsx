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
} from "@mui/material";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import toast from "react-hot-toast";
import { Box } from "@mui/system";

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

  const updateNotification = async (
    categoryId: number,
    notificationId: number | "all",
    field: "is_push" | "is_feed",
    value: boolean
  ) => {
    let updatedCategory: NotificationCategory | undefined;

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === categoryId) {
          updatedCategory = {
            ...cat,
            notifications: cat.notifications.map((n) =>
              notificationId === "all"
                ? { ...n, [field]: value }
                : n.id === notificationId
                ? { ...n, [field]: value }
                : n
            ),
          };
          return updatedCategory;
        }
        return cat;
      })
    );

    if (!updatedCategory) return;
    setLoading(true);
    try {
      const response = await api.post(
        `notifications/change-company-bulk-notifications`,
        {
          company_id: user.company_id,
          notifications: updatedCategory.notifications.map((n) => ({
            notification_id: n.id,
            is_push: n.is_push,
            is_feed: n.is_feed,
          })),
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
    setLoading(false);
  };

  const isCategorySwitchOn = (
    category: NotificationCategory,
    field: "is_push" | "is_feed"
  ) => {
    if (!category.notifications || category.notifications.length === 0) {
      return false;
    }
    return category.notifications.every((n) => n[field]);
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

  return (
    <Box>
      <Typography mb={2} fontWeight={500}>
        Notification Settings
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#e5e8ed" }}>
              <TableCell>
                <Typography variant="subtitle1" fontWeight="bold">
                  Titles
                </Typography>
              </TableCell>
              <TableCell align="center">Push</TableCell>
              <TableCell align="center">Feed</TableCell>
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
                      <TableCell colSpan={1}>
                        <Typography fontWeight="bold">
                          {category.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={
                            getCategorySwitchState(category, "is_push") === "on"
                          }
                          onChange={(e) =>
                            updateNotification(
                              category.id,
                              "all",
                              "is_push",
                              e.target.checked
                            )
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={isCategorySwitchOn(category, "is_feed")}
                          onChange={(e) =>
                            updateNotification(
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
                        <TableCell>{notification.name}</TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={notification.is_push}
                            onChange={(e) =>
                              updateNotification(
                                category.id,
                                notification.id,
                                "is_push",
                                e.target.checked
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={notification.is_feed}
                            onChange={(e) =>
                              updateNotification(
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
