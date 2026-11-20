"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import DriversPage from "@/app/components/apps/vehicles/drivers-page";

/** Vehicles · Drivers: company admins, or users given the Vehicles permission. */
const VehicleDriversPage = () => (
  <PageContainer title="Drivers" description="Drivers, licences and reimbursement">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <DriversPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleDriversPage;
