"use client";

import React from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import TemplateEditor from "@/app/components/apps/settings/contracts/TemplateEditor";

const ContractTemplatePage = () => {
  const params = useParams<{ id: string }>();
  const templateId = params?.id && params.id !== "new" ? Number(params.id) : null;

  return (
    <PageContainer title="Contract template" description="Edit a contract template">
      <PermissionGuard permission="contracts">
        <TemplateEditor key={templateId ?? "new"} templateId={templateId} />
      </PermissionGuard>
    </PageContainer>
  );
};

export default ContractTemplatePage;
