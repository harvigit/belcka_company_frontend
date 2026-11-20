"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import VehicleDetail from "@/app/components/apps/vehicles/detail";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";

/** Vehicle page: company admins, or users given the Vehicles permission. */
const VehicleDetailPage = () => {
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params?.id);

  return (
    <PageContainer title="Vehicle" description="Vehicle details and history">
      <PermissionGuard permission="vehicles">
        <FleetTheme>
          <VehicleDetail vehicleId={vehicleId} />
        </FleetTheme>
      </PermissionGuard>
    </PageContainer>
  );
};

export default VehicleDetailPage;
