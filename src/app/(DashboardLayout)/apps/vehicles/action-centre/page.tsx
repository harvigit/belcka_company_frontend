"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import ActionCentre from "@/app/components/apps/vehicles/action-centre";

const ActionCentrePage = () => (
  <PageContainer title="Action Centre" description="Vehicle defects, requests, due dates and approvals">
    <BlankCard>
      <ActionCentre />
    </BlankCard>
  </PageContainer>
);

export default ActionCentrePage;
