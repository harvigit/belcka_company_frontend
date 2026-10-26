"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyList from "@/app/components/apps/surveys/list";

export default function SurveyListPage() {
  return (
    <PageContainer title="Surveys" description="Property condition surveys and inspection management">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <SurveyList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}
