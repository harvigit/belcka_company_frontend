"use client";
import React from "react";
import MapGantt from "@/app/components/apps/projects/zone-map/MapGantt";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import PermissionGuard from "@/app/auth/PermissionGuard";

const MapPage = () => {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  return (
    <PageContainer title="Map" description="this is Map">
      <BlankCard>
        <PermissionGuard permission="Map">
          <MapGantt
            open={true}
            onClose={() => {}}
            onUpdate={() => {}}
            projectId={null}
            companyId={user?.company_id ?? null}
          />
        </PermissionGuard>
      </BlankCard>
    </PageContainer>
  );
};

export default MapPage;
