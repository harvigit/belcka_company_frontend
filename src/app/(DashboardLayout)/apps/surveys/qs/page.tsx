"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import QsList from "@/app/components/apps/surveys/qs";

/** QS review: company admins, or users with the Surveys permission (roles are finalised later). */
export default function QsListPage() {
  return (
    <PageContainer title="QS review" description="Price the works of submitted surveys">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <QsList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}
