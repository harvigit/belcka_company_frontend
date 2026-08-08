"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Box, Button, Dialog, DialogContent, Typography } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AxiosResponse } from "axios";

import api from "@/utils/axios";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import CreateTrade from "../components/apps/settings/company-trades/create";
import { User } from "next-auth";
import Cookies from "js-cookie";

export default function PermissionGuard({
  children,
  permission,
  permissions: requiredPermissions,
  requireAll = false,
  fallback,
  redirectTo = "/dashboard",
  isUserProfile = false,
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
  const [isAuthorized, setIsAuthorized] = useState(false);
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
    try {
      const res = await api.get(
        `user/profile?user_id=${user.id}&company_id=${user.company_id}`,
      );
      setProfile(res.data.info);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.id && user?.company_id) {
      getProfile();
    }
  }, [user?.id, user?.company_id]);

    useEffect(() => {
        if (loading || !profile) return;

        if (user?.user_role_id === 1) {
            if (profile?.is_trade_available === false) {
                setShowTradePopup(true);
                setIsAuthorized(false);
                return;
            }
            setIsAuthorized(true);
            return;
        }

        const webPermissions = permissions.filter((p) => p.is_web);

        if (!webPermissions.length && !isUserProfile) {
            router.push("/");
            return;
        }

        let authorized = true;

        if (isUserProfile) {
            authorized = true;
        } else if (permission) {
            authorized = hasPermission(permissions, permission);
        } else if (requiredPermissions?.length) {
            authorized = requireAll
                ? requiredPermissions.every((p: string) =>
                    hasPermission(permissions, p),
                )
                : hasAnyPermission(permissions, requiredPermissions);
        }

        setIsAuthorized(authorized);

    }, [loading, permissions, profile, pathname, isUserProfile]);

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

  if (loading) {
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

  if (!isAuthorized) {
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
        p: { xs: 2, sm: 3 },
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        backgroundColor: "transparent",
      }}
    >
      {/* <Skeleton variant="text" width="40%" height={"90%"} sx={{ maxWidth: 300 }} /> */}

      {/* <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />

            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 2 }} />

            <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mt: 1 }} /> */}
    </Box>
  );
}
