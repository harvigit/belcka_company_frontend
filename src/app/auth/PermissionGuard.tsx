"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import { Box, Button, Dialog, DialogContent, Typography } from "@mui/material";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { IconPlus } from "@tabler/icons-react";
import CreateTrade from "../components/apps/settings/company-trades/create";
import { AxiosResponse } from "axios";
import toast from "react-hot-toast";
import Link from "next/link";

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
  const { data: session } = useSession();

  const user = session?.user as any;

  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showTradePopup, setShowTradePopup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        `user/profile?user_id=${user.id}&company_id=${user.company_id}`
      );
      setProfile(res.data.info);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user?.id || !user?.company_id) return;
    getProfile();
  }, [user?.id, user?.company_id]);

  useEffect(() => {
    if (loading || !profile) return;

    const webPermissions = permissions.filter((p) => p.is_web);
    if (webPermissions.length === 0) {
      router.push("/");
      return;
    }

    if (user?.user_role_id === 1 && profile?.is_trade_available === false) {
      setShowTradePopup(true);
      setIsAuthorized(false);
      return;
    }

    let authorized = true;

    if (permission) {
      authorized = hasPermission(permissions, permission);
    } else if (requiredPermissions?.length) {
      authorized = requireAll
        ? requiredPermissions.every((p: string) =>
            hasPermission(permissions, p)
          )
        : hasAnyPermission(permissions, requiredPermissions);
    }

    if (!authorized && redirectTo) {
      router.push(redirectTo);
      return;
    }

    setIsAuthorized(true);
  }, [loading, permissions, profile, pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const result: AxiosResponse<any> = await api.post(
        "trade/create-trade",
        formData
      );

      if (result.data.IsSuccess) {
        toast.success(result.data.message);
        setFormData({ id: 0, name: "", trade_category_id: 0 });
        getProfile();
        setShowTradePopup(false);
        setDrawerOpen(false);
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={showTradePopup && !drawerOpen} disableEscapeKeyDown>
        <DialogContent>
          Your company doesn&apos;t have any trades yet. <br />
          Please add a trade to continue.
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => setDrawerOpen(true)}
            startIcon={<IconPlus size={18} />}
          >
            Add Trade
          </Button>
        </DialogContent>
      </Dialog>

      {showTradePopup && (
        <CreateTrade
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          companyId={user?.company_id ?? null}
          isSaving={isSaving}
        />
      )}

      {!isAuthorized ? (
        fallback ?? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              textAlign: "center",
              gap: 2,
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
        )
      ) : loading ? (
        <PermissionSkeleton />
      ) : (
        children
      )}
    </>
  );
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
