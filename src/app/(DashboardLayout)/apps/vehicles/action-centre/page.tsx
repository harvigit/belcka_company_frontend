"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ActionCentre from "@/app/components/apps/vehicles/action-centre";

const ActionCentrePage = () => (
  <PageContainer title="Action Centre" description="Vehicle defects, requests, due dates and approvals">
    <PermissionGuard permission="vehicles">
      <BlankCard>
        <FleetTheme>
          <ActionCentre />
        </FleetTheme>
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default ActionCentrePage;
