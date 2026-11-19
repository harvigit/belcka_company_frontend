"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ActivityPage from "@/app/components/apps/vehicles/activity-page";

/** Vehicles · Activity log: company admins, or users given the Vehicles permission. */
const VehicleActivityPage = () => (
  <PageContainer title="Vehicle activity" description="Who changed what in Vehicles">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <ActivityPage />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleActivityPage;
