"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ApiTimingLogs from "@/app/components/apps/api-timing";

// TEMP: admin-only viewer for API timing logs (access is enforced by the API).
const ApiTimingPage = () => {
  return (
    <PageContainer title="API Timing" description="API request timing">
      <BlankCard>
        <ApiTimingLogs />
      </BlankCard>
    </PageContainer>
  );
};

export default ApiTimingPage;
