"use client";
import React from "react";
import ProjectList from "@/app/components/apps/projects/list";
import PageContainer from "@/app/components/container/PageContainer";

const ProjectListing = () => {
  return (
    <PageContainer title="Projects List" description="this is Projects List">
      <ProjectList />
    </PageContainer>
  );
};

export default ProjectListing;
