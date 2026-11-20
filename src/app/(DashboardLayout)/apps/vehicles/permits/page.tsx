"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import PermitsPage from "@/app/components/apps/vehicles/permits-page";

/** Vehicles · Parking permits for the whole fleet: company admins, or users given the Vehicles permission. */
const VehiclePermitsPage = () => (
  <PageContainer title="Parking permits" description="Parking permits across the fleet">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <PermitsPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehiclePermitsPage;
