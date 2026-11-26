"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import VehicleList from "@/app/components/apps/vehicles/list";

const VehiclesPage = () => (
  <PageContainer title="Vehicles" description="Company vehicles and drivers">
    <BlankCard>
      <VehicleList />
    </BlankCard>
  </PageContainer>
);

export default VehiclesPage;
