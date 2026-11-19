"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import VehicleList from "@/app/components/apps/vehicles/list";

/** Vehicles: company admins, or users given the Vehicles permission. */
const VehiclesPage = () => (
  <PageContainer title="Vehicles" description="Company vehicles and drivers">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <VehicleList />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehiclesPage;
