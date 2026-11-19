"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SettingsPage from "@/app/components/apps/vehicles/settings-page";

/** Vehicles · Settings: company admins, or users given the Vehicles permission. */
const VehicleSettingsPage = () => (
  <PageContainer title="Fleet settings" description="Fleet rules and onboarding types">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <SettingsPage />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default VehicleSettingsPage;
