import React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import ProjectList from "@/app/components/apps/projects/index";
import { TeamProvider } from "@/app/context/TeamContext";

const ProjectListing = () => {
  return (
    <TeamProvider>
      <PageContainer title="Project List" description="this is Project List">
        <ProjectList />
      </PageContainer>
    </TeamProvider>
  );
};
export default ProjectListing;
