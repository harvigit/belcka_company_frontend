"use client";
import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  IconCopy,
  IconLock,
  IconMail,
  IconPencil,
  IconPhone,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import api from "@/utils/axios";

// The user's own login details from the profile API (users table values),
// not the billing_* name / email / phone it also returns.
interface LoginDetailsProps {
  userId: number;
  companyId: number;
  active: boolean;
  // Phone changes need an OTP: sent to the new number when users change their
  // own phone, and to the acting admin's number when an admin changes it.
  canEdit?: boolean;
  isSelf?: boolean;
  onPhoneUpdated?: (phone: string) => void;
}

interface ProfileLogin {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  extension: string | null;
  image: string | null;
}

const LoginDetails: React.FC<LoginDetailsProps> = ({
  userId,
  companyId,
  active,
  canEdit = false,
  isSelf = false,
  onPhoneUpdated,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [profile, setProfile] = useState<ProfileLogin | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Edit phone dialog: "phone" step to enter the number, "otp" step to verify it.
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [newPhone, setNewPhone] = useState({ value: "", phone: "", extension: "" });
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!active || !userId || !companyId) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(`user/profile?user_id=${userId}&company_id=${companyId}`, {
        skipToast: true,
      } as any)
      .then((res) => {
        if (cancelled) return;
        const info = res.data?.IsSuccess ? res.data.info : null;
        setProfile(
          info
            ? {
                first_name: info.first_name ?? null,
                last_name: info.last_name ?? null,
                email: info.email ?? null,
                phone: info.phone ?? null,
                extension: info.extension ?? null,
                image: info.user_image || info.user_thumb_image || null,
              }
            : null,
        );
      })
      .catch((err) => {
        console.error("Failed to fetch user profile", err);
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, userId, companyId, reloadKey]);

  const ext = profile?.extension ?? "";
  const phoneText = profile?.phone
    ? `${ext ? `${ext.startsWith("+") ? "" : "+"}${ext} ` : ""}${profile.phone}`
    : "";
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const initials =
    `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase();

  const fields = [
    { label: "First Name", value: profile?.first_name, icon: IconUser },
    { label: "Last Name", value: profile?.last_name, icon: IconUser },
    { label: "Email", value: profile?.email, icon: IconMail },
    {
      label: "Phone Number",
      value: phoneText,
      icon: IconPhone,
      onEdit: canEdit ? () => openPhoneDialog() : undefined,
    },
  ];

  const openPhoneDialog = () => {
    const digits = `${ext}${profile?.phone ?? ""}`.replace(/\D/g, "");
    setNewPhone({ value: digits, phone: "", extension: "" });
    setOtp("");
    setOtpSentTo("");
    setPhoneStep("phone");
    setPhoneDialogOpen(true);
  };

  const closePhoneDialog = () => {
    if (submitting) return;
    setPhoneDialogOpen(false);
  };

  const phonePayload = () => ({
    user_id: userId,
    company_id: companyId,
    phone: newPhone.phone,
    extension: newPhone.extension,
  });

  const sendOtp = async () => {
    if (!newPhone.phone || newPhone.phone.length < 6) {
      toast.error(t("Please enter a valid phone number."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("user/phone-change/send-otp", phonePayload());
      if (res.data?.IsSuccess) {
        setOtpSentTo(res.data.info?.sent_to ?? "");
        setOtp("");
        setPhoneStep("otp");
        toast.success(t("OTP sent successfully!"));
      }
    } catch (err) {
      console.error("Failed to send phone change OTP", err);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error(t("OTP is required"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("user/phone-change/verify", {
        ...phonePayload(),
        otp: otp.trim(),
      });
      if (res.data?.IsSuccess) {
        toast.success(t(res.data.message));
        setPhoneDialogOpen(false);
        setReloadKey((k) => k + 1);
        onPhoneUpdated?.(res.data.info?.phone ?? newPhone.phone);
      }
    } catch (err) {
      console.error("Failed to verify phone change OTP", err);
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${t(label)} ${t("copied")}`);
    } catch {
      toast.error(t("Could not copy"));
    }
  };

  const primary = theme.palette.primary.main;

  return (
    <Box p={3}>
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          background: `linear-gradient(135deg, ${alpha(primary, 0.12)} 0%, ${alpha(primary, 0.03)} 100%)`,
          border: `1px solid ${alpha(primary, 0.15)}`,
        }}
      >
        {loading ? (
          <Skeleton variant="circular" width={56} height={56} />
        ) : (
          <Avatar
            src={profile?.image || undefined}
            alt={fullName}
            sx={{
              width: 56,
              height: 56,
              border: "2px solid #fff",
              boxShadow: `0 2px 8px ${alpha(primary, 0.25)}`,
              bgcolor: primary,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {initials || <IconUserCircle size={28} />}
          </Avatar>
        )}
        <Box flexGrow={1} minWidth={0}>
          {loading ? (
            <>
              <Skeleton width={180} height={28} />
              <Skeleton width={240} height={20} />
            </>
          ) : (
            <>
              <Typography variant="h6" fontWeight={700} noWrap>
                {fullName || "-"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Details the user signs in with")}
              </Typography>
            </>
          )}
        </Box>
        <Chip
          icon={<IconLock size={14} />}
          label={t("Login account")}
          size="small"
          sx={{
            bgcolor: alpha(primary, 0.12),
            color: primary,
            fontWeight: 600,
            "& .MuiChip-icon": { color: primary },
          }}
        />
      </Box>

      {/* Fields */}
      <Grid container spacing={2}>
        {fields.map((field) => {
          const Icon = field.icon;
          const value = field.value || "";
          const onEdit = "onEdit" in field ? field.onEdit : undefined;
          return (
            <Grid key={field.label} size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  p: 2,
                  height: "100%",
                  borderRadius: "12px",
                  border: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.75,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: alpha(primary, 0.4),
                    boxShadow: `0 4px 14px ${alpha(primary, 0.08)}`,
                  },
                  "&:hover .copy-btn": { opacity: 1 },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(primary, 0.1),
                    color: primary,
                  }}
                >
                  <Icon size={20} />
                </Box>
                <Stack minWidth={0} flexGrow={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    {t(field.label)}
                  </Typography>
                  {loading ? (
                    <Skeleton width="70%" height={24} />
                  ) : (
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      color={value ? "text.primary" : "text.disabled"}
                      sx={{ wordBreak: "break-word" }}
                    >
                      {value || t("Not set")}
                    </Typography>
                  )}
                </Stack>
                {!loading && value && (
                  <Tooltip title={t("Copy")}>
                    <IconButton
                      className="copy-btn"
                      size="small"
                      onClick={() => copy(field.label, value)}
                      sx={{ opacity: { xs: 1, md: 0 }, transition: "opacity 0.2s" }}
                    >
                      <IconCopy size={16} />
                    </IconButton>
                  </Tooltip>
                )}
                {!loading && profile && onEdit && (
                  <Tooltip title={t("Edit")}>
                    <IconButton size="small" color="primary" onClick={onEdit}>
                      <IconPencil size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={phoneDialogOpen} onClose={closePhoneDialog} fullWidth maxWidth="xs">
        <DialogTitle>
          {phoneStep === "phone" ? t("Change phone number") : t("Verify OTP")}
        </DialogTitle>
        <DialogContent>
          {phoneStep === "phone" ? (
            <Stack spacing={1.5} pt={1}>
              <PhoneInput
                country={"gb"}
                value={newPhone.value}
                onChange={(value: string, country: any) =>
                  setNewPhone({
                    value,
                    extension: `+${country.dialCode}`,
                    phone: value.slice(String(country.dialCode).length),
                  })
                }
                inputStyle={{ width: "100%" }}
                enableSearch
                disabled={submitting}
              />
              <Typography variant="body2" color="text.secondary">
                {isSelf
                  ? t("We will send an OTP to the new number to verify it.")
                  : t("We will send an OTP to your phone number to confirm this change.")}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5} pt={1}>
              <Typography variant="body2" color="text.secondary">
                {isSelf
                  ? t("Enter the OTP sent to the new number")
                  : t("Enter the OTP sent to your phone number")}
                {otpSentTo ? ` (${otpSentTo})` : ""}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                value={otp}
                placeholder={t("Enter OTP")}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") verifyOtp();
                }}
                inputProps={{ inputMode: "numeric" }}
                disabled={submitting}
              />
              <Box>
                <Button size="small" onClick={sendOtp} disabled={submitting}>
                  {t("Resend OTP")}
                </Button>
                <Button
                  size="small"
                  onClick={() => setPhoneStep("phone")}
                  disabled={submitting}
                >
                  {t("Change number")}
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={closePhoneDialog} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={phoneStep === "phone" ? sendOtp : verifyOtp}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {phoneStep === "phone" ? t("Send OTP") : t("Verify & Save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginDetails;
