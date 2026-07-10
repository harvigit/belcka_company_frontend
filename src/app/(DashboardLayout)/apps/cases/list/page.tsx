"use client";
import React from "react";
import CasesList from "@/app/components/apps/cases/list";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";

const CasesListing = () => {
  return (
    <PageContainer title="Cases List" description="this is Cases List">
      <BlankCard>
        <CasesList />
      </BlankCard>
    </PageContainer>
  );
};

export default CasesListing;
