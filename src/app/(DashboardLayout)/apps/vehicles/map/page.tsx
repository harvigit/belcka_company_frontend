"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import MapPage from "@/app/components/apps/vehicles/map-page";

/** Vehicles · Map: company admins, or users given the Vehicles permission. */
const VehicleMapPage = () => (
  <PageContainer title="Vehicle map" description="Where drivers last recorded something">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <MapPage />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleMapPage;
