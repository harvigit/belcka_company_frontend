"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import DriversPage from "@/app/components/apps/vehicles/drivers-page";

const VehicleDriversPage = () => (
  <PageContainer title="Drivers" description="Drivers, licences and reimbursement">
    <BlankCard>
      <DriversPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleDriversPage;
