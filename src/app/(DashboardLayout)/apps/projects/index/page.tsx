import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ProjectList from "@/app/components/apps/projects/index";

const ProjectListing = () => {
  return (
      <PageContainer title="Project List" description="this is Project List">
        <ProjectList />
      </PageContainer>
  );
};
export default ProjectListing;
