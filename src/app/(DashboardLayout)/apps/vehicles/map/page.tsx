"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import MapPage from "@/app/components/apps/vehicles/map-page";

const VehicleMapPage = () => (
  <PageContainer title="Vehicle map" description="Where drivers last recorded something">
    <BlankCard>
      <MapPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleMapPage;
