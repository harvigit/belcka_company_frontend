"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyQSWorkspace from "@/app/components/apps/surveys/qs";

export default function SurveyQSPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return (
    <PageContainer
      title="Commercial QS Assessment Workspace"
      description="Scope of Rates, defect rate matching, whole-scope adjustments, and baseline lock"
    >
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <SurveyQSWorkspace id={id} />
      </PermissionGuard>
    </PageContainer>
  );
}
