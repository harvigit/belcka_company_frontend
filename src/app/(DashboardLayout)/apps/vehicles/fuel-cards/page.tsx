"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import FuelCardsPage from "@/app/components/apps/vehicles/fuel-cards-page";

const VehicleFuelCardsPage = () => (
  <PageContainer title="Fuel cards" description="Fuel cards and fuel report imports">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <FuelCardsPage />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleFuelCardsPage;
