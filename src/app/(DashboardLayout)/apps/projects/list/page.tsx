"use client";
import React from "react";
import ProjectList from "@/app/components/apps/projects/list";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";

const ProjectListing = () => {
  return (
    <PageContainer title="Projects List" description="this is Projects List">
      <PermissionGuard permission="Projects">
        <BlankCard>
          <ProjectList />
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
};

export default ProjectListing;
