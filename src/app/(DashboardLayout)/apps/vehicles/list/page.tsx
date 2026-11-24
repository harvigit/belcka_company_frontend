"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import VehicleList from "@/app/components/apps/vehicles/list";

const VehiclesPage = () => (
  <PageContainer title="Vehicles" description="Company vehicles and drivers">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <VehicleList />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehiclesPage;
