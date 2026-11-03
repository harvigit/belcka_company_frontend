"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ContractsSettings from "@/app/components/apps/settings/contracts";

/** Contracts: company admins, or users given the Contracts permission. */
const ContractsPage = () => (
  <PageContainer title="Contracts" description="Contract templates and signing">
    <PermissionGuard permission="contracts">
      <BlankCard>
        <ContractsSettings />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default ContractsPage;
