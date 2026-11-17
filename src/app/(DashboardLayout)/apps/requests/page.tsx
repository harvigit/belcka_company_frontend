"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import RequestsPage from "@/app/components/apps/requests/page";

/** Requests: company admins, or users given the Requests permission. */
const Requests = () => (
  <PageContainer title="Requests" description="Review and approve user requests">
    <PermissionGuard permission="requests">
      <RequestsPage />
    </PermissionGuard>
  </PageContainer>
);

export default Requests;
