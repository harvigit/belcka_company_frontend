"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import RoadCostsPage from "@/app/components/apps/vehicles/road-costs-page";

/** Vehicles · Road costs: company admins, or users given the Vehicles permission. */
const VehicleRoadCostsPage = () => (
  <PageContainer title="Road costs" description="Parking, road charges, fines and imports">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <RoadCostsPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleRoadCostsPage;
