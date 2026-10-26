"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import CreateSurveyWizard from "@/app/components/apps/surveys/create";

export default function CreateSurveyPage() {
  return (
    <PageContainer title="Create Survey" description="Create a new property survey scope">
      <BlankCard>
        <CreateSurveyWizard />
      </BlankCard>
    </PageContainer>
  );
}
