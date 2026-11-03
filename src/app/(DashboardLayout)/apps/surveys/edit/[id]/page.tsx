"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveyEdit from "@/app/components/apps/surveys/edit";

export default function SurveyEditPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return (
    <PageContainer title="Edit Survey" description="Edit survey details and room configuration">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <SurveyEdit id={id} />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}
