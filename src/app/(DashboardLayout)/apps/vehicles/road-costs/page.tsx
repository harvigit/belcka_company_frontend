"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import RoadCostsPage from "@/app/components/apps/vehicles/road-costs";

const VehicleRoadCostsPage = () => (
  <PageContainer title="Road costs" description="Parking, road charges, fines and imports">
    <BlankCard>
      <RoadCostsPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleRoadCostsPage;
