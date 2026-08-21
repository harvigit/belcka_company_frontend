"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import CollectList from "@/app/components/apps/collect/list";

const CollectListing = () => {
  return (
    <PageContainer title="Collect" description="This is Collect List">
      <PermissionGuard permissions={["Collect", "Collect review"]} requireAll={false}>
        <BlankCard>
          <CollectList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default CollectListing;
