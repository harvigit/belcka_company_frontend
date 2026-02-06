"use client";
import React, { useState } from "react";
import { Box } from "@mui/material";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Payments from "../../user-profile-setting/payments";
import PermissionGuard from "@/app/auth/PermissionGuard";

const PaymentList = () => {
  const { data: session } = useSession();
  const user = session?.user as User & {
    company_id?: number | null;
    company_name?: string | null;
    user_image?: string | null;
    id: number;
    user_thumb_image?: string | null;
    user_role_id?: number | null;
  };

  const param = useParams();
  const userId = param?.id;
  const [value, setValue] = useState<number>(0);

  return (
    <PermissionGuard permission="Payments">
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Payments
          companyId={Number(user.company_id)}
          active={value === 0}
          userId={Number(userId)}
          isShow={true}
        />
      </Box>
    </PermissionGuard>
  );
};

export default PaymentList;
