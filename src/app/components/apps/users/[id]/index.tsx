"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  CardContent,
  Button,
  Tab,
  Tabs,
  Badge,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  IconArrowLeft,
  IconMedal,
  IconCalendarTime,
  IconX,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Avatar } from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BlankCard from "@/app/components/shared/BlankCard";
import DigitalIDCard from "@/app/components/common/users-card/UserDigitalCard";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import HealthInfo from "../../user-profile-setting/health-info";
import BillingInfo from "../../user-profile-setting/billing-info";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import Notifications from "../../user-profile-setting/notifications";
import toast from "react-hot-toast";
import ComapnyRate from "../../user-profile-setting/company-rate";
import Payments from "../../user-profile-setting/payments";
import UserLeaves from "../../user-profile-setting/user-leaves";
import PermissionGuard from "@/app/auth/PermissionGuard";

import UserActivity from "../../user-profile-setting/activity";
import {
  getUserDetailsHref,
  resolveUserDetailsId,
} from "@/utils/userDetailsRoute";
import { useTranslation } from "react-i18next";

dayjs.extend(customParseFormat);

export interface TeamList {
  id: number;
  user_image: string | null;
  email: string | null;
  phone: string | null;
  team_name: string;
  name: string;
  image: string | null;
  status: boolean;
  trade_name: string | null;
  trade_id: number | null;
  first_name: string;
  last_name: string;
  company_name: string;
  extension: string | null;
  is_working: boolean;
  user_role_id: number;
  user_code: string | null;
  status_color: string;
  supervisor_team_id: number | null;
  supervisor_team_name: string | null;
  is_company_owner: boolean;
  date_of_birth?: string | null;
}

export interface TradeList {
  trade_id: number;
  name: string;
}

