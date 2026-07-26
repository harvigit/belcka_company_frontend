"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Typography,
} from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AxiosResponse } from "axios";

import api from "@/utils/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { fetchUserProfile } from "@/utils/userProfile";
import CreateTrade from "../components/apps/settings/company-trades/create";
import { User } from "next-auth";
import Cookies from "js-cookie";

/** Authorization decision must always terminate — never stay pending forever. */
type AuthDecision =
  | "pending"
  | "authorized"
  | "unauthorized"
  | "redirect"
  | "error";

type ProfileStatus = "loading" | "ready" | "error";

export default function PermissionGuard({
  children,
  permission,
  permissions: requiredPermissions,
  requireAll = false,
  fallback,
  redirectTo = "/dashboard",
}: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { permissions, loading } = usePermissions();
  const session = useSession();

  const user = session.data?.user as User & {
    company_id?: number | null;
    id: number;
    user_role_id: number;
  };

  const [profile, setProfile] = useState<any>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");
  const [decision, setDecision] = useState<AuthDecision>("pending");
  const [showTradePopup, setShowTradePopup] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    id: 0,
    name: "",
    trade_category_id: "",
    company_id: user?.company_id,
    status: true,
  });

  const getProfile = async () => {
    if (!user?.id || !user?.company_id) {
      setProfileStatus("error");
      return;
    }

    setProfileStatus("loading");
    try {
      const res = await fetchUserProfile(
        Number(user.id),
        Number(user.company_id),
      );
      setProfile(res.data.info);
      setProfileStatus("ready");
    } catch (err) {
      console.error(err);
      setProfileStatus("error");
    }
  };

  useEffect(() => {
    if (session.status === "loading") {
      setProfileStatus("loading");
      return;
    }

    if (session.status !== "authenticated") {
      setProfileStatus("error");
      return;
    }

    if (!user?.id || !user?.company_id) {
      setProfileStatus("error");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileStatus("loading");
      try {
        const res = await fetchUserProfile(
          Number(user.id),
          Number(user.company_id),
        );
        if (!cancelled) {
          setProfile(res.data.info);
          setProfileStatus("ready");
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setProfileStatus("error");
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.company_id, session.status]);

  useEffect(() => {
    if (loading || profileStatus === "loading") {
      setDecision("pending");
      return;
    }

    if (profileStatus === "error") {
      setShowTradePopup(false);
      setDecision("error");
      return;
    }

    // profileStatus === "ready"
    if (user?.user_role_id === 1) {
      if (profile?.is_trade_available === false) {
        setShowTradePopup(true);
        setDecision("unauthorized");
        return;
      }
      setShowTradePopup(false);
      setDecision("authorized");
      return;
    }

    setShowTradePopup(false);

    const webPermissions = permissions.filter((p) => p.is_web);

    if (!webPermissions.length) {
      setDecision("redirect");
      router.push("/");
      return;
    }

    let authorized = true;

    if (permission) {
      authorized = hasPermission(permissions, permission);
    } else if (requiredPermissions?.length) {
      authorized =
        requireAll
          ? requiredPermissions.every((p: string) =>
              hasPermission(permissions, p),
            )
          : hasAnyPermission(permissions, requiredPermissions);
    }

    setDecision(authorized ? "authorized" : "unauthorized");
  }, [
    loading,
    permissions,
    profile,
    profileStatus,
    pathname,
    permission,
    requiredPermissions,
    requireAll,
    user?.user_role_id,
    router,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res: AxiosResponse<any> = await api.post(
        "trade/create-trade",
        formData,
      );

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        setFormData({ id: 0, name: "", trade_category_id: "" });
        setShowTradePopup(false);
        setDrawerOpen(false);
        getProfile();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const userLogout = async () => {
    try {
      const res = await api.post("logout", { user_id: user.id });

      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        Cookies.remove(`user_store_${user.id}_${user.company_id}`);
        await signOut({ callbackUrl: "/auth" });
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Never show Access Denied (or children) until a terminal decision is reached.
  if (decision === "pending" || decision === "redirect") {
    return <PermissionSkeleton />;
  }

  if (showTradePopup) {
    return (
      <>
        <Dialog open={showTradePopup && !drawerOpen} disableEscapeKeyDown>
          <DialogContent>
            <Typography>
              Your company doesn&apos;t have any trades yet.
            </Typography>

            <Box display="flex" gap={2} mt={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<IconPlus size={18} />}
                onClick={() => setDrawerOpen(true)}
              >
                Add Trade
              </Button>

              <Button
                fullWidth
                color="error"
                variant="outlined"
                onClick={userLogout}
              >
                Logout
              </Button>
            </Box>
          </DialogContent>
        </Dialog>

        <CreateTrade
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          companyId={user?.company_id ?? null}
          isSaving={isSaving}
        />
      </>
    );
  }

  if (decision === "unauthorized" || decision === "error") {
    if (fallback) return <>{fallback}</>;

    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" fontWeight={600}>
          Access Denied
        </Typography>
        <Typography color="text.secondary">
          You don&apos;t have permission to access this page.
        </Typography>
        <Button component={Link} href="/dashboard" variant="contained">
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}

function PermissionSkeleton() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "60vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}
