"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import SettingsPage from "@/app/components/apps/vehicles/settings";

const VehicleSettingsPage = () => (
  <PageContainer title="Fleet settings" description="Fleet rules and onboarding types">
    <BlankCard>
      <SettingsPage />
    </BlankCard>
  </PageContainer>
);

export default VehicleSettingsPage;