const TablePagination = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<TeamList>();
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissionType, setUserPermissionType] = useState<
    "" | "view" | "view_edit"
  >("");
  const [isPhoneUpdate, setIsPhoneUpdate] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRemovedUser = searchParams?.get("is_removed_user") === "true";
  const isArchivedUser =
    searchParams?.get("is_archived_user") === "true" ||
    searchParams?.get("is_archive_user") === "true";
  const isReadOnlyUserView = isRemovedUser || isArchivedUser;

  const allTabs = [
    "Activity",
    "Billing Info",
    "Rate",
    "Leaves",
    "Health Info",
    "Notification Settings",
    "Payments",
  ];

  const visibleTabs = isReadOnlyUserView
    ? allTabs.filter(
      (label) =>
        label === "Activity" ||
        label === "Payments" ||
        label === "Billing Info",
    )
    : allTabs;

  const { data: session, update } = useSession();
  const user = session?.user as User & {
    company_id?: number | null;
    company_name?: string | null;
    user_image?: string | null;
    id: number;
    user_thumb_image?: string | null;
    user_role_id?: number | null;
  };

  const [phone, setPhone] = useState("");
  const [openIdCard, setOpenIdCard] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [originalPhone, setOriginalPhone] = useState({
    phone: "",
    extension: "",
  });
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpMessage, setOtpMessage] = useState("Enter OTP");
  const [otpResolve, setOtpResolve] = useState<(otp: string | null) => void>();

  const param = useParams();
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const userId = resolvedUserId;

  useEffect(() => {
    const nextUserId = resolveUserDetailsId(param?.id);
    if (!nextUserId) {
      toast.error("User details link is invalid or expired", {
        id: "user-details-invalid-link",
      });
      router.replace("/apps/users/list");
      return;
    }
    setResolvedUserId(nextUserId);
  }, [param?.id, router]);

  const canEditUserDetails = userPermissionType
    ? userPermissionType === "view_edit"
    : isAdmin || Number(user?.id) === Number(userId);

  const canModifyUserDetails = canEditUserDetails && !isReadOnlyUserView;
  const [value, setValue] = useState<number>(0);
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [registeredOn, setRegisteredOn] = useState("");

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  const emptyPersonalDetails = {
    first_name: "",
    last_name: "",
    email: "",
    extension: "+44",
    phone: "",
    user_code: "",
    expired_at: "",
    account_id: 0 as string | number,
    date_of_birth: "",
  };

  const [formData, setFormData] = useState(emptyPersonalDetails);
  const [originalFormData, setOriginalFormData] = useState(emptyPersonalDetails);

  const handleFieldChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    let isRedirecting = false;
    try {
      let url = `user/get-user-lists?user_id=${userId}`;
      if (isRemovedUser) {
        url = `${url}&is_removed_user=true`;
      } else if (isArchivedUser) {
        url = `${url}&is_archived_user=true`;
      }

      const res = await api.get(url, { skipToast: true } as any);

      if (!res.data?.IsSuccess || !res.data?.info?.length) {
        isRedirecting = true;
        if (
          res.data?.error_code === "ACCESS_DENIED" ||
          res.data?.message?.toLowerCase().includes("access denied") ||
          res.data?.message?.toLowerCase().includes("not authorized")
        ) {
          toast.error("You are not authorized to view this page", {
            id: "user-details-unauthorized",
          });
        }
        router.replace("/apps/users/list");
        return;
      }

      const data = res.data.info[0];

      setData(data);
      setIsAdmin(!!res.data.is_admin);
      setUserPermissionType(res.data.permission_user_type || "");

      const ext = data?.extension || "";
      const number = data?.phone || "";
      const userInfo = data;
      setOriginalPhone({
        phone: userInfo.phone || "",
        extension: userInfo.extension || "",
      });

      const nextFormData = {
        first_name: userInfo.first_name || "",
        last_name: userInfo.last_name || "",
        email: userInfo.email || "",
        extension: ext,
        phone: number,
        user_code: userInfo.user_code || "",
        expired_at: userInfo.expired_at
          ? userInfo.expired_at.split("T")[0]
          : "",
        account_id: userInfo.account_id || 0,
        date_of_birth: userInfo.date_of_birth
          ? dayjs(userInfo.date_of_birth, ["YYYY-MM-DD", "DD/MM/YYYY"]).format(
            "YYYY-MM-DD",
          )
          : "",
      };
      setFormData(nextFormData);
      setOriginalFormData(nextFormData);

      setRegisteredOn(userInfo.registered_on ?? "");
      if (ext && number) {
        const combined = ext.replace("+", "") + number;
        setPhone(combined);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.error_code;
      if (
        status === 403 ||
        status === 404 ||
        errorCode === "ACCESS_DENIED" ||
        errorCode === "USER_NOT_FOUND" ||
        errorCode === "INVALID_USER_ID"
      ) {
        isRedirecting = true;
        if (status === 403 || errorCode === "ACCESS_DENIED") {
          toast.error("You are not authorized to view this page", {
            id: "user-details-unauthorized",
          });
        }
        router.replace("/apps/users/list");
        return;
      }
      console.error("Failed to fetch users", err);
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, isRemovedUser, isArchivedUser]);

  const updateProfile = async () => {
    if (!canModifyUserDetails) return;
    const payload = {
      user_id: userId,
      company_id: user.company_id,
      ...formData,
      date_of_birth: formData.date_of_birth
        ? dayjs(formData.date_of_birth, "YYYY-MM-DD").format("DD/MM/YYYY")
        : formData.date_of_birth,
    };
    const res = await api.post("user/update-profile", payload);

    if (res.data.IsSuccess) {
      toast.success(res.data.message);
      fetchData();

      if (Number(userId) === Number(user?.id)) {
        await update({
          ...session,
          user: {
            ...session?.user,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
          },
        });
      }
    }
  };

  const askOtp = (message = "Enter OTP"): Promise<string | null> => {
    return new Promise((resolve) => {
      setOtpValue("");
      setOtpMessage(message);
      setOtpResolve(() => resolve);
      setOtpModalOpen(true);
    });
  };

  const hasPersonalDetailsChanged = (
    Object.keys(formData) as (keyof typeof formData)[]
  ).some(
    (key) =>
      String(formData[key] ?? "") !== String(originalFormData[key] ?? ""),
  );

  const handleUpdatePersonalDetails = async () => {
    if (!userId || !canModifyUserDetails) return;
    if (!hasPersonalDetailsChanged) return;

    const phoneChanged =
      formData.phone !== originalPhone.phone ||
      formData.extension !== originalPhone.extension;
    try {
      if (!phoneChanged) {
        await updateProfile();
        return;
      }
      setIsPhoneUpdate(true);

      let phoneExists = false;
      try {
        const res = await api.post(
          "check-phone-exist",
          {
            phone: formData.phone,
            extension: formData.extension,
          },
          {
            headers: { "x-skip-auth": "true" },
            skipToast: true,
          } as any,
        );
        phoneExists = res.data.IsSuccess === true;
      } catch (err: any) {
        if (err.response?.status !== 404) {
          throw err;
        }
        phoneExists = false;
      }

      if (phoneExists) {
        setIsPhoneUpdate(false);
        await updateProfile();
      }

      let otpSent = false;
      try {
        const sendOtpRes = await api.post(
          "send-otp-register",
          {
            phone: formData.phone,
            extension: formData.extension,
          },
          {
            headers: { "x-skip-auth": "true" },
          },
        );

        otpSent = sendOtpRes.data.IsSuccess === true;
      } catch (err: any) {
        if (err.response?.status !== 404) throw err;
        otpSent = false;
      }

      if (!otpSent) {
        return;
      }

      const otp = await askOtp();
      if (!otp) {
        toast.error("OTP is required");
        setIsPhoneUpdate(false);
        return;
      }

      let otpVerified = false;
      try {
        const verifyRes = await api.post(
          "verify-register-otp",
          {
            phone: formData.phone,
            extension: formData.extension,
            otp,
          },
          {
            headers: { "x-skip-auth": "true" },
          },
        );
        otpVerified = verifyRes.data.IsSuccess === true;
      } catch (err: any) {
        if (err.response?.status !== 404) throw err;
        otpVerified = false;
      }

      if (!otpVerified) {
        toast.error("Invalid OTP");
        return;
      }

      await updateProfile();
    } catch (err) {
      console.error("Update failed:", err);
    }
    setIsPhoneUpdate(false);
  };

  const handlePhoneInputChange = (value: string, country: any) => {
    setPhone(value);

    const ext = "+" + country.dialCode;
    const numberOnly = value.replace(country.dialCode, "");

    handleFieldChange("extension", ext);
    handleFieldChange("phone", numberOnly);
  };

  const handleUserStopWork = async () => {
    if (!canModifyUserDetails) return;
    setLoading(true);
    try {
      const payload = {
        company_id: user.company_id,
        user_id: data?.id,
      };

      const res = await api.post("user-worklog/stop-work", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        try {
          const res = await api.get(`user/get-user-lists?user_id=${user.id}`);

          if (res.data?.info?.length) {
            const data = res.data.info[0];

            await update({
              user: {
                ...session?.user,
                user_role_id: data.user_role_id,
              },
            });
          }
        } catch (err) {
          console.error("Failed to fetch users", err);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tabParam = searchParams ? searchParams.get("tab") : "";
    if (tabParam) {
      switch (tabParam) {
        case "billing":
          setValue(1);
          break;
        case "rate":
          setValue(2);
          break;
        case "leave":
          setValue(3);
          break;
        default:
          setValue(0);
      }

      const leaveStart = searchParams?.get("leave_start");
      const leaveEnd = searchParams?.get("leave_end");
      const leaveRangeQuery =
        leaveStart && leaveEnd
          ? `?leave_start=${encodeURIComponent(leaveStart)}&leave_end=${encodeURIComponent(leaveEnd)}`
          : "";
      router.replace(
        getUserDetailsHref(
          userId,
          Object.fromEntries(
            new URLSearchParams(leaveRangeQuery.replace("?", "")),
          ),
        ),
      );
    }
  }, [searchParams]);

  if (!userId || loading) {
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
    <PermissionGuard
      permission="Users"
      isUserProfile={Number(userId) === Number(user?.id)}
    >
      <Box>
        <BlankCard>
          <Dialog
            fullWidth
            open={otpModalOpen}
            onClose={() => {
              setOtpModalOpen(false);
              otpResolve?.(null);
              setOtpResolve(undefined);
            }}
          >
            <DialogTitle>
              <Typography color="GrayText" fontWeight={700}>
                {t("Verify OTP")}
              </Typography>
              <IconButton
                onClick={() => {
                  setOtpModalOpen(false);
                  otpResolve?.(null);
                  setOtpResolve(undefined);
                }}
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 8,
                  backgroundColor: "transparent",
                }}
              >
                <IconX size={40} />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography color="textSecondary" mb={2}>
                {t(otpMessage)}
              </Typography>
              <CustomTextField
                fullWidth
                value={otpValue}
                onChange={(e: any) => setOtpValue(e.target.value)}
                placeholder={t("Enter OTP")}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setOtpModalOpen(false);
                  otpResolve?.(null);
                  setOtpResolve(undefined);
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={() => {
                  setOtpModalOpen(false);
                  otpResolve?.(otpValue);
                  setOtpResolve(undefined);
                }}
                variant="contained"
                color="primary"
              >
                {t("Submit")}
              </Button>
            </DialogActions>
          </Dialog>

          <CardContent sx={{ pt: 1 }}>
            <Box
              display="flex"
              alignItems={"center"}
              justifyContent={"space-between"}
            >
              <Box display={"flex"} alignItems={"center"}>
                <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
                  <IconArrowLeft />
                </IconButton>

                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: data?.status_color,
                      color: data?.status_color,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      boxShadow: "0 0 0 2px white",
                      cursor: "pointer",
                    },
                  }}
                >
                  <Avatar
                    src={
                      data?.user_image
                        ? data.user_image
                        : "/images/users/user.png"
                    }
                    alt={data?.first_name}
                    sx={{ width: 60, height: 60, cursor: "pointer" }}
                    onClick={() =>
                      canModifyUserDetails && setOpenImageDialog(true)
                    }
                  />
                </Badge>

                <Box display={"block"}>
                  <Typography
                    color="textSecondary"
                    fontWeight={600}
                    ml={2}
                    mr={2}
                    fontSize={"20px !important"}
                    sx={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.15,
                      wordBreak: "break-word",
                    }}
                  >
                    {data?.name ?? null}
                  </Typography>
                  <Typography
                    fontSize={"16px !important"}
                    color="textSecondary"
                    ml={2}
                  >
                    {data?.trade_name ?? null}{" "}
                    {data?.user_code ? `| ${data.user_code}` : ""}
                  </Typography>
                </Box>
              </Box>
              <Box display={"flex"} gap={2}>
                {canModifyUserDetails &&
                  data?.is_working &&
                  user.user_role_id == 1 && (
                    <Button
                      variant="outlined"
                      color="success"
                      onClick={handleUserStopWork}
                    >
                      {t("Stop Work")}
                    </Button>
                  )}

                {isReadOnlyUserView && user.user_role_id == 1 && (
                  <Tooltip title={t("Bookkeeper")} arrow>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        sessionStorage.setItem(
                          "timesheet_sensitive_params",
                          JSON.stringify({
                            user_id: userId,
                            is_removed_user: isRemovedUser,
                            is_archived_user: isArchivedUser,
                          }),
                        );
                        router.push("/apps/time-clock/list");
                      }}
                    >
                      <IconCalendarTime
                        size={30}
                        style={{ cursor: "pointer" }}
                      />
                    </Button>
                  </Tooltip>
                )}

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => {
                    setSelectedUser(data);
                    setOpenIdCard(true);
                  }}
                >
                  <IconMedal size={30} style={{ cursor: "pointer" }} />
                </Button>
              </Box>
            </Box>
          </CardContent>
        </BlankCard>

        <Grid container spacing={2} mt={3}>
          <Grid
            display={"block"}
            justifyContent={"center"}
            overflow={"visible"}
            size={{
              xs: 3,
              lg: 3,
            }}
          >
            <BlankCard>
              <Box sx={{ m: 3 }} className="person_info_wrapper">
                <Box
                  display={"flex"}
                  justifyContent={"space-between"}
                  alignItems={"baseline"}
                >
                  <Typography fontSize="16px !important" color="#487bb3ff">
                    {t("Personal Details")}
                  </Typography>
                </Box>
                <form>
                  <Typography color="textSecondary" variant="h5" mt={1}>
                    {t("First Name")}
                  </Typography>
                  <CustomTextField
                    id="first_name"
                    className="custom_color"
                    name="first_name"
                    placeholder={t("Enter first name..")}
                    value={formData.first_name}
                    onChange={(e: any) =>
                      handleFieldChange("first_name", e.target.value)
                    }
                    inputProps={{ maxLength: 25 }}
                    disabled={!canModifyUserDetails}
                    fullWidth
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Last Name")}
                  </Typography>
                  <CustomTextField
                    id="last_name"
                    name="last_name"
                    className="custom_color"
                    placeholder={t("Enter last name..")}
                    value={formData.last_name}
                    onChange={(e: any) =>
                      handleFieldChange("last_name", e.target.value)
                    }
                    inputProps={{ maxLength: 25 }}
                    disabled={!canModifyUserDetails}
                    fullWidth
                  />

                  <Typography color="textSecondary" variant="h5" mt={2} mb={1}>
                    {t("Mobile phone")}
                  </Typography>
                  <PhoneInput
                    country={"gb"}
                    value={phone}
                    onChange={handlePhoneInputChange}
                    inputStyle={{
                      width: "100%",
                      borderColor: "#c0d1dc9c",
                      backgroundColor: "transparent",
                    }}
                    inputClass="phone-input"
                    enableSearch
                    disabled={!canModifyUserDetails}
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Date of Birth")}
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    className="custom_color"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={(e) =>
                      handleFieldChange("date_of_birth", e.target.value)
                    }
                    disabled={!canModifyUserDetails}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      max: dayjs().format("YYYY-MM-DD"),
                    }}
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Email")}
                  </Typography>
                  <CustomTextField
                    id="email"
                    name="email"
                    className="custom_color"
                    placeholder={t("Enter email..")}
                    value={formData.email}
                    onChange={(e: any) =>
                      handleFieldChange("email", e.target.value)
                    }
                    fullWidth
                    disabled={!canModifyUserDetails}
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Company Code")}
                  </Typography>
                  <CustomTextField
                    id="user_code"
                    name="user_code"
                    className="custom_color"
                    placeholder={t("Enter company code..")}
                    value={formData.user_code}
                    onChange={(e: any) =>
                      handleFieldChange("user_code", e.target.value)
                    }
                    inputProps={{ maxLength: 10 }}
                    disabled={!canModifyUserDetails}
                    fullWidth
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Account Id")}
                  </Typography>
                  <CustomTextField
                    id="account_id"
                    name="account_id"
                    className="custom_color"
                    placeholder={t("Enter account id..")}
                    value={formData.account_id}
                    onChange={(e: any) => {
                      let value = e.target.value;
                      value = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5);
                      handleFieldChange("account_id", value);
                    }}
                    inputProps={{ maxLength: 10 }}
                    disabled={!canModifyUserDetails}
                    fullWidth
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Register On")}
                  </Typography>
                  <CustomTextField
                    className="custom_color"
                    id="registered_on"
                    placeholder={t("Registered on")}
                    fullWidth
                    value={registeredOn}
                    disabled
                  />

                  <Typography color="textSecondary" variant="h5" mt={2}>
                    {t("Expired At")}
                  </Typography>
                  <CustomTextField
                    type="date"
                    className="custom_color"
                    id="expired_at"
                    placeholder={t("Choose Expiry date")}
                    fullWidth
                    value={formData.expired_at}
                    disabled={!canModifyUserDetails}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newDate = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        expired_at: newDate,
                      }));
                    }}
                  />
                </form>
                {canModifyUserDetails && (
                  <Box mt={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isPhoneUpdate || !hasPersonalDetailsChanged}
                      onClick={handleUpdatePersonalDetails}
                    >
                      {isPhoneUpdate
                        ? t("Sending otp in your phone..")
                        : t("Update")}
                    </Button>
                  </Box>
                )}
              </Box>
            </BlankCard>

          </Grid>

          <Grid
            size={{
              xs: 9,
              lg: 9,
            }}
          // sx={{ boxShadow: (theme) => theme.shadows[8] }}
          >
            <BlankCard>
              <Box>
                <Tabs
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  className="user-tabs"
                  value={value}
                  onChange={handleTabChange}
                  aria-label="Sidebar Tabs"
                  sx={{
                    borderRadius: "12px",
                    minHeight: "40px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  {visibleTabs.map((label, index) => (
                    <Tab
                      key={label}
                      label={t(label)}
                      sx={{
                        textTransform: "none",
                        borderRadius: "10px",
                        px: 3,
                        py: 0.5,
                        fontSize: "14px",
                        fontWeight: value === index ? "600" : "400",
                        transition: "all 0.3s ease",
                      }}
                    />
                  ))}
                </Tabs>
              </Box>
              <Box
                aria-readonly={!canModifyUserDetails}
                sx={
                  !canModifyUserDetails
                    ? {
                      "& fieldset button.MuiButton-root": {
                        display: "none",
                      },
                      "& fieldset .MuiInputBase-root, & fieldset .react-tel-input":
                      {
                        cursor: "default",
                        pointerEvents: "none",
                      },
                      "& fieldset .MuiInputBase-input": {
                        WebkitTextFillColor: "rgba(0, 0, 0, 0.38)",
                      },
                      "& fieldset .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0, 0, 0, 0.23) !important",
                      },
                      '& [role="combobox"], & [role="switch"], & .MuiSelect-select':
                      {
                        cursor: "default",
                        pointerEvents: "none",
                      },
                    }
                    : undefined
                }
              >
                <fieldset
                  disabled={!canModifyUserDetails}
                  style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}
                >
                  {isReadOnlyUserView ? (
                    <>
                      <Box hidden={value !== 0}>
                        <UserActivity
                          companyId={Number(user.company_id)}
                          userId={Number(userId)}
                          active={value === 0}
                          isRemoveUser={isRemovedUser}
                          isArchivedUser={isArchivedUser}
                        />
                      </Box>
                      <Box hidden={value !== 1}>
                        <BillingInfo
                          companyId={Number(user.company_id)}
                          onUpdate={fetchData}
                          userId={Number(userId)}
                          active={value === 1}
                        />
                      </Box>
                    </>
                  ) : (
                    <>
                      <Box hidden={value !== 0}>
                        <UserActivity
                          companyId={Number(user.company_id)}
                          userId={Number(userId)}
                          active={value === 0}
                        />
                      </Box>
                      <Box hidden={value !== 1}>
                        <BillingInfo
                          companyId={Number(user.company_id)}
                          onUpdate={fetchData}
                          userId={Number(userId)}
                          active={value === 1}
                        />
                      </Box>
                      <Box hidden={value !== 2}>
                        <ComapnyRate
                          active={value === 2}
                          name={formData.first_name}
                          userId={Number(userId)}
                        />
                      </Box>

                      <Box hidden={value !== 3}>
                        <UserLeaves
                          active={value === 3}
                          name={formData.first_name}
                          userId={Number(userId)}
                          companyId={Number(user.company_id)}
                        />
                      </Box>
                      <Box hidden={value !== 4}>
                        <HealthInfo
                          userId={Number(userId)}
                          active={value === 4}
                          canEdit={canModifyUserDetails}
                          readOnly={!canModifyUserDetails}
                        />
                      </Box>

                      <Box hidden={value !== 5}>
                        <Notifications
                          companyId={Number(user.company_id)}
                          active={value === 5}
                          userId={Number(userId)}
                        />
                      </Box>
                    </>
                  )}
                </fieldset>
                {isReadOnlyUserView ? (
                  <Box hidden={value !== 2}>
                    <Payments
                      companyId={Number(user.company_id)}
                      active={value === 2}
                      userId={Number(userId)}
                      isShow={false}
                      disableDateFilter={true}
                      readOnly={!canModifyUserDetails}
                    />
                  </Box>
                ) : (
                  <Box hidden={value !== 6}>
                    <Payments
                      companyId={Number(user.company_id)}
                      active={value === 6}
                      userId={Number(userId)}
                      isShow={false}
                      disableDateFilter={true}
                      readOnly={!canModifyUserDetails}
                    />
                  </Box>
                )}
              </Box>
            </BlankCard>
          </Grid>
        </Grid>
        {openIdCard && (
          <DigitalIDCard
            open={openIdCard}
            onClose={() => setOpenIdCard(false)}
            userId={Number(userId)}
          />
        )}
        <Dialog
          open={openImageDialog}
          onClose={() => setOpenImageDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <Box
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            p={2}
          >
            <Typography>Change Profile Picture</Typography>
            <IconButton onClick={() => setOpenImageDialog(false)}>
              <IconX />
            </IconButton>
          </Box>
          <DialogContent>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={2}
            >
              <Avatar
                src={
                  previewImage || data?.user_image || "/images/users/user.jpg"
                }
                alt="Preview"
                sx={{ width: 150, height: 150, mb: 2 }}
              />
              <Button variant="contained" component="label">
                Upload profile picture
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewImage(URL.createObjectURL(file));
                    }
                  }}
                />
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenImageDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              disabled={!selectedFile}
              onClick={async () => {
                if (!canModifyUserDetails) return;
                if (selectedFile) {
                  const formData = new FormData();
                  formData.append("user_image", selectedFile);
                  formData.append("user_id", String(userId));
                  try {
                    const res = await api.post(
                      "user/update-profile",
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    );
                    if (res.data.IsSuccess) {
                      toast.success(res.data.message);
                      setOpenImageDialog(false);
                      setSelectedFile(null);
                      setPreviewImage(null);
                      fetchData();
                      if (Number(userId) === Number(user?.id)) {
                        const updatedUser = {
                          ...user,
                          user_image: res.data.info.user_image
                            ? res.data.info.user_image
                            : user?.user_image,
                          user_thumb_image: res.data.info.user_image
                            ? res.data.info.user_image
                            : user?.user_thumb_image,
                        };
                        await update({
                          ...session,
                          user: updatedUser,
                        });
                      }
                    }
                  } catch (err) {
                    console.error("Image upload failed:", err);
                  }
                }
              }}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default TablePagination;
