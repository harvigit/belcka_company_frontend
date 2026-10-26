"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import SurveyDetails from "@/app/components/apps/surveys/details";

export default function SurveyViewPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string) || "";

  return (
    <PageContainer title="Survey Details" description="View survey inspection details">
      <BlankCard>
        <SurveyDetails id={id} />
      </BlankCard>
    </PageContainer>
  );
}
