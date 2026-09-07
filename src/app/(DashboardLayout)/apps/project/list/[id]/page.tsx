"use client";

import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ProjectDetail from "@/app/components/apps/project/detail";

const ProjectDetailPage = () => {
  return (
    <PageContainer title="Project Overview" description="Project overview dashboard">
      <PermissionGuard permission="Projects">
        <BlankCard sx={{ overflow: "hidden" }}>
          <ProjectDetail />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default ProjectDetailPage;
