"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ActivityPage from "@/app/components/apps/vehicles/activity-page";

const VehicleActivityPage = () => (
  <PageContainer title="Vehicle activity" description="Who changed what in Vehicles">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <ActivityPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleActivityPage;
