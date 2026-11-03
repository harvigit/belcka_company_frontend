"use client";

import React, { useRef } from "react";
import { useParams } from "next/navigation";
import PageContainer from "@/app/components/container/PageContainer";
import PermissionGuard from "@/app/auth/PermissionGuard";
import TemplateEditor from "@/app/components/apps/settings/contracts/TemplateEditor";

const ContractTemplatePage = () => {
  const params = useParams<{ id: string }>();
  const templateId = params?.id && params.id !== "new" ? Number(params.id) : null;

  // Remount the editor when switching templates, but not when a new template
  // gets its id on first save (that would reload the page and drop open dialogs).
  const prevId = useRef(templateId);
  const editorKey = useRef(0);
  if (prevId.current !== templateId) {
    if (prevId.current !== null) editorKey.current += 1;
    prevId.current = templateId;
  }

  return (
    <PageContainer title="Contract template" description="Edit a contract template">
      <PermissionGuard permission="contracts">
        <TemplateEditor key={editorKey.current} templateId={templateId} />
      </PermissionGuard>
    </PageContainer>
  );
};

export default ContractTemplatePage;
