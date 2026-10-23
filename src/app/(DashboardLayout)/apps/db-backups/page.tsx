"use client";
import React, { useEffect, useState } from "react";
import { Box, Portal } from "@mui/material";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import DbBackups from "@/app/components/apps/settings/db-backups";
import NotFound from "@/app/not-found";
import api from "@/utils/axios";

// Not linked anywhere in the UI; reached by direct URL only. Anyone without backup access sees the same screen as a missing page.
const DbBackupsPage = () => {
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await api.get("db-backup/list", { skipToast: true } as any);
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
    <PageContainer title="Database Backups" description="Daily database backups">
      <BlankCard>
        <DbBackups />
      </BlankCard>
    </PageContainer>
  );
};

export default DbBackupsPage;
