"use client";
import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import ProjectDashboard from "@/app/components/apps/project/list";

const ProjectDashboardPage = () => {
  return (
    <PageContainer title="Project" description="Project dashboard">
      <PermissionGuard permission="Projects">
        <BlankCard>
          <ProjectDashboard />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default ProjectDashboardPage;
