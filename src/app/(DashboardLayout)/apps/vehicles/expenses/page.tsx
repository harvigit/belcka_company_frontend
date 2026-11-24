"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import Expenses from "@/app/components/apps/vehicles/expenses";

const VehicleExpensesPage = () => (
  <PageContainer title="Vehicle expenses" description="Driver expenses and mileage claims">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <Expenses />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleExpensesPage;
