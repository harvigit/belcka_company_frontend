"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import FuelCardsPage from "@/app/components/apps/vehicles/fuel-cards-page";

/** Vehicles · Fuel cards: company admins, or users given the Vehicles permission. */
const VehicleFuelCardsPage = () => (
  <PageContainer title="Fuel cards" description="Fuel cards and fuel report imports">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FuelCardsPage />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleFuelCardsPage;
