"use client";
import React, { useEffect, useState } from "react";
import { Box, Portal } from "@mui/material";
import dayjs from "dayjs";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ApiTimingLogs from "@/app/components/apps/api-timing";
import NotFound from "@/app/not-found";
import api from "@/utils/axios";

// Access is the api_timing_users allowlist. Anyone else sees the same screen as a missing page.
const ApiTimingPage = () => {
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      from: dayjs().subtract(6, "day").startOf("day").toISOString(),
      to: dayjs().endOf("day").toISOString(),
    });

    (async () => {
      try {
        await api.get(`api-timing/summary?${params.toString()}`, { skipToast: true } as any);
        if (!cancelled) setAccess("allowed");
      } catch (err: any) {
        const status = err?.response?.status;
        const message = String(err?.response?.data?.message ?? "");
        const denied = status === 403 || message.toLowerCase().includes("do not have access");
        if (!cancelled) setAccess(denied ? "denied" : "allowed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (access === "denied") {
    return (
      <Portal>
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 1,
            bgcolor: "background.default",
            overflow: "auto",
          }}
        >
          <NotFound />
        </Box>
      </Portal>
    );
  }

  if (access === "checking") return null;

  return (
    <PageContainer title="API Timing" description="API request timing">
      <BlankCard>
        <ApiTimingLogs />
      </BlankCard>
    </PageContainer>
  );
};

export default ApiTimingPage;
