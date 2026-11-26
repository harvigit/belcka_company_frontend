"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import PermissionGuard from "@/app/auth/PermissionGuard";
import FleetTheme from "@/app/components/apps/vehicles/fleet-theme";
import { VehicleStoreProvider } from "@/app/components/apps/vehicles/useVehicles";

// Shared by every Vehicles tab: the guard and the fleet data stay mounted while tabs change.
const VehiclesLayout = ({ children }: { children: React.ReactNode }) => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  return (
    <PermissionGuard permission="vehicles">
      <VehicleStoreProvider companyId={user?.company_id}>
        <FleetTheme>{children}</FleetTheme>
      </VehicleStoreProvider>
    </PermissionGuard>
  );
};

export default VehiclesLayout;
