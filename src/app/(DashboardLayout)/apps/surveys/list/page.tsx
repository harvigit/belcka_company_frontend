"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyList from "@/app/components/apps/surveys/list";

/** Surveys: company admins, or users given the Surveys permission. Templates and NHF rates are under Settings. */
export default function SurveyListPage() {
  return (
    <PageContainer title="Surveys" description="Surveys">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <SurveyList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}
