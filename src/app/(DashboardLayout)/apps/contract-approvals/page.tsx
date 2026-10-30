"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ContractApprovals from "@/app/components/apps/contract-approvals";

/** Contract Approvals: company admins, or users given the Contract Approvals permission. */
const ContractApprovalsPage = () => (
  <PageContainer title="Contract Approvals" description="Review and approve signed contracts">
    <PermissionGuard permission="contract_approvals">
      <BlankCard>
        <ContractApprovals />
      </BlankCard>
    </PermissionGuard>
  </PageContainer>
);

export default ContractApprovalsPage;
