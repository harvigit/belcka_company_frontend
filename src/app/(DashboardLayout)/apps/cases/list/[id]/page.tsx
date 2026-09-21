"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CaseDetail from "@/app/components/apps/cases/detail";

const CaseDetailPage = () => {
  return (
    <PageContainer title="Case Details" description="Case details and activity">
      <PermissionGuard permission="Cases">
        <BlankCard sx={{ overflow: "hidden" }}>
          <CaseDetail />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default CaseDetailPage;
