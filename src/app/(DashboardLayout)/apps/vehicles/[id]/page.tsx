"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import VehicleDetail from "@/app/components/apps/vehicles/detail";

const VehicleDetailPage = () => {
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params?.id);

  return (
    <PageContainer title="Vehicle" description="Vehicle details and history">
      <VehicleDetail vehicleId={vehicleId} />
    </PageContainer>
  );
};

export default VehicleDetailPage;
