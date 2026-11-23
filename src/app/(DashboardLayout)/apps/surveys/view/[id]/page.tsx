"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyPage from "@/app/components/apps/surveys/detail";

/** Survey page: company admins, or users with the Surveys permission. */
const SurveyViewPage = () => {
  const params = useParams<{ id: string }>();
  return (
    <PageContainer title="Survey" description="Survey details, inspection and history">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <SurveyPage surveyId={Number(params?.id)} />
      </PermissionGuard>
    </PageContainer>
  );
};

export default SurveyViewPage;
