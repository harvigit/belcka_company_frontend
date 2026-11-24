"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import QsWorkspace from "@/app/components/apps/surveys/qs/workspace";

/** QS review of one survey: price, approve or exclude each work line. */
export default function QsWorkspacePage() {
  const params = useParams<{ id: string }>();
  return (
    <PageContainer title="QS review" description="Price the works of a survey">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <QsWorkspace surveyId={Number(params?.id)} />
      </PermissionGuard>
    </PageContainer>
  );
}
