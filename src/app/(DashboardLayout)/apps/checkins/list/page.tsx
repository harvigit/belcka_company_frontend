"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import CheckinsList from "@/app/components/apps/checkins";

const CheckinsListing = () => {
  return (
    <PageContainer title="Checkins List" description="This is Checkins List">
      <BlankCard>
        <CheckinsList />
      </BlankCard>
    </PageContainer>
  );
};

export default CheckinsListing;
