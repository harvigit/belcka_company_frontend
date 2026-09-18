"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import CheckinsList from "@/app/components/apps/checkins";
import PermissionGuard from "@/app/auth/PermissionGuard";

const CheckinsListing = () => {
  return (
    <PageContainer title="Checkins List" description="This is Checkins List">
      <PermissionGuard permission="Check ins">
        <BlankCard>
          <CheckinsList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default CheckinsListing;
