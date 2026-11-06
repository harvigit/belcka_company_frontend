"use client";
import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  IconCopy,
  IconLock,
  IconMail,
  IconPhone,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "@/utils/axios";

// The user's own login details from the profile API (users table values),
// not the billing_* name / email / phone it also returns.
interface LoginDetailsProps {
  userId: number;
  companyId: number;
  active: boolean;
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
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [profile, setProfile] = useState<ProfileLogin | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, [active, userId, companyId]);

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
    { label: "Phone Number", value: phoneText, icon: IconPhone },
  ];

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
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default LoginDetails;
