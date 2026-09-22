"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CaseDetail from "@/app/components/apps/cases/detail";

const CaseDetailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProjectId = searchParams?.get("project_id");

  return (
    <PageContainer title="Case Details" description="Case details and activity">
      <PermissionGuard permission="Cases">
        <BlankCard sx={{ overflow: "hidden" }}>
          <CaseDetail
            open
            projectId={fromProjectId ? Number(fromProjectId) : undefined}
            onClose={() => {
              if (fromProjectId) {
                router.push(`/apps/project/list/${fromProjectId}?tab=cases`);
                return;
              }
              router.push("/apps/cases/list");
            }}
          />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default CaseDetailPage;
