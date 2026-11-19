"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ActionCentre from "@/app/components/apps/vehicles/action-centre";

/** Vehicles · Action Centre: company admins, or users given the Vehicles permission. */
const ActionCentrePage = () => (
  <PageContainer title="Action Centre" description="Vehicle defects, requests, due dates and approvals">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <ActionCentre />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default ActionCentrePage;
