"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyInspectWorkspace from "@/app/components/apps/surveys/inspect";

export default function SurveyInspectPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return (
    <PageContainer
      title="Field Inspection Workspace"
      description="Conduct on-site room and element condition inspection"
    >
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <SurveyInspectWorkspace id={id} />
      </PermissionGuard>
    </PageContainer>
  );
}
