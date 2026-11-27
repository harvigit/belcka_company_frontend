"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ActivityPage from "@/app/components/apps/vehicles/activity";

const VehicleActivityPage = () => (
  <PageContainer title="Vehicle activity" description="Who changed what in Vehicles">
    <BlankCard>
      <ActivityPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleActivityPage;
