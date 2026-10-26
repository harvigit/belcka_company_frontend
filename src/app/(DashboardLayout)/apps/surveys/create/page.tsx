"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CreateSurveyWizard from "@/app/components/apps/surveys/create";

export default function CreateSurveyPage() {
  return (
    <PageContainer title="Create Survey" description="Create a new property survey scope">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <CreateSurveyWizard />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}
