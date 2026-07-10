"use client";
import React from "react";
import ProjectList from "@/app/components/apps/projects/list";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";

const ProjectListing = () => {
  return (
    <PageContainer title="Projects List" description="this is Projects List">
      <BlankCard>
        <ProjectList />
      </BlankCard>
    </PageContainer>
  );
};

export default ProjectListing;
