"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import MapPage from "@/app/components/apps/vehicles/map-page";

const VehicleMapPage = () => (
  <PageContainer title="Vehicle map" description="Where drivers last recorded something">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <MapPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleMapPage;
