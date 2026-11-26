"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FuelCardsPage from "@/app/components/apps/vehicles/fuel-cards-page";

const VehicleFuelCardsPage = () => (
  <PageContainer title="Fuel cards" description="Fuel cards and fuel report imports">
    <BlankCard>
      <FuelCardsPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleFuelCardsPage;
