"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermitsPage from "@/app/components/apps/vehicles/permits";

const VehiclePermitsPage = () => (
  <PageContainer title="Parking permits" description="Parking permits across the fleet">
    <BlankCard>
      <PermitsPage />
    </BlankCard>
  </PageContainer>
);

export default VehiclePermitsPage;
