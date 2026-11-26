"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import Expenses from "@/app/components/apps/vehicles/expenses";

const VehicleExpensesPage = () => (
  <PageContainer title="Vehicle expenses" description="Driver expenses and mileage claims">
    <BlankCard>
      <Expenses />
    </BlankCard>
  </PageContainer>
);

export default VehicleExpensesPage;
