"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import PriceworkList from "@/app/components/apps/priceworks/list";

const PriceworkListing = () => {
  return (
    <PageContainer title="Pricework" description="This is Pricework List">
      <PermissionGuard permission="Pricework">
        <BlankCard>
          <PriceworkList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default PriceworkListing;
